import { NextResponse } from "next/server";
import { resolveTenant } from "@/app/api/metrocas/_shared";
import { getServiceSupabase } from "@/app/api/_utils/supabase";

export async function GET(req: Request) {
  const access = await resolveTenant(req);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const svc = getServiceSupabase();
  if (!svc) return NextResponse.json({ error: "Supabase no configurado" }, { status: 500 });
  const page = Number(new URL(req.url).searchParams.get("page") || "1");
  const pageSize = Number(new URL(req.url).searchParams.get("page_size") || "10");
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = svc
    .from("metrocas_datasets")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  query = access.tenantId ? query.eq("tenant_id", access.tenantId) : query.is("tenant_id", null);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data, count, page, pageSize });
}
