const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const TOKEN_KEY = "dokiflux_tokens";

export interface StoredTokens {
  access: string;
  refresh: string;
}

// --- Token storage ---

export function getStoredTokens(): StoredTokens | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredTokens(tokens: StoredTokens): void {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

export function clearStoredTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// --- API client ---

let isRefreshing = false;
let refreshPromise: Promise<StoredTokens | null> | null = null;

async function refreshAccessToken(): Promise<StoredTokens | null> {
  const tokens = getStoredTokens();
  if (!tokens?.refresh) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: tokens.refresh }),
    });

    if (!res.ok) {
      clearStoredTokens();
      return null;
    }

    const data = await res.json();
    const newTokens: StoredTokens = {
      access: data.access,
      refresh: tokens.refresh,
    };
    setStoredTokens(newTokens);
    return newTokens;
  } catch {
    clearStoredTokens();
    return null;
  }
}

async function getValidAccessToken(): Promise<string | null> {
  const tokens = getStoredTokens();
  if (!tokens?.access) return null;
  return tokens.access;
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

  if (auth) {
    const token = await getValidAccessToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

  let res = await fetch(url, {
    ...fetchOptions,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Auto-refresh on 401
  if (res.status === 401 && auth) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshAccessToken();
    }

    const newTokens = await refreshPromise;
    isRefreshing = false;
    refreshPromise = null;

    if (newTokens) {
      headers["Authorization"] = `Bearer ${newTokens.access}`;
      res = await fetch(url, {
        ...fetchOptions,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } else {
      // Refresh failed — redirect to login
      if (typeof window !== "undefined") {
        clearStoredTokens();
        window.location.href = "/login";
      }
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

export { API_BASE };
