import { NextResponse } from "next/server";
import { getGeoApiClient } from "@/lib/geo/api-auth";
import { assertProjectOwner, listOwnedAuditIds } from "@/lib/geo/ownership";
import { createUsageEvent } from "@/lib/geo/repositories/usage.repo";

export async function GET(req: Request) {
  try {
    const { supabase, user } = await getGeoApiClient(req)
    const { data, error } = await supabase
      .from("reports")
      .select("id, name, report_type, status, created_at, snapshot")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
    if (error) throw error
    return NextResponse.json({ data: data ?? [], mode: "live" })
  } catch (error) {
    return NextResponse.json({ data: [], mode: "error", error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 })
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  try {
    const { supabase, user } = await getGeoApiClient(req)
    const auditId = typeof body.audit_id === "string" ? body.audit_id : null
    const projectId = typeof body.project_id === "string" ? body.project_id : null
    await assertProjectOwner(supabase, user.id, projectId)

    const ownedAuditIds = await listOwnedAuditIds(supabase, user.id)
    if (auditId && !ownedAuditIds.includes(auditId)) {
      return NextResponse.json({ error: "Audit not found or not owned by user" }, { status: 404 })
    }
    const candidateAuditIds = auditId ? [auditId] : ownedAuditIds
    if (candidateAuditIds.length === 0) {
      return NextResponse.json({ error: "No completed audits available to generate a report" }, { status: 404 })
    }

    let query = supabase
      .from("geo_audits")
      .select("id, project_id, base_url, engines, summary, final_score, created_at, completed_at, projects(company_name, website_url)")
      .eq("status", "completed")
      .in("id", candidateAuditIds)
      .order("completed_at", { ascending: false, nullsFirst: false })
      .limit(1)

    if (projectId) query = query.eq("project_id", projectId)

    const { data: audit, error: auditError } = await query
      .maybeSingle()
    if (auditError) throw auditError
    if (!audit) return NextResponse.json({ error: "No completed audits available to generate a report" }, { status: 404 })

    const summary = parseSummary(audit.summary)
    const semantic = summary.semantic_analysis && typeof summary.semantic_analysis === "object" ? summary.semantic_analysis as Record<string, unknown> : null
    const recommendations = Array.isArray(summary.recommendations) ? summary.recommendations : []
    const snapshot = {
      audit_id: audit.id,
      project_id: audit.project_id,
      project_name: Array.isArray(audit.projects) ? audit.projects[0]?.company_name : audit.projects?.company_name,
      base_url: audit.base_url,
      geo_score: audit.final_score,
      ai_visibility: numberFrom(summary.ai_visibility),
      citations_count: numberFrom(summary.citations_count),
      prompts_won: numberFrom(summary.prompts_won),
      prompts_lost: numberFrom(summary.prompts_lost),
      engines: audit.engines,
      executive_summary: semantic?.executive_summary ?? summary.summary ?? null,
      recommendations: recommendations.slice(0, 5),
      generated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from("reports")
      .insert({
        user_id: user.id,
        project_id: audit.project_id,
        audit_id: audit.id,
        name: typeof body.name === "string" ? body.name : "Reporte GEO",
        report_type: typeof body.report_type === "string" ? body.report_type : "snapshot",
        status: "ready",
        snapshot,
      })
      .select("id, name, report_type, status, created_at, snapshot")
      .single()
    if (error) throw error
    await createUsageEvent(supabase, {
      user_id: user.id,
      event_type: "report_exported",
      amount: 1,
      metadata: { report_id: data.id, audit_id: audit.id, source: "api_geo_reports" },
    })
    return NextResponse.json({ data, mode: "live" }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not generate report" }, { status: 500 })
  }
}

function parseSummary(summary: unknown): Record<string, unknown> {
  if (summary && typeof summary === "object" && !Array.isArray(summary)) return summary as Record<string, unknown>
  if (!summary || typeof summary !== "string") return {}
  try {
    const parsed = JSON.parse(summary)
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

function numberFrom(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : Number.isFinite(Number(value)) ? Number(value) : 0
}
