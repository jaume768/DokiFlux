import Link from "next/link";
import { Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-lg font-bold">DokiFlux</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Genera interfaces completas con IA. De prompt a proyecto en
              segundos.
            </p>
          </div>

          {/* Product */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Producto</h4>
            <nav className="flex flex-col gap-2">
              <Link
                href="/#features"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Características
              </Link>
              <Link
                href="/#templates"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Templates
              </Link>
              <Link
                href="/pricing"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Pricing
              </Link>
            </nav>
          </div>

          {/* Account */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Cuenta</h4>
            <nav className="flex flex-col gap-2">
              <Link
                href="/login"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/register"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Crear cuenta
              </Link>
            </nav>
          </div>

          {/* Tech */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Tecnología</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <span>React + Tailwind CSS</span>
              <span>WebContainers</span>
              <span>Streaming en tiempo real</span>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} DokiFlux. Todos los derechos
            reservados.
          </p>
          <p className="text-xs text-muted-foreground">
            Built with React, Tailwind CSS & WebContainers
          </p>
        </div>
      </div>
    </footer>
  );
}
