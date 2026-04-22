"use client";

import Link from "next/link";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { Footer } from "@/components/landing/Footer";
import { ArrowLeft } from "lucide-react";

export default function RgpdPage() {
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
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Información RGPD</h1>
          <p className="text-white/40 text-sm">
            Reglamento (UE) 2016/679 del Parlamento Europeo y del Consejo —{" "}
            Última actualización: <strong className="text-white/60">[FECHA_EFECTIVA]</strong>
          </p>
        </div>

        <div className="prose-legal">
          <Section title="1. Responsable del tratamiento">
            <table>
              <tbody>
                <tr>
                  <td><strong>Nombre / Razón social</strong></td>
                  <td>[EMPRESA]</td>
                </tr>
                <tr>
                  <td><strong>NIF / CIF</strong></td>
                  <td>[NIF]</td>
                </tr>
                <tr>
                  <td><strong>Domicilio</strong></td>
                  <td>[DIRECCIÓN]</td>
                </tr>
                <tr>
                  <td><strong>Correo electrónico</strong></td>
                  <td><a href="mailto:[EMAIL_LEGAL]" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">[EMAIL_LEGAL]</a></td>
                </tr>
                <tr>
                  <td><strong>Delegado de Protección de Datos (DPD)</strong></td>
                  <td>[DPD_NOMBRE] — <a href="mailto:[DPD_EMAIL]" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">[DPD_EMAIL]</a></td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section title="2. Sus derechos ARCO+">
            <p>
              El RGPD le reconoce los siguientes derechos respecto al tratamiento de sus datos personales:
            </p>
            <table>
              <thead>
                <tr>
                  <th>Derecho</th>
                  <th>Descripción</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Acceso</strong></td>
                  <td>Obtener confirmación de si se tratan sus datos y una copia de los mismos (Art. 15 RGPD).</td>
                </tr>
                <tr>
                  <td><strong>Rectificación</strong></td>
                  <td>Corregir datos inexactos o incompletos (Art. 16 RGPD).</td>
                </tr>
                <tr>
                  <td><strong>Supresión</strong></td>
                  <td>Solicitar la eliminación de sus datos cuando ya no sean necesarios o retire el consentimiento (Art. 17 RGPD).</td>
                </tr>
                <tr>
                  <td><strong>Oposición</strong></td>
                  <td>Oponerse al tratamiento basado en interés legítimo o con fines de marketing directo (Art. 21 RGPD).</td>
                </tr>
                <tr>
                  <td><strong>Limitación</strong></td>
                  <td>Solicitar que se restrinja el tratamiento mientras se resuelve una controversia (Art. 18 RGPD).</td>
                </tr>
                <tr>
                  <td><strong>Portabilidad</strong></td>
                  <td>Recibir sus datos en formato estructurado y transferirlos a otro responsable (Art. 20 RGPD).</td>
                </tr>
                <tr>
                  <td><strong>No ser objeto de decisiones automatizadas</strong></td>
                  <td>No ser sometido a decisiones basadas exclusivamente en tratamiento automatizado con efectos significativos (Art. 22 RGPD).</td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section title="3. Cómo ejercer sus derechos">
            <p>Para ejercer cualquiera de los derechos anteriores, envíe un correo a:</p>
            <p>
              <a href="mailto:[EMAIL_LEGAL]" className="text-violet-400 hover:text-violet-300 underline underline-offset-2 font-semibold">[EMAIL_LEGAL]</a>
            </p>
            <p>Incluya en su solicitud:</p>
            <ul>
              <li>Nombre completo y correo electrónico asociado a su cuenta.</li>
              <li>Copia de su DNI, pasaporte u otro documento de identidad válido.</li>
              <li>Descripción clara del derecho que desea ejercer.</li>
            </ul>
            <p>
              Responderemos a su solicitud en el plazo máximo de <strong>30 días naturales</strong> desde su recepción.
              En casos complejos o con gran volumen de solicitudes, podemos ampliar este plazo otros 2 meses comunicándoselo previamente.
            </p>
          </Section>

          <Section title="4. Bases legales del tratamiento">
            <p>
              Tratamos sus datos bajo las siguientes bases legales del Art. 6 RGPD:
            </p>
            <ul>
              <li><strong>Ejecución de contrato</strong> (Art. 6.1.b): gestión de la cuenta, prestación del servicio y facturación.</li>
              <li><strong>Cumplimiento de obligación legal</strong> (Art. 6.1.c): conservación de registros contables y fiscales.</li>
              <li><strong>Interés legítimo</strong> (Art. 6.1.f): seguridad del servicio, prevención de fraude y análisis de rendimiento.</li>
              <li><strong>Consentimiento</strong> (Art. 6.1.a): comunicaciones de marketing y cookies no esenciales.</li>
            </ul>
          </Section>

          <Section title="5. Transferencias internacionales">
            <p>
              Algunos de nuestros proveedores (Stripe, OpenAI, Anthropic, Google) están establecidos fuera del Espacio Económico Europeo (EEE).
              Para estas transferencias aplicamos las garantías adecuadas previstas en el capítulo V del RGPD:
            </p>
            <ul>
              <li><strong>Decisiones de adecuación</strong> de la Comisión Europea (p. ej., para EE. UU. bajo el Marco de Privacidad UE-EE. UU.).</li>
              <li><strong>Cláusulas Contractuales Tipo (CCT)</strong> aprobadas por la Comisión Europea.</li>
            </ul>
          </Section>

          <Section title="6. Plazo de conservación">
            <p>
              Los datos de cuenta se conservan durante la vigencia de la relación contractual. Una vez eliminada la cuenta:
            </p>
            <ul>
              <li>Datos de facturación: <strong>6 años</strong> (obligación fiscal, Art. 30 Ley del IVA).</li>
              <li>Datos de comunicaciones: <strong>1 año</strong> (Ley de Servicios de la Sociedad de la Información).</li>
              <li>Resto de datos personales: eliminados en el plazo de <strong>30 días</strong> tras la solicitud de supresión.</li>
            </ul>
          </Section>

          <Section title="7. Seguridad del tratamiento">
            <p>
              De conformidad con el Art. 32 RGPD, hemos implementado medidas técnicas y organizativas apropiadas para garantizar
              un nivel de seguridad adecuado al riesgo, incluyendo:
            </p>
            <ul>
              <li>Cifrado de datos en tránsito (TLS 1.3) y en reposo (AES-256).</li>
              <li>Control de acceso basado en roles y autenticación de doble factor para el personal.</li>
              <li>Copias de seguridad cifradas y procedimientos de recuperación ante desastres.</li>
              <li>Auditorías de seguridad periódicas y gestión de vulnerabilidades.</li>
            </ul>
          </Section>

          <Section title="8. Violaciones de seguridad">
            <p>
              En caso de violación de la seguridad de los datos personales que suponga un riesgo para sus derechos y libertades,
              notificaremos a la{" "}
              <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
                Agencia Española de Protección de Datos (AEPD)
              </a>{" "}
              en un plazo máximo de 72 horas, y a los afectados sin dilación indebida cuando el riesgo sea alto.
            </p>
          </Section>

          <Section title="9. Autoridad de control">
            <p>
              Tiene derecho a presentar una reclamación ante la autoridad supervisora competente. En España, dicha autoridad es:
            </p>
            <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="font-semibold text-white/80 mb-1">Agencia Española de Protección de Datos (AEPD)</p>
              <p>C/ Jorge Juan, 6 — 28001 Madrid</p>
              <p>
                <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
                  www.aepd.es
                </a>
              </p>
            </div>
          </Section>

          <Section title="10. Más información">
            <p>
              Para más detalles sobre cómo tratamos sus datos, consulte nuestra{" "}
              <Link href="/privacidad" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">Política de Privacidad</Link>{" "}
              completa. Para cuestiones sobre cookies, visite la{" "}
              <Link href="/cookies" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">Política de Cookies</Link>.
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
      .prose-legal th, .prose-legal td { text-align: left; padding: 0.6rem 1rem; border: 1px solid rgba(255,255,255,0.08); font-size: 14px; vertical-align: top; }
      .prose-legal th { background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.8); font-weight: 600; }
      .prose-legal td { color: rgba(255,255,255,0.6); }
    `}</style>
  );
}
