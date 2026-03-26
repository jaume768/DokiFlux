export interface ModelConfig {
  provider: "openai" | "anthropic" | "gemini";
  category: "openai" | "anthropic" | "gemini";
  displayName: string;
  inputPerMillion: number;
  outputPerMillion: number;
  maxOutputTokens: number;
}

const MODEL_REGISTRY: Record<string, ModelConfig> = {
  // ── OpenAI ──
  "gpt-5.4": {
    provider: "openai",
    category: "openai",
    displayName: "GPT-5.4",
    inputPerMillion: 2.5,
    outputPerMillion: 15.0,
    maxOutputTokens: 31000,
  },
  "gpt-5.4-low": {
    provider: "openai",
    category: "openai",
    displayName: "GPT-5.4 (Low)",
    inputPerMillion: 2.5,
    outputPerMillion: 15.0,
    maxOutputTokens: 31000,
  },
  "gpt-5.4-medium": {
    provider: "openai",
    category: "openai",
    displayName: "GPT-5.4 (Medium)",
    inputPerMillion: 2.5,
    outputPerMillion: 15.0,
    maxOutputTokens: 31000,
  },
  "gpt-5.4-high": {
    provider: "openai",
    category: "openai",
    displayName: "GPT-5.4 (High)",
    inputPerMillion: 2.5,
    outputPerMillion: 15.0,
    maxOutputTokens: 31000,
  },
  "gpt-5.4-xhigh": {
    provider: "openai",
    category: "openai",
    displayName: "GPT-5.4 (xHigh)",
    inputPerMillion: 2.5,
    outputPerMillion: 15.0,
    maxOutputTokens: 31000,
  },

  // ── Anthropic ──
  "claude-sonnet-4.6": {
    provider: "anthropic",
    category: "anthropic",
    displayName: "Claude Sonnet 4.6",
    inputPerMillion: 3.0,
    outputPerMillion: 15.0,
    maxOutputTokens: 16384,
  },
  "claude-opus-4.6": {
    provider: "anthropic",
    category: "anthropic",
    displayName: "Claude Opus 4.6",
    inputPerMillion: 5.0,
    outputPerMillion: 25.0,
    maxOutputTokens: 16384,
  },
  "claude-haiku-4.5": {
    provider: "anthropic",
    category: "anthropic",
    displayName: "Claude Haiku 4.5",
    inputPerMillion: 1.0,
    outputPerMillion: 5.0,
    maxOutputTokens: 8192,
  },

  // ── Google Gemini ──
  "gemini-3.1-pro": {
    provider: "gemini",
    category: "gemini",
    displayName: "Gemini 3.1 Pro",
    inputPerMillion: 2.0,
    outputPerMillion: 12.0,
    maxOutputTokens: 65536,
  },
  "gemini-3-flash": {
    provider: "gemini",
    category: "gemini",
    displayName: "Gemini 3 Flash",
    inputPerMillion: 0.5,
    outputPerMillion: 3.0,
    maxOutputTokens: 65536,
  },
  "gemini-3.1-flash-lite": {
    provider: "gemini",
    category: "gemini",
    displayName: "Gemini 3.1 Flash-Lite",
    inputPerMillion: 0.25,
    outputPerMillion: 1.5,
    maxOutputTokens: 65536,
  },
};

export { MODEL_REGISTRY };

export type ModelId = keyof typeof MODEL_REGISTRY;

export const DEFAULT_MODEL: ModelId = "gpt-5.4";

export function isValidModelId(id: string): id is ModelId {
  return id in MODEL_REGISTRY;
}

export const MODEL_LIST = Object.entries(MODEL_REGISTRY).map(([id, config]) => ({
  id: id as ModelId,
  ...config,
}));

export function getModelConfig(modelId: ModelId): ModelConfig {
  return MODEL_REGISTRY[modelId] ?? MODEL_REGISTRY[DEFAULT_MODEL];
}

export interface CostEstimate {
  inputTokens: number;
  inputCost: number;
  estimatedOutputMin: number;
  estimatedOutputMax: number;
  estimatedCostMin: number;
  estimatedCostMax: number;
}

export function estimateCost(
  inputTokens: number,
  hasHistory: boolean,
  model: ModelId = DEFAULT_MODEL
): CostEstimate {
  const config = getModelConfig(model);
  const inputCost = (inputTokens / 1_000_000) * config.inputPerMillion;

  // Heuristic: first generation produces more output than iterations
  const estimatedOutputMin = hasHistory ? 300 : 800;
  const estimatedOutputMax = config.maxOutputTokens;

  const minOutputCost = (estimatedOutputMin / 1_000_000) * config.outputPerMillion;
  const maxOutputCost = (estimatedOutputMax / 1_000_000) * config.outputPerMillion;

  return {
    inputTokens,
    inputCost,
    estimatedOutputMin,
    estimatedOutputMax,
    estimatedCostMin: inputCost + minOutputCost,
    estimatedCostMax: inputCost + maxOutputCost,
  };
}

export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: ModelId = DEFAULT_MODEL
): number {
  const config = getModelConfig(model);
  const inputCost = (inputTokens / 1_000_000) * config.inputPerMillion;
  const outputCost = (outputTokens / 1_000_000) * config.outputPerMillion;
  return inputCost + outputCost;
}

export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  }
  return `$${cost.toFixed(3)}`;
}

export function formatTokens(tokens: number): string {
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}k`;
  }
  return tokens.toString();
}
