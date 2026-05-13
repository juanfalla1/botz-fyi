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

async function fetchAllRows(params: {
  svc: any;
  table: string;
  datasetId: string;
  tenantId: string | null;
  batchSize?: number;
  maxRows?: number;
}) {
  const { svc, table, datasetId, tenantId, batchSize = 1000, maxRows = 50000 } = params;
  const rows: any[] = [];
  let offset = 0;
  while (true) {
    let q = svc.from(table).select("*").eq("dataset_id", datasetId).range(offset, offset + batchSize - 1);
    q = tenantId ? q.eq("tenant_id", tenantId) : q.is("tenant_id", null);
    const page = await q;
    if (page.error) break;
    const chunk = page.data || [];
    rows.push(...chunk);
    if (chunk.length < batchSize) break;
    offset += batchSize;
    if (offset > maxRows) break;
  }
  return rows;
}

async function buildDeepSummary(params: { svc: any; datasetId: string; tenantId: string | null }) {
  const { svc, datasetId, tenantId } = params;
  const rows = await fetchAllRows({ svc, table: "metrocas_sales_records", datasetId, tenantId });
  const posRows = await fetchAllRows({ svc, table: "metrocas_pos_sales_records", datasetId, tenantId, maxRows: 20000 });
  const dailyTraffic = await fetchAllRows({ svc, table: "metrocas_daily_traffic", datasetId, tenantId, maxRows: 20000 });
  const hourlyTraffic = await fetchAllRows({ svc, table: "metrocas_hourly_traffic", datasetId, tenantId, maxRows: 20000 });

  const byDay = new Map<string, number>();
  const byWeekday = new Map<string, number>();
  const byProduct = new Map<string, { sales: number; qty: number }>();
  const byCategoryMonth = new Map<string, Map<string, number>>();
  const byBranch = new Map<string, number>();
  const byCustomer = new Map<string, number>();
  const byCity = new Map<string, number>();
  const firstPurchaseByCustomer = new Map<string, string>();

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
    const branch = String(row.journal || row.seller || row.channel || raw.journal || raw.canal || "SIN SEDE").trim() || "SIN SEDE";

    totalSales += amount;
    byCustomer.set(customer, (byCustomer.get(customer) || 0) + amount);
    byCity.set(city, (byCity.get(city) || 0) + amount);
    byBranch.set(branch, (byBranch.get(branch) || 0) + amount);

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
      const prev = firstPurchaseByCustomer.get(customer);
      if (!prev || date < prev) firstPurchaseByCustomer.set(customer, date);
    }
  }

  const topDays = [...byDay.entries()].map(([date, sales]) => ({ date, sales })).sort((a, b) => b.sales - a.sales).slice(0, 5);
  const lowDays = [...byDay.entries()].map(([date, sales]) => ({ date, sales })).sort((a, b) => a.sales - b.sales).slice(0, 5);
  const weekdayRanking = [...byWeekday.entries()].map(([day, sales]) => ({ day, sales })).sort((a, b) => b.sales - a.sales);
  const topProducts = [...byProduct.entries()].map(([name, v]) => ({ name, sales: v.sales, qty: v.qty, participation: totalSales ? v.sales / totalSales : 0 })).sort((a, b) => b.sales - a.sales).slice(0, 15);
  const lowRotationProducts = [...byProduct.entries()].map(([name, v]) => ({ name, sales: v.sales, qty: v.qty })).filter((x) => x.qty > 0).sort((a, b) => a.qty - b.qty).slice(0, 15);
  const topCustomers = [...byCustomer.entries()].map(([name, sales]) => ({ name, sales, participation: totalSales ? sales / totalSales : 0 })).sort((a, b) => b.sales - a.sales).slice(0, 10);
  const topCities = [...byCity.entries()].map(([city, sales]) => ({ city, sales, participation: totalSales ? sales / totalSales : 0 })).sort((a, b) => b.sales - a.sales).slice(0, 15);
  const branchRanking = [...byBranch.entries()].map(([branch, sales]) => ({ branch, sales, participation: totalSales ? sales / totalSales : 0 })).sort((a, b) => b.sales - a.sales).slice(0, 15);

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

  const sortedNewCustomers = [...firstPurchaseByCustomer.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const newCustomersByMonth = new Map<string, number>();
  for (const [, dt] of sortedNewCustomers) {
    const m = dt.slice(0, 7);
    newCustomersByMonth.set(m, (newCustomersByMonth.get(m) || 0) + 1);
  }
  const monthlyNewCustomers = [...newCustomersByMonth.entries()].map(([monthKey, count]) => ({ month: monthKey, count })).sort((a, b) => a.month.localeCompare(b.month));

  const posTotal = posRows.reduce((acc, r) => acc + toNum(r.balance ?? r.total_sale ?? r.amount_currency), 0);
  const posByCity = new Map<string, number>();
  for (const r of posRows) {
    const c = String(r.city || "EN BLANCO").trim() || "EN BLANCO";
    const a = toNum(r.balance ?? r.total_sale ?? r.amount_currency);
    posByCity.set(c, (posByCity.get(c) || 0) + a);
  }
  const posCityRanking = [...posByCity.entries()].map(([city, sales]) => ({ city, sales, participation: posTotal ? sales / posTotal : 0 })).sort((a, b) => b.sales - a.sales).slice(0, 10);

  const trafficTotalVisits = dailyTraffic.reduce((acc, r) => acc + toNum(r.visits), 0);
  const trafficByBranch = new Map<string, number>();
  for (const r of dailyTraffic) {
    const b = String(r.branch || "SIN SEDE").trim() || "SIN SEDE";
    trafficByBranch.set(b, (trafficByBranch.get(b) || 0) + toNum(r.visits));
  }
  const trafficBranchRanking = [...trafficByBranch.entries()].map(([branch, visits]) => ({ branch, visits, participation: trafficTotalVisits ? visits / trafficTotalVisits : 0 })).sort((a, b) => b.visits - a.visits).slice(0, 10);

  const trafficByHour = new Map<string, number>();
  for (const r of hourlyTraffic) {
    const h = String(r.hour_slot || "N/A").trim();
    if (!h || h === "N/A") continue;
    trafficByHour.set(h, (trafficByHour.get(h) || 0) + toNum(r.visits));
  }
  const peakHours = [...trafficByHour.entries()].map(([hour, visits]) => ({ hour, visits })).sort((a, b) => b.visits - a.visits).slice(0, 8);

  const top3CustomerShare = topCustomers.slice(0, 3).reduce((acc, x) => acc + toNum(x.participation), 0);
  const top5ProductShare = topProducts.slice(0, 5).reduce((acc, x) => acc + toNum(x.participation), 0);

  const estimatedRecoveryBase = totalSales * 0.08;
  const cityOpportunities = topCities.slice(0, 8).map((c, idx) => {
    const citySales = toNum(c.sales);
    const impact = Math.round(citySales * (idx < 2 ? 0.06 : idx < 5 ? 0.04 : 0.025));
    return {
      city: c.city,
      sales: citySales,
      participation: c.participation,
      estimated_impact_cop: impact,
      priority: idx < 2 ? "P1" : idx < 5 ? "P2" : "P3",
    };
  });

  const productOpportunities = lowRotationProducts.slice(0, 10).map((p, idx) => {
    const estimated = Math.max(0, Math.round((estimatedRecoveryBase / 10) * (1 - idx * 0.05)));
    return {
      product: p.name,
      sales: p.sales,
      qty: p.qty,
      estimated_recovery_cop: estimated,
      priority: idx < 3 ? "P1" : idx < 7 ? "P2" : "P3",
    };
  });

  const cityTrafficLight = topCities.slice(0, 8).map((c, idx) => {
    const share = toNum(c.participation);
    const color = share >= 0.12 ? "verde" : share >= 0.07 ? "amarillo" : "rojo";
    return {
      city: c.city,
      color,
      rule: "participacion_en_ventas",
      value: share,
      priority: idx < 2 ? "P1" : idx < 5 ? "P2" : "P3",
    };
  });

  const hasCoreSales = rows.length > 0;
  const hasPos = posRows.length > 0;
  const hasTrafficDaily = dailyTraffic.length > 0;
  const hasTrafficHourly = hourlyTraffic.length > 0;
  const hasNewCustomerSignal = monthlyNewCustomers.length > 0;
  const hasCityPlanSignal = topCities.length > 0;

  const macroCoverageMatrix = [
    { block: "Dinamica general de ventas", status: hasCoreSales ? "ok" : "faltante_datos", reason: hasCoreSales ? "Se cargaron ventas Macro/Hoja8." : "No hay registros en metrocas_sales_records." },
    { block: "Ranking por cliente/segmento/linea/categoria/producto/ciudad", status: hasCoreSales ? "ok" : "faltante_datos", reason: hasCoreSales ? "Se calcularon rankings desde ventas." : "Sin base para rankings." },
    { block: "KPI cliente nuevo", status: hasNewCustomerSignal ? "ok" : "faltante_datos", reason: hasNewCustomerSignal ? "Se infiere por primera compra por cliente y mes." : "No hay fechas validas por cliente para inferir nuevos." },
    { block: "KPI cotizaciones", status: "faltante_datos", reason: "No existe tabla/medida estructurada de cotizaciones persistida en este flujo." },
    { block: "KPI profundizacion de mercado", status: hasCoreSales ? "ok" : "faltante_datos", reason: hasCoreSales ? "Se usa concentracion, mix y recurrencia como proxy." : "Sin ventas para medir profundidad." },
    { block: "Analisis POS", status: hasPos ? "ok" : "faltante_datos", reason: hasPos ? "Se cargaron registros Macro POS." : "No hay registros en metrocas_pos_sales_records." },
    { block: "Trafico por dia", status: hasTrafficDaily ? "ok" : "faltante_datos", reason: hasTrafficDaily ? "Se cargaron visitas diarias por sede." : "No hay registros en metrocas_daily_traffic." },
    { block: "Trafico por horas", status: hasTrafficHourly ? "ok" : "faltante_datos", reason: hasTrafficHourly ? "Se cargaron visitas por franja horaria." : "No hay registros en metrocas_hourly_traffic." },
    { block: "Plan de trabajo por ciudad", status: hasCityPlanSignal ? "ok" : "faltante_datos", reason: hasCityPlanSignal ? "Se prioriza por ranking de ciudades y participacion." : "No hay base de ciudades para priorizar." },
  ];

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
      branchRanking,
      topCustomers,
      topProducts,
      lowRotationProducts,
      categoriesToStrengthen,
      monthlyNewCustomers,
      posSummary: {
        posRows: posRows.length,
        posTotal,
        posVsMainShare: totalSales ? posTotal / totalSales : 0,
        posCityRanking,
      },
      trafficSummary: {
        dailyRows: dailyTraffic.length,
        hourlyRows: hourlyTraffic.length,
        totalVisits: trafficTotalVisits,
        trafficBranchRanking,
        peakHours,
      },
      workPlanByCityBase: topCities.slice(0, 6).map((x, idx) => ({
        city: x.city,
        priority: idx < 2 ? "P1" : idx < 4 ? "P2" : "P3",
        sales: x.sales,
        participation: x.participation,
        objective: idx < 2 ? "Defender y escalar frecuencia de cartera top." : "Recuperar participacion con foco en categorias en caida.",
      })),
      concentration: {
        topCustomerShare: topCustomers[0]?.participation || 0,
        topProductShare: topProducts[0]?.participation || 0,
        top3CustomerShare,
        top5ProductShare,
      },
      opportunityModel: {
        estimatedRecoveryBase,
        cityOpportunities,
        productOpportunities,
        cityTrafficLight,
      },
      macroCoverageMatrix,
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
