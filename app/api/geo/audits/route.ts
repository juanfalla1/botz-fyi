import { NextResponse } from "next/server";
import { auditSchema } from "@geo/validators/audit.schema";
import { getGeoApiClient } from "@/lib/geo/api-auth";
import { createAuditManual } from "@/lib/geo/repositories/audits.repo";
import { createUsageEvent } from "@/lib/geo/repositories/usage.repo";
import { processAuditQueueForUser } from "@/lib/geo/services/audit-jobs.service";

export async function GET(req: Request) {
  try {
    const { supabase, user } = await getGeoApiClient(req)
    const { data: jobs, error: jobsError } = await supabase
      .from("audit_jobs")
      .select("id, audit_id, status, created_at, started_at, completed_at, error_message")
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

    return NextResponse.json({ data: { audits: audits ?? [], jobs: jobs ?? [] }, mode: "live" })
  } catch (error) {
    return NextResponse.json({ data: { audits: [], jobs: [] }, mode: "error", error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 })
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = auditSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const { supabase, user } = await getGeoApiClient(req);
    const created = await createAuditManual(
      supabase,
      user.id,
      parsed.data.project_id,
      parsed.data.base_url,
      parsed.data.crawl_depth ?? 1,
      parsed.data.engines ?? ["openai", "gemini"]
    );
    await createUsageEvent(supabase, {
      user_id: user.id,
      event_type: "geo_audit_created",
      amount: 1,
      metadata: { audit_id: created.audit.id, source: "api_geo_audits" },
    });
    void processAuditQueueForUser(supabase, user.id, 1);
    return NextResponse.json({ data: { audit: created.audit, job: created.job }, mode: "live" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}
