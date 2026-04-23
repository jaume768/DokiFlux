"use client";

import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Loader2,
  Lock,
  Coffee,
  BarChart3,
  CheckSquare,
  Palette,
} from "lucide-react";
import { useFingerprint } from "@/hooks/useFingerprint";
import { demoStart, writeDemoState } from "@/lib/demo";

const SUGGESTIONS = [
  { text: "Landing page para cafetería", icon: Coffee },
  { text: "Dashboard con KPIs", icon: BarChart3 },
  { text: "App de tareas con drag & drop", icon: CheckSquare },
  { text: "Portfolio para diseñador", icon: Palette },
];

export function DemoChatInput() {
  const [prompt, setPrompt] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fingerprint = useFingerprint();

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  function autoGrow() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!prompt.trim() || isStarting) return;
    setIsStarting(true);
    setError(null);
    try {
      const state = await demoStart({
        fingerprint: fingerprint || "",
        prompt: prompt.trim(),
        framework: "react",
      });
      writeDemoState(state);
      // Persist the prompt for the /demo page to pick up and run the first generation.
      sessionStorage.setItem("demo_initial_prompt", prompt.trim());
      // Hard navigation — /demo needs its own COOP/COEP response headers so
      // WebContainer can use SharedArrayBuffer (crossOriginIsolated=true).
      window.location.href = "/demo";
    } catch (err) {
      const e = err as { error?: string; code?: string; status?: number };
      if (e?.status === 429) {
        setError(e.error || "Has alcanzado el límite de demos gratuitas. Crea una cuenta gratis.");
      } else {
        setError(e?.error || "No se pudo iniciar la demo. Inténtalo en unos segundos.");
      }
      setIsStarting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <section
      ref={sectionRef}
      id="pruebalo"
      className="relative py-16 px-5 md:px-8 scroll-mt-20 overflow-hidden"
    >
      <div className="absolute inset-0 grid-pattern pointer-events-none" style={{ opacity: 0.4 }} />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center top, rgba(139,92,246,0.12) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto">
        <div
          className="text-center mb-8"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
          }}
        >
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-violet-400/30 bg-violet-400/10 text-xs font-semibold text-violet-200 uppercase tracking-widest mb-5"
            style={{ boxShadow: "0 0 20px rgba(139,92,246,0.15)" }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            PRUÉBALO AHORA
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-3">
            Sin registro.
            <br />
            <span className="gradient-text">En 10 segundos.</span>
          </h2>
          <p className="text-white/70 text-lg max-w-xl mx-auto">
            Describe lo que quieres construir y la IA genera el código en directo.
          </p>
          <p className="text-white font-semibold text-base mt-1">
            Pruébalo <span className="gradient-text font-bold">sin dar tu email</span>.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="relative mx-auto max-w-2xl"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.6s ease 0.15s, transform 0.6s ease 0.15s",
          }}
        >
          <div
            className="rounded-2xl p-5 backdrop-blur-md"
            style={{
              background:
                "linear-gradient(180deg, rgba(20,18,35,0.85) 0%, rgba(12,12,22,0.9) 100%)",
              border: "1px solid rgba(139,92,246,0.35)",
              boxShadow:
                "0 0 0 1px rgba(139,92,246,0.1), 0 10px 40px -10px rgba(139,92,246,0.3), inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            <div className="relative flex items-start gap-3">
              <Sparkles className="mt-2.5 w-4 h-4 text-violet-400/40 shrink-0 pointer-events-none" />
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  autoGrow();
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ej: Una landing page para una cafetería con menú, reservas y testimonios..."
                disabled={isStarting}
                rows={2}
                className="w-full bg-transparent text-white placeholder:text-white/35 text-[15px] leading-relaxed outline-none resize-none min-h-[56px] max-h-[200px]"
              />
            </div>

            <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-white/[0.08]">
              <div className="flex items-center gap-2 text-xs text-white/30">
                <Lock className="w-3 h-3" />
                <span>Gemini 3.1 Flash</span>
              </div>
              <button
                type="submit"
                disabled={!prompt.trim() || isStarting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background:
                    "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
                  boxShadow: "0 4px 14px -2px rgba(139,92,246,0.4)",
                }}
              >
                {isStarting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Iniciando…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generar ahora
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-300">
              {error}
            </div>
          )}

          {/* Suggestions */}
          <div className="mt-5 grid grid-cols-2 gap-2">
            {SUGGESTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.text}
                  type="button"
                  onClick={() => {
                    setPrompt(s.text);
                    setTimeout(() => {
                      textareaRef.current?.focus();
                      autoGrow();
                    }, 0);
                  }}
                  disabled={isStarting}
                  className="flex items-center gap-2 text-sm px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/70 hover:text-white hover:border-white/20 hover:bg-white/[0.06] transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-left"
                >
                  <Icon className="w-4 h-4 shrink-0 text-white/50" />
                  {s.text}
                </button>
              );
            })}
          </div>
        </form>
      </div>
    </section>
  );
}
