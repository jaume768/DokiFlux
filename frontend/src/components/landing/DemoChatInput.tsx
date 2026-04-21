"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, SendHorizonal, Loader2, Lock } from "lucide-react";
import { useFingerprint } from "@/hooks/useFingerprint";
import { demoStart, writeDemoState } from "@/lib/demo";

const SUGGESTIONS = [
  "Una landing page para una cafetería con menú y reservas",
  "Dashboard de analytics con gráficas y KPIs",
  "App de lista de tareas con drag & drop",
  "Portfolio personal para un diseñador gráfico",
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-400/25 bg-violet-400/5 text-xs font-medium text-violet-300 uppercase tracking-widest mb-4">
            <Sparkles className="w-3 h-3" />
            Pruébalo ahora
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-3">
            Sin registro.
            <br />
            <span className="gradient-text">En 10 segundos.</span>
          </h2>
          <p className="text-white/70 text-lg max-w-xl mx-auto">
            Escribe lo que quieres construir y la IA genera el código en directo.
            <span className="text-white/90 font-semibold"> para que pruebes sin dar tu email.</span> 
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
            className="rounded-2xl p-4 backdrop-blur-sm"
            style={{
              background: "rgba(15,15,25,0.7)",
              border: "1px solid rgba(139,92,246,0.28)",
              boxShadow: "0 10px 40px -10px rgba(139,92,246,0.25)",
            }}
          >
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
              className="w-full bg-transparent text-white placeholder:text-white/30 text-base outline-none resize-none min-h-[56px] max-h-[200px]"
            />

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06]">
              <div className="flex items-center gap-2 text-xs text-white/40">
                <Lock className="w-3 h-3" />
                <span>Gemini 3.1 Flash · React</span>
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
                    Generar ahora
                    <SendHorizonal className="w-4 h-4" />
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
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setPrompt(s);
                  setTimeout(() => {
                    textareaRef.current?.focus();
                    autoGrow();
                  }, 0);
                }}
                disabled={isStarting}
                className="text-xs px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-white/60 hover:text-white hover:border-white/20 hover:bg-white/[0.06] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {s}
              </button>
            ))}
          </div>
        </form>
      </div>
    </section>
  );
}
