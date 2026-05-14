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
  const [trafficLoading, setTrafficLoading] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [showAllCities, setShowAllCities] = useState(false);
  const [hideBlankCity, setHideBlankCity] = useState(true);
  const [accessKey, setAccessKey] = useState("");
  const [compareMonth, setCompareMonth] = useState<string>("");
  const [variationFromMonth, setVariationFromMonth] = useState<string>("");
  const [variationToMonth, setVariationToMonth] = useState<string>("");
  const [compareAllMonths, setCompareAllMonths] = useState(false);
  const [tableGraphSource, setTableGraphSource] = useState<"segment" | "customer" | "product">("segment");
  const [tableGraphTopN, setTableGraphTopN] = useState(6);
  const [deltaLabelMode, setDeltaLabelMode] = useState<"pct" | "cop">("pct");
  const [isPrinting, setIsPrinting] = useState(false);

  const exportVisibleAsPdf = () => {
    if (typeof window === "undefined") return;
    const prevTitle = document.title;
    const stamp = new Date().toISOString().slice(0, 10);
    document.title = `metrocas-visible-${activeDatasetId || "dataset"}-${stamp}`;
    window.print();
    window.setTimeout(() => {
      document.title = prevTitle;
    }, 500);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onBeforePrint = () => setIsPrinting(true);
    const onAfterPrint = () => setIsPrinting(false);
    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
    };
  }, []);

  const normalizeInsights = (raw: any) => {
    if (!raw) return null;
    if (typeof raw === "object") {
      const obj = raw as any;
      const maybeJson = String(obj?.executive_summary || "").trim();
      if (maybeJson.startsWith("{") && maybeJson.endsWith("}")) {
        try {
          const reparsed = JSON.parse(maybeJson);
          return reparsed;
        } catch {
          // keep original object
        }
      }
      return obj;
    }
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch {
        return { executive_summary: raw };
      }
    }
    return null;
  };

  const ensureArray = (v: any) => (Array.isArray(v) ? v : []);
  const prettyKey = (k: string) =>
    k
      .replace(/_/g, " ")
      .replace(/\b\w/g, (m) => m.toUpperCase());
  const formatByKey = (key: string, value: any) => {
    if (typeof value !== "number") return String(value);
    const k = key.toLowerCase();
    if (k.includes("pct") || k.includes("participation") || k.includes("conversion") || k.includes("share")) {
      return `${Number(value).toLocaleString("es-CO", { maximumFractionDigits: 2 })}%`;
    }
    if (k.includes("cop") || k.includes("sales") || k.includes("impact") || k.includes("venta") || k.includes("monto")) {
      return money(Number(value));
    }
    return Number(value).toLocaleString("es-CO", { maximumFractionDigits: 2 });
  };
  const formatSummaryNumbers = (text: string) =>
    String(text || "").replace(/\b\d{7,}\b/g, (m) => Number(m).toLocaleString("es-CO"));
  const renderItem = (item: any) => {
    if (typeof item === "string") return item;
    if (item && typeof item === "object") {
      return Object.entries(item)
        .map(([k, v]) => `${prettyKey(k)}: ${formatByKey(k, v)}`)
        .join(" | ");
    }
    return String(item ?? "");
  };
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
    "Variaciones Pro",
  ];

  const withAccessKey = (path: string) =>
    accessKey ? `${path}${path.includes("?") ? "&" : "?"}access_key=${encodeURIComponent(accessKey)}` : path;

  const loadAnalytics = async (datasetId: string) => {
    setTrafficLoading(true);
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
      endpoints.map((endpoint) => fetch(withAccessKey(`${endpoint}?dataset_id=${encodeURIComponent(datasetId)}`)).then((r) => r.json())),
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
    setTrafficLoading(false);
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
    const sp = new URL(window.location.href).searchParams;
    setAccessKey(sp.get("access_key") || "");

    const loadById = (datasetId: string) => {
      fetch(withAccessKey(`/api/metrocas/dashboard?dataset_id=${encodeURIComponent(datasetId)}`))
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

          fetch(withAccessKey(`/api/metrocas/insights?dataset_id=${encodeURIComponent(datasetId)}`))
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

    fetch(withAccessKey("/api/metrocas/datasets?page=1&page_size=1"))
      .then((r) => r.json())
      .then((json) => {
        const latest = json?.data?.[0]?.id;
        if (latest) loadById(latest);
      })
      .catch(() => {});
  }, [accessKey]);

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

  const kpiHighlights = useMemo(() => {
    const topSegment = (segmentRanking[0]?.label || aggregate.bySegment[0]?.label || "N/A").toString();
    const topCustomer = (effectiveDashboard.topCustomers?.[0]?.name || customersData[0]?.label || "N/A").toString();
    const topProduct = (effectiveDashboard.topProducts?.[0]?.name || productsData.stars[0]?.label || aggregate.byProduct[0]?.label || "N/A").toString();
    const variationLabel = growthContext === "insufficient_periods"
      ? "N/A"
      : pct(Number(effectiveDashboard.kpis.monthlyGrowth || effectiveDashboard.kpis.monthlyDrop || 0));
    const trend = Number(effectiveDashboard.kpis.monthlyGrowth || 0) > 0 ? "Alcista" : Number(effectiveDashboard.kpis.monthlyDrop || 0) < 0 ? "Ajuste" : "Estable";
    return [
      { label: "Total ventas", value: money(Number(effectiveDashboard.kpis.totalSales || 0)), helper: "Volumen acumulado" },
      { label: "Variacion periodo", value: variationLabel, helper: monthsDetected.length > 1 ? `${monthsDetected[monthsDetected.length - 2]} vs ${monthsDetected[monthsDetected.length - 1]}` : "Comparativo pendiente" },
      { label: "Segmento lider", value: topSegment, helper: "Mayor facturacion" },
      { label: "Cliente top", value: topCustomer, helper: "Mayor contribucion" },
      { label: "Producto top", value: topProduct, helper: "Mayor ingreso" },
      { label: "Tendencia", value: trend, helper: "Estado general" },
    ];
  }, [segmentRanking, aggregate.bySegment, aggregate.byProduct, effectiveDashboard, customersData, productsData.stars, growthContext, monthsDetected]);

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

  const variationModel = useMemo(() => {
    const months = Array.from(new Set(filteredFacts.map((f) => String(f.month || "")).filter((m) => /^\d{4}-\d{2}$/.test(m)))).sort();
    const prevMonth = variationFromMonth || months[months.length - 2] || "";
    const currMonth = variationToMonth || months[months.length - 1] || "";

    const build = (key: "segment" | "customer" | "product") => {
      const byEntityMonth = new Map<string, Map<string, number>>();
      filteredFacts.forEach((f) => {
        const entity = String(f[key] || "EN BLANCO");
        const m = String(f.month || "");
        if (!m) return;
        const em = byEntityMonth.get(entity) || new Map<string, number>();
        em.set(m, (em.get(m) || 0) + Number(f.amount || 0));
        byEntityMonth.set(entity, em);
      });

      const rows = [...byEntityMonth.entries()].map(([name, m]) => {
        const prev = Number(m.get(prevMonth) || 0);
        const curr = Number(m.get(currMonth) || 0);
        const delta = curr - prev;
        const deltaPct = prev > 0 ? (delta / prev) * 100 : 0;
        return { name, prev, curr, delta, deltaPct };
      }).filter((r) => r.prev > 0 || r.curr > 0);

      const topGrowth = [...rows].sort((a, b) => b.delta - a.delta).slice(0, 8);
      const topDrop = [...rows].sort((a, b) => a.delta - b.delta).slice(0, 8);

      const topLines = [...rows]
        .sort((a, b) => b.curr - a.curr)
        .slice(0, 4)
        .map((r) => r.name);

      const lineSeries = months.map((m) => {
        const row: Record<string, any> = { month: m };
        topLines.forEach((name) => {
          row[name] = Number(byEntityMonth.get(name)?.get(m) || 0);
        });
        return row;
      });

      const pivotRows = [...rows].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 12);
      return { topGrowth, topDrop, topLines, lineSeries, pivotRows };
    };

    return {
      months,
      prevMonth,
      currMonth,
      segment: build("segment"),
      customer: build("customer"),
      product: build("product"),
    };
  }, [filteredFacts, variationFromMonth, variationToMonth]);

  const yoyModel = useMemo(() => {
    const monthNameEs = (monthNum: string) => {
      const map: Record<string, string> = {
        "01": "Enero",
        "02": "Febrero",
        "03": "Marzo",
        "04": "Abril",
        "05": "Mayo",
        "06": "Junio",
        "07": "Julio",
        "08": "Agosto",
        "09": "Septiembre",
        "10": "Octubre",
        "11": "Noviembre",
        "12": "Diciembre",
      };
      return map[monthNum] || monthNum;
    };

    const months = Array.from(new Set(filteredFacts.map((f) => String(f.month || "")).filter((m) => /^\d{4}-\d{2}$/.test(m)))).sort();
    const years = Array.from(new Set(months.map((m) => m.slice(0, 4)))).sort();
    const latestYear = years[years.length - 1] || "";
    const prevYear = latestYear ? String(Number(latestYear) - 1) : "";
    const monthsLatestYear = months.filter((m) => m.startsWith(`${latestYear}-`)).map((m) => m.slice(5, 7));
    const selected = compareMonth || monthsLatestYear[monthsLatestYear.length - 1] || "04";

    const sumFor = (monthKey: string) =>
      filteredFacts
        .filter((f) => String(f.month || "") === monthKey)
        .reduce((acc, f) => acc + Number(f.amount || 0), 0);

    const yoyByMonth = monthsLatestYear.map((mm) => {
      const curr = sumFor(`${latestYear}-${mm}`);
      const prev = sumFor(`${prevYear}-${mm}`);
      const delta = curr - prev;
      const deltaPct = prev > 0 ? (delta / prev) * 100 : 0;
      return {
        monthNum: mm,
        month: monthNameEs(mm),
        curr,
        prev,
        delta,
        deltaPct,
        status: delta > 0 ? "crecio" : delta < 0 ? "disminuyo" : "igual",
      };
    });
    const hasAnnualData = yoyByMonth.some((r) => r.prev > 0);

    const buildEntityYoY = (key: "customer" | "product") => {
      const byEntity = new Map<string, { prev: number; curr: number }>();
      filteredFacts.forEach((f) => {
        const entity = String(f[key] || "EN BLANCO");
        const month = String(f.month || "");
        if (month === `${latestYear}-${selected}`) {
          const row = byEntity.get(entity) || { prev: 0, curr: 0 };
          row.curr += Number(f.amount || 0);
          byEntity.set(entity, row);
        }
        if (month === `${prevYear}-${selected}`) {
          const row = byEntity.get(entity) || { prev: 0, curr: 0 };
          row.prev += Number(f.amount || 0);
          byEntity.set(entity, row);
        }
      });
      const rows = [...byEntity.entries()]
        .map(([name, v]) => {
          const delta = v.curr - v.prev;
          const deltaPct = v.prev > 0 ? (delta / v.prev) * 100 : 0;
          return { name, prev: v.prev, curr: v.curr, delta, deltaPct };
        })
        .filter((r) => r.prev > 0 || r.curr > 0)
        .sort((a, b) => b.delta - a.delta);
      return {
        up: rows.slice(0, 8),
        down: [...rows].sort((a, b) => a.delta - b.delta).slice(0, 8),
      };
    };

    return {
      latestYear,
      prevYear,
      hasAnnualData,
      selected,
      monthOptions: monthsLatestYear,
      yoyByMonth,
      customer: buildEntityYoY("customer"),
      product: buildEntityYoY("product"),
    };
  }, [filteredFacts, compareMonth]);

  const variationGraphModel = useMemo(() => {
    const source = variationModel[tableGraphSource];
    const pairRows = (source?.pivotRows || []).slice(0, tableGraphTopN).map((r: any) => {
      const prev = Number(r.prev || 0);
      const curr = Number(r.curr || 0);
      const delta = curr - prev;
      const deltaPct = prev === 0 ? (curr > 0 ? 100 : 0) : (delta / prev) * 100;
      return {
        name: String(r.name).slice(0, 24),
        prev,
        curr,
        delta,
        deltaPct,
      };
    });

    const keyBySource = tableGraphSource === "segment" ? "segment" : tableGraphSource === "customer" ? "customer" : "product";
    const months = variationModel.months || [];
    const topEntities = (source?.pivotRows || [])
      .slice(0, Math.min(4, tableGraphTopN))
      .map((r: any) => String(r.name));

    const allMonthsSeries = months.map((m: string) => {
      const row: Record<string, any> = { month: m };
      topEntities.forEach((entity) => {
        row[entity] = filteredFacts
          .filter((f) => String(f.month || "") === m && String((f as any)[keyBySource] || "EN BLANCO") === entity)
          .reduce((acc, f) => acc + Number((f as any).amount || 0), 0);
      });
      return row;
    });

    return {
      pairRows,
      allMonthsSeries,
      topEntities,
    };
  }, [variationModel, tableGraphSource, tableGraphTopN, filteredFacts]);

  const printSafePairRows = useMemo(() => {
    return isPrinting ? variationGraphModel.pairRows.slice(0, Math.min(5, variationGraphModel.pairRows.length)) : variationGraphModel.pairRows;
  }, [variationGraphModel.pairRows, isPrinting]);

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
      const ctrl = new AbortController();
      const timer = window.setTimeout(() => ctrl.abort(), 120000);
      const res = await fetch(withAccessKey("/api/metrocas/analyze"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dataset_id: activeDatasetId }),
        signal: ctrl.signal,
      });
      window.clearTimeout(timer);
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
    } catch (error: any) {
      const msg = String(error?.name || "").includes("Abort")
        ? "El analisis IA tardo demasiado. Intenta nuevamente con este dataset o reduce volumen de datos."
        : "No se pudo conectar con el servicio de analisis IA.";
      setAiMessage(msg);
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

  const cityRows = useMemo(() => {
    const base = (citiesData.length ? citiesData : effectiveDashboard.cityRanking).map((c: any) => ({
      city: String(c.city || c.label || "EN BLANCO"),
      sales: Number(c.sales || 0),
      quantity: Number(c.quantity || 0),
    }));
    const term = citySearch.trim().toUpperCase();
    const filtered = base.filter((c) => {
      if (hideBlankCity && c.city === "EN BLANCO") return false;
      if (!term) return true;
      return c.city.includes(term);
    });
    return filtered.sort((a, b) => b.sales - a.sales);
  }, [citiesData, effectiveDashboard.cityRanking, citySearch, hideBlankCity]);

  return (
    <main className={`${s.metrocasRoot} ${s.lightSurface}`}>
      <div className={`${s.topNav} ${s.noPrint}`}>
        <div className={`${s.container} ${s.topNavInner}`}>
          <div className={s.brand}>Metricas Intelligence</div>
          <div className={s.navActions}>
            <a href="/metricas" className={s.btnSecondary}>Volver al landing</a>
            <a href="/intelligence/upload" className={s.btnPrimary}>Subir dataset</a>
          </div>
        </div>
      </div>
      <div className={s.container} style={{ padding: "18px 0 34px" }}>
        <section className={s.executiveHero}>
          <div>
            <p className={s.eyebrow}>Enterprise Analytics</p>
            <h1 className={s.sectionTitle} style={{ marginBottom: 6 }}>Dashboard Ejecutivo</h1>
            <p className={s.muted}>Dataset activo: {activeDatasetId}</p>
            <p className={s.muted}>Meses detectados: {monthsDetected.length ? monthsDetected.join(", ") : "Sin fecha valida"}</p>
          </div>
          <div className={s.heroPill}>
            <span>Estado</span>
            <strong>{growthContext === "insufficient_periods" ? "Datos en consolidacion" : "Operacion monitoreada"}</strong>
          </div>
        </section>

        <section className={s.kpiPremiumGrid}>
          {kpiHighlights.map((k) => (
            <article key={k.label} className={s.kpiPremiumCard}>
              <p className={s.kpiLabel}>{k.label}</p>
              <p className={s.kpiValue}>{k.value}</p>
              <p className={s.kpiHint}>{k.helper}</p>
            </article>
          ))}
        </section>

        <div className={`${s.navActions} ${s.noPrint}`} style={{ marginBottom: 8 }}>
          <button className={granularity === "acumulado" ? s.btnPrimary : s.btnSecondary} onClick={() => setGranularity("acumulado")}>Acumulado</button>
          <button className={granularity === "mensual" ? s.btnPrimary : s.btnSecondary} onClick={() => setGranularity("mensual")}>Mensual</button>
          <button className={s.btnSecondary} onClick={exportVisibleAsPdf}>Descargar PDF visible</button>
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
        <section className={`${s.card} ${s.panelCard}`} style={{ marginBottom: 12 }}>
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
        <div className={s.tabRail} style={{ marginBottom: 12 }}>
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
                  <strong>Estado de carga de trafico</strong>
                  {trafficLoading ? (
                    <p className={s.muted}><span className={s.inlineLoader}><span className={s.spinner} /> Cargando datos de trafico...</span></p>
                  ) : (
                    <p className={s.muted}>
                      Filas cargadas - diario: {compactNum((trafficData.daily || []).length)} | por hora: {compactNum((trafficData.hourly || []).length)} | sedes: {compactNum((trafficData.byBranch || []).length)}
                    </p>
                  )}
                </div>
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
                {!trafficLoading && !trafficData.daily.length && !trafficData.hourly.length ? <p className={s.muted}>No hay datos reales de trafico en este dataset. Verifica hojas "Trafico por dia" y "Trafico por horas" y vuelve a importar el Excel.</p> : null}
              </div>
            ) : null}
            {tab === "Ciudades" ? (
              <div style={{ marginTop: 10 }}>
                <div className={s.navActions} style={{ marginBottom: 10 }}>
                  <input
                    className={s.input}
                    placeholder="Buscar ciudad..."
                    value={citySearch}
                    onChange={(e) => setCitySearch(e.target.value)}
                    style={{ maxWidth: 260 }}
                  />
                  <label className={s.muted} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="checkbox" checked={hideBlankCity} onChange={(e) => setHideBlankCity(e.target.checked)} />
                    Ocultar EN BLANCO
                  </label>
                  <button className={showAllCities ? s.btnSecondary : s.btnPrimary} onClick={() => setShowAllCities(false)}>Top 20</button>
                  <button className={showAllCities ? s.btnPrimary : s.btnSecondary} onClick={() => setShowAllCities(true)}>Ver todas</button>
                  <span className={s.muted}>Mostrando {Math.min(showAllCities ? cityRows.length : 20, cityRows.length)} de {cityRows.length}</span>
                </div>
                <div className={s.grid2}>
                {(showAllCities ? cityRows : cityRows.slice(0, 20)).map((c: any, idx: number) => (
                  <div key={c.city} className={s.card}>
                    <strong>#{idx + 1} {c.city}</strong>
                    <div className={s.muted}>Ventas: ${Number(c.sales || 0).toLocaleString("es-CO")}</div>
                    <div className={s.muted}>Cantidad: {compactNum(Number(c.quantity || 0))}</div>
                  </div>
                ))}
                </div>
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
                {aiLoading ? (
                  <div className={s.card} style={{ marginTop: 10 }}>
                    <div className={s.inlineLoader}>
                      <span style={{ fontSize: 18 }} aria-hidden="true">🤖</span>
                      <span className={`${s.spinner} ${s.spinnerLg}`} />
                      <span className={s.muted}>IA ejecutiva analizando ventas, segmentos y variaciones... </span>
                    </div>
                    <p className={s.muted} style={{ marginTop: 8 }}>
                      Esto puede tardar entre 10 y 60 segundos segun el tamano del dataset.
                    </p>
                  </div>
                ) : null}
                {aiMessage ? <p className={s.muted} style={{ marginTop: 8 }}>{aiMessage}</p> : null}
                {aiInsights ? (
                  <div style={{ marginTop: 10 }}>
                    {(() => {
                      const normalized = normalizeInsights(aiInsights);
                      if (!normalized) return <p className={s.muted}>Sin insights disponibles.</p>;
                      return (
                        <>
                    <h4 style={{ marginTop: 0 }}>Resumen ejecutivo</h4>
                    <p className={s.muted}>{formatSummaryNumbers(String(normalized.executive_summary || "Sin resumen"))}</p>
                    <div className={s.grid2}>
                      <div className={s.card}>
                        <strong>Fortalezas</strong>
                        {ensureArray(normalized.strengths).slice(0, 6).map((x: any, idx: number) => <div key={`st-${idx}`} className={s.muted}>- {renderItem(x)}</div>)}
                      </div>
                      <div className={s.card}>
                        <strong>Debilidades</strong>
                        {ensureArray(normalized.weaknesses).slice(0, 6).map((x: any, idx: number) => <div key={`wk-${idx}`} className={s.muted}>- {renderItem(x)}</div>)}
                      </div>
                      <div className={s.card}>
                        <strong>Acciones 30 dias</strong>
                        {ensureArray(normalized.recommended_actions_30_days).slice(0, 8).map((x: any, idx: number) => <div key={`a30-${idx}`} className={s.muted}>- {renderItem(x)}</div>)}
                      </div>
                      <div className={s.card}>
                        <strong>Acciones 60/90 dias</strong>
                        {[...ensureArray(normalized.recommended_actions_60_days), ...ensureArray(normalized.recommended_actions_90_days)].slice(0, 8).map((x: any, idx: number) => <div key={`a6090-${idx}`} className={s.muted}>- {renderItem(x)}</div>)}
                      </div>
                      <div className={s.card}>
                        <strong>Top ciudades</strong>
                        {ensureArray(normalized.city_analysis).slice(0, 6).map((x: any, idx: number) => <div key={`ct-${idx}`} className={s.muted}>- {renderItem(x)}</div>)}
                      </div>
                      <div className={s.card}>
                        <strong>Top productos y debiles</strong>
                        {ensureArray(normalized.product_analysis).slice(0, 6).map((x: any, idx: number) => <div key={`pr-${idx}`} className={s.muted}>- {renderItem(x)}</div>)}
                        {ensureArray(normalized.products_to_strengthen).slice(0, 4).map((x: any, idx: number) => <div key={`ps-${idx}`} className={s.muted}>- {renderItem(x)}</div>)}
                      </div>
                      <div className={s.card}>
                        <strong>Cobertura macro</strong>
                        {ensureArray(normalized.macro_coverage_check).slice(0, 10).map((x: any, idx: number) => <div key={`mc-${idx}`} className={s.muted}>- {renderItem(x)}</div>)}
                      </div>
                      <div className={s.card}>
                        <strong>Top 5 acciones priorizadas</strong>
                        {ensureArray(normalized.priority_actions_top5).slice(0, 5).map((x: any, idx: number) => <div key={`pa-${idx}`} className={s.muted}>- {renderItem(x)}</div>)}
                      </div>
                      <div className={s.card}>
                        <strong>Semaforo por ciudad</strong>
                        {ensureArray(normalized.city_traffic_light).slice(0, 10).map((x: any, idx: number) => <div key={`tl-${idx}`} className={s.muted}>- {renderItem(x)}</div>)}
                      </div>
                      <div className={s.card}>
                        <strong>Variacion por segmento (mes vs mes)</strong>
                        {ensureArray(normalized.segment_variation_analysis).slice(0, 8).map((x: any, idx: number) => <div key={`sv-${idx}`} className={s.muted}>- {renderItem(x)}</div>)}
                      </div>
                      <div className={s.card}>
                        <strong>Variacion por cliente (mes vs mes)</strong>
                        {ensureArray(normalized.customer_variation_analysis).slice(0, 8).map((x: any, idx: number) => <div key={`cv-${idx}`} className={s.muted}>- {renderItem(x)}</div>)}
                      </div>
                      <div className={s.card}>
                        <strong>Variacion por producto (mes vs mes)</strong>
                        {ensureArray(normalized.product_variation_analysis).slice(0, 8).map((x: any, idx: number) => <div key={`pv-${idx}`} className={s.muted}>- {renderItem(x)}</div>)}
                      </div>
                    </div>

                    <div className={s.card} style={{ marginTop: 12 }}>
                      <h4 style={{ marginTop: 0 }}>Tabla ejecutiva de riesgo y accion</h4>
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
                          <thead>
                            <tr>
                              <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #d5e2f7" }}>Riesgo</th>
                              <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #d5e2f7" }}>Accion</th>
                              <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #d5e2f7" }}>KPI objetivo</th>
                              <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #d5e2f7" }}>Impacto estimado</th>
                              <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #d5e2f7" }}>Owner</th>
                              <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #d5e2f7" }}>Horizonte</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ensureArray(normalized.priority_actions_top5).slice(0, 5).map((r: any, idx: number) => {
                              const risk = ensureArray(normalized.city_traffic_light).find((x: any) => String(x?.priority || "") === String(r?.priority || ""));
                              const riskLabel = String(risk?.color || "medio").toLowerCase();
                              const riskColor = riskLabel === "rojo" ? "#b91c1c" : riskLabel === "verde" ? "#15803d" : "#b45309";
                              const impact = Number(r?.impacto_estimado_cop || r?.estimated_impact_cop || 0);
                              const actionText = String(r?.accion || r?.action || "N/A");
                              const kpiText = String(r?.kpi_objetivo || r?.kpi || "N/A");
                              const ownerText = String(r?.owner_rol || r?.owner || "N/A");
                              const days = Number(r?.horizonte_dias || r?.horizon_days || 0);
                              return (
                                <tr key={`risk-row-${idx}`}>
                                  <td style={{ padding: "8px", borderBottom: "1px solid #eef4ff", color: riskColor, fontWeight: 700 }}>{riskLabel.toUpperCase()}</td>
                                  <td style={{ padding: "8px", borderBottom: "1px solid #eef4ff" }}>{actionText}</td>
                                  <td style={{ padding: "8px", borderBottom: "1px solid #eef4ff" }}>{kpiText}</td>
                                  <td style={{ padding: "8px", borderBottom: "1px solid #eef4ff" }}>{money(impact)}</td>
                                  <td style={{ padding: "8px", borderBottom: "1px solid #eef4ff" }}>{ownerText}</td>
                                  <td style={{ padding: "8px", borderBottom: "1px solid #eef4ff" }}>{days ? `${days} dias` : "N/A"}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className={s.grid2} style={{ marginTop: 12 }}>
                      <div className={s.card}>
                        <h4 style={{ marginTop: 0 }}>Impacto estimado por accion (Top 5)</h4>
                        <div style={chartBoxStyle}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={ensureArray(normalized.priority_actions_top5).slice(0, 5).map((a: any, i: number) => ({
                                accion: `A${i + 1}`,
                                impacto: Number(a?.impacto_estimado_cop || a?.estimated_impact_cop || 0),
                              }))}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="accion" />
                              <YAxis tickFormatter={(v) => compactNum(Number(v))} />
                              <Tooltip formatter={(v: any) => money(Number(v))} />
                              <Bar dataKey="impacto" fill="#2563eb" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      <div className={s.card}>
                        <h4 style={{ marginTop: 0 }}>Semaforo por ciudad (resumen)</h4>
                        {ensureArray(normalized.city_traffic_light).slice(0, 10).map((c: any, idx: number) => {
                          const color = String(c?.color || "medio").toLowerCase();
                          const dot = color === "rojo" ? "#dc2626" : color === "verde" ? "#16a34a" : "#f59e0b";
                          return (
                            <div key={`city-light-${idx}`} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                              <span style={{ width: 10, height: 10, borderRadius: 999, background: dot, display: "inline-block" }} />
                              <span className={s.muted}>{String(c?.city || "N/A")} - {String(c?.color || "N/A").toUpperCase()}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <p className={s.muted} style={{ marginTop: 10 }}>Aun no hay analisis IA guardado para este dataset.</p>
                )}
              </div>
            ) : null}
            {tab === "Variaciones Pro" ? (
              <div style={{ marginTop: 10 }}>
                <div className={`${s.navActions} ${s.variationToolbar}`} style={{ marginBottom: 10 }}>
                  <span className={s.muted}>Comparativo mensual:</span>
                  <button className={compareAllMonths ? s.btnPrimary : s.btnSecondary} onClick={() => setCompareAllMonths(true)}>Comparar todo</button>
                  <button className={!compareAllMonths ? s.btnPrimary : s.btnSecondary} onClick={() => setCompareAllMonths(false)}>Comparacion puntual</button>
                  <select className={s.input} value={variationFromMonth} onChange={(e) => setVariationFromMonth(e.target.value)} style={{ maxWidth: 180 }}>
                    <option value="">Mes base</option>
                    {variationModel.months.map((mm) => (<option key={`vm-from-${mm}`} value={mm}>{mm}</option>))}
                  </select>
                  <select className={s.input} value={variationToMonth} onChange={(e) => setVariationToMonth(e.target.value)} style={{ maxWidth: 180 }}>
                    <option value="">Mes comparado</option>
                    {variationModel.months.map((mm) => (<option key={`vm-to-${mm}`} value={mm}>{mm}</option>))}
                  </select>
                </div>
                <p className={s.muted}>
                  {compareAllMonths
                    ? "Panorama completo por meses (segun filtros activos)."
                    : <>Comparativo mensual entre <strong>{variationModel.prevMonth || "N/A"}</strong> y <strong>{variationModel.currMonth || "N/A"}</strong>.</>}
                </p>
                <div className={s.grid2}>
                  <div className={s.card}>
                    <h4 style={{ marginTop: 0 }}>Segmento: top suben/bajan</h4>
                    <p className={s.muted}>Insight: mayor alza en {String(variationModel.segment.topGrowth[0]?.name || "N/A")}; mayor caida en {String(variationModel.segment.topDrop[0]?.name || "N/A")}.</p>
                    <div style={chartBoxStyle}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[...variationModel.segment.topGrowth.slice(0, 4), ...variationModel.segment.topDrop.slice(0, 4)].map((x) => ({ name: String(x.name).slice(0, 18), prev: x.prev, curr: x.curr, delta: x.delta }))}>
                          <CartesianGrid strokeDasharray="2 6" stroke="#dbeafe" />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#5f769b" }} />
                          <YAxis tickFormatter={(v) => compactNum(Number(v))} tick={{ fontSize: 11, fill: "#5f769b" }} />
                          <Tooltip
                            formatter={(v: any, name: any) => {
                              if (name === "Delta") return [money(Number(v)), "Delta"];
                              return [money(Number(v)), String(name)];
                            }}
                            contentStyle={{ borderRadius: 10, border: "1px solid #d5e2f7" }}
                          />
                          <Legend />
                          <Bar dataKey="prev" name={`Mes base (${variationModel.prevMonth || ""})`} fill="#94a3b8" radius={[8, 8, 0, 0]} />
                          <Bar dataKey="curr" name={`Mes comparado (${variationModel.currMonth || ""})`} fill="#0284c7" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className={s.card}>
                    <h4 style={{ marginTop: 0 }}>Segmento: tendencia mensual (Top 4)</h4>
                    <p className={s.muted}>Insight: las lineas muestran estabilidad o quiebre de tendencia por segmento.</p>
                    <div style={chartBoxStyle}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={variationModel.segment.lineSeries}>
                          <CartesianGrid strokeDasharray="2 6" stroke="#dbeafe" />
                          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5f769b" }} />
                          <YAxis tickFormatter={(v) => compactNum(Number(v))} tick={{ fontSize: 11, fill: "#5f769b" }} />
                          <Tooltip formatter={(v: any) => money(Number(v))} contentStyle={{ borderRadius: 10, border: "1px solid #d5e2f7" }} />
                          {variationModel.segment.topLines.map((n, i) => (
                            <Line key={`seg-line-${n}`} type="monotone" dataKey={n} stroke={["#2563eb", "#16a34a", "#f59e0b", "#dc2626"][i % 4]} strokeWidth={2.5} dot={false} />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className={s.card}>
                    <h4 style={{ marginTop: 0 }}>Cliente: top suben/bajan</h4>
                    <p className={s.muted}>Insight: cliente con mayor alza: {String(variationModel.customer.topGrowth[0]?.name || "N/A")}.</p>
                    <div style={chartBoxStyle}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[...variationModel.customer.topGrowth.slice(0, 4), ...variationModel.customer.topDrop.slice(0, 4)].map((x) => ({ name: String(x.name).slice(0, 18), prev: x.prev, curr: x.curr, delta: x.delta }))}>
                          <CartesianGrid strokeDasharray="2 6" stroke="#dbeafe" />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#5f769b" }} />
                          <YAxis tickFormatter={(v) => compactNum(Number(v))} tick={{ fontSize: 11, fill: "#5f769b" }} />
                          <Tooltip
                            formatter={(v: any, _name: any, entry: any) => {
                              const dataKey = String(entry?.dataKey || "");
                              if (dataKey === "delta") return [money(Number(v)), "Delta"];
                              return [money(Number(v)), dataKey === "prev" ? `Mes base (${variationModel.prevMonth || "Base"})` : `Mes comparado (${variationModel.currMonth || "Actual"})`];
                            }}
                            contentStyle={{ borderRadius: 10, border: "1px solid #d5e2f7" }}
                          />
                          <Legend />
                          <Bar dataKey="prev" name={`Mes base (${variationModel.prevMonth || ""})`} fill="#93c5fd" radius={[8, 8, 0, 0]} />
                          <Bar dataKey="curr" name={`Mes comparado (${variationModel.currMonth || ""})`} fill="#2563eb" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className={s.card}>
                    <h4 style={{ marginTop: 0 }}>Producto: top suben/bajan</h4>
                    <p className={s.muted}>Insight: producto con mayor alza: {String(variationModel.product.topGrowth[0]?.name || "N/A")}; mayor caida: {String(variationModel.product.topDrop[0]?.name || "N/A")}.</p>
                    <div style={chartBoxStyle}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[...variationModel.product.topGrowth.slice(0, 4), ...variationModel.product.topDrop.slice(0, 4)].map((x) => ({ name: String(x.name).slice(0, 18), prev: x.prev, curr: x.curr, delta: x.delta }))}>
                          <CartesianGrid strokeDasharray="2 6" stroke="#dbeafe" />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#5f769b" }} />
                          <YAxis tickFormatter={(v) => compactNum(Number(v))} tick={{ fontSize: 11, fill: "#5f769b" }} />
                          <Tooltip
                            formatter={(v: any, _name: any, entry: any) => {
                              const dataKey = String(entry?.dataKey || "");
                              if (dataKey === "delta") return [money(Number(v)), "Delta"];
                              return [money(Number(v)), dataKey === "prev" ? `Mes base (${variationModel.prevMonth || "Base"})` : `Mes comparado (${variationModel.currMonth || "Actual"})`];
                            }}
                            contentStyle={{ borderRadius: 10, border: "1px solid #d5e2f7" }}
                          />
                          <Legend />
                          <Bar dataKey="prev" name={`Mes base (${variationModel.prevMonth || ""})`} fill="#fcd34d" radius={[8, 8, 0, 0]} />
                          <Bar dataKey="curr" name={`Mes comparado (${variationModel.currMonth || ""})`} fill="#f59e0b" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className={s.card}>
                    <h4 style={{ marginTop: 0 }}>Resumen del comparativo mensual</h4>
                    <div className={s.muted}>- Mes base: {variationModel.prevMonth || "N/A"}</div>
                    <div className={s.muted}>- Mes comparado: {variationModel.currMonth || "N/A"}</div>
                    <div className={s.muted}>- Segmento mayor alza: {String(variationModel.segment.topGrowth[0]?.name || "N/A")}</div>
                    <div className={s.muted}>- Segmento mayor baja: {String(variationModel.segment.topDrop[0]?.name || "N/A")}</div>
                    <div className={s.muted}>- Cliente mayor alza: {String(variationModel.customer.topGrowth[0]?.name || "N/A")}</div>
                    <div className={s.muted}>- Cliente mayor baja: {String(variationModel.customer.topDrop[0]?.name || "N/A")}</div>
                    <div className={s.muted}>- Producto mayor alza: {String(variationModel.product.topGrowth[0]?.name || "N/A")}</div>
                    <div className={s.muted}>- Producto mayor baja: {String(variationModel.product.topDrop[0]?.name || "N/A")}</div>
                  </div>
                </div>

                <div className={s.grid2} style={{ marginTop: 12 }}>
                  <div className={s.card}>
                    <h4 style={{ marginTop: 0 }}>Tabla dinamica - Segmento</h4>
                    <p className={s.muted}>Compara {variationModel.prevMonth || "N/A"} vs {variationModel.currMonth || "N/A"} con variacion visible.</p>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #d5e2f7" }}>Etiquetas de fila</th>
                            <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #d5e2f7" }}>{variationModel.currMonth || "Actual"}</th>
                            <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #d5e2f7" }}>{variationModel.prevMonth || "Base"}</th>
                            <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #d5e2f7" }}>Variacion</th>
                          </tr>
                        </thead>
                        <tbody>
                          {variationModel.segment.pivotRows.map((r) => {
                            const tone = r.delta > 0 ? "#15803d" : r.delta < 0 ? "#b91c1c" : "#6b7280";
                            return (
                              <tr key={`seg-pivot-${r.name}`}>
                                <td style={{ padding: 8, borderBottom: "1px solid #eef4ff" }}>{r.name}</td>
                                <td style={{ padding: 8, borderBottom: "1px solid #eef4ff", textAlign: "right" }}>{money(r.curr)}</td>
                                <td style={{ padding: 8, borderBottom: "1px solid #eef4ff", textAlign: "right" }}>{money(r.prev)}</td>
                                <td style={{ padding: 8, borderBottom: "1px solid #eef4ff", textAlign: "right", color: tone }}>{pct(r.deltaPct)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className={s.card}>
                    <h4 style={{ marginTop: 0 }}>Tabla dinamica - Cliente</h4>
                    <p className={s.muted}>Top clientes con mayor movimiento entre meses seleccionados.</p>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #d5e2f7" }}>Etiquetas de fila</th>
                            <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #d5e2f7" }}>{variationModel.currMonth || "Actual"}</th>
                            <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #d5e2f7" }}>{variationModel.prevMonth || "Base"}</th>
                            <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #d5e2f7" }}>Variacion</th>
                          </tr>
                        </thead>
                        <tbody>
                          {variationModel.customer.pivotRows.map((r) => {
                            const tone = r.delta > 0 ? "#15803d" : r.delta < 0 ? "#b91c1c" : "#6b7280";
                            return (
                              <tr key={`cust-pivot-${r.name}`}>
                                <td style={{ padding: 8, borderBottom: "1px solid #eef4ff" }}>{r.name}</td>
                                <td style={{ padding: 8, borderBottom: "1px solid #eef4ff", textAlign: "right" }}>{money(r.curr)}</td>
                                <td style={{ padding: 8, borderBottom: "1px solid #eef4ff", textAlign: "right" }}>{money(r.prev)}</td>
                                <td style={{ padding: 8, borderBottom: "1px solid #eef4ff", textAlign: "right", color: tone }}>{pct(r.deltaPct)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className={s.card} style={{ marginTop: 12 }}>
                  <h4 style={{ marginTop: 0 }}>Tabla dinamica - Producto</h4>
                  <p className={s.muted}>Productos con mayor variacion entre {variationModel.prevMonth || "N/A"} y {variationModel.currMonth || "N/A"}.</p>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #d5e2f7" }}>Etiquetas de fila</th>
                          <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #d5e2f7" }}>{variationModel.currMonth || "Actual"}</th>
                          <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #d5e2f7" }}>{variationModel.prevMonth || "Base"}</th>
                          <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #d5e2f7" }}>Variacion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {variationModel.product.pivotRows.map((r) => {
                          const tone = r.delta > 0 ? "#15803d" : r.delta < 0 ? "#b91c1c" : "#6b7280";
                          return (
                            <tr key={`prod-pivot-${r.name}`}>
                              <td style={{ padding: 8, borderBottom: "1px solid #eef4ff" }}>{r.name}</td>
                              <td style={{ padding: 8, borderBottom: "1px solid #eef4ff", textAlign: "right" }}>{money(r.curr)}</td>
                              <td style={{ padding: 8, borderBottom: "1px solid #eef4ff", textAlign: "right" }}>{money(r.prev)}</td>
                              <td style={{ padding: 8, borderBottom: "1px solid #eef4ff", textAlign: "right", color: tone }}>{pct(r.deltaPct)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className={`${s.card} ${s.variationGraphCard}`} style={{ marginTop: 12 }}>
                  <h4 style={{ marginTop: 0 }}>Grafico desde tabla dinamica</h4>
                  <div className={`${s.navActions} ${s.variationGraphControls} ${s.noPrint}`} style={{ marginBottom: 8 }}>
                    <select className={s.input} value={tableGraphSource} onChange={(e) => setTableGraphSource(e.target.value as any)} style={{ maxWidth: 180 }}>
                      <option value="segment">Segmento</option>
                      <option value="customer">Cliente</option>
                      <option value="product">Producto</option>
                    </select>
                    <select className={s.input} value={String(tableGraphTopN)} onChange={(e) => setTableGraphTopN(Number(e.target.value || 6))} style={{ maxWidth: 140 }}>
                      <option value="4">Top 4</option>
                      <option value="6">Top 6</option>
                      <option value="8">Top 8</option>
                      <option value="10">Top 10</option>
                    </select>
                    {!compareAllMonths ? (
                      <>
                        <button className={deltaLabelMode === "pct" ? s.btnPrimary : s.btnSecondary} onClick={() => setDeltaLabelMode("pct")}>Delta %</button>
                        <button className={deltaLabelMode === "cop" ? s.btnPrimary : s.btnSecondary} onClick={() => setDeltaLabelMode("cop")}>Delta COP</button>
                      </>
                    ) : null}
                  </div>
                  <div style={chartBoxStyle} className={s.printChartSafe}>
                    <ResponsiveContainer width="100%" height="100%">
                      {compareAllMonths ? (
                        <BarChart data={variationGraphModel.allMonthsSeries} margin={{ top: 16, right: isPrinting ? 44 : 28, left: 8, bottom: isPrinting ? 52 : 36 }}>
                          <CartesianGrid strokeDasharray="2 6" stroke="#dbeafe" />
                          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5f769b" }} />
                          <YAxis tickFormatter={(v) => compactNum(Number(v))} tick={{ fontSize: 11, fill: "#5f769b" }} />
                          <Tooltip formatter={(v: any) => money(Number(v))} contentStyle={{ borderRadius: 10, border: "1px solid #d5e2f7" }} />
                          <Legend />
                          {variationGraphModel.topEntities.map((key, i) => (
                            <Bar key={`allm-${key}`} dataKey={key} name={String(key).slice(0, 24)} fill={["#2563eb", "#16a34a", "#f59e0b", "#dc2626"][i % 4]} radius={[6, 6, 0, 0]} />
                          ))}
                        </BarChart>
                      ) : (
                        <BarChart data={printSafePairRows} margin={{ top: 16, right: isPrinting ? 64 : 28, left: 8, bottom: isPrinting ? 68 : 36 }} barCategoryGap={isPrinting ? "30%" : "16%"}>
                          <CartesianGrid strokeDasharray="2 6" stroke="#dbeafe" />
                          <XAxis dataKey="name" tick={{ fontSize: isPrinting ? 10 : 11, fill: "#5f769b" }} />
                          <YAxis tickFormatter={(v) => compactNum(Number(v))} tick={{ fontSize: 11, fill: "#5f769b" }} />
                          <Tooltip formatter={(v: any, name: any) => [money(Number(v)), String(name)]} contentStyle={{ borderRadius: 10, border: "1px solid #d5e2f7" }} />
                          <Legend wrapperStyle={isPrinting ? { fontSize: 11, bottom: -18, left: 0, right: 0 } : undefined} />
                          <Bar dataKey="prev" name={isPrinting ? `Base (${variationModel.prevMonth || ""})` : `Mes base (${variationModel.prevMonth || ""})`} fill="#94a3b8" radius={[6, 6, 0, 0]} />
                          <Bar
                            dataKey="curr"
                            name={isPrinting ? `Comp (${variationModel.currMonth || ""})` : `Mes comparado (${variationModel.currMonth || ""})`}
                            radius={[6, 6, 0, 0]}
                            label={({ x, y, width, index }) => {
                              const idx = Number(index ?? -1);
                              const row = idx >= 0 ? printSafePairRows[idx] : null;
                              const prevRaw = Number(row?.prev || 0);
                              const currRaw = Number(row?.curr || 0);
                              const delta = currRaw - prevRaw;
                              const pct = prevRaw === 0 ? (currRaw > 0 ? 100 : 0) : (delta / prevRaw) * 100;
                              const absPct = Math.abs(pct);
                              const pctText = absPct < 0.05
                                ? (delta === 0 ? "0.0%" : `${pct >= 0 ? "+" : "-"}<0.1%`)
                                : `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
                              const txt = deltaLabelMode === "pct"
                                ? pctText
                                : `${delta >= 0 ? "+" : "-"}${money(Math.abs(delta))}`;
                              const color = pct >= 0 ? "#0f766e" : "#b91c1c";
                              return (
                                <text x={Number(x) + Number(width) / 2} y={Number(y) - 8} textAnchor="middle" fill={color} fontSize={11} fontWeight={700}>
                                  {txt}
                                </text>
                              );
                            }}
                          >
                            {printSafePairRows.map((row, idx) => (
                              <Cell key={`curr-cell-${idx}`} fill={Number(row.delta || 0) >= 0 ? "#16a34a" : "#dc2626"} />
                            ))}
                          </Bar>
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                  {!compareAllMonths ? (
                    <p className={s.muted} style={{ marginTop: 8, marginBottom: 0 }}>
                      Verde = top sube, rojo = top baja. La etiqueta muestra {deltaLabelMode === "pct" ? "variacion porcentual" : "delta en COP"} frente al mes base.
                    </p>
                  ) : null}
                </div>

                {yoyModel.hasAnnualData ? (
                  <>
                    <div className={s.navActions} style={{ marginTop: 12, marginBottom: 8 }}>
                      <span className={s.muted}>Comparativo anual (mismo mes entre años):</span>
                      <select className={s.input} value={compareMonth} onChange={(e) => setCompareMonth(e.target.value)} style={{ maxWidth: 240 }}>
                        {yoyModel.monthOptions.map((mm) => (
                          <option key={`cmp-${mm}`} value={mm}>{`${mm} (${yoyModel.prevYear}-${mm} vs ${yoyModel.latestYear}-${mm})`}</option>
                        ))}
                      </select>
                    </div>
                    <div className={s.grid2}>
                      <div className={s.card}>
                        <h4 style={{ marginTop: 0 }}>Anual Enero-Abril: crece/baja por mes</h4>
                        {yoyModel.yoyByMonth.map((m) => (
                          <div key={`yoy-${m.monthNum}`} className={s.muted}>
                            - {m.month}: {m.status.toUpperCase()} | {yoyModel.prevYear}: {money(m.prev)} | {yoyModel.latestYear}: {money(m.curr)} | Delta: {money(m.delta)} | {pct(m.deltaPct)}
                          </div>
                        ))}
                      </div>
                      <div className={s.card}>
                        <h4 style={{ marginTop: 0 }}>Clientes anual ({yoyModel.prevYear}-{yoyModel.selected} vs {yoyModel.latestYear}-{yoyModel.selected})</h4>
                        {(yoyModel.customer.up || []).slice(0, 4).map((r) => (
                          <div key={`cy-up-${r.name}`} className={s.muted}>- Sube: {r.name} | Prev: {money(r.prev)} | Actual: {money(r.curr)} | Delta: {money(r.delta)} | {pct(r.deltaPct)}</div>
                        ))}
                        {(yoyModel.customer.down || []).slice(0, 4).map((r) => (
                          <div key={`cy-dn-${r.name}`} className={s.muted}>- Baja: {r.name} | Prev: {money(r.prev)} | Actual: {money(r.curr)} | Delta: {money(r.delta)} | {pct(r.deltaPct)}</div>
                        ))}
                      </div>
                      <div className={s.card}>
                        <h4 style={{ marginTop: 0 }}>Productos anual ({yoyModel.prevYear}-{yoyModel.selected} vs {yoyModel.latestYear}-{yoyModel.selected})</h4>
                        {(yoyModel.product.up || []).slice(0, 4).map((r) => (
                          <div key={`py-up-${r.name}`} className={s.muted}>- Sube: {r.name} | Prev: {money(r.prev)} | Actual: {money(r.curr)} | Delta: {money(r.delta)} | {pct(r.deltaPct)}</div>
                        ))}
                        {(yoyModel.product.down || []).slice(0, 4).map((r) => (
                          <div key={`py-dn-${r.name}`} className={s.muted}>- Baja: {r.name} | Prev: {money(r.prev)} | Actual: {money(r.curr)} | Delta: {money(r.delta)} | {pct(r.deltaPct)}</div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : null}
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
