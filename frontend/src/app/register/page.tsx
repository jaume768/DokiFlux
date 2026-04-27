"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ApiError, apiPost } from "@/lib/api";
import {
  Loader2,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { AuthShell } from "@/components/auth/AuthShell";

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
      if (res.user && !res.user.is_email_verified) {
        setPendingEmail(res.user.email);
        setEmailSent(
          (res as unknown as Record<string, unknown>).email_sent !== false
        );
      }
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as Record<string, unknown>;
        if (data.email && Array.isArray(data.email))
          setError((data.email as string[])[0]);
        else if (data.password && Array.isArray(data.password))
          setError((data.password as string[])[0]);
        else {
          const firstField = Object.keys(data)[0];
          if (firstField && Array.isArray(data[firstField]))
            setError((data[firstField] as string[])[0]);
          else setError("Error al crear la cuenta.");
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
      await apiPost(
        "/auth/resend-verification/",
        { email: pendingEmail },
        { auth: false }
      );
      setResendMessage("Email reenviado. Revisa tu bandeja de entrada.");
      setEmailSent(true);
    } catch {
      setResendMessage("No se pudo reenviar el email. Inténtalo más tarde.");
    } finally {
      setResendLoading(false);
    }
  }

  // ── Pending verification screen ──
  if (pendingEmail) {
    return (
      <AuthShell
        heading={
          <>
            Verifica tu <span className="gradient-text">email</span>
          </>
        }
        subheading="Solo un paso más antes de empezar a crear."
      >
        <div className="flex justify-center mb-5">
          <div
            className="rounded-2xl p-5"
            style={{
              background: "rgba(56,189,248,0.12)",
              border: "1px solid rgba(56,189,248,0.35)",
              boxShadow: "0 0 30px rgba(56,189,248,0.25)",
            }}
          >
            <Mail className="w-9 h-9" style={{ color: "#38bdf8" }} />
          </div>
        </div>
        <h2 className="text-3xl md:text-[34px] font-black text-white tracking-tight mb-3 text-center">
          Revisa tu correo
        </h2>
        <p className="text-white/65 text-[15px] mb-7 text-center leading-relaxed">
          {emailSent ? (
            <>
              Te hemos enviado un enlace de verificación a{" "}
              <span className="text-white font-semibold">{pendingEmail}</span>.
              Revisa tu bandeja de entrada (y spam).
            </>
          ) : (
            <>
              No se pudo enviar el email a{" "}
              <span className="text-white font-semibold">{pendingEmail}</span>.
              Pulsa el botón para reenviar.
            </>
          )}
        </p>

        {resendMessage && (
          <p className="text-sm text-white/60 mb-5 text-center">{resendMessage}</p>
        )}

        <button
          onClick={handleResend}
          disabled={resendLoading}
          className="btn-primary w-full inline-flex items-center justify-center gap-2 text-[15px] font-bold text-white py-4 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed mb-5"
          style={{ boxShadow: "0 8px 30px -8px rgba(139,92,246,0.6)" }}
        >
          <span className="relative z-10 inline-flex items-center gap-2">
            {resendLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Reenviando…
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                Reenviar verificación
              </>
            )}
          </span>
        </button>

        <p className="text-center text-sm text-white/55">
          ¿Ya verificaste?{" "}
          <Link
            href="/login"
            className="font-bold text-violet-300 hover:text-violet-200 transition-colors"
          >
            Iniciar sesión
          </Link>
        </p>
      </AuthShell>
    );
  }

  // ── Registration form ──
  return (
    <AuthShell
      heading={
        <>
          Empieza a <span className="gradient-text">construir</span> hoy
        </>
      }
      subheading="Crea tu cuenta gratis y genera tu primer prototipo en segundos."
    >
      <h2 className="text-3xl md:text-[34px] font-black text-white tracking-tight mb-2">
        Crear cuenta
      </h2>
      <p className="text-white/55 text-[15px] mb-7">
        Sin tarjeta. Sin compromiso.
      </p>

      <GoogleSignInButton onError={handleGoogleError} />

      <div className="relative flex items-center gap-3 my-6">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-[11px] uppercase tracking-widest text-white/35 font-semibold">
          o con email
        </span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 px-4 py-2.5 rounded-xl">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label
            htmlFor="fullName"
            className="text-[13px] font-bold text-white/85 uppercase tracking-wider"
          >
            Nombre completo
          </label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Tu nombre"
              required
              autoFocus
              className="w-full rounded-xl bg-white/[0.04] border border-white/10 pl-11 pr-4 py-3.5 text-[15px] text-white placeholder:text-white/30 outline-none focus:border-violet-500/70 focus:ring-2 focus:ring-violet-500/30 focus:bg-white/[0.06] transition-all"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="email"
            className="text-[13px] font-bold text-white/85 uppercase tracking-wider"
          >
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              className="w-full rounded-xl bg-white/[0.04] border border-white/10 pl-11 pr-4 py-3.5 text-[15px] text-white placeholder:text-white/30 outline-none focus:border-violet-500/70 focus:ring-2 focus:ring-violet-500/30 focus:bg-white/[0.06] transition-all"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="text-[13px] font-bold text-white/85 uppercase tracking-wider"
          >
            Contraseña
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
              className="w-full rounded-xl bg-white/[0.04] border border-white/10 pl-11 pr-11 py-3.5 text-[15px] text-white placeholder:text-white/30 outline-none focus:border-violet-500/70 focus:ring-2 focus:ring-violet-500/30 focus:bg-white/[0.06] transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="passwordConfirm"
            className="text-[13px] font-bold text-white/85 uppercase tracking-wider"
          >
            Confirmar contraseña
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />
            <input
              id="passwordConfirm"
              type={showPassword ? "text" : "password"}
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="Repite la contraseña"
              required
              className="w-full rounded-xl bg-white/[0.04] border border-white/10 pl-11 pr-4 py-3.5 text-[15px] text-white placeholder:text-white/30 outline-none focus:border-violet-500/70 focus:ring-2 focus:ring-violet-500/30 focus:bg-white/[0.06] transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={
            isLoading || !email || !password || !fullName || !passwordConfirm
          }
          className="btn-primary group w-full inline-flex items-center justify-center gap-2 text-[15px] font-bold text-white py-4 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed mt-2"
          style={{ boxShadow: "0 8px 30px -8px rgba(139,92,246,0.6)" }}
        >
          <span className="relative z-10 inline-flex items-center gap-2">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creando cuenta…
              </>
            ) : (
              <>
                Crear cuenta gratis
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </span>
        </button>

        <p className="text-[11px] text-white/40 text-center pt-1">
          Al continuar aceptas nuestros{" "}
          <Link href="/terminos" className="text-white/60 hover:text-white underline">
            Términos
          </Link>{" "}
          y la{" "}
          <Link href="/privacidad" className="text-white/60 hover:text-white underline">
            Política de privacidad
          </Link>
          .
        </p>
      </form>

      <p className="text-center text-sm text-white/55 mt-7">
        ¿Ya tienes cuenta?{" "}
        <Link
          href="/login"
          className="font-bold text-violet-300 hover:text-violet-200 transition-colors"
        >
          Iniciar sesión
        </Link>
      </p>
    </AuthShell>
  );
}
