"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiPost, apiGet, ApiError } from "@/lib/api";
import { Sparkles, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { User } from "@/types/auth";

export default function OnboardingPage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [checkStatus, setCheckStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkUsername = useCallback(async (value: string) => {
    if (value.length < 3) {
      setCheckStatus("idle");
      return;
    }

    setCheckStatus("checking");
    try {
      const res = await apiGet<{ available: boolean; suggestions?: string[] }>(
        `/auth/check-username/${value}/`,
        { auth: false }
      );
      if (res.available) {
        setCheckStatus("available");
        setSuggestions([]);
      } else {
        setCheckStatus("taken");
        setSuggestions(res.suggestions || []);
      }
    } catch {
      setCheckStatus("idle");
    }
  }, []);

  function handleUsernameChange(value: string) {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9_-]/g, "");
    setUsername(cleaned);
    setError("");

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => checkUsername(cleaned), 400);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await apiPost<User>("/auth/set-username/", { username });
      await refreshUser();
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as Record<string, string[]>;
        if (data.username) {
          setError(data.username[0]);
        } else {
          setError("Error al guardar el username.");
        }
      } else {
        setError("Error de conexión.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  // If user already has username, redirect to dashboard
  useEffect(() => {
    if (user?.has_completed_onboarding) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Sparkles className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Dokiflux</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Elige tu username</CardTitle>
            <CardDescription>
              Este será tu nombre público en Dokiflux
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium">
                  Username
                </label>
                <div className="relative">
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder="mi-username"
                    required
                    autoFocus
                    maxLength={30}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 pr-10 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    {checkStatus === "checking" && (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                    {checkStatus === "available" && (
                      <Check className="w-4 h-4 text-emerald-500" />
                    )}
                    {checkStatus === "taken" && (
                      <X className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  3-30 caracteres. Letras, números, guiones y guiones bajos.
                </p>
              </div>

              {checkStatus === "taken" && suggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Sugerencias disponibles:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setUsername(s);
                          setCheckStatus("available");
                          setSuggestions([]);
                        }}
                        className="text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80 text-foreground"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading || username.length < 3 || checkStatus === "taken" || checkStatus === "checking"}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Continuar"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
