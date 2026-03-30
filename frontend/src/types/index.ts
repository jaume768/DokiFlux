export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  usage?: TokenUsage;
  rawCode?: string;
  type?: "chat" | "code" | "error";
  generationId?: number;
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
  currentProject?: string;
  chatHistory: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}

export interface CostEstimate {
  inputTokens: number;
  inputCost: number;
  estimatedOutputMin: number;
  estimatedOutputMax: number;
  estimatedCostMin: number;
  estimatedCostMax: number;
}

export interface StreamChunk {
  type: "text" | "chat" | "usage" | "error" | "done" | "generation_id"
      | "thinking" | "plan" | "task_start" | "file_chunk" | "task_done";
  content?: string;
  usage?: TokenUsage;
  error?: string;
  id?: number;
  tasks?: PlanTask[];
  file_path?: string;
  index?: number;
  total?: number;
}

export interface PlanTask {
  file_path: string;
  label: string;
}

export type GenerationPhase =
  | "analyzing"
  | "planning"
  | "writing"
  | "writing-files"
  | "mounting"
  | null;

export interface GenerationProgress {
  phase: GenerationPhase;
  filesDetected: number;
  charsReceived: number;
  streamingCode: string;
  thinking?: string;
  tasks?: PlanTask[];
  currentTaskIndex?: number;
  currentTaskFile?: string;
  completedFiles?: string[];
}
