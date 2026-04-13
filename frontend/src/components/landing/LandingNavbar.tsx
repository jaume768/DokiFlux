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
            <Image src="/logo.png" alt="DokiFlux" width={160} height={40} className="h-8 w-auto" />
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
                <Link
                  href="/register"
                  className="btn-primary relative inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-semibold text-white"
                >
                  <span className="relative z-10">Empieza gratis</span>
                </Link>
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

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="md:hidden px-5 pb-5 pt-2"
          style={{
            background: "rgba(10,10,15,0.95)",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/[0.05] hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2">
            {isAuthenticated ? (
              <Link
                href="/app"
                className="btn-primary relative flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold text-white"
              >
                <span className="relative z-10">Ir a la app</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="btn-secondary flex items-center justify-center rounded-xl px-5 py-3 text-sm font-medium text-white/70"
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/register"
                  className="btn-primary relative flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold text-white"
                >
                  <span className="relative z-10">Empieza gratis</span>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
