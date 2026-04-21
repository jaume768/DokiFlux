"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";

function DotGrid() {
  const dots: { top: string; left: string; opacity: number }[] = [];
  const cols = 20;
  const rows = 8;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const distFromCenter = Math.sqrt(
        Math.pow((c / (cols - 1)) - 0.5, 2) +
        Math.pow((r / (rows - 1)) - 0.5, 2)
      );
      const opacity = Math.max(0, 0.18 - distFromCenter * 0.32);
      dots.push({
        top: `${(r / (rows - 1)) * 100}%`,
        left: `${(c / (cols - 1)) * 100}%`,
        opacity,
      });
    }
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {dots.map((d, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-white -translate-x-0.5 -translate-y-0.5"
          style={{ top: d.top, left: d.left, opacity: d.opacity }}
        />
      ))}
    </div>
  );
}

export function FinalCTA() {
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative py-20 px-5 md:px-8 overflow-hidden"
    >
      {/* Deep background gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 50% 60%, rgba(99,102,241,0.10) 0%, rgba(139,92,246,0.07) 35%, transparent 70%)",
        }}
      />

      {/* Top edge fade */}
      <div
        className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, #0a0a0f, transparent)" }}
      />

      {/* Bottom edge fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
        style={{ background: "linear-gradient(to top, #0a0a0f, transparent)" }}
      />

      {/* Dot grid pattern */}
      <DotGrid />

      {/* Large ambient glow orbs */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full blur-[120px] pointer-events-none transition-opacity duration-700"
        style={{
          background: "radial-gradient(ellipse, rgba(139,92,246,0.18) 0%, rgba(99,102,241,0.10) 50%, transparent 100%)",
          opacity: hovered ? 1 : 0.7,
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center text-center">
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/25 bg-violet-500/10 text-sm font-medium text-violet-300 mb-10"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.6s ease 0.05s, transform 0.6s ease 0.05s",
            boxShadow: "0 0 24px rgba(139,92,246,0.15)",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Más de 500 equipos ya prototipan con IA
        </div>

        {/* H2 */}
        <h2
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.06] mb-6"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.65s ease 0.15s, transform 0.65s ease 0.15s",
          }}
        >
          <span className="text-white">Tu próximo producto</span>
          <br />
          <span className="gradient-text">empieza con un prompt.</span>
        </h2>

        {/* Subtitle */}
        <p
          className="text-lg sm:text-xl md:text-2xl text-white/85 max-w-xl leading-relaxed mb-12"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.65s ease 0.25s, transform 0.65s ease 0.25s",
          }}
        >
          Únete a más de{" "}
          <span className="text-white/90 font-semibold">500 equipos</span> que ya
          prototipan con IA y lanzan productos reales con nuestro equipo.
        </p>

        {/* CTA Button */}
        <div
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.65s ease 0.35s, transform 0.65s ease 0.35s",
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <a
            href="/demo"
            className="btn-primary relative group inline-flex items-center gap-3 text-base sm:text-lg font-bold text-white px-9 py-5 rounded-2xl"
            style={{
              boxShadow: hovered
                ? "0 0 60px rgba(139,92,246,0.55), 0 16px 48px rgba(99,102,241,0.30)"
                : "0 0 32px rgba(139,92,246,0.30), 0 8px 24px rgba(99,102,241,0.18)",
              transition: "box-shadow 0.4s ease",
            }}
          >
            {/* Inner glow */}
            <span
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,255,255,0.12), transparent 70%)",
              }}
            />

            <span className="relative z-10">Empieza gratis</span>

            <ArrowRight size={20} className="relative z-10 transition-transform duration-300 group-hover:translate-x-1" />
          </a>
        </div>

        {/* Trust line */}
        <div
          className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 mt-7 text-sm text-white/70"
          style={{
            opacity: visible ? 1 : 0,
            transition: "opacity 0.65s ease 0.5s",
          }}
        >
          {["Sin tarjeta de crédito", "Cancelación inmediata", "Soporte en español"].map((text, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="w-px h-3.5 bg-white/[0.10]" />}
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-400/80 text-xs">✓</span>
                {text}
              </span>
            </span>
          ))}
        </div>

        {/* Decorative line separator */}
        <div
          className="mt-20 w-full max-w-xs h-px pointer-events-none"
          style={{
            background: "linear-gradient(to right, transparent, rgba(139,92,246,0.25), transparent)",
            opacity: visible ? 1 : 0,
            transition: "opacity 0.65s ease 0.65s",
          }}
        />
      </div>
    </section>
  );
}
