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
