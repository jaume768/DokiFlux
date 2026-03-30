import json
import logging
from typing import AsyncGenerator, Any

import httpx

from .base import BaseProvider
from .key_pool import get_gemini_key
from .prompts import SYSTEM_PROMPT, GEMINI_GENERATE_UI_TOOL, PLANNER_SYSTEM_PROMPT
from .registry import calculate_cost, get_model_config

logger = logging.getLogger(__name__)

GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"


class GeminiProvider(BaseProvider):
    """Google Gemini REST API provider with httpx async streaming."""

    async def stream_generate(
        self,
        messages: list[dict],
        tools: list[dict] | None = None,
        model: str = "gemini-3.1-pro",
        max_tokens: int = 65536,
    ) -> AsyncGenerator[dict[str, Any], None]:
        """
        Stream from Gemini streamGenerateContent API and yield SSE-compatible chunks.
        Translates Gemini's response format to our standard:
        - {"type": "text", "content": "..."} for code (functionCall args)
        - {"type": "chat", "content": "..."} for conversation text
        - {"type": "usage", "usage": {...}} at the end
        - {"type": "done"} when finished
        - {"type": "error", "error": "..."} on failure
        """
        config = get_model_config(model)
        api_model = config["api_model"]

        if tools is None:
            tools = [GEMINI_GENERATE_UI_TOOL]

        # Extract project context from "developer" role messages and append to system instruction
        project_context = "\n\n".join(
            msg["content"] for msg in messages if msg.get("role") == "developer"
        )
        system_text = f"{SYSTEM_PROMPT}\n\n{project_context}" if project_context else SYSTEM_PROMPT

        # Convert messages from OpenAI/internal format to Gemini format
        contents = self._convert_messages(messages)

        payload = {
            "system_instruction": {
                "parts": [{"text": system_text}],
            },
            "contents": contents,
            "tools": tools,
            "generation_config": {
                "max_output_tokens": max_tokens,
            },
        }

        api_key = get_gemini_key()
        url = f"{GEMINI_API_BASE}/{api_model}:streamGenerateContent?key={api_key}&alt=sse"

        headers = {
            "Content-Type": "application/json",
        }

        input_tokens = 0
        output_tokens = 0

        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(120.0)) as client:
                async with client.stream(
                    "POST",
                    url,
                    json=payload,
                    headers=headers,
                ) as response:
                    if response.status_code != 200:
                        body = await response.aread()
                        error_msg = "Gemini API error"
                        try:
                            error_data = json.loads(body)
                            error_msg = (
                                error_data.get("error", {}).get("message", "")
                                or error_msg
                            )
                        except (json.JSONDecodeError, KeyError):
                            pass
                        logger.error(
                            "Gemini API error %s: %s",
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

                            if not line or not line.startswith("data: "):
                                continue

                            json_str = line[6:]
                            try:
                                event = json.loads(json_str)
                            except json.JSONDecodeError:
                                continue

                            # Extract content from candidates
                            candidates = event.get("candidates", [])
                            if candidates:
                                candidate = candidates[0]
                                content = candidate.get("content", {})
                                parts = content.get("parts", [])

                                for part in parts:
                                    # Text response (conversation mode)
                                    if "text" in part:
                                        yield {
                                            "type": "chat",
                                            "content": part["text"],
                                        }

                                    # Function call (code generation)
                                    elif "functionCall" in part:
                                        fc = part["functionCall"]
                                        args = fc.get("args", {})
                                        code = args.get("code", "")
                                        if code:
                                            yield {
                                                "type": "text",
                                                "content": code,
                                            }

                            # Extract usage metadata
                            usage_meta = event.get("usageMetadata", {})
                            if usage_meta:
                                input_tokens = usage_meta.get(
                                    "promptTokenCount", input_tokens
                                )
                                output_tokens = usage_meta.get(
                                    "candidatesTokenCount", output_tokens
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
            logger.error("Gemini API timeout")
            yield {
                "type": "error",
                "error": "Generation timed out. Please try again.",
            }
        except httpx.HTTPError as e:
            logger.error("Gemini HTTP error: %s", str(e))
            yield {
                "type": "error",
                "error": "Failed to connect to AI service.",
            }
        except Exception as e:
            logger.error("Gemini provider error: %s", str(e), exc_info=True)
            yield {
                "type": "error",
                "error": "Something went wrong. Please try again.",
            }

    async def call_planner(self, messages: list[dict], model: str) -> dict:
        """Non-streaming planner call via Gemini generateContent API."""
        config = get_model_config(model)
        api_model = config["api_model"]

        contents = self._convert_messages(messages)

        payload = {
            "system_instruction": {"parts": [{"text": PLANNER_SYSTEM_PROMPT}]},
            "contents": contents,
            "generation_config": {"max_output_tokens": 600, "temperature": 0.1},
        }

        api_key = get_gemini_key()
        url = f"{GEMINI_API_BASE}/{api_model}:generateContent?key={api_key}"

        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(30.0)) as client:
                resp = await client.post(url, json=payload, headers={"Content-Type": "application/json"})
                data = resp.json()
                text = ""
                for candidate in data.get("candidates", []):
                    for part in candidate.get("content", {}).get("parts", []):
                        if "text" in part:
                            text += part["text"]
                meta = data.get("usageMetadata", {})
                plan = self._parse_plan(text)
                plan["usage"] = {
                    "inputTokens": meta.get("promptTokenCount", 0),
                    "outputTokens": meta.get("candidatesTokenCount", 0),
                }
                return plan
        except Exception as e:
            logger.error("Gemini planner error: %s", str(e), exc_info=True)
            return {"thinking": "", "files": [], "usage": {"inputTokens": 0, "outputTokens": 0}}

    @staticmethod
    def _convert_messages(messages: list[dict]) -> list[dict]:
        """
        Convert messages from OpenAI/internal format to Gemini format.
        - OpenAI "system"/"developer" → handled via system_instruction (not in contents)
        - OpenAI "user" → role: "user"
        - OpenAI "assistant" → role: "model"
        """
        contents = []
        for msg in messages:
            role = msg.get("role", "")
            content = msg.get("content", "")

            if role in ("system", "developer"):
                continue

            gemini_role = "model" if role == "assistant" else "user"
            contents.append({
                "role": gemini_role,
                "parts": [{"text": content}],
            })

        return contents
