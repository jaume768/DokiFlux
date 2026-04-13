"use client";

import {
  LandingNavbar,
  Hero,
  LogoBar,
  HowItWorks,
  Comparison,
  Testimonials,
  TemplatesShowcase,
  DualPersona,
  FAQSection,
  FinalCTA,
  Footer,
} from "@/components/landing";

export default function LandingPage() {
  return (
    <div
      className="landing bg-[#0a0a0f] text-white min-h-screen antialiased"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <LandingNavbar />
      <main>
        <Hero />
        <LogoBar />
        <HowItWorks />
        <Comparison />
        <Testimonials />
        <TemplatesShowcase />
        <DualPersona />
        <FAQSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
