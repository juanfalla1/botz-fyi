import type { AuditJobRecord } from "@/lib/geo/db-types"
import type { SemanticGeoAnalysis } from "@/lib/geo/analysis/semantic-geo-analysis.schema"

export type PipelineContext = {
  job: AuditJobRecord
  project: {
    id: string
    company_name: string
    website_url: string
    industry: string
    language: string
    country: string
    business_goal: string
    brand_aliases?: string[]
    domain_aliases?: string[]
    entity_stopwords?: string[]
  }
  competitors: Array<{ id: string; name: string; domain: string | null; aliases?: string[]; domain_aliases?: string[] }>
  engines: string[]
}

export type GeneratedPrompt = {
  engine: string
  prompt: string
  category?: string
}

export type AnalysisOutput = {
  geo_score: number
  ai_visibility: number
  citations_count: number
  prompts_won: number
  prompts_lost?: number
  citations_unique_domains?: number
  spontaneous_visibility?: number
  assisted_visibility?: number
  competitive_visibility?: number
  citation_coverage?: number
  total_results?: number
  spontaneous_results?: number
  assisted_results?: number
  competitive_results?: number
  citation_results?: number
  engines: string[]
  recommendations: Array<{ title: string; description: string; priority: "high" | "medium" | "low" }>
  summary: string
  engine_breakdown?: Array<{
    engine: string
    prompts_total: number
    spontaneous_total?: number
    spontaneous_mentions?: number
    assisted_total?: number
    assisted_mentions?: number
    competitive_total?: number
    competitive_wins?: number
    citation_total?: number
    citation_hits?: number
    prompts_won: number
    prompts_lost?: number
    mentions?: number
    citations?: number
    brand_mentions: number
    citations_count: number
    avg_rank: number | null
    fallback_count?: number
    live_count?: number
  }>
  quality_flags_aggregate?: {
    low_confidence: number
    no_citations: number
    brand_not_found: number
    competitor_dominant: number
    fallback_used: number
  }
  semantic_analysis?: SemanticGeoAnalysis | null
  evaluated_prompts?: Array<{
    engine: string
    prompt: string
    prompt_kind?: string
    mentioned: boolean
    position: number | null
    won: boolean
    answer_preview: string
    mode: "live" | "fallback"
  }>
}
