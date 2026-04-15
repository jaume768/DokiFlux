"use client";

import { LandingNavbar, Footer, PlanCard, FAQItem } from "@/components/landing";

const FAQ_ITEMS = [
  {
    question: "¿Qué son los créditos?",
    answer:
      "Los créditos son la moneda interna de DokiFlux. Cada generación de código consume créditos basados en los tokens de entrada y salida del modelo de IA. Una generación típica cuesta aproximadamente $0.03 en créditos.",
  },
  {
    question: "¿Cuánto cuesta una generación?",
    answer:
      "El coste depende de la complejidad del prompt y la longitud del código generado. Cada generación consume créditos de tu saldo, y siempre verás el crédito consumido al finalizar.",
  },
  {
    question: "¿Los créditos expiran?",
    answer:
      "Los créditos mensuales incluidos en tu plan hacen roll over y expiran tras 65 días si no se usan. Los créditos comprados por separado tienen una validez de 1 año.",
  },
  {
    question: "¿Qué pasa si falla una generación?",
    answer:
      "Si la generación falla sin producir código utilizable, no se te cobra. Solo se consumen créditos cuando la generación produce un resultado válido.",
  },
  {
    question: "¿Puedo cambiar de plan?",
    answer:
      "Próximamente podrás actualizar de Free a Premium directamente desde la app con Stripe. Por ahora, todos los usuarios comienzan con el plan Free.",
  },
  {
    question: "¿Qué modelos de IA están disponibles?",
    answer:
      "Actualmente usamos GPT para la generación de código. Próximamente añadiremos soporte para Claude, Gemini y otros modelos, cada uno con sus fortalezas y costes diferentes.",
  },
];

export default function PricingPage() {
  return (
    <div className="landing bg-[#0a0a0f] text-white min-h-screen flex flex-col">
      <LandingNavbar />

      {/* Header */}
      <section className="relative overflow-hidden pt-28 pb-6">
        <div className="absolute inset-0 grid-pattern pointer-events-none" style={{ opacity: 0.3 }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none" style={{ background: "radial-gradient(ellipse, rgba(139,92,246,0.16) 0%, transparent 70%)" }} />
        <div className="relative z-10 mx-auto max-w-6xl px-4 text-center sm:px-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 text-[12px] font-semibold tracking-widest uppercase" style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)", color: "#c084fc" }}>
            Pricing
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl text-white">
            Simple y{" "}
            <span className="gradient-text">transparente</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/55">
            Empieza gratis, escala cuando lo necesites. Sin sorpresas.
          </p>
        </div>
      </section>

      {/* Plan cards */}
      <section className="py-14 relative z-10">
        <div className="mx-auto grid max-w-4xl gap-6 px-4 sm:px-6 md:grid-cols-3">
          <PlanCard
            name="Free"
            price="$0"
            description="Para explorar y proyectos personales"
            features={[
              "$5 de créditos incluidos/mes",
              "7 generaciones/día",
              "Proyectos hasta 200KB",
              "Todos los modelos",
              "Badge «Built with DokiFlux»",
            ]}
            cta="Empieza gratis"
            ctaHref="/register"
          />
          <PlanCard
            name="Premium"
            price="$20"
            description="Para profesionales y equipos"
            features={[
              "$20 de créditos incluidos/mes",
              "100 generaciones/día",
              "Proyectos hasta 500KB",
              "Todos los modelos",
              "Sin badge de marca",
              "Créditos adicionales comprables",
            ]}
            cta="Actualizar a Premium"
            ctaHref="/app/billing"
            highlighted
            badge="Popular"
          />
          <PlanCard
            name="Business"
            price="Custom"
            period=""
            description="Para empresas con necesidades específicas"
            features={[
              "Créditos personalizados",
              "Generaciones ilimitadas/día",
              "Sin límite de tamaño",
              "API access dedicado",
              "Soporte prioritario",
              "Facturación a medida",
            ]}
            cta="Contactar"
            ctaHref="#"
            disabled
          />
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 relative z-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="mb-8 text-center text-2xl font-bold text-white">
            Preguntas frecuentes
          </h2>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <FAQItem
                key={item.question}
                question={item.question}
                answer={item.answer}
                index={i}
                isVisible
              />
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
