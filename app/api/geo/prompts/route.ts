import { NextResponse } from "next/server"
import { getGeoApiClient } from "@/lib/geo/api-auth"
import { createGeoPrompt, deleteGeoPrompt, listGeoPrompts, updateGeoPrompt } from "@/lib/geo/repositories/geo-prompts.repo"
import { geoPromptCreateSchema, geoPromptUpdateSchema } from "@/lib/validators/geo-prompts.schema"
import { assertProjectOwner } from "@/lib/geo/ownership"
import { assertMonitoredPromptLimit, syncMonitoredPromptUsage } from "@/lib/geo/repositories/usage.repo"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get("project_id")
    if (!projectId) return NextResponse.json({ error: "project_id is required" }, { status: 400 })
    const { supabase, user } = await getGeoApiClient(req)
    await assertProjectOwner(supabase, user.id, projectId)
    const data = await listGeoPrompts(supabase, user.id, projectId)
    return NextResponse.json({ data, mode: "live" })
  } catch (error) {
    return NextResponse.json({ data: [], mode: "error", error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 })
  }
}

export async function POST(req: Request) {
  const body = await req.json()
  const projectId = typeof body.project_id === "string" ? body.project_id : ""
  const parsed = geoPromptCreateSchema.safeParse(body)
  if (!projectId) return NextResponse.json({ error: "project_id is required" }, { status: 400 })
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  try {
    const { supabase, user } = await getGeoApiClient(req)
    await assertProjectOwner(supabase, user.id, projectId)
    await assertMonitoredPromptLimit(supabase, user.id)
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
    await syncMonitoredPromptUsage(supabase, user.id)
    return NextResponse.json({ data, mode: "live" }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 })
  }
}

export async function PATCH(req: Request) {
  const body = await req.json()
  const projectId = typeof body.project_id === "string" ? body.project_id : ""
  const promptId = typeof body.prompt_id === "string" ? body.prompt_id : ""
  const parsed = geoPromptUpdateSchema.safeParse(body)
  if (!projectId || !promptId) return NextResponse.json({ error: "project_id and prompt_id are required" }, { status: 400 })
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  try {
    const { supabase, user } = await getGeoApiClient(req)
    await assertProjectOwner(supabase, user.id, projectId)
    const { project_id, prompt_id, ...patch } = parsed.data as Record<string, unknown>
    const data = await updateGeoPrompt(supabase, user.id, projectId, promptId, patch)
    return NextResponse.json({ data, mode: "live" })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get("project_id")
    const promptId = searchParams.get("prompt_id")
    if (!projectId || !promptId) return NextResponse.json({ error: "project_id and prompt_id are required" }, { status: 400 })
    const { supabase, user } = await getGeoApiClient(req)
    await assertProjectOwner(supabase, user.id, projectId)
    await deleteGeoPrompt(supabase, user.id, projectId, promptId)
    await syncMonitoredPromptUsage(supabase, user.id)
    return NextResponse.json({ ok: true, mode: "live" })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 })
  }
}
