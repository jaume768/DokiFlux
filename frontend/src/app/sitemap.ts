import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: Array<{
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  }> = [
    { path: "/", changeFrequency: "weekly", priority: 1.0 },
    { path: "/demo", changeFrequency: "weekly", priority: 0.9 },
    { path: "/privacidad", changeFrequency: "yearly", priority: 0.3 },
    { path: "/terminos", changeFrequency: "yearly", priority: 0.3 },
    { path: "/cookies", changeFrequency: "yearly", priority: 0.3 },
    { path: "/rgpd", changeFrequency: "yearly", priority: 0.3 },
  ];

  return routes.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
