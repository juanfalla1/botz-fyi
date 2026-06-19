import { NextResponse, after } from "next/server";
import { auditSchema } from "@geo/validators/audit.schema";
import { getGeoApiClient } from "@/lib/geo/api-auth";
import { createAuditManual } from "@/lib/geo/repositories/audits.repo";
import { consumeServerUsage } from "@/lib/geo/repositories/usage.repo";
import { processAuditQueueForUser } from "@/lib/geo/services/audit-jobs.service";
import { assertProjectOwner } from "@/lib/geo/ownership";

export const maxDuration = 60

export async function GET(req: Request) {
  try {
    const { supabase, user } = await getGeoApiClient(req)
    const { data: jobs, error: jobsError } = await supabase
      .from("audit_jobs")
      .select("id, audit_id, status, created_at, started_at, completed_at, error_message, failed_reason")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100)
    if (jobsError) throw jobsError

    const auditIds = Array.from(new Set((jobs ?? []).map((job) => job.audit_id).filter(Boolean)))
    const { data: audits, error: auditsError } = auditIds.length > 0
      ? await supabase
          .from("geo_audits")
          .select("id, project_id, status, base_url, crawl_depth, engines, summary, final_score, created_at, completed_at")
          .in("id", auditIds)
          .order("created_at", { ascending: false })
          .limit(100)
      : { data: [], error: null }
    if (auditsError) throw auditsError

    const { data: queries, error: queriesError } = auditIds.length > 0
      ? await supabase.from("ai_queries").select("id, audit_id, prompt").in("audit_id", auditIds)
      : { data: [], error: null }
    if (queriesError) throw queriesError

    const queryIds = (queries ?? []).map((query) => query.id).filter(Boolean)
    const projectIds = Array.from(new Set((audits ?? []).map((audit) => audit.project_id).filter(Boolean)))
    const { data: projectPrompts, error: promptsError } = projectIds.length > 0
      ? await supabase.from("geo_prompts").select("project_id, prompt, enabled").in("project_id", projectIds)
      : { data: [], error: null }
    if (promptsError) throw promptsError

    const { data: answers, error: answersError } = queryIds.length > 0
      ? await supabase.from("ai_answers").select("query_id, engine, raw_response").in("query_id", queryIds)
      : { data: [], error: null }
    if (answersError) throw answersError

    const queryAuditIds = new Map((queries ?? []).map((query) => [query.id, query.audit_id]))
    const queryPrompts = new Map((queries ?? []).map((query) => [query.id, String(query.prompt ?? "")]))
    const scoreablePromptsByProject = new Map<string, number>()
    for (const prompt of projectPrompts ?? []) {
      if (!prompt.project_id || !prompt.enabled || !isScoreablePrompt(String(prompt.prompt ?? ""))) continue
      scoreablePromptsByProject.set(prompt.project_id, (scoreablePromptsByProject.get(prompt.project_id) ?? 0) + 1)
    }
    const executedByAudit = new Map<string, number>()
    const liveByAudit = new Map<string, number>()
    const liveEnginesByAudit = new Map<string, Set<string>>()
    for (const query of queries ?? []) {
      if (!query.audit_id) continue
      executedByAudit.set(query.audit_id, (executedByAudit.get(query.audit_id) ?? 0) + 1)
    }
    for (const answer of answers ?? []) {
      const auditId = queryAuditIds.get(answer.query_id)
      if (!auditId) continue
      if (!isScoreablePrompt(queryPrompts.get(answer.query_id) ?? "")) continue
      const raw = answer.raw_response && typeof answer.raw_response === "object" ? answer.raw_response as Record<string, unknown> : {}
      if (raw.mode === "live") {
        liveByAudit.set(auditId, (liveByAudit.get(auditId) ?? 0) + 1)
        const engines = liveEnginesByAudit.get(auditId) ?? new Set<string>()
        const engine = String(answer.engine ?? "")
        if (engine) engines.add(engine)
        liveEnginesByAudit.set(auditId, engines)
      }
    }

    const auditsWithEvidence = (audits ?? []).map((audit) => {
      const liveAiQueries = liveByAudit.get(audit.id) ?? 0
      const liveEngineCount = liveEnginesByAudit.get(audit.id)?.size ?? 0
      const scoreableProjectPrompts = scoreablePromptsByProject.get(audit.project_id) ?? 0
      const hasScoreEvidence = liveAiQueries >= 3 && liveEngineCount >= 2 && scoreableProjectPrompts > 0
      return {
        ...audit,
        final_score: hasScoreEvidence ? audit.final_score : null,
        executed_ai_queries: executedByAudit.get(audit.id) ?? 0,
        live_ai_queries: liveAiQueries,
        live_engine_count: liveEngineCount,
        scoreable_project_prompts: scoreableProjectPrompts,
      }
    })

    return NextResponse.json({ data: { audits: auditsWithEvidence, jobs: jobs ?? [] }, mode: "live" })
  } catch (error) {
    return NextResponse.json({ data: { audits: [], jobs: [] }, mode: "error", error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 })
  }
}

function isScoreablePrompt(prompt: string) {
  const text = prompt.toLowerCase().replace(/[¿?]/g, "").replace(/\s+/g, " ").trim()
  if (!text) return false
  const genericMarketOnly = [
    /mejores proveedores para e-?commerce(?: en [a-záéíóúñ\s]+)?$/i,
    /mejores alternativas a alternativas del mercado para e-?commerce$/i,
    /empresa recomiendas para e-?commerce(?: en [a-záéíóúñ\s]+)?$/i,
    /best providers for e-?commerce(?: in [a-z\s]+)?$/i,
    /best alternatives to market alternatives for e-?commerce$/i,
    /company do you recommend for e-?commerce(?: in [a-z\s]+)?$/i,
  ]
  return !genericMarketOnly.some((pattern) => pattern.test(text))
}

function statusForError(error: unknown) {
  const message = errorMessage(error)
  if (message.includes("limit reached")) return 402
  if (message.includes("Free trial ended")) return 402
  if (message.includes("not found or not owned")) return 404
  if (message.includes("row-level security") || message.includes("permission denied")) return 403
  return 401
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (error && typeof error === "object") {
    const value = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown }
    return [value.message, value.details, value.hint, value.code].filter(Boolean).map(String).join(" | ") || "Unexpected audit error"
  }
  return String(error || "Unexpected audit error")
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = auditSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const { supabase, user } = await getGeoApiClient(req);
    await assertProjectOwner(supabase, user.id, parsed.data.project_id)
    await consumeServerUsage(supabase, user.id, "audit", 1, { source: "api_geo_audits", project_id: parsed.data.project_id })
    const created = await createAuditManual(
      supabase,
      user.id,
      parsed.data.project_id,
      parsed.data.base_url,
      parsed.data.crawl_depth ?? 1,
      parsed.data.engines ?? ["openai", "gemini"]
    );
    after(async () => {
      try {
        await processAuditQueueForUser(supabase, user.id, 1);
      } catch (processError) {
        console.error("GEO audit background processing failed", processError);
      }
    });
    return NextResponse.json({ data: { audit: created.audit, job: created.job }, mode: "live" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: statusForError(error) });
  }
}
