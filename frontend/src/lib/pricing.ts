/** Matches the shape returned by GET /api/models/ */
export interface BackendModel {
  id: string;
  display_name: string;
  provider: string;
  category: string;
  max_output_tokens: number;
  premium_only?: boolean;
  pricing: {
    input_per_million: number;
    output_per_million: number;
  };
}

/** Normalised model config used throughout the frontend */
export interface ModelConfig {
  id: string;
  provider: string;
  category: string;
  displayName: string;
  inputPerMillion: number;
  outputPerMillion: number;
  maxOutputTokens: number;
  premiumOnly: boolean;
}

export type ModelId = string;

export const DEFAULT_MODEL: ModelId = "gemini-3.1-flash";

/** Map a raw backend model response to the frontend ModelConfig shape */
export function normaliseModel(m: BackendModel): ModelConfig {
  return {
    id: m.id,
    provider: m.provider,
    category: m.category,
    displayName: m.display_name,
    inputPerMillion: m.pricing.input_per_million,
    outputPerMillion: m.pricing.output_per_million,
    maxOutputTokens: m.max_output_tokens,
    premiumOnly: m.premium_only ?? false,
  };
}

export interface CostEstimate {
  inputTokens: number;
  inputCost: number;
  estimatedOutputMin: number;
  estimatedOutputMax: number;
  estimatedCostMin: number;
  estimatedCostMax: number;
}

export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  config: Pick<ModelConfig, "inputPerMillion" | "outputPerMillion">
): number {
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
