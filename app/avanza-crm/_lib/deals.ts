export type StageId = "sin_contactar" | "calificado" | "propuesta_comercial" | "confirmacion_pago";

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

export const STAGES: Array<{ id: StageId; label: string }> = [
  { id: "sin_contactar", label: "Sin contactar" },
  { id: "calificado", label: "Calificado" },
  { id: "propuesta_comercial", label: "Propuesta comercial" },
  { id: "confirmacion_pago", label: "Confirmacion pago" },
];

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
    stage: "sin_contactar",
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
