import { NextResponse } from "next/server"
import { getGeoApiClient } from "@/lib/geo/api-auth"
import { competitorUpdateSchema } from "@/lib/validators/competitor.schema"
import { deleteCompetitor, updateCompetitor } from "@/lib/geo/repositories/competitors.repo"
import { assertProjectOwner } from "@/lib/geo/ownership"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const body = await req.json()
  const parsed = competitorUpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  try {
    const { id } = await params
    const { supabase, user } = await getGeoApiClient(req)
    await assertProjectOwner(supabase, user.id, parsed.data.project_id ?? null)
    const data = await updateCompetitor(supabase, user.id, id, parsed.data)
    return NextResponse.json({ data, mode: "live" })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { supabase, user } = await getGeoApiClient(req)
    await deleteCompetitor(supabase, user.id, id)
    return NextResponse.json({ ok: true, mode: "live" })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 })
  }
}
