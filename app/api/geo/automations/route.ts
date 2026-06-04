import { NextResponse } from "next/server"
import { getGeoApiClient } from "@/lib/geo/api-auth"
import { automationCreateSchema } from "@/lib/validators/automation.schema"
import { createAutomation, listAutomations } from "@/lib/geo/repositories/automations.repo"

function computeNextRun(frequency: "daily" | "weekly" | "monthly") {
  const date = new Date()
  if (frequency === "daily") date.setDate(date.getDate() + 1)
  if (frequency === "weekly") date.setDate(date.getDate() + 7)
  if (frequency === "monthly") date.setMonth(date.getMonth() + 1)
  return date.toISOString()
}

export async function GET(req: Request) {
  try {
    const { supabase, user } = await getGeoApiClient(req)
    const data = await listAutomations(supabase, user.id)
    return NextResponse.json({ data, mode: "live" })
  } catch (error) {
    return NextResponse.json({ data: [], mode: "error", error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 })
  }
}

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = automationCreateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  try {
    const { supabase, user } = await getGeoApiClient(req)
    const data = await createAutomation(supabase, {
      user_id: user.id,
      project_id: parsed.data.project_id ?? null,
      competitor_id: parsed.data.competitor_id ?? null,
      name: parsed.data.name,
      frequency: parsed.data.frequency,
      enabled: parsed.data.enabled,
      config: {
        ...parsed.data.config,
        next_run: parsed.data.enabled ? computeNextRun(parsed.data.frequency) : null,
        email_report_enabled: Boolean((parsed.data.config as Record<string, unknown>).email),
      },
    })
    return NextResponse.json({ data, mode: "live" }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 })
  }
}
