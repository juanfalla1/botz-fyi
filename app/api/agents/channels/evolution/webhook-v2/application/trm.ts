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
      normalized = raw.replace(/\./g, "").replace(/,/g, ".");
    } else {
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

function todayKey() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
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

export async function getOrFetchTrm(supabase: any, ownerId: string, tenantId: string | null) {
  const day = todayKey();
  const { data: cached } = await supabase
    .from("agent_fx_rates")
    .select("id,rate,rate_date,source")
    .eq("tenant_id", tenantId)
    .eq("created_by", ownerId)
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
    tenant_id: tenantId,
    created_by: ownerId,
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
