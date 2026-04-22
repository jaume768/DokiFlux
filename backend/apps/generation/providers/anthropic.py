import json
import logging
from typing import AsyncGenerator, Any

import httpx

from .base import BaseProvider
from .key_pool import get_anthropic_key
from .prompts import TEXT_GENERATION_SYSTEM_PROMPT, PLANNER_SYSTEM_PROMPT
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
        Uses direct text generation (no tool calls) because Claude 4.x hybrid-reasoning
        models buffer internally before starting to stream tool call args, causing a long
        pause then rapid delivery. Text generation starts streaming immediately.
        Mode is detected from content: responses starting with '// --- FILE:' are code.

        Yields:
        - {"type": "text", "content": "..."} for code output
        - {"type": "chat", "content": "..."} for conversation text
        - {"type": "usage", "usage": {...}} at the end
        - {"type": "done"} when finished
        - {"type": "error", "error": "..."} on failure
        """
        config = get_model_config(model)
        api_model = config["api_model"]
        thinking_effort = config.get("thinking_effort")

        # If caller passed an explicit `system` role message, it REPLACES the
        # default TEXT_GENERATION_SYSTEM_PROMPT (reviewer / fix_iteration need
        # their own persona). Otherwise fall back to the code-generation prompt.
        explicit_system = "\n\n".join(
            msg["content"] for msg in messages if msg.get("role") == "system"
        )
        base_system = explicit_system or TEXT_GENERATION_SYSTEM_PROMPT

        # Developer-role messages always append (framework override + project context)
        project_context = "\n\n".join(
            msg["content"] for msg in messages if msg.get("role") == "developer"
        )
        system_prompt = (
            f"{base_system}\n\n{project_context}"
            if project_context
            else base_system
        )

        # Convert messages from OpenAI format to Anthropic format
        anthropic_messages = self._convert_messages(messages)

        # No tools — plain text generation so streaming starts immediately
        payload = {
            "model": api_model,
            "max_tokens": max_tokens,
            "system": system_prompt,
            "messages": anthropic_messages,
            "stream": True,
        }

        # Adaptive thinking (Claude Opus 4.7+). The model dynamically decides
        # whether and how much to think; `output_config.effort` is soft guidance
        # (low | medium | high | xhigh | max). Required format for Opus 4.7 —
        # the legacy {type: "enabled", budget_tokens: N} is rejected with 400.
        # Thinking tokens are billed as output tokens and arrive in separate
        # `thinking` content blocks that we silently skip (only text_delta is
        # forwarded to the client).
        if thinking_effort:
            payload["thinking"] = {"type": "adaptive"}
            payload["output_config"] = {"effort": thinking_effort}

        api_key = get_anthropic_key()
        headers = {
            "x-api-key": api_key,
            "anthropic-version": ANTHROPIC_VERSION,
            "content-type": "application/json",
        }

        input_tokens = 0
        output_tokens = 0

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

                    # Mode detection: buffer first chars to decide chat vs code
                    # Code responses start with "// --- FILE:", chat responses don't.
                    _MODE_DETECT_CHARS = 32
                    prefix_buf = ""
                    mode = "detecting"  # "detecting" | "chat" | "code"

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
                                msg_data = event.get("message", {})
                                usage = msg_data.get("usage", {})
                                input_tokens = usage.get("input_tokens", 0)

                            # content_block_delta — stream text content
                            elif event_type == "content_block_delta":
                                delta = event.get("delta", {})
                                if delta.get("type") != "text_delta":
                                    continue
                                text = delta.get("text", "")
                                if not text:
                                    continue

                                if mode == "detecting":
                                    prefix_buf += text
                                    if "// --- FILE:" in prefix_buf:
                                        mode = "code"
                                        yield {"type": "text", "content": prefix_buf}
                                        prefix_buf = ""
                                    elif len(prefix_buf) >= _MODE_DETECT_CHARS:
                                        mode = "chat"
                                        yield {"type": "chat", "content": prefix_buf}
                                        prefix_buf = ""
                                elif mode == "chat":
                                    yield {"type": "chat", "content": text}
                                else:
                                    yield {"type": "text", "content": text}

                            # message_delta — extract output tokens
                            elif event_type == "message_delta":
                                usage = event.get("usage", {})
                                output_tokens = usage.get(
                                    "output_tokens", output_tokens
                                )

                    # Flush any remaining prefix buffer (short response)
                    if prefix_buf:
                        chunk_type = "text" if "// --- FILE:" in prefix_buf else "chat"
                        yield {"type": chunk_type, "content": prefix_buf}

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

        # Fold developer-role context (framework override + project state) into
        # the system prompt. _convert_messages strips developer roles, so
        # without this the planner never sees framework-specific rules.
        developer_ctx = "\n\n".join(
            msg["content"] for msg in messages if msg.get("role") == "developer"
        )
        system_prompt = (
            f"{PLANNER_SYSTEM_PROMPT}\n\n{developer_ctx}"
            if developer_ctx else PLANNER_SYSTEM_PROMPT
        )

        anthropic_messages = self._convert_messages(messages)

        payload = {
            "model": api_model,
            "max_tokens": 600,
            "system": system_prompt,
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
