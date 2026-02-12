"use client";
import React, { useEffect, useState, useRef } from "react";
import { 
  Target, RefreshCcw, ClipboardList, Database, Cpu, Mail, 
  Calculator, CheckCircle2, TrendingUp, Shield, Share2, 
  CalendarDays, FileText, Handshake, Check, Play, Loader2,
  Sparkles, Zap, ArrowRight, Pause, RotateCcw
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa6";
import useBotzLanguage from "../hooks/useBotzLanguage";

type FlowStep = {
  key: string;
  title: string;
  icon: React.ReactElement<any>;
  color: string;
  headline: string;
  desc: string;
  detail: string;
};

// ============================================================================
// 🎯 CONFIGURACIÓN DEL FLUJO - STORYTELLING ÉPICO
// ============================================================================
const FLOW_ES: FlowStep[] = [
  { 
    key: "form", 
    title: "Captura", 
    icon: <ClipboardList size={20} />, 
    color: "#22d3ee", 
    headline: "📥 Lead Capturado",
    desc: "Un nuevo cliente potencial acaba de llenar tu formulario",
    detail: "Botz detecta automáticamente el origen del lead y lo clasifica"
  },
  { 
    key: "registro", 
    title: "CRM", 
    icon: <Database size={20} />, 
    color: "#60a5fa", 
    headline: "⚡ Sincronizando con CRM",
    desc: "Creando ficha de cliente en tiempo real",
    detail: "Historial, notas y scoring se actualizan automáticamente"
  },
  { 
    key: "perfilado", 
    title: "IA", 
    icon: <Cpu size={20} />, 
    color: "#c084fc", 
    headline: "🤖 IA Analizando Perfil",
    desc: "Detectando intención: ¿inversor o primera vivienda?",
    detail: "Machine Learning clasifica el perfil en milisegundos"
  },
  { 
    key: "correo", 
    title: "Email", 
    icon: <Mail size={20} />, 
    color: "#34d399", 
    headline: "📧 Email de Bienvenida",
    desc: "Enviando correo personalizado automático",
    detail: "El cliente recibe confirmación instantánea"
  },
  { 
    key: "whatsapp", 
    title: "WhatsApp", 
    icon: <FaWhatsapp size={20} />, 
    color: "#25D366", 
    headline: "🟢 Botz Activado",
    desc: "Iniciando conversación proactiva en WhatsApp",
    detail: "El asistente IA contacta al cliente en segundos"
  },
  { 
    key: "calculo", 
    title: "Cálculo", 
    icon: <Calculator size={20} />, 
    color: "#f59e0b", 
    headline: "🧮 Simulación Hipotecaria",
    desc: "Calculando cuota y capacidad de pago",
    detail: "Motor financiero procesando 15+ variables"
  },
  { 
    key: "viabilidad", 
    title: "Viabilidad", 
    icon: <CheckCircle2 size={20} />, 
    color: "#10b981", 
    headline: "🏦 Análisis Bancario",
    desc: "Consultando políticas de riesgo (DTI/LTV)",
    detail: "Comparando con criterios de 12 entidades financieras"
  },
  { 
    key: "calificacion", 
    title: "Score", 
    icon: <TrendingUp size={20} />, 
    color: "#ef4444", 
    headline: "📊 Lead Scoring",
    desc: "Asignando puntaje de calidad (0-100)",
    detail: "Algoritmo predictivo de conversión activado"
  },
  { 
    key: "decision", 
    title: "Decisión", 
    icon: <Shield size={20} />, 
    color: "#8b5cf6", 
    headline: "✅ Decisión Automática",
    desc: "¿Es un lead viable para contactar?",
    detail: "Filtrado inteligente ahorra 80% del tiempo"
  },
  { 
    key: "seguimiento", 
    title: "Nurturing", 
    icon: <Share2 size={20} />, 
    color: "#ec4899", 
    headline: "🎯 Secuencia Activada",
    desc: "Programando seguimiento automatizado",
    detail: "Emails, WhatsApp y llamadas en piloto automático"
  },
  { 
    key: "agenda", 
    title: "Reunión", 
    icon: <CalendarDays size={20} />, 
    color: "#14b8a6", 
    headline: "📅 Agendando Cita",
    desc: "Buscando disponibilidad del broker",
    detail: "Sincronización con Google Calendar / Outlook"
  },
  { 
    key: "propuesta", 
    title: "Propuesta", 
    icon: <FileText size={20} />, 
    color: "#3b82f6", 
    headline: "📄 Documento Generado",
    desc: "Creando propuesta personalizada",
    detail: "PDF profesional listo para enviar"
  },
  { 
    key: "confirmacion", 
    title: "Éxito", 
    icon: <Handshake size={20} />, 
    color: "#22c55e", 
    headline: "🎉 Proceso Completado",
    desc: "Lead calificado y listo para cerrar",
    detail: "Todo en menos de 30 segundos"
  }
];

const FLOW_EN: FlowStep[] = [
  {
    key: "form",
    title: "Capture",
    icon: <ClipboardList size={20} />,
    color: "#22d3ee",
    headline: "📥 Lead Captured",
    desc: "A new potential customer just submitted your form",
    detail: "Botz automatically detects the lead source and classifies it",
  },
  {
    key: "registro",
    title: "CRM",
    icon: <Database size={20} />,
    color: "#60a5fa",
    headline: "⚡ Syncing to CRM",
    desc: "Creating the customer record in real time",
    detail: "History, notes, and scoring update automatically",
  },
  {
    key: "perfilado",
    title: "AI",
    icon: <Cpu size={20} />,
    color: "#c084fc",
    headline: "🤖 AI Analyzing Profile",
    desc: "Detecting intent: investor or first home?",
    detail: "Machine learning classifies the profile in milliseconds",
  },
  {
    key: "correo",
    title: "Email",
    icon: <Mail size={20} />,
    color: "#34d399",
    headline: "📧 Welcome Email",
    desc: "Sending an automatic personalized email",
    detail: "The customer receives instant confirmation",
  },
  {
    key: "whatsapp",
    title: "WhatsApp",
    icon: <FaWhatsapp size={20} />,
    color: "#25D366",
    headline: "🟢 Botz Activated",
    desc: "Starting a proactive WhatsApp conversation",
    detail: "The AI assistant contacts the customer in seconds",
  },
  {
    key: "calculo",
    title: "Calculation",
    icon: <Calculator size={20} />,
    color: "#f59e0b",
    headline: "🧮 Mortgage Simulation",
    desc: "Calculating payment and affordability",
    detail: "Financial engine processing 15+ variables",
  },
  {
    key: "viabilidad",
    title: "Eligibility",
    icon: <CheckCircle2 size={20} />,
    color: "#10b981",
    headline: "🏦 Bank Analysis",
    desc: "Checking risk policies (DTI/LTV)",
    detail: "Comparing criteria across 12 lenders",
  },
  {
    key: "calificacion",
    title: "Score",
    icon: <TrendingUp size={20} />,
    color: "#ef4444",
    headline: "📊 Lead Scoring",
    desc: "Assigning a quality score (0-100)",
    detail: "Predictive conversion algorithm activated",
  },
  {
    key: "decision",
    title: "Decision",
    icon: <Shield size={20} />,
    color: "#8b5cf6",
    headline: "✅ Automatic Decision",
    desc: "Is this a viable lead to contact?",
    detail: "Smart filtering saves 80% of the time",
  },
  {
    key: "seguimiento",
    title: "Nurturing",
    icon: <Share2 size={20} />,
    color: "#ec4899",
    headline: "🎯 Sequence Activated",
    desc: "Scheduling automated follow-ups",
    detail: "Emails, WhatsApp, and calls on autopilot",
  },
  {
    key: "agenda",
    title: "Meeting",
    icon: <CalendarDays size={20} />,
    color: "#14b8a6",
    headline: "📅 Booking a Call",
    desc: "Checking broker availability",
    detail: "Sync with Google Calendar / Outlook",
  },
  {
    key: "propuesta",
    title: "Proposal",
    icon: <FileText size={20} />,
    color: "#3b82f6",
    headline: "📄 Document Generated",
    desc: "Creating a personalized proposal",
    detail: "Professional PDF ready to send",
  },
  {
    key: "confirmacion",
    title: "Success",
    icon: <Handshake size={20} />,
    color: "#22c55e",
    headline: "🎉 Process Completed",
    desc: "Qualified lead, ready to close",
    detail: "All in under 30 seconds",
  },
];

const STEP_DURATIONS = [800, 2500, 2000, 1500, 1200, 3000, 2500, 2000, 1500, 1500, 1500, 1500, 0];

interface ExperienceGuideProps {
  step: number;
  formData: any;
  chatLength: number;
  calculoHipoteca?: any;
  onReset: () => void;
}

export default function ExperienceGuide({ step, formData, chatLength, calculoHipoteca, onReset }: ExperienceGuideProps) {
  const language = useBotzLanguage();
  const copy = {
    es: {
      liveAutomation: "AUTOMATIZACIÓN EN VIVO",
      title: "Mira cómo Botz trabaja",
      watchDemo: "Ver Demo",
      pause: "Pausar",
      progress: "Progreso",
      processing: "PROCESANDO",
      ready: "LISTO",
      hide: "Ocultar",
      view: "Ver",
      steps: "pasos",
    },
    en: {
      liveAutomation: "LIVE AUTOMATION",
      title: "Watch Botz at work",
      watchDemo: "Watch Demo",
      pause: "Pause",
      progress: "Progress",
      processing: "PROCESSING",
      ready: "READY",
      hide: "Hide",
      view: "View",
      steps: "steps",
    },
  } as const;
  const t = copy[language];
  const FLOW = language === "en" ? FLOW_EN : FLOW_ES;

  const safeCalculo = calculoHipoteca || {};
  const [visualStep, setVisualStep] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [showFullTimeline, setShowFullTimeline] = useState(false);
  const activeStepRef = useRef<HTMLDivElement>(null);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  // Cálculo del target
  let targetIndex = 0;
  if (step === 0) {
    targetIndex = 0;
  } else {
    targetIndex = 2;
    if (formData?.interest && formData.interest !== "") targetIndex = 4;
    if (chatLength > 0) targetIndex = 4;
    if (safeCalculo.ingresosMensuales > 0 || safeCalculo.valorVivienda > 0) targetIndex = 7;
    if (safeCalculo.score > 0) targetIndex = 9;
    const requiredFields = [formData?.name, formData?.ingresoMensual, formData?.valorVivienda, formData?.aportacion_real, formData?.edad];
    const filledCount = requiredFields.filter(f => f && f !== "" && f !== "0").length;
    if (filledCount >= 5) targetIndex = 11;
  }

  // Motor de animación
  useEffect(() => {
    if (isAutoPlaying) return;
    if (targetIndex === 0) { setVisualStep(0); return; }
    if (visualStep < targetIndex) {
      const delay = STEP_DURATIONS[visualStep] || 1500;
      const timer = setTimeout(() => setVisualStep(prev => prev + 1), delay);
      return () => clearTimeout(timer);
    }
  }, [targetIndex, visualStep, isAutoPlaying]);

  // Autoplay
  const startAutoPlay = () => {
    setIsAutoPlaying(true);
    setVisualStep(0);
    let currentStep = 0;
    const runStep = () => {
      if (currentStep >= FLOW.length - 1) { setIsAutoPlaying(false); return; }
      autoPlayRef.current = setTimeout(() => {
        currentStep++;
        setVisualStep(currentStep);
        runStep();
      }, STEP_DURATIONS[currentStep] || 1500);
    };
    runStep();
  };

  const stopAutoPlay = () => {
    if (autoPlayRef.current) clearTimeout(autoPlayRef.current);
    setIsAutoPlaying(false);
  };

  useEffect(() => { return () => { if (autoPlayRef.current) clearTimeout(autoPlayRef.current); }; }, []);

  useEffect(() => {
    if (activeStepRef.current) {
      activeStepRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [visualStep]);

  const currentStepData = FLOW[visualStep];
  const isAnimating = visualStep < targetIndex || isAutoPlaying;
  const progress = ((visualStep + 1) / FLOW.length) * 100;

  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      gap: "0",
      background: "linear-gradient(180deg, rgba(10, 15, 30, 0.95) 0%, rgba(10, 15, 30, 0.8) 100%)",
      borderRadius: "24px",
      border: "1px solid rgba(255,255,255,0.08)",
      overflow: "hidden",
      position: "relative"
    }}>
      
      {/* HERO HEADER */}
      <div style={{
        padding: "28px 28px 20px",
        background: `linear-gradient(135deg, ${currentStepData.color}15 0%, transparent 60%)`,
        position: "relative",
        overflow: "hidden"
      }}>
        <div style={{
          position: "absolute",
          top: "-50%",
          right: "-10%",
          width: "300px",
          height: "300px",
          background: `radial-gradient(circle, ${currentStepData.color}20 0%, transparent 70%)`,
          filter: "blur(40px)",
          pointerEvents: "none"
        }} />
        
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "flex-start",
          marginBottom: "20px",
          position: "relative",
          zIndex: 1
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              background: `linear-gradient(135deg, ${currentStepData.color} 0%, ${currentStepData.color}80 100%)`,
              padding: "10px",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 8px 32px ${currentStepData.color}40`
            }}>
              <Zap size={20} color="#000" />
            </div>
            <div>
              <div style={{ 
                fontSize: "10px", 
                color: currentStepData.color, 
                fontWeight: "700",
                letterSpacing: "2px",
                textTransform: "uppercase",
                marginBottom: "2px"
              }}>
                {t.liveAutomation}
              </div>
              <h2 style={{ fontSize: "22px", fontWeight: "800", margin: 0, color: "#fff" }}>
                {t.title}
              </h2>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            {!isAutoPlaying ? (
              <button
                onClick={startAutoPlay}
                style={{
                  background: `linear-gradient(135deg, ${currentStepData.color} 0%, ${currentStepData.color}cc 100%)`,
                  border: "none",
                  color: "#000",
                  padding: "10px 18px",
                  borderRadius: "12px",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: `0 4px 20px ${currentStepData.color}50`
                }}
              >
                <Play size={14} fill="currentColor" /> {t.watchDemo}
              </button>
            ) : (
              <button
                onClick={stopAutoPlay}
                style={{
                  background: "rgba(239, 68, 68, 0.2)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  color: "#ef4444",
                  padding: "10px 18px",
                  borderRadius: "12px",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <Pause size={14} /> {t.pause}
              </button>
            )}
            
            <button 
              onClick={() => { stopAutoPlay(); onReset(); setVisualStep(0); }}
              style={{
                background: "rgba(255, 255, 255, 0.06)", 
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#8b949e", 
                padding: "10px 14px", 
                borderRadius: "12px", 
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer", 
                display: "flex", 
                alignItems: "center", 
                gap: "6px"
              }}
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>

        {/* BARRA DE PROGRESO */}
        <div style={{ marginBottom: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ fontSize: "11px", color: "#64748b" }}>{t.progress}</span>
            <span style={{ fontSize: "12px", fontWeight: "700", color: currentStepData.color }}>
              {visualStep + 1} / {FLOW.length}
            </span>
          </div>
          <div style={{ height: "6px", background: "rgba(255,255,255,0.08)", borderRadius: "10px", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${currentStepData.color} 0%, ${FLOW[Math.min(visualStep + 1, FLOW.length - 1)].color} 100%)`,
              borderRadius: "10px",
              transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: `0 0 20px ${currentStepData.color}60`
            }} />
          </div>
        </div>
      </div>

      {/* CARD ESTADO ACTUAL */}
      <div style={{ padding: "0 28px 20px" }}>
        <div style={{
          background: `linear-gradient(135deg, ${currentStepData.color}12 0%, rgba(255,255,255,0.02) 100%)`,
          border: `2px solid ${currentStepData.color}40`,
          borderRadius: "16px",
          padding: "20px",
          display: "flex",
          alignItems: "center",
          gap: "20px",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{
            width: "64px",
            height: "64px",
            borderRadius: "16px",
            background: `linear-gradient(135deg, ${currentStepData.color}30 0%, ${currentStepData.color}10 100%)`,
            border: `2px solid ${currentStepData.color}50`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: currentStepData.color,
            flexShrink: 0,
            boxShadow: `0 8px 32px ${currentStepData.color}30`
          }}>
            {isAnimating ? (
              <Loader2 size={28} className="spin-smooth" />
            ) : (
              React.cloneElement(currentStepData.icon as React.ReactElement<any>, { size: 28 })
            )}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <span style={{ fontSize: "24px", lineHeight: 1 }}>{currentStepData.headline.split(" ")[0]}</span>
              <span style={{ fontSize: "18px", fontWeight: "800", color: "#fff" }}>
                {currentStepData.headline.split(" ").slice(1).join(" ")}
              </span>
            </div>
            <p style={{ fontSize: "14px", color: "#e2e8f0", margin: "0 0 4px 0", fontWeight: "500" }}>
              {currentStepData.desc}
            </p>
            <p style={{ fontSize: "12px", color: "#64748b", margin: 0, display: "flex", alignItems: "center", gap: "4px" }}>
              <Sparkles size={12} color={currentStepData.color} />
              {currentStepData.detail}
            </p>
          </div>

          <div style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            background: isAnimating ? "rgba(239, 68, 68, 0.2)" : "rgba(34, 197, 94, 0.2)",
            border: `1px solid ${isAnimating ? "rgba(239, 68, 68, 0.4)" : "rgba(34, 197, 94, 0.4)"}`,
            color: isAnimating ? "#ef4444" : "#22c55e",
            padding: "4px 10px",
            borderRadius: "20px",
            fontSize: "10px",
            fontWeight: "700",
            display: "flex",
            alignItems: "center",
            gap: "4px"
          }}>
            <div style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: isAnimating ? "#ef4444" : "#22c55e",
              animation: isAnimating ? "blink 1s infinite" : "none"
            }} />
            {isAnimating ? t.processing : t.ready}
          </div>
        </div>
      </div>

      {/* TIMELINE MINI */}
      <div style={{ padding: "0 28px 20px" }}>
        <button
          onClick={() => setShowFullTimeline(!showFullTimeline)}
          style={{
            background: "none",
            border: "none",
            color: "#64748b",
            fontSize: "11px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            marginBottom: "10px",
            padding: 0
          }}
        >
          <Target size={12} />
          {showFullTimeline ? t.hide : t.view} {t.steps}
          <ArrowRight size={12} style={{ transform: showFullTimeline ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.3s" }} />
        </button>

        <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px" }}>
          {FLOW.map((stepData, idx) => {
            const isActive = idx === visualStep;
            const isCompleted = idx < visualStep;
            const isFuture = idx > visualStep;

            return (
              <div
                key={stepData.key}
                ref={isActive ? activeStepRef : null}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  minWidth: showFullTimeline ? "60px" : "36px",
                  opacity: isFuture ? 0.3 : 1,
                  transition: "all 0.3s ease"
                }}
              >
                <div style={{
                  width: isActive ? "32px" : "24px",
                  height: isActive ? "32px" : "24px",
                  borderRadius: "50%",
                  background: isCompleted ? stepData.color : isActive ? `${stepData.color}20` : "rgba(255,255,255,0.05)",
                  border: isActive ? `2px solid ${stepData.color}` : "2px solid transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: isCompleted ? "#000" : isActive ? stepData.color : "#475569",
                  transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                  boxShadow: isActive ? `0 0 16px ${stepData.color}50` : "none"
                }}>
                  {isCompleted ? <Check size={12} strokeWidth={3} /> : isActive && isAnimating ? <Loader2 size={12} className="spin-smooth" /> : React.cloneElement(stepData.icon as React.ReactElement<any>, { size: 12 })}
                </div>
                {showFullTimeline && (
                  <span style={{ fontSize: "8px", fontWeight: isActive ? "700" : "500", color: isActive ? "#fff" : "#64748b", marginTop: "4px", textAlign: "center" }}>
                    {stepData.title}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style jsx global>{`
        .spin-smooth { animation: spin 1.5s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}
