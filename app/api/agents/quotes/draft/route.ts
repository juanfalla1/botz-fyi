import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/api/_utils/auth";
import { getAnonSupabaseWithToken } from "@/app/api/_utils/supabase";
import { SYSTEM_TENANT_ID } from "@/app/api/_utils/system";

function todayKey() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function parseRate(v: any) {
  const raw = String(v ?? "").trim().replace(/[^0-9,.-]/g, "");
  if (!raw) return null;

  const hasDot = raw.includes(".");
  const hasComma = raw.includes(",");

  let normalized = raw;
  if (hasDot && hasComma) {
    const lastDot = raw.lastIndexOf(".");
    const lastComma = raw.lastIndexOf(",");
    if (lastComma > lastDot) {
      // 3.751,41 -> 3751.41
      normalized = raw.replace(/\./g, "").replace(/,/g, ".");
    } else {
      // 3,751.41 -> 3751.41
      normalized = raw.replace(/,/g, "");
    }
  } else if (hasComma) {
    normalized = raw.replace(/,/g, ".");
  }

  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function isLikelyTrm(rate: number) {
  return Number.isFinite(rate) && rate >= 1000 && rate <= 10000;
}

function isQuoteDraftStatusConstraintError(err: any) {
  const msg = String(err?.message || "").toLowerCase();
  return msg.includes("agent_quote_drafts_status_check") || (msg.includes("check constraint") && msg.includes("agent_quote_drafts"));
}

async function fetchTrmFromSocrata() {
  const url = "https://www.datos.gov.co/resource/32sa-8pi3.json?$limit=1&$order=vigenciadesde%20desc";
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Socrata TRM failed (${res.status})`);
  const rows = await res.json();
  const first = Array.isArray(rows) ? rows[0] : null;
  const rate = parseRate(first?.valor);
  if (!rate || !isLikelyTrm(rate)) throw new Error("Invalid TRM payload");
  return { rate, source: "datos.gov.co", source_url: url };
}

async function fetchTrmFallback() {
  const url = "https://open.er-api.com/v6/latest/USD";
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Fallback FX failed (${res.status})`);
  const json = await res.json();
  const rate = Number(json?.rates?.COP || 0);
  if (!isLikelyTrm(rate)) throw new Error("Invalid fallback FX payload");
  return { rate, source: "open.er-api.com", source_url: url };
}

async function getOrFetchTrm(supabase: any, userId: string) {
  const day = todayKey();
  const { data: cached } = await supabase
    .from("agent_fx_rates")
    .select("id,rate,rate_date,source")
    .eq("tenant_id", SYSTEM_TENANT_ID)
    .eq("created_by", userId)
    .eq("from_currency", "USD")
    .eq("to_currency", "COP")
    .eq("rate_date", day)
    .maybeSingle();

  if (cached?.rate && isLikelyTrm(Number(cached.rate))) return cached;

  let fetched: { rate: number; source: string; source_url: string };
  try {
    fetched = await fetchTrmFromSocrata();
  } catch {
    fetched = await fetchTrmFallback();
  }

  const payload = {
    tenant_id: SYSTEM_TENANT_ID,
    created_by: userId,
    rate_date: day,
    from_currency: "USD",
    to_currency: "COP",
    rate: fetched.rate,
    source: fetched.source,
    source_url: fetched.source_url,
  };

  const { data, error } = await supabase
    .from("agent_fx_rates")
    .upsert(payload, { onConflict: "tenant_id,rate_date,from_currency,to_currency" })
    .select("id,rate,rate_date,source")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function POST(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });

  const supabase = getAnonSupabaseWithToken(guard.token);
  if (!supabase) return NextResponse.json({ ok: false, error: "Missing Supabase env" }, { status: 500 });

  try {
    const body = await req.json().catch(() => ({}));
    const productCatalogId = String(body?.productCatalogId || "").trim();
    const productQuery = String(body?.productQuery || "").trim();
    const quantity = Math.max(1, Math.min(100000, Number(body?.quantity || 1)));
    const basePriceOverride = Number(body?.basePriceUsd || 0);

    let product: any = null;

    if (productCatalogId) {
      const { data } = await supabase
        .from("agent_product_catalog")
        .select("id,name,brand,category,base_price_usd,price_currency")
        .eq("id", productCatalogId)
        .eq("tenant_id", SYSTEM_TENANT_ID)
        .eq("created_by", guard.user.id)
        .maybeSingle();
      product = data || null;
    } else if (productQuery) {
      const { data } = await supabase
        .from("agent_product_catalog")
        .select("id,name,brand,category,base_price_usd,price_currency")
        .eq("tenant_id", SYSTEM_TENANT_ID)
        .eq("created_by", guard.user.id)
        .eq("is_active", true)
        .or(`name.ilike.%${productQuery}%,summary.ilike.%${productQuery}%`)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      product = data || null;
    }

    if (!product) {
      return NextResponse.json({ ok: false, error: "Producto no encontrado" }, { status: 404 });
    }

    const basePriceUsd = basePriceOverride > 0 ? basePriceOverride : Number(product?.base_price_usd || 0);
    if (!Number.isFinite(basePriceUsd) || basePriceUsd <= 0) {
      return NextResponse.json(
        {
          ok: false,
          code: "MISSING_BASE_PRICE",
          error: "El producto no tiene precio base USD configurado",
          data: { product_id: product.id, product_name: product.name },
        },
        { status: 400 }
      );
    }

    const trm = await getOrFetchTrm(supabase, guard.user.id);
    const trmRate = Number(trm?.rate || 0);
    if (!trmRate || trmRate <= 0) {
      return NextResponse.json({ ok: false, error: "No se pudo obtener TRM" }, { status: 500 });
    }

    const totalCop = Number((basePriceUsd * trmRate * quantity).toFixed(2));

    const draftPayload = {
      tenant_id: SYSTEM_TENANT_ID,
      created_by: guard.user.id,
      agent_id: String(body?.agentId || "").trim() || null,
      customer_name: String(body?.customerName || "").trim() || null,
      customer_email: String(body?.customerEmail || "").trim().toLowerCase() || null,
      customer_phone: String(body?.customerPhone || "").trim() || null,
      company_name: String(body?.companyName || "").trim() || null,
      location: String(body?.location || "").trim() || null,
      product_catalog_id: product.id,
      product_name: String(product.name || ""),
      base_price_usd: basePriceUsd,
      trm_rate: trmRate,
      total_cop: totalCop,
      notes: String(body?.notes || "").trim() || null,
      payload: {
        quantity,
        trm_date: trm.rate_date,
        trm_source: trm.source,
        price_currency: String(product?.price_currency || "USD"),
        crm_stage: "analysis",
      },
      status: "analysis",
    };

    let { data: draft, error: draftError } = await supabase
      .from("agent_quote_drafts")
      .insert(draftPayload)
      .select("id,product_name,base_price_usd,trm_rate,total_cop,status,created_at")
      .single();

    if (draftError && isQuoteDraftStatusConstraintError(draftError)) {
      const legacyPayload = {
        ...draftPayload,
        status: "draft",
      };
      const retry = await supabase
        .from("agent_quote_drafts")
        .insert(legacyPayload)
        .select("id,product_name,base_price_usd,trm_rate,total_cop,status,created_at")
        .single();
      draft = retry.data as any;
      draftError = retry.error as any;
    }

    if (draftError) {
      return NextResponse.json({ ok: false, error: draftError.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      data: {
        ...draft,
        quantity,
        trm_date: trm.rate_date,
        trm_source: trm.source,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
