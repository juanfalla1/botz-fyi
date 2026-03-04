import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/api/_utils/auth";
import { getAnonSupabaseWithToken } from "@/app/api/_utils/supabase";
import { SYSTEM_TENANT_ID } from "@/app/api/_utils/system";

function toDateKey(d = new Date()) {
  const z = new Date(d);
  z.setHours(0, 0, 0, 0);
  return z.toISOString().slice(0, 10);
}

function parseRate(v: any) {
  const s = String(v ?? "").replace(/\./g, "").replace(/,/g, ".").replace(/[^0-9.\-]/g, "");
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function fetchTrmFromSocrata() {
  const url = "https://www.datos.gov.co/resource/32sa-8pi3.json?$limit=1&$order=vigenciadesde%20desc";
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Socrata TRM failed (${res.status})`);
  const rows = await res.json();
  const first = Array.isArray(rows) ? rows[0] : null;
  const rate = parseRate(first?.valor);
  if (!rate) throw new Error("Invalid TRM payload");
  return { rate, source: "datos.gov.co", source_url: url };
}

async function fetchTrmFallback() {
  const url = "https://open.er-api.com/v6/latest/USD";
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Fallback FX failed (${res.status})`);
  const json = await res.json();
  const rate = Number(json?.rates?.COP || 0);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("Invalid fallback FX payload");
  return { rate, source: "open.er-api.com", source_url: url };
}

export async function GET(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });

  const supabase = getAnonSupabaseWithToken(guard.token);
  if (!supabase) return NextResponse.json({ ok: false, error: "Missing Supabase env" }, { status: 500 });

  try {
    const today = toDateKey();

    const { data: cached } = await supabase
      .from("agent_fx_rates")
      .select("id,rate,source,source_url,rate_date")
      .eq("tenant_id", SYSTEM_TENANT_ID)
      .eq("created_by", guard.user.id)
      .eq("from_currency", "USD")
      .eq("to_currency", "COP")
      .eq("rate_date", today)
      .maybeSingle();

    if (cached?.rate) {
      return NextResponse.json({ ok: true, cached: true, data: cached });
    }

    let fetched: { rate: number; source: string; source_url: string };
    try {
      fetched = await fetchTrmFromSocrata();
    } catch {
      fetched = await fetchTrmFallback();
    }

    const payload = {
      tenant_id: SYSTEM_TENANT_ID,
      created_by: guard.user.id,
      rate_date: today,
      from_currency: "USD",
      to_currency: "COP",
      rate: fetched.rate,
      source: fetched.source,
      source_url: fetched.source_url,
    };

    const { data, error } = await supabase
      .from("agent_fx_rates")
      .upsert(payload, { onConflict: "tenant_id,rate_date,from_currency,to_currency" })
      .select("id,rate,source,source_url,rate_date")
      .single();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true, cached: false, data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
