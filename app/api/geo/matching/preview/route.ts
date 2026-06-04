import { NextResponse } from "next/server"
import { getGeoApiClient } from "@/lib/geo/api-auth"
import { parseCitations } from "@/lib/geo/engines/citation-parser"
import { buildEntityMatchingContext, matchEntities } from "@/lib/geo/engines/entity-matcher"
import { buildQualityFlags } from "@/lib/geo/engines/quality-flags"
import { parseRanking } from "@/lib/geo/engines/ranking-parser"
import { getProjectForMatchingPreview } from "@/lib/geo/repositories/projects.repo"
import { geoMatchingPreviewSchema } from "@/lib/validators/geo-matching-preview.schema"

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const parsed = geoMatchingPreviewSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  try {
    const { supabase, user } = await getGeoApiClient(req)
    const project = await getProjectForMatchingPreview(supabase, user.id, parsed.data.project_id)
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const competitors = parsed.data.competitors ?? []
    const competitorNames = competitors.map((c) => c.name)
    const competitorAliases = Object.fromEntries(competitors.map((c) => [c.name, [c.name]]))
    const competitorDomainAliases = Object.fromEntries(competitors.map((c) => [c.name, c.domain ? [c.domain] : []]))

    const brandDomain = project.website_url.replace(/^https?:\/\//, "")
    const matchingContext = buildEntityMatchingContext({
      brandName: project.company_name,
      brandDomain,
      brandAliases: project.brand_aliases,
      domainAliases: project.domain_aliases,
      competitorNames,
      competitorAliases,
      competitorDomainAliases,
      stopwords: project.entity_stopwords,
      language: project.language ?? undefined,
    })

    const entity = matchEntities({
      text: parsed.data.text,
      brandName: project.company_name,
      brandDomain,
      brandAliases: project.brand_aliases,
      domainAliases: project.domain_aliases,
      competitorNames,
      competitorAliases,
      competitorDomainAliases,
      stopwords: project.entity_stopwords,
      language: project.language ?? undefined,
      country: project.country ?? undefined,
    })

    const citations = parseCitations(parsed.data.text, [])
    const ranking = parseRanking({
      text: parsed.data.text,
      brandName: project.company_name,
      brandDomain,
      competitorNames,
    })

    const qualityFlags = buildQualityFlags({
      confidence: entity.brandConfidence,
      brandFound: entity.brandFound,
      citationsCount: citations.uniqueCitationCount,
      brandRank: ranking.brandRank,
      competitorRank: ranking.firstCompetitorRank,
      mode: "live",
    })

    return NextResponse.json({
      data: {
        brand_detected: entity.brandFound,
        brand_confidence: Number(entity.brandConfidence.toFixed(2)),
        competitors_detected: entity.competitorMentions,
        citations: citations.urls,
        ranking: {
          brand_rank: ranking.brandRank,
          first_competitor_rank: ranking.firstCompetitorRank,
          entity_order: ranking.entityOrder,
        },
        quality_flags: qualityFlags,
        confidence_reasons: entity.confidenceReasons ?? {
          brand: [{ code: "low_evidence", weight: -0.3, message: "Low evidence for confidence scoring" }],
          competitors: {},
        },
        stopwords_used: matchingContext.stopwordsUsed,
        aliases_used: {
          brand: matchingContext.brandAliasesUsed,
          competitors: matchingContext.competitorAliasesUsed,
        },
      },
      mode: "live",
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 })
  }
}
