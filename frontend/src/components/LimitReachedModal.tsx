"use client";

import Link from "next/link";
import { Zap, Clock, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";

export type LimitType = "credits" | "daily";

interface LimitReachedModalProps {
  type: LimitType;
  onClose: () => void;
}

export function LimitReachedModal({ type, onClose }: LimitReachedModalProps) {
  const isCredits = type === "credits";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-background shadow-2xl p-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon */}
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          {isCredits ? (
            <Zap className="h-6 w-6 text-primary" />
          ) : (
            <Clock className="h-6 w-6 text-primary" />
          )}
        </div>

        {/* Content */}
        <h2 className="text-xl font-bold tracking-tight mb-2">
          {isCredits
            ? "Te has quedado sin créditos"
            : "Límite diario alcanzado"}
        </h2>

        <p className="text-muted-foreground text-sm mb-6">
          {isCredits
            ? "Has agotado tu saldo de créditos. Activa el plan Premium para seguir generando proyectos con más créditos cada mes."
            : "Has alcanzado el límite de generaciones diarias de tu plan actual. Con Premium tienes hasta 100 generaciones al día."}
        </p>

        {/* Feature comparison */}
        <div className="mb-6 rounded-xl border bg-muted/40 p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Plan actual (Free)</span>
            <span className="font-medium">
              {isCredits ? "$5/mes en créditos" : "7 generaciones/día"}
            </span>
          </div>
          <div className="flex justify-between text-primary">
            <span className="font-medium">Premium</span>
            <span className="font-medium">
              {isCredits ? "$20/mes en créditos" : "100 generaciones/día"}
            </span>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-2">
          <Link
            href="/pricing"
            className={buttonVariants({ className: "w-full gap-2" })}
            onClick={onClose}
          >
            Ver planes
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Button variant="ghost" className="w-full" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
