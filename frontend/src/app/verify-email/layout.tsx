import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Verificar email",
  path: "/verify-email",
  noindex: true,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
