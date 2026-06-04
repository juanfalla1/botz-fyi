import { NextResponse } from "next/server"
import { getGeoApiClient } from "@/lib/geo/api-auth"
import { listNotifications, seedNotificationIfEmpty } from "@/lib/geo/repositories/notifications.repo"

export async function GET(req: Request) {
  try {
    const { supabase, user } = await getGeoApiClient(req)
    await seedNotificationIfEmpty(supabase, user.id)
    const data = await listNotifications(supabase, user.id)
    return NextResponse.json({ data, mode: "live" })
  } catch (error) {
    return NextResponse.json({ data: [], mode: "error", error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 })
  }
}
