import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/integrations/supabase"
import { runAuditJobsScheduler } from "@/lib/geo/scheduler/audit-jobs.scheduler"

export const maxDuration = 60

async function handleCron(req: Request) {
  const secret = req.headers.get("x-cron-secret")
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET && bearer !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return NextResponse.json({ error: "Supabase admin not configured" }, { status: 500 })
  }

  const body = req.method === "POST" ? (await req.json().catch(() => ({}))) as { limit?: number } : {}
  const limit = typeof body.limit === "number" && Number.isFinite(body.limit) && body.limit > 0 ? Math.min(Math.floor(body.limit), 50) : 10
  const lockTimeoutMinutesRaw = Number(process.env.LOCK_TIMEOUT_MINUTES ?? 3)
  const lockTimeoutMinutes = Number.isFinite(lockTimeoutMinutesRaw) && lockTimeoutMinutesRaw > 0 ? lockTimeoutMinutesRaw : 3

  const summary = await runAuditJobsScheduler(supabase, limit, lockTimeoutMinutes)
  return NextResponse.json({
    data: {
      processed: summary.processed,
      completed: summary.completed,
      failed: summary.failed,
      retried: summary.retried,
      orphan_recovered: summary.orphan_recovered,
      jobs: summary.jobs,
    },
    mode: "live",
  })
}

export async function GET(req: Request) {
  return handleCron(req)
}

export async function POST(req: Request) {
  return handleCron(req)
}
