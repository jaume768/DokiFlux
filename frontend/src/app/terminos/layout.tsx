import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Términos y condiciones",
  description: "Términos y condiciones de uso del servicio DokiFlux.",
  path: "/terminos",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
