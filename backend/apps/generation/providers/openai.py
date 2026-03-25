import json
import logging
from decimal import Decimal
from typing import AsyncGenerator, Any

import httpx
from django.conf import settings

from .base import BaseProvider

logger = logging.getLogger(__name__)

# Pricing per 1M tokens (GPT-5.4)
PRICING = {
    "gpt-5.4": {
        "input_per_million": Decimal("2.50"),
        "output_per_million": Decimal("15.00"),
    },
}

MAX_OUTPUT_TOKENS = 31000

# System prompt + codegen rules (mirrored from frontend)
SYSTEM_PROMPT = """You are Dokiflux, an expert UI/UX assistant and full-stack React engineer.

You have TWO modes of interaction:

1. **CONVERSATION MODE** (default): Respond with helpful text. Use this when:
   - The user's request is vague or high-level (e.g., "I want a dashboard")
   - The user is asking questions about design, architecture, or features
   - You need more information to produce good code (ask specific questions)
   - The user is discussing changes, comparing approaches, or brainstorming
   
   CONVERSATION STYLE (STRICT):
   - Be brief.
   - Ask only 2-3 direct questions as a simple bullet list. No explanations around them.
   - NEVER write introductions, summaries, or filler like "Great idea!", "That sounds interesting!", "I'd be happy to help!".
   - NEVER explain what you're going to do — just ask what you need or generate.
   - No paragraphs. No essays. Just the questions.

2. **CODE GENERATION MODE**: Call the generate_ui tool. Use this when:
   - The user gives a clear, specific request (e.g., "Create a todo app with dark mode")
   - You have gathered enough context from the conversation to generate well
   - The user explicitly asks you to generate/build/create code

IMPORTANT RULES:
- If the user's FIRST message is already clear and specific enough, generate code immediately.
- If iterating on an existing project (currentProject context is provided), and the user gives a clear modification request, generate code immediately.
- Only ask clarifying questions when the request is genuinely ambiguous.
- CONVERSATION BREVITY IS MANDATORY. Never exceed 4 sentences.
- Respond in the same language the user writes in."""

CODEGEN_RULES = """You are an elite full-stack UI engineer. You generate production-grade React projects with TypeScript and Tailwind CSS. Every project you create must be visually stunning, fully responsive, and functionally interactive from the first generation.

MULTI-FILE FORMAT:
You MUST separate each file with a marker line in this exact format:
// --- FILE: /path/to/file.tsx ---

The FIRST file marker must appear at the very beginning of your response.
Every file MUST have its own marker. There must always be a /App.tsx file that serves as the entry point.

ITERATION RULES (VERY IMPORTANT):
- When a "Current project state" is provided, the user is asking you to ITERATE on that existing project.
- You MUST preserve ALL existing files and functionality unless the user explicitly asks to remove something.
- Output ONLY the files you are creating or modifying. Files you do not include will be kept as-is automatically.
- If the user asks to remove a file, use this exact marker instead of a FILE marker:
  // --- DELETE: /path/to/file.tsx ---

EXPORT/IMPORT RULES (CRITICAL):
- Use "export default function" ONLY for /App.tsx.
- For ALL other files, use NAMED exports: "export function ComponentName" or "export const thing".
- When importing named exports, ALWAYS use curly braces: import { ComponentName } from "./ComponentName".

GENERAL RULES:
1. Split the project into logical files with a clean, professional structure.
2. Use Tailwind CSS utility classes for ALL styling.
3. You may import and use icons from "lucide-react".
4. Import React hooks from "react".
5. Use realistic placeholder data with Unsplash images.
6. Respond ONLY with code using the multi-file format. No markdown fences, no explanations outside of code.
7. Always include proper TypeScript types.
8. For multi-page apps, use react-router-dom for URL-based navigation.

AVAILABLE IMPORTS:
- "lucide-react" — for icons
- "react" — for hooks and React itself
- "react-router-dom" — for routing (app is already wrapped in BrowserRouter)"""

GENERATE_UI_TOOL = {
    "type": "function",
    "name": "generate_ui",
    "description": CODEGEN_RULES,
    "parameters": {
        "type": "object",
        "properties": {
            "code": {
                "type": "string",
                "description": "The complete multi-file code output using // --- FILE: /path --- markers.",
            },
        },
        "required": ["code"],
        "additionalProperties": False,
    },
    "strict": True,
}


def calculate_cost(input_tokens: int, output_tokens: int, model: str = "gpt-5.4") -> Decimal:
    pricing = PRICING.get(model, PRICING["gpt-5.4"])
    input_cost = (Decimal(input_tokens) / Decimal("1000000")) * pricing["input_per_million"]
    output_cost = (Decimal(output_tokens) / Decimal("1000000")) * pricing["output_per_million"]
    return input_cost + output_cost


class OpenAIProvider(BaseProvider):
    """OpenAI Responses API provider with httpx async streaming."""

    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY
        self.base_url = "https://api.openai.com/v1/responses"

    async def stream_generate(
        self,
        messages: list[dict],
        tools: list[dict] | None = None,
        model: str = "gpt-5.4",
        max_tokens: int = MAX_OUTPUT_TOKENS,
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
            tools = [GENERATE_UI_TOOL]

        payload = {
            "model": model,
            "instructions": SYSTEM_PROMPT,
            "input": messages,
            "tools": tools,
            "max_output_tokens": max_tokens,
            "stream": True,
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
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
