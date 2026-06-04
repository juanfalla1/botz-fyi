import { NextResponse } from "next/server"
import { getGeoApiClient } from "@/lib/geo/api-auth"
import { automationUpdateSchema } from "@/lib/validators/automation.schema"
import { deleteAutomation, updateAutomation } from "@/lib/geo/repositories/automations.repo"

function computeNextRun(frequency: "daily" | "weekly" | "monthly") {
  const date = new Date()
  if (frequency === "daily") date.setDate(date.getDate() + 1)
  if (frequency === "weekly") date.setDate(date.getDate() + 7)
  if (frequency === "monthly") date.setMonth(date.getMonth() + 1)
  return date.toISOString()
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const body = await req.json()
  const parsed = automationUpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  try {
    const { id } = await params
    const { supabase, user } = await getGeoApiClient(req)
    const { data: existing } = await supabase.from("automations").select("frequency, config").eq("id", id).eq("user_id", user.id).maybeSingle()
    const frequency = parsed.data.frequency ?? existing?.frequency ?? "weekly"
    const config = parsed.data.config
      ? {
          ...(existing?.config && typeof existing.config === "object" ? existing.config : {}),
          ...parsed.data.config,
          next_run: parsed.data.enabled === false ? null : computeNextRun(frequency as "daily" | "weekly" | "monthly"),
          email_report_enabled: Boolean((parsed.data.config as Record<string, unknown>).email),
        }
      : parsed.data.enabled !== undefined || parsed.data.frequency
      ? {
          ...(existing?.config && typeof existing.config === "object" ? existing.config : {}),
          next_run: parsed.data.enabled === false ? null : computeNextRun(frequency as "daily" | "weekly" | "monthly"),
        }
      : undefined
    const data = await updateAutomation(supabase, user.id, id, { ...parsed.data, ...(config ? { config } : {}) })
    return NextResponse.json({ data, mode: "live" })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { supabase, user } = await getGeoApiClient(req)
    await deleteAutomation(supabase, user.id, id)
    return NextResponse.json({ ok: true, mode: "live" })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 })
  }
}
