import json
import re
from abc import ABC, abstractmethod
from typing import AsyncGenerator, Any


class BaseProvider(ABC):
    """
    Abstract base for AI providers.
    Adding Claude/Gemini = subclass this and implement stream_generate.
    """

    @abstractmethod
    async def stream_generate(
        self,
        messages: list[dict],
        tools: list[dict],
        model: str,
        max_tokens: int,
    ) -> AsyncGenerator[dict[str, Any], None]:
        """
        Yield SSE-compatible chunks in standard format:
        {"type": "text", "content": "..."}
        {"type": "chat", "content": "..."}
        {"type": "usage", "usage": {"inputTokens": ..., "outputTokens": ..., "cost": ...}}
        {"type": "done"}
        {"type": "error", "error": "..."}
        """
        ...  # pragma: no cover

    @abstractmethod
    async def call_planner(
        self,
        messages: list[dict],
        model: str,
    ) -> dict:
        """
        Non-streaming planner call. Returns:
        {
            "thinking": "Brief reasoning string",
            "files": ["/App.tsx", "/components/Hero.tsx", ...],
            "usage": {"inputTokens": int, "outputTokens": int}
        }
        """
        ...  # pragma: no cover

    @staticmethod
    def _parse_plan(text: str) -> dict:
        """Parse planner JSON response into a normalized plan dict."""
        cleaned = re.sub(r"```json\s*", "", text)
        cleaned = re.sub(r"```\s*", "", cleaned).strip()
        try:
            parsed = json.loads(cleaned)
            return {
                "thinking": str(parsed.get("thinking", "")),
                "files": [f for f in parsed.get("files", []) if isinstance(f, str)],
            }
        except (json.JSONDecodeError, KeyError, TypeError):
            files = re.findall(r'"(/[^"]+\.\w+)"', text)
            return {"thinking": "", "files": files}
