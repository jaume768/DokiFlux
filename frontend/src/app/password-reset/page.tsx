"use client";

import { useState } from "react";
import Link from "next/link";
import { apiPost, ApiError } from "@/lib/api";
import Image from "next/image";
import { Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PasswordResetPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await apiPost("/auth/password-reset/", { email }, { auth: false });
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Error de conexión.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <div className="landing bg-[#0a0a0f] text-white min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern pointer-events-none" style={{ opacity: 0.35 }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] pointer-events-none" style={{ background: "radial-gradient(ellipse, rgba(52,211,153,0.15) 0%, transparent 70%)" }} />

        <div className="relative z-10 w-full max-w-sm">
          <div className="flex items-center justify-center mb-8">
            <Image src="/logo-texto-blanco.png" alt="DokiFlux" width={220} height={55} className="h-11 w-auto" />
          </div>
          <div className="rounded-2xl p-7 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(20px)" }}>
            <div className="flex justify-center mb-4">
              <div className="rounded-2xl p-4" style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)" }}>
                <CheckCircle className="w-7 h-7" style={{ color: "#34d399" }} />
              </div>
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Email enviado</h1>
            <p className="text-white/50 text-sm mb-6">
              Si existe una cuenta con <span className="text-white/80 font-medium">{email}</span>, recibirás un enlace para restablecer tu contraseña.
            </p>
            <Link href="/login">
              <Button className="btn-secondary w-full rounded-xl py-2.5 font-semibold border-white/10 text-white/80 hover:text-white" size="lg">
                <ArrowLeft className="w-4 h-4" />
                Volver al login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="landing bg-[#0a0a0f] text-white min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 grid-pattern pointer-events-none" style={{ opacity: 0.35 }} />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] pointer-events-none" style={{ background: "radial-gradient(ellipse, rgba(139,92,246,0.18) 0%, transparent 70%)" }} />

      <div className="relative z-10 w-full max-w-sm">
        <div className="flex items-center justify-center mb-8">
          <Image src="/logo-texto-blanco.png" alt="DokiFlux" width={220} height={55} className="h-11 w-auto" />
        </div>

        <div className="rounded-2xl p-7" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(20px)" }}>
          <h1 className="text-xl font-bold text-white mb-1">Restablecer contraseña</h1>
          <p className="text-white/50 text-sm mb-6">Te enviaremos un enlace para restablecer tu contraseña.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-white/70">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                autoFocus
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading || !email}
              className="btn-primary w-full rounded-xl py-2.5 font-semibold"
              size="lg"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Enviando...</>
              ) : "Enviar enlace"}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-white/40 mt-5">
          <Link href="/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
            <ArrowLeft className="w-3 h-3 inline mr-1" />
            Volver al login
          </Link>
        </p>
      </div>
    </div>
  );
}
