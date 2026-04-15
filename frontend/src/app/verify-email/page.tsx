"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiPost, ApiError } from "@/lib/api";

type Status = "verifying" | "success" | "error";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<Status>("verifying");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMsg("Token de verificación no encontrado en la URL.");
      return;
    }

    apiPost("/auth/verify-email/", { token }, { auth: false })
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error");
        if (err instanceof ApiError) {
          const data = err.data as Record<string, unknown>;
          setErrorMsg(String(data.error ?? data.detail ?? "Token inválido o expirado."));
        } else {
          setErrorMsg("Error de conexión. Inténtalo de nuevo.");
        }
      });
  }, [token]);

  const iconColor = status === "success" ? "#34d399" : status === "error" ? "#f87171" : "rgba(255,255,255,0.4)";
  const glowColor = status === "success" ? "rgba(52,211,153,0.15)" : status === "error" ? "rgba(248,113,113,0.12)" : "rgba(139,92,246,0.15)";

  return (
    <div className="landing bg-[#0a0a0f] text-white min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 grid-pattern pointer-events-none" style={{ opacity: 0.35 }} />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] pointer-events-none" style={{ background: `radial-gradient(ellipse, ${glowColor} 0%, transparent 70%)` }} />

      <div className="relative z-10 w-full max-w-sm">
        <div className="flex items-center justify-center mb-8">
          <Image src="/logo-texto-blanco.png" alt="DokiFlux" width={220} height={55} className="h-11 w-auto" />
        </div>

        <div className="rounded-2xl p-7 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(20px)" }}>
          <div className="flex justify-center mb-4">
            <div className="rounded-2xl p-4" style={{ background: `${iconColor}18`, border: `1px solid ${iconColor}35` }}>
              {status === "verifying" && <Loader2 className="w-7 h-7 animate-spin" style={{ color: iconColor }} />}
              {status === "success" && <CheckCircle className="w-7 h-7" style={{ color: iconColor }} />}
              {status === "error" && <XCircle className="w-7 h-7" style={{ color: iconColor }} />}
            </div>
          </div>

          <h1 className="text-xl font-bold text-white mb-2">
            {status === "verifying" && "Verificando..."}
            {status === "success" && "¡Email verificado!"}
            {status === "error" && "Error de verificación"}
          </h1>
          <p className="text-white/50 text-sm mb-6">
            {status === "verifying" && "Estamos verificando tu cuenta, un momento."}
            {status === "success" && "Tu cuenta ha sido verificada correctamente. Ya puedes iniciar sesión."}
            {status === "error" && errorMsg}
          </p>

          {status === "success" && (
            <Button className="btn-primary w-full rounded-xl py-2.5 font-semibold" size="lg" onClick={() => router.push("/login")}>
              Ir al inicio de sesión
            </Button>
          )}
          {status === "error" && (
            <div className="space-y-3">
              <Button className="btn-primary w-full rounded-xl py-2.5 font-semibold" size="lg" onClick={() => router.push("/register")}>
                Volver al registro
              </Button>
              <p className="text-sm text-white/40">
                ¿Ya tienes cuenta?{" "}
                <Link href="/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">Iniciar sesión</Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
