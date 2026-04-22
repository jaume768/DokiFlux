"use client";

import { useEffect } from "react";
import { Download, Wrench, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  onDownloadZip: () => void;
  onContactEngineer: () => void;
}

export function ExportModal({ open, onClose, onDownloadZip, onContactEngineer }: ExportModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center sm:p-4 overflow-y-auto overscroll-contain">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 my-auto w-full max-w-md min-h-full sm:min-h-0 sm:rounded-2xl border border-border bg-background shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200 flex flex-col">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full p-1.5 bg-black/40 text-white/80 hover:text-white hover:bg-black/60 backdrop-blur-sm transition-colors"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header glow */}
        <div
          className="w-full px-6 pt-10 pb-6 shrink-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(139,92,246,0.15) 0%, transparent 80%)",
          }}
        >
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight leading-snug">
            ¡Gran trabajo! Tienes la base visual.
          </h2>
          <p className="text-muted-foreground text-base mt-2 leading-relaxed">
            ¿Qué vas a hacer ahora con este código?
          </p>
        </div>

        {/* Options */}
        <div className="px-5 sm:px-6 pb-7 flex flex-col gap-3 flex-1">
          {/* Option A */}
          <button
            onClick={onDownloadZip}
            className="group w-full flex items-start gap-4 rounded-xl border border-border bg-muted/40 hover:bg-muted/70 hover:border-border/80 transition-all duration-200 p-4 text-left"
          >
            <div className="shrink-0 mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-background border border-border group-hover:border-primary/40 transition-colors">
              <Download className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[15px] leading-tight">Solo quiero el código UI</p>
              <p className="text-sm text-muted-foreground mt-0.5 leading-snug">Descargar ZIP con los archivos listos para usar.</p>
            </div>
            <ArrowRight className="shrink-0 h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground mt-1 transition-colors" />
          </button>

          {/* Option B */}
          <button
            onClick={onContactEngineer}
            className="group w-full flex items-start gap-4 rounded-xl border transition-all duration-200 p-4 text-left hover:scale-[1.01] active:scale-[0.99]"
            style={{
              background: "linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(99,102,241,0.08) 100%)",
              border: "1px solid rgba(139,92,246,0.3)",
            }}
          >
            <div
              className="shrink-0 mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}
            >
              <Wrench className="h-4 w-4 text-violet-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-[15px] leading-tight">Necesito conectarlo a bases de datos, autenticación y crear un backend real.</p>
              </div>
              <p className="text-sm text-violet-400/80 mt-1 leading-snug font-medium">
                Hablar con un ingeniero — 20 min gratis
              </p>
            </div>
            <ArrowRight className="shrink-0 h-4 w-4 text-violet-400/60 group-hover:text-violet-400 mt-1 transition-colors" />
          </button>

          <p className="text-xs text-muted-foreground text-center pt-1">Sin compromiso · Respuesta en menos de 24h</p>
        </div>
      </div>
    </div>
  );
}
