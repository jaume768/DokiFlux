"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost, ApiError } from "@/lib/api";
import { generateProjectTitle } from "@/lib/projectUtils";
import type { ProjectListItem } from "@/types/auth";
import { Sparkles, SendHorizonal, Loader2, Menu } from "lucide-react";
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
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-background shrink-0">
        <Button variant="ghost" size="icon-sm" onClick={toggleSidebar}>
          <Menu className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="font-bold text-sm">DokiFlux</span>
        </div>
        <div className="w-8" />
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 md:p-8 bg-gradient-to-b from-background to-muted/20 overflow-y-auto">
        <div className="w-full max-w-3xl space-y-6 md:space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="hidden md:inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
              ¿Qué quieres crear hoy?
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-xl mx-auto">
              Describe tu proyecto y DokiFlux lo generará automáticamente
            </p>
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative rounded-2xl border-2 bg-background shadow-lg hover:shadow-xl transition-shadow focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ej: Una landing page moderna para una startup de IA..."
                disabled={isCreating}
                rows={4}
                className="w-full resize-none bg-transparent px-4 md:px-6 py-4 text-sm md:text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              />
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 md:px-4 pb-3 md:pb-4">
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
                <Button
                  type="submit"
                  disabled={!prompt.trim() || isCreating}
                  size="lg"
                  className="rounded-xl gap-2 shrink-0"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="hidden sm:inline">Creando...</span>
                    </>
                  ) : (
                    <>
                      <SendHorizonal className="w-5 h-5" />
                      <span className="hidden sm:inline">Crear proyecto</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-lg text-center">
                {error}
              </div>
            )}
          </form>

          {/* Footer hint */}
          <p className="text-center text-sm text-muted-foreground">
            Presiona <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded">Enter</kbd> para enviar
          </p>
        </div>
      </div>
    </div>
  );
}
