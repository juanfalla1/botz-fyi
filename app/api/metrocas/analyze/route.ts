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

function toNum(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function isoDate(v: unknown) {
  const s = String(v || "").trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

function weekdayEs(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  const idx = d.getDay();
  return ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"][idx] || "N/A";
}

async function buildDeepSummary(params: { svc: any; datasetId: string; tenantId: string | null }) {
  const { svc, datasetId, tenantId } = params;
  const batchSize = 1000;
  const rows: any[] = [];
  let offset = 0;

  while (true) {
    let q = svc
      .from("metrocas_sales_records")
      .select("*")
      .eq("dataset_id", datasetId)
      .range(offset, offset + batchSize - 1);
    q = tenantId ? q.eq("tenant_id", tenantId) : q.is("tenant_id", null);
    const page = await q;
    if (page.error) break;
    const chunk = page.data || [];
    rows.push(...chunk);
    if (chunk.length < batchSize) break;
    offset += batchSize;
    if (offset > 50000) break;
  }

  const byDay = new Map<string, number>();
  const byWeekday = new Map<string, number>();
  const byProduct = new Map<string, { sales: number; qty: number }>();
  const byCategoryMonth = new Map<string, Map<string, number>>();
  const byCustomer = new Map<string, number>();
  const byCity = new Map<string, number>();

  let totalSales = 0;
  let validDateRows = 0;

  for (const row of rows) {
    const raw = row.raw_data || {};
    const amount = toNum(row.balance ?? row.total_sale ?? raw.balance ?? raw.total_venta);
    const qty = toNum(row.quantity ?? raw.quantity ?? raw.cantidad);
    const date = isoDate(row.sale_date ?? row.invoice_date ?? raw.invoice_date ?? raw.fecha);
    const month = date ? date.slice(0, 7) : "Sin fecha";
    const product = String(row.product_name || raw.product_name || raw.producto || "Sin producto").trim() || "Sin producto";
    const category = String(row.category || row.product_category || raw.categoria || raw.product_category || "Sin categoria").trim() || "Sin categoria";
    const customer = String(row.customer_name || raw.customer_name || raw.cliente || "Sin cliente").trim() || "Sin cliente";
    const city = String(row.city || raw.city || raw.ciudad || "EN BLANCO").trim() || "EN BLANCO";

    totalSales += amount;
    byCustomer.set(customer, (byCustomer.get(customer) || 0) + amount);
    byCity.set(city, (byCity.get(city) || 0) + amount);

    const p = byProduct.get(product) || { sales: 0, qty: 0 };
    p.sales += amount;
    p.qty += qty;
    byProduct.set(product, p);

    const catMap = byCategoryMonth.get(category) || new Map<string, number>();
    catMap.set(month, (catMap.get(month) || 0) + amount);
    byCategoryMonth.set(category, catMap);

    if (date) {
      validDateRows += 1;
      byDay.set(date, (byDay.get(date) || 0) + amount);
      const wd = weekdayEs(date);
      byWeekday.set(wd, (byWeekday.get(wd) || 0) + amount);
    }
  }

  const topDays = [...byDay.entries()].map(([date, sales]) => ({ date, sales })).sort((a, b) => b.sales - a.sales).slice(0, 5);
  const lowDays = [...byDay.entries()].map(([date, sales]) => ({ date, sales })).sort((a, b) => a.sales - b.sales).slice(0, 5);
  const weekdayRanking = [...byWeekday.entries()].map(([day, sales]) => ({ day, sales })).sort((a, b) => b.sales - a.sales);
  const topProducts = [...byProduct.entries()].map(([name, v]) => ({ name, sales: v.sales, qty: v.qty, participation: totalSales ? v.sales / totalSales : 0 })).sort((a, b) => b.sales - a.sales).slice(0, 15);
  const lowRotationProducts = [...byProduct.entries()].map(([name, v]) => ({ name, sales: v.sales, qty: v.qty })).filter((x) => x.qty > 0).sort((a, b) => a.qty - b.qty).slice(0, 15);
  const topCustomers = [...byCustomer.entries()].map(([name, sales]) => ({ name, sales, participation: totalSales ? sales / totalSales : 0 })).sort((a, b) => b.sales - a.sales).slice(0, 10);
  const topCities = [...byCity.entries()].map(([city, sales]) => ({ city, sales, participation: totalSales ? sales / totalSales : 0 })).sort((a, b) => b.sales - a.sales).slice(0, 15);

  const months = [...new Set([...byDay.keys()].map((d) => d.slice(0, 7)))].sort();
  const latest = months[months.length - 1];
  const previous = months[months.length - 2];
  const categoriesToStrengthen = [...byCategoryMonth.entries()]
    .map(([category, m]) => {
      const curr = toNum(m.get(latest));
      const prev = toNum(m.get(previous));
      const delta = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
      return { category, curr, prev, delta };
    })
    .filter((x) => Number.isFinite(x.delta))
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 8);

  return {
    dataQuality: {
      totalRows: rows.length,
      rowsWithValidDate: validDateRows,
      rowsWithoutValidDate: Math.max(0, rows.length - validDateRows),
    },
    commercialDynamics: {
      topDays,
      lowDays,
      weekdayRanking,
      topCities,
      topCustomers,
      topProducts,
      lowRotationProducts,
      categoriesToStrengthen,
      concentration: {
        topCustomerShare: topCustomers[0]?.participation || 0,
        topProductShare: topProducts[0]?.participation || 0,
      },
    },
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

    const aiInputBase = compactSummary((kpi?.data || {}) as Record<string, unknown>);
    const deepSummary = await buildDeepSummary({ svc, datasetId, tenantId: access.tenantId || null });
    const aiInput = {
      ...aiInputBase,
      deepSummary,
    };
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
