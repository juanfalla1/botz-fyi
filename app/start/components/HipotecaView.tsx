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
}> = {
  "España": {
    moneda: "EUR", simbolo: "€", formato: "es-ES",
    impuestosGastos: 0.10, entradaMinima: 0.20, dtiMaximo: 35,
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
    }
  }, [calculo, mode]);

  useEffect(() => {
    if (mode !== "lead" || !leadId || leadId.trim() === "") {
      setLiveCalculo(null);
      setLeadError(null);
      return;
    }

    if (!isValidUUID(leadId)) {
      setLeadError("ID de lead inválido");
      setLiveCalculo(null);
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
          return;
        }
        
        if (!data) {
          setLeadError("Lead no encontrado");
          setLiveCalculo(null);
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
          setLeadError(
            "Este lead existe, pero todavía no tiene datos hipotecarios (precio_real, ingresos_netos, etc.). " +
              "Este lead aún no tiene datos suficientes para generar el análisis automático. Completa los datos en 'Manual' para continuar"

          );
          setLiveCalculo(null);
          return;
        }

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
  }, [leadId, mode]);

  const paisConfig = PAISES_CONFIG[pais] || PAISES_CONFIG["España"];

  const calc = useMemo<HipotecaCalculo>(() => {
    if (isLeadMode && liveCalculo) {
      return liveCalculo;
    }
    
    const { valorVivienda, ingresosMensuales, deudasExistentes, plazo, tasa } = manualInputs;
    
    const porcentajeFinanciacion = 1 - paisConfig.entradaMinima;
    const montoPrestamo = valorVivienda * porcentajeFinanciacion;
    const cuotaEstimada = pmt(montoPrestamo, tasa / 100, plazo);
    
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
      tasa,
    };
  }, [isLeadMode, liveCalculo, manualInputs, paisConfig]);

  const precio = calc.valorVivienda || 0;
  const ingresos = calc.ingresosMensuales || 0;
  const score = calc.score || 0;
  const dti = calc.dti || 0;
  
  const entradaRequerida = precio * paisConfig.entradaMinima;
  const gastosImpuestos = precio * paisConfig.impuestosGastos;
  const cashToClose = entradaRequerida + gastosImpuestos;
  
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
    setManualInputs(prev => ({ ...prev, [field]: numValue }));
  }, []);

  const resetManual = useCallback(() => {
    setManualInputs({ valorVivienda: 0, ingresosMensuales: 0, deudasExistentes: 0, plazo: 25, tasa: 3.5 });
  }, []);

  return (
    <div style={{ height: "100%", overflowY: "auto", paddingRight: "8px", display: "flex", flexDirection: "column", gap: "20px" }}>
      
      {mode === "manual" && (
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
            <button onClick={resetManual} style={resetButtonStyle}>
              <RefreshCw size={12} /> Reset
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px" }}>
            <InputField
              label="Valor Vivienda"
              value={manualInputs.valorVivienda}
              onChange={(v) => handleInputChange("valorVivienda", v)}
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
        <button style={exportButtonStyle}>
          <Printer size={14} /> Exportar Ficha
        </button>
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
                label={`Fijo (${(manualInputs.tasa + 0.5).toFixed(1)}%)`} 
                val={formatearMoneda(Math.round(calc.cuotaEstimada * 1.05), paisConfig)} 
              />
              <ScenarioBox 
                label={`Mixto (${manualInputs.tasa.toFixed(1)}%)`} 
                val={formatearMoneda(calc.cuotaEstimada, paisConfig)} 
                highlight 
              />
              <ScenarioBox 
                label={`Variable (${(manualInputs.tasa - 0.5).toFixed(1)}%)`} 
                val={formatearMoneda(Math.round(calc.cuotaEstimada * 0.95), paisConfig)} 
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