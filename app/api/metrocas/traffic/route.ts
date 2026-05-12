import { NextResponse } from "next/server";
import { resolveTenant } from "@/app/api/metrocas/_shared";
import { getServiceSupabase } from "@/app/api/_utils/supabase";

export async function GET(req: Request) {
  const access = await resolveTenant(req);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const datasetId = new URL(req.url).searchParams.get("dataset_id");
  if (!datasetId) return NextResponse.json({ error: "dataset_id es requerido" }, { status: 400 });
  const svc = getServiceSupabase();
  if (!svc) return NextResponse.json({ error: "Supabase no configurado" }, { status: 500 });

  const dailyQ = svc.from("metrocas_daily_traffic").select("*").eq("dataset_id", datasetId).order("traffic_date", { ascending: true });
  const hourlyQ = svc.from("metrocas_hourly_traffic").select("*").eq("dataset_id", datasetId).order("hour_slot", { ascending: true });

  const [daily, hourly] = await Promise.all([
    access.tenantId ? dailyQ.eq("tenant_id", access.tenantId) : dailyQ.is("tenant_id", null),
    access.tenantId ? hourlyQ.eq("tenant_id", access.tenantId) : hourlyQ.is("tenant_id", null),
  ]);

  if (daily.error) return NextResponse.json({ error: daily.error.message }, { status: 500 });
  if (hourly.error) return NextResponse.json({ error: hourly.error.message }, { status: 500 });
  const byBranchMap = new Map<string, { branch: string; visits: number; days: number }>();
  for (const row of daily.data || []) {
    const branch = String(row.branch || "SIN SEDE");
    const current = byBranchMap.get(branch) || { branch, visits: 0, days: 0 };
    current.visits += Number(row.visits || 0);
    current.days += 1;
    byBranchMap.set(branch, current);
  }
  const byBranch = [...byBranchMap.values()].sort((a, b) => b.visits - a.visits);

  return NextResponse.json({ ok: true, daily: daily.data, hourly: hourly.data, byBranch });
}
