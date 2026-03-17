export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  usage?: TokenUsage;
  rawCode?: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

export interface SessionStats {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  generationCount: number;
}

export interface GenerateRequest {
  prompt: string;
  history: Array<{
    role: "developer" | "user" | "assistant";
    content: string;
  }>;
}

export interface StreamChunk {
  type: "text" | "usage" | "error" | "done";
  content?: string;
  usage?: TokenUsage;
  error?: string;
}
