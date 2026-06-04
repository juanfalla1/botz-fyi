import { NextResponse } from "next/server"
import { getGeoApiClient } from "@/lib/geo/api-auth"
import { deleteGeoPrompt, updateGeoPrompt } from "@/lib/geo/repositories/geo-prompts.repo"
import { geoPromptUpdateSchema } from "@/lib/validators/geo-prompts.schema"

export async function PATCH(req: Request, { params }: { params: Promise<{ projectId: string; promptId: string }> }) {
  const body = await req.json()
  const parsed = geoPromptUpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  try {
    const { projectId, promptId } = await params
    const { supabase, user } = await getGeoApiClient(req)
    const data = await updateGeoPrompt(supabase, user.id, projectId, promptId, parsed.data)
    return NextResponse.json({ data, mode: "live" })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ projectId: string; promptId: string }> }) {
  try {
    const { projectId, promptId } = await params
    const { supabase, user } = await getGeoApiClient(req)
    await deleteGeoPrompt(supabase, user.id, projectId, promptId)
    return NextResponse.json({ ok: true, mode: "live" })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 })
  }
}
