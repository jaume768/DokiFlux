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


MODEL_REGISTRY = {
    # ── Google Gemini ─────────────────────────────────────────

    "gemini-3.1-flash-lite": {
        "provider": "gemini",
        "api_model": "gemini-3.1-flash-lite-preview",
        "input_per_million": Decimal("0.25"),
        "output_per_million": Decimal("1.50"),
        "max_output_tokens": 131072,
        "display_name": "Gemini 3.1 Flash-Lite",
        "category": "gemini",
    },
    "gemini-3.1-pro": {
        "provider": "gemini",
        "api_model": "gemini-3.1-pro-preview",
        "input_per_million": Decimal("2.00"),
        "output_per_million": Decimal("12.00"),
        "max_output_tokens": 131072,
        "display_name": "Gemini 3.1 Pro",
        "category": "gemini",
        "premium_only": True,
    },

    # ── Anthropic ─────────────────────────────────────────────

    "claude-opus-4.7-low": {
        "provider": "anthropic",
        "api_model": "claude-opus-4-7",
        "thinking_effort": "low",
        "input_per_million": Decimal("5.00"),
        "output_per_million": Decimal("25.00"),
        "max_output_tokens": 163840,
        "display_name": "Claude Opus 4.7 (Low)",
        "category": "anthropic",
    },
    "claude-opus-4.7-medium": {
        "provider": "anthropic",
        "api_model": "claude-opus-4-7",
        "thinking_effort": "medium",
        "input_per_million": Decimal("5.00"),
        "output_per_million": Decimal("25.00"),
        "max_output_tokens": 245760,
        "display_name": "Claude Opus 4.7 (Medium)",
        "category": "anthropic",
        "premium_only": True,
    },
    "claude-opus-4.7-high": {
        "provider": "anthropic",
        "api_model": "claude-opus-4-7",
        "thinking_effort": "high",
        "input_per_million": Decimal("5.00"),
        "output_per_million": Decimal("25.00"),
        "max_output_tokens": 327680,
        "display_name": "Claude Opus 4.7 (High)",
        "category": "anthropic",
        "premium_only": True,
    },
    "claude-opus-4.6": {
        "provider": "anthropic",
        "api_model": "claude-opus-4-6",
        "input_per_million": Decimal("5.00"),
        "output_per_million": Decimal("25.00"),
        "max_output_tokens": 163840,
        "display_name": "Claude Opus 4.6",
        "category": "anthropic",
        "premium_only": True,
    },

    # ── OpenAI ────────────────────────────────────────────────
    "gpt-5.5": {
        "provider": "openai",
        "api_model": "gpt-5.5",
        "reasoning_effort": None,
        "input_per_million": Decimal("2.50"),
        "output_per_million": Decimal("15.00"),
        "max_output_tokens": 62000,
        "display_name": "GPT-5.5",
        "category": "openai",
    },
    "gpt-5.5-low": {
        "provider": "openai",
        "api_model": "gpt-5.5",
        "reasoning_effort": "low",
        "input_per_million": Decimal("2.50"),
        "output_per_million": Decimal("15.00"),
        "max_output_tokens": 62000,
        "display_name": "GPT-5.5 (Low)",
        "category": "openai",
    },
    "gpt-5.5-medium": {
        "provider": "openai",
        "api_model": "gpt-5.5",
        "reasoning_effort": "medium",
        "input_per_million": Decimal("2.50"),
        "output_per_million": Decimal("15.00"),
        "max_output_tokens": 62000,
        "display_name": "GPT-5.5 (Medium)",
        "category": "openai",
        "premium_only": True,
    },
    "gpt-5.5-high": {
        "provider": "openai",
        "api_model": "gpt-5.5",
        "reasoning_effort": "high",
        "input_per_million": Decimal("2.50"),
        "output_per_million": Decimal("15.00"),
        "max_output_tokens": 62000,
        "display_name": "GPT-5.5 (High)",
        "category": "openai",
        "premium_only": True,
    },
    "gpt-5.5-xhigh": {
        "provider": "openai",
        "api_model": "gpt-5.5",
        "reasoning_effort": "xhigh",
        "input_per_million": Decimal("2.50"),
        "output_per_million": Decimal("15.00"),
        "max_output_tokens": 62000,
        "display_name": "GPT-5.5 (xHigh)",
        "category": "openai",
        "premium_only": True,
    },
}

# Set of valid model IDs for quick validation
VALID_MODEL_IDS = frozenset(MODEL_REGISTRY.keys())

# Default model
DEFAULT_MODEL = "gpt-5.5"


def get_model_config(model_id: str) -> dict:
    """Return the config dict for a model, or raise ValueError."""
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
    config = MODEL_REGISTRY.get(model_id)
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
