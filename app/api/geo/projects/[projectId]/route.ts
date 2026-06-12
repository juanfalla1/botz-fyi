import { NextResponse } from "next/server"
import { getGeoApiClient } from "@/lib/geo/api-auth"

export async function GET(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await params
    const { supabase, user } = await getGeoApiClient(req)
    const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).eq("user_id", user.id).maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ error: "Project not found" }, { status: 404 })
    return NextResponse.json({ data, mode: "live" })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await params
    const { supabase, user } = await getGeoApiClient(req)
    const { error } = await supabase.from("projects").delete().eq("id", projectId).eq("user_id", user.id)
    if (error) throw error
    return NextResponse.json({ ok: true, mode: "live" })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 })
  }
}
