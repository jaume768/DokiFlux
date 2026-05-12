import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Política de privacidad",
  description:
    "Conoce cómo DokiFlux recopila, usa y protege tus datos personales conforme al RGPD.",
  path: "/privacidad",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
