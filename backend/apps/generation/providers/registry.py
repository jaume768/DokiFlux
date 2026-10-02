"""
Centralized model registry: config, pricing, and limits for all AI models.

Prices stored here are the **real API base costs** (per million tokens, USD).
COST_MARKUP is applied on top in calculate_cost to determine what users are charged.
To change the margin, only COST_MARKUP needs to be updated.
"""

from decimal import Decimal

# Multiplier applied on top of raw API cost when charging users.
# 3 means the user is charged 3× the actual API price.
COST_MARKUP = Decimal("3")


# `max_output_tokens` is the per-request cap we send to the provider (it also
# drives the worst-case cost estimate), not the model's hard limit. Reasoning /
# thinking tokens count against it on all three providers, so higher-effort
# variants get more headroom. Hard limits: 128K (OpenAI GPT-6, Claude 5.x),
# 65,536 (Gemini 3.x).
MODEL_REGISTRY = {
    # ── OpenAI ────────────────────────────────────────────────
    # GPT-6 family. `reasoning_effort` is always sent explicitly: GPT-6.1 Sol
    # and GPT-6 Astra accept low | medium | high | xhigh | max (no `none`).
    # Prices are the short-context tier (≤272K input tokens).
    "gpt-6-luna": {
        "provider": "openai",
        "api_model": "gpt-6-luna",
        "reasoning_effort": "low",
        "input_per_million": Decimal("0.10"),
        "output_per_million": Decimal("0.50"),
        "max_output_tokens": 64000,
        "display_name": "GPT-6 Luna",
        "category": "openai",
    },
    "gpt-6.1-sol-low": {
        "provider": "openai",
        "api_model": "gpt-6.1-sol",
        "reasoning_effort": "low",
        "input_per_million": Decimal("2.00"),
        "output_per_million": Decimal("10.00"),
        "max_output_tokens": 64000,
        "display_name": "GPT-6.1 Sol (Low)",
        "category": "openai",
    },
    "gpt-6.1-sol": {
        "provider": "openai",
        "api_model": "gpt-6.1-sol",
        "reasoning_effort": "medium",
        "input_per_million": Decimal("2.00"),
        "output_per_million": Decimal("10.00"),
        "max_output_tokens": 64000,
        "display_name": "GPT-6.1 Sol",
        "category": "openai",
    },
    "gpt-6.1-sol-high": {
        "provider": "openai",
        "api_model": "gpt-6.1-sol",
        "reasoning_effort": "high",
        "input_per_million": Decimal("2.00"),
        "output_per_million": Decimal("10.00"),
        "max_output_tokens": 96000,
        "display_name": "GPT-6.1 Sol (High)",
        "category": "openai",
        "premium_only": True,
    },
    "gpt-6.1-sol-xhigh": {
        "provider": "openai",
        "api_model": "gpt-6.1-sol",
        "reasoning_effort": "xhigh",
        "input_per_million": Decimal("2.00"),
        "output_per_million": Decimal("10.00"),
        "max_output_tokens": 96000,
        "display_name": "GPT-6.1 Sol (xHigh)",
        "category": "openai",
        "premium_only": True,
    },
    "gpt-6-astra": {
        "provider": "openai",
        "api_model": "gpt-6-astra",
        "reasoning_effort": "medium",
        "input_per_million": Decimal("10.00"),
        "output_per_million": Decimal("50.00"),
        "max_output_tokens": 64000,
        "display_name": "GPT-6 Astra",
        "category": "openai",
        "premium_only": True,
    },
    "gpt-6-astra-high": {
        "provider": "openai",
        "api_model": "gpt-6-astra",
        "reasoning_effort": "high",
        "input_per_million": Decimal("10.00"),
        "output_per_million": Decimal("50.00"),
        "max_output_tokens": 96000,
        "display_name": "GPT-6 Astra (High)",
        "category": "openai",
        "premium_only": True,
    },

    # ── Anthropic ─────────────────────────────────────────────
    # Thinking is always on for these models; `thinking_effort` is the only
    # control (sent as `output_config.effort`). `refusal_fallback` opts into
    # server-side fallbacks so a safety-classifier decline is retried on
    # another model instead of failing the generation.
    "claude-sonnet-5.5-low": {
        "provider": "anthropic",
        "api_model": "claude-sonnet-5-5",
        "thinking_effort": "low",
        "refusal_fallback": True,
        "input_per_million": Decimal("2.00"),
        "output_per_million": Decimal("10.00"),
        "max_output_tokens": 128000,
        "display_name": "Claude Sonnet 5.5 (Low)",
        "category": "anthropic",
    },
    "claude-sonnet-5.5-medium": {
        "provider": "anthropic",
        "api_model": "claude-sonnet-5-5",
        "thinking_effort": "medium",
        "refusal_fallback": True,
        "input_per_million": Decimal("2.00"),
        "output_per_million": Decimal("10.00"),
        "max_output_tokens": 128000,
        "display_name": "Claude Sonnet 5.5 (Medium)",
        "category": "anthropic",
        "premium_only": True,
    },
    "claude-sonnet-5.5-high": {
        "provider": "anthropic",
        "api_model": "claude-sonnet-5-5",
        "thinking_effort": "high",
        "refusal_fallback": True,
        "input_per_million": Decimal("2.00"),
        "output_per_million": Decimal("10.00"),
        "max_output_tokens": 128000,
        "display_name": "Claude Sonnet 5.5 (High)",
        "category": "anthropic",
        "premium_only": True,
    },
    "claude-opus-5.5-low": {
        "provider": "anthropic",
        "api_model": "claude-opus-5-5",
        "thinking_effort": "low",
        "refusal_fallback": True,
        "input_per_million": Decimal("4.00"),
        "output_per_million": Decimal("20.00"),
        "max_output_tokens": 128000,
        "display_name": "Claude Opus 5.5 (Low)",
        "category": "anthropic",
    },
    "claude-opus-5.5-medium": {
        "provider": "anthropic",
        "api_model": "claude-opus-5-5",
        "thinking_effort": "medium",
        "refusal_fallback": True,
        "input_per_million": Decimal("4.00"),
        "output_per_million": Decimal("20.00"),
        "max_output_tokens": 128000,
        "display_name": "Claude Opus 5.5 (Medium)",
        "category": "anthropic",
        "premium_only": True,
    },
    "claude-opus-5.5-high": {
        "provider": "anthropic",
        "api_model": "claude-opus-5-5",
        "thinking_effort": "high",
        "refusal_fallback": True,
        "input_per_million": Decimal("4.00"),
        "output_per_million": Decimal("20.00"),
        "max_output_tokens": 128000,
        "display_name": "Claude Opus 5.5 (High)",
        "category": "anthropic",
        "premium_only": True,
    },
    "claude-fable-5.1": {
        "provider": "anthropic",
        "api_model": "claude-fable-5-1",
        "thinking_effort": "medium",
        "refusal_fallback": True,
        "input_per_million": Decimal("10.00"),
        "output_per_million": Decimal("50.00"),
        "max_output_tokens": 128000,
        "display_name": "Claude Fable 5.1",
        "category": "anthropic",
        "premium_only": True,
    },

    # ── Google Gemini ─────────────────────────────────────────
    # `thinking_level` is optional; when omitted the model default applies
    # (3.5 Flash-Lite: minimal).
    "gemini-3.5-flash-lite": {
        "provider": "gemini",
        "api_model": "gemini-3.5-flash-lite",
        "input_per_million": Decimal("0.30"),
        "output_per_million": Decimal("2.50"),
        "max_output_tokens": 65536,
        "display_name": "Gemini 3.5 Flash-Lite",
        "category": "gemini",
    },
    # Introductory pricing through 2026-12-31; $1.50 / $7.50 afterwards.
    "gemini-3.8-flash": {
        "provider": "gemini",
        "api_model": "gemini-3.8-flash",
        "thinking_level": "medium",
        "input_per_million": Decimal("0.75"),
        "output_per_million": Decimal("3.75"),
        "max_output_tokens": 65536,
        "display_name": "Gemini 3.8 Flash",
        "category": "gemini",
    },
    # Gemini 3.1 Pro is not offered: it has no free-tier quota, and the Gemini
    # key in use is a free-tier key (requests fail with 429, limit 0).
}

# Set of valid model IDs for quick validation
VALID_MODEL_IDS = frozenset(MODEL_REGISTRY.keys())

# Default model
DEFAULT_MODEL = "claude-sonnet-5.5-low"

# Retired model IDs → current successor. Old IDs are still stored on
# Generation.model / Project.last_used_model and may be sent by stale clients.
LEGACY_MODEL_ALIASES = {
    "gpt-5.5": "gpt-6.1-sol",
    "gpt-5.5-low": "gpt-6.1-sol-low",
    "gpt-5.5-medium": "gpt-6.1-sol",
    "gpt-5.5-high": "gpt-6.1-sol-high",
    "gpt-5.5-xhigh": "gpt-6.1-sol-xhigh",
    "claude-opus-4.7-low": "claude-opus-5.5-low",
    "claude-opus-4.7-medium": "claude-opus-5.5-medium",
    "claude-opus-4.7-high": "claude-opus-5.5-high",
    "claude-opus-4.6": "claude-opus-5.5-medium",
    "claude-opus-4.8-low": "claude-opus-5.5-low",
    "claude-opus-4.8-medium": "claude-opus-5.5-medium",
    "claude-opus-4.8-high": "claude-opus-5.5-high",
    "claude-sonnet-5-low": "claude-sonnet-5.5-low",
    "claude-sonnet-5-medium": "claude-sonnet-5.5-medium",
    "claude-sonnet-5-high": "claude-sonnet-5.5-high",
    "gemini-3.1-flash-lite": "gemini-3.5-flash-lite",
    "gemini-3.1-pro": "gemini-3.8-flash",
}


def resolve_model_id(model_id: str) -> str:
    """Map a retired model ID to its successor; other IDs pass through."""
    return LEGACY_MODEL_ALIASES.get(model_id, model_id)


def get_model_config(model_id: str) -> dict:
    """Return the config dict for a model, or raise ValueError."""
    model_id = resolve_model_id(model_id)
    if model_id not in MODEL_REGISTRY:
        raise ValueError(
            f"Unknown model '{model_id}'. "
            f"Valid models: {', '.join(sorted(VALID_MODEL_IDS))}"
        )
    return MODEL_REGISTRY[model_id]


def calculate_cost(
    input_tokens: int, output_tokens: int, model_id: str = DEFAULT_MODEL
) -> Decimal:
    """Calculate the cost charged to the user (base API cost × COST_MARKUP)."""
    config = MODEL_REGISTRY.get(resolve_model_id(model_id))
    if config is None:
        config = MODEL_REGISTRY[DEFAULT_MODEL]
    input_cost = (
        (Decimal(input_tokens) / Decimal("1000000")) * config["input_per_million"]
    )
    output_cost = (
        (Decimal(output_tokens) / Decimal("1000000")) * config["output_per_million"]
    )
    return (input_cost + output_cost) * COST_MARKUP


def list_models() -> list[dict]:
    """Return a list of model info dicts for the /api/models/ endpoint."""
    models = []
    for model_id, cfg in MODEL_REGISTRY.items():
        models.append(
            {
                "id": model_id,
                "display_name": cfg["display_name"],
                "provider": cfg["provider"],
                "category": cfg["category"],
                "max_output_tokens": cfg["max_output_tokens"],
                "premium_only": cfg.get("premium_only", False),
                "pricing": {
                    "input_per_million": float(cfg["input_per_million"]),
                    "output_per_million": float(cfg["output_per_million"]),
                },
            }
        )
    return models
