const PRICING = {
  "gpt-5.4": {
    inputPerMillion: 2.5,
    outputPerMillion: 15.0,
  },
} as const;

export type ModelId = keyof typeof PRICING;

export const DEFAULT_MODEL: ModelId = "gpt-5.4";

export const MAX_OUTPUT_TOKENS = 31000;

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
  const pricing = PRICING[model];
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMillion;

  // Heuristic: first generation produces more output than iterations
  const estimatedOutputMin = hasHistory ? 300 : 800;
  const estimatedOutputMax = MAX_OUTPUT_TOKENS;

  const minOutputCost = (estimatedOutputMin / 1_000_000) * pricing.outputPerMillion;
  const maxOutputCost = (estimatedOutputMax / 1_000_000) * pricing.outputPerMillion;

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
  const pricing = PRICING[model];
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMillion;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillion;
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
