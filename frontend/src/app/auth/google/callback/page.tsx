"use client";

import { useEffect } from "react";

export default function GoogleCallbackPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");

    if (error) {
      window.close();
      return;
    }

    if (code) {
      // Use localStorage as bridge — window.opener is null due to Google's COOP
      localStorage.setItem("google-oauth-code", code);
    }

    // Close the popup after a short delay to ensure storage event fires
    setTimeout(() => window.close(), 300);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground">Procesando autenticación...</p>
    </div>
  );
}
