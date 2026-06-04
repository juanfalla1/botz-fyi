"use client"

import Link from "next/link"
import { useState } from "react"
import { motion } from "framer-motion"
import { ArrowLeft, ArrowRight, BarChart3, CheckCircle2, FileSearch, MessageSquare, Play, Sparkles, Target, Users, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Navbar } from "@/GEO/components/landing/navbar"

const steps = [
  { title: "Configura tu marca", description: "Agrega dominio, país, industria y objetivo comercial.", icon: Target, metric: "Marca lista en 3 min" },
  { title: "Ejecuta un GEO Audit", description: "Botz consulta ChatGPT, Gemini, Perplexity y AI Overviews.", icon: FileSearch, metric: "4 motores IA" },
  { title: "Revisa resultados", description: "Visualiza score, prompts ganados, citaciones y desglose por motor.", icon: BarChart3, metric: "GEO Score 78" },
  { title: "Compara competidores", description: "Identifica quién domina las respuestas IA y dónde puedes ganar.", icon: Users, metric: "Benchmark real" },
  { title: "Activa acciones", description: "Convierte brechas en contenido, schema, FAQs y reportes automáticos.", icon: Sparkles, metric: "Plan de acción" },
]

const engines = ["ChatGPT", "Gemini", "Perplexity", "AI Overviews"]

export default function GeoDemoPage() {
  const [activeStep, setActiveStep] = useState(0)
  const ActiveIcon = steps[activeStep].icon

  return (
    <main className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />

      <section className="relative px-4 pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute left-1/2 top-20 h-[520px] w-[760px] -translate-x-1/2 rounded-full bg-primary/20 blur-[140px]" />
          <div className="absolute right-0 top-64 h-[420px] w-[420px] rounded-full bg-accent/20 blur-[120px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className="mx-auto max-w-3xl text-center">
            <Link href="/geo" className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/20 px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Volver a GEO
            </Link>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-sm text-muted-foreground">
              <Play className="h-4 w-4 text-primary" />
              <span>Demo guiada de Botz GEO</span>
            </div>
            <h1 className="text-balance text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Recorre Botz GEO como si fueras <span className="text-gradient">un cliente real</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground text-pretty">
              Cambia entre las pantallas simuladas: creación de marca, auditoría, resultados, competidores y acciones recomendadas. No necesitas registrarte.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" className="bg-primary px-8 py-6 text-base hover:bg-primary/90 glow-primary" asChild>
                <a href="#tour">Ver recorrido <ArrowRight className="ml-2 h-5 w-5" /></a>
              </Button>
              <Button size="lg" variant="outline" className="glass border-border px-8 py-6 text-base hover:bg-secondary" asChild>
                <Link href="/geo/agendar-demo">Agendar demo humana</Link>
              </Button>
            </div>
          </motion.div>

          <motion.div id="tour" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }} className="mt-16 grid scroll-mt-28 gap-6 lg:grid-cols-[0.42fr_0.58fr]">
            <div className="space-y-3">
              {steps.map((step, index) => (
                <button key={step.title} type="button" onClick={() => setActiveStep(index)} className={`w-full rounded-2xl border p-4 text-left transition-all ${activeStep === index ? "border-primary/60 bg-primary/15 shadow-[0_0_28px_rgba(99,102,241,0.18)]" : "border-border bg-secondary/10 hover:border-primary/40 hover:bg-secondary/25"}`}>
                  <div className="flex gap-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${activeStep === index ? "bg-primary text-white" : "bg-primary/15 text-primary"}`}>
                      <step.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{index + 1}. {step.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                      <p className="mt-3 text-xs font-medium text-primary">{step.metric}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <Card className="glass border-border overflow-hidden glow-primary">
              <CardContent className="p-0">
                <div className="border-b border-border bg-secondary/20 px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-red-400/80" />
                    <span className="h-3 w-3 rounded-full bg-amber-400/80" />
                    <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
                  </div>
                  <span className="text-xs text-muted-foreground">Pantalla {activeStep + 1}/5</span>
                </div>

                <div className="min-h-[620px] p-6 md:p-8">
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                      <ActiveIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-primary">Tour interactivo</p>
                      <h2 className="text-2xl font-bold">{steps[activeStep].title}</h2>
                      <p className="text-sm text-muted-foreground">{steps[activeStep].description}</p>
                    </div>
                  </div>

                  {activeStep === 0 && <BrandSetupScreen />}
                  {activeStep === 1 && <AuditRunningScreen />}
                  {activeStep === 2 && <AuditResultsScreen />}
                  {activeStep === 3 && <CompetitorsScreen />}
                  {activeStep === 4 && <ActionsScreen />}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      <section className="px-4 pb-24">
        <div className="mx-auto max-w-4xl rounded-3xl glass p-8 text-center md:p-12">
          <h2 className="text-3xl font-bold">¿Quieres ver esto con tus datos?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Agenda una demo y te mostramos cómo se vería un GEO Audit para tu marca, tus competidores y tus prompts reales.
          </p>
          <Button className="mt-8 bg-primary hover:bg-primary/90 glow-primary" size="lg" asChild>
            <Link href="/geo/agendar-demo">Agendar demo personalizada</Link>
          </Button>
        </div>
      </section>
    </main>
  )
}

function BrandSetupScreen() {
  const values = [
    ["Marca", "Acme SaaS Platform"],
    ["Website", "https://acme-saas.com"],
    ["País", "Colombia"],
    ["Idioma", "Español"],
    ["Industria", "SaaS / Software"],
    ["Objetivo", "Ganar visibilidad en recomendaciones de IA para software B2B"],
  ]
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-[#0b1020]/70 p-5">
        <p className="text-sm font-semibold text-primary">Nuevo proyecto GEO</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {values.map(([label, value], index) => (
            <div key={label} className={index === 5 ? "sm:col-span-2" : ""}>
              <p className="mb-2 text-xs text-muted-foreground">{label}</p>
              <div className="rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm">{value}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
        <CheckCircle2 className="h-5 w-5" /> Proyecto listo para auditar.
      </div>
    </div>
  )
}

function AuditRunningScreen() {
  return (
    <div className="rounded-2xl border border-border bg-[#0b1020]/70 p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Audit en ejecución</p>
          <p className="text-xs text-muted-foreground">Consultando motores IA y normalizando respuestas.</p>
        </div>
        <div className="h-3 w-3 animate-pulse rounded-full bg-primary" />
      </div>
      <div className="space-y-4">
        {engines.map((engine, index) => (
          <div key={engine} className="rounded-xl border border-border bg-secondary/20 p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span>{engine}</span>
              <span className="text-primary">{index < 3 ? "Completado" : "Analizando"}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <motion.div initial={{ width: 0 }} animate={{ width: `${index < 3 ? 100 : 72}%` }} transition={{ duration: 0.8 }} className="h-full rounded-full bg-gradient-to-r from-primary to-accent" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AuditResultsScreen() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-primary">GEO Audit completado</p>
          <h3 className="mt-2 text-2xl font-bold">Acme SaaS Platform</h3>
          <p className="text-sm text-muted-foreground">acme-saas.com · Colombia · Español</p>
        </div>
        <div className="rounded-2xl border border-primary/30 bg-primary/15 px-5 py-4 text-center">
          <div className="text-4xl font-bold text-primary">78</div>
          <div className="text-xs text-muted-foreground">GEO Score</div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[["AI Visibility", "64%"], ["Prompts ganados", "47/120"], ["Citaciones", "1,284"]].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-border bg-secondary/25 p-4">
            <div className="text-2xl font-bold">{value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-border bg-[#0b1020]/70 p-5">
        <div className="mb-4 flex items-center gap-2 font-semibold"><BarChart3 className="h-4 w-4 text-primary" />Motores analizados</div>
        <div className="space-y-3">
          {engines.map((engine, index) => (
            <div key={engine} className="flex items-center justify-between text-sm">
              <span>{engine}</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-28 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${82 - index * 9}%` }} /></div>
                <span className="w-8 text-right text-muted-foreground">{82 - index * 9}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CompetitorsScreen() {
  return (
    <div className="space-y-4">
      {["NovaCRM", "SalesPilot", "Monday", "HubSpot"].map((name, index) => (
        <div key={name} className="rounded-2xl border border-border bg-secondary/20 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="font-semibold">{name}</p>
              <p className="text-xs text-muted-foreground">Competidor detectado en respuestas IA</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs ${index === 0 ? "bg-red-500/15 text-red-300" : "bg-primary/15 text-primary"}`}>{index === 0 ? "Lidera" : "Oportunidad"}</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div><p className="text-muted-foreground">Score</p><p className="font-bold">{82 - index * 7}</p></div>
            <div><p className="text-muted-foreground">Prompts</p><p className="font-bold">{54 - index * 8}</p></div>
            <div><p className="text-muted-foreground">Citaciones</p><p className="font-bold">{320 - index * 48}</p></div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ActionsScreen() {
  return (
    <div className="space-y-4">
      {["Crear comparativas contra competidores principales", "Agregar schema y FAQs en páginas clave", "Publicar contenido para prompts perdidos", "Activar reporte semanal para monitoreo"].map((item, index) => (
        <div key={item} className="rounded-2xl border border-border bg-[#0b1020]/70 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-semibold">{item}</p>
              <p className="mt-1 text-sm text-muted-foreground">Impacto {index < 2 ? "alto" : "medio"} · estimado {index + 2} semanas</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
