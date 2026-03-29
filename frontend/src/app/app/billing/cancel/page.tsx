"use client";

import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function BillingCancelPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="mx-auto max-w-sm text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <XCircle className="h-10 w-10 text-muted-foreground" />
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          Proceso cancelado
        </h1>
        <p className="mt-3 text-muted-foreground">
          No se ha realizado ningún cargo. Puedes actualizar a Premium cuando quieras.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/app/billing">Ver planes</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/app">Ir al dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
