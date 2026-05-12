import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Política de cookies",
  description: "Información sobre el uso de cookies en DokiFlux.",
  path: "/cookies",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
