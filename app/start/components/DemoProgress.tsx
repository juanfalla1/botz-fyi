"use client";

import React from "react";
import { 
  Target, 
  RefreshCcw,
  ClipboardList,
  Database,
  Cpu,
  Mail,
  Calculator,
  CheckCircle2,
  TrendingUp,
  Shield,
  Share2,
  CalendarDays,
  FileText,
  Handshake 
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa6";
import { BotzProps } from "../types";
import { VisualNode, VisualConnector } from "./VisualComponents";

const glassStyle: React.CSSProperties = {
  background: "rgba(10, 15, 30, 0.8)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "20px",
  padding: "24px",
  backdropFilter: "blur(12px)",
  boxShadow: "0 20px 40px rgba(0,0,0,0.4)"
};

const FLOW = [
  {
    key: "form",
    title: "Formulario enviado",
    icon: <ClipboardList size={22} />,
    color: "#22d3ee",
    tooltip: "Recibo tus datos y abro tu caso como LEAD (todavía no eres cliente)."
  },
  {
    key: "registro",
    title: "Registro del lead",
    icon: <Database size={20} />,
    color: "#22d3ee",
    tooltip: "Guardo tu información para que nada se pierda y poder hacer seguimiento."
  },
  {
    key: "perfilado",
    title: "Entendemos tu necesidad",
    icon: <Cpu size={22} />,
    color: "#c084fc",
    tooltip: "Organizo lo que necesitas para guiarte con claridad (sin tecnicismos)."
  },
  {
    key: "correo",
    title: "Correo de bienvenida",
    icon: <Mail size={20} />,
    color: "#34d399",
    tooltip: "Te llega un correo con resumen y próximos pasos (el buzón se ilumina)."
  },
  {
    key: "whatsapp",
    title: "WhatsApp activado",
    icon: <FaWhatsapp size={20} />,
    color: "#34d399",
    tooltip: "Abrimos conversación para resolver dudas y avanzar. Puedes chatear aquí."
  },
  {
    key: "calculo_hipotecario",
    title: "Cálculo hipotecario",
    icon: <Calculator size={20} />,
    color: "#8b5cf6",
    tooltip: "Calculamos tu capacidad de endeudamiento y cuota estimada."
  },
  {
    key: "criterios_viabilidad",
    title: "Criterios de viabilidad",
    icon: <CheckCircle2 size={20} />,
    color: "#10b981",
    tooltip: "Evaluamos DTI, LTV y score crediticio."
  },
  {
    key: "calificacion_lead",
    title: "Cómo se califica el lead",
    icon: <TrendingUp size={20} />,
    color: "#f59e0b",
    tooltip: "Asignamos puntaje según perfil y documentación."
  },
  {
    key: "analisis_aprobacion",
    title: "Por qué se aprueba o no",
    icon: <Shield size={20} />,
    color: "#ef4444",
    tooltip: "Análisis final de aprobación basado en políticas."
  },
  {
    key: "seguimiento",
    title: "Seguimiento respetuoso",
    icon: <Share2 size={20} />,
    color: "#fbbf24",
    tooltip: "Si no respondes, te recuerdo con tacto (sin insistir)."
  },
  {
    key: "agenda",
    title: "Agendar reunión",
    icon: <CalendarDays size={20} />,
    color: "#fbbf24",
    tooltip: "Si hace falta, agendamos 15 min para cerrar claridad y tiempos."
  },
  {
    key: "propuesta",
    title: "Propuesta / plan",
    icon: <FileText size={20} />,
    color: "#60a5fa",
    tooltip: "Te preparo una propuesta simple: qué haremos, en cuánto tiempo y costo."
  },
  {
    key: "confirmacion",
    title: "Confirmación e inicio",
    icon: <Handshake size={20} />,
    color: "#60a5fa",
    tooltip: "Cuando dices 'listo', confirmamos y empezamos (ahí sí pasas a cliente)."
  }
];

function DemoProgress(props: BotzProps) {
  const { activeStep, showExplanation, demoReset } = props;

  return (
    <div style={glassStyle}>
      <h2 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "30px", display: "flex", alignItems: "center", gap: "12px" }}>
        <Target size={28} /> Proceso de Onboarding Hipotecario
      </h2>
      
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
        <VisualNode 
          icon={<Share2 size={32} />} 
          label="Entrada (Anuncio / Web)" 
          active={activeStep >= 1} 
          color="#22d3ee" 
          current={activeStep === 0}
        />
        
        <VisualConnector active={activeStep >= 1} />

        <div style={{ display: "flex", flexDirection: "column", gap: "30px", width: "100%", alignItems: "center" }}>
          {FLOW.map((n, idx) => {
            const stepNum = idx + 1;
            const active = activeStep >= stepNum;
            const current = activeStep === stepNum;

            return (
              <div key={n.key} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
                <VisualNode 
                  icon={n.icon} 
                  label={n.title} 
                  active={active} 
                  color={n.color} 
                  current={current}
                  small={false} 
                />
                {current && showExplanation && (
                  <div style={{ 
                    position: "absolute", 
                    top: "100px", 
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    padding: "20px",
                    borderRadius: "16px",
                    fontSize: "14px",
                    width: "300px",
                    textAlign: "center",
                    zIndex: 10,
                    backdropFilter: "blur(10px)"
                  }}>
                    <strong style={{ color: n.color, marginBottom: "8px", display: "block" }}>{n.title}</strong>
                    {n.tooltip}
                  </div>
                )}
                {idx !== FLOW.length - 1 && <VisualConnector active={activeStep >= stepNum + 1} />}
              </div>
            );
          })}
        </div>
        
        <div style={{ marginTop: "40px", textAlign: "center" }}>
          <button
            onClick={demoReset}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid #30363d",
              color: "#8b949e",
              padding: "16px 32px",
              borderRadius: "12px",
              cursor: "pointer",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              justifyContent: "center",
              margin: "0 auto"
            }}
          >
            <RefreshCcw size={16} /> REINICIAR FLUJO COMPLETA
          </button>
        </div>
      </div>
    </div>
  );
}

export default DemoProgress;