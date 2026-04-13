"use client";

import { useEffect, useRef, useState } from "react";
import { PenLine, Code2, RefreshCw, Rocket } from "lucide-react";

const STEPS = [
  {
    icon: PenLine,
    step: "01",
    title: "Describe tu idea",
    desc: "Escribe lo que quieres construir en lenguaje natural. Sin código, sin configuración.",
    color: "#8b5cf6",
    colorBg: "rgba(139,92,246,0.10)",
    colorBorder: "rgba(139,92,246,0.22)",
  },
  {
    icon: Code2,
    step: "02",
    title: "Genera código",
    desc: "La IA genera código React funcional en tiempo real. Múltiples archivos, todo listo.",
    color: "#38bdf8",
    colorBg: "rgba(56,189,248,0.10)",
    colorBorder: "rgba(56,189,248,0.22)",
  },
  {
    icon: RefreshCw,
    step: "03",
    title: "Itera y valida",
    desc: "Refina con chat iterativo, auto-fix de errores y comparte con tu equipo para validar.",
    color: "#34d399",
    colorBg: "rgba(52,211,153,0.10)",
    colorBorder: "rgba(52,211,153,0.22)",
  },
  {
    icon: Rocket,
    step: "04",
    title: "Pasa a producción",
    desc: "Prototipo validado. Nuestro equipo lo lleva a un producto real en 2–6 semanas.",
    color: "#f59e0b",
    colorBg: "rgba(245,158,11,0.10)",
    colorBorder: "rgba(245,158,11,0.22)",
  },
];

export function HowItWorks() {
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
      id="como-funciona"
      ref={sectionRef}
      className="relative py-16 px-5 md:px-8 scroll-mt-20 overflow-hidden"
    >
      <div className="absolute inset-0 grid-pattern pointer-events-none" style={{ opacity: 0.5 }} />

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Section header */}
        <div
          className="text-center mb-12"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
          }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.08] bg-white/[0.03] text-xs font-medium text-white/60 uppercase tracking-widest mb-4">
            <span className="w-1 h-1 rounded-full bg-violet-400" />
            Proceso
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-3">
            De prompt a producto
            <br />
            <span className="gradient-text">en 4 pasos</span>
          </h2>
          <p className="text-white/65 text-base max-w-sm mx-auto">
            De la idea al software real, lo más rápido posible.
          </p>
        </div>

        {/* Steps */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={step.step}
                className="rounded-xl p-5 group transition-all duration-300 hover:scale-[1.02]"
                style={{
                  background: "rgba(255,255,255,0.025)",
                  border: `1px solid rgba(255,255,255,0.07)`,
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(24px)",
                  transition: `opacity 0.55s ease ${i * 0.1}s, transform 0.55s ease ${i * 0.1}s`,
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: step.colorBg, border: `1px solid ${step.colorBorder}` }}
                  >
                    <Icon size={16} style={{ color: step.color }} />
                  </div>
                  <span
                    className="text-[11px] font-black px-2 py-0.5 rounded-md"
                    style={{ background: step.colorBg, color: step.color, border: `1px solid ${step.colorBorder}` }}
                  >
                    {step.step}
                  </span>
                </div>
                <h3 className="text-white font-bold text-[15px] mb-1.5">{step.title}</h3>
                <p className="text-white/65 text-[13px] leading-relaxed">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
