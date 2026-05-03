"use client";

import { ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmbeddedBrowserDemoModalProps {
  open: boolean;
  onClose: () => void;
  browserName?: string | null;
}

export function EmbeddedBrowserDemoModal({ open, onClose, browserName }: EmbeddedBrowserDemoModalProps) {
  if (!open) return null;

  const name = browserName || "Instagram";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(6px)" }}>
      <div
        className="relative w-full max-w-md rounded-2xl p-6 text-center bg-background shadow-2xl animate-in zoom-in-95 fade-in duration-200"
        style={{
          border: "2px solid rgba(139,92,246,0.55)",
          boxShadow: "0 0 0 1px rgba(139,92,246,0.18), 0 30px 80px -20px rgba(139,92,246,0.5), 0 0 100px -20px rgba(99,102,241,0.4)",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-4 top-4 rounded-full p-1.5 bg-black/40 text-white/70 hover:text-white hover:bg-black/60 transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
          <ExternalLink className="h-7 w-7" />
        </div>

        <h2 className="text-xl font-bold mb-3">Abre la demo en tu navegador</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          La vista previa interactiva no está disponible dentro del navegador de {name}. Ábrelo en Chrome/Safari para ver la demo.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed mb-5">
          Toca los tres puntos arriba a la derecha → “Abrir en navegador”.
        </p>

        <Button type="button" onClick={onClose} className="w-full h-11 text-base font-semibold">
          Entendido
        </Button>
      </div>
    </div>
  );
}
