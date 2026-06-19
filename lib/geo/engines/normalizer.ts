import type { EngineId, EngineRawResponse, NormalizedEngineResult } from "@/lib/geo/engines/types"
import { parseCitations } from "@/lib/geo/engines/citation-parser"
import { matchEntities } from "@/lib/geo/engines/entity-matcher"
import { buildQualityFlags } from "@/lib/geo/engines/quality-flags"
import { parseRanking } from "@/lib/geo/engines/ranking-parser"
import { buildEntityVariants, normalizeDomain, normalizeText, uniqueStrings } from "@/lib/geo/engines/text-utils"

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
  promptKind?: "spontaneous" | "assisted" | "competitive" | "citation"
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
  const brandDomain = normalizeDomain(input.brandDomain)
  const externalCitations = citationData.urls.filter((url) => {
    const domain = normalizeDomain(url)
    return Boolean(domain && brandDomain && domain !== brandDomain && !domain.endsWith(`.${brandDomain}`))
  })
  const externalCitationDomains = uniqueStrings(externalCitations.map((url) => normalizeDomain(url)).filter(Boolean))
  const ranking = parseRanking({
    text,
    brandName: input.brandName,
    brandDomain: input.brandDomain,
    competitorNames: input.competitorNames,
  })

  const positiveBrandMention = entityMatch.brandFound && hasPositiveBrandContext(text, input.brandName, input.brandDomain, input.brandAliases, input.domainAliases)
  const rankingPosition = positiveBrandMention ? ranking.brandRank : null
  const competitorTopPosition = ranking.firstCompetitorRank
  const won =
    positiveBrandMention &&
    ((typeof rankingPosition === "number" && typeof competitorTopPosition === "number" && rankingPosition < competitorTopPosition) ||
      (typeof rankingPosition === "number" && competitorTopPosition === null))
  const lost =
    typeof rankingPosition === "number" && typeof competitorTopPosition === "number"
      ? competitorTopPosition < rankingPosition
      : !positiveBrandMention && entityMatch.competitorMentions.length > 0

  const qualityFlags = buildQualityFlags({
    confidence: entityMatch.brandConfidence,
    brandFound: positiveBrandMention,
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
    promptKind: input.promptKind,
    brandMentioned: positiveBrandMention,
    competitorMentions: entityMatch.competitorMentions,
    citations: citationData.urls,
    citationDomains: citationData.domains,
    uniqueCitations: citationData.uniqueCitationCount,
    externalCitations,
    externalCitationDomains,
    externalUniqueCitations: externalCitations.length,
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

function hasPositiveBrandContext(text: string, brandName: string, brandDomain: string, brandAliases: string[] = [], domainAliases: string[] = []) {
  const normalized = normalizeText(text)
  const variants = uniqueStrings([...buildEntityVariants(brandName, brandDomain), ...brandAliases, ...domainAliases].map(normalizeText).filter((x) => x.length >= 3))
  if (variants.length === 0) return false

  for (const variant of variants) {
    const index = normalized.indexOf(variant)
    if (index < 0) continue
    const snippet = normalized.slice(Math.max(0, index - 90), Math.min(normalized.length, index + variant.length + 140))
    const weakReference = /\b(alternativas?\s+a|alternatives?\s+to|competidores?\s+(?:o\s+)?alternativas?\s+a|competitors?\s+(?:or\s+)?alternatives?\s+to|en\s+lugar\s+de|instead\s+of|similar\s+a|similar\s+to|no\s+(?:aparece|menciona|recomienda)|not\s+(?:mentioned|recommended))\b/.test(snippet)
    if (weakReference) continue
    const positiveSignal = /\b(opci[oó]n|recomienda|recomendado|recomendar[ií]a|proveedor|plataforma|soluci[oó]n|fuerte|destaca|validar|fortalezas?|ideal|fant[aá]stica|leader|leading|recommended|recommend|provider|platform|solution|strong|stands?\s+out|good\s+fit|best\s+fit|strengths?|validate)\b/.test(snippet)
    const listSignal = normalized.split(/\n|\s{2,}/).some((line) => new RegExp(`^\\s*(?:\\d+[.)]\\s*)?${escapeRegExp(variant)}(?=$|\\W)`, "i").test(line))
    if (positiveSignal || listSignal) return true
  }

  return false
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
