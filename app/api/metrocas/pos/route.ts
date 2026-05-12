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
  const { data, error } = await svc.from("metrocas_pos_sales_records").select("*").eq("tenant_id", access.tenantId).eq("dataset_id", datasetId).limit(2000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}
