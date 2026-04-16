"use client";

import { useState, useEffect, useRef } from "react";
import { FAQItem } from "./FAQItem";

const FAQ_ITEMS = [
  {
    question: "¿Cuánto cuesta una generación?",
    answer: "El coste de cada generación depende del modelo IA utilizado y del número de tokens generados. En el plan Free dispones de $5 en créditos al mes, suficiente para unas 5 generaciones diarias. En el plan Premium tienes $20 en créditos mensuales. Los precios por modelo van desde ~$0.002 por generación con modelos básicos hasta ~$0.05 con GPT-4o o Claude 3.5 para proyectos más complejos.",
  },
  {
    question: "¿Puedo exportar el código?",
    answer: "Sí, puedes descargar todos los archivos generados en cualquier momento como un .zip listo para usar. El código es completamente tuyo: no hay lock-in, no hay licencias restrictivas. Puedes llevar tu proyecto a cualquier entorno de desarrollo sin restricciones.",
  },
  {
    question: "¿Qué frameworks soporta?",
    answer: "En el plan Free puedes generar proyectos en React con Tailwind CSS. Con el plan Premium desbloqueas soporte para Next.js (App Router y Pages Router), Vue 3 con Composition API, y Svelte. Estamos trabajando en añadir Angular y SolidJS próximamente. Todos los frameworks incluyen TypeScript por defecto.",
  },
  {
    question: "¿El servicio de producción está incluido en el plan?",
    answer: "El servicio de producción es un servicio separado gestionado por nuestro equipo de ingeniería. No está incluido en los planes de suscripción. Una vez que tengas tu prototipo validado, puedes contactar con nosotros para obtener un presupuesto personalizado. El tiempo medio de entrega a producción es de 12 días.",
  },
  {
    question: "¿Los créditos caducan?",
    answer: "En el plan Free, los créditos no utilizados no se acumulan: se renuevan a $5 cada inicio de ciclo mensual. En el plan Premium, los créditos sí se acumulan hasta un máximo de 2 meses de crédito ($40). Los créditos adicionales comprados puntualmente tienen una validez de 12 meses desde la fecha de compra.",
  },
  {
    question: "¿Es RGPD compliant?",
    answer: "Sí. DokiFlux está diseñado y operado desde España, cumpliendo con el Reglamento General de Protección de Datos (RGPD). Los datos de tus proyectos se almacenan en servidores dentro de la Unión Europea. Nunca usamos tu código o prompts para entrenar modelos de IA. Puedes solicitar la eliminación de todos tus datos en cualquier momento desde ajustes de cuenta.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
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
      { threshold: 0.08 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="faq"
      ref={sectionRef}
      className="relative py-28 px-5 md:px-8 overflow-hidden"
    >
      <div className="absolute inset-0 grid-pattern pointer-events-none" style={{ opacity: 0.5 }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[500px] bg-violet-700/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto">
        {/* Section header */}
        <div
          className="text-center mb-16"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
          }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.08] bg-white/[0.03] text-xs font-medium text-white/40 uppercase tracking-widest mb-4">
            <span className="w-1 h-1 rounded-full bg-violet-400" />
            FAQ
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
            Preguntas
            <br />
            <span className="gradient-text">frecuentes</span>
          </h2>
          <p className="text-white/40 text-base md:text-lg max-w-md mx-auto leading-relaxed">
            Todo lo que necesitas saber antes de empezar. Si tienes más dudas,{" "}
            <a
              href="mailto:hola@dokiflux.app"
              className="text-violet-400/80 hover:text-violet-300 transition-colors duration-200 underline underline-offset-2 decoration-dotted"
            >
              escríbenos
            </a>
            .
          </p>
        </div>

        {/* FAQ list */}
        <div className="flex flex-col gap-3">
          {FAQ_ITEMS.map((item, i) => (
            <FAQItem
              key={i}
              question={item.question}
              answer={item.answer}
              index={i}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex((prev) => (prev === i ? null : i))}
              isVisible={visible}
            />
          ))}
        </div>

        {/* Bottom CTA nudge */}
        <div
          className="mt-14 text-center"
          style={{
            opacity: visible ? 1 : 0,
            transition: "opacity 0.6s ease 0.6s",
          }}
        >
          <div className="inline-flex flex-col sm:flex-row items-center gap-3 px-6 py-4 rounded-2xl glass border border-white/[0.08]">
            <span className="text-white/40 text-sm">¿Tienes alguna otra pregunta?</span>
            <a
              href="mailto:hola@dokiflux.app"
              className="flex items-center gap-2 text-sm font-semibold text-violet-400 hover:text-violet-300 transition-colors duration-200 group"
            >
              Contacta con nuestro equipo
              <span className="group-hover:translate-x-1 transition-transform duration-200 inline-block">
                →
              </span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
