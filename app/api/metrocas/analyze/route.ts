import { NextResponse } from "next/server";
import { resolveTenant } from "@/app/api/metrocas/_shared";
import { getServiceSupabase } from "@/app/api/_utils/supabase";
import { generateExecutiveInsights } from "@/app/lib/metrocas/openai";

function compactSummary(input: any) {
  const d = input?.dashboard || input || {};
  return {
    kpis: d.kpis || {},
    monthlySales: (d.monthlySales || []).slice(-12),
    salesByCategory: (d.salesByCategory || []).slice(0, 12),
    topProducts: (d.topProducts || []).slice(0, 12),
    topCustomers: (d.topCustomers || []).slice(0, 12),
    cityRanking: (d.cityRanking || []).slice(0, 12),
    alerts: (d.alerts || []).slice(0, 20),
    recommendations: (d.recommendations || []).slice(0, 20),
    sheetCoverage: input?.sheet_coverage || null,
  };
}

export async function POST(req: Request) {
  try {
    const access = await resolveTenant(req);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
    const svc = getServiceSupabase();
    if (!svc) return NextResponse.json({ error: "Supabase no configurado" }, { status: 500 });

    const body = await req.json();
    const datasetId = String(body.dataset_id || "");
    if (!datasetId) return NextResponse.json({ error: "dataset_id es requerido" }, { status: 400 });

    let kpiQuery = svc
      .from("metrocas_kpis")
      .select("data")
      .eq("dataset_id", datasetId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    kpiQuery = access.tenantId ? kpiQuery.eq("tenant_id", access.tenantId) : kpiQuery.is("tenant_id", null);
    const { data: kpi, error } = await kpiQuery;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const aiInput = compactSummary((kpi?.data || {}) as Record<string, unknown>);
    const ai = await generateExecutiveInsights(aiInput as Record<string, unknown>);
    const { error: insertErr } = await svc.from("metrocas_ai_insights").insert({
      dataset_id: datasetId,
      tenant_id: access.tenantId,
      insight_type: "executive",
      title: "Analisis ejecutivo IA",
      summary: String((ai as any)?.executive_summary || ""),
      severity: "medium",
      recommendation: "Revisar acciones priorizadas de 30/60/90 dias.",
      data: ai,
    });
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
    return NextResponse.json({ ok: true, insights: ai, source: process.env.OPENAI_API_KEY ? "openai" : "fallback_no_key" });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: "No se pudo generar analisis IA", details: error?.message || "Unknown error" }, { status: 500 });
  }
}
