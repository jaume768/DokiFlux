"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Sparkles,
  Zap,
  MessageSquare,
  Monitor,
  RefreshCw,
  Bug,
  Moon,
  LayoutTemplate,
  Download,
  ArrowRight,
  Code2,
  Eye,
  PenLine,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { LandingNavbar, Footer, FeatureCard, TemplateCard, PlanCard } from "@/components/landing";
import { TEMPLATES } from "@/lib/templates";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <LandingNavbar />

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_-20%,hsl(var(--primary)/0.12),transparent)]" />
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-24 sm:px-6 sm:pb-28 sm:pt-32 text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="space-y-6"
          >
            <motion.div variants={fadeUp} custom={0}>
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                Generador de UI con IA
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              custom={1}
              className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
            >
              De prompt a proyecto{" "}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                en segundos
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl"
            >
              Describe tu idea en lenguaje natural. DokiFlux genera proyectos
              React + Tailwind completos con vista previa en vivo directamente
              en el navegador.
            </motion.p>

            <motion.div
              variants={fadeUp}
              custom={3}
              className="flex flex-wrap items-center justify-center gap-3"
            >
              <Link
                href="/register"
                className={buttonVariants({
                  size: "lg",
                  className: "gap-2 rounded-xl text-base",
                })}
              >
                Empieza gratis
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                  className: "rounded-xl text-base",
                })}
              >
                Ver pricing
              </Link>
            </motion.div>
          </motion.div>

          {/* Visual mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.7, ease: "easeOut" as const }}
            className="mx-auto mt-16 max-w-4xl"
          >
            <div className="overflow-hidden rounded-xl border bg-card shadow-2xl">
              {/* Window chrome */}
              <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-2.5">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-400/60" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400/60" />
                  <div className="h-3 w-3 rounded-full bg-green-400/60" />
                </div>
                <div className="flex-1 text-center text-xs text-muted-foreground">
                  dokiflux.app
                </div>
              </div>
              {/* Mockup content */}
              <div className="flex h-72 sm:h-80">
                {/* Chat panel */}
                <div className="hidden w-1/3 border-r p-4 sm:block">
                  <div className="space-y-3">
                    <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
                    <div className="rounded-lg bg-primary/10 p-3">
                      <div className="h-2 w-full rounded bg-primary/20" />
                      <div className="mt-1.5 h-2 w-2/3 rounded bg-primary/20" />
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <div className="h-2 w-full rounded bg-muted-foreground/10" />
                      <div className="mt-1.5 h-2 w-4/5 rounded bg-muted-foreground/10" />
                      <div className="mt-1.5 h-2 w-1/2 rounded bg-muted-foreground/10" />
                    </div>
                  </div>
                </div>
                {/* Code preview */}
                <div className="flex-1 bg-muted/20 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-5 w-16 rounded bg-primary/20" />
                    <div className="h-5 w-20 rounded bg-muted" />
                    <div className="h-5 w-14 rounded bg-muted" />
                  </div>
                  <div className="space-y-2 font-mono text-xs text-muted-foreground">
                    <div className="flex gap-2">
                      <span className="text-muted-foreground/40">1</span>
                      <span className="text-primary/60">{"import"}</span>
                      <span>{" React "}</span>
                      <span className="text-primary/60">{"from"}</span>
                      <span>{" 'react'"}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-muted-foreground/40">2</span>
                      <span className="text-primary/60">{"export default"}</span>
                      <span>{" function App() {"}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-muted-foreground/40">3</span>
                      <span className="pl-4">{"return ("}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-muted-foreground/40">4</span>
                      <span className="pl-8 text-emerald-500/60">{"<div className=\"...\">"}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-muted-foreground/40">5</span>
                      <span className="pl-12 animate-pulse text-primary">{"█"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section className="border-t bg-muted/20 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Cómo funciona
            </h2>
            <p className="mt-3 text-muted-foreground">
              Tres pasos. Sin configuración. Sin servidor.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: PenLine,
                step: "1",
                title: "Describe",
                desc: "Escribe un prompt en lenguaje natural describiendo lo que quieres construir",
              },
              {
                icon: Code2,
                step: "2",
                title: "Genera",
                desc: "La IA genera código React multiarchivo en streaming, archivo por archivo",
              },
              {
                icon: Eye,
                step: "3",
                title: "Previsualiza",
                desc: "Vista previa en vivo ejecutada con WebContainers directamente en el navegador",
              },
            ].map((item) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5 }}
                className="text-center"
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">
                  Paso {item.step}
                </div>
                <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="scroll-mt-16 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Todo lo que necesitas
            </h2>
            <p className="mt-3 text-muted-foreground">
              Herramientas profesionales para generar y iterar sobre interfaces
            </p>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {[
              {
                icon: Zap,
                title: "Streaming en tiempo real",
                desc: "Código generado archivo por archivo con visor tipo IDE",
              },
              {
                icon: MessageSquare,
                title: "Modo dual Chat + Código",
                desc: "La IA conversa para aclarar y genera cuando está lista",
              },
              {
                icon: Monitor,
                title: "Vista previa en vivo",
                desc: "WebContainers ejecutan tu proyecto en el navegador",
              },
              {
                icon: RefreshCw,
                title: "Iteración inteligente",
                desc: "Solo se regeneran los archivos modificados",
              },
              {
                icon: Bug,
                title: "Auto-fix de errores",
                desc: "Detecta errores de compilación y los corrige automáticamente",
              },
              {
                icon: LayoutTemplate,
                title: "Templates de inicio",
                desc: "Empieza rápido con plantillas predefinidas",
              },
              {
                icon: Moon,
                title: "Dark / Light mode",
                desc: "Tema adaptable con toggle instantáneo",
              },
              {
                icon: Download,
                title: "Descarga ZIP",
                desc: "Exporta como proyecto Vite + React listo para producción",
              },
            ].map((f, i) => (
              <motion.div key={f.title} variants={fadeUp} custom={i}>
                <FeatureCard
                  icon={f.icon}
                  title={f.title}
                  description={f.desc}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Templates ─── */}
      <section id="templates" className="scroll-mt-16 border-t bg-muted/20 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Empieza con un template
            </h2>
            <p className="mt-3 text-muted-foreground">
              Elige una plantilla y personalízala en segundos con prompts
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TEMPLATES.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing preview ─── */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Pricing simple y transparente
            </h2>
            <p className="mt-3 text-muted-foreground">
              Empieza gratis, escala cuando lo necesites
            </p>
          </div>

          <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
            <PlanCard
              name="Free"
              price="$0"
              description="Para explorar y proyectos personales"
              features={[
                "$5 de créditos incluidos/mes",
                "7 generaciones/día",
                "Proyectos hasta 200KB",
                "Todos los modelos",
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
                "Sin badge de marca",
                "Créditos adicionales comprables",
              ]}
              cta="Próximamente"
              ctaHref="#"
              highlighted
              badge="Popular"
              disabled
            />
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/pricing"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Ver todos los detalles de pricing →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── CTA final ─── */}
      <section className="border-t bg-muted/20 py-20">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            ¿Listo para crear?
          </h2>
          <p className="mt-3 text-muted-foreground">
            Regístrate gratis y genera tu primer proyecto en menos de un minuto
          </p>
          <div className="mt-8">
            <Link
              href="/register"
              className={buttonVariants({
                size: "lg",
                className: "gap-2 rounded-xl text-base",
              })}
            >
              Empieza gratis
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
