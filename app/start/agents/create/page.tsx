"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabaseAgents } from "../supabaseAgentsClient";
import AuthModal from "@/app/start/agents/components/AgentsAuthModal";
import { authedFetch, AuthRequiredError } from "../authedFetchAgents";
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

const trByLang = (lang: "es" | "en", es: string, en: string) => (lang === "en" ? en : es);

const getSteps = (type: AgentType, kind: AgentKind, lang: "es" | "en") => {
  if (kind === "notetaker") {
    return [
      { id: 1, label: trByLang(lang, "Contexto de la empresa", "Company context"), required: true },
      { id: 2, label: trByLang(lang, "Configurar Copiloto IA", "Set up AI Copilot"), required: true },
      { id: 3, label: trByLang(lang, "Prueba", "Test"), required: false },
    ];
  }
  if (type === "flow") {
    return [
      { id: 1, label: trByLang(lang, "Contexto de la empresa", "Company context"), required: true },
      { id: 2, label: trByLang(lang, "Contexto del flujo", "Flow context"), required: true },
      { id: 3, label: trByLang(lang, "Prueba", "Test"), required: false },
    ];
  }
  if (type === "text") {
    return [
      { id: 1, label: trByLang(lang, "Contexto de la empresa", "Company context"), required: true },
      { id: 2, label: trByLang(lang, "Contexto del agente", "Agent context"), required: true },
      { id: 3, label: trByLang(lang, "Entrena tu agente", "Train your agent"), required: false },
      { id: 4, label: trByLang(lang, "Prueba tu agente", "Test your agent"), required: false },
    ];
  }
  return [
    { id: 1, label: trByLang(lang, "Contexto de la empresa", "Company context"), required: true },
    { id: 2, label: trByLang(lang, "Contexto del agente", "Agent context"), required: true },
    { id: 3, label: trByLang(lang, "Prueba tu agente", "Test your agent"), required: false },
  ];
};

const titleFor = (type: AgentType, kind: AgentKind, lang: "es" | "en") => {
  if (kind === "notetaker") return trByLang(lang, "Copiloto IA", "AI Copilot");
  if (type === "voice") return trByLang(lang, "Agente de Voz", "Voice Agent");
  if (type === "text") return trByLang(lang, "Agente de Texto", "Text Agent");
  return trByLang(lang, "Flujo", "Flow");
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

const PROMPT_GUIDE_TEMPLATES = [
  {
    id: "ventas_consultiva",
    label: "Ventas consultiva",
    content:
`Eres {{NOMBRE_AGENTE}}, asesor comercial de {{EMPRESA}}.

Objetivo:
- Entender el caso de uso del cliente y recomendar la solucion correcta.
- Calificar el lead con preguntas concretas.
- Cerrar un siguiente paso claro (demo, WhatsApp o email).

Reglas de conversacion:
- Habla en espanol, tono profesional, cercano y directo.
- Responde en frases cortas y faciles de entender.
- Nunca inventes datos; si falta informacion, pregunta.
- Haz una pregunta por turno.

Flujo sugerido:
1. Saludo breve y contexto.
2. Detecta tipo de negocio y principal dolor.
3. Valida volumen de contactos y canal principal.
4. Presenta 1 a 2 opciones de solucion.
5. Cierra con una accion concreta.

Datos a capturar:
- Nombre del contacto
- Tipo de negocio
- Problema principal
- Canal preferido
- Presupuesto aproximado
- Urgencia

Cierre:
Termina siempre con esta pregunta: "Te parece si agendamos una demo de 15 minutos o prefieres que te envie la propuesta por WhatsApp?"`,
  },
  {
    id: "servicio_cliente",
    label: "Servicio al cliente",
    content:
`Eres {{NOMBRE_AGENTE}}, asistente de atencion al cliente de {{EMPRESA}}.

Objetivo:
- Resolver dudas frecuentes de forma rapida y clara.
- Guiar al cliente al siguiente paso sin friccion.
- Escalar a humano cuando corresponda.

Reglas:
- Tono amable, empatico y resolutivo.
- Confirma lo que entendiste antes de responder.
- Si no hay dato suficiente, pide 1 dato puntual.
- No uses lenguaje tecnico innecesario.

Escalamiento:
- Escala cuando haya queja critica, tema legal, cobro sensible o solicitud fuera de politica.
- Al escalar, resume en 1 frase el caso para el equipo humano.

Cierre:
Pregunta siempre si quedo resuelto y ofrece un siguiente canal de contacto.`,
  },
  {
    id: "cualificacion_leads",
    label: "Calificacion de leads",
    content:
`Eres {{NOMBRE_AGENTE}}, especialista en calificacion de leads de {{EMPRESA}}.

Objetivo:
- Identificar rapidamente si el lead encaja con nuestro cliente ideal.
- Priorizar leads de alto potencial.

Criterios de calificacion:
- Sector y tipo de negocio
- Tamano del equipo
- Volumen mensual de prospectos
- Canal de captacion principal
- Presupuesto disponible
- Tiempo de implementacion esperado

Reglas:
- Haz preguntas cortas, una por mensaje.
- Resume en una linea al final de cada 2 respuestas del usuario.
- Si el lead califica, propone agendar demo.
- Si no califica, deja una recomendacion util y despide cordialmente.`,
  },
  {
    id: "agendamiento_demos",
    label: "Agendar demos",
    content:
`Eres {{NOMBRE_AGENTE}}, asistente de agenda comercial de {{EMPRESA}}.

Objetivo:
- Llevar al prospecto desde interes hasta demo agendada.

Reglas:
- Valida interes real antes de pedir datos.
- Ofrece horarios concretos.
- Confirma nombre, email y telefono antes de cerrar.
- Repite fecha y hora final para evitar errores.

Script base:
1. Entiendo, te ayudo a agendar.
2. Te sirven estas opciones: [opcion A] o [opcion B]?
3. Perfecto, para confirmar me compartes nombre, email y telefono?
4. Listo, quedo agendada para [fecha] a las [hora]. Te envio confirmacion ahora.`,
  },
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
  const [confirmExitOpen, setConfirmExitOpen] = useState(false);
  const [promptTemplateId, setPromptTemplateId] = useState("ventas_consultiva");
  const [language, setLanguage] = useState<"es" | "en">("es");

  const tr = (es: string, en: string) => (language === "en" ? en : es);

  const [form, setForm] = useState({
    companyName:  "",
    companyUrl:   "",
    companyDesc:  "",
    agentName:    "",
    agentRole:    "",
    agentPrompt:  "",
    voice:        "marin",
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

  const steps = getSteps(form.type as AgentType, kind, language);

  // ✅ IMPORTANTE: Agentes requiere login COMPLETAMENTE independiente
  useEffect(() => {
    let mounted = true;
    
    const initCreate = async () => {
      const { data } = await supabaseAgents.auth.getSession();
      const u = data?.session?.user || null;

      if (!mounted) return;

      setAuthUser(u);
      setAuthLoading(false);
      setOpenAuth(!u);
    };
    
    initCreate();

    const { data: sub } = supabaseAgents.auth.onAuthStateChange((event, session) => {
      const u = session?.user || null;
      if (event === "SIGNED_IN" && u) {
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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = window.localStorage.getItem("botz-language");
    if (saved === "es" || saved === "en") setLanguage(saved);

    const onLanguageChange = (evt: Event) => {
      const next = String((evt as CustomEvent<string>)?.detail || "").toLowerCase();
      if (next === "es" || next === "en") setLanguage(next);
    };

    window.addEventListener("botz-language-change", onLanguageChange as EventListener);
    return () => {
      window.removeEventListener("botz-language-change", onLanguageChange as EventListener);
    };
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
      alert(tr("Agrega una URL del sitio web", "Add a website URL"));
      return;
    }
    setContextLoading(true);
    setContextError(null);
    try {
      const inputHost = (() => {
        try {
          return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
        } catch {
          return "";
        }
      })();

      const res = await fetch("/api/agents/company-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No se pudo generar contexto");
      const fetchedUrl = String(json?.url || "").trim();
      const fetchedHost = (() => {
        try {
          return new URL(fetchedUrl).hostname.replace(/^www\./i, "").toLowerCase();
        } catch {
          return "";
        }
      })();

      if (inputHost && fetchedHost) {
        const sameDomain = fetchedHost === inputHost || fetchedHost.endsWith(`.${inputHost}`) || inputHost.endsWith(`.${fetchedHost}`);
        if (!sameDomain) {
          throw new Error(`La URL respondió con otro dominio (${fetchedHost}). Verifica la URL de tu empresa.`);
        }
      }

      const suggestion = String(json?.suggested_company_desc || "").trim();
      if (suggestion) {
        const blockStart = "--- Contexto autogenerado (BOTZ) ---";
        const blockEnd = "--- Fin contexto autogenerado ---";
        setForm(f => ({
          ...f,
          companyDesc: (() => {
            const current = String(f.companyDesc || "").trim();
            const normalized = current.replace(/--- Contexto autogenerado \(BOTZ\) ---[\s\S]*?--- Fin contexto autogenerado ---/g, "").trim();
            const generated = `${blockStart}\nFuente: ${fetchedUrl || url}\n${suggestion}\n${blockEnd}`;
            return normalized ? `${normalized}\n\n${generated}` : generated;
          })(),
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
      alert(tr("Agrega una URL del sitio web", "Add a website URL"));
      return;
    }
    setForm(f => ({ ...f, brainLastRun: new Date().toISOString() }));
  };

  const applyPromptTemplate = (mode: "replace" | "append") => {
    const picked = PROMPT_GUIDE_TEMPLATES.find((t) => t.id === promptTemplateId) || PROMPT_GUIDE_TEMPLATES[0];
    if (!picked) return;

    const hydrated = picked.content
      .replace(/\{\{NOMBRE_AGENTE\}\}/g, form.agentName?.trim() || "Botz")
      .replace(/\{\{EMPRESA\}\}/g, form.companyName?.trim() || "tu empresa");

    setForm((f) => ({
      ...f,
      agentPrompt: mode === "append"
        ? `${String(f.agentPrompt || "").trim()}\n\n${hydrated}`.trim()
        : hydrated,
    }));
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
              content: f.content,
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
      title: tr("¡Hola!\nCuéntanos sobre tu empresa", "Hi!\nTell us about your company"),
      body: tr("Enseña a tu agente todo lo relacionado con tu empresa. Esta sección puede ser reutilizada en otros agentes.", "Teach your agent everything related to your company. This section can be reused in other agents."),
    },
    2: kind === "notetaker"
      ? {
          title: tr("Configura tu Copiloto IA", "Set up your AI Copilot"),
          body: tr("Define la fuente y el formato de salida para resumir, extraer acuerdos y acciones.", "Define source and output format to summarize, extract agreements, and action items."),
        }
      : (form.type === "flow"
          ? {
              title: tr("Contexto del flujo", "Flow context"),
              body: tr("Define el objetivo y una base. Luego podrás editar nodos e integraciones.", "Define the goal and baseline. Then you can edit nodes and integrations."),
            }
          : {
              title: tr("¡Hola!\nEstás a punto de crear tu agente.", "Hi!\nYou are about to create your agent."),
              body: tr("Elige el idioma, asigna un nombre y define el propósito. Estos pasos dan forma a la identidad y al objetivo desde el inicio.", "Choose language, assign a name, and define purpose. These steps shape identity and goals from the start."),
            }),
    3: (form.type === "text" && kind !== "notetaker")
      ? {
          title: tr("Construye tu cerebro", "Build your brain"),
          body: tr("Mejora el conocimiento de tu agente importando información de un sitio web o archivos. Puedes omitir este paso si no necesitas formación.", "Improve your agent knowledge by importing website or file data. You can skip this step if you do not need training."),
        }
      : {
          title: tr("Prueba tu agente", "Test your agent"),
          body: tr("Prueba antes de activarlo para asegurarte de que responde como esperas.", "Test before activation to make sure it responds as expected."),
        },
    4: {
      title: tr("Instrucciones", "Instructions"),
      body: tr("Ingresa las instrucciones específicas para tu agente o selecciona y edita una de las plantillas predefinidas.", "Enter specific instructions for your agent or select and edit a predefined template."),
    },
  };

  const left = leftContent[step];

  const pageTitle = titleFor((form.type as AgentType), kind, language);

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

  const goToAgentsList = () => {
    const t = form.type === "voice" || form.type === "text" || form.type === "flow" ? form.type : "voice";
    router.push(`/start/agents?type=${t}`);
  };

  const askExit = () => {
    setConfirmExitOpen(true);
  };

  return (
    /* ── full-screen overlay (dark page, no sidebar here) ── */
    <div style={{ minHeight: "100vh", width: "100%", maxWidth: "100%", backgroundColor: C.bg, display: "flex", flexDirection: "column", fontFamily: "Inter,-apple-system,sans-serif", color: C.white, boxSizing: "border-box" }}>

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
      <div style={{ height: 60, borderBottom: `1px solid ${C.border}`, ...fl({ alignItems: "center", justifyContent: "space-between", padding: isMobile ? "0 12px" : "0 36px" }), backgroundColor: C.dark, position: "sticky", top: 0, zIndex: 20 }}>
        <button
          onClick={askExit}
          style={{ ...fl({ alignItems: "center", gap: 8 }), background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14 }}
        >
          {tr("‹ Volver", "‹ Back")}
        </button>
        <span style={{ fontWeight: 700, fontSize: 16, color: C.white }}>
          {pageTitle}
        </span>
        <button
          onClick={askExit}
          style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 20 }}
        >
          ✕
        </button>
      </div>

      {confirmExitOpen && (
        <div
          onClick={() => setConfirmExitOpen(false)}
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(3,8,20,0.72)", backdropFilter: "blur(4px)", zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 560, background: "linear-gradient(180deg, rgba(14,24,40,0.98) 0%, rgba(7,12,22,0.98) 100%)", border: "1px solid rgba(34,211,238,0.18)", borderRadius: 16, padding: 22, boxShadow: "0 24px 90px rgba(0,0,0,0.58)" }}
          >
            <div style={{ fontSize: 24, marginBottom: 8 }}>⚠️</div>
            <div style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>{tr("¿Seguro que deseas salir?", "Are you sure you want to leave?")}</div>
            <div style={{ color: C.muted, fontSize: 20, lineHeight: 1.45 }}>
              {tr("Si sales ahora, perderás toda la configuración que has hecho hasta el momento.", "If you leave now, you will lose all configuration changes made so far.")}
            </div>
            <div style={{ marginTop: 22, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={goToAgentsList}
                style={{ border: "1px solid rgba(163,230,53,0.55)", background: "transparent", color: C.lime, fontWeight: 900, cursor: "pointer", fontSize: 20, borderRadius: 12, padding: "10px 14px" }}
              >
                {tr("Salir de todos modos", "Leave anyway")}
              </button>
              <button
                onClick={() => setConfirmExitOpen(false)}
                style={{ border: "none", backgroundColor: C.lime, color: "#111", fontWeight: 900, borderRadius: 12, cursor: "pointer", fontSize: 22, padding: "10px 18px" }}
              >
                {tr("Seguir editando", "Keep editing")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── stepper ── */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: isMobile ? "16px 12px 6px" : "26px 56px 6px", backgroundColor: C.dark }}>
        <div style={{ overflowX: isMobile ? "auto" : "visible" }}>
          <div style={{ ...fl({ alignItems: "flex-start", gap: 0 }), maxWidth: 1120, minWidth: isMobile ? 640 : undefined, margin: "0 auto" }}>
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
      </div>

      {/* ── content ── */}
       <div style={{ flex: 1, padding: isMobile ? "24px 12px" : "36px 32px", maxWidth: isMobile ? "100%" : 1400, margin: "0 auto", width: "100%", boxSizing: "border-box", minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              flexDirection: (isMobile || isTextTestStep) ? "column" : "row",
              gap: isMobile ? 20 : 34,
              alignItems: isTextTestStep ? "stretch" : "flex-start",
            }}
          >

           {/* LEFT – description */}
            <div style={{ flex: (isMobile || isTextTestStep) ? "1 1 100%" : "0 0 360px", minWidth: 0, maxWidth: (isMobile || isTextTestStep) ? "100%" : 420 }}>
             {isTextTestStep ? (
               <>
                  <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 12px", lineHeight: 1.2 }}>
                    {tr("📝 Instrucciones del Agente", "📝 Agent Instructions")}
                  </h2>
                  <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.6, margin: "0 0 14px" }}>
                    {tr("Define el comportamiento y las respuestas del agente de texto.", "Define behavior and responses for the text agent.")}
                  </p>
                  <textarea
                    value={form.agentPrompt}
                    onChange={e => setForm(f => ({ ...f, agentPrompt: e.target.value }))}
                    rows={10}
                    placeholder={tr("Ejemplo: Eres un asistente de ventas amable y profesional. Ayuda a los clientes, responde preguntas sobre productos. ⚠️ NO INCLUYAS: 'no puedo', 'solo puedo de texto', 'limitaciones técnicas'", "Example: You are a friendly, professional sales assistant. Help customers and answer product questions. ⚠️ DO NOT INCLUDE: 'I cannot', 'text-only', 'technical limitations'")}
                    style={{ ...input({ minHeight: 100, fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace", fontSize: 12 }), resize: "vertical" as const }}
                  />
                  <div style={{ marginTop: 10, padding: 12, borderRadius: 10, border: `1px solid ${C.border}`, backgroundColor: C.dark }}>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 800 }}>{tr("Plantillas recomendadas", "Recommended templates")}</div>
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr auto auto", gap: 8 }}>
                      <select
                        value={promptTemplateId}
                        onChange={e => setPromptTemplateId(e.target.value)}
                        style={input({ appearance: "none" as const, height: 42, padding: "0 12px", fontSize: 13 })}
                      >
                        {PROMPT_GUIDE_TEMPLATES.map((t) => (
                          <option key={t.id} value={t.id}>{t.label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => applyPromptTemplate("replace")}
                        style={{ padding: "0 14px", borderRadius: 10, border: `1px solid ${C.lime}`, backgroundColor: "transparent", color: C.lime, fontWeight: 800, cursor: "pointer", minHeight: 42 }}
                      >
                        {tr("Reemplazar", "Replace")}
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPromptTemplate("append")}
                        style={{ padding: "0 14px", borderRadius: 10, border: `1px solid ${C.border}`, backgroundColor: C.card, color: C.white, fontWeight: 800, cursor: "pointer", minHeight: 42 }}
                      >
                        {tr("Agregar", "Append")}
                      </button>
                    </div>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <button
                      type="button"
                     style={{ padding: "14px 20px", borderRadius: 8, border: `1px solid ${C.lime}`, backgroundColor: "transparent", color: C.lime, fontWeight: 700, fontSize: 14, cursor: "pointer" }}
                   >
                      {tr("✦ Generar con IA", "✦ Generate with AI")}
                    </button>
                 </div>
               </>
             ) : (
              <>
                 <h2 style={{ fontSize: isMobile ? 26 : 28, fontWeight: 800, margin: "0 0 12px", lineHeight: 1.2, whiteSpace: "pre-line", overflowWrap: "anywhere", wordBreak: "break-word", maxWidth: "100%" }}>
                    {left.title}
                  </h2>
                <p style={{ color: C.muted, fontSize: 15, lineHeight: 1.7, margin: 0, overflowWrap: "anywhere", wordBreak: "break-word" }}>
                  {left.body}
                </p>
              </>
            )}
          </div>

          {/* RIGHT – form */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0, flex: isMobile ? "1 1 100%" : "1 1 760px", width: "100%" }}>

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
                    {tr("Nombre de la empresa:", "Company name:")} <span style={{ color: C.red }}>*</span>
                    <span style={{ marginLeft: 6, color: C.dim, fontWeight: 400 }}>ⓘ</span>
                  </label>
                  <input
                    value={form.companyName}
                    onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                    placeholder={tr("Escribe el nombre oficial de la empresa", "Enter the official company name")}
                    style={input()}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 16, fontWeight: 700, display: "block", marginBottom: 9 }}>
                    {tr("URL del sitio web", "Website URL")}
                  </label>
                  <div style={fl({ gap: 10, flexWrap: isMobile ? "wrap" : "nowrap" })}>
                    <input
                      value={form.companyUrl}
                      onChange={e => setForm(f => ({ ...f, companyUrl: e.target.value }))}
                      placeholder="https://example.com"
                      style={input({ flex: "1 1 240px" })}
                    />
                    <button style={{
                      ...fl({ alignItems: "center", gap: 6 }),
                      padding: "0 18px", borderRadius: 10,
                      backgroundColor: "transparent",
                      border: `1px solid ${C.lime}`,
                      color: C.lime, fontWeight: 800, fontSize: 14, cursor: "pointer",
                      whiteSpace: "nowrap",
                      minHeight: 46,
                    }}
                    onClick={genCompanyContext}
                    disabled={contextLoading}
                    >
                      {contextLoading ? tr("Generando...", "Generating...") : tr("Generar contexto", "Generate context")}
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
                    {tr("Descripción de la empresa:", "Company description:")} <span style={{ color: C.red }}>*</span>
                    <span style={{ marginLeft: 6, color: C.dim, fontWeight: 400 }}>ⓘ</span>
                  </label>
                  <textarea
                    value={form.companyDesc}
                    onChange={e => setForm(f => ({ ...f, companyDesc: e.target.value }))}
                    placeholder={tr("Describe tu empresa aquí", "Describe your company here")}
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
                        Nombre del Copiloto IA: <span style={{ color: C.red }}>*</span>
                      </label>
                      <input
                        value={form.agentName}
                        onChange={e => setForm(f => ({ ...f, agentName: e.target.value }))}
                        placeholder="Ej: Copiloto Comercial"
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
                        {tr("Idioma:", "Language:")} <span style={{ color: C.red }}>*</span>
                        <span style={{ marginLeft: 6, color: C.dim, fontWeight: 400 }}>ⓘ</span>
                      </label>
                      <select
                        value={form.language}
                        onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                        style={input({ appearance: "none" as const })}
                      >
                        <option value="">{tr("Seleccionar", "Select")}</option>
                        {LANGUAGE_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: 16, fontWeight: 700, display: "block", marginBottom: 9 }}>
                        {tr("Nombre de identidad:", "Identity name:")} <span style={{ color: C.red }}>*</span>
                        <span style={{ marginLeft: 6, color: C.dim, fontWeight: 400 }}>ⓘ</span>
                      </label>
                      <input
                        value={form.agentName}
                        onChange={e => setForm(f => ({ ...f, agentName: e.target.value }))}
                        placeholder={tr("Escribe el nombre de tu agente", "Type your agent name")}
                        style={input()}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 16, fontWeight: 700, display: "block", marginBottom: 9 }}>
                        {tr("Propósito:", "Purpose:")} <span style={{ color: C.red }}>*</span>
                        <span style={{ marginLeft: 6, color: C.dim, fontWeight: 400 }}>ⓘ</span>
                      </label>
                      <select
                        value={form.agentRole}
                        onChange={e => setForm(f => ({ ...f, agentRole: e.target.value }))}
                        style={input({ appearance: "none" as const })}
                      >
                        <option value="">{tr("Seleccionar", "Select")}</option>
                        {PURPOSE_OPTIONS.map(o => (
                          <option key={o.value} value={o.label}>{o.label}</option>
                        ))}
                      </select>
                    </div>

                     <div>
                       <label style={{ fontSize: 16, fontWeight: 700, display: "block", marginBottom: 9 }}>
                         {tr("Instrucciones importantes", "Important instructions")}
                         <span style={{ marginLeft: 6, color: C.dim, fontWeight: 400 }}>ⓘ</span>
                       </label>
                       <div style={{ marginBottom: 10, padding: 12, borderRadius: 10, border: `1px solid ${C.border}`, backgroundColor: C.dark }}>
                         <div style={{ fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 800 }}>{tr("No sabes crear prompts? Usa una plantilla real", "Not sure how to write prompts? Use a real template")}</div>
                         <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr auto auto", gap: 8 }}>
                           <select
                             value={promptTemplateId}
                             onChange={e => setPromptTemplateId(e.target.value)}
                             style={input({ appearance: "none" as const, height: 42, padding: "0 12px", fontSize: 13 })}
                           >
                             {PROMPT_GUIDE_TEMPLATES.map((t) => (
                               <option key={t.id} value={t.id}>{t.label}</option>
                             ))}
                           </select>
                           <button
                             type="button"
                             onClick={() => applyPromptTemplate("replace")}
                             style={{ padding: "0 14px", borderRadius: 10, border: `1px solid ${C.lime}`, backgroundColor: "transparent", color: C.lime, fontWeight: 800, cursor: "pointer", minHeight: 42 }}
                           >
                              {tr("Reemplazar", "Replace")}
                           </button>
                           <button
                             type="button"
                             onClick={() => applyPromptTemplate("append")}
                             style={{ padding: "0 14px", borderRadius: 10, border: `1px solid ${C.border}`, backgroundColor: C.card, color: C.white, fontWeight: 800, cursor: "pointer", minHeight: 42 }}
                           >
                              {tr("Agregar", "Append")}
                           </button>
                         </div>
                       </div>
                       <textarea
                          value={form.agentPrompt}
                          onChange={e => setForm(f => ({ ...f, agentPrompt: e.target.value }))}
                          placeholder={tr("Describe el comportamiento de tu agente: su rol, tareas, tono, cómo debe responder. ⚠️ IMPORTANTE: NO incluyas limitaciones como 'no puedo', 'solo puedo', 'asistente de texto'. El agente responderá CUALQUIER pregunta.", "Describe your agent behavior: role, tasks, tone, and response style. ⚠️ IMPORTANT: do NOT include limits like 'I can't', 'I only can', or 'text-only assistant'. The agent should answer ANY question.")}
                         rows={10}
                         style={{ ...input({ minHeight: 130 }), resize: "vertical" as const }}
                       />
                       <div style={{ color: C.dim, fontSize: 12, marginTop: 8, lineHeight: 1.4 }}>
                          {tr("💡 Tip: Cuanto más específico seas aquí, mejor responderá tu agente. Evita limitaciones técnicas.", "💡 Tip: The more specific you are here, the better your agent will respond. Avoid technical limitations.")}
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
                    {tr("🌐 Sitio web", "🌐 Website")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, brainTab: "files" }))}
                    style={{ background: "none", border: "none", cursor: "pointer", color: form.brainTab === "files" ? C.lime : C.muted, fontWeight: 900, padding: "8px 0", borderBottom: `2px solid ${form.brainTab === "files" ? C.lime : "transparent"}` }}
                  >
                    {tr("📄 Archivos", "📄 Files")}
                  </button>
                </div>

                {form.brainTab === "web" ? (
                  <>
                    <div style={{ fontWeight: 900, fontSize: 16, marginTop: 6 }}>{tr("Extracción web", "Web extraction")}</div>
                    <div style={{ color: C.muted, fontSize: 14, lineHeight: 1.6 }}>
                      {tr("Importa un sitio web a la base de conocimientos de tu agente. Esto recorrerá los enlaces a partir de la URL.", "Import a website into your agent knowledge base. It will crawl links from the provided URL.")}
                    </div>

                    <div style={{ marginTop: 10 }}>
                      <div style={{ color: C.muted, fontSize: 14, fontWeight: 800, marginBottom: 8 }}>{tr("Sitio web", "Website")}</div>
                      <div style={fl({ gap: 12 })}>
                        <input
                          value={form.brainWebsiteUrl}
                          onChange={e => setForm(f => ({ ...f, brainWebsiteUrl: e.target.value }))}
                          placeholder={tr("https://www.tusitio.com/", "https://www.yoursite.com/")}
                          style={input({ flex: 1 })}
                        />
                        <button
                          type="button"
                          onClick={startBrainTraining}
                          style={{ padding: "0 22px", borderRadius: 12, backgroundColor: "transparent", border: `1px solid ${C.lime}`, color: C.lime, fontWeight: 900, cursor: "pointer", whiteSpace: "nowrap" }}
                        >
                          {tr("Comenzar", "Start")}
                        </button>
                      </div>
                      <div style={{ color: C.dim, fontSize: 12, marginTop: 10 }}>
                        {tr("Esto rastreará todos los enlaces que comiencen con la URL (sin incluir archivos del sitio web).", "This will crawl all links that start with the URL (excluding website files).")}
                      </div>
                      {form.brainLastRun && (
                        <div style={{ color: C.dim, fontSize: 12, marginTop: 10 }}>
                          {tr("Ultima ejecucion", "Last run")}: {new Date(form.brainLastRun).toLocaleString()}
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
      <div style={{ borderTop: `1px solid ${C.border}`, padding: isMobile ? "14px 12px" : "18px 56px", ...fl({ alignItems: "center", justifyContent: "space-between", flexWrap: isMobile ? "wrap" : "nowrap", gap: isMobile ? 10 : 0 }), backgroundColor: C.dark }}>
        <button
          onClick={() => setPickerOpen(true)}
          style={{ padding: "12px 26px", borderRadius: 10, border: `1px solid ${C.lime}`, backgroundColor: "transparent", color: C.lime, fontWeight: 800, fontSize: 15, cursor: "pointer" }}
        >
          {tr("Escoger plantilla", "Choose template")}
        </button>

        <div style={fl({ gap: 12, flexWrap: isMobile ? "wrap" : "nowrap", justifyContent: isMobile ? "flex-end" : "flex-start", width: isMobile ? "100%" : undefined })}>
          {step > 1 && (
            <button
              onClick={() => setStep(s => s - 1)}
              style={{ padding: "12px 26px", borderRadius: 10, border: `1px solid ${C.border}`, backgroundColor: "transparent", color: C.muted, fontWeight: 800, fontSize: 15, cursor: "pointer" }}
            >
              {tr("Atrás", "Back")}
            </button>
          )}

          {form.type === "text" && kind !== "notetaker" && step === 3 && (
            <button
              type="button"
              onClick={() => setStep(4)}
              style={{ padding: "12px 10px", borderRadius: 10, border: "none", backgroundColor: "transparent", color: C.lime, fontWeight: 900, fontSize: 15, cursor: "pointer" }}
            >
              {tr("Saltar", "Skip")}
            </button>
          )}

          {step < steps.length ? (
            <button
              onClick={() => {
                if (!canContinue) {
                  alert(tr("Completa los campos requeridos para continuar", "Complete the required fields to continue"));
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
              {(form.type === "text" && kind !== "notetaker" && step === 3)
                ? tr("Siguiente", "Next")
                : tr("Guardar y continuar", "Save and continue")}
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ padding: "12px 34px", borderRadius: 10, border: "none", backgroundColor: saving ? C.dim : C.lime, color: "#111", fontWeight: 800, fontSize: 15, cursor: saving ? "not-allowed" : "pointer" }}
            >
              {saving ? tr("Creando…", "Creating...") : tr("Crear Agente", "Create Agent")}
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
                <div style={{ fontSize: 16, fontWeight: 800 }}>{tr("Plantillas", "Templates")}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{tr("Empieza desde cero o elige un caso de uso.", "Start from scratch or choose a use case.")}</div>
              </div>
              <button onClick={() => setPickerOpen(false)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 20 }}>
                x
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 18 }}>
              <div>
                <div style={{ color: C.dim, fontSize: 12, marginBottom: 8 }}>{tr("Crear desde cero", "Create from scratch")}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                  {([
                    { id: "voice", label: tr("Agente de voz", "Voice agent") },
                    { id: "text", label: tr("Agente de texto", "Text agent") },
                    { id: "flow", label: tr("Flujo", "Flow") },
                    { id: "notetaker", label: tr("Copiloto IA", "AI Copilot") },
                  ] as const).map(t => (
                    <button
                      key={t.id}
                      onClick={() => {
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
                        {tr("Configuracion guiada en 3 pasos", "Guided setup in 3 steps")}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ color: C.dim, fontSize: 12, marginBottom: 8 }}>{tr("Casos de uso", "Use cases")}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                  {([
                    { id: "lia", title: "Lia", subtitle: tr("Calificacion de leads", "Lead qualification"), type: "voice" as AgentType },
                    { id: "alex", title: "Alex", subtitle: tr("Prospeccion en frio", "Cold outreach"), type: "voice" as AgentType },
                    { id: "julia", title: "Julia", subtitle: tr("Recepcionista", "Receptionist"), type: "text" as AgentType },
                    { id: "flow-lead-intake", title: "Lead intake", subtitle: tr("Flujo base", "Base flow"), type: "flow" as AgentType },
                  ]).map(t => (
                    <button
                      key={t.id}
                      onClick={() => {
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
