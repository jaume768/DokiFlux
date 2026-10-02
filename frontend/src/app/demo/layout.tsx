import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Demo gratis — Prueba DokiFlux sin registro",
  description:
    "Prueba DokiFlux gratis sin registro: describe tu interfaz y obtén un prototipo React funcional en segundos.",
  path: "/demo",
});

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
