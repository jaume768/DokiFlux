import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Crear cuenta",
  description: "Regístrate gratis en DokiFlux y empieza a generar interfaces con IA.",
  path: "/register",
  noindex: true,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
