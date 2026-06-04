import { buildEntityVariants, countWordBoundaryMatches, normalizeText, uniqueStrings } from "@/lib/geo/engines/text-utils"
import { getStopwordsForLanguage } from "@/lib/geo/engines/stopwords-catalog"
import type { ConfidenceReason, ConfidenceReasons } from "@/lib/geo/engines/types"

export type EntityMatchResult = {
  brandFound: boolean
  brandConfidence: number
  brandMatchedTokens: string[]
  competitorMentions: string[]
  competitorConfidence: Record<string, number>
  confidenceReasons?: ConfidenceReasons
}

export type EntityMatchingContext = {
  stopwordsUsed: string[]
  brandAliasesUsed: string[]
  competitorAliasesUsed: Record<string, string[]>
}

function scoreVariantMatch(normalizedText: string, variant: string) {
  if (!variant) return 0
  const matches = countWordBoundaryMatches(normalizedText, variant)
  if (matches <= 0) return 0
  const base = variant.includes(".") ? 0.7 : variant.split(" ").length >= 2 ? 0.65 : 0.45
  return Math.min(1, base + Math.min(0.3, matches * 0.08))
}

export function matchEntities(input: {
  text: string
  brandName: string
  brandDomain: string
  brandAliases?: string[]
  domainAliases?: string[]
  competitorNames: string[]
  competitorAliases?: Record<string, string[]>
  competitorDomainAliases?: Record<string, string[]>
  stopwords?: string[]
  language?: string
  country?: string
}): EntityMatchResult {
  const normalizedText = normalizeText(input.text)
  const context = buildEntityMatchingContext(input)
  const brandVariants = context.brandAliasesUsed
  const brandScored = brandVariants
    .map((v) => ({ token: v, score: scoreVariantMatch(normalizedText, normalizeText(v)) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)

  const brandConfidence = brandScored.length > 0 ? brandScored[0].score : 0
  const brandFound = brandConfidence >= 0.52
  const brandReasons: ConfidenceReason[] = []
  if (brandScored.length === 0) {
    brandReasons.push({ code: "low_evidence", weight: -0.35, message: "No strong brand evidence found" })
  } else {
    for (const match of brandScored.slice(0, 3)) {
      const reasonCode = pickReasonCode(match.token, input.brandName, input.brandDomain, input.brandAliases ?? [], input.domainAliases ?? [])
      brandReasons.push({ code: reasonCode, weight: Number(match.score.toFixed(2)), message: `Matched '${match.token}'`, evidence: [match.token] })
      if (match.token.length <= 4) {
        brandReasons.push({ code: "weak_alias", weight: -0.08, message: `Alias '${match.token}' is short and less reliable`, evidence: [match.token] })
      }
    }
  }

  const competitorConfidence: Record<string, number> = {}
  const competitorMentions: string[] = []
  const competitorReasons: Record<string, ConfidenceReason[]> = {}
  for (const competitorName of input.competitorNames) {
    const variants = context.competitorAliasesUsed[competitorName] ?? []
    const bestScore = variants
      .map((v) => scoreVariantMatch(normalizedText, normalizeText(v)))
      .reduce((acc, x) => Math.max(acc, x), 0)
    competitorConfidence[competitorName] = bestScore
    if (bestScore >= 0.55) competitorMentions.push(competitorName)

    const reasons: ConfidenceReason[] = []
    if (bestScore <= 0) {
      reasons.push({ code: "low_evidence", weight: -0.25, message: "No competitor evidence found" })
    } else {
      const bestVariant = variants
        .map((v) => ({ v, score: scoreVariantMatch(normalizedText, normalizeText(v)) }))
        .sort((a, b) => b.score - a.score)[0]
      if (bestVariant) {
        reasons.push({
          code: pickReasonCode(bestVariant.v, competitorName, null, input.competitorAliases?.[competitorName] ?? [], input.competitorDomainAliases?.[competitorName] ?? []),
          weight: Number(bestVariant.score.toFixed(2)),
          message: `Matched '${bestVariant.v}'`,
          evidence: [bestVariant.v],
        })
      }
    }
    if (brandFound && competitorMentions.includes(competitorName)) {
      reasons.push({ code: "competitor_collision", weight: -0.12, message: "Brand and competitor both strongly present" })
    }
    competitorReasons[competitorName] = reasons
  }

  if (context.stopwordsUsed.length > 0) {
    brandReasons.push({ code: "stopword_filtered", weight: -0.03, message: "Stopword filtering applied", evidence: context.stopwordsUsed.slice(0, 8) })
  }

  return {
    brandFound,
    brandConfidence,
    brandMatchedTokens: uniqueStrings(brandScored.slice(0, 4).map((x) => x.token)),
    competitorMentions: uniqueStrings(competitorMentions),
    competitorConfidence,
    confidenceReasons: {
      brand: brandReasons.length > 0 ? brandReasons : [{ code: "low_evidence", weight: -0.3, message: "Low evidence for brand confidence" }],
      competitors: competitorReasons,
    },
  }
}

function pickReasonCode(token: string, entityName: string, entityDomain: string | null, aliases: string[], domainAliases: string[]) {
  const t = normalizeText(token)
  const n = normalizeText(entityName)
  if (t === n) return "exact_name_match"
  const allDomainAliases = [entityDomain ?? "", ...domainAliases].map((x) => normalizeText(x)).filter(Boolean)
  if (allDomainAliases.some((x) => x === t)) return "domain_match"
  if (aliases.map((x) => normalizeText(x)).includes(t)) return "alias_match"
  return "alias_match"
}

export function buildEntityMatchingContext(input: {
  brandName: string
  brandDomain: string
  brandAliases?: string[]
  domainAliases?: string[]
  competitorNames: string[]
  competitorAliases?: Record<string, string[]>
  competitorDomainAliases?: Record<string, string[]>
  stopwords?: string[]
  language?: string
}) : EntityMatchingContext {
  const combinedStopwords = getStopwordsForLanguage(input.language, input.stopwords ?? [])
  const stopwordsUsed = combinedStopwords.map((x) => normalizeText(x)).filter((x) => x.length >= 2)
  const stopwords = new Set(stopwordsUsed)

  const brandAliasesUsed = sanitizeAliases(
    [...buildEntityVariants(input.brandName, input.brandDomain), ...(input.brandAliases ?? []), ...(input.domainAliases ?? [])],
    stopwords
  )

  const competitorAliasesUsed: Record<string, string[]> = {}
  for (const competitorName of input.competitorNames) {
    const aliases = input.competitorAliases?.[competitorName] ?? []
    const domainAliases = input.competitorDomainAliases?.[competitorName] ?? []
    competitorAliasesUsed[competitorName] = sanitizeAliases([...buildEntityVariants(competitorName), ...aliases, ...domainAliases], stopwords)
  }

  return {
    stopwordsUsed: uniqueStrings(stopwordsUsed),
    brandAliasesUsed,
    competitorAliasesUsed,
  }
}

function sanitizeAliases(aliases: string[], stopwords: Set<string>) {
  return uniqueStrings(
    aliases
      .map((x) => normalizeText(String(x)))
      .filter((x) => x.length >= 3)
      .filter((x) => !/^\d+$/.test(x))
      .filter((x) => !["brand", "company", "service", "solution", "official", "best", "top"].includes(x))
      .filter((x) => !stopwords.has(x))
      .filter((x) => x !== "www" && x !== "http" && x !== "https")
  )
}
