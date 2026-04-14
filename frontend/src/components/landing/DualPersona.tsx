"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";

const PERSONAS = [
  {
    image: "/templates/tarjeta-programadores.png",
    title: "Desarrolladores & Freelance",
    subtitle: "Prototipa más rápido, cobra más",
    desc: "Genera MVPs funcionales en minutos para tus clientes. Valida ideas sin escribir código boilerplate. Multiplica tu productividad.",
    benefits: [
      "Genera prototipos en segundos, no días",
      "Exporta código limpio y reutilizable",
      "11+ modelos IA para elegir",
      "Chat iterativo para refinar resultados",
      "Auto-fix de errores integrado",
    ],
    cta: "Empieza gratis",
    ctaHref: "/register",
    color: "#8b5cf6",
    colorBg: "rgba(139,92,246,0.10)",
    colorBorder: "rgba(139,92,246,0.22)",
  },
  {
    image: "/templates/tarjeta-empresa.png",
    title: "Empresas & Startups",
    subtitle: "De idea a producción con garantías",
    desc: "Valida productos con tu equipo antes de invertir en desarrollo. Cuando estés listo, nuestro equipo lo lleva a producción.",
    benefits: [
      "Prototipado rápido para validar con stakeholders",
      "Comparte prototipos con un enlace",
      "Servicio de producción profesional",
      "Entrega media en 12 días laborables",
      "Soporte técnico continuo post-lanzamiento",
    ],
    cta: "Hablar con el equipo",
    ctaHref: "mailto:hola@dokiflux.app",
    color: "#38bdf8",
    colorBg: "rgba(56,189,248,0.10)",
    colorBorder: "rgba(56,189,248,0.22)",
  },
];

export function DualPersona() {
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
    <section
      id="produccion"
      ref={sectionRef}
      className="relative py-16 px-5 md:px-8 scroll-mt-20 overflow-hidden"
    >
      <div className="absolute inset-0 grid-pattern pointer-events-none" style={{ opacity: 0.5 }} />
      <div className="absolute top-1/2 left-1/4 w-80 h-80 bg-violet-600/5 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 w-80 h-80 bg-sky-500/5 rounded-full blur-[130px] pointer-events-none" />

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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.08] bg-white/[0.03] text-xs font-medium text-white/60 uppercase tracking-widest mb-3">
            <span className="w-1 h-1 rounded-full bg-amber-400" />
            Para ti
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-3">
            Hecho para quienes
            <br />
            <span className="gradient-text">construyen productos</span>
          </h2>
        </div>

        {/* Cards */}
        <div className="grid gap-5 md:grid-cols-2">
          {PERSONAS.map((persona, i) => {
            const ctaContent = (
              <>
                {persona.cta}
                <ArrowRight size={14} className="transition-transform duration-300 group-hover/cta:translate-x-1" />
              </>
            );
            return (
              <div
                key={i}
                className="rounded-2xl overflow-hidden card-hover group relative flex flex-col"
                style={{
                  background: "rgba(12,12,20,0.7)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(24px)",
                  transition: `opacity 0.55s ease ${i * 0.12}s, transform 0.55s ease ${i * 0.12}s`,
                }}
              >
                {/* Corner glow */}
                <div
                  className="absolute top-0 right-0 w-48 h-48 rounded-full blur-[80px] pointer-events-none"
                  style={{ background: `${persona.color}18` }}
                />

                {/* Image header */}
                <div className="relative overflow-hidden shrink-0 h-[120px] md:h-[260px]">
                  <img
                    src={persona.image}
                    alt={persona.title}
                    className="w-full h-full object-cover object-center"
                  />
                  {/* Bottom fade into card */}
                  <div className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(12,12,20,0.85), transparent)" }} />
                  {/* Accent line over image bottom */}
                  <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${persona.color}99, transparent)` }} />
                </div>

                <div className="relative z-10 p-7 flex flex-col flex-1">
                  {/* Title + subtitle */}
                  <h3 className="text-white font-bold text-xl mb-1">{persona.title}</h3>
                  <p className="text-[13px] font-semibold mb-4" style={{ color: persona.color }}>
                    {persona.subtitle}
                  </p>

                  {/* Description */}
                  <p className="text-white/80 text-[15px] leading-relaxed mb-6">
                    {persona.desc}
                  </p>

                  {/* Benefits */}
                  <ul className="space-y-2.5 mb-8 flex-1">
                    {persona.benefits.map((benefit, bi) => (
                      <li key={bi} className="flex items-center gap-2.5">
                        <Check size={13} className="shrink-0" style={{ color: persona.color }} />
                        <span className="text-white/85 text-[14px]">{benefit}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA — full-width solid button */}
                  {persona.ctaHref.startsWith("mailto:") ? (
                    <a
                      href={persona.ctaHref}
                      className="group/cta flex items-center justify-center gap-2 w-full py-3 rounded-xl text-[14px] font-semibold text-white transition-all duration-300 hover:brightness-110 hover:scale-[1.01]"
                      style={{ background: persona.color }}
                    >
                      {ctaContent}
                    </a>
                  ) : (
                    <Link
                      href={persona.ctaHref}
                      className="group/cta flex items-center justify-center gap-2 w-full py-3 rounded-xl text-[14px] font-semibold text-white transition-all duration-300 hover:brightness-110 hover:scale-[1.01]"
                      style={{ background: persona.color }}
                    >
                      {ctaContent}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
