import type { SupabaseClient } from "@supabase/supabase-js"
import type { AuditJobLogRecord } from "@/lib/geo/db-types"

export type AuditJobStage =
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

export async function createAuditJobLog(
  supabase: SupabaseClient,
  input: {
    job_id: string
    user_id: string
    stage: AuditJobStage
    message?: string
    metadata?: Record<string, unknown>
  }
) {
  const { error } = await supabase.from("audit_job_logs").insert({
    job_id: input.job_id,
    user_id: input.user_id,
    stage: input.stage,
    message: input.message ?? null,
    metadata: input.metadata ?? {},
  })
  if (error) throw error
}

export async function listAuditJobLogs(supabase: SupabaseClient, jobId: string, limit = 20) {
  const { data, error } = await supabase
    .from("audit_job_logs")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as AuditJobLogRecord[]
}
