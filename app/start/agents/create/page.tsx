"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/app/supabaseClient";
import AuthModal from "@/app/start/agents/components/AgentsAuthModal";
import { authedFetch, AuthRequiredError } from "@/app/start/_utils/authedFetch";
import VoiceTestPanel from "@/app/start/agents/components/VoiceTestPanel";
import ChatTestPanel from "@/app/start/agents/components/ChatTestPanel";
import AgentMetrics from "@/app/start/agents/components/AgentMetrics";
import FileUploadPanel from "@/app/start/agents/components/FileUploadPanel";


const C = {
  bg:      "#1a1d26",
  dark:    "#111318",
  card:    "#22262d",
  hover:   "#2a2e36",
  border:  "rgba(255,255,255,0.08)",
  blue:    "#0096ff",
  lime:    "#a3e635",
  white:   "#ffffff",
  muted:   "#9ca3af",
  dim:     "#6b7280",
  red:     "#ef4444",
};

type AgentType = "voice" | "text" | "flow";
type AgentKind = "agent" | "notetaker";

const asType = (v: string | null): AgentType | null => {
  if (v === "voice" || v === "text" || v === "flow") return v;
  return null;
};

const asKind = (v: string | null): AgentKind => (v === "notetaker" ? "notetaker" : "agent");

const getSteps = (type: AgentType, kind: AgentKind) => {
  if (kind === "notetaker") {
    return [
      { id: 1, label: "Contexto de la empresa", required: true },
      { id: 2, label: "Configurar notetaker", required: true },
      { id: 3, label: "Prueba", required: false },
    ];
  }
  if (type === "flow") {
    return [
      { id: 1, label: "Contexto de la empresa", required: true },
      { id: 2, label: "Contexto del flujo", required: true },
      { id: 3, label: "Prueba", required: false },
    ];
  }
  if (type === "text") {
    return [
      { id: 1, label: "Contexto de la empresa", required: true },
      { id: 2, label: "Contexto del agente", required: true },
      { id: 3, label: "Entrena tu agente", required: false },
      { id: 4, label: "Prueba tu agente", required: false },
    ];
  }
  return [
    { id: 1, label: "Contexto de la empresa", required: true },
    { id: 2, label: "Contexto del agente", required: true },
    { id: 3, label: "Prueba tu agente", required: false },
  ];
};

const titleFor = (type: AgentType, kind: AgentKind) => {
  if (kind === "notetaker") return "Notetaker";
  if (type === "voice") return "Agente de Voz";
  if (type === "text") return "Agente de Texto";
  return "Flujo";
};

const TEMPLATE_PRESETS: Record<string, { type: AgentType; kind?: AgentKind; agentName?: string; agentRole?: string; agentPrompt?: string }> = {
  lia: {
    type: "voice",
    agentName: "Lia",
    agentRole: "Calificadora de Leads",
    agentPrompt: "Eres Lia, una representante de ventas profesional y amable. Tu objetivo es calificar leads entrantes con preguntas claras sobre presupuesto, tiempo y necesidad. Si el lead califica, propon una siguiente accion (agendar llamada o cita).",
  },
  alex: {
    type: "voice",
    agentName: "Alex",
    agentRole: "Prospeccion en frio",
    agentPrompt: "Eres Alex, un vendedor directo y respetuoso. Tu objetivo es iniciar una conversacion breve, validar interes y calificar una oportunidad. Si hay interes, agenda una siguiente accion.",
  },
  julia: {
    type: "text",
    agentName: "Julia",
    agentRole: "Asistente recepcionista",
    agentPrompt: "Eres Julia, una recepcionista virtual. Respondes preguntas frecuentes, recoges datos de contacto y agendas citas. Si el usuario necesita un humano, ofreces una escalacion.",
  },
  "flow-lead-intake": {
    type: "flow",
    agentName: "Lead Intake",
    agentRole: "Captura y enruta leads",
    agentPrompt: "Flujo para capturar un lead, validar datos y enrutar a ventas.",
  },
};

const LANGUAGE_OPTIONS = [
  { value: "es-ES", label: "Español - España" },
  { value: "es-MX", label: "Español - LatAm" },
  { value: "en-US", label: "English - US" },
];

const PURPOSE_OPTIONS = [
  { value: "agente_ventas_ecommerce", label: "Agente De Ventas De Ecommerce" },
  { value: "asistente_personalizado", label: "Asistente Personalizado" },
  { value: "servicio_cliente", label: "Servicio al cliente" },
  { value: "recepcionista", label: "Recepcionista" },
  { value: "cualificacion_leads", label: "Calificacion de leads" },
];

export default function CreateAgentPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const typeParam    = asType(searchParams.get("type"));
  const kindParam    = asKind(searchParams.get("kind"));
  const tplParam     = searchParams.get("template");

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [kind, setKind] = useState<AgentKind>(kindParam);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [authUser, setAuthUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [openAuth, setOpenAuth] = useState(false);

  const [form, setForm] = useState({
    companyName:  "",
    companyUrl:   "",
    companyDesc:  "",
    agentName:    "",
    agentRole:    "",
    agentPrompt:  "",
    voice:        "nova",
    language:     "es-ES",
    type:         typeParam || "voice",
    integrations: [] as string[],

    // voice (agents)
    callDirection: "inbound" as "inbound" | "outbound" | "both",
    greeting: "",
    transferNumber: "",

    // text
    channelWhatsapp: true,
    channelWeb: true,
    escalationEmail: "",
    tone: "professional" as "professional" | "friendly" | "direct",
    brainTab: "web" as "web" | "files",
    brainWebsiteUrl: "",
    brainLastRun: "",
    brainFiles: [] as { name: string; content: string; type: string }[],

    // flow
    flowTrigger: "webhook" as "webhook" | "schedule" | "event",
    flowTemplate: "",

    // notetaker
    notetakerSource: "call" as "call" | "meeting" | "upload",
    notetakerSummary: true,
    notetakerActionItems: true,
    notetakerSendEmail: false,
  });

  const steps = getSteps(form.type as AgentType, kind);

  // ✅ IMPORTANTE: Agentes requiere login COMPLETAMENTE independiente
  useEffect(() => {
    let mounted = true;
    
    const initCreate = async () => {
      const { data } = await supabase.auth.getSession();
      const u = data?.session?.user || null;
      const isAgentsMode = typeof window !== "undefined" ? localStorage.getItem("botz-agents-mode") === "true" : false;
      
      console.log("🔑 [Agentes Create] Init:", { user: u?.email, isAgentsMode });
      
      if (!mounted) return;
      
      if (u && isAgentsMode) {
        // ✅ Sesión de Agentes válida
        setAuthUser(u);
        setAuthLoading(false);
        setOpenAuth(false);
      } else if (u && !isAgentsMode) {
        // 🚫 Sesión de Botz Platform - forzar logout
        console.log("🚫 [Agentes Create] Logout de Botz Platform");
        await supabase.auth.signOut();
        setAuthUser(null);
        setAuthLoading(false);
        setOpenAuth(true);
      } else {
        // No hay sesión
        setAuthUser(null);
        setAuthLoading(false);
        setOpenAuth(true);
      }
    };
    
    initCreate();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user || null;
      if (event === "SIGNED_IN" && u) {
        localStorage.setItem("botz-agents-mode", "true");
        setAuthUser(u);
        setOpenAuth(false);
      } else if (event === "SIGNED_OUT") {
        setAuthUser(null);
        setOpenAuth(true);
      }
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 820);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // keep kind/type in sync with query
  useEffect(() => {
    if (typeParam) setForm(f => ({ ...f, type: typeParam }));
  }, [typeParam]);

  useEffect(() => {
    setKind(kindParam);
  }, [kindParam]);

  useEffect(() => {
    if (step > steps.length) setStep(steps.length);
  }, [step, steps.length]);

  useEffect(() => {
    if (form.type !== "text") return;
    if (form.brainWebsiteUrl) return;
    if (!form.companyUrl) return;
    setForm(f => (f.brainWebsiteUrl ? f : { ...f, brainWebsiteUrl: f.companyUrl }));
  }, [form.type, form.companyUrl, form.brainWebsiteUrl]);

  /* load template defaults */
  useEffect(() => {
    if (!tplParam) return;
    const preset = TEMPLATE_PRESETS[tplParam];
    if (!preset) return;
    setForm(f => ({
      ...f,
      type: preset.type,
      agentName: preset.agentName ?? f.agentName,
      agentRole: preset.agentRole ?? f.agentRole,
      agentPrompt: preset.agentPrompt ?? f.agentPrompt,
      flowTemplate: preset.type === "flow" ? tplParam : f.flowTemplate,
    }));
    if (preset.kind) setKind(preset.kind);
  }, [tplParam]);

  const updateQuery = (next: { type?: AgentType; kind?: AgentKind; template?: string | null }) => {
    const t = next.type ?? (form.type as AgentType);
    const k = next.kind ?? kind;
    const q = new URLSearchParams();
    q.set("type", t);
    if (k === "notetaker") q.set("kind", "notetaker");
    if (next.template) q.set("template", next.template);
    router.replace(`/start/agents/create?${q.toString()}`);
  };

  const genCompanyContext = async () => {
    const url = form.companyUrl.trim();
    if (!url) {
      alert("Agrega una URL del sitio web");
      return;
    }
    setContextLoading(true);
    setContextError(null);
    try {
      const res = await fetch("/api/agents/company-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo generar contexto");
      const suggestion = String(json?.suggested_company_desc || "").trim();
      if (suggestion) {
        setForm(f => ({
          ...f,
          companyDesc: f.companyDesc.trim()
            ? `${f.companyDesc.trim()}\n\n${suggestion}`
            : suggestion,
        }));
      }
    } catch (e: any) {
      setContextError(e?.message || "No se pudo generar contexto");
    } finally {
      setContextLoading(false);
    }
  };

  const startBrainTraining = async () => {
    // UI-only for now; stores a timestamp so user sees progress.
    if (!form.brainWebsiteUrl.trim()) {
      alert("Agrega una URL del sitio web");
      return;
    }
    setForm(f => ({ ...f, brainLastRun: new Date().toISOString() }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const agentType: AgentType = (kind === "notetaker") ? "voice" : (form.type as AgentType);

      const configuration: any = {
        agent_kind: kind,
        company_name: form.companyName,
        company_url: form.companyUrl,
        company_desc: form.companyDesc,
        language: form.language,
        identity_name: form.agentName,
        purpose: form.agentRole,
      };

      if (agentType === "flow") {
        configuration.flow = {
          trigger_type: form.flowTrigger,
          template: form.flowTemplate,
          goal: form.agentRole,
          notes: form.agentPrompt,
        };
      } else if (kind === "notetaker") {
        configuration.notetaker = {
          source: form.notetakerSource,
          outputs: {
            summary: form.notetakerSummary,
            action_items: form.notetakerActionItems,
          },
          send_email: form.notetakerSendEmail,
        };
      } else {
        configuration.important_instructions = form.agentPrompt;
        configuration.system_prompt = form.agentPrompt;
        configuration.tone = form.tone;
        configuration.channels = {
          whatsapp: !!form.channelWhatsapp,
          web: !!form.channelWeb,
        };
        if (agentType === "text") {
          configuration.escalation_email = form.escalationEmail;
          configuration.brain = {
            website_url: form.brainWebsiteUrl,
            last_run: form.brainLastRun,
            files: form.brainFiles.map(f => ({
              name: f.name,
              size: f.content.length,
              type: f.type,
            })),
          };
        }
        if (agentType === "voice") {
          configuration.voice = {
            call_direction: form.callDirection,
            greeting: form.greeting,
            transfer_number: form.transferNumber,
          };
        }
      }

      const res = await authedFetch("/api/agents/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.agentName || form.companyName || "Nuevo agente",
          type: agentType,
          description: form.agentRole,
          configuration,
          voice_settings: agentType === "voice" ? { voice_id: form.voice } : null,
          status: "draft",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo crear");
      router.push(`/start/agents/${json.data.id}`);
    } catch (err) {
      if (err instanceof AuthRequiredError) setOpenAuth(true);
      console.error(err);
      const msg = (err as any)?.message || "Error al crear el agente";
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  /* ── inline style helpers ── */
  const fl = (extra?: React.CSSProperties): React.CSSProperties => ({ display: "flex", ...extra });
  const input = (extra?: React.CSSProperties): React.CSSProperties => ({
    width: "100%", boxSizing: "border-box" as const,
    padding: "14px 18px",
    backgroundColor: C.dark, border: `1px solid ${C.border}`,
    borderRadius: 10, color: C.white, fontSize: 15, outline: "none",
    ...extra,
  });

  /* ── left-panel text per step ── */
  const leftContent: Record<number, { title: string; body: string }> = {
    1: {
      title: "¡Hola!\nCuéntanos sobre tu empresa",
      body: "Enseña a tu agente todo lo relacionado con tu empresa. Esta sección puede ser reutilizada en otros agentes.",
    },
    2: kind === "notetaker"
      ? {
          title: "Configura tu notetaker",
          body: "Define la fuente y el formato de salida para resumir, extraer acuerdos y acciones.",
        }
      : (form.type === "flow"
          ? {
              title: "Contexto del flujo",
              body: "Define el objetivo y una base. Luego podrás editar nodos e integraciones.",
            }
          : {
              title: "¡Hola!\nEstás a punto de crear tu agente.",
              body: "Elige el idioma, asigna un nombre y define el propósito. Estos pasos dan forma a la identidad y al objetivo desde el inicio.",
            }),
    3: (form.type === "text" && kind !== "notetaker")
      ? {
          title: "Construye tu cerebro",
          body: "Mejora el conocimiento de tu agente importando información de un sitio web o archivos. Puedes omitir este paso si no necesitas formación.",
        }
      : {
          title: "Prueba tu agente",
          body: "Prueba antes de activarlo para asegurarte de que responde como esperas.",
        },
    4: {
      title: "Instrucciones",
      body: "Ingresa las instrucciones específicas para tu agente o selecciona y edita una de las plantillas predefinidas.",
    },
  };

  const left = leftContent[step];

  const pageTitle = titleFor((form.type as AgentType), kind);

  const isTextTestStep = (form.type === "text" && kind !== "notetaker" && step === 4);

  const step1Ok = !!form.companyName.trim() && !!form.companyDesc.trim();
  const step2Ok = (() => {
    if (kind === "notetaker") {
      const outputsOk = !!form.notetakerSummary || !!form.notetakerActionItems;
      return !!form.agentName.trim() && !!form.agentRole.trim() && outputsOk;
    }
    if (form.type === "flow") {
      return !!form.agentName.trim() && !!form.agentRole.trim();
    }
    return !!form.agentName.trim() && !!form.agentRole.trim() && !!form.agentPrompt.trim();
  })();
  const canContinue = step === 1 ? step1Ok : step === 2 ? step2Ok : true;

  return (
    /* ── full-screen overlay (dark page, no sidebar here) ── */
    <div style={{ minHeight: "100vh", backgroundColor: C.bg, display: "flex", flexDirection: "column", fontFamily: "Inter,-apple-system,sans-serif", color: C.white }}>

      <AuthModal
        open={openAuth}
        onClose={() => {
          setOpenAuth(false);
          router.push("/");
        }}
         onLoggedIn={() => {
           setOpenAuth(false);
         }}
       />

      {/* ── top bar ── */}
      <div style={{ height: 60, borderBottom: `1px solid ${C.border}`, ...fl({ alignItems: "center", justifyContent: "space-between", padding: "0 36px" }), backgroundColor: C.dark, position: "sticky", top: 0, zIndex: 20 }}>
        <button
          onClick={() => router.push("/start/agents")}
          style={{ ...fl({ alignItems: "center", gap: 8 }), background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14 }}
        >
          ‹ Volver
        </button>
        <span style={{ fontWeight: 700, fontSize: 16, color: C.white }}>
          {pageTitle}
        </span>
        <button
          onClick={() => router.push("/start/agents")}
          style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 20 }}
        >
          ✕
        </button>
      </div>

      {/* ── stepper ── */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "26px 56px 6px", backgroundColor: C.dark }}>
        <div style={{ ...fl({ alignItems: "flex-start", gap: 0 }), maxWidth: 1120, margin: "0 auto" }}>
          {steps.map((s, idx) => {
            const active = s.id === step;
            const done   = s.id < step;
            return (
              <div key={s.id} style={{ flex: 1, ...fl({ flexDirection: "column", alignItems: "center" }) }}>
                {/* connector + circle row */}
                <div style={{ ...fl({ alignItems: "center" }), width: "100%" }}>
                  {/* left line */}
                  {idx > 0 && <div style={{ flex: 1, height: 2, backgroundColor: done || active ? C.blue : C.border }} />}
                  {/* circle */}
                   <div style={{
                     width: 50, height: 50, borderRadius: "50%",
                     backgroundColor: active ? C.blue : done ? `${C.blue}44` : "transparent",
                     border: `2px solid ${active || done ? C.blue : C.border}`,
                     ...fl({ alignItems: "center", justifyContent: "center" }),
                     flexShrink: 0,
                   }}>
                     <span style={{ fontSize: 18, fontWeight: 800, color: active || done ? C.white : C.dim }}>{s.id}</span>
                   </div>
                  {/* right line */}
                  {idx < steps.length - 1 && <div style={{ flex: 1, height: 2, backgroundColor: done ? C.blue : C.border }} />}
                </div>
                 {/* label */}
                 <div style={{ marginTop: 8, marginBottom: 12, textAlign: "center" }}>
                   <span style={{ fontSize: 15, fontWeight: active ? 700 : 400, color: active ? C.blue : C.muted }}>
                     {s.label}{s.required && <span style={{ color: C.red }}>*</span>}
                   </span>
                 </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── content ── */}
       <div style={{ flex: 1, padding: isMobile ? "24px 20px" : "36px 40px", maxWidth: 1180, margin: "0 auto", width: "100%" }}>
          <div style={{ display: "flex", flexDirection: isTextTestStep ? "column" : "row", gap: isMobile ? 20 : 48 }}>

           {/* LEFT – description */}
            <div style={{ flex: isTextTestStep ? "1 1 100%" : "0 0 320px", minWidth: 0 }}>
             {isTextTestStep ? (
               <>
                 <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 12px", lineHeight: 1.2 }}>
                   📝 Instrucciones del Agente
                 </h2>
                 <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.6, margin: "0 0 14px" }}>
                   Define el comportamiento y las respuestas del agente de texto.
                 </p>
                  <textarea
                    value={form.agentPrompt}
                    onChange={e => setForm(f => ({ ...f, agentPrompt: e.target.value }))}
                    rows={10}
                    placeholder="Ejemplo: Eres un asistente de ventas amable y profesional. Ayuda a los clientes, responde preguntas sobre productos. ⚠️ NO INCLUYAS: 'no puedo', 'solo puedo de texto', 'limitaciones técnicas'"
                    style={{ ...input({ minHeight: 100, fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace", fontSize: 12 }), resize: "vertical" as const }}
                  />
                 <div style={{ marginTop: 12 }}>
                   <button
                     type="button"
                     style={{ padding: "14px 20px", borderRadius: 8, border: `1px solid ${C.lime}`, backgroundColor: "transparent", color: C.lime, fontWeight: 700, fontSize: 14, cursor: "pointer" }}
                   >
                     ✦ Generar con IA
                   </button>
                 </div>
               </>
             ) : (
              <>
                <h2 style={{ fontSize: isMobile ? 26 : 28, fontWeight: 800, margin: "0 0 12px", lineHeight: 1.2, whiteSpace: "pre-line" }}>
                   {left.title}
                 </h2>
                <p style={{ color: C.muted, fontSize: 15, lineHeight: 1.7, margin: 0 }}>
                  {left.body}
                </p>
              </>
            )}
          </div>

          {/* RIGHT – form */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>

            {isTextTestStep ? (
               <>
                 <div style={{ backgroundColor: C.dark, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20, minHeight: 500, flex: 1, display: "flex", flexDirection: "column" }}>
                   <ChatTestPanel
                     agentName={form.agentName || "Agente"}
                     agentRole={form.agentRole}
                     agentPrompt={form.agentPrompt}
                     companyContext={form.companyDesc}
                     brainFiles={form.brainFiles}
                   />
                 </div>
              </>
            ) : (
              <>

            {/* ── STEP 1: Company context ── */}
            {step === 1 && (
              <>
                <div>
                  <label style={{ fontSize: 16, fontWeight: 700, display: "block", marginBottom: 9 }}>
                    Nombre de la empresa: <span style={{ color: C.red }}>*</span>
                    <span style={{ marginLeft: 6, color: C.dim, fontWeight: 400 }}>ⓘ</span>
                  </label>
                  <input
                    value={form.companyName}
                    onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                    placeholder="Escribe el nombre oficial de la empresa"
                    style={input()}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 16, fontWeight: 700, display: "block", marginBottom: 9 }}>
                    URL del sitio web
                  </label>
                  <div style={fl({ gap: 10 })}>
                    <input
                      value={form.companyUrl}
                      onChange={e => setForm(f => ({ ...f, companyUrl: e.target.value }))}
                      placeholder="https://example.com"
                      style={input({ flex: 1 })}
                    />
                    <button style={{
                      ...fl({ alignItems: "center", gap: 6 }),
                      padding: "0 18px", borderRadius: 10,
                      backgroundColor: "transparent",
                      border: `1px solid ${C.lime}`,
                      color: C.lime, fontWeight: 800, fontSize: 14, cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                    onClick={genCompanyContext}
                    disabled={contextLoading}
                    >
                      {contextLoading ? "Generando..." : "Generar contexto"}
                    </button>
                  </div>
                  {contextError && (
                    <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 8, backgroundColor: "rgba(239,68,68,.12)", border: `1px solid rgba(239,68,68,.25)`, color: "#fecaca", fontSize: 13 }}>
                      {contextError}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: 16, fontWeight: 700, display: "block", marginBottom: 9 }}>
                    Descripción de la empresa: <span style={{ color: C.red }}>*</span>
                    <span style={{ marginLeft: 6, color: C.dim, fontWeight: 400 }}>ⓘ</span>
                  </label>
                  <textarea
                    value={form.companyDesc}
                    onChange={e => setForm(f => ({ ...f, companyDesc: e.target.value }))}
                    placeholder="Describe tu empresa aquí"
                    rows={10}
                    style={{ ...input({ minHeight: 130 }), resize: "vertical" as const }}
                  />
                </div>
              </>
            )}

            {/* ── STEP 2: Agent context ── */}
            {step === 2 && (
              <>
                {kind === "notetaker" ? (
                  <>
                    <div>
                      <label style={{ fontSize: 16, fontWeight: 700, display: "block", marginBottom: 9 }}>
                        Nombre del notetaker: <span style={{ color: C.red }}>*</span>
                      </label>
                      <input
                        value={form.agentName}
                        onChange={e => setForm(f => ({ ...f, agentName: e.target.value }))}
                        placeholder="Ej: Notetaker de Ventas"
                        style={input()}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 16, fontWeight: 700, display: "block", marginBottom: 9 }}>
                        Objetivo: <span style={{ color: C.red }}>*</span>
                      </label>
                      <input
                        value={form.agentRole}
                        onChange={e => setForm(f => ({ ...f, agentRole: e.target.value }))}
                        placeholder="Ej: Resumir y extraer acciones"
                        style={input()}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 16, fontWeight: 700, display: "block", marginBottom: 9 }}>
                        Fuente: <span style={{ color: C.red }}>*</span>
                      </label>
                      <select
                        value={form.notetakerSource}
                        onChange={e => setForm(f => ({ ...f, notetakerSource: e.target.value as any }))}
                        style={input({ appearance: "none" as const })}
                      >
                        <option value="call">Llamada</option>
                        <option value="meeting">Reunion</option>
                        <option value="upload">Subida de audio</option>
                      </select>
                    </div>

                    <div style={{ ...fl({ gap: 10, flexWrap: "wrap" }), padding: 12, border: `1px solid ${C.border}`, borderRadius: 10, backgroundColor: C.dark }}>
                      <label style={{ ...fl({ alignItems: "center", gap: 8 }), color: C.muted, fontSize: 14, cursor: "pointer" }}>
                        <input type="checkbox" checked={form.notetakerSummary} onChange={e => setForm(f => ({ ...f, notetakerSummary: e.target.checked }))} />
                        Resumen
                      </label>
                      <label style={{ ...fl({ alignItems: "center", gap: 8 }), color: C.muted, fontSize: 14, cursor: "pointer" }}>
                        <input type="checkbox" checked={form.notetakerActionItems} onChange={e => setForm(f => ({ ...f, notetakerActionItems: e.target.checked }))} />
                        Acciones
                      </label>
                      <label style={{ ...fl({ alignItems: "center", gap: 8 }), color: C.muted, fontSize: 14, cursor: "pointer" }}>
                        <input type="checkbox" checked={form.notetakerSendEmail} onChange={e => setForm(f => ({ ...f, notetakerSendEmail: e.target.checked }))} />
                        Enviar por email
                      </label>
                    </div>
                  </>
                ) : (form.type === "flow") ? (
                  <>
                    <div>
                      <label style={{ fontSize: 16, fontWeight: 700, display: "block", marginBottom: 9 }}>
                        Nombre del flujo: <span style={{ color: C.red }}>*</span>
                      </label>
                      <input
                        value={form.agentName}
                        onChange={e => setForm(f => ({ ...f, agentName: e.target.value }))}
                        placeholder="Ej: plantilla_para_llamar"
                        style={input()}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 16, fontWeight: 700, display: "block", marginBottom: 9 }}>
                        Objetivo del flujo: <span style={{ color: C.red }}>*</span>
                      </label>
                      <input
                        value={form.agentRole}
                        onChange={e => setForm(f => ({ ...f, agentRole: e.target.value }))}
                        placeholder="Ej: Llamar leads y registrar resultados"
                        style={input()}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 16, fontWeight: 700, display: "block", marginBottom: 9 }}>
                        Notas / descripcion
                      </label>
                      <textarea
                        value={form.agentPrompt}
                        onChange={e => setForm(f => ({ ...f, agentPrompt: e.target.value }))}
                        placeholder="Describe que hara el flujo..."
                        rows={10}
                        style={{ ...input({ minHeight: 130 }), resize: "vertical" as const }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label style={{ fontSize: 16, fontWeight: 700, display: "block", marginBottom: 9 }}>
                        Idioma: <span style={{ color: C.red }}>*</span>
                        <span style={{ marginLeft: 6, color: C.dim, fontWeight: 400 }}>ⓘ</span>
                      </label>
                      <select
                        value={form.language}
                        onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                        style={input({ appearance: "none" as const })}
                      >
                        <option value="">Seleccionar</option>
                        {LANGUAGE_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: 16, fontWeight: 700, display: "block", marginBottom: 9 }}>
                        Nombre de identidad: <span style={{ color: C.red }}>*</span>
                        <span style={{ marginLeft: 6, color: C.dim, fontWeight: 400 }}>ⓘ</span>
                      </label>
                      <input
                        value={form.agentName}
                        onChange={e => setForm(f => ({ ...f, agentName: e.target.value }))}
                        placeholder="Escribe el nombre de tu agente"
                        style={input()}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 16, fontWeight: 700, display: "block", marginBottom: 9 }}>
                        Propósito: <span style={{ color: C.red }}>*</span>
                        <span style={{ marginLeft: 6, color: C.dim, fontWeight: 400 }}>ⓘ</span>
                      </label>
                      <select
                        value={form.agentRole}
                        onChange={e => setForm(f => ({ ...f, agentRole: e.target.value }))}
                        style={input({ appearance: "none" as const })}
                      >
                        <option value="">Seleccionar</option>
                        {PURPOSE_OPTIONS.map(o => (
                          <option key={o.value} value={o.label}>{o.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: 16, fontWeight: 700, display: "block", marginBottom: 9 }}>
                        Instrucciones importantes
                        <span style={{ marginLeft: 6, color: C.dim, fontWeight: 400 }}>ⓘ</span>
                      </label>
                      <textarea
                         value={form.agentPrompt}
                         onChange={e => setForm(f => ({ ...f, agentPrompt: e.target.value }))}
                         placeholder="Describe el comportamiento de tu agente: su rol, tareas, tono, cómo debe responder. ⚠️ IMPORTANTE: NO incluyas limitaciones como 'no puedo', 'solo puedo', 'asistente de texto'. El agente responderá CUALQUIER pregunta."
                         rows={10}
                         style={{ ...input({ minHeight: 130 }), resize: "vertical" as const }}
                       />
                       <div style={{ color: C.dim, fontSize: 12, marginTop: 8, lineHeight: 1.4 }}>
                         💡 Tip: Cuanto más específico seas aquí, mejor responderá tu agente. Evita limitaciones técnicas.
                       </div>
                    </div>
                  </>
                )}
              </>
            )}

            {/* ── STEP 3: Train (text) / Test (others) ── */}
            {step === 3 && form.type === "text" && kind !== "notetaker" ? (
              <>
                <div style={{ ...fl({ gap: 12 }), borderBottom: `1px solid ${C.border}`, paddingBottom: 10 }}>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, brainTab: "web" }))}
                    style={{ background: "none", border: "none", cursor: "pointer", color: form.brainTab === "web" ? C.lime : C.muted, fontWeight: 900, padding: "8px 0", borderBottom: `2px solid ${form.brainTab === "web" ? C.lime : "transparent"}` }}
                  >
                    🌐 Sitio web
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, brainTab: "files" }))}
                    style={{ background: "none", border: "none", cursor: "pointer", color: form.brainTab === "files" ? C.lime : C.muted, fontWeight: 900, padding: "8px 0", borderBottom: `2px solid ${form.brainTab === "files" ? C.lime : "transparent"}` }}
                  >
                    📄 Archivos
                  </button>
                </div>

                {form.brainTab === "web" ? (
                  <>
                    <div style={{ fontWeight: 900, fontSize: 16, marginTop: 6 }}>Extracción web</div>
                    <div style={{ color: C.muted, fontSize: 14, lineHeight: 1.6 }}>
                      Importa un sitio web a la base de conocimientos de tu agente. Esto recorrerá los enlaces a partir de la URL.
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <div style={{ color: C.muted, fontSize: 14, fontWeight: 800, marginBottom: 8 }}>Sitio web</div>
                      <div style={fl({ gap: 12 })}>
                        <input
                          value={form.brainWebsiteUrl}
                          onChange={e => setForm(f => ({ ...f, brainWebsiteUrl: e.target.value }))}
                          placeholder="https://www.tusitio.com/"
                          style={input({ flex: 1 })}
                        />
                        <button
                          type="button"
                          onClick={startBrainTraining}
                          style={{ padding: "0 22px", borderRadius: 12, backgroundColor: "transparent", border: `1px solid ${C.lime}`, color: C.lime, fontWeight: 900, cursor: "pointer", whiteSpace: "nowrap" }}
                        >
                          Comenzar
                        </button>
                      </div>
                      <div style={{ color: C.dim, fontSize: 12, marginTop: 10 }}>
                        Esto rastreará todos los enlaces que comiencen con la URL (sin incluir archivos del sitio web).
                      </div>
                      {form.brainLastRun && (
                        <div style={{ color: C.dim, fontSize: 12, marginTop: 10 }}>
                          Ultima ejecucion: {new Date(form.brainLastRun).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                   <FileUploadPanel
                     onFilesAdded={(files) => {
                       setForm(f => ({
                         ...f,
                         brainFiles: [...f.brainFiles, ...files]
                       }));
                     }}
                     existingFiles={form.brainFiles}
                     onFileRemoved={(idx) => {
                       setForm(f => ({
                         ...f,
                         brainFiles: f.brainFiles.filter((_, i) => i !== idx)
                       }));
                     }}
                   />
                 )}
              </>
            ) : (
              step === 3 && (
                form.type === "voice" ? (
                  <VoiceTestPanel
                    agentName={form.agentName}
                    agentRole={form.agentRole}
                    agentPrompt={form.agentPrompt}
                    companyContext={form.companyDesc}
                    voiceSettings={{
                      model: form.voice,
                      voice: form.voice,
                    }}
                  />
                ) : (
                   <ChatTestPanel
                     agentName={form.agentName}
                     agentRole={form.agentRole}
                     agentPrompt={form.agentPrompt}
                     companyContext={form.companyDesc}
                     brainFiles={form.brainFiles}
                   />
                 )
              )
            )}

              </>
            )}
          </div>
        </div>
      </div>

      {/* ── footer ── */}
      <div style={{ borderTop: `1px solid ${C.border}`, padding: isMobile ? "14px 20px" : "18px 56px", ...fl({ alignItems: "center", justifyContent: "space-between" }), backgroundColor: C.dark }}>
        <button
          onClick={() => setPickerOpen(true)}
          style={{ padding: "12px 26px", borderRadius: 10, border: `1px solid ${C.lime}`, backgroundColor: "transparent", color: C.lime, fontWeight: 800, fontSize: 15, cursor: "pointer" }}
        >
          Escoger plantilla
        </button>

        <div style={fl({ gap: 12 })}>
          {step > 1 && (
            <button
              onClick={() => setStep(s => s - 1)}
              style={{ padding: "12px 26px", borderRadius: 10, border: `1px solid ${C.border}`, backgroundColor: "transparent", color: C.muted, fontWeight: 800, fontSize: 15, cursor: "pointer" }}
            >
              Atrás
            </button>
          )}

          {form.type === "text" && kind !== "notetaker" && step === 3 && (
            <button
              type="button"
              onClick={() => setStep(4)}
              style={{ padding: "12px 10px", borderRadius: 10, border: "none", backgroundColor: "transparent", color: C.lime, fontWeight: 900, fontSize: 15, cursor: "pointer" }}
            >
              Saltar
            </button>
          )}

          {step < steps.length ? (
            <button
              onClick={() => {
                if (!canContinue) {
                  alert("Completa los campos requeridos para continuar");
                  return;
                }
                setStep(s => Math.min(s + 1, steps.length));
              }}
              disabled={!canContinue}
              style={{
                padding: "12px 34px",
                borderRadius: 10,
                border: "none",
                backgroundColor: !canContinue ? "rgba(163,230,53,.35)" : C.lime,
                color: "#111",
                fontWeight: 700,
                fontSize: 15,
                cursor: !canContinue ? "not-allowed" : "pointer",
              }}
            >
              {(form.type === "text" && kind !== "notetaker" && step === 3) ? "Siguiente" : "Guardar y continuar"}
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ padding: "12px 34px", borderRadius: 10, border: "none", backgroundColor: saving ? C.dim : C.lime, color: "#111", fontWeight: 800, fontSize: 15, cursor: saving ? "not-allowed" : "pointer" }}
            >
              {saving ? "Creando…" : "Crear Agente"}
            </button>
          )}
        </div>
      </div>

      {/* ── template picker overlay ── */}
      {pickerOpen && (
        <div
          onClick={() => setPickerOpen(false)}
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,.55)", zIndex: 50, padding: 24, overflowY: "auto" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 1160, margin: isMobile ? "18px auto" : "44px auto", backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: isMobile ? 18 : 26 }}
          >
            <div style={{ ...fl({ alignItems: "center", justifyContent: "space-between" }), marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>Plantillas</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>Empieza desde cero o elige un caso de uso.</div>
              </div>
              <button onClick={() => setPickerOpen(false)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 20 }}>
                x
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 18 }}>
              <div>
                <div style={{ color: C.dim, fontSize: 12, marginBottom: 8 }}>Crear desde cero</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                  {([
                    { id: "voice", label: "Agente de voz" },
                    { id: "text", label: "Agente de texto" },
                    { id: "flow", label: "Flujo" },
                    { id: "notetaker", label: "Notetaker" },
                  ] as const).map(t => (
                    <button
                      key={t.id}
                      onClick={() => {
                        if (t.id === "flow") {
                          router.push("/start/flows/templates");
                          setPickerOpen(false);
                          return;
                        }
                        if (t.id === "notetaker") {
                          setKind("notetaker");
                          setForm(f => ({ ...f, type: "voice" }));
                          updateQuery({ type: "voice", kind: "notetaker", template: null });
                        } else {
                          setKind("agent");
                          setForm(f => ({ ...f, type: t.id }));
                          updateQuery({ type: t.id, kind: "agent", template: null });
                        }
                        setStep(1);
                        setPickerOpen(false);
                      }}
                      style={{
                        padding: "12px 14px",
                        borderRadius: 12,
                        textAlign: "left",
                        cursor: "pointer",
                        border: `1px solid ${C.border}`,
                        backgroundColor: C.dark,
                        color: C.white,
                        fontWeight: 700,
                        fontSize: 14,
                      }}
                    >
                      {t.label}
                      <div style={{ fontSize: 12, color: C.muted, fontWeight: 500, marginTop: 4 }}>
                        Configuracion guiada en 3 pasos
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ color: C.dim, fontSize: 12, marginBottom: 8 }}>Casos de uso</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                  {([
                    { id: "lia", title: "Lia", subtitle: "Calificacion de leads", type: "voice" as AgentType },
                    { id: "alex", title: "Alex", subtitle: "Prospeccion en frio", type: "voice" as AgentType },
                    { id: "julia", title: "Julia", subtitle: "Recepcionista", type: "text" as AgentType },
                    { id: "flow-lead-intake", title: "Lead intake", subtitle: "Flujo base", type: "flow" as AgentType },
                  ]).map(t => (
                    <button
                      key={t.id}
                      onClick={() => {
                        if (t.type === "flow") {
                          router.push("/start/flows/templates");
                          setPickerOpen(false);
                          return;
                        }
                        const preset = TEMPLATE_PRESETS[t.id];
                        setKind(preset?.kind || "agent");
                        setForm(f => ({
                          ...f,
                          type: preset?.type || t.type,
                          agentName: preset?.agentName || f.agentName,
                          agentRole: preset?.agentRole || f.agentRole,
                          agentPrompt: preset?.agentPrompt || f.agentPrompt,
                          flowTemplate: (preset?.type === "flow") ? t.id : f.flowTemplate,
                        }));
                        updateQuery({ type: preset?.type || t.type, kind: preset?.kind || "agent", template: t.id });
                        setStep(1);
                        setPickerOpen(false);
                      }}
                      style={{
                        padding: "12px 14px",
                        borderRadius: 12,
                        textAlign: "left",
                        cursor: "pointer",
                        border: `1px solid ${C.border}`,
                        backgroundColor: C.dark,
                        color: C.white,
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: 14 }}>{t.title}</div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{t.subtitle}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
