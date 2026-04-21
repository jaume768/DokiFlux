/**
 * Demo-mode API helpers and local-storage caching.
 * The session identity is primarily a httpOnly cookie — localStorage only
 * keeps a mirror for instant UX (no loading flash on /demo reload).
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export interface DemoSessionState {
  session_id: string;
  credits_remaining: string; // decimal string "1.234567"
  file_map: Record<string, string>;
  chat_history: Array<{ role: "user" | "assistant"; content: string }>;
  framework: string;
  generation_count: number;
  migrated: boolean;
}

const LS_KEY = "dokiflux_demo_state";

export function readDemoState(): DemoSessionState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DemoSessionState;
  } catch {
    return null;
  }
}

export function writeDemoState(state: DemoSessionState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    // localStorage full / disabled — ignore, cookie still works.
  }
}

export function clearDemoState() {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    /* no-op */
  }
}

export interface DemoStartArgs {
  fingerprint: string;
  prompt?: string;
  framework?: "react" | "vue" | "nextjs";
}

export interface DemoStartError {
  error: string;
  code?: string;
  status: number;
}

export async function demoStart(args: DemoStartArgs): Promise<DemoSessionState> {
  const res = await fetch(`${API_BASE}/demo/start/`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fingerprint: args.fingerprint,
      prompt: args.prompt || "",
      framework: args.framework || "react",
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    const err: DemoStartError = {
      error: data?.error || "No se pudo iniciar la demo",
      code: data?.code,
      status: res.status,
    };
    throw err;
  }
  const state = data as DemoSessionState;
  writeDemoState(state);
  return state;
}

export async function demoGetSession(): Promise<DemoSessionState | null> {
  try {
    const res = await fetch(`${API_BASE}/demo/session/`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as DemoSessionState;
    writeDemoState(data);
    return data;
  } catch {
    return null;
  }
}

export interface DemoMigrateResponse {
  project_id: number | null;
  already_migrated: boolean;
  bonus_granted: boolean;
}

export async function demoMigrate(): Promise<DemoMigrateResponse> {
  const res = await fetch(`${API_BASE}/demo/migrate/`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("migrate_failed");
  }
  const data = (await res.json()) as DemoMigrateResponse;
  clearDemoState();
  return data;
}

/**
 * Dev-only: wipe the current demo session on the backend and return fresh state.
 * Will 404 in production (DEMO_DEV_MODE=False).
 */
export async function demoReset(): Promise<DemoSessionState | null> {
  try {
    const res = await fetch(`${API_BASE}/demo/reset/`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as DemoSessionState;
    writeDemoState(data);
    return data;
  } catch {
    return null;
  }
}

export function hasDemoState(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return !!localStorage.getItem(LS_KEY);
  } catch {
    return false;
  }
}
