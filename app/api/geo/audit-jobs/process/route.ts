import { NextResponse } from "next/server"
import { getGeoApiClient } from "@/lib/geo/api-auth"
import { processAuditQueueForUser } from "@/lib/geo/services/audit-jobs.service"

export async function POST(req: Request) {
  try {
    const { supabase, user } = await getGeoApiClient(req)

    const body = (await req.json().catch(() => ({}))) as { limit?: number }
    const limit = typeof body.limit === "number" && body.limit > 0 ? Math.min(body.limit, 20) : 5

    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Manual job processing is disabled in production" }, { status: 403 })
    }

    const processed = await processAuditQueueForUser(supabase, user.id, limit)
    return NextResponse.json({ data: { processed, count: processed.length }, mode: "live" })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 })
  }
}
