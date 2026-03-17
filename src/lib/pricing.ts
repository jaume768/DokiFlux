const PRICING = {
  "gpt-5.4": {
    inputPerMillion: 2.5,
    outputPerMillion: 15.0,
  },
} as const;

export type ModelId = keyof typeof PRICING;

export const DEFAULT_MODEL: ModelId = "gpt-5.4";

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
