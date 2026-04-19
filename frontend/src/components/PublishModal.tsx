"use client";

import { useEffect } from "react";
import Image from "next/image";
import { Globe, Database, ShieldCheck, ArrowRight, X } from "lucide-react";
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center sm:p-4 overflow-y-auto overscroll-contain">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 my-auto w-full max-w-lg min-h-full sm:min-h-0 sm:rounded-2xl border border-border bg-background shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200 flex flex-col">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full p-1.5 bg-black/40 text-white/80 hover:text-white hover:bg-black/60 backdrop-blur-sm transition-colors"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Hero illustration */}
        <div
          className="relative w-full flex items-center justify-center pt-8 pb-3 sm:pt-10 sm:pb-4 shrink-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(139,92,246,0.18) 0%, rgba(99,102,241,0.06) 55%, transparent 80%)",
          }}
        >
          <div className="relative w-40 h-28 sm:w-56 sm:h-40 md:w-104 md:h-74">
            <Image
              src="/tarjetas-4-pasos/tarjeta-04.png"
              alt="Publicar tu proyecto"
              fill
              priority
              sizes="(max-width: 640px) 160px, 376px"
              className="object-contain drop-shadow-[0_10px_30px_rgba(139,92,246,0.35)]"
            />
          </div>
        </div>

        <div className="px-5 sm:px-6 md:px-7 pt-4 pb-6 md:pb-7 relative flex-1 flex flex-col">
          {/* Copy */}
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">{title}</h2>
          <p className="text-muted-foreground text-sm md:text-base mb-4 sm:mb-5 leading-relaxed">
            {subtitle}
          </p>

          {/* Bullets */}
          <div className="mb-5 sm:mb-6 space-y-3">
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
          <p className="text-xs text-muted-foreground mb-4 sm:mb-5 text-center">
            Sin compromiso · Presupuesto personalizado en 24h
          </p>

          {/* CTAs */}
          <div className="flex flex-col gap-2 mt-auto">
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
