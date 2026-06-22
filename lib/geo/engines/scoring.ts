import type { NormalizedEngineResult } from "@/lib/geo/engines/types"
import { hasValidExternalCitationEvidence } from "@/lib/geo/evidence-rules"

export type EngineBreakdown = {
  engine: string
  prompts_total: number
  spontaneous_total: number
  spontaneous_mentions: number
  assisted_total: number
  assisted_mentions: number
  competitive_total: number
  competitive_wins: number
  citation_total: number
  citation_hits: number
  mentions: number
  citations: number
  prompts_won: number
  prompts_lost: number
  brand_mentions: number
  citations_count: number
  avg_rank: number | null
  fallback_count: number
  live_count: number
}

export type GeoSnapshotV1 = {
  geo_score: number
  ai_visibility: number
  citations_count: number
  citations_unique_domains: number
  prompts_won: number
  prompts_lost: number
  spontaneous_visibility: number
  assisted_visibility: number
  competitive_visibility: number
  citation_coverage: number
  total_results: number
  spontaneous_results: number
  assisted_results: number
  competitive_results: number
  citation_results: number
  engines: string[]
  engine_breakdown: EngineBreakdown[]
  quality_flags_aggregate: {
    low_confidence: number
    no_citations: number
    brand_not_found: number
    competitor_dominant: number
    fallback_used: number
  }
}

function avg(values: number[]) {
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

function pct(part: number, total: number) {
  return total > 0 ? Math.min(100, Math.round((part / total) * 100)) : 0
}

function kindOf(result: NormalizedEngineResult) {
  return result.promptKind ?? "spontaneous"
}

function citationEvidenceCount(result: NormalizedEngineResult) {
  if (result.promptKind !== "citation") return result.uniqueCitations
  const prompt = result.prompt.toLowerCase()
  const targetDomain = prompt.match(/(?:https?:\/\/)?(?:www\.)?([a-z0-9.-]+\.[a-z]{2,})/)?.[1]?.replace(/^www\./, "") ?? ""
  const mentionsTargetDomain = hasValidExternalCitationEvidence({
    answerText: result.rawText,
    websiteUrl: targetDomain,
    externalCitationCount: result.externalUniqueCitations ?? 0,
  })
  return mentionsTargetDomain ? (result.externalUniqueCitations ?? 0) : 0
}

export function scoreSnapshotV1(results: NormalizedEngineResult[]): GeoSnapshotV1 {
  const byEngine = new Map<string, NormalizedEngineResult[]>()
  for (const r of results) {
    const list = byEngine.get(r.engine) ?? []
    list.push(r)
    byEngine.set(r.engine, list)
  }

  const breakdown: EngineBreakdown[] = Array.from(byEngine.entries()).map(([engine, list]) => {
    const rankValues = list.map((x) => x.brandMentioned ? x.rankingPosition : null).filter((x): x is number => typeof x === "number")
    const spontaneous = list.filter((x) => kindOf(x) === "spontaneous")
    const assisted = list.filter((x) => kindOf(x) === "assisted")
    const competitive = list.filter((x) => kindOf(x) === "competitive")
    const citation = list.filter((x) => kindOf(x) === "citation")
    return {
      engine,
      prompts_total: list.length,
      spontaneous_total: spontaneous.length,
      spontaneous_mentions: spontaneous.filter((x) => x.brandMentioned).length,
      assisted_total: assisted.length,
      assisted_mentions: assisted.filter((x) => x.brandMentioned).length,
      competitive_total: competitive.length,
      competitive_wins: competitive.filter((x) => x.won).length,
      citation_total: citation.length,
      citation_hits: citation.filter((x) => citationEvidenceCount(x) > 0).length,
      mentions: list.filter((x) => x.brandMentioned).length,
      citations: list.reduce((acc, x) => acc + citationEvidenceCount(x), 0),
      prompts_won: list.filter((x) => x.won).length,
      prompts_lost: list.filter((x) => x.lost).length,
      brand_mentions: list.filter((x) => x.brandMentioned).length,
      citations_count: list.reduce((acc, x) => acc + citationEvidenceCount(x), 0),
      avg_rank: avg(rankValues),
      fallback_count: list.filter((x) => x.mode === "fallback").length,
      live_count: list.filter((x) => x.mode === "live").length,
    }
  })

  const scoredResults = results.filter((x) => x.mode === "live")
  const promptsTotal = Math.max(1, scoredResults.length)
  const spontaneous = scoredResults.filter((x) => kindOf(x) === "spontaneous")
  const assisted = scoredResults.filter((x) => kindOf(x) === "assisted")
  const competitive = scoredResults.filter((x) => kindOf(x) === "competitive")
  const citationResults = scoredResults.filter((x) => kindOf(x) === "citation")
  const promptsWon = scoredResults.filter((x) => x.won).length
  const promptsLost = scoredResults.filter((x) => x.lost).length
  const mentions = scoredResults.filter((x) => x.brandMentioned).length
  const citations = scoredResults.reduce((acc, x) => acc + citationEvidenceCount(x), 0)
  const citationDomains = new Set(scoredResults.flatMap((x) => x.promptKind === "citation" ? (x.externalCitationDomains ?? []) : x.citationDomains)).size

  const visibility = pct(mentions, promptsTotal)
  const spontaneousVisibility = pct(spontaneous.filter((x) => x.brandMentioned).length, spontaneous.length)
  const assistedVisibility = pct(assisted.filter((x) => x.brandMentioned).length, assisted.length)
  const competitiveVisibility = pct(competitive.filter((x) => x.won).length, competitive.length)
  const citationCoverage = pct(citationResults.filter((x) => citationEvidenceCount(x) > 0).length, citationResults.length)
  const winRate = (promptsWon / promptsTotal) * 100
  const lossPenalty = Math.min(20, Math.round((promptsLost / promptsTotal) * 20))
  const citationScore = citationResults.length > 0 ? citationCoverage : Math.min(100, Math.round((citations / promptsTotal) * 25))
  const discoveryBase = spontaneous.length > 0 ? spontaneousVisibility : visibility
  const geoScore = Math.round(Math.max(0, Math.min(100, discoveryBase * 0.6 + assistedVisibility * 0.1 + competitiveVisibility * 0.15 + citationScore * 0.15 - lossPenalty)))

  const qualityFlagsAggregate = {
    low_confidence: results.filter((x) => x.quality_flags.low_confidence).length,
    no_citations: results.filter((x) => x.quality_flags.no_citations).length,
    brand_not_found: results.filter((x) => x.quality_flags.brand_not_found).length,
    competitor_dominant: results.filter((x) => x.quality_flags.competitor_dominant).length,
    fallback_used: results.filter((x) => x.quality_flags.fallback_used).length,
  }

  return {
    geo_score: geoScore,
    ai_visibility: discoveryBase,
    citations_count: citations,
    citations_unique_domains: citationDomains,
    prompts_won: promptsWon,
    prompts_lost: promptsLost,
    spontaneous_visibility: spontaneousVisibility,
    assisted_visibility: assistedVisibility,
    competitive_visibility: competitiveVisibility,
    citation_coverage: citationCoverage,
    total_results: scoredResults.length,
    spontaneous_results: spontaneous.length,
    assisted_results: assisted.length,
    competitive_results: competitive.length,
    citation_results: citationResults.length,
    engines: Array.from(new Set(scoredResults.map((x) => x.engine))),
    engine_breakdown: breakdown,
    quality_flags_aggregate: qualityFlagsAggregate,
  }
}
