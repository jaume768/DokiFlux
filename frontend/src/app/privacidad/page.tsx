"use client";

import Link from "next/link";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { Footer } from "@/components/landing/Footer";
import { ArrowLeft } from "lucide-react";

export default function PrivacidadPage() {
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
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Política de Privacidad</h1>
          <p className="text-white/40 text-sm">Última actualización: <strong className="text-white/60">24 de abril de 2026</strong></p>
        </div>

        <div className="prose-legal">
          <Section title="1. Responsable del tratamiento">
            <p>
              El responsable del tratamiento de sus datos personales es <strong>Jaime Fernández Suñer</strong>, con NIF <strong>41621021Z</strong>,
              domicilio en <strong>Calle Mallorca, 50, Manacor, Islas Baleares, 07500</strong>, y dirección de correo electrónico de contacto:{" "}
              <a href="mailto:info@dokiflux.com" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">info@dokiflux.com</a>.
            </p>
          </Section>

          <Section title="2. Datos que recopilamos">
            <p>Recopilamos las siguientes categorías de datos personales:</p>
            <ul>
              <li><strong>Datos de registro:</strong> nombre de usuario, dirección de correo electrónico y contraseña (almacenada de forma cifrada).</li>
              <li><strong>Datos de uso:</strong> proyectos generados, prompts enviados, tokens consumidos y estadísticas de sesión.</li>
              <li><strong>Datos de pago:</strong> procesados de forma segura por Stripe. DokiFlux no almacena datos de tarjeta.</li>
              <li><strong>Datos técnicos:</strong> dirección IP, navegador, sistema operativo, cookies de sesión e identificadores de dispositivo.</li>
              <li><strong>Datos de Google OAuth:</strong> si inicia sesión con Google, recibimos su nombre, correo y foto de perfil públicos.</li>
            </ul>
          </Section>

          <Section title="3. Finalidad y base legal del tratamiento">
            <table>
              <thead>
                <tr>
                  <th>Finalidad</th>
                  <th>Base legal</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Gestión de la cuenta y prestación del servicio</td>
                  <td>Ejecución de contrato (Art. 6.1.b RGPD)</td>
                </tr>
                <tr>
                  <td>Facturación y gestión de pagos</td>
                  <td>Obligación legal (Art. 6.1.c RGPD)</td>
                </tr>
                <tr>
                  <td>Mejora del servicio y análisis de uso</td>
                  <td>Interés legítimo (Art. 6.1.f RGPD)</td>
                </tr>
                <tr>
                  <td>Comunicaciones de marketing</td>
                  <td>Consentimiento (Art. 6.1.a RGPD)</td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section title="4. Conservación de los datos">
            <p>
              Conservaremos sus datos personales durante el tiempo que mantenga una cuenta activa en DokiFlux y, una vez eliminada,
              durante los plazos legalmente exigidos (máximo 6 años para datos de facturación según legislación fiscal española).
            </p>
          </Section>

          <Section title="5. Destinatarios y transferencias internacionales">
            <p>Sus datos pueden ser compartidos con los siguientes terceros:</p>
            <ul>
              <li><strong>Stripe Inc.</strong> — procesamiento de pagos (EE. UU., con garantías SCCs de la UE).</li>
              <li><strong>Proveedores de IA</strong> (OpenAI, Anthropic, Google) — procesamiento de prompts. Consulte sus políticas de privacidad.</li>
              <li><strong>Proveedores de infraestructura</strong> (servidores cloud) — alojamiento del servicio.</li>
            </ul>
            <p>
              Para transferencias fuera del EEE, aplicamos las garantías adecuadas previstas en el capítulo V del RGPD
              (Cláusulas Contractuales Tipo o decisiones de adecuación de la Comisión Europea).
            </p>
          </Section>

          <Section title="6. Sus derechos">
            <p>Como interesado, tiene derecho a:</p>
            <ul>
              <li><strong>Acceso:</strong> obtener confirmación de si tratamos sus datos y una copia de los mismos.</li>
              <li><strong>Rectificación:</strong> corregir datos inexactos o completar datos incompletos.</li>
              <li><strong>Supresión («derecho al olvido»):</strong> solicitar la eliminación de sus datos cuando ya no sean necesarios.</li>
              <li><strong>Limitación:</strong> solicitar que se restrinja el tratamiento en determinadas circunstancias.</li>
              <li><strong>Portabilidad:</strong> recibir sus datos en formato estructurado y de uso común.</li>
              <li><strong>Oposición:</strong> oponerse al tratamiento basado en interés legítimo o con fines de marketing directo.</li>
            </ul>
            <p>
              Para ejercer sus derechos, envíe un correo a{" "}
              <a href="mailto:info@dokiflux.com" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">info@dokiflux.com</a>{" "}
              adjuntando una copia de su DNI u otro documento de identidad. Responderemos en el plazo de 30 días.
            </p>
            <p>
              Asimismo, tiene derecho a presentar una reclamación ante la{" "}
              <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
                Agencia Española de Protección de Datos (AEPD)
              </a>.
            </p>
          </Section>

          <Section title="7. Seguridad">
            <p>
              Aplicamos medidas técnicas y organizativas apropiadas para proteger sus datos personales frente a accesos no autorizados,
              pérdidas o divulgaciones accidentales, incluyendo cifrado en tránsito (TLS) y en reposo, control de accesos y auditorías periódicas.
            </p>
          </Section>

          <Section title="8. Cookies">
            <p>
              Utilizamos cookies propias y de terceros. Consulte nuestra{" "}
              <Link href="/cookies" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">Política de Cookies</Link>{" "}
              para más información.
            </p>
          </Section>

          <Section title="9. Cambios en esta política">
            <p>
              Nos reservamos el derecho a modificar esta Política de Privacidad. Le notificaremos los cambios significativos por correo
              electrónico o mediante un aviso destacado en el servicio. La versión actualizada entrará en vigor en la fecha indicada al inicio.
            </p>
          </Section>

          <Section title="10. Contacto">
            <p>
              Para cualquier consulta sobre esta política o el tratamiento de sus datos, contacte con nosotros en:{" "}
              <a href="mailto:info@dokiflux.com" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">info@dokiflux.com</a>
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
      .prose-legal table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; }
      .prose-legal th, .prose-legal td { text-align: left; padding: 0.6rem 1rem; border: 1px solid rgba(255,255,255,0.08); font-size: 14px; }
      .prose-legal th { background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.8); font-weight: 600; }
      .prose-legal td { color: rgba(255,255,255,0.6); }
    `}</style>
  );
}
