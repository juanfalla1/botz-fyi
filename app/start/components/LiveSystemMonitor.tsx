"use client";
import React, { useEffect, useState } from "react";
import { 
  Database, Wallet, Landmark, TrendingUp, AlertTriangle, 
  CheckCircle2, BrainCircuit, Mail, Sparkles, Zap, Shield,
  ArrowUpRight, ArrowDownRight
} from "lucide-react";
import useBotzLanguage from "../hooks/useBotzLanguage";

interface LiveSystemMonitorProps {
  formData: any;
  calculoHipoteca: any;
  step: number;
}

// Componente para animar números
const AnimatedNumber = ({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    if (value === 0) { setDisplayValue(0); return; }
    
    const duration = 1500;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.round(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [value]);
  
  return <span>{prefix}{displayValue.toLocaleString()}{suffix}</span>;
};

export default function LiveSystemMonitor({ formData, calculoHipoteca, step }: LiveSystemMonitorProps) {
  const language = useBotzLanguage();
  const copy = {
    es: {
      liveMonitor: "MONITOR EN VIVO",
      synced: "SINCRONIZADO",
      database: "BASE DE DATOS",
      live: "● LIVE",
      customer: "CLIENTE",
      interest: "INTERES",
      mailServer: "SERVIDOR DE CORREO",
      sent: "ENVIADO",
      to: "Para:",
      subject: "Asunto:",
      subjectLine: "Bienvenido a tu proceso hipotecario 🏠",
      mailBody: (name: string) =>
        `"Hola ${name}, hemos recibido tu solicitud.\nBotz IA esta analizando tu perfil financiero..."`,
      bankingRadar: "RADAR BANCARIO",
      fundsRequired: "FONDOS REQUERIDOS",
      downPayment: "Entrada (20%)",
      fees: "Gastos (~10%)",
      totalCash: "TOTAL CASH",
      aiResult: "Resultado IA",
      viableCustomer: "CLIENTE VIABLE",
      highRisk: "RIESGO ALTO",
      viableHint: "Perfil financiero solido. Se recomienda ofrecer seguro de vida vinculado para mejorar condiciones.",
      riskHint: (dti: number) =>
        `DTI elevado (${dti}%). Sugerencia: solicitar aval adicional o cancelar deudas existentes antes de continuar.`,
      waiting: "Sistema en espera",
      waitingHint: "Los datos apareceran cuando inicies el flujo",
    },
    en: {
      liveMonitor: "LIVE MONITOR",
      synced: "SYNCED",
      database: "DATABASE",
      live: "● LIVE",
      customer: "CUSTOMER",
      interest: "INTEREST",
      mailServer: "MAIL SERVER",
      sent: "SENT",
      to: "To:",
      subject: "Subject:",
      subjectLine: "Welcome to your mortgage journey 🏠",
      mailBody: (name: string) =>
        `"Hi ${name}, we received your request.\nBotz AI is analyzing your financial profile..."`,
      bankingRadar: "BANK RADAR",
      fundsRequired: "FUNDS REQUIRED",
      downPayment: "Down payment (20%)",
      fees: "Fees (~10%)",
      totalCash: "TOTAL CASH",
      aiResult: "AI Result",
      viableCustomer: "VIABLE CUSTOMER",
      highRisk: "HIGH RISK",
      viableHint: "Strong financial profile. Consider offering a bundled life insurance to improve terms.",
      riskHint: (dti: number) =>
        `High DTI (${dti}%). Suggestion: add a guarantor or pay down existing debts before proceeding.`,
      waiting: "System standing by",
      waitingHint: "Data will appear once you start the flow",
    },
  } as const;

  const t = copy[language];
  
  const precio = calculoHipoteca.valorVivienda || 0;
  const ingresos = calculoHipoteca.ingresosMensuales || 0;
  const score = calculoHipoteca.score || 0;
  const dti = calculoHipoteca.dti || 0;
  const isViable = calculoHipoteca.aprobado;

  const hasBasicData = formData.name && formData.name.length > 0;
  const hasEmailStep = step >= 1;

  const entrada = precio * 0.20;
  const gastos = precio * 0.10;
  const totalCash = entrada + gastos;

  const getProb = (base: number) => score === 0 ? 0 : Math.min(99, Math.round((base * score) / 100));

  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      gap: "16px", 
      height: "100%",
      paddingRight: "4px"
    }}>
      
      {/* HEADER */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 4px"
      }}>
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "8px",
          fontSize: "13px",
          fontWeight: "700",
          color: "#fff"
        }}>
          <Zap size={16} color="#22d3ee" />
          {t.liveMonitor}
        </div>
        <div style={{
          background: "rgba(34, 211, 238, 0.1)",
          border: "1px solid rgba(34, 211, 238, 0.3)",
          padding: "4px 10px",
          borderRadius: "20px",
          fontSize: "10px",
          color: "#22d3ee",
          fontWeight: "600",
          display: "flex",
          alignItems: "center",
          gap: "4px"
        }}>
          <div style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: "#22d3ee",
            animation: "pulse 2s infinite"
          }} />
          {t.synced}
        </div>
      </div>

      {/* 1. TARJETA CRM */}
      {hasBasicData && (
        <div style={cardStyle}>
          <div style={headerStyle("#22d3ee")}>
            <Database size={14} /> 
            <span>{t.database}</span>
            <span style={liveBadgeStyle}>{t.live}</span>
          </div>
          
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "1fr 1fr", 
            gap: "12px",
            marginTop: "12px"
          }}>
              <div style={statBoxStyle}>
              <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "4px" }}>{t.customer}</div>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "#fff" }}>
                {formData.name || "--"}
              </div>
            </div>
            <div style={statBoxStyle}>
              <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "4px" }}>{t.interest}</div>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "#fff" }}>
                {formData.interest?.split(" ")[0] || formData.country || "Global"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. TARJETA EMAIL */}
      {hasEmailStep && (
        <div style={{ ...cardStyle, animation: "slideIn 0.5s ease", borderLeft: "3px solid #34d399" }}>
          <div style={headerStyle("#34d399")}>
            <Mail size={14} /> 
            <span>{t.mailServer}</span>
            <span style={{ fontSize: "9px", opacity: 0.7, marginLeft: "auto" }}>{t.sent}</span>
          </div>
          
          <div style={{ 
            background: "rgba(255,255,255,0.03)", 
            padding: "12px", 
            borderRadius: "10px", 
            marginTop: "10px" 
          }}>
            <div style={{ fontSize: "10px", color: "#8b949e", marginBottom: "4px" }}>
              {t.to} <span style={{ color: "#e2e8f0" }}>{formData.email || (language === "en" ? "customer@email.com" : "cliente@email.com")}</span>
            </div>
            <div style={{ 
              fontSize: "10px", 
              color: "#8b949e", 
              marginBottom: "8px", 
              borderBottom: "1px solid rgba(255,255,255,0.08)", 
              paddingBottom: "6px" 
            }}>
              {t.subject} <span style={{ color: "#fff" }}>{t.subjectLine}</span>
            </div>
            <p style={{ 
              fontSize: "11px", 
              color: "#94a3b8", 
              lineHeight: "1.5", 
              margin: 0,
              fontStyle: "italic"
            }}>
              {t.mailBody(formData.name?.split(" ")[0] || (language === "en" ? "Customer" : "Cliente"))}
            </p>
          </div>
        </div>
      )}

      {/* 3. RADAR BANCARIO */}
      {precio > 0 && (
        <div style={{ ...cardStyle, borderLeft: "3px solid #facc15" }}>
          <div style={headerStyle("#facc15")}>
            <Landmark size={14} /> 
            <span>{t.bankingRadar}</span>
            <Sparkles size={12} color="#facc15" style={{ marginLeft: "auto" }} />
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
            <BankBar name="Santander" prob={getProb(95)} color="#ec0000" />
            <BankBar name="BBVA" prob={getProb(85)} color="#1973b8" />
            <BankBar name="CaixaBank" prob={getProb(90)} color="#00a8e1" />
          </div>
        </div>
      )}

      {/* 4. CASH TO CLOSE */}
      {precio > 0 && (
        <div style={cardStyle}>
          <div style={headerStyle("#c084fc")}>
            <Wallet size={14} /> 
            <span>{t.fundsRequired}</span>
          </div>
          
          <div style={{ marginTop: "12px" }}>
            <div style={rowStyle}>
              <span>{t.downPayment}</span>
              <span style={{ color: "#fff", fontWeight: "600" }}>
                $<AnimatedNumber value={Math.round(entrada)} />
              </span>
            </div>
            <div style={rowStyle}>
              <span>{t.fees}</span>
              <span style={{ color: "#fff", fontWeight: "600" }}>
                $<AnimatedNumber value={Math.round(gastos)} />
              </span>
            </div>
            <div style={{ height: "1px", background: "rgba(255,255,255,0.1)", margin: "10px 0" }} />
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              fontSize: "15px", 
              fontWeight: "800" 
            }}>
              <span style={{ color: "#c084fc" }}>{t.totalCash}</span>
              <span style={{ 
                color: "#c084fc",
                background: "rgba(192, 132, 252, 0.1)",
                padding: "4px 12px",
                borderRadius: "8px"
              }}>
                $<AnimatedNumber value={Math.round(totalCash)} />
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 5. SCORING FINAL */}
      {score > 0 && (
        <div style={{ 
          ...cardStyle, 
          background: isViable 
            ? "linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)"
            : "linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)",
          border: isViable ? "2px solid rgba(34, 197, 94, 0.4)" : "2px solid rgba(239, 68, 68, 0.4)",
          animation: "scaleIn 0.5s ease"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ 
              width: "56px", 
              height: "56px", 
              borderRadius: "16px", 
              background: isViable 
                ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
                : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
              color: "#fff", 
              fontWeight: "800", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              fontSize: "20px",
              boxShadow: isViable 
                ? "0 8px 24px rgba(34, 197, 94, 0.4)"
                : "0 8px 24px rgba(239, 68, 68, 0.4)"
            }}>
              {score}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ 
                fontSize: "10px", 
                color: isViable ? "#86efac" : "#fca5a5", 
                textTransform: "uppercase",
                fontWeight: "700",
                letterSpacing: "0.5px",
                marginBottom: "4px"
              }}>
                {t.aiResult}
              </div>
              <div style={{ 
                fontSize: "18px", 
                fontWeight: "800", 
                color: "#fff",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                {isViable ? t.viableCustomer : t.highRisk}
                {isViable 
                  ? <ArrowUpRight size={18} color="#22c55e" />
                  : <ArrowDownRight size={18} color="#ef4444" />
                }
              </div>
            </div>
          </div>
          
          <div style={{ 
            marginTop: "14px", 
            padding: "12px",
            background: "rgba(0,0,0,0.2)",
            borderRadius: "10px",
            fontSize: "12px", 
            display: "flex", 
            gap: "8px", 
            color: "rgba(255,255,255,0.85)",
            lineHeight: "1.5"
          }}>
            <BrainCircuit size={16} style={{ flexShrink: 0, marginTop: "2px" }} color={isViable ? "#22c55e" : "#ef4444"} />
            <span>
              {isViable 
                ? t.viableHint
                : t.riskHint(dti)
              }
            </span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasBasicData && (
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#475569",
          textAlign: "center",
          padding: "40px 20px"
        }}>
          <div style={{
            width: "64px",
            height: "64px",
            borderRadius: "20px",
            background: "rgba(255,255,255,0.03)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "16px"
          }}>
            <Shield size={28} style={{ opacity: 0.3 }} />
          </div>
          <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "4px" }}>
            {t.waiting}
          </div>
          <div style={{ fontSize: "12px", color: "#64748b" }}>
            {t.waitingHint}
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

// Componente de barra de banco
const BankBar = ({ name, prob, color }: { name: string; prob: number; color: string }) => (
  <div>
    <div style={{ 
      display: "flex", 
      justifyContent: "space-between", 
      fontSize: "11px", 
      marginBottom: "4px" 
    }}>
      <span style={{ color: "#e2e8f0", fontWeight: "500" }}>{name}</span>
      <span style={{ color, fontWeight: "700" }}>{prob}%</span>
    </div>
    <div style={{ 
      width: "100%", 
      height: "6px", 
      background: "rgba(255,255,255,0.08)", 
      borderRadius: "3px", 
      overflow: "hidden" 
    }}>
      <div style={{ 
        width: `${prob}%`, 
        height: "100%", 
        background: `linear-gradient(90deg, ${color} 0%, ${color}cc 100%)`,
        borderRadius: "3px",
        transition: "width 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
        boxShadow: `0 0 8px ${color}50`
      }} />
    </div>
  </div>
);

// Estilos reutilizables
const cardStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(15, 23, 42, 0.6) 100%)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "16px",
  padding: "16px",
  backdropFilter: "blur(10px)"
};

const headerStyle = (color: string): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "11px",
  color: color,
  fontWeight: "700",
  letterSpacing: "0.5px",
  textTransform: "uppercase"
});

const liveBadgeStyle: React.CSSProperties = {
  fontSize: "9px",
  background: "#ef4444",
  color: "white",
  padding: "2px 6px",
  borderRadius: "4px",
  marginLeft: "auto",
  animation: "pulse 1.5s infinite"
};

const statBoxStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  padding: "10px 12px",
  borderRadius: "10px"
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: "12px",
  color: "#94a3b8",
  marginBottom: "8px"
};
