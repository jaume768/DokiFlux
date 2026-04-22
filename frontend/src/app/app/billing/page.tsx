"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPost } from "@/lib/api";
import {
  Crown,
  CreditCard,
  ExternalLink,
  Loader2,
  ArrowLeft,
  Coins,
  CheckCircle2,
  XCircle,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const PRESET_AMOUNTS = [5, 10, 25, 50];
const MIN_TOPUP = 5;

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>}>
      <BillingPageInner />
    </Suspense>
  );
}

interface BillingPlan {
  plan_type: "free" | "premium";
  cancel_at_period_end?: boolean;
  cancel_at?: string | null;
}

function BillingPageInner() {
  const { balance, planType, refreshBalance } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [isToppingUp, setIsToppingUp] = useState(false);
  const [topupAmount, setTopupAmount] = useState<number>(10);
  const [topupBanner, setTopupBanner] = useState<"success" | "cancelled" | null>(null);
  const [error, setError] = useState("");
  const [billingPlan, setBillingPlan] = useState<BillingPlan | null>(null);

  // Sync Stripe status on mount and read cancel_at_period_end
  useEffect(() => {
    async function syncPlan() {
      await refreshBalance(); // triggers Stripe sync on backend
      try {
        const data = await apiGet<{ balance: string; plan: BillingPlan }>("/billing/balance/");
        setBillingPlan(data.plan);
      } catch {
        // silently ignore
      }
    }
    syncPlan();
  }, [refreshBalance]);

  // Handle ?topup=success|cancelled redirect from Stripe
  useEffect(() => {
    const topup = searchParams.get("topup");
    if (topup === "success" || topup === "cancelled") {
      setTopupBanner(topup);
      if (topup === "success") {
        // Refresh balance a few times — webhook may run slightly after redirect
        refreshBalance();
        const timers = [1500, 4000, 8000].map((ms) =>
          setTimeout(() => refreshBalance(), ms)
        );
        return () => timers.forEach(clearTimeout);
      }
    }
  }, [searchParams, refreshBalance]);

  async function handleTopup() {
    if (topupAmount < MIN_TOPUP) {
      setError(`El importe mínimo es ${MIN_TOPUP} €.`);
      return;
    }
    setIsToppingUp(true);
    setError("");
    try {
      const data = await apiPost<{ checkout_url: string }>(
        "/billing/create-topup-session/",
        { amount_eur: topupAmount }
      );
      window.location.href = data.checkout_url;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al crear la sesión de pago.";
      setError(msg);
      setIsToppingUp(false);
    }
  }

  const isPremium = planType === "premium";
  const cancelAtPeriodEnd = billingPlan?.cancel_at_period_end ?? false;
  const cancelAt = billingPlan?.cancel_at ?? null;

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

        {/* Top-up banners (from Stripe redirect) */}
        {topupBanner === "success" && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">¡Recarga completada!</p>
              <p className="text-emerald-200/80 text-xs mt-0.5">
                Tu saldo se actualizará en unos segundos. Si no lo ves, recarga la página.
              </p>
            </div>
            <button onClick={() => { setTopupBanner(null); router.replace("/app/billing"); }} className="text-emerald-300/70 hover:text-emerald-300 text-xs">Cerrar</button>
          </div>
        )}
        {topupBanner === "cancelled" && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Recarga cancelada</p>
              <p className="text-amber-200/70 text-xs mt-0.5">No se ha cobrado nada. Puedes intentarlo de nuevo cuando quieras.</p>
            </div>
            <button onClick={() => { setTopupBanner(null); router.replace("/app/billing"); }} className="text-amber-200/60 hover:text-amber-200 text-xs">Cerrar</button>
          </div>
        )}

        {/* ── FREE USERS: Plan cards first, then credits ── */}
        {!isPremium && (
          <>
            {/* Plans comparison */}
            <div className="mb-5 grid gap-4 sm:grid-cols-2">
              {/* Free */}
              <div className="rounded-2xl p-5" style={cardStyle}>
                <h3 className="text-base font-bold text-white mb-1">Free</h3>
                <p className="text-3xl font-bold text-white mb-4">$0<span className="text-sm font-normal ml-1" style={{ color: "rgba(255,255,255,0.45)" }}>/mes</span></p>
                <div className="space-y-2">
                  {["$5 créditos/mes", "5 generaciones/día", "Proyectos hasta 200KB", "Badge «Built with DokiFlux»"].map((f) => (
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

            {/* Upgrade button */}
            <div className="mb-5">
              <button onClick={handleUpgrade} disabled={isUpgrading}
                className="btn-primary flex items-center gap-2 w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isUpgrading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                Actualizar a Premium
              </button>
              <p className="mt-3 text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
                Pagos procesados de forma segura por Stripe. Cancela cuando quieras.
              </p>
            </div>
          </>
        )}

        {/* ── PREMIUM USERS: Current plan status ── */}
        {isPremium && (
          <div className="mb-5 rounded-2xl p-5" style={cardStyle}>
            <div className="flex items-center gap-2 mb-3">
              <Crown className="h-5 w-5 text-amber-400" />
              <span className="text-lg font-bold text-white">Plan <span className="text-amber-400">Premium</span></span>
              {cancelAtPeriodEnd
                ? <span className="ml-auto rounded-full bg-orange-500/15 px-3 py-1 text-xs font-semibold text-orange-400">Cancelando</span>
                : <span className="ml-auto rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-400">Activo</span>
              }
            </div>
            <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>
              {cancelAtPeriodEnd
                ? cancelAt
                  ? `Tu suscripción se cancela el ${new Date(cancelAt).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}. Hasta esa fecha conservas el acceso completo.`
                  : "Tu suscripción está pendiente de cancelación. Conservas el acceso hasta que finalice el período."
                : "Tienes acceso completo a todas las funciones de DokiFlux."
              }
            </p>
            <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <Coins className="h-4 w-4" style={{ color: "#a78bfa" }} />
              <span className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>Saldo disponible:</span>
              <span className="ml-auto text-sm font-semibold text-white">${balance ?? "0.000000"}</span>
            </div>
            <Button variant="outline" className="w-full sm:w-auto gap-2" onClick={handleManageSubscription} disabled={isPortalLoading}>
              {isPortalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              Gestionar suscripción en Stripe
            </Button>
          </div>
        )}

        {/* ── ADD CREDITS (always visible) ── */}
        <div className="mb-5 rounded-2xl p-5" style={cardStyle}>
          <div className="flex items-center gap-2 mb-1">
            <Plus className="h-5 w-5" style={{ color: "#a78bfa" }} />
            <h3 className="text-lg font-bold text-white">Añadir fondos</h3>
          </div>
          <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.55)" }}>
            Recarga tu saldo con la cantidad que quieras. Se usa automáticamente al generar.
            Mínimo {MIN_TOPUP} €.
          </p>

          <div className="flex flex-wrap gap-2 mb-3">
            {PRESET_AMOUNTS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setTopupAmount(n)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                  topupAmount === n
                    ? "border-primary/60 bg-primary/15 text-white"
                    : "border-white/10 bg-white/5 text-white/70 hover:text-white hover:border-white/25"
                }`}
              >
                {n} €
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 mb-4">
            <label className="text-sm shrink-0" style={{ color: "rgba(255,255,255,0.65)" }}>Cantidad:</label>
            <div className="relative flex-1 max-w-[160px]">
              <input
                type="number"
                min={MIN_TOPUP}
                max={500}
                step={1}
                value={topupAmount}
                onChange={(e) => setTopupAmount(Math.max(MIN_TOPUP, Math.min(500, Number(e.target.value) || 0)))}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-primary/60"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/50">€</span>
            </div>
          </div>

          <Button
            onClick={handleTopup}
            disabled={isToppingUp || topupAmount < MIN_TOPUP}
            className="w-full sm:w-auto gap-2 h-11 text-base font-semibold"
            style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)" }}
          >
            {isToppingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            Comprar {topupAmount} € de saldo
          </Button>
        </div>
      </div>
    </div>
  );
}
