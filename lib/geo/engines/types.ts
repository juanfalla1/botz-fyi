export type EngineId = "openai" | "perplexity" | "gemini" | "ai_overviews"

export type EnginePromptInput = {
  prompt: string
  brandName: string
  brandDomain: string
  competitorNames: string[]
  neutral?: boolean
}

export type EngineRawResponse = {
  text: string
  citations?: string[]
  meta?: Record<string, unknown>
}

export type ProviderStatus = "configured" | "disabled" | "degraded"

export type EngineProvider = {
  id: EngineId
  status: ProviderStatus
  reason?: string
  runPrompt: (input: EnginePromptInput) => Promise<EngineRawResponse>
}

export type ConfidenceReasonCode =
  | "exact_name_match"
  | "alias_match"
  | "domain_match"
  | "ranking_context"
  | "weak_alias"
  | "stopword_filtered"
  | "competitor_collision"
  | "low_evidence"

export type ConfidenceReason = {
  code: ConfidenceReasonCode
  weight: number
  message: string
  evidence?: string[]
}

export type ConfidenceReasons = {
  brand: ConfidenceReason[]
  competitors: Record<string, ConfidenceReason[]>
}

export type NormalizedEngineResult = {
  engine: EngineId
  prompt: string
  brandMentioned: boolean
  competitorMentions: string[]
  citations: string[]
  citationDomains: string[]
  uniqueCitations: number
  rankingPosition: number | null
  competitorTopPosition: number | null
  won: boolean
  lost: boolean
  rawText: string
  mode: "live" | "fallback"
  confidence: number
  quality_flags: {
    low_confidence: boolean
    no_citations: boolean
    brand_not_found: boolean
    competitor_dominant: boolean
    fallback_used: boolean
  }
  confidence_reasons?: ConfidenceReasons
  error?: string
}
