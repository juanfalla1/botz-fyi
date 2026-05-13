import { NextResponse } from "next/server";
import { resolveTenant } from "@/app/api/metrocas/_shared";
import { getServiceSupabase } from "@/app/api/_utils/supabase";

function toNum(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function isValidDateLabel(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function excelSerialToIso(value: number) {
  const utcDays = Math.floor(value - 25569);
  const utcValue = utcDays * 86400;
  const dateInfo = new Date(utcValue * 1000);
  if (Number.isNaN(dateInfo.getTime())) return "";
  return dateInfo.toISOString().slice(0, 10);
}

function anyDateToIso(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === "number" && Number.isFinite(value)) {
    const iso = excelSerialToIso(value);
    if (isValidDateLabel(iso)) return iso;
  }
  const s = String(value || "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return "";
}

export async function GET(req: Request) {
  try {
    const access = await resolveTenant(req);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
    const datasetId = new URL(req.url).searchParams.get("dataset_id");
    if (!datasetId) return NextResponse.json({ error: "dataset_id es requerido" }, { status: 400 });
    const svc = getServiceSupabase();
    if (!svc) return NextResponse.json({ error: "Supabase no configurado" }, { status: 500 });

    const batchSize = 1000;
    const allRecords: any[] = [];
    let offset = 0;
    while (true) {
      let q = svc
        .from("metrocas_sales_records")
        .select("*")
        .eq("dataset_id", datasetId)
        .range(offset, offset + batchSize - 1);
      q = access.tenantId ? q.eq("tenant_id", access.tenantId) : q.is("tenant_id", null);
      const page = await q;
      if (page.error) return NextResponse.json({ error: page.error.message }, { status: 500 });
      const rows = page.data || [];
      allRecords.push(...rows);
      if (rows.length < batchSize) break;
      offset += batchSize;
      if (offset > 500000) break;
    }

    const items = allRecords.map((row: any) => {
      const raw = row.raw_data || {};
      const amount = toNum(row.balance ?? row.total_sale ?? row.amount_currency ?? raw.balance ?? raw.total_sale ?? raw.total_venta);
      const qty = toNum(row.quantity ?? raw.quantity ?? raw.cantidad);
      const rawDateFallback =
        row.sale_date ??
        row.invoice_date ??
        raw.sale_date ??
        raw.invoice_date ??
        raw.fecha ??
        raw["Líneas de factura/Fecha de factura"] ??
        raw["Lineas de factura/Fecha de factura"] ??
        raw["L�neas de factura/Fecha de factura"];
      const date = anyDateToIso(rawDateFallback);
      const month = date ? date.slice(0, 7) : "Sin fecha";
      const city = String(row.city || raw.city || raw.ciudad || "EN BLANCO").trim() || "EN BLANCO";
      const branch = String(row.journal || row.seller || row.channel || raw.journal || raw.canal || "SIN SEDE").trim() || "SIN SEDE";
      const segment = String(row.segment || raw.segment || "En blanco").trim() || "En blanco";
      const customer = String(row.customer_name || raw.customer_name || raw.cliente || "Sin cliente").trim() || "Sin cliente";
      const category = String(row.category || row.product_category || raw.category || raw.product_category || raw.categoria || "Sin categoria").trim() || "Sin categoria";
      const product = String(row.product_name || raw.product_name || raw.producto || "Sin producto").trim() || "Sin producto";
      return { amount, qty, date, month, city, branch, segment, customer, category, product };
    });

    const totalSales = items.reduce((a, i) => a + i.amount, 0);
    const totalQty = items.reduce((a, i) => a + i.qty, 0);
    const avgTicket = items.length ? totalSales / items.length : 0;

    const by = (key: keyof (typeof items)[number]) => {
    const m = new Map<string, { sales: number; qty: number }>();
    items.forEach((i) => {
      const k = String(i[key] || "EN BLANCO");
      const v = m.get(k) || { sales: 0, qty: 0 };
      v.sales += i.amount;
      v.qty += i.qty;
      m.set(k, v);
    });
    return [...m.entries()].map(([label, v]) => ({ label, sales: v.sales, quantity: v.qty, participation: totalSales ? v.sales / totalSales : 0 })).sort((a, b) => b.sales - a.sales);
    };

    const dailySales = by("date")
      .filter((x) => isValidDateLabel(x.label))
      .map((x) => ({ date: x.label, sales: x.sales }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const byMonthMap = new Map<string, number>();
    dailySales.forEach((d) => {
      const m = d.date.slice(0, 7);
      byMonthMap.set(m, (byMonthMap.get(m) || 0) + d.sales);
    });
    const monthlySales = [...byMonthMap.entries()]
      .map(([period, sales]) => ({ period, sales }))
      .sort((a, b) => a.period.localeCompare(b.period));

    const meaningfulMonths = monthlySales.filter((m) => m.sales > totalSales * 0.005);
    const prev = meaningfulMonths[meaningfulMonths.length - 2]?.sales || 0;
    const curr = meaningfulMonths[meaningfulMonths.length - 1]?.sales || 0;
    const rawGrowth = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
    const growth = Number.isFinite(rawGrowth) ? Math.max(Math.min(rawGrowth, 500), -500) : 0;

    const cityRankingRaw = by("city").slice(0, 20);
    const cityRanking = cityRankingRaw.map((x) => ({ city: x.label, sales: x.sales, margin: 0, growth: 0 }));
    const categoryRanking = by("category");
    const segmentRanking = by("segment");
    const productRanking = by("product");
    const customerRanking = by("customer");
    const branchRanking = by("branch");

    const branchMap = new Map<string, { total: number; qty: number; segments: Map<string, { total: number; qty: number; customers: Map<string, { total: number; qty: number }> }> }>();
    items.forEach((i) => {
    const b = branchMap.get(i.branch) || { total: 0, qty: 0, segments: new Map() };
    b.total += i.amount;
    b.qty += i.qty;
    const s = b.segments.get(i.segment) || { total: 0, qty: 0, customers: new Map() };
    s.total += i.amount;
    s.qty += i.qty;
    const c = s.customers.get(i.customer) || { total: 0, qty: 0 };
    c.total += i.amount;
    c.qty += i.qty;
    s.customers.set(i.customer, c);
    b.segments.set(i.segment, s);
    branchMap.set(i.branch, b);
    });

    const branch_analysis = [...branchMap.entries()]
    .map(([branch, b]) => ({
      branch,
      total_sales: b.total,
      total_quantity: b.qty,
      segments: [...b.segments.entries()]
        .map(([segment, s]) => ({
          segment,
          sales: s.total,
          quantity: s.qty,
          top_customers: [...s.customers.entries()]
            .map(([customer, c]) => ({ customer, sales: c.total, quantity: c.qty }))
            .sort((a, z) => z.sales - a.sales)
            .slice(0, 10),
        }))
        .sort((a, z) => z.sales - a.sales),
    }))
      .sort((a, z) => z.total_sales - a.total_sales);

    const cityTopSales = cityRanking[0]?.city || "EN BLANCO";
    const cityTopOpportunity = cityRanking[1]?.city || cityTopSales;

    const alerts = [] as Array<{
      title: string;
      description: string;
      severity: "low" | "medium" | "high" | "critical";
      recommendation: string;
      expectedImpact: string;
      suggestedAction: string;
      type: string;
    }>;

    if (growth < 0) {
      alerts.push({
        title: `Ventas bajaron ${Math.abs(growth).toFixed(1)}% frente al periodo anterior`,
        description: "Se detecta contraccion en la comparacion mensual de ventas.",
        severity: Math.abs(growth) >= 20 ? "critical" : "high",
        recommendation: "Priorizar recuperacion de clientes top y categorias de mayor margen.",
        expectedImpact: "Recuperar entre 5% y 12% del ingreso del siguiente mes.",
        suggestedAction: "Activar plan comercial de 30 dias por sede y segmento.",
        type: "sales_drop",
      });
    }

    const topProduct = productRanking[0];
    if (topProduct && topProduct.participation > 0.25) {
      alerts.push({
        title: `Alta concentracion en producto ${topProduct.label}`,
        description: `Este producto concentra ${(topProduct.participation * 100).toFixed(1)}% de la venta total.`,
        severity: topProduct.participation > 0.4 ? "high" : "medium",
        recommendation: "Reducir dependencia ampliando mix en productos de la misma linea.",
        expectedImpact: "Menor riesgo comercial ante variaciones de demanda.",
        suggestedAction: "Promover 3 productos alternativos en las sedes principales.",
        type: "concentration_risk",
      });
    }

    const recommendations = [] as Array<{
      type: string;
      priority: "P1" | "P2" | "P3";
      title: string;
      description: string;
      expectedImpact: string;
      actionPlan: string;
      supportingData: string;
    }>;

    if (customerRanking.length) {
      const topCustomer = customerRanking[0];
      recommendations.push({
        type: "ventas",
        priority: "P1",
        title: "Recuperar frecuencia de clientes clave",
        description: "Los clientes top deben sostener la frecuencia para proteger ingreso mensual.",
        expectedImpact: "Incremento estimado de 3% a 8% en ventas del proximo periodo.",
        actionPlan: "Secuencia comercial de 30 dias con seguimiento semanal por asesor.",
        supportingData: `Cliente top actual: ${topCustomer.label} (${topCustomer.sales.toLocaleString("es-CO")}).`,
      });
    }

    if (branchRanking.length > 1) {
      const topBranch = branchRanking[0];
      const tailBranch = branchRanking[branchRanking.length - 1];
      recommendations.push({
        type: "sedes",
        priority: "P2",
        title: "Cerrar brecha de desempeno entre sedes",
        description: "Existe diferencia relevante entre sedes lideres y rezagadas.",
        expectedImpact: "Mejora de cobertura comercial en zonas de baja conversion.",
        actionPlan: "Replicar practicas de la sede lider y reforzar seguimiento en la sede rezagada.",
        supportingData: `Top: ${topBranch.label} (${topBranch.sales.toLocaleString("es-CO")}) | Rezagada: ${tailBranch.label} (${tailBranch.sales.toLocaleString("es-CO")}).`,
      });
    }

    const dashboard = {
    datasetId,
    kpis: {
      totalSales,
      grossMargin: 0,
      estimatedProfit: 0,
      avgTicket,
      monthlyGrowth: Math.max(growth, 0),
      monthlyDrop: Math.min(growth, 0),
      activeCustomers: customerRanking.length,
      inactiveCustomers: 0,
      activeProducts: productRanking.length,
      noRotationProducts: 0,
      criticalStock: 0,
      opportunitiesDetected: segmentRanking.length,
      criticalAlerts: alerts.filter((a) => a.severity === "critical").length,
      generatedRecommendations: recommendations.length,
      cityTopSales,
      cityTopGrowth: cityTopSales,
      cityTopDrop: cityRanking[cityRanking.length - 1]?.city || "EN BLANCO",
      cityTopMargin: cityTopSales,
      cityTopActiveCustomers: cityTopSales,
      cityTopNoRotation: cityTopSales,
      cityTopOpportunity,
    },
    monthlySales,
    salesByCategory: categoryRanking.slice(0, 12).map((x) => ({ name: x.label, sales: x.sales })),
    topProducts: productRanking.slice(0, 12).map((x) => ({ name: x.label, sales: x.sales, margin: 0, city: "Global" })),
    topCustomers: customerRanking.slice(0, 12).map((x) => ({ name: x.label, sales: x.sales, frequency: x.quantity, city: "Global" })),
    cityRanking,
    cityCategoryHeatmap: [],
    alerts,
    recommendations,
    aiInsights: null,
    };

    const rankings = [
    ...segmentRanking.map((x, idx) => ({ ranking_type: "segment", ranking_label: x.label, quantity_total: x.quantity, balance_total: x.sales, participation: x.participation, ranking_order: idx + 1 })),
    ...customerRanking.map((x, idx) => ({ ranking_type: "customer", ranking_label: x.label, quantity_total: x.quantity, balance_total: x.sales, participation: x.participation, ranking_order: idx + 1 })),
    ...productRanking.map((x, idx) => ({ ranking_type: "product", ranking_label: x.label, quantity_total: x.quantity, balance_total: x.sales, participation: x.participation, ranking_order: idx + 1 })),
    ...branchRanking.map((x, idx) => ({ ranking_type: "branch", ranking_label: x.label, quantity_total: x.quantity, balance_total: x.sales, participation: x.participation, ranking_order: idx + 1 })),
    ...cityRanking.map((x, idx) => ({ ranking_type: "city", ranking_label: x.city, quantity_total: 0, balance_total: x.sales, participation: totalSales ? x.sales / totalSales : 0, ranking_order: idx + 1 })),
    ];

    const MAX_FACTS = 12000;
    const facts = items.length > MAX_FACTS ? items.slice(items.length - MAX_FACTS) : items;

    return NextResponse.json({
      ok: true,
      dashboard,
      rankings,
      daily_sales: dailySales,
      branch_sales: branchRanking.map((x) => ({ branch: x.label, sales: x.sales, quantity: x.quantity })),
      branch_analysis,
      facts,
      facts_truncated: items.length > MAX_FACTS,
      facts_total: items.length,
      months_detected: monthlySales.map((m) => m.period),
      growth_context: meaningfulMonths.length < 2 ? "insufficient_periods" : "ok",
      date_diagnostics: {
        rows_total: items.length,
        rows_with_valid_date: items.filter((i) => isValidDateLabel(i.date)).length,
        rows_without_valid_date: items.filter((i) => !isValidDateLabel(i.date)).length,
        fetched_rows: allRecords.length,
      },
      source: "macro_only",
      totals: { total_sales: totalSales, total_quantity: totalQty, rows: items.length },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "Dashboard macro-only fallo",
        details: error?.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}
