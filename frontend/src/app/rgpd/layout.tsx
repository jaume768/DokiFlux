import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "RGPD — Tus derechos",
  description:
    "Información sobre el cumplimiento del Reglamento General de Protección de Datos (RGPD) en DokiFlux.",
  path: "/rgpd",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
