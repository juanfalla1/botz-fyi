import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/api/_utils/auth";
import { getAnonSupabaseWithToken } from "@/app/api/_utils/supabase";
import { SYSTEM_TENANT_ID } from "@/app/api/_utils/system";

export async function GET(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });

  const supabase = getAnonSupabaseWithToken(guard.token);
  if (!supabase) return NextResponse.json({ ok: false, error: "Missing Supabase env" }, { status: 500 });

  const url = new URL(req.url);
  const q = String(url.searchParams.get("q") || "").trim();
  const brand = String(url.searchParams.get("brand") || "").trim();
  const category = String(url.searchParams.get("category") || "").trim();
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit") || 20)));

  let query = supabase
    .from("agent_product_catalog")
    .select("id,name,brand,category,product_url,image_url,summary,standards,methods,updated_at")
    .eq("tenant_id", SYSTEM_TENANT_ID)
    .eq("created_by", guard.user.id)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (brand) query = query.eq("brand", brand);
  if (category) query = query.eq("category", category);
  if (q) query = query.or(`name.ilike.%${q}%,summary.ilike.%${q}%,description.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  const ids = (data || []).map((d: any) => d.id);
  let variantsMap = new Map<string, number>();
  if (ids.length) {
    const { data: vars } = await supabase
      .from("agent_product_variants")
      .select("catalog_id")
      .in("catalog_id", ids);
    for (const row of vars || []) {
      const key = String((row as any)?.catalog_id || "");
      variantsMap.set(key, (variantsMap.get(key) || 0) + 1);
    }
  }

  const enriched = (data || []).map((row: any) => ({
    ...row,
    variants_count: variantsMap.get(String(row.id)) || 0,
  }));

  return NextResponse.json({ ok: true, data: enriched });
}
