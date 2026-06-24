"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AppHeader } from "@/GEO/components/geo/app-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getMySubscription, type GeoSubscription, type GeoUsageEvent } from "@/GEO/lib/billing"
import { useGeoI18n } from "@/GEO/components/geo/i18n"
import { supabaseGeo } from "@/app/geo/supabaseGeoClient"
import { GEO_PLAN_LIMITS } from "@/lib/geo/plans"

export default function BillingPage() {
  const { locale } = useGeoI18n()
  const [subscription, setSubscription] = useState<GeoSubscription | null>(null)
  const [events, setEvents] = useState<GeoUsageEvent[]>([])
  const [usageTotals, setUsageTotals] = useState<Record<string, number>>({})
  const [feedback, setFeedback] = useState<string | null>(null)
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    void Promise.all([getMySubscription(), (async () => {
      const {
        data: { session },
      } = await supabaseGeo.auth.getSession()
      if (!session?.access_token) return { events: [] as GeoUsageEvent[], totals: {} as Record<string, number> }
      const res = await fetch("/api/geo/usage", { headers: { Authorization: `Bearer ${session.access_token}` } })
      if (!res.ok) return { events: [] as GeoUsageEvent[], totals: {} as Record<string, number> }
      const json = (await res.json()) as { data?: { events?: GeoUsageEvent[]; totals?: Record<string, number> } }
      return { events: json.data?.events ?? [], totals: json.data?.totals ?? {} }
    })()])
      .then(([sub, usage]) => {
        if (!mounted) return
        setSubscription(sub)
        setEvents(usage.events)
        setUsageTotals(usage.totals)
      })
      .catch(() => {
        if (!mounted) return
        setSubscription(null)
        setEvents([])
        setUsageTotals({})
      })
    return () => {
      mounted = false
    }
  }, [])

  const startCheckout = async (plan: "starter" | "growth") => {
    setLoadingPlan(plan)
    setFeedback(null)
    try {
      const {
        data: { session },
      } = await supabaseGeo.auth.getSession()
      if (!session?.access_token) throw new Error("Unauthorized")
      const res = await fetch("/api/geo/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ plan }),
      })
      const json = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !json.url) throw new Error(json.error || "Could not start checkout")
      window.location.href = json.url
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : locale === "en" ? "Could not start checkout." : "No se pudo iniciar el checkout.")
      setLoadingPlan(null)
    }
  }

  const openBillingPortal = async () => {
    setLoadingPlan("portal")
    setFeedback(null)
    try {
      const {
        data: { session },
      } = await supabaseGeo.auth.getSession()
      if (!session?.access_token) throw new Error("Unauthorized")
      const res = await fetch("/api/geo/billing/portal", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` } })
      const json = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !json.url) throw new Error(json.error || "Could not open billing portal")
      window.location.href = json.url
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : locale === "en" ? "Could not open billing portal." : "No se pudo abrir el portal de facturacion.")
      setLoadingPlan(null)
    }
  }

  const auditsUsed = subscription?.audits_used ?? 0
  const auditsLimit = subscription?.audits_limit ?? 3
  const promptsUsed = subscription?.prompts_used ?? 0
  const promptsLimit = subscription?.prompts_limit ?? 25
  const projectsLimit = subscription?.projects_limit ?? GEO_PLAN_LIMITS.trial.projects_limit
  const auditPct = Math.min(100, Math.round((auditsUsed / Math.max(1, auditsLimit)) * 100))
  const promptPct = Math.min(100, Math.round((promptsUsed / Math.max(1, promptsLimit)) * 100))
  const periodEnd = subscription?.current_period_end ? new Date(subscription.current_period_end) : new Date(Date.now() + 1000 * 60 * 60 * 24 * 3)
  const resetLabel = periodEnd.toLocaleDateString(locale === "en" ? "en-US" : "es-ES", { month: "short", day: "numeric" })
  const daysLeft = Math.ceil((periodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const trialEnded = subscription?.plan === "trial" && daysLeft <= 0
  const trialAlmostEnded = subscription?.plan === "trial" && daysLeft > 0 && daysLeft <= 3
  const auditLimitReached = auditsUsed >= auditsLimit
  const promptLimitReached = promptsUsed >= promptsLimit
  const requestedPlan = typeof subscription?.metadata?.requested_plan === "string" ? subscription.metadata.requested_plan : null

  const usageColor = (pct: number) => {
    if (pct > 95) return "bg-red-500"
    if (pct > 80) return "bg-amber-400"
    return "bg-blue-500"
  }

  const statusLabel =
    subscription?.status === "active"
      ? locale === "en"
        ? "Active"
        : "Activo"
      : subscription?.status === "past_due"
        ? locale === "en"
          ? "Past due"
          : "Pago vencido"
        : subscription?.status === "canceled"
          ? locale === "en"
            ? "Canceled"
            : "Cancelado"
          : locale === "en"
            ? "Inactive"
            : "Inactivo"

  return (
    <>
      <AppHeader />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{locale === "en" ? "Billing" : "Facturación"}</h2>
            <p className="text-muted-foreground">{locale === "en" ? "Plan, limits, usage and upgrades" : "Plan, límites, consumo y mejoras"}</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/geo/app">{locale === "en" ? "Back to dashboard" : "Volver al dashboard"}</Link>
          </Button>
        </div>
        {feedback && <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">{feedback}</div>}

        <Card className="glass border-border">
          <CardHeader>
            <CardTitle>{locale === "en" ? "Current plan" : "Plan actual"}</CardTitle>
            <CardDescription>{locale === "en" ? "Every account starts with a free trial. We notify you before it ends and when limits are reached." : "Cada cuenta inicia con una prueba gratis. Te avisamos antes de que termine y cuando alcances los límites."}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 md:grid-cols-3">
              <p className="capitalize text-sm"><strong>{locale === "en" ? "Plan" : "Plan"}:</strong> {subscription?.plan ?? "trial"}</p>
              <p className="text-sm"><strong>{locale === "en" ? "Plan status" : "Estado del plan"}:</strong> {statusLabel}</p>
              <p className="text-sm"><strong>{locale === "en" ? "Monthly usage" : "Consumo mensual"}:</strong> {auditsUsed + promptsUsed}</p>
              <p className="text-sm"><strong>{locale === "en" ? "Brand limit" : "Limite de marcas"}:</strong> {projectsLimit >= 1000000 ? (locale === "en" ? "Unlimited" : "Ilimitadas") : projectsLimit}</p>
              {requestedPlan && <p className="capitalize text-sm"><strong>{locale === "en" ? "Requested plan" : "Plan elegido"}:</strong> {requestedPlan}</p>}
            </div>

            {(trialEnded || trialAlmostEnded || auditLimitReached || promptLimitReached) && (
              <div className={`rounded-xl border px-4 py-3 text-sm ${trialEnded || auditLimitReached || promptLimitReached ? "border-red-500/30 bg-red-500/10 text-red-200" : "border-amber-400/30 bg-amber-400/10 text-amber-100"}`}>
                {trialEnded
                  ? locale === "en" ? "Your free trial ended. Upgrade to keep running audits and prompts." : "Tu prueba gratis terminó. Mejora tu plan para seguir ejecutando auditorías y prompts."
                  : auditLimitReached || promptLimitReached
                    ? locale === "en" ? "You reached a free trial limit. Upgrade to continue." : "Alcanzaste un límite de la prueba gratis. Mejora tu plan para continuar."
                    : locale === "en" ? `Your free trial ends in ${daysLeft} day(s).` : `Tu prueba gratis termina en ${daysLeft} día(s).`}
              </div>
            )}

            <div className="space-y-4 rounded-xl border border-border/80 bg-secondary/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{locale === "en" ? "Monthly usage" : "Consumo mensual"}</p>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{auditsUsed} / {auditsLimit} GEO audits {locale === "en" ? "used" : "usados"}</span>
                  <span className="font-semibold">{auditPct}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted/60 overflow-hidden">
                  <div className={`h-full rounded-full ${usageColor(auditPct)}`} style={{ width: `${auditPct}%` }} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{promptsUsed} / {promptsLimit} prompts {locale === "en" ? "used" : "usados"}</span>
                  <span className="font-semibold">{promptPct}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted/60 overflow-hidden">
                  <div className={`h-full rounded-full ${usageColor(promptPct)}`} style={{ width: `${promptPct}%` }} />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">{subscription?.plan === "trial" ? (locale === "en" ? `Free trial ends on ${resetLabel}` : `La prueba gratis termina el ${resetLabel}`) : (locale === "en" ? `Resets on ${resetLabel}` : `Reinicia el ${resetLabel}`)}</p>
            </div>

            {!!Object.keys(usageTotals).length && (
              <p className="text-xs text-muted-foreground">
                {locale === "en" ? "Backend totals loaded from usage API." : "Totales reales cargados desde la API de uso."}
              </p>
            )}

            {subscription?.stripe_customer_id && (
              <Button className="mt-3 bg-primary hover:bg-primary/90" onClick={openBillingPortal} disabled={loadingPlan === "portal"}>
                {loadingPlan === "portal" ? (locale === "en" ? "Opening..." : "Abriendo...") : locale === "en" ? "Manage billing" : "Gestionar facturación"}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="glass border-border">
          <CardHeader>
            <CardTitle>{locale === "en" ? "Usage history" : "Historial de uso"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {events.length === 0 && <p className="text-sm text-muted-foreground">{locale === "en" ? "No usage events yet." : "Sin eventos de uso aun."}</p>}
              {events.map((event) => (
                <div key={event.id} className="flex items-center justify-between rounded-lg bg-secondary/30 p-3 text-sm">
                  <span>{event.event_type}</span>
                  <span className="text-muted-foreground">{new Date(event.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-3 gap-4">
          <Card className="glass border-border">
            <CardHeader>
              <CardTitle className="tracking-tight">Starter</CardTitle>
              <CardDescription>$29/mo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>1 marca</li>
                <li>10 GEO audits/mes</li>
                <li>100 prompts monitoreados</li>
                <li>{locale === "en" ? "Basic dashboard" : "Dashboard básico"}</li>
                <li>{locale === "en" ? "Monthly reports" : "Reportes mensuales"}</li>
                <li>{locale === "en" ? "Email support" : "Soporte por email"}</li>
              </ul>
              <Button className="w-full" onClick={() => startCheckout("starter")} disabled={Boolean(loadingPlan)}>
                {loadingPlan === "starter" ? (locale === "en" ? "Opening checkout..." : "Abriendo checkout...") : locale === "en" ? "Buy Starter" : "Comprar Starter"}
              </Button>
            </CardContent>
          </Card>

          <Card className="glass border-primary/60 shadow-[0_0_32px_rgba(59,130,246,0.18)]">
            <CardHeader>
              <div className="inline-flex w-fit items-center rounded-full border border-primary/40 bg-primary/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">{locale === "en" ? "Best value" : "Mejor valor"}</div>
              <CardTitle className="tracking-tight">Growth</CardTitle>
              <CardDescription>$149/mo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>5 marcas</li>
                <li>100 GEO audits/mes</li>
                <li>1000 prompts monitoreados</li>
                <li>{locale === "en" ? "Competitor tracking" : "Tracking de competidores"}</li>
                <li>{locale === "en" ? "Content recommendations" : "Recomendaciones de contenido"}</li>
                <li>{locale === "en" ? "Advanced monitoring" : "Monitoreo avanzado"}</li>
                <li>{locale === "en" ? "Weekly reports" : "Reportes semanales"}</li>
                <li>{locale === "en" ? "Priority support" : "Soporte prioritario"}</li>
              </ul>
              <Button className="w-full" onClick={() => startCheckout("growth")} disabled={Boolean(loadingPlan)}>
                {loadingPlan === "growth" ? (locale === "en" ? "Opening checkout..." : "Abriendo checkout...") : locale === "en" ? "Buy Growth" : "Comprar Growth"}
              </Button>
            </CardContent>
          </Card>

          <Card className="glass border-border">
            <CardHeader>
              <CardTitle className="tracking-tight">Enterprise</CardTitle>
              <CardDescription>{locale === "en" ? "Contact sales" : "Contactar ventas"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>Marcas ilimitadas</li>
                <li>{locale === "en" ? "API access" : "Acceso API"}</li>
                <li>{locale === "en" ? "24/7 continuous monitoring" : "Monitoreo continuo 24/7"}</li>
                <li>{locale === "en" ? "Custom reports" : "Reportes personalizados"}</li>
                <li>{locale === "en" ? "Custom integrations" : "Integraciones personalizadas"}</li>
                <li>{locale === "en" ? "Dedicated account manager" : "Account manager dedicado"}</li>
                <li>{locale === "en" ? "Maximum priority" : "Prioridad máxima"}</li>
              </ul>
              <Button className="w-full" asChild>
                <Link href="/geo/agendar-demo?plan=enterprise">{locale === "en" ? "Request early access" : "Solicitar acceso temprano"}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="pt-2 text-center text-sm text-muted-foreground">
          <p>{locale === "en" ? "Secure payment powered by Stripe for Starter and Growth" : "Pago seguro con Stripe para Starter y Growth"}</p>
          <p>{locale === "en" ? "Cancel anytime" : "Cancela cuando quieras"}</p>
          <p>{locale === "en" ? "Powered by GPT, Gemini & Perplexity" : "Impulsado por GPT, Gemini y Perplexity"}</p>
        </div>
      </div>
    </>
  )
}
