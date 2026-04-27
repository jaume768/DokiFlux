"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Sparkles, Star } from "lucide-react";

const BENEFITS = [
  "Genera prototipos funcionales en segundos",
  "Multi-archivo, código limpio y exportable",
  "Iteración por chat con IA · sin perder contexto",
  "Llévalo a producción con nuestro equipo senior",
];

interface AuthShellProps {
  children: React.ReactNode;
  /** Optional copy override for the marketing side */
  heading?: React.ReactNode;
  subheading?: string;
}

export function AuthShell({ children, heading, subheading }: AuthShellProps) {
  return (
    <div
      className="landing bg-[#0a0a0f] text-white min-h-screen relative overflow-hidden"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Background layers */}
      <div className="absolute inset-0 grid-pattern pointer-events-none" style={{ opacity: 0.4 }} />
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[600px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse, rgba(139,92,246,0.22) 0%, rgba(99,102,241,0.10) 40%, transparent 70%)",
        }}
      />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-violet-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top bar */}
      <div className="relative z-20 px-5 md:px-8 pt-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio
        </Link>
      </div>

      <div className="relative z-10 min-h-[calc(100vh-3rem)] grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] items-center gap-6 lg:gap-4 px-5 md:px-8 py-6 lg:py-8 max-w-6xl mx-auto">
        {/* ───── LEFT: marketing ───── */}
        <div className="hidden lg:flex flex-col justify-center max-w-xl mx-auto">
          <div className="mb-7">
            <Image
              src="/logo-texto-blanco.png"
              alt="DokiFlux"
              width={240}
              height={60}
              className="h-12 w-auto"
            />
          </div>

          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-violet-200 mb-6 self-start"
            style={{
              background:
                "linear-gradient(135deg, rgba(139,92,246,0.25) 0%, rgba(99,102,241,0.15) 100%)",
              border: "1px solid rgba(139,92,246,0.45)",
              boxShadow: "0 0 24px rgba(139,92,246,0.25)",
            }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Idea → Producción
          </div>

          <h1 className="text-5xl xl:text-6xl font-black tracking-tight leading-[1.05] text-white mb-5 text-balance">
            {heading ?? (
              <>
                Genera. <span className="gradient-text">Valida.</span>{" "}
                <span className="gradient-text">Lanza.</span>
              </>
            )}
          </h1>

          <p className="text-lg text-white/65 leading-relaxed mb-8">
            {subheading ??
              "Únete a más de 500 founders y equipos que ya construyen producto real con DokiFlux."}
          </p>

          {/* Benefit list */}
          <ul className="space-y-3 mb-8">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-3 text-[15px] text-white/80">
                <CheckCircle2
                  className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5"
                  strokeWidth={2.5}
                />
                <span>{b}</span>
              </li>
            ))}
          </ul>

          {/* Social proof */}
          <div
            className="inline-flex items-center gap-3 px-4 py-2.5 rounded-full self-start"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <span className="flex items-center gap-0.5 text-amber-400">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} size={13} className="fill-amber-400" />
              ))}
            </span>
            <span className="text-sm text-white/75 font-medium">
              Más de <span className="font-bold text-white">500 prototipos</span> creados
            </span>
          </div>
        </div>

        {/* ───── RIGHT: form ───── */}
        <div className="w-full max-w-md mx-auto">
          {/* Mobile-only logo */}
          <div className="flex lg:hidden items-center justify-center mb-8">
            <Image
              src="/logo-texto-blanco.png"
              alt="DokiFlux"
              width={220}
              height={55}
              className="h-11 w-auto"
            />
          </div>

          <div className="relative">
            {/* Animated gradient halo behind the form */}
            <div
              aria-hidden
              className="absolute -inset-1.5 rounded-[26px] opacity-70 blur-[22px] pointer-events-none"
              style={{
                background:
                  "linear-gradient(135deg, rgba(139,92,246,0.55) 0%, rgba(99,102,241,0.45) 50%, rgba(56,189,248,0.35) 100%)",
                animation: "pulse-glow 3.5s ease-in-out infinite",
              }}
            />

            <div
              className="relative rounded-3xl p-7 md:p-9 backdrop-blur-md"
              style={{
                background:
                  "linear-gradient(180deg, rgba(20,18,35,0.92) 0%, rgba(12,12,22,0.96) 100%)",
                border: "2px solid rgba(139,92,246,0.55)",
                boxShadow:
                  "0 0 0 1px rgba(139,92,246,0.18), 0 30px 80px -20px rgba(139,92,246,0.5), 0 0 100px -20px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
