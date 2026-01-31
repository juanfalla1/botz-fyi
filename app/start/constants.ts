// constants.ts

export const TIMING = {
  toRegistro: 2500,
  toPerfilado: 3500,
  toCorreo: 3500,
  toWhatsApp: 4000,
  toHipoteca: 3000,
  toCriterios: 3000,
  toCalificacion: 3000,
  toAprobacion: 3000,
  followUpIfNoReply: 20000,
  stepDelay: 3000,
  typingDelay: 1200,
  popupAutoRemove: 8000
};

export const INITIAL_FORM_DATA = {
  name: "",
  email: "",
  phone: "",
  company: "",
  country: "Colombia",
  interest: "",
  channel: "WhatsApp" as const,
  usesWhatsApp: "Sí" as const,
  hasCRM: "No" as const,
  startWhen: "En 1–3 meses" as const,
  budgetRange: "2.500 - 5.000" as const,
  ingresoMensual: "5000",
  valorVivienda: "200000",
  plazoAnios: "20",
  tieneDeudas: "No" as const
};

export const INITIAL_CALCULO_HIPOTECA = {
  cuotaEstimada: 0,
  financiacion: 0,
  dti: 0,
  ltv: 0,
  prestamoAprobable: 0,
  plazo: 20,
  tasa: 4.5,
  aprobado: false,
  score: 0,
  ingresosMensuales: 5000,
  valorVivienda: 200000,
  deudasExistentes: 0
};

export const INITIAL_METRICS = {
  score: 0,
  viability: "---",
  roi: 0
};
export const INITIAL_CRM = {
  stage: "Lead nuevo" as const,
  owner: "Botz",
  leadScore: 0,
  priority: "---",
  nextAction: "Esperando formulario",
  lastUpdate: "--"
};
export const INITIAL_N8N_STATS = {
  leadsEnviados: 0,
  mensajesProcesados: 0,
  ultimoEnvio: "--:--",
  errores: 0
};
