import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/app/api/_utils/supabase";
import { SYSTEM_TENANT_ID } from "@/app/api/_utils/system";

function todayKey() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
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

function isAuthorized(req: Request) {
  const auth = String(req.headers.get("authorization") || "");
  const expected = String(process.env.CRON_SECRET || "").trim();
  return Boolean(expected) && auth === `Bearer ${expected}`;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "Missing service supabase" }, { status: 500 });

  try {
    const day = todayKey();
    let fetched: { rate: number; source: string; source_url: string };
    try {
      fetched = await fetchTrmFromSocrata();
    } catch {
      fetched = await fetchTrmFallback();
    }

    const { data: users, error: userErr } = await supabase
      .from("agent_product_catalog")
      .select("created_by")
      .eq("tenant_id", SYSTEM_TENANT_ID)
      .eq("provider", "avanza");

    if (userErr) return NextResponse.json({ ok: false, error: userErr.message }, { status: 400 });

    const owners = Array.from(new Set((users || []).map((r: any) => String(r?.created_by || "").trim()).filter(Boolean)));
    let upserts = 0;

    for (const ownerId of owners) {
      const payload = {
        tenant_id: SYSTEM_TENANT_ID,
        created_by: ownerId,
        rate_date: day,
        from_currency: "USD",
        to_currency: "COP",
        rate: fetched.rate,
        source: fetched.source,
        source_url: fetched.source_url,
      };
      const { error } = await supabase
        .from("agent_fx_rates")
        .upsert(payload, { onConflict: "tenant_id,rate_date,from_currency,to_currency" });
      if (!error) upserts += 1;
    }

    return NextResponse.json({
      ok: true,
      date: day,
      rate: fetched.rate,
      source: fetched.source,
      owners: owners.length,
      upserts,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
