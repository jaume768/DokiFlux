"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

interface Props {
  onError?: (msg: string) => void;
}

export default function GoogleSignInButton({ onError }: Props) {
  const { loginWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const popupRef = useRef<Window | null>(null);

  // Listen for the OAuth code via localStorage (bridge for popup)
  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== "google-oauth-code" || !event.newValue) return;

      const code = event.newValue;
      localStorage.removeItem("google-oauth-code");

      setIsLoading(true);
      const redirectUri = `${window.location.origin}/auth/google/callback`;
      loginWithGoogle(code, redirectUri)
        .catch((err: unknown) => {
          const msg =
            err instanceof ApiError
              ? typeof err.data === "object" &&
                err.data !== null &&
                "error" in err.data
                ? String((err.data as Record<string, unknown>).error)
                : "Error al iniciar sesión con Google."
              : "Error de conexión. Inténtalo de nuevo.";
          onError?.(msg);
        })
        .finally(() => setIsLoading(false));
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [loginWithGoogle, onError]);

  function handleClick() {
    if (!CLIENT_ID || isLoading) return;

    const redirectUri = `${window.location.origin}/auth/google/callback`;
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      prompt: "select_account",
    });

    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    popupRef.current = window.open(
      `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
      "google-oauth",
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    );
  }

  if (!CLIENT_ID) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className="w-full inline-flex items-center justify-center gap-3 rounded-lg border border-input bg-background px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
      )}
      {isLoading ? "Conectando..." : "Continuar con Google"}
    </button>
  );
}
