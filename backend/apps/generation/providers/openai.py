import json
import logging
from typing import AsyncGenerator, Any

import httpx

from .base import BaseProvider
from .key_pool import get_openai_key
from .prompts import SYSTEM_PROMPT, OPENAI_GENERATE_UI_TOOL
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
        model: str = "gpt-5.4",
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

        payload = {
            "model": api_model,
            "instructions": SYSTEM_PROMPT,
            "input": messages,
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
