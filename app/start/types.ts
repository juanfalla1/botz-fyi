export type ChatMsg = { role: "bot" | "user"; text: string };

export type EmailTag = "Bienvenida" | "Propuesta" | "Agenda" | "Confirmación" | "Hipoteca";

export type EmailItem = {
  id: string;
  when: string;
  to: string;
  subject: string;
  body: string;
  tag: EmailTag;
  unread: boolean;
};

export type CRMStage =
  | "Lead nuevo"
  | "Lead registrado"
  | "Lead perfilado"
  | "Correo enviado"
  | "WhatsApp activo"
  | "Cálculo hipotecario"
  | "Criterios viabilidad"
  | "Calificación lead"
  | "Análisis aprobación"
  | "Seguimiento"
  | "Reunión agendada"
  | "Propuesta enviada"
  | "Confirmado (Listo para iniciar)";

export type MeetingItem = {
  id: string;
  when: string;
  title: string;
  notes: string;
  status: "Confirmada" | "Pendiente";
};

export type FormData = {
  name: string;
  email: string;
  phone: string;
  company: string;
  country: string;
  interest: string;
  channel: "WhatsApp" | "Web" | "Email" | "Todo";
  usesWhatsApp: "Sí" | "No";
  hasCRM: "Sí" | "No";
  startWhen: "Lo antes posible" | "En 1–3 meses" | "Estoy explorando";
  budgetRange: "Menos de 1.000" | "1.000 - 2.500" | "2.500 - 5.000" | "Más de 5.000";
  ingresoMensual: string;
  valorVivienda: string;
  plazoAnios: string;
  tieneDeudas: "Sí" | "No";
};

export type Pending =
  | null
  | { kind: "meeting_pick" }
  | { kind: "proposal_clarify" }
  | { kind: "final_confirm_email" }
  | { kind: "hipoteca_detalles" };

export type Popup = {
  id: string;
  title: string;
  message: string;
  position: { top: number; left: number };
  step: number;
  action?: () => void;
  buttonText?: string;
  showArrow?: boolean;
  arrowPosition?: "top" | "bottom" | "left" | "right";
  autoRemove?: boolean;
  autoRemoveTime?: number;
};

export type Tab =
  | "demo"
  | "chat"
  | "propuesta"
  | "crm"
  | "channels"
  | "metrics"
  | "process"
  | "hipoteca"
  | "n8n-config";

export type CalculoHipoteca = {
  cuotaEstimada: number;
  financiacion: number;
  dti: number;
  ltv: number;
  prestamoAprobable: number;
  plazo: number;
  tasa: number;
  aprobado: boolean;
  score: number;
  ingresosMensuales: number;
  valorVivienda: number;
  deudasExistentes: number;
};

export type CRMState = {
  stage: CRMStage;
  owner: string;
  leadScore: number;
  priority: string;
  nextAction: string;
  lastUpdate: string;
};

export type N8nStats = {
  leadsEnviados: number;
  mensajesProcesados: number;
  ultimoEnvio: string;
  errores: number;
};

export type N8nStatus = "disconnected" | "connected" | "testing";

export type Metrics = {
  score: number;
  viability: string;
  roi: number;
};

export type Channel = {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  active: boolean;
};

export type FlowStep = {
  key: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  tooltip: string;
};

/* =========================
   🔧 AJUSTE CLAVE AQUÍ
   ========================= */

export interface BotzProps {
  activeStep: number;
  step: number;
  showExplanation: boolean;
  isPlaying: boolean;

  /* ⬇️ antes: any */
  formData: FormData;
  chat: ChatMsg[];
  metrics: Metrics;

  crm: CRMState;
  agenda: MeetingItem[];
  calculoHipoteca: CalculoHipoteca;

  n8nWebhookURL: string;
  useRealN8n: boolean;
  n8nStatus: N8nStatus;
  n8nStats: N8nStats;

  setFormData: (v: FormData) => void;
  setChat: (v: ChatMsg[]) => void;
  setDraft: (v: string) => void;
  setActiveStep: (v: number) => void;
  setStep: (v: number) => void;
  setShowExplanation: (v: boolean) => void;
  setIsPlaying: (v: boolean) => void;

  handleContinue: () => void;
  togglePlay: () => void;
  demoReset: () => void;
  handleLeadCapture: (e: React.FormEvent) => void;
  calcularHipotecaCompleto: () => void;
  handleSendChat: () => void;

  testN8nConnection: () => void;
  addPopup: (p: Popup) => string;
  removePopup: (id: string) => void;
  markAllMailAsRead: () => void;

  nowStamp: () => string;

  inputDisabled: boolean;

  followupTimeoutRef: React.MutableRefObject<any>;
  lastUserMsgAtRef: React.MutableRefObject<any>;
  playTimeoutRef: React.MutableRefObject<any>;
  chatEndRef: React.MutableRefObject<HTMLDivElement | null>;
}
