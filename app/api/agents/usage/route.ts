import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/api/_utils/auth";
import { getAnonSupabaseWithToken } from "@/app/api/_utils/supabase";
import { AGENTS_PRODUCT_KEY } from "@/app/api/_utils/entitlement";

function isMissingTableError(err: any) {
  const msg = String(err?.message || "").toLowerCase();
  const code = String(err?.code || "").toLowerCase();
  return code === "pgrst205" || msg.includes("agent_usage_events") || msg.includes("does not exist") || msg.includes("schema cache");
}

export async function GET(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });
  }

  const supabase = getAnonSupabaseWithToken(guard.token);
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Missing SUPABASE env (URL or ANON)" }, { status: 500 });
  }

  try {
    const url = new URL(req.url);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 20)));

    const { data, error } = await supabase
      .from("agent_usage_events")
      .select("id,endpoint,action,credits_delta,metadata,created_at")
      .eq("user_id", guard.user.id)
      .eq("product_key", AGENTS_PRODUCT_KEY)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json({ ok: true, data: [], summary: { today: 0, seven_days: 0, top_endpoint: "-" }, missing_table: true });
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    const rows: any[] = Array.isArray(data) ? data : [];
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    let today = 0;
    let seven = 0;
    const endpointTotals = new Map<string, number>();

    for (const r of rows) {
      const ts = new Date(r.created_at).getTime();
      const delta = Number(r.credits_delta || 0) || 0;
      if (!Number.isNaN(ts) && ts >= oneDayAgo) today += delta;
      if (!Number.isNaN(ts) && ts >= sevenDaysAgo) seven += delta;
      const ep = String(r.endpoint || "-");
      endpointTotals.set(ep, (endpointTotals.get(ep) || 0) + delta);
    }

    let topEndpoint = "-";
    let topVal = -1;
    for (const [ep, val] of endpointTotals.entries()) {
      if (val > topVal) {
        topVal = val;
        topEndpoint = ep;
      }
    }

    return NextResponse.json({
      ok: true,
      data: rows,
      summary: {
        today,
        seven_days: seven,
        top_endpoint: topEndpoint,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
