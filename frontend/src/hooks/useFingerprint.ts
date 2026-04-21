"use client";

import { useEffect, useState } from "react";

/**
 * Lazy-load @fingerprintjs/fingerprintjs and compute a stable browser
 * fingerprint. Returns null until the fingerprint has been computed.
 *
 * The hash is used on the backend (salted + SHA-256) as one of three
 * anti-abuse signals for demo-mode (the other two being the session cookie
 * and the hashed IP).
 */
export function useFingerprint(): string | null {
  const [fp, setFp] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await import("@fingerprintjs/fingerprintjs");
        const fpjs = await mod.default.load();
        const result = await fpjs.get();
        if (!cancelled) setFp(result.visitorId);
      } catch {
        // Never block the user if fingerprinting fails — backend still has
        // cookie + IP as fallback signals.
        if (!cancelled) setFp("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return fp;
}

// prueba
