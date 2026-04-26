import json
import logging
from typing import AsyncGenerator, Any

import httpx

from .base import BaseProvider
from .key_pool import get_openai_key
from .prompts import SYSTEM_PROMPT, OPENAI_GENERATE_UI_TOOL, PLANNER_SYSTEM_PROMPT
from .registry import calculate_cost, get_model_config

logger = logging.getLogger(__name__)


class OpenAIProvider(BaseProvider):
    """OpenAI Responses API provider with httpx async streaming."""

    def __init__(self):
        self.base_url = "https://api.openai.com/v1/responses"

    async def stream_generate(
        self,
        messages: list[dict],
        tools: list[dict] | None = None,
        model: str = "gpt-5.5",
        max_tokens: int = 31000,
    ) -> AsyncGenerator[dict[str, Any], None]:
        """
        Stream from OpenAI Responses API and yield SSE-compatible chunks.
        Format matches what the frontend already consumes:
        - {"type": "text", "content": "..."} for code (function call args)
        - {"type": "chat", "content": "..."} for conversation text
        - {"type": "usage", "usage": {...}} at the end
        - {"type": "done"} when finished
        - {"type": "error", "error": "..."} on failure
        """
        if tools is None:
            tools = [OPENAI_GENERATE_UI_TOOL]

        # Resolve model config from registry
        config = get_model_config(model)
        api_model = config["api_model"]
        reasoning_effort = config.get("reasoning_effort")

        # If caller passed an explicit `system` role message, it REPLACES the
        # default SYSTEM_PROMPT (reviewer / fix_iteration phases). Remove the
        # system message from `input` to avoid duplication.
        explicit_system = "\n\n".join(
            msg["content"] for msg in messages if msg.get("role") == "system"
        )
        instructions = explicit_system or SYSTEM_PROMPT
        filtered_input = [m for m in messages if m.get("role") != "system"]

        payload = {
            "model": api_model,
            "instructions": instructions,
            "input": filtered_input,
            "tools": tools,
            "max_output_tokens": max_tokens,
            "stream": True,
        }

        # Add reasoning effort if specified
        if reasoning_effort:
            payload["reasoning"] = {"effort": reasoning_effort}

        api_key = get_openai_key()
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        input_tokens = 0
        output_tokens = 0

        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(120.0)) as client:
                async with client.stream(
                    "POST",
                    self.base_url,
                    json=payload,
                    headers=headers,
                ) as response:
                    if response.status_code != 200:
                        body = await response.aread()
                        error_msg = "OpenAI API error"
                        try:
                            error_data = json.loads(body)
                            error_msg = error_data.get("error", {}).get(
                                "message", error_msg
                            )
                        except (json.JSONDecodeError, KeyError):
                            pass
                        logger.error(
                            "OpenAI API error %s: %s",
                            response.status_code,
                            error_msg,
                        )
                        yield {"type": "error", "error": error_msg}
                        return

                    buffer = ""
                    first_text_output_index = None
                    async for chunk in response.aiter_text():
                        buffer += chunk
                        while "\n" in buffer:
                            line, buffer = buffer.split("\n", 1)
                            line = line.strip()

                            if not line or not line.startswith("data: "):
                                continue

                            json_str = line[6:]
                            if json_str == "[DONE]":
                                continue

                            try:
                                event = json.loads(json_str)
                            except json.JSONDecodeError:
                                continue

                            event_type = event.get("type", "")

                            # Text output (conversation mode)
                            if (
                                event_type == "response.output_text.delta"
                                and "delta" in event
                            ):
                                oi = event.get("output_index", 0)
                                if first_text_output_index is None:
                                    first_text_output_index = oi
                                if oi == first_text_output_index:
                                    yield {
                                        "type": "chat",
                                        "content": event["delta"],
                                    }

                            # Function call arguments (code generation)
                            if (
                                event_type
                                == "response.function_call_arguments.delta"
                                and "delta" in event
                            ):
                                yield {
                                    "type": "text",
                                    "content": event["delta"],
                                }

                            # Response completed — extract usage
                            if (
                                event_type == "response.completed"
                                and "response" in event
                            ):
                                usage = event["response"].get("usage", {})
                                input_tokens = usage.get(
                                    "input_tokens", 0
                                )
                                output_tokens = usage.get(
                                    "output_tokens", 0
                                )

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
            logger.error("OpenAI API timeout")
            yield {"type": "error", "error": "Generation timed out. Please try again."}
        except httpx.HTTPError as e:
            logger.error("OpenAI HTTP error: %s", str(e))
            yield {"type": "error", "error": "Failed to connect to AI service."}
        except Exception as e:
            logger.error("OpenAI provider error: %s", str(e), exc_info=True)
            yield {"type": "error", "error": "Something went wrong. Please try again."}

    async def call_planner(self, messages: list[dict], model: str) -> dict:
        """Non-streaming planner call via Chat Completions API."""
        config = get_model_config(model)
        api_model = config["api_model"]

        # Extract developer-role context (framework override + current project
        # state) and fold it into the system prompt so the planner sees it.
        # Without this, framework-specific rules (Vue .vue entry, Next.js
        # /app/page.tsx) never reach the planner and it falls back to the
        # React-centric base prompt.
        developer_ctx = "\n\n".join(
            msg["content"] for msg in messages if msg.get("role") == "developer"
        )
        system_content = (
            f"{PLANNER_SYSTEM_PROMPT}\n\n{developer_ctx}"
            if developer_ctx else PLANNER_SYSTEM_PROMPT
        )
        chat_messages = [{"role": "system", "content": system_content}]
        for msg in messages:
            if msg.get("role") not in ("system", "developer"):
                chat_messages.append({"role": msg["role"], "content": msg["content"]})

        payload = {
            "model": api_model,
            "messages": chat_messages,
            "max_tokens": 600,
            "temperature": 0.1,
        }

        api_key = get_openai_key()
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(30.0)) as client:
                resp = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    json=payload,
                    headers=headers,
                )
                data = resp.json()
                text = data["choices"][0]["message"]["content"] or ""
                usage = data.get("usage", {})
                plan = self._parse_plan(text)
                plan["usage"] = {
                    "inputTokens": usage.get("prompt_tokens", 0),
                    "outputTokens": usage.get("completion_tokens", 0),
                }
                return plan
        except Exception as e:
            logger.error("OpenAI planner error: %s", str(e), exc_info=True)
            return {"thinking": "", "files": [], "usage": {"inputTokens": 0, "outputTokens": 0}}
