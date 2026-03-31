const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// --- API client (cookie-based auth — no localStorage) ---

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/token/refresh/`, {
      method: "POST",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export interface ApiOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  auth?: boolean;
  rawResponse?: boolean;
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, data: unknown) {
    const message =
      typeof data === "object" && data !== null && "detail" in data
        ? String((data as Record<string, unknown>).detail)
        : typeof data === "string"
          ? data
          : `API error ${status}`;
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function api<T = unknown>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const { body, auth = true, rawResponse = false, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

  let res = await fetch(url, {
    ...fetchOptions,
    headers,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });

  // Auto-refresh on 401 using the httpOnly refresh_token cookie
  if (res.status === 401 && auth) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshAccessToken();
    }

    const refreshed = await refreshPromise;
    isRefreshing = false;
    refreshPromise = null;

    if (refreshed) {
      res = await fetch(url, {
        ...fetchOptions,
        headers,
        credentials: "include",
        body: body ? JSON.stringify(body) : undefined,
      });
    } else {
      throw new ApiError(401, { detail: "Session expired" });
    }
  }

  if (rawResponse) {
    return res as unknown as T;
  }

  if (!res.ok) {
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      data = await res.text();
    }
    throw new ApiError(res.status, data);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

// --- Convenience wrappers ---

export function apiGet<T>(path: string, options?: ApiOptions) {
  return api<T>(path, { ...options, method: "GET" });
}

export function apiPost<T>(path: string, body?: unknown, options?: ApiOptions) {
  return api<T>(path, { ...options, method: "POST", body });
}

export function apiPatch<T>(path: string, body?: unknown, options?: ApiOptions) {
  return api<T>(path, { ...options, method: "PATCH", body });
}

export function apiDelete<T>(path: string, options?: ApiOptions) {
  return api<T>(path, { ...options, method: "DELETE" });
}

// --- Generation status polling ---

export interface GenerationStatus {
  id: number;
  status: "pending" | "streaming" | "completed" | "cancelled" | "failed" | "no_changes";
  input_tokens: number;
  output_tokens: number;
  cost: number;
  files_changed: number;
  created_at: string;
  completed_at: string | null;
  result_file_map?: Record<string, string>;
}

export interface ActiveGeneration {
  active: boolean;
  generation_id?: number;
  status?: string;
  created_at?: string;
}

export function getGenerationStatus(generationId: number): Promise<GenerationStatus> {
  return apiGet<GenerationStatus>(`/generate/status/${generationId}/`);
}

export function getActiveGeneration(projectId: number): Promise<ActiveGeneration> {
  return apiGet<ActiveGeneration>(`/projects/${projectId}/active-generation/`);
}

export { API_BASE };
