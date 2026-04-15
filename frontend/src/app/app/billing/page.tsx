"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiPost } from "@/lib/api";
import {
  Crown,
  Zap,
  CreditCard,
  ExternalLink,
  Loader2,
  ArrowLeft,
  Coins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function BillingPage() {
  const { balance, planType } = useAuth();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [error, setError] = useState("");

  const isPremium = planType === "premium";

  async function handleUpgrade() {
    setIsUpgrading(true);
    setError("");
    try {
      const data = await apiPost<{ checkout_url: string }>(
        "/billing/create-checkout-session/",
        {}
      );
      window.location.href = data.checkout_url;
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Error al crear la sesión de pago.";
      setError(msg);
      setIsUpgrading(false);
    }
  }

  async function handleManageSubscription() {
    setIsPortalLoading(true);
    setError("");
    try {
      const data = await apiPost<{ portal_url: string }>(
        "/billing/create-portal-session/",
        {}
      );
      window.location.href = data.portal_url;
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Error al abrir el portal de Stripe.";
      setError(msg);
      setIsPortalLoading(false);
    }
  }

  const cardStyle = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" };

  return (
    <div className="h-full overflow-y-auto" style={{ background: "#0a0a0f" }}>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <Link href="/app" className="transition-colors" style={{ color: "rgba(255,255,255,0.4)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.9)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.4)"; }}
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Plan y facturación</h1>
            <p className="text-base mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>Gestiona tu suscripción y créditos</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
        )}

        {/* Current plan */}
        <div className="mb-5 rounded-2xl p-5" style={cardStyle}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {isPremium ? <Crown className="h-5 w-5 text-amber-400" /> : <Zap className="h-5 w-5" style={{ color: "rgba(255,255,255,0.4)" }} />}
              <span className="text-lg font-bold text-white">
                Plan <span className={isPremium ? "text-amber-400" : ""} style={!isPremium ? { color: "rgba(255,255,255,0.5)" } : {}}>{isPremium ? "Premium" : "Free"}</span>
              </span>
            </div>
            {isPremium && <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-400">Activo</span>}
          </div>
          <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>
            {isPremium ? "Tienes acceso completo a todas las funciones de DokiFlux." : "Actualiza para acceder a más créditos y límites superiores."}
          </p>
          <div className="flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <Coins className="h-4 w-4" style={{ color: "#a78bfa" }} />
            <span className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>Saldo disponible:</span>
            <span className="ml-auto text-sm font-semibold text-white">${balance ?? "0.000000"}</span>
          </div>
        </div>

        {/* Plans comparison */}
        {!isPremium && (
          <div className="mb-5 grid gap-4 sm:grid-cols-2">
            {/* Free */}
            <div className="rounded-2xl p-5" style={cardStyle}>
              <h3 className="text-base font-bold text-white mb-1">Free</h3>
              <p className="text-3xl font-bold text-white mb-4">$0<span className="text-sm font-normal ml-1" style={{ color: "rgba(255,255,255,0.45)" }}>/mes</span></p>
              <div className="space-y-2">
                {["$5 créditos/mes", "7 generaciones/día", "Proyectos hasta 200KB", "Badge «Built with DokiFlux»"].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px]" style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>✓</span>
                    {f}
                  </div>
                ))}
              </div>
            </div>

            {/* Premium */}
            <div className="rounded-2xl p-5" style={{ background: "radial-gradient(ellipse at top left, rgba(139,92,246,0.12) 0%, rgba(10,10,20,0.9) 60%)", border: "1px solid rgba(139,92,246,0.35)" }}>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-bold text-white">Premium</h3>
                <Crown className="h-4 w-4 text-amber-400" />
              </div>
              <p className="text-3xl font-bold text-white mb-4">$20<span className="text-sm font-normal ml-1" style={{ color: "rgba(255,255,255,0.45)" }}>/mes</span></p>
              <div className="space-y-2">
                {["$20 créditos/mes", "100 generaciones/día", "Proyectos hasta 500KB", "Sin badge de marca", "Créditos adicionales"].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm text-white/80">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px]" style={{ background: "rgba(139,92,246,0.2)", color: "#c084fc" }}>✓</span>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Action button */}
        {isPremium ? (
          <Button variant="outline" className="w-full sm:w-auto gap-2" onClick={handleManageSubscription} disabled={isPortalLoading}>
            {isPortalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
            Gestionar suscripción en Stripe
          </Button>
        ) : (
          <button onClick={handleUpgrade} disabled={isUpgrading}
            className="btn-primary flex items-center gap-2 w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isUpgrading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            Actualizar a Premium — $20/mes
          </button>
        )}

        <p className="mt-4 text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
          Pagos procesados de forma segura por Stripe. Cancela cuando quieras.
        </p>
      </div>
    </div>
  );
}
