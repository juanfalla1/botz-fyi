import { NextResponse } from "next/server"
import { getGeoApiClient } from "@/lib/geo/api-auth"
import { loadGeoActionContext, numberFrom, parseSummary } from "@/lib/geo/action-engine"

export async function GET(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await params
    const { supabase, user } = await getGeoApiClient(req)
    const context = await loadGeoActionContext(supabase, user.id, projectId)
    if (!context) return NextResponse.json({ error: "Project not found" }, { status: 404 })
    const snapshots = context.audits.map((audit) => {
      const summary = parseSummary(audit.summary)
      return {
        audit_id: audit.id,
        date: audit.completed_at ?? audit.created_at,
        geo_score: numberFrom(summary.geo_score ?? audit.final_score),
        ai_visibility: numberFrom(summary.ai_visibility),
        citations_count: numberFrom(summary.citations_count),
        prompts_won: numberFrom(summary.prompts_won),
        prompts_lost: numberFrom(summary.prompts_lost),
      }
    }).reverse()
    const first = snapshots[0] ?? null
    const latest = snapshots[snapshots.length - 1] ?? null
    const delta = first && latest ? {
      geo_score: latest.geo_score - first.geo_score,
      ai_visibility: latest.ai_visibility - first.ai_visibility,
      citations_count: latest.citations_count - first.citations_count,
      prompts_won: latest.prompts_won - first.prompts_won,
      prompts_lost: latest.prompts_lost - first.prompts_lost,
    } : null
    return NextResponse.json({ mode: "live", data: { project: context.project, snapshots, delta, completed_audits: context.audits.length } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load impact data" }, { status: 500 })
  }
}
