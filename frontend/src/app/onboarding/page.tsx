"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiPost, apiGet, ApiError } from "@/lib/api";
import { Sparkles, Loader2, Check, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { User, ProjectListItem } from "@/types/auth";
import { TEMPLATES } from "@/lib/templates";

type Step = "username" | "templates";

export default function OnboardingPage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>("username");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [checkStatus, setCheckStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [creatingTemplate, setCreatingTemplate] = useState<string | null>(null);
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

  async function handleUsernameSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await apiPost<User>("/auth/set-username/", { username });
      await refreshUser();
      setStep("templates");
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

  async function handleTemplateSelect(templateId: string) {
    const template = TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;

    setCreatingTemplate(templateId);
    setError("");

    try {
      const project = await apiPost<ProjectListItem>("/projects/", {
        name: template.name,
        description: template.description,
      });
      router.push(
        `/app/generate/${project.id}?prompt=${encodeURIComponent(template.prompt)}`
      );
    } catch {
      setError("Error al crear el proyecto. Inténtalo de nuevo.");
      setCreatingTemplate(null);
    }
  }

  function handleSkip() {
    router.push("/app");
  }

  // If user already has username, go to step 2 or dashboard
  useEffect(() => {
    if (user?.has_completed_onboarding) {
      if (step === "username") {
        setStep("templates");
      }
    }
  }, [user, step]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      {step === "username" ? (
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-center gap-2 mb-8">
            <Sparkles className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Dokiflux</h1>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="h-2 w-8 rounded-full bg-primary" />
            <div className="h-2 w-8 rounded-full bg-muted" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Elige tu username</CardTitle>
              <CardDescription>
                Este será tu nombre público en Dokiflux
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUsernameSubmit} className="space-y-4">
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
      ) : (
        <div className="w-full max-w-3xl">
          <div className="flex items-center justify-center gap-2 mb-8">
            <Sparkles className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Dokiflux</h1>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="h-2 w-8 rounded-full bg-primary" />
            <div className="h-2 w-8 rounded-full bg-primary" />
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold">¿Con qué quieres empezar?</h2>
            <p className="mt-2 text-muted-foreground">
              Elige un template para generar tu primer proyecto o empieza desde cero
            </p>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg mb-6 text-center">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
            {TEMPLATES.map((template) => (
              <Card
                key={template.id}
                className="group cursor-pointer transition-all hover:ring-2 hover:ring-primary/20 hover:shadow-md"
                onClick={() => handleTemplateSelect(template.id)}
              >
                <div className="flex h-24 items-center justify-center bg-muted/50 text-4xl rounded-t-xl">
                  {creatingTemplate === template.id ? (
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  ) : (
                    template.emoji
                  )}
                </div>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{template.category}</Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <CardDescription className="line-clamp-2 text-xs">
                    {template.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Button variant="ghost" onClick={handleSkip} size="lg">
              Empezar desde cero
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
