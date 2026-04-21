"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const NAV_LINKS = [
  { label: "Cómo funciona", href: "#como-funciona" },
  { label: "Templates", href: "#templates" },
  { label: "Producción", href: "#produccion" },
];

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll while the mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileOpen]);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? "rgba(10,10,15,0.85)" : "transparent",
        borderBottom: scrolled
          ? "1px solid rgba(255,255,255,0.06)"
          : "1px solid transparent",
      }}
    >
      <div className={`navbar-blur ${scrolled ? "" : "backdrop-blur-none"}`}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <Image src="/logo-texto-blanco.png" alt="DokiFlux" width={160} height={40} className="h-8 w-auto hidden dark:block" />
            <Image src="/logo-texto-negro.png" alt="DokiFlux" width={160} height={40} className="h-8 w-auto block dark:hidden" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3.5 py-2 text-[13px] font-medium text-white/70 rounded-lg transition-all duration-200 hover:text-white hover:bg-white/[0.05]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden items-center gap-3 md:flex">
            {isAuthenticated ? (
              <Link
                href="/app"
                className="btn-primary relative inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-semibold text-white"
              >
                <span className="relative z-10">Ir a la app</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-[13px] font-medium text-white/70 transition-colors duration-200 hover:text-white"
                >
                  Iniciar sesión
                </Link>
                {/* Hard <a> — /demo needs full page load to get COOP/COEP headers */}
                <a
                  href="/demo"
                  className="btn-primary relative inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-semibold text-white"
                >
                  <span className="relative z-10">Empieza gratis</span>
                </a>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="flex items-center justify-center w-9 h-9 rounded-lg md:hidden transition-colors duration-200"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? (
              <X size={18} className="text-white/70" />
            ) : (
              <Menu size={18} className="text-white/70" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer — lateral sidebar */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 md:hidden transition-opacity duration-300 ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
        onClick={() => setMobileOpen(false)}
        aria-hidden={!mobileOpen}
      />

      {/* Drawer panel */}
      <aside
        className={`fixed top-0 right-0 bottom-0 z-50 w-[85%] max-w-[320px] md:hidden flex flex-col transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{
          background: "#0a0a0f",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
        }}
        aria-hidden={!mobileOpen}
      >
        <div
          className="flex items-center justify-between px-5 h-16 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center">
            <Image
              src="/logo-texto-blanco.png"
              alt="DokiFlux"
              width={140}
              height={35}
              className="h-7 w-auto"
            />
          </Link>
          <button
            className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors duration-200"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú"
          >
            <X size={18} className="text-white/70" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 px-4 py-5 flex-1 overflow-y-auto">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-3 py-3 text-[15px] font-medium text-white/80 transition-colors hover:bg-white/[0.05] hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div
          className="flex flex-col gap-2 px-4 py-4 shrink-0"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          {isAuthenticated ? (
            <Link
              href="/app"
              onClick={() => setMobileOpen(false)}
              className="btn-primary relative flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold text-white"
            >
              <span className="relative z-10">Ir a la app</span>
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="btn-secondary flex items-center justify-center rounded-xl px-5 py-3 text-sm font-medium text-white/80"
              >
                Iniciar sesión
              </Link>
              <a
                href="/demo"
                onClick={() => setMobileOpen(false)}
                className="btn-primary relative flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold text-white"
              >
                <span className="relative z-10">Empieza gratis</span>
              </a>
            </>
          )}
        </div>
      </aside>
    </header>
  );
}
