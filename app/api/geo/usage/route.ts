import { NextResponse } from "next/server"
import { getGeoApiClient } from "@/lib/geo/api-auth"
import { listUsageEvents } from "@/lib/geo/repositories/usage.repo"

export async function GET(req: Request) {
  try {
    const { supabase, user } = await getGeoApiClient(req)
    const events = await listUsageEvents(supabase, user.id, 200)
    const totals = events.reduce(
      (acc, event) => {
        acc[event.event_type] = (acc[event.event_type] ?? 0) + event.amount
        return acc
      },
      {} as Record<string, number>
    )
    return NextResponse.json({ data: { events, totals }, mode: "live" })
  } catch (error) {
    return NextResponse.json({ data: { events: [], totals: {} }, mode: "error", error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 })
  }
}
