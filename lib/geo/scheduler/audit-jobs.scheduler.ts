import type { SupabaseClient } from "@supabase/supabase-js"
import { processGlobalAuditQueue } from "@/lib/geo/services/audit-jobs.service"

export async function runAuditJobsScheduler(supabase: SupabaseClient, limitPerRun = 10, lockTimeoutMinutes = 10) {
  return processGlobalAuditQueue(supabase, limitPerRun, lockTimeoutMinutes)
}
