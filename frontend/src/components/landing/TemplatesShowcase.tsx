"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BarChart3, Rocket, ShoppingBag, User, MessageSquare, Settings } from "lucide-react";
import { TEMPLATES } from "@/lib/templates";

const TEMPLATE_ICONS: Record<string, { icon: typeof BarChart3; color: string; colorBg: string }> = {
  "analytics-dashboard": { icon: BarChart3, color: "#8b5cf6", colorBg: "rgba(139,92,246,0.15)" },
  "saas-landing": { icon: Rocket, color: "#38bdf8", colorBg: "rgba(56,189,248,0.15)" },
  "ecommerce-product": { icon: ShoppingBag, color: "#34d399", colorBg: "rgba(52,211,153,0.15)" },
  "portfolio": { icon: User, color: "#f59e0b", colorBg: "rgba(245,158,11,0.15)" },
  "chat-app": { icon: MessageSquare, color: "#ec4899", colorBg: "rgba(236,72,153,0.15)" },
  "admin-panel": { icon: Settings, color: "#6366f1", colorBg: "rgba(99,102,241,0.15)" },
};

function TemplateMiniPreview({ templateId, color }: { templateId: string; color: string }) {
  if (templateId === "analytics-dashboard") {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          {[40, 55, 35, 60].map((h, i) => (
            <div key={i} className="flex-1 rounded-md" style={{ height: h, background: `${color}15`, border: `1px solid ${color}20` }}>
              <div className="m-1.5 h-1.5 rounded-full w-2/3" style={{ background: `${color}30` }} />
              <div className="mx-1.5 mt-1 h-3 rounded" style={{ background: `${color}10` }} />
            </div>
          ))}
        </div>
        <div className="h-12 rounded-md" style={{ background: `${color}08`, border: `1px solid ${color}15` }} />
      </div>
    );
  }
  if (templateId === "saas-landing") {
    return (
      <div className="space-y-2">
        <div className="h-10 rounded-md flex items-center justify-center" style={{ background: `${color}12`, border: `1px solid ${color}20` }}>
          <div className="h-2 w-16 rounded-full" style={{ background: `${color}25` }} />
        </div>
        <div className="flex gap-1.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-1 h-8 rounded-md" style={{ background: `${color}08`, border: `1px solid ${color}12` }} />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <div className="h-8 rounded-md" style={{ background: `${color}10`, border: `1px solid ${color}15` }} />
      <div className="flex gap-1.5">
        <div className="w-1/3 h-14 rounded-md" style={{ background: `${color}08`, border: `1px solid ${color}12` }} />
        <div className="flex-1 h-14 rounded-md" style={{ background: `${color}06`, border: `1px solid ${color}10` }} />
      </div>
    </div>
  );
}

export function TemplatesShowcase() {
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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
      id="templates"
      ref={sectionRef}
      className="relative py-28 px-5 md:px-8 scroll-mt-20 overflow-hidden"
    >
      <div className="absolute inset-0 grid-pattern pointer-events-none" style={{ opacity: 0.5 }} />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-sky-500/5 rounded-full blur-[130px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto">
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
            Templates
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
            Empieza con un
            <br />
            <span className="gradient-text">template profesional</span>
          </h2>
          <p className="text-white/40 text-base md:text-lg max-w-md mx-auto">
            Elige una plantilla y personalízala en segundos con prompts.
          </p>
        </div>

        {/* Templates grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((template, i) => {
            const meta = TEMPLATE_ICONS[template.id] || { icon: Rocket, color: "#8b5cf6", colorBg: "rgba(139,92,246,0.15)" };
            const Icon = meta.icon;
            return (
              <div
                key={template.id}
                className="rounded-2xl p-5 cursor-pointer card-hover group"
                style={{
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(24px)",
                  transition: `opacity 0.55s ease ${i * 0.07}s, transform 0.55s ease ${i * 0.07}s`,
                }}
                onClick={() => router.push(`/register?template=${template.id}`)}
              >
                {/* Mini preview */}
                <div
                  className="rounded-xl p-3 mb-4 transition-all duration-300"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <TemplateMiniPreview templateId={template.id} color={meta.color} />
                </div>

                {/* Info */}
                <div className="flex items-center gap-2.5 mb-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: meta.colorBg, border: `1px solid ${meta.color}30` }}
                  >
                    <Icon size={13} style={{ color: meta.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold text-[14px] truncate">{template.name}</h3>
                  </div>
                  <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: meta.colorBg, color: meta.color, border: `1px solid ${meta.color}25` }}
                  >
                    {template.category}
                  </span>
                </div>

                <p className="text-white/35 text-[12px] leading-relaxed mb-3 line-clamp-2">
                  {template.description}
                </p>

                <div className="flex items-center gap-1.5 text-[12px] font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ color: meta.color }}>
                  Usar template
                  <ArrowRight size={12} className="transition-transform duration-200 group-hover:translate-x-1" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
