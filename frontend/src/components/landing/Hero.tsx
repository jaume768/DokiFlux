"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Zap, Star } from "lucide-react";

function TypingText({ texts, speed = 60, pause = 2000 }: { texts: string[]; speed?: number; pause?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = texts[textIndex];
    if (!deleting && charIndex < current.length) {
      const t = setTimeout(() => {
        setDisplayed(current.slice(0, charIndex + 1));
        setCharIndex(charIndex + 1);
      }, speed);
      return () => clearTimeout(t);
    }
    if (!deleting && charIndex === current.length) {
      const t = setTimeout(() => setDeleting(true), pause);
      return () => clearTimeout(t);
    }
    if (deleting && charIndex > 0) {
      const t = setTimeout(() => {
        setDisplayed(current.slice(0, charIndex - 1));
        setCharIndex(charIndex - 1);
      }, speed / 2);
      return () => clearTimeout(t);
    }
    if (deleting && charIndex === 0) {
      setDeleting(false);
      setTextIndex((textIndex + 1) % texts.length);
    }
  }, [charIndex, deleting, textIndex, texts, speed, pause]);

  return (
    <span>
      {displayed}
      <span className="cursor-blink" />
    </span>
  );
}

function CodeTyping() {
  const lines = [
    { num: 1, tokens: [{ text: "import ", cls: "text-violet-400" }, { text: "React", cls: "text-white" }, { text: " from ", cls: "text-violet-400" }, { text: "'react'", cls: "text-emerald-400" }] },
    { num: 2, tokens: [{ text: "import ", cls: "text-violet-400" }, { text: "{ motion }", cls: "text-sky-400" }, { text: " from ", cls: "text-violet-400" }, { text: "'framer-motion'", cls: "text-emerald-400" }] },
    { num: 3, tokens: [] },
    { num: 4, tokens: [{ text: "export default ", cls: "text-violet-400" }, { text: "function ", cls: "text-sky-400" }, { text: "App", cls: "text-amber-400" }, { text: "() {", cls: "text-white/60" }] },
    { num: 5, tokens: [{ text: "  return (", cls: "text-white/60" }] },
    { num: 6, tokens: [{ text: '    <motion.div className="', cls: "text-emerald-400/70" }, { text: "p-8 rounded-2xl", cls: "text-emerald-400" }, { text: '">', cls: "text-emerald-400/70" }] },
  ];

  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    if (visibleLines < lines.length) {
      const t = setTimeout(() => setVisibleLines(visibleLines + 1), 400);
      return () => clearTimeout(t);
    }
  }, [visibleLines, lines.length]);

  return (
    <div className="font-mono text-[11px] leading-relaxed space-y-0.5">
      {lines.slice(0, visibleLines).map((line) => (
        <div key={line.num} className="flex gap-3">
          <span className="text-white/20 w-4 text-right select-none">{line.num}</span>
          <span>
            {line.tokens.map((tok, i) => (
              <span key={i} className={tok.cls}>{tok.text}</span>
            ))}
          </span>
        </div>
      ))}
      {visibleLines < lines.length && (
        <div className="flex gap-3">
          <span className="text-white/20 w-4 text-right select-none">{visibleLines + 1}</span>
          <span className="cursor-blink" />
        </div>
      )}
    </div>
  );
}

export function Hero() {
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <section ref={sectionRef} className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background glows */}
      <div className="absolute inset-0 hero-glow pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-sky-500/8 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute inset-0 grid-pattern pointer-events-none" style={{ opacity: 0.5 }} />

      <div className="relative z-10 max-w-7xl mx-auto px-5 md:px-8 py-20 md:py-28">
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-20">
          {/* Left content */}
          <div className="flex-1 text-center lg:text-left max-w-2xl">
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-sm mb-8"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(20px)",
                transition: "opacity 0.6s ease, transform 0.6s ease",
              }}
            >
              <span className="flex items-center gap-1 text-amber-400">
                <Star size={12} className="fill-amber-400" />
                <Star size={12} className="fill-amber-400" />
                <Star size={12} className="fill-amber-400" />
                <Star size={12} className="fill-amber-400" />
                <Star size={12} className="fill-amber-400" />
              </span>
              <span className="text-white/85 text-xs">Más de 500 prototipos creados</span>
            </div>

            {/* H1 */}
            <h1
              className="text-4xl sm:text-5xl md:text-6xl lg:text-[68px] font-black tracking-tight leading-[1.06] mb-6"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(24px)",
                transition: "opacity 0.65s ease 0.1s, transform 0.65s ease 0.1s",
              }}
            >
              <span className="text-white">Crea con IA.</span>
              <br />
              <span className="gradient-text">
                <TypingText
                  texts={["Lanza con nosotros.", "Escala con expertos.", "Llévalo a producción."]}
                  speed={70}
                  pause={2500}
                />
              </span>
            </h1>

            {/* Subtitle */}
            <p
              className="text-lg sm:text-xl md:text-2xl text-white/85 max-w-xl leading-relaxed mb-10 mx-auto lg:mx-0"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(20px)",
                transition: "opacity 0.65s ease 0.2s, transform 0.65s ease 0.2s",
              }}
            >
              Del prompt a un prototipo funcional en segundos. ¿Quieres llevarlo a producción?{" "}
              <span className="text-white/90 font-medium">Nuestro equipo lo hace por ti.</span>
            </p>

            {/* CTAs */}
            <div
              className="flex flex-wrap items-center gap-4 justify-center lg:justify-start mb-8"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(20px)",
                transition: "opacity 0.65s ease 0.3s, transform 0.65s ease 0.3s",
              }}
            >
              <Link
                href="/register"
                className="btn-primary relative group inline-flex items-center gap-2.5 text-[15px] font-bold text-white px-7 py-4 rounded-xl"
                style={{ boxShadow: "0 0 32px rgba(139,92,246,0.30)" }}
              >
                <Zap size={16} className="relative z-10 fill-white" />
                <span className="relative z-10">Empieza gratis</span>
                <ArrowRight size={16} className="relative z-10 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link
                href="#como-funciona"
                className="btn-secondary inline-flex items-center gap-2 text-[14px] font-medium text-white/85 px-6 py-4 rounded-xl"
              >
                Cómo funciona
              </Link>
            </div>

            {/* Trust line */}
            <div
              className="flex flex-wrap items-center gap-4 justify-center lg:justify-start text-sm text-white/70"
              style={{
                opacity: visible ? 1 : 0,
                transition: "opacity 0.65s ease 0.45s",
              }}
            >
              {["Sin tarjeta de crédito", "Cancelación inmediata", "Soporte en español"].map((text, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <span className="text-emerald-400/80 text-xs">✓</span>
                  {text}
                </span>
              ))}
            </div>
          </div>

          {/* Right: Demo Panel */}
          <div
            className="flex-1 w-full max-w-lg lg:max-w-xl"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(30px)",
              transition: "opacity 0.7s ease 0.3s, transform 0.7s ease 0.3s",
            }}
          >
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 0 60px rgba(139,92,246,0.08)",
              }}
            >
              {/* Browser chrome */}
              <div
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                </div>
                <div
                  className="flex-1 mx-4 h-6 rounded-md flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <span className="text-[10px] text-white/25">dokiflux.app</span>
                </div>
              </div>

              {/* Panel content */}
              <div className="flex h-72 sm:h-80">
                {/* Chat side */}
                <div
                  className="w-2/5 p-3 flex flex-col gap-2 overflow-hidden"
                  style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div className="text-[10px] text-white/30 font-medium mb-1">Chat</div>
                  <div className="rounded-lg p-2.5" style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.2)" }}>
                    <p className="text-[10px] text-white/60 leading-relaxed">
                      Crea un dashboard con stat cards, gráfico de tendencia y tabla de datos...
                    </p>
                  </div>
                  <div className="rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
                        <Zap size={6} className="text-white fill-white" />
                      </div>
                      <span className="text-[9px] text-white/60 font-medium">DokiFlux</span>
                    </div>
                    <p className="text-[10px] text-white/50 leading-relaxed">
                      Generando 4 archivos: App.tsx, StatCard.tsx, Chart.tsx...
                    </p>
                    <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-full progress-animate" style={{ background: "linear-gradient(90deg, #8b5cf6, #38bdf8)" }} />
                    </div>
                  </div>
                </div>

                {/* Code side */}
                <div className="flex-1 p-3 overflow-hidden">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-0.5 rounded text-[9px] font-medium" style={{ background: "rgba(139,92,246,0.2)", color: "#c084fc" }}>App.tsx</span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-medium text-white/25" style={{ background: "rgba(255,255,255,0.04)" }}>StatCard.tsx</span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-medium text-white/25" style={{ background: "rgba(255,255,255,0.04)" }}>Chart.tsx</span>
                  </div>
                  <CodeTyping />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
