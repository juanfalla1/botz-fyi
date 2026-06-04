import type { EngineId, EngineRawResponse, NormalizedEngineResult } from "@/lib/geo/engines/types"
import { parseCitations } from "@/lib/geo/engines/citation-parser"
import { matchEntities } from "@/lib/geo/engines/entity-matcher"
import { buildQualityFlags } from "@/lib/geo/engines/quality-flags"
import { parseRanking } from "@/lib/geo/engines/ranking-parser"

export function normalizeEngineResponse(input: {
  engine: EngineId
  prompt: string
  mode: "live" | "fallback"
  raw: EngineRawResponse
  brandName: string
  competitorNames: string[]
  brandDomain: string
  brandAliases?: string[]
  domainAliases?: string[]
  competitorAliases?: Record<string, string[]>
  competitorDomainAliases?: Record<string, string[]>
  stopwords?: string[]
  language?: string
  country?: string
  error?: string
}): NormalizedEngineResult {
  const text = input.raw.text ?? ""
  const entityMatch = matchEntities({
    text,
    brandName: input.brandName,
    brandDomain: input.brandDomain,
    brandAliases: input.brandAliases,
    domainAliases: input.domainAliases,
    competitorNames: input.competitorNames,
    competitorAliases: input.competitorAliases,
    competitorDomainAliases: input.competitorDomainAliases,
    stopwords: input.stopwords,
    language: input.language,
    country: input.country,
  })
  const citationData = parseCitations(text, input.raw.citations ?? [])
  const ranking = parseRanking({
    text,
    brandName: input.brandName,
    brandDomain: input.brandDomain,
    competitorNames: input.competitorNames,
  })

  const rankingPosition = ranking.brandRank
  const competitorTopPosition = ranking.firstCompetitorRank
  const won =
    entityMatch.brandFound &&
    ((typeof rankingPosition === "number" && typeof competitorTopPosition === "number" && rankingPosition < competitorTopPosition) ||
      (typeof rankingPosition === "number" && competitorTopPosition === null))
  const lost =
    typeof rankingPosition === "number" && typeof competitorTopPosition === "number"
      ? competitorTopPosition < rankingPosition
      : !entityMatch.brandFound && entityMatch.competitorMentions.length > 0

  const qualityFlags = buildQualityFlags({
    confidence: entityMatch.brandConfidence,
    brandFound: entityMatch.brandFound,
    citationsCount: citationData.uniqueCitationCount,
    brandRank: rankingPosition,
    competitorRank: competitorTopPosition,
    mode: input.mode,
  })

  const confidenceReasons = entityMatch.confidenceReasons
  if (confidenceReasons) {
    if (typeof rankingPosition === "number") {
      confidenceReasons.brand.push({
        code: "ranking_context",
        weight: rankingPosition === 1 ? 0.12 : 0.04,
        message: `Brand rank context detected at position ${rankingPosition}`,
      })
    }
    if (confidenceReasons.brand.length === 0) {
      confidenceReasons.brand.push({ code: "low_evidence", weight: -0.3, message: "Low evidence for confidence scoring" })
    }
  }

  return {
    engine: input.engine,
    prompt: input.prompt,
    brandMentioned: entityMatch.brandFound,
    competitorMentions: entityMatch.competitorMentions,
    citations: citationData.urls,
    citationDomains: citationData.domains,
    uniqueCitations: citationData.uniqueCitationCount,
    rankingPosition,
    competitorTopPosition,
    won,
    lost,
    rawText: text,
    mode: input.mode,
    confidence: entityMatch.brandConfidence,
    quality_flags: qualityFlags,
    confidence_reasons: confidenceReasons,
    error: input.error,
  }
}
