export interface User {
  id: number;
  email: string;
  username: string | null;
  full_name: string;
  is_email_verified: boolean;
  auth_provider: "email" | "google";
  date_joined: string;
  has_completed_onboarding: boolean;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  password_confirm: string;
  full_name: string;
}

export interface SetUsernameRequest {
  username: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  new_password: string;
  new_password_confirm: string;
}

export interface AuthResponse {
  tokens: AuthTokens;
  user: User;
}

export interface BalanceResponse {
  balance: string;
  plan: {
    plan_type: "free" | "premium";
    started_at: string | null;
  };
}

export interface CreditTransaction {
  id: number;
  amount: string;
  tx_type: "monthly_grant" | "purchase" | "generation" | "refund" | "expiry";
  description: string;
  generation_id: number | null;
  created_at: string;
}

export interface PlanDefinition {
  name: string;
  price_monthly: string;
  monthly_credits: string;
  messages_per_day: string;
  show_badge: string;
  max_file_map_kb: string;
}

export interface ProjectListItem {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface ProjectDetail {
  id: number;
  name: string;
  description: string;
  file_map: Record<string, string>;
  created_at: string;
  updated_at: string;
  message_count?: number;
  file_map_size_kb?: number;
}

export interface ProjectCreateRequest {
  name: string;
  description?: string;
}

export interface ChatMessageResponse {
  id: number;
  role: "user" | "assistant";
  content: string;
  message_type: "chat" | "code" | "error";
  usage: { inputTokens: number; outputTokens: number; cost: number } | null;
  raw_code: string;
  created_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
