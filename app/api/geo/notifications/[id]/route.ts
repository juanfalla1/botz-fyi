import { NextResponse } from "next/server"
import { getGeoApiClient } from "@/lib/geo/api-auth"
import { markNotificationRead } from "@/lib/geo/repositories/notifications.repo"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { supabase, user } = await getGeoApiClient(req)
    const data = await markNotificationRead(supabase, user.id, id)
    return NextResponse.json({ data, mode: "live" })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 })
  }
}
