"use client";

import Link from "next/link";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { Footer } from "@/components/landing/Footer";
import { ArrowLeft } from "lucide-react";

export default function TerminosPage() {
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
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Términos de Uso</h1>
          <p className="text-white/40 text-sm">Última actualización: <strong className="text-white/60">24 de abril de 2026</strong></p>
        </div>

        <div className="prose-legal">
          <Section title="1. Aceptación de los términos">
            <p>
              Al acceder o utilizar DokiFlux (el «Servicio»), operado por <strong>Jaime Fernández Suñer</strong> («nosotros»), usted acepta quedar
              vinculado por estos Términos de Uso. Si no está de acuerdo con alguno de ellos, le rogamos que no utilice el Servicio.
            </p>
          </Section>

          <Section title="2. Descripción del servicio">
            <p>
              DokiFlux es una plataforma de generación de interfaces de usuario asistida por inteligencia artificial. Permite a los usuarios
              crear prototipos de código frontend a partir de descripciones en lenguaje natural. El Servicio incluye funcionalidades de
              previsualización en tiempo real, gestión de proyectos y acceso a modelos de IA de terceros.
            </p>
          </Section>

          <Section title="3. Elegibilidad y registro">
            <p>
              Para utilizar el Servicio debe tener al menos 16 años. Al crear una cuenta, declara que la información facilitada es
              exacta y se compromete a mantenerla actualizada. Es responsable de mantener la confidencialidad de sus credenciales de acceso.
            </p>
          </Section>

          <Section title="4. Planes, precios y facturación">
            <ul>
              <li><strong>Plan Free:</strong> acceso limitado al servicio con créditos de uso gratuitos asignados periódicamente.</li>
              <li><strong>Plan Premium:</strong> suscripción mensual con acceso completo, créditos adicionales y modelos avanzados.</li>
              <li>Los precios se expresan en la divisa indicada en la página de precios y no incluyen impuestos aplicables.</li>
              <li>Las suscripciones se renuevan automáticamente. Puede cancelarlas en cualquier momento desde su perfil.</li>
              <li>No se realizan reembolsos por períodos de suscripción parcialmente consumidos, salvo obligación legal.</li>
              <li>Los pagos son procesados por Stripe, Inc. Consulte su política de privacidad para más información.</li>
            </ul>
          </Section>

          <Section title="5. Uso aceptable">
            <p>Se compromete a no utilizar el Servicio para:</p>
            <ul>
              <li>Generar contenido ilegal, ofensivo, difamatorio, fraudulento o que infrinja derechos de terceros.</li>
              <li>Intentar acceder sin autorización a sistemas, cuentas o datos de otros usuarios.</li>
              <li>Realizar ingeniería inversa, descompilar o intentar extraer el código fuente del Servicio.</li>
              <li>Automatizar solicitudes de forma abusiva que degraden el rendimiento del Servicio para otros usuarios.</li>
              <li>Revender o sublicenciar el acceso al Servicio sin autorización expresa por escrito.</li>
            </ul>
          </Section>

          <Section title="6. Propiedad intelectual">
            <p>
              <strong>Nuestro contenido:</strong> DokiFlux y todos sus componentes (diseño, logotipos, código fuente de la plataforma)
              son propiedad exclusiva de <strong>Jaime Fernández Suñer</strong> o sus licenciantes y están protegidos por la legislación sobre
              propiedad intelectual.
            </p>
            <p>
              <strong>Su contenido:</strong> Usted conserva todos los derechos sobre los prompts que envía y el código generado a partir
              de ellos. Al utilizar el Servicio nos otorga una licencia limitada, no exclusiva y revocable para procesar dicho contenido
              con el único fin de prestar el Servicio.
            </p>
          </Section>

          <Section title="7. Disponibilidad del servicio">
            <p>
              Nos esforzamos por mantener el Servicio disponible de forma continua, pero no garantizamos una disponibilidad del 100 %.
              Podemos realizar interrupciones programadas para mantenimiento, y nos reservamos el derecho a modificar o discontinuar
              funcionalidades con previo aviso razonable.
            </p>
          </Section>

          <Section title="8. Limitación de responsabilidad">
            <p>
              En la máxima medida permitida por la ley aplicable, <strong>Jaime Fernández Suñer</strong> no será responsable de daños indirectos,
              incidentales, especiales, consecuentes o punitivos, ni de pérdidas de beneficios o datos, derivados del uso o la
              imposibilidad de uso del Servicio. Nuestra responsabilidad total no superará el importe abonado por el usuario en los
              12 meses anteriores al hecho que origine la reclamación.
            </p>
          </Section>

          <Section title="9. Indemnización">
            <p>
              Usted se compromete a indemnizar y mantener indemne a <strong>Jaime Fernández Suñer</strong>, sus directivos, empleados y agentes,
              frente a cualquier reclamación, daño o gasto (incluidos honorarios de abogados) derivados de su incumplimiento de estos
              Términos o del uso indebido del Servicio.
            </p>
          </Section>

          <Section title="10. Modificaciones">
            <p>
              Nos reservamos el derecho a modificar estos Términos en cualquier momento. Le notificaremos los cambios materiales por
              correo electrónico o mediante aviso en el Servicio con al menos 15 días de antelación. El uso continuado tras la
              entrada en vigor de los cambios implica su aceptación.
            </p>
          </Section>

          <Section title="11. Terminación">
            <p>
              Podemos suspender o cancelar su cuenta en caso de incumplimiento grave de estos Términos, con o sin previo aviso.
              Usted puede cancelar su cuenta en cualquier momento desde los ajustes de su perfil.
            </p>
          </Section>

          <Section title="12. Ley aplicable y jurisdicción">
            <p>
              Estos Términos se rigen por la legislación española. Para cualquier controversia, las partes se someten a la
              jurisdicción de los juzgados y tribunales de <strong>Manacor</strong>, renunciando expresamente a cualquier otro
              fuero que pudiera corresponderles.
            </p>
          </Section>

          <Section title="13. Contacto">
            <p>
              Para cualquier consulta relacionada con estos Términos, contacte con nosotros en:{" "}
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
