"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, BarChart3, Calendar, CheckCircle2, Download, Eye, FileText, Gauge, Globe, Mail, MapPin, Printer, Quote, Rocket, ShieldCheck, Sparkles, Target, TrendingUp, Trophy, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabaseGeo } from "@/app/geo/supabaseGeoClient"
import { useGeoI18n } from "@/GEO/components/geo/i18n"

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
  status: "pending" | "in_progress" | "implemented"
}

type ActionPlan = {
  project: { id: string; company_name: string; website_url: string; industry?: string | null }
  latest_audit: { id: string; geo_score: number; ai_visibility: number; spontaneous_visibility?: number; assisted_visibility?: number; competitive_visibility?: number; citation_coverage?: number; total_results?: number; prompts_won: number; prompts_lost: number; citations_count: number; executive_summary: string; completed_at: string | null } | null
  competitive_insights?: {
    tracked_competitors: number
    mentioned_competitors: number
    top_competitor: { name: string; mentions: number; engines: string[]; best_position: number | null } | null
    competitors: Array<{ name: string; mentions: number; engines: string[]; best_position: number | null }>
  }
  execution_framework?: Array<{ id: string; name: string; solves: string; improves: string[]; deliverables: string[] }>
  actions: ActionItem[]
}

export default function ActionPlanReportPage() {
  const params = useParams<{ projectId: string }>()
  const { locale, setLocale } = useGeoI18n()
  const isEn = locale === "en"
  const [plan, setPlan] = useState<ActionPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const { data: { session } } = await supabaseGeo.auth.getSession()
        if (!session?.access_token) throw new Error(isEn ? "Login required." : "Debes iniciar sesion.")
        const res = await fetch(`/api/geo/projects/${params.projectId}/action-plan?locale=${locale}`, { headers: { Authorization: `Bearer ${session.access_token}` } })
        const json = (await res.json().catch(() => null)) as { data?: ActionPlan; error?: string } | null
        if (!res.ok || !json?.data) throw new Error(json?.error || (isEn ? "Could not load report." : "No se pudo cargar el reporte."))
        if (mounted) setPlan(json.data)
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : isEn ? "Could not load report." : "No se pudo cargar el reporte.")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void load()
    return () => { mounted = false }
  }, [isEn, locale, params.projectId])

  const metrics = useMemo(() => {
    const audit = plan?.latest_audit
    const score = audit?.geo_score ?? 0
    const projected = Math.min(100, score + (plan?.actions ?? []).reduce((sum, action) => sum + (action.estimated_impact === "high" ? 8 : action.estimated_impact === "medium" ? 5 : 2), 0))
    return { score, projected, visibility: audit?.spontaneous_visibility ?? audit?.ai_visibility ?? 0, assistedVisibility: audit?.assisted_visibility ?? 0, competitiveVisibility: audit?.competitive_visibility ?? 0, citationCoverage: audit?.citation_coverage ?? 0, promptsWon: audit?.prompts_won ?? 0, citations: audit?.citations_count ?? 0, totalResults: audit?.total_results ?? 0 }
  }, [plan])

  const trendData = useMemo(() => {
    const current = metrics.score
    const projected = metrics.projected
    return [
      { month: isEn ? "Now" : "Hoy", actual: current, target: current },
      { month: "30d", actual: current, target: Math.round(current + (projected - current) * 0.35) },
      { month: "60d", actual: current, target: Math.round(current + (projected - current) * 0.7) },
      { month: "90d", actual: current, target: projected },
    ]
  }, [isEn, metrics])

  if (loading) return <Shell isEn={isEn} projectId={params.projectId} locale={locale} setLocale={setLocale}><div className="py-24 text-center text-muted-foreground">{isEn ? "Loading report..." : "Cargando reporte..."}</div></Shell>
  if (error || !plan) return <Shell isEn={isEn} projectId={params.projectId} locale={locale} setLocale={setLocale}><div className="py-24 text-center text-muted-foreground">{error || (isEn ? "Report unavailable" : "Reporte no disponible")}</div></Shell>

  const reportDate = new Date().toLocaleDateString(locale === "en" ? "en-US" : "es-ES", { year: "numeric", month: "long", day: "numeric" })
  const impactHigh = plan.actions.filter((a) => a.estimated_impact === "high").length
  const impactMedium = plan.actions.filter((a) => a.estimated_impact === "medium").length
  const easy = plan.actions.filter((a) => a.difficulty === "easy").length
  const medium = plan.actions.filter((a) => a.difficulty === "medium").length
  const hard = plan.actions.filter((a) => a.difficulty === "hard").length
  const reportActions = plan.actions.map((action) => localizeAction(action, isEn))
  const topActions = reportActions.filter((action) => action.priority === "high").slice(0, 3)
  const copy = {
    eyebrow: isEn ? "Action Plan · GEO Strategy" : "Plan de Acción · GEO Strategy",
    coverDesc: isEn
      ? `Audit result and execution plan to improve ${plan.project.company_name}'s visibility in ChatGPT, Gemini, Perplexity and Google AI Overviews.`
      : `Resultado de auditoría y plan de ejecución para mejorar la visibilidad de ${plan.project.company_name} en ChatGPT, Gemini, Perplexity y Google AI Overviews.`,
    client: isEn ? "Client" : "Cliente",
    date: isEn ? "Date" : "Fecha",
    summaryEyebrow: isEn ? "Executive Summary" : "Resumen Ejecutivo",
    summaryTitle: isEn ? "Where the brand stands in AI search" : "Dónde está hoy la marca en la búsqueda con IA",
    summaryFallback: isEn
      ? `Botz GEO separates spontaneous visibility from assisted and comparative prompts, then turns the result into an execution scope with pages, deliverables and priorities.`
      : `Botz GEO separa visibilidad espontánea de prompts asistidos y comparativos, y convierte el resultado en un alcance de ejecución con páginas, entregables y prioridades.`,
    metricsEyebrow: isEn ? "Metrics Panel" : "Panel de Métricas",
    metricsTitle: isEn ? "Consistent audit metrics" : "Métricas consistentes de auditoría",
    target: isEn ? "Target" : "Objetivo",
    currentVisibility: isEn ? "Neutral prompts only" : "Solo prompts neutrales",
    wonPrompts: isEn ? "Brand-visible prompts" : "Prompts con marca visible",
    citations: isEn ? "Cited sources" : "Fuentes citadas",
    projectionEyebrow: isEn ? "Projection" : "Proyección",
    projectionTitle: isEn ? "Current trend vs estimated target" : "Tendencia actual vs objetivo estimado",
    projectionDesc: isEn ? "Projected GEO Score evolution if the prioritized actions are implemented. This is an estimate, not a guarantee." : "Evolución proyectada del GEO Score si se ejecutan las acciones priorizadas. Es una estimación, no una garantía.",
    current: isEn ? "Current" : "Actual",
    estimatedTarget: isEn ? "Estimated target" : "Objetivo estimado",
    priorityEyebrow: isEn ? "Prioritization" : "Priorización",
    priorityTitle: isEn ? "Action distribution by impact and difficulty" : "Distribución de acciones por impacto y dificultad",
    highImpact: isEn ? "High impact" : "Alto impacto",
    mediumImpact: isEn ? "Medium impact" : "Impacto medio",
    easy: isEn ? "Easy" : "Fáciles",
    medium: isEn ? "Medium" : "Medias",
    hard: isEn ? "Hard" : "Difíciles",
    roadmapEyebrow: isEn ? "Roadmap" : "Roadmap",
    roadmapTitle: isEn ? "30 / 60 / 90 day execution plan" : "Plan de ejecución 30 / 60 / 90 días",
    roadmapDesc: isEn ? "Prioritized sequence to build sustainable and measurable AI visibility." : "Secuencia priorizada para construir visibilidad de forma sostenible y medible.",
    diagnosisEyebrow: isEn ? "Diagnosis" : "Diagnóstico",
    diagnosisTitle: isEn ? "What the client needs to change" : "Qué debe cambiar el cliente",
    diagnosisDesc: isEn ? "Structural gaps limiting brand visibility in AI engines." : "Brechas estructurales que limitan la visibilidad de la marca en motores de IA.",
    recEyebrow: isEn ? "Recommendations" : "Recomendaciones",
    recTitle: isEn ? "Priority actions generated by Botz GEO" : "Acciones prioritarias generadas por Botz GEO",
    recDesc: isEn ? "Executive summary of the highest-priority actions, including impact, difficulty, affected pages and deliverables." : "Resumen ejecutivo de las acciones más importantes, con impacto, dificultad, páginas afectadas y entregables.",
    scopeEyebrow: isEn ? "Commercial Scope" : "Alcance Comercial",
    scopeTitle: isEn ? "What Botz GEO will do to improve visibility" : "Qué hará Botz GEO para mejorar la visibilidad",
    nextSteps: isEn ? "Next steps" : "Próximos pasos",
    nextDesc: isEn ? "We recommend starting with high-impact actions in the first 30 days and measuring progress with a new GEO audit." : "Recomendamos iniciar con las acciones de alto impacto durante los primeros 30 días y medir evolución con una nueva auditoría GEO.",
  }

  return (
    <Shell isEn={isEn} projectId={params.projectId} locale={locale} setLocale={setLocale}>
      <PremiumPdf plan={plan} metrics={metrics} actions={reportActions} topActions={topActions} reportDate={reportDate} summary={isEn ? copy.summaryFallback : (plan.latest_audit?.executive_summary || copy.summaryFallback)} isEn={isEn} />
      <div className="screen-report-content">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-background to-card p-10 print:rounded-none print:border-0 print:bg-white print:p-12">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl print:hidden" />
        <div className="relative">
          <div className="flex items-center gap-2.5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Sparkles className="h-5 w-5" /></span><span className="text-lg font-semibold print:text-slate-900">Botz GEO</span></div>
          <div className="mt-20 print:mt-24"><p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary print:text-slate-500">{copy.eyebrow}</p><h1 className="mt-4 text-5xl font-semibold leading-tight tracking-tight print:text-slate-900">GEO Action Plan</h1><p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground print:text-slate-500">{copy.coverDesc}</p></div>
          <div className="mt-20 grid gap-6 border-t border-border pt-8 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-2 print:border-slate-200"><Info label={copy.client} value={plan.project.company_name} /><Info label="URL" value={plan.project.website_url} icon={Globe} /><Info label={copy.date} value={reportDate} icon={Calendar} /><div className="min-w-0"><p className="text-xs uppercase tracking-wider text-muted-foreground print:text-slate-400">GEO Score</p><p className="mt-1 text-2xl font-semibold text-primary">{metrics.score}/100</p></div></div>
        </div>
      </section>

      <ReportSection eyebrow={copy.summaryEyebrow} title={copy.summaryTitle} desc={isEn ? copy.summaryFallback : (plan.latest_audit?.executive_summary || copy.summaryFallback)} />

      {topActions.length > 0 && (
        <section className="report-page mt-8">
          <ReportTitle eyebrow={isEn ? "Priority Moves" : "Movimientos Prioritarios"} title={isEn ? "First 3 moves" : "Primeros 3 movimientos"} desc={isEn ? "The first execution steps Botz GEO should ship to start improving AI visibility." : "Los primeros pasos de ejecución que Botz GEO debe entregar para empezar a mejorar la visibilidad en IA."} />
          <div className="grid gap-4 md:grid-cols-3 print:grid-cols-1">
            {topActions.map((action, index) => <TopMove key={action.id} action={action} index={index} isEn={isEn} />)}
          </div>
        </section>
      )}

      <section className="report-page mt-8"><ReportTitle eyebrow={copy.metricsEyebrow} title={copy.metricsTitle} /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><MetricCard label="GEO Score" value={`${metrics.score}`} sub={`${copy.target}: ${metrics.projected}`} delta={`+${metrics.projected - metrics.score}`} icon={Gauge} /><MetricCard label={isEn ? "Spontaneous Visibility" : "Visibilidad espontánea"} value={`${metrics.visibility}%`} sub={copy.currentVisibility} icon={Eye} /><MetricCard label={isEn ? "Competitive Win Rate" : "Win rate competitivo"} value={`${metrics.competitiveVisibility}%`} sub={isEn ? "Comparison prompts" : "Prompts comparativos"} icon={Trophy} /><MetricCard label={isEn ? "Citation Coverage" : "Cobertura de citations"} value={`${metrics.citationCoverage}%`} sub={copy.citations} icon={Quote} /></div></section>
      <section className="report-page mt-8"><ReportTitle eyebrow={copy.projectionEyebrow} title={copy.projectionTitle} desc={copy.projectionDesc} /><TrendChart data={trendData} currentLabel={copy.current} targetLabel={copy.estimatedTarget} /></section>
      <section className="report-page mt-8"><ReportTitle eyebrow={copy.priorityEyebrow} title={copy.priorityTitle} /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"><Distribution label={copy.highImpact} count={impactHigh} color="bg-emerald-500" /><Distribution label={copy.mediumImpact} count={impactMedium} color="bg-primary" /><Distribution label={copy.easy} count={easy} color="bg-cyan-500" /><Distribution label={copy.medium} count={medium} color="bg-violet-500" /><Distribution label={copy.hard} count={hard} color="bg-muted-foreground" /></div></section>
      <section className="report-page mt-8"><ReportTitle eyebrow={copy.roadmapEyebrow} title={copy.roadmapTitle} desc={copy.roadmapDesc} /><div className="grid gap-4 lg:grid-cols-3"><RoadmapCard period={isEn ? "30 days" : "30 días"} title={isEn ? "GEO foundations" : "Fundamentos GEO"} items={isEn ? ["Rewrite key pages", "FAQ and schema in landing pages", "Fix brand messaging"] : ["Reescritura de páginas clave", "FAQ y schema en landings", "Corrección de mensajes de marca"]} /><RoadmapCard period={isEn ? "60 days" : "60 días"} title={isEn ? "Authority and content" : "Autoridad y contenido"} items={isEn ? ["Industry landing pages", "Comparison pages", "Citable cases and claims"] : ["Landings por industria", "Comparativas contra alternativas", "Casos y claims citables"]} /><RoadmapCard period={isEn ? "90 days" : "90 días"} title={isEn ? "Measurement and scale" : "Medición y escala"} items={isEn ? ["New comparative audit", "Optimize lost prompts", "Scale winning content"] : ["Nueva auditoría comparativa", "Optimización de prompts perdidos", "Escalar contenidos ganadores"]} /></div></section>
      <section className="report-page mt-8"><ReportTitle eyebrow={copy.diagnosisEyebrow} title={copy.diagnosisTitle} desc={copy.diagnosisDesc} /><div className="space-y-4"><Diagnosis title={isEn ? "Entity clarity and value proposition" : "Claridad de entidad y propuesta de valor"} desc={isEn ? "AI engines need to understand exactly what the company sells, who it serves and why it should be recommended." : "La IA necesita entender con precisión qué vende la empresa, para quién y por qué recomendarla."} icon={FileText} /><Diagnosis title={isEn ? "Intent-specific pages" : "Páginas específicas por intención"} desc={isEn ? "Models recommend brands more often when there are pages answering specific prompts: industry, comparisons, cases and FAQs." : "Los modelos recomiendan mejor cuando existen páginas que responden prompts concretos: industria, comparativas, casos y FAQs."} icon={Target} /><Diagnosis title={isEn ? "Citable authority signals" : "Señales de autoridad citables"} desc={isEn ? "Cases, sources, verifiable claims and external mentions help increase confidence and citations." : "Casos, fuentes, claims verificables y menciones externas ayudan a aumentar confianza y citaciones."} icon={ShieldCheck} /></div></section>
      <section className="report-page mt-8"><ReportTitle eyebrow={copy.recEyebrow} title={copy.recTitle} desc={copy.recDesc} /><div className="space-y-5">{reportActions.map((rec) => <Recommendation key={rec.id} rec={rec} isEn={isEn} />)}</div></section>
      <section className="report-page mt-8"><ReportTitle eyebrow={copy.scopeEyebrow} title={copy.scopeTitle} /><div className="grid gap-4 sm:grid-cols-2"><Scope title={isEn ? "Product and positioning analysis" : "Análisis de producto y posicionamiento"} desc={isEn ? "Clarify category, use cases, differentiators and claims AI can understand." : "Claridad de categoría, casos de uso, diferenciales y claims que la IA pueda entender."} icon={Sparkles} /><Scope title={isEn ? "Website, SEO and GEO structure" : "Página web, SEO y estructura GEO"} desc={isEn ? "Homepage, landing pages, FAQs, schema and citable pages." : "Home, landings, FAQs, schema y páginas citables."} icon={FileText} /><Scope title={isEn ? "Content, social and citations" : "Contenido, redes y citations"} desc={isEn ? "Authority content, social distribution, Google citations and external mentions." : "Contenido de autoridad, distribución en redes, citations en Google y menciones externas."} icon={ShieldCheck} /><Scope title={isEn ? "Competitive monitoring" : "Vigilancia competitiva"} desc={isEn ? "Recurring audits to measure whether execution improves the next result." : "Auditorías recurrentes para medir si la ejecución mejora el siguiente resultado."} icon={BarChart3} /></div></section>
      <section className="report-page mt-8 mb-10 print:mb-0"><div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/15 via-card to-accent/10 p-10 print:rounded-none print:border-slate-200 print:bg-white print:p-12"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Rocket className="h-6 w-6" /></span><h2 className="mt-6 text-3xl font-semibold print:text-slate-900">{copy.nextSteps}</h2><p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground print:text-slate-600">{copy.nextDesc}</p><div className="mt-8 space-y-3">{(isEn ? ["Approve the action plan", "Botz GEO implementation kick-off", "First results review after 30 days"] : ["Aprobar el plan de acción", "Kick-off de implementación Botz GEO", "Primera revisión de resultados a los 30 días"]).map((step, i) => <div key={step} className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">{i + 1}</span><span className="text-sm print:text-slate-700">{step}</span></div>)}</div><div className="mt-8 flex flex-wrap items-center gap-4 border-t border-border pt-6 print:border-slate-200"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="h-4 w-4 text-primary" />info@botz.fyi</div><div className="flex items-center gap-2 text-sm text-muted-foreground"><Globe className="h-4 w-4 text-primary" />geo.botz.fyi</div></div></div></section>
      </div>
    </Shell>
  )
}

function PremiumPdf({ plan, metrics, actions, topActions, reportDate, summary, isEn }: { plan: ActionPlan; metrics: { score: number; projected: number; visibility: number; assistedVisibility: number; competitiveVisibility: number; citationCoverage: number; promptsWon: number; citations: number; totalResults: number }; actions: ActionItem[]; topActions: ActionItem[]; reportDate: string; summary: string; isEn: boolean }) {
  const status = metrics.score <= 25 ? (isEn ? "Invisible" : "Invisible") : metrics.score <= 50 ? (isEn ? "Emerging" : "Emergente") : metrics.score <= 75 ? (isEn ? "Recognized" : "Reconocido") : (isEn ? "Dominant" : "Dominante")
  const competitive = plan.competitive_insights
  const topCompetitor = competitive?.top_competitor
  const t = {
    header: isEn ? "BOTZ GEO Intelligence Report" : "Reporte de Inteligencia BOTZ GEO",
    confidential: isEn ? "Confidential" : "Confidencial",
    subtitle: isEn ? "AI Search Visibility & Action Plan" : "Visibilidad en Búsqueda IA & Plan de Acción",
    title: isEn ? "GEO Intelligence Report" : "Reporte de Inteligencia GEO",
    lead: isEn ? "Executive strategy to improve how AI engines understand, cite and recommend the brand." : "Estrategia ejecutiva para mejorar cómo los motores de IA entienden, citan y recomiendan la marca.",
    client: isEn ? "Client" : "Cliente",
    url: isEn ? "Analyzed URL" : "URL analizada",
    date: isEn ? "Date" : "Fecha",
    maturityNote: isEn ? "Current GEO maturity based on the latest completed audit." : "Madurez GEO actual basada en la última auditoría completada.",
    snapshot: isEn ? "Executive Snapshot" : "Resumen Ejecutivo",
    snapshotEyebrow: isEn ? "Visibility at a glance" : "Visibilidad de un vistazo",
    aiVisibility: isEn ? "AI Visibility" : "Visibilidad IA",
    promptsWon: isEn ? "Prompts Won" : "Prompts ganados",
    citations: isEn ? "Citations" : "Citaciones",
    promptsAnalyzed: isEn ? "Prompts analyzed" : "Prompts analizados",
    competitors: isEn ? "Competitors" : "Competidores",
    radarTitle: isEn ? "GEO Radar & Engine Breakdown" : "Radar GEO y desglose por motor",
    radarEyebrow: isEn ? "Diagnostic profile" : "Perfil diagnóstico",
    engineTitle: isEn ? "AI Engine Breakdown" : "Desglose por motor IA",
    engineEmpty: isEn ? "Not enough engine-level data yet. ChatGPT, Gemini, Perplexity and Google AI Overviews bars will appear when per-engine audit data is available." : "Aún no hay suficientes datos por motor. Las barras de ChatGPT, Gemini, Perplexity y Google AI Overviews aparecerán cuando exista información por motor.",
    funnelTitle: isEn ? "Visibility Funnel" : "Embudo de visibilidad",
    funnelEyebrow: isEn ? "Prompt-to-citation journey" : "De prompt a citación",
    matrixTitle: isEn ? "Opportunity Matrix" : "Matriz de oportunidades",
    matrixEyebrow: isEn ? "Impact vs difficulty" : "Impacto vs dificultad",
    roadmapTitle: isEn ? "30 / 60 / 90 Roadmap" : "Roadmap 30 / 60 / 90",
    roadmapEyebrow: isEn ? "Execution timeline" : "Cronograma de ejecución",
    recTitle: isEn ? "Priority Recommendations" : "Recomendaciones prioritarias",
    recEyebrow: isEn ? "Executive action cards" : "Tarjetas ejecutivas de acción",
    outcomesTitle: isEn ? "Expected Outcomes & Next Steps" : "Resultados esperados y próximos pasos",
    outcomesEyebrow: isEn ? "Implementation path" : "Ruta de implementación",
  }
  const promptsAnalyzed = (plan.latest_audit?.prompts_won ?? 0) + (plan.latest_audit?.prompts_lost ?? 0)
  const radar = [
    { label: isEn ? "Entity Clarity" : "Claridad de entidad", value: scoreDimension(metrics.score, actions, ["brand", "homepage", "positioning"]) },
    { label: isEn ? "Citation Strength" : "Fuerza de citación", value: Math.min(100, metrics.citations * 18 + 24) },
    { label: isEn ? "Industry Coverage" : "Cobertura sectorial", value: scoreDimension(metrics.visibility, actions, ["industry", "landing"]) },
    { label: isEn ? "Authority Signals" : "Señales de autoridad", value: scoreDimension(metrics.citations * 20, actions, ["authority", "trust", "proof"]) },
    { label: isEn ? "Competitive Positioning" : "Posición competitiva", value: scoreDimension(metrics.score, actions, ["comparison", "competitive", "competitor"]) },
  ]

  return (
    <div className="premium-pdf">
      <PdfPage page={1} cover header={t.header}>
        <div className="pdf-cover-grid">
          <div>
            <div className="pdf-brand"><span>✦</span> BOTZ GEO</div>
            <p className="pdf-kicker">{t.subtitle}</p>
            <h1>{t.title}</h1>
            <p className="pdf-lead">{t.lead}</p>
            <div className="pdf-meta-grid"><PdfInfo label={t.client} value={plan.project.company_name} /><PdfInfo label={t.url} value={plan.project.website_url} /><PdfInfo label={t.date} value={reportDate} /></div>
          </div>
          <div className="pdf-score-panel"><PdfGauge score={metrics.score} label="GEO Score" /><strong>{status}</strong><p>{t.maturityNote}</p></div>
        </div>
        <div className="pdf-bullets"><PdfBullet text={isEn ? `GEO Score is ${metrics.score}/100 with ${metrics.visibility}% AI visibility.` : `El GEO Score es ${metrics.score}/100 con ${metrics.visibility}% de visibilidad IA.`} /><PdfBullet text={isEn ? `The report includes ${actions.length} prioritized actions generated from real audit data.` : `El reporte incluye ${actions.length} acciones priorizadas generadas con datos reales de auditoría.`} /><PdfBullet text={topActions[0] ? (isEn ? `First move: ${topActions[0].title}.` : `Primer movimiento: ${topActions[0].title}.`) : (isEn ? "No high-priority action is available yet." : "Aún no hay acciones de alta prioridad disponibles.")} /></div>
        <div className="pdf-cover-bottom"><strong>{isEn ? "Decision document" : "Documento de decisión"}</strong><span>{isEn ? "Prepared to approve the GEO implementation sprint and start execution with clear priorities." : "Preparado para aprobar el sprint de implementación GEO e iniciar ejecución con prioridades claras."}</span></div>
      </PdfPage>

      <PdfPage page={2} title={t.snapshot} eyebrow={t.snapshotEyebrow} header={t.header}>
        <div className="pdf-metric-grid"><PdfMetric label="GEO Score" value={`${metrics.score}/100`} note={status} /><PdfMetric label={t.aiVisibility} value={`${metrics.visibility}%`} note={isEn ? "Brand visibility in evaluated prompts" : "Visibilidad de marca en prompts evaluados"} /><PdfMetric label={t.promptsWon} value={`${metrics.promptsWon}`} note={isEn ? "Qualified recommendations won" : "Recomendaciones calificadas ganadas"} /><PdfMetric label={t.citations} value={`${metrics.citations}`} note={isEn ? "Citable proof found" : "Pruebas citables encontradas"} /><PdfMetric label={t.promptsAnalyzed} value={promptsAnalyzed ? String(promptsAnalyzed) : "N/A"} note={isEn ? "Latest audit scope" : "Alcance de la última auditoría"} /><PdfMetric label={t.competitors} value={competitive ? String(competitive.tracked_competitors) : "N/A"} note={topCompetitor ? (isEn ? `Top: ${topCompetitor.name}` : `Principal: ${topCompetitor.name}`) : (isEn ? "Tracked competitors" : "Competidores trackeados")} /></div>
        <PdfMaturity score={metrics.score} isEn={isEn} />
        <div className="pdf-snapshot-fill"><div><h3>{isEn ? "Executive readout" : "Lectura ejecutiva"}</h3><p>{summary}</p></div><div><h3>{isEn ? "Decision focus" : "Foco de decisión"}</h3><ul>{topActions.slice(0, 3).map((action) => <li key={action.id}>{action.title}</li>)}</ul></div></div>
        {competitive && <PdfCompetitive competitive={competitive} isEn={isEn} />}
      </PdfPage>

      <PdfPage page={3} title={t.radarTitle} eyebrow={t.radarEyebrow} header={t.header}>
        <div className="pdf-two-col"><PdfRadar data={radar} /><div className="pdf-empty"><h3>{t.engineTitle}</h3><p>{t.engineEmpty}</p></div></div>
        <div className="pdf-diagnostic-notes">
          {radar.map((item) => <div key={item.label}><strong>{item.value}/100</strong><span>{item.label}</span></div>)}
        </div>
      </PdfPage>

      <PdfPage page={4} title={t.funnelTitle} eyebrow={t.funnelEyebrow} header={t.header} compact>
        <PdfFunnel steps={[{ label: t.promptsAnalyzed, value: promptsAnalyzed ? String(promptsAnalyzed) : "N/A", width: 100 }, { label: isEn ? "Brand mentions" : "Menciones de marca", value: metrics.promptsWon ? String(metrics.promptsWon) : "N/A", width: 78 }, { label: isEn ? "Positive mentions" : "Menciones positivas", value: metrics.promptsWon ? String(metrics.promptsWon) : "N/A", width: 62 }, { label: isEn ? "Recommendations won" : "Recomendaciones ganadas", value: String(metrics.promptsWon), width: 48 }, { label: isEn ? "Citations found" : "Citaciones encontradas", value: String(metrics.citations), width: 34 }]} />
        <div className="pdf-funnel-explain"><h3>{isEn ? "What this means" : "Qué significa"}</h3><p>{isEn ? "The biggest leverage is moving from visibility to citable recommendations: clearer pages, proof assets and comparison content increase the chance that AI engines mention the brand with confidence." : "La mayor palanca está en pasar de visibilidad a recomendaciones citables: páginas claras, pruebas y contenido comparativo aumentan la probabilidad de que los motores IA recomienden la marca con confianza."}</p></div>
      </PdfPage>

      <PdfPage page={5} title={t.matrixTitle} eyebrow={t.matrixEyebrow} header={t.header}>
        <PdfMatrix actions={actions} isEn={isEn} />
      </PdfPage>

      <PdfPage page={6} title={t.roadmapTitle} eyebrow={t.roadmapEyebrow} header={t.header}>
        <PdfRoadmap actions={actions} isEn={isEn} />
      </PdfPage>

      <PdfPage page={7} title={t.recTitle} eyebrow={t.recEyebrow} header={t.header} fluid>
        <div className="pdf-rec-intro"><strong>{isEn ? "Execution scope" : "Alcance de ejecución"}</strong><span>{isEn ? "Each card below turns the audit into a concrete implementation item with rationale, effort level, deliverables and affected URLs." : "Cada tarjeta convierte la auditoría en una acción concreta con racional, esfuerzo, entregables y URLs afectadas."}</span></div>
        <div className="pdf-rec-stack">{actions.map((action, index) => <PdfRecommendation key={`${action.id}-${index}`} action={action} index={index} isEn={isEn} />)}</div>
      </PdfPage>

      <PdfPage page={8} title={t.outcomesTitle} eyebrow={t.outcomesEyebrow} header={t.header}>
        <div className="pdf-outcomes"><h3>{isEn ? "Projected outcomes require at least 2 completed audits." : "Los resultados proyectados requieren al menos 2 auditorías completadas."}</h3><p>{isEn ? `Current planning target: GEO Score ${metrics.score}/100 to ${metrics.projected}/100 after implementation. This is directional planning context, not a guaranteed forecast.` : `Objetivo de planeación actual: GEO Score de ${metrics.score}/100 a ${metrics.projected}/100 después de la implementación. Es contexto direccional de planeación, no una garantía.`}</p></div>
        <div className="pdf-next"><div><b>1</b><span>{isEn ? "Approve action plan" : "Aprobar plan de acción"}</span></div><div><b>2</b><span>{isEn ? "Start implementation sprint" : "Iniciar sprint de implementación"}</span></div><div><b>3</b><span>{isEn ? "Review progress after 30 days" : "Revisar progreso a los 30 días"}</span></div></div>
        <p className="pdf-contact">info@botz.fyi · geo.botz.fyi</p>
      </PdfPage>
    </div>
  )
}

function Shell({ children, isEn = false, projectId, locale, setLocale }: { children: React.ReactNode; isEn?: boolean; projectId?: string; locale: "es" | "en"; setLocale: (locale: "es" | "en") => void }) { const backHref = projectId ? `/geo/app/projects/${projectId}/recommendations` : "/geo/app/projects"; return <div className="min-h-screen bg-background print:bg-white"><style jsx global>{reportPrintCss}</style><div className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur print:hidden"><div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4"><Link href={backHref} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />{isEn ? "Back to plan" : "Volver al plan"}</Link><div className="flex items-center gap-2"><div className="inline-flex overflow-hidden rounded-lg border border-border"><button type="button" onClick={() => setLocale("es")} className={`px-2.5 py-1.5 text-xs ${locale === "es" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>ES</button><button type="button" onClick={() => setLocale("en")} className={`px-2.5 py-1.5 text-xs ${locale === "en" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}>EN</button></div><Button variant="outline" size="sm" onClick={() => window.print()}><Download className="mr-2 h-4 w-4" />{isEn ? "Export PDF" : "Exportar PDF"}</Button><Button size="sm" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />{isEn ? "Print" : "Imprimir"}</Button></div></div></div><div className="report-shell mx-auto max-w-5xl px-6 py-10 print:px-0 print:py-0">{children}</div></div> }
function PdfPage({ children, page, title, eyebrow, cover = false, header = "BOTZ GEO Intelligence Report", fluid = false, compact = false }: { children: React.ReactNode; page: number; title?: string; eyebrow?: string; cover?: boolean; header?: string; fluid?: boolean; compact?: boolean }) { return <section className={`pdf-page-premium ${cover ? "pdf-cover" : ""} ${fluid ? "pdf-page-fluid" : ""} ${compact ? "pdf-page-compact" : ""}`}><div className="pdf-header"><span>{header}</span><span>{String(page).padStart(2, "0")}</span></div>{title && <div className="pdf-title"><p>{eyebrow}</p><h2>{title}</h2></div>}{children}<div className="pdf-page-num">{page}</div></section> }
function PdfInfo({ label, value }: { label: string; value: string }) { return <div className="pdf-info"><span>{label}</span><strong>{value}</strong></div> }
function PdfBullet({ text }: { text: string }) { return <div className="pdf-bullet"><CheckCircle2 className="h-4 w-4" /><span>{text}</span></div> }
function PdfMetric({ label, value, note }: { label: string; value: string; note: string }) { return <div className="pdf-metric"><p>{label}</p><strong>{value}</strong><span>{note}</span></div> }
function PdfGauge({ score, label }: { score: number; label: string }) { const r = 68; const c = 2 * Math.PI * r; const d = (Math.max(0, Math.min(100, score)) / 100) * c; return <svg className="pdf-gauge" viewBox="0 0 180 180"><circle cx="90" cy="90" r={r} fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="16" /><circle cx="90" cy="90" r={r} fill="none" stroke="#38bdf8" strokeWidth="16" strokeLinecap="round" strokeDasharray={`${d} ${c - d}`} transform="rotate(-90 90 90)" /><text x="90" y="88" textAnchor="middle">{score}</text><text x="90" y="112" textAnchor="middle">{label}</text></svg> }
function PdfRadar({ data }: { data: Array<{ label: string; value: number }> }) { const size = 340; const center = 170; const radius = 88; const short = (label: string) => label.replace("Claridad de entidad", "Entidad").replace("Fuerza de citación", "Citación").replace("Cobertura sectorial", "Cobertura").replace("Señales de autoridad", "Autoridad").replace("Posición competitiva", "Competencia").replace("Entity Clarity", "Entity").replace("Citation Strength", "Citations").replace("Industry Coverage", "Coverage").replace("Authority Signals", "Authority").replace("Competitive Positioning", "Competition"); const coords = (i: number, scale: number) => { const a = (Math.PI * 2 * i) / data.length - Math.PI / 2; return { x: center + Math.cos(a) * radius * scale, y: center + Math.sin(a) * radius * scale } }; const point = (i: number, scale: number) => { const p = coords(i, scale); return `${p.x},${p.y}` }; const poly = data.map((d, i) => point(i, d.value / 100)).join(" "); return <div className="pdf-radar"><svg viewBox={`0 0 ${size} ${size}`}>{[.25,.5,.75,1].map((s) => <polygon key={s} points={data.map((_, i) => point(i, s)).join(" ")} fill="none" stroke="#dbe5f5" />)}{data.map((d, i) => { const p = coords(i, 1.38); return <text key={d.label} x={Math.max(48, Math.min(size - 48, p.x))} y={Math.max(18, Math.min(size - 18, p.y))} textAnchor="middle">{short(d.label)}</text> })}<polygon points={poly} fill="rgba(79,124,255,.22)" stroke="#4f7cff" strokeWidth="3" /></svg></div> }
function PdfFunnel({ steps }: { steps: Array<{ label: string; value: string; width: number }> }) { return <div className="pdf-funnel">{steps.map((step, i) => <div key={step.label} className="pdf-funnel-row"><div style={{ width: `${step.width}%` }}><b>{i + 1}</b><span>{step.label}</span><strong>{step.value}</strong></div></div>)}</div> }
function PdfMatrix({ actions, isEn }: { actions: ActionItem[]; isEn: boolean }) { const zones = [{ title: isEn ? "Quick Wins" : "Ganancias rápidas", desc: isEn ? "Prioritize first: high impact with manageable effort." : "Priorizar primero: alto impacto con esfuerzo manejable.", filter: (a: ActionItem) => a.estimated_impact === "high" && a.difficulty !== "hard" }, { title: isEn ? "Strategic Bets" : "Apuestas estratégicas", desc: isEn ? "Important initiatives that may require more coordination." : "Iniciativas importantes que requieren más coordinación.", filter: (a: ActionItem) => a.estimated_impact === "high" && a.difficulty === "hard" }, { title: isEn ? "Fill-ins" : "Complementos", desc: isEn ? "Useful supporting fixes to include in the sprint." : "Mejoras de soporte útiles para incluir en el sprint.", filter: (a: ActionItem) => a.estimated_impact !== "high" && a.difficulty === "easy" }, { title: isEn ? "Deprioritize" : "Despriorizar", desc: isEn ? "Avoid until stronger business case or dependency is solved." : "Evitar hasta que exista mejor caso de negocio o se resuelva dependencia.", filter: (a: ActionItem) => a.estimated_impact === "low" && a.difficulty === "hard" }]; return <div className="pdf-matrix">{zones.map((zone) => { const matches = actions.filter(zone.filter); return <div key={zone.title}><h3>{zone.title}</h3><p>{zone.desc}</p>{matches.length ? matches.map((a) => <span key={a.id}>{a.title}</span>) : <em>{isEn ? "No current actions in this quadrant." : "No hay acciones actuales en este cuadrante."}</em>}</div> })}</div> }
function PdfRoadmap({ actions, isEn }: { actions: ActionItem[]; isEn: boolean }) { const high = actions.filter((a) => a.priority === "high").slice(0, 3); const steps = [{ p: "30", t: isEn ? "GEO Foundations" : "Fundamentos GEO", objective: isEn ? "Make the brand easy for AI engines to understand and classify." : "Hacer que la marca sea fácil de entender y clasificar para motores IA.", action: high[0]?.title || (isEn ? "Rewrite key pages" : "Reescribir páginas clave"), outcome: isEn ? "Clearer entity signals, stronger homepage relevance and better prompt fit." : "Señales de entidad más claras, mayor relevancia de homepage y mejor encaje con prompts." }, { p: "60", t: isEn ? "Authority & Content" : "Autoridad y contenido", objective: isEn ? "Create content assets that answer buying and comparison intent." : "Crear activos de contenido que respondan intención de compra y comparación.", action: high[1]?.title || (isEn ? "Build citable proof" : "Construir pruebas citables"), outcome: isEn ? "More pages AI can cite, compare and recommend." : "Más páginas que la IA puede citar, comparar y recomendar." }, { p: "90", t: isEn ? "Measurement & Scale" : "Medición y escala", objective: isEn ? "Measure progress, identify lost prompts and scale the winning content patterns." : "Medir progreso, identificar prompts perdidos y escalar patrones ganadores.", action: high[2]?.title || (isEn ? "Re-audit and scale wins" : "Reauditar y escalar mejoras"), outcome: isEn ? "Decision-ready visibility trend and next sprint priorities." : "Tendencia de visibilidad lista para decisión y prioridades del siguiente sprint." }]; return <div className="pdf-roadmap">{steps.map((item) => <div key={item.p}><b>{item.p}</b><h3>{item.t}</h3><p><strong>{isEn ? "Objective" : "Objetivo"}:</strong> {item.objective}</p><p><strong>{isEn ? "Main action" : "Acción principal"}:</strong> {item.action}</p><p><strong>{isEn ? "Expected result" : "Resultado esperado"}:</strong> {item.outcome}</p></div>)}</div> }
function PdfMaturity({ score, isEn }: { score: number; isEn: boolean }) { const stages = isEn ? ["Invisible", "Emerging", "Recognized", "Recommended", "Dominant"] : ["Invisible", "Emergente", "Reconocido", "Recomendado", "Dominante"]; const active = score <= 25 ? 0 : score <= 50 ? 1 : score <= 75 ? 2 : score <= 90 ? 3 : 4; return <div className="pdf-maturity">{stages.map((stage, i) => <span key={stage} className={i === active ? "active" : ""}>{i + 1}. {stage}</span>)}</div> }
function PdfCompetitive({ competitive, isEn }: { competitive: NonNullable<ActionPlan["competitive_insights"]>; isEn: boolean }) { const top = competitive.top_competitor; return <div className="pdf-competitive"><div><h3>{isEn ? "Competitive intelligence" : "Inteligencia competitiva"}</h3><p>{top ? (isEn ? `${top.name} appeared ${top.mentions} time(s) across ${top.engines.join(", ") || "AI engines"}. The implementation sprint should prioritize comparison pages and verifiable proof to displace this competitor.` : `${top.name} apareció ${top.mentions} vez/veces en ${top.engines.join(", ") || "motores IA"}. El sprint debe priorizar comparativas y evidencia verificable para desplazarlo.`) : (competitive.tracked_competitors > 0 ? (isEn ? "Competitors are tracked for this project. Run or repeat an audit to identify which competitors AI engines mention most often." : "Hay competidores trackeados para este proyecto. Ejecuta o repite una auditoría para identificar cuáles menciona más la IA.") : (isEn ? "No competitors are linked yet. Add competitors to unlock competitive recommendations." : "Aún no hay competidores vinculados. Agrega competidores para activar recomendaciones competitivas."))}</p></div><div className="pdf-competitive-stats"><span><b>{competitive.tracked_competitors}</b>{isEn ? "Tracked" : "Trackeados"}</span><span><b>{competitive.mentioned_competitors}</b>{isEn ? "Mentioned" : "Mencionados"}</span><span><b>{top?.best_position ?? "--"}</b>{isEn ? "Best rank" : "Mejor pos."}</span></div></div> }
function PdfRecommendation({ action, index, isEn }: { action: ActionItem; index: number; isEn: boolean }) { return <article className="pdf-rec"><div className="pdf-rec-head"><b>{String(index + 1).padStart(2, "0")}</b><div><small>{action.category}</small><h3>{action.title}</h3></div></div><div className="pdf-rec-badges"><span>{isEn ? "Priority" : "Prioridad"}: {levelText(action.priority, isEn)}</span><span>{isEn ? "Impact" : "Impacto"}: {levelText(action.estimated_impact, isEn)}</span><span>{isEn ? "Difficulty" : "Dificultad"}: {difficultyText(action.difficulty, isEn)}</span><span>{action.implementation_type}</span></div><p><strong>{isEn ? "Why it matters" : "Por qué importa"}:</strong> {action.why_important}</p><p><strong>{isEn ? "Recommended action" : "Acción recomendada"}:</strong> {action.suggested_action}</p><div className="pdf-rec-split"><div><strong>{isEn ? "Deliverables" : "Entregables"}</strong><div>{action.deliverables.slice(0, 4).map((d) => <span key={d}>{d}</span>)}</div></div><div><strong>{isEn ? "Affected URLs" : "URLs afectadas"}</strong><div className="pdf-url-list">{action.affected_pages.slice(0, 3).map((url) => <span className="pdf-url" key={url}>{url}</span>)}</div></div></div></article> }
function scoreDimension(base: number, actions: ActionItem[], terms: string[]) { const hasGap = actions.some((a) => terms.some((t) => `${a.id} ${a.category} ${a.type}`.toLowerCase().includes(t))); return Math.max(0, Math.min(100, Math.round((base || 28) + (hasGap ? 8 : 28)))) }
function Info({ label, value, icon: Icon }: { label: string; value: string; icon?: typeof Globe }) { return <div className="min-w-0"><p className="text-xs uppercase tracking-wider text-muted-foreground print:text-slate-400">{label}</p><p className="mt-1 flex min-w-0 items-start gap-1.5 text-sm font-medium leading-snug print:text-slate-900"><>{Icon && <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />}</><span className="print-text-wrap break-words">{value}</span></p></div> }
function ReportTitle({ eyebrow, title, desc }: { eyebrow: string; title: string; desc?: string }) { return <div className="mb-6"><p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary print:text-slate-500">{eyebrow}</p><h2 className="text-2xl font-semibold tracking-tight print:text-slate-900">{title}</h2>{desc && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground print:text-slate-500">{desc}</p>}</div> }
function ReportSection(props: { eyebrow: string; title: string; desc: string }) { return <section className="report-page mt-8 print:mt-0"><ReportTitle {...props} /><div className="rounded-xl border border-border bg-card/60 p-6 print:border-slate-200 print:bg-white"><p className="text-sm leading-relaxed text-muted-foreground print:text-slate-600">{props.desc}</p></div></section> }
function TopMove({ action, index, isEn }: { action: ActionItem; index: number; isEn: boolean }) { return <div className="report-card rounded-2xl border border-primary/25 bg-primary/5 p-5 print:border-slate-200 print:bg-white"><div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{index + 1}</div><h3 className="text-base font-semibold leading-snug print:text-slate-900">{action.title}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground print:text-slate-600">{action.suggested_action || action.description}</p><div className="mt-4 rounded-lg bg-background/50 p-3 text-xs text-muted-foreground print:bg-slate-50 print:text-slate-600"><span className="font-medium text-foreground print:text-slate-900">{isEn ? "Affected" : "Dónde"}: </span>{action.affected_pages.slice(0, 3).join(", ")}</div></div> }
function MetricCard({ label, value, sub, delta, icon: Icon }: { label: string; value: string; sub?: string; delta?: string; icon: typeof Gauge }) { return <div className="rounded-xl border border-border bg-card/60 p-5 print:border-slate-200 print:bg-white"><div className="flex items-center justify-between"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary"><Icon className="h-4 w-4" /></span>{delta && <span className="flex items-center gap-1 text-xs font-medium text-emerald-400"><TrendingUp className="h-3 w-3" />{delta}</span>}</div><p className="mt-4 text-3xl font-semibold tracking-tight print:text-slate-900">{value}</p><p className="mt-1 text-sm text-muted-foreground print:text-slate-500">{label}</p>{sub && <p className="mt-0.5 text-xs text-muted-foreground/70">{sub}</p>}</div> }
function TrendChart({ data, currentLabel, targetLabel }: { data: Array<{ month: string; actual: number; target: number }>; currentLabel: string; targetLabel: string }) { const width = 640; const height = 200; const points = (key: "actual" | "target") => data.map((d, i) => `${(i / (data.length - 1)) * width},${height - (d[key] / 100) * height}`).join(" "); return <div className="rounded-xl border border-border bg-card/60 p-6 print:border-slate-200 print:bg-white"><div className="mb-4 flex items-center gap-6"><Legend color="bg-muted-foreground" label={currentLabel} /><Legend color="bg-primary" label={targetLabel} /></div><svg viewBox={`0 0 ${width} ${height}`} className="h-52 w-full" preserveAspectRatio="none">{[0, .25, .5, .75, 1].map((t) => <line key={t} x1="0" x2={width} y1={height * t} y2={height * t} stroke="currentColor" className="text-border" />)}<polyline points={points("target")} fill="none" stroke="rgb(99 102 241)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><polyline points={points("actual")} fill="none" stroke="currentColor" className="text-muted-foreground" strokeWidth="2.5" strokeDasharray="6 5" strokeLinecap="round" strokeLinejoin="round" /></svg><div className="mt-2 flex justify-between">{data.map((d) => <span key={d.month} className="text-xs text-muted-foreground">{d.month}</span>)}</div></div> }
function Legend({ color, label }: { color: string; label: string }) { return <div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${color}`} /><span className="text-xs text-muted-foreground">{label}</span></div> }
function Distribution({ label, count, color }: { label: string; count: number; color: string }) { return <div className="rounded-xl border border-border bg-card/60 p-5 print:border-slate-200 print:bg-white"><span className={`block h-1.5 w-12 rounded-full ${color}`} /><p className="mt-4 text-2xl font-semibold text-primary">{count}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></div> }
function RoadmapCard({ period, title, items }: { period: string; title: string; items: string[] }) { return <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/20 to-primary/5 p-6 print:border-slate-200 print:bg-white"><p className="text-sm font-semibold text-primary">{period}</p><h3 className="mt-2 font-semibold print:text-slate-900">{title}</h3><ul className="mt-4 space-y-3">{items.map((item) => <li key={item} className="flex gap-2.5 text-sm text-muted-foreground"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{item}</li>)}</ul></div> }
function Diagnosis({ title, desc, icon: Icon }: { title: string; desc: string; icon: typeof FileText }) { return <div className="flex gap-4 rounded-xl border border-border bg-card/60 p-5 print:border-slate-200 print:bg-white"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary"><Icon className="h-5 w-5" /></span><div><h3 className="text-sm font-semibold print:text-slate-900">{title}</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground print:text-slate-600">{desc}</p></div></div> }
function Recommendation({ rec, isEn }: { rec: ActionItem; isEn: boolean }) { return <div className="report-card break-inside-avoid rounded-xl border border-border bg-card/60 p-6 print:border-slate-200 print:bg-white"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold text-primary">{rec.category}</span><span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">{levelText(rec.priority, isEn)}</span></div><h3 className="mt-3 text-lg font-semibold print:text-slate-900">{rec.title}</h3><p className="mt-2 text-sm text-muted-foreground print:text-slate-600">{rec.description}</p><div className="print-one-col mt-4 grid gap-4 sm:grid-cols-3"><Mini label={isEn ? "Impact" : "Impacto"} value={levelText(rec.estimated_impact, isEn)} /><Mini label={isEn ? "Difficulty" : "Dificultad"} value={difficultyText(rec.difficulty, isEn)} /><Mini label={isEn ? "Implementation" : "Implementación"} value={rec.implementation_type} /></div><div className="print-one-col mt-4 grid gap-4 sm:grid-cols-2"><TextBlock icon={Zap} label={isEn ? "Recommended action" : "Acción recomendada"} text={rec.suggested_action} /><TextBlock icon={Target} label={isEn ? "Why it matters" : "Por qué importa"} text={rec.why_important} /></div><div className="mt-4 border-t border-border pt-4"><p className="text-xs font-semibold uppercase tracking-wider text-primary">{isEn ? "Botz GEO deliverables" : "Entregables Botz GEO"}</p><div className="mt-2 flex flex-wrap gap-2">{rec.deliverables.map((d) => <span key={d} className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{d}</span>)}</div><div className="mt-3 flex flex-wrap gap-1.5">{rec.affected_pages.map((p) => <span key={p} className="print-text-wrap flex items-center gap-1 rounded-md bg-secondary/50 px-2 py-0.5 text-xs text-muted-foreground"><MapPin className="h-3 w-3 shrink-0" />{p}</span>)}</div></div></div> }
function Mini({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-secondary/50 p-3 print:bg-slate-50"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-0.5 text-sm font-semibold print:text-slate-900">{value}</p></div> }
function TextBlock({ icon: Icon, label, text }: { icon: typeof Zap; label: string; text: string }) { return <div><p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</p><p className="mt-1.5 text-sm leading-relaxed text-muted-foreground print:text-slate-600">{text}</p></div> }
function Scope({ title, desc, icon: Icon }: { title: string; desc: string; icon: typeof Gauge }) { return <div className="flex gap-4 rounded-xl border border-border bg-card/60 p-5 print:border-slate-200 print:bg-white"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary"><Icon className="h-5 w-5" /></span><div><h3 className="text-sm font-semibold print:text-slate-900">{title}</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground print:text-slate-600">{desc}</p></div></div> }
function levelText(level: "high" | "medium" | "low", isEn: boolean) { return level === "high" ? (isEn ? "High" : "Alto") : level === "low" ? (isEn ? "Low" : "Bajo") : (isEn ? "Medium" : "Medio") }
function difficultyText(level: ActionItem["difficulty"], isEn: boolean) { return level === "easy" ? (isEn ? "Easy" : "Fácil") : level === "hard" ? (isEn ? "Hard" : "Difícil") : (isEn ? "Medium" : "Media") }
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
      title: "Create a specific industry landing page",
      description: "The client needs pages that answer specific prompts, not just a general page. An industry landing page helps capture AI recommendations for concrete use cases.",
      why_important: "ChatGPT, Gemini and Perplexity tend to recommend brands with explicit content for the use case or industry mentioned in the prompt.",
      suggested_action: "Create an industry page with problem, solution, benefits, use cases, FAQs, social proof and CTA.",
      implementation_type: "New landing page",
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
      suggested_action: "Add 6 to 10 real questions per page and publish FAQPage JSON-LD where appropriate.",
      implementation_type: "Content + JSON-LD",
      deliverables: ["FAQ block", "FAQPage JSON-LD", "Questions by search intent", "Schema validation"],
    },
    "authority-proof": {
      category: "Authority and trust",
      title: "Publish verifiable proof: case studies, results and citable sources",
      description: "The audit shows few citations. The brand needs assets AI can use as evidence: cases, metrics, clients, integrations, certifications or source articles.",
      why_important: "AI engines cite and recommend with more confidence when they find external evidence or pages with verifiable claims.",
      suggested_action: "Create at least one case study, a resources page and social-proof blocks with concrete verifiable outcomes.",
      implementation_type: "Authority content",
      deliverables: ["Case study", "Social proof block", "Sourced claims", "Citable resources page"],
    },
    "local-authority-distribution": {
      category: "Local authority distribution",
      title: "Turn local presence into citable signals, not just social posting",
      description: "Social media and influencer recommendations must become assets AI can find: mentions, articles, partnerships, events and linkable pages.",
      why_important: "Social media helps distribution, but GEO visibility improves when those actions generate indexable pages, mentions and sources.",
      suggested_action: "Create a partnerships page and turn local collaborations into articles, mentions and verifiable backlinks.",
      implementation_type: "PR + indexable content",
      deliverables: ["Partnerships page", "Local PR brief", "Media/partner list", "Indexable collaboration content"],
    },
  }
  return { ...action, ...(map[action.id] ?? {}) }
}

const reportPrintCss = `
  .premium-pdf { display: none; }
  @media print {
    @page { size: A4; margin: 0; }
    body { background: #fff !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    aside, .screen-report-content, .print\\:hidden, .sticky, .fixed, [class*="chat"], [class*="Chat"], [class*="assistant"], [class*="Assistant"] { display: none !important; }
    main { margin-left: 0 !important; }
    .report-shell { width: 210mm !important; max-width: 210mm !important; padding: 0 !important; margin: 0 !important; }
    .premium-pdf, .premium-pdf * { font-family: Arial, Helvetica, sans-serif !important; box-sizing: border-box; }
    .premium-pdf { display: block !important; color: #0f172a; }
    .premium-pdf::after { content: none !important; display: none !important; }
    .pdf-page-premium { position: relative; width: 210mm; min-height: auto; overflow: visible; page-break-after: auto; break-after: auto; padding: 9mm 14mm; background: linear-gradient(180deg, #ffffff 0%, #f7fbff 100%); }
    .pdf-page-premium:last-child { page-break-after: avoid !important; break-after: avoid !important; margin-bottom: 0 !important; padding-bottom: 6mm; }
    .pdf-cover { min-height: 297mm; page-break-after: always; break-after: page; overflow: hidden; }
    .pdf-page-fluid { height: auto; overflow: visible; }
    .pdf-page-compact { min-height: auto; }
    .pdf-cover { color: #fff; background: radial-gradient(circle at 78% 24%, rgba(79, 124, 255, .7), transparent 30%), linear-gradient(135deg, #07111f 0%, #0b1b34 48%, #111052 100%); }
    .pdf-header { display: flex; justify-content: space-between; color: #718096; font-size: 9px; letter-spacing: .18em; text-transform: uppercase; margin-top: 4mm; }
    .pdf-cover .pdf-header { color: rgba(255,255,255,.72); }
    .pdf-page-num { display: none; }
    .pdf-title { margin: 10px 0 10px; }
    .pdf-title p, .pdf-kicker { margin: 0 0 8px; color: #4f7cff; font-size: 10px; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; }
    .pdf-title h2 { margin: 0; color: #0f172a; font-size: 23px; line-height: 1.08; letter-spacing: -.02em; }
    .pdf-cover-grid { display: grid; grid-template-columns: 1.25fr .75fr; gap: 28px; align-items: center; margin-top: 44px; }
    .pdf-brand { display: flex; align-items: center; gap: 10px; font-size: 18px; font-weight: 900; }
    .pdf-brand span { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 12px; background: linear-gradient(135deg, #4f7cff, #22d3ee); }
    .pdf-cover h1 { margin: 18px 0 0; max-width: 500px; font-size: 58px; line-height: .95; letter-spacing: -.07em; }
    .pdf-lead { max-width: 480px; color: #c8d5ee; font-size: 15px; line-height: 1.55; }
    .pdf-meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 34px; }
    .pdf-info { border: 1px solid rgba(79,124,255,.18); background: rgba(255,255,255,.78); border-radius: 16px; padding: 12px; }
    .pdf-cover .pdf-info { border-color: rgba(255,255,255,.16); background: rgba(255,255,255,.09); }
    .pdf-info span { display: block; color: #718096; font-size: 9px; letter-spacing: .14em; text-transform: uppercase; }
    .pdf-cover .pdf-info span { color: #b7c4dc; }
    .pdf-info strong { display: block; margin-top: 5px; color: #0f172a; font-size: 12px; line-height: 1.3; overflow-wrap: anywhere; }
    .pdf-cover .pdf-info strong { color: #fff; }
    .pdf-score-panel { border: 1px solid rgba(255,255,255,.16); background: rgba(255,255,255,.08); border-radius: 28px; padding: 24px 16px; text-align: center; }
    .pdf-score-panel strong { display: inline-block; margin-top: 8px; border-radius: 999px; padding: 7px 14px; background: rgba(34,211,238,.16); color: #bff6ff; font-size: 12px; letter-spacing: .16em; text-transform: uppercase; }
    .pdf-score-panel p { color: #c8d5ee; font-size: 12px; line-height: 1.5; }
    .pdf-gauge { width: 180px; height: 180px; }
    .pdf-gauge text:first-of-type { fill: #fff; font-size: 40px; font-weight: 900; }
    .pdf-gauge text:last-of-type { fill: #c8d5ee; font-size: 11px; font-weight: 800; text-transform: uppercase; }
    .pdf-bullets { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 48px; }
    .pdf-bullet { display: flex; gap: 9px; align-items: flex-start; border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.08); border-radius: 16px; padding: 13px; color: #e2ecff; font-size: 11px; line-height: 1.45; }
    .pdf-bullet svg { color: #22d3ee; flex-shrink: 0; }
    .pdf-cover-bottom { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-top: 24px; border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.08); border-radius: 18px; padding: 16px 18px; color: #dce8ff; }
    .pdf-cover-bottom strong { color: #fff; font-size: 14px; letter-spacing: .08em; text-transform: uppercase; white-space: nowrap; }
    .pdf-cover-bottom span { color: #c8d5ee; font-size: 12px; line-height: 1.4; }
    .pdf-metric-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; }
    .pdf-metric, .pdf-empty, .pdf-outcomes { border: 1px solid #dbe5f5; background: #fff; border-radius: 20px; padding: 16px; box-shadow: 0 10px 26px rgba(30,64,175,.08); }
    .pdf-metric p { margin: 0; color: #64748b; font-size: 11px; }
    .pdf-metric strong { display: block; margin-top: 6px; color: #0f172a; font-size: 28px; letter-spacing: -.04em; }
    .pdf-metric span { display: block; margin-top: 5px; color: #64748b; font-size: 10px; line-height: 1.35; }
    .pdf-maturity { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-top: 14px; }
    .pdf-maturity span { border-radius: 12px; background: #eef4fb; padding: 10px 6px; color: #64748b; font-size: 10px; text-align: center; font-weight: 800; }
    .pdf-maturity .active { background: linear-gradient(135deg, #4f7cff, #22d3ee); color: #fff; }
    .pdf-snapshot-fill { display: grid; grid-template-columns: 1.2fr .8fr; gap: 9px; margin-top: 10px; }
    .pdf-snapshot-fill > div { border: 1px solid #dbe5f5; background: #fff; border-radius: 18px; padding: 14px; }
    .pdf-snapshot-fill h3 { margin: 0 0 6px; color: #0f172a; font-size: 15px; }
    .pdf-snapshot-fill p { margin: 0; color: #475569; font-size: 10px; line-height: 1.42; }
    .pdf-snapshot-fill ul { margin: 0; padding-left: 16px; color: #475569; font-size: 10px; line-height: 1.42; }
    .pdf-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; align-items: stretch; }
    .pdf-radar, .pdf-empty { border: 1px solid #dbe5f5; background: #fff; border-radius: 20px; padding: 12px; }
    .pdf-radar svg { width: 100%; height: 270px; overflow: visible; }
    .pdf-radar text { fill: #475569; font-size: 8.5px; font-weight: 800; }
    .pdf-empty { display: block; color: #64748b; min-height: 270px; padding: 20px; }
    .pdf-empty h3 { margin: 0 0 12px; color: #0f172a; font-size: 18px; }
    .pdf-empty p { margin: 0; font-size: 12px; line-height: 1.5; }
    .pdf-diagnostic-notes { display: grid; grid-template-columns: repeat(5, 1fr); gap: 7px; margin-top: 9px; }
    .pdf-diagnostic-notes div { border: 1px solid #dbe5f5; border-radius: 14px; background: #fff; padding: 10px; }
    .pdf-diagnostic-notes strong { display: block; color: #4f7cff; font-size: 16px; }
    .pdf-diagnostic-notes span { display: block; margin-top: 3px; color: #475569; font-size: 9px; line-height: 1.2; }
    .pdf-diagnostic-notes, .pdf-diagnostic-notes div, .pdf-matrix div, .pdf-metric, .pdf-snapshot-fill > div, .pdf-funnel-explain, .pdf-roadmap div, .pdf-outcomes, .pdf-competitive { break-inside: avoid; page-break-inside: avoid; }
    .pdf-competitive { display: grid; grid-template-columns: 1.35fr .65fr; gap: 10px; margin-top: 10px; border: 1px solid #dbe5f5; background: linear-gradient(135deg, #f8fbff, #eef6ff); border-radius: 18px; padding: 13px; }
    .pdf-competitive h3 { margin: 0 0 6px; color: #0f172a; font-size: 15px; }
    .pdf-competitive p { margin: 0; color: #475569; font-size: 9.8px; line-height: 1.38; }
    .pdf-competitive-stats { display: grid; gap: 6px; }
    .pdf-competitive-stats span { display: flex; align-items: center; justify-content: space-between; border: 1px solid #dbe5f5; border-radius: 12px; background: #fff; padding: 7px 9px; color: #64748b; font-size: 8.5px; font-weight: 800; text-transform: uppercase; }
    .pdf-competitive-stats b { color: #4f7cff; font-size: 16px; }
    .pdf-funnel { border: 1px solid #dbe5f5; background: #fff; border-radius: 22px; padding: 18px; }
    .pdf-funnel-row { margin-bottom: 10px; }
    .pdf-funnel-row div { min-width: 34%; display: flex; align-items: center; gap: 10px; justify-content: space-between; border-radius: 15px; padding: 11px 14px; background: linear-gradient(90deg, #0b1b34, #4f7cff 70%, #22d3ee); color: #fff; }
    .pdf-funnel-row b { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 999px; background: rgba(255,255,255,.16); }
    .pdf-funnel-row span { flex: 1; font-size: 13px; font-weight: 800; }
    .pdf-funnel-row strong { font-size: 17px; }
    .pdf-funnel-explain { margin-top: 9px; border: 1px solid #dbe5f5; background: #fff; border-radius: 18px; padding: 12px; }
    .pdf-funnel-explain h3 { margin: 0 0 6px; color: #0f172a; font-size: 16px; }
    .pdf-funnel-explain p { margin: 0; color: #475569; font-size: 10px; line-height: 1.45; }
    .pdf-matrix { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; min-height: auto; }
    .pdf-matrix div { border: 1px solid #dbe5f5; background: #f8fbff; border-radius: 18px; padding: 11px; min-height: 116px; }
    .pdf-matrix h3 { margin: 0 0 4px; color: #0f172a; font-size: 14px; }
    .pdf-matrix p { margin: 0 0 7px; color: #64748b; font-size: 8.5px; line-height: 1.25; }
    .pdf-matrix em { display: block; margin-top: 6px; color: #94a3b8; font-size: 8.5px; font-style: normal; }
    .pdf-matrix span { display: inline-block; max-width: 100%; margin: 0 4px 5px 0; border: 1px solid #dbe5f5; border-radius: 999px; background: #fff; padding: 5px 7px; color: #334155; font-size: 7.8px; font-weight: 800; line-height: 1.2; }
    .pdf-roadmap { display: grid; gap: 9px; }
    .pdf-roadmap div { position: relative; border: 1px solid #dbe5f5; background: #fff; border-radius: 18px; padding: 12px 12px 12px 70px; min-height: 112px; }
    .pdf-roadmap b { position: absolute; left: 12px; top: 14px; display: grid; place-items: center; width: 42px; height: 42px; border-radius: 15px; background: linear-gradient(135deg, #4f7cff, #22d3ee); color: #fff; font-size: 18px; }
    .pdf-roadmap h3 { margin: 0 0 5px; color: #0f172a; font-size: 15px; }
    .pdf-roadmap p { margin: 0 0 5px; color: #475569; font-size: 9.5px; line-height: 1.32; }
    .pdf-roadmap strong { color: #0f766e; font-size: 10px; }
    .pdf-rec-intro { display: flex; gap: 10px; align-items: center; border: 1px solid #dbe5f5; border-radius: 16px; background: #f8fbff; padding: 12px 14px; margin-bottom: 10px; color: #475569; font-size: 11px; }
    .pdf-rec-intro strong { color: #0f172a; white-space: nowrap; }
    .pdf-rec-stack { display: grid; gap: 8px; }
    .pdf-rec { border: 1px solid #dbe5f5; background: #fff; border-radius: 18px; padding: 12px; break-inside: avoid; page-break-inside: avoid; }
    .pdf-rec-head { display: flex; gap: 10px; align-items: flex-start; }
    .pdf-rec b { color: #4f7cff; font-weight: 900; }
    .pdf-rec small { display: block; color: #4f7cff; font-size: 8px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
    .pdf-rec h3 { margin: 2px 0 0; color: #0f172a; font-size: 14px; line-height: 1.2; }
    .pdf-rec p { margin: 7px 0; color: #475569; font-size: 9.5px; line-height: 1.38; }
    .pdf-rec-badges { display: flex; flex-wrap: wrap; gap: 5px; margin: 8px 0; }
    .pdf-rec span { display: inline-block; margin: 0 5px 5px 0; border-radius: 999px; background: #eef4ff; padding: 5px 8px; color: #3357c2; font-size: 8.5px; font-weight: 800; }
    .pdf-rec-split { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; border-top: 1px solid #e5edf8; padding-top: 8px; margin-top: 8px; }
    .pdf-rec-split strong { display: block; margin-bottom: 5px; color: #0f172a; font-size: 9px; }
    .pdf-url-list { display: grid; gap: 4px; }
    .pdf-url { display: block !important; width: 100%; margin: 0 !important; border-radius: 8px !important; background: #f8fbff !important; color: #64748b !important; font-size: 8px !important; line-height: 1.25 !important; overflow-wrap: anywhere; word-break: break-word; white-space: normal; }
    .pdf-outcomes { text-align: center; padding: 18px; }
    .pdf-outcomes h3 { margin: 0 0 8px; color: #0f172a; font-size: 24px; }
    .pdf-outcomes p { color: #475569; line-height: 1.55; }
    .pdf-next { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 22px; }
    .pdf-next div { border: 1px solid #dbe5f5; border-radius: 18px; background: #fff; padding: 18px; text-align: center; }
    .pdf-next b { display: grid; place-items: center; margin: 0 auto 10px; width: 30px; height: 30px; border-radius: 999px; background: #4f7cff; color: #fff; }
    .pdf-next span { color: #0f172a; font-size: 12px; font-weight: 800; }
    .pdf-contact { margin-top: 24px; color: #475569; text-align: center; font-size: 12px; }
  }
`
