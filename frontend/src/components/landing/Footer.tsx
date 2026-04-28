"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Twitter, Instagram, Linkedin, ArrowUpRight, Calendar } from "lucide-react";
import { ContactModal } from "@/components/ContactModal";

const FOOTER_LINKS = {
  Producto: [
    { label: "Cómo funciona", href: "#como-funciona" },
    { label: "Templates", href: "#templates" },
    { label: "Changelog", href: "#" },
  ],
  Empresa: [
    { label: "Sobre nosotros", href: "#" },
    { label: "Contacto", href: "mailto:hola@dokiflux.app" },
  ],
  Legal: [
    { label: "Privacidad", href: "/privacidad" },
    { label: "Términos de uso", href: "/terminos" },
    { label: "Cookies", href: "/cookies" },
    { label: "RGPD", href: "/rgpd" },
  ],
};

const SOCIAL_LINKS = [
  { label: "Twitter / X", href: "#", icon: Twitter, color: "#1d9bf0" },
  { label: "Instagram", href: "https://instagram.com/dokiflux", icon: Instagram, color: "#e1306c" },
  { label: "LinkedIn", href: "#", icon: Linkedin, color: "#0a66c2" },
];

export function Footer() {
  const currentYear = new Date().getFullYear();
  const [consultOpen, setConsultOpen] = useState(false);

  return (
    <footer className="relative border-t border-white/[0.06] overflow-hidden">
      {/* Top fade line */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: "linear-gradient(to right, transparent, rgba(139,92,246,0.25), transparent)" }}
      />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Background glow */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] rounded-full blur-[140px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(99,102,241,0.07) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-5 md:px-8">
        {/* Main footer grid */}
        <div className="py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12 lg:gap-8">
          {/* Brand column */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Link href="/" className="flex items-center gap-2 group w-fit">
              <Image src="/logo-texto-blanco.png" alt="DokiFlux" width={160} height={40} className="h-8 w-auto hidden dark:block" />
              <Image src="/logo-texto-negro.png" alt="DokiFlux" width={160} height={40} className="h-8 w-auto block dark:hidden" />
            </Link>

            <p className="text-white/60 text-sm leading-relaxed max-w-[220px]">
              De idea a producción.<br />
              Prototipa con IA, lanza con nosotros.
            </p>

            {/* Social icons */}
            <div className="flex items-center gap-2">
              {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 hover:-translate-y-0.5"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <Icon size={15} className="text-white/60 hover:text-white transition-colors duration-300" />
                </a>
              ))}
            </div>

            {/* Consultation CTA */}
            <button
              type="button"
              onClick={() => setConsultOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg w-fit text-[13px] font-semibold text-white transition-all hover:shadow-[0_0_14px_rgba(139,92,246,0.35)]"
              style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}
            >
              <Calendar size={13} />
              Agendar consultoría
            </button>

            {/* Status badge */}
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full w-fit"
              style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.18)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400/80 text-[11px] font-semibold tracking-wide">
                Todos los sistemas operativos
              </span>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category} className="flex flex-col gap-5 lg:col-span-1">
              <h4 className="text-white/90 text-[13px] font-bold uppercase tracking-widest">{category}</h4>
              <ul className="flex flex-col gap-3">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="group/link flex items-center gap-2 text-white/60 hover:text-white text-[14px] transition-colors duration-200 w-fit"
                    >
                      <span className="group-hover/link:translate-x-0.5 transition-transform duration-200">
                        {label}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Follow + Newsletter column */}
          <div className="flex flex-col gap-5 lg:col-span-1">
            <h4 className="text-white/90 text-[13px] font-bold uppercase tracking-widest">Síguenos</h4>
            <ul className="flex flex-col gap-3">
              {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    className="flex items-center gap-2.5 text-white/60 hover:text-white text-[14px] transition-all duration-200 group/slink w-fit"
                  >
                    <span
                      className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}
                    >
                      <Icon size={11} className="text-white/60" />
                    </span>
                    <span className="group-hover/slink:translate-x-0.5 transition-transform duration-200">
                      {label}
                    </span>
                    <ArrowUpRight size={11} className="opacity-0 group-hover/slink:opacity-50 transition-opacity duration-200 -ml-1" />
                  </a>
                </li>
              ))}
            </ul>

          </div>
        </div>

        {/* Divider */}
        <div
          className="h-px w-full"
          style={{ background: "linear-gradient(to right, transparent, rgba(255,255,255,0.07) 20%, rgba(255,255,255,0.07) 80%, transparent)" }}
        />

        {/* Bottom bar */}
        <div className="py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/25 text-[13px] text-center sm:text-left leading-relaxed">
            © {currentYear} DokiFlux
          </p>

          <div className="flex items-center gap-5 flex-wrap justify-center">
            {[
              { label: "Privacidad", href: "/privacidad" },
              { label: "Términos", href: "/terminos" },
              { label: "Cookies", href: "/cookies" },
            ].map(({ label, href }) => (
              <Link key={label} href={href} className="text-white/22 hover:text-white/55 text-[12px] transition-colors duration-200">
                {label}
              </Link>
            ))}
            <span
              className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.28)" }}
            >
              🇪🇸 Español
            </span>
          </div>
        </div>
      </div>
      <ContactModal
        open={consultOpen}
        onClose={() => setConsultOpen(false)}
        user={null}
        title="Agenda una consultoría"
        subtitle="Cuéntanos tu caso y te contactamos en menos de 24h. Sin compromiso."
        source="footer"
      />
    </footer>
  );
}
