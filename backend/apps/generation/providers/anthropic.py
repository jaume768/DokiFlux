import json
import logging
from typing import AsyncGenerator, Any

import httpx

from .base import BaseProvider
from .key_pool import get_anthropic_key
from .prompts import SYSTEM_PROMPT, ANTHROPIC_GENERATE_UI_TOOL, PLANNER_SYSTEM_PROMPT
from .registry import calculate_cost, get_model_config

logger = logging.getLogger(__name__)

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_VERSION = "2023-06-01"


class AnthropicProvider(BaseProvider):
    """Anthropic Messages API provider with httpx async streaming."""

    async def stream_generate(
        self,
        messages: list[dict],
        tools: list[dict] | None = None,
        model: str = "claude-sonnet-4.6",
        max_tokens: int = 16384,
    ) -> AsyncGenerator[dict[str, Any], None]:
        """
        Stream from Anthropic Messages API and yield SSE-compatible chunks.
        Translates Anthropic's event format to our standard:
        - {"type": "text", "content": "..."} for code (tool_use input)
        - {"type": "chat", "content": "..."} for conversation text
        - {"type": "usage", "usage": {...}} at the end
        - {"type": "done"} when finished
        - {"type": "error", "error": "..."} on failure
        """
        config = get_model_config(model)
        api_model = config["api_model"]

        if tools is None:
            tools = [ANTHROPIC_GENERATE_UI_TOOL]

        # Extract project context from "developer" role messages and append to system prompt
        project_context = "\n\n".join(
            msg["content"] for msg in messages if msg.get("role") == "developer"
        )
        system_prompt = f"{SYSTEM_PROMPT}\n\n{project_context}" if project_context else SYSTEM_PROMPT

        # Convert messages from OpenAI format to Anthropic format
        anthropic_messages = self._convert_messages(messages)

        payload = {
            "model": api_model,
            "max_tokens": max_tokens,
            "system": system_prompt,
            "messages": anthropic_messages,
            "tools": tools,
            "stream": True,
        }

        api_key = get_anthropic_key()
        headers = {
            "x-api-key": api_key,
            "anthropic-version": ANTHROPIC_VERSION,
            "content-type": "application/json",
        }

        input_tokens = 0
        output_tokens = 0
        current_block_type = None  # "text" or "tool_use"

        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(120.0)) as client:
                async with client.stream(
                    "POST",
                    ANTHROPIC_API_URL,
                    json=payload,
                    headers=headers,
                ) as response:
                    if response.status_code != 200:
                        body = await response.aread()
                        error_msg = "Anthropic API error"
                        try:
                            error_data = json.loads(body)
                            error_msg = error_data.get("error", {}).get(
                                "message", error_msg
                            )
                        except (json.JSONDecodeError, KeyError):
                            pass
                        logger.error(
                            "Anthropic API error %s: %s",
                            response.status_code,
                            error_msg,
                        )
                        yield {"type": "error", "error": error_msg}
                        return

                    buffer = ""
                    async for chunk in response.aiter_text():
                        buffer += chunk
                        while "\n" in buffer:
                            line, buffer = buffer.split("\n", 1)
                            line = line.strip()

                            if not line:
                                continue

                            # Anthropic SSE: "event: <type>" then "data: <json>"
                            if line.startswith("event:"):
                                continue

                            if not line.startswith("data: "):
                                continue

                            json_str = line[6:]
                            try:
                                event = json.loads(json_str)
                            except json.JSONDecodeError:
                                continue

                            event_type = event.get("type", "")

                            # message_start — extract input tokens
                            if event_type == "message_start":
                                msg = event.get("message", {})
                                usage = msg.get("usage", {})
                                input_tokens = usage.get("input_tokens", 0)

                            # content_block_start — detect block type
                            elif event_type == "content_block_start":
                                block = event.get("content_block", {})
                                current_block_type = block.get("type")

                            # content_block_delta — stream content
                            elif event_type == "content_block_delta":
                                delta = event.get("delta", {})
                                delta_type = delta.get("type", "")

                                if delta_type == "text_delta":
                                    # Conversation text
                                    text = delta.get("text", "")
                                    if text:
                                        yield {
                                            "type": "chat",
                                            "content": text,
                                        }

                                elif delta_type == "input_json_delta":
                                    # Tool use (code generation) — partial JSON
                                    partial = delta.get("partial_json", "")
                                    if partial:
                                        yield {
                                            "type": "text",
                                            "content": partial,
                                        }

                            # content_block_stop
                            elif event_type == "content_block_stop":
                                current_block_type = None

                            # message_delta — extract output tokens
                            elif event_type == "message_delta":
                                usage = event.get("usage", {})
                                output_tokens = usage.get(
                                    "output_tokens", output_tokens
                                )

                            # message_stop — end of message
                            elif event_type == "message_stop":
                                pass

            # Emit usage
            cost = calculate_cost(input_tokens, output_tokens, model)
            yield {
                "type": "usage",
                "usage": {
                    "inputTokens": input_tokens,
                    "outputTokens": output_tokens,
                    "cost": float(cost),
                },
            }

            # Emit done
            yield {"type": "done"}

        except httpx.TimeoutException:
            logger.error("Anthropic API timeout")
            yield {
                "type": "error",
                "error": "Generation timed out. Please try again.",
            }
        except httpx.HTTPError as e:
            logger.error("Anthropic HTTP error: %s", str(e))
            yield {
                "type": "error",
                "error": "Failed to connect to AI service.",
            }
        except Exception as e:
            logger.error("Anthropic provider error: %s", str(e), exc_info=True)
            yield {
                "type": "error",
                "error": "Something went wrong. Please try again.",
            }

    async def call_planner(self, messages: list[dict], model: str) -> dict:
        """Non-streaming planner call via Anthropic Messages API."""
        config = get_model_config(model)
        api_model = config["api_model"]

        anthropic_messages = self._convert_messages(messages)

        payload = {
            "model": api_model,
            "max_tokens": 600,
            "system": PLANNER_SYSTEM_PROMPT,
            "messages": anthropic_messages,
        }

        api_key = get_anthropic_key()
        headers = {
            "x-api-key": api_key,
            "anthropic-version": ANTHROPIC_VERSION,
            "content-type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(30.0)) as client:
                resp = await client.post(ANTHROPIC_API_URL, json=payload, headers=headers)
                data = resp.json()
                text = ""
                for block in data.get("content", []):
                    if block.get("type") == "text":
                        text += block.get("text", "")
                usage_raw = data.get("usage", {})
                plan = self._parse_plan(text)
                plan["usage"] = {
                    "inputTokens": usage_raw.get("input_tokens", 0),
                    "outputTokens": usage_raw.get("output_tokens", 0),
                }
                return plan
        except Exception as e:
            logger.error("Anthropic planner error: %s", str(e), exc_info=True)
            return {"thinking": "", "files": [], "usage": {"inputTokens": 0, "outputTokens": 0}}

    @staticmethod
    def _convert_messages(messages: list[dict]) -> list[dict]:
        """
        Convert messages from OpenAI/internal format to Anthropic format.
        - OpenAI "developer" role is handled via `system` param (not in messages)
        - OpenAI "user"/"assistant" map directly
        - Filters out any "system" or "developer" role messages
        """
        converted = []
        for msg in messages:
            role = msg.get("role", "")
            content = msg.get("content", "")

            if role in ("system", "developer"):
                # Handled via the `system` parameter
                continue

            if role == "user":
                converted.append({"role": "user", "content": content})
            elif role == "assistant":
                converted.append({"role": "assistant", "content": content})

        return converted
