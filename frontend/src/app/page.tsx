import type { Metadata } from "next";
import LandingClient from "@/components/landing/LandingClient";
import {
  JsonLd,
  organizationSchema,
  websiteSchema,
  softwareApplicationSchema,
} from "@/components/seo/JsonLd";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "DokiFlux — De prompt a prototipo React en segundos",
  path: "/",
});

export default function LandingPage() {
  return (
    <>
      <JsonLd data={organizationSchema} />
      <JsonLd data={websiteSchema} />
      <JsonLd data={softwareApplicationSchema} />
      <LandingClient />
    </>
  );
}
