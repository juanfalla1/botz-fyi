import type { SupabaseClient } from "@supabase/supabase-js"
import { createUsageEvent } from "@/lib/geo/repositories/usage.repo"
import { createNotification } from "@/lib/geo/repositories/notifications.repo"
import { createAuditJobLog } from "@/lib/geo/repositories/audit-job-logs.repo"
import {
  failAuditJob,
  getProjectContextByJob,
  listProcessableAuditJobsGlobal,
  listQueuedAuditJobs,
  markAuditJobCompleted,
  markAuditJobRunning,
  releaseAuditJobLock,
  touchAuditJobHeartbeat,
} from "@/lib/geo/repositories/audits.repo"
import { runBaseAuditPipeline } from "@/lib/geo/pipeline/audit-pipeline.base"

type ProcessResult = Array<{ job_id: string; status: "completed" | "failed"; retried?: boolean; error?: string }>

async function processJobs(supabase: SupabaseClient, jobs: Awaited<ReturnType<typeof listQueuedAuditJobs>>) {
  const processed: ProcessResult = []

  for (const job of jobs) {
    try {
      if ((job.retry_count ?? 0) >= (job.max_retries ?? 3)) {
        processed.push({ job_id: job.id, status: "failed", error: "retry limit reached" })
        continue
      }

      const runningJob = await markAuditJobRunning(supabase, job.id)
      if (!runningJob) {
        continue
      }

      await createAuditJobLog(supabase, {
        job_id: runningJob.id,
        user_id: runningJob.user_id,
        stage: "lock_acquired",
        message: "Job lock acquired",
      })

      const heartbeatIntervalMs = Number(process.env.HEARTBEAT_INTERVAL_MS ?? 15000)
      const safeHeartbeatMs = Number.isFinite(heartbeatIntervalMs) && heartbeatIntervalMs >= 1000 ? heartbeatIntervalMs : 15000
      const heartbeatTimer = setInterval(() => {
        void touchAuditJobHeartbeat(supabase, runningJob.id)
      }, safeHeartbeatMs)

      try {
        const context = await getProjectContextByJob(supabase, runningJob)
        await createAuditJobLog(supabase, {
          job_id: runningJob.id,
          user_id: runningJob.user_id,
          stage: "prompt_building",
          message: "Building prompts",
          metadata: { engines: context.engines },
        })

        await createAuditJobLog(supabase, {
          job_id: runningJob.id,
          user_id: runningJob.user_id,
          stage: "analyzing",
          message: "Running analysis placeholder",
        })

        const result = await runBaseAuditPipeline(supabase, context)

        await createAuditJobLog(supabase, {
          job_id: runningJob.id,
          user_id: runningJob.user_id,
          stage: "scoring",
          message: "Scoring and persisting results",
          metadata: { geo_score: result.output.geo_score },
        })

        await createUsageEvent(supabase, {
          user_id: runningJob.user_id,
          event_type: "prompt_used",
          amount: result.prompts.length,
          metadata: { audit_id: runningJob.audit_id, job_id: runningJob.id, source: "worker_pipeline" },
        })

        await createNotification(supabase, {
          user_id: runningJob.user_id,
          title: "GEO audit completed",
          body: `Your audit finished with GEO score ${result.output.geo_score}.`,
          level: "success",
          metadata: { job_id: runningJob.id, audit_id: runningJob.audit_id },
        })

        await markAuditJobCompleted(supabase, runningJob.id)
        await createAuditJobLog(supabase, {
          job_id: runningJob.id,
          user_id: runningJob.user_id,
          stage: "completed",
          message: "Job completed",
        })
        processed.push({ job_id: runningJob.id, status: "completed" })
      } finally {
        clearInterval(heartbeatTimer)
        await releaseAuditJobLock(supabase, runningJob.id)
        await createAuditJobLog(supabase, {
          job_id: runningJob.id,
          user_id: runningJob.user_id,
          stage: "lock_released",
          message: "Job lock released",
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown worker error"
      const failed = await failAuditJob(supabase, job.id, message)
      await createAuditJobLog(supabase, {
        job_id: job.id,
        user_id: job.user_id,
        stage: "failed",
        message,
      })
      if ((failed.next_retry_at ?? null) !== null) {
        await createAuditJobLog(supabase, {
          job_id: job.id,
          user_id: job.user_id,
          stage: "retry_scheduled",
          message: "Retry scheduled after worker failure",
          metadata: { retry_count: failed.retry_count ?? 0, max_retries: failed.max_retries ?? 3, next_retry_at: failed.next_retry_at },
        })
      }
      await createNotification(supabase, {
        user_id: job.user_id,
        title: "GEO audit failed",
        body: message,
        level: "error",
        metadata: { job_id: job.id, audit_id: job.audit_id },
      })
      processed.push({ job_id: job.id, status: "failed", retried: (failed.next_retry_at ?? null) !== null, error: message })
    }
  }

  return processed
}

export async function processQueuedAuditJobs(supabase: SupabaseClient, userId: string, limit = 5): Promise<ProcessResult> {
  const queuedJobs = await listQueuedAuditJobs(supabase, userId, limit)
  return processJobs(supabase, queuedJobs)
}

export async function processGlobalQueuedAuditJobs(supabase: SupabaseClient, limit = 10): Promise<ProcessResult> {
  const queuedJobs = await listProcessableAuditJobsGlobal(supabase, limit)
  return processJobs(supabase, queuedJobs)
}
