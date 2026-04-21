"use client";

import { useState, useEffect, useRef } from "react";
import { Star, Quote } from "lucide-react";

const TESTIMONIALS = [
  {
    name: "Carlos Martínez",
    role: "CTO @ StartupFlow",
    image: "/reviews/carlos.jpg",
    quote: "DokiFlux nos permitió validar 3 ideas de producto en una semana. Lo que antes tardábamos meses en prototipar, ahora lo hacemos en horas.",
    stars: 5,
    color: "#8b5cf6",
    colorBg: "rgba(139,92,246,0.12)",
  },
  {
    name: "Ana García",
    role: "Product Designer @ PixelLab",
    image: "/reviews/ana.jpg",
    quote: "Como diseñadora, poder generar prototipos funcionales sin depender de un dev es un game changer. El servicio de producción es el broche de oro.",
    stars: 5,
    color: "#38bdf8",
    colorBg: "rgba(56,189,248,0.12)",
  },
  {
    name: "Miguel Torres",
    role: "Freelance Developer",
    image: "/reviews/miguel.jpg",
    quote: "Uso DokiFlux para crear MVPs para mis clientes. En 2 días tengo un prototipo validado y listo para presentar.",
    stars: 5,
    color: "#34d399",
    colorBg: "rgba(52,211,153,0.12)",
  },
];

const STATS = [
  { value: "500+", label: "Prototipos creados" },
  { value: "98%", label: "Satisfacción" },
  { value: "< 30s", label: "Tiempo medio" },
  { value: "12 días", label: "Media a producción" },
];

export function Testimonials() {
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.08 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-16 px-5 md:px-8 overflow-hidden">
      <div className="absolute inset-0 grid-pattern pointer-events-none" style={{ opacity: 0.5 }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] bg-violet-700/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div
          className="text-center mb-10"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
          }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.08] bg-white/[0.03] text-xs font-medium text-white/60 uppercase tracking-widest mb-2">
            <span className="w-1 h-1 rounded-full bg-emerald-400" />
            Testimonios
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2">
            Lo que dicen
            <br />
            <span className="gradient-text">nuestros usuarios</span>
          </h2>
        </div>

        {/* Testimonial cards */}
        <div className="grid gap-5 md:grid-cols-3 mb-10">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={i}
              className="rounded-2xl p-6 card-hover flex flex-col"
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.06)",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(24px)",
                transition: `opacity 0.55s ease ${i * 0.1}s, transform 0.55s ease ${i * 0.1}s`,
              }}
            >
              {/* Stars */}
              <div className="flex items-center gap-0.5 mb-4">
                {Array.from({ length: t.stars }).map((_, si) => (
                  <Star key={si} size={13} className="fill-amber-400 text-amber-400" />
                ))}
              </div>

              {/* Quote */}
              <div className="relative mb-6 flex-1">
                <Quote size={20} className="absolute -top-1 -left-1 text-white/5" />
                <p className="text-white/85 text-[15px] leading-relaxed pl-4">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>

              {/* Author */}
              <div className="flex items-center gap-3 mt-auto">
                <div
                  className="w-16 h-16 rounded-xl overflow-hidden shrink-0"
                  style={{ border: `1px solid ${t.color}40` }}
                >
                  <img
                    src={t.image}
                    alt={t.name}
                    className="w-full h-full object-cover object-top"
                    style={{ transform: "scale(1.3)", transformOrigin: "top center" }}
                  />
                </div>
                <div>
                  <div className="text-white text-[15px] font-semibold">{t.name}</div>
                  <div className="text-white/75 text-[13px]">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats strip */}
        <div
          className="rounded-2xl p-6 grid grid-cols-2 md:grid-cols-4 gap-6"
          style={{
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.06)",
            opacity: visible ? 1 : 0,
            transition: "opacity 0.6s ease 0.4s",
          }}
        >
          {STATS.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-2xl md:text-3xl font-black gradient-text mb-1">{stat.value}</div>
              <div className="text-white/75 text-[14px] font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
