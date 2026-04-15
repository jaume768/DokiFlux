"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost, ApiError } from "@/lib/api";
import { generateProjectTitle } from "@/lib/projectUtils";
import type { ProjectListItem } from "@/types/auth";
import Image from "next/image";
import { SendHorizonal, Loader2, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModelSelector } from "@/components/ModelSelector";
import { DEFAULT_MODEL, type ModelId } from "@/lib/pricing";
import { FrameworkSelector } from "@/components/FrameworkSelector";
import { DEFAULT_FRAMEWORK, type FrameworkId } from "@/lib/frameworks";
import { useMobileSidebar } from "@/context/MobileSidebarContext";

export default function HomePage() {
  const router = useRouter();
  const { toggle: toggleSidebar } = useMobileSidebar();
  const [prompt, setPrompt] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [selectedModel, setSelectedModel] = useState<ModelId>(DEFAULT_MODEL);
  const [selectedFramework, setSelectedFramework] = useState<FrameworkId>(DEFAULT_FRAMEWORK);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || isCreating) return;

    setIsCreating(true);
    setError("");

    try {
      const title = generateProjectTitle(prompt);
      const project = await apiPost<ProjectListItem>("/projects/", {
        name: title,
        description: "",
      });
      router.push(`/app/generate/${project.id}?prompt=${encodeURIComponent(prompt)}&model=${selectedModel}&framework=${selectedFramework}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Error al crear proyecto.");
      }
      setIsCreating(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Mobile topbar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 shrink-0" style={{ background: "#0a0a0f", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <Button variant="ghost" size="icon-sm" onClick={toggleSidebar} className="text-white/60 hover:text-white">
          <Menu className="w-5 h-5" />
        </Button>
        <Image src="/logo-texto-blanco.png" alt="DokiFlux" width={140} height={35} className="h-7 w-auto" />
        <div className="w-8" />
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 md:p-8 overflow-y-auto relative" style={{ background: "#0a0a0f" }}>
        <div className="absolute inset-0 grid-pattern pointer-events-none" style={{ opacity: 0.5 }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(139,92,246,0.22) 0%, rgba(99,102,241,0.08) 45%, transparent 70%)" }} />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[300px] pointer-events-none" style={{ background: "radial-gradient(ellipse, rgba(56,189,248,0.05) 0%, transparent 70%)" }} />

        <div className="relative z-10 w-full max-w-3xl space-y-7 md:space-y-9">
          {/* Header */}
          <div className="text-center space-y-3">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white">
              ¿Qué quieres{" "}
              <span className="gradient-text">crear hoy?</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.55)" }}>
              Describe tu proyecto y DokiFlux lo generará automáticamente
            </p>
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative rounded-2xl transition-all duration-300"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)", boxShadow: "0 0 0 0 rgba(139,92,246,0)" }}
              onFocus={(e) => { (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(139,92,246,0.4)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 40px rgba(139,92,246,0.08)"; }}
              onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) { (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(255,255,255,0.09)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; } }}
            >
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ej: Una landing page moderna para una startup de IA..."
                disabled={isCreating}
                rows={4}
                className="w-full resize-none bg-transparent px-5 md:px-6 py-5 text-base md:text-lg outline-none disabled:cursor-not-allowed disabled:opacity-50 text-white"
                style={{ color: "rgba(255,255,255,0.9)", caretColor: "#8b5cf6" }}
              />
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <ModelSelector
                    value={selectedModel}
                    onChange={setSelectedModel}
                    disabled={isCreating}
                  />
                  <FrameworkSelector
                    value={selectedFramework}
                    onChange={setSelectedFramework}
                    disabled={isCreating}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!prompt.trim() || isCreating}
                  className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isCreating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /><span className="hidden sm:inline">Creando...</span></>
                  ) : (
                    <><SendHorizonal className="w-4 h-4" /><span className="hidden sm:inline">Crear proyecto</span></>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl text-center">
                {error}
              </div>
            )}
          </form>

          {/* Footer hint */}
          <p className="text-center text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
            Presiona{" "}
            <kbd className="px-2 py-0.5 text-xs font-semibold rounded-md" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>Enter</kbd>
            {" "}para enviar
          </p>
        </div>
      </div>
    </div>
  );
}
