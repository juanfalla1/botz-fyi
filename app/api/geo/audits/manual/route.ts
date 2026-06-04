import { NextResponse } from "next/server"
import { getGeoApiClient } from "@/lib/geo/api-auth"
import { manualAuditSchema } from "@/lib/validators/audit-job.schema"
import { createAuditManual } from "@/lib/geo/repositories/audits.repo"
import { createUsageEvent } from "@/lib/geo/repositories/usage.repo"
import { processAuditQueueForUser } from "@/lib/geo/services/audit-jobs.service"

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = manualAuditSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  try {
    const { supabase, user } = await getGeoApiClient(req)
    const created = await createAuditManual(
      supabase,
      user.id,
      parsed.data.project_id,
      parsed.data.base_url,
      parsed.data.crawl_depth,
      parsed.data.engines
    )
    await createUsageEvent(supabase, {
      user_id: user.id,
      event_type: "geo_audit_created",
      amount: 1,
      metadata: { audit_id: created.audit.id, job_id: created.job.id, source: "manual_api" },
    })
    void processAuditQueueForUser(supabase, user.id, 1)

    return NextResponse.json({ data: created, mode: "live" }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 })
  }
}
