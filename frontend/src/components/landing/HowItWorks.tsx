"use client";

import { useEffect, useRef, useState } from "react";

const STEPS = [
  {
    image: "/tarjetas-4-pasos/tarjeta-01.png",
    step: "01",
    title: "Describe tu idea",
    desc: "Escribe lo que quieres construir en lenguaje natural. Sin código, sin configuración.",
    color: "#8b5cf6",
    colorBg: "rgba(139,92,246,0.10)",
    colorBorder: "rgba(139,92,246,0.22)",
  },
  {
    image: "/tarjetas-4-pasos/tarjeta-02.png",
    step: "02",
    title: "Genera código",
    desc: "La IA genera código React funcional en tiempo real. Múltiples archivos, todo listo.",
    color: "#38bdf8",
    colorBg: "rgba(56,189,248,0.10)",
    colorBorder: "rgba(56,189,248,0.22)",
  },
  {
    image: "/tarjetas-4-pasos/tarjeta-03.png",
    step: "03",
    title: "Itera y valida",
    desc: "Refina con chat iterativo, auto-fix de errores y comparte con tu equipo para validar.",
    color: "#34d399",
    colorBg: "rgba(52,211,153,0.10)",
    colorBorder: "rgba(52,211,153,0.22)",
  },
  {
    image: "/tarjetas-4-pasos/tarjeta-04.png",
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
          <p className="text-white/80 text-lg max-w-sm mx-auto">
            De la idea al software real, lo más rápido posible.
          </p>
        </div>

        {/* Steps — zigzag cards */}
        <div className="relative max-w-4xl mx-auto">
          <div className="flex flex-col gap-12 md:gap-12">
            {STEPS.map((step, i) => {
              const isRight = i % 2 === 1;
              const isLast = i === STEPS.length - 1;
              return (
                <div key={step.step} className="relative">
                  {/* Card — zigzag positioning on desktop */}
                  <div
                    className={`relative w-full md:w-[58%] ${isRight ? "md:ml-auto" : ""}`}
                    style={{
                      opacity: visible ? 1 : 0,
                      transform: visible
                        ? "translateY(0)"
                        : `translateY(20px)`,
                      transition: `opacity 0.55s ease ${i * 0.13}s, transform 0.55s ease ${i * 0.13}s`,
                    }}
                  >
                    <div
                      className="relative rounded-2xl p-6"
                      style={{
                        overflow: "visible",
                        background: `radial-gradient(ellipse at ${isRight ? "top right" : "top left"}, ${step.color}10 0%, rgba(10,10,20,0.92) 65%)`,
                        border: `1px solid ${step.color}45`,
                        boxShadow: `0 0 28px ${step.color}14, inset 0 0 28px ${step.color}06`,
                      }}
                    >
                      {/* Sparkle dots */}
                      {[
                        { top: "12%", left: "6%", s: 2.5 },
                        { top: "75%", left: "88%", s: 2 },
                        { top: "55%", left: "4%", s: 1.5 },
                        { top: "20%", left: "92%", s: 2 },
                      ].map((dot, di) => (
                        <div
                          key={di}
                          className="absolute rounded-full pointer-events-none"
                          style={{
                            top: dot.top,
                            left: dot.left,
                            width: dot.s,
                            height: dot.s,
                            background: step.color,
                            opacity: 0.55,
                            animation: `pulse 2s ease-in-out ${di * 0.5}s infinite`,
                          }}
                        />
                      ))}

                      {/* Floating image — desktop only */}
                      <img
                        src={step.image}
                        alt={step.title}
                        className="hidden md:block absolute pointer-events-none object-contain"
                        style={{
                          width: 220,
                          height: 220,
                          bottom: -40,
                          left: isRight ? "auto" : -20,
                          right: isRight ? -20 : "auto",
                          zIndex: 0,
                          transform: "scale(1.30)"
                        }}
                      />

                      {/* Content row */}
                      <div className={`flex items-center gap-4 relative z-10 ${isRight ? "md:pr-44" : "md:pl-44"}`}>
                        {/* Image — mobile only (flex item) */}
                        <img
                          src={step.image}
                          alt={step.title}
                          className="block md:hidden shrink-0 object-contain"
                          style={{ width: 96, height: 96, transform: "scale(1.70)", transformOrigin: "center" }}
                        />
                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span
                              className="text-[11px] font-black tracking-widest shrink-0"
                              style={{ color: step.color }}
                            >
                              {step.step}
                            </span>
                            <h3 className="text-white font-bold text-[18px] leading-tight">
                              {step.title}
                            </h3>
                          </div>
                          <p className="text-white/80 text-[14px] leading-relaxed">
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Curved arrow to next step */}
                  {!isLast && (
                    <div
                      className="hidden md:block absolute z-10 pointer-events-none"
                      style={{
                        top: "100%",
                        marginTop: -22,
                        left: "calc(50% - 40px)",
                        opacity: visible ? 1 : 0,
                        transition: `opacity 0.5s ease ${i * 0.13 + 0.3}s`,
                      }}
                    >
                      <svg
                        width="80"
                        height="60"
                        viewBox="0 0 80 60"
                        fill="none"
                        style={{ overflow: "visible" }}
                      >
                        {isRight ? (
                          <>
                            {/* Right→Left, belly up */}
                            <path
                              d="M 72 6 C 72 -16 8 -16 8 54"
                              stroke={step.color}
                              strokeWidth="2"
                              strokeDasharray="5 3"
                              strokeLinecap="round"
                              fill="none"
                              opacity="0.75"
                            />
                            {/* Arrowhead pointing down */}
                            <path
                              d="M 3 47 L 8 55 L 13 47"
                              stroke={step.color}
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              fill="none"
                            />
                          </>
                        ) : (
                          <>
                            {/* Left→Right, belly up */}
                            <path
                              d="M 8 6 C 8 -16 72 -16 72 54"
                              stroke={step.color}
                              strokeWidth="2"
                              strokeDasharray="5 3"
                              strokeLinecap="round"
                              fill="none"
                              opacity="0.75"
                            />
                            {/* Arrowhead pointing down */}
                            <path
                              d="M 67 47 L 72 55 L 77 47"
                              stroke={step.color}
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              fill="none"
                            />
                          </>
                        )}
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
