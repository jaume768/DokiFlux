"use client";

import { useState, useEffect, useRef } from "react";
import { PenLine, Code2, RefreshCw, Rocket } from "lucide-react";

const STEPS = [
  {
    icon: PenLine,
    step: "01",
    title: "Describe tu idea",
    subtitle: "Prompt en lenguaje natural",
    desc: "Escribe lo que quieres construir como si hablaras con un desarrollador senior. Sin código, sin configuración.",
    color: "#8b5cf6",
    colorBg: "rgba(139,92,246,0.12)",
    colorBorder: "rgba(139,92,246,0.25)",
  },
  {
    icon: Code2,
    step: "02",
    title: "Genera código",
    subtitle: "Multi-archivo en streaming",
    desc: "La IA genera código React funcional en tiempo real. Múltiples archivos, componentes, estilos — todo listo.",
    color: "#38bdf8",
    colorBg: "rgba(56,189,248,0.12)",
    colorBorder: "rgba(56,189,248,0.25)",
  },
  {
    icon: RefreshCw,
    step: "03",
    title: "Itera y valida",
    subtitle: "Chat + auto-fix + compartir",
    desc: "Refina con chat iterativo, auto-fix de errores y comparte un enlace con tu equipo o clientes para validar.",
    color: "#34d399",
    colorBg: "rgba(52,211,153,0.12)",
    colorBorder: "rgba(52,211,153,0.25)",
  },
  {
    icon: Rocket,
    step: "04",
    title: "Pasa a producción",
    subtitle: "Nuestro equipo lo construye",
    desc: "¿Prototipo validado? Nuestro equipo de ingeniería lo lleva a un producto real en 2–6 semanas.",
    color: "#f59e0b",
    colorBg: "rgba(245,158,11,0.12)",
    colorBorder: "rgba(245,158,11,0.25)",
  },
];

function MiniPreview({ step, isActive }: { step: string; isActive: boolean }) {
  if (step === "01") {
    return (
      <div className="space-y-1.5">
        <div className="h-1.5 rounded-full bg-white/10 w-full" />
        <div className="h-1.5 rounded-full bg-white/10 w-4/5" />
        <div
          className="h-1.5 rounded-full w-3/5 transition-all duration-1000"
          style={{ background: isActive ? "rgba(139,92,246,0.4)" : "rgba(255,255,255,0.06)" }}
        />
        {isActive && <span className="cursor-blink" />}
      </div>
    );
  }
  if (step === "02") {
    return (
      <div className="space-y-1">
        {[80, 65, 90, 50].map((w, i) => (
          <div key={i} className="flex gap-2 items-center">
            <span className="text-[8px] text-white/15 w-2">{i + 1}</span>
            <div
              className="h-1.5 rounded-full transition-all"
              style={{
                width: `${w}%`,
                background: isActive
                  ? `rgba(56,189,248,${0.2 + i * 0.1})`
                  : "rgba(255,255,255,0.06)",
                transitionDuration: `${600 + i * 200}ms`,
              }}
            />
          </div>
        ))}
      </div>
    );
  }
  if (step === "03") {
    return (
      <div className="space-y-1.5">
        <div className="flex gap-1.5 items-end">
          <div className="w-5 h-5 rounded-full bg-white/10 shrink-0" />
          <div className="rounded-lg px-2 py-1 text-[8px] text-white/30" style={{ background: "rgba(52,211,153,0.1)" }}>
            Cambia el color...
          </div>
        </div>
        <div className="flex gap-1.5 items-end justify-end">
          <div className="rounded-lg px-2 py-1 text-[8px] text-white/30" style={{ background: "rgba(255,255,255,0.05)" }}>
            ✓ Actualizado
          </div>
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 shrink-0" />
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      {["Planificación", "Desarrollo", "Deploy"].map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full transition-all duration-500"
            style={{
              background: isActive && i < 2
                ? "rgba(245,158,11,0.6)"
                : "rgba(255,255,255,0.1)",
            }}
          />
          <span className="text-[8px] text-white/25">{label}</span>
          {isActive && i === 1 && (
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full progress-animate" style={{ background: "rgba(245,158,11,0.4)", width: "60%" }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function HowItWorks() {
  const [visible, setVisible] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
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

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % STEPS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [visible]);

  return (
    <section
      id="como-funciona"
      ref={sectionRef}
      className="relative py-28 px-5 md:px-8 scroll-mt-20 overflow-hidden"
    >
      <div className="absolute inset-0 grid-pattern pointer-events-none" style={{ opacity: 0.5 }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-700/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Section header */}
        <div
          className="text-center mb-16"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
          }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.08] bg-white/[0.03] text-xs font-medium text-white/40 uppercase tracking-widest mb-4">
            <span className="w-1 h-1 rounded-full bg-violet-400" />
            Proceso
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
            De prompt a producto
            <br />
            <span className="gradient-text">en 4 pasos</span>
          </h2>
          <p className="text-white/40 text-base md:text-lg max-w-md mx-auto">
            Un flujo diseñado para que vayas de la idea al software real lo más rápido posible.
          </p>
        </div>

        {/* Steps grid */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const isActive = activeStep === i;
            return (
              <div
                key={step.step}
                className="group rounded-2xl p-5 cursor-pointer transition-all duration-300"
                style={{
                  background: isActive ? step.colorBg : "rgba(255,255,255,0.025)",
                  border: `1px solid ${isActive ? step.colorBorder : "rgba(255,255,255,0.06)"}`,
                  boxShadow: isActive ? `0 8px 40px ${step.color}15` : "none",
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(24px)",
                  transition: `opacity 0.55s ease ${i * 0.1}s, transform 0.55s ease ${i * 0.1}s, background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease`,
                }}
                onMouseEnter={() => setActiveStep(i)}
              >
                {/* Step number + icon */}
                <div className="flex items-center justify-between mb-4">
                  <span
                    className="text-[11px] font-black px-2 py-0.5 rounded-md"
                    style={{ background: step.colorBg, color: step.color, border: `1px solid ${step.colorBorder}` }}
                  >
                    {step.step}
                  </span>
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300"
                    style={{ background: step.colorBg, border: `1px solid ${step.colorBorder}` }}
                  >
                    <Icon size={16} style={{ color: step.color }} />
                  </div>
                </div>

                {/* Title + subtitle */}
                <h3 className="text-white font-bold text-base mb-0.5">{step.title}</h3>
                <p className="text-[12px] font-medium mb-3" style={{ color: step.color, opacity: 0.7 }}>
                  {step.subtitle}
                </p>

                {/* Description */}
                <p className="text-white/40 text-[13px] leading-relaxed mb-4">
                  {step.desc}
                </p>

                {/* Mini preview */}
                <div
                  className="rounded-lg p-3 transition-all duration-300"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <MiniPreview step={step.step} isActive={isActive} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
