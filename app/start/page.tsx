"use client";

import React, { useRef, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation"; 
import dynamic from "next/dynamic";
import MainLayout, { useAuth } from "./MainLayout";
import DemoForm from "./components/DemoForm";
import DemoProgress from "./components/DemoProgress";
import ChatBox, { ChatMsg } from "./components/ChatBox"; 

function TabLoading() {
  return (
    <div
      style={{
        padding: 18,
        color: "#94a3b8",
        fontSize: 13,
        borderRadius: 12,
        border: "1px solid rgba(148,163,184,0.18)",
        background: "rgba(15, 23, 42, 0.45)",
      }}
    >
      Cargando...
    </div>
  );
}

const ChannelsView = dynamic(() => import("./components/ChannelsView"), { ssr: false, loading: TabLoading });
const HipotecaView = dynamic(() => import("./components/HipotecaView"), { ssr: false, loading: TabLoading });
const CRMFullView = dynamic(() => import("./components/CRMFullView"), { ssr: false, loading: TabLoading });
const MetricsFullView = dynamic(() => import("./components/MetricsFullView"), { ssr: false, loading: TabLoading });
const ExecutiveDashboard = dynamic(() => import("./components/ExecutiveDashboard"), { ssr: false, loading: TabLoading });
const ExperienceGuide = dynamic(() => import("./components/ExperienceGuide"), { ssr: false, loading: TabLoading });
const LiveSystemMonitor = dynamic(() => import("./components/LiveSystemMonitor"), { ssr: false, loading: TabLoading });
const IntegrationsSection = dynamic(() => import("./components/IntegrationsSection"), { ssr: false, loading: TabLoading });
const KanbanBoard = dynamic(() => import("./components/KanbanBoard"), { ssr: false, loading: TabLoading });
const SLAControlCenter = dynamic(() => import("./components/SLAControlCenter"), { ssr: false, loading: TabLoading });
const AgentsStudio = dynamic(() => import("./components/AgentsStudio"), { ssr: false, loading: TabLoading });
const PlatformTenantsView = dynamic(() => import("./components/PlatformTenantsView"), { ssr: false, loading: TabLoading });
import useBotzLanguage from "./hooks/useBotzLanguage";
import { supabase } from "./components/supabaseClient";
import AuthModal from "./components/AuthModal";
import ChatBot from "../components/ChatBot";




import { 
  FaWhatsapp, FaFacebook, FaInstagram, FaGoogle, 
  FaMeta, FaTiktok, FaTelegram, FaShopify 
} from "react-icons/fa6";
import { RefreshCw, Users, ShieldCheck } from "lucide-react"; 

type Tab = "demo" | "channels" | "agents" | "tenants" | "crm" | "control-center" | "metrics" | "kanban" | "hipoteca" | "n8n-config" | "sla";

type LeadOption = {
  id: string;
  name: string | null;
  created_at: string;
  phone?: string | null;
};

const CHANNELS = [
  { id: "whatsapp", name: "WhatsApp", icon: <FaWhatsapp size={24} />, color: "#25D366", active: true },
  { id: "meta", name: "Meta Ads", icon: <FaMeta size={24} />, color: "#0081FB", active: true },
  { id: "instagram", name: "Instagram", icon: <FaInstagram size={24} />, color: "#E4405F", active: true },
  { id: "facebook", name: "Facebook", icon: <FaFacebook size={24} />, color: "#1877F2", active: true },
  { id: "google", name: "Google", icon: <FaGoogle size={24} />, color: "#4285F4", active: true },
  { id: "tiktok", name: "TikTok", icon: <FaTiktok size={24} />, color: "#000000", active: false },
  { id: "telegram", name: "Telegram", icon: <FaTelegram size={24} />, color: "#26A5E4", active: false },
  { id: "shopify", name: "Shopify", icon: <FaShopify size={24} />, color: "#7AB55C", active: false },
];

const AUTOMATION_WEBHOOK_URL = "/api/n8n"; 

function pmt(principal: number, annualRate: number, years: number) {
  if (!principal || principal <= 0 || !years || years <= 0) return 0;
  const r = (annualRate || 0) / 12;
  const n = Math.round(years * 12);
  if (n <= 0) return 0;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

function timeAgo(dateString: string, language: "es" | "en"): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (language === "en") {
    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { day: "2-digit", month: "short" });
  }

  if (diffMins < 1) return "ahora";
  if (diffMins < 60) return `hace ${diffMins}m`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays < 7) return `hace ${diffDays}d`;
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

export default function BotzLandingExperience() {
  const router = useRouter(); 
  const searchParams = useSearchParams();
  const language = useBotzLanguage();
  const copy = {
    es: {
      mode: "Modo:",
      manual: "Manual",
      leadAuto: "Lead (Auto)",
      selectLead: "-- Selecciona un Lead --",
      unnamed: "Sin nombre",
      refreshLeads: "Refrescar lista de leads",
      connected: "Conectado",
      manualHint: "Simulación manual con datos personalizados",
      leadsAvailable: (n: number) => `${n} leads disponibles`,
      loading: "Cargando...",
      noLeads: "Sin leads",
    },
    en: {
      mode: "Mode:",
      manual: "Manual",
      leadAuto: "Lead (Auto)",
      selectLead: "-- Select a Lead --",
      unnamed: "Unnamed",
      refreshLeads: "Refresh leads list",
      connected: "Connected",
      manualHint: "Manual simulation with custom inputs",
      leadsAvailable: (n: number) => `${n} leads available`,
      loading: "Loading...",
      noLeads: "No leads",
    },
  } as const;
  const t = copy[language];
  
  // ✅ Usar el contexto de autenticación
  const { user, loading: authLoading, isAdmin, isAsesor, isPlatformAdmin, hasPermission } = useAuth();
  
  const [activeTab, setActiveTab] = useState<Tab>("demo");
  const [hipotecaMode, setHipotecaMode] = useState<"manual" | "lead">("manual");
  const [hipotecaLeadId, setHipotecaLeadId] = useState<string>("");
  const [step, setStep] = useState(0);
  const [activeStep, setActiveStep] = useState(0); 
  const [showExplanation, setShowExplanation] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showDock, setShowDock] = useState(false);
  const [openAuth, setOpenAuth] = useState(false);

  useEffect(() => {
    // If redirected from deprecated /login, force opening auth.
    const authParam = searchParams.get("auth");
    if (authParam === "1") {
      setOpenAuth(true);
      // Move away from demo so the auth gate is consistent.
      setActiveTab("crm");
    }
  }, [searchParams]);

  useEffect(() => {
    // Allow MainLayout and other components to open auth modal.
    const onOpen = () => setOpenAuth(true);
    window.addEventListener("botz-open-auth", onOpen as any);
    return () => window.removeEventListener("botz-open-auth", onOpen as any);
  }, []);

  useEffect(() => {
    // Support deep-links and deprecated routes: /start?tab=crm
    const tabParamRaw = (searchParams.get("tab") || "").trim().toLowerCase();
    if (!tabParamRaw) return;

    const allowed: Tab[] = [
      "demo",
      "channels",
      "agents",
      "tenants",
      "crm",
      "metrics",
      "kanban",
      "hipoteca",
      "n8n-config",
      "sla",
    ];

    if (allowed.includes(tabParamRaw as Tab)) {
      setActiveTab(tabParamRaw as Tab);
      return;
    }

    // Friendly aliases
    if (tabParamRaw === "dashboard" || tabParamRaw === "exec" || tabParamRaw === "executive") {
      setActiveTab("n8n-config");
    }
  }, [searchParams]);

  
  const [leadsOptions, setLeadsOptions] = useState<LeadOption[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  
  const [globalFilter, setGlobalFilter] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", company: "", country: "Colombia",
    interest: "", channel: "WhatsApp" as any, usesWhatsApp: "Sí", hasCRM: "No",
    startWhen: "En 1–3 meses", budgetRange: "2.500 - 5.000",
    ingresoMensual: "", valorVivienda: "", plazoAnios: "20", tieneDeudas: "No",
    aportacion_real: "", edad: "", vivienda_tipo: "", ccaa: ""
  });

  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [metrics, setMetrics] = useState({ score: 0, viability: "Pendiente", roi: 0 });
  const [isTyping, setIsTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const [mailbox, setMailbox] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [crm, setCrm] = useState<any>({ stage: "Lead nuevo", owner: "Botz", leadScore: 0, priority: "BAJA" });
  const [agenda, setAgenda] = useState<any[]>([]);
  const [pending, setPending] = useState<any>(null);
  
  const [calculoHipoteca, setCalculoHipoteca] = useState({
    cuotaEstimada: 0, 
    financiacion: 0, 
    dti: 0, 
    ltv: 0, 
    prestamoAprobable: 0,
    plazo: 20,
    tasa: 4.5,
    aprobado: false, 
    score: 0, 
    ingresosMensuales: 0, 
    valorVivienda: 0, 
    deudasExistentes: 0
  });

  const [n8nWebhookURL, setN8nWebhookURL] = useState(AUTOMATION_WEBHOOK_URL);
  const [useRealN8n, setUseRealN8n] = useState(true);
  const [n8nStatus, setN8nStatus] = useState<string>("disconnected");
  const [n8nStats, setN8nStats] = useState({ leadsEnviados: 0, mensajesProcesados: 0, ultimoEnvio: "--:--", errores: 0 });

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const followupTimeoutRef = useRef<any>(null);
  const lastUserMsgAtRef = useRef<number>(0);
  const playTimeoutRef = useRef<any>(null);

  // ✅ Mostrar modal de auth solo cuando NO estas en Demo
  useEffect(() => {
    if (!authLoading && !user && activeTab !== "demo") {
      setOpenAuth(true);
    } else if (user) {
      setOpenAuth(false);
    }
  }, [user, authLoading, activeTab]);

  // ✅ Evitar que queden datos visibles al cerrar sesión
  useEffect(() => {
    if (authLoading) return;
    if (user) return;

    // Reset UI state when session ends
    setActiveTab("demo");
    setHipotecaMode("manual");
    setHipotecaLeadId("");
    setLeadsOptions([]);
    setLoadingLeads(false);
    setGlobalFilter(null);
    setChat([]);
    setDraft("");
    setMailbox([]);
    setUnreadCount(0);
    setAgenda([]);
    setPending(null);
    setCrm({ stage: "Lead nuevo", owner: "Botz", leadScore: 0, priority: "BAJA" });
    setCalculoHipoteca({
      cuotaEstimada: 0,
      financiacion: 0,
      dti: 0,
      ltv: 0,
      prestamoAprobable: 0,
      plazo: 20,
      tasa: 4.5,
      aprobado: false,
      score: 0,
      ingresosMensuales: 0,
      valorVivienda: 0,
      deudasExistentes: 0,
    });
  }, [user, authLoading]);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const fetchLeads = async () => {
    setLoadingLeads(true);
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("id, name, phone, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.warn("Leads no disponibles:", error?.message || "Error de conexión");
        setLeadsOptions([]);
      } else {
        setLeadsOptions(data || []);
      }
    } catch (e: any) {
      console.warn("Exception cargando leads:", e?.message || e);
      setLeadsOptions([]);
    }
    setLoadingLeads(false);
  };

  useEffect(() => {
    if (hipotecaMode === "lead" && activeTab === "hipoteca") {
      fetchLeads();
    }
  }, [hipotecaMode, activeTab]);

  const calcularMotorLocal = (precio: number, ingresos: number) => {
    const tasaAnualPorc = calculoHipoteca.tasa || 4.5;
    const interesDecimal = tasaAnualPorc / 100;
    const plazoAnios = calculoHipoteca.plazo || 20;
    const porcentajeFinanciacion = 0.80;
    const montoPrestamo = precio * porcentajeFinanciacion;
    const cuota = pmt(montoPrestamo, interesDecimal, plazoAnios);
    const dti = ingresos > 0 ? (cuota / ingresos) * 100 : 0;
    
    let score = 0;
    if (dti > 0 && dti < 30) score = 95;
    else if (dti <= 40) score = 80;
    else if (dti <= 50) score = 50;
    else score = 20;

    return { 
        cuota: Math.round(cuota), 
        dti: Math.round(dti), 
        score: score,
        aprobado: dti < 40 && dti > 0,
        financiacion: Math.round(montoPrestamo)
    };
  };

  useEffect(() => {
    if (step === 1 && chat.length === 0) {
      setTimeout(() => {
        setChat([{ 
          role: "bot", 
          text: `¡Hola ${formData.name || "viajero"}! Soy Botz. He recibido tu interés en ${formData.country}. Para iniciar el estudio real, selecciona el valor de la vivienda:`,
          options: ["$150,000", "$300,000", "$500,000"] 
        }]);
      }, 1000);
    }
  }, [step]);

  const handleSendChat = async (text: string) => { 
    // Agregar mensaje del usuario inmediatamente
    setChat(prev => [...prev, { role: "user", text }]);
    setIsTyping(true);

    // Pequeña pausa para simular procesamiento
    await new Promise(resolve => setTimeout(resolve, 800));

    const numeroEncontrado = parseInt(text.replace(/[^0-9]/g, ""));
    let nuevoPrecio = calculoHipoteca.valorVivienda;
    let nuevosIngresos = calculoHipoteca.ingresosMensuales;
    const txt = text.toLowerCase();

    // Detectar valor de vivienda (primer número grande)
    if (calculoHipoteca.valorVivienda === 0 && numeroEncontrado > 10000) {
        nuevoPrecio = numeroEncontrado;
        setCalculoHipoteca(prev => ({ ...prev, valorVivienda: nuevoPrecio }));
        setFormData(prev => ({ ...prev, valorVivienda: nuevoPrecio.toString() }));
        
        setIsTyping(false);
        setChat(prev => [...prev, { 
            role: "bot", 
            text: `¡Perfecto! Vivienda valorada en $${nuevoPrecio.toLocaleString()}.\n\nAhora necesito conocer tus ingresos mensuales brutos para calcular tu capacidad de pago (DTI).`,
            options: ["$2,000", "$3,500", "$5,000", "$8,000", "$12,000"]
        }]);
        return;
    }

    // Detectar ingresos mensuales
    if (calculoHipoteca.valorVivienda > 0 && calculoHipoteca.ingresosMensuales === 0 && numeroEncontrado > 500) {
        nuevosIngresos = numeroEncontrado;
        const resultado = calcularMotorLocal(calculoHipoteca.valorVivienda, nuevosIngresos);
        
        setCalculoHipoteca(prev => ({ 
            ...prev, 
            ingresosMensuales: nuevosIngresos, 
            cuotaEstimada: resultado.cuota, 
            financiacion: resultado.financiacion,
            score: resultado.score,
            dti: resultado.dti,
            aprobado: resultado.aprobado
        }));
        setFormData(prev => ({ ...prev, ingresoMensual: nuevosIngresos.toString() }));
        
        const estado = resultado.aprobado ? "✅ APROBADO" : "⚠️ REVISAR";
        const mensajeDTI = resultado.dti > 40 
            ? `Tu DTI es del ${resultado.dti}%, lo cual es alto. Se recomienda no superar el 40%.`
            : `Tu DTI es del ${resultado.dti}%, dentro del rango saludable (<40%).`;
        
        setIsTyping(false);
        setChat(prev => [...prev, { 
            role: "bot", 
            text: `**${estado}**\n\n📊 **Resultado del Análisis:**\n\n💰 Vivienda: $${calculoHipoteca.valorVivienda.toLocaleString()}\n💵 Ingresos: $${nuevosIngresos.toLocaleString()}/mes\n📈 Cuota estimada: $${resultado.cuota.toLocaleString()}/mes\n📊 Score: ${resultado.score}/100\n\n${mensajeDTI}\n\n¿Qué deseas hacer ahora?`,
            options: ["📄 Descargar Informe", "📅 Agendar Asesoría", "🔄 Nueva Simulación", "💬 Más información"]
        }]);
        return;
    }

    // Manejar opciones de botones y comandos especiales
    setIsTyping(false);
    
    if (txt.includes("pdf") || txt.includes("descargar") || txt.includes("informe")) {
        setChat(prev => [...prev, { 
            role: "bot", 
            text: "📄 **Generando tu informe personalizado...**\n\n✅ Estudio de viabilidad completo\n✅ Análisis DTI detallado\n✅ Recomendaciones personalizadas\n\n📧 El informe ha sido enviado a tu correo registrado. También puedes descargarlo aquí.",
            options: ["📅 Agendar Asesoría", "🔄 Nueva Simulación"]
        }]);
    } 
    else if (txt.includes("cita") || txt.includes("agendar") || txt.includes("asesor")) {
        setChat(prev => [...prev, { 
            role: "bot", 
            text: "📅 **¡Excelente decisión!**\n\nUn asesor hipotecario especializado revisará tu caso en detalle y te contactará en menos de 24 horas vía WhatsApp.\n\n📞 También puedes llamarnos al: +57 300 123 4567",
            options: ["🔄 Nueva Simulación", "💬 Otra pregunta"]
        }]);
    }
    else if (txt.includes("reiniciar") || txt.includes("nueva")) {
        demoReset();
        setTimeout(() => {
            setChat([{ 
                role: "bot", 
                text: `¡Hola de nuevo ${formData.name || "amigo"}! 🏠\n\nVamos a hacer una nueva simulación. ¿Cuál es el valor aproximado de la vivienda que te interesa?`,
                options: ["$150,000", "$250,000", "$350,000", "$500,000", "$750,000+"]
            }]);
        }, 500);
    }
    else if (txt.includes("info") || txt.includes("información")) {
        setChat(prev => [...prev, { 
            role: "bot", 
            text: "💡 **¿Cómo funciona el DTI?**\n\nEl DTI (Debt-to-Income) mide qué porcentaje de tus ingresos se destinará a pagar la hipoteca.\n\n✅ **Ideal:** Menos del 30%\n⚠️ **Aceptable:** 30-40%\n❌ **Riesgoso:** Más del 40%\n\nBancos generalmente rechazan operaciones con DTI superior al 40-45%.",
            options: ["📄 Descargar Informe", "📅 Agendar Asesoría"]
        }]);
    }
    else if (calculoHipoteca.valorVivienda === 0) {
        // Aún no ha proporcionado valor de vivienda
        setChat(prev => [...prev, { 
            role: "bot", 
            text: "Para comenzar el análisis, necesito saber el valor aproximado de la vivienda que te interesa.",
            options: ["$150,000", "$250,000", "$350,000", "$500,000", "$750,000+"]
        }]);
    }
    else if (calculoHipoteca.ingresosMensuales === 0) {
        // Tiene vivienda pero no ingresos
        setChat(prev => [...prev, { 
            role: "bot", 
            text: `Vale, vivienda de $${calculoHipoteca.valorVivienda.toLocaleString()}. Ahora dime tus ingresos mensuales brutos para calcular tu capacidad de endeudamiento.`,
            options: ["$2,000", "$3,500", "$5,000", "$8,000", "$12,000"]
        }]);
    }
    else {
        // Ya tiene ambos datos
        setChat(prev => [...prev, { 
            role: "bot", 
            text: "¿En qué más puedo ayudarte con tu análisis hipotecario?",
            options: ["📄 Descargar Informe", "📅 Agendar Asesoría", "🔄 Nueva Simulación", "💬 Más información"]
        }]);
    }
  };

  const demoReset = () => {
    setIsTyping(false);
    setStep(0);
    setChat([]);
    setFormData({
      name: "", email: "", phone: "", company: "", country: "Colombia",
      interest: "", channel: "WhatsApp" as any, usesWhatsApp: "Sí", hasCRM: "No",
      startWhen: "En 1–3 meses", budgetRange: "2.500 - 5.000",
      ingresoMensual: "", valorVivienda: "", plazoAnios: "20", tieneDeudas: "No",
      aportacion_real: "", edad: "", vivienda_tipo: "", ccaa: ""
    });
    setMetrics({ score: 0, viability: "Pendiente", roi: 0 });
    setCalculoHipoteca({
      cuotaEstimada: 0, financiacion: 0, dti: 0, ltv: 0, prestamoAprobable: 0,
      plazo: 20, tasa: 4.5, aprobado: false, score: 0, 
      ingresosMensuales: 0, valorVivienda: 0, deudasExistentes: 0
    });
  };

  const handleLeadCapture = async (e: React.FormEvent) => { e.preventDefault(); setStep(1); };
  
  const handleContinue = () => {}; 
  const togglePlay = () => {};
  const calcularHipotecaCompleto = () => {}; 
  const testN8nConnection = async () => {};
  const addPopup = (popup: any) => "id"; 
  const removePopup = (id: string) => {};
  const markAllMailAsRead = () => {}; 
  const nowStamp = () => "";

  const botzProps = {
    activeStep, step, showExplanation, isPlaying, popups: [],
    nextButtonEnabled: false, waitingForClick: false,
    formData, chat, metrics, isTyping, draft, mailbox, unreadCount,
    crm, agenda, pending, calculoHipoteca,
    n8nWebhookURL, useRealN8n, n8nStatus, n8nStats,
    setFormData, setChat, setDraft, setActiveStep, setStep,
    setShowExplanation, setIsPlaying, setNextButtonEnabled: () => {},
    setWaitingForClick: () => {}, setMailbox, setUnreadCount, setCrm,
    setAgenda, setPending, setCalculoHipoteca, setN8nWebhookURL,
    setUseRealN8n, setN8nStatus, setN8nStats,
    handleContinue, togglePlay, demoReset, handleLeadCapture,
    calcularHipotecaCompleto, handleSendChat, testN8nConnection,
    addPopup, removePopup, markAllMailAsRead, nowStamp,
    inputDisabled: step < 5, followupTimeoutRef, lastUserMsgAtRef,
    playTimeoutRef, chatEndRef
  };

  const selectedLead = leadsOptions.find(l => l.id === hipotecaLeadId);

  return (
    <MainLayout
      activeTab={activeTab} 
      setActiveTab={setActiveTab}
      showDock={showDock} 
      setShowDock={setShowDock}
      channels={CHANNELS} 
      globalFilter={globalFilter ?? undefined}
      setGlobalFilter={setGlobalFilter}
      botzProps={botzProps as any}
      
      
    >
      {/* ✅ Modal de auth SOLO para usuarios no logueados */}
      <AuthModal
        open={openAuth}
        onClose={() => setOpenAuth(false)}
        onLoggedIn={() => setOpenAuth(false)}
      />
      <ChatBot />

      {activeTab === "demo" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", height: "100%", paddingBottom: "20px", overflowX: "hidden", overflowY: "auto" }}>
          
          <div style={{ flexShrink: 0 }}>
            <ExperienceGuide 
              step={step} 
              formData={formData} 
              chatLength={chat.length} 
              calculoHipoteca={calculoHipoteca} 
              onReset={demoReset} 
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1.2fr", gap: "20px", flexShrink: 0, minHeight: "600px" }}>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", height: "100%", minHeight: 0 }}>
              
              {step === 0 ? (
                <div style={{ flexShrink: 0 }}>
                  <DemoForm {...botzProps as any} />
                </div>
              ) : (
                <div style={{ flexShrink: 0, padding: "10px 16px", background: "rgba(255,255,255,0.05)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: "#8b949e" }}>Lead: <strong style={{ color: "#fff" }}>{formData.name || "Usuario"}</strong></span>
                  <span style={{ fontSize: "10px", color: "#22d3ee" }}>● En vivo (Automatización)</span>
                </div>
              )}

              <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                 <ChatBox chat={chat} isTyping={isTyping} onSend={handleSendChat} />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>
              <LiveSystemMonitor formData={formData} calculoHipoteca={calculoHipoteca} step={step} />
            </div>

          </div>

          <div style={{ marginTop: "40px", flexShrink: 0 }}>
             <IntegrationsSection />
          </div>

        </div>
      )}

      {user && activeTab === "kanban" && <KanbanBoard globalFilter={globalFilter ?? undefined} />} 
      
      {user && activeTab === "sla" && <SLAControlCenter />}
      
      {user && activeTab === "n8n-config" && (isAdmin || isPlatformAdmin || hasPermission("view_exec_dashboard")) && (
        <ExecutiveDashboard filter={globalFilter ?? undefined} />
      )}
      {user && activeTab === "n8n-config" && isAsesor && !(isAdmin || isPlatformAdmin || hasPermission("view_exec_dashboard")) && (
        <div style={{
          display: "flex",
          alignItems: "center", 
          justifyContent: "center",
          height: "400px",
          color: "#94a3b8"
        }}>
          <div style={{ textAlign: "center" }}>
            <ShieldCheck size={48} style={{ marginBottom: "16px", opacity: 0.5 }} />
            <h3 style={{ fontSize: "18px", marginBottom: "8px" }}>Acceso Restringido</h3>
            <p>Esta función requiere permisos de Dashboard Ejecutivo</p>
          </div>
        </div>
      )}

      {/* Tabs restringidos: si no hay usuario, ocultar contenido */}
      {!user && !authLoading && activeTab !== "demo" && (
        <div style={{
          height: "calc(100vh - 120px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          color: "#94a3b8",
          textAlign: "center",
        }}>
          <div style={{
            maxWidth: "520px",
            width: "100%",
            padding: "18px 16px",
            borderRadius: "14px",
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.03)",
          }}>
            <div style={{ fontSize: "15px", fontWeight: 800, color: "#e2e8f0" }}>
              {language === "en" ? "Sign in to continue" : "Inicia sesión para continuar"}
            </div>
            <div style={{ marginTop: "8px", fontSize: "12px", lineHeight: 1.4 }}>
              {language === "en"
                ? "This section requires an account. The live demo remains available."
                : "Esta sección requiere cuenta. La demo en vivo sigue disponible."}
            </div>
          </div>
        </div>
      )}

      {user && activeTab === "tenants" && (isPlatformAdmin ? <PlatformTenantsView /> : null)}

      {user && activeTab === "agents" && (isAdmin || isPlatformAdmin || hasPermission("manage_agents") ? <AgentsStudio /> : null)}

      {user && activeTab === "hipoteca" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", height: "100%", overflowY: "auto" }}>
          {/* Barra de control */}
          <div
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              padding: "12px 16px",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "12px", color: "#8b949e" }}>{t.mode}</span>

              <button
                onClick={() => setHipotecaMode("manual")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: hipotecaMode === "manual" ? "rgba(34, 211, 238, 0.14)" : "rgba(255,255,255,0.04)",
                  color: hipotecaMode === "manual" ? "#22d3ee" : "#cbd5e1",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {t.manual}
              </button>

              <button
                onClick={() => setHipotecaMode("lead")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: hipotecaMode === "lead" ? "rgba(34, 211, 238, 0.14)" : "rgba(255,255,255,0.04)",
                  color: hipotecaMode === "lead" ? "#22d3ee" : "#cbd5e1",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {t.leadAuto}
              </button>

              {hipotecaMode === "lead" && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "8px" }}>
                    <Users size={16} color="#64748b" />
                    <select
                      value={hipotecaLeadId}
                      onChange={(e) => setHipotecaLeadId(e.target.value)}
                      style={{
                        minWidth: "280px",
                        maxWidth: "400px",
                        padding: "8px 12px",
                        borderRadius: "10px",
                        border: "1px solid rgba(255,255,255,0.15)",
                        background: "rgba(0,0,0,0.3)",
                        color: "#fff",
                        fontSize: "12px",
                        cursor: "pointer",
                        outline: "none",
                      }}
                    >
                      <option value="">{t.selectLead}</option>
                      {leadsOptions.map((lead) => (
                        <option key={lead.id} value={lead.id}>
                         {lead.name || t.unnamed}
                         {lead.phone ? ` - ${lead.phone}` : ""}
                        {lead.created_at ? ` - ${timeAgo(lead.created_at, language)}` : ""}

                        </option>
                      ))}
                    </select>
                    
                    <button
                      onClick={fetchLeads}
                      disabled={loadingLeads}
                      style={{
                        padding: "8px",
                        borderRadius: "8px",
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "rgba(255,255,255,0.05)",
                        color: "#94a3b8",
                        cursor: loadingLeads ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      title={t.refreshLeads}
                    >
                      <RefreshCw size={14} className={loadingLeads ? "animate-spin" : ""} />
                    </button>
                  </div>

                  {selectedLead && (
                    <div style={{
                      marginLeft: "8px",
                      padding: "4px 10px",
                      background: "rgba(34, 197, 94, 0.1)",
                      border: "1px solid rgba(34, 197, 94, 0.3)",
                      borderRadius: "6px",
                      fontSize: "11px",
                      color: "#22c55e",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}>
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e" }} />
                      {t.connected}
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {hipotecaMode === "manual" ? (
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                  {t.manualHint}
                </span>
              ) : (
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                  {leadsOptions.length > 0 
                    ? t.leadsAvailable(leadsOptions.length)
                    : loadingLeads ? t.loading : t.noLeads
                  }
                </span>
              )}
            </div>
          </div>

          {/* Vista de Hipoteca */}
          <div style={{ flex: 1, minHeight: 0 }}>
            <HipotecaView
              leadId={hipotecaMode === "lead" ? (hipotecaLeadId || undefined) : undefined}
              calculo={calculoHipoteca}
              mode={hipotecaMode}
            />
          </div>
        </div>
      )}

      {user && activeTab === "channels" && <ChannelsView channels={CHANNELS} />}
      
      {user && activeTab === "crm" && <CRMFullView globalFilter={globalFilter ?? undefined} />}

      {user && activeTab === "control-center" && (
        <CRMFullView
          globalFilter={globalFilter ?? undefined}
          openControlCenter
          initialControlTab="canales"
          onControlCenterClose={() => setActiveTab("crm")}
        />
      )}
      
      {user && activeTab === "metrics" && <MetricsFullView metrics={metrics as any} />} 

    </MainLayout>
  );
}
