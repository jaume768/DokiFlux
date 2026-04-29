"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { apiPost, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";

function PasswordResetConfirmContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("El enlace no es válido o está incompleto.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setIsLoading(true);
    try {
      await apiPost(
        "/auth/password-reset-confirm/",
        { token, new_password: password },
        { auth: false }
      );
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Error de conexión.");
    } finally {
      setIsLoading(false);
    }
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
          {success ? (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-2xl p-4" style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)" }}>
                  <CheckCircle className="w-7 h-7" style={{ color: "#34d399" }} />
                </div>
              </div>
              <h1 className="text-xl font-bold text-white mb-2">Contraseña actualizada</h1>
              <p className="text-white/50 text-sm mb-6">Ya puedes iniciar sesión con tu nueva contraseña.</p>
              <Link href="/login">
                <Button className="btn-primary w-full rounded-xl py-2.5 font-semibold" size="lg">
                  Ir al login
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-white mb-1">Nueva contraseña</h1>
              <p className="text-white/50 text-sm mb-6">Introduce una contraseña nueva para tu cuenta.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-sm font-medium text-white/70">Contraseña</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    required
                    minLength={8}
                    autoFocus
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="password-confirm" className="text-sm font-medium text-white/70">Repite la contraseña</label>
                  <input
                    id="password-confirm"
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="Repite la contraseña"
                    required
                    minLength={8}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !password || !passwordConfirm}
                  className="btn-primary w-full rounded-xl py-2.5 font-semibold"
                  size="lg"
                >
                  {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</> : "Guardar contraseña"}
                </Button>
              </form>
            </>
          )}
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

export default function PasswordResetConfirmPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white/60"><Loader2 className="w-5 h-5 animate-spin" /></div>}>
      <PasswordResetConfirmContent />
    </Suspense>
  );
}
