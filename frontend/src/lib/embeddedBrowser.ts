export function getEmbeddedBrowserName(userAgent?: string): string | null {
  const ua = userAgent ?? (typeof navigator !== "undefined" ? navigator.userAgent : "");
  if (!ua) return null;

  if (/Instagram/i.test(ua)) return "Instagram";
  if (/FBAN|FBAV|FB_IAB|FB4A|FBIOS/i.test(ua)) return "Facebook";
  if (/TikTok/i.test(ua)) return "TikTok";
  if (/Line\//i.test(ua)) return "LINE";
  if (/Twitter/i.test(ua)) return "X/Twitter";
  if (/LinkedInApp/i.test(ua)) return "LinkedIn";
  if (/Snapchat/i.test(ua)) return "Snapchat";

  return null;
}

export function isEmbeddedBrowser(userAgent?: string): boolean {
  return getEmbeddedBrowserName(userAgent) !== null;
}

export function canRunWebContainer(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.crossOriginIsolated && typeof SharedArrayBuffer !== "undefined");
}
