"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiPost, apiGet, ApiError } from "@/lib/api";
import Image from "next/image";
import { Loader2, Check, X, ArrowRight, Rocket, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { User } from "@/types/auth";

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
        <div className="relative z-10 w-full max-w-md">
          <div className="flex items-center justify-center mb-6">
            <Image src="/logo-texto-blanco.png" alt="DokiFlux" width={220} height={55} className="h-11 w-auto" />
          </div>

          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="h-1.5 w-10 rounded-full" style={{ background: "#8b5cf6" }} />
            <div className="h-1.5 w-10 rounded-full" style={{ background: "rgba(255,255,255,0.18)" }} />
          </div>

          <div
            className="rounded-3xl p-8 sm:p-10"
            style={{
              background: "linear-gradient(140deg, rgba(139,92,246,0.10) 0%, rgba(20,18,35,0.92) 70%)",
              border: "2px solid rgba(139,92,246,0.55)",
              boxShadow: "0 0 0 1px rgba(139,92,246,0.18), 0 24px 60px -22px rgba(139,92,246,0.45), 0 0 80px -28px rgba(99,102,241,0.4)",
              backdropFilter: "blur(20px)",
            }}
          >
            <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Elige tu username</h1>
            <p className="text-white/85 text-base mb-7">Este será tu nombre público en Dokiflux</p>

            <form onSubmit={handleUsernameSubmit} className="space-y-5">
              {error && (
                <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 px-3 py-2.5 rounded-xl">{error}</div>
              )}

              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-semibold text-white">Username</label>
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
                    className="w-full rounded-xl bg-white/5 border-2 border-white/15 px-4 py-3.5 pr-11 text-base text-white placeholder:text-white/35 outline-none focus:border-violet-400/70 focus:ring-2 focus:ring-violet-500/30 transition-all"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    {checkStatus === "checking" && <Loader2 className="w-5 h-5 animate-spin text-white/50" />}
                    {checkStatus === "available" && <Check className="w-5 h-5 text-emerald-400" />}
                    {checkStatus === "taken" && <X className="w-5 h-5 text-red-400" />}
                  </div>
                </div>
                <p className="text-xs text-white/55">3-30 caracteres. Letras, números, guiones y guiones bajos.</p>
              </div>

              {checkStatus === "taken" && suggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-white">Sugerencias disponibles:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => { setUsername(s); setCheckStatus("available"); setSuggestions([]); }}
                        className="text-sm px-3 py-1.5 rounded-lg text-white hover:text-white transition-colors"
                        style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.4)" }}
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
                className="btn-primary w-full rounded-xl py-3 text-base font-semibold"
                size="lg"
              >
                {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</> : "Continuar"}
              </Button>
            </form>
          </div>
        </div>
      ) : (
        <div className="relative z-10 w-full max-w-2xl">
          <div className="flex items-center justify-center mb-6">
            <Image src="/logo-texto-blanco.png" alt="DokiFlux" width={220} height={55} className="h-11 w-auto" />
          </div>

          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="h-1.5 w-8 rounded-full" style={{ background: "#8b5cf6" }} />
            <div className="h-1.5 w-8 rounded-full" style={{ background: "#8b5cf6" }} />
          </div>

          <div className="text-center mb-10">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">¿Con qué quieres empezar?</h2>
            <p className="mt-3 text-white/85 text-lg">Elige cómo quieres crear tu primer proyecto</p>
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl mb-6 text-center">{error}</div>
          )}

          <div className="grid gap-6 sm:grid-cols-2 mb-8">
            {/* ── Empezar de cero ── */}
            <button
              onClick={() => { window.location.href = "/app"; }}
              className="group relative rounded-2xl p-9 sm:p-10 text-left transition-all duration-300 cursor-pointer"
              style={{
                background: "linear-gradient(140deg, rgba(139,92,246,0.10) 0%, rgba(20,18,35,0.92) 70%)",
                border: "2px solid rgba(139,92,246,0.55)",
                boxShadow: "0 0 0 1px rgba(139,92,246,0.18), 0 24px 60px -22px rgba(139,92,246,0.45), 0 0 80px -28px rgba(99,102,241,0.4)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.border = "2px solid rgba(167,139,250,0.85)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 0 1px rgba(167,139,250,0.35), 0 28px 80px -20px rgba(139,92,246,0.6), 0 0 100px -20px rgba(99,102,241,0.55)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.border = "2px solid rgba(139,92,246,0.55)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 0 1px rgba(139,92,246,0.18), 0 24px 60px -22px rgba(139,92,246,0.45), 0 0 80px -28px rgba(99,102,241,0.4)";
              }}
            >
              <div className="flex items-center gap-4 mb-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "rgba(139,92,246,0.22)", border: "1px solid rgba(139,92,246,0.45)" }}>
                  <Rocket className="h-7 w-7" style={{ color: "#c4b5fd" }} />
                </div>
                <span className="text-2xl font-bold text-white">Empezar de cero</span>
              </div>
              <p className="text-base text-white leading-relaxed mb-6">
                Crea tu proyecto con tu propia descripción desde la pantalla principal.
              </p>
              <div className="flex items-center gap-2 text-base font-semibold text-white group-hover:text-violet-200 transition-colors">
                Ir al generador <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </div>
            </button>

            {/* ── Usar template ── */}
            <button
              onClick={() => { router.push("/app/templates"); }}
              className="group relative rounded-2xl p-9 sm:p-10 text-left transition-all duration-300 cursor-pointer"
              style={{
                background: "linear-gradient(140deg, rgba(99,102,241,0.10) 0%, rgba(20,18,35,0.92) 70%)",
                border: "2px solid rgba(139,92,246,0.55)",
                boxShadow: "0 0 0 1px rgba(139,92,246,0.18), 0 24px 60px -22px rgba(139,92,246,0.45), 0 0 80px -28px rgba(99,102,241,0.4)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.border = "2px solid rgba(167,139,250,0.85)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 0 1px rgba(167,139,250,0.35), 0 28px 80px -20px rgba(139,92,246,0.6), 0 0 100px -20px rgba(99,102,241,0.55)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.border = "2px solid rgba(139,92,246,0.55)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 0 1px rgba(139,92,246,0.18), 0 24px 60px -22px rgba(139,92,246,0.45), 0 0 80px -28px rgba(99,102,241,0.4)";
              }}
            >
              <div className="flex items-center gap-4 mb-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "rgba(139,92,246,0.22)", border: "1px solid rgba(139,92,246,0.45)" }}>
                  <LayoutTemplate className="h-7 w-7" style={{ color: "#c4b5fd" }} />
                </div>
                <span className="text-2xl font-bold text-white">Usar un template</span>
              </div>
              <p className="text-base text-white leading-relaxed mb-6">
                Elige entre proyectos predefinidos: landing, e-commerce, portfolio…
              </p>
              <div className="flex items-center gap-2 text-base font-semibold text-white group-hover:text-violet-200 transition-colors">
                Ver templates <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
