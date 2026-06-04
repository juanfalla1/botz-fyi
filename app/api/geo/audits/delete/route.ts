import { NextResponse } from "next/server"
import { getGeoApiClient } from "@/lib/geo/api-auth"

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { id?: string }
    const id = String(body.id || "").trim()
    if (!id) return NextResponse.json({ error: "Missing audit id" }, { status: 400 })

    const { supabase, user, isAdmin } = await getGeoApiClient(req)
    const { data: audit, error: auditError } = await supabase
      .from("geo_audits")
      .select("id, project_id")
      .eq("id", id)
      .maybeSingle()
    if (auditError) throw auditError
    if (!audit) return NextResponse.json({ error: "Audit not found" }, { status: 404 })

    const { data: jobs, error: jobsError } = await supabase
      .from("audit_jobs")
      .select("id, user_id")
      .eq("audit_id", id)
    if (jobsError) throw jobsError

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, user_id")
      .eq("id", audit.project_id)
      .maybeSingle()
    if (projectError) throw projectError

    const ownsByJob = (jobs ?? []).some((job) => job.user_id === user.id)
    const ownsByProject = project?.user_id === user.id
    if (!isAdmin && !ownsByJob && !ownsByProject) {
      return NextResponse.json({ error: "Audit not found for current user" }, { status: 404 })
    }

    const jobIds = (jobs ?? []).map((job) => job.id)
    if (jobIds.length > 0) await deleteRowsByIn(supabase, "audit_job_logs", "job_id", jobIds)

    await deleteAuditRelatedRows(supabase, "geo_scores", id)
    await deleteAuditRelatedRows(supabase, "recommendations", id)
    await deleteAuditRelatedRows(supabase, "content_opportunities", id)
    await deleteAuditRelatedRows(supabase, "crawled_pages", id)
    await deleteAiRowsForAudit(supabase, id)
    await deleteAuditRelatedRows(supabase, "ai_queries", id)
    await deleteAuditRelatedRows(supabase, "brand_mentions", id)
    await deleteAuditRelatedRows(supabase, "competitor_mentions", id)
    await deleteAuditRelatedRows(supabase, "audit_logs", id)

    const { error: jobsDeleteError } = await supabase.from("audit_jobs").delete().eq("audit_id", id)
    if (jobsDeleteError) throw jobsDeleteError

    const { error: auditDeleteError } = await supabase.from("geo_audits").delete().eq("id", id)
    if (auditDeleteError) throw auditDeleteError

    return NextResponse.json({ ok: true, mode: "live" })
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 })
  }
}

async function deleteAuditRelatedRows(supabase: Awaited<ReturnType<typeof getGeoApiClient>>["supabase"], table: string, auditId: string) {
  const { error } = await supabase.from(table).delete().eq("audit_id", auditId)
  if (isFatalDeleteError(error)) throw error
}

async function deleteAiRowsForAudit(supabase: Awaited<ReturnType<typeof getGeoApiClient>>["supabase"], auditId: string) {
  const { data: queries, error } = await supabase.from("ai_queries").select("id").eq("audit_id", auditId)
  if (isFatalDeleteError(error)) throw error
  const queryIds = (queries ?? []).map((query) => query.id).filter(Boolean)
  if (queryIds.length > 0) await deleteRowsByIn(supabase, "ai_answers", "query_id", queryIds)
}

async function deleteRowsByIn(supabase: Awaited<ReturnType<typeof getGeoApiClient>>["supabase"], table: string, column: string, values: string[]) {
  const { error } = await supabase.from(table).delete().in(column, values)
  if (isFatalDeleteError(error)) throw error
}

function isFatalDeleteError(error: { message?: string } | null) {
  if (!error) return false
  const message = String(error.message || "").toLowerCase()
  return !message.includes("does not exist") && !message.includes("schema cache") && !message.includes("could not find")
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (error && typeof error === "object") {
    const value = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown }
    return [value.message, value.details, value.hint, value.code].filter(Boolean).map(String).join(" | ") || "Could not delete audit"
  }
  return String(error || "Could not delete audit")
}
