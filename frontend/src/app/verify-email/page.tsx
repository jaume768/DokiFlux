"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
              {status === "verifying" && (
                <div className="rounded-full bg-muted p-3">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              )}
              {status === "success" && (
                <div className="rounded-full bg-green-500/10 p-3">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
              )}
              {status === "error" && (
                <div className="rounded-full bg-destructive/10 p-3">
                  <XCircle className="w-6 h-6 text-destructive" />
                </div>
              )}
            </div>

            <CardTitle className="text-center">
              {status === "verifying" && "Verificando..."}
              {status === "success" && "¡Email verificado!"}
              {status === "error" && "Error de verificación"}
            </CardTitle>

            <CardDescription className="text-center">
              {status === "verifying" && "Estamos verificando tu cuenta, un momento."}
              {status === "success" && "Tu cuenta ha sido verificada correctamente. Ya puedes iniciar sesión."}
              {status === "error" && errorMsg}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {status === "success" && (
              <Button className="w-full" onClick={() => router.push("/login")}>
                Ir al inicio de sesión
              </Button>
            )}
            {status === "error" && (
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push("/register")}
                >
                  Volver al registro
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  ¿Ya tienes cuenta?{" "}
                  <Link href="/login" className="text-primary hover:underline font-medium">
                    Iniciar sesión
                  </Link>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
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
