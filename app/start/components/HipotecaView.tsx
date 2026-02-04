"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "./supabaseClient";
import { 
  Building2, Wallet, TrendingUp, AlertTriangle, 
  PieChart, Landmark, BrainCircuit, Printer,
  Globe, RefreshCw
} from "lucide-react";

type HipotecaCalculo = {
  valorVivienda: number;
  ingresosMensuales: number;
  cuotaEstimada: number;
  dti: number;
  score: number;
  aprobado: boolean;
  cuotaCofidis?: number;
  deudasExistentes?: number;
  plazo?: number;
  tasa?: number;
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

function calcularScore(dti: number, ingresos: number, deudas: number): number {
  let score = 50;
  if (dti <= 20) score += 40;
  else if (dti <= 30) score += 35;
  else if (dti <= 35) score += 25;
  else if (dti <= 40) score += 15;
  else if (dti <= 50) score += 5;
  else score -= 10;

  if (ingresos > 5000) score += 20;
  else if (ingresos > 3000) score += 15;
  else if (ingresos > 2000) score += 10;
  else if (ingresos > 1000) score += 5;

  if (deudas === 0) score += 15;
  else if (deudas < ingresos * 0.2) score += 10;
  else if (deudas < ingresos * 0.3) score += 5;
  else score -= 5;

  return Math.min(100, Math.max(0, Math.round(score)));
}

function isValidUUID(str: string): boolean {
  if (!str || str.trim() === "") return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str.trim());
}

export default function HipotecaView({ calculo, leadId, mode = "manual" }: HipotecaViewProps) {
  const isLeadMode = mode === "lead" && leadId && leadId.trim() !== "";
  
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
  const [leadIncomplete, setLeadIncomplete] = useState<boolean>(false);
  const [manualDirty, setManualDirty] = useState<boolean>(false);
  // ✅ Modo efectivo: permite completar manualmente un lead incompleto sin romper Lead(Auto)
  const effectiveManual = mode === "manual" || (isLeadMode && leadIncomplete);



// ✅ Auto-ajuste: si cambia el valor de vivienda en modo manual,
// recalcula la hipoteca solicitada manteniendo los ahorros (aportación)
useEffect(() => {
  if (!effectiveManual) return;

  const v = Number(manualInputs.valorVivienda) || 0;
  const a = Number(aportacionReal) || 0;

  setCantidadAFinanciar(Math.max(0, v - a));
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
      score: Number(lead?.score) || 0,
      aprobado: Boolean(lead?.aprobado),
      cuotaCofidis: Number(lead?.cuota_cofidis) || undefined,
      deudasExistentes: Number(lead?.deudas_existentes) || 0,
      plazo: Number(lead?.plazo) || 25,
      tasa: Number(lead?.tasa) || 3.5,
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
    
    const porcentajeFinanciacion = 1 - paisConfig.entradaMinima;
    const montoPrestamo = effectiveManual ? cantidadAFinanciar : valorVivienda * porcentajeFinanciacion;
    const tasaParaAnalisis = (effectiveManual && pais === "España" && tasaAnalisisMode === "euribor")
      ? (euribor12m + diferencial)
      : tasa;
    const cuotaEstimada = pmt(montoPrestamo, tasaParaAnalisis / 100, plazo);
    
    const gastosMensuales = cuotaEstimada + (deudasExistentes || 0);
    const dti = ingresosMensuales > 0 ? (gastosMensuales / ingresosMensuales) * 100 : 0;
    
    const score = calcularScore(dti, ingresosMensuales, deudasExistentes);
    const aprobado = dti > 0 && dti < paisConfig.dtiMaximo && score >= 50;

    return {
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
  }, [isLeadMode, liveCalculo, manualInputs, paisConfig, cantidadAFinanciar, mode, effectiveManual, pais, tasaAnalisisMode, euribor12m, diferencial]);

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

  const banks = paisConfig.bancos.map((bank, i) => ({
    ...bank,
    prob: getBankProb(85 + i * 3),
  }));

  const handleInputChange = useCallback((field: keyof typeof manualInputs, value: string) => {
    const numValue = parseFloat(value.replace(/[^0-9.]/g, "")) || 0;
    setManualDirty(true);
    setManualInputs(prev => ({ ...prev, [field]: numValue }));
  }, []);

  const resetManual = useCallback(() => {
    setManualDirty(false);
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
      put(["plazo", "plazo_anios", "plazo_years", "term_years"], num(manualInputs.plazo, 25));
      // ✅ Usa la tasa efectiva del análisis (ya incluye Euríbor+Dif si el broker lo seleccionó)
      put(["tasa_anual", "tasa", "interest_rate", "annual_rate"], num((calc.tasa ?? manualInputs.tasa), 0));

      // ✅ Resultados que guardas para CRM (si existen las columnas)
      put(["cuota_estimada", "cuota_mensual", "monthly_payment"], num(calc.cuotaEstimada, 0));
      put(["dti"], num(calc.dti, 0));
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
                DTI máx: {paisConfig.dtiMaximo}% | Entrada: {paisConfig.entradaMinima * 100}%
              </span>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              {leadId && (
                <button onClick={saveManualToLead} style={saveButtonStyle}>
                  Guardar en CRM
                </button>
              )}
              <button onClick={resetManual} style={resetButtonStyle}>
                <RefreshCw size={12} /> Reset
              </button>
            </div>
          </div>

          {saveMsg && (
            <div style={{ marginTop: "-6px", marginBottom: "10px", fontSize: "12px", color: "#94a3b8" }}>{saveMsg}</div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px" }}>
            <InputField
              label="Valor Vivienda"
              value={manualInputs.valorVivienda}
              onChange={(v) => handleInputChange("valorVivienda", v)}
              prefix={paisConfig.simbolo}
            />
            <InputField
              label="Ahorros que aporta"
              value={aportacionReal}
              onChange={(v) => {
                const val = Number(v) || 0;
                setManualDirty(true);
                setAportacionReal(val);
                // Si pone más ahorros, pedimos menos hipoteca automáticamente
                setCantidadAFinanciar(Math.max(0, (manualInputs.valorVivienda || 0) - val));
              }}
              prefix={paisConfig.simbolo}
            />
            <InputField
              label="Importe Hipoteca Solicitada"
              value={cantidadAFinanciar}
              onChange={(v) => { setManualDirty(true); setCantidadAFinanciar(Number(v) || 0); }}
              prefix={paisConfig.simbolo}
            />
            <InputField
              label="Ingresos Mensuales"
              value={manualInputs.ingresosMensuales}
              onChange={(v) => handleInputChange("ingresosMensuales", v)}
              prefix={paisConfig.simbolo}
            />
            <InputField
              label="Deudas Mensuales"
              value={manualInputs.deudasExistentes}
              onChange={(v) => handleInputChange("deudasExistentes", v)}
              prefix={paisConfig.simbolo}
            />
            <InputField
              label="Plazo"
              value={manualInputs.plazo}
              onChange={(v) => handleInputChange("plazo", v)}
              suffix="años"
            />
            <InputField
              label="Tasa Anual"
              value={manualInputs.tasa}
              onChange={(v) => handleInputChange("tasa", v)}
              suffix="%"
              step="0.1"
            />

            {pais === "España" && (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "-6px", marginBottom: "6px" }}>
                <span style={{ fontSize: "11px", color: "#64748b" }}>Tasa para análisis:</span>
                <select
                  value={tasaAnalisisMode}
                  onChange={(e) => setTasaAnalisisMode(e.target.value as any)}
                  style={{ ...selectStyle, padding: "6px 10px", fontSize: "12px" }}
                >
                  <option value="anual">Usar Tasa Anual</option>
                  <option value="euribor">Usar Euríbor + Dif</option>
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
                <span style={{ fontSize: "11px", color: "#64748b" }}>Tasa para análisis:</span>
                <select
                  value={tasaAnalisisMode}
                  onChange={(e) => setTasaAnalisisMode(e.target.value as any)}
                  style={{ ...selectStyle, padding: "6px 10px", fontSize: "12px" }}
                >
                  <option value="anual">Usar Tasa Anual</option>
                  <option value="euribor">Usar Euríbor + Dif</option>
                </select>
                {tasaAnalisisMode === "euribor" && (
                  <span style={{ fontSize: "11px", color: "#64748b" }}>
                    {(euribor12m + diferencial).toFixed(2)}%
                  </span>
                )}
              </div>
            )}
          
            {pais === "España" && (
              <>
                <InputField
                  label="Euríbor 12M"
                  value={euribor12m}
                  onChange={(v) => setEuribor12m(Number(v) || 0)}
                  suffix="%"
                  step="0.01"
                />
                <InputField
                  label="Diferencial"
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
              {leadError ? "⚠️ " + leadError : leadId ? "● Datos sincronizados en tiempo real" : "Selecciona un lead arriba"}
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
          <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#fff", display: "flex", alignItems: "center", gap: "10px", margin: 0 }}>
            <Landmark size={24} color="#22d3ee" />
            Análisis de Viabilidad Bancaria
          </h2>
          <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0 0" }}>
            {mode === "lead" 
              ? `Modo Lead (Auto) - Sincronizado con tabla leads` 
              : `Simulación manual para ${pais} (${paisConfig.moneda})`
            }
          </p>
        </div>
        <button style={exportButtonStyle} onClick={() => setExportOpen((v) => !v)}>
          <Printer size={14} /> Exportar Ficha
        </button>
        {exportOpen && (
          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button style={secondaryButtonStyle} onClick={downloadCsv}>Descargar Excel (CSV)</button>
            <button style={secondaryButtonStyle} onClick={printFicha}>Guardar PDF / Imprimir</button>
            <button style={secondaryButtonStyle} onClick={() => setExportOpen(false)}>Cerrar</button>
          </div>
        )}
        {exportMsg && (
          <div style={{ marginTop: "8px", fontSize: "12px", color: "#94a3b8" }}>{exportMsg}</div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
        <KpiCard 
          title="Scoring Global" 
          value={`${score}/100`} 
          color={score > 60 ? "#22c55e" : "#ef4444"} 
          icon={<TrendingUp size={18} />}
          subtext={score > 60 ? "Cliente Apto" : "Riesgo Alto"}
        />
        <KpiCard 
          title="Ratio Endeudamiento (DTI)" 
          value={`${dti}%`} 
          color={dti < paisConfig.dtiMaximo ? "#22c55e" : dti < 45 ? "#facc15" : "#ef4444"} 
          icon={<PieChart size={18} />}
          subtext={`Máximo rec. ${paisConfig.dtiMaximo}%`}
        />
        <KpiCard 
          title="Capacidad Compra Máx" 
          value={formatearMoneda(Math.round(hipotecaMaximaTeorica / (1 - paisConfig.entradaMinima)), paisConfig)} 
          color="#22d3ee" 
          icon={<Wallet size={18} />}
          subtext="Basado en ingresos"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "20px" }}>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <Wallet size={16} color="#c084fc" /> Fondos Reales Necesarios (Cash to Close)
            </div>
            <div style={{ padding: "16px" }}>
              <div style={rowStyle}>
                <span>Entrada ({paisConfig.entradaMinima * 100}%)</span>
                <span style={{ color: "#fff" }}>{formatearMoneda(entradaRequerida, paisConfig)}</span>
              </div>
              <div style={rowStyle}>
                <span>Impuestos y Gastos (~{paisConfig.impuestosGastos * 100}%)</span>
                <span style={{ color: "#fff" }}>{formatearMoneda(gastosImpuestos, paisConfig)}</span>
              </div>
              <div style={{ height: "1px", background: "rgba(255,255,255,0.1)", margin: "12px 0" }}></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: "bold" }}>
                <span style={{ color: "#c084fc" }}>TOTAL NECESARIO</span>
                <span style={{ color: "#fff" }}>{formatearMoneda(cashToClose, paisConfig)}</span>
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
              <Building2 size={16} color="#60a5fa" /> Escenarios de Mercado
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1px", background: "rgba(255,255,255,0.1)" }}>
              <ScenarioBox 
                label={`Fijo (${tasaFijaEscenarios.toFixed(1)}%)`} 
                val={formatearMoneda(Math.round(cuotaFijaEscenarios), paisConfig)} 
              />
              <ScenarioBox 
                label={`Mixto (${tasaMixtoEscenarios.toFixed(1)}%)`} 
                val={formatearMoneda(Math.round(cuotaMixtoEscenarios), paisConfig)} 
                highlight 
              />
              <ScenarioBox 
                label={pais === "España"
                  ? `Variable (Euríbor+Dif ${tasaVariableEscenarios.toFixed(2)}%)`
                  : `Variable (${tasaVariableEscenarios.toFixed(1)}%)`
                } 
                val={formatearMoneda(Math.round(cuotaVariableEscenarios), paisConfig)} 
              />
</div>
          </div>

        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <Landmark size={16} color="#22d3ee" /> Radar Bancario - {pais}
            </div>
            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
              {banks.map((bank) => (
                <div key={bank.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                    <span style={{ fontWeight: "bold", color: "#fff" }}>{bank.name}</span>
                    <span style={{ color: bank.prob > 60 ? "#22c55e" : "#ef4444" }}>{bank.prob}% Viabilidad</span>
                  </div>
                  <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ 
                      width: `${bank.prob}%`, height: "100%", 
                      background: bank.prob > 60 ? bank.color : "#475569",
                      transition: "width 0.5s ease" 
                    }}></div>
                  </div>
                  <div style={{ fontSize: "9px", color: "#64748b", marginTop: "2px" }}>{bank.note}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={coachPanelStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", color: "#c084fc", fontWeight: "bold", fontSize: "13px" }}>
              <BrainCircuit size={16} /> BOTZ COACH TIPS
            </div>
            <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "12px", color: "#e2e8f0", lineHeight: "1.6" }}>
              {ingresos === 0 ? (
                <>
                  <li style={{ marginBottom: "6px" }}>Ingresa los datos del cliente para ver recomendaciones.</li>
                  <li>El simulador calculará DTI, Score y viabilidad automáticamente.</li>
                </>
              ) : dti > 40 ? (
                <>
                  <li style={{ marginBottom: "6px" }}>DTI crítico ({dti}%). Sugiere <strong>cancelar préstamos</strong> pequeños.</li>
                  <li>Añadir <strong>segundo titular</strong> reduciría el riesgo ~35%.</li>
                </>
              ) : score < 60 ? (
                <>
                  <li style={{ marginBottom: "6px" }}>Score bajo. Aportar <strong>recibos de alquiler</strong> ayudaría.</li>
                  <li>Busca bancos con scoring manual como <strong>UCI</strong>.</li>
                </>
              ) : (
                <>
                  <li style={{ marginBottom: "6px" }}>Perfil excelente. Negocia bonificación de tipo (-0.2%).</li>
                  <li>Ofrece seguro de vida vinculado para bajar cuota.</li>
                </>
              )}
            </ul>
          </div>

        </div>
      </div>
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
    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#94a3b8", textTransform: "uppercase" }}>
      {icon} {title}
    </div>
    <div style={{ fontSize: "20px", fontWeight: "bold", color }}>{value}</div>
    <div style={{ fontSize: "10px", color: "#64748b" }}>{subtext}</div>
  </div>
);

const ScenarioBox = ({ label, val, highlight }: any) => (
  <div style={{ 
    background: highlight ? "rgba(34, 211, 238, 0.1)" : "transparent", 
    padding: "12px", textAlign: "center", display: "flex", flexDirection: "column"
  }}>
    <span style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "4px" }}>{label}</span>
    <span style={{ fontSize: "14px", fontWeight: "bold", color: highlight ? "#22d3ee" : "#fff" }}>{val}</span>
  </div>
);

const inputPanelStyle: React.CSSProperties = {
  background: "rgba(15, 23, 42, 0.6)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "12px",
  padding: "16px",
};

const selectStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: "8px",
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(0,0,0,0.3)",
  color: "#fff",
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
  background: "rgba(255,255,255,0.05)", 
  border: "1px solid rgba(255,255,255,0.1)", 
  color: "#fff", 
  padding: "8px 12px", 
  borderRadius: "8px", 
  cursor: "pointer",
  display: "flex", 
  alignItems: "center", 
  gap: "8px", 
  fontSize: "12px"
};


const secondaryButtonStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#e2e8f0",
  padding: "8px 10px",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "12px",
};

const inputWrapperStyle: React.CSSProperties = {
  display: "flex", 
  alignItems: "center", 
  background: "rgba(0,0,0,0.3)", 
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "8px",
  overflow: "hidden"
};

const inputAddonStyle: React.CSSProperties = {
  padding: "8px 10px",
  background: "rgba(255,255,255,0.05)",
  color: "#64748b",
  fontSize: "13px"
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: "8px 10px",
  background: "transparent",
  border: "none",
  color: "#fff",
  fontSize: "13px",
  outline: "none",
  minWidth: 0,
};

const kpiCardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)", 
  border: "1px solid rgba(255,255,255,0.05)", 
  borderRadius: "12px", 
  padding: "12px", 
  display: "flex", 
  flexDirection: "column", 
  gap: "4px"
};

const panelStyle: React.CSSProperties = {
  background: "rgba(15, 23, 42, 0.6)", 
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "12px", 
  overflow: "hidden"
};

const panelHeaderStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)", 
  padding: "10px 16px",
  borderBottom: "1px solid rgba(255,255,255,0.05)",
  fontSize: "13px", 
  fontWeight: "bold", 
  color: "#fff",
  display: "flex", 
  alignItems: "center", 
  gap: "8px"
};

const rowStyle: React.CSSProperties = {
  display: "flex", 
  justifyContent: "space-between", 
  fontSize: "13px", 
  color: "#94a3b8", 
  marginBottom: "8px"
};

const coachPanelStyle: React.CSSProperties = {
  background: "linear-gradient(145deg, rgba(139, 92, 246, 0.1) 0%, rgba(15, 23, 42, 0.4) 100%)",
  border: "1px solid rgba(139, 92, 246, 0.3)", 
  borderRadius: "12px", 
  padding: "16px",
  boxShadow: "0 0 20px rgba(139, 92, 246, 0.05)"
};