"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Bot,
  CalendarDays,
  ChevronDown,
  Database,
  FileBarChart,
  Gauge,
  GitBranch,
  LayoutDashboard,
  Megaphone,
  MousePointerClick,
  PanelLeftClose,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Unplug,
  Users,
} from "lucide-react";
import { FaGoogle, FaMeta } from "react-icons/fa6";
import { useAuth } from "../MainLayout";
import useBotzLanguage from "../hooks/useBotzLanguage";
import { getMarketingDemoOverview } from "@/lib/marketing/demo-data";
import type { MarketingDatePreset, MarketingMetric, MarketingMetricKey } from "@/lib/marketing/types";
import styles from "./marketing.module.css";

const navigation = [
  ["overview", "Overview", LayoutDashboard],
  ["campaigns", "Campaigns", Megaphone],
  ["meta", "Meta Ads", Target],
  ["google", "Google Ads", Search],
  ["analytics", "Analytics", BarChart3],
  ["leads", "Leads", Users],
  ["crm", "CRM", Database],
  ["attribution", "Attribution", GitBranch],
  ["reports", "Reports", FileBarChart],
  ["copilot", "AI Copilot", Bot],
  ["integrations", "Integrations", Unplug],
  ["settings", "Settings", Settings],
] as const;

const metricLabels: Record<"es" | "en", Record<MarketingMetricKey, string>> = {
  es: {
    totalSpend: "Inversion total", metaSpend: "Inversion Meta", googleSpend: "Inversion Google", impressions: "Impresiones",
    reach: "Alcance", clicks: "Clics", ctr: "CTR", cpc: "CPC", cpm: "CPM", leads: "Leads", cpl: "Costo por lead",
    conversions: "Conversiones", conversionRate: "Tasa de conversion", opportunities: "Oportunidades", customers: "Clientes",
    cac: "Costo de adquisicion", revenue: "Ingresos", roas: "ROAS", roi: "ROI",
  },
  en: {
    totalSpend: "Total Ad Spend", metaSpend: "Meta Spend", googleSpend: "Google Spend", impressions: "Impressions",
    reach: "Reach", clicks: "Clicks", ctr: "CTR", cpc: "CPC", cpm: "CPM", leads: "Leads", cpl: "Cost per Lead",
    conversions: "Conversions", conversionRate: "Conversion Rate", opportunities: "Opportunities", customers: "Customers",
    cac: "Customer Acquisition Cost", revenue: "Revenue", roas: "ROAS", roi: "ROI",
  },
};

const funnelLabels = {
  es: { impressions: "Impresiones", clicks: "Clics", leads: "Leads", qualified: "Calificados", opportunities: "Oportunidades", customers: "Clientes", revenue: "Ingresos" },
  en: { impressions: "Impressions", clicks: "Clicks", leads: "Leads", qualified: "Qualified", opportunities: "Opportunities", customers: "Customers", revenue: "Revenue" },
};

const rangeOptions: { id: MarketingDatePreset; es: string; en: string }[] = [
  { id: "today", es: "Hoy", en: "Today" }, { id: "yesterday", es: "Ayer", en: "Yesterday" },
  { id: "7d", es: "7 dias", en: "7 days" }, { id: "30d", es: "30 dias", en: "30 days" },
  { id: "90d", es: "90 dias", en: "90 days" }, { id: "this_month", es: "Este mes", en: "This month" },
  { id: "last_month", es: "Mes anterior", en: "Last month" }, { id: "custom", es: "Personalizado", en: "Custom range" },
];

function formatMetric(metric: MarketingMetric, currency: string, locale: string) {
  if (metric.format === "currency") return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: metric.value < 1000 ? 2 : 0 }).format(metric.value);
  if (metric.format === "integer") return new Intl.NumberFormat(locale, { notation: metric.value > 999999 ? "compact" : "standard", maximumFractionDigits: 1 }).format(metric.value);
  if (metric.format === "percent") return `${metric.value.toFixed(2)}%`;
  return `${metric.value.toFixed(2)}x`;
}

export default function MarketingCommandCenterPage() {
  const language = useBotzLanguage("es");
  const lang = language === "en" ? "en" : "es";
  const { user, loading, tenantId, isPlatformAdmin } = useAuth();
  const [activeNav, setActiveNav] = useState<(typeof navigation)[number][0]>("overview");
  const [range, setRange] = useState<MarketingDatePreset>("30d");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const data = getMarketingDemoOverview(range);
  const labels = metricLabels[lang];
  const locale = lang === "es" ? "es-CO" : "en-US";
  const copy = lang === "es" ? {
    title: "Marketing Command Center", subtitle: "De la inversion publicitaria al ingreso, en una sola vista.", demo: "MODO DEMO",
    compare: "Comparando con el periodo anterior", previous: "vs. periodo anterior", health: "Estado de datos", connected: "Demo conectado",
    funnel: "Funnel completo", funnelSub: "Del alcance al ingreso atribuido", channels: "Rendimiento por canal", campaigns: "Campanas que generan negocio",
    campaign: "Campana", spend: "Inversion", qualified: "Calificados", sales: "Ventas", alerts: "Alertas activas", source: "Fuente de verdad",
    sourceCopy: "Los datos mostrados son demostrativos. Conecta tus cuentas para activar metricas reales por tenant.", signIn: "Inicia sesion para acceder al Command Center",
    signInCta: "Ir a iniciar sesion", coming: "Este modulo se habilitara en una fase posterior.", overviewOnly: "Fase 1: Overview",
  } : {
    title: "Marketing Command Center", subtitle: "From advertising investment to revenue, in one view.", demo: "DEMO MODE",
    compare: "Comparing with previous period", previous: "vs. previous period", health: "Data health", connected: "Demo connected",
    funnel: "Full funnel", funnelSub: "From reach to attributed revenue", channels: "Channel performance", campaigns: "Campaigns producing business",
    campaign: "Campaign", spend: "Spend", qualified: "Qualified", sales: "Sales", alerts: "Active alerts", source: "Source of truth",
    sourceCopy: "The data shown is demonstrative. Connect your accounts to activate tenant-specific live metrics.", signIn: "Sign in to access the Command Center",
    signInCta: "Go to sign in", coming: "This module will be enabled in a later phase.", overviewOnly: "Phase 1: Overview",
  };

  if (loading) return <div className={styles.centerState}><span className={styles.loader} /><p>BOTZ Marketing</p></div>;
  if (!user) return <div className={styles.accessPage}><div className={styles.accessCard}><div className={styles.brandMark}>botz<span>.</span></div><ShieldCheck size={34} /><h1>{copy.signIn}</h1><p>Marketing data is protected by tenant and role.</p><Link href="/start?auth=1">{copy.signInCta}</Link></div></div>;

  const navName = navigation.find(([id]) => id === activeNav)?.[1] || "Overview";
  const totalRevenue = data.metrics.find((item) => item.key === "revenue")?.value || 0;
  return <main className={`${styles.commandCenter} ${sidebarOpen ? "" : styles.sidebarCollapsed}`}>
    <aside className={styles.sidebar}>
      <div className={styles.sidebarBrand}><div className={styles.brandMark}>botz<span>.</span></div><strong>MARKETING</strong></div>
      <div className={styles.workspace}><small>WORKSPACE</small><span>{isPlatformAdmin ? "Platform view" : "Client workspace"}</span><em>{tenantId ? tenantId.slice(0, 8) : "demo-tenant"}</em></div>
      <nav>{navigation.map(([id, name, Icon]) => <button key={id} type="button" className={activeNav === id ? styles.navActive : ""} onClick={() => setActiveNav(id)}><Icon size={17} /><span>{name}</span>{id === "copilot" && <i>AI</i>}</button>)}</nav>
      <div className={styles.sidebarFoot}><span><ShieldCheck size={14} /> Tenant isolated</span><small>marketing-overview.v1</small></div>
    </aside>

    <section className={styles.workspaceMain}>
      <header className={styles.topbar}>
        <button type="button" className={styles.sidebarToggle} onClick={() => setSidebarOpen((open) => !open)} aria-label="Toggle sidebar"><PanelLeftClose size={19} /></button>
        <div className={styles.breadcrumb}><span>BOTZ</span><i>/</i><strong>{navName}</strong></div>
        <div className={styles.topActions}><span className={styles.demoBadge}><Sparkles size={13} /> {copy.demo}</span><button type="button"><Bell size={17} /><i>3</i></button><div className={styles.userAvatar}>{(user.email || "B").slice(0, 1).toUpperCase()}</div></div>
      </header>

      {activeNav !== "overview" ? <div className={styles.comingSoon}><div><Gauge size={34} /><span>{copy.overviewOnly}</span><h1>{navName}</h1><p>{copy.coming}</p><button type="button" onClick={() => setActiveNav("overview")}>← Overview</button></div></div> : <div className={styles.dashboardContent}>
        <div className={styles.pageHeading}>
          <div><span>BOTZ TECHNOLOGIES</span><h1>{copy.title}</h1><p>{copy.subtitle}</p></div>
          <div className={styles.filters}><label><CalendarDays size={15} /><select value={range} onChange={(event) => setRange(event.target.value as MarketingDatePreset)}>{rangeOptions.map((option) => <option key={option.id} value={option.id}>{option[lang]}</option>)}</select><ChevronDown size={14} /></label><span>{copy.compare}</span></div>
        </div>

        <div className={styles.connectionStrip}>
          <div><FaMeta /><span>Meta Ads</span><em><i /> {copy.connected}</em></div>
          <div><FaGoogle /><span>Google Ads</span><em><i /> {copy.connected}</em></div>
          <div><BarChart3 /><span>Google Analytics 4</span><em><i /> {copy.connected}</em></div>
          <div><Database /><span>BOTZ CRM</span><em><i /> {copy.connected}</em></div>
        </div>

        <div className={styles.primaryMetrics}>
          {data.metrics.slice(0, 6).map((metric) => {
            const delta = metric.previousValue ? ((metric.value - metric.previousValue) / metric.previousValue) * 100 : 0;
            const positive = metric.key === "totalSpend" || metric.key === "cpl" || metric.key === "cac" ? delta <= 0 : delta >= 0;
            return <article key={metric.key}><div><small>{labels[metric.key]}</small><strong>{formatMetric(metric, data.currency, locale)}</strong></div><span className={positive ? styles.positive : styles.negative}>{delta >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}{Math.abs(delta).toFixed(1)}%</span><p>{copy.previous}</p></article>;
          })}
        </div>

        <div className={styles.secondaryMetrics}>{data.metrics.slice(6).map((metric) => {
          const delta = metric.previousValue ? ((metric.value - metric.previousValue) / metric.previousValue) * 100 : 0;
          return <article key={metric.key}><small>{labels[metric.key]}</small><strong>{formatMetric(metric, data.currency, locale)}</strong><span>{delta >= 0 ? "+" : ""}{delta.toFixed(1)}%</span></article>;
        })}</div>

        <div className={styles.twoColumn}>
          <section className={styles.panel}><div className={styles.panelHeading}><div><span>{copy.funnel}</span><small>{copy.funnelSub}</small></div><GitBranch size={19} /></div><div className={styles.funnel}>{data.funnel.map((stage, index) => <div key={stage.key} style={{ "--funnel-width": `${Math.max(26, 100 - index * 10)}%` } as React.CSSProperties}><span>0{index + 1}</span><strong>{funnelLabels[lang][stage.key]}</strong><em>{stage.key === "revenue" ? new Intl.NumberFormat(locale, { style: "currency", currency: data.currency, maximumFractionDigits: 0 }).format(stage.value) : new Intl.NumberFormat(locale, { notation: stage.value > 999999 ? "compact" : "standard" }).format(stage.value)}</em>{index < data.funnel.length - 1 && <i>{((data.funnel[index + 1].value / stage.value) * 100).toFixed(1)}%</i>}</div>)}</div></section>

          <section className={styles.panel}><div className={styles.panelHeading}><div><span>{copy.channels}</span><small>Google Ads + Meta Ads</small></div><BarChart3 size={19} /></div><div className={styles.channelCards}>{data.channels.map((channel) => <article key={channel.id}><header>{channel.id === "meta" ? <FaMeta /> : <FaGoogle />}<div><strong>{channel.name}</strong><small><i /> Connected</small></div><em>{channel.roas.toFixed(1)}x ROAS</em></header><div className={styles.channelSpend}><span>{new Intl.NumberFormat(locale, { style: "currency", currency: data.currency, maximumFractionDigits: 0 }).format(channel.spend)}</span><i style={{ width: `${(channel.spend / data.metrics[0].value) * 100}%` }} /></div><dl><div><dt>Leads</dt><dd>{channel.leads}</dd></div><div><dt>{copy.sales}</dt><dd>{channel.customers}</dd></div><div><dt>{labels.revenue}</dt><dd>{new Intl.NumberFormat(locale, { style: "currency", currency: data.currency, notation: "compact" }).format(channel.revenue)}</dd></div></dl></article>)}</div><div className={styles.revenueSummary}><span>{labels.revenue}</span><strong>{new Intl.NumberFormat(locale, { style: "currency", currency: data.currency, maximumFractionDigits: 0 }).format(totalRevenue)}</strong><em>+20.4%</em></div></section>
        </div>

        <section className={`${styles.panel} ${styles.campaignPanel}`}><div className={styles.panelHeading}><div><span>{copy.campaigns}</span><small>Last-touch attribution · USD</small></div><button type="button">Export CSV</button></div><div className={styles.tableWrap}><table><thead><tr><th>{copy.campaign}</th><th>Status</th><th>{copy.spend}</th><th>Leads</th><th>{copy.qualified}</th><th>{copy.sales}</th><th>CPL</th><th>{labels.revenue}</th><th>ROAS</th></tr></thead><tbody>{data.campaigns.map((campaign) => <tr key={campaign.id}><td><div className={styles.campaignName}><span className={campaign.provider === "Meta" ? styles.metaDot : styles.googleDot}>{campaign.provider === "Meta" ? "M" : "G"}</span><div><strong>{campaign.name}</strong><small>{campaign.provider} · {campaign.campaignType}</small></div></div></td><td><em className={campaign.status === "Active" ? styles.statusActive : styles.statusPaused}>{campaign.status}</em></td><td>{new Intl.NumberFormat(locale, { style: "currency", currency: data.currency, maximumFractionDigits: 0 }).format(campaign.spend)}</td><td>{campaign.leads}</td><td>{campaign.qualifiedLeads}</td><td>{campaign.customers}</td><td>{new Intl.NumberFormat(locale, { style: "currency", currency: data.currency }).format(campaign.cpl)}</td><td>{new Intl.NumberFormat(locale, { style: "currency", currency: data.currency, maximumFractionDigits: 0 }).format(campaign.revenue)}</td><td><strong className={campaign.roas < 2 ? styles.roasLow : styles.roasGood}>{campaign.roas.toFixed(2)}x</strong></td></tr>)}</tbody></table></div></section>

        <div className={styles.bottomGrid}>
          <section className={styles.panel}><div className={styles.panelHeading}><div><span>{copy.alerts}</span><small>Rules + sync health</small></div><AlertTriangle size={19} /></div><div className={styles.alertList}>{data.alerts.map((alert) => <article key={alert.id} className={styles[alert.severity]}><span><AlertTriangle size={15} /></span><div><strong>{alert.title}</strong><p>{alert.description}</p><small>{alert.entity}</small></div></article>)}</div></section>
          <section className={`${styles.panel} ${styles.sourcePanel}`}><div className={styles.sourceIcon}><ShieldCheck /></div><span>{copy.source}</span><h2>Advertising + Analytics + CRM + Revenue</h2><p>{copy.sourceCopy}</p><div><MousePointerClick size={15} /> First Touch <i /> Last Touch</div></section>
        </div>
      </div>}
    </section>
  </main>;
}
