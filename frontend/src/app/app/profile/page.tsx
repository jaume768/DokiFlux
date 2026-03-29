"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPost } from "@/lib/api";
import {
  ArrowLeft,
  FolderOpen,
  Zap,
  Coins,
  Cpu,
  Crown,
  CreditCard,
  ExternalLink,
  LogOut,
  Calendar,
  Activity,
  Loader2,
  Mail,
  Chrome,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

interface ProfileStats {
  date_joined: string;
  full_name: string;
  auth_provider: string;
  total_projects: number;
  total_generations: number;
  total_cost_spent: string;
  total_tokens_used: number;
  favorite_model: string;
  credits_granted: string;
  cancel_at_period_end: boolean;
  cancel_at: string | null;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatModel(model: string): string {
  if (!model) return "—";
  const map: Record<string, string> = {
    "gpt-5.4": "GPT-5.4",
    "gpt-5.4-mini": "GPT-5.4 Mini",
    "claude-sonnet-4-6": "Claude Sonnet 4.6",
    "claude-opus-4-6": "Claude Opus 4.6",
    "claude-haiku-4-5": "Claude Haiku 4.5",
    "gemini-3.1-pro": "Gemini 3.1 Pro",
    "gemini-3-flash": "Gemini 3 Flash",
    "gemini-3.1-flash-lite": "Gemini 3.1 Flash-Lite",
  };
  return map[model] ?? model;
}

export default function ProfilePage() {
  const { user, balance, planType, logout, refreshBalance } = useAuth();
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState("");

  const isPremium = planType === "premium";

  useEffect(() => {
    async function load() {
      try {
        const data = await apiGet<ProfileStats>("/auth/profile-stats/");
        setStats(data);
      } catch {
        setError("No se pudieron cargar las estadísticas.");
      } finally {
        setLoading(false);
      }
    }
    load();
    refreshBalance();
  }, [refreshBalance]);

  async function handleManageSubscription() {
    setPortalLoading(true);
    try {
      const data = await apiPost<{ portal_url: string }>(
        "/billing/create-portal-session/",
        {}
      );
      window.location.href = data.portal_url;
    } catch {
      setError("Error al abrir el portal de Stripe.");
      setPortalLoading(false);
    }
  }

  const statCards = stats
    ? [
        {
          icon: FolderOpen,
          label: "Proyectos",
          value: stats.total_projects,
          color: "text-blue-500",
          bg: "bg-blue-500/10",
        },
        {
          icon: Zap,
          label: "Generaciones",
          value: stats.total_generations,
          color: "text-violet-500",
          bg: "bg-violet-500/10",
        },
        {
          icon: Coins,
          label: "Créditos gastados",
          value: `$${parseFloat(stats.total_cost_spent).toFixed(4)}`,
          color: "text-amber-500",
          bg: "bg-amber-500/10",
        },
        {
          icon: Cpu,
          label: "Modelo favorito",
          value: formatModel(stats.favorite_model),
          color: "text-green-500",
          bg: "bg-green-500/10",
        },
      ]
    : [];

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        {/* Back */}
        <div className="mb-8 flex items-center gap-3">
          <Link
            href="/app"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Mi perfil</h1>
            <p className="text-sm text-muted-foreground">
              Estadísticas y configuración de cuenta
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* ① Header de perfil */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                {user?.username?.[0]?.toUpperCase() ||
                  user?.email?.[0]?.toUpperCase() ||
                  "U"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">
                    {user?.username || "—"}
                  </h2>
                  {isPremium ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                      <Crown className="h-3 w-3" />
                      Premium
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      Free
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {stats?.auth_provider === "google" ? (
                      <Chrome className="h-3 w-3" />
                    ) : (
                      <Mail className="h-3 w-3" />
                    )}
                    {stats?.auth_provider === "google" ? "Google" : "Email"}
                  </span>
                </div>
                {stats?.full_name && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {stats.full_name}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                {stats && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    Miembro desde {formatDate(stats.date_joined)}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ② Stats grid */}
        {loading ? (
          <div className="mb-6 flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {statCards.map(({ icon: Icon, label, value, color, bg }) => (
                <Card key={label}>
                  <CardContent className="pt-4 pb-4">
                    <div
                      className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${bg}`}
                    >
                      <Icon className={`h-4 w-4 ${color}`} />
                    </div>
                    <div className="text-lg font-bold leading-tight">
                      {value}
                    </div>
                    <div className="text-xs text-muted-foreground">{label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* ③ Tokens */}
            {stats && (
              <Card className="mb-6">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    Uso de tokens
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold">
                      {formatTokens(stats.total_tokens_used)}
                    </span>
                    <span className="mb-0.5 text-sm text-muted-foreground">
                      tokens totales procesados
                    </span>
                  </div>
                  <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                    <span>
                      Créditos concedidos:{" "}
                      <strong className="text-foreground">
                        ${parseFloat(stats.credits_granted).toFixed(2)}
                      </strong>
                    </span>
                    <span>
                      Saldo actual:{" "}
                      <strong className="text-foreground">
                        ${parseFloat(balance ?? "0").toFixed(4)}
                      </strong>
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* ④ Suscripción */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              {isPremium ? (
                <Crown className="h-4 w-4 text-amber-500" />
              ) : (
                <Zap className="h-4 w-4 text-muted-foreground" />
              )}
              Suscripción
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
              <div>
                <p className="text-sm font-medium">
                  Plan {isPremium ? "Premium" : "Free"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {!isPremium
                    ? "Gratis · Límites reducidos"
                    : stats?.cancel_at_period_end
                    ? stats.cancel_at
                      ? `Se cancela el ${new Date(stats.cancel_at).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}`
                      : "Pendiente de cancelación"
                    : "$20/mes · Renovación automática"}
                </p>
              </div>
              {isPremium ? (
                stats?.cancel_at_period_end ? (
                  <span className="rounded-full bg-orange-500/10 px-2.5 py-1 text-xs font-medium text-orange-600 dark:text-orange-400">
                    Cancelando
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                    Activo
                  </span>
                )
              ) : (
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                  Gratuito
                </span>
              )}
            </div>

            {isPremium ? (
              <button
                className={buttonVariants({ variant: "outline", size: "sm", className: "w-full gap-2" })}
                onClick={handleManageSubscription}
                disabled={portalLoading}
              >
                {portalLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                Gestionar suscripción en Stripe
              </button>
            ) : (
              <Link
                href="/app/billing"
                className={buttonVariants({ size: "sm", className: "w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white" })}
              >
                <CreditCard className="h-4 w-4" />
                Actualizar a Premium — $20/mes
              </Link>
            )}
          </CardContent>
        </Card>

        {/* ⑤ Cuenta */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Cuenta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              href="/app/billing"
              className={buttonVariants({ variant: "outline", size: "sm", className: "w-full justify-start gap-2" })}
            >
              <Coins className="h-4 w-4" />
              Ver historial de transacciones
            </Link>
            <button
              className={buttonVariants({ variant: "ghost", size: "sm", className: "w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10" })}
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
