"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiPost } from "@/lib/api";
import {
  Crown,
  Zap,
  CreditCard,
  ExternalLink,
  Check,
  Loader2,
  ArrowLeft,
  Coins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default function BillingPage() {
  const { user, balance, planType, refreshBalance } = useAuth();
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

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <Link
            href="/app"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Plan y facturación
            </h1>
            <p className="text-sm text-muted-foreground">
              Gestiona tu suscripción y créditos
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Current plan */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isPremium ? (
                  <Crown className="h-5 w-5 text-amber-500" />
                ) : (
                  <Zap className="h-5 w-5 text-muted-foreground" />
                )}
                <CardTitle className="text-lg">
                  Plan{" "}
                  <span
                    className={
                      isPremium ? "text-amber-500" : "text-muted-foreground"
                    }
                  >
                    {isPremium ? "Premium" : "Free"}
                  </span>
                </CardTitle>
              </div>
              {isPremium && (
                <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                  Activo
                </span>
              )}
            </div>
            <CardDescription>
              {isPremium
                ? "Tienes acceso completo a todas las funciones de DokiFlux."
                : "Actualiza para acceder a más créditos y límites superiores."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-3">
              <Coins className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Saldo disponible:
              </span>
              <span className="ml-auto text-sm font-semibold">
                ${balance ?? "0.000000"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Plans comparison */}
        {!isPremium && (
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            {/* Free */}
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Free</CardTitle>
                <p className="text-2xl font-bold">
                  $0
                  <span className="text-sm font-normal text-muted-foreground">
                    /mes
                  </span>
                </p>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {[
                  "$5 créditos/mes",
                  "7 generaciones/día",
                  "Proyectos hasta 200KB",
                  "Badge «Built with DokiFlux»",
                ].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 shrink-0" />
                    {f}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Premium */}
            <Card className="border-amber-500/50 bg-amber-500/5 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Premium</CardTitle>
                  <Crown className="h-4 w-4 text-amber-500" />
                </div>
                <p className="text-2xl font-bold">
                  $20
                  <span className="text-sm font-normal text-muted-foreground">
                    /mes
                  </span>
                </p>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {[
                  "$20 créditos/mes",
                  "100 generaciones/día",
                  "Proyectos hasta 500KB",
                  "Sin badge de marca",
                  "Créditos adicionales",
                ].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 shrink-0 text-amber-500" />
                    {f}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Action button */}
        {isPremium ? (
          <Button
            variant="outline"
            className="w-full sm:w-auto gap-2"
            onClick={handleManageSubscription}
            disabled={isPortalLoading}
          >
            {isPortalLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="h-4 w-4" />
            )}
            Gestionar suscripción en Stripe
          </Button>
        ) : (
          <Button
            className="w-full sm:w-auto gap-2 bg-amber-500 hover:bg-amber-600 text-white"
            onClick={handleUpgrade}
            disabled={isUpgrading}
          >
            {isUpgrading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4" />
            )}
            Actualizar a Premium — $20/mes
          </Button>
        )}

        <p className="mt-3 text-xs text-muted-foreground">
          Pagos procesados de forma segura por Stripe. Cancela cuando quieras.
        </p>
      </div>
    </div>
  );
}
