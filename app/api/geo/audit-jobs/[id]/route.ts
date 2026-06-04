import { NextResponse } from "next/server"
import { getGeoApiClient } from "@/lib/geo/api-auth"
import { getAuditJob } from "@/lib/geo/repositories/audits.repo"
import { listAuditJobLogs } from "@/lib/geo/repositories/audit-job-logs.repo"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { supabase, user } = await getGeoApiClient(req)
    const data = await getAuditJob(supabase, user.id, id)
    const logs = await listAuditJobLogs(supabase, id, 25)
    return NextResponse.json({ data: { ...data, logs }, mode: "live" })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 })
  }
}
