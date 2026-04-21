"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiPost, apiGet, ApiError } from "@/lib/api";
import Image from "next/image";
import { Loader2, Check, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      sessionStorage.setItem(`initial_prompt_${project.id}`, template.prompt);
      window.location.href = `/app/generate/${project.id}`;
    } catch {
      setError("Error al crear el proyecto. Inténtalo de nuevo.");
      setCreatingTemplate(null);
    }
  }

  function handleSkip() {
    window.location.href = "/app";
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
    <div className="landing bg-[#0a0a0f] text-white min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="absolute inset-0 grid-pattern pointer-events-none" style={{ opacity: 0.35 }} />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] pointer-events-none" style={{ background: "radial-gradient(ellipse, rgba(139,92,246,0.18) 0%, transparent 70%)" }} />

      {step === "username" ? (
        <div className="relative z-10 w-full max-w-sm">
          <div className="flex items-center justify-center mb-6">
            <Image src="/logo-texto-blanco.png" alt="DokiFlux" width={220} height={55} className="h-11 w-auto" />
          </div>

          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="h-1.5 w-8 rounded-full" style={{ background: "#8b5cf6" }} />
            <div className="h-1.5 w-8 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
          </div>

          <div className="rounded-2xl p-7" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(20px)" }}>
            <h1 className="text-xl font-bold text-white mb-1">Elige tu username</h1>
            <p className="text-white/50 text-sm mb-6">Este será tu nombre público en Dokiflux</p>

            <form onSubmit={handleUsernameSubmit} className="space-y-4">
              {error && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl">{error}</div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="username" className="text-sm font-medium text-white/70">Username</label>
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
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 pr-10 text-sm text-white placeholder:text-white/25 outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {checkStatus === "checking" && <Loader2 className="w-4 h-4 animate-spin text-white/40" />}
                    {checkStatus === "available" && <Check className="w-4 h-4 text-emerald-400" />}
                    {checkStatus === "taken" && <X className="w-4 h-4 text-red-400" />}
                  </div>
                </div>
                <p className="text-xs text-white/30">3-30 caracteres. Letras, números, guiones y guiones bajos.</p>
              </div>

              {checkStatus === "taken" && suggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-white/40">Sugerencias disponibles:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => { setUsername(s); setCheckStatus("available"); setSuggestions([]); }}
                        className="text-xs px-2.5 py-1 rounded-lg text-white/70 hover:text-white transition-colors"
                        style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
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
                className="btn-primary w-full rounded-xl py-2.5 font-semibold"
                size="lg"
              >
                {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</> : "Continuar"}
              </Button>
            </form>
          </div>
        </div>
      ) : (
        <div className="relative z-10 w-full max-w-4xl">
          <div className="flex items-center justify-center mb-6">
            <Image src="/logo-texto-blanco.png" alt="DokiFlux" width={220} height={55} className="h-11 w-auto" />
          </div>

          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="h-1.5 w-8 rounded-full" style={{ background: "#8b5cf6" }} />
            <div className="h-1.5 w-8 rounded-full" style={{ background: "#8b5cf6" }} />
          </div>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white">¿Con qué quieres empezar?</h2>
            <p className="mt-2 text-white/50 text-base">Elige un template para tu primer proyecto o empieza desde cero</p>
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl mb-6 text-center">{error}</div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
            {TEMPLATES.map((template) => (
              <div
                key={template.id}
                className="group cursor-pointer rounded-2xl overflow-hidden transition-all duration-300"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
                onClick={() => handleTemplateSelect(template.id)}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(139,92,246,0.35)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 24px rgba(139,92,246,0.12)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(255,255,255,0.07)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
              >
                <div className="relative h-36 overflow-hidden" style={{ background: "rgba(10,10,20,0.8)" }}>
                  {creatingTemplate === template.id ? (
                    <div className="flex h-full items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#8b5cf6" }} />
                    </div>
                  ) : (
                    <img
                      src={template.image}
                      alt={template.name}
                      className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = "none";
                        const fallback = target.nextElementSibling as HTMLElement | null;
                        if (fallback) fallback.style.display = "flex";
                      }}
                    />
                  )}
                  <div className="hidden h-full items-center justify-center text-4xl">{template.emoji}</div>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold tracking-widest uppercase px-2 py-0.5 rounded-md" style={{ background: "rgba(139,92,246,0.15)", color: "#c084fc", border: "1px solid rgba(139,92,246,0.2)" }}>
                      {template.category}
                    </span>
                    <ArrowRight className="h-4 w-4 text-white/20 transition-all duration-200 group-hover:text-violet-400 group-hover:translate-x-0.5" />
                  </div>
                  <p className="text-white font-semibold text-base mb-1">{template.name}</p>
                  <p className="text-white/45 text-sm leading-relaxed line-clamp-2">{template.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button
              onClick={handleSkip}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-base font-semibold text-white/70 hover:text-white transition-all duration-200 hover:border-white/20"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              Empezar desde cero
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
