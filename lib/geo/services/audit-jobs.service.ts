import type { SupabaseClient } from "@supabase/supabase-js"
import { listTimedOutRunningJobs, recoverTimedOutJob } from "@/lib/geo/repositories/audits.repo"
import { processGlobalQueuedAuditJobs, processQueuedAuditJobs } from "@/lib/geo/workers/audit-jobs.worker"

export async function processAuditQueueForUser(supabase: SupabaseClient, userId: string, limit = 5) {
  return processQueuedAuditJobs(supabase, userId, limit)
}

export type GlobalAuditQueueSummary = {
  processed: number
  completed: number
  failed: number
  retried: number
  orphan_recovered: number
  jobs: Array<{ job_id: string; status: "completed" | "failed"; retried?: boolean; error?: string }>
}

export async function processGlobalAuditQueue(supabase: SupabaseClient, limit = 10, lockTimeoutMinutes = 10): Promise<GlobalAuditQueueSummary> {
  const orphanJobs = await listTimedOutRunningJobs(supabase, lockTimeoutMinutes, limit)
  let orphanRecovered = 0
  let retried = 0

  for (const orphan of orphanJobs) {
    const result = await recoverTimedOutJob(
      supabase,
      orphan,
      `Lock timeout exceeded (${lockTimeoutMinutes} minutes) while running`
    )
    if (result.recovered) orphanRecovered += 1
    if (result.retried) retried += 1
  }

  const jobs = await processGlobalQueuedAuditJobs(supabase, limit)
  const completed = jobs.filter((j) => j.status === "completed").length
  const failed = jobs.filter((j) => j.status === "failed").length
  retried += jobs.filter((j) => j.retried === true).length

  return {
    processed: jobs.length,
    completed,
    failed,
    retried,
    orphan_recovered: orphanRecovered,
    jobs,
  }
}
