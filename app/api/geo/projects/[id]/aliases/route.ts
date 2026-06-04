import { NextResponse } from "next/server"
import { getGeoApiClient } from "@/lib/geo/api-auth"
import { updateProjectAliases } from "@/lib/geo/repositories/projects.repo"
import { normalizeProjectAliasesPatch, projectAliasesPatchSchema } from "@/lib/validators/geo-aliases.schema"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const body = await req.json().catch(() => ({}))
  const parsed = projectAliasesPatchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  try {
    const normalized = normalizeProjectAliasesPatch(parsed.data)
    const { id } = await params
    const { supabase, user } = await getGeoApiClient(req)
    const data = await updateProjectAliases(supabase, user.id, id, normalized)
    return NextResponse.json({ data, mode: "live" })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 })
  }
}
