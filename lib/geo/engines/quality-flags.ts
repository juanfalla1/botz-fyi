export type QualityFlags = {
  low_confidence: boolean
  no_citations: boolean
  brand_not_found: boolean
  competitor_dominant: boolean
  fallback_used: boolean
}

export function buildQualityFlags(input: {
  confidence: number
  brandFound: boolean
  citationsCount: number
  brandRank: number | null
  competitorRank: number | null
  mode: "live" | "fallback"
}) {
  const competitorDominant =
    typeof input.brandRank === "number" && typeof input.competitorRank === "number"
      ? input.competitorRank < input.brandRank
      : !input.brandFound && typeof input.competitorRank === "number"

  const flags: QualityFlags = {
    low_confidence: input.confidence < 0.58,
    no_citations: input.citationsCount === 0,
    brand_not_found: !input.brandFound,
    competitor_dominant: competitorDominant,
    fallback_used: input.mode === "fallback",
  }
  return flags
}
