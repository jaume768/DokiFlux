"use client";

import { useState, useEffect, useRef } from "react";
import { Check, X, Minus, Zap } from "lucide-react";

const TOOLS = [
  { name: "ChatGPT", subtitle: "Conversacional" },
  { name: "v0 / Bolt", subtitle: "Generador UI" },
  { name: "DokiFlux", subtitle: "Idea → Producción", highlighted: true },
];

const FEATURES = [
  { label: "Genera código React funcional", chatgpt: "partial", v0bolt: "yes", dokiflux: "yes" },
  { label: "Multi-archivo con estructura real", chatgpt: "no", v0bolt: "partial", dokiflux: "yes" },
  { label: "Vista previa en vivo (WebContainers)", chatgpt: "no", v0bolt: "yes", dokiflux: "yes" },
  { label: "Chat iterativo para refinar", chatgpt: "yes", v0bolt: "partial", dokiflux: "yes" },
  { label: "Auto-fix de errores en tiempo real", chatgpt: "no", v0bolt: "no", dokiflux: "yes" },
  { label: "Exportar proyecto completo (.zip)", chatgpt: "no", v0bolt: "partial", dokiflux: "yes" },
  { label: "Múltiples modelos IA (11+)", chatgpt: "no", v0bolt: "no", dokiflux: "yes" },
  { label: "Servicio de producción profesional", chatgpt: "no", v0bolt: "no", dokiflux: "yes" },
  { label: "En español nativo", chatgpt: "partial", v0bolt: "no", dokiflux: "yes" },
  { label: "Pricing transparente por uso", chatgpt: "no", v0bolt: "partial", dokiflux: "yes" },
];

function StatusIcon({ status }: { status: string }) {
  if (status === "yes") return <Check size={15} className="text-emerald-400" />;
  if (status === "no") return <X size={15} className="text-white/15" />;
  return <Minus size={15} className="text-amber-400/60" />;
}

export function Comparison() {
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
    <section ref={sectionRef} className="relative py-28 px-5 md:px-8 overflow-hidden">
      <div className="absolute inset-0 grid-pattern pointer-events-none" style={{ opacity: 0.5 }} />
      <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-indigo-600/5 rounded-full blur-[130px] pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Header */}
        <div
          className="text-center mb-16"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
          }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.08] bg-white/[0.03] text-xs font-medium text-white/40 uppercase tracking-widest mb-4">
            <span className="w-1 h-1 rounded-full bg-sky-400" />
            Comparativa
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
            ¿Por qué
            <br />
            <span className="gradient-text">DokiFlux?</span>
          </h2>
          <p className="text-white/40 text-base md:text-lg max-w-md mx-auto">
            No solo generamos código. Te acompañamos hasta producción.
          </p>
        </div>

        {/* Table */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.6s ease 0.15s, transform 0.6s ease 0.15s",
          }}
        >
          {/* Header row */}
          <div
            className="grid grid-cols-4 gap-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="p-4 text-[13px] font-semibold text-white/40">Característica</div>
            {TOOLS.map((tool) => (
              <div
                key={tool.name}
                className="p-4 text-center"
                style={{
                  background: tool.highlighted ? "rgba(139,92,246,0.08)" : "transparent",
                  borderLeft: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                {tool.highlighted && (
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <div className="w-4 h-4 rounded bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
                      <Zap size={8} className="text-white fill-white" />
                    </div>
                  </div>
                )}
                <div className={`text-[13px] font-bold ${tool.highlighted ? "text-white" : "text-white/60"}`}>
                  {tool.name}
                </div>
                <div className="text-[10px] text-white/25">{tool.subtitle}</div>
              </div>
            ))}
          </div>

          {/* Feature rows */}
          {FEATURES.map((feature, i) => (
            <div
              key={i}
              className="grid grid-cols-4 gap-0 transition-colors duration-200 hover:bg-white/[0.015]"
              style={{ borderBottom: i < FEATURES.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
            >
              <div className="p-3.5 text-[13px] text-white/50 flex items-center">
                {feature.label}
              </div>
              <div className="p-3.5 flex items-center justify-center" style={{ borderLeft: "1px solid rgba(255,255,255,0.04)" }}>
                <StatusIcon status={feature.chatgpt} />
              </div>
              <div className="p-3.5 flex items-center justify-center" style={{ borderLeft: "1px solid rgba(255,255,255,0.04)" }}>
                <StatusIcon status={feature.v0bolt} />
              </div>
              <div
                className="p-3.5 flex items-center justify-center"
                style={{
                  borderLeft: "1px solid rgba(255,255,255,0.04)",
                  background: "rgba(139,92,246,0.05)",
                }}
              >
                <StatusIcon status={feature.dokiflux} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
