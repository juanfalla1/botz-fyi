import { normalizeEngineResponse } from "@/lib/geo/engines/normalizer"
import { resolveProviders } from "@/lib/geo/engines/provider-registry"
import { scoreSnapshotV1 } from "@/lib/geo/engines/scoring"
import type { NormalizedEngineResult } from "@/lib/geo/engines/types"
import { runUnavailableAnalysis } from "@/lib/geo/pipeline/analysis-unavailable"
import { shouldReturnUnavailableAnalysis } from "@/lib/geo/pipeline/fallback-policy"
import type { AnalysisOutput, GeneratedPrompt, PipelineContext } from "@/lib/geo/pipeline/types"
import { runSemanticGeoAnalyzer } from "@/lib/geo/analysis/semantic-geo-analyzer"

export async function runRealAnalysisWithFallback(ctx: PipelineContext, prompts: GeneratedPrompt[]) {
  const { providers } = resolveProviders(ctx.engines)
  const byEngine = new Map(providers.map((p) => [p.id, p]))
  const maxPrompts = Number(process.env.GEO_MAX_PROMPTS_PER_ENGINE ?? 5)
  const safeMaxPrompts = Number.isFinite(maxPrompts) && maxPrompts > 0 ? Math.min(Math.floor(maxPrompts), 10) : 5

  const promptCounts = new Map<string, number>()
  const normalized: NormalizedEngineResult[] = []
  const competitorAliases = Object.fromEntries(ctx.competitors.map((c) => [c.name, c.aliases ?? []]))
  const competitorDomainAliases = Object.fromEntries(ctx.competitors.map((c) => [c.name, c.domain_aliases ?? []]))
  const stopwords = ctx.project.entity_stopwords ?? []

  for (const gp of prompts) {
    const provider = byEngine.get(mapEngineName(gp.engine))
    if (!provider) continue

    const currentCount = promptCounts.get(provider.id) ?? 0
    if (currentCount >= safeMaxPrompts) continue
    promptCounts.set(provider.id, currentCount + 1)

    const mode = provider.status === "configured" ? "live" : "fallback"
    if (provider.status !== "configured") {
      normalized.push(
        normalizeEngineResponse({
          engine: provider.id,
          prompt: gp.prompt,
          mode,
          raw: { text: "" },
          brandName: ctx.project.company_name,
          brandDomain: ctx.project.website_url.replace(/^https?:\/\//, ""),
          brandAliases: ctx.project.brand_aliases ?? [],
          domainAliases: ctx.project.domain_aliases ?? [],
          competitorNames: ctx.competitors.map((c) => c.name),
          competitorAliases,
          competitorDomainAliases,
          stopwords,
          language: ctx.project.language,
          country: ctx.project.country,
          error: provider.reason ?? "Provider not configured",
        })
      )
      continue
    }

    try {
      const raw = await provider.runPrompt({
        prompt: gp.prompt,
        brandName: ctx.project.company_name,
        brandDomain: ctx.project.website_url.replace(/^https?:\/\//, ""),
        competitorNames: ctx.competitors.map((c) => c.name),
      })

      normalized.push(
        normalizeEngineResponse({
          engine: provider.id,
          prompt: gp.prompt,
          mode: "live",
          raw,
          brandName: ctx.project.company_name,
          brandDomain: ctx.project.website_url.replace(/^https?:\/\//, ""),
          brandAliases: ctx.project.brand_aliases ?? [],
          domainAliases: ctx.project.domain_aliases ?? [],
          competitorNames: ctx.competitors.map((c) => c.name),
          competitorAliases,
          competitorDomainAliases,
          stopwords,
          language: ctx.project.language,
          country: ctx.project.country,
        })
      )
    } catch (error) {
      normalized.push(
        normalizeEngineResponse({
          engine: provider.id,
          prompt: gp.prompt,
          mode: "fallback",
          raw: { text: "" },
          brandName: ctx.project.company_name,
          brandDomain: ctx.project.website_url.replace(/^https?:\/\//, ""),
          brandAliases: ctx.project.brand_aliases ?? [],
          domainAliases: ctx.project.domain_aliases ?? [],
          competitorNames: ctx.competitors.map((c) => c.name),
          competitorAliases,
          competitorDomainAliases,
          stopwords,
          language: ctx.project.language,
          country: ctx.project.country,
          error: error instanceof Error ? error.message : "Provider error",
        })
      )
    }
  }

  const configuredCount = providers.filter((p) => p.status === "configured" && p.id !== "ai_overviews").length
  const liveCount = normalized.filter((x) => x.mode === "live").length
  if (shouldReturnUnavailableAnalysis({ totalResults: normalized.length, liveResults: liveCount, configuredProviders: configuredCount })) {
    const fallback = runUnavailableAnalysis(ctx, prompts)
    return {
      output: fallback,
      normalizedResults: normalized,
      mode: "fallback" as const,
      metadata: {
        fallback_reason: "No live provider results available",
      },
    }
  }

  const scored = scoreSnapshotV1(normalized)
  const semanticAnalysis = await runSemanticGeoAnalyzer({
    context: ctx,
    normalizedResults: normalized,
    hardScore: {
      geo_score: scored.geo_score,
      ai_visibility: scored.ai_visibility,
      citations_count: scored.citations_count,
      prompts_won: scored.prompts_won,
      prompts_lost: scored.prompts_lost,
    },
  })

  const output: AnalysisOutput = {
    geo_score: semanticAnalysis?.geo_score ?? scored.geo_score,
    ai_visibility: Math.round(semanticAnalysis?.brand_visibility ?? scored.ai_visibility),
    citations_count: scored.citations_count,
    citations_unique_domains: scored.citations_unique_domains,
    prompts_won: scored.prompts_won,
    prompts_lost: scored.prompts_lost,
    engines: scored.engines,
    recommendations: semanticAnalysis
      ? semanticAnalysis.recommendations.map((rec) => ({
          title: rec.action_item,
          description: rec.details,
          priority: rec.priority === "alta" ? "high" : rec.priority === "media" ? "medium" : "low",
        }))
      : buildRecommendations(scored.ai_visibility, scored.citations_count, scored.prompts_won),
    summary: semanticAnalysis?.executive_summary ?? `Real analysis for ${ctx.project.company_name}: GEO score ${scored.geo_score}, visibility ${scored.ai_visibility}, citations ${scored.citations_count}.`,
    engine_breakdown: scored.engine_breakdown,
    quality_flags_aggregate: scored.quality_flags_aggregate,
    semantic_analysis: semanticAnalysis,
    evaluated_prompts: normalized.map((item) => ({
      engine: item.engine,
      prompt: item.prompt,
      mentioned: item.brandMentioned,
      position: item.rankingPosition,
      won: item.won,
      answer_preview: item.rawText.slice(0, 400),
      mode: item.mode,
    })),
  }

  return {
    output,
    normalizedResults: normalized,
    mode: "live" as const,
      metadata: {
        fallback_reason: null,
        live_results: liveCount,
        total_results: normalized.length,
        normalizer_version: "7.9",
        semantic_analyzer: semanticAnalysis ? "openai_structured_v1" : "not_available",
        confidence_reasons_summary: summarizeConfidenceReasons(normalized),
        alias_config_used:
          (ctx.project.brand_aliases?.length ?? 0) > 0 ||
          (ctx.project.domain_aliases?.length ?? 0) > 0 ||
          (ctx.competitors.some((c) => (c.aliases?.length ?? 0) > 0 || (c.domain_aliases?.length ?? 0) > 0) ?? false),
      },
    }
}

function summarizeConfidenceReasons(results: NormalizedEngineResult[]) {
  const counts: Record<string, number> = {}
  for (const item of results) {
    const reasons = item.confidence_reasons?.brand ?? []
    for (const reason of reasons) {
      counts[reason.code] = (counts[reason.code] ?? 0) + 1
    }
  }
  const top = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([code, count]) => ({ code, count }))
  return { top_brand_reason_codes: top }
}

function buildRecommendations(aiVisibility: number, citationsCount: number, promptsWon: number): AnalysisOutput["recommendations"] {
  const recommendations: AnalysisOutput["recommendations"] = []
  if (aiVisibility < 60) {
    recommendations.push({
      title: "Increase brand salience",
      description: "Improve entity and brand context consistency across high-value pages.",
      priority: "high",
    })
  }
  if (citationsCount < 10) {
    recommendations.push({
      title: "Add source-backed claims",
      description: "Publish expert-backed and source-backed claims to improve citation potential.",
      priority: "medium",
    })
  }
  if (promptsWon < 3) {
    recommendations.push({
      title: "Ship comparison pages",
      description: "Create competitor comparison pages for decision-stage prompts.",
      priority: "high",
    })
  }
  if (recommendations.length === 0) {
    recommendations.push({
      title: "Keep momentum",
      description: "Maintain current publishing cadence and monitor engine-level shifts weekly.",
      priority: "low",
    })
  }
  return recommendations
}

function mapEngineName(engine: string) {
  const x = engine.toLowerCase().trim()
  if (x === "chatgpt") return "openai"
  if (x === "ai-overviews" || x === "aioverviews") return "ai_overviews"
  return x
}
