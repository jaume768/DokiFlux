import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Iniciar sesión",
  description: "Accede a tu cuenta de DokiFlux.",
  path: "/login",
  noindex: true,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
