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

export const PROFESSIONAL_SERVICES_DEMO_DEALS: Deal[] = [
  {
    id: "demo-northline",
    stage: "sin_contactar",
    businessName: "Diagnostico de operaciones",
    company: "Northline Group",
    contactName: "Laura Mendez",
    email: "laura@northline.example",
    phone: "+57 300 555 0101",
    assignedTo: "Sofia Torres",
    country: "Colombia",
    contactOrigin: "Formulario web",
    businessOrigin: "Inbound",
    estimatedCloseDate: "2026-10-02",
    comments: "Solicito una evaluacion del proceso comercial.",
    lineOfBusiness: "Consultoria",
    campaignOrigin: "Contenido B2B",
    description: "Automatizacion de reportes y seguimiento de proyectos.",
    lossReason: "",
    totalOrderAmount: 18000000,
    totalQuoteAmount: 0,
    adLink: "",
    activities: [],
    createdAt: "2026-09-09T09:15:00.000Z",
  },
  {
    id: "demo-atlas",
    stage: "calificado",
    businessName: "Revenue operations 360",
    company: "Atlas Studio",
    contactName: "Daniel Rojas",
    email: "daniel@atlas.example",
    phone: "+57 301 555 0112",
    assignedTo: "Sofia Torres",
    country: "Colombia",
    contactOrigin: "Referido",
    businessOrigin: "Inbound",
    estimatedCloseDate: "2026-09-28",
    comments: "Fit alto. Tres decisores identificados.",
    lineOfBusiness: "Agencia",
    campaignOrigin: "Partners",
    description: "Unificar leads, propuestas y renovaciones.",
    lossReason: "",
    totalOrderAmount: 12500000,
    totalQuoteAmount: 12500000,
    adLink: "",
    activities: [{ id: "act-atlas-1", type: "Actividad", subject: "Discovery completado", date: "2026-09-08", notes: "Necesidad y presupuesto confirmados." }],
    createdAt: "2026-09-07T14:30:00.000Z",
  },
  {
    id: "demo-lumen",
    stage: "calificado",
    businessName: "Agentes para gestion de cuentas",
    company: "Lumen Systems",
    contactName: "Carolina Diaz",
    email: "carolina@lumen.example",
    phone: "+57 302 555 0140",
    assignedTo: "Mateo Silva",
    country: "Colombia",
    contactOrigin: "LinkedIn",
    businessOrigin: "Outbound",
    estimatedCloseDate: "2026-10-10",
    comments: "Prioridad alta. Reunion tecnica agendada.",
    lineOfBusiness: "Servicios TI",
    campaignOrigin: "ABM",
    description: "Escalar soporte y gestion de cuentas.",
    lossReason: "",
    totalOrderAmount: 24000000,
    totalQuoteAmount: 0,
    adLink: "",
    activities: [{ id: "act-lumen-1", type: "Correo", subject: "Resumen de discovery", date: "2026-09-09" }],
    createdAt: "2026-09-06T11:00:00.000Z",
  },
  {
    id: "demo-verde",
    stage: "propuesta_comercial",
    businessName: "Automatizacion de onboarding",
    company: "Verde Partners",
    contactName: "Andres Vega",
    email: "andres@verde.example",
    phone: "+57 303 555 0168",
    assignedTo: "Mateo Silva",
    country: "Colombia",
    contactOrigin: "Evento",
    businessOrigin: "Inbound",
    estimatedCloseDate: "2026-09-22",
    comments: "Propuesta enviada. Seguimiento programado.",
    lineOfBusiness: "Consultoria",
    campaignOrigin: "Evento ejecutivo",
    description: "Reducir tiempos de onboarding de clientes.",
    lossReason: "",
    totalOrderAmount: 32000000,
    totalQuoteAmount: 32000000,
    adLink: "",
    activities: [{ id: "act-verde-1", type: "Cotizacion", subject: "Propuesta comercial v2", date: "2026-09-09", notes: "Monto: $ 32.000.000" }],
    createdAt: "2026-09-03T16:45:00.000Z",
  },
  {
    id: "demo-nova",
    stage: "propuesta_comercial",
    businessName: "CRM y seguimiento comercial",
    company: "Nova Legal",
    contactName: "Maria Paula Leon",
    email: "maria@novalegal.example",
    phone: "+57 304 555 0184",
    assignedTo: "Sofia Torres",
    country: "Colombia",
    contactOrigin: "WhatsApp",
    businessOrigin: "Referido",
    estimatedCloseDate: "2026-09-19",
    comments: "Revision legal y de alcance en curso.",
    lineOfBusiness: "Servicios legales",
    campaignOrigin: "Referidos",
    description: "Pipeline de consultas, propuestas y seguimientos.",
    lossReason: "",
    totalOrderAmount: 15000000,
    totalQuoteAmount: 15000000,
    adLink: "",
    activities: [{ id: "act-nova-1", type: "WhatsApp", subject: "Confirmacion de propuesta", date: "2026-09-09" }],
    createdAt: "2026-09-02T10:20:00.000Z",
  },
  {
    id: "demo-pulse",
    stage: "confirmacion_pago",
    businessName: "Implementacion BOTZ Growth",
    company: "Pulse Advisory",
    contactName: "Felipe Castro",
    email: "felipe@pulse.example",
    phone: "+57 305 555 0199",
    assignedTo: "Mateo Silva",
    country: "Colombia",
    contactOrigin: "Webinar",
    businessOrigin: "Inbound",
    estimatedCloseDate: "2026-09-15",
    comments: "Contrato aprobado. Pendiente confirmacion de pago.",
    lineOfBusiness: "Consultoria",
    campaignOrigin: "Webinar",
    description: "Automatizacion integral del ciclo comercial.",
    lossReason: "",
    totalOrderAmount: 28000000,
    totalQuoteAmount: 28000000,
    adLink: "",
    activities: [{ id: "act-pulse-1", type: "Documento", subject: "Contrato aprobado", date: "2026-09-08" }],
    createdAt: "2026-08-28T13:10:00.000Z",
  },
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
