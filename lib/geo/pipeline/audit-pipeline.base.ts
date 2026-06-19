import type { SupabaseClient } from "@supabase/supabase-js"
import { buildBasePrompts } from "@/lib/geo/pipeline/prompt-builder"
import { runRealAnalysisWithFallback } from "@/lib/geo/pipeline/analysis-real"
import type { PipelineContext } from "@/lib/geo/pipeline/types"
import type { NormalizedEngineResult } from "@/lib/geo/engines/types"
import { createAuditJobLog } from "@/lib/geo/repositories/audit-job-logs.repo"
import { runCrawler, type CrawledPage } from "@/lib/geo/crawler"

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (error && typeof error === "object") {
    const value = error as Record<string, unknown>
    return [value.message, value.details, value.hint, value.code].filter(Boolean).map(String).join(" | ") || JSON.stringify(value)
  }
  return String(error || "Unknown persistence error")
}

async function logNonCriticalPipelineError(supabase: SupabaseClient, context: PipelineContext, stage: string, error: unknown) {
  await createAuditJobLog(supabase, {
    job_id: context.job.id,
    user_id: context.job.user_id,
    stage: "scoring",
    message: `Non-critical ${stage} persistence failed: ${errorMessage(error)}`,
  }).catch(() => undefined)
}

export async function runBaseAuditPipeline(supabase: SupabaseClient, context: PipelineContext) {
  const crawledPages = await runCrawlerWithBudget(context.project.website_url, context.job.crawl_depth).catch((error) => {
    void logNonCriticalPipelineError(supabase, context, "crawl", error)
    return [] as CrawledPage[]
  })
  const prompts = buildBasePrompts(context, crawledPages)
  await persistGeneratedPrompts(supabase, context, prompts).catch((error) => logNonCriticalPipelineError(supabase, context, "geo_prompts", error))
  const analysis = await runRealAnalysisWithFallback(context, prompts)
  const output = analysis.output
  await syncPromptRunResults(supabase, context, analysis.normalizedResults ?? []).catch((error) => logNonCriticalPipelineError(supabase, context, "geo_prompt_results", error))

  const { error: auditError } = await supabase
    .from("geo_audits")
    .update({
      status: "completed",
      final_score: output.geo_score,
      summary: JSON.stringify({
        geo_score: output.geo_score,
        ai_visibility: output.ai_visibility,
        citations_count: output.citations_count,
        citations_unique_domains: output.citations_unique_domains ?? null,
        prompts_won: output.prompts_won,
        prompts_lost: output.prompts_lost ?? 0,
        spontaneous_visibility: output.spontaneous_visibility ?? output.ai_visibility,
        assisted_visibility: output.assisted_visibility ?? 0,
        competitive_visibility: output.competitive_visibility ?? 0,
        citation_coverage: output.citation_coverage ?? 0,
        total_results: output.total_results ?? prompts.length,
        spontaneous_results: output.spontaneous_results ?? 0,
        assisted_results: output.assisted_results ?? 0,
        competitive_results: output.competitive_results ?? 0,
        citation_results: output.citation_results ?? 0,
        metric_definitions: metricDefinitions(),
        engines: output.engines,
        engine_breakdown: output.engine_breakdown ?? [],
        quality_flags_aggregate: output.quality_flags_aggregate ?? null,
        semantic_analysis: output.semantic_analysis ?? null,
        evaluated_prompts: output.evaluated_prompts ?? [],
        content_opportunities: output.recommendations.slice(0, 5).map((rec) => ({
          keyword: rec.title,
          difficulty: rec.priority,
          current_rank: null,
          opportunity: rec.priority === "high" ? 85 : rec.priority === "medium" ? 72 : 65,
        })),
        recommendations: output.recommendations,
        crawl_evidence: crawlEvidence(crawledPages),
        mode: analysis.mode,
        provider_metadata: analysis.metadata,
        normalizer_version: "7.9",
      }),
      completed_at: new Date().toISOString(),
    })
    .eq("id", context.job.audit_id)
  if (auditError) throw auditError

  const { error: scoreError } = await supabase.from("geo_scores").insert({
    audit_id: context.job.audit_id,
    ai_visibility_score: output.ai_visibility,
    citation_probability: Math.min(100, Math.round((output.citations_count / Math.max(1, prompts.length)) * 10)),
    brand_mention_score: output.prompts_won,
    final_score: output.geo_score,
    explanation: output.summary,
  })
  if (scoreError) await logNonCriticalPipelineError(supabase, context, "geo_scores", scoreError)

  if (output.recommendations.length > 0) {
    const { error: recError } = await supabase.from("recommendations").insert(
      output.recommendations.map((rec) => ({
        audit_id: context.job.audit_id,
        title: rec.title,
        description: rec.description,
        priority: rec.priority,
        type: "content",
        suggested_action: rec.description,
        status: "pending",
      }))
    )
    if (recError) await logNonCriticalPipelineError(supabase, context, "recommendations", recError)
  }

  await persistEngineEvidence(supabase, context, analysis.normalizedResults ?? []).catch((error) => logNonCriticalPipelineError(supabase, context, "engine_evidence", error))
  await persistCrawledPages(supabase, context.job.audit_id, crawledPages).catch((error) => logNonCriticalPipelineError(supabase, context, "crawled_pages", error))
  await persistContentOpportunities(supabase, context.job.audit_id, output.recommendations).catch((error) => logNonCriticalPipelineError(supabase, context, "content_opportunities", error))

  return { prompts, output }
}

async function runCrawlerWithBudget(baseUrl: string, crawlDepth: number) {
  const depth = Number.isFinite(crawlDepth) && crawlDepth > 0 ? crawlDepth : 1
  const maxPages = Math.max(3, Math.min(10, depth * 3))
  const timeout = new Promise<CrawledPage[]>((resolve) => setTimeout(() => resolve([]), 10000))
  return Promise.race([runCrawler(baseUrl, maxPages), timeout])
}

async function persistCrawledPages(supabase: SupabaseClient, auditId: string, pages: CrawledPage[]) {
  if (pages.length === 0) return
  const { error } = await supabase.from("crawled_pages").insert(pages.map((page) => ({
    audit_id: auditId,
    url: page.url,
    title: page.title,
    description: page.description,
    content: page.content,
    status_code: page.status_code,
    word_count: page.word_count,
    metadata: page.metadata,
  })))
  if (error) throw error
}

function crawlEvidence(pages: CrawledPage[]) {
  return {
    pages_crawled: pages.length,
    total_words: pages.reduce((total, page) => total + page.word_count, 0),
    pages: pages.slice(0, 10).map((page) => ({
      url: page.url,
      title: page.title,
      description: page.description,
      word_count: page.word_count,
    })),
  }
}

async function persistEngineEvidence(supabase: SupabaseClient, context: PipelineContext, results: NormalizedEngineResult[]) {
  if (results.length === 0) return

  const auditId = context.job.audit_id
  const queries = results.map((result) => ({
    audit_id: auditId,
    prompt: result.prompt,
    engine: result.engine,
    intent: inferIntent(result.prompt),
  }))

  const { data: insertedQueries, error: queryError } = await supabase
    .from("ai_queries")
    .insert(queries)
    .select("id, prompt, engine")
  if (queryError) throw queryError

  const queryIds = insertedQueries ?? []
  if (queryIds.length > 0) {
    const answers = queryIds.map((query, index) => {
      const result = results[index]
      const evidenceMentioned = brandMentionedForEvidence(result, context)
      return {
        query_id: query.id,
        engine: result.engine,
        answer_text: result.rawText || result.error || "",
        citations: result.citations,
        raw_response: {
          mode: result.mode,
          confidence: result.confidence,
          brand_mentioned: evidenceMentioned,
          ranking_position: result.rankingPosition,
          won: result.won,
          lost: result.lost,
          quality_flags: result.quality_flags,
          prompt_kind: result.promptKind ?? "spontaneous",
          external_citations: result.externalCitations ?? [],
          external_citation_domains: result.externalCitationDomains ?? [],
          external_unique_citations: result.externalUniqueCitations ?? 0,
          confidence_reasons: result.confidence_reasons ?? null,
          error: result.error ?? null,
        },
      }
    })
    const { error: answerError } = await supabase.from("ai_answers").insert(answers)
    if (answerError) throw answerError
  }

  const brandMentions = results.map((result) => ({
    audit_id: auditId,
    engine: result.engine,
    brand_name: context.project.company_name,
    mentioned: brandMentionedForEvidence(result, context),
    mention_context: result.rawText.slice(0, 800),
    sentiment: brandMentionedForEvidence(result, context) ? "neutral" : null,
    confidence_score: result.confidence,
  }))
  const { error: brandError } = await supabase.from("brand_mentions").insert(brandMentions)
  if (brandError) throw brandError

  const competitorMentions = results.flatMap((result) =>
    context.competitors.map((competitor) => ({
      audit_id: auditId,
      competitor_name: competitor.name,
      engine: result.engine,
      mentioned: result.competitorMentions.includes(competitor.name),
      mention_context: result.competitorMentions.includes(competitor.name) ? result.rawText.slice(0, 800) : null,
      position: result.competitorTopPosition,
    }))
  )
  if (competitorMentions.length > 0) {
    const { error: competitorError } = await supabase.from("competitor_mentions").insert(competitorMentions)
    if (competitorError) throw competitorError
  }
}

function brandMentionedForEvidence(result: NormalizedEngineResult, context: PipelineContext) {
  if (result.promptKind === "citation") {
    const text = result.rawText.toLowerCase()
    const prompt = result.prompt.toLowerCase()
    const targetDomain = prompt.match(/(?:https?:\/\/)?(?:www\.)?([a-z0-9.-]+\.[a-z]{2,})/)?.[1]?.replace(/^www\./, "") ?? ""
    const mentionsTargetDomain = Boolean(targetDomain && text.includes(targetDomain))
    const negativeCitationAnswer = /no encontr[eé]|no encontr[oó]|no hay menciones|no existen menciones|ninguna fuente externa|no external|did not find|could not find|no reliable external/i.test(result.rawText)
    return (result.externalUniqueCitations ?? 0) > 0 && mentionsTargetDomain && !negativeCitationAnswer
  }
  return result.brandMentioned && hasStrongBrandEvidence(result.rawText, context)
}

function hasStrongBrandEvidence(text: string, context: PipelineContext) {
  const normalized = normalizeEvidenceText(text)
  const brand = normalizeEvidenceText(context.project.company_name)
  const domain = context.project.website_url.replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0].toLowerCase()
  const domainRoot = domain.split(".")[0] ?? ""
  const terms = [brand, domain, domainRoot, ...(context.project.brand_aliases ?? []).map(normalizeEvidenceText), ...(context.project.domain_aliases ?? []).map(normalizeEvidenceText)]
    .filter((term) => term.length >= 3)
  return terms.some((term) => new RegExp(`(^|\\W)${escapeRegExp(term)}(?=$|\\W)`, "i").test(normalized))
}

function normalizeEvidenceText(value: string) {
  return String(value || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9.\s-]/g, " ").replace(/\s+/g, " ").trim()
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function metricDefinitions() {
  return {
    geo_score: "Score de 0 a 100 basado principalmente en visibilidad espontanea. Los prompts donde la marca ya fue nombrada pesan poco para evitar inflar el resultado.",
    spontaneous_visibility: "Porcentaje de respuestas neutrales donde la marca aparece sin nombrarla en la pregunta.",
    assisted_visibility: "Porcentaje de respuestas donde la marca aparece cuando la pregunta ya la menciona.",
    competitive_visibility: "Porcentaje de prompts comparativos donde la marca gana o queda mejor posicionada frente a competidores.",
    citation_coverage: "Porcentaje de prompts de fuentes/citaciones donde se detectan fuentes o pruebas citables.",
    prompts_won: "Cantidad de respuestas donde la marca aparece en posicion favorable frente a competidores.",
  }
}

async function persistContentOpportunities(supabase: SupabaseClient, auditId: string, recommendations: Array<{ title: string; description: string; priority: "high" | "medium" | "low" }>) {
  if (recommendations.length === 0) return
  const rows = recommendations.slice(0, 5).map((rec) => ({
    audit_id: auditId,
    title: rec.title,
    target_prompt: rec.title,
    intent: "geo_visibility_improvement",
    recommended_format: "article_or_structured_faq",
    priority: rec.priority,
    brief: rec.description,
  }))
  const { error } = await supabase.from("content_opportunities").insert(rows)
  if (error) throw error
}

async function persistGeneratedPrompts(supabase: SupabaseClient, context: PipelineContext, prompts: Array<{ prompt: string; category?: string; engine: string }>) {
  if (prompts.length === 0) return
  const uniquePrompts = new Map<string, { prompt: string; category?: string; engines: string[] }>()
  for (const item of prompts) {
    const key = item.prompt.toLowerCase().trim()
    const existing = uniquePrompts.get(key)
    if (existing) {
      if (!existing.engines.includes(item.engine)) existing.engines.push(item.engine)
      continue
    }
    uniquePrompts.set(key, { prompt: item.prompt, category: item.category, engines: [item.engine] })
  }

  const promptTexts = Array.from(uniquePrompts.values()).map((item) => item.prompt)
  const { data: existing, error: existingError } = await supabase
    .from("geo_prompts")
    .select("prompt")
    .eq("project_id", context.project.id)
    .eq("user_id", context.job.user_id)
    .in("prompt", promptTexts)
  if (existingError) throw existingError

  const existingTexts = new Set((existing ?? []).map((item) => String(item.prompt)))
  const rows = Array.from(uniquePrompts.values())
    .filter((item) => !existingTexts.has(item.prompt))
    .map((item) => ({
      user_id: context.job.user_id,
      project_id: context.project.id,
      prompt: item.prompt,
      category: item.category ?? "audit",
      engines: item.engines,
      country: context.project.country,
      language: context.project.language,
      enabled: true,
      metadata: { source: "audit_generated", audit_id: context.job.audit_id },
    }))

  if (rows.length === 0) return
  const { error } = await supabase.from("geo_prompts").insert(rows)
  if (error) throw error
}

async function syncPromptRunResults(supabase: SupabaseClient, context: PipelineContext, results: NormalizedEngineResult[]) {
  if (results.length === 0) return
  const byPrompt = new Map<string, NormalizedEngineResult[]>()
  for (const result of results) {
    const key = result.prompt.trim()
    if (!key) continue
    byPrompt.set(key, [...(byPrompt.get(key) ?? []), result])
  }

  for (const [prompt, promptResults] of byPrompt.entries()) {
    const liveResults = promptResults.filter((item) => item.mode === "live")
    const mentions = liveResults.filter((item) => item.brandMentioned).length
    const positions = liveResults.map((item) => item.rankingPosition ?? 0).filter((position) => position > 0)
    const metadata = {
      source: "audit_generated",
      audit_id: context.job.audit_id,
      last_run: new Date().toISOString(),
      last_run_results: promptResults.map((item) => ({
        engine: item.engine,
        status: item.mode === "live" ? "live" : "error",
        prompt_kind: item.promptKind ?? "spontaneous",
        reason: item.error ?? null,
        mentioned: brandMentionedForEvidence(item, context),
        position: item.rankingPosition,
        won: item.won,
        confidence: item.confidence,
        answer_preview: item.rawText.slice(0, 600),
        citations: item.citations,
        external_citations: item.externalCitations ?? [],
        external_citation_domains: item.externalCitationDomains ?? [],
        competitors: item.competitorMentions,
      })),
      visibility: liveResults.length > 0 ? Math.round((mentions / liveResults.length) * 100) : 0,
      mentions,
      position: positions.length > 0 ? Math.round((positions.reduce((sum, item) => sum + item, 0) / positions.length) * 10) / 10 : 0,
      trend: mentions > 0 ? "up" : "stable",
    }

    const { error } = await supabase
      .from("geo_prompts")
      .update({ metadata })
      .eq("project_id", context.project.id)
      .eq("user_id", context.job.user_id)
      .eq("prompt", prompt)
    if (error) throw error
  }
}

function inferIntent(prompt: string) {
  const value = prompt.toLowerCase()
  if (/\b(compare|compara|comparar|vs\.?|versus)\b/.test(value)) return "comparison"
  if (/trusted sources|fuentes (externas )?confiables|mencionan|mentioning|cited|citadas|citados|citas|citations/.test(value)) return "citations"
  if (/recommend|recomienda|recomiendas|recomendar[ií]as|recomendaci[oó]n/.test(value)) return "recommendation"
  return "discovery"
}
