"use client";

import { useEffect } from "react";
import { Rocket, Globe, Database, ShieldCheck, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PublishModalProps {
  open: boolean;
  onClose: () => void;
  onContact: () => void;
  variant?: "auto" | "manual";
}

export function PublishModal({ open, onClose, onContact, variant = "manual" }: PublishModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    // lock scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const title =
    variant === "auto"
      ? "¿Te gusta lo que has creado?"
      : "Lleva tu proyecto a producción";

  const subtitle =
    variant === "auto"
      ? "Podemos ayudarte a publicarlo en internet con tu propio dominio, para que cualquier persona pueda acceder."
      : "Nuestro equipo se encarga de todo para que tu web esté online, lista para tus clientes.";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-background shadow-2xl p-6 md:p-7 animate-in zoom-in-95 fade-in duration-200">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon banner */}
        <div
          className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{
            background:
              "linear-gradient(135deg, rgba(139,92,246,0.20) 0%, rgba(56,189,248,0.20) 100%)",
            border: "1px solid rgba(139,92,246,0.35)",
          }}
        >
          <Rocket className="h-7 w-7 text-primary" />
        </div>

        {/* Copy */}
        <h2 className="text-2xl font-bold tracking-tight mb-2">{title}</h2>
        <p className="text-muted-foreground text-sm md:text-base mb-5 leading-relaxed">
          {subtitle}
        </p>

        {/* Bullets */}
        <div className="mb-6 space-y-3">
          <Feature
            icon={<Globe className="h-4 w-4" />}
            title="Tu propio dominio"
            desc="Conectamos tu web a un dominio personalizado (tu-marca.com)."
          />
          <Feature
            icon={<Database className="h-4 w-4" />}
            title="Base de datos y hosting"
            desc="Configuramos servidor, base de datos y copias de seguridad."
          />
          <Feature
            icon={<ShieldCheck className="h-4 w-4" />}
            title="Soporte y mantenimiento"
            desc="Certificado SSL, seguridad y actualizaciones incluidas."
          />
        </div>

        {/* Trust line */}
        <p className="text-xs text-muted-foreground mb-5 text-center">
          Sin compromiso · Presupuesto personalizado en 24h
        </p>

        {/* CTAs */}
        <div className="flex flex-col gap-2">
          <Button
            onClick={onContact}
            className="w-full gap-2 h-11 text-base font-semibold"
            style={{
              background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
            }}
          >
            Solicitar presupuesto gratis
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" className="w-full" onClick={onClose}>
            Ahora no
          </Button>
        </div>
      </div>
    </div>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{desc}</p>
      </div>
    </div>
  );
}
