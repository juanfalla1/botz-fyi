"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { ArrowLeft, CheckCircle2, Clipboard, FileText, Globe, Lightbulb, Megaphone, Rocket, Search, Sparkles, Target, Trophy, Users, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AppHeader } from "@/GEO/components/geo/app-shell"
import { useGeoI18n } from "@/GEO/components/geo/i18n"
import { supabaseGeo } from "@/app/geo/supabaseGeoClient"

type ActionItem = {
  id: string
  category: string
  title: string
  description: string
  why_important: string
  priority: "high" | "medium" | "low"
  estimated_impact: "high" | "medium" | "low"
  difficulty: "easy" | "medium" | "hard"
  type: string
  implementation_type: string
  affected_pages: string[]
  suggested_action: string
  deliverables: string[]
  improves_metric?: string
  estimated_score_lift?: { min: number; max: number }
  estimated_time?: string
  status: "pending" | "in_progress" | "implemented"
  audit_id: string
  created_at: string | null
}

type ActionPlan = {
  project: {
    id: string
    company_name: string
    website_url: string
    industry?: string | null
    business_goal?: string | null
  }
  latest_audit: {
    id: string
    geo_score: number
    ai_visibility: number
    spontaneous_visibility?: number
    assisted_visibility?: number
    competitive_visibility?: number
    citation_coverage?: number
    total_results?: number
    spontaneous_results?: number
    assisted_results?: number
    competitive_results?: number
    citation_results?: number
    prompts_won: number
    prompts_lost: number
    citations_count: number
    executive_summary: string
    completed_at: string | null
  } | null
  competitive_insights?: {
    tracked_competitors: number
    mentioned_competitors: number
    top_competitor: {
      name: string
      mentions: number
      engines: string[]
      best_position: number | null
    } | null
    competitors: Array<{
      name: string
      mentions: number
      engines: string[]
      best_position: number | null
    }>
  }
  execution_framework?: Array<{
    id: string
    name: string
    solves: string
    improves: string[]
    deliverables: string[]
  }>
  actions: ActionItem[]
}

export default function RecommendationsPage() {
  const params = useParams<{ projectId: string }>()
  const { locale } = useGeoI18n()
  const isEn = locale === "en"
  const [plan, setPlan] = useState<ActionPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generatedDeliverables, setGeneratedDeliverables] = useState<Record<string, string>>({})

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const {
          data: { session },
        } = await supabaseGeo.auth.getSession()
        if (!session?.access_token) throw new Error(isEn ? "Login required." : "Debes iniciar sesion.")
        const res = await fetch(`/api/geo/projects/${params.projectId}/action-plan?locale=${locale}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const json = (await res.json().catch(() => null)) as { data?: ActionPlan; error?: string } | null
        if (!res.ok || !json?.data) throw new Error(json?.error || (isEn ? "Could not load action plan." : "No se pudo cargar el plan de accion."))
        if (mounted) setPlan(json.data)
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : isEn ? "Could not load action plan." : "No se pudo cargar el plan de accion.")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [isEn, locale, params.projectId])

  const actions = useMemo(() => plan?.actions.map((action) => localizeAction(action, isEn)) ?? [], [isEn, plan?.actions])
  const topActions = useMemo(() => actions.filter((action) => action.priority === "high").slice(0, 3), [actions])

  return (
    <>
      <AppHeader />
      <div className="p-6 space-y-6">
        <div>
          <Button variant="ghost" className="mb-2 px-0 text-muted-foreground hover:text-foreground" asChild>
            <Link href={`/geo/app/projects/${params.projectId}`}><ArrowLeft className="mr-2 h-4 w-4" />{isEn ? "Back to project" : "Volver al proyecto"}</Link>
          </Button>
          <h2 className="text-2xl font-bold">{isEn ? "GEO Action Plan" : "Plan de Acción GEO"}</h2>
          <p className="text-muted-foreground">
            {isEn ? "Prioritized fixes, content assets and deliverables to improve AI visibility." : "Acciones, contenidos y entregables priorizados para mejorar la visibilidad en IA."}
          </p>
        </div>

        {loading && <Card className="glass border-border"><CardContent className="py-14 text-center text-muted-foreground">{isEn ? "Loading action plan..." : "Cargando plan de accion..."}</CardContent></Card>}
        {!loading && error && <Card className="glass border-border"><CardContent className="py-14 text-center text-muted-foreground">{error}</CardContent></Card>}

        {!loading && !error && plan && !plan.latest_audit && (
          <Card className="glass border-border">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Lightbulb className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-semibold">{isEn ? "No action plan yet" : "Aún no hay plan de acción"}</h3>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                {isEn ? "Run a GEO audit first. The plan will be generated from real audit evidence, not demo data." : "Primero ejecuta una auditoría GEO. El plan se generará desde evidencia real, no desde datos demo."}
              </p>
              <Button className="mt-6 bg-primary hover:bg-primary/90" asChild>
                <Link href="/geo/app/audits/new">{isEn ? "Run GEO Audit" : "Ejecutar auditoría GEO"}</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {!loading && !error && plan?.latest_audit && (
          <>
            <Card className="glass glow-primary border-primary/30 bg-primary/5">
              <CardContent className="p-6">
                <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-center">
                  <div>
                    <p className="text-sm uppercase tracking-wide text-primary">{plan.project.company_name}</p>
                    <h3 className="mt-2 text-2xl font-bold">{isEn ? "Audit result + execution plan" : "Resultado de auditoría + plan de ejecución"}</h3>
                    <p className="mt-3 text-muted-foreground">
                      {isEn ? `Botz GEO separates neutral discovery from assisted or comparative prompts. The value is not only the diagnosis: it is the execution roadmap to improve the next audit.` : "Botz GEO separa descubrimiento neutral de prompts asistidos o comparativos. El valor no es solo el diagnóstico: es el roadmap de ejecución para mejorar la próxima auditoría."}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Metric label="GEO Score" value={`${plan.latest_audit.geo_score || 0}/100`} />
                    <Metric label={isEn ? "Spontaneous Visibility" : "Visibilidad espontánea"} value={`${plan.latest_audit.spontaneous_visibility ?? plan.latest_audit.ai_visibility ?? 0}%`} />
                    <Metric label={isEn ? "Competitive Win Rate" : "Win rate competitivo"} value={`${plan.latest_audit.competitive_visibility ?? 0}%`} />
                    <Metric label={isEn ? "Citation Coverage" : "Cobertura de citations"} value={`${plan.latest_audit.citation_coverage ?? 0}%`} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><Search className="h-5 w-5 text-primary" />{isEn ? "Metric definitions" : "Definición de métricas"}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <MetricDefinition title="GEO Score" text={isEn ? "Strict 0-100 score weighted toward neutral prompts. Assisted comparison prompts do not inflate the main score." : "Score estricto de 0 a 100 ponderado hacia prompts neutrales. Los prompts comparativos asistidos no inflan el score principal."} />
                <MetricDefinition title={isEn ? "Spontaneous Visibility" : "Visibilidad espontánea"} text={isEn ? "Brand appeared without being named in the question. This is the strongest visibility signal." : "La marca apareció sin ser nombrada en la pregunta. Esta es la señal más fuerte de visibilidad real."} />
                <MetricDefinition title={isEn ? "Assisted Visibility" : "Visibilidad asistida"} text={isEn ? "Brand appeared when the prompt already mentioned it. Useful, but not proof of market awareness." : "La marca apareció cuando el prompt ya la mencionaba. Es útil, pero no prueba reconocimiento espontáneo del mercado."} />
                <MetricDefinition title={isEn ? "Citation Coverage" : "Cobertura de citations"} text={isEn ? "Citation/source prompts where evidence or citable URLs were found." : "Prompts de fuentes/citations donde se encontró evidencia o URLs citables."} />
              </CardContent>
            </Card>

            {plan.execution_framework && plan.execution_framework.length > 0 && (
              <Card className="glass border-primary/30 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg"><Megaphone className="h-5 w-5 text-primary" />{isEn ? "Execution with Botz" : "Ejecución con Botz"}</CardTitle>
                  <p className="text-sm text-muted-foreground">{isEn ? "The audit shows the gap. These Botz execution products are how the gap is closed." : "La auditoría muestra la brecha. Estos productos de ejecución Botz son cómo se cierra esa brecha."}</p>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {plan.execution_framework.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-border bg-background/40 p-4">
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                        {item.id.includes("website") ? <Globe className="h-5 w-5" /> : item.id.includes("landing") ? <FileText className="h-5 w-5" /> : item.id.includes("monitor") ? <Trophy className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                      </div>
                      <h4 className="font-semibold">{item.name}</h4>
                      <p className="mt-2 text-sm text-muted-foreground">{item.solves}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.improves.map((metric) => <span key={metric} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{metric}</span>)}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {topActions.length > 0 && (
              <Card className="glass border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg"><Rocket className="h-5 w-5 text-primary" />{isEn ? "First 3 moves" : "Primeros 3 movimientos"}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                  {topActions.map((action, index) => (
                    <div key={action.id} className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
                      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{index + 1}</div>
                      <h4 className="font-semibold">{action.title}</h4>
                      <p className="mt-2 text-sm text-muted-foreground">{action.suggested_action || action.description}</p>
                      <div className="mt-3 rounded-lg bg-background/40 p-3 text-xs text-muted-foreground">
                        {isEn ? "Affected" : "Dónde"}: {action.affected_pages.slice(0, 2).join(", ")}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {plan.competitive_insights && (
              <Card className="glass border-border bg-secondary/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Trophy className="h-5 w-5 text-primary" />
                    {isEn ? "Competitive intelligence" : "Inteligencia competitiva"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <Metric label={isEn ? "Tracked competitors" : "Competidores trackeados"} value={String(plan.competitive_insights.tracked_competitors || 0)} />
                    <Metric label={isEn ? "Mentioned by AI" : "Mencionados por IA"} value={String(plan.competitive_insights.mentioned_competitors || 0)} />
                    <Metric label={isEn ? "Top competitor" : "Competidor principal"} value={plan.competitive_insights.top_competitor?.name ?? "--"} />
                  </div>
                  {plan.competitive_insights.top_competitor ? (
                    <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                          <Users className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold">
                            {isEn ? "AI is already mentioning" : "La IA ya está mencionando a"} {plan.competitive_insights.top_competitor.name}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {isEn
                              ? `${plan.competitive_insights.top_competitor.name} appeared ${plan.competitive_insights.top_competitor.mentions} time(s) across ${plan.competitive_insights.top_competitor.engines.join(", ") || "AI engines"}. Prioritize comparison content and verifiable proof to displace this competitor.`
                              : `${plan.competitive_insights.top_competitor.name} apareció ${plan.competitive_insights.top_competitor.mentions} vez/veces en ${plan.competitive_insights.top_competitor.engines.join(", ") || "motores IA"}. Prioriza contenido comparativo y evidencia verificable para desplazarlo.`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="rounded-2xl border border-border bg-background/40 p-4 text-sm text-muted-foreground">
                      {plan.competitive_insights.tracked_competitors > 0
                        ? isEn ? "Competitors are linked to this project. Run an audit to detect which ones AI mentions." : "Hay competidores vinculados a este proyecto. Ejecuta una auditoría para detectar cuáles menciona la IA."
                        : isEn ? "Add competitors to this project to unlock competitive recommendations." : "Agrega competidores a este proyecto para activar recomendaciones competitivas."}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4">
              {actions.length === 0 && (
                <Card className="glass border-border"><CardContent className="py-10 text-center text-muted-foreground">{isEn ? "No recommendations were generated by the latest audits." : "Las últimas auditorías no generaron recomendaciones."}</CardContent></Card>
              )}
              {actions.map((action) => (
                <Card key={action.id} className={`glass border-border ${action.priority === "high" ? "border-primary/40" : ""}`}>
                  <CardContent className="p-5">
                    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
                      <div>
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${priorityClass(action.priority)}`}>{priorityLabel(action.priority, isEn)}</span>
                          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">{action.category}</span>
                          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">{typeLabel(action.type, isEn)}</span>
                          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">{isEn ? "Impact" : "Impacto"}: {levelLabel(action.estimated_impact, isEn)}</span>
                          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">{isEn ? "Difficulty" : "Dificultad"}: {difficultyLabel(action.difficulty, isEn)}</span>
                        </div>
                        <h3 className="text-lg font-semibold">{action.title}</h3>
                        <p className="mt-2 text-sm text-muted-foreground">{action.description}</p>
                        <div className="mt-4 rounded-xl border border-border bg-secondary/20 p-4">
                          <p className="mb-1 text-sm font-medium">{isEn ? "Why it matters" : "Por qué importa"}</p>
                          <p className="text-sm text-muted-foreground">{action.why_important}</p>
                        </div>
                        <div className="mt-4 rounded-xl border border-border bg-secondary/20 p-4">
                          <p className="mb-1 flex items-center gap-2 text-sm font-medium"><Target className="h-4 w-4 text-primary" />{isEn ? "Recommended action" : "Acción recomendada"}</p>
                          <p className="text-sm text-muted-foreground">{action.suggested_action || action.description}</p>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          <ActionStat label={isEn ? "Metric improved" : "Métrica que mejora"} value={action.improves_metric ?? metricFromType(action.type, isEn)} />
                          <ActionStat label={isEn ? "Potential lift" : "Mejora potencial"} value={scoreLiftLabel(action, isEn)} />
                          <ActionStat label={isEn ? "Estimated time" : "Tiempo estimado"} value={action.estimated_time ?? defaultTime(action.difficulty, isEn)} />
                          <ActionStat label={isEn ? "Expected impact" : "Impacto esperado"} value={`${levelLabel(action.estimated_impact, isEn)} · ${difficultyLabel(action.difficulty, isEn)}`} />
                        </div>
                        <div className="mt-4 rounded-xl border border-border bg-secondary/20 p-4">
                          <p className="mb-2 text-sm font-medium">{isEn ? "Affected pages" : "Páginas afectadas"}</p>
                          <div className="flex flex-wrap gap-2">
                            {action.affected_pages.map((page) => <span key={page} className="rounded-lg bg-background/50 px-2.5 py-1 text-xs text-muted-foreground">{page}</span>)}
                          </div>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-border bg-background/40 p-4">
                        <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><FileText className="h-4 w-4 text-primary" />{isEn ? "Deliverables to sell" : "Entregables para vender"}</p>
                        <div className="space-y-2">
                          {action.deliverables.map((item) => (
                            <div key={item} className="flex gap-2 text-sm text-muted-foreground">
                              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-5 rounded-xl bg-secondary/30 p-3 text-sm">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">{isEn ? "Implementation type" : "Tipo de implementación"}</p>
                          <p className="mt-1 font-medium">{action.implementation_type}</p>
                        </div>
                        <div className="mt-3 rounded-xl bg-secondary/30 p-3 text-sm">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">{isEn ? "Status" : "Estado"}</p>
                          <p className="mt-1 font-medium">{statusLabel(action.status, isEn)}</p>
                        </div>
                        <Button className="mt-4 w-full bg-primary hover:bg-primary/90" onClick={() => setGeneratedDeliverables((current) => ({ ...current, [action.id]: generateDeliverable(action, plan.project, isEn) }))}>
                          <Wand2 className="mr-2 h-4 w-4" />{isEn ? "Generate deliverable" : "Generar entregable"}
                        </Button>
                      </div>
                    </div>
                    {generatedDeliverables[action.id] && (
                      <div className="mt-5 rounded-2xl border border-primary/30 bg-primary/5 p-4">
                        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div><p className="text-sm font-semibold">{isEn ? "Generated deliverable" : "Entregable generado"}</p><p className="text-xs text-muted-foreground">{isEn ? "Editable draft based on this action." : "Borrador editable basado en esta acción."}</p></div>
                          <Button variant="outline" size="sm" className="border-border" onClick={() => void navigator.clipboard?.writeText(generatedDeliverables[action.id])}>
                            <Clipboard className="mr-2 h-4 w-4" />{isEn ? "Copy" : "Copiar"}
                          </Button>
                        </div>
                        <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-xl bg-background/70 p-4 text-sm leading-relaxed text-muted-foreground">{generatedDeliverables[action.id]}</pre>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="glass border-border bg-gradient-to-r from-primary/10 to-accent/10">
              <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-semibold"><Sparkles className="h-5 w-5 text-primary" />{isEn ? "Client-facing offer" : "Oferta para el cliente"}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {isEn ? "Use this plan as the implementation scope: we audit, prioritize and ship the content/technical assets needed to improve GEO visibility." : "Usa este plan como alcance de implementación: auditamos, priorizamos y entregamos los activos de contenido/técnicos para mejorar visibilidad GEO."}
                  </p>
                </div>
                <Button className="bg-primary hover:bg-primary/90" asChild>
                  <Link href={`/geo/app/projects/${params.projectId}/recommendations/report`}>{isEn ? "Open premium report" : "Ver / Exportar reporte"}</Link>
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-border bg-background/50 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>
}

function MetricDefinition({ title, text }: { title: string; text: string }) {
  return <div className="rounded-2xl border border-border bg-background/40 p-4"><p className="font-medium">{title}</p><p className="mt-1 text-sm text-muted-foreground">{text}</p></div>
}

function ActionStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-background/40 p-3"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>
}

function scoreLiftLabel(action: ActionItem, isEn: boolean) {
  const lift = action.estimated_score_lift
  if (!lift) return isEn ? "Estimated after implementation" : "Estimado tras implementación"
  return isEn ? `+${lift.min} to +${lift.max} GEO points` : `+${lift.min} a +${lift.max} puntos GEO`
}

function defaultTime(difficulty: ActionItem["difficulty"], isEn: boolean) {
  if (difficulty === "easy") return isEn ? "1 to 3 days" : "1 a 3 días"
  if (difficulty === "hard") return isEn ? "7 to 14 days" : "7 a 14 días"
  return isEn ? "3 to 7 days" : "3 a 7 días"
}

function metricFromType(type: string, isEn: boolean) {
  const value = type.toLowerCase()
  if (value.includes("competitive")) return isEn ? "Competitive win rate" : "Win rate competitivo"
  if (value.includes("authority")) return isEn ? "Citation coverage" : "Cobertura de citations"
  if (value.includes("technical")) return isEn ? "Positioning clarity" : "Claridad del posicionamiento"
  return isEn ? "Spontaneous visibility" : "Visibilidad espontánea"
}

function generateDeliverable(action: ActionItem, project: ActionPlan["project"], isEn: boolean) {
  const brand = project.company_name
  const industry = project.industry || (isEn ? "the target category" : "la categoría objetivo")
  const type = `${action.type} ${action.implementation_type} ${action.category}`.toLowerCase()
  if (type.includes("compar") || type.includes("competitive")) {
    return `${isEn ? "COMPARISON DELIVERABLE" : "ENTREGABLE COMPARATIVO"}

${isEn ? "Page title" : "Título de página"}: ${brand} vs competidor principal: diferencias, casos de uso y cuándo elegir cada opción

${isEn ? "Suggested structure" : "Estructura sugerida"}:
1. ${isEn ? "Executive summary: who each option is for" : "Resumen ejecutivo: para quién sirve cada opción"}
2. ${isEn ? "Comparison table: use case, scope, integrations, support, pricing model, implementation time" : "Tabla comparativa: caso de uso, alcance, integraciones, soporte, modelo de precio, tiempo de implementación"}
3. ${isEn ? "Why choose" : "Por qué elegir"} ${brand}
4. ${isEn ? "When another alternative may fit better" : "Cuándo otra alternativa puede encajar mejor"}
5. FAQs para intención de decisión
6. CTA: ${isEn ? "Request a GEO/implementation diagnosis" : "Solicitar diagnóstico GEO/implementación"}

${isEn ? "SEO/GEO copy base" : "Copy base SEO/GEO"}:
${brand} is an option for companies in ${industry} that need a clear, implementable solution with measurable outcomes. This page compares alternatives using practical criteria and verifiable proof.

FAQs:
- ¿Qué diferencia a ${brand} frente a alternativas?
- ¿Para qué tipo de empresa conviene ${brand}?
- ¿Qué resultados se pueden medir?
- ¿Cuánto tarda implementar la solución?`
  }
  if (type.includes("landing") || type.includes("content")) {
    return `${isEn ? "LANDING / CONTENT DELIVERABLE" : "ENTREGABLE LANDING / CONTENIDO"}

${isEn ? "Page objective" : "Objetivo de la página"}: aumentar visibilidad espontánea para prompts de ${industry}.

${isEn ? "Suggested sections" : "Secciones sugeridas"}:
1. Hero: qué hace ${brand}, para quién y resultado principal.
2. Problema del cliente en ${industry}.
3. Solución de ${brand}.
4. Casos de uso principales.
5. Diferenciadores verificables.
6. Prueba social o evidencia.
7. FAQs optimizadas para IA.
8. CTA claro.

${isEn ? "Base copy" : "Copy base"}:
${brand} ayuda a empresas de ${industry} a resolver problemas concretos con una propuesta clara, medible y fácil de implementar. La página debe explicar el contexto, los beneficios y las razones por las que un motor de IA debería recomendar la marca.

FAQs:
- ¿Qué es ${brand}?
- ¿Para quién sirve ${brand}?
- ¿Qué problema resuelve en ${industry}?
- ¿Qué diferencia a ${brand} de otras alternativas?
- ¿Cómo se mide el resultado?`
  }
  if (type.includes("faq") || type.includes("technical")) {
    return `${isEn ? "FAQ / AI STRUCTURE DELIVERABLE" : "ENTREGABLE FAQ / ESTRUCTURA IA"}

${isEn ? "Goal" : "Objetivo"}: mejorar claridad del posicionamiento y facilitar extracción de respuestas por motores IA.

Preguntas y respuestas sugeridas:
1. ¿Qué es ${brand}?
Respuesta: ${brand} es una solución para ${industry} enfocada en resolver un problema específico con resultados medibles.

2. ¿Para quién es ${brand}?
Respuesta: Para empresas que necesitan una solución clara, implementable y orientada a resultados.

3. ¿Qué problema resuelve ${brand}?
Respuesta: Resuelve brechas de claridad, ejecución o visibilidad dentro de ${industry}.

4. ¿Por qué elegir ${brand}?
Respuesta: Por su enfoque práctico, entregables concretos y capacidad de medir avance.

5. ¿Cómo se mide el éxito?
Respuesta: Con métricas como GEO Score, visibilidad espontánea, win rate competitivo y cobertura de citations.

${isEn ? "Implementation" : "Implementación"}: publicar estas FAQs visibles en la página y agregar FAQPage JSON-LD si aplica.`
  }
  return `${isEn ? "ACTION DELIVERABLE" : "ENTREGABLE DE ACCIÓN"}

${isEn ? "Action" : "Acción"}: ${action.title}

${isEn ? "What to create" : "Qué crear"}:
${action.deliverables.map((item) => `- ${item}`).join("\n")}

${isEn ? "Recommended execution" : "Ejecución recomendada"}:
${action.suggested_action}

${isEn ? "Metric to improve" : "Métrica a mejorar"}: ${action.improves_metric ?? metricFromType(action.type, isEn)}

${isEn ? "Expected impact" : "Impacto esperado"}: ${scoreLiftLabel(action, isEn)} si se implementa correctamente.`
}

function priorityLabel(priority: ActionItem["priority"], isEn: boolean) {
  if (priority === "high") return isEn ? "High priority" : "Alta prioridad"
  if (priority === "low") return isEn ? "Low priority" : "Baja prioridad"
  return isEn ? "Medium priority" : "Prioridad media"
}

function priorityClass(priority: ActionItem["priority"]) {
  if (priority === "high") return "bg-red-500/15 text-red-300"
  if (priority === "low") return "bg-green-500/15 text-green-300"
  return "bg-yellow-500/15 text-yellow-300"
}

function typeLabel(type: string, isEn: boolean) {
  const value = type.toLowerCase()
  if (value.includes("technical")) return isEn ? "Technical GEO" : "GEO técnico"
  if (value.includes("authority")) return isEn ? "Authority" : "Autoridad"
  if (value.includes("competitive")) return isEn ? "Competitive" : "Competitivo"
  return isEn ? "Content" : "Contenido"
}

function levelLabel(level: "high" | "medium" | "low", isEn: boolean) {
  if (level === "high") return isEn ? "High" : "Alto"
  if (level === "low") return isEn ? "Low" : "Bajo"
  return isEn ? "Medium" : "Medio"
}

function difficultyLabel(level: ActionItem["difficulty"], isEn: boolean) {
  if (level === "easy") return isEn ? "Easy" : "Fácil"
  if (level === "hard") return isEn ? "Hard" : "Difícil"
  return isEn ? "Medium" : "Media"
}

function statusLabel(status: ActionItem["status"], isEn: boolean) {
  if (status === "implemented") return isEn ? "Implemented" : "Implementado"
  if (status === "in_progress") return isEn ? "In progress" : "En progreso"
  return isEn ? "Pending" : "Pendiente"
}

function localizeAction(action: ActionItem, isEn: boolean): ActionItem {
  if (!isEn) return action
  const map: Record<string, Partial<ActionItem>> = {
    "homepage-ai-positioning": {
      category: "Brand positioning",
      title: "Rewrite the homepage so AI understands exactly what the company sells",
      description: "The audit shows low AI visibility. The homepage must explain in direct language what the company does, who it serves, where it operates and why it should be recommended over alternatives.",
      why_important: "Generative models extract entities, use cases and differentiators from clear pages. If the homepage is vague, AI has fewer strong reasons to recommend the brand.",
      suggested_action: "Add a clear above-the-fold value proposition, a who-it-is-for section, differentiators, use cases, social proof and AI-oriented FAQs.",
      implementation_type: "Copy + landing structure",
      deliverables: ["New hero value proposition", "Use-case section", "Why choose us block", "AI prompt-oriented FAQs"],
    },
    "industry-landing": {
      category: "Industry content",
      title: "Create a specific landing page for SaaS / Software",
      description: "The client needs pages that answer specific prompts, not just a general page. An industry landing page helps capture AI recommendations when users ask for solutions in a concrete sector.",
      why_important: "ChatGPT, Gemini and Perplexity tend to recommend brands with explicit content for the use case or industry mentioned in the prompt.",
      suggested_action: "Create a SaaS / Software page with problem, solution, benefits, use cases, FAQs, social proof and CTA.",
      implementation_type: "New page / landing",
      deliverables: ["Industry landing page", "Complete copy", "Niche FAQs", "SEO/GEO metadata"],
    },
    "comparison-page": {
      category: "Competitive comparison",
      title: "Create comparison pages against competitors and alternatives",
      description: "The brand needs decision-stage content for prompts where users compare options. Without comparison pages, AI often relies on competitors that explain differences clearly.",
      why_important: "Prompts such as best, alternatives, vs and compare are high-intent commercial queries.",
      suggested_action: "Publish an alternatives hub and individual Brand vs Competitor pages with differences, use cases, pricing/scope and FAQs.",
      implementation_type: "New comparison page",
      deliverables: ["Alternatives page", "Brand vs Competitor template", "Comparison table", "Decision FAQs"],
    },
    "faq-schema": {
      category: "AI structure",
      title: "Add FAQs and JSON-LD schema to core pages",
      description: "Pages should answer concrete questions users ask AI engines. Those answers must be visible and structured.",
      why_important: "FAQs help models extract direct answers, and schema improves semantic clarity for search and retrieval systems.",
      suggested_action: "Add 6 to 10 real questions per page: what it is, who it is for, difference vs alternatives, benefits, integrations, pricing or next step. Publish FAQPage JSON-LD where appropriate.",
      implementation_type: "Content + JSON-LD",
      deliverables: ["FAQ block", "FAQPage JSON-LD", "Questions by search intent", "Schema validation"],
    },
    "authority-proof": {
      category: "Authority and trust",
      title: "Publish verifiable proof: case studies, results and citable sources",
      description: "The audit shows few citations. The brand needs assets AI can use as evidence: cases, metrics, clients, integrations, certifications or source articles.",
      why_important: "AI engines cite and recommend with more confidence when they find external evidence or pages with verifiable claims.",
      suggested_action: "Create at least one case study, a resources page and social-proof blocks on the homepage/landings with concrete verifiable results.",
      implementation_type: "Authority content",
      deliverables: ["Case study", "Social proof block", "Sourced claims", "Citable resources page"],
    },
    "local-authority-distribution": {
      category: "Local authority distribution",
      title: "Turn local presence into citable signals, not just social posting",
      description: "Social media and influencer recommendations must become assets AI can find: mentions, articles, partnerships, events and linkable pages.",
      why_important: "Social media helps distribution, but GEO visibility improves when those actions generate indexable pages, mentions and sources.",
      suggested_action: "Create a partnerships/participation page and turn local collaborations into articles, mentions and verifiable backlinks.",
      implementation_type: "PR + indexable content",
      deliverables: ["Partnerships page", "Local PR brief", "Media/partner list", "Indexable collaboration content"],
    },
  }
  return { ...action, ...(map[action.id] ?? {}) }
}
