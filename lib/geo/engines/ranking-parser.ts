import { buildEntityVariants, normalizeText } from "@/lib/geo/engines/text-utils"

export type RankingParseResult = {
  brandRank: number | null
  firstCompetitorRank: number | null
  entityOrder: string[]
}

function splitListishLines(text: string) {
  return text
    .split(/\n+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .filter((line) => /^(\d+[.)]|[-*•]|#\d+)/.test(line) || line.length > 0)
}

export function parseRanking(input: {
  text: string
  brandName: string
  brandDomain: string
  competitorNames: string[]
}): RankingParseResult {
  const lines = splitListishLines(input.text)
  const normalizedWhole = normalizeText(input.text)
  const entities = [input.brandName, ...input.competitorNames]
  const foundOrder: Array<{ name: string; score: number; pos: number }> = []

  for (const entity of entities) {
    const variants = buildEntityVariants(entity, entity === input.brandName ? input.brandDomain : null)
    let bestPos = Number.MAX_SAFE_INTEGER
    let bestScore = 0

    for (const variant of variants) {
      const v = normalizeText(variant)
      if (!v || v.length < 3) continue

      for (let i = 0; i < lines.length; i += 1) {
        const line = normalizeText(lines[i])
        if (line.includes(v)) {
          const score = 0.8
          if (i < bestPos) {
            bestPos = i
            bestScore = score
          }
        }
      }

      const idx = normalizedWhole.indexOf(v)
      if (idx >= 0 && bestPos === Number.MAX_SAFE_INTEGER) {
        bestPos = lines.length + idx
        bestScore = 0.55
      }
    }

    if (bestScore > 0) {
      foundOrder.push({ name: entity, score: bestScore, pos: bestPos })
    }
  }

  foundOrder.sort((a, b) => a.pos - b.pos)
  const brandIdx = foundOrder.findIndex((x) => x.name === input.brandName)
  const firstCompetitor = foundOrder.find((x) => x.name !== input.brandName)

  return {
    brandRank: brandIdx === -1 ? null : brandIdx + 1,
    firstCompetitorRank: firstCompetitor ? foundOrder.findIndex((x) => x.name === firstCompetitor.name) + 1 : null,
    entityOrder: foundOrder.map((x) => x.name),
  }
}
