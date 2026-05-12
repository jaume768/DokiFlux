import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Recuperar contraseña",
  path: "/password-reset",
  noindex: true,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
