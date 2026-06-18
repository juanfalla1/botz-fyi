"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { AlertCircle, AlertTriangle, ArrowLeft, CheckCircle2, Download, Eye, FileText, Lightbulb, MessageSquare, Quote, Search, ShieldCheck, Target, Trash2, TrendingUp, Trophy, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AppHeader } from "@/GEO/components/geo/app-shell"
import { useGeoI18n } from "@/GEO/components/geo/i18n"
import { supabaseGeo } from "@/app/geo/supabaseGeoClient"

type AuditDetail = {
  id: string
  project_id: string
  status: string
  base_url: string
  crawl_depth: number
  engines: unknown
  summary: string | null
  final_score: number | null
  created_at: string
  completed_at: string | null
  audit_job?: { id: string; status: string; error_message?: string | null; failed_reason?: string | null; created_at?: string | null; started_at?: string | null; completed_at?: string | null } | null
  projects?: { company_name?: string; website_url?: string; country?: string; language?: string; industry?: string }
  ai_queries?: Array<{ id: string; prompt: string; engine: string; intent?: string | null; ai_answers?: Array<{ answer_text?: string; citations?: unknown; raw_response?: Record<string, unknown> }> }>
  brand_mentions?: Array<Record<string, unknown>>
  competitor_mentions?: Array<Record<string, unknown>>
  content_opportunities?: Array<Record<string, unknown>>
  crawled_pages?: Array<Record<string, unknown>>
}

type AuditListItem = {
  id: string
  project_id: string
  status?: string
  base_url: string
  crawl_depth?: number
  engines?: unknown
  summary?: string | null
  final_score: number | null
  created_at: string
  completed_at?: string | null
}

function parseSummary(summary: string | null): Record<string, unknown> {
  if (!summary) return {}
  try {
    const parsed = JSON.parse(summary)
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function numberFrom(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function percentOrEmpty(value: number | null, empty: string) {
  return value === null ? empty : `${value}%`
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : []
}

function objectArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : []
}

function citationItemsFrom(value: unknown) {
  if (Array.isArray(value)) return value
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    if (Array.isArray(record.citations)) return record.citations
    if (Array.isArray(record.sources)) return record.sources
    if (Array.isArray(record.urls)) return record.urls
  }
  return []
}

function citationUrl(value: unknown) {
  if (typeof value === "string") return value
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    return String(record.url ?? record.link ?? record.source_url ?? "")
  }
  return ""
}

function citationName(value: unknown, url: string) {
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    const explicit = String(record.title ?? record.name ?? record.source_name ?? record.source ?? "").trim()
    if (explicit) return explicit
  }
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url || "Fuente"
  }
}

function engineLabel(engine: unknown) {
  const value = String(engine || "").toLowerCase()
  if (value === "openai") return "ChatGPT"
  if (value === "gemini") return "Gemini"
  if (value === "perplexity") return "Perplexity"
  if (value === "ai_overviews" || value === "ai-overviews") return "AI Overviews"
  return String(engine || "Motor IA")
}

function mentionPositionLabel(position: unknown) {
  const value = String(position || "")
  const labels: Record<string, string> = {
    primera_opcion: "Primera opción",
    lista_secundaria: "Lista secundaria",
    mencion_indirecta: "Mención indirecta",
    no_mencionada: "No mencionada",
  }
  return labels[value] ?? value.replace(/_/g, " ")
}

function mentionPositionNumber(position: unknown) {
  const value = String(position || "")
  if (value === "primera_opcion") return 1
  if (value === "lista_secundaria") return 2
  if (typeof position === "number" && Number.isFinite(position)) return position
  return 0
}

function recommendationTone(priority: unknown) {
  const value = String(priority || "").toLowerCase()
  if (value === "alta" || value === "high" || value === "critica") return "border-red-500/30 bg-red-500/10 text-red-200"
  if (value === "media" || value === "medium") return "border-yellow-500/30 bg-yellow-500/10 text-yellow-200"
  return "border-border bg-secondary/30 text-primary"
}

function difficultyTone(value: unknown) {
  const text = String(value || "").toLowerCase()
  if (text.includes("baja") || text.includes("low")) return "bg-green-500/20 text-green-400"
  if (text.includes("alta") || text.includes("high")) return "bg-red-500/20 text-red-400"
  return "bg-yellow-500/20 text-yellow-400"
}

function opportunityScore(value: unknown, index: number) {
  const text = String(value || "").toLowerCase()
  if (text.includes("alta") || text.includes("high")) return 85
  if (text.includes("media") || text.includes("medium")) return 72
  if (text.includes("baja") || text.includes("low")) return 65
  return Math.max(50, 85 - index * 8)
}

export default function AuditDetailReal() {
  const params = useParams<{ id?: string; auditId?: string; projectId?: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const auditId = params?.auditId ?? params?.id ?? searchParams.get("id")
  const { locale } = useGeoI18n()
  const isEn = locale === "en"
  const [audit, setAudit] = useState<AuditDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!auditId) return
      setLoading(true)
      setError(null)
      try {
        const {
          data: { session },
        } = await supabaseGeo.auth.getSession()
        if (!session?.access_token) throw new Error(isEn ? "Sign in to view this audit." : "Inicia sesión para ver esta auditoría.")
        const headers = { Authorization: `Bearer ${session.access_token}` }
        const res = await fetch(`/api/geo/audits/${auditId}`, { headers })
        const json = (await res.json().catch(() => null)) as { data?: AuditDetail; error?: string } | null
        if (res.ok && json?.data) {
          if (mounted) setAudit(json.data)
          return
        }

        const listRes = await fetch("/api/geo/audits", { headers })
        const listJson = (await listRes.json().catch(() => null)) as { data?: { audits?: AuditListItem[] } } | null
        const listAudit = listJson?.data?.audits?.find((item) => item.id === auditId)
        if (listAudit) {
          if (mounted) {
            setAudit({
              id: listAudit.id,
              project_id: listAudit.project_id,
              status: listAudit.status ?? "completed",
              base_url: listAudit.base_url,
              crawl_depth: listAudit.crawl_depth ?? 1,
              engines: listAudit.engines ?? [],
              summary: listAudit.summary ?? null,
              final_score: listAudit.final_score,
              created_at: listAudit.created_at,
              completed_at: listAudit.completed_at ?? null,
              projects: {
                company_name: listAudit.base_url.replace(/^https?:\/\//, "").split("/")[0],
                website_url: listAudit.base_url,
              },
            })
          }
          return
        }

        throw new Error(json?.error || (isEn ? "Audit not found or unavailable." : "Auditoría no encontrada o no disponible."))
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : isEn ? "Could not load audit." : "No se pudo cargar la auditoría.")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void load()
    const interval = setInterval(() => void load(), 5000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [auditId, isEn])

  const summary = useMemo(() => parseSummary(audit?.summary ?? null), [audit?.summary])
  const semantic = (summary.semantic_analysis && typeof summary.semantic_analysis === "object" ? summary.semantic_analysis : null) as Record<string, unknown> | null
  const metadata = (summary.provider_metadata && typeof summary.provider_metadata === "object" ? summary.provider_metadata : {}) as Record<string, unknown>
  const engineBreakdown = (summary.engine_breakdown && typeof summary.engine_breakdown === "object" ? summary.engine_breakdown : {}) as Record<string, unknown>
  const engineBreakdownItems = Array.isArray(summary.engine_breakdown)
    ? objectArray(summary.engine_breakdown)
    : Object.entries(engineBreakdown).map(([engine, value]) => ({ engine, ...(value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : { value }) }))
  const recommendations = Array.isArray(summary.recommendations) ? summary.recommendations as Array<Record<string, unknown>> : []
  const storedContentOpportunities = objectArray(summary.content_opportunities)
  const aiMentions = objectArray(semantic?.ai_mentions)
  const competitorVisibility = objectArray(semantic?.competitor_visibility)
  const crawledPages = objectArray(audit?.crawled_pages)
  const crawlEvidence = objectArray(summary.crawl_evidence)
  const storedQueries = Array.isArray(audit?.ai_queries) ? audit.ai_queries : []
  const citedSources = Array.from(
    storedQueries.reduce((acc, query) => {
      for (const answer of query.ai_answers ?? []) {
        for (const citation of citationItemsFrom(answer.citations)) {
          const url = citationUrl(citation).trim()
          if (!url || acc.has(url)) continue
          acc.set(url, { source_name: citationName(citation, url), url, influence: "trazable" })
        }
      }
      return acc
    }, new Map<string, Record<string, unknown>>()).values()
  )
  const evaluatedPromptsFromQueries = storedQueries.map((query) => {
    const answer = Array.isArray(query.ai_answers) ? query.ai_answers[0] : null
    const raw = answer?.raw_response && typeof answer.raw_response === "object" ? answer.raw_response : {}
    return {
      engine: query.engine,
      prompt: query.prompt,
      mentioned: Boolean(raw.brand_mentioned),
      position: raw.ranking_position,
      answer_preview: String(answer?.answer_text ?? "").slice(0, 400),
    }
  })
  const evaluatedPrompts = evaluatedPromptsFromQueries.length > 0 ? evaluatedPromptsFromQueries : objectArray(summary.evaluated_prompts)
  const sentiment = (semantic?.sentiment && typeof semantic.sentiment === "object" ? semantic.sentiment : null) as Record<string, unknown> | null
  const engines = stringArray(audit?.engines)
  const auditJobStatus = String(audit?.audit_job?.status ?? audit?.status ?? "").toLowerCase()
  const auditProcessing = Boolean(audit) && !audit?.completed_at && ["pending", "queued", "running"].includes(auditJobStatus)
  const auditFailed = Boolean(audit) && auditJobStatus === "failed"
  const auditJobError = audit?.audit_job?.error_message ?? audit?.audit_job?.failed_reason ?? null
  const enginePromptsTested = engineBreakdownItems.reduce((total, item) => total + numberFrom(item.prompts_total), 0)
  const engineLiveResults = engineBreakdownItems.reduce((total, item) => total + numberFrom(item.live_count), 0)
  const enginePromptsWon = engineBreakdownItems.reduce((total, item) => total + numberFrom(item.prompts_won), 0)
  const engineCitations = engineBreakdownItems.reduce((total, item) => total + numberFrom(item.citations ?? item.citations_count), 0)
  const promptsTested = numberFrom(summary.prompts_tested ?? metadata.prompts_tested) || enginePromptsTested
  const promptsWon = numberFrom(summary.prompts_won ?? metadata.prompts_won) || enginePromptsWon
  const citations = numberFrom(summary.citations_count ?? metadata.citations_count) || engineCitations
  const totalResults = numberFrom(summary.total_results ?? metadata.total_results) || promptsTested
  const hasScoreEvidence = totalResults > 0 || engineLiveResults > 0
  const rawScoreValue = optionalNumber(audit?.final_score) ?? optionalNumber(summary.geo_score)
  const scoreValue = hasScoreEvidence ? rawScoreValue : null
  const score = scoreValue ?? 0
  const spontaneousResults = numberFrom(summary.spontaneous_results ?? metadata.spontaneous_results)
  const assistedResults = numberFrom(summary.assisted_results ?? metadata.assisted_results)
  const competitiveResults = numberFrom(summary.competitive_results ?? metadata.competitive_results)
  const citationResults = numberFrom(summary.citation_results ?? metadata.citation_results)
  const spontaneousVisibility = spontaneousResults > 0 ? Math.round(numberFrom(summary.spontaneous_visibility ?? summary.ai_visibility ?? semantic?.brand_visibility)) : null
  const assistedVisibility = assistedResults > 0 ? Math.round(numberFrom(summary.assisted_visibility)) : null
  const competitiveVisibility = competitiveResults > 0 ? Math.round(numberFrom(summary.competitive_visibility)) : null
  const citationCoverage = citationResults > 0 ? Math.round(numberFrom(summary.citation_coverage)) : null
  const metricRisks = [
    spontaneousVisibility === null || spontaneousVisibility === 0
      ? {
          risk_type: isEn ? "No spontaneous visibility" : "Sin visibilidad espontánea",
          description: isEn ? "The brand did not appear in neutral discovery prompts. This is the strongest signal to improve first." : "La marca no apareció en prompts neutrales de descubrimiento. Esta es la señal más importante a mejorar primero.",
        }
      : spontaneousVisibility < 40
      ? {
          risk_type: isEn ? "Low spontaneous visibility" : "Baja visibilidad espontánea",
          description: isEn ? "The brand appears in some neutral prompts, but not often enough to claim strong AI discovery." : "La marca aparece en algunos prompts neutrales, pero todavía no lo suficiente para afirmar descubrimiento fuerte en IA.",
        }
      : null,
    citationCoverage === null || citationCoverage < 50
      ? {
          risk_type: isEn ? "Weak citation coverage" : "Cobertura de citations débil",
          description: isEn ? "AI responses have limited traceable sources for this brand. Add pages and proof assets that engines can cite." : "Las respuestas IA tienen pocas fuentes trazables para esta marca. Agrega páginas y activos de prueba que los motores puedan citar.",
        }
      : null,
    competitiveVisibility === null
      ? {
          risk_type: isEn ? "No competitive sample" : "Sin muestra competitiva",
          description: isEn ? "This audit cannot explain competitive wins or losses because no competitive sample was collected." : "Esta auditoría no puede explicar victorias o pérdidas competitivas porque no se recolectó muestra competitiva.",
        }
      : null,
  ].filter((item): item is Record<string, unknown> => Boolean(item))
  const nextActions = [
    isEn ? "Create or improve service, category and use-case pages for neutral discovery prompts." : "Crear o mejorar páginas de servicios, categorías y casos de uso para prompts neutrales de descubrimiento.",
    isEn ? "Add citable proof assets: methodology, FAQs, customer examples and verifiable claims." : "Agregar activos citables: metodología, FAQs, ejemplos de clientes y afirmaciones verificables.",
    competitiveVisibility === null
      ? (isEn ? "Add comparison/alternatives content and run a competitive prompt sample before making competitor claims." : "Agregar contenido de comparativas/alternativas y correr una muestra competitiva antes de concluir sobre competidores.")
      : (isEn ? "Prioritize comparison pages for competitors that appear in prompt evidence." : "Priorizar páginas comparativas para competidores que aparezcan en evidencia por prompt."),
  ]
  const aiVisibility = spontaneousVisibility ?? 0
  const confidence = Math.round(numberFrom(sentiment?.score) * 100)
  const directMentions = aiMentions.filter((mention) => String(mention.position) !== "no_mencionada").length
  const competitorPressure = competitiveResults > 0 && competitorVisibility.length ? Math.round(Math.max(...competitorVisibility.map((competitor) => numberFrom(competitor.visibility_score)))) : null
  const enginePerformance = engineBreakdownItems.map((item) => {
    const total = numberFrom(item.prompts_total)
    const won = numberFrom(item.prompts_won)
    const live = numberFrom(item.live_count)
    const fallback = numberFrom(item.fallback_count)
    return { name: engineLabel(item.engine), score: total > 0 ? Math.round((won / total) * 100) : null, total, won, live, fallback }
  }).filter((item) => item.total > 0)
  const metricRecommendations = [
    spontaneousVisibility === null || spontaneousVisibility < 40
      ? {
          title: isEn ? "Strengthen neutral discovery pages" : "Fortalecer páginas para descubrimiento neutral",
          description: isEn ? "Create clearer service, use-case and category pages so AI can recommend the brand without the prompt naming it." : "Crear páginas más claras de servicios, casos de uso y categorías para que la IA pueda recomendar la marca sin que el prompt la nombre.",
          priority: "high",
        }
      : null,
    citationCoverage === null || citationCoverage < 60
      ? {
          title: isEn ? "Add citable proof assets" : "Agregar activos citables de prueba",
          description: isEn ? "Publish evidence-backed pages with client examples, methodology, FAQs and verifiable claims that AI can cite." : "Publicar páginas con evidencia, ejemplos de clientes, metodología, FAQs y afirmaciones verificables que la IA pueda citar.",
          priority: "medium",
        }
      : null,
    competitiveVisibility === null
      ? {
          title: isEn ? "Run and support competitive prompts" : "Activar y soportar prompts competitivos",
          description: isEn ? "Add comparison and alternatives content before drawing competitive conclusions from this audit." : "Agregar contenido de comparativas y alternativas antes de sacar conclusiones competitivas de esta auditoría.",
          priority: "medium",
        }
      : competitiveVisibility < 50
      ? {
          title: isEn ? "Improve comparison proof" : "Mejorar evidencia comparativa",
          description: isEn ? "Create comparison pages against tracked competitors with differentiators, proof and citations." : "Crear páginas comparativas contra competidores monitoreados con diferenciales, pruebas y fuentes citables.",
          priority: "high",
        }
      : null,
  ].filter((item): item is Record<string, unknown> => Boolean(item))
  const recommendationSource = metricRecommendations.length ? metricRecommendations : recommendations
  const relatedContentOpportunities = objectArray(audit?.content_opportunities)
  const contentOpportunities = metricRecommendations.length > 0
    ? metricRecommendations.map((item, index) => ({
        keyword: item.title,
        volume: null,
        difficulty: item.priority,
        current_rank: null,
        opportunity: opportunityScore(item.priority, index),
      }))
    : relatedContentOpportunities.length > 0
    ? relatedContentOpportunities.map((item) => ({
        keyword: item.title,
        volume: null,
        difficulty: item.priority,
        current_rank: null,
        opportunity: opportunityScore(item.priority, 0),
      }))
    : storedContentOpportunities.length > 0
    ? storedContentOpportunities
    : recommendationSource.slice(0, 3).map((rec, index) => ({
        keyword: rec.keyword ?? rec.action_item ?? rec.title ?? `Oportunidad ${index + 1}`,
        volume: rec.volume ?? null,
        difficulty: rec.difficulty ?? rec.priority ?? rec.impact ?? "media",
        current_rank: rec.current_rank ?? rec.currentRank ?? null,
        opportunity: rec.opportunity ?? opportunityScore(rec.priority ?? rec.impact, index),
      }))
  const engineCount = engines.length
  const lowSample = totalResults > 0 && totalResults < 12
  const scoreTarget = score < 60 ? 60 : score < 75 ? 75 : 90
  const scoreGap = Math.max(0, scoreTarget - score)
  const targetProgress = scoreTarget > 0 ? Math.min(100, Math.round((score / scoreTarget) * 100)) : 0
  const citationProxy = citationCoverage ?? (citations > 0 ? Math.min(100, citations * 10) : null)
  const authorityValue = citationProxy
  const positioningValue = spontaneousVisibility === null && citationProxy === null ? null : Math.round(((spontaneousVisibility ?? 0) + (citationProxy ?? 0)) / ((spontaneousVisibility === null || citationProxy === null) ? 1 : 2))
  const scoreComponents = [
    { label: isEn ? "Spontaneous visibility" : "Visibilidad espontánea", weight: 60, value: spontaneousVisibility, note: isEn ? "Neutral prompts where the brand appeared." : "Prompts neutrales donde apareció la marca." },
    { label: isEn ? "Citation coverage" : "Cobertura de citaciones", weight: 15, value: citationProxy, note: isEn ? "Evidence or sources found in AI answers." : "Evidencia o fuentes encontradas en respuestas IA." },
    { label: isEn ? "Competitive win rate" : "Win rate competitivo", weight: 15, value: competitiveVisibility, note: isEn ? "Comparative prompts won against competitors." : "Prompts comparativos ganados frente a competidores." },
    { label: isEn ? "Authority / trust" : "Autoridad / confianza", weight: 5, value: authorityValue, note: isEn ? "Confidence, citations and proof signals." : "Confianza, citaciones y señales de prueba." },
    { label: isEn ? "Positioning clarity" : "Claridad del posicionamiento", weight: 5, value: positioningValue, note: isEn ? "How clearly AI can classify the brand." : "Qué tan claro puede clasificar la IA a la marca." },
  ]
  const scoreReason = !hasScoreEvidence
    ? isEn ? "No GEO Score is available yet because this audit has no executed prompt evidence." : "Aún no hay GEO Score disponible porque esta auditoría no tiene evidencia de prompts ejecutados."
    : score < 35
    ? isEn ? "The score is low because the brand is still weak in neutral prompts, citations or competitive answers." : "El score es bajo porque la marca aún está débil en prompts neutrales, citaciones o respuestas competitivas."
    : score < 60
    ? isEn ? "The brand has early visibility, but it still needs stronger evidence, clearer positioning and more wins against competitors." : "La marca ya tiene señales iniciales, pero necesita más evidencia, posicionamiento más claro y más victorias frente a competidores."
    : isEn ? "The brand has a useful visibility base. The next step is scaling citations and defending competitive prompts." : "La marca tiene una base útil de visibilidad. El siguiente paso es escalar citaciones y defender prompts competitivos."
  const competitorLosses = competitiveResults > 0 ? competitorVisibility.slice(0, 4).map((competitor) => {
    const name = String(competitor.name ?? "Competidor")
    const wonPrompts = evaluatedPrompts.filter((item) => String(item.prompt ?? "").toLowerCase().includes(name.toLowerCase()))
    const hasPromptEvidence = wonPrompts.length > 0
    return {
      name,
      score: hasPromptEvidence ? Math.round(numberFrom(competitor.visibility_score)) : null,
      prompts: wonPrompts.map((item) => String(item.prompt ?? "")).slice(0, 3),
      why: wonPrompts.length > 0
        ? isEn ? "AI had explicit comparison context and enough evidence to mention this competitor." : "La IA tuvo contexto comparativo explícito y suficiente evidencia para mencionar a este competidor."
        : isEn ? "There is not enough prompt-level evidence stored to explain the exact win yet." : "Aún no hay suficiente evidencia por prompt para explicar la victoria exacta.",
      missing: isEn ? "Your brand needs clearer comparison content, proof assets and citable pages." : "Tu marca necesita comparativas más claras, pruebas verificables y páginas citables.",
      action: isEn ? `Create a comparison page against ${name} and add verifiable proof.` : `Crear una página comparativa contra ${name} y agregar evidencia verificable.`,
    }
  }) : []
  const canonicalExecutiveSummary = isEn
    ? `This audit produced a GEO Score of ${scoreValue === null ? "not available" : `${score}/100`}. Spontaneous visibility is ${percentOrEmpty(spontaneousVisibility, "not sampled")}, citation coverage is ${percentOrEmpty(citationCoverage, "not sampled")}, and competitive win rate is ${percentOrEmpty(competitiveVisibility, "not sampled")}. Treat this as directional evidence until more prompts are collected.`
    : `Esta auditoría produjo un GEO Score de ${scoreValue === null ? "no disponible" : `${score}/100`}. La visibilidad espontánea es ${percentOrEmpty(spontaneousVisibility, "sin muestra")}, la cobertura de citations es ${percentOrEmpty(citationCoverage, "sin muestra")} y el win rate competitivo está ${percentOrEmpty(competitiveVisibility, "sin muestra")}. Úsalo como evidencia direccional hasta recolectar más prompts.`

  const deleteAudit = async () => {
    if (!audit?.id) return
    setDeleting(true)
    setError(null)
    try {
      const {
        data: { session },
      } = await supabaseGeo.auth.getSession()
      if (!session?.access_token) throw new Error(isEn ? "Sign in again to delete this audit." : "Inicia sesión de nuevo para eliminar esta auditoría.")
      const res = await fetch("/api/geo/audits/delete", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id: audit.id }),
      })
      const json = (await res.json().catch(() => null)) as { error?: string } | null
      if (!res.ok) throw new Error(json?.error || (isEn ? "Could not delete audit." : "No se pudo eliminar la auditoría."))
      router.push("/geo/app/audits")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : isEn ? "Could not delete audit." : "No se pudo eliminar la auditoría.")
      setShowDeleteModal(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <AppHeader />
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Button variant="ghost" className="mb-2 px-0 text-muted-foreground hover:text-foreground" asChild>
              <Link href="/geo/app/audits"><ArrowLeft className="mr-2 h-4 w-4" />{isEn ? "Back to audits" : "Volver a auditorías"}</Link>
            </Button>
            <h2 className="text-2xl font-bold">{isEn ? "Audit Detail" : "Detalle de auditoría"}</h2>
            <p className="text-muted-foreground">{audit?.projects?.company_name ?? audit?.base_url ?? (isEn ? "Real audit evidence" : "Evidencia real de auditoría")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {audit?.status && <span className="w-fit rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">{audit.status}</span>}
            {audit?.project_id && (
              <Button variant="outline" className="border-border" asChild>
                <Link href={`/geo/app/projects/${audit.project_id}/recommendations/report`}><Download className="mr-2 h-4 w-4" />{isEn ? "Download PDF report" : "Descargar reporte PDF"}</Link>
              </Button>
            )}
            {audit && (
              <Button variant="outline" className="border-red-500/30 text-red-300 hover:bg-red-500/10 hover:text-red-200" onClick={() => setShowDeleteModal(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                {isEn ? "Delete audit" : "Eliminar auditoría"}
              </Button>
            )}
          </div>
        </div>

        {loading && <Card className="glass border-border"><CardContent className="py-14 text-center text-muted-foreground">{isEn ? "Loading audit..." : "Cargando auditoría..."}</CardContent></Card>}
        {!loading && error && <Card className="glass border-border"><CardContent className="py-14 text-center text-muted-foreground">{error}</CardContent></Card>}
        {!loading && !error && !audit && <Card className="glass border-border"><CardContent className="py-14 text-center text-muted-foreground">{isEn ? "No audit data available." : "No hay datos de auditoría disponibles."}</CardContent></Card>}

        {!loading && !error && audit && auditProcessing && (
          <Card className="glass border-border">
            <CardContent className="py-14 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Zap className="h-7 w-7 animate-pulse" />
              </div>
              <h3 className="text-xl font-semibold">{isEn ? "Audit processing" : "Auditoría en procesamiento"}</h3>
              <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
                {isEn
                  ? "Botz GEO is querying all selected engines and collecting real evidence. This page updates automatically."
                  : "Botz GEO está consultando todos los motores seleccionados y recolectando evidencia real. Esta página se actualiza automáticamente."}
              </p>
              <p className="mt-4 text-xs text-muted-foreground">{isEn ? "Current status" : "Estado actual"}: {auditJobStatus || audit.status}</p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && audit && auditFailed && !audit.completed_at && (
          <Card className="glass border-red-500/30 bg-red-500/5">
            <CardContent className="py-10 text-center text-red-200">
              <AlertTriangle className="mx-auto mb-3 h-8 w-8" />
              <h3 className="text-lg font-semibold">{isEn ? "Audit processing failed" : "Falló el procesamiento de la auditoría"}</h3>
              <p className="mx-auto mt-2 max-w-xl text-sm text-red-100/80">{auditJobError || (isEn ? "One or more engines failed before producing enough evidence." : "Uno o más motores fallaron antes de producir evidencia suficiente.")}</p>
            </CardContent>
          </Card>
        )}

        {audit && !auditProcessing && !(auditFailed && !audit.completed_at) && (
          <>
            <Card className="glass glow-primary overflow-hidden border-border">
              <CardContent className="p-8">
                <div className="grid grid-cols-1 items-center gap-8 xl:grid-cols-[220px_minmax(0,1fr)]">
                  <div className="text-center xl:text-left">
                    <p className="mb-2 text-sm uppercase tracking-wider text-muted-foreground">GEO Score</p>
                    <div className="relative mx-auto h-48 w-48 xl:mx-0">
                      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-secondary" />
                        <circle cx="50" cy="50" r="45" fill="none" stroke="url(#realScoreGradient)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${Math.max(0, Math.min(100, score)) * 2.83} ${100 * 2.83}`} />
                        <defs>
                          <linearGradient id="realScoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#a855f7" />
                            <stop offset="100%" stopColor="#6366f1" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-gradient text-6xl font-bold">{scoreValue === null ? "--" : score}</span>
                        <span className="text-sm text-muted-foreground">{scoreValue === null ? (isEn ? "pending" : "pendiente") : "de 100"}</span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <h1 className="text-2xl font-bold">{audit.projects?.company_name ?? audit.base_url.replace(/^https?:\/\//, "")}</h1>
                      <p className="text-muted-foreground">{audit.base_url.replace(/^https?:\/\//, "")}</p>
                    </div>
                  </div>

                  <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
                    {[
                       { label: isEn ? "Spontaneous Visibility" : "Visibilidad espontánea", value: percentOrEmpty(spontaneousVisibility, isEn ? "No sample" : "Sin muestra"), note: isEn ? "Neutral prompts" : "Prompts neutrales", icon: Search, color: "text-primary" },
                       { label: isEn ? "Assisted Visibility" : "Visibilidad asistida", value: percentOrEmpty(assistedVisibility, isEn ? "No sample" : "Sin muestra"), note: isEn ? "Brand named in prompt" : "Marca nombrada en el prompt", icon: Eye, color: "text-accent" },
                       { label: isEn ? "Competitive Win Rate" : "Win rate competitivo", value: percentOrEmpty(competitiveVisibility, isEn ? "No competitive sample" : "Sin muestra competitiva"), note: competitiveResults > 0 ? `${competitiveResults} ${isEn ? "competitive results" : "resultados competitivos"}` : (isEn ? "Comparative prompts only" : "Solo prompts comparativos"), icon: Trophy, color: "text-chart-4" },
                       { label: citationResults > 0 ? (isEn ? "Citation Coverage" : "Cobertura de citations") : (isEn ? "Detected Sources" : "Fuentes detectadas"), value: citationCoverage !== null ? `${citationCoverage}%` : citations > 0 ? String(citations) : (isEn ? "No sample" : "Sin muestra"), note: citationResults > 0 ? (isEn ? "Citation prompts" : "Prompts de citations") : (isEn ? "Sources found in AI answers" : "Fuentes encontradas en respuestas IA"), icon: Quote, color: "text-chart-3" },
                       { label: isEn ? "Engines" : "Motores", value: engineCount > 0 ? String(engineCount) : "Sin datos", note: totalResults > 0 ? `${totalResults} ${isEn ? "results" : "resultados"}` : "", icon: FileText, color: "text-chart-5" },
                    ].map((item) => (
                      <div key={item.label} className="glass rounded-xl p-4 text-center">
                        <div className={`mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-secondary ${item.color}`}>
                          <item.icon className="h-5 w-5" />
                        </div>
                        <div className="mb-1 text-2xl font-bold">{item.value}</div>
                        <p className="text-xs leading-tight text-muted-foreground">{item.label}</p>
                        {item.note && <p className="mt-1 text-[11px] leading-tight text-muted-foreground/80">{item.note}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {lowSample && (
              <Card className="glass border-yellow-500/30 bg-yellow-500/10">
                <CardContent className="flex gap-3 p-4 text-sm text-yellow-100">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                  <p>{isEn ? "This audit is directionally useful, but the sample is small. Use spontaneous visibility as the strongest signal and run more neutral prompts before making a final market claim." : "Esta auditoría sirve como señal inicial, pero la muestra es pequeña. Usa la visibilidad espontánea como la señal más importante y corre más prompts neutrales antes de hacer una conclusión fuerte de mercado."}</p>
                </CardContent>
              </Card>
            )}

            <Card className="glass border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><ShieldCheck className="h-5 w-5 text-primary" />{isEn ? "How the GEO Score is calculated" : "Cómo se calcula el GEO Score"}</CardTitle>
                <p className="text-sm text-muted-foreground">{scoreReason}</p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-[240px_1fr]">
                  <div className="rounded-2xl border border-border bg-secondary/20 p-4">
                    <p className="text-sm text-muted-foreground">GEO Score</p>
                    <p className="mt-1 text-4xl font-bold">{scoreValue === null ? (isEn ? "Pending" : "Pendiente") : `${score}/100`}</p>
                    <p className="mt-3 text-sm text-muted-foreground">{isEn ? "Recommended target" : "Objetivo recomendado"}: <span className="font-medium text-foreground">{scoreTarget}/100</span></p>
                  </div>
                  <div className="rounded-2xl border border-border bg-secondary/20 p-4">
                    <div className="mb-2 flex items-center justify-between text-sm"><span className="text-muted-foreground">{isEn ? "Progress toward target" : "Progreso hacia objetivo"}</span><span className="font-medium">{targetProgress}%</span></div>
                    <div className="h-3 overflow-hidden rounded-full bg-background"><div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${targetProgress}%` }} /></div>
                    <p className="mt-3 text-sm text-muted-foreground">{scoreGap > 0 ? (isEn ? `You are ${scoreGap} points away from your initial target.` : `Estás a ${scoreGap} puntos de tu objetivo inicial.`) : (isEn ? "You reached the current target. The next goal is to scale." : "Ya alcanzaste el objetivo actual. La siguiente meta es escalar.")}</p>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  {scoreComponents.map((component) => (
                    <div key={component.label} className="rounded-2xl border border-border bg-background/40 p-4">
                      <p className="text-xs text-muted-foreground">{component.label}</p>
                      <p className="mt-1 text-2xl font-bold">{component.value === null ? (isEn ? "No sample" : "Sin muestra") : `${component.value}%`}</p>
                      <p className="mt-1 text-xs text-primary">{isEn ? "Weight" : "Peso"}: {component.weight}%</p>
                      <p className="mt-2 text-xs text-muted-foreground">{component.note}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {semantic && (
              <Card className="glass border-primary/30 bg-primary/5">
                <CardHeader><CardTitle>{isEn ? "Executive Summary" : "Resumen ejecutivo"}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-base text-foreground">{canonicalExecutiveSummary}</p>
                  <p className="rounded-xl border border-border bg-secondary/20 p-3 text-sm text-muted-foreground">
                    {isEn
                      ? `Canonical score used by this screen: ${scoreValue === null ? "not available" : `${score}/100`}. Older generated summaries may mention a different score if they were created before the current scoring model.`
                      : `Score canónico usado por esta pantalla: ${scoreValue === null ? "no disponible" : `${score}/100`}. Resúmenes generados antes del modelo actual pueden mencionar otro puntaje.`}
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card className="glass h-full border-border">
                <CardHeader>
                  <CardTitle className="text-lg">{isEn ? "Comparative Analysis" : "Análisis comparativo"}</CardTitle>
                  <p className="text-sm text-muted-foreground">{isEn ? "Real signals detected in this audit" : "Señales reales detectadas en esta auditoría"}</p>
                </CardHeader>
                <CardContent className="space-y-5">
                  {[
                    { label: "GEO Score", value: score, help: isEn ? "Strict score weighted toward neutral discovery prompts." : "Score estricto ponderado hacia prompts neutrales." },
                    { label: isEn ? "Spontaneous Visibility" : "Visibilidad espontánea", value: spontaneousVisibility, help: isEn ? "Brand appeared without being named in the question." : "La marca apareció sin ser nombrada en la pregunta." },
                    { label: isEn ? "Assisted Visibility" : "Visibilidad asistida", value: assistedVisibility, help: isEn ? "Brand appeared when the prompt already mentioned it." : "La marca apareció cuando el prompt ya la mencionaba." },
                    { label: isEn ? "Competitive Win Rate" : "Win rate competitivo", value: competitiveVisibility, help: isEn ? "Comparative prompts where the brand beat competitors." : "Prompts comparativos donde la marca ganó frente a competidores." },
                    { label: isEn ? "Citation Coverage" : "Cobertura de citations", value: citationCoverage, help: isEn ? "Citation/source prompts with evidence found." : "Prompts de fuentes/citations con evidencia encontrada." },
                    { label: isEn ? "Competitor Pressure" : "Presión competidora", value: competitorPressure, help: isEn ? "How strongly tracked competitors appeared in this audit." : "Qué tan fuerte aparecieron los competidores en esta auditoría." },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-medium">{item.value === null ? (isEn ? "No sample" : "Sin muestra") : `${item.value}%`}</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${Math.max(0, Math.min(100, item.value ?? 0))}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground/80">{item.help}</p>
                    </div>
                  ))}
                  <div className="rounded-xl border border-border bg-secondary/20 p-3 text-xs text-muted-foreground">
                    <div className="mb-2 flex items-center gap-2 font-medium text-foreground"><ShieldCheck className="h-4 w-4 text-primary" />{isEn ? "Metric rule" : "Regla de lectura"}</div>
                    <p>{isEn ? "A comparison prompt like 'Compare Botz vs HubSpot' does not count as spontaneous visibility. It is useful for positioning, but it should not be used as proof that the market already recommends the brand." : "Un prompt como 'Compara Botz vs HubSpot' no cuenta como visibilidad espontánea. Sirve para posicionamiento, pero no prueba que el mercado ya recomiende la marca."}</p>
                  </div>
                  {competitorVisibility.length > 0 && (
                    <div className="border-t border-border pt-4">
                      <p className="mb-3 text-sm font-medium">{isEn ? "Tracked competitors" : "Competidores detectados"}</p>
                      <div className="space-y-2">
                        {competitorVisibility.slice(0, 5).map((competitor, index) => (
                          <div key={index} className="flex items-center justify-between rounded-lg bg-secondary/30 px-3 py-2 text-sm">
                            <span>{String(competitor.name ?? "Competidor")}</span>
                            <span className="text-muted-foreground">{competitiveResults > 0 ? `${Math.round(numberFrom(competitor.visibility_score))}%` : (isEn ? "No competitive sample" : "Sin muestra competitiva")}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="glass h-full border-border">
                <CardHeader>
                  <CardTitle className="text-lg">{isEn ? "AI Engine Performance" : "Rendimiento por Motor IA"}</CardTitle>
                  <p className="text-sm text-muted-foreground">{isEn ? "Prompts won by platform" : "Prompts ganados por plataforma"}</p>
                </CardHeader>
                <CardContent className="space-y-5">
                  {enginePerformance.length === 0 && <p className="text-sm text-muted-foreground">{isEn ? "No engine performance was stored." : "No se guardó rendimiento por motor."}</p>}
                  {enginePerformance.map((engine, index) => (
                    <div key={`${engine.name}-${index}`} className="grid grid-cols-[90px_1fr_72px] items-center gap-3 text-sm">
                      <span className="text-muted-foreground">{engine.name}</span>
                      <div className="h-9 overflow-hidden rounded bg-secondary">
                        <div className="h-full rounded bg-gradient-to-r from-primary to-accent" style={{ width: `${engine.score}%` }} />
                      </div>
                      <span className="text-right font-medium">{engine.live === 0 && engine.fallback > 0 ? (isEn ? "No live data" : "Sin datos reales") : engine.score === null ? "Sin datos" : `${engine.score}%`}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Card className="glass border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><Trophy className="h-5 w-5 text-primary" />{isEn ? "Why your competitors are winning" : "Por qué están ganando tus competidores"}</CardTitle>
                <p className="text-sm text-muted-foreground">{isEn ? "Based on competitor mentions and prompt evidence stored in this audit." : "Basado en menciones competitivas y evidencia de prompts guardada en esta auditoría."}</p>
              </CardHeader>
              <CardContent>
                {competitorLosses.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">{isEn ? "No competitor evidence was stored for this audit." : "No se guardó evidencia competitiva suficiente para esta auditoría."}</p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {competitorLosses.map((item) => (
                      <div key={item.name} className="rounded-2xl border border-border bg-secondary/20 p-4">
                        <div className="mb-3 flex items-center justify-between gap-3"><h3 className="font-semibold">{item.name}</h3><span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">{item.score === null ? (isEn ? "Evidence pending" : "Evidencia pendiente") : `${item.score}%`}</span></div>
                        <p className="text-sm text-muted-foreground"><span className="text-foreground">{isEn ? "Won prompts" : "Prompts ganados"}:</span> {item.prompts.length > 0 ? item.prompts.join(" · ") : (isEn ? "No prompt-level detail available" : "Sin detalle por prompt disponible")}</p>
                        <p className="mt-2 text-sm text-muted-foreground"><span className="text-foreground">{isEn ? "Why it won" : "Por qué ganó"}:</span> {item.why}</p>
                        <p className="mt-2 text-sm text-muted-foreground"><span className="text-foreground">{isEn ? "What your brand lacks" : "Qué le falta a tu marca"}:</span> {item.missing}</p>
                        <p className="mt-3 rounded-xl bg-background/50 p-3 text-sm text-muted-foreground"><span className="text-foreground">{isEn ? "Recommended action" : "Acción recomendada"}:</span> {item.action}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="glass border-border">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20"><Lightbulb className="h-5 w-5 text-primary" /></div>
                  <div>
                    <CardTitle className="text-lg">{isEn ? "Recommendations" : "Recomendaciones"}</CardTitle>
                    <p className="text-sm text-muted-foreground">{isEn ? "Actions to improve your GEO Score" : "Acciones para mejorar tu GEO Score"}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {recommendationSource.length === 0 && <p className="text-sm text-muted-foreground">{isEn ? "No recommendations were generated for this audit." : "No se generaron recomendaciones para esta auditoría."}</p>}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {recommendationSource.map((rec, index) => (
                    <div key={index} className={`rounded-xl border p-4 ${recommendationTone(rec.priority ?? rec.impact)}`}>
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary/70">
                          {String(rec.priority ?? rec.impact).toLowerCase().includes("alta") || String(rec.priority ?? rec.impact).toLowerCase().includes("high") ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                        </div>
                        <div className="flex-1">
                          <div className="mb-1 flex items-center justify-between gap-3">
                            <h3 className="text-sm font-medium text-foreground">{String(rec.action_item ?? rec.title ?? (isEn ? "Recommendation" : "Recomendación"))}</h3>
                            {(rec.impact || rec.priority) && <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">Impacto: {String(rec.impact ?? rec.priority)}</span>}
                          </div>
                          <p className="text-sm text-muted-foreground">{String(rec.details ?? rec.description ?? rec.action ?? "")}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {citedSources.length > 0 && (
              <Card className="glass border-border">
                <CardHeader>
                  <CardTitle className="text-lg">{isEn ? "Cited Sources" : "Fuentes citadas"}</CardTitle>
                  <p className="text-sm text-muted-foreground">{isEn ? "Sources found in AI responses" : "Fuentes encontradas en respuestas IA"}</p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead><tr className="border-b border-border"><th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Fuente</th><th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">URL</th><th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Influencia</th></tr></thead>
                      <tbody>
                        {citedSources.slice(0, 8).map((source, index) => (
                          <tr key={index} className="border-b border-border/50 hover:bg-secondary/30">
                            <td className="px-4 py-4 font-medium">{String(source.source_name ?? "Fuente")}</td>
                            <td className="break-all px-4 py-4 text-sm text-muted-foreground">{String(source.url ?? "")}</td>
                            <td className="px-4 py-4"><span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">{String(source.influence ?? "media")}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="glass border-border">
              <CardHeader>
                <CardTitle className="text-lg">{isEn ? "Crawl Evidence" : "Evidencia de crawl"}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {isEn ? "Pages inspected from the audited website. Crawl is best-effort and only follows same-domain pages." : "Páginas inspeccionadas del sitio auditado. El crawl es best-effort y solo sigue páginas del mismo dominio."}
                </p>
              </CardHeader>
              <CardContent>
                {crawledPages.length === 0 && crawlEvidence.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                    {isEn ? "No crawl evidence is available for this audit. It may be an older audit or the website could not be crawled within the execution budget." : "No hay evidencia de crawl disponible para esta auditoría. Puede ser una auditoría anterior o el sitio no pudo rastrearse dentro del presupuesto de ejecución."}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {(crawledPages.length > 0 ? crawledPages : crawlEvidence).slice(0, 10).map((page, index) => (
                      <div key={index} className="rounded-xl border border-border bg-secondary/20 p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-medium">{String(page.title ?? page.url ?? `Página ${index + 1}`)}</p>
                            <p className="break-all text-sm text-muted-foreground">{String(page.url ?? page.path ?? "")}</p>
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-2 text-xs text-muted-foreground">
                            {page.status_code && <span className="rounded-full bg-background px-2 py-1">HTTP {String(page.status_code)}</span>}
                            {page.word_count && <span className="rounded-full bg-background px-2 py-1">{String(page.word_count)} words</span>}
                          </div>
                        </div>
                        {page.description && <p className="mt-2 text-sm text-muted-foreground">{String(page.description)}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="glass border-border">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20"><TrendingUp className="h-5 w-5 text-accent" /></div>
                  <div>
                    <CardTitle className="text-lg">{isEn ? "Recommended Actions" : "Acciones recomendadas"}</CardTitle>
                    <p className="text-sm text-muted-foreground">{isEn ? "Execution ideas generated from this audit. These are not SEO volume metrics." : "Ideas de ejecución generadas desde esta auditoría. No son métricas de volumen SEO."}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {contentOpportunities.length === 0 && <p className="text-sm text-muted-foreground">{isEn ? "No recommended actions were generated." : "No se generaron acciones recomendadas."}</p>}
                {contentOpportunities.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{isEn ? "Recommended action" : "Acción recomendada"}</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{isEn ? "Type" : "Tipo"}</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{isEn ? "Priority" : "Prioridad"}</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{isEn ? "Status" : "Estado"}</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Oportunidad</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contentOpportunities.map((opp, index) => {
                          const opportunity = numberFrom(opp.opportunity) || opportunityScore(opp.difficulty, index)
                          return (
                            <tr key={index} className="border-b border-border/50 hover:bg-secondary/30">
                              <td className="px-4 py-4 font-medium">{String(opp.keyword ?? opp.title ?? "Oportunidad")}</td>
                              <td className="px-4 py-4 text-muted-foreground">{String(opp.recommended_format ?? opp.intent ?? opp.type ?? (isEn ? "Execution" : "Ejecución"))}</td>
                              <td className="px-4 py-4"><span className={`rounded-full px-2 py-1 text-xs font-medium ${difficultyTone(opp.difficulty)}`}>{String(opp.difficulty ?? "Media")}</span></td>
                              <td className="px-4 py-4 text-muted-foreground">{String(opp.status ?? (isEn ? "Pending" : "Pendiente"))}</td>
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-16 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${Math.max(0, Math.min(100, opportunity))}%` }} /></div>
                                  <span className="text-sm font-medium">{opportunity}%</span>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {(evaluatedPrompts.length > 0 || semantic) && (
              <Card className="glass border-border">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-3/20"><MessageSquare className="h-5 w-5 text-chart-3" /></div>
                    <div>
                      <CardTitle className="text-lg">{isEn ? "Evaluated Prompts" : "Prompts Evaluados"}</CardTitle>
                      <p className="text-sm text-muted-foreground">{isEn ? "Questions where we analyzed your brand appearance" : "Preguntas donde analizamos tu aparición"}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {evaluatedPrompts.length === 0 && aiMentions.length === 0 && <p className="text-sm text-muted-foreground">{isEn ? "No prompt evidence was stored." : "No se guardó evidencia de prompts."}</p>}
                    {(evaluatedPrompts.length > 0 ? evaluatedPrompts : aiMentions).slice(0, 8).map((item, index) => {
                      const hasStoredPrompt = evaluatedPrompts.length > 0
                      const mentioned = hasStoredPrompt ? Boolean(item.mentioned) : String(item.position) !== "no_mencionada"
                      const position = hasStoredPrompt ? numberFrom(item.position) : mentionPositionNumber(item.position)
                      const fallbackEngine = engines[index % Math.max(1, engines.length)] ?? ["openai", "gemini", "perplexity"][index % 3]
                      return (
                        <div key={index} className={`rounded-xl border p-4 ${mentioned ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                {mentioned ? <CheckCircle2 className="h-5 w-5 text-green-400" /> : <AlertCircle className="h-5 w-5 text-red-400" />}
                                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{engineLabel(hasStoredPrompt ? item.engine : fallbackEngine)}</span>
                              </div>
                              <p className="font-medium">{hasStoredPrompt ? `"${String(item.prompt ?? "")}"` : `"${String(item.context ?? item.snippet ?? "Prompt evaluado")}"`}</p>
                            </div>
                            <div className="shrink-0 text-right">
                              {mentioned ? <p className="text-sm font-medium text-green-400">Mencionado</p> : <p className="text-sm font-medium text-red-400">No aparece</p>}
                              {position > 0 && <p className="text-xs text-muted-foreground">Posición {position}</p>}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {(metricRisks.length > 0 || nextActions.length > 0) && (
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="glass border-border">
                  <CardHeader><CardTitle>{isEn ? "Risks" : "Riesgos"}</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {metricRisks.length === 0 && <p className="text-sm text-muted-foreground">No se detectaron riesgos GEO relevantes.</p>}
                    {metricRisks.map((risk, index) => (
                      <div key={index} className="rounded-xl border border-red-500/25 bg-red-500/10 p-4">
                        <div className="flex items-center gap-2 font-medium text-red-200"><AlertTriangle className="h-4 w-4" />{String(risk.risk_type ?? "Riesgo")}</div>
                        <p className="mt-2 text-sm text-muted-foreground">{String(risk.description ?? "")}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="glass border-border">
                  <CardHeader><CardTitle>{isEn ? "Next Actions" : "Siguientes acciones"}</CardTitle></CardHeader>
                  <CardContent>
                    {nextActions.length === 0 && <p className="text-sm text-muted-foreground">No hay acciones priorizadas disponibles.</p>}
                    <ol className="space-y-3">
                      {nextActions.map((action, index) => (
                        <li key={index} className="rounded-xl border border-border bg-secondary/25 p-3 text-sm">{index + 1}. {action}</li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </div>

      {showDeleteModal && audit && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-lg border-red-500/30 bg-background shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-200">
                <AlertTriangle className="h-5 w-5" />
                {isEn ? "Delete this audit?" : "¿Eliminar esta auditoría?"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-muted-foreground">
                {isEn
                  ? "This will delete the audit and its associated job logs, scores and generated recommendations. This action cannot be undone."
                  : "Esto eliminará la auditoría y sus logs de ejecución, scores y recomendaciones generadas. Esta acción no se puede deshacer."}
              </p>
              <div className="rounded-xl border border-border bg-secondary/30 p-3 text-sm">
                <p className="font-medium">{audit.projects?.company_name ?? audit.base_url}</p>
                <p className="text-muted-foreground">{audit.id}</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 border-border" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
                  {isEn ? "Cancel" : "Cancelar"}
                </Button>
                <Button className="flex-1 bg-red-600 text-white hover:bg-red-700" onClick={deleteAudit} disabled={deleting}>
                  {deleting ? (isEn ? "Deleting..." : "Eliminando...") : isEn ? "Delete permanently" : "Eliminar definitivamente"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
