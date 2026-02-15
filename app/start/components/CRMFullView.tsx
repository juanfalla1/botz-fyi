"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { 
  Users, Calendar, Activity, TrendingUp, BarChart3, Globe, PieChart as PieIcon,
  Loader2, Settings, X, Zap, MessageCircle, Share2, 
  ChevronLeft, Layout, Save, Briefcase, CreditCard, Clock3, ShieldCheck, AlertTriangle, CheckCircle2, Building2
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area 
} from "recharts";
import LeadsTable, { Lead } from "./LeadsTable";
import LoginForm from "./LoginForm";
import RegistroAsesor from "./RegistroAsesor";
import TeamManagement from "./TeamManagement";
import PlatformTenantsView from "./PlatformTenantsView";
import { useAuth } from "../MainLayout";

// ================= 1. ESQUEMAS DE CONFIGURACIÓN =================
const CHANNEL_SCHEMAS: Record<string, any> = {
  whatsapp: {
    title: "WhatsApp Business API",
    fields: [
      { id: "phone_id", label: "Identificador de número de teléfono", type: "text", defaultValue: "927985817066043" },
      { id: "waba_id", label: "Identificador de cuenta de WhatsApp Business", type: "text", defaultValue: "1558972865146795" },
      { id: "verify_token", label: "WHATSAPP_VERIFY_TOKEN", type: "text", placeholder: "Token para validar el Webhook" },
      { id: "access_token", label: "WHATSAPP_ACCESS_TOKEN", type: "password", placeholder: "Token de acceso permanente" }
    ]
  },
  meta: {
    title: "Meta Ads (Facebook & Instagram)",
    fields: [
      { id: "instance_name", label: "Nombre de esta Instancia", type: "text", placeholder: "Ej: Meta_Principal" }, 
      { id: "pixel_id", label: "ID del Píxel", type: "text", placeholder: "Ej: 88273645" },
      { id: "access_token", label: "System User Access Token", type: "password", placeholder: "EAAB..." },
      { id: "ad_account", label: "ID Cuenta Publicitaria", type: "text", placeholder: "act_12345" },
      { id: "app_secret", label: "App Secret (Seguridad)", type: "password", placeholder: "Desde Meta Developers" },
      { id: "page_id", label: "ID de la Página vinculada", type: "text", placeholder: "ID numérico de la FanPage" }
    ]
  },
  mortgage_strategy: {
    title: "Reglas de Calificación Hipotecaria",
    fields: [
      { id: "min_income", label: "Ingreso Mensual Mínimo (€)", type: "number", defaultValue: "1500" },
      { id: "interest_rate", label: "Tasa de Interés para Cálculos (%)", type: "number", defaultValue: "3.5" },
      { id: "max_ltv", label: "LTV Máximo Permitido (%)", type: "number", defaultValue: "80" }
    ]
  },
  landings: {
    title: "Landing Pages & Sitios Web",
    fields: [
      { id: "webhook_url", label: "URL de recepción (Webhook)", type: "text", defaultValue: "https://api.botz.com/v1/webhook/incoming", readonly: true },
      { id: "api_key", label: "API Key de Validación", type: "password", placeholder: "Clave para validar envíos" }
    ]
  }
};

// ================= ESTILOS =================
const cardStyle: React.CSSProperties = {
  background: "rgba(15, 23, 42, 0.6)", 
  backdropFilter: "blur(12px)",
  border: "1px solid rgba(51, 65, 85, 0.5)",
  borderRadius: "20px",
  padding: "24px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
  display: "flex",
  flexDirection: "column",
  animation: "fadeIn 0.5s ease-in-out"
};

const CustomTooltip = ({ active, payload, quantityLabel = "Cantidad" }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const name = data.name; 
    const value = data.value;
    const color = data.payload.fill || data.payload.color;

    return (
      <div style={{ background: "var(--botz-surface-2)", border: "1px solid var(--botz-border-strong)", padding: "12px", borderRadius: "12px", boxShadow: "var(--botz-shadow-2)", minWidth: "140px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
          <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: color }}></div>
          <p style={{ fontWeight: "bold", color: "var(--botz-text)", fontSize: "13px", margin: 0 }}>{name}</p>
        </div>
        <p style={{ color: "var(--botz-muted)", fontSize: "12px", margin: 0, paddingLeft: "18px" }}>
          {quantityLabel}: <span style={{ fontWeight: "bold", color: "var(--botz-text)", fontSize: "14px" }}>{value}</span>
        </p>
      </div>
    );
  }
  return null;
};

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#ef4444", "#06b6d4", "#84cc16"];

type AppLanguage = "es" | "en";

const CONTROL_TEXT: Record<AppLanguage, Record<string, string>> = {
  es: {
    controlCenter: "Centro de Control Botz",
    channels: "Canales",
    strategy: "Estrategia",
    account: "Cuenta",
    team: "Equipo",
    leadSources: "Fuentes de Captacion",
    accountTitle: "Cuenta y Suscripcion",
    plan: "Plan",
    nextInvoice: "Proxima factura",
    tenant: "Tenant",
    billingHidden: "Informacion de pago oculta",
    adminOnly: "Solo admin",
    cycle: "Ciclo",
    accountId: "Identificador de la cuenta",
    usageLimits: "Uso y limites del plan",
    activeAdvisors: "Asesores activos",
    monthLeads: "Leads este mes",
    channelsConfigured: "Canales configurados",
    advisorBillingNote: "Como asesor, no ves datos sensibles de facturacion. Solo el admin puede ver pago y renovacion.",
    adminTip: "Recomendacion: revisa este panel al inicio de cada semana para anticipar limites y renovaciones.",
    noAccountData: "No se pudo cargar la informacion de cuenta.",
    back: "Volver",
    saveConfig: "Guardar Configuracion",
    saved: "Configuracion guardada.",
    saveError: "Error al guardar.",
    quantity: "Cantidad",
    weekly: "Semanal (5d)",
    monthly: "Mensual",
    controlCenterBtn: "Centro de Control",
    totalLeads: "Leads Totales",
    fullDatabaseShort: "Base de datos completa",
    leadsThisMonth: "Leads este Mes",
    sinceDay1: "Desde el día 1",
    conversionRate: "Tasa Conversión",
    salesShort: "ventas",
    activeChannels: "Canales Activos",
    trafficSources: "Fuentes de tráfico",
    flowLast: "Flujo: Últimos",
    days5: "5 días",
    days30: "30 días",

    channelsTitle: "Canales",
    statusesTitle: "Estados",
    emptyShort: "Vacío",
    notAvailable: "No disponible",
  },
  en: {
    controlCenter: "Botz Control Center",
    channels: "Channels",
    strategy: "Strategy",
    account: "Account",
    team: "Team",
    leadSources: "Lead Sources",
    accountTitle: "Account & Subscription",
    plan: "Plan",
    nextInvoice: "Next invoice",
    tenant: "Tenant",
    billingHidden: "Billing info hidden",
    adminOnly: "Admin only",
    cycle: "Cycle",
    accountId: "Account identifier",
    usageLimits: "Plan usage and limits",
    activeAdvisors: "Active advisors",
    monthLeads: "Leads this month",
    channelsConfigured: "Configured channels",
    advisorBillingNote: "As an advisor, you cannot see sensitive billing data. Only admins can view payments and renewals.",
    adminTip: "Tip: review this panel weekly to stay ahead of limits and renewals.",
    noAccountData: "Could not load account information.",
    back: "Back",
    saveConfig: "Save Configuration",
    saved: "Configuration saved.",
    saveError: "Error while saving.",
    quantity: "Count",
    weekly: "Weekly (5d)",
    monthly: "Monthly",
    controlCenterBtn: "Control Center",
    totalLeads: "Total Leads",
    fullDatabaseShort: "Full database",
    leadsThisMonth: "Leads This Month",
    sinceDay1: "Since day 1",
    conversionRate: "Conversion Rate",
    salesShort: "sales",
    activeChannels: "Active Channels",
    trafficSources: "Traffic sources",
    flowLast: "Flow: Last",
    days5: "5 days",
    days30: "30 days",

    channelsTitle: "Channels",
    statusesTitle: "Statuses",
    emptyShort: "Empty",
    notAvailable: "Not available",
  },
};

// 👇 AQUÍ ESTÁ LA SOLUCIÓN AL ERROR ROJO 👇
// Estamos definiendo que este componente ACEPTA "globalFilter"
export default function CRMFullView({ globalFilter }: { globalFilter?: string | null }) {
  // Separar data para evitar confusiones y mejorar rendimiento:
  // - metricRows: ventana reciente (graficos)
  // - tableLeads: base completa (tabla)
  const [metricRows, setMetricRows] = useState<Lead[]>([]);
  const [tableLeads, setTableLeads] = useState<Lead[]>([]);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'week' | 'month'>('month');
  const [authView, setAuthView] = useState<"login" | "register">("login");
  const { isAdmin, isAsesor, isPlatformAdmin, user, tenantId, teamMemberId, userPlan, subscription } = useAuth(); // Hook para detectar rol y obtener datos
   
  // ESTADOS PARA EL MODAL
  const [showConfig, setShowConfig] = useState(false);
  const [activeConfigTab, setActiveConfigTab] = useState("canales");
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [language, setLanguage] = useState<AppLanguage>("es");
  const t = CONTROL_TEXT[language];
  const uiLocale = language === "en" ? "en-US" : "es-CO";
  const shortDayLocale = language === "en" ? "en-US" : "es-ES";

  useEffect(() => {
    const saved = localStorage.getItem("botz-language");
    if (saved === "es" || saved === "en") {
      setLanguage(saved);
    }

    const onLangChange = (event: Event) => {
      const next = (event as CustomEvent<AppLanguage>).detail;
      if (next === "es" || next === "en") {
        setLanguage(next);
      }
    };

    window.addEventListener("botz-language-change", onLangChange);
    return () => window.removeEventListener("botz-language-change", onLangChange);
  }, []);

  const [accountLoading, setAccountLoading] = useState(false);
  const [accountSummary, setAccountSummary] = useState<{
    tenantId: string | null;
    plan: string;
    status: string;
    billingCycle: string;
    nextInvoiceDate: string | null;
    teamUsed: number;
    leadsMonthUsed: number;
    channelsUsed: number;
    teamLimit: number | null;
    leadsMonthLimit: number | null;
    channelsLimit: number | null;
  } | null>(null);

  const PLAN_LIMITS: Record<string, { team: number | null; leadsMonthly: number | null; channels: number | null }> = {
    free: { team: 1, leadsMonthly: 100, channels: 2 },
    basico: { team: 3, leadsMonthly: 500, channels: 4 },
    basic: { team: 3, leadsMonthly: 500, channels: 4 },
    starter: { team: 3, leadsMonthly: 500, channels: 4 },
    pro: { team: 10, leadsMonthly: 5000, channels: 10 },
    premium: { team: 10, leadsMonthly: 5000, channels: 10 },
    business: { team: 25, leadsMonthly: 20000, channels: 20 },
    enterprise: { team: null, leadsMonthly: null, channels: null },
  };

  const normalizePlan = (planRaw: string | null | undefined) =>
    String(planRaw || "free")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const formatDate = (dateRaw?: string | null) => {
    if (!dateRaw) return t.notAvailable;
    const d = new Date(dateRaw);
    if (Number.isNaN(d.getTime())) return t.notAvailable;
    return d.toLocaleDateString(uiLocale, { year: "numeric", month: "short", day: "numeric" });
  };

  const getProgress = (used: number, limit: number | null) => {
    if (!limit || limit <= 0) return 0;
    return Math.min(100, Math.round((used / limit) * 100));
  };

  const loadAccountSummary = async () => {
    try {
      setAccountLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const resolvedTenantId =
        tenantId ||
        session.user?.user_metadata?.tenant_id ||
        session.user?.app_metadata?.tenant_id ||
        null;

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      let teamUsed = 0;
      let leadsMonthUsed = 0;
      let channelsUsed = 0;

      if (resolvedTenantId) {
        const [teamRes, leadsMonthRes] = await Promise.all([
          supabase
            .from("team_members")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", resolvedTenantId)
            .eq("activo", true),
          supabase
            .from("leads")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", resolvedTenantId)
            .gte("created_at", monthStart.toISOString()),
        ]);

        teamUsed = teamRes.count || 0;
        leadsMonthUsed = leadsMonthRes.count || 0;
      } else {
        const myLeads = tableLeads.filter((l: any) => {
          const created = l?.created_at ? new Date(l.created_at) : null;
          return !!created && created >= monthStart;
        });
        leadsMonthUsed = myLeads.length;
        teamUsed = isAsesor ? 1 : 0;
      }

      const { data: channelsData } = await supabase
        .from("user_configs")
        .select("channel")
        .eq("user_id", session.user.id);

      channelsUsed = new Set((channelsData || []).map((c: any) => c.channel)).size;

      const planKey = normalizePlan(subscription?.plan || userPlan || "free");
      const planLimits = PLAN_LIMITS[planKey] || PLAN_LIMITS.free;

      const subscriptionAny = (subscription || {}) as any;
      const nextInvoiceDate =
        subscriptionAny.current_period_end ||
        subscriptionAny.next_billing_date ||
        subscriptionAny.renew_at ||
        subscriptionAny.expires_at ||
        null;

      setAccountSummary({
        tenantId: resolvedTenantId,
        plan: subscription?.plan || userPlan || "free",
        status: subscription?.status || "free",
        billingCycle: String(subscriptionAny.billing_cycle || "mensual"),
        nextInvoiceDate,
        teamUsed,
        leadsMonthUsed,
        channelsUsed,
        teamLimit: planLimits.team,
        leadsMonthLimit: planLimits.leadsMonthly,
        channelsLimit: planLimits.channels,
      });
    } catch (e) {
      console.error("Error cargando resumen de cuenta:", e);
    } finally {
      setAccountLoading(false);
    }
  };

  useEffect(() => {
    if (!showConfig || activeConfigTab !== "cuenta") return;
    loadAccountSummary();
  }, [showConfig, activeConfigTab, tenantId, subscription?.id, userPlan, isAsesor, tableLeads.length]);


  // Rendimiento: para graficos usamos ventana reciente (semana/mes).
  const fetchRecentFromTable = async (
    table: string,
    days: number,
    filterField?: string,
    filterValue?: string,
    extraTenantFilter?: string | null,
    limit: number = 2000
  ) => {
    const since = new Date();
    since.setDate(since.getDate() - days);

    let query = supabase
      .from(table)
      .select("*")
      .order("created_at", { ascending: false })
      .gte("created_at", since.toISOString())
      .limit(limit);

    if (filterField && filterValue) query = query.eq(filterField, filterValue);
    if (extraTenantFilter) query = query.eq("tenant_id", extraTenantFilter);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  };

  // Tabla: base completa (pero solo columnas necesarias) para no "perder" leads antiguos.
  const fetchAllLeadsForTable = async (effectiveTenantId: string | null) => {
    // Columnas usadas por LeadsTable (mantener payload liviano)
    const selectCols = [
      "id",
      "created_at",
      "name",
      "email",
      "phone",
      "status",
      "next_action",
      "calificacion",
      "origen",
      "source",
      "asesor_id",
      "assigned_to",
      "asesor_nombre",
      "estado_operacion",
      "tenant_id",
      "user_id",
      "resumen_chat",
      "ultimo_mensaje_bot",
    ].join(",");

    let q = supabase
      .from("leads")
      .select(selectCols)
      .order("created_at", { ascending: false })
      .limit(5000);

    if (effectiveTenantId) q = q.eq("tenant_id", effectiveTenantId);

    if (isAsesor && teamMemberId) {
      q = q.or(`asesor_id.eq.${teamMemberId},assigned_to.eq.${teamMemberId}`);
    }

    const { data, error } = await q;
    if (error) throw error;
    return (data || []) as any[];
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (session) {
        const days = timeFilter === 'week' ? 5 : 30;

        const effectiveTenantId =
          tenantId ||
          session.user?.user_metadata?.tenant_id ||
          session.user?.app_metadata?.tenant_id ||
          null;

        // Consultas en paralelo: tabla completa + ventana reciente + tracker
        const since = new Date();
        since.setDate(since.getDate() - days);

        const allLeadsPromise = fetchAllLeadsForTable(effectiveTenantId).catch((e) => {
          console.error("Error fetching full leads table:", e);
          return [] as any[];
        });

        const recentLeadsPromise = (async () => {
          let recentQuery = supabase
            .from("leads")
            .select("*")
            .order("created_at", { ascending: false })
            .gte("created_at", since.toISOString())
            .limit(2000);

          if (effectiveTenantId) recentQuery = recentQuery.eq("tenant_id", effectiveTenantId);
          if (isAsesor && teamMemberId) {
            recentQuery = recentQuery.or(`asesor_id.eq.${teamMemberId},assigned_to.eq.${teamMemberId}`);
          }

          const { data, error } = await recentQuery;
          if (error) throw error;
          return (data || []) as any[];
        })().catch((e) => {
          console.error("Error fetching recent leads:", e);
          return [] as any[];
        });

        const trackerPromise = fetchRecentFromTable(
          "demo_tracker_botz",
          days,
          "user_id",
          session.user.id,
          null,
          2000
        ).catch(() => [] as any[]);

        const [allLeadsData, recentLeadsData, trackerData] = await Promise.all([
          allLeadsPromise,
          recentLeadsPromise,
          trackerPromise,
        ]);

        const normalize = (arr: any[], source: string) => arr.map((l) => {
            let rawOrigin = l.origen || l.source || l.channel;
            if (!rawOrigin || (typeof rawOrigin === 'string' && rawOrigin.trim() === "")) {
                rawOrigin = "";
            }
            return {
                ...l,
                sourceTable: source,
                // Cambia la línea 156 por esta:
                status: (String(l.status || "nuevo").toLowerCase() === "nuevo" ? "Nuevo" : (l.status || "Nuevo")),
                created_at: l.created_at || new Date().toISOString(),
                origen: String(rawOrigin).trim()
            };
        });

        // Tabla solo con leads (no tracker)
        const normalizedTableLeads = (allLeadsData || []).map((l) => ({
          ...l,
          sourceTable: "leads",
          status: (String(l.status || "nuevo").toLowerCase() === "nuevo" ? "Nuevo" : (l.status || "Nuevo")),
          created_at: l.created_at || new Date().toISOString(),
          origen: String((l.origen || l.source || "")).trim(),
        }));

        setTableLeads(
          normalizedTableLeads.sort((a: any, b: any) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime())
        );

        // Graficos con ventana (leads + tracker)
        const metricData = [
          ...normalize(recentLeadsData || [], "leads"),
          ...normalize(trackerData || [], "demo_tracker_botz"),
        ];

        setMetricRows(
          metricData.sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime())
        );
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeFilter, isAsesor, teamMemberId, tenantId]);

  // Lógica de filtrado unificada (Fecha + Filtro Global del Dock + Rol)
  const filteredLeads = metricRows.filter(l => {
    // 0. Filtro por rol - ASESORES solo ven sus leads asignados
    if (isAsesor && teamMemberId) {
      const ok = l.asesor_id === teamMemberId || (l as any).assigned_to === teamMemberId;
      if (!ok) {
        return false;
      }
    }

    // 1. Filtro de Fecha
    if (!l.created_at) return false;
    const date = new Date(l.created_at);
    const now = new Date();
    const daysToSubtract = timeFilter === 'week' ? 5 : 30; 
    const limitDate = new Date();
    limitDate.setDate(now.getDate() - daysToSubtract);
    
    const matchesDate = date >= limitDate;

    // 2. Filtro Global (Dock) para que los gráficos también cambien
    let matchesGlobal = true;
    if (globalFilter) {
        const source = (l.origen || l.source || "").toLowerCase();
        matchesGlobal = source.includes(globalFilter.toLowerCase());
    }

    return matchesDate && matchesGlobal;
  });

  const totalLeads = tableLeads.length;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const leadsMes = tableLeads.filter(l => l.created_at && new Date(l.created_at) >= monthStart).length;
  const convertidos = tableLeads.filter(l => ["convertido", "cerrado", "vendido", "firmado"].includes((l.status || "").toLowerCase())).length;
  const tasaConversion = totalLeads > 0 ? ((convertidos / totalLeads) * 100).toFixed(1) : "0";

  const daysToShow = timeFilter === 'week' ? 5 : 30;
  const activityData = Array.from({ length: daysToShow }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (daysToShow - 1 - i)); 
    const label = d.toLocaleDateString(shortDayLocale, { weekday: 'short', day: 'numeric' });
    const count = filteredLeads.filter(l => {
        const leadDate = new Date(l.created_at);
        return leadDate.getDate() === d.getDate() && leadDate.getMonth() === d.getMonth();
    }).length;
    return { day: label, leads: count };
  });

  const channelMap: Record<string, number> = {};
  filteredLeads.forEach(l => {
    let origin = l.origen || "Web";
    let key = origin.charAt(0).toUpperCase() + origin.slice(1);
    channelMap[key] = (channelMap[key] || 0) + 1;
  });
  
  const channelData = Object.entries(channelMap).map(([name, value], i) => ({
    name, value, color: COLORS[i % COLORS.length]
  }));

  const statusMap: Record<string, number> = {};
  filteredLeads.forEach(l => { 
    const status = l.status || "nuevo";
    statusMap[status] = (statusMap[status] || 0) + 1; 
  });
  const statusData = Object.entries(statusMap).map(([name, value], i) => ({
    name, value, color: COLORS[(i + 2) % COLORS.length]
  }));

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: "100px" }}><Loader2 className="animate-spin" size={32} color="#10b2cb" /></div>;
  
  // ✅ CAMBIO 3: Render de login/registro
  if (!session) {
    if (authView === "login") {
      return (
        <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <LoginForm 
            onSuccess={fetchData} 
            onRegisterClick={() => setAuthView("register")}
          />
        </div>
      );
    } else {
      return (
        <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <RegistroAsesor
            onSuccess={() => setAuthView("login")}
            onLoginClick={() => setAuthView("login")}
          />
        </div>
      );
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "30px", width: "100%" }}>
      
      {/* HEADER INTEGRADO */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "8px", background: "rgba(30, 41, 59, 0.5)", padding: "4px", borderRadius: "12px", border: "1px solid rgba(71, 85, 105, 0.5)" }}>
            <button onClick={() => setTimeFilter('week')} style={{ padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "bold", cursor: "pointer", border: "none", background: timeFilter === 'week' ? "#3b82f6" : "transparent", color: "white" }}>{t.weekly}</button>
            <button onClick={() => setTimeFilter('month')} style={{ padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "bold", cursor: "pointer", border: "none", background: timeFilter === 'month' ? "#3b82f6" : "transparent", color: "white" }}>{t.monthly}</button>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => setShowConfig(true)} style={btnConfigStyle}><Settings size={14} /> {t.controlCenterBtn}</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
        {[
          { label: t.totalLeads, val: totalLeads, icon: <Users color="#60a5fa" />, sub: t.fullDatabaseShort },
          { label: t.leadsThisMonth, val: leadsMes, icon: <Calendar color="#facc15" />, sub: t.sinceDay1 },
          { label: t.conversionRate, val: `${tasaConversion}%`, icon: <TrendingUp color="#10b981" />, sub: `${convertidos} ${t.salesShort}` },
          { label: t.activeChannels, val: channelData.length, icon: <Activity color="#e879f9" />, sub: t.trafficSources },
        ].map((kpi, i) => (
          <div key={i} style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}><span style={{ color: "#94a3b8", fontSize: "14px" }}>{kpi.label}</span>{kpi.icon}</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "#fff" }}>{kpi.val}</div>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* GRÁFICOS CON TÍTULOS */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "20px" }}>
        <div style={{ ...cardStyle, minHeight: "300px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#fff", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}><BarChart3 size={18} color="#60a5fa" /> {t.flowLast} {timeFilter === 'week' ? t.days5 : t.days30}</h3>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={activityData}>
              <defs><linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#60a5fa" stopOpacity={0.8}/><stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip quantityLabel={t.quantity} />} />
              <Area type="monotone" dataKey="leads" stroke="#60a5fa" fillOpacity={1} fill="url(#colorLeads)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ ...cardStyle, minHeight: "300px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#fff", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}><Globe size={18} color="#10b981" /> {t.channelsTitle}</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={channelData.length > 0 ? channelData : [{name: t.emptyShort, value: 1, color: '#334155'}]} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" nameKey="name">
                {channelData.map((entry, index) => <Cell key={index} fill={entry.color} stroke="none" />)}
              </Pie>
              <Tooltip content={<CustomTooltip quantityLabel={t.quantity} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

         <div style={{ ...cardStyle, minHeight: "300px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#fff", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}><PieIcon size={18} color="#facc15" /> {t.statusesTitle}</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusData} layout="vertical">
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={110} stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip quantityLabel={t.quantity} />} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                {statusData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ✅ Tabla: base completa (no solo 30 dias) */}
      <LeadsTable
        initialLeads={tableLeads}
        session={session}
        globalFilter={globalFilter}
        onLeadPatch={(id, patch) => {
          setTableLeads((prev: any[]) =>
            prev.map((l: any) => (String(l.id) === String(id) ? { ...l, ...patch } : l))
          );
        }}
      />


      {/* ✅ MODAL CONFIGURACIÓN CON PERSISTENCIA */}
      {showConfig && (
        <div style={overlayStyle}>
          <div style={modalContainerStyle}>
            <button onClick={() => {setShowConfig(false); setSelectedChannel(null);}} style={closeButtonStyle}><X size={24} /></button>
            <div style={{ padding: (activeConfigTab === "equipo" || activeConfigTab === "clientes") ? "24px" : "40px" }}>
              <h2 style={{ color: "#fff", fontSize: "24px", fontWeight: "800", marginBottom: "30px", display: "flex", alignItems: "center", gap: "12px" }}>
                <Zap color="#10b2cb" fill="#10b2cb" size={24} /> {t.controlCenter}
              </h2>

              <div style={{ display: "flex", gap: (activeConfigTab === "equipo" || activeConfigTab === "clientes") ? "18px" : "30px", minHeight: "480px" }}>
                <aside style={sidebarStyle}>
                  <MenuButton label={t.channels} id="canales" icon={<Globe size={18} />} active={activeConfigTab} onClick={setActiveConfigTab} />
                  <MenuButton label={t.strategy} id="strategy" icon={<Briefcase size={18} />} active={activeConfigTab} onClick={setActiveConfigTab} />
                  <MenuButton label={t.account} id="cuenta" icon={<Users size={18} />} active={activeConfigTab} onClick={setActiveConfigTab} />
                  {isPlatformAdmin && (
                    <MenuButton label={language === "en" ? "Clients" : "Clientes"} id="clientes" icon={<Building2 size={18} />} active={activeConfigTab} onClick={setActiveConfigTab} />
                  )}
                  {isAdmin && (
                    <MenuButton label={t.team} id="equipo" icon={<Users size={18} color="#22d3ee" />} active={activeConfigTab} onClick={setActiveConfigTab} />
                  )}
                </aside>

                <main style={contentAreaStyle}>
                  {activeConfigTab === "canales" && (
                    !selectedChannel ? (
                      <div style={{animation: "fadeIn 0.3s ease"}}>
                        <h3 style={{ color: "#fff", marginBottom: "20px" }}>{t.leadSources}</h3>
                        <ChannelRow label="WhatsApp Business" icon={<MessageCircle color="#25D366" />} onConfigure={() => setSelectedChannel("whatsapp")} />
                        <ChannelRow label="Meta Ads" icon={<Share2 color="#0081FB" />} onConfigure={() => setSelectedChannel("meta")} />
                        <ChannelRow label="Landing Pages" icon={<Layout color="#e879f9" />} onConfigure={() => setSelectedChannel("landings")} />
                      </div>
                    ) : (
                      <PersistConfigForm channelId={selectedChannel} onBack={() => setSelectedChannel(null)} language={language} />
                    )
                  )}
                  {activeConfigTab === "strategy" && (
                    <PersistConfigForm channelId="mortgage_strategy" onBack={() => setActiveConfigTab("canales")} language={language} />
                  )}

                  {activeConfigTab === "clientes" && isPlatformAdmin && (
                    <div style={{ animation: "fadeIn 0.3s ease" }}>
                      <PlatformTenantsView />
                    </div>
                  )}

                  {activeConfigTab === "cuenta" && (
                    <div style={{ animation: "fadeIn 0.3s ease" }}>
                      <h3 style={{ color: "#fff", marginBottom: "18px", display: "flex", alignItems: "center", gap: "8px" }}>
                        <CreditCard size={18} color="#22d3ee" /> {t.accountTitle}
                      </h3>

                      {accountLoading ? (
                        <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
                          <Loader2 className="animate-spin" color="#10b2cb" />
                        </div>
                      ) : accountSummary ? (
                        <>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "12px", marginBottom: "14px" }}>
                            <AccountKpi
                              title={t.plan}
                              value={String(accountSummary.plan || "free").toUpperCase()}
                              subtitle={`Estado: ${accountSummary.status}`}
                              icon={<ShieldCheck size={16} color="#22d3ee" />}
                            />
                            <AccountKpi
                              title={t.nextInvoice}
                              value={isAdmin ? formatDate(accountSummary.nextInvoiceDate) : t.adminOnly}
                              subtitle={isAdmin ? `${t.cycle}: ${accountSummary.billingCycle}` : t.billingHidden}
                              icon={<Clock3 size={16} color="#fbbf24" />}
                            />
                            <AccountKpi
                              title={t.tenant}
                              value={accountSummary.tenantId ? `${accountSummary.tenantId.slice(0, 8)}...` : "N/A"}
                              subtitle={t.accountId}
                              icon={<Users size={16} color="#10b981" />}
                            />
                          </div>

                          <div style={{ background: "rgba(15, 23, 42, 0.45)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "16px" }}>
                            <div style={{ color: "#f8fafc", fontWeight: 700, marginBottom: "12px" }}>{t.usageLimits}</div>

                            <UsageRow
                              label={t.activeAdvisors}
                              used={accountSummary.teamUsed}
                              limit={accountSummary.teamLimit}
                              progress={getProgress(accountSummary.teamUsed, accountSummary.teamLimit)}
                            />
                            <UsageRow
                              label={t.monthLeads}
                              used={accountSummary.leadsMonthUsed}
                              limit={accountSummary.leadsMonthLimit}
                              progress={getProgress(accountSummary.leadsMonthUsed, accountSummary.leadsMonthLimit)}
                            />
                            <UsageRow
                              label={t.channelsConfigured}
                              used={accountSummary.channelsUsed}
                              limit={accountSummary.channelsLimit}
                              progress={getProgress(accountSummary.channelsUsed, accountSummary.channelsLimit)}
                            />

                            {!isAdmin && (
                              <div style={{ marginTop: "12px", fontSize: "12px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "6px" }}>
                                <AlertTriangle size={13} color="#fbbf24" />
                                {t.advisorBillingNote}
                              </div>
                            )}

                            {isAdmin && (
                              <div style={{ marginTop: "12px", fontSize: "12px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "6px" }}>
                                <CheckCircle2 size={13} color="#10b981" />
                                {t.adminTip}
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div style={{ color: "#94a3b8", fontSize: "14px", padding: "20px" }}>
                          {t.noAccountData}
                        </div>
                      )}
                    </div>
                  )}
                  {activeConfigTab === "equipo" && isAdmin && (
                    <div style={{ animation: "fadeIn 0.3s ease" }}>
                      <TeamManagement language={language} />
                    </div>
                  )}
                </main>
              </div>
            </div>
          </div>
        </div>
      )}
    </div> 
  );
}

// COMPONENTE DE FORMULARIO PERSISTENTE
function PersistConfigForm({ channelId, onBack, language }: { channelId: string, onBack: () => void, language: AppLanguage }) {
  const schema = CHANNEL_SCHEMAS[channelId];
  const t = CONTROL_TEXT[language];
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data } = await supabase.from("user_configs").select("settings").eq("user_id", session.user.id).eq("channel", channelId).maybeSingle();
        if (data?.settings) setFormData(data.settings);
        else {
          const initialData = schema.fields.reduce((acc: any, f: any) => { if (f.defaultValue) acc[f.id] = f.defaultValue; return acc; }, {});
          setFormData(initialData);
        }
      } finally { setLoading(false); }
    };
    load();
  }, [channelId]);

  const save = async () => {
    try {
      setSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { error } = await supabase.from("user_configs").upsert({
          user_id: session.user.id, channel: channelId, settings: formData, updated_at: new Date().toISOString()
      }, { onConflict: 'user_id, channel' });
      if (error) throw error;
      alert(`✅ ${t.saved}`);
      onBack();
    } catch (err) { alert(t.saveError); } finally { setSaving(false); }
  };

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: "50px" }}><Loader2 className="animate-spin" color="#10b2cb" /></div>;

  return (
    <div style={{animation: "fadeIn 0.3s ease"}}>
      <button onClick={onBack} style={{background: "none", border: "none", color: "#10b2cb", cursor: "pointer", marginBottom: "20px", display: "flex", alignItems: "center", gap: "5px", fontSize: "14px", padding: 0}}><ChevronLeft size={16} /> {t.back}</button>
      <h3 style={{ color: "#fff", marginBottom: "24px", fontSize: "18px" }}>{schema.title}</h3>
      <div style={{display: "flex", flexDirection: "column", gap: "18px"}}>
        {schema.fields.map((f: any) => (
          <div key={f.id} style={{display: "flex", flexDirection: "column", gap: "6px"}}>
            <label style={{color: "#94a3b8", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase"}}>{f.label}</label>
            <input type={f.type} value={formData[f.id] || ""} onChange={(e) => setFormData({...formData, [f.id]: e.target.value})} placeholder={f.placeholder} readOnly={f.readonly} style={{ background: f.readonly ? "rgba(0,0,0,0.2)" : "rgba(30, 41, 59, 0.5)", border: "1px solid rgba(255,255,255,0.1)", padding: "12px", borderRadius: "10px", color: "#fff", outline: "none", fontSize: "14px" }} />
          </div>
        ))}
        <button onClick={save} disabled={saving} style={{ marginTop: "10px", background: "#10b2cb", color: "#fff", border: "none", padding: "14px", borderRadius: "12px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
          {saving ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> {t.saveConfig}</>}
        </button>
      </div>
    </div>
  );
}

// COMPONENTES AUXILIARES
function MenuButton({ label, id, icon, active, onClick }: any) {
  const isA = active === id;
  return (
    <button onClick={() => onClick(id)} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderRadius: "10px", background: isA ? "rgba(16, 178, 203, 0.15)" : "transparent", color: isA ? "#10b2cb" : "#94a3b8", border: "none", cursor: "pointer", fontWeight: isA ? "bold" : "normal", textAlign: "left" }}>{icon} {label}</button>
  );
}

function ChannelRow({ label, icon, onConfigure }: any) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#fff" }}>{icon} <span style={{fontSize: "14px"}}>{label}</span></div>
      <button onClick={onConfigure} style={{ background: "rgba(16,178,203,0.1)", color: "#10b2cb", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}>Configurar</button>
    </div>
  );
}

function AccountKpi({ title, value, subtitle, icon }: { title: string; value: string; subtitle: string; icon: React.ReactNode }) {
  return (
    <div
      style={{
        background: "rgba(15, 23, 42, 0.45)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "14px",
        padding: "14px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
        <span style={{ fontSize: "12px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.3px" }}>{title}</span>
        <span>{icon}</span>
      </div>
      <div style={{ color: "#f8fafc", fontSize: "18px", fontWeight: 800, marginBottom: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={value}>
        {value}
      </div>
      <div style={{ color: "#94a3b8", fontSize: "12px" }}>{subtitle}</div>
    </div>
  );
}

function UsageRow({ label, used, limit, progress }: { label: string; used: number; limit: number | null; progress: number }) {
  const overLimit = !!limit && used > limit;

  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <span style={{ color: "#cbd5e1", fontSize: "13px" }}>{label}</span>
        <span style={{ color: overLimit ? "#f87171" : "#e2e8f0", fontSize: "12px", fontWeight: 700 }}>
          {limit ? `${used} / ${limit}` : `${used} / ilimitado`}
        </span>
      </div>
      <div style={{ height: "8px", background: "rgba(148,163,184,0.2)", borderRadius: "999px", overflow: "hidden" }}>
        <div
          style={{
            width: `${limit ? Math.min(100, progress) : 100}%`,
            height: "100%",
            background: overLimit ? "#ef4444" : progress >= 90 ? "#f59e0b" : "#22d3ee",
            transition: "width 0.25s ease",
          }}
        />
      </div>
    </div>
  );
}

const btnConfigStyle = { display: "flex", alignItems: "center", gap: "8px", background: "rgba(16, 178, 203, 0.1)", color: "#10b2cb", border: "1px solid rgba(16, 178, 203, 0.3)", padding: "8px 16px", borderRadius: "10px", fontSize: "12px", fontWeight: "bold" as const, cursor: "pointer" };
const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center" };
const modalContainerStyle: React.CSSProperties = {
  width: "98%",
  maxWidth: "1180px",
  background: "#0d1117",
  borderRadius: "24px",
  border: "1px solid rgba(16, 178, 203, 0.3)",
  position: "relative",
  maxHeight: "94vh",
  overflow: "auto",
};
const sidebarStyle: React.CSSProperties = { width: "170px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "5px" };
const contentAreaStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  background: "rgba(255,255,255,0.02)",
  borderRadius: "20px",
  padding: "20px",
  border: "1px solid rgba(255,255,255,0.05)",
};
const closeButtonStyle: React.CSSProperties = { position: "absolute", top: "20px", right: "20px", background: "none", border: "none", color: "#64748b", cursor: "pointer" };
