"use client";

import { useState, useEffect, useRef } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Zap } from "lucide-react";

type Status = "yes" | "no" | "warn";

type Cell = { status: Status; text: string };

type Tool = {
  key: string;
  name: string;
  icon?: string; // emoji / short glyph
  iconColor?: string;
  highlighted?: boolean;
};

type Row = {
  title: string;
  subtitle: string;
  cells: Record<string, Cell>; // keyed by tool.key
};

const TOOLS: Tool[] = [
  { key: "dokiflux", name: "DokiFlux", highlighted: true },
  { key: "v0", name: "V0.dev", icon: "", iconColor: "text-white" },
  { key: "lovable", name: "Lovable", icon: "♥", iconColor: "text-pink-400" },
  { key: "agencias", name: "Agencias\nTradicionales" },
];

const ROWS: Row[] = [
  {
    title: "Prototipo funcional al instante",
    subtitle: "Vista previa interactiva en segundos",
    cells: {
      dokiflux: { status: "yes", text: "Sí, preview interactiva real" },
      v0: { status: "yes", text: "Sí, buena calidad" },
      lovable: { status: "yes", text: "Sí, muy rápida" },
      agencias: { status: "no", text: "No, requiere briefing" },
    },
  },
  {
    title: "Código multiarchivo limpio",
    subtitle: "Listo para exportar y usar",
    cells: {
      dokiflux: { status: "yes", text: "Sí, código limpio y estructurado" },
      v0: { status: "yes", text: "Sí, en React" },
      lovable: { status: "no", text: "Limitado" },
      agencias: { status: "yes", text: "Sí, pero más lento" },
    },
  },
  {
    title: "Iteración por chat con IA",
    subtitle: "Refina sin perder contexto",
    cells: {
      dokiflux: { status: "yes", text: "Sí, chat contextual inteligente" },
      v0: { status: "warn", text: "Limitado" },
      lovable: { status: "warn", text: "Básico" },
      agencias: { status: "yes", text: "Sí, con reuniones" },
    },
  },
  {
    title: "Múltiples modelos de IA",
    subtitle: "Elige el mejor para cada tarea",
    cells: {
      dokiflux: { status: "yes", text: "Sí, OpenAI, Claude, Gemini, etc." },
      v0: { status: "no", text: "No, un solo modelo" },
      lovable: { status: "no", text: "No, un solo modelo" },
      agencias: { status: "yes", text: "Sí, a medida" },
    },
  },
  {
    title: "Llevarlo a producción",
    subtitle: "Equipo senior que lo construye por ti",
    cells: {
      dokiflux: { status: "yes", text: "Sí, te lo entregamos en 2–6 semanas" },
      v0: { status: "no", text: "No, solo prototipo" },
      lovable: { status: "no", text: "No, solo prototipo" },
      agencias: { status: "yes", text: "Sí, pero más costoso" },
    },
  },
  {
    title: "Sin registro para probar",
    subtitle: "Empieza en segundos",
    cells: {
      dokiflux: { status: "yes", text: "Sí, sin registro ni tarjeta" },
      v0: { status: "yes", text: "Sí, sin registro" },
      lovable: { status: "yes", text: "Sí, sin registro" },
      agencias: { status: "no", text: "No aplica" },
    },
  },
  {
    title: "Pensado para validar ideas",
    subtitle: "Enfocado en founders y equipos",
    cells: {
      dokiflux: { status: "yes", text: "Sí, diseñado para validar y lanzar" },
      v0: { status: "warn", text: "Más para devs" },
      lovable: { status: "yes", text: "Muy fácil de usar" },
      agencias: { status: "warn", text: "No enfocado a validación" },
    },
  },
];

function StatusIcon({ status }: { status: Status }) {
  if (status === "yes")
    return <CheckCircle2 size={18} className="text-emerald-400 shrink-0" strokeWidth={2.5} />;
  if (status === "no")
    return <XCircle size={18} className="text-rose-500 shrink-0" strokeWidth={2.5} />;
  return <AlertTriangle size={18} className="text-amber-400 shrink-0" strokeWidth={2.5} />;
}

function ToolHeader({ tool }: { tool: Tool }) {
  if (tool.highlighted) {
    return (
      <div className="flex items-center justify-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/40">
          <Zap size={16} className="text-white fill-white" />
        </div>
        <span className="text-white font-extrabold text-lg tracking-tight">DokiFlux</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center gap-2 text-white/90 font-bold">
      {tool.icon && (
        <span className={`text-lg ${tool.iconColor ?? "text-white/80"}`}>{tool.icon}</span>
      )}
      <span className="whitespace-pre-line text-[15px] leading-tight">{tool.name}</span>
    </div>
  );
}

export function ComparisonV2() {
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
    <section ref={sectionRef} className="relative py-20 px-5 md:px-8 overflow-hidden">
      <div className="absolute inset-0 grid-pattern pointer-events-none" style={{ opacity: 0.5 }} />
      <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-violet-600/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div
          className="text-center mb-12"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
          }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.08] bg-white/[0.03] text-xs font-medium text-white/60 uppercase tracking-widest mb-4">
            <span className="w-1 h-1 rounded-full bg-sky-400" />
            Comparativa
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
            ¿Por qué <span className="gradient-text">DokiFlux?</span>
          </h2>
          <p className="text-white/80 text-lg md:text-xl max-w-xl mx-auto">
            No solo generamos código. Te acompañamos hasta producción.
          </p>
        </div>

        {/* ───────── MOBILE (listado de lo que ofrece DokiFlux) ───────── */}
        <div
          className="md:hidden"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.6s ease 0.15s, transform 0.6s ease 0.15s",
          }}
        >
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background:
                "linear-gradient(180deg, rgba(30,27,60,0.6) 0%, rgba(15,13,35,0.8) 100%)",
              border: "1.5px solid rgba(139,92,246,0.45)",
              boxShadow: "0 0 40px rgba(139,92,246,0.15)",
            }}
          >
            {/* Brand header */}
            <div
              className="px-5 py-4 flex items-center gap-2.5"
              style={{
                background:
                  "linear-gradient(135deg, rgba(139,92,246,0.25) 0%, rgba(99,102,241,0.12) 100%)",
                borderBottom: "1px solid rgba(139,92,246,0.35)",
              }}
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/40">
                <Zap size={16} className="text-white fill-white" />
              </div>
              <div>
                <div className="text-white font-extrabold text-[16px] tracking-tight leading-none">
                  DokiFlux te ofrece
                </div>
                <div className="text-violet-200/70 text-[11px] mt-1 leading-none">
                  Todo lo que necesitas para validar y lanzar
                </div>
              </div>
            </div>

            {/* Lista de features */}
            <ul className="divide-y divide-white/[0.06]">
              {ROWS.map((row) => (
                <li key={row.title} className="px-5 py-4 flex items-start gap-3">
                  <div className="mt-0.5">
                    <CheckCircle2
                      size={20}
                      className="text-emerald-400 shrink-0"
                      strokeWidth={2.5}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-bold text-white leading-tight">
                      {row.title}
                    </div>
                    <div className="text-[13px] text-white/60 mt-1 leading-snug">
                      {row.subtitle}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-4 text-center text-[12px] text-white/45">
            Visita en escritorio para ver la comparativa completa con otras herramientas.
          </p>
        </div>

        {/* ───────── DESKTOP (tabla) ───────── */}
        <div
          className="hidden md:block overflow-x-auto rounded-2xl"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.6s ease 0.15s, transform 0.6s ease 0.15s",
          }}
        >
          <div
            className="min-w-[1100px] rounded-2xl overflow-hidden relative"
            style={{
              background: "linear-gradient(180deg, rgba(30,27,60,0.5) 0%, rgba(15,13,35,0.7) 100%)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {/* Highlight column backdrop (DokiFlux) */}
            <div
              aria-hidden
              className="absolute top-0 bottom-0 pointer-events-none"
              style={{
                left: "220px", // start after first col (220px)
                width: "calc((100% - 220px) / 5)",
                background:
                  "linear-gradient(180deg, rgba(139,92,246,0.18) 0%, rgba(99,102,241,0.08) 100%)",
                border: "2px solid rgba(139,92,246,0.55)",
                borderRadius: "16px",
                boxShadow: "0 0 40px rgba(139,92,246,0.25) inset",
              }}
            />

            {/* Header row */}
            <div
              className="grid relative"
              style={{
                gridTemplateColumns: "220px repeat(5, 1fr)",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div className="p-5">
                <div className="text-[17px] font-bold text-violet-300">¿Qué me ofrece?</div>
              </div>
              {TOOLS.map((tool) => (
                <div
                  key={tool.key}
                  className="p-5 text-center flex items-center justify-center"
                  style={{ borderLeft: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <ToolHeader tool={tool} />
                </div>
              ))}
            </div>

            {/* Body rows */}
            {ROWS.map((row, i) => {
              const zebra = i % 2 === 1;
              return (
                <div
                  key={row.title}
                  className="grid relative transition-colors"
                  style={{
                    gridTemplateColumns: "220px repeat(5, 1fr)",
                    borderBottom:
                      i < ROWS.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                    background: zebra ? "rgba(255,255,255,0.015)" : "transparent",
                  }}
                >
                  {/* Feature label */}
                  <div className="p-5">
                    <div className="text-[15px] font-bold text-white leading-snug">
                      {row.title}
                    </div>
                    <div className="text-[13px] text-white/50 mt-1 leading-snug">
                      {row.subtitle}
                    </div>
                  </div>

                  {/* Cells */}
                  {TOOLS.map((tool) => {
                    const cell = row.cells[tool.key];
                    const isHighlight = tool.highlighted;
                    return (
                      <div
                        key={tool.key}
                        className="p-5 flex items-center justify-center text-center"
                        style={{ borderLeft: "1px solid rgba(255,255,255,0.05)" }}
                      >
                        <div
                          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5"
                          style={{
                            background: isHighlight
                              ? "rgba(139,92,246,0.18)"
                              : cell.status === "yes"
                                ? "rgba(16,185,129,0.10)"
                                : cell.status === "no"
                                  ? "rgba(244,63,94,0.10)"
                                  : "rgba(251,191,36,0.10)",
                            border: isHighlight
                              ? "1px solid rgba(139,92,246,0.45)"
                              : "1px solid rgba(255,255,255,0.05)",
                          }}
                        >
                          <StatusIcon status={cell.status} />
                          <span
                            className={`text-[13.5px] font-semibold leading-tight ${
                              isHighlight ? "text-white" : "text-white/85"
                            }`}
                          >
                            {cell.text}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}
