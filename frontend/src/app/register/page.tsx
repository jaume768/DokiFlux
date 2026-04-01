"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ApiError, apiPost } from "@/lib/api";
import { Sparkles, Loader2, Eye, EyeOff, Mail, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
        setEmailSent((res as Record<string, unknown>).email_sent !== false);
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
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-center gap-2 mb-8">
            <Sparkles className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Dokiflux</h1>
          </div>

          <Card>
            <CardHeader>
              <div className="flex justify-center mb-2">
                <div className="rounded-full bg-primary/10 p-3">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
              </div>
              <CardTitle className="text-center">Verifica tu email</CardTitle>
              <CardDescription className="text-center">
                {emailSent
                  ? <>Hemos enviado un enlace de verificación a <strong>{pendingEmail}</strong>. Revisa tu bandeja de entrada (y spam).</>
                  : <>No se pudo enviar el email de verificación a <strong>{pendingEmail}</strong>. Pulsa el botón para reenviar.</>
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {resendMessage && (
                <p className="text-sm text-center text-muted-foreground">{resendMessage}</p>
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={handleResend}
                disabled={resendLoading}
              >
                {resendLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Reenviando...</>
                ) : (
                  <><RotateCcw className="w-4 h-4" />Reenviar email de verificación</>
                )}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                ¿Ya verificaste?{" "}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Iniciar sesión
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // --- Registration form ---
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Sparkles className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Dokiflux</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Crear cuenta</CardTitle>
            <CardDescription>Empieza a generar UI con IA</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <GoogleSignInButton onError={handleGoogleError} />

              <div className="relative flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">o</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="fullName" className="text-sm font-medium">
                  Nombre completo
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Tu nombre"
                  required
                  autoFocus
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    required
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 pr-10 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="passwordConfirm" className="text-sm font-medium">
                  Confirmar contraseña
                </label>
                <input
                  id="passwordConfirm"
                  type={showPassword ? "text" : "password"}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="Repite la contraseña"
                  required
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading || !email || !password || !fullName || !passwordConfirm}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creando cuenta...
                  </>
                ) : (
                  "Crear cuenta"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-4">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
