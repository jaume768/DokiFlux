import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DokiFlux",
    short_name: "DokiFlux",
    description:
      "Generador de UI con IA: convierte tus ideas en prototipos React funcionales en segundos.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0f",
    theme_color: "#0a0a0f",
    lang: "es-ES",
    icons: [
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
      { src: "/logo-texto-negro.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
