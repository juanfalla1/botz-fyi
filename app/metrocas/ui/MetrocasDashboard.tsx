"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MetrocasDashboardPayload } from "@/app/lib/metrocas/types";
import s from "@/app/metrocas/ui/metrocas-theme.module.css";

const chartBoxStyle = { height: 300, width: "100%" } as const;

const sample: MetrocasDashboardPayload = {
  datasetId: "sample",
  kpis: {
    totalSales: 128000000,
    grossMargin: 39000000,
    estimatedProfit: 39000000,
    avgTicket: 350000,
    monthlyGrowth: 11.2,
    monthlyDrop: -4.4,
    activeCustomers: 280,
    inactiveCustomers: 44,
    activeProducts: 620,
    noRotationProducts: 53,
    criticalStock: 27,
    opportunitiesDetected: 12,
    criticalAlerts: 4,
    generatedRecommendations: 9,
    cityTopSales: "Bogota",
    cityTopGrowth: "Medellin",
    cityTopDrop: "Cucuta",
    cityTopMargin: "Bogota",
    cityTopActiveCustomers: "Bogota",
    cityTopNoRotation: "Cali",
    cityTopOpportunity: "Barranquilla",
  },
  monthlySales: [{ period: "2026-01", sales: 22 }, { period: "2026-02", sales: 27 }, { period: "2026-03", sales: 34 }, { period: "2026-04", sales: 31 }],
  salesByCategory: [{ name: "Equipos", sales: 41 }, { name: "Consumibles", sales: 22 }, { name: "Repuestos", sales: 17 }],
  topProducts: [{ name: "Producto A", sales: 16, margin: 33, city: "Bogota" }, { name: "Producto B", sales: 11, margin: 23, city: "Medellin" }],
  topCustomers: [{ name: "Cliente A", sales: 18, frequency: 7, city: "Bogota" }, { name: "Cliente B", sales: 9, frequency: 4, city: "Cali" }],
  cityRanking: [{ city: "Bogota", sales: 32, margin: 14, growth: 8 }, { city: "Medellin", sales: 27, margin: 11, growth: 13 }, { city: "Cali", sales: 19, margin: 8, growth: -4 }],
  cityCategoryHeatmap: [{ city: "Bogota", category: "Equipos", sales: 18 }],
  alerts: [{ title: "Ventas bajaron 18%", description: "Caida concentrada en equipos.", severity: "high", recommendation: "Ajustar portafolio", expectedImpact: "Recuperar 9%", suggestedAction: "Campana por ciudad", type: "sales" }],
  recommendations: [{ type: "ventas", priority: "P1", title: "Recuperar clientes", description: "Clientes top redujeron frecuencia.", expectedImpact: "Subir revenue 6%", actionPlan: "Secuencia comercial 30 dias", supportingData: "22 clientes en riesgo" }],
  aiInsights: null,
};

export function MetrocasDashboard() {
  const [dashboard, setDashboard] = useState<MetrocasDashboardPayload>(sample);
  const [segmentRanking, setSegmentRanking] = useState<Array<{ label: string; balance: number }>>([]);
  const [dailySales, setDailySales] = useState<Array<{ date: string; sales: number }>>([]);
  const [branchSales, setBranchSales] = useState<Array<{ branch: string; sales: number; quantity: number }>>([]);
  const [productRanking, setProductRanking] = useState<Array<{ label: string; sales: number; quantity: number }>>([]);
  const [customerRanking, setCustomerRanking] = useState<Array<{ label: string; sales: number; quantity: number }>>([]);
  const [activeDatasetId, setActiveDatasetId] = useState<string>("sample");
  const [branchAnalysis, setBranchAnalysis] = useState<any[]>([]);
  const [tab, setTab] = useState("Resumen Ejecutivo");
  const [facts, setFacts] = useState<Array<any>>([]);
  const [selBranches, setSelBranches] = useState<string[]>([]);
  const [selSegments, setSelSegments] = useState<string[]>([]);
  const [selCities, setSelCities] = useState<string[]>([]);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [granularity, setGranularity] = useState<"acumulado" | "mensual">("acumulado");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [monthsDetected, setMonthsDetected] = useState<string[]>([]);
  const [growthContext, setGrowthContext] = useState<"ok" | "insufficient_periods">("ok");
  const [dateDiagnostics, setDateDiagnostics] = useState<{ rows_total: number; rows_with_valid_date: number; rows_without_valid_date: number } | null>(null);
  const [pricesData, setPricesData] = useState<any>(null);
  const [segmentsData, setSegmentsData] = useState<any[]>([]);
  const [categoriesData, setCategoriesData] = useState<any[]>([]);
  const [productsData, setProductsData] = useState<{ ranking: any[]; stars: any[]; lowRotation: any[] }>({ ranking: [], stars: [], lowRotation: [] });
  const [customersData, setCustomersData] = useState<any[]>([]);
  const [citiesData, setCitiesData] = useState<any[]>([]);
  const [branchesData, setBranchesData] = useState<any[]>([]);
  const [trafficData, setTrafficData] = useState<{ daily: any[]; hourly: any[]; byBranch: any[] }>({ daily: [], hourly: [], byBranch: [] });
  const tabs = [
    "Resumen Ejecutivo",
    "Ventas por Dia",
    "Trafico",
    "Dinamica General",
    "Rankings",
    "KPIs",
    "POS",
    "Ciudades",
    "Planes de Trabajo",
    "Anexos",
    "IA Estrategica",
  ];

  const loadAnalytics = async (datasetId: string) => {
    const endpoints = [
      "/api/metrocas/prices",
      "/api/metrocas/segments",
      "/api/metrocas/categories",
      "/api/metrocas/products",
      "/api/metrocas/customers",
      "/api/metrocas/cities",
      "/api/metrocas/branches",
      "/api/metrocas/traffic",
    ];

    const settled = await Promise.allSettled(
      endpoints.map((endpoint) => fetch(`${endpoint}?dataset_id=${encodeURIComponent(datasetId)}`).then((r) => r.json())),
    );

    const [prices, segments, categories, products, customers, cities, branches, traffic] = settled.map((r) =>
      r.status === "fulfilled" ? r.value : null,
    );

    setPricesData(prices?.ok ? prices : null);
    setSegmentsData(segments?.ok ? segments.ranking || [] : []);
    setCategoriesData(categories?.ok ? categories.ranking || [] : []);
    setProductsData(
      products?.ok
        ? {
            ranking: products.ranking || [],
            stars: products.stars || [],
            lowRotation: products.lowRotation || [],
          }
        : { ranking: [], stars: [], lowRotation: [] },
    );
    setCustomersData(customers?.ok ? customers.ranking || [] : []);
    setCitiesData(cities?.ok ? cities.ranking || [] : []);
    setBranchesData(branches?.ok ? branches.ranking || [] : []);
    setTrafficData(
      traffic?.ok
        ? {
            daily: traffic.daily || [],
            hourly: traffic.hourly || [],
            byBranch: traffic.byBranch || [],
          }
        : { daily: [], hourly: [], byBranch: [] },
    );
  };
  const effectiveDashboard = useMemo(() => {
    if (dashboard && (dashboard as any).kpis) return dashboard;
    return sample;
  }, [dashboard]);

  const cards = useMemo(
    () => [
      ["Ventas totales", effectiveDashboard.kpis.totalSales],
      ["Margen bruto", effectiveDashboard.kpis.grossMargin || 0],
      ["Ticket promedio", effectiveDashboard.kpis.avgTicket],
      ["Crecimiento mensual", `${effectiveDashboard.kpis.monthlyGrowth}%`],
      ["Caida mensual", `${effectiveDashboard.kpis.monthlyDrop}%`],
      ["Alertas criticas", effectiveDashboard.kpis.criticalAlerts],
      ["Ciudad top ventas", effectiveDashboard.kpis.cityTopSales],
      ["Ciudad mayor oportunidad", effectiveDashboard.kpis.cityTopOpportunity],
    ],
    [effectiveDashboard],
  );

  const money = (v: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
      Number(v || 0),
    );

  const compactNum = (v: number) =>
    new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(Number(v || 0));

  const pct = (v: number) => {
    const n = Number(v || 0);
    if (!Number.isFinite(n)) return "0%";
    return `${n.toLocaleString("es-CO", { maximumFractionDigits: 2 })}%`;
  };

  useEffect(() => {
    const loadById = (datasetId: string) => {
      fetch(`/api/metrocas/dashboard?dataset_id=${encodeURIComponent(datasetId)}`)
        .then((r) => r.json())
        .then((json) => {
          if (!json?.ok) return;
          setActiveDatasetId(datasetId);
          if (json.dashboard) {
            const payload = (json.dashboard?.dashboard || json.dashboard) as MetrocasDashboardPayload;
            if ((payload as any)?.kpis) setDashboard(payload);
          }
          const seg = (json.rankings || [])
            .filter((r: any) => r.ranking_type === "segment")
            .slice(0, 12)
            .map((r: any) => ({ label: r.ranking_label, balance: Number(r.balance_total || 0) }));
          const prod = (json.rankings || [])
            .filter((r: any) => r.ranking_type === "product")
            .slice(0, 20)
            .map((r: any) => ({ label: r.ranking_label, sales: Number(r.balance_total || 0), quantity: Number(r.quantity_total || 0) }));
          const cust = (json.rankings || [])
            .filter((r: any) => r.ranking_type === "customer")
            .slice(0, 20)
            .map((r: any) => ({ label: r.ranking_label, sales: Number(r.balance_total || 0), quantity: Number(r.quantity_total || 0) }));
          setSegmentRanking(seg);
          setProductRanking(prod);
          setCustomerRanking(cust);
          setDailySales((json.daily_sales || []).slice(-60));
          setBranchSales((json.branch_sales || []).sort((a: any, b: any) => Number(b.sales) - Number(a.sales)).slice(0, 12));
          setBranchAnalysis(json.branch_analysis || []);
          setMonthsDetected(json.months_detected || []);
          setGrowthContext(json.growth_context || "ok");
          setDateDiagnostics(json.date_diagnostics || null);
          const incomingFacts = json.facts || [];
          setFacts(incomingFacts);
          const allBranches = Array.from(new Set(incomingFacts.map((f: any) => String(f.branch || "SIN SEDE"))));
          const allSegments = Array.from(new Set(incomingFacts.map((f: any) => String(f.segment || "En blanco"))));
          const allCities = Array.from(new Set(incomingFacts.map((f: any) => String(f.city || "EN BLANCO"))));
          setSelBranches(allBranches);
          setSelSegments(allSegments);
          setSelCities(allCities);

          fetch(`/api/metrocas/insights?dataset_id=${encodeURIComponent(datasetId)}`)
            .then((r) => r.json())
            .then((ins) => {
              const latest = ins?.data?.[0]?.data || null;
              setAiInsights(latest);
            })
            .catch(() => setAiInsights(null));

          loadAnalytics(datasetId).catch(() => {});
        })
        .catch(() => {});
    };

    const url = new URL(window.location.href);
    const datasetId = url.searchParams.get("dataset_id");
    if (datasetId) {
      loadById(datasetId);
      return;
    }

    fetch("/api/metrocas/datasets?page=1&page_size=1")
      .then((r) => r.json())
      .then((json) => {
        const latest = json?.data?.[0]?.id;
        if (latest) loadById(latest);
      })
      .catch(() => {});
  }, []);

  const filteredFacts = useMemo(() => {
    if (!facts.length) return [];
    return facts.filter((f) => {
      const passBase =
        selBranches.includes(String(f.branch || "SIN SEDE")) &&
        selSegments.includes(String(f.segment || "En blanco")) &&
        selCities.includes(String(f.city || "EN BLANCO"));
      if (!passBase) return false;
      if (granularity === "acumulado" || selectedMonth === "all") return true;
      return String(f.month || "") === selectedMonth;
    });
  }, [facts, selBranches, selSegments, selCities, granularity, selectedMonth]);

  const aggregate = useMemo(() => {
    const byKey = (key: string) => {
      const m = new Map<string, { sales: number; qty: number }>();
      filteredFacts.forEach((f) => {
        const k = String(f[key] || "EN BLANCO");
        const v = m.get(k) || { sales: 0, qty: 0 };
        v.sales += Number(f.amount || 0);
        v.qty += Number(f.qty || 0);
        m.set(k, v);
      });
      return [...m.entries()].map(([label, v]) => ({ label, sales: v.sales, quantity: v.qty })).sort((a, b) => b.sales - a.sales);
    };
    return {
      byDate: byKey("date").sort((a, b) => a.label.localeCompare(b.label)),
      byBranch: byKey("branch"),
      bySegment: byKey("segment"),
      byCity: byKey("city"),
      byCategory: byKey("category"),
      byProduct: byKey("product"),
      byCustomer: byKey("customer"),
      totalSales: filteredFacts.reduce((a, f) => a + Number(f.amount || 0), 0),
    };
  }, [filteredFacts]);

  const workPlans = useMemo(() => {
    return aggregate.byBranch.slice(0, 8).map((b) => {
      const branchFacts = filteredFacts.filter((f) => String(f.branch) === b.label);
      const bySeg = new Map<string, number>();
      branchFacts.forEach((f) => bySeg.set(String(f.segment || "En blanco"), (bySeg.get(String(f.segment || "En blanco")) || 0) + Number(f.amount || 0)));
      const weakSegments = [...bySeg.entries()].sort((a, z) => a[1] - z[1]).slice(0, 2).map(([s]) => s);
      const topSegments = [...bySeg.entries()].sort((a, z) => z[1] - a[1]).slice(0, 2).map(([s]) => s);
      return {
        branch: b.label,
        totalSales: b.sales,
        weakSegments,
        topSegments,
        objectives: [
          `Incrementar ventas en ${weakSegments.join(", ") || "segmentos de baja participacion"}`,
          `Proteger participacion en ${topSegments.join(", ") || "segmentos lideres"}`,
        ],
        actions: [
          "Activar seguimiento de cotizaciones pendientes por cliente top",
          "Priorizar visitas comerciales en zonas de menor conversion",
          "Campana de recompra para clientes con caida de frecuencia",
        ],
      };
    });
  }, [aggregate.byBranch, filteredFacts]);

  const annexes = useMemo(() => {
    return aggregate.byBranch.slice(0, 8).map((b) => {
      const risk = b.sales < (aggregate.totalSales / Math.max(aggregate.byBranch.length, 1)) * 0.6;
      return {
        branch: b.label,
        observation: risk
          ? "Desempeno por debajo del promedio de red"
          : "Desempeno estable en el periodo",
        pendingOrders: Math.max(0, Math.round((b.quantity || 0) * 0.03)),
        delayDays: risk ? 7 : 2,
        netAmount: Math.round((b.sales || 0) * 0.04),
      };
    });
  }, [aggregate.byBranch, aggregate.totalSales]);

  async function generateAiStrategic() {
    if (activeDatasetId === "sample") return;
    setAiLoading(true);
    setAiMessage("");
    try {
      const res = await fetch("/api/metrocas/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dataset_id: activeDatasetId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAiMessage(json?.details ? `${json.error}: ${json.details}` : json?.error || "No se pudo generar analisis");
        return;
      }
      if (json?.insights) {
        setAiInsights(json.insights);
        setAiMessage(json?.source === "fallback_no_key" ? "Analisis generado sin OPENAI_API_KEY (modo fallback)." : "Analisis IA generado correctamente.");
      } else {
        setAiMessage("La API respondio sin insights. Revisa configuracion.");
      }
    } finally {
      setAiLoading(false);
    }
  }

  const allBranches = useMemo(() => Array.from(new Set(facts.map((f) => String(f.branch || "SIN SEDE")))), [facts]);
  const allSegments = useMemo(() => Array.from(new Set(facts.map((f) => String(f.segment || "En blanco")))), [facts]);
  const allCities = useMemo(() => Array.from(new Set(facts.map((f) => String(f.city || "EN BLANCO")))), [facts]);

  const toggle = (arr: string[], set: (v: string[]) => void, item: string) => {
    set(arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]);
  };

  return (
    <main className={`${s.metrocasRoot} ${s.lightSurface}`}>
      <div className={s.topNav}>
        <div className={`${s.container} ${s.topNavInner}`}>
          <div className={s.brand}>Metricas Intelligence</div>
          <div className={s.navActions}>
            <a href="/metrocas" className={s.btnSecondary}>Volver al landing</a>
            <a href="/intelligence/upload" className={s.btnPrimary}>Subir dataset</a>
          </div>
        </div>
      </div>
      <div className={s.container} style={{ padding: "18px 0 34px" }}>
        <h1 className={s.sectionTitle}>Dashboard Ejecutivo</h1>
        <p className={s.muted}>Dataset activo: {activeDatasetId}</p>
        <p className={s.muted}>Meses detectados: {monthsDetected.length ? monthsDetected.join(", ") : "Sin fecha valida"}</p>
        <div className={s.navActions} style={{ marginBottom: 8 }}>
          <button className={granularity === "acumulado" ? s.btnPrimary : s.btnSecondary} onClick={() => setGranularity("acumulado")}>Acumulado</button>
          <button className={granularity === "mensual" ? s.btnPrimary : s.btnSecondary} onClick={() => setGranularity("mensual")}>Mensual</button>
          {granularity === "mensual" ? (
            <select
              className={s.input}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ maxWidth: 220 }}
            >
              <option value="all">Todos los meses</option>
              {monthsDetected.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          ) : null}
        </div>
        {dateDiagnostics ? (
          <p className={s.muted}>
            Fechas validas: {compactNum(dateDiagnostics.rows_with_valid_date)} / {compactNum(dateDiagnostics.rows_total)}
            {dateDiagnostics.rows_without_valid_date > 0 ? ` | Sin fecha: ${compactNum(dateDiagnostics.rows_without_valid_date)}` : ""}
          </p>
        ) : null}
        {growthContext === "insufficient_periods" ? <p className={s.muted}>Crecimiento/Caida mensual requiere al menos 2 meses con ventas.</p> : null}
        <section className={s.card} style={{ marginBottom: 12 }}>
          <button className={s.btnSecondary} onClick={() => setShowFilters((v) => !v)}>
            {showFilters ? "Ocultar filtros" : "Mostrar filtros"}
          </button>
          {showFilters ? <div className={s.grid3} style={{ marginTop: 10 }}>
            <div>
              <strong>Sedes</strong>
              <div><label><input type="checkbox" checked={selBranches.length === allBranches.length && allBranches.length > 0} onChange={(e) => setSelBranches(e.target.checked ? allBranches : [])} /> Seleccionar todas</label></div>
              {allBranches.map((b) => <div key={b}><label><input type="checkbox" checked={selBranches.includes(b)} onChange={() => toggle(selBranches, setSelBranches, b)} /> {b}</label></div>)}
            </div>
            <div>
              <strong>Segmentos</strong>
              <div><label><input type="checkbox" checked={selSegments.length === allSegments.length && allSegments.length > 0} onChange={(e) => setSelSegments(e.target.checked ? allSegments : [])} /> Seleccionar todos</label></div>
              {allSegments.map((sg) => <div key={sg}><label><input type="checkbox" checked={selSegments.includes(sg)} onChange={() => toggle(selSegments, setSelSegments, sg)} /> {sg}</label></div>)}
            </div>
            <div>
              <strong>Ciudades</strong>
              <div><label><input type="checkbox" checked={selCities.length === allCities.length && allCities.length > 0} onChange={(e) => setSelCities(e.target.checked ? allCities : [])} /> Seleccionar todas</label></div>
              {allCities.map((c) => <div key={c}><label><input type="checkbox" checked={selCities.includes(c)} onChange={() => toggle(selCities, setSelCities, c)} /> {c}</label></div>)}
            </div>
          </div> : null}
        </section>
        <div className={s.navActions} style={{ marginBottom: 12 }}>
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={tab === t ? s.btnPrimary : s.btnSecondary}
              style={{ cursor: "pointer" }}
            >
              {t}
            </button>
          ))}
        </div>
        {tab !== "Resumen Ejecutivo" ? (
          <section className={s.card}>
            <h3 style={{ marginTop: 0 }}>{tab}</h3>
            <p className={s.muted}>Vista alimentada desde Macro y rankings calculados.</p>
            {tab === "Dinamica General" && branchAnalysis.length ? (
              <div className={s.grid2} style={{ marginTop: 10 }}>
                {branchAnalysis.map((b) => (
                  <div key={b.branch} className={s.card}>
                    <strong>{b.branch}</strong>
                    <div className={s.muted}>Venta: ${Number(b.total_sales || 0).toLocaleString("es-CO")}</div>
                    <div className={s.muted}>Cantidad: {Number(b.total_quantity || 0).toLocaleString("es-CO")}</div>
                  </div>
                ))}
              </div>
            ) : null}
            {tab === "Dinamica General" && categoriesData.length ? (
              <div className={s.grid2} style={{ marginTop: 10 }}>
                <div className={s.card}>
                  <h4 style={{ marginTop: 0 }}>Categorias top</h4>
                  {categoriesData.slice(0, 8).map((c) => (
                    <div key={c.label} className={s.muted}>
                      {c.label} - {money(Number(c.sales || 0))}
                    </div>
                  ))}
                </div>
                <div className={s.card}>
                  <h4 style={{ marginTop: 0 }}>Alertas de precio</h4>
                  {(pricesData?.alerts || []).slice(0, 8).map((a: any) => (
                    <div key={`${a.type}-${a.product}`} className={s.muted}>
                      {a.product}: min {money(Number(a.minPrice || 0))} / max {money(Number(a.maxPrice || 0))}
                    </div>
                  ))}
                  {!pricesData?.alerts?.length ? <p className={s.muted}>Sin dispersiones criticas detectadas.</p> : null}
                </div>
              </div>
            ) : null}
            {tab === "Ventas por Dia" ? (
              <div className={s.grid2} style={{ marginTop: 10 }}>
                <div className={s.card}>
                  <h4 style={{ marginTop: 0 }}>Linea diaria de ventas</h4>
                  <div style={chartBoxStyle}><ResponsiveContainer width="100%" height="100%"><LineChart data={aggregate.byDate.map((d) => ({ date: d.label, sales: d.sales }))}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis tickFormatter={(v) => Number(v).toLocaleString("es-CO")} /><Tooltip formatter={(v: any) => Number(v).toLocaleString("es-CO")} /><Line type="monotone" dataKey="sales" stroke="#2563eb" /></LineChart></ResponsiveContainer></div>
                </div>
                <div className={s.card}>
                  <h4 style={{ marginTop: 0 }}>Barras por sede</h4>
                  <div style={chartBoxStyle}><ResponsiveContainer width="100%" height="100%"><BarChart data={aggregate.byBranch.map((b) => ({ branch: b.label, sales: b.sales }))}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="branch" /><YAxis tickFormatter={(v) => Number(v).toLocaleString("es-CO")} /><Tooltip formatter={(v: any) => Number(v).toLocaleString("es-CO")} /><Bar dataKey="sales" fill="#0ea5e9" /></BarChart></ResponsiveContainer></div>
                </div>
              </div>
            ) : null}
            {tab === "Trafico" ? (
              <div className={s.grid2} style={{ marginTop: 10 }}>
                <div className={s.card}>
                  <h4 style={{ marginTop: 0 }}>Trafico diario real</h4>
                  <div style={chartBoxStyle}><ResponsiveContainer width="100%" height="100%"><LineChart data={(trafficData.daily || []).map((d: any) => ({ date: d.traffic_date, count: Number(d.visits || 0) }))}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis tickFormatter={(v) => compactNum(Number(v))} /><Tooltip formatter={(v: any) => `${compactNum(Number(v))} visitas`} /><Line type="monotone" dataKey="count" stroke="#16a34a" /></LineChart></ResponsiveContainer></div>
                </div>
                <div className={s.card}>
                  <h4 style={{ marginTop: 0 }}>Trafico por sede real</h4>
                  <div style={chartBoxStyle}><ResponsiveContainer width="100%" height="100%"><BarChart data={(trafficData.byBranch || []).map((b: any) => ({ branch: b.branch, count: Number(b.visits || 0) }))}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="branch" /><YAxis tickFormatter={(v) => compactNum(Number(v))} /><Tooltip formatter={(v: any) => `${compactNum(Number(v))} visitas`} /><Bar dataKey="count" fill="#22c55e" /></BarChart></ResponsiveContainer></div>
                </div>
                <div className={s.card}>
                  <h4 style={{ marginTop: 0 }}>Trafico por hora real</h4>
                  <div style={chartBoxStyle}><ResponsiveContainer width="100%" height="100%"><BarChart data={(trafficData.hourly || []).slice(0, 24).map((h: any) => ({ hour: h.hour_slot, visits: Number(h.visits || 0) }))}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="hour" tick={{ fontSize: 10 }} /><YAxis tickFormatter={(v) => compactNum(Number(v))} /><Tooltip formatter={(v: any) => `${compactNum(Number(v))} visitas`} /><Bar dataKey="visits" fill="#0ea5e9" /></BarChart></ResponsiveContainer></div>
                </div>
                {!trafficData.daily.length && !trafficData.hourly.length ? <p className={s.muted}>No hay datos reales de trafico en este dataset. Verifica hojas "Trafico por dia" y "Trafico por horas".</p> : null}
              </div>
            ) : null}
            {tab === "Ciudades" && effectiveDashboard.cityRanking?.length ? (
              <div className={s.grid2} style={{ marginTop: 10 }}>
                {(citiesData.length ? citiesData : effectiveDashboard.cityRanking).map((c: any) => (
                  <div key={c.city} className={s.card}>
                    <strong>{c.city || c.label}</strong>
                    <div className={s.muted}>Ventas: ${Number(c.sales || 0).toLocaleString("es-CO")}</div>
                    <div className={s.muted}>Cantidad: {compactNum(Number(c.quantity || 0))}</div>
                  </div>
                ))}
              </div>
            ) : null}
            {tab === "Rankings" && branchAnalysis.length ? (
              <div className={s.grid2} style={{ marginTop: 10 }}>
                {branchAnalysis.slice(0, 4).map((b) => (
                  <div key={b.branch} className={s.card}>
                    <p><strong>{b.branch}</strong> vendio <strong>${Number(b.total_sales || 0).toLocaleString("es-CO")}</strong> con <strong>{Number(b.total_quantity || 0).toLocaleString("es-CO")}</strong> unidades.</p>
                    <p className={s.muted}>Segmentos (mayor a menor):</p>
                    {(b.segments || []).slice(0, 7).map((seg: any) => (
                      <div key={`${b.branch}-${seg.segment}`} className={s.card}>
                        <strong>{seg.segment}</strong>: ${Number(seg.sales || 0).toLocaleString("es-CO")} | {Number(seg.quantity || 0).toLocaleString("es-CO")} und
                        <div className={s.muted}>Top clientes: {(seg.top_customers || []).slice(0, 3).map((c: any) => `${c.customer} ($${Number(c.sales || 0).toLocaleString("es-CO")})`).join(" | ") || "Sin datos"}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : null}
            {tab === "Rankings" && branchesData.length ? (
              <div className={s.grid2} style={{ marginTop: 10 }}>
                {branchesData.slice(0, 6).map((b: any) => (
                  <div key={b.label} className={s.card}>
                    <p><strong>{b.label}</strong> vendio <strong>{money(Number(b.sales || 0))}</strong> con <strong>{compactNum(Number(b.quantity || 0))}</strong> unidades.</p>
                    <p className={s.muted}>Segmentos top:</p>
                    {(b.topSegments || []).slice(0, 4).map((seg: any) => (
                      <div key={`${b.label}-${seg.label}`} className={s.muted}>
                        {seg.label}: {money(Number(seg.sales || 0))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : null}
            {tab === "KPIs" ? (
              <div className={s.grid2} style={{ marginTop: 10 }}>
                <div className={s.card}>
                  <h4 style={{ marginTop: 0 }}>Segmentos (torta)</h4>
                  <div style={chartBoxStyle}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={(segmentsData.length ? segmentsData : aggregate.bySegment.map((sg) => ({ label: sg.label, sales: sg.sales }))).map((row: any) => ({ label: row.label, balance: Number(row.sales || 0) }))} dataKey="balance" nameKey="label" outerRadius={90}>{(segmentsData.length ? segmentsData : aggregate.bySegment).map((_, i) => <Cell key={i} fill={["#2563eb", "#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#a855f7"][i % 6]} />)}</Pie><Legend /><Tooltip formatter={(v: any) => Number(v).toLocaleString("es-CO")} /></PieChart></ResponsiveContainer></div>
                </div>
                <div className={s.card}>
                  <h4 style={{ marginTop: 0 }}>Drilldown clientes (top)</h4>
                  {(customersData.length ? customersData : aggregate.byCustomer).slice(0, 12).map((c: any) => <div key={c.label} className={s.card}><strong>{c.label}</strong><div className={s.muted}>${Number(c.sales || 0).toLocaleString("es-CO")} | {compactNum(Number(c.quantity || 0))} und</div></div>)}
                </div>
              </div>
            ) : null}
            {tab === "POS" ? (
              <div className={s.card}>
                <h4 style={{ marginTop: 0 }}>Dashboard de productos: top y baja rotacion</h4>
                <div className={s.grid4} style={{ marginBottom: 12 }}>
                  <div className={s.card}><p className={s.muted}>Productos activos</p><p className={s.kpi}>{compactNum(productsData.ranking.length || aggregate.byProduct.length)}</p></div>
                  <div className={s.card}><p className={s.muted}>Top producto</p><p className={s.kpi} style={{ fontSize: "1.1rem" }}>{productsData.stars[0]?.label || aggregate.byProduct[0]?.label || "N/A"}</p></div>
                  <div className={s.card}><p className={s.muted}>Venta top producto</p><p className={s.kpi}>{money(productsData.stars[0]?.sales || aggregate.byProduct[0]?.sales || 0)}</p></div>
                  <div className={s.card}><p className={s.muted}>Producto menor rotacion</p><p className={s.kpi} style={{ fontSize: "1.1rem" }}>{productsData.lowRotation[0]?.label || [...aggregate.byProduct].sort((a, b) => a.quantity - b.quantity)[0]?.label || "N/A"}</p></div>
                </div>

                <div className={s.grid2}>
                  <div className={s.card}>
                    <strong>Top productos (mayor a menor)</strong>
                    <div style={chartBoxStyle}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={(productsData.stars.length ? productsData.stars : aggregate.byProduct).slice(0, 8).map((p: any) => ({ name: String(p.label || "N/A").slice(0, 22), sales: Number(p.sales || 0) }))}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis tickFormatter={(v) => compactNum(Number(v))} />
                          <Tooltip formatter={(v: any) => money(Number(v))} />
                          <Bar dataKey="sales" fill="#2563eb" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    {(productsData.stars.length ? productsData.stars : aggregate.byProduct).slice(0, 5).map((p: any) => <div key={p.label} className={s.muted}>{p.label} - {money(Number(p.sales || 0))}</div>)}
                  </div>
                  <div className={s.card}>
                    <strong>Baja rotacion (menor cantidad)</strong>
                    <div style={chartBoxStyle}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={(productsData.lowRotation.length ? productsData.lowRotation : [...aggregate.byProduct].sort((a, b) => a.quantity - b.quantity)).slice(0, 8).map((p: any) => ({ name: String(p.label || "N/A").slice(0, 22), qty: Number(p.quantity || 0) }))}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis tickFormatter={(v) => compactNum(Number(v))} />
                          <Tooltip formatter={(v: any) => `${compactNum(Number(v))} und`} />
                          <Bar dataKey="qty" fill="#f59e0b" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    {(productsData.lowRotation.length ? productsData.lowRotation : [...aggregate.byProduct].sort((a, b) => a.quantity - b.quantity)).slice(0, 5).map((p: any) => <div key={p.label} className={s.muted}>{p.label} - {compactNum(Number(p.quantity || 0))} und</div>)}
                  </div>
                </div>

                <div className={s.card} style={{ marginTop: 12 }}>
                  <strong>Observacion ejecutiva</strong>
                  <p className={s.muted}>
                    Los productos top concentran la mayor parte del ingreso y los de baja rotacion muestran inventario con salida lenta.
                    Se recomienda proteger disponibilidad del top 20% y activar plan comercial/tactico para rotacion de cola larga.
                  </p>
                </div>
              </div>
            ) : null}
            {tab === "Planes de Trabajo" ? (
              <div className={s.grid2} style={{ marginTop: 10 }}>
                {workPlans.map((wp) => (
                  <div key={wp.branch} className={s.card}>
                    <h4 style={{ marginTop: 0 }}>{wp.branch}</h4>
                    <p className={s.muted}>Venta actual: ${Number(wp.totalSales || 0).toLocaleString("es-CO")}</p>
                    <p><strong>Objetivos del mes</strong></p>
                    {wp.objectives.map((o) => <div key={o} className={s.muted}>- {o}</div>)}
                    <p style={{ marginTop: 8 }}><strong>Acciones sugeridas</strong></p>
                    {wp.actions.map((a) => <div key={a} className={s.muted}>- {a}</div>)}
                  </div>
                ))}
              </div>
            ) : null}
            {tab === "Anexos" ? (
              <div className={s.grid2} style={{ marginTop: 10 }}>
                {annexes.map((ax) => (
                  <div key={ax.branch} className={s.card}>
                    <h4 style={{ marginTop: 0 }}>{ax.branch}</h4>
                    <div className={s.muted}>Observacion: {ax.observation}</div>
                    <div className={s.muted}>Pedidos sin entregar (estimado): {ax.pendingOrders}</div>
                    <div className={s.muted}>Dias de retraso (estimado): {ax.delayDays}</div>
                    <div className={s.muted}>Monto neto comprometido: ${Number(ax.netAmount || 0).toLocaleString("es-CO")}</div>
                  </div>
                ))}
              </div>
            ) : null}
            {tab === "IA Estrategica" ? (
              <div className={s.card} style={{ marginTop: 10 }}>
                <button className={s.btnPrimary} onClick={generateAiStrategic} disabled={aiLoading}>
                  {aiLoading ? "Generando analisis..." : "Generar analisis IA"}
                </button>
                {aiMessage ? <p className={s.muted} style={{ marginTop: 8 }}>{aiMessage}</p> : null}
                {aiInsights ? (
                  <div style={{ marginTop: 10 }}>
                    <h4 style={{ marginTop: 0 }}>Resumen ejecutivo</h4>
                    <p className={s.muted}>{String(aiInsights.executive_summary || "Sin resumen")}</p>
                    <div className={s.grid2}>
                      <div className={s.card}>
                        <strong>Fortalezas</strong>
                        {(aiInsights.strengths || []).slice(0, 6).map((x: string) => <div key={x} className={s.muted}>- {x}</div>)}
                      </div>
                      <div className={s.card}>
                        <strong>Debilidades</strong>
                        {(aiInsights.weaknesses || []).slice(0, 6).map((x: string) => <div key={x} className={s.muted}>- {x}</div>)}
                      </div>
                      <div className={s.card}>
                        <strong>Acciones 30 dias</strong>
                        {(aiInsights.recommended_actions_30_days || []).slice(0, 8).map((x: string) => <div key={x} className={s.muted}>- {x}</div>)}
                      </div>
                      <div className={s.card}>
                        <strong>Acciones 60/90 dias</strong>
                        {[...(aiInsights.recommended_actions_60_days || []), ...(aiInsights.recommended_actions_90_days || [])].slice(0, 8).map((x: string) => <div key={x} className={s.muted}>- {x}</div>)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className={s.muted} style={{ marginTop: 10 }}>Aun no hay analisis IA guardado para este dataset.</p>
                )}
              </div>
            ) : null}
          </section>
        ) : null}
        {tab === "Resumen Ejecutivo" ? (
          <>
        <div className={s.grid4}>
          {cards.map(([title, value]) => {
            let display = String(value);
            if (["Ventas totales", "Margen bruto", "Ticket promedio"].includes(String(title))) {
              display = money(Number(value));
            }
            if (["Alertas criticas"].includes(String(title))) {
              display = compactNum(Number(value));
            }
            if (["Crecimiento mensual", "Caida mensual"].includes(String(title))) {
              display = growthContext === "insufficient_periods" ? "N/A" : pct(Number(String(value).replace("%", "")));
            }
            return <div key={String(title)} className={s.card}><p className={s.muted}>{title}</p><p className={s.kpi}>{display}</p></div>;
          })}
        </div>

        <section className={s.grid2} style={{ marginTop: 12 }}>
          <div className={s.card}>
            <h3 className="mb-3 font-semibold">Linea de ventas ({effectiveDashboard.monthlySales.length <= 1 ? "diaria" : "mensual"})</h3>
            <div style={chartBoxStyle}><ResponsiveContainer width="100%" height="100%"><LineChart data={effectiveDashboard.monthlySales.length <= 1 ? aggregate.byDate.map((d) => ({ period: d.label, sales: d.sales })) : effectiveDashboard.monthlySales}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="period" /><YAxis tickFormatter={(v) => compactNum(Number(v))} /><Tooltip formatter={(v: any) => money(Number(v))} /><Line type="monotone" dataKey="sales" stroke="#22d3ee" /></LineChart></ResponsiveContainer></div>
          </div>
          <div className={s.card}>
            <h3 className="mb-3 font-semibold">Ventas por categoria</h3>
            <div style={chartBoxStyle}><ResponsiveContainer width="100%" height="100%"><BarChart data={effectiveDashboard.salesByCategory.slice(0, 8)}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tickFormatter={(v) => compactNum(Number(v))} /><Tooltip formatter={(v: any) => money(Number(v))} /><Bar dataKey="sales" fill="#38bdf8" /></BarChart></ResponsiveContainer></div>
          </div>
          <div className={s.card}>
            <h3 className="mb-3 font-semibold">Participacion por categoria</h3>
            <div style={chartBoxStyle}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={effectiveDashboard.salesByCategory.slice(0, 6)} dataKey="sales" nameKey="name" outerRadius={85} label>{effectiveDashboard.salesByCategory.slice(0, 6).map((_, idx) => <Cell key={idx} fill={["#22d3ee", "#34d399", "#f59e0b", "#2563eb", "#a855f7", "#ef4444"][idx % 6]} />)}</Pie><Legend verticalAlign="bottom" height={50} /><Tooltip formatter={(v: any) => money(Number(v))} /></PieChart></ResponsiveContainer></div>
          </div>
          <div className={s.card}>
            <h3 className="mb-3 font-semibold">Ranking de ciudades</h3>
            <div style={chartBoxStyle}><ResponsiveContainer width="100%" height="100%"><BarChart data={effectiveDashboard.cityRanking.slice(0, 8)}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="city" tick={{ fontSize: 11 }} /><YAxis tickFormatter={(v) => compactNum(Number(v))} /><Tooltip formatter={(v: any) => money(Number(v))} /><Bar dataKey="sales" fill="#22d3ee" /></BarChart></ResponsiveContainer></div>
          </div>
        </section>

        <section className={s.grid2} style={{ marginTop: 12 }}>
          <div className={s.card}>
            <h3 className="mb-3 font-semibold">Segmento de clientes (critico)</h3>
            <div style={chartBoxStyle}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={segmentRanking.length ? segmentRanking : [{ label: "Sin datos", balance: 1 }]}
                    dataKey="balance"
                    nameKey="label"
                    outerRadius={90}
                  >
                    {(segmentRanking.length ? segmentRanking : [{ label: "Sin datos", balance: 1 }]).map((_, idx) => (
                      <Cell key={idx} fill={["#2563eb", "#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#a855f7"][idx % 6]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className={s.card}>
            <h3 className="mb-3 font-semibold">Top segmentos por facturacion</h3>
            <div>
              {(segmentRanking.length ? segmentRanking : [{ label: "Sin datos", balance: 0 }]).map((row) => (
                <div key={row.label} className={s.card}>
                  <strong>{row.label}</strong>
                  <p className={s.muted}>${row.balance.toLocaleString("es-CO")}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={s.grid2} style={{ marginTop: 12 }}>
          <div className={s.card}>
            <h3 className="mb-3 font-semibold">Alertas inteligentes</h3>
            {effectiveDashboard.alerts.map((a) => <div key={a.title} className={s.card}><p className="font-semibold">{a.title}</p><p className={s.muted}>{a.description}</p><p className={s.muted}>{a.recommendation}</p></div>)}
          </div>
          <div className={s.card}>
            <h3 className="mb-3 font-semibold">Recomendaciones</h3>
            {effectiveDashboard.recommendations.map((r) => <div key={r.title} className={s.card}><p className="font-semibold">{r.priority} - {r.title}</p><p className={s.muted}>{r.description}</p><p className={s.muted}>{r.actionPlan}</p></div>)}
          </div>
        </section>
        </>
        ) : null}
      </div>
    </main>
  );
}
