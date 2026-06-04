import type { NormalizedEngineResult } from "@/lib/geo/engines/types"

export type EngineBreakdown = {
  engine: string
  prompts_total: number
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

export function scoreSnapshotV1(results: NormalizedEngineResult[]): GeoSnapshotV1 {
  const byEngine = new Map<string, NormalizedEngineResult[]>()
  for (const r of results) {
    const list = byEngine.get(r.engine) ?? []
    list.push(r)
    byEngine.set(r.engine, list)
  }

  const breakdown: EngineBreakdown[] = Array.from(byEngine.entries()).map(([engine, list]) => {
    const rankValues = list.map((x) => x.rankingPosition).filter((x): x is number => typeof x === "number")
    return {
      engine,
      prompts_total: list.length,
      mentions: list.filter((x) => x.brandMentioned).length,
      citations: list.reduce((acc, x) => acc + x.uniqueCitations, 0),
      prompts_won: list.filter((x) => x.won).length,
      prompts_lost: list.filter((x) => x.lost).length,
      brand_mentions: list.filter((x) => x.brandMentioned).length,
      citations_count: list.reduce((acc, x) => acc + x.uniqueCitations, 0),
      avg_rank: avg(rankValues),
      fallback_count: list.filter((x) => x.mode === "fallback").length,
      live_count: list.filter((x) => x.mode === "live").length,
    }
  })

  const promptsTotal = Math.max(1, results.length)
  const promptsWon = results.filter((x) => x.won).length
  const promptsLost = results.filter((x) => x.lost).length
  const mentions = results.filter((x) => x.brandMentioned).length
  const citations = results.reduce((acc, x) => acc + x.uniqueCitations, 0)
  const citationDomains = new Set(results.flatMap((x) => x.citationDomains)).size

  const visibility = Math.min(100, Math.round((mentions / promptsTotal) * 100))
  const winRate = (promptsWon / promptsTotal) * 100
  const lossPenalty = Math.min(20, Math.round((promptsLost / promptsTotal) * 20))
  const citationScore = Math.min(100, Math.round((citations / promptsTotal) * 25))
  const geoScore = Math.round(Math.max(0, Math.min(100, visibility * 0.5 + winRate * 0.35 + citationScore * 0.15 - lossPenalty)))

  const qualityFlagsAggregate = {
    low_confidence: results.filter((x) => x.quality_flags.low_confidence).length,
    no_citations: results.filter((x) => x.quality_flags.no_citations).length,
    brand_not_found: results.filter((x) => x.quality_flags.brand_not_found).length,
    competitor_dominant: results.filter((x) => x.quality_flags.competitor_dominant).length,
    fallback_used: results.filter((x) => x.quality_flags.fallback_used).length,
  }

  return {
    geo_score: geoScore,
    ai_visibility: visibility,
    citations_count: citations,
    citations_unique_domains: citationDomains,
    prompts_won: promptsWon,
    prompts_lost: promptsLost,
    engines: Array.from(new Set(results.map((x) => x.engine))),
    engine_breakdown: breakdown,
    quality_flags_aggregate: qualityFlagsAggregate,
  }
}
