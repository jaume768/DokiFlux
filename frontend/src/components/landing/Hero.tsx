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
  ChevronRight,
  Cpu,
  Users,
  Lock,
  Folder,
  FileCode2,
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

type TreeRowProps = {
  icon: "folder-chevron" | "file";
  label: string;
  indent?: number;
  active?: boolean;
  muted?: boolean;
};

function TreeRow({ icon, label, indent = 0, active, muted }: TreeRowProps) {
  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded-md"
      style={{
        paddingLeft: `${6 + indent * 14}px`,
        background: active ? "rgba(139,92,246,0.15)" : "transparent",
        color: active ? "#c4b5fd" : muted ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.75)",
      }}
    >
      {icon === "folder-chevron" ? (
        <>
          <ChevronRight className="w-3 h-3 shrink-0 opacity-70" />
          <Folder className="w-3.5 h-3.5 shrink-0 text-white/55" />
        </>
      ) : (
        <>
          <span className="w-3" />
          <FileCode2 className="w-3.5 h-3.5 shrink-0 text-violet-300/70" />
        </>
      )}
      <span className="truncate">{label}</span>
    </div>
  );
}

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
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-8 lg:gap-12 items-start">

          {/* ─────────── LEFT — message & CTAs ─────────── */}
          <div className="min-w-0 w-full lg:pt-4">
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
              className="text-[36px] sm:text-5xl lg:text-[56px] font-black tracking-tight leading-[1.1] text-white mb-5 break-words"
              style={fadeIn(0.08)}
            >
              Genera prototipos {" "}
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
                <span className="relative z-10 inline-flex items-center gap-2">
                  <Zap size={15} className="fill-white" />
                  Probar demo sin registro
                  <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-0.5" />
                </span>
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
          <div className="min-w-0 w-full hidden lg:block" style={fadeIn(0.2)}>
            <form
              id="pruebalo"
              onSubmit={handleSubmit}
              className="relative rounded-2xl overflow-hidden scroll-mt-20"
              style={{
                background:
                  "linear-gradient(180deg, rgba(22,18,38,0.95) 0%, rgba(12,12,22,0.97) 100%)",
                border: "1px solid rgba(139,92,246,0.45)",
                boxShadow:
                  "0 32px 80px -20px rgba(0,0,0,0.65), 0 0 80px -20px rgba(139,92,246,0.32)",
              }}
            >
              {/* ── Header ── */}
              <div
                className="flex items-center justify-between gap-3 px-5 py-3.5"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
              >
                <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-violet-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  Pruébalo ahora
                </div>
                <div className="hidden sm:block text-[11px] font-semibold text-emerald-300">
                  Sin registro. Sin tarjeta. En 10 segundos.
                </div>
              </div>

              {/* ── Prompt + controls (single section) ── */}
              <div
                className="p-4 sm:p-5"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
              >
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => { setPrompt(e.target.value); autoGrow(); }}
                  onKeyDown={handleKeyDown}
                  placeholder={PLACEHOLDER}
                  disabled={isStarting}
                  rows={2}
                  className="w-full resize-none bg-transparent text-[14px] leading-relaxed text-white placeholder:text-white/80 outline-none min-h-[56px] max-h-[160px] rounded-xl px-4 py-3 mb-3.5"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
                />

                {/* Single row: chips · model · CTA */}
                <div className="flex flex-wrap items-center gap-2">
                  {CHIPS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setPrompt(
                          c === "Landing SaaS"
                            ? PLACEHOLDER
                            : `Crea un ${c.toLowerCase()} moderno y limpio con secciones completas.`
                        );
                        setTimeout(() => { textareaRef.current?.focus(); autoGrow(); }, 0);
                      }}
                      disabled={isStarting}
                      className="text-xs px-3 py-1.5 rounded-lg text-white/75 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}
                    >
                      {c}
                    </button>
                  ))}

                  <div className="flex-1 min-w-0 hidden sm:block" />

                  <div
                    className="inline-flex items-center gap-1.5 text-[11px] text-white/60 px-2.5 py-1.5 rounded-lg cursor-pointer"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <Lock className="w-3 h-3" />
                    Gemini 3.1 Flash
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  </div>
                  <button
                    type="submit"
                    disabled={isStarting}
                    className="btn-primary inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-white px-4 py-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ boxShadow: "0 4px 14px -2px rgba(139,92,246,0.5)" }}
                  >
                    <span className="relative z-10 inline-flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      {isStarting ? "Iniciando…" : "Generar demo"}
                    </span>
                  </button>
                </div>

                {error && (
                  <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                    {error}
                  </div>
                )}
              </div>

              {/* ── Generando archivos strip ── */}
              <div
                className="flex items-center justify-between gap-3 px-5 py-3"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
              >
                <span className="inline-flex items-center gap-2 text-[12px] text-white/55 shrink-0">
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-violet-400/40 border-t-violet-400 animate-spin" />
                  <span className="hidden sm:inline">Generando archivos…</span>
                </span>
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {GENERATED_FILES.map((f) => (
                    <span
                      key={f}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-300 px-2 py-1 rounded-md"
                      style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.22)" }}
                    >
                      <Check className="w-3 h-3" />
                      {f}
                      <Check className="w-2.5 h-2.5 opacity-70" />
                    </span>
                  ))}
                </div>
              </div>

              {/* ── File tree + Preview (2-col) ── */}
              <div className="grid md:grid-cols-[30%_1fr]">
                {/* Left: file tree */}
                <div
                  className="hidden md:flex flex-col"
                  style={{ borderRight: "1px solid rgba(255,255,255,0.07)" }}
                >
                  {/* Tabs */}
                  <div className="flex items-center gap-4 px-4 pt-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="text-[12px] font-semibold text-white pb-2" style={{ borderBottom: "2px solid #8b5cf6" }}>
                      Archivos
                    </div>
                    <div className="text-[12px] font-medium text-white/40 pb-2">Chat</div>
                  </div>
                  {/* Tree */}
                  <div className="px-3 py-3 text-[12px] font-medium space-y-0.5">
                    <TreeRow icon="folder-chevron" label="src" />
                    <TreeRow icon="file" label="App.tsx" active indent={1} />
                    <TreeRow icon="folder-chevron" label="components" indent={1} />
                    <TreeRow icon="file" label="Hero.tsx" indent={2} muted />
                    <TreeRow icon="file" label="Features.tsx" indent={2} muted />
                    <TreeRow icon="file" label="Pricing.tsx" indent={2} muted />
                    <TreeRow icon="file" label="Testimonials.tsx" indent={2} muted />
                    <TreeRow icon="file" label="FAQ.tsx" indent={2} muted />
                    <TreeRow icon="folder-chevron" label="styles" indent={1} />
                    <TreeRow icon="file" label="package.json" indent={1} muted />
                  </div>
                </div>

                {/* Right: preview */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-4 px-4 pt-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    <button
                      type="button"
                      onClick={() => setActiveTab("preview")}
                      className="text-[12px] font-semibold pb-2 cursor-pointer"
                      style={
                        activeTab === "preview"
                          ? { color: "#fff", borderBottom: "2px solid #8b5cf6" }
                          : { color: "rgba(255,255,255,0.4)", borderBottom: "2px solid transparent" }
                      }
                    >
                      Vista previa
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("code")}
                      className="text-[12px] font-medium pb-2 cursor-pointer"
                      style={
                        activeTab === "code"
                          ? { color: "#fff", borderBottom: "2px solid #8b5cf6" }
                          : { color: "rgba(255,255,255,0.4)", borderBottom: "2px solid transparent" }
                      }
                    >
                      Código
                    </button>
                  </div>

                  <div className="relative flex-1 min-h-[280px]" style={{ background: "#0c0c14" }}>
                    {activeTab === "preview" ? (
                      <Image
                        src="/landing/demo-review.png"
                        alt="Demo preview"
                        fill
                        sizes="(max-width: 1024px) 100vw, 50vw"
                        className="object-contain"
                      />
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
                </div>
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
