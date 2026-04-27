"use client";

import { useRouter } from "next/navigation";
import { TEMPLATES } from "@/lib/templates";
import { ArrowRight, LayoutTemplate, Menu } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useMobileSidebar } from "@/context/MobileSidebarContext";

export default function TemplatesPage() {
  const router = useRouter();
  const { toggle: toggleSidebar } = useMobileSidebar();

  function handleSelect(templateId: string) {
    const template = TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    sessionStorage.setItem("template_prompt", template.prompt);
    router.push("/app");
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden" style={{ background: "#0a0a0f" }}>
      {/* Mobile topbar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <Button variant="ghost" size="icon-sm" onClick={toggleSidebar} className="text-white/60 hover:text-white">
          <Menu className="w-5 h-5" />
        </Button>
        <button onClick={() => router.push("/app")} aria-label="Ir a inicio" className="flex items-center">
          <Image src="/logo-texto-blanco.png" alt="DokiFlux" width={140} height={35} className="h-7 w-auto" />
        </button>
        <div className="w-8" />
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl w-full px-4 py-8 md:px-8 md:py-12">

        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest mb-4"
            style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", color: "#a78bfa" }}
          >
            <LayoutTemplate className="w-3.5 h-3.5" />
            Templates
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-2">
            Empieza con un proyecto predefinido
          </h1>
          <p className="text-lg max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.5)" }}>
            Elige una base y personalízala a tu gusto. El prompt se cargará automáticamente.
          </p>
        </div>

        {/* Grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => handleSelect(template.id)}
              className="group text-left rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer"
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.border = "1px solid rgba(139,92,246,0.35)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 24px rgba(139,92,246,0.12)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.border = "1px solid rgba(255,255,255,0.07)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
              }}
            >
              <div className="relative h-44 overflow-hidden" style={{ background: "rgba(10,10,20,0.8)" }}>
                <Image
                  src={template.image}
                  alt={template.name}
                  fill
                  className="object-cover object-top transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    target.style.display = "none";
                    const fallback = target.parentElement?.querySelector(".fallback") as HTMLElement | null;
                    if (fallback) fallback.style.display = "flex";
                  }}
                />
                <div className="fallback hidden h-full items-center justify-center text-5xl">
                  {template.emoji}
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="text-xs font-bold tracking-widest uppercase px-2 py-0.5 rounded-md"
                    style={{
                      background: "rgba(139,92,246,0.15)",
                      color: "#c084fc",
                      border: "1px solid rgba(139,92,246,0.2)",
                    }}
                  >
                    {template.category}
                  </span>
                  <ArrowRight className="h-4 w-4 text-white/20 transition-all duration-200 group-hover:text-violet-400 group-hover:translate-x-0.5" />
                </div>
                <h3 className="text-white font-semibold text-base mb-1">{template.name}</h3>
                <p className="text-sm leading-relaxed line-clamp-2" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {template.description}
                </p>
              </div>
            </button>
          ))}
        </div>
        </div>
      </div>
    </div>
  );
}
