"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { ArrowLeft, CheckCircle2, Clipboard, Download, FileText, Globe, Lightbulb, Megaphone, Rocket, Search, Sparkles, Target, Trophy, Users, Wand2, X } from "lucide-react"
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
  evidence?: Array<{ label: string; value: string }>
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
  previous_audit?: {
    id: string
    completed_at: string | null
    geo_score: number
    spontaneous_visibility: number
    competitive_visibility: number
    citation_coverage: number
    delta: { geo_score: number; spontaneous_visibility: number; competitive_visibility: number; citation_coverage: number } | null
  } | null
  crawl_evidence?: {
    pages_crawled: number
    total_words: number
    pages: Array<{ url: string; title: string | null; description: string | null; word_count: number | null }>
  }
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

type DeliverableKind = "landing" | "comparison" | "alternative" | "content" | "faq" | "generic"

type DeliverableDraft = {
  action: ActionItem
  kind: DeliverableKind
  content: string
  warning: string | null
}

export default function RecommendationsPage() {
  const params = useParams<{ projectId: string }>()
  const { locale } = useGeoI18n()
  const isEn = locale === "en"
  const [plan, setPlan] = useState<ActionPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deliverableDraft, setDeliverableDraft] = useState<DeliverableDraft | null>(null)

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
  const hasCompetitiveSample = (plan?.latest_audit?.competitive_results ?? 0) > 0

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
                    <Metric label={isEn ? "Competitive Win Rate" : "Win rate competitivo"} value={hasCompetitiveSample ? `${plan.latest_audit.competitive_visibility ?? 0}%` : (isEn ? "No sample" : "Sin muestra")} />
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

            <Card className="glass border-border bg-secondary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><CheckCircle2 className="h-5 w-5 text-primary" />{isEn ? "Evidence and progress validation" : "Evidencia y validación de progreso"}</CardTitle>
                <p className="text-sm text-muted-foreground">{isEn ? "Recommendations below are tied to audit evidence, crawled pages when available, and the previous audit baseline." : "Las recomendaciones de abajo se conectan con evidencia de auditoría, páginas leídas cuando estén disponibles y la auditoría anterior como baseline."}</p>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                <Metric label={isEn ? "Crawled pages" : "Páginas leídas"} value={String(plan.crawl_evidence?.pages_crawled ?? 0)} />
                <Metric label={isEn ? "Crawled words" : "Palabras leídas"} value={String(plan.crawl_evidence?.total_words ?? 0)} />
                <Metric label={isEn ? "GEO change" : "Cambio GEO"} value={plan.previous_audit?.delta ? formatUiDelta(plan.previous_audit.delta.geo_score) : (isEn ? "No baseline" : "Sin baseline")} />
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
                    <Metric label={isEn ? "Mentioned in competitive sample" : "Mencionados en muestra competitiva"} value={hasCompetitiveSample ? String(plan.competitive_insights.mentioned_competitors || 0) : (isEn ? "No sample" : "Sin muestra")} />
                    <Metric label={isEn ? "Top competitor" : "Competidor principal"} value={hasCompetitiveSample ? (plan.competitive_insights.top_competitor?.name ?? "--") : (isEn ? "No sample" : "Sin muestra")} />
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
                        ? hasCompetitiveSample
                          ? (isEn ? "No dominant competitor was detected in this competitive sample." : "No se detectó un competidor dominante en esta muestra competitiva.")
                          : (isEn ? "Competitors are linked, but this audit did not collect a competitive sample. Add or run comparison prompts before drawing competitor conclusions." : "Hay competidores vinculados, pero esta auditoría no recolectó muestra competitiva. Agrega o corre prompts comparativos antes de concluir sobre competidores.")
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
                        {action.evidence && action.evidence.length > 0 && (
                          <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
                            <p className="mb-2 text-sm font-medium text-primary">{isEn ? "Evidence behind this action" : "Evidencia detrás de esta acción"}</p>
                            <div className="space-y-2">
                              {action.evidence.map((item) => <div key={`${action.id}-${item.label}`} className="text-sm text-muted-foreground"><span className="font-medium text-foreground">{item.label}:</span> {item.value}</div>)}
                            </div>
                          </div>
                        )}
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
                        <Button className="mt-4 w-full bg-primary hover:bg-primary/90" onClick={() => setDeliverableDraft(createDeliverableDraft(action, plan.project, isEn))}>
                          <Wand2 className="mr-2 h-4 w-4" />{isEn ? "Generate deliverable" : "Generar entregable"}
                        </Button>
                      </div>
                    </div>
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
      {deliverableDraft && plan && (
        <DeliverableDrawer
          draft={deliverableDraft}
          project={plan.project}
          isEn={isEn}
          onChange={(content) => setDeliverableDraft((current) => current ? { ...current, content } : current)}
          onClose={() => setDeliverableDraft(null)}
        />
      )}
    </>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-border bg-background/50 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>
}

function MetricDefinition({ title, text }: { title: string; text: string }) {
  return <div className="rounded-2xl border border-border bg-background/40 p-4"><p className="font-medium">{title}</p><p className="mt-1 text-sm text-muted-foreground">{text}</p></div>
}

function DeliverableDrawer({ draft, project, isEn, onChange, onClose }: { draft: DeliverableDraft; project: ActionPlan["project"]; isEn: boolean; onChange: (content: string) => void; onClose: () => void }) {
  const action = draft.action
  return (
    <div className="fixed inset-0 z-[80] bg-background/70 backdrop-blur-sm">
      <button type="button" className="absolute inset-0 cursor-default" aria-label={isEn ? "Close deliverable" : "Cerrar entregable"} onClick={onClose} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-3xl flex-col border-l border-border bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-primary">{deliverableKindLabel(draft.kind, isEn)}</p>
            <h3 className="mt-2 text-xl font-semibold">{isEn ? "Generated deliverable" : "Entregable generado"}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{isEn ? "Editable first draft ready to refine, publish or share." : "Primer borrador editable listo para refinar, publicar o compartir."}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="grid gap-4 border-b border-border p-5 sm:grid-cols-2 xl:grid-cols-4">
          <ActionStat label={isEn ? "Original action" : "Acción original"} value={action.title} />
          <ActionStat label={isEn ? "Expected impact" : "Impacto esperado"} value={levelLabel(action.estimated_impact, isEn)} />
          <ActionStat label={isEn ? "Difficulty" : "Dificultad"} value={difficultyLabel(action.difficulty, isEn)} />
          <ActionStat label={isEn ? "Potential GEO Score" : "GEO Score potencial"} value={scoreLiftLabel(action, isEn)} />
        </div>

        {draft.warning && (
          <div className="mx-5 mt-5 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
            {draft.warning}
          </div>
        )}

        {action.evidence && action.evidence.length > 0 && (
          <div className="mx-5 mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <p className="mb-2 text-sm font-medium text-primary">{isEn ? "Evidence used" : "Evidencia usada"}</p>
            <div className="space-y-1.5">
              {action.evidence.map((item) => <p key={`${item.label}-${item.value}`} className="text-sm text-muted-foreground"><span className="font-medium text-foreground">{item.label}:</span> {item.value}</p>)}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto p-5">
          <textarea
            value={draft.content}
            onChange={(event) => onChange(event.target.value)}
            className="min-h-[620px] w-full resize-none rounded-2xl border border-border bg-card/50 p-5 font-mono text-sm leading-relaxed text-foreground outline-none transition focus:border-primary/50"
            spellCheck={false}
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-border p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">{isEn ? `Based on ${project.company_name} audit evidence. Review before publishing.` : `Basado en evidencia de auditoría de ${project.company_name}. Revisar antes de publicar.`}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="border-border" onClick={() => void navigator.clipboard?.writeText(draft.content)}><Clipboard className="mr-2 h-4 w-4" />{isEn ? "Copy" : "Copiar"}</Button>
            <Button variant="outline" className="border-border" onClick={() => downloadMarkdown(draft, project)}><Download className="mr-2 h-4 w-4" />Markdown</Button>
            <Button className="bg-primary hover:bg-primary/90" onClick={() => void downloadDeliverablePdf(draft, project, isEn)}><Download className="mr-2 h-4 w-4" />PDF</Button>
          </div>
        </div>
      </aside>
    </div>
  )
}

function ActionStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-background/40 p-3"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>
}

function formatUiDelta(value: number) {
  return `${value > 0 ? "+" : ""}${value}`
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

function createDeliverableDraft(action: ActionItem, project: ActionPlan["project"], isEn: boolean): DeliverableDraft {
  const kind = detectDeliverableKind(action)
  return {
    action,
    kind,
    content: generateDeliverable(action, project, isEn, kind),
    warning: deliverableWarning(project, action, isEn),
  }
}

function detectDeliverableKind(action: ActionItem): DeliverableKind {
  const primaryText = `${action.id} ${action.category} ${action.title} ${action.type} ${action.implementation_type} ${action.deliverables.join(" ")}`.toLowerCase()
  const fullText = `${primaryText} ${action.description} ${action.suggested_action}`.toLowerCase()

  if (primaryText.includes("landing") || primaryText.includes("home") || primaryText.includes("homepage")) return "landing"
  if (primaryText.includes("alternativa") || primaryText.includes("alternative")) return primaryText.includes(" vs ") || primaryText.includes("frente a") || primaryText.includes("compet") ? "comparison" : "alternative"
  if (primaryText.includes("compar") || primaryText.includes("competitive") || primaryText.includes("competidor") || primaryText.includes("competitor") || primaryText.includes(" vs ")) return "comparison"
  if (primaryText.includes("faq") || primaryText.includes("json-ld") || primaryText.includes("schema")) return "faq"
  if (primaryText.includes("contenido") || primaryText.includes("content") || primaryText.includes("recursos") || primaryText.includes("authority")) return "content"

  if (fullText.includes("landing") || fullText.includes("home") || fullText.includes("homepage")) return "landing"
  if (fullText.includes("alternativa") || fullText.includes("alternative")) return fullText.includes(" vs ") || fullText.includes("frente a") || fullText.includes("compet") ? "comparison" : "alternative"
  if (fullText.includes("compar") || fullText.includes("competitive") || fullText.includes("competidor") || fullText.includes("competitor") || fullText.includes(" vs ")) return "comparison"
  if (fullText.includes("faq") || fullText.includes("json-ld") || fullText.includes("schema")) return "faq"
  if (fullText.includes("contenido") || fullText.includes("content") || fullText.includes("recursos") || fullText.includes("authority")) return "content"
  return "generic"
}

function deliverableKindLabel(kind: DeliverableKind, isEn: boolean) {
  const labels: Record<DeliverableKind, string> = {
    landing: isEn ? "Landing draft" : "Borrador de landing",
    comparison: isEn ? "Comparison draft" : "Borrador comparativo",
    alternative: isEn ? "Alternative page draft" : "Borrador de alternativas",
    content: isEn ? "Content draft" : "Borrador de contenido",
    faq: isEn ? "FAQ draft" : "Borrador FAQ",
    generic: isEn ? "Execution draft" : "Borrador de ejecución",
  }
  return labels[kind]
}

function deliverableWarning(project: ActionPlan["project"], action: ActionItem, isEn: boolean) {
  const missing = [!project.industry, !project.business_goal, action.affected_pages.length === 0].filter(Boolean).length
  if (missing === 0) return null
  return isEn
    ? "Limited project context is available. This draft uses only audit data and action details; validate positioning, proof and claims before publishing."
    : "Hay contexto limitado del proyecto. Este borrador usa únicamente datos de auditoría y detalles de la acción; valida posicionamiento, pruebas y claims antes de publicar."
}

function generateDeliverable(action: ActionItem, project: ActionPlan["project"], isEn: boolean, kind = detectDeliverableKind(action)) {
  const brand = project.company_name
  const industry = project.industry || (isEn ? "the target category" : "la categoría objetivo")
  const goal = localizedGoal(project, isEn)
  if (kind === "landing") return landingDeliverable(brand, industry, goal, action, isEn)
  if (kind === "comparison") return comparisonDeliverable(brand, industry, goal, action, isEn)
  if (kind === "alternative") return alternativeDeliverable(brand, industry, goal, action, isEn)
  if (kind === "content") return contentDeliverable(brand, industry, goal, action, isEn)
  if (kind === "faq") return faqDeliverable(brand, industry, goal, action, isEn)
  return genericDeliverable(action, brand, isEn)
}

function localizedGoal(project: ActionPlan["project"], isEn: boolean) {
  const fallback = isEn ? "improve AI visibility and qualified demand" : "mejorar visibilidad IA y demanda calificada"
  const goal = project.business_goal?.trim()
  if (!goal) return fallback
  if (!isEn && /measure and improve|ai answers|visibility in ai/i.test(goal)) return `mejorar la visibilidad de ${project.company_name} en respuestas de IA y demanda calificada`
  return goal
}

function actionBrief(action: ActionItem) {
  return action.suggested_action || action.description || action.title
}

function evidenceMarkdown(action: ActionItem, isEn: boolean) {
  const evidence = action.evidence?.length
    ? action.evidence.map((item) => `- ${item.label}: ${item.value}`).join("\n")
    : `- ${isEn ? "Audit action" : "Acción de auditoría"}: ${action.title}`
  const deliverables = action.deliverables.length
    ? action.deliverables.map((item) => `- ${item}`).join("\n")
    : `- ${isEn ? "No specific deliverables listed" : "Sin entregables específicos listados"}`
  return `## ${isEn ? "Evidence Used" : "Evidencia usada"}
${evidence}

## Brief
${actionBrief(action)}

## ${isEn ? "Requested Deliverables" : "Entregables solicitados"}
${deliverables}`
}

function landingDeliverable(brand: string, industry: string, goal: string, action: ActionItem, isEn: boolean) {
  return `# ${isEn ? "Landing Page Draft" : "Borrador de Landing"}: ${brand}

${evidenceMarkdown(action, isEn)}

## Hero
${brand} ${isEn ? `should explain its offer for companies in ${industry} with a clear, measurable execution path.` : `debe explicar su oferta para empresas en ${industry} con una ruta de ejecución clara y medible.`}

${isEn ? "Subheadline" : "Subtítulo"}: ${isEn ? `Turn AI visibility gaps into pages, proof and actions that can be measured in the next GEO audit.` : `Convierte brechas de visibilidad IA en páginas, pruebas y acciones medibles en la próxima auditoría GEO.`}

## ${isEn ? "Problem" : "Problema"}
${isEn ? `The audit action indicates that ${brand} needs a clearer landing page for neutral discovery prompts in ${industry}.` : `La acción de auditoría indica que ${brand} necesita una landing más clara para prompts neutrales de descubrimiento en ${industry}.`}

## ${isEn ? "Solution" : "Solución"}
${brand} ${isEn ? `should present a direct category definition, use cases, differentiators, proof and decision FAQs that AI engines can understand and cite.` : `debe presentar una definición clara de categoría, casos de uso, diferenciadores, pruebas y FAQs de decisión que los motores IA puedan entender y citar.`}

## ${isEn ? "Benefits" : "Beneficios"}
- ${isEn ? "Clearer positioning for neutral AI prompts." : "Posicionamiento más claro para prompts neutrales de IA."}
- ${isEn ? "Better fit for industry-specific discovery queries." : "Mejor encaje con consultas de descubrimiento por industria."}
- ${isEn ? "More citable proof for recommendation answers." : "Más evidencia citable para respuestas de recomendación."}
- ${isEn ? "A direct CTA connected to the business goal." : "CTA directo conectado al objetivo comercial."}

## ${isEn ? "Use Cases" : "Casos de uso"}
- ${isEn ? `Companies evaluating solutions in ${industry}.` : `Empresas evaluando soluciones en ${industry}.`}
- ${isEn ? "Teams comparing providers before booking a call." : "Equipos comparando proveedores antes de agendar una llamada."}
- ${isEn ? "Buyers looking for a measurable implementation path." : "Compradores buscando una ruta de implementación medible."}

## FAQs GEO
${faqList(brand, industry, goal, isEn)}

## CTA
${isEn ? `Request a GEO diagnosis for ${brand} and identify which pages, comparisons and proof assets should be shipped first.` : `Solicita un diagnóstico GEO para ${brand} e identifica qué páginas, comparativas y pruebas deben ejecutarse primero.`}`
}

function comparisonDeliverable(brand: string, industry: string, goal: string, action: ActionItem, isEn: boolean) {
  const competitor = extractCompetitorName(action)
  const competitorLabel = competitor || (isEn ? "verified alternative" : "alternativa verificada")
  return `# ${brand} vs ${competitorLabel}: ${isEn ? "Comparison Draft" : "Borrador Comparativo"}

${evidenceMarkdown(action, isEn)}

${competitor ? "" : isEn ? "**Evidence note:** No specific competitor was verified in this action. Replace the alternative only after validating it in audit data or public evidence.\n" : "**Nota de evidencia:** Esta acción no trae un competidor específico verificado. Reemplaza la alternativa solo después de validarla con datos de auditoría o evidencia pública.\n"}

## ${isEn ? "Title" : "Título"}
${brand} vs ${competitorLabel}: ${isEn ? `which option is better for companies in ${industry}?` : `¿qué opción conviene más para empresas en ${industry}?`}

## ${isEn ? "Introduction" : "Introducción"}
${isEn ? `If you are comparing ${brand} and ${competitorLabel}, the right choice depends on use case, implementation speed, proof, support and measurable outcomes.` : `Si estás comparando ${brand} y ${competitorLabel}, la mejor decisión depende del caso de uso, velocidad de implementación, evidencia, soporte y resultados medibles.`}

## ${isEn ? "Comparison Table" : "Tabla comparativa"}
| ${isEn ? "Criterion" : "Criterio"} | ${brand} | ${competitorLabel} |
| --- | --- | --- |
| ${isEn ? "Best fit" : "Mejor para"} | ${isEn ? `Teams that need a measurable execution path for ${goal}.` : `Equipos que necesitan una ruta medible para ${goal}.`} | ${isEn ? "Validate against public proof and product scope." : "Validar según evidencia pública y alcance del producto."} |
| ${isEn ? "Implementation" : "Implementación"} | ${isEn ? "Focused on concrete deliverables and next audit improvement." : "Enfocada en entregables concretos y mejora de la próxima auditoría."} | ${isEn ? "Depends on provider scope." : "Depende del alcance del proveedor."} |
| ${isEn ? "AI visibility" : "Visibilidad IA"} | ${isEn ? "Requires landing, FAQ, comparison and proof pages." : "Requiere landing, FAQ, comparativas y páginas de prueba."} | ${isEn ? "Benchmark with recurring prompts." : "Comparar con prompts recurrentes."} |
| ${isEn ? "Proof" : "Evidencia"} | ${isEn ? "Use cases, claims, citations and case studies should be visible." : "Casos de uso, claims, citas y casos deben estar visibles."} | ${isEn ? "Check available evidence." : "Revisar evidencia disponible."} |

## ${isEn ? "Differentiators" : "Diferenciadores"}
- ${isEn ? `${brand} should explain its category and use cases in language AI can reuse.` : `${brand} debe explicar su categoría y casos de uso en lenguaje que la IA pueda reutilizar.`}
- ${isEn ? "The page should include verifiable proof, not generic claims." : "La página debe incluir evidencia verificable, no claims genéricos."}
- ${isEn ? "FAQs should answer buyer objections directly." : "Las FAQs deben responder objeciones de compra directamente."}

## ${isEn ? "Use Cases" : "Casos de uso"}
- ${isEn ? "When the buyer needs a clear implementation scope." : "Cuando el comprador necesita un alcance claro de implementación."}
- ${isEn ? "When the decision depends on measurable outcomes." : "Cuando la decisión depende de resultados medibles."}
- ${isEn ? "When AI engines need structured comparison evidence." : "Cuando los motores IA necesitan evidencia comparativa estructurada."}

## FAQs
${faqList(brand, industry, goal, isEn)}

## CTA
${isEn ? `Compare ${brand} against your current alternatives and request a GEO action plan.` : `Compara ${brand} contra tus alternativas actuales y solicita un plan de acción GEO.`}`
}

function alternativeDeliverable(brand: string, industry: string, goal: string, action: ActionItem, isEn: boolean) {
  return `# ${isEn ? "Alternatives Page Draft" : "Borrador Página de Alternativas"}: ${isEn ? `Best alternatives in ${industry}` : `Mejores alternativas en ${industry}`}

${evidenceMarkdown(action, isEn)}

## ${isEn ? "Alternative List" : "Lista de alternativas"}
- ${brand}
- ${isEn ? "Verified alternative: add only after audit/public evidence confirms it" : "Alternativa verificada: agregar solo cuando la auditoría o evidencia pública la confirme"}
- ${isEn ? "Verified alternative: add only after audit/public evidence confirms it" : "Alternativa verificada: agregar solo cuando la auditoría o evidencia pública la confirme"}
- ${isEn ? "Verified alternative: add only after audit/public evidence confirms it" : "Alternativa verificada: agregar solo cuando la auditoría o evidencia pública la confirme"}

## ${isEn ? `${brand} Advantages` : `Ventajas de ${brand}`}
- ${isEn ? `Clear path to ${goal}.` : `Ruta clara para ${goal}.`}
- ${isEn ? "Execution-oriented deliverables, not only diagnosis." : "Entregables orientados a ejecución, no solo diagnóstico."}
- ${isEn ? "Content structure designed to improve AI understanding." : "Estructura de contenido diseñada para mejorar comprensión por IA."}

## ${isEn ? `When to choose ${brand}` : `Cuándo elegir ${brand}`}
${isEn ? `Choose ${brand} when your team needs a practical, measurable way to improve visibility in AI answers and create assets that can be cited.` : `Elige ${brand} cuando tu equipo necesita una forma práctica y medible de mejorar visibilidad en respuestas IA y crear activos citables.`}

## FAQs
${faqList(brand, industry, goal, isEn)}

## CTA
${isEn ? `Get a GEO audit and identify which alternative pages should be published first.` : `Obtén una auditoría GEO e identifica qué páginas de alternativas deben publicarse primero.`}`
}

function contentDeliverable(brand: string, industry: string, goal: string, action: ActionItem, isEn: boolean) {
  return `# ${isEn ? "Content Draft" : "Borrador de Contenido"}: ${action.title}

${evidenceMarkdown(action, isEn)}

## ${isEn ? "Title" : "Título"}
${action.title}

## ${isEn ? "Outline" : "Estructura"}
1. ${isEn ? "Audit context" : "Contexto de auditoría"}: ${action.description}
2. ${isEn ? "What needs to be published" : "Qué debe publicarse"}: ${actionBrief(action)}
3. ${isEn ? "Proof required" : "Evidencia requerida"}: ${isEn ? "use only verifiable claims, sources, cases or site pages." : "usar solo claims, fuentes, casos o páginas verificables del sitio."}
4. ${isEn ? "How it improves the metric" : "Cómo mejora la métrica"}: ${action.improves_metric ?? metricFromType(action.type, isEn)}
5. ${isEn ? "Next step" : "Siguiente paso"}: ${isEn ? "publish, validate and compare against the next audit." : "publicar, validar y comparar contra la próxima auditoría."}

## ${isEn ? "Initial Text" : "Texto inicial"}
${isEn ? `${brand} should publish this asset because the audit identified a gap connected to ${action.improves_metric ?? metricFromType(action.type, isEn)}.` : `${brand} debe publicar este activo porque la auditoría identificó una brecha conectada con ${action.improves_metric ?? metricFromType(action.type, isEn)}.`}

${isEn ? `The content must stay inside the available evidence: audit metrics, crawled pages, action details and verifiable proof from ${brand}. Do not add unsupported results, clients, rankings or competitor claims.` : `El contenido debe mantenerse dentro de la evidencia disponible: métricas de auditoría, páginas leídas, detalles de la acción y pruebas verificables de ${brand}. No agregar resultados, clientes, rankings ni claims competitivos sin respaldo.`}

## FAQs
${faqList(brand, industry, goal, isEn)}

## CTA
${isEn ? `Request a GEO content plan for ${brand}.` : `Solicita un plan de contenido GEO para ${brand}.`}`
}

function faqDeliverable(brand: string, industry: string, goal: string, action: ActionItem, isEn: boolean) {
  return `# ${isEn ? "FAQ Draft Optimized for AI Engines" : "Borrador FAQ optimizado para motores IA"}: ${brand}

${evidenceMarkdown(action, isEn)}

${faqList(brand, industry, goal, isEn)}

## ${isEn ? "Implementation Notes" : "Notas de implementación"}
- ${isEn ? "Publish answers visibly on the page, not only inside schema." : "Publicar respuestas visibles en la página, no solo dentro del schema."}
- ${isEn ? "Use FAQPage JSON-LD only when the content is visible to users." : "Usar FAQPage JSON-LD solo cuando el contenido esté visible para usuarios."}
- ${isEn ? "Avoid claims that are not supported by evidence in the page." : "Evitar claims que no estén respaldados por evidencia en la página."}`
}

function genericDeliverable(action: ActionItem, brand: string, isEn: boolean) {
  return `# ${isEn ? "Execution Deliverable" : "Entregable de ejecución"}: ${action.title}

## ${isEn ? "Original Action" : "Acción original"}
${action.suggested_action || action.description}

## ${isEn ? "What to create" : "Qué crear"}
${action.deliverables.map((item) => `- ${item}`).join("\n")}

## ${isEn ? "Recommended Structure" : "Estructura recomendada"}
1. ${isEn ? "Context and problem" : "Contexto y problema"}
2. ${isEn ? `How ${brand} solves it` : `Cómo ${brand} lo resuelve`}
3. ${isEn ? "Proof or evidence" : "Prueba o evidencia"}
4. ${isEn ? "FAQs for AI engines" : "FAQs para motores IA"}
5. CTA

## ${isEn ? "Metric to improve" : "Métrica a mejorar"}
${action.improves_metric ?? metricFromType(action.type, isEn)}

## ${isEn ? "Expected impact" : "Impacto esperado"}
${scoreLiftLabel(action, isEn)} ${isEn ? "if implemented correctly." : "si se implementa correctamente."}`
}

function faqList(brand: string, industry: string, goal: string, isEn: boolean) {
  if (isEn) return `### What is ${brand}?
${brand} is a solution for companies in ${industry} that need a clearer, measurable path to ${goal}.

### Who is ${brand} for?
${brand} is for teams that need practical execution, clearer positioning and assets that AI engines can understand and cite.

### What problem does ${brand} solve?
It helps close visibility gaps by clarifying what the brand does, who it serves, why it is different and what proof supports the recommendation.

### Why choose ${brand} over alternatives?
Choose ${brand} when you need an execution plan tied to measurable GEO outcomes, not only a diagnostic report.

### How is success measured?
Success is measured with the existing GEO audit metrics: GEO Score, spontaneous visibility, competitive win rate and citation coverage.`

  return `### ¿Qué es ${brand}?
${brand} es una solución para empresas en ${industry} que necesitan una ruta más clara y medible para ${goal}.

### ¿Para quién es ${brand}?
${brand} es para equipos que necesitan ejecución práctica, posicionamiento más claro y activos que los motores IA puedan entender y citar.

### ¿Qué problema resuelve ${brand}?
Ayuda a cerrar brechas de visibilidad aclarando qué hace la marca, para quién sirve, por qué es diferente y qué evidencia respalda la recomendación.

### ¿Por qué elegir ${brand} frente a alternativas?
Elige ${brand} cuando necesitas un plan de ejecución conectado a resultados GEO medibles, no solo un diagnóstico.

### ¿Cómo se mide el éxito?
El éxito se mide con las métricas existentes de la auditoría GEO: GEO Score, visibilidad espontánea, win rate competitivo y cobertura de citations.`
}

function extractCompetitorName(action: ActionItem) {
  const text = `${action.title} ${action.description} ${action.suggested_action}`
  const vsMatch = text.match(/\bvs\s+([^:.,;]+)/i)
  if (vsMatch?.[1]) return vsMatch[1].trim()
  const frenteMatch = text.match(/frente a\s+([^:.,;]+)/i)
  if (frenteMatch?.[1]) return frenteMatch[1].trim()
  return null
}

function downloadMarkdown(draft: DeliverableDraft, project: ActionPlan["project"]) {
  const blob = new Blob([draft.content], { type: "text/markdown;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${slugifyFile(project.company_name)}-${draft.kind}-deliverable.md`
  link.click()
  URL.revokeObjectURL(url)
}

async function downloadDeliverablePdf(draft: DeliverableDraft, project: ActionPlan["project"], isEn: boolean) {
  const { jsPDF } = await import("jspdf/dist/jspdf.umd.min.js")
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const margin = 48
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const contentWidth = pageWidth - margin * 2
  let y = 0

  const drawHeader = () => {
    doc.setFillColor(9, 13, 28)
    doc.rect(0, 0, pageWidth, 132, "F")
    doc.setFillColor(82, 112, 255)
    doc.rect(0, 0, 7, 132, "F")
    doc.setTextColor(115, 143, 255)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.text(deliverableKindLabel(draft.kind, isEn).toUpperCase(), margin, 42, { charSpace: 2 })
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(24)
    doc.text(isEn ? "BOTZ GEO Deliverable" : "Entregable BOTZ GEO", margin, 75)
    doc.setTextColor(190, 198, 224)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)
    doc.text(`${project.company_name} · ${draft.action.title}`, margin, 101, { maxWidth: contentWidth })
    y = 164
  }

  const addPage = () => {
    doc.addPage()
    drawHeader()
  }

  const ensureSpace = (height: number) => {
    if (y + height > pageHeight - 54) addPage()
  }

  const cleanText = (value: string) => value
    .replace(/^#{1,6}\s*/, "")
    .replace(/^[-*]\s*/, "")
    .replace(/^\d+\.\s*/, "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .trim()

  const writeWrapped = (text: string, x: number, width: number, options?: { size?: number; bold?: boolean; color?: [number, number, number]; lineGap?: number }) => {
    const size = options?.size ?? 10.5
    doc.setFont("helvetica", options?.bold ? "bold" : "normal")
    doc.setFontSize(size)
    doc.setTextColor(...(options?.color ?? [24, 29, 43]))
    const lines = doc.splitTextToSize(cleanText(text), width) as string[]
    for (const line of lines) {
      ensureSpace(size + 8)
      doc.text(line, x, y)
      y += size + (options?.lineGap ?? 4)
    }
  }

  const drawCard = (label: string, value: string, x: number, cardY: number, width: number) => {
    doc.setFillColor(246, 248, 255)
    doc.setDrawColor(222, 228, 245)
    doc.roundedRect(x, cardY, width, 64, 12, 12, "FD")
    doc.setTextColor(91, 106, 143)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8)
    doc.text(label.toUpperCase(), x + 14, cardY + 22)
    doc.setTextColor(20, 24, 36)
    doc.setFontSize(11)
    doc.text(doc.splitTextToSize(value, width - 28) as string[], x + 14, cardY + 43)
  }

  const drawActionSummary = () => {
    ensureSpace(158)
    const gap = 12
    const cardWidth = (contentWidth - gap) / 2
    drawCard(isEn ? "Original action" : "Acción original", draft.action.title, margin, y, cardWidth)
    drawCard(isEn ? "Expected impact" : "Impacto esperado", levelLabel(draft.action.estimated_impact, isEn), margin + cardWidth + gap, y, cardWidth)
    y += 78
    drawCard(isEn ? "Difficulty" : "Dificultad", difficultyLabel(draft.action.difficulty, isEn), margin, y, cardWidth)
    drawCard(isEn ? "Potential GEO lift" : "Mejora GEO potencial", scoreLiftLabel(draft.action, isEn), margin + cardWidth + gap, y, cardWidth)
    y += 92
  }

  const sectionTitle = (text: string) => {
    ensureSpace(34)
    y += 8
    doc.setFillColor(82, 112, 255)
    doc.circle(margin + 4, y - 4, 3, "F")
    writeWrapped(cleanText(text), margin + 16, contentWidth - 16, { size: 14, bold: true, color: [10, 16, 31], lineGap: 5 })
    y += 4
  }

  const bullet = (text: string) => {
    ensureSpace(24)
    doc.setFillColor(16, 185, 129)
    doc.circle(margin + 5, y - 4, 4, "F")
    writeWrapped(text, margin + 18, contentWidth - 18, { size: 10.5, color: [30, 36, 54] })
  }

  const orderedItem = (number: string, text: string) => {
    ensureSpace(24)
    doc.setFillColor(82, 112, 255)
    doc.circle(margin + 7, y - 5, 7, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(7)
    doc.text(number, margin + (number.length > 1 ? 3.5 : 5), y - 2)
    writeWrapped(text, margin + 22, contentWidth - 22, { size: 10.5, color: [30, 36, 54] })
  }

  const paragraph = (text: string) => {
    writeWrapped(text, margin, contentWidth, { size: 10.5, color: [30, 36, 54] })
    y += 6
  }

  drawHeader()
  drawActionSummary()

  for (const rawLine of draft.content.split("\n")) {
    const line = rawLine.trim()
    const orderedListMatch = line.match(/^(\d+)\.\s+(.+)/)
    if (!line) {
      y += 5
      continue
    }
    if (line.startsWith("# ")) {
      continue
    }
    if (line.startsWith("## ") || line.startsWith("### ")) {
      sectionTitle(line)
      continue
    }
    if (line.startsWith("- ")) {
      bullet(line)
      continue
    }
    if (orderedListMatch) {
      orderedItem(orderedListMatch[1], orderedListMatch[2])
      continue
    }
    if (line.includes("|")) {
      paragraph(line.replace(/\|/g, "  "))
      continue
    }
    paragraph(line)
  }

  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page)
    doc.setTextColor(128, 139, 168)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.text(isEn ? "Generated from real GEO audit evidence. Review before publishing." : "Generado desde evidencia real de auditoría GEO. Revisar antes de publicar.", margin, pageHeight - 28)
    doc.text(`${page}/${pages}`, pageWidth - margin - 18, pageHeight - 28)
  }

  doc.save(`${slugifyFile(project.company_name)}-${draft.kind}-deliverable.pdf`)
}

function slugifyFile(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "geo"
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
  return action
}
