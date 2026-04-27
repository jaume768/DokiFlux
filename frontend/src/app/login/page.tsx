"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import { Loader2, Eye, EyeOff, Mail, Lock, ArrowRight } from "lucide-react";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { AuthShell } from "@/components/auth/AuthShell";

export default function LoginPage() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function handleGoogleError(msg: string) {
    setError(msg);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login({ identifier, password });
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as Record<string, unknown>;
        if (data.detail) setError(String(data.detail));
        else if (data.non_field_errors)
          setError(String((data.non_field_errors as string[])[0]));
        else setError("Credenciales incorrectas.");
      } else {
        setError("Error de conexión. Inténtalo de nuevo.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthShell
      heading={
        <>
          Bienvenido <span className="gradient-text">de vuelta</span>
        </>
      }
      subheading="Accede a tu cuenta y sigue creando producto real."
    >
      <h2 className="text-3xl md:text-[34px] font-black text-white tracking-tight mb-2">
        Iniciar sesión
      </h2>
      <p className="text-white/55 text-[15px] mb-7">
        Bienvenido de vuelta. Continúa donde lo dejaste.
      </p>

      <GoogleSignInButton onError={handleGoogleError} />

      <div className="relative flex items-center gap-3 my-6">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-[11px] uppercase tracking-widest text-white/35 font-semibold">
          o con email
        </span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 px-4 py-2.5 rounded-xl">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label
            htmlFor="identifier"
            className="text-[13px] font-bold text-white/85 uppercase tracking-wider"
          >
            Email o usuario
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="tu@email.com"
              required
              autoFocus
              className="w-full rounded-xl bg-white/[0.04] border border-white/10 pl-11 pr-4 py-3.5 text-[15px] text-white placeholder:text-white/30 outline-none focus:border-violet-500/70 focus:ring-2 focus:ring-violet-500/30 focus:bg-white/[0.06] transition-all"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-[13px] font-bold text-white/85 uppercase tracking-wider"
            >
              Contraseña
            </label>
            <Link
              href="/password-reset"
              className="text-xs font-semibold text-violet-300 hover:text-violet-200 transition-colors"
            >
              ¿La olvidaste?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tu contraseña"
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

        <button
          type="submit"
          disabled={isLoading || !identifier || !password}
          className="btn-primary group w-full inline-flex items-center justify-center gap-2 text-[15px] font-bold text-white py-4 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed mt-2"
          style={{ boxShadow: "0 8px 30px -8px rgba(139,92,246,0.6)" }}
        >
          <span className="relative z-10 inline-flex items-center gap-2">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Entrando…
              </>
            ) : (
              <>
                Entrar
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </span>
        </button>
      </form>

      <p className="text-center text-sm text-white/55 mt-7">
        ¿No tienes cuenta?{" "}
        <Link
          href="/register"
          className="font-bold text-violet-300 hover:text-violet-200 transition-colors"
        >
          Crear cuenta gratis
        </Link>
      </p>
    </AuthShell>
  );
}
