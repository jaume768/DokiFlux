"use client";

import Link from "next/link";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { Footer } from "@/components/landing/Footer";
import { ArrowLeft } from "lucide-react";

export default function CookiesPage() {
  return (
    <div className="bg-[#0a0a0f] text-white min-h-screen antialiased" style={{ fontFamily: "'Inter', sans-serif" }}>
      <LandingNavbar />

      <main className="max-w-3xl mx-auto px-5 md:px-8 py-24">
        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-white/40 hover:text-white/80 text-sm transition-colors duration-200 mb-10 group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform duration-200" />
          Volver al inicio
        </Link>

        {/* Header */}
        <div className="mb-12">
          <span className="inline-block text-xs font-bold tracking-widest uppercase text-violet-400 mb-4">Legal</span>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Política de Cookies</h1>
          <p className="text-white/40 text-sm">Última actualización: <strong className="text-white/60">24 de abril de 2026</strong></p>
        </div>

        <div className="prose-legal">
          <Section title="1. ¿Qué son las cookies?">
            <p>
              Las cookies son pequeños archivos de texto que se almacenan en su dispositivo cuando visita un sitio web. Se utilizan
              ampliamente para que los sitios web funcionen correctamente, sean más eficientes y proporcionen información a los
              propietarios del sitio.
            </p>
          </Section>

          <Section title="2. ¿Qué cookies utilizamos?">
            <table>
              <thead>
                <tr>
                  <th>Cookie</th>
                  <th>Tipo</th>
                  <th>Duración</th>
                  <th>Finalidad</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>access_token</code></td>
                  <td>Técnica / Sesión</td>
                  <td>15 min</td>
                  <td>Token de autenticación JWT para mantener la sesión activa.</td>
                </tr>
                <tr>
                  <td><code>refresh_token</code></td>
                  <td>Técnica / Persistente</td>
                  <td>7 días</td>
                  <td>Permite renovar el access token sin que el usuario tenga que volver a iniciar sesión.</td>
                </tr>
                <tr>
                  <td><code>demo_session</code></td>
                  <td>Técnica / Sesión</td>
                  <td>Sesión</td>
                  <td>Identifica la sesión demo para usuarios no registrados.</td>
                </tr>
                <tr>
                  <td><code>_stripe_*</code></td>
                  <td>Terceros / Analítica</td>
                  <td>Variable</td>
                  <td>Cookies de Stripe para prevención de fraude en pagos.</td>
                </tr>
                <tr>
                  <td><code>_ga, _gid</code></td>
                  <td>Analítica (si se activa)</td>
                  <td>2 años / 24h</td>
                  <td>Google Analytics: analiza el uso anónimo del sitio web.</td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section title="3. Tipos de cookies por categoría">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-white/80 mb-1">Cookies estrictamente necesarias</h3>
                <p>
                  Son imprescindibles para el funcionamiento del Servicio. Sin ellas, no podemos garantizar funcionalidades como
                  la autenticación o la seguridad. No requieren su consentimiento (Art. 22.2 LSSI).
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-white/80 mb-1">Cookies analíticas</h3>
                <p>
                  Nos ayudan a entender cómo interactúan los usuarios con el Servicio, recopilando información de forma anónima
                  y agregada. Solo se activan con su consentimiento.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-white/80 mb-1">Cookies de terceros</h3>
                <p>
                  Algunos de nuestros socios (Stripe, Google) pueden instalar sus propias cookies. Consulte sus respectivas
                  políticas de privacidad para más información.
                </p>
              </div>
            </div>
          </Section>

          <Section title="4. Cómo gestionar o eliminar las cookies">
            <p>
              Puede configurar su navegador para bloquear o eliminar cookies en cualquier momento. Tenga en cuenta que deshabilitar
              las cookies técnicas puede afectar al funcionamiento del Servicio.
            </p>
            <p>Instrucciones para los principales navegadores:</p>
            <ul>
              <li>
                <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
                  Google Chrome
                </a>
              </li>
              <li>
                <a href="https://support.mozilla.org/es/kb/Borrar%20cookies" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
                  Mozilla Firefox
                </a>
              </li>
              <li>
                <a href="https://support.apple.com/es-es/HT201265" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
                  Safari
                </a>
              </li>
              <li>
                <a href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-las-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
                  Microsoft Edge
                </a>
              </li>
            </ul>
          </Section>

          <Section title="5. Actualizaciones de esta política">
            <p>
              Podemos actualizar esta Política de Cookies periódicamente para reflejar cambios en las cookies que utilizamos
              o por otras razones operativas, legales o reglamentarias. Revísela regularmente para estar informado.
            </p>
          </Section>

          <Section title="6. Contacto">
            <p>
              Para cualquier consulta sobre el uso de cookies, contacte con nosotros en:{" "}
              <a href="mailto:info@dokiflux.com" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">info@dokiflux.com</a>
            </p>
            <p>
              Para más información sobre cómo tratamos sus datos, consulte nuestra{" "}
              <Link href="/privacidad" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">Política de Privacidad</Link>.
            </p>
          </Section>
        </div>
      </main>

      <Footer />
      <LegalStyles />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold text-white mb-4 pb-2 border-b border-white/[0.06]">{title}</h2>
      <div className="text-white/65 text-[15px] leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

function LegalStyles() {
  return (
    <style>{`
      .prose-legal ul { list-style: disc; padding-left: 1.5rem; }
      .prose-legal ul li { margin-bottom: 0.4rem; }
      .prose-legal h3 { font-size: 15px; }
      .prose-legal code { font-family: monospace; background: rgba(255,255,255,0.07); padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 12px; color: rgba(255,255,255,0.8); }
      .prose-legal table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; }
      .prose-legal th, .prose-legal td { text-align: left; padding: 0.6rem 1rem; border: 1px solid rgba(255,255,255,0.08); font-size: 13px; }
      .prose-legal th { background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.8); font-weight: 600; }
      .prose-legal td { color: rgba(255,255,255,0.6); }
    `}</style>
  );
}
