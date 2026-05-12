import type { Metadata } from "next";

// Hardcoded canonical production URL. Override only via NEXT_PUBLIC_SITE_URL
// when running in a different environment (e.g. preview deploys).
const FALLBACK_SITE_URL = "https://dokiflux.com";
const RAW_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim();
export const SITE_URL = (RAW_SITE_URL && RAW_SITE_URL.length > 0
  ? RAW_SITE_URL
  : FALLBACK_SITE_URL
).replace(/\/$/, "");

export const SITE_NAME = "DokiFlux";

export const DEFAULT_TITLE = "DokiFlux — De prompt a prototipo React en segundos";
export const DEFAULT_DESCRIPTION =
  "DokiFlux es un generador de UI con IA: convierte tus ideas en prototipos React funcionales en segundos. Valida productos, itera más rápido y pasa a producción.";

export const DEFAULT_KEYWORDS = [
  "DokiFlux",
  "generador de UI con IA",
  "AI UI generator",
  "prototipo React",
  "v0.dev alternativa",
  "diseño web con IA",
  "generador de landing",
  "AI low-code",
  "prompt to UI",
  "Next.js IA",
];

export const OG_IMAGE = {
  url: `${SITE_URL}/opengraph-image`,
  width: 1200,
  height: 630,
  alt: "DokiFlux — Genera interfaces con IA",
} as const;

type BuildMetadataInput = {
  title?: string;
  description?: string;
  path?: string;
  noindex?: boolean;
  images?: Metadata["openGraph"] extends { images?: infer I } ? I : never;
  keywords?: string[];
};

export function buildMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path = "/",
  noindex = false,
  keywords,
}: BuildMetadataInput = {}): Metadata {
  const fullTitle = title ?? DEFAULT_TITLE;
  const url = `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  return {
    title: fullTitle,
    description,
    keywords: keywords ?? DEFAULT_KEYWORDS,
    alternates: { canonical: url },
    robots: noindex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
    openGraph: {
      type: "website",
      locale: "es_ES",
      url,
      siteName: SITE_NAME,
      title: fullTitle,
      description,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [OG_IMAGE.url],
    },
  };
}
