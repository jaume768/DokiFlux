"""
Thread-safe round-robin API key rotation for AI providers.
"""

import logging
import threading

from django.conf import settings

logger = logging.getLogger(__name__)


class KeyPool:
    """Thread-safe round-robin API key pool."""

    def __init__(self, keys: list[str]):
        self._keys = [k.strip() for k in keys if k.strip()]
        self._index = 0
        self._lock = threading.Lock()

    @property
    def available(self) -> bool:
        """Return True if at least one key is configured."""
        return len(self._keys) > 0

    @property
    def size(self) -> int:
        return len(self._keys)

    def next(self) -> str:
        """Return the next API key in round-robin order."""
        if not self._keys:
            raise RuntimeError("No API keys configured for this provider.")
        with self._lock:
            key = self._keys[self._index % len(self._keys)]
            self._index += 1
            return key


def _parse_keys(env_name_plural: str, env_name_singular: str) -> list[str]:
    """
    Parse keys from settings, with backward compatibility.
    Tries the plural (comma-separated) first, falls back to singular.
    """
    plural = getattr(settings, env_name_plural, [])
    if isinstance(plural, str):
        plural = [k.strip() for k in plural.split(",") if k.strip()]
    elif isinstance(plural, list):
        plural = [k.strip() for k in plural if k.strip()]

    if plural:
        return plural

    # Fallback to singular key
    singular = getattr(settings, env_name_singular, "")
    if singular and singular.strip():
        return [singular.strip()]

    return []


# Singleton pools — initialized lazily on first access
_openai_pool: KeyPool | None = None
_anthropic_pool: KeyPool | None = None
_gemini_pool: KeyPool | None = None
_init_lock = threading.Lock()


def _ensure_pools():
    """Initialize pools once (thread-safe)."""
    global _openai_pool, _anthropic_pool, _gemini_pool
    if _openai_pool is not None:
        return
    with _init_lock:
        if _openai_pool is not None:
            return
        _openai_pool = KeyPool(
            _parse_keys("OPENAI_API_KEYS", "OPENAI_API_KEY")
        )
        _anthropic_pool = KeyPool(
            _parse_keys("ANTHROPIC_API_KEYS", "ANTHROPIC_API_KEY")
        )
        _gemini_pool = KeyPool(
            _parse_keys("GEMINI_API_KEYS", "GEMINI_API_KEY")
        )
        logger.info(
            "KeyPool initialized — OpenAI: %d keys, Anthropic: %d keys, Gemini: %d keys",
            _openai_pool.size,
            _anthropic_pool.size,
            _gemini_pool.size,
        )


def get_openai_key() -> str:
    _ensure_pools()
    return _openai_pool.next()


def get_anthropic_key() -> str:
    _ensure_pools()
    return _anthropic_pool.next()


def get_gemini_key() -> str:
    _ensure_pools()
    return _gemini_pool.next()
