import { NextResponse } from "next/server"
import { getGeoApiClient } from "@/lib/geo/api-auth"
import { assertProjectOwner } from "@/lib/geo/ownership"

type CompetitorRow = {
  id: string
  name: string
  domain: string | null
  project_id: string | null
  created_at?: string
}

type CompetitorMetric = CompetitorRow & {
  geo_score: number
  visibility: number
  citations: number
  prompts_won: number
  mentions: number
  total_checks: number
  engines: string[]
}

function normalizeName(value: unknown) {
  return String(value ?? "").trim().toLowerCase()
}

function numberFrom(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function scoreCompetitor(input: { visibility: number; promptsWon: number; mentions: number }) {
  return Math.min(100, Math.round(input.visibility * 0.65 + Math.min(30, input.promptsWon * 8) + Math.min(10, input.mentions * 2)))
}

export async function GET(req: Request) {
  try {
    const { supabase, user } = await getGeoApiClient(req)
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get("project_id")
    if (projectId) await assertProjectOwner(supabase, user.id, projectId)

    let competitorsQuery = supabase
      .from("competitors")
      .select("id, name, domain, project_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
    if (projectId) competitorsQuery = competitorsQuery.eq("project_id", projectId)
    const { data: competitors, error: competitorsError } = await competitorsQuery
    if (competitorsError) throw competitorsError

    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("id")
      .eq("user_id", user.id)
    if (projectsError) throw projectsError

    const projectIds = projectId ? [projectId] : (projects ?? []).map((project) => String(project.id))
    const { data: audits, error: auditsError } = projectIds.length > 0
      ? await supabase
          .from("geo_audits")
          .select("id, project_id, final_score, summary, completed_at, created_at")
          .in("project_id", projectIds)
          .eq("status", "completed")
          .order("completed_at", { ascending: false, nullsFirst: false })
      : { data: [], error: null }
    if (auditsError) throw auditsError

    const auditRows = audits ?? []
    const auditIds = auditRows.map((audit) => String(audit.id))
    const [competitorMentionsResult, brandMentionsResult] = auditIds.length > 0
      ? await Promise.all([
          supabase
            .from("competitor_mentions")
            .select("audit_id, competitor_name, engine, mentioned, position")
            .in("audit_id", auditIds),
          supabase
            .from("brand_mentions")
            .select("audit_id, engine, mentioned")
            .in("audit_id", auditIds),
        ])
      : [{ data: [], error: null }, { data: [], error: null }]
    if (competitorMentionsResult.error) throw competitorMentionsResult.error
    if (brandMentionsResult.error) throw brandMentionsResult.error

    const competitorMetrics: CompetitorMetric[] = ((competitors ?? []) as CompetitorRow[]).map((competitor) => {
      const name = normalizeName(competitor.name)
      const rows = (competitorMentionsResult.data ?? []).filter((mention) => normalizeName(mention.competitor_name) === name)
      const mentionedRows = rows.filter((mention) => Boolean(mention.mentioned))
      const engines = Array.from(new Set(mentionedRows.map((mention) => String(mention.engine)).filter(Boolean)))
      const totalChecks = rows.length
      const mentions = mentionedRows.length
      const visibility = totalChecks > 0 ? Math.round((mentions / totalChecks) * 100) : 0
      const promptsWon = mentionedRows.filter((mention) => {
        const position = numberFrom(mention.position)
        return position > 0 && position <= 3
      }).length
      return {
        ...competitor,
        geo_score: scoreCompetitor({ visibility, promptsWon, mentions }),
        visibility,
        citations: 0,
        prompts_won: promptsWon,
        mentions,
        total_checks: totalChecks,
        engines,
      }
    })

    const latestAudit = auditRows[0] ?? null
    const brandRows = brandMentionsResult.data ?? []
    const brandMentions = brandRows.filter((mention) => Boolean(mention.mentioned)).length
    const brandVisibility = brandRows.length > 0 ? Math.round((brandMentions / brandRows.length) * 100) : 0
    const leader = competitorMetrics.reduce<CompetitorMetric | null>((best, item) => (!best || item.geo_score > best.geo_score ? item : best), null)

    return NextResponse.json({
      mode: "live",
      data: {
        competitors: competitorMetrics,
        summary: {
          your_geo_score: Math.round(numberFrom(latestAudit?.final_score)),
          your_visibility: brandVisibility,
          tracked_competitors: competitorMetrics.length,
          won_prompts: brandMentions,
          total_citations: 0,
          leader: leader ? { id: leader.id, name: leader.name, geo_score: leader.geo_score, visibility: leader.visibility } : null,
          completed_audits: auditRows.length,
        },
      },
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load competitor insights" }, { status: 500 })
  }
}
