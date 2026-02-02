"use client";

import React, { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation"; 
import MainLayout, { useAuth } from "./MainLayout";
import DemoForm from "./components/DemoForm";
import DemoProgress from "./components/DemoProgress";
import ChatBox, { ChatMsg } from "./components/ChatBox"; 
import ChannelsView from "./components/ChannelsView";
import HipotecaView from "./components/HipotecaView";
import CRMFullView from "./components/CRMFullView";
import MetricsFullView from "./components/MetricsFullView"; 
import ExecutiveDashboard from "./components/ExecutiveDashboard"; 
import ExperienceGuide from "./components/ExperienceGuide"; 
import LiveSystemMonitor from "./components/LiveSystemMonitor"; 
import IntegrationsSection from "./components/IntegrationsSection"; 
import KanbanBoard from "./components/KanbanBoard";
import SLAControlCenter from "./components/SLAControlCenter";
import { supabase } from "./components/supabaseClient";
import AuthModal from "./components/AuthModal";
import ChatBot from "@/components/ChatBot";




import { 
  FaWhatsapp, FaFacebook, FaInstagram, FaGoogle, 
  FaMeta, FaTiktok, FaTelegram, FaShopify 
} from "react-icons/fa6";
import { RefreshCw, Users } from "lucide-react"; 

type Tab = "demo" | "channels" | "crm" | "metrics" | "kanban" | "hipoteca" | "n8n-config" | "sla";

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

const N8N_WEBHOOK_URL = "/api/n8n"; 

function pmt(principal: number, annualRate: number, years: number) {
  if (!principal || principal <= 0 || !years || years <= 0) return 0;
  const r = (annualRate || 0) / 12;
  const n = Math.round(years * 12);
  if (n <= 0) return 0;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "ahora";
  if (diffMins < 60) return `hace ${diffMins}m`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays < 7) return `hace ${diffDays}d`;
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

export default function BotzLandingExperience() {
  const router = useRouter(); 
  
  // ✅ Usar el contexto de autenticación
  const { user, loading: authLoading } = useAuth();
  
  const [activeTab, setActiveTab] = useState<Tab>("demo");
  const [hipotecaMode, setHipotecaMode] = useState<"manual" | "lead">("manual");
  const [hipotecaLeadId, setHipotecaLeadId] = useState<string>("");
  const [step, setStep] = useState(0);
  const [activeStep, setActiveStep] = useState(0); 
  const [showExplanation, setShowExplanation] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showDock, setShowDock] = useState(false);
  const [openAuth, setOpenAuth] = useState(false);

  
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

  const [n8nWebhookURL, setN8nWebhookURL] = useState(N8N_WEBHOOK_URL);
  const [useRealN8n, setUseRealN8n] = useState(true);
  const [n8nStatus, setN8nStatus] = useState<string>("disconnected");
  const [n8nStats, setN8nStats] = useState({ leadsEnviados: 0, mensajesProcesados: 0, ultimoEnvio: "--:--", errores: 0 });

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const followupTimeoutRef = useRef<any>(null);
  const lastUserMsgAtRef = useRef<number>(0);
  const playTimeoutRef = useRef<any>(null);

  // ✅ Solo mostrar modal de auth si NO hay usuario Y ya terminó de cargar
  useEffect(() => {
    if (!authLoading && !user) {
      setOpenAuth(true);
    } else if (user) {
      setOpenAuth(false);
    }
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
    setChat(prev => [...prev, { role: "user", text }]);
    setIsTyping(true);

    const numeroEncontrado = parseInt(text.replace(/[^0-9]/g, ""));
    let nuevoPrecio = calculoHipoteca.valorVivienda;
    let nuevosIngresos = calculoHipoteca.ingresosMensuales;

    if (calculoHipoteca.valorVivienda === 0 && numeroEncontrado > 10000) {
        nuevoPrecio = numeroEncontrado;
        setCalculoHipoteca(prev => ({ ...prev, valorVivienda: nuevoPrecio }));
        setFormData(prev => ({ ...prev, valorVivienda: nuevoPrecio.toString() }));
    } else if (numeroEncontrado > 500) {
        nuevosIngresos = numeroEncontrado;
        const local = calcularMotorLocal(nuevoPrecio, nuevosIngresos);
        setCalculoHipoteca(prev => ({ 
            ...prev, 
            ingresosMensuales: nuevosIngresos, 
            cuotaEstimada: local.cuota, 
            financiacion: local.financiacion,
            score: local.score,
            dti: local.dti,
            aprobado: local.aprobado
        }));
        setFormData(prev => ({ ...prev, ingresoMensual: nuevosIngresos.toString() }));
    }

    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          precio: nuevoPrecio,
          ingresos: nuevosIngresos,
          edad: 35,
          tasa: calculoHipoteca.tasa,
          plazo: calculoHipoteca.plazo,
          respuesta_whatsapp: text,
          nombre: formData.name || "Visitante Web",
          email: formData.email,
          phone: formData.phone || "573000000000",
          pais: formData.country,
          interes: formData.interest,
          empresa: formData.company,
          source: "web_demo"
        })
      });

      const data = await response.json();
      setIsTyping(false);

      if (data.calculo) {
        const c = data.calculo;
        setCalculoHipoteca(prev => ({
          ...prev,
          cuotaEstimada: c.cuotaMensual,
          dti: c.dti,
          score: c.score,
          aprobado: c.viabilidad
        }));
      }

      if (data.mensaje_bot) {
         setChat(prev => [...prev, { role: "bot", text: data.mensaje_bot }]);
      } 
      else {
         const txt = text.toLowerCase();
         if (txt.includes("pdf") || txt.includes("descargar")) {
            setChat(prev => [...prev, { 
                role: "bot", 
                text: "📄 **Generando Informe...**\n\nAquí tienes tu estudio de viabilidad detallado listo para descargar.",
                options: ["📅 Agendar Cita con Asesor", "🔄 Reiniciar Simulación"]
            }]);
         } 
         else if (txt.includes("cita") || txt.includes("agendar")) {
            setChat(prev => [...prev, { 
                role: "bot", 
                text: "📅 **Agenda Confirmada**\n\nUn asesor hipotecario revisará tu caso y te contactará en breve al WhatsApp registrado.",
                options: ["🔄 Reiniciar"]
            }]);
         }
         else if (nuevosIngresos === 0) {
             setChat(prev => [...prev, { 
                 role: "bot", 
                 text: `Entendido ($${nuevoPrecio.toLocaleString()}). Ahora necesito saber tus ingresos mensuales para calcular tu DTI.`,
                 options: ["$2,000", "$4,000", "$8,000"]
             }]);
         } 
         else if (numeroEncontrado > 0) {
             const resultadoTexto = calculoHipoteca.aprobado ? "VIABLE ✅" : "DTI ALTO ⚠️";
             setChat(prev => [...prev, { 
                 role: "bot", 
                 text: `✅ **Cálculo Oficial Completado**\n\n• Cuota Real: **$${(data.calculo?.cuotaMensual || calculoHipoteca.cuotaEstimada).toLocaleString()}**\n• Score de Riesgo: **${data.calculo?.score || calculoHipoteca.score}/100**\n\nEl sistema indica que la operación es: **${resultadoTexto}**`,
                 options: ["📄 Ver PDF Detallado", "📅 Agendar Cita"]
             }]);
         }
         else {
             setChat(prev => [...prev, { 
                 role: "bot", 
                 text: "¿En qué más puedo ayudarte con tu hipoteca?",
                 options: ["📄 Ver PDF Detallado", "📅 Agendar Cita"]
             }]);
         }
      }

    } catch (error) {
      console.error("Error n8n:", error);
      setIsTyping(false);
      if (nuevosIngresos === 0) {
          setChat(prev => [...prev, { role: "bot", text: "Anotado. ¿Cuáles son tus ingresos mensuales?", options: ["$3,000", "$5,000"] }]);
      } else {
          const txt = text.toLowerCase();
          if (txt.includes("pdf")) {
            setChat(prev => [...prev, { role: "bot", text: "📄 Aquí tienes tu PDF (Modo Offline)." }]);
          } else {
            setChat(prev => [...prev, { role: "bot", text: "Cálculo listo. ¿Quieres ver el detalle?" }]);
          }
      }
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
                  <span style={{ fontSize: "10px", color: "#22d3ee" }}>● En vivo (Motor n8n)</span>
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

      {activeTab === "kanban" && <KanbanBoard globalFilter={globalFilter ?? undefined} />} 
      
      {activeTab === "sla" && <SLAControlCenter />}
      
      {activeTab === "n8n-config" && <ExecutiveDashboard filter={globalFilter ?? undefined} />} 

      {activeTab === "hipoteca" && (
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
              <span style={{ fontSize: "12px", color: "#8b949e" }}>Modo:</span>

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
                Manual
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
                Lead (Auto)
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
                      <option value="">-- Selecciona un Lead --</option>
                      {leadsOptions.map((lead) => (
                        <option key={lead.id} value={lead.id}>
                         {lead.name || "Sin nombre"}
                         {lead.phone ? ` - ${lead.phone}` : ""}
                        {lead.created_at ? ` - ${timeAgo(lead.created_at)}` : ""}

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
                      title="Refrescar lista de leads"
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
                      Conectado
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {hipotecaMode === "manual" ? (
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                  Simulación manual con datos personalizados
                </span>
              ) : (
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                  {leadsOptions.length > 0 
                    ? `${leadsOptions.length} leads disponibles` 
                    : loadingLeads ? "Cargando..." : "Sin leads"
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

      {activeTab === "channels" && <ChannelsView channels={CHANNELS} />}
      
      {activeTab === "crm" && <CRMFullView globalFilter={globalFilter ?? undefined} />} 
      
      {activeTab === "metrics" && <MetricsFullView metrics={metrics as any} />} 

    </MainLayout>
  );
}