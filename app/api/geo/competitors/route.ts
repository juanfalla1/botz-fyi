import { NextResponse } from "next/server"
import { getGeoApiClient } from "@/lib/geo/api-auth"
import { competitorCreateSchema } from "@/lib/validators/competitor.schema"
import { createCompetitor, listCompetitors } from "@/lib/geo/repositories/competitors.repo"
import { assertProjectOwner } from "@/lib/geo/ownership"

export async function GET(req: Request) {
  try {
    const { supabase, user } = await getGeoApiClient(req)
    const url = new URL(req.url)
    const projectId = url.searchParams.get("project_id") ?? undefined
    const data = await listCompetitors(supabase, user.id, projectId)
    return NextResponse.json({ data, mode: "live" })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 })
  }
}

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = competitorCreateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  try {
    const { supabase, user } = await getGeoApiClient(req)
    await assertProjectOwner(supabase, user.id, parsed.data.project_id ?? null)
    const data = await createCompetitor(supabase, {
      user_id: user.id,
      project_id: parsed.data.project_id ?? null,
      name: parsed.data.name,
      domain: parsed.data.domain ?? null,
    })
    return NextResponse.json({ data, mode: "live" }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 })
  }
}
