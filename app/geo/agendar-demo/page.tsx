"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft, Calendar, CheckCircle2, Loader2, Mail, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Navbar } from "@/GEO/components/landing/navbar"

export default function ScheduleGeoDemoPage() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle")
  const [message, setMessage] = useState<string | null>(null)
  const calendarUrl = process.env.NEXT_PUBLIC_GEO_DEMO_CALENDAR_URL

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    setStatus("sending")
    setMessage(null)
    const form = new FormData(formElement)
    const nombre = String(form.get("nombre") ?? "").trim()
    const email = String(form.get("email") ?? "").trim()
    const empresa = String(form.get("empresa") ?? "").trim()
    const website = String(form.get("website") ?? "").trim()
    const telefono = String(form.get("telefono") ?? "").trim()
    const interes = String(form.get("interes") ?? "").trim()

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          empresa,
          email,
          website,
          telefono: telefono || "No informado",
          source: "geo-demo",
          interes,
        }),
      })
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string }
        if (json.error === "EMAIL_NOT_CONFIGURED") throw new Error("El correo de recepción no está configurado todavía.")
        if (json.error === "RATE_LIMITED") throw new Error("Demasiados intentos. Intenta de nuevo en unos minutos.")
        throw new Error("No se pudo enviar la solicitud.")
      }
      setStatus("sent")
      setMessage("Solicitud recibida. Te contactaremos para coordinar la demo personalizada.")
      formElement.reset()
    } catch (error) {
      setStatus("error")
      setMessage(error instanceof Error ? error.message : "No pudimos enviar el formulario ahora. Intenta de nuevo o escríbenos directamente.")
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />
      <section className="relative px-4 pt-32 pb-24 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute left-1/3 top-24 h-[520px] w-[620px] rounded-full bg-primary/20 blur-[140px]" />
          <div className="absolute right-1/4 bottom-16 h-[420px] w-[420px] rounded-full bg-accent/20 blur-[120px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl">
          <Link href="/geo" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Volver a GEO
          </Link>

          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4 text-primary" />
                <span>Demo personalizada</span>
              </div>
              <h1 className="text-balance text-4xl font-bold leading-tight sm:text-5xl">
                Agenda una demo de <span className="text-gradient">Botz GEO</span>
              </h1>
              <p className="mt-5 text-lg text-muted-foreground text-pretty">
                Te mostramos cómo medir tu visibilidad en motores de IA, comparar competidores y convertir brechas en acciones concretas.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  "Revisión rápida de tu marca y dominio",
                  "Ejemplo de GEO Audit y lectura de resultados",
                  "Plan de próximos pasos para prompts, contenido y reportes",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl border border-border bg-secondary/20 p-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span className="text-sm text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>

              {calendarUrl && (
                <Button className="mt-8 bg-primary hover:bg-primary/90 glow-primary" asChild>
                  <a href={calendarUrl} target="_blank" rel="noreferrer">
                    <Calendar className="mr-2 h-4 w-4" /> Elegir horario en calendario
                  </a>
                </Button>
              )}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
              <Card className="glass border-border glow-primary">
                <CardContent className="p-6 md:p-8">
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Solicitar demo</h2>
                      <p className="text-sm text-muted-foreground">Te llegaremos por correo y WhatsApp para coordinar el horario.</p>
                    </div>
                  </div>

                  {message && (
                    <div className={`mb-5 rounded-xl border px-4 py-3 text-sm ${status === "sent" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-red-500/30 bg-red-500/10 text-red-300"}`}>
                      {message}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
                    <input name="nombre" required placeholder="Nombre" className="h-12 rounded-xl border border-border bg-secondary/40 px-4 outline-none transition-colors focus:border-primary/60" />
                    <input name="email" required type="email" placeholder="Email" className="h-12 rounded-xl border border-border bg-secondary/40 px-4 outline-none transition-colors focus:border-primary/60" />
                    <input name="empresa" required placeholder="Empresa" className="h-12 rounded-xl border border-border bg-secondary/40 px-4 outline-none transition-colors focus:border-primary/60" />
                    <input name="website" type="url" placeholder="Website" className="h-12 rounded-xl border border-border bg-secondary/40 px-4 outline-none transition-colors focus:border-primary/60" />
                    <input name="telefono" placeholder="Teléfono o WhatsApp" className="h-12 rounded-xl border border-border bg-secondary/40 px-4 outline-none transition-colors focus:border-primary/60 sm:col-span-2" />
                    <textarea name="interes" required rows={5} placeholder="Cuéntanos qué quieres medir: marca, competidores, país, motores IA..." className="rounded-xl border border-border bg-secondary/40 px-4 py-3 outline-none transition-colors focus:border-primary/60 sm:col-span-2" />
                    <Button disabled={status === "sending"} className="h-12 bg-primary hover:bg-primary/90 glow-primary sm:col-span-2">
                      {status === "sending" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</> : <><Mail className="mr-2 h-4 w-4" /> Solicitar demo</>}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground sm:col-span-2">
                      La información se envía al correo comercial configurado en Botz.
                    </p>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>
    </main>
  )
}
