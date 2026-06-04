export type GeoJobStatus = "queued" | "running" | "completed" | "failed"

export type Workspace = {
  id: string
  owner_user_id: string
  name: string
  slug: string | null
  created_at: string
  updated_at: string
}

export type ProjectRecord = {
  id: string
  user_id: string
  workspace_id: string | null
  company_name: string
  website_url: string
  country: string
  language: string
  industry: string
  business_goal: string
  brand_aliases?: string[] | null
  domain_aliases?: string[] | null
  entity_stopwords?: string[] | null
  created_at: string
  updated_at: string
}

export type CompetitorRecord = {
  id: string
  user_id: string
  project_id: string | null
  name: string
  domain: string | null
  aliases?: string[] | null
  domain_aliases?: string[] | null
  created_at: string
  updated_at: string
}

export type GeoAuditRecord = {
  id: string
  project_id: string
  status: string
  base_url: string
  crawl_depth: number
  engines: unknown
  summary: string | null
  final_score: number | null
  created_at: string
  completed_at: string | null
}

export type GeoAuditSnapshot = {
  geo_score: number
  ai_visibility: number
  citations_count: number
  prompts_won: number
  engines: string[]
  recommendations: Array<{ title: string; description: string; priority: "high" | "medium" | "low" }>
}

export type AuditJobRecord = {
  id: string
  user_id: string
  project_id: string | null
  audit_id: string | null
  status: GeoJobStatus
  payload: Record<string, unknown>
  error_message: string | null
  failed_reason?: string | null
  retry_count?: number
  max_retries?: number
  locked_at?: string | null
  heartbeat_at?: string | null
  next_retry_at?: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type AuditJobLogRecord = {
  id: string
  job_id: string
  user_id: string
  stage:
    | "queued"
    | "running"
    | "prompt_building"
    | "analyzing"
    | "scoring"
    | "completed"
    | "failed"
    | "lock_acquired"
    | "lock_released"
    | "lock_timeout"
    | "retry_scheduled"
    | "orphan_recovered"
  message: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export type UsageEventRecord = {
  id: string
  user_id: string
  event_type: "geo_audit_created" | "prompt_used" | "report_exported"
  amount: number
  metadata: Record<string, unknown>
  created_at: string
}

export type NotificationRecord = {
  id: string
  user_id: string
  title: string
  body: string | null
  level: string
  read_at: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export type AutomationRecord = {
  id: string
  user_id: string
  project_id: string | null
  competitor_id: string | null
  name: string
  frequency: string
  enabled: boolean
  config: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type GeoPromptRecord = {
  id: string
  user_id: string
  project_id: string
  prompt: string
  category: string
  engines: string[]
  country: string | null
  language: string | null
  enabled: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}
