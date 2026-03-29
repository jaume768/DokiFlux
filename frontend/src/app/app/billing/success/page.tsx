"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Crown, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { apiPost } from "@/lib/api";

function SuccessContent() {
  const { refreshBalance } = useAuth();
  const searchParams = useSearchParams();
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    async function verify() {
      if (sessionId) {
        try {
          await apiPost("/billing/verify-session/", { session_id: sessionId });
        } catch {
          // ignore — webhook may have already handled it
        }
      }
      await refreshBalance();
      setVerifying(false);
    }
    verify();
  }, [searchParams, refreshBalance]);

  if (verifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Activando tu plan Premium...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="mx-auto max-w-sm text-center">
        <div className="mb-6 flex justify-center">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10">
            <Crown className="h-10 w-10 text-amber-500" />
            <CheckCircle2 className="absolute -bottom-1 -right-1 h-7 w-7 text-green-500 bg-background rounded-full" />
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">¡Ya eres Premium!</h1>
        <p className="mt-3 text-muted-foreground">
          Tu suscripción está activa. Se han añadido $20 en créditos a tu
          cuenta. Disfruta de todas las funciones sin límites.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild className="bg-amber-500 hover:bg-amber-600 text-white">
            <Link href="/app">Ir al dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/app/billing">Ver facturación</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
