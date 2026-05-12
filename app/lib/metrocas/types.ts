export type Severity = "low" | "medium" | "high" | "critical";

export type MetrocasSalesRecord = {
  fecha: string;
  cliente: string;
  producto: string;
  categoria: string;
  cantidad: number;
  precio_unitario?: number | null;
  costo_unitario?: number | null;
  total_venta?: number | null;
  stock_actual?: number | null;
  vendedor?: string | null;
  ciudad?: string | null;
  departamento?: string | null;
  region?: string | null;
  canal?: string | null;
  country?: string | null;
};

export type DatasetValidation = {
  criticalErrors: string[];
  warnings: string[];
  optionalMissing: string[];
  valid: boolean;
};

export type MetrocasAlert = {
  title: string;
  description: string;
  severity: Severity;
  recommendation: string;
  expectedImpact: string;
  suggestedAction: string;
  type: string;
};

export type MetrocasRecommendation = {
  type: string;
  priority: "P1" | "P2" | "P3";
  title: string;
  description: string;
  expectedImpact: string;
  actionPlan: string;
  supportingData: string;
};

export type MetrocasKpis = {
  totalSales: number;
  grossMargin: number | null;
  estimatedProfit: number | null;
  avgTicket: number;
  monthlyGrowth: number;
  monthlyDrop: number;
  activeCustomers: number;
  inactiveCustomers: number;
  activeProducts: number;
  noRotationProducts: number;
  criticalStock: number;
  opportunitiesDetected: number;
  criticalAlerts: number;
  generatedRecommendations: number;
  cityTopSales: string;
  cityTopGrowth: string;
  cityTopDrop: string;
  cityTopMargin: string;
  cityTopActiveCustomers: string;
  cityTopNoRotation: string;
  cityTopOpportunity: string;
};

export type MetrocasDashboardPayload = {
  datasetId: string;
  kpis: MetrocasKpis;
  monthlySales: Array<{ period: string; sales: number }>;
  salesByCategory: Array<{ name: string; sales: number }>;
  topProducts: Array<{ name: string; sales: number; margin: number | null; city: string }>;
  topCustomers: Array<{ name: string; sales: number; frequency: number; city: string }>;
  cityRanking: Array<{ city: string; sales: number; margin: number; growth: number }>;
  cityCategoryHeatmap: Array<{ city: string; category: string; sales: number }>;
  alerts: MetrocasAlert[];
  recommendations: MetrocasRecommendation[];
  aiInsights: Record<string, unknown> | null;
};
