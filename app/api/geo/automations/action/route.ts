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

export async function PATCH(req: Request) {
  const body = await req.json()
  const id = typeof body.id === "string" ? body.id : ""
  const parsed = automationUpdateSchema.safeParse(body)
  if (!id) return NextResponse.json({ error: "Automation id is required" }, { status: 400 })
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  try {
    const { supabase, user } = await getGeoApiClient(req)
    const { data: existing } = await supabase.from("automations").select("frequency, config").eq("id", id).eq("user_id", user.id).maybeSingle()
    const frequency = (parsed.data.frequency ?? existing?.frequency ?? "weekly") as "daily" | "weekly" | "monthly"
    const existingConfig = existing?.config && typeof existing.config === "object" ? existing.config as Record<string, unknown> : {}
    const incomingConfig = parsed.data.config && typeof parsed.data.config === "object" ? parsed.data.config as Record<string, unknown> : undefined
    const config = incomingConfig || parsed.data.enabled !== undefined || parsed.data.frequency
      ? {
          ...existingConfig,
          ...(incomingConfig ?? {}),
          next_run: parsed.data.enabled === false ? null : computeNextRun(frequency),
          email_report_enabled: Boolean((incomingConfig ?? existingConfig).email),
        }
      : undefined
    const { id: _id, ...patch } = parsed.data as Record<string, unknown>
    const data = await updateAutomation(supabase, user.id, id, { ...patch, ...(config ? { config } : {}) })
    return NextResponse.json({ data, mode: "live" })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Automation id is required" }, { status: 400 })
    const { supabase, user } = await getGeoApiClient(req)
    await deleteAutomation(supabase, user.id, id)
    return NextResponse.json({ ok: true, mode: "live" })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 })
  }
}
