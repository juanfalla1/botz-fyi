import type { MarketingDatePreset, MarketingOverview } from "./types";

const baseMetrics: MarketingOverview["metrics"] = [
  { key: "totalSpend", value: 24860, previousValue: 23120, format: "currency" },
  { key: "metaSpend", value: 11240, previousValue: 10980, format: "currency" },
  { key: "googleSpend", value: 13620, previousValue: 12140, format: "currency" },
  { key: "impressions", value: 1864200, previousValue: 1718300, format: "integer" },
  { key: "reach", value: 1048800, previousValue: 988200, format: "integer" },
  { key: "clicks", value: 48260, previousValue: 43190, format: "integer" },
  { key: "ctr", value: 2.59, previousValue: 2.51, format: "percent" },
  { key: "cpc", value: 0.52, previousValue: 0.54, format: "currency" },
  { key: "cpm", value: 13.33, previousValue: 13.46, format: "currency" },
  { key: "leads", value: 1284, previousValue: 1118, format: "integer" },
  { key: "cpl", value: 19.36, previousValue: 20.68, format: "currency" },
  { key: "conversions", value: 946, previousValue: 801, format: "integer" },
  { key: "conversionRate", value: 1.96, previousValue: 1.85, format: "percent" },
  { key: "opportunities", value: 326, previousValue: 284, format: "integer" },
  { key: "customers", value: 91, previousValue: 76, format: "integer" },
  { key: "cac", value: 273.19, previousValue: 304.21, format: "currency" },
  { key: "revenue", value: 168420, previousValue: 139880, format: "currency" },
  { key: "roas", value: 6.77, previousValue: 6.05, format: "ratio" },
  { key: "roi", value: 577.47, previousValue: 505.02, format: "percent" },
];

export function getMarketingDemoOverview(preset: MarketingDatePreset = "30d"): MarketingOverview {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  const fromDate = new Date(now);
  fromDate.setDate(fromDate.getDate() - 29);
  const comparisonToDate = new Date(fromDate);
  comparisonToDate.setDate(comparisonToDate.getDate() - 1);
  const comparisonFromDate = new Date(comparisonToDate);
  comparisonFromDate.setDate(comparisonFromDate.getDate() - 29);

  return {
    mode: "demo",
    tenantId: null,
    currency: "USD",
    timezone: "America/Bogota",
    range: {
      preset,
      from: fromDate.toISOString().slice(0, 10),
      to,
      comparisonFrom: comparisonFromDate.toISOString().slice(0, 10),
      comparisonTo: comparisonToDate.toISOString().slice(0, 10),
    },
    attributionModel: "last_touch",
    schemaVersion: "marketing-overview.v1",
    generatedAt: now.toISOString(),
    freshness: { meta: now.toISOString(), google_ads: now.toISOString(), ga4: now.toISOString(), crm: now.toISOString() },
    metrics: baseMetrics,
    channels: [
      { id: "google", name: "Google Ads", spend: 13620, impressions: 714800, clicks: 26240, leads: 716, customers: 56, revenue: 108900, roas: 8.0, status: "connected" },
      { id: "meta", name: "Meta Ads", spend: 11240, impressions: 1149400, clicks: 22020, leads: 568, customers: 35, revenue: 59520, roas: 5.3, status: "connected" },
    ],
    campaigns: [
      { id: "g-search-intent", provider: "Google", name: "High Intent Search", campaignType: "Search", status: "Active", spend: 6840, leads: 342, qualifiedLeads: 138, customers: 31, cpl: 20.0, revenue: 62400, roas: 9.12 },
      { id: "m-prospecting", provider: "Meta", name: "Prospecting - Core Offer", campaignType: "Lead Ads", status: "Active", spend: 5720, leads: 326, qualifiedLeads: 112, customers: 19, cpl: 17.55, revenue: 34200, roas: 5.98 },
      { id: "g-pmax", provider: "Google", name: "Performance Max", campaignType: "Performance Max", status: "Active", spend: 4580, leads: 241, qualifiedLeads: 94, customers: 18, cpl: 19.0, revenue: 32900, roas: 7.18 },
      { id: "m-retargeting", provider: "Meta", name: "30 Day Retargeting", campaignType: "Conversions", status: "Active", spend: 3380, leads: 142, qualifiedLeads: 61, customers: 11, cpl: 23.8, revenue: 21720, roas: 6.43 },
      { id: "g-youtube", provider: "Google", name: "YouTube Demand", campaignType: "YouTube", status: "Paused", spend: 2200, leads: 77, qualifiedLeads: 23, customers: 7, cpl: 28.57, revenue: 13600, roas: 6.18 },
      { id: "m-awareness", provider: "Meta", name: "Awareness Video", campaignType: "Video", status: "Active", spend: 2140, leads: 100, qualifiedLeads: 29, customers: 5, cpl: 21.4, revenue: 3600, roas: 1.68 },
    ],
    funnel: [
      { key: "impressions", value: 1864200 },
      { key: "clicks", value: 48260 },
      { key: "leads", value: 1284 },
      { key: "qualified", value: 512 },
      { key: "opportunities", value: 326 },
      { key: "customers", value: 91 },
      { key: "revenue", value: 168420 },
    ],
    alerts: [
      { id: "a1", severity: "critical", title: "ROAS below threshold", description: "Awareness Video fell below the 2.0x account threshold.", entity: "Meta / Awareness Video" },
      { id: "a2", severity: "warning", title: "Frequency increasing", description: "Retargeting frequency reached 6.8 in the last 7 days.", entity: "Meta / 30 Day Retargeting" },
      { id: "a3", severity: "info", title: "High-value lead captured", description: "A lead with a 94/100 intent score entered from Google Search.", entity: "Google / High Intent Search" },
    ],
  };
}
