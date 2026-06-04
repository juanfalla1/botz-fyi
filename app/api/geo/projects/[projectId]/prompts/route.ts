import { NextResponse } from "next/server"
import { getGeoApiClient } from "@/lib/geo/api-auth"
import { createGeoPrompt, listGeoPrompts } from "@/lib/geo/repositories/geo-prompts.repo"
import { geoPromptCreateSchema } from "@/lib/validators/geo-prompts.schema"

export async function GET(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await params
    const { supabase, user } = await getGeoApiClient(req)
    const data = await listGeoPrompts(supabase, user.id, projectId)
    return NextResponse.json({ data, mode: "live" })
  } catch (error) {
    return NextResponse.json({ data: [], mode: "error", error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const body = await req.json()
  const parsed = geoPromptCreateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  try {
    const { projectId } = await params
    const { supabase, user } = await getGeoApiClient(req)
    const data = await createGeoPrompt(supabase, {
      user_id: user.id,
      project_id: projectId,
      prompt: parsed.data.prompt,
      category: parsed.data.category,
      engines: parsed.data.engines,
      country: parsed.data.country ?? null,
      language: parsed.data.language ?? null,
      enabled: parsed.data.enabled,
      metadata: parsed.data.metadata,
    })
    return NextResponse.json({ data, mode: "live" }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 })
  }
}
