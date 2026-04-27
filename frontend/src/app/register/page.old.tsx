"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ApiError, apiPost } from "@/lib/api";
import Image from "next/image";
import { Loader2, Eye, EyeOff, Mail, RotateCcw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import GoogleSignInButton from "@/components/GoogleSignInButton";

export default function RegisterPage() {
  const { register } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(true);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  function handleGoogleError(msg: string) {
    setError(msg);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== passwordConfirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await register({
        email,
        password,
        password_confirm: passwordConfirm,
        full_name: fullName,
      });

      // If user is not auto-verified, show the "check your email" screen
      if (res.user && !res.user.is_email_verified) {
        setPendingEmail(res.user.email);
        setEmailSent((res as unknown as Record<string, unknown>).email_sent !== false);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as Record<string, unknown>;
        if (data.email && Array.isArray(data.email)) {
          setError((data.email as string[])[0]);
        } else if (data.password && Array.isArray(data.password)) {
          setError((data.password as string[])[0]);
        } else {
          const firstField = Object.keys(data)[0];
          if (firstField && Array.isArray(data[firstField])) {
            setError((data[firstField] as string[])[0]);
          } else {
            setError("Error al crear la cuenta.");
          }
        }
      } else {
        setError("Error de conexión. Inténtalo de nuevo.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResend() {
    if (!pendingEmail) return;
    setResendLoading(true);
    setResendMessage("");
    try {
      await apiPost("/auth/resend-verification/", { email: pendingEmail }, { auth: false });
      setResendMessage("Email reenviado. Revisa tu bandeja de entrada.");
      setEmailSent(true);
    } catch {
      setResendMessage("No se pudo reenviar el email. Inténtalo más tarde.");
    } finally {
      setResendLoading(false);
    }
  }

  // --- Pending verification screen ---
  if (pendingEmail) {
    return (
      <div className="landing bg-[#0a0a0f] text-white min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern pointer-events-none" style={{ opacity: 0.35 }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] pointer-events-none" style={{ background: "radial-gradient(ellipse, rgba(56,189,248,0.15) 0%, transparent 70%)" }} />

        <div className="relative z-10 w-full max-w-sm">
          <div className="flex items-center justify-center mb-8">
            <Image src="/logo-texto-blanco.png" alt="DokiFlux" width={220} height={55} className="h-11 w-auto" />
          </div>

          <div className="rounded-2xl p-7 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(20px)" }}>
            <div className="flex justify-center mb-4">
              <div className="rounded-2xl p-4" style={{ background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.25)" }}>
                <Mail className="w-7 h-7" style={{ color: "#38bdf8" }} />
              </div>
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Verifica tu email</h1>
            <p className="text-white/50 text-sm mb-6">
              {emailSent
                ? <>Hemos enviado un enlace de verificación a <span className="text-white/80 font-medium">{pendingEmail}</span>. Revisa tu bandeja de entrada (y spam).</>
                : <>No se pudo enviar el email a <span className="text-white/80 font-medium">{pendingEmail}</span>. Pulsa el botón para reenviar.</>
              }
            </p>

            {resendMessage && (
              <p className="text-sm text-white/50 mb-4">{resendMessage}</p>
            )}

            <button
              onClick={handleResend}
              disabled={resendLoading}
              className="btn-primary w-full rounded-xl py-2.5 font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed mb-4"
            >
              {resendLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Reenviando...</>
              ) : (
                <><RotateCcw className="w-4 h-4" />Reenviar verificación</>
              )}
            </button>

            <p className="text-sm text-white/40">
              ¿Ya verificaste?{" "}
              <Link href="/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
                Iniciar sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- Registration form ---
  return (
    <div className="landing bg-[#0a0a0f] text-white min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="absolute inset-0 grid-pattern pointer-events-none" style={{ opacity: 0.35 }} />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] pointer-events-none" style={{ background: "radial-gradient(ellipse, rgba(139,92,246,0.18) 0%, transparent 70%)" }} />

      <div className="relative z-10 w-full max-w-sm">
        <div className="flex items-center justify-center mb-8">
          <Image src="/logo-texto-blanco.png" alt="DokiFlux" width={220} height={55} className="h-11 w-auto" />
        </div>

        <div className="rounded-2xl p-7" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(20px)" }}>
          <h1 className="text-xl font-bold text-white mb-1">Crear cuenta</h1>
          <p className="text-white/50 text-sm mb-6">Empieza a generar UI con IA</p>

          <GoogleSignInButton onError={handleGoogleError} />

          <div className="relative flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-white/30">o</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="fullName" className="text-sm font-medium text-white/70">Nombre completo</label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Tu nombre"
                required
                autoFocus
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-white/70">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-white/70">Contraseña</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 pr-10 text-sm text-white placeholder:text-white/25 outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="passwordConfirm" className="text-sm font-medium text-white/70">Confirmar contraseña</label>
              <input
                id="passwordConfirm"
                type={showPassword ? "text" : "password"}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="Repite la contraseña"
                required
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading || !email || !password || !fullName || !passwordConfirm}
              className="btn-primary w-full rounded-xl py-2.5 font-semibold"
              size="lg"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Creando cuenta...</>
              ) : "Crear cuenta"}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-white/40 mt-5">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
