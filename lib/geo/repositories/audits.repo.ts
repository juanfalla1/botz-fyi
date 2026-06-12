import type { SupabaseClient } from "@supabase/supabase-js"
import type { AuditJobRecord, GeoAuditRecord } from "@/lib/geo/db-types"
import { createAuditJobLog } from "@/lib/geo/repositories/audit-job-logs.repo"
import { computeNextRetryAt } from "@/lib/geo/retry/retry-policy"

function getTimeoutCutoffIso(lockTimeoutMinutes: number) {
  return new Date(Date.now() - lockTimeoutMinutes * 60_000).toISOString()
}

function isMissingColumn(error: unknown) {
  if (!error || typeof error !== "object") return false
  const value = error as Record<string, unknown>
  const text = [value.message, value.details, value.hint, value.code].filter(Boolean).map(String).join(" | ")
  return text.includes("42703") || text.toLowerCase().includes("does not exist")
}

export async function createAuditManual(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  baseUrl: string,
  crawlDepth: number,
  engines: string[]
) {
  const { data: audit, error: auditError } = await supabase
    .from("geo_audits")
    .insert({ project_id: projectId, base_url: baseUrl, crawl_depth: crawlDepth, engines, status: "pending" })
    .select("*")
    .single()
  if (auditError) throw auditError

  const { data: job, error: jobError } = await supabase
    .from("audit_jobs")
    .insert({
      user_id: userId,
      project_id: projectId,
      audit_id: audit.id,
      status: "queued",
      payload: { source: "manual" },
      retry_count: 0,
      max_retries: 3,
      next_retry_at: null,
      locked_at: null,
      heartbeat_at: null,
      failed_reason: null,
    })
    .select("*")
    .single()
  if (jobError) throw jobError

  await createAuditJobLog(supabase, {
    job_id: job.id,
    user_id: userId,
    stage: "queued",
    message: "Audit job queued",
    metadata: { source: "manual" },
  })

  return { audit: audit as GeoAuditRecord, job: job as AuditJobRecord }
}

export async function getAuditJob(supabase: SupabaseClient, userId: string, id: string) {
  const { data, error } = await supabase
    .from("audit_jobs")
    .select("*, geo_audits(id, status, final_score, summary, completed_at, created_at)")
    .eq("id", id)
    .eq("user_id", userId)
    .single()
  if (error) throw error
  return data as AuditJobRecord
}

export async function setAuditJobStatus(
  supabase: SupabaseClient,
  id: string,
  status: AuditJobRecord["status"],
  patch?: Partial<Pick<AuditJobRecord, "error_message" | "started_at" | "completed_at">>
) {
  const { data, error } = await supabase.from("audit_jobs").update({ status, ...patch }).eq("id", id).select("*").single()
  if (error) throw error
  return data as AuditJobRecord
}

export async function listQueuedAuditJobs(supabase: SupabaseClient, userId: string, limit = 5) {
  const { data, error } = await supabase
    .from("audit_jobs")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["queued", "failed"])
    .or(`next_retry_at.is.null,next_retry_at.lte.${new Date().toISOString()}`)
    .lt("retry_count", 1000)
    .order("created_at", { ascending: true })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as AuditJobRecord[]
}

export async function listProcessableAuditJobsGlobal(supabase: SupabaseClient, limit = 10) {
  const { data, error } = await supabase
    .from("audit_jobs")
    .select("*")
    .in("status", ["queued", "failed"])
    .or(`next_retry_at.is.null,next_retry_at.lte.${new Date().toISOString()}`)
    .is("locked_at", null)
    .order("created_at", { ascending: true })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as AuditJobRecord[]
}

export async function markAuditJobRunning(supabase: SupabaseClient, id: string) {
  const nowIso = new Date().toISOString()
  const { data, error } = await supabase
    .from("audit_jobs")
    .update({ status: "running", started_at: nowIso, locked_at: nowIso, heartbeat_at: nowIso, failed_reason: null })
    .eq("id", id)
    .in("status", ["queued", "failed"])
    .is("locked_at", null)
    .select("*")
    .maybeSingle()
  if (error) throw error
  return (data as AuditJobRecord | null) ?? null
}

export async function markAuditJobCompleted(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("audit_jobs")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      error_message: null,
      failed_reason: null,
      locked_at: null,
      heartbeat_at: null,
      next_retry_at: null,
    })
    .eq("id", id)
    .select("*")
    .single()
  if (error) throw error
  return data as AuditJobRecord
}

export async function failAuditJob(supabase: SupabaseClient, id: string, message: string) {
  const { data: jobBefore } = await supabase
    .from("audit_jobs")
    .select("retry_count,max_retries")
    .eq("id", id)
    .single()

  const nextRetryCount = Number(jobBefore?.retry_count ?? 0) + 1
  const maxRetries = Number(jobBefore?.max_retries ?? 3)
  const shouldTerminalFail = nextRetryCount >= maxRetries
  const nextRetryAt = shouldTerminalFail ? null : computeNextRetryAt(nextRetryCount)

  const { data, error } = await supabase
    .from("audit_jobs")
    .update({
      status: "failed",
      completed_at: shouldTerminalFail ? new Date().toISOString() : null,
      error_message: message,
      failed_reason: message,
      retry_count: nextRetryCount,
      next_retry_at: nextRetryAt,
      locked_at: null,
      heartbeat_at: null,
    })
    .eq("id", id)
    .select("*")
    .single()
  if (error) throw error
  return data as AuditJobRecord
}

export async function touchAuditJobHeartbeat(supabase: SupabaseClient, id: string) {
  const nowIso = new Date().toISOString()
  const { error } = await supabase
    .from("audit_jobs")
    .update({ locked_at: nowIso, heartbeat_at: nowIso })
    .eq("id", id)
    .eq("status", "running")
  if (error) throw error
}

export async function releaseAuditJobLock(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("audit_jobs").update({ locked_at: null, heartbeat_at: null }).eq("id", id)
  if (error) throw error
}

export async function listTimedOutRunningJobs(supabase: SupabaseClient, lockTimeoutMinutes: number, limit = 25) {
  const cutoff = getTimeoutCutoffIso(lockTimeoutMinutes)
  const { data, error } = await supabase
    .from("audit_jobs")
    .select("*")
    .eq("status", "running")
    .or(`heartbeat_at.lte.${cutoff},and(heartbeat_at.is.null,locked_at.lte.${cutoff})`)
    .order("locked_at", { ascending: true })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as AuditJobRecord[]
}

export async function listTimedOutRunningJobsForUser(supabase: SupabaseClient, userId: string, lockTimeoutMinutes: number, limit = 25) {
  const cutoff = getTimeoutCutoffIso(lockTimeoutMinutes)
  const { data, error } = await supabase
    .from("audit_jobs")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "running")
    .or(`heartbeat_at.lte.${cutoff},and(heartbeat_at.is.null,locked_at.lte.${cutoff})`)
    .order("locked_at", { ascending: true })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as AuditJobRecord[]
}

export async function recoverTimedOutJob(supabase: SupabaseClient, job: AuditJobRecord, reason: string, immediateRetry = false) {
  const nextRetryCount = Number(job.retry_count ?? 0) + 1
  const maxRetries = Number(job.max_retries ?? 3)
  const shouldTerminalFail = nextRetryCount >= maxRetries
  const nextRetryAt = shouldTerminalFail ? null : immediateRetry ? new Date().toISOString() : computeNextRetryAt(nextRetryCount)

  const { data, error } = await supabase
    .from("audit_jobs")
    .update({
      status: "failed",
      error_message: reason,
      failed_reason: reason,
      retry_count: nextRetryCount,
      next_retry_at: nextRetryAt,
      completed_at: shouldTerminalFail ? new Date().toISOString() : null,
      locked_at: null,
      heartbeat_at: null,
    })
    .eq("id", job.id)
    .eq("status", "running")
    .select("*")
    .maybeSingle()
  if (error) throw error

  if (data) {
    await createAuditJobLog(supabase, {
      job_id: job.id,
      user_id: job.user_id,
      stage: "lock_timeout",
      message: reason,
    })
    await createAuditJobLog(supabase, {
      job_id: job.id,
      user_id: job.user_id,
      stage: "orphan_recovered",
      message: shouldTerminalFail ? "Orphan recovered as terminal failure" : "Orphan recovered and queued for retry",
      metadata: { retry_count: nextRetryCount, max_retries: maxRetries },
    })
    if (!shouldTerminalFail && nextRetryAt) {
      await createAuditJobLog(supabase, {
        job_id: job.id,
        user_id: job.user_id,
        stage: "retry_scheduled",
        message: "Retry scheduled for recovered orphan job",
        metadata: { next_retry_at: nextRetryAt, retry_count: nextRetryCount },
      })
    }
  }

  return {
    recovered: Boolean(data),
    terminal: shouldTerminalFail,
    retried: Boolean(data) && !shouldTerminalFail,
  }
}

export async function getProjectContextByJob(supabase: SupabaseClient, job: AuditJobRecord) {
  if (!job.project_id) throw new Error("Job missing project_id")
  if (!job.audit_id) throw new Error("Job missing audit_id")

  let projectResult = await supabase
    .from("projects")
    .select("id, company_name, website_url, industry, language, country, business_goal, brand_aliases, domain_aliases, entity_stopwords")
    .eq("id", job.project_id)
    .single()
  if (projectResult.error && isMissingColumn(projectResult.error)) {
    projectResult = await supabase
      .from("projects")
      .select("id, company_name, website_url, industry, language, country, business_goal")
      .eq("id", job.project_id)
      .single()
  }
  const { data: project, error: projectError } = projectResult
  if (projectError || !project) throw new Error("Project not found for job")

  let competitorsResult = await supabase
    .from("competitors")
    .select("id, name, domain, aliases, domain_aliases")
    .eq("project_id", job.project_id)
  if (competitorsResult.error && isMissingColumn(competitorsResult.error)) {
    competitorsResult = await supabase
      .from("competitors")
      .select("id, name, domain")
      .eq("project_id", job.project_id)
  }
  const { data: competitors, error: competitorsError } = competitorsResult
  if (competitorsError) throw competitorsError

  const { data: audit, error: auditError } = await supabase
    .from("geo_audits")
    .select("engines")
    .eq("id", job.audit_id)
    .single()
  if (auditError || !audit) throw new Error("Audit not found for job")

  const enginesRaw = Array.isArray(audit.engines) ? audit.engines : []
  const engines = enginesRaw.map((e) => String(e))

  return {
    job,
    project: {
      ...project,
      brand_aliases: Array.isArray(project.brand_aliases) ? project.brand_aliases.map((x) => String(x)) : [],
      domain_aliases: Array.isArray(project.domain_aliases) ? project.domain_aliases.map((x) => String(x)) : [],
      entity_stopwords: Array.isArray(project.entity_stopwords) ? project.entity_stopwords.map((x) => String(x)) : [],
    },
    competitors: (competitors ?? []).map((c) => ({
      id: c.id as string,
      name: c.name as string,
      domain: (c.domain as string | null) ?? null,
      aliases: Array.isArray(c.aliases) ? c.aliases.map((x) => String(x)) : [],
      domain_aliases: Array.isArray(c.domain_aliases) ? c.domain_aliases.map((x) => String(x)) : [],
    })),
    engines: engines.length > 0 ? engines : ["openai", "gemini"],
  }
}
