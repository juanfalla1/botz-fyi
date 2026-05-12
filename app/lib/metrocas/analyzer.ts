import type {
  DatasetValidation,
  MetrocasAlert,
  MetrocasDashboardPayload,
  MetrocasKpis,
  MetrocasRecommendation,
  MetrocasSalesRecord,
} from "@/app/lib/metrocas/types";

const REQUIRED = ["fecha", "cliente", "producto", "cantidad"];
const EXPECTED = [
  "fecha",
  "cliente",
  "producto",
  "categoria",
  "cantidad",
  "precio_unitario",
  "costo_unitario",
  "total_venta",
  "stock_actual",
  "vendedor",
  "ciudad",
  "departamento",
  "region",
  "canal",
];

export function validateColumns(cols: string[]): DatasetValidation {
  const normalized = new Set(cols.map((c) => c.trim().toLowerCase()));
  const criticalErrors = REQUIRED.filter((c) => !normalized.has(c)).map((c) => `Falta columna critica: ${c}`);
  const optionalMissing = EXPECTED.filter((c) => !normalized.has(c) && !REQUIRED.includes(c));
  const warnings = [
    !normalized.has("costo_unitario") ? "Sin costo_unitario: se omite analisis de margenes." : "",
    !normalized.has("stock_actual") ? "Sin stock_actual: se omite analisis de inventario." : "",
    !normalized.has("vendedor") ? "Sin vendedor: se omite analisis comercial por vendedor." : "",
  ].filter(Boolean);
  return { criticalErrors, warnings, optionalMissing, valid: criticalErrors.length === 0 };
}

const toNum = (value: unknown) => {
  if (value === null || value === undefined || value === "") return 0;
  const num = Number(String(value).replace(/,/g, "."));
  return Number.isFinite(num) ? num : 0;
};

const month = (d: string) => d.slice(0, 7);

export function normalizeRows(rawRows: Record<string, unknown>[]): MetrocasSalesRecord[] {
  return rawRows.map((r) => {
    const unitPrice = toNum(r.precio_unitario);
    const quantity = toNum(r.cantidad);
    const unitCost = r.costo_unitario === undefined ? null : toNum(r.costo_unitario);
    const totalSale = r.total_venta === undefined ? unitPrice * quantity : toNum(r.total_venta);
    return {
      fecha: String(r.fecha || "").slice(0, 10),
      cliente: String(r.cliente || ""),
      producto: String(r.producto || ""),
      categoria: String(r.categoria || "Sin categoria"),
      cantidad: quantity,
      precio_unitario: unitPrice,
      costo_unitario: unitCost,
      total_venta: totalSale,
      stock_actual: r.stock_actual === undefined ? null : toNum(r.stock_actual),
      vendedor: String(r.vendedor || ""),
      ciudad: String(r.ciudad || "Sin ciudad"),
      departamento: String(r.departamento || ""),
      region: String(r.region || ""),
      canal: String(r.canal || ""),
      country: "Colombia",
    };
  });
}

function topN<T>(items: T[], score: (i: T) => number, n = 10) {
  return [...items].sort((a, b) => score(b) - score(a)).slice(0, n);
}

export function buildDashboard(datasetId: string, rows: MetrocasSalesRecord[]): MetrocasDashboardPayload {
  const totalSales = rows.reduce((acc, r) => acc + (r.total_venta || 0), 0);
  const withMargin = rows.filter((r) => typeof r.costo_unitario === "number");
  const grossMarginValue = withMargin.reduce(
    (acc, r) => acc + ((r.total_venta || 0) - (r.costo_unitario || 0) * r.cantidad),
    0,
  );
  const grossMargin = withMargin.length ? grossMarginValue : null;
  const estimatedProfit = grossMargin;
  const avgTicket = rows.length ? totalSales / rows.length : 0;

  const byMonth = new Map<string, number>();
  rows.forEach((r) => byMonth.set(month(r.fecha), (byMonth.get(month(r.fecha)) || 0) + (r.total_venta || 0)));
  const monthlySales = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([period, sales]) => ({ period, sales }));
  const current = monthlySales[monthlySales.length - 1]?.sales || 0;
  const previous = monthlySales[monthlySales.length - 2]?.sales || 0;
  const variation = previous > 0 ? ((current - previous) / previous) * 100 : 0;

  const customerTotals = new Map<string, number>();
  const customerFreq = new Map<string, number>();
  const productTotals = new Map<string, number>();
  const categoryTotals = new Map<string, number>();
  const cityTotals = new Map<string, number>();
  const cityMargins = new Map<string, number>();
  rows.forEach((r) => {
    customerTotals.set(r.cliente, (customerTotals.get(r.cliente) || 0) + (r.total_venta || 0));
    customerFreq.set(r.cliente, (customerFreq.get(r.cliente) || 0) + 1);
    productTotals.set(r.producto, (productTotals.get(r.producto) || 0) + (r.total_venta || 0));
    categoryTotals.set(r.categoria, (categoryTotals.get(r.categoria) || 0) + (r.total_venta || 0));
    cityTotals.set(r.ciudad || "Sin ciudad", (cityTotals.get(r.ciudad || "Sin ciudad") || 0) + (r.total_venta || 0));
    if (typeof r.costo_unitario === "number") {
      cityMargins.set(r.ciudad || "Sin ciudad", (cityMargins.get(r.ciudad || "Sin ciudad") || 0) + ((r.total_venta || 0) - (r.costo_unitario || 0) * r.cantidad));
    }
  });

  const topProducts = topN([...productTotals.entries()], (i) => i[1]).map(([name, sales]) => ({ name, sales, margin: null, city: "Global" }));
  const topCustomers = topN([...customerTotals.entries()], (i) => i[1]).map(([name, sales]) => ({
    name,
    sales,
    frequency: customerFreq.get(name) || 0,
    city: rows.find((r) => r.cliente === name)?.ciudad || "Sin ciudad",
  }));
  const salesByCategory = [...categoryTotals.entries()].map(([name, sales]) => ({ name, sales }));

  const cityRanking = [...cityTotals.entries()].map(([city, sales]) => ({
    city,
    sales,
    margin: cityMargins.get(city) || 0,
    growth: 0,
  })).sort((a, b) => b.sales - a.sales);

  const cityCategoryHeatmap = rows.map((r) => ({ city: r.ciudad || "Sin ciudad", category: r.categoria, sales: r.total_venta || 0 }));

  const alerts: MetrocasAlert[] = [];
  if (variation < 0) {
    alerts.push({
      title: `Ventas bajaron ${Math.abs(variation).toFixed(1)}% frente al mes anterior`,
      description: "Se detecta una contraccion mensual en ventas globales.",
      severity: Math.abs(variation) > 20 ? "critical" : "high",
      recommendation: "Ajustar mix de productos y activar campaña de recuperacion.",
      expectedImpact: "Recuperar entre 8% y 15% del ingreso mensual.",
      suggestedAction: "Priorizar categorias con mayor margen y menor caida.",
      type: "sales_drop",
    });
  }
  const recommendations: MetrocasRecommendation[] = [
    {
      type: "inventario",
      priority: "P1",
      title: "Recompra de productos de alta demanda",
      description: "Identificar top productos en ciudades lideres y priorizar abastecimiento.",
      expectedImpact: "Reducir quiebres de stock y mejorar conversion de venta.",
      actionPlan: "Generar orden de compra por ciudad para 30 dias.",
      supportingData: `Top ciudad por ventas: ${cityRanking[0]?.city || "N/A"}`,
    },
  ];

  const kpis: MetrocasKpis = {
    totalSales,
    grossMargin,
    estimatedProfit,
    avgTicket,
    monthlyGrowth: Math.max(variation, 0),
    monthlyDrop: Math.min(variation, 0),
    activeCustomers: customerTotals.size,
    inactiveCustomers: 0,
    activeProducts: productTotals.size,
    noRotationProducts: 0,
    criticalStock: rows.filter((r) => (r.stock_actual || 0) > 0 && (r.stock_actual || 0) < 5).length,
    opportunitiesDetected: recommendations.length,
    criticalAlerts: alerts.filter((a) => a.severity === "critical").length,
    generatedRecommendations: recommendations.length,
    cityTopSales: cityRanking[0]?.city || "N/A",
    cityTopGrowth: cityRanking[0]?.city || "N/A",
    cityTopDrop: cityRanking[cityRanking.length - 1]?.city || "N/A",
    cityTopMargin: [...cityMargins.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A",
    cityTopActiveCustomers: cityRanking[0]?.city || "N/A",
    cityTopNoRotation: cityRanking[0]?.city || "N/A",
    cityTopOpportunity: cityRanking[0]?.city || "N/A",
  };

  return {
    datasetId,
    kpis,
    monthlySales,
    salesByCategory,
    topProducts,
    topCustomers,
    cityRanking,
    cityCategoryHeatmap,
    alerts,
    recommendations,
    aiInsights: null,
  };
}
