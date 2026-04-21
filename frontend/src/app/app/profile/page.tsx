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
import { Button } from "@/components/ui/button";
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
        // Refresh balance AFTER profile-stats completes so planType reflects
        // the Stripe-synced status (avoids race condition with stale DB values).
        await refreshBalance();
      } catch {
        setError("No se pudieron cargar las estadísticas.");
      } finally {
        setLoading(false);
      }
    }
    load();
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

  const cardStyle = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" };

  return (
    <div className="h-full overflow-y-auto" style={{ background: "#0a0a0f" }}>
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        {/* Back */}
        <div className="mb-8 flex items-center gap-3">
          <Link href="/app" className="transition-colors" style={{ color: "rgba(255,255,255,0.4)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.9)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.4)"; }}
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Mi perfil</h1>
            <p className="text-base mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>
              Estadísticas y configuración de cuenta
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* ① Header de perfil */}
        <div className="mb-5 rounded-2xl p-5" style={cardStyle}>
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white"
              style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}
            >
              {user?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-lg font-bold text-white">{user?.username || "—"}</h2>
                {isPremium ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
                    <Crown className="h-3 w-3" />Premium
                  </span>
                ) : (
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)" }}>Free</span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs" style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)" }}>
                  {stats?.auth_provider === "google" ? <Chrome className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                  {stats?.auth_provider === "google" ? "Google" : "Email"}
                </span>
              </div>
              {stats?.full_name && <p className="text-sm mb-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>{stats.full_name}</p>}
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>{user?.email}</p>
              {stats && (
                <div className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                  <Calendar className="h-3.5 w-3.5" />
                  Miembro desde {formatDate(stats.date_joined)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ② Stats grid */}
        {loading ? (
          <div className="mb-6 flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#8b5cf6" }} />
          </div>
        ) : (
          <>
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {statCards.map(({ icon: Icon, label, value, color, bg }) => (
                <div key={label} className="rounded-2xl p-4" style={cardStyle}>
                  <div className={`mb-2.5 flex h-9 w-9 items-center justify-center rounded-xl ${bg}`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                  <div className="text-lg font-bold text-white leading-tight">{value}</div>
                  <div className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>{label}</div>
                </div>
              ))}
            </div>

            {/* ③ Tokens */}
            {stats && (
              <div className="mb-5 rounded-2xl p-5" style={cardStyle}>
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="h-4 w-4" style={{ color: "rgba(255,255,255,0.4)" }} />
                  <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>Uso de tokens</span>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-white">{formatTokens(stats.total_tokens_used)}</span>
                  <span className="mb-1 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>tokens totales procesados</span>
                </div>
                <div className="mt-3 flex gap-5 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                  <span>Créditos concedidos:{" "}<strong className="text-white">${parseFloat(stats.credits_granted).toFixed(2)}</strong></span>
                  <span>Saldo actual:{" "}<strong className="text-white">${parseFloat(balance ?? "0").toFixed(4)}</strong></span>
                </div>
              </div>
            )}
          </>
        )}

        {/* ④ Suscripción */}
        <div className="mb-5 rounded-2xl p-5" style={cardStyle}>
          <div className="flex items-center gap-2 mb-4">
            {isPremium ? <Crown className="h-4 w-4 text-amber-400" /> : <Zap className="h-4 w-4" style={{ color: "rgba(255,255,255,0.4)" }} />}
            <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>Suscripción</span>
          </div>
          <div className="flex items-center justify-between rounded-xl px-4 py-3 mb-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div>
              <p className="text-sm font-semibold text-white">Plan {isPremium ? "Premium" : "Free"}</p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                {!isPremium ? "Gratis · Límites reducidos" : stats?.cancel_at_period_end
                  ? stats.cancel_at ? `Se cancela el ${new Date(stats.cancel_at).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}` : "Pendiente de cancelación"
                  : "$20/mes · Renovación automática"}
              </p>
            </div>
            {isPremium ? (
              stats?.cancel_at_period_end
                ? <span className="rounded-full bg-orange-500/15 px-2.5 py-1 text-xs font-semibold text-orange-400">Cancelando</span>
                : <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-400">Activo</span>
            ) : (
              <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)" }}>Gratuito</span>
            )}
          </div>
          {isPremium ? (
            <Button variant="outline" size="sm" className="w-full gap-2" onClick={handleManageSubscription} disabled={portalLoading}>
              {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              Gestionar suscripción en Stripe
            </Button>
          ) : (
            <Link href="/app/billing" className="btn-primary flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white">
              <CreditCard className="h-4 w-4" />
              Actualizar a Premium — $20/mes
            </Link>
          )}
        </div>

        {/* ⑤ Cuenta */}
        <div className="rounded-2xl p-5" style={cardStyle}>
          <p className="text-sm font-semibold mb-3" style={{ color: "rgba(255,255,255,0.7)" }}>Cuenta</p>
          <div className="space-y-2">
            <Link href="/app/billing"
              className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-white/70 hover:text-white"
              style={{ border: "1px solid rgba(255,255,255,0.09)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
            >
              <Coins className="h-4 w-4" />
              Ver historial de transacciones
            </Link>
            <button onClick={logout}
              className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-red-400 hover:bg-red-500/10"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
