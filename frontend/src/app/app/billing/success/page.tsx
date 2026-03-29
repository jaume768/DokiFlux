"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Crown, CheckCircle2, Loader2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { apiPost } from "@/lib/api";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function SuccessContent() {
  const { refreshBalance } = useAuth();
  const searchParams = useSearchParams();
  const [verifying, setVerifying] = useState(true);
  const [upgraded, setUpgraded] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const sessionId = searchParams.get("session_id");

    async function verifyWithRetry(): Promise<boolean> {
      if (!sessionId) return false;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const res = await apiPost<{ upgraded: boolean; reason?: string; plan_type?: string }>(
            "/billing/verify-session/",
            { session_id: sessionId }
          );
          if (res.upgraded || res.plan_type === "premium") return true;
          if (res.reason === "already premium") return true;
          if (res.reason === "payment not completed" && attempt < MAX_RETRIES) {
            await delay(RETRY_DELAY_MS);
            continue;
          }
          return false;
        } catch {
          if (attempt < MAX_RETRIES) {
            await delay(RETRY_DELAY_MS);
            continue;
          }
          return false;
        }
      }
      return false;
    }

    async function run() {
      const success = await verifyWithRetry();
      await refreshBalance();
      setUpgraded(success);
      if (!success) {
        setErrorMsg("No se pudo confirmar la activación. Si el pago se realizó, tu plan se actualizará en breve.");
      }
      setVerifying(false);
    }

    run();
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

  if (!upgraded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="mx-auto max-w-sm text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10">
              <Crown className="h-10 w-10 text-amber-500" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Pago recibido</h1>
          <p className="mt-3 text-muted-foreground">{errorMsg}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/app/billing" className={buttonVariants({ className: "bg-amber-500 hover:bg-amber-600 text-white" })}>
              Ver facturación
            </Link>
            <Link href="/app" className={buttonVariants({ variant: "outline" })}>
              Ir al dashboard
            </Link>
          </div>
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
          <Link href="/app" className={buttonVariants({ className: "bg-amber-500 hover:bg-amber-600 text-white" })}>
            Ir al dashboard
          </Link>
          <Link href="/app/billing" className={buttonVariants({ variant: "outline" })}>
            Ver facturación
          </Link>
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
