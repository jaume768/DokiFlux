/**
 * Meta Pixel + Conversions API client helpers.
 *
 * The browser fires the Pixel event and the backend fires the same event via
 * CAPI; Meta deduplicates them by sharing the same `event_id`. We pass the
 * event_id to the backend through the `X-Meta-Event-Id` header alongside the
 * `_fbp` / `_fbc` cookies (Meta click identifiers).
 */

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[] };
  }
}

export type MetaEventName =
  | "PageView"
  | "Lead"
  | "CompleteRegistration"
  | "StartTrial"
  | "Subscribe"
  | "Purchase";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp("(?:^|; )" + name.replace(/[.$?*|{}()[\]\\/+^]/g, "\\$&") + "=([^;]*)")
  );
  return match ? decodeURIComponent(match[1]) : null;
}

export function getMetaCookies(): { fbp: string | null; fbc: string | null } {
  return { fbp: readCookie("_fbp"), fbc: readCookie("_fbc") };
}

export function newMetaEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Build the headers that carry Meta tracking context to the backend so the
 * server-side CAPI event matches the browser Pixel event (deduplication).
 */
export function metaTrackingHeaders(eventId: string): Record<string, string> {
  const { fbp, fbc } = getMetaCookies();
  const headers: Record<string, string> = { "X-Meta-Event-Id": eventId };
  if (fbp) headers["X-Meta-Fbp"] = fbp;
  if (fbc) headers["X-Meta-Fbc"] = fbc;
  return headers;
}

/**
 * Fire a Pixel event from the browser. Safe to call when the Pixel is not
 * loaded (no-op). Always pair with backend CAPI using the same `eventId`.
 */
export function trackMetaEvent(
  name: MetaEventName,
  eventId: string,
  params: Record<string, unknown> = {}
): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  try {
    window.fbq("track", name, params, { eventID: eventId });
  } catch {
    // never break the app on a tracking failure
  }
}
