"use client";

import {
  LandingNavbar,
  Hero,
  HowItWorks,
  ComparisonV2,
  Testimonials,
  TemplatesShowcase,
  DualPersona,
  FinalCTA,
  Footer,
  DemoChatInput,
} from "@/components/landing";

export default function LandingPage() {
  return (
    <div
      className="landing bg-[#0a0a0f] text-white min-h-screen antialiased overflow-x-hidden"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <LandingNavbar />
      <main>
        <Hero />
        <DemoChatInput />
        <HowItWorks />
        <DualPersona />
        <ComparisonV2 />
        <TemplatesShowcase />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
