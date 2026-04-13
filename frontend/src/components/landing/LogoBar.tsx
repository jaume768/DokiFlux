"use client";

import { useEffect, useRef, useState } from "react";

const LOGOS = [
  { name: "TechCorp", icon: "⚡" },
  { name: "DataFlow", icon: "📊" },
  { name: "CloudSync", icon: "☁️" },
  { name: "DevStack", icon: "🔧" },
  { name: "AppForge", icon: "🛠️" },
  { name: "NexaLabs", icon: "🧪" },
  { name: "PixelUI", icon: "🎨" },
  { name: "CodeBase", icon: "💻" },
];

export function LogoBar() {
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const doubled = [...LOGOS, ...LOGOS];

  return (
    <section
      ref={sectionRef}
      className="relative py-12 overflow-hidden"
      style={{
        borderTop: "1px solid rgba(255,255,255,0.04)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.6s ease",
      }}
    >
      <div className="text-center mb-8">
        <p className="text-white/25 text-xs font-medium uppercase tracking-widest">
          Equipos que ya prototipan con DokiFlux
        </p>
      </div>

      <div className="relative">
        {/* Left fade */}
        <div
          className="absolute left-0 top-0 bottom-0 w-32 z-10 pointer-events-none"
          style={{ background: "linear-gradient(to right, #0a0a0f, transparent)" }}
        />
        {/* Right fade */}
        <div
          className="absolute right-0 top-0 bottom-0 w-32 z-10 pointer-events-none"
          style={{ background: "linear-gradient(to left, #0a0a0f, transparent)" }}
        />

        <div className="flex animate-scroll-logos">
          {doubled.map((logo, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 px-8 shrink-0"
            >
              <span className="text-lg">{logo.icon}</span>
              <span className="text-white/20 text-sm font-semibold whitespace-nowrap">
                {logo.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
