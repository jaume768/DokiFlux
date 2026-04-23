"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Sparkles,
  Star,
  Zap,
  Check,
  ChevronDown,
  Cpu,
  Users,
} from "lucide-react";
import { useFingerprint } from "@/hooks/useFingerprint";
import { demoStart, writeDemoState } from "@/lib/demo";

const CHIPS = [
  "Landing SaaS",
  "Dashboard con KPIs",
  "App de tareas",
  "Portfolio",
];

const GENERATED_FILES = ["App.tsx", "Hero.tsx", "Pricing.tsx", "FAQ.tsx"];

const PLACEHOLDER =
  "Crea una landing SaaS para un software de gestión de reservas con hero, pricing, testimonios y FAQ…";

export function Hero() {
  const [visible, setVisible] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fingerprint = useFingerprint();

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  function autoGrow() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
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
      sessionStorage.setItem("demo_initial_prompt", prompt.trim());
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

  const fadeIn = (delay: number) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(20px)",
    transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s`,
  });

  return (
    <section className="relative min-h-screen flex items-center overflow-x-hidden pt-24 pb-10 md:pt-28 md:pb-16">
      {/* Background */}
      <div className="absolute inset-0 grid-pattern pointer-events-none" style={{ opacity: 0.45 }} />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(139,92,246,0.22) 0%, rgba(99,102,241,0.08) 45%, transparent 70%)" }} />
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-sky-500/8 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-5 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-10 lg:gap-14 items-start">

          {/* ─────────── LEFT — message & CTAs ─────────── */}
          <div className="min-w-0 w-full max-w-xl lg:pt-6">
            {/* Micro-proof */}
            <div
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium mb-7"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                ...fadeIn(0),
              }}
            >
              <span className="flex items-center gap-0.5 text-amber-400">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} size={11} className="fill-amber-400" />
                ))}
              </span>
              <span className="text-white/80">Más de 500 prototipos creados</span>
            </div>

            {/* H1 */}
            <h1
              className="text-[30px] sm:text-5xl lg:text-[58px] font-black tracking-tight leading-[1.1] text-white mb-6 break-words"
              style={fadeIn(0.08)}
            >
              Genera prototipos frontend{" "}
              <span className="gradient-text">con IA.</span>
              <br />
              Lánzalos <span className="gradient-text">cuando validen.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-base md:text-lg text-white/55 leading-relaxed mb-8" style={fadeIn(0.16)}>
              Describe tu idea, obtén una preview funcional con código multiarchivo
              en segundos y refínala por chat. Si quieres convertirlo en producto real,
              nuestro equipo puede llevarlo a producción.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5" style={fadeIn(0.24)}>
              <Link
                href="/demo"
                className="btn-primary group inline-flex items-center justify-center gap-2 text-[15px] font-bold text-white px-6 py-3.5 rounded-xl cursor-pointer"
                style={{ boxShadow: "0 0 32px rgba(139,92,246,0.30)" }}
              >
                <Zap size={15} className="fill-white" />
                Probar demo sin registro
                <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="#contacto"
                className="inline-flex items-center justify-center gap-2 text-[15px] font-semibold text-white px-6 py-3.5 rounded-xl transition-colors cursor-pointer"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                <Users size={15} />
                Hablar con el equipo
              </Link>
            </div>

            {/* Tertiary link */}
            <Link
              href="#como-funciona"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-300 hover:text-violet-200 transition-colors mb-6 cursor-pointer"
              style={fadeIn(0.3)}
            >
              Ver cómo funciona
              <ArrowRight size={14} />
            </Link>

            {/* Trust row */}
            <div
              className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/55"
              style={fadeIn(0.36)}
            >
              {["Sin tarjeta", "Código exportable", "Soporte en español"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400/80" />
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* ─────────── RIGHT — embedded demo ─────────── */}
          <div className="min-w-0 w-full" style={fadeIn(0.2)}>
            <form
              id="pruebalo"
              onSubmit={handleSubmit}
              className="relative rounded-2xl overflow-hidden scroll-mt-20"
              style={{
                background:
                  "linear-gradient(180deg, rgba(22,18,38,0.92) 0%, rgba(12,12,22,0.95) 100%)",
                border: "1px solid rgba(139,92,246,0.28)",
                boxShadow:
                  "0 32px 80px -20px rgba(0,0,0,0.6), 0 0 80px -20px rgba(139,92,246,0.25)",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-violet-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  Pruébalo ahora
                </div>
                <div className="hidden sm:block text-[11px] font-medium text-emerald-300/80">
                  Sin registro. Sin tarjeta. En 10 segundos.
                </div>
              </div>

              {/* Prompt area */}
              <div className="p-4 sm:p-5 space-y-3.5">
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => { setPrompt(e.target.value); autoGrow(); }}
                  onKeyDown={handleKeyDown}
                  placeholder={PLACEHOLDER}
                  disabled={isStarting}
                  rows={2}
                  className="w-full resize-none bg-transparent text-[14px] leading-relaxed text-white placeholder:text-white/35 outline-none min-h-[56px] max-h-[160px] rounded-xl px-4 py-3"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
                />

                {/* Chips + model + CTA */}
                <div className="flex flex-wrap items-center gap-2">
                  {CHIPS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => { setPrompt(c === "Landing SaaS" ? PLACEHOLDER : `Crea un ${c.toLowerCase()} moderno y limpio con secciones completas.`); setTimeout(() => { textareaRef.current?.focus(); autoGrow(); }, 0); }}
                      disabled={isStarting}
                      className="text-xs px-3 py-1.5 rounded-lg text-white/65 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div
                    className="inline-flex items-center gap-1.5 text-[11px] text-white/50 px-2.5 py-1.5 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <Cpu className="w-3 h-3" />
                    Gemini 3.1 Flash
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  </div>
                  <div className="flex-1 min-w-0" />
                  <button
                    type="submit"
                    disabled={!prompt.trim() || isStarting}
                    className="btn-primary inline-flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ boxShadow: "0 4px 14px -2px rgba(139,92,246,0.45)" }}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {isStarting ? "Iniciando…" : "Generar demo"}
                  </button>
                </div>

                {error && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                    {error}
                  </div>
                )}
              </div>

              {/* "Generando archivos" strip */}
              <div
                className="flex items-center gap-2 px-5 py-2.5 overflow-x-auto"
                style={{ borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.015)", scrollbarWidth: "none" }}
              >
                <span className="inline-flex items-center gap-1.5 text-[11px] text-white/50 shrink-0">
                  <div className="w-3 h-3 rounded-full border-2 border-violet-400/40 border-t-violet-400 animate-spin" />
                  Generando archivos…
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {GENERATED_FILES.map((f) => (
                    <span
                      key={f}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-300 px-2 py-1 rounded-md"
                      style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.18)" }}
                    >
                      <Check className="w-3 h-3" />
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              {/* Preview tabs */}
              <div className="flex items-center gap-1 px-3 pt-2" style={{ background: "rgba(255,255,255,0.015)" }}>
                {(["preview", "code"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className="text-[11px] font-medium px-3 py-1.5 rounded-t-md transition-colors cursor-pointer"
                    style={
                      activeTab === tab
                        ? { background: "rgba(139,92,246,0.12)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.22)", borderBottom: "none" }
                        : { color: "rgba(255,255,255,0.45)" }
                    }
                  >
                    {tab === "preview" ? "Vista previa" : "Código"}
                  </button>
                ))}
              </div>

              {/* Preview frame */}
              <div
                className="relative mx-3 mb-3 rounded-lg overflow-hidden"
                style={{ background: "#0c0c14", border: "1px solid rgba(255,255,255,0.06)", aspectRatio: "16 / 10" }}
              >
                {activeTab === "preview" ? (
                  <>
                    <Image
                      src="/landing/demo-review.png"
                      alt="Demo preview"
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-cover object-top"
                      onError={(e) => {
                        const img = e.currentTarget as HTMLImageElement;
                        img.style.display = "none";
                      }}
                    />
                    {/* Fallback content shown under the image (visible if image fails to load transparently) */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 pointer-events-none" style={{ zIndex: -1 }}>
                      <Sparkles className="w-10 h-10 text-violet-400 mb-3" />
                      <p className="text-sm text-white/60 font-medium">Preview en directo</p>
                      <p className="text-xs text-white/30 mt-1">Coloca tu imagen en /public/landing/demo-review.png</p>
                    </div>
                  </>
                ) : (
                  <div className="h-full p-4 font-mono text-[11px] leading-relaxed overflow-hidden">
                    <div className="text-violet-400">import <span className="text-white">React</span> from <span className="text-emerald-400">&apos;react&apos;</span></div>
                    <div className="text-violet-400">import <span className="text-sky-400">{"{ motion }"}</span> from <span className="text-emerald-400">&apos;framer-motion&apos;</span></div>
                    <div className="h-3" />
                    <div className="text-violet-400">export default <span className="text-sky-400">function</span> <span className="text-amber-400">App</span><span className="text-white/60">() {"{"}</span></div>
                    <div className="text-white/60 pl-4">return (</div>
                    <div className="text-emerald-400/70 pl-8">&lt;motion.div className=<span className="text-emerald-400">&quot;p-8 rounded-2xl&quot;</span>&gt;</div>
                    <div className="text-emerald-400/70 pl-12">&lt;Hero /&gt;</div>
                    <div className="text-emerald-400/70 pl-12">&lt;Pricing /&gt;</div>
                    <div className="text-emerald-400/70 pl-8">&lt;/motion.div&gt;</div>
                    <div className="text-white/60 pl-4">)</div>
                    <div className="text-white/60">{"}"}</div>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* ─────────── Stats strip (mismo tamaño que en Testimonials) ─────────── */}
        <div
          className="mt-10 md:mt-14 rounded-2xl p-6 grid grid-cols-2 md:grid-cols-4 gap-6"
          style={{
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.06)",
            ...fadeIn(0.4),
          }}
        >
          {[
            { value: "500+", label: "Prototipos creados" },
            { value: "< 30s", label: "Primer resultado" },
            { value: "11+", label: "Modelos de IA" },
            { value: "98%", label: "Satisfacción" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl md:text-3xl font-black gradient-text mb-1">{stat.value}</div>
              <div className="text-white/75 text-[14px] font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
