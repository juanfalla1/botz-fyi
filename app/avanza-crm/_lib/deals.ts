export type StageId = string;
export type Stage = { id: StageId; label: string };

export type DealActivity = {
  id: string;
  type: "Actividad" | "WhatsApp" | "Comentario" | "Correo" | "Documento" | "Cotizacion";
  subject: string;
  date: string;
  time?: string;
  notes?: string;
};

export type Deal = {
  id: string;
  stage: StageId;
  businessName: string;
  company: string;
  contactName: string;
  email: string;
  phone: string;
  assignedTo: string;
  country: string;
  contactOrigin: string;
  businessOrigin: string;
  estimatedCloseDate: string;
  comments: string;
  lineOfBusiness: string;
  campaignOrigin: string;
  description: string;
  lossReason: string;
  totalOrderAmount: number;
  totalQuoteAmount: number;
  adLink: string;
  activities: DealActivity[];
  createdAt: string;
};

export const DEALS_STORAGE_KEY = "avanza-crm-deals-v1";
export const STAGES_STORAGE_KEY = "avanza-crm-stages-v1";

export const DEFAULT_STAGES: Stage[] = [
  { id: "sin_contactar", label: "Sin contactar" },
  { id: "calificado", label: "Calificado" },
  { id: "propuesta_comercial", label: "Propuesta comercial" },
  { id: "confirmacion_pago", label: "Confirmacion pago" },
];

export function loadStages(): Stage[] {
  if (typeof window === "undefined") return DEFAULT_STAGES;
  try {
    const raw = window.localStorage.getItem(STAGES_STORAGE_KEY);
    if (!raw) return DEFAULT_STAGES;
    const parsed = JSON.parse(raw) as Stage[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_STAGES;
    return parsed
      .filter((item) => item && typeof item.id === "string" && typeof item.label === "string")
      .map((item) => ({ id: item.id, label: item.label || item.id }));
  } catch {
    return DEFAULT_STAGES;
  }
}

export function saveStages(stages: Stage[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STAGES_STORAGE_KEY, JSON.stringify(stages));
}

export function loadDeals(): Deal[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DEALS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Deal[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveDeals(deals: Deal[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DEALS_STORAGE_KEY, JSON.stringify(deals));
}

export function money(value: number): string {
  return `$ ${Number(value || 0).toLocaleString("es-CO")}`;
}

export function emptyDeal(): Omit<Deal, "id" | "activities" | "createdAt"> {
  return {
    stage: DEFAULT_STAGES[0].id,
    businessName: "",
    company: "",
    contactName: "",
    email: "",
    phone: "",
    assignedTo: "Usuario Gerente",
    country: "Colombia",
    contactOrigin: "",
    businessOrigin: "",
    estimatedCloseDate: "",
    comments: "",
    lineOfBusiness: "",
    campaignOrigin: "",
    description: "",
    lossReason: "",
    totalOrderAmount: 0,
    totalQuoteAmount: 0,
    adLink: "",
  };
}

export function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}
