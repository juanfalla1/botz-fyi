export type MarketingProvider = "meta" | "google_ads" | "ga4" | "crm";
export type AttributionModel = "first_touch" | "last_touch";
export type MarketingDatePreset = "today" | "yesterday" | "7d" | "30d" | "90d" | "this_month" | "last_month" | "custom";

export type MarketingMetricKey =
  | "totalSpend"
  | "metaSpend"
  | "googleSpend"
  | "impressions"
  | "reach"
  | "clicks"
  | "ctr"
  | "cpc"
  | "cpm"
  | "leads"
  | "cpl"
  | "conversions"
  | "conversionRate"
  | "opportunities"
  | "customers"
  | "cac"
  | "revenue"
  | "roas"
  | "roi";

export type MarketingMetric = {
  key: MarketingMetricKey;
  value: number;
  previousValue: number;
  format: "currency" | "integer" | "percent" | "ratio";
};

export type ChannelPerformance = {
  id: "meta" | "google";
  name: string;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  customers: number;
  revenue: number;
  roas: number;
  status: "connected" | "attention" | "disconnected";
};

export type CampaignPerformance = {
  id: string;
  provider: "Meta" | "Google";
  name: string;
  campaignType: string;
  status: "Active" | "Paused";
  spend: number;
  leads: number;
  qualifiedLeads: number;
  customers: number;
  cpl: number;
  revenue: number;
  roas: number;
};

export type FunnelStage = {
  key: "impressions" | "clicks" | "leads" | "qualified" | "opportunities" | "customers" | "revenue";
  value: number;
};

export type MarketingAlert = {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  entity: string;
};

export type MarketingOverview = {
  mode: "demo" | "live";
  tenantId: string | null;
  currency: string;
  timezone: string;
  range: { preset: MarketingDatePreset; from: string; to: string; comparisonFrom: string; comparisonTo: string };
  attributionModel: AttributionModel;
  schemaVersion: "marketing-overview.v1";
  generatedAt: string;
  freshness: Record<MarketingProvider, string | null>;
  metrics: MarketingMetric[];
  channels: ChannelPerformance[];
  campaigns: CampaignPerformance[];
  funnel: FunnelStage[];
  alerts: MarketingAlert[];
};
