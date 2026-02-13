"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "./supabaseClient";
import { getTasasBancolombia, getTasasFallback, validateTasasResponse } from "../services/realBankingAPI";
import { 
  Building2, Wallet, TrendingUp, AlertTriangle, CheckCircle, 
  PieChart, Landmark, BrainCircuit, Printer,
  Globe, RefreshCw
} from "lucide-react";
import useBotzLanguage from "../hooks/useBotzLanguage";

type HipotecaCalculo = {
  valorVivienda: number;
  ingresosMensuales: number;
  cuotaEstimada: number;
  dti: number;
  ltv?: number;
  costeTotal?: number;
  financiacionNecesaria?: number;
  requiereAsesor?: boolean;
  score: number;
  aprobado: boolean;
  cuotaCofidis?: number;
  deudasExistentes?: number;
  plazo?: number;
  tasa?: number;
  // ✅ Campos específicos Colombia
  tipoVivienda?: "VIS" | "No VIS";
  modalidad?: "Crédito Pesos" | "Leasing Habitacional" | "Crédito UVR";
  ciudadColombia?: string;
  subsidio?: "Sí" | "No";
  // ✅ Campos legales requeridos
  antiguedadLaboral?: number; // meses
  scoreCrediticioColombia?: number; // 0-1000
  edad?: number; // para España
};

interface HipotecaViewProps {
  calculo?: HipotecaCalculo;
  leadId?: string;
  mode?: "manual" | "lead";
}

const PAISES_CONFIG: Record<string, { 
  moneda: string; 
  simbolo: string; 
  formato: string; 
  bancos: { name: string; color: string; note: string }[];
  impuestosGastos: number;
  entradaMinima: number;
  dtiMaximo: number;
  euribor12m?: number;
  diferencial?: number;
}> = {
  "España": {
    moneda: "EUR", simbolo: "€", formato: "es-ES",
    impuestosGastos: 0.10, entradaMinima: 0.20, dtiMaximo: 35,
    euribor12m: 3.5, diferencial: 1.0,
    bancos: [
      { name: "Santander", color: "#ec0000", note: "Acepta DTI 40%" },
      { name: "BBVA", color: "#1973b8", note: "Estricto con nómina" },
      { name: "CaixaBank", color: "#00a8e1", note: "Bueno para funcionarios" },
      { name: "Sabadell", color: "#006d8f", note: "Flexible en LTV" },
    ]
  },
  "Colombia": {
    moneda: "COP", simbolo: "$", formato: "es-CO",
    impuestosGastos: 0.04, entradaMinima: 0.30, dtiMaximo: 30,
    // ✅ Cumple Ley 546 de 1999 y regulaciones SFC
    bancos: [
      { name: "Bancolombia", color: "#fdc500", note: "Líder en hipotecas" },
      { name: "Davivienda", color: "#ed1c24", note: "Buenos plazos" },
      { name: "BBVA Colombia", color: "#1973b8", note: "Tasas competitivas" },
      { name: "Banco de Bogotá", color: "#003399", note: "Amplia cobertura" },
    ]
  },
  "México": {
    moneda: "MXN", simbolo: "$", formato: "es-MX",
    impuestosGastos: 0.06, entradaMinima: 0.20, dtiMaximo: 30,
    bancos: [
      { name: "BBVA México", color: "#1973b8", note: "Mayor cartera hipotecaria" },
      { name: "Banorte", color: "#e30613", note: "Buenas tasas fijas" },
      { name: "Santander MX", color: "#ec0000", note: "Flexible documentación" },
      { name: "HSBC México", color: "#db0011", note: "Promociones especiales" },
    ]
  },
  "Argentina": {
    moneda: "ARS", simbolo: "$", formato: "es-AR",
    impuestosGastos: 0.08, entradaMinima: 0.25, dtiMaximo: 25,
    bancos: [
      { name: "Banco Nación", color: "#006341", note: "Créditos UVA" },
      { name: "Banco Provincia", color: "#0066b3", note: "Tasas subsidiadas" },
      { name: "Santander AR", color: "#ec0000", note: "Préstamos en dólares" },
      { name: "BBVA Argentina", color: "#1973b8", note: "Plazos flexibles" },
    ]
  },
  "Chile": {
    moneda: "CLP", simbolo: "$", formato: "es-CL",
    impuestosGastos: 0.03, entradaMinima: 0.20, dtiMaximo: 35,
    bancos: [
      { name: "Banco de Chile", color: "#0033a0", note: "Líder en hipotecas" },
      { name: "BancoEstado", color: "#009640", note: "Subsidios estatales" },
      { name: "Santander Chile", color: "#ec0000", note: "Buenos beneficios" },
      { name: "Scotiabank CL", color: "#ec111a", note: "Tasas competitivas" },
    ]
  },
  "Perú": {
    moneda: "PEN", simbolo: "S/", formato: "es-PE",
    impuestosGastos: 0.05, entradaMinima: 0.10, dtiMaximo: 30,
    bancos: [
      { name: "BCP", color: "#002d72", note: "Mayor cartera" },
      { name: "Interbank", color: "#00a651", note: "Rapidez en aprobación" },
      { name: "BBVA Perú", color: "#1973b8", note: "Buenas condiciones" },
      { name: "Scotiabank PE", color: "#ec111a", note: "Tasas promocionales" },
    ]
  },
  "USA": {
    moneda: "USD", simbolo: "$", formato: "en-US",
    impuestosGastos: 0.03, entradaMinima: 0.20, dtiMaximo: 43,
    bancos: [
      { name: "Wells Fargo", color: "#d71e28", note: "Gran variedad de productos" },
      { name: "Chase", color: "#117aca", note: "Tasas competitivas" },
      { name: "Bank of America", color: "#012169", note: "Preferred Rewards" },
      { name: "Quicken Loans", color: "#c8102e", note: "100% online" },
    ]
  },
};

function pmt(principal: number, annualRate: number, years: number): number {
  if (!principal || principal <= 0 || !years || years <= 0) return 0;
  const r = (annualRate || 0) / 12;
  const n = Math.round(years * 12);
  if (n <= 0) return 0;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

function formatearMoneda(valor: number, config: typeof PAISES_CONFIG["España"]): string {
  if (!valor || isNaN(valor)) return `${config.simbolo}0`;
  try {
    return new Intl.NumberFormat(config.formato, {
      style: "currency",
      currency: config.moneda,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(valor);
  } catch {
    return `${config.simbolo}${valor.toLocaleString()}`;
  }
}

function calcularScore(dti: number, ingresos: number, deudas: number, pais: string, colombiaFields?: any, spainFields?: any): number {
  let score = 50;

  // ✅ Scoring base DTI (universal)
  if (dti <= 20) score += 40;
  else if (dti <= 30) score += 35;
  else if (dti <= 35) score += 25;
  else if (dti <= 40) score += 15;
  else if (dti <= 50) score += 5;
  else score -= 10;

  // ✅ Scoring por país
  if (pais === "Colombia") {
    // Ingresos en COP (valores realistas)
    if (ingresos > 8000000) score += 25; // >8M COP
    else if (ingresos > 5000000) score += 20; // >5M COP
    else if (ingresos > 3000000) score += 15; // >3M COP
    else if (ingresos > 1500000) score += 10; // >1.5M COP

    // Score crediticio Colombia (0-1000)
    if (colombiaFields?.scoreCrediticioColombia) {
      const scoreCol = colombiaFields.scoreCrediticioColombia;
      if (scoreCol >= 800) score += 30; // Excelente
      else if (scoreCol >= 700) score += 25; // Muy bueno
      else if (scoreCol >= 600) score += 20; // Bueno
      else if (scoreCol >= 500) score += 10; // Regular
      else score -= 15; // Bajo
    }

    // Antigüedad laboral
    if (colombiaFields?.antiguedadLaboral) {
      const antiguedad = colombiaFields.antiguedadLaboral;
      if (antiguedad >= 24) score += 15; // 2+ años
      else if (antiguedad >= 12) score += 10; // 1+ año
      else if (antiguedad >= 6) score += 5; // 6+ meses
      else score -= 10; // <6 meses
    }

    // Tipo de vivienda VIS (bonus)
    if (colombiaFields?.tipoVivienda === "VIS") score += 15;
    
    // Subsidio (bonus)
    if (colombiaFields?.subsidio === "Sí") score += 20;

    // Modalidad preferidas
    if (colombiaFields?.modalidad === "Crédito Pesos") score += 10;
    else if (colombiaFields?.modalidad === "UVR") score += 5;
  }

  if (pais === "España") {
    // Ingresos en EUR
    if (ingresos > 6000) score += 25; // >6k EUR
    else if (ingresos > 4000) score += 20; // >4k EUR
    else if (ingresos > 2500) score += 15; // >2.5k EUR
    else if (ingresos > 1500) score += 10; // >1.5k EUR

    // Edad para hipoteca España
    if (spainFields?.edad) {
      const edad = spainFields.edad;
      if (edad >= 25 && edad <= 45) score += 20; // Edad óptima
      else if (edad >= 20 && edad <= 55) score += 10; // Edad buena
      else if (edad > 65) score -= 20; // Edad riesgo
    }

    // Gastos mínimos vitales (ratio salud)
    if (spainFields?.gastosMinimosVitales) {
      const ratioGastos = spainFields.gastosMinimosVitales / ingresos;
      if (ratioGastos <= 0.15) score += 10; // <15% gastos
      else if (ratioGastos <= 0.25) score += 5; // <25% gastos
      else if (ratioGastos > 0.40) score -= 10; // >40% gastos
    }
  }

  // ✅ Scoring deudas (universal)
  if (deudas === 0) score += 15;
  else {
    const ratioDeudas = deudas / ingresos;
    if (ratioDeudas <= 0.1) score += 10;
    else if (ratioDeudas <= 0.2) score += 5;
    else if (ratioDeudas > 0.5) score -= 20;
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}

function isValidUUID(str: string): boolean {
  if (!str || str.trim() === "") return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str.trim());
}

export default function HipotecaView({ calculo, leadId, mode = "manual" }: HipotecaViewProps) {
  const isLeadMode = mode === "lead" && leadId && leadId.trim() !== "";

  const language = useBotzLanguage();
  const copy = {
    es: {
      dtiMax: "DTI máx:",
      downPayment: "Entrada:",
      saveToCrm: "Guardar en CRM",
      reset: "Reset",
      houseValue: "Valor Vivienda",
      savings: "Ahorros que aporta",
      requestedMortgage: "Importe Hipoteca Solicitada",
      monthlyIncome: "Ingresos Mensuales",
      monthlyDebts: "Deudas Mensuales",
      term: "Plazo",
      years: "años",
      annualRate: "Tasa Anual",
      analysisRate: "Tasa para análisis:",
      useAnnualRate: "Usar Tasa Anual",
      useEuriborDiff: "Usar Euríbor + Dif",
      bankingFeasibility: "Análisis de Viabilidad Bancaria",
      leadModeAuto: "Modo Lead (Auto) - Sincronizado con tabla leads",
      manualSimulationFor: "Simulación manual para",
      exportSheet: "Exportar Ficha",
      downloadCsv: "Descargar Excel (CSV)",
      savePdfPrint: "Guardar PDF / Imprimir",
      close: "Cerrar",
      globalScore: "Scoring Global",
      excellent: "Excelente",
      eligible: "Cliente Apto",
      regular: "Regular",
      highRisk: "Riesgo Alto",
      saveEval: "Guardar Evaluación y Recibir Recomendaciones",
      saveEvalDesc: "Guarda tu evaluación para recibir análisis personalizado y recomendaciones de expertos en hipotecas.",
      getPersonalScore: "Obtener mi Score de Lead Personalizado",

      // Country-specific fields
      housingType: "Tipo Vivienda",
      housingTypeNoVis: "No VIS",
      housingTypeVis: "VIS",
      modality: "Modalidad",
      modalityCreditPesos: "Crédito Pesos",
      modalityLeasing: "Leasing",
      modalityUvr: "UVR",
      city: "Ciudad",
      subsidy: "Subsidio",
      jobTenure: "Antigüedad Laboral",
      months: "meses",
      creditScore: "Score Crediticio",
      age: "Edad",
      minimumExpenses: "Gastos Mínimos",
      perMonth: "€/mes",
      euribor12m: "Euríbor 12M",
      spread: "Diferencial",

      // Lead status bar
      syncedRealtime: "● Datos sincronizados en tiempo real",
      selectLeadAbove: "Selecciona un lead arriba",

      // KPIs + sections
      creditScoreKpi: "Score Crediticio",
      creditScoreExcellent: "Excelente",
      creditScoreVeryGood: "Muy bueno",
      creditScoreGood: "Bueno",
      creditScoreLow: "Bajo",
      ageProfile: "Perfil Edad",
      ageYears: "años",
      ageOptimal: "Edad óptima",
      ageAcceptable: "Aceptable",
      ageHighRisk: "Riesgo alto",
      ageLimited: "Limitado",
      closeToApprove: "🎯 CERCA DE APROBAR - Acciones recomendadas",
      legalRequirementsFailed: "⚠️ REQUISITOS LEGALES INCUMPLIDOS",
      approvedTitle: "✅ ¡CLIENTE APROBADO! Oportunidades de venta",

      dtiRatio: "Ratio Endeudamiento (DTI)",
      maxRecommended: (n: number) => `Máximo rec. ${n}%`,
      maxPurchaseCapacity: "Capacidad Compra Máx",
      basedOnIncome: "Basado en ingresos",
      cashToCloseTitle: "Fondos Reales Necesarios (Cash to Close)",
      downPaymentLine: (pct: number) => `Entrada (${pct}%)`,
      taxesAndFeesLine: (pct: number) => `Impuestos y Gastos (~${pct}%)`,
      totalNeeded: "TOTAL NECESARIO",
      marketScenarios: "Escenarios de Mercado",
      fixed: "Fijo",
      mixed: "Mixto",
      variable: "Variable",
      bankRadar: (country: string) => `Radar Bancario - ${country}`,
      viabilityLabel: "Viabilidad",

      coachTips: "BOTZ COACH TIPS",

      considerLowerTermOrMoreDown: "• Considerar menor plazo o mayor entrada inicial",
    },
    en: {
      dtiMax: "Max DTI:",
      downPayment: "Down payment:",
      saveToCrm: "Save to CRM",
      reset: "Reset",
      houseValue: "Home Price",
      savings: "Savings",
      requestedMortgage: "Requested Mortgage",
      monthlyIncome: "Monthly Income",
      monthlyDebts: "Monthly Debts",
      term: "Term",
      years: "years",
      annualRate: "Annual Rate",
      analysisRate: "Analysis rate:",
      useAnnualRate: "Use Annual Rate",
      useEuriborDiff: "Use Euribor + Spread",
      bankingFeasibility: "Bank Eligibility Analysis",
      leadModeAuto: "Lead Mode (Auto) - Synced with leads table",
      manualSimulationFor: "Manual simulation for",
      exportSheet: "Export Sheet",
      downloadCsv: "Download Excel (CSV)",
      savePdfPrint: "Save PDF / Print",
      close: "Close",
      globalScore: "Global Score",
      excellent: "Excellent",
      eligible: "Eligible",
      regular: "Fair",
      highRisk: "High Risk",
      saveEval: "Save Evaluation & Get Recommendations",
      saveEvalDesc: "Save your evaluation to receive personalized analysis and expert mortgage recommendations.",
      getPersonalScore: "Get My Personalized Lead Score",

      // Country-specific fields
      housingType: "Housing Type",
      housingTypeNoVis: "Non-VIS",
      housingTypeVis: "VIS",
      modality: "Modality",
      modalityCreditPesos: "Credit (COP)",
      modalityLeasing: "Leasing",
      modalityUvr: "UVR",
      city: "City",
      subsidy: "Subsidy",
      jobTenure: "Job Tenure",
      months: "months",
      creditScore: "Credit Score",
      age: "Age",
      minimumExpenses: "Minimum Expenses",
      perMonth: "EUR/month",
      euribor12m: "12M Euribor",
      spread: "Spread",

      // Lead status bar
      syncedRealtime: "● Synced in real time",
      selectLeadAbove: "Select a lead above",

      // KPIs + sections
      creditScoreKpi: "Credit Score",
      creditScoreExcellent: "Excellent",
      creditScoreVeryGood: "Very good",
      creditScoreGood: "Good",
      creditScoreLow: "Low",
      ageProfile: "Age Profile",
      ageYears: "years",
      ageOptimal: "Optimal age",
      ageAcceptable: "Acceptable",
      ageHighRisk: "High risk",
      ageLimited: "Limited",
      closeToApprove: "🎯 CLOSE TO APPROVAL - Recommended actions",
      legalRequirementsFailed: "⚠️ LEGAL REQUIREMENTS NOT MET",
      approvedTitle: "✅ CUSTOMER APPROVED! Sales opportunities",

      dtiRatio: "Debt-to-Income (DTI)",
      maxRecommended: (n: number) => `Max rec. ${n}%`,
      maxPurchaseCapacity: "Max Purchase Capacity",
      basedOnIncome: "Based on income",
      cashToCloseTitle: "Cash to Close (Funds Required)",
      downPaymentLine: (pct: number) => `Down payment (${pct}%)`,
      taxesAndFeesLine: (pct: number) => `Taxes & fees (~${pct}%)`,
      totalNeeded: "TOTAL NEEDED",
      marketScenarios: "Market Scenarios",
      fixed: "Fixed",
      mixed: "Mixed",
      variable: "Variable",
      bankRadar: (country: string) => `Bank Radar - ${country}`,
      viabilityLabel: "Eligibility",

      coachTips: "BOTZ COACH TIPS",

      considerLowerTermOrMoreDown: "• Consider a shorter term or higher down payment",
    },
  } as const;
  const t = copy[language];
  
  const [manualInputs, setManualInputs] = useState({
    valorVivienda: 0,
    ingresosMensuales: 0,
    deudasExistentes: 0,
    plazo: 25,
    tasa: 3.5,
  });
  
  const [aportacionReal, setAportacionReal] = useState<number>(
    calculo?.valorVivienda ? calculo.valorVivienda * 0.2 : 40000
  );
  const [cantidadAFinanciar, setCantidadAFinanciar] = useState<number>(
    calculo?.valorVivienda ? calculo.valorVivienda * 0.8 : 160000
  );
  const [requestedMortgageDirty, setRequestedMortgageDirty] = useState<boolean>(false);
  const [leadIncomplete, setLeadIncomplete] = useState<boolean>(false);
  const [manualDirty, setManualDirty] = useState<boolean>(false);

  // ✅ Estados para captura de datos de contacto y lead scoring
  const [showContactForm, setShowContactForm] = useState<boolean>(false);
  const [contactData, setContactData] = useState({
    nombre: '',
    email: '',
    telefono: ''
  });
  const [isSavingLead, setIsSavingLead] = useState<boolean>(false);
  const [leadScoreResult, setLeadScoreResult] = useState<any>(null);
  // ✅ Modo efectivo: permite completar manualmente un lead incompleto sin romper Lead(Auto)
  const effectiveManual = mode === "manual" || (isLeadMode && leadIncomplete);

  // ✅ Colombia-specific fields
  const [colombiaFields, setColombiaFields] = useState({
    tipoVivienda: "No VIS" as "VIS" | "No VIS",
    modalidad: "Crédito Pesos" as "Crédito Pesos" | "Leasing Habitacional" | "Crédito UVR",
    ciudadColombia: "Bogotá" as string,
    subsidio: "No" as "Sí" | "No",
    antiguedadLaboral: 12 as number,
    scoreCrediticioColombia: 650 as number
  });

  // ✅ Spain-specific fields
  const [spainFields, setSpainFields] = useState({
    edad: 35 as number,
    gastosMinimosVitales: 1000 as number // EUR/month
  });



// ✅ Auto-ajuste: si cambia el valor de vivienda en modo manual,
// recalcula la hipoteca solicitada manteniendo los ahorros (aportación)
useEffect(() => {
  if (!effectiveManual) return;

  const v = Number(manualInputs.valorVivienda) || 0;
  const a = Number(aportacionReal) || 0;

  // Only auto-fill requested mortgage if user hasn't typed it.
  if (!requestedMortgageDirty) {
    setCantidadAFinanciar(Math.max(0, v - a));
  }
}, [effectiveManual, manualInputs.valorVivienda, aportacionReal]);


  const [pais, setPais] = useState<string>("España");
  const [liveCalculo, setLiveCalculo] = useState<HipotecaCalculo | null>(null);
  const [leadError, setLeadError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "manual" && calculo) {
      setManualInputs(prev => ({
        valorVivienda: calculo.valorVivienda || prev.valorVivienda,
        ingresosMensuales: calculo.ingresosMensuales || prev.ingresosMensuales,
        deudasExistentes: calculo.deudasExistentes ?? prev.deudasExistentes,
        plazo: calculo.plazo ?? prev.plazo,
        tasa: calculo.tasa ?? prev.tasa,
      }));

      // ✅ Inicializa (sin pisar si el usuario ya cambió los valores)
      const vv = Number(calculo.valorVivienda) || 0;
      if (vv > 0) {
        setAportacionReal(prev => (prev === 40000 ? vv * 0.2 : prev));
        setCantidadAFinanciar(prev => (prev === 160000 ? vv * 0.8 : prev));
      }
    }
  }, [calculo, mode]);

  useEffect(() => {
    if (mode !== "lead" || !leadId || leadId.trim() === "") {
      setLiveCalculo(null);
      setLeadError(null);
      setLeadIncomplete(false);
      return;
    }

    if (!isValidUUID(leadId)) {
      setLeadError("ID de lead inválido");
      setLiveCalculo(null);
      setLeadIncomplete(false);
      return;
    }

    let cancelled = false;
    setLeadError(null);

      const buildCalculoFromLead = (lead: any): HipotecaCalculo => ({
        valorVivienda: Number(lead?.precio_real) || 0,
        ingresosMensuales: Number(lead?.ingresos_netos) || 0,
        cuotaEstimada: Number(lead?.cuota_estimada) || 0,
        dti: Number(lead?.dti) || 0,
        ltv: (lead?.ltv !== null && lead?.ltv !== undefined) ? Number(lead?.ltv) : undefined,
        score: Number(lead?.score) || 0,
        aprobado: Boolean(lead?.aprobado),
        cuotaCofidis: Number(lead?.cuota_cofidis) || undefined,
        deudasExistentes: Number(lead?.deudas_existentes) || 0,
        // Lead schema uses plazo_anos + tasa_interes
        plazo: Number((lead as any)?.plazo_anos ?? lead?.plazo) || 25,
        tasa: Number((lead as any)?.tasa_interes ?? lead?.tasa) || 3.5,
        edad: Number(lead?.edad) || undefined,
      });

    const fetchLead = async () => {
      try {
        const { data, error } = await supabase
          .from("leads")
          .select("*")
          .eq("id", leadId.trim())
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          setLeadError(`Error: ${error.message}`);
          setLeadIncomplete(false);
          return;
        }
        
        if (!data) {
          setLeadError("Lead no encontrado");
          setLiveCalculo(null);
          setLeadIncomplete(false);
          return;
        }

        // Si el lead existe pero aún no trae datos hipotecarios reales (n8n no ha escrito campos),
        // mostramos un mensaje claro para evitar ver todo en 0.
        const hasMortgageData = [
          "precio_real",
          "ingresos_netos",
          "cuota_estimada",
          "dti",
          "score",
          "aprobado",
          "deudas_existentes",
          "plazo",
          "tasa",
        ].some((k) => (data as any)?.[k] !== null && (data as any)?.[k] !== undefined);

        if (!hasMortgageData) {
          setLeadIncomplete(true);
          setLeadError(
            "Este lead existe, pero todavía no tiene datos hipotecarios (precio_real, ingresos_netos, etc.). " +
              "Completa los campos manualmente y presiona 'Guardar en CRM' para actualizar el lead."
          );
          setLiveCalculo(null);

          // ✅ Permitir completar manualmente SIN borrar la lógica de Lead(Auto):
          // solo prellenamos si el usuario todavía no ha tocado los campos.
          if (!manualDirty) {
            const vv = Number((data as any)?.precio_real ?? (data as any)?.valor_vivienda ?? 0) || 0;
            const ing = Number((data as any)?.ingresos_netos ?? 0) || 0;
            const deu = Number((data as any)?.deudas_existentes ?? (data as any)?.otras_cuotas ?? (data as any)?.deudas_mensuales ?? 0) || 0;
            const pl = Number((data as any)?.plazo ?? 25) || 25;
            const ta = Number((data as any)?.tasa ?? 3.5) || 3.5;

            setManualInputs(prev => ({
              ...prev,
              valorVivienda: vv || prev.valorVivienda,
              ingresosMensuales: ing || prev.ingresosMensuales,
              deudasExistentes: deu ?? prev.deudasExistentes,
              plazo: pl || prev.plazo,
              tasa: ta || prev.tasa,
            }));

            const ap = Number((data as any)?.aportacion_real ?? (data as any)?.aportacionReal ?? 0) || 0;
            const ca = Number((data as any)?.cantidad_a_financiar ?? (data as any)?.cantidadAFinanciar ?? 0) || 0;

            if (vv > 0) {
              if (ap > 0) setAportacionReal(ap);
              if (ca > 0) setCantidadAFinanciar(ca);
              // si no viene hipoteca, calcula por defecto vv - aportación (si la hay) o 80%
              if (ca <= 0) {
                const fallback = ap > 0 ? Math.max(0, vv - ap) : Math.max(0, vv * 0.8);
                setCantidadAFinanciar(fallback);
              }
            }
          }
          return;
        }

        setLeadIncomplete(false);
        setLeadError(null);
        setLiveCalculo(buildCalculoFromLead(data));

        // Keep Spain age in sync so "Perfil edad" matches the lead.
        const leadEdad = Number((data as any)?.edad) || 0;
        if (leadEdad > 0) {
          setSpainFields((prev) => ({ ...prev, edad: leadEdad }));
        }
      } catch (e: any) {
        if (!cancelled) {
          setLeadError("Error de conexión");
        }
      }
    };

    fetchLead();

    const channel = supabase
      .channel(`leads-live-${leadId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "leads", filter: `id=eq.${leadId.trim()}` },
        () => fetchLead()
      )
      .subscribe();

    return () => {
      cancelled = true;
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [leadId, mode, manualDirty]);

  const paisConfig = PAISES_CONFIG[pais] || PAISES_CONFIG["España"];

// ✅ Para brokers (España): Euríbor + diferencial para escenario variable (editable)
const [euribor12m, setEuribor12m] = useState<number>(paisConfig.euribor12m ?? 0);
const [diferencial, setDiferencial] = useState<number>(paisConfig.diferencial ?? 1.0);

// ✅ Selector profesional: qué tasa usar para el análisis (DTI/Radar/cuota principal)
const [tasaAnalisisMode, setTasaAnalisisMode] = useState<"anual" | "euribor">("anual");

// ✅ Exportar ficha (PDF por impresión / Excel vía CSV)
const [exportOpen, setExportOpen] = useState(false);
const [exportMsg, setExportMsg] = useState<string | null>(null);

// ✅ Guardar datos manuales al lead seleccionado (cuando el lead existe pero llegó incompleto)
const [saveMsg, setSaveMsg] = useState<string | null>(null);

useEffect(() => {
  // Al cambiar de país, cargamos defaults del país (si existen)
  setEuribor12m(paisConfig.euribor12m ?? 0);
  setDiferencial(paisConfig.diferencial ?? 1.0);
}, [pais]);


  const calc = useMemo<HipotecaCalculo>(() => {
    if (isLeadMode && liveCalculo) {
      return liveCalculo;
    }
    
    const { valorVivienda, ingresosMensuales, deudasExistentes, plazo, tasa } = manualInputs;

    // --- Spain engine (aligned with operational spec) ---
    if (pais === "España") {
      const precio = Number(valorVivienda) || 0;
      const ing = Number(ingresosMensuales) || 0;
      const otras = Number(deudasExistentes) || 0;

      // 1) coste_total = precio + gastos+impuestos (fallback usando paisConfig.impuestosGastos)
      const taxesAndFees = precio * (paisConfig.impuestosGastos || 0);
      const costeTotal = precio + taxesAndFees;

      // 2) financiacion_necesaria = coste_total - aportacion
      const aport = Number(aportacionReal) || 0;
      const financiacionNecesaria = Math.max(0, costeTotal - aport);

      // 3) principal: usa hipoteca solicitada si existe, si no financiacion necesaria
      const requested = effectiveManual ? (Number(cantidadAFinanciar) || 0) : 0;
      const principal = requested > 0 ? requested : financiacionNecesaria;

      // 4) tasa: si no hay, default 2.60%
      const tinDefault = 2.6;
      const tasaAnual = (effectiveManual && tasaAnalisisMode === "euribor")
        ? ((euribor12m || 0) + (diferencial || 0))
        : (Number(tasa) || 0);
      const tasaParaAnalisis = tasaAnual > 0 ? tasaAnual : tinDefault;

      // 5) plazo: max 30 y edad+plazo <= 75
      const edad = Number(spainFields.edad) || 0;
      const maxPorEdad = edad > 0 ? Math.max(0, 75 - edad) : 30;
      const plazoAnios = Math.min(30, Number(plazo) || 0, maxPorEdad || 30);

      const cuotaEstimada = pmt(principal, tasaParaAnalisis / 100, plazoAnios);
      const gastosMensuales = cuotaEstimada + otras;
      const dtiPct = ing > 0 ? (gastosMensuales / ing) * 100 : 0;

      // LTV siempre contra precio (no contra costeTotal)
      const ltvPct = precio > 0 ? (financiacionNecesaria / precio) * 100 : 0;

      // Regla LTV por edad (derivacion)
      let requiereAsesor = false;
      if (edad > 0 && edad < 35) {
        if (ltvPct > 95) requiereAsesor = true;
      } else {
        if (ltvPct > 90) requiereAsesor = true;
      }

      // Score se mantiene con tu heuristica actual (valor agregado adicional)
      const score = calcularScore(dtiPct, ing, otras, pais, colombiaFields, spainFields);
      const scoreMinimo = 50;

      // Aprobacion: hard DTI 40% + validacion legal (edad+plazo) + score
      const aprobadoLegal = (edad <= 0) ? true : (edad + plazoAnios) <= 75;
      const aprobado = dtiPct > 0 && dtiPct <= 40 && score >= scoreMinimo && aprobadoLegal;

      return {
        valorVivienda: precio,
        ingresosMensuales: ing,
        cuotaEstimada: Math.round(cuotaEstimada),
        dti: Math.round(dtiPct * 10) / 10,
        ltv: Math.round(ltvPct * 10) / 10,
        costeTotal: Math.round(costeTotal),
        financiacionNecesaria: Math.round(financiacionNecesaria),
        requiereAsesor,
        score,
        aprobado,
        deudasExistentes: otras,
        plazo: plazoAnios,
        tasa: tasaParaAnalisis,
        edad,
      };
    }
    
    // Colombia-specific adjustments
    let adjustedTasa = tasa;
    let adjustedEntradaMinima = paisConfig.entradaMinima;
    
    if (pais === "Colombia") {
      // VIS housing gets better rates
      if (colombiaFields.tipoVivienda === "VIS") {
        adjustedTasa -= 0.8; // ~80bps better rates for VIS
        adjustedEntradaMinima = 0.10; // Lower entry requirements
      }
      
      // Different rates by modality
      if (colombiaFields.modalidad === "Leasing Habitacional") {
        adjustedTasa += 0.3; // Leasing typically slightly higher
      } else if (colombiaFields.modalidad === "Crédito UVR") {
        adjustedTasa -= 0.2; // UVR typically lower nominal rate
      }
      
      // City adjustments
      if (["Bogotá", "Medellín"].includes(colombiaFields.ciudadColombia)) {
        adjustedTasa += 0.2; // Major cities slightly higher rates
      }
      
      // Subsidy benefits
      if (colombiaFields.subsidio === "Sí") {
        adjustedEntradaMinima = 0.05; // Much lower entry with subsidy
        adjustedTasa -= 0.5; // Better rates with subsidy
      }
    }
    
    const porcentajeFinanciacion = 1 - adjustedEntradaMinima;
    const montoPrestamo = effectiveManual ? cantidadAFinanciar : valorVivienda * porcentajeFinanciacion;
    const tasaParaAnalisis = (effectiveManual && pais === "España" && tasaAnalisisMode === "euribor")
      ? (euribor12m + diferencial)
      : adjustedTasa;
    const cuotaEstimada = pmt(montoPrestamo, tasaParaAnalisis / 100, plazo);
    
    const gastosMensuales = cuotaEstimada + (deudasExistentes || 0);
    const dti = ingresosMensuales > 0 ? (gastosMensuales / ingresosMensuales) * 100 : 0;
    
    const score = calcularScore(dti, ingresosMensuales, deudasExistentes, pais, colombiaFields, spainFields);
    // ✅ Validación legal por país
    let aprobadoLegal = true;
    let mensajesLegales: string[] = [];

    if (pais === "Colombia") {
      // Validaciones legales Colombia
      if (colombiaFields.antiguedadLaboral < 6) {
        aprobadoLegal = false;
        mensajesLegales.push("Antigüedad laboral mínima: 6 meses");
      }
      if (colombiaFields.scoreCrediticioColombia < 600) {
        aprobadoLegal = false;
        mensajesLegales.push("Score crediticio mínimo: 600 puntos");
      }
      // Cálculo de gastos básicos obligatorios (SMMLV)
      const smmlv = 1300000; // 2025 Colombia
      const gastosBasicos = smmlv * 2; // Mínimo 2 SMMLV para subsistencia
      const capacidadReal = ingresosMensuales * 0.30 - gastosBasicos;
      if (capacidadReal <= cuotaEstimada) {
        aprobadoLegal = false;
        mensajesLegales.push("Cuota excede capacidad + gastos básicos");
      }
    }

    if (pais === "España") {
      // Validaciones legales España
      if (spainFields.edad + plazo > 75) {
        aprobadoLegal = false;
        mensajesLegales.push("Edad + plazo no puede exceder 75 años");
      }
      // IRPF reduce capacidad de pago (19-47% según ingresos)
      const irpfPercent = ingresosMensuales > 6000 ? 0.37 : (ingresosMensuales > 3000 ? 0.28 : 0.19);
      const ingresosNetos = ingresosMensuales * (1 - irpfPercent);
      const capacidadNetos = ingresosNetos * (paisConfig.dtiMaximo / 100) - spainFields.gastosMinimosVitales;
      if (capacidadNetos <= cuotaEstimada) {
        aprobadoLegal = false;
        mensajesLegales.push("Cuota excede capacidad después de IRPF y gastos vitales");
      }
    }

    const scoreMinimo = pais === "Colombia" ? 60 : 50;
    const aprobado = dti > 0 && dti < paisConfig.dtiMaximo && score >= scoreMinimo && aprobadoLegal;

    const resultado: HipotecaCalculo = {
      valorVivienda,
      ingresosMensuales,
      cuotaEstimada: Math.round(cuotaEstimada),
      dti: Math.round(dti * 10) / 10,
      score,
      aprobado,
      deudasExistentes,
      plazo,
      tasa: tasaParaAnalisis,
    };

    // Add Colombia-specific fields when applicable
    if (pais === "Colombia") {
      resultado.tipoVivienda = colombiaFields.tipoVivienda;
      resultado.modalidad = colombiaFields.modalidad;
      resultado.ciudadColombia = colombiaFields.ciudadColombia;
      resultado.subsidio = colombiaFields.subsidio;
      resultado.antiguedadLaboral = colombiaFields.antiguedadLaboral;
      resultado.scoreCrediticioColombia = colombiaFields.scoreCrediticioColombia;
    }

    // Add Spain-specific fields when applicable
    if (pais === "España") {
      resultado.edad = spainFields.edad;
    }

    return resultado;
  }, [isLeadMode, liveCalculo, manualInputs, paisConfig, cantidadAFinanciar, mode, effectiveManual, pais, tasaAnalisisMode, euribor12m, diferencial, colombiaFields]);

  const precio = calc.valorVivienda || 0;
  const ingresos = calc.ingresosMensuales || 0;
  const score = calc.score || 0;
  const dti = calc.dti || 0;
  
  const entradaRequerida = precio * paisConfig.entradaMinima;
  const gastosImpuestos = precio * paisConfig.impuestosGastos;
  const cashToClose = entradaRequerida + gastosImpuestos;

// ✅ Escenarios: calculados con PMT (más real) sin afectar el cálculo principal
const principalEscenarios =
  effectiveManual
    ? (cantidadAFinanciar || 0)
    : precio * (1 - paisConfig.entradaMinima);

const plazoEscenarios = calc.plazo || manualInputs.plazo || 0;
const tasaBaseEscenarios = (calc.tasa ?? manualInputs.tasa) || 0;

const tasaFijaEscenarios = tasaBaseEscenarios + 0.5;
const tasaMixtoEscenarios = tasaBaseEscenarios;
const tasaVariableEscenarios =
  pais === "España"
    ? ((euribor12m || 0) + (diferencial || 0))
    : (tasaBaseEscenarios - 0.5);

const cuotaFijaEscenarios = pmt(principalEscenarios, tasaFijaEscenarios / 100, plazoEscenarios);
const cuotaMixtoEscenarios = pmt(principalEscenarios, tasaMixtoEscenarios / 100, plazoEscenarios);
const cuotaVariableEscenarios = pmt(principalEscenarios, tasaVariableEscenarios / 100, plazoEscenarios);

  
  const capacidadEndeudamiento = ingresos * (paisConfig.dtiMaximo / 100);
  const tasaCalc = (calc.tasa || manualInputs.tasa) / 100;
  const plazoCalc = calc.plazo || manualInputs.plazo;
  const hipotecaMaximaTeorica = capacidadEndeudamiento > 0 
    ? (capacidadEndeudamiento * (1 - Math.pow(1 + tasaCalc/12, -plazoCalc*12))) / (tasaCalc/12)
    : 0;

  const getBankProb = (base: number) => Math.min(99, Math.max(10, Math.round((base * score) / 100)));

  // ✅ Cargar tasas bancarias reales
  const [tasasReales, setTasasReales] = useState<any[]>([]);
  const [loadingTasas, setLoadingTasas] = useState(false);

  useEffect(() => {
    if (pais === "Colombia" && score > 40) {
      setLoadingTasas(true);
      getTasasBancolombia()
        .then(data => {
          if (validateTasasResponse(data)) {
            setTasasReales(data);
          } else {
            setTasasReales(getTasasFallback('bancolombia'));
          }
        })
        .catch(() => {
          setTasasReales(getTasasFallback('bancolombia'));
        })
        .finally(() => setLoadingTasas(false));
    }
  }, [pais, score]);

  const tr = (esText: string, enText: string) => (language === "en" ? enText : esText);

  const translateBankNote = (note: string) => {
    if (language !== "en") return note;
    const map: Record<string, string> = {
      "Acepta DTI 40%": "Accepts DTI 40%",
      "Estricto con nómina": "Strict on payroll",
      "Bueno para funcionarios": "Good for public employees",
      "Flexible en LTV": "Flexible on LTV",
      "Líder en hipotecas": "Mortgage leader",
      "Buenos plazos": "Good terms",
      "Tasas competitivas": "Competitive rates",
      "Amplia cobertura": "Wide coverage",
    };
    return map[note] || note;
  };

  const banks = paisConfig.bancos.map((bank, i) => {
    // ✅ Probabilidad base según scoring real del cliente
    let prob = getBankProb(score * 0.9 + (85 + i * 3) * 0.1); // 90% score + 10% base
    let recommendation = "";
    let rateAdjustment = 0;
    let tasaReal = null;

    // ✅ Usar tasas reales si están disponibles
    if (pais === "Colombia" && tasasReales.length > 0) {
      const tasaBanco = tasasReales.find(t => t.banco === bank.name);
      if (tasaBanco) {
        tasaReal = tasaBanco.tasa;
        // Ajustar según tipo de vivienda
        if (colombiaFields.tipoVivienda === "VIS" && tasaBanco.tipoVivienda === "VIS") {
          // Usar tasa VIS directamente
          rateAdjustment = 0;
        } else if (colombiaFields.tipoVivienda === "No VIS" && tasaBanco.tipoVivienda === "No VIS") {
          // Usar tasa No VIS directamente
          rateAdjustment = 0;
        } else {
          // Ajuste si no coincide el tipo
          rateAdjustment = colombiaFields.tipoVivienda === "VIS" ? -0.8 : 0;
        }
      }
    }

    // ✅ Ajustes según score del cliente
    if (score >= 80) {
      prob = Math.min(99, prob + 20); // Excelente score
      if (!tasaReal) rateAdjustment -= 0.5; // Mejores tasas
    } else if (score >= 60) {
      prob = Math.min(99, prob + 10); // Buen score
      if (!tasaReal) rateAdjustment -= 0.2;
    } else if (score < 40) {
      prob = Math.max(15, prob - 20); // Score bajo
      if (!tasaReal) rateAdjustment += 0.3; // Peores tasas
    }

    if (pais === "Colombia") {
      // Lógica específica Colombia CONECTADA CON SCORING
      if (bank.name === "Bancolombia" && colombiaFields.tipoVivienda === "VIS") {
        prob = Math.min(99, prob + 15);
        recommendation = tr("Excelente para vivienda VIS", "Great for VIS housing");
        rateAdjustment -= 0.5;
      }
      if (bank.name === "Davivienda" && colombiaFields.subsidio === "Sí") {
        prob = Math.min(99, prob + 20);
        recommendation = tr("Mejor opción con subsidio", "Best option with subsidy");
        rateAdjustment -= 0.8;
      }
      if (bank.name === "BBVA Colombia" && colombiaFields.modalidad === "Leasing Habitacional") {
        prob = Math.min(99, prob + 10);
        recommendation = tr("Líder en leasing habitacional", "Leader in housing leasing");
        rateAdjustment -= 0.3;
      }
      
      // Conexión directa con score crediticio Colombia
      if (colombiaFields.scoreCrediticioColombia >= 800) {
        prob = Math.min(99, prob + 25);
        recommendation += tr(" | Score excelente", " | Excellent score");
        rateAdjustment -= 0.8;
      } else if (colombiaFields.scoreCrediticioColombia >= 700) {
        prob = Math.min(99, prob + 15);
        recommendation += tr(" | Score muy bueno", " | Very good score");
        rateAdjustment -= 0.5;
      } else if (colombiaFields.scoreCrediticioColombia < 600) {
        prob = Math.max(10, prob - 30);
        recommendation += tr(" | Score bajo", " | Low score");
        rateAdjustment += 1.0;
      }

      // Antigüedad laboral afecta probabilidades
      if (colombiaFields.antiguedadLaboral >= 24) {
        prob = Math.min(99, prob + 10);
      } else if (colombiaFields.antiguedadLaboral < 6) {
        prob = Math.max(5, prob - 40); // Casi imposible
        recommendation += tr(" | Antigüedad insuficiente", " | Insufficient tenure");
      }
    }

    if (pais === "España") {
      // Lógica específica España CONECTADA CON SCORING
      if (bank.name === "Santander" && calc.dti < 30) {
        prob = Math.min(99, prob + 12);
        recommendation = tr("Acepta DTI hasta 40%", "Accepts DTI up to 40%");
      }
      if (bank.name === "BBVA" && calc.ingresosMensuales > 3000) {
        prob = Math.min(99, prob + 8);
        recommendation = tr("Bueno para ingresos altos", "Good for high income");
      }
      if (tasaAnalisisMode === "euribor" && bank.name === "CaixaBank") {
        prob = Math.min(99, prob + 15);
        recommendation = tr("Flexible con Euríbor", "Flexible with Euribor");
      }
      
      // Edad afecta probabilidades España
      if (spainFields.edad) {
        if (spainFields.edad <= 45) {
          prob = Math.min(99, prob + 10);
        } else if (spainFields.edad > 65) {
          prob = Math.max(20, prob - 30);
          recommendation += tr(" | Edad avanzada", " | Advanced age");
        }
      }
    }

    return {
      ...bank,
      note: translateBankNote(bank.note),
      prob: Math.round(prob),
      recommendation,
      rateAdjustment: Math.round(rateAdjustment * 100) / 100,
      tasaReal: tasaReal
    };
  });

  const handleInputChange = useCallback((field: keyof typeof manualInputs, value: string) => {
    const numValue = parseFloat(value.replace(/[^0-9.]/g, "")) || 0;
    setManualDirty(true);
    setManualInputs(prev => ({ ...prev, [field]: numValue }));
  }, []);

  const resetManual = useCallback(() => {
    setManualDirty(false);
    setRequestedMortgageDirty(false);
    setManualInputs({ valorVivienda: 0, ingresosMensuales: 0, deudasExistentes: 0, plazo: 25, tasa: 3.5 });
    setAportacionReal(40000);
    setCantidadAFinanciar(160000);
  }, []);


  // ✅ Guardar (manual) en el lead seleccionado: escribe campos hipotecarios en la tabla leads
  const saveManualToLead = useCallback(async () => {
    if (!leadId || String(leadId).trim() === "") {
      setSaveMsg("Selecciona un lead para poder guardar.");
      return;
    }

    try {
      setSaveMsg("Guardando en CRM...");
      // 🔎 Leemos el lead actual para saber qué columnas existen y evitar errores de "schema cache"
      const { data: currentLead, error: readErr } = await supabase
        .from("leads")
        .select("*")
        .eq("id", String(leadId).trim())
        .maybeSingle();

      if (readErr) {
        // No bloqueamos el guardado; simplemente intentaremos con las claves principales.
        // (Si tu API cache está desactualizado, igualmente te mostrará el error real.)
        console.warn("No se pudo leer el lead actual:", readErr.message);
      }

      const cols = new Set(Object.keys(currentLead || {}));
      const safePayload: any = {};

      const num = (v: any, def = 0) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : def;
      };

      // Asigna a la primera columna existente en tu tabla (con fallback a nombres alternativos)
      const put = (keys: string[], value: any) => {
        if (!currentLead) {
          // Si no pudimos leer, usamos la primera clave para no bloquear.
          safePayload[keys[0]] = value;
          return;
        }
        for (const k of keys) {
          if (cols.has(k)) {
            safePayload[k] = value;
            return;
          }
        }
        // Si ninguna existe, no enviamos nada (evita error de columna inexistente)
      };

      // ✅ Campos base (mapeo por si tu schema usa nombres diferentes)
      put(["precio_real", "valor_vivienda", "property_value"], num(manualInputs.valorVivienda, 0));
      put(["ingresos_netos", "ingresos_mensuales", "income"], num(manualInputs.ingresosMensuales, 0));
      put(["otras_cuotas", "deudas_mensuales", "existing_debts", "deudas_existentes"], num(manualInputs.deudasExistentes, 0));
      put(["plazo_anos", "plazo", "plazo_anios", "plazo_years", "term_years"], num(calc.plazo ?? manualInputs.plazo, 25));
      // ✅ Usa la tasa efectiva del análisis (ya incluye Euríbor+Dif si el broker lo seleccionó)
      put(["tasa_interes", "tasa_anual", "tasa", "interest_rate", "annual_rate", "tin"], num((calc.tasa ?? manualInputs.tasa), 0));

      // ✅ Resultados que guardas para CRM (si existen las columnas)
      put(["cuota_estimada", "cuota_mensual", "monthly_payment"], num(calc.cuotaEstimada, 0));
      put(["dti"], num(calc.dti, 0));
      if ((calc as any).ltv !== undefined && (calc as any).ltv !== null) {
        put(["ltv"], num((calc as any).ltv, 0));
      }
      put(["score"], num(calc.score, 0));

      // ✅ Campos manuales (si existen en tu tabla)
      put(["aportacion_real", "ahorros_aporta", "ahorros", "down_payment"], num(aportacionReal, 0));
      put(["cantidad_a_financiar", "monto_hipoteca", "loan_amount"], num(cantidadAFinanciar, 0));

      // ✅ timestamps opcionales (solo si existen)
      put(["updated_at"], new Date().toISOString());
      put(["ultima_interaccion"], new Date().toISOString());

      const { error } = await supabase
        .from("leads")
        .update(safePayload)
        .eq("id", String(leadId).trim());

      if (error) {
        // Si falla por columna inexistente (ej: updated_at), te lo dejo claro
        setSaveMsg(`Error al guardar: ${error.message}`);
        return;
      }

      setSaveMsg("✅ Guardado. El CRM y el modo Lead se actualizarán en tiempo real.");
    } catch (e: any) {
      setSaveMsg(`Error inesperado: ${e?.message || String(e)}`);
    }
  }, [leadId, manualInputs, calc, aportacionReal, cantidadAFinanciar, pais, paisConfig]);

  // ✅ Exportar ficha: (1) CSV para Excel, (2) imprimir/guardar PDF desde el navegador
  const downloadCsv = useCallback(() => {
    try {
      const rows: Record<string, any>[] = [
        {
          pais,
          moneda: paisConfig.moneda,
          valor_vivienda: calc.valorVivienda,
          ahorros_aporta: aportacionReal,
          hipoteca_solicitada: cantidadAFinanciar,
          ingresos_mensuales: calc.ingresosMensuales,
          deudas_mensuales: calc.deudasExistentes,
          plazo_anos: calc.plazo,
          tasa_analisis: calc.tasa,
          cuota_estimada: calc.cuotaEstimada,
          dti: calc.dti,
          score: calc.score,
          aprobado: calc.aprobado ? "SI" : "NO",
        },
      ];

      const headers = Object.keys(rows[0]);
      const csv = [
        headers.join(","),
        ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")),
  ].join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ficha_hipoteca_${pais}_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setExportMsg("✅ CSV descargado (Excel lo abre perfecto).");
    } catch (e: any) {
      setExportMsg(`Error exportando CSV: ${e?.message || String(e)}`);
    }
  }, [pais, paisConfig, calc, aportacionReal, cantidadAFinanciar]);

  const printFicha = useCallback(() => {
    try {
      const w = window.open("", "_blank", "width=900,height=700");
      if (!w) {
        setExportMsg("Tu navegador bloqueó la ventana. Permite pop-ups para imprimir/guardar PDF.");
        return;
      }

      const html = `
        <html>
          <head>
            <title>Ficha Hipotecaria</title>
            <meta charset="utf-8" />
            <style>
              body{ font-family: Arial, sans-serif; padding: 24px; color:#0f172a;}
              h1{ margin:0 0 6px 0; }
              .sub{ color:#334155; margin:0 0 18px 0; }
              .grid{ display:grid; grid-template-columns: 1fr 1fr; gap:12px; }
              .card{ border:1px solid #e2e8f0; border-radius:12px; padding:12px; }
              .k{ color:#64748b; font-size:12px; margin-bottom:4px;}
              .v{ font-size:18px; font-weight:700;}
              .small{ font-size:12px; color:#334155; margin-top:6px;}
              .footer{ margin-top:18px; font-size:11px; color:#64748b;}
            </style>
          </head>
          <body>
            <h1>Ficha Hipotecaria - ${pais}</h1>
            <p class="sub">Estimación basada en datos ingresados manualmente.</p>

            <div class="grid">
              <div class="card"><div class="k">Valor vivienda</div><div class="v">${calc.valorVivienda} ${paisConfig.simbolo}</div></div>
              <div class="card"><div class="k">Ahorros que aporta</div><div class="v">${aportacionReal} ${paisConfig.simbolo}</div></div>
              <div class="card"><div class="k">Hipoteca solicitada</div><div class="v">${cantidadAFinanciar} ${paisConfig.simbolo}</div></div>
              <div class="card"><div class="k">Ingresos mensuales</div><div class="v">${calc.ingresosMensuales} ${paisConfig.simbolo}</div></div>
              <div class="card"><div class="k">Deudas mensuales</div><div class="v">${calc.deudasExistentes} ${paisConfig.simbolo}</div></div>
              <div class="card"><div class="k">Plazo</div><div class="v">${calc.plazo} años</div></div>
              <div class="card"><div class="k">Tasa usada para análisis</div><div class="v">${calc.tasa}%</div><div class="small">(${pais === "España" && tasaAnalisisMode === "euribor" ? "Euríbor + diferencial" : "Tasa anual"})</div></div>
              <div class="card"><div class="k">Cuota estimada</div><div class="v">${calc.cuotaEstimada} ${paisConfig.simbolo}/mes</div></div>
              <div class="card"><div class="k">DTI</div><div class="v">${calc.dti}%</div></div>
              <div class="card"><div class="k">Score</div><div class="v">${calc.score}/100</div></div>
              <div class="card"><div class="k">Aprobado</div><div class="v">${calc.aprobado ? "SI" : "NO"}</div></div>
            </div>

            <div class="footer">Nota: Radar y scoring son estimaciones internas (no constituyen aprobación bancaria).</div>
            <script>window.onload = () => { window.print(); };</script>
          </body>
        </html>
      `;

      w.document.open();
      w.document.write(html);
      w.document.close();
      setExportMsg("✅ Se abrió la ficha para imprimir / Guardar como PDF.");
    } catch (e: any) {
      setExportMsg(`Error imprimiendo: ${e?.message || String(e)}`);
    }
  }, [pais, paisConfig, calc, aportacionReal, cantidadAFinanciar, tasaAnalisisMode]);

const saveLeadScoreToCRM = async () => {
    if (!contactData.nombre || !contactData.email) {
      alert('Por favor ingresa tu nombre y email');
      return;
    }

    setIsSavingLead(true);

    try {
      const response = await fetch('/api/lead-scoring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: contactData.nombre,
          email: contactData.email,
          telefono: contactData.telefono,
          pais: pais,
          ingresos_mensuales: calc.ingresosMensuales,
          valor_propiedad: calc.valorVivienda,
          cuota_inicial: aportacionReal,
          plazo_anios: calc.plazo,
          tasa_interes: calc.tasa,
          dti: calc.dti,
          ltv: (calc as any).ltv ?? (((calc.valorVivienda - aportacionReal) / calc.valorVivienda) * 100),
          cuota_mensual: calc.cuotaEstimada,
          score_bancario: calc.score,
          ingresos_anuales: calc.ingresosMensuales * 12,
          edad: pais === "España" ? spainFields.edad : undefined,
          tipo_vivienda: pais === "Colombia" ? colombiaFields.tipoVivienda === "VIS" ? "primera" : "segunda" : undefined,
          tiene_creditos: (calc.deudasExistentes || 0) > 0
        })
      });

      const result = await response.json();

      if (response.ok) {
        setLeadScoreResult(result);
        // No usamos alert, mostramos en el UI
      } else {
        // Mostramos error de forma elegante
        setLeadScoreResult({
          error: true,
          message: result.error || 'Error al guardar el lead'
        });
      }
    } catch (error) {
      console.error('Error guardando lead:', error);
      alert('Error al guardar el lead. Intenta nuevamente.');
    } finally {
      setIsSavingLead(false);
    }
  };

  return (
    <div style={{ height: "100%", overflowY: "auto", paddingRight: "8px", display: "flex", flexDirection: "column", gap: "20px" }}>
      
      {effectiveManual && (
        <div style={inputPanelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <Globe size={16} color="#64748b" />
              <select value={pais} onChange={(e) => setPais(e.target.value)} style={selectStyle}>
                {Object.keys(PAISES_CONFIG).map(p => (
                  <option key={p} value={p}>{p} ({PAISES_CONFIG[p].moneda})</option>
                ))}
              </select>
              <span style={{ fontSize: "11px", color: "#64748b" }}>
                {t.dtiMax} {paisConfig.dtiMaximo}% | {t.downPayment} {paisConfig.entradaMinima * 100}%
              </span>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              {leadId && (
                <button onClick={saveManualToLead} style={saveButtonStyle}>
                  {t.saveToCrm}
                </button>
              )}
              <button onClick={resetManual} style={resetButtonStyle}>
                <RefreshCw size={12} /> {t.reset}
              </button>
            </div>
          </div>

          {saveMsg && (
            <div style={{ marginTop: "-6px", marginBottom: "10px", fontSize: "12px", color: "#94a3b8" }}>{saveMsg}</div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px" }}>
            <InputField
              label={t.houseValue}
              value={manualInputs.valorVivienda}
              onChange={(v) => handleInputChange("valorVivienda", v)}
              prefix={paisConfig.simbolo}
            />
            <InputField
              label={t.savings}
              value={aportacionReal}
              onChange={(v) => {
                const val = Number(v) || 0;
                setManualDirty(true);
                setAportacionReal(val);
                // Si pone más ahorros, sugerimos menos hipoteca SOLO si no han tocado el importe
                if (!requestedMortgageDirty) {
                  setCantidadAFinanciar(Math.max(0, (manualInputs.valorVivienda || 0) - val));
                }
              }}
              prefix={paisConfig.simbolo}
            />
            <InputField
              label={t.requestedMortgage}
              value={cantidadAFinanciar}
              onChange={(v) => {
                setManualDirty(true);
                setRequestedMortgageDirty(true);
                setCantidadAFinanciar(Number(v) || 0);
              }}
              prefix={paisConfig.simbolo}
            />
            <InputField
              label={t.monthlyIncome}
              value={manualInputs.ingresosMensuales}
              onChange={(v) => handleInputChange("ingresosMensuales", v)}
              prefix={paisConfig.simbolo}
            />
            <InputField
              label={t.monthlyDebts}
              value={manualInputs.deudasExistentes}
              onChange={(v) => handleInputChange("deudasExistentes", v)}
              prefix={paisConfig.simbolo}
            />
            <InputField
              label={t.term}
              value={manualInputs.plazo}
              onChange={(v) => handleInputChange("plazo", v)}
              suffix={t.years}
            />
            <InputField
              label={t.annualRate}
              value={manualInputs.tasa}
              onChange={(v) => handleInputChange("tasa", v)}
              suffix="%"
              step="0.1"
            />

            {pais === "España" && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "-6px", marginBottom: "6px" }}>
                <span style={{ fontSize: "11px", color: "#64748b" }}>{t.analysisRate}</span>
                <select
                  value={tasaAnalisisMode}
                  onChange={(e) => setTasaAnalisisMode(e.target.value as any)}
                  style={{ ...selectStyle, padding: "6px 10px", fontSize: "12px" }}
                >
                  <option value="anual">{t.useAnnualRate}</option>
                  <option value="euribor">{t.useEuriborDiff}</option>
                </select>
                {tasaAnalisisMode === "euribor" && (
                  <span style={{ fontSize: "11px", color: "#64748b" }}>
                    ({(euribor12m + diferencial).toFixed(2)}%)
                  </span>
                )}
              </div>
            )}


            {pais === "España" && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "-6px", marginBottom: "6px" }}>
                <span style={{ fontSize: "11px", color: "#64748b" }}>{t.analysisRate}</span>
                <select
                  value={tasaAnalisisMode}
                  onChange={(e) => setTasaAnalisisMode(e.target.value as any)}
                  style={{ ...selectStyle, padding: "6px 10px", fontSize: "12px" }}
                >
                  <option value="anual">{t.useAnnualRate}</option>
                  <option value="euribor">{t.useEuriborDiff}</option>
                </select>
                {tasaAnalisisMode === "euribor" && (
                  <span style={{ fontSize: "11px", color: "#64748b" }}>
                    {(euribor12m + diferencial).toFixed(2)}%
                  </span>
                )}
              </div>
            )}

            {/* Colombia-specific fields */}
            {pais === "Colombia" && (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>{t.housingType}</label>
                  <div style={inputWrapperStyle}>
                    <select
                      value={colombiaFields.tipoVivienda}
                      onChange={(e) => setColombiaFields(prev => ({ ...prev, tipoVivienda: e.target.value as "VIS" | "No VIS" }))}
                      style={{ ...inputStyle, ...selectStyle, cursor: "pointer" }}
                    >
                      <option value="No VIS">{t.housingTypeNoVis}</option>
                      <option value="VIS">{t.housingTypeVis}</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>{t.modality}</label>
                  <div style={inputWrapperStyle}>
                    <select
                      value={colombiaFields.modalidad}
                      onChange={(e) => setColombiaFields(prev => ({ ...prev, modalidad: e.target.value as any }))}
                      style={{ ...inputStyle, ...selectStyle, cursor: "pointer" }}
                    >
                      <option value="Crédito Pesos">{t.modalityCreditPesos}</option>
                      <option value="Leasing Habitacional">{t.modalityLeasing}</option>
                      <option value="Crédito UVR">{t.modalityUvr}</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>{t.city}</label>
                  <div style={inputWrapperStyle}>
                    <select
                      value={colombiaFields.ciudadColombia}
                      onChange={(e) => setColombiaFields(prev => ({ ...prev, ciudadColombia: e.target.value }))}
                      style={{ ...inputStyle, ...selectStyle, cursor: "pointer" }}
                    >
                      <option value="Bogotá">Bogotá</option>
                      <option value="Medellín">Medellín</option>
                      <option value="Cali">Cali</option>
                      <option value="Barranquilla">Barranquilla</option>
                      <option value="Bucaramanga">Bucaramanga</option>
                      <option value="Cartagena">Cartagena</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>{t.subsidy}</label>
                  <div style={inputWrapperStyle}>
                    <select
                      value={colombiaFields.subsidio}
                      onChange={(e) => setColombiaFields(prev => ({ ...prev, subsidio: e.target.value as "Sí" | "No" }))}
                      style={{ ...inputStyle, ...selectStyle, cursor: "pointer" }}
                    >
                      <option value="No">No</option>
                      <option value="Sí">Sí</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>{t.jobTenure}</label>
                  <div style={inputWrapperStyle}>
                    <input
                      type="number"
                      value={colombiaFields.antiguedadLaboral}
                      onChange={(e) => setColombiaFields(prev => ({ ...prev, antiguedadLaboral: Number(e.target.value) || 0 }))}
                      style={{ ...inputStyle, cursor: "pointer" }}
                    />
                    <span style={inputAddonStyle}>{t.months}</span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>{t.creditScore}</label>
                  <div style={inputWrapperStyle}>
                    <input
                      type="number"
                      value={colombiaFields.scoreCrediticioColombia}
                      onChange={(e) => setColombiaFields(prev => ({ ...prev, scoreCrediticioColombia: Number(e.target.value) || 0 }))}
                      style={{ ...inputStyle, cursor: "pointer" }}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Spain-specific legal fields */}
            {pais === "España" && (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>{t.age}</label>
                  <div style={inputWrapperStyle}>
                    <input
                      type="number"
                      value={spainFields.edad}
                      onChange={(e) => setSpainFields(prev => ({ ...prev, edad: Number(e.target.value) || 0 }))}
                      style={{ ...inputStyle, cursor: "pointer" }}
                    />
                    <span style={inputAddonStyle}>{t.ageYears}</span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>{t.minimumExpenses}</label>
                  <div style={inputWrapperStyle}>
                    <input
                      type="number"
                      value={spainFields.gastosMinimosVitales}
                      onChange={(e) => setSpainFields(prev => ({ ...prev, gastosMinimosVitales: Number(e.target.value) || 0 }))}
                      style={{ ...inputStyle, cursor: "pointer" }}
                    />
                    <span style={inputAddonStyle}>{t.perMonth}</span>
                  </div>
                </div>
              </>
            )}

            {pais === "España" && (
              <>
                <InputField
                  label={t.euribor12m}
                  value={euribor12m}
                  onChange={(v) => setEuribor12m(Number(v) || 0)}
                  suffix="%"
                  step="0.01"
                />
                <InputField
                  label={t.spread}
                  value={diferencial}
                  onChange={(v) => setDiferencial(Number(v) || 0)}
                  suffix="%"
                  step="0.01"
                />
              </>
            )}
</div>
        </div>
      )}

      {mode === "lead" && (
        <div style={{
          padding: "12px 16px",
          background: leadError ? "rgba(239, 68, 68, 0.1)" : "rgba(34, 197, 94, 0.1)",
          border: `1px solid ${leadError ? "rgba(239, 68, 68, 0.3)" : "rgba(34, 197, 94, 0.3)"}`,
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {!leadError && leadId && (
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e" }} />
            )}
            <span style={{ color: leadError ? "#ef4444" : "#22c55e", fontWeight: "bold", fontSize: "12px" }}>
              {leadError ? "⚠️ " + leadError : leadId ? t.syncedRealtime : t.selectLeadAbove}
            </span>
          </div>
          {leadId && (
            <span style={{ color: "#64748b", fontSize: "11px" }}>
              ID: {leadId.slice(0, 8)}...
            </span>
          )}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "var(--botz-text)", display: "flex", alignItems: "center", gap: "10px", margin: 0 }}>
            <Landmark size={24} color="#22d3ee" />
            {t.bankingFeasibility}
          </h2>
          <p style={{ fontSize: "12px", color: "var(--botz-muted)", margin: "4px 0 0 0" }}>
            {mode === "lead" 
              ? t.leadModeAuto
              : `${t.manualSimulationFor} ${pais} (${paisConfig.moneda})`
            }
          </p>
        </div>
        <button style={exportButtonStyle} onClick={() => setExportOpen((v) => !v)}>
          <Printer size={14} /> {t.exportSheet}
        </button>
        {exportOpen && (
          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button style={secondaryButtonStyle} onClick={downloadCsv}>{t.downloadCsv}</button>
            <button style={secondaryButtonStyle} onClick={printFicha}>{t.savePdfPrint}</button>
            <button style={secondaryButtonStyle} onClick={() => setExportOpen(false)}>{t.close}</button>
          </div>
        )}
        {exportMsg && (
          <div style={{ marginTop: "8px", fontSize: "12px", color: "var(--botz-muted)" }}>{exportMsg}</div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
        <KpiCard 
          title={t.globalScore}
          value={`${score}/100`} 
          color={score >= 80 ? "#22c55e" : score >= 60 ? "#facc15" : score >= 40 ? "#f97316" : "#ef4444"} 
          icon={<TrendingUp size={18} />}
          subtext={
            score >= 80 ? t.excellent :
            score >= 60 ? t.eligible :
            score >= 40 ? t.regular :
            t.highRisk
          }
        />

        {/* ✅ Detalles de scoring por país */}
        {pais === "Colombia" && (
          <KpiCard 
            title={t.creditScoreKpi}
            value={`${colombiaFields.scoreCrediticioColombia || 0}/1000`}
            color={
              colombiaFields.scoreCrediticioColombia >= 800 ? "#22c55e" :
              colombiaFields.scoreCrediticioColombia >= 700 ? "#facc15" :
              colombiaFields.scoreCrediticioColombia >= 600 ? "#f97316" :
              "#ef4444"
            } 
            icon={<BrainCircuit size={18} />}
            subtext={
              colombiaFields.scoreCrediticioColombia >= 800 ? t.creditScoreExcellent :
              colombiaFields.scoreCrediticioColombia >= 700 ? t.creditScoreVeryGood :
              colombiaFields.scoreCrediticioColombia >= 600 ? t.creditScoreGood :
              t.creditScoreLow
            }
          />
        )}

        {pais === "España" && (
          <KpiCard 
            title={t.ageProfile}
            value={`${spainFields.edad || 0} ${t.ageYears}`}
            color={
              spainFields.edad >= 25 && spainFields.edad <= 45 ? "#22c55e" :
              spainFields.edad >= 20 && spainFields.edad <= 55 ? "#facc15" :
              spainFields.edad > 65 ? "#ef4444" :
              "#f97316"
            } 
            icon={<TrendingUp size={18} />}
            subtext={
              spainFields.edad >= 25 && spainFields.edad <= 45 ? t.ageOptimal :
              spainFields.edad >= 20 && spainFields.edad <= 55 ? t.ageAcceptable :
              spainFields.edad > 65 ? t.ageHighRisk :
              t.ageLimited
            }
          />
        )}

        {/* ✅ Alertas positivas - Cliente cumple requisitos */}
        {calc.aprobado && (
          <div style={{
            backgroundColor: "rgba(34, 197, 94, 0.1)",
            border: "1px solid rgba(34, 197, 94, 0.3)",
            borderRadius: "8px",
            padding: "12px",
            gridColumn: "span 3"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <CheckCircle size={16} color="#22c55e" />
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#22c55e" }}>{t.approvedTitle}</span>
            </div>
            
            {pais === "Colombia" && (
              <div style={{ fontSize: "11px", color: "#16a34a" }}>
                <div style={{ marginBottom: "4px" }}>💼 <strong>Recomendación principal:</strong></div>
                {colombiaFields.tipoVivienda === "VIS" ? (
                  <div>• Apto para programa VIS con mejores tasas y 10% entrada</div>
                ) : (
                  <div>• Considerar buscar vivienda VIS para acceder a beneficios</div>
                )}
                {colombiaFields.subsidio === "No" && colombiaFields.scoreCrediticioColombia > 700 && (
                  <div>• Con su score ({colombiaFields.scoreCrediticioColombia}), puede calificar para subsidio Mi Casa Ya</div>
                )}
                <div>• Cuota ideal: {formatearMoneda(calc.cuotaEstimada, paisConfig)} (DTI {calc.dti}%)</div>
                <div>• Capacidad máxima: {formatearMoneda(Math.round(hipotecaMaximaTeorica / (1 - paisConfig.entradaMinima)), paisConfig)}</div>
              </div>
            )}

            {pais === "España" && (
              <div style={{ fontSize: "11px", color: "#16a34a" }}>
                <div style={{ marginBottom: "4px" }}>🏠 <strong>Estrategia recomendada:</strong></div>
                <div>• Euríbor actual ({euribor12m.toFixed(2)}%) + diferencial recomendado (1.0-1.5%)</div>
                <div>• Plazo óptimo: {Math.min(30, 75 - spainFields.edad)} años por edad</div>
                <div>• Capacidad real después de IRPF: {formatearMoneda(Math.round((calc.ingresosMensuales * 0.7 * 0.35) - spainFields.gastosMinimosVitales), paisConfig)}</div>
              </div>
            )}
          </div>
        )}

        {/* ✅ Alertas de mejora - Casi aprueba */}
        {!calc.aprobado && score >= 40 && dti < 50 && (
          <div style={{
            backgroundColor: "rgba(250, 204, 21, 0.1)",
            border: "1px solid rgba(250, 204, 21, 0.3)",
            borderRadius: "8px",
            padding: "12px",
            gridColumn: "span 3"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <TrendingUp size={16} color="#facc15" />
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#facc15" }}>{t.closeToApprove}</span>
            </div>
            
            <div style={{ fontSize: "11px", color: "#ca8a04" }}>
              {pais === "Colombia" && colombiaFields.antiguedadLaboral < 6 && (
                <div>• Esperar {6 - colombiaFields.antiguedadLaboral} meses más de antigüedad laboral</div>
              )}
              {pais === "Colombia" && colombiaFields.scoreCrediticioColombia < 600 && (
                <div>• Mejorar score crediticio (+{600 - colombiaFields.scoreCrediticioColombia} puntos)</div>
              )}
              {dti > paisConfig.dtiMaximo && (
                <div>• Reducir deudas en {formatearMoneda(Math.round((dti - paisConfig.dtiMaximo) * calc.ingresosMensuales / 100), paisConfig)}</div>
              )}
              <div>{t.considerLowerTermOrMoreDown}</div>
            </div>
          </div>
        )}

        {/* ✅ Advertencias legales */}
        {((pais === "Colombia" && (
          colombiaFields.antiguedadLaboral < 6 || 
          colombiaFields.scoreCrediticioColombia < 600
        )) || (pais === "España" && (
          (spainFields.edad + (calc.plazo || manualInputs.plazo)) > 75
        ))) && (
          <div style={{
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "8px",
            padding: "12px",
            gridColumn: "span 3"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <AlertTriangle size={16} color="#ef4444" />
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#ef4444" }}>{t.legalRequirementsFailed}</span>
            </div>
            {pais === "Colombia" && colombiaFields.antiguedadLaboral < 6 && (
              <div style={{ fontSize: "11px", color: "#dc2626", marginBottom: "4px" }}>
                • Antigüedad laboral mínima: 6 meses (tienes: {colombiaFields.antiguedadLaboral} meses)
              </div>
            )}
            {pais === "Colombia" && colombiaFields.scoreCrediticioColombia < 600 && (
              <div style={{ fontSize: "11px", color: "#dc2626", marginBottom: "4px" }}>
                • Score crediticio mínimo: 600 puntos (tienes: {colombiaFields.scoreCrediticioColombia})
              </div>
            )}
            {pais === "España" && (spainFields.edad + (calc.plazo || manualInputs.plazo)) > 75 && (
              <div style={{ fontSize: "11px", color: "#dc2626", marginBottom: "4px" }}>
                • Edad + plazo no puede exceder 75 años ({spainFields.edad} + {(calc.plazo || manualInputs.plazo)} = {spainFields.edad + (calc.plazo || manualInputs.plazo)} años)
              </div>
            )}
          </div>
        )}
        <KpiCard 
          title={t.dtiRatio}
          value={`${dti}%`} 
          color={dti < paisConfig.dtiMaximo ? "#22c55e" : dti < 45 ? "#facc15" : "#ef4444"} 
          icon={<PieChart size={18} />}
          subtext={t.maxRecommended(paisConfig.dtiMaximo)}
        />
        <KpiCard 
          title={t.maxPurchaseCapacity}
          value={formatearMoneda(Math.round(hipotecaMaximaTeorica / (1 - paisConfig.entradaMinima)), paisConfig)} 
          color="#22d3ee" 
          icon={<Wallet size={18} />}
          subtext={t.basedOnIncome}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "20px" }}>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <Wallet size={16} color="#c084fc" /> {t.cashToCloseTitle}
            </div>
            <div style={{ padding: "16px" }}>
              <div style={rowStyle}>
                <span>{t.downPaymentLine(paisConfig.entradaMinima * 100)}</span>
                <span style={{ color: "var(--botz-text)" }}>{formatearMoneda(entradaRequerida, paisConfig)}</span>
              </div>
              <div style={rowStyle}>
                <span>{t.taxesAndFeesLine(paisConfig.impuestosGastos * 100)}</span>
                <span style={{ color: "var(--botz-text)" }}>{formatearMoneda(gastosImpuestos, paisConfig)}</span>
              </div>
              <div style={{ height: "1px", background: "var(--botz-border)", margin: "12px 0" }}></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: "bold" }}>
                <span style={{ color: "#c084fc" }}>{t.totalNeeded}</span>
                <span style={{ color: "var(--botz-text)" }}>{formatearMoneda(cashToClose, paisConfig)}</span>
              </div>
              
              {cashToClose > 50000 && (
                <div style={{ marginTop: "12px", background: "rgba(250, 204, 21, 0.1)", border: "1px solid rgba(250, 204, 21, 0.2)", borderRadius: "8px", padding: "10px", display: "flex", gap: "10px", alignItems: "start" }}>
                  <AlertTriangle size={16} color="#facc15" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <p style={{ margin: 0, fontSize: "11px", color: "#fef08a" }}>
                    <strong>Atención:</strong> Liquidez alta requerida.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <Building2 size={16} color="#60a5fa" /> {t.marketScenarios}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1px", background: "var(--botz-border)" }}>
              <ScenarioBox 
                label={`${t.fixed} (${tasaFijaEscenarios.toFixed(1)}%)`} 
                val={formatearMoneda(Math.round(cuotaFijaEscenarios), paisConfig)} 
              />
              <ScenarioBox 
                label={`${t.mixed} (${tasaMixtoEscenarios.toFixed(1)}%)`} 
                val={formatearMoneda(Math.round(cuotaMixtoEscenarios), paisConfig)} 
                highlight 
              />
              <ScenarioBox 
                label={pais === "España"
                  ? `${t.variable} (Euríbor+Dif ${tasaVariableEscenarios.toFixed(2)}%)`
                  : `${t.variable} (${tasaVariableEscenarios.toFixed(1)}%)`
                }
                val={formatearMoneda(Math.round(cuotaVariableEscenarios), paisConfig)} 
              />
</div>
          </div>

        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <Landmark size={16} color="#22d3ee" /> {t.bankRadar(pais)}
            </div>
            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
              {banks.sort((a, b) => b.prob - a.prob).map((bank, index) => (
                <div key={bank.name} style={{
                  border: bank.prob > 70 ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid var(--botz-border)",
                  borderRadius: "8px",
                  padding: "12px",
                  backgroundColor: bank.prob > 70 ? "rgba(34, 197, 94, 0.05)" : "transparent"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "6px" }}>
                    <span style={{ fontWeight: "bold", color: "var(--botz-text)" }}>
                      {index === 0 && "🏆"} {bank.name}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {bank.tasaReal && (
                        <span style={{ fontSize: "10px", color: "#22d3ee", backgroundColor: "rgba(34, 211, 238, 0.2)", padding: "2px 6px", borderRadius: "4px" }}>
                          {bank.tasaReal}% REAL
                        </span>
                      )}
                      {bank.rateAdjustment && bank.rateAdjustment !== 0 && (
                        <span style={{ fontSize: "10px", color: "#22c55e", backgroundColor: "rgba(34, 197, 94, 0.2)", padding: "2px 6px", borderRadius: "4px" }}>
                          {bank.rateAdjustment > 0 ? "+" : ""}{bank.rateAdjustment.toFixed(1)}%
                        </span>
                      )}
                       <span style={{ color: bank.prob > 60 ? "#22c55e" : bank.prob > 40 ? "#facc15" : "#ef4444", fontWeight: "bold" }}>
                        {bank.prob}% {t.viabilityLabel}
                       </span>
                      {loadingTasas && (
                        <span style={{ fontSize: "9px", color: "var(--botz-muted)", animation: "pulse 1s infinite" }}>
                          🔄
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.1)", borderRadius: "4px", overflow: "hidden", marginBottom: "6px" }}>
                    <div style={{ 
                      width: `${bank.prob}%`, height: "100%", 
                      background: bank.prob > 60 ? bank.color : "#475569",
                      transition: "width 0.5s ease" 
                    }}></div>
                  </div>
                  <div style={{ fontSize: "10px", color: "#94a3b8", marginBottom: "4px" }}>{bank.note}</div>
                  {bank.recommendation && (
                    <div style={{ 
                      fontSize: "10px", 
                      color: "#22d3ee", 
                      backgroundColor: "rgba(34, 211, 238, 0.1)", 
                      padding: "4px 8px", 
                      borderRadius: "4px",
                      border: "1px solid rgba(34, 211, 238, 0.2)"
                    }}>
                      💡 {bank.recommendation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={coachPanelStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", color: "#c084fc", fontWeight: "bold", fontSize: "13px" }}>
              <BrainCircuit size={16} /> {t.coachTips}
            </div>
            <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "12px", color: "#e2e8f0", lineHeight: "1.6" }}>
              {ingresos === 0 ? (
                <>
                  <li style={{ marginBottom: "6px" }}>📊 Ingresa datos del cliente para análisis completo</li>
                  <li>⚡ El sistema calculará DTI, Score legal y viabilidad bancaria</li>
                </>
              ) : !calc.aprobado ? (
                <>
                  {pais === "Colombia" && (
                    <>
                      <li style={{ marginBottom: "6px" }}>🇨🇴 <strong>Requisitos Colombia no cumplidos:</strong></li>
                      {colombiaFields.antiguedadLaboral < 6 && <li style={{ marginLeft: "20px", color: "#facc15" }}>⏰ Esperar {6 - colombiaFields.antiguedadLaboral} meses más de antigüedad</li>}
                      {colombiaFields.scoreCrediticioColombia < 600 && <li style={{ marginLeft: "20px", color: "#facc15" }}>📈 Mejorar score a +600 (actual: {colombiaFields.scoreCrediticioColombia})</li>}
                      <li style={{ marginBottom: "6px", color: "#22d3ee" }}>📋 <strong>Próximos pasos:</strong></li>
                      <li style={{ marginLeft: "20px" }}>• Solicitar Datacrédito para identificar problemas</li>
                      <li style={{ marginLeft: "20px" }}>• Consolidar deudas para mejorar DTI</li>
                    </>
                  )}
                  {pais === "España" && (
                    <>
                      <li style={{ marginBottom: "6px" }}>🇪🇸 <strong>Requisitos España no cumplidos:</strong></li>
                      {(spainFields.edad + (calc.plazo || manualInputs.plazo)) > 75 && <li style={{ marginLeft: "20px", color: "#facc15" }}>📅 Reducir plazo a {75 - spainFields.edad} años máximo</li>}
                      <li style={{ marginBottom: "6px", color: "#22d3ee" }}>📋 <strong>Próximos pasos:</strong></li>
                      <li style={{ marginLeft: "20px" }}>• Revisar CIRBE para deudas ocultas</li>
                      <li style={{ marginLeft: "20px" }}>• Considerar avalista o segundo titular</li>
                    </>
                  )}
                </>
              ) : (
                <>
                  <li style={{ marginBottom: "6px" }}>🎉 <strong>¡CLIENTE APROBADO!</strong> Sigue estos pasos:</li>
                  <li style={{ marginLeft: "20px", color: "#22c55e" }}>1️⃣ Contactar banco #{banks[0].name} (viabilidad {banks[0].prob}%)</li>
                  <li style={{ marginLeft: "20px", color: "#22c55e" }}>2️⃣ Preparar documentos: {pais === "Colombia" ? "certificación laboral, extractos 6 meses, declaración de renta" : "vida laboral, IRPF, extractos 3 meses"}</li>
                  <li style={{ marginLeft: "20px", color: "#22c55e" }}>3️⃣ Solicitar pre-aprobación online (response: 24-48h)</li>
                  
                  {pais === "Colombia" && colombiaFields.tipoVivienda === "VIS" && (
                    <li style={{ marginBottom: "6px", color: "#fbbf24" }}>💰 <strong>Bono VIS:</strong> Aplica a subsidios hasta 25 SMMLV</li>
                  )}
                  {pais === "Colombia" && colombiaFields.subsidio === "No" && colombiaFields.scoreCrediticioColombia > 700 && (
                    <li style={{ marginBottom: "6px", color: "#fbbf24" }}>🏆 <strong>Oportunidad:</strong> Califica para Mi Casa Ya con tu score</li>
                  )}
                  {pais === "España" && (
                    <li style={{ marginBottom: "6px", color: "#fbbf24" }}>📊 <strong>Negociación:</strong> Con tu DTI {dti}%, puedes pedir -0.25% en diferencial</li>
                  )}
                  
                  <li style={{ marginBottom: "6px", color: "#22d3ee" }}>🎯 <strong>Strategy:</strong></li>
                  <li style={{ marginLeft: "20px" }}>• Comparar oferta con 2-3 bancos más</li>
                  <li style={{ marginLeft: "20px" }}>• Pedir bonificación por domiciliación de nómina</li>
                  <li style={{ marginLeft: "20px" }}>• Ofrecer seguros vinculados (descuento adicional)</li>
                </>
              )}
            </ul>
          </div>

          {/* ✅ Formulario de Contacto para Lead Scoring */}
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <TrendingUp size={16} color="#10b981" /> {t.saveEval}
            </div>
            <div style={{ padding: "16px" }}>
              <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "16px" }}>
                {t.saveEvalDesc}
              </p>
              
              {!showContactForm ? (
                <button 
                  onClick={() => setShowContactForm(true)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: "linear-gradient(135deg, #10b981, #059669)",
                    border: "none",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "14px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px"
                  }}
                >
                  <BrainCircuit size={16} />
                  {t.getPersonalScore}
                </button>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: "4px" }}>
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      value={contactData.nombre}
                      onChange={(e) => setContactData(prev => ({ ...prev, nombre: e.target.value }))}
                      placeholder="Tu nombre completo"
                      style={{
                        width: "100%",
                        padding: "10px",
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "6px",
                        color: "#fff",
                        fontSize: "13px"
                      }}
                    />
                  </div>
                  
                  <div>
                    <label style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: "4px" }}>
                      Email *
                    </label>
                    <input
                      type="email"
                      value={contactData.email}
                      onChange={(e) => setContactData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="tu@email.com"
                      style={{
                        width: "100%",
                        padding: "10px",
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "6px",
                        color: "#fff",
                        fontSize: "13px"
                      }}
                    />
                  </div>
                  
                  <div>
                    <label style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: "4px" }}>
                      Teléfono (Opcional)
                    </label>
                    <input
                      type="tel"
                      value={contactData.telefono}
                      onChange={(e) => setContactData(prev => ({ ...prev, telefono: e.target.value }))}
                      placeholder="+34 600 000 000"
                      style={{
                        width: "100%",
                        padding: "10px",
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "6px",
                        color: "#fff",
                        fontSize: "13px"
                      }}
                    />
                  </div>

                  {leadScoreResult && (
                    <div style={{
                      background: leadScoreResult.error 
                        ? "rgba(239, 68, 68, 0.1)" 
                        : "rgba(16, 185, 129, 0.1)",
                      border: leadScoreResult.error 
                        ? "1px solid rgba(239, 68, 68, 0.2)" 
                        : "1px solid rgba(16, 185, 129, 0.2)",
                      borderRadius: "12px",
                      padding: "16px",
                      animation: "slideIn 0.3s ease-out"
                    }}>
                      {!leadScoreResult.error ? (
                        <>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                            <div style={{ 
                              width: "24px", 
                              height: "24px", 
                              borderRadius: "50%", 
                              background: "linear-gradient(135deg, #10b981, #059669)",
                              display: "flex", 
                              alignItems: "center", 
                              justifyContent: "center",
                              fontSize: "14px"
                            }}>
                              ✓
                            </div>
                            <div>
                              <div style={{ fontSize: "14px", color: "#10b981", fontWeight: "bold" }}>
                                ¡Evaluación Guardada!
                              </div>
                              <div style={{ fontSize: "11px", color: "#64748b" }}>
                                {leadScoreResult.fallback_mode ? 'Guardado local (modo offline)' : 'Guardado en CRM Botz.fyi'}
                              </div>
                            </div>
                          </div>
                          
                          <div style={{ 
                            display: "grid", 
                            gridTemplateColumns: "1fr 1fr", 
                            gap: "12px",
                            marginBottom: "12px"
                          }}>
                            <div style={{ 
                              background: "rgba(255,255,255,0.05)", 
                              padding: "8px", 
                              borderRadius: "6px",
                              textAlign: "center"
                            }}>
                              <div style={{ fontSize: "10px", color: "#94a3b8", marginBottom: "2px" }}>TU SCORE</div>
                              <div style={{ fontSize: "18px", fontWeight: "bold", color: "#22d3ee" }}>
                                {leadScoreResult.lead_score}/100
                              </div>
                            </div>
                            <div style={{ 
                              background: "rgba(255,255,255,0.05)", 
                              padding: "8px", 
                              borderRadius: "6px",
                              textAlign: "center"
                            }}>
                              <div style={{ fontSize: "10px", color: "#94a3b8", marginBottom: "2px" }}>CATEGORÍA</div>
                              <div style={{ 
                                fontSize: "12px", 
                                fontWeight: "bold",
                                color: leadScoreResult.categoria === 'caliente' ? '#ef4444' :
                                       leadScoreResult.categoria === 'templado' ? '#f59e0b' : '#3b82f6'
                              }}>
                                {leadScoreResult.categoria === 'caliente' ? '🔥 Caliente' :
                                 leadScoreResult.categoria === 'templado' ? '⚡ Templado' : '❄️ Frío'}
                              </div>
                            </div>
                          </div>

                          <div style={{
                            background: "rgba(34, 211, 238, 0.1)",
                            border: "1px solid rgba(34, 211, 238, 0.2)",
                            borderRadius: "8px",
                            padding: "12px"
                          }}>
                            <div style={{ fontSize: "11px", color: "#22d3ee", fontWeight: "bold", marginBottom: "4px" }}>
                              📈 PRÓXIMOS PASOS RECOMENDADOS:
                            </div>
                            <div style={{ fontSize: "11px", color: "#e2e8f0", lineHeight: "1.4" }}>
                              {leadScoreResult.accion_recomendada}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ 
                            width: "24px", 
                            height: "24px", 
                            borderRadius: "50%", 
                            background: "linear-gradient(135deg, #ef4444, #dc2626)",
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "center",
                            fontSize: "14px",
                            color: "#fff"
                          }}>
                            ✕
                          </div>
                          <div>
                            <div style={{ fontSize: "14px", color: "#ef4444", fontWeight: "bold" }}>
                              Error al guardar
                            </div>
                            <div style={{ fontSize: "11px", color: "#64748b" }}>
                              {leadScoreResult.message}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={saveLeadScoreToCRM}
                      disabled={isSavingLead}
                      style={{
                        flex: 1,
                        padding: "10px",
                        background: isSavingLead ? "#64748b" : "linear-gradient(135deg, #10b981, #059669)",
                        border: "none",
                        borderRadius: "6px",
                        color: "#fff",
                        fontSize: "13px",
                        fontWeight: "bold",
                        cursor: isSavingLead ? "not-allowed" : "pointer"
                      }}
                    >
                      {isSavingLead ? "Guardando..." : "Guardar mi Evaluación"}
                    </button>
                    <button
                      onClick={() => {
                        setShowContactForm(false);
                        setContactData({ nombre: '', email: '', telefono: '' });
                        setLeadScoreResult(null);
                      }}
                      style={{
                        padding: "10px 16px",
                        background: "rgba(255,255,255,0.1)",
                        border: "1px solid rgba(255,255,255,0.2)",
                        borderRadius: "6px",
                        color: "#fff",
                        fontSize: "12px",
                        cursor: "pointer"
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
      
      <style jsx global>{`
        select option {
          background: #1e293b !important;
          color: #fff !important;
          padding: 8px !important;
        }
        
        select option:hover,
        select option:focus,
        select option:checked {
          background: #334155 !important;
          color: #fff !important;
        }
      `}</style>
    </div>
  );
}

const InputField = ({ label, value, onChange, prefix, suffix, step = "1" }: {
  label: string; value: number; onChange: (v: string) => void; 
  prefix?: string; suffix?: string; step?: string;
}) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
    <label style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>{label}</label>
    <div style={inputWrapperStyle}>
      {prefix && <span style={inputAddonStyle}>{prefix}</span>}
      <input
        type="number"
        step={step}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
      {suffix && <span style={inputAddonStyle}>{suffix}</span>}
    </div>
  </div>
);

const KpiCard = ({ title, value, color, icon, subtext }: any) => (
  <div style={kpiCardStyle}>
    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--botz-muted)", textTransform: "uppercase" }}>
      {icon} {title}
    </div>
    <div style={{ fontSize: "20px", fontWeight: "bold", color }}>{value}</div>
    <div style={{ fontSize: "10px", color: "var(--botz-muted-2)" }}>{subtext}</div>
  </div>
);

const ScenarioBox = ({ label, val, highlight }: any) => (
  <div style={{ 
    background: highlight ? "rgba(34, 211, 238, 0.1)" : "transparent", 
    padding: "12px", textAlign: "center", display: "flex", flexDirection: "column"
  }}>
    <span style={{ fontSize: "11px", color: "var(--botz-muted)", marginBottom: "4px" }}>{label}</span>
    <span style={{ fontSize: "14px", fontWeight: "bold", color: highlight ? "#22d3ee" : "var(--botz-text)" }}>{val}</span>
  </div>
);

const inputPanelStyle: React.CSSProperties = {
  background: "var(--botz-panel)",
  border: "1px solid var(--botz-border-soft)",
  borderRadius: "12px",
  padding: "16px",
};

const selectStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: "8px",
  border: "1px solid var(--botz-border-strong)",
  background: "var(--botz-surface)",
  color: "var(--botz-text)",
  fontSize: "12px",
  cursor: "pointer",
  outline: "none",
};

const resetButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "4px",
  padding: "6px 12px",
  borderRadius: "6px",
  border: "1px solid rgba(239, 68, 68, 0.3)",
  background: "rgba(239, 68, 68, 0.1)",
  color: "#ef4444",
  fontSize: "11px",
  cursor: "pointer",
};


const saveButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  padding: "6px 12px",
  borderRadius: "6px",
  border: "1px solid rgba(16, 185, 129, 0.35)",
  background: "rgba(16, 185, 129, 0.12)",
  color: "#10b981",
  fontSize: "11px",
  cursor: "pointer",
};

const exportButtonStyle: React.CSSProperties = {
  background: "var(--botz-surface-3)", 
  border: "1px solid var(--botz-border)", 
  color: "var(--botz-text)", 
  padding: "8px 12px", 
  borderRadius: "8px", 
  cursor: "pointer",
  display: "flex", 
  alignItems: "center", 
  gap: "8px", 
  fontSize: "12px"
};


const secondaryButtonStyle: React.CSSProperties = {
  background: "var(--botz-surface-3)",
  border: "1px solid var(--botz-border)",
  color: "var(--botz-text)",
  padding: "8px 10px",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "12px",
};

const inputWrapperStyle: React.CSSProperties = {
  display: "flex", 
  alignItems: "center", 
  background: "var(--botz-surface-3)", 
  border: "1px solid var(--botz-border)",
  borderRadius: "8px",
  overflow: "hidden"
};

const inputAddonStyle: React.CSSProperties = {
  padding: "8px 10px",
  background: "var(--botz-surface-3)",
  color: "var(--botz-muted-2)",
  fontSize: "13px"
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: "8px 10px",
  background: "transparent",
  border: "none",
  color: "var(--botz-text)",
  fontSize: "13px",
  outline: "none",
  minWidth: 0,
};

const kpiCardStyle: React.CSSProperties = {
  background: "var(--botz-surface)", 
  border: "1px solid var(--botz-border-soft)", 
  borderRadius: "12px", 
  padding: "12px", 
  display: "flex", 
  flexDirection: "column", 
  gap: "4px"
};

const panelStyle: React.CSSProperties = {
  background: "var(--botz-panel)", 
  border: "1px solid var(--botz-border-soft)",
  borderRadius: "12px", 
  overflow: "hidden"
};

const panelHeaderStyle: React.CSSProperties = {
  background: "var(--botz-surface-3)", 
  padding: "10px 16px",
  borderBottom: "1px solid var(--botz-border-soft)",
  fontSize: "13px", 
  fontWeight: "bold", 
  color: "var(--botz-text)",
  display: "flex", 
  alignItems: "center", 
  gap: "8px"
};

const rowStyle: React.CSSProperties = {
  display: "flex", 
  justifyContent: "space-between", 
  fontSize: "13px", 
  color: "var(--botz-muted)", 
  marginBottom: "8px"
};

const coachPanelStyle: React.CSSProperties = {
  background: "linear-gradient(145deg, rgba(139, 92, 246, 0.1) 0%, rgba(15, 23, 42, 0.4) 100%)",
  border: "1px solid rgba(139, 92, 246, 0.3)", 
  borderRadius: "12px", 
  padding: "16px",
  boxShadow: "0 0 20px rgba(139, 92, 246, 0.05)"
};
