import type { SupabaseClient } from "@supabase/supabase-js"

export type GeoActionProject = {
  id: string
  user_id: string
  company_name: string
  website_url: string
  industry?: string | null
  country?: string | null
  language?: string | null
  business_goal?: string | null
}

export type GeoActionAudit = {
  id: string
  project_id: string
  final_score: number | null
  summary: string | null
  completed_at: string | null
  created_at: string
}

export type GeoActionCompetitor = {
  id: string
  name: string
  domain: string | null
}

export type GeoCompetitorMention = {
  audit_id: string
  competitor_name: string
  engine: string
  mentioned: boolean
  mention_context: string | null
  position: number | null
}

export type GeoCrawledPage = {
  audit_id: string
  url: string
  title: string | null
  description: string | null
  word_count: number | null
}

export type GeoActionAiQuery = {
  id: string
  prompt: string
  engine: string
  intent: string | null
  ai_answers: Array<{ answer_text?: string | null; raw_response?: Record<string, unknown> | null }>
}

export type GeoActionContext = {
  project: GeoActionProject
  audits: GeoActionAudit[]
  latestAudit: GeoActionAudit | null
  latestSummary: Record<string, unknown>
  recommendations: Array<Record<string, unknown>>
  opportunities: Array<Record<string, unknown>>
  competitors: GeoActionCompetitor[]
  competitorMentions: GeoCompetitorMention[]
  crawledPages: GeoCrawledPage[]
  aiQueries: GeoActionAiQuery[]
}

export async function loadGeoActionContext(supabase: SupabaseClient, userId: string, projectId: string): Promise<GeoActionContext | null> {
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, user_id, company_name, website_url, industry, country, language, business_goal")
    .eq("id", projectId)
    .eq("user_id", userId)
    .maybeSingle()
  if (projectError) throw projectError
  if (!project) return null

  const { data: audits, error: auditsError } = await supabase
    .from("geo_audits")
    .select("id, project_id, final_score, summary, completed_at, created_at")
    .eq("project_id", projectId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false, nullsFirst: false })
    .limit(8)
  if (auditsError) throw auditsError

  const auditRows = (audits ?? []) as GeoActionAudit[]
  const auditIds = auditRows.map((audit) => String(audit.id))
  const latestAudit = auditRows[0] ?? null
  const { data: competitors, error: competitorsError } = await supabase
    .from("competitors")
    .select("id, name, domain")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
  if (competitorsError) throw competitorsError

  const [recommendationsResult, opportunitiesResult, competitorMentionsResult, crawledPagesResult] = auditIds.length > 0
    ? await Promise.all([
        supabase
          .from("recommendations")
          .select("id, audit_id, title, description, priority, type, suggested_action, status, created_at")
          .in("audit_id", auditIds)
          .order("created_at", { ascending: false }),
        supabase
          .from("content_opportunities")
          .select("id, audit_id, title, target_prompt, intent, recommended_format, priority, brief, created_at")
          .in("audit_id", auditIds)
          .order("created_at", { ascending: false }),
        supabase
          .from("competitor_mentions")
          .select("audit_id, competitor_name, engine, mentioned, mention_context, position")
          .in("audit_id", auditIds),
        supabase
          .from("crawled_pages")
          .select("audit_id, url, title, description, word_count")
          .in("audit_id", auditIds),
      ])
    : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }, { data: [], error: null }]
  if (recommendationsResult.error) throw recommendationsResult.error
  if (opportunitiesResult.error) throw opportunitiesResult.error
  if (competitorMentionsResult.error) throw competitorMentionsResult.error
  if (crawledPagesResult.error) throw crawledPagesResult.error

  const { data: aiQueries, error: aiQueriesError } = latestAudit
    ? await supabase
        .from("ai_queries")
        .select("id, prompt, engine, intent, ai_answers(answer_text, raw_response)")
        .eq("audit_id", latestAudit.id)
        .order("created_at", { ascending: true })
    : { data: [], error: null }
  if (aiQueriesError) throw aiQueriesError

  return {
    project: project as GeoActionProject,
    audits: auditRows,
    latestAudit,
    latestSummary: parseSummary(latestAudit?.summary),
    recommendations: (recommendationsResult.data ?? []) as Array<Record<string, unknown>>,
    opportunities: (opportunitiesResult.data ?? []) as Array<Record<string, unknown>>,
    competitors: (competitors ?? []).map((competitor) => ({
      id: String(competitor.id),
      name: String(competitor.name),
      domain: competitor.domain ? String(competitor.domain) : null,
    })),
    competitorMentions: (competitorMentionsResult.data ?? []).map((mention) => ({
      audit_id: String(mention.audit_id),
      competitor_name: String(mention.competitor_name),
      engine: String(mention.engine),
      mentioned: Boolean(mention.mentioned),
      mention_context: mention.mention_context ? String(mention.mention_context) : null,
      position: typeof mention.position === "number" ? mention.position : null,
    })),
    crawledPages: (crawledPagesResult.data ?? []).map((page) => ({
      audit_id: String(page.audit_id),
      url: String(page.url),
      title: page.title ? String(page.title) : null,
      description: page.description ? String(page.description) : null,
      word_count: typeof page.word_count === "number" ? page.word_count : null,
    })),
    aiQueries: (aiQueries ?? []).map((query) => ({
      id: String(query.id),
      prompt: String(query.prompt ?? ""),
      engine: String(query.engine ?? ""),
      intent: query.intent ? String(query.intent) : null,
      ai_answers: Array.isArray(query.ai_answers) ? query.ai_answers.map((answer) => ({
        answer_text: answer.answer_text ? String(answer.answer_text) : null,
        raw_response: answer.raw_response && typeof answer.raw_response === "object" && !Array.isArray(answer.raw_response) ? answer.raw_response as Record<string, unknown> : null,
      })) : [],
    })),
  }
}

export function competitiveSnapshot(ctx: GeoActionContext) {
  const mentioned = ctx.competitorMentions.filter((mention) => mention.mentioned)
  const counts = new Map<string, { name: string; mentions: number; engines: Set<string>; bestPosition: number | null }>()
  for (const mention of mentioned) {
    const current = counts.get(mention.competitor_name) ?? { name: mention.competitor_name, mentions: 0, engines: new Set<string>(), bestPosition: null }
    current.mentions += 1
    current.engines.add(mention.engine)
    if (typeof mention.position === "number") current.bestPosition = current.bestPosition === null ? mention.position : Math.min(current.bestPosition, mention.position)
    counts.set(mention.competitor_name, current)
  }
  const leaders = Array.from(counts.values())
    .map((item) => ({ name: item.name, mentions: item.mentions, engines: Array.from(item.engines), best_position: item.bestPosition }))
    .sort((a, b) => b.mentions - a.mentions)
  return {
    tracked_competitors: ctx.competitors.length,
    mentioned_competitors: leaders.length,
    top_competitor: leaders[0] ?? null,
    competitors: leaders,
  }
}

export function parseSummary(summary: unknown): Record<string, unknown> {
  if (summary && typeof summary === "object" && !Array.isArray(summary)) return summary as Record<string, unknown>
  if (!summary || typeof summary !== "string") return {}
  try {
    const parsed = JSON.parse(summary)
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

export function numberFrom(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value)
  return Number.isFinite(numeric) ? Math.round(numeric) : 0
}

export function objectArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : []
}

export function normalizePriority(value: unknown): "high" | "medium" | "low" {
  const text = String(value ?? "medium").toLowerCase()
  if (text.includes("alta") || text.includes("high")) return "high"
  if (text.includes("baja") || text.includes("low")) return "low"
  return "medium"
}

export function priorityRank(priority: "high" | "medium" | "low") {
  return priority === "high" ? 0 : priority === "medium" ? 1 : 2
}

export function latestAuditSnapshot(ctx: GeoActionContext) {
  const semantic = ctx.latestSummary.semantic_analysis && typeof ctx.latestSummary.semantic_analysis === "object"
    ? ctx.latestSummary.semantic_analysis as Record<string, unknown>
    : null
  return ctx.latestAudit ? {
    id: ctx.latestAudit.id,
    final_score: ctx.latestAudit.final_score,
    completed_at: ctx.latestAudit.completed_at,
    geo_score: numberFrom(ctx.latestSummary.geo_score ?? ctx.latestAudit.final_score),
    ai_visibility: numberFrom(ctx.latestSummary.ai_visibility ?? semantic?.brand_visibility),
    spontaneous_visibility: numberFrom(ctx.latestSummary.spontaneous_visibility ?? ctx.latestSummary.ai_visibility ?? semantic?.brand_visibility),
    assisted_visibility: numberFrom(ctx.latestSummary.assisted_visibility),
    competitive_visibility: numberFrom(ctx.latestSummary.competitive_visibility),
    citation_coverage: numberFrom(ctx.latestSummary.citation_coverage),
    total_results: numberFrom(ctx.latestSummary.total_results),
    spontaneous_results: numberFrom(ctx.latestSummary.spontaneous_results),
    assisted_results: numberFrom(ctx.latestSummary.assisted_results),
    competitive_results: numberFrom(ctx.latestSummary.competitive_results),
    citation_results: numberFrom(ctx.latestSummary.citation_results),
    prompts_won: numberFrom(ctx.latestSummary.prompts_won),
    prompts_lost: numberFrom(ctx.latestSummary.prompts_lost),
    citations_count: numberFrom(ctx.latestSummary.citations_count),
    executive_summary: semantic ? String(semantic.executive_summary ?? ctx.latestSummary.summary ?? "") : String(ctx.latestSummary.summary ?? ""),
  } : null
}

export function previousAuditSnapshot(ctx: GeoActionContext) {
  const previous = ctx.audits[1]
  if (!previous) return null
  const summary = parseSummary(previous.summary)
  const current = latestAuditSnapshot(ctx)
  const previousScore = numberFrom(summary.geo_score ?? previous.final_score)
  const previousSpontaneous = numberFrom(summary.spontaneous_visibility ?? summary.ai_visibility)
  return {
    id: previous.id,
    completed_at: previous.completed_at,
    geo_score: previousScore,
    spontaneous_visibility: previousSpontaneous,
    competitive_visibility: numberFrom(summary.competitive_visibility),
    citation_coverage: numberFrom(summary.citation_coverage),
    delta: current ? {
      geo_score: numberFrom(current.geo_score) - previousScore,
      spontaneous_visibility: numberFrom(current.spontaneous_visibility) - previousSpontaneous,
      competitive_visibility: numberFrom(current.competitive_visibility) - numberFrom(summary.competitive_visibility),
      citation_coverage: numberFrom(current.citation_coverage) - numberFrom(summary.citation_coverage),
    } : null,
  }
}

export function latestCrawlEvidence(ctx: GeoActionContext) {
  const auditId = ctx.latestAudit?.id
  const pages = auditId ? ctx.crawledPages.filter((page) => page.audit_id === auditId) : []
  return {
    pages_crawled: pages.length,
    total_words: pages.reduce((total, page) => total + (page.word_count ?? 0), 0),
    pages: pages.slice(0, 10),
  }
}
