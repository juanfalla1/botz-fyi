import { FormData } from "./types";

export function nowStamp(): string {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function generateUniqueId(prefix: string = "id"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function waDigits(num: string): string {
  return String(num).replace(/\D/g, '');
}

export function waLink(phone: string, message: string): string {
  const digits = waDigits(phone);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function budgetToNumeric(range: FormData["budgetRange"]): number {
  switch (range) {
    case "Menos de 1.000":
      return 800;
    case "1.000 - 2.500":
      return 1800;
    case "2.500 - 5.000":
      return 3500;
    case "Más de 5.000":
      return 6500;
    default:
      return 2500;
  }
}

export function crmNextActionFromStep(s: number): string {
  if (s <= 0) return "Esperando formulario";
  if (s === 1) return "Registrando lead";
  if (s === 2) return "Organizando información";
  if (s === 3) return "Preparar bienvenida";
  if (s === 4) return "Abrir conversación";
  if (s === 5) return "Calcular hipoteca";
  if (s === 6) return "Evaluar viabilidad";
  if (s === 7) return "Calificar lead";
  if (s === 8) return "Analizar aprobación";
  if (s === 9) return "Seguimiento respetuoso";
  if (s === 10) return "Confirmar reunión";
  if (s === 11) return "Ajustar propuesta";
  return "Iniciar onboarding";
}

export function computeMetrics(formData: FormData) {
  const numericBudget = budgetToNumeric(formData.budgetRange);
  const roiLocal = Math.round(numericBudget * 3.5);
  const scoreLocal = numericBudget > 5000 ? 98 : numericBudget > 2500 ? 80 : 65;
  const viabilityLocal = numericBudget > 5000 ? "ALTA" : numericBudget > 2500 ? "MEDIA" : "INICIAL";
  return { roiLocal, scoreLocal, viabilityLocal, numericBudget };
}

export function calcularHipoteca(
  ingresoMensual: string,
  valorVivienda: string,
  plazoAnios: string,
  tieneDeudas: "Sí" | "No"
) {
  const ingresosMensuales = parseFloat(ingresoMensual) || 5000;
  const valorViviendaNum = parseFloat(valorVivienda) || 200000;
  const plazo = parseFloat(plazoAnios) || 20;
  const conDeudas = tieneDeudas === "Sí";

  // Tasa de interés según ingresos
  let tasaInteres = 0.045;
  if (ingresosMensuales > 10000) tasaInteres = 0.042;
  if (ingresosMensuales < 3000) tasaInteres = 0.055;

  // LTV máximo según ingresos
  let ltvMaximo = 0.8;
  if (ingresosMensuales > 8000) ltvMaximo = 0.85;
  if (ingresosMensuales < 4000) ltvMaximo = 0.75;

  const prestamo = valorViviendaNum * ltvMaximo;
  const tasaMensual = tasaInteres / 12;
  const plazoMeses = plazo * 12;

  // Fórmula de cuota mensual
  const cuota = (prestamo * tasaMensual * Math.pow(1 + tasaMensual, plazoMeses)) /
    (Math.pow(1 + tasaMensual, plazoMeses) - 1);

  // Deudas existentes
  const deudasExistentes = conDeudas ? ingresosMensuales * 0.15 : 0;

  // DTI (Debt-to-Income)
  const dti = ((cuota + deudasExistentes) / ingresosMensuales) * 100;

  // LTV (Loan-to-Value)
  const ltv = (prestamo / valorViviendaNum) * 100;

  // Score
  let score = 70;
  score += ingresosMensuales > 5000 ? 10 : 0;
  score += dti <= 30 ? 10 : 0;
  score += ltv <= 75 ? 10 : 0;
  score += !conDeudas ? 10 : 0;
  score = Math.min(score, 100);

  // Aprobación
  const aprobado = dti <= 35 && ltv <= 80 && score >= 60;

  return {
    cuotaEstimada: Math.round(cuota),
    financiacion: Math.round(ltv),
    dti: Math.round(dti),
    ltv: Math.round(ltv),
    prestamoAprobable: Math.round(prestamo),
    plazo,
    tasa: tasaInteres * 100,
    aprobado,
    score,
    ingresosMensuales,
    valorVivienda: valorViviendaNum,
    deudasExistentes
  };
}