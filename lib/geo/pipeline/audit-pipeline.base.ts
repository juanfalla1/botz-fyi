import type { SupabaseClient } from "@supabase/supabase-js"
import { buildBasePrompts } from "@/lib/geo/pipeline/prompt-builder"
import { runRealAnalysisWithFallback } from "@/lib/geo/pipeline/analysis-real"
import type { PipelineContext } from "@/lib/geo/pipeline/types"
import type { NormalizedEngineResult } from "@/lib/geo/engines/types"
import { createAuditJobLog } from "@/lib/geo/repositories/audit-job-logs.repo"

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
  const prompts = buildBasePrompts(context)
  const analysis = await runRealAnalysisWithFallback(context, prompts)
  const output = analysis.output

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
  await persistContentOpportunities(supabase, context.job.audit_id, output.recommendations).catch((error) => logNonCriticalPipelineError(supabase, context, "content_opportunities", error))

  return { prompts, output }
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
      return {
        query_id: query.id,
        engine: result.engine,
        answer_text: result.rawText || result.error || "",
        citations: result.citations,
        raw_response: {
          mode: result.mode,
          confidence: result.confidence,
          brand_mentioned: result.brandMentioned,
          ranking_position: result.rankingPosition,
          won: result.won,
          lost: result.lost,
          quality_flags: result.quality_flags,
          prompt_kind: result.promptKind ?? "spontaneous",
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
    mentioned: result.brandMentioned,
    mention_context: result.rawText.slice(0, 800),
    sentiment: result.brandMentioned ? "neutral" : null,
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

function inferIntent(prompt: string) {
  const value = prompt.toLowerCase()
  if (value.includes("compare")) return "comparison"
  if (value.includes("trusted sources") || value.includes("cited")) return "citations"
  if (value.includes("recommend")) return "recommendation"
  return "discovery"
}
