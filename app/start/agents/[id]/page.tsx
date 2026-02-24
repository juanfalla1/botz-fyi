"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseAgents } from "../supabaseAgentsClient";
import AuthModal from "@/app/start/agents/components/AgentsAuthModal";
import HistoryPanel from "@/app/start/agents/components/HistoryPanel";
import FileUploadPanel from "@/app/start/agents/components/FileUploadPanel";
import ChatTestPanel from "@/app/start/agents/components/ChatTestPanel";
import VoiceTestPanel from "@/app/start/agents/components/VoiceTestPanel";
import { authedFetch, AuthRequiredError } from "../authedFetchAgents";

type AgentType = "voice" | "text" | "flow";
type AgentStatus = "draft" | "active" | "paused" | "archived";

interface Agent {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  description: string;
  configuration: any;
  voice_settings?: any;
  total_conversations: number;
  total_messages: number;
  credits_used: number;
  created_at: string;
}

interface Conversation {
  id: string;
  contact_name: string;
  contact_phone?: string;
  channel: string;
  status: string;
  message_count: number;
  duration_seconds?: number;
  started_at: string;
}

const C = {
  bg: "#1a1d26",
  sidebar: "#15181f",
  card: "#22262d",
  dark: "#111318",
  border: "rgba(255,255,255,0.07)",
  blue: "#0096ff",
  lime: "#a3e635",
  white: "#ffffff",
  muted: "#9ca3af",
  dim: "#6b7280",
};

const titleFor = (type: AgentType, kind: string) => {
  if (kind === "notetaker") return "Copiloto IA";
  if (type === "voice") return "Agente de Voz";
  if (type === "text") return "Agente de Texto";
  return "Flujo";
};

const typeBadge = (t: AgentType) => {
  if (t === "voice") return { bg: "rgba(239,68,68,.15)", fg: "#f87171", label: "Voz" };
  if (t === "text") return { bg: `${C.blue}22`, fg: C.blue, label: "Texto" };
  return { bg: "rgba(139,92,246,.15)", fg: "#a78bfa", label: "Flujo" };
};

const PURPOSE_OPTIONS = [
  "Calificacion De Leads",
  "Servicio al cliente",
  "Recepcionista",
  "Asistente Personalizado",
  "Agente De Ventas De Ecommerce",
];

const ACTION_TOOL_OPTIONS = [
  "call_end",
  "end_call",
  "transfer_call",
  "transfer_agent",
  "check_calendar_availability",
  "book_calendar",
  "custom_action",
];

export default function AgentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const agentId = params.id as string;

  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [openAuth, setOpenAuth] = useState(false);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "contexto" | "configuracion" | "cerebro" | "publicar" | "integraciones" | "conversaciones" | "historial" | "prueba" | "probar" | "analisis" | "registro" | "metrica">("overview");
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [ctxForm, setCtxForm] = useState({
    companyName: "",
    companyUrl: "",
    companyDesc: "",
    language: "es-ES",
    identityName: "",
    purpose: "",
    importantInstructions: "",
    callerIdNumber: "",
  });
  const [brainTab, setBrainTab] = useState<"website" | "files" | "config">("website");
  const [brainForm, setBrainForm] = useState({
    contextName: "",
    contextDescription: "",
    websiteUrl: "",
    files: [] as { name: string; content: string; type: string }[],
  });
  const [publishForm, setPublishForm] = useState({
    isPublic: false,
    additionalInstructions: false,
    welcomeMessage: "",
    examples: ["What services do you offer?", "How can I contact support?", "Where can I find pricing details?"],
    bgColor: "#1f2937",
    primaryColor: "#a3e635",
    autoOpen: false,
  });
  const [analysisForm, setAnalysisForm] = useState({
    objective:
      "Evalúa si el agente parece haber tenido una llamada exitosa con el usuario, donde la llamada finaliza sin cortes inesperados.",
    variables: ["call_summary"],
  });
  const [voiceCfg, setVoiceCfg] = useState({
    backgroundSound: false,
    sensitivity: 1,
    interruptionSensitivity: 0.8,
    activeListening: true,
    boostedKeywords: "",
    cleanSpeech: true,
    transcriptFormatMode: "fast" as "fast" | "accurate",
    reminderFrequencyMs: 10000,
    reminderTimes: 1,
  });
  const [conversationCfg, setConversationCfg] = useState({
    backgroundSound: false,
    sensitivity: 1,
    interruptionSensitivity: 0.8,
    activeListening: true,
    boostedKeywords: "",
    cleanSpeech: true,
    transcriptFormatMode: "fast" as "fast" | "accurate",
    reminderFrequencyMs: 10000,
    reminderTimes: 1,
  });
  const [callCfg, setCallCfg] = useState({
    voicemailDetection: true,
    voicemailBehavior: "hangup" as "hangup" | "leave_message",
    endCallSilenceSec: 30,
    maxCallDurationSec: 600,
    initialResponseDelaySec: 0,
  });
  const [keyboardCfg, setKeyboardCfg] = useState({
    detectDtmf: true,
  });
  const [actionsCfg, setActionsCfg] = useState<string[]>(["call_end", "end_call"]);
  const [brainsAdvancedCfg, setBrainsAdvancedCfg] = useState({
    chunksToRetrieve: 3,
    similarityThreshold: 0.6,
  });
  const [improvingPrompt, setImprovingPrompt] = useState(false);

  const ensureVoicePromptStructure = (rawPrompt: string, params: {
    identityName: string;
    purpose: string;
    companyName: string;
    companyDesc: string;
    language: string;
  }) => {
    const text = String(rawPrompt || "").trim();
    const required = [
      "# Identidad",
      "# Contexto",
      "# Estilo",
      "# Flujo Conversacional",
      "# Reglas",
      "# Variables de Entrada",
    ];

    const hasAll = required.every((h) => text.toLowerCase().includes(h.toLowerCase()));
    if (hasAll) return text;

    const structured = [
      "# Identidad",
      `- Eres **${params.identityName || "Asistente"}**.`,
      `- Tu propósito principal es: **${params.purpose || "Atender y calificar usuarios"}**.`,
      `- Idioma principal: ${params.language || "es-ES"}.`,
      "",
      "# Contexto",
      `- Empresa: ${params.companyName || "Empresa"}`,
      params.companyDesc ? `- Descripción: ${params.companyDesc}` : "- Usa únicamente contexto validado del negocio.",
      "",
      "# Estilo",
      "- Tono claro, profesional y humano.",
      "- Respuestas breves y accionables.",
      "",
      "# Flujo Conversacional",
      "1. Saluda y confirma intención.",
      "2. Haz preguntas clave de calificación.",
      "3. Resume y propone siguiente paso.",
      "",
      "# Reglas",
      "- No inventar datos ni promesas no autorizadas.",
      "- Si falta información, preguntar antes de asumir.",
      "",
      "# Variables de Entrada",
      "- {{contact_name}}",
      "- {{contact_phone}}",
      "- {{contact_email}}",
    ].join("\n");

    if (!text) return structured;
    return `${structured}\n\n# Contexto adicional\n${text}`;
  };

  const [edit, setEdit] = useState({
    name: "",
    role: "",
    prompt: "",
    voice: "marin",
    voiceModel: "Elevenlabs Turbo V2.5",
    voiceSpeed: 1.0,
    voiceTemperature: 1.0,
    voiceVolume: 1.0,
  });

  useEffect(() => {
    if (!agentId) return;
    fetchAgent();
  }, [agentId]);

  useEffect(() => {
    if (!agent) return;
    if (agent.type === "voice") {
      if (!["contexto", "probar", "configuracion", "analisis", "registro", "metrica"].includes(tab)) {
        setTab("contexto");
      }
      return;
    }
    if (agent.type === "text") {
      if (!["overview", "contexto", "configuracion", "cerebro", "publicar", "integraciones", "historial", "prueba"].includes(tab)) {
        setTab("overview");
      }
    }
  }, [agent, tab]);

  // ✅ IMPORTANTE: Agentes requiere login independiente
  // ✅ IMPORTANTE: Agentes requiere login COMPLETAMENTE independiente
  useEffect(() => {
    let mounted = true;
    
    const initDetail = async () => {
      const { data } = await supabaseAgents.auth.getSession();
      const u = data?.session?.user || null;

      if (!mounted) return;

      setUser(u);
      setAuthLoading(false);
      setOpenAuth(!u);
    };
    
    initDetail();

    const { data: sub } = supabaseAgents.auth.onAuthStateChange((event, session) => {
      const u = session?.user || null;
      if (event === "SIGNED_IN" && u) {
        setUser(u);
        setOpenAuth(false);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setOpenAuth(true);
      }
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  const authed = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      return await authedFetch(input, init);
    } catch (e) {
      if (e instanceof AuthRequiredError) setOpenAuth(true);
      throw e;
    }
  };

  const fetchAgent = async () => {
    try {
      const res = await authed(`/api/agents/detail?id=${agentId}`);
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo cargar");

      const data = json.data?.agent;
      const convs = json.data?.conversations || [];
      setAgent(data);
      setConversations(convs);

      const cfg = data?.configuration || {};
      const prompt = data?.type === "flow" ? (cfg?.flow?.notes || "") : (cfg?.system_prompt || "");
      const normalizedPrompt = data?.type === "voice"
        ? ensureVoicePromptStructure(prompt, {
            identityName: String(cfg?.identity_name || data?.name || ""),
            purpose: String(cfg?.purpose || data?.description || ""),
            companyName: String(cfg?.company_name || ""),
            companyDesc: String(cfg?.company_desc || ""),
            language: String(cfg?.language || "es-ES"),
          })
        : prompt;
      const vs = data?.voice_settings || {};
      setEdit({
        name: data?.name || "",
        role: data?.description || "",
        prompt: normalizedPrompt,
        voice: data?.voice_settings?.voice_id || "marin",
        voiceModel: String(vs.voice_model || vs.model || "Elevenlabs Turbo V2.5"),
        voiceSpeed: Number(vs.voice_speed ?? vs.speed ?? 1.0),
        voiceTemperature: Number(vs.voice_temperature ?? vs.temperature ?? 1.0),
        voiceVolume: Number(vs.voice_volume ?? vs.volume ?? 1.0),
      });

      setCtxForm({
        companyName: String(cfg?.company_name || ""),
        companyUrl: String(cfg?.company_url || ""),
        companyDesc: String(cfg?.company_desc || ""),
        language: String(cfg?.language || "es-ES"),
        identityName: String(cfg?.identity_name || data?.name || ""),
        purpose: String(cfg?.purpose || data?.description || ""),
        importantInstructions: String(cfg?.important_instructions || normalizedPrompt || ""),
        callerIdNumber: String(cfg?.voice?.transfer_number || ""),
      });

      setBrainForm({
        contextName: String(cfg?.brain?.context_name || `${data?.name || "Agente"} Brain`),
        contextDescription: String(cfg?.brain?.context_description || "Memoria del agente"),
        websiteUrl: String(cfg?.brain?.website_url || ""),
        files: Array.isArray(cfg?.brain?.files) ? cfg.brain.files : [],
      });

      setPublishForm({
        isPublic: data?.status === "active",
        additionalInstructions: Boolean(cfg?.publish?.additional_instructions),
        welcomeMessage: String(cfg?.publish?.welcome_message || `!Bienvenido a ${data?.name || "tu agente"}! ¿Cómo puedo ayudarte hoy?`),
        examples: Array.isArray(cfg?.publish?.examples) && cfg.publish.examples.length ? cfg.publish.examples : ["What services do you offer?", "How can I contact support?", "Where can I find pricing details?"],
        bgColor: String(cfg?.publish?.widget?.bg_color || "#1f2937"),
        primaryColor: String(cfg?.publish?.widget?.primary_color || "#a3e635"),
        autoOpen: Boolean(cfg?.publish?.widget?.auto_open),
      });

      setAnalysisForm({
        objective: String(
          cfg?.voice_analysis?.objective ||
            "Evalúa si el agente parece haber tenido una llamada exitosa con el usuario, donde la llamada finaliza sin cortes inesperados."
        ),
        variables:
          Array.isArray(cfg?.voice_analysis?.variables) && cfg.voice_analysis.variables.length
            ? cfg.voice_analysis.variables.map((v: any) => String(v || "")).filter(Boolean)
            : ["call_summary"],
      });

      setVoiceCfg({
        backgroundSound: Boolean(cfg?.voice_runtime?.voice?.background_sound ?? false),
        sensitivity: Number(cfg?.voice_runtime?.voice?.sensitivity ?? 1),
        interruptionSensitivity: Number(cfg?.voice_runtime?.voice?.interruption_sensitivity ?? 0.8),
        activeListening: Boolean(cfg?.voice_runtime?.voice?.active_listening ?? true),
        boostedKeywords: String(cfg?.voice_runtime?.voice?.boosted_keywords ?? ""),
        cleanSpeech: Boolean(cfg?.voice_runtime?.voice?.clean_speech ?? true),
        transcriptFormatMode: String(cfg?.voice_runtime?.voice?.transcript_format_mode || "fast") === "accurate" ? "accurate" : "fast",
        reminderFrequencyMs: Number(cfg?.voice_runtime?.voice?.reminder_frequency_ms ?? 10000),
        reminderTimes: Number(cfg?.voice_runtime?.voice?.reminder_times ?? 1),
      });

      setConversationCfg({
        backgroundSound: Boolean(cfg?.voice_runtime?.conversation?.background_sound ?? false),
        sensitivity: Number(cfg?.voice_runtime?.conversation?.sensitivity ?? 1),
        interruptionSensitivity: Number(cfg?.voice_runtime?.conversation?.interruption_sensitivity ?? 0.8),
        activeListening: Boolean(cfg?.voice_runtime?.conversation?.active_listening ?? true),
        boostedKeywords: String(cfg?.voice_runtime?.conversation?.boosted_keywords ?? ""),
        cleanSpeech: Boolean(cfg?.voice_runtime?.conversation?.clean_speech ?? true),
        transcriptFormatMode: String(cfg?.voice_runtime?.conversation?.transcript_format_mode || "fast") === "accurate" ? "accurate" : "fast",
        reminderFrequencyMs: Number(cfg?.voice_runtime?.conversation?.reminder_frequency_ms ?? 10000),
        reminderTimes: Number(cfg?.voice_runtime?.conversation?.reminder_times ?? 1),
      });

      setCallCfg({
        voicemailDetection: Boolean(cfg?.voice_runtime?.calls?.voicemail_detection ?? true),
        voicemailBehavior: String(cfg?.voice_runtime?.calls?.voicemail_behavior || "hangup") === "leave_message" ? "leave_message" : "hangup",
        endCallSilenceSec: Number(cfg?.voice_runtime?.calls?.end_call_silence_sec ?? 30),
        maxCallDurationSec: Number(cfg?.voice_runtime?.calls?.max_call_duration_sec ?? 600),
        initialResponseDelaySec: Number(cfg?.voice_runtime?.calls?.initial_response_delay_sec ?? 0),
      });

      setKeyboardCfg({
        detectDtmf: Boolean(cfg?.voice_runtime?.keyboard?.detect_dtmf ?? true),
      });

      setActionsCfg(
        Array.isArray(cfg?.voice_runtime?.actions?.enabled)
          ? cfg.voice_runtime.actions.enabled.map((a: any) => String(a || "")).filter(Boolean)
          : ["call_end", "end_call"]
      );

      setBrainsAdvancedCfg({
        chunksToRetrieve: Number(cfg?.brain?.advanced?.chunks_to_retrieve ?? 3),
        similarityThreshold: Number(cfg?.brain?.advanced?.similarity_threshold ?? 0.6),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleAgentStatus = async () => {
    if (!agent) return;
    const newStatus: AgentStatus = agent.status === "active" ? "paused" : "active";
    try {
      const res = await authed("/api/agents/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: agentId, patch: { status: newStatus } }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo actualizar");
      setAgent({ ...agent, status: newStatus });
    } catch (e) {
      console.error(e);
      alert("No se pudo actualizar el estado");
    }
  };

  const saveSettings = async () => {
    if (!agent) return;
    setSaving(true);
    try {
      const nextCfg = { ...(agent.configuration || {}) };
      const kind = String(nextCfg?.agent_kind || "agent");

      nextCfg.company_name = ctxForm.companyName;
      nextCfg.company_url = ctxForm.companyUrl;
      nextCfg.company_desc = ctxForm.companyDesc;
      nextCfg.language = ctxForm.language;
      nextCfg.identity_name = ctxForm.identityName || edit.name;
      nextCfg.purpose = ctxForm.purpose || edit.role;
      nextCfg.brain = {
        ...(nextCfg.brain || {}),
        context_name: brainForm.contextName,
        context_description: brainForm.contextDescription,
        website_url: brainForm.websiteUrl,
        files: brainForm.files,
      };
      nextCfg.publish = {
        ...(nextCfg.publish || {}),
        additional_instructions: publishForm.additionalInstructions,
        welcome_message: publishForm.welcomeMessage,
        examples: publishForm.examples,
        widget: {
          ...(nextCfg.publish?.widget || {}),
          bg_color: publishForm.bgColor,
          primary_color: publishForm.primaryColor,
          auto_open: publishForm.autoOpen,
        },
      };

      if (agent.type === "flow") {
        nextCfg.flow = { ...(nextCfg.flow || {}), goal: edit.role, notes: edit.prompt };
      } else if (kind === "notetaker") {
        nextCfg.notetaker = { ...(nextCfg.notetaker || {}), notes: edit.prompt };
      } else {
        const normalizedPrompt = ensureVoicePromptStructure(edit.prompt, {
          identityName: ctxForm.identityName || edit.name,
          purpose: ctxForm.purpose || edit.role,
          companyName: ctxForm.companyName,
          companyDesc: ctxForm.companyDesc,
          language: ctxForm.language,
        });
        nextCfg.important_instructions = normalizedPrompt;
        nextCfg.system_prompt = normalizedPrompt;
        nextCfg.voice = {
          ...(nextCfg.voice || {}),
          transfer_number: ctxForm.callerIdNumber,
        };
        nextCfg.voice_analysis = {
          ...(nextCfg.voice_analysis || {}),
          objective: analysisForm.objective,
          variables: analysisForm.variables,
        };
        nextCfg.voice_runtime = {
          ...(nextCfg.voice_runtime || {}),
          voice: {
            background_sound: voiceCfg.backgroundSound,
            sensitivity: voiceCfg.sensitivity,
            interruption_sensitivity: voiceCfg.interruptionSensitivity,
            active_listening: voiceCfg.activeListening,
            boosted_keywords: voiceCfg.boostedKeywords,
            clean_speech: voiceCfg.cleanSpeech,
            transcript_format_mode: voiceCfg.transcriptFormatMode,
            reminder_frequency_ms: voiceCfg.reminderFrequencyMs,
            reminder_times: voiceCfg.reminderTimes,
          },
          conversation: {
            background_sound: conversationCfg.backgroundSound,
            sensitivity: conversationCfg.sensitivity,
            interruption_sensitivity: conversationCfg.interruptionSensitivity,
            active_listening: conversationCfg.activeListening,
            boosted_keywords: conversationCfg.boostedKeywords,
            clean_speech: conversationCfg.cleanSpeech,
            transcript_format_mode: conversationCfg.transcriptFormatMode,
            reminder_frequency_ms: conversationCfg.reminderFrequencyMs,
            reminder_times: conversationCfg.reminderTimes,
          },
          calls: {
            voicemail_detection: callCfg.voicemailDetection,
            voicemail_behavior: callCfg.voicemailBehavior,
            end_call_silence_sec: callCfg.endCallSilenceSec,
            max_call_duration_sec: callCfg.maxCallDurationSec,
            initial_response_delay_sec: callCfg.initialResponseDelaySec,
          },
          keyboard: {
            detect_dtmf: keyboardCfg.detectDtmf,
          },
          actions: {
            enabled: actionsCfg,
          },
        };
        nextCfg.brain = {
          ...(nextCfg.brain || {}),
          advanced: {
            ...(nextCfg.brain?.advanced || {}),
            chunks_to_retrieve: brainsAdvancedCfg.chunksToRetrieve,
            similarity_threshold: brainsAdvancedCfg.similarityThreshold,
          },
        };
      }

      const patch: any = {
        name: edit.name,
        description: edit.role,
        configuration: nextCfg,
        status: publishForm.isPublic ? "active" : "draft",
      };

      if (agent.type === "voice") {
        patch.voice_settings = {
          ...(agent.voice_settings || {}),
          voice_id: edit.voice,
          voice_model: edit.voiceModel,
          voice_speed: edit.voiceSpeed,
          voice_temperature: edit.voiceTemperature,
          voice_volume: edit.voiceVolume,
        };
      }

      const res = await authed("/api/agents/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: agentId, patch }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo guardar");
      await fetchAgent();
    } catch (e) {
      console.error(e);
      alert("No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const genCompanyContext = async () => {
    const url = String(ctxForm.companyUrl || "").trim();
    if (!url) {
      setContextError("Agrega una URL de la empresa");
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
      if (!res.ok) throw new Error(json?.error || "No se pudo traer contexto");

      const suggestion = String(json?.suggested_company_desc || "").trim();
      if (!suggestion) {
        setContextError("No se encontro contenido util en esa URL");
        return;
      }

      setCtxForm((s) => ({
        ...s,
        companyDesc: s.companyDesc.trim() ? `${s.companyDesc.trim()}\n\n${suggestion}` : suggestion,
      }));
    } catch (e: any) {
      setContextError(e?.message || "No se pudo traer contexto");
    } finally {
      setContextLoading(false);
    }
  };

  const improvePromptWithAI = async () => {
    setImprovingPrompt(true);
    try {
      const name = (ctxForm.identityName || edit.name || agent?.name || "Agente").trim();
      const purpose = (ctxForm.purpose || edit.role || "Asistente de voz").trim();
      const company = (ctxForm.companyName || "Empresa").trim();
      const companyDesc = (ctxForm.companyDesc || "").trim();
      const lang = ctxForm.language || "es-ES";
      const keywords = [
        ...(voiceCfg.boostedKeywords || "").split(",").map((k) => k.trim()).filter(Boolean),
        ...(conversationCfg.boostedKeywords || "").split(",").map((k) => k.trim()).filter(Boolean),
      ];
      const uniqueKeywords = Array.from(new Set(keywords));

      const basePrompt = [
        "# Identidad",
        `- Eres **${name}**.`,
        `- Tu propósito principal es: **${purpose}**.`,
        `- Hablas en ${lang}.`,
        "",
        "# Contexto",
        `- Empresa: ${company}`,
        companyDesc ? `- Descripción: ${companyDesc}` : "- Usa solo información validada por el negocio.",
        "",
        "# Estilo",
        "- Responde con claridad y brevedad.",
        "- Mantén tono profesional, natural y orientado a resolver.",
        "- Si falta información, pregunta de forma concreta antes de asumir.",
        "",
        "# Flujo Conversacional",
        "1. Saluda y confirma intención del usuario.",
        "2. Haz preguntas de calificación relevantes.",
        "3. Resume y confirma siguiente paso.",
        "",
        "# Reglas",
        "- No inventes datos sensibles ni promesas no autorizadas.",
        "- Si el usuario pide humano, ofrece transferencia o callback.",
        uniqueKeywords.length ? `- Prioriza estas palabras clave: ${uniqueKeywords.join(", ")}.` : "- Prioriza los objetivos del negocio en cada respuesta.",
        "",
        "# Variables de Entrada",
        "- {{contact_name}}",
        "- {{contact_phone}}",
        "- {{contact_email}}",
      ].join("\n");

      setEdit((s) => ({ ...s, prompt: basePrompt }));
      setCtxForm((s) => ({ ...s, importantInstructions: basePrompt }));
    } finally {
      setImprovingPrompt(false);
    }
  };

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(c =>
      (c.contact_name || "").toLowerCase().includes(q) ||
      (c.contact_phone || "").toLowerCase().includes(q) ||
      (c.channel || "").toLowerCase().includes(q)
    );
  }, [conversations, search]);

  const promptIndex = useMemo(() => {
    const lines = String(edit.prompt || "").split("\n");
    const heads = lines
      .map(l => l.trim())
      .filter(l => l.startsWith("#"))
      .map(l => l.replace(/^#+\s*/, "").trim())
      .filter(Boolean);
    return heads.length
      ? heads.slice(0, 12)
      : ["Identidad", "Contexto", "Estilo", "Flujo Conversacional", "Reglas", "Variables de Entrada"];
  }, [edit.prompt]);

  const voiceMetrics = useMemo(() => {
    const calls = conversations || [];
    const totalCalls = calls.length;
    const connectedCalls = calls.filter((c) => (Number(c.duration_seconds || 0) || 0) > 0).length;
    const totalDuration = calls.reduce((sum, c) => sum + (Number(c.duration_seconds || 0) || 0), 0);
    const avgDuration = totalCalls ? totalDuration / totalCalls : 0;
    const uniqueContacts = new Set(calls.map((c) => String(c.contact_phone || c.contact_name || c.id))).size;
    return {
      totalCalls,
      connectedCalls,
      uniqueContacts,
      avgDuration,
      connectionRate: totalCalls ? (connectedCalls / totalCalls) * 100 : 0,
      creditsUsed: Number(agent?.credits_used || 0),
    };
  }, [conversations, agent?.credits_used]);

  const flex = (extra?: React.CSSProperties): React.CSSProperties => ({ display: "flex", ...extra });
  const col = (extra?: React.CSSProperties): React.CSSProperties => ({ display: "flex", flexDirection: "column", ...extra });
  const input = (extra?: React.CSSProperties): React.CSSProperties => ({
    width: "100%",
    boxSizing: "border-box" as const,
    padding: "13px 16px",
    backgroundColor: C.dark,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    color: C.white,
    fontSize: 15,
    outline: "none",
    ...extra,
  });
  const fmtDuration = (secs: number) => {
    const s = Math.max(0, Math.floor(secs || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, "0")}m ${String(r).padStart(2, "0")}s`;
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: C.bg, ...flex({ alignItems: "center", justifyContent: "center" }), fontFamily: "Inter,-apple-system,sans-serif", color: C.white }}>
        Cargando agente...
      </div>
    );
  }

  if (!agent) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: C.bg, ...flex({ alignItems: "center", justifyContent: "center" }), fontFamily: "Inter,-apple-system,sans-serif", color: C.white }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>🤖</div>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Agente no encontrado</div>
          <button onClick={() => router.push("/start/agents")} style={{ background: "none", border: "none", color: C.blue, cursor: "pointer", fontWeight: 800 }}>
            Volver a Agentes
          </button>
        </div>
      </div>
    );
  }

  const cfg = agent.configuration || {};
  const agentKind = String(cfg?.agent_kind || "agent");
  const badge = typeBadge(agent.type);
  const headerTitle = titleFor(agent.type, agentKind);
  const tabs = (
    agent.type === "text"
      ? [
          { id: "overview", label: "Resumen" },
          { id: "contexto", label: "Contexto" },
          { id: "configuracion", label: "Configuración" },
          { id: "cerebro", label: "Cerebro" },
          { id: "publicar", label: "Publicar" },
          { id: "integraciones", label: "Integraciones" },
          { id: "historial", label: "Historial" },
          { id: "prueba", label: "Prueba" },
        ]
      : [
          { id: "contexto", label: "Contexto" },
          { id: "probar", label: "Probar agente" },
          { id: "configuracion", label: "Configuración" },
          { id: "analisis", label: "Análisis de llamadas" },
          { id: "registro", label: "Registro de llamadas" },
          { id: "metrica", label: "Métrica" },
        ]
  );

  return (
    <div style={{ ...flex(), minHeight: "100vh", backgroundColor: C.bg, fontFamily: "Inter,-apple-system,sans-serif", color: C.white }}>

      <AuthModal
        open={openAuth}
        onClose={() => {
          setOpenAuth(false);
          router.push("/");
        }}
         onLoggedIn={() => {
           setOpenAuth(false);
           fetchAgent();
         }}
       />
      {/* sidebar */}
      <aside style={{ ...col(), width: 260, minWidth: 260, backgroundColor: C.sidebar, borderRight: `1px solid ${C.border}`, position: "fixed", top: 0, left: 0, bottom: 0 }}>
        <div style={{ ...flex({ alignItems: "center", gap: 10 }), padding: "20px 16px 10px" }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: C.blue, ...flex({ alignItems: "center", justifyContent: "center" }) }}>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 18 }}>B</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 22 }}>Botz</span>
        </div>

        <nav style={{ padding: "0 12px", flex: 1 }}>
          <button
            onClick={() => router.push("/start/agents")}
            style={{ width: "100%", ...flex({ alignItems: "center", gap: 10 }), padding: "10px 12px", borderRadius: 8, background: "none", border: "none", color: C.muted, cursor: "pointer", textAlign: "left" }}
          >
            <span>←</span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>Agentes</span>
          </button>
        </nav>

        <div style={{ ...flex({ alignItems: "center", gap: 10 }), padding: "12px 16px", borderTop: `1px solid ${C.border}` }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: C.blue, ...flex({ alignItems: "center", justifyContent: "center" }), color: "#fff", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
            {user?.email?.charAt(0).toUpperCase() || "U"}
          </div>
          <span style={{ color: C.muted, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user?.email || "usuario@email.com"}
          </span>
        </div>
      </aside>

      {/* main */}
      <main style={{ ...col(), marginLeft: 260, flex: 1, minWidth: 0 }}>
        {/* top */}
        <div style={{ height: 64, borderBottom: `1px solid ${C.border}`, ...flex({ alignItems: "center", justifyContent: "space-between" }), padding: "0 32px", backgroundColor: C.bg, position: "sticky", top: 0, zIndex: 10 }}>
          <div style={flex({ alignItems: "center", gap: 10 })}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>{agent.name}</div>
            <span style={{ padding: "3px 10px", borderRadius: 99, backgroundColor: badge.bg, color: badge.fg, fontSize: 12, fontWeight: 900 }}>
              {badge.label}
            </span>
            {agentKind === "notetaker" && (
              <span style={{ padding: "3px 10px", borderRadius: 99, backgroundColor: "rgba(163,230,53,.15)", color: C.lime, fontSize: 12, fontWeight: 900 }}>
                Copiloto IA
              </span>
            )}
            <span style={{ color: C.dim, fontSize: 12 }}>{headerTitle}</span>
          </div>

          <div style={flex({ alignItems: "center", gap: 10 })}>
            <button
              onClick={toggleAgentStatus}
              style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, backgroundColor: C.dark, color: C.white, cursor: "pointer", fontWeight: 900, fontSize: 13 }}
            >
              {agent.status === "active" ? "Pausar" : "Activar"}
            </button>
          </div>
        </div>

        {/* tabs */}
        <div style={{ borderBottom: `1px solid ${C.border}`, backgroundColor: C.bg }}>
          <div style={{ ...flex({ alignItems: "center", gap: 4 }), padding: "0 18px" }}>
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id as any)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "14px 14px",
                  color: tab === t.id ? C.white : C.muted,
                  fontWeight: tab === t.id ? 900 : 800,
                  borderBottom: tab === t.id ? `2px solid ${C.blue}` : "2px solid transparent",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: "32px 32px" }}>
          {tab === "overview" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14 }}>
                {[
                  { label: "Conversaciones", value: agent.total_conversations ?? 0 },
                  { label: "Mensajes", value: agent.total_messages ?? 0 },
                  { label: "Creditos usados", value: agent.credits_used ?? 0 },
                  { label: "Creado", value: new Date(agent.created_at).toLocaleDateString() },
                ].map((m, i) => (
                  <div key={i} style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16 }}>
                    <div style={{ color: C.dim, fontSize: 12, marginBottom: 10 }}>{m.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 900 }}>{String(m.value)}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 14, backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18 }}>
                <div style={{ ...flex({ alignItems: "center", justifyContent: "space-between" }), marginBottom: 10 }}>
                  <div style={{ fontWeight: 900 }}>Contexto</div>
                  <div style={{ color: C.dim, fontSize: 12 }}>Empresa + configuracion</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div style={{ backgroundColor: C.dark, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12 }}>
                    <div style={{ color: C.dim, fontSize: 12, marginBottom: 6 }}>Empresa</div>
                    <div style={{ color: C.white, fontWeight: 900 }}>{String(cfg?.company_name || "-")}</div>
                    <div style={{ color: C.muted, fontSize: 13, marginTop: 6, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{String(cfg?.company_desc || "-")}</div>
                  </div>
                  <div style={{ backgroundColor: C.dark, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12 }}>
                    <div style={{ color: C.dim, fontSize: 12, marginBottom: 6 }}>Prompt / Notas</div>
                    <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                      {agent.type === "flow" ? String(cfg?.flow?.notes || "-") : String(cfg?.system_prompt || "-")}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === "conversaciones" && (
            <div style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
              <div style={{ padding: 16, borderBottom: `1px solid ${C.border}`, ...flex({ alignItems: "center", justifyContent: "space-between", gap: 12 }) }}>
                <div style={{ fontWeight: 900 }}>Conversaciones</div>
                <div style={{ width: 320, maxWidth: "60%" }}>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." style={input()} />
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
                  <thead>
                    <tr style={{ backgroundColor: C.dark }}>
                      {[
                        "Contacto",
                        "Canal",
                        "Estado",
                        "Mensajes",
                        "Duracion",
                        "Fecha",
                      ].map(h => (
                        <th key={h} style={{ textAlign: "left", fontSize: 12, color: C.dim, padding: "12px 14px", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredConversations.map(c => (
                      <tr key={c.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ fontWeight: 900 }}>{c.contact_name || "-"}</div>
                          <div style={{ color: C.dim, fontSize: 12 }}>{c.contact_phone || ""}</div>
                        </td>
                        <td style={{ padding: "12px 14px", color: C.muted, fontSize: 13 }}>{c.channel}</td>
                        <td style={{ padding: "12px 14px", color: C.muted, fontSize: 13 }}>{c.status}</td>
                        <td style={{ padding: "12px 14px", color: C.white, fontWeight: 900 }}>{c.message_count}</td>
                        <td style={{ padding: "12px 14px", color: C.muted, fontSize: 13 }}>
                          {typeof c.duration_seconds === "number" && c.duration_seconds > 0 ? `${Math.floor(c.duration_seconds / 60)}m` : "-"}
                        </td>
                        <td style={{ padding: "12px 14px", color: C.dim, fontSize: 13 }}>{new Date(c.started_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredConversations.length === 0 && (
                  <div style={{ padding: 30, textAlign: "center", color: C.muted }}>
                    No hay conversaciones aun.
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "prueba" && agent.type === "text" && (
            <div style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18, minHeight: 620, display: "flex" }}>
              <ChatTestPanel
                agentName={edit.name || agent.name}
                agentRole={edit.role || agent.description}
                agentPrompt={edit.prompt || String(cfg?.system_prompt || "")}
                companyContext={ctxForm.companyDesc || String(cfg?.company_desc || "")}
                brainFiles={Array.isArray(brainForm.files) ? brainForm.files : []}
              />
            </div>
          )}

          {tab === "historial" && (
            <div style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, minHeight: "600px" }}>
              <HistoryPanel
                agentId={agentId}
                onEdit={(conversation) => {
                  setSelectedConversation(conversation);
                  setShowEditModal(true);
                }}
                onDelete={(conversationId) => {
                  console.log("Deleting conversation:", conversationId);
                }}
                onOpenContext={() => {
                  setTab("overview");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                onOpenSettings={() => {
                  setTab("configuracion");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                onOpenBrain={() => {
                  setTab("cerebro");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </div>
          )}

          {tab === "contexto" && (
            <div style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
              <div style={{ ...flex({ alignItems: "center", justifyContent: "space-between" }), marginBottom: 20 }}>
                <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>Contexto de la Empresa</h2>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={genCompanyContext}
                    disabled={contextLoading}
                    style={{ padding: "10px 16px", borderRadius: 10, border: `1px solid ${C.border}`, backgroundColor: "transparent", color: C.white, fontWeight: 800, cursor: contextLoading ? "not-allowed" : "pointer" }}
                  >
                    {contextLoading ? "Trayendo..." : "Traer desde URL"}
                  </button>
                  <button
                    onClick={saveSettings}
                    disabled={saving}
                    style={{ padding: "10px 16px", borderRadius: 10, border: "none", backgroundColor: saving ? C.dim : C.lime, color: "#111", fontWeight: 900, cursor: saving ? "not-allowed" : "pointer" }}
                  >
                    {saving ? "Guardando..." : "Guardar contexto"}
                  </button>
                </div>
              </div>

              {contextError && (
                <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 10, border: `1px solid rgba(239,68,68,0.35)`, backgroundColor: "rgba(239,68,68,0.12)", color: "#fca5a5", fontSize: 12 }}>
                  {contextError}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 22 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 8 }}>Nombre de la Empresa</label>
                  <input
                    value={ctxForm.companyName}
                    onChange={(e) => setCtxForm((s) => ({ ...s, companyName: e.target.value }))}
                    style={input()}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 8 }}>URL de la Empresa</label>
                  <input
                    value={ctxForm.companyUrl}
                    onChange={(e) => setCtxForm((s) => ({ ...s, companyUrl: e.target.value }))}
                    style={input()}
                  />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 8 }}>Descripción</label>
                  <textarea
                    value={ctxForm.companyDesc}
                    onChange={(e) => setCtxForm((s) => ({ ...s, companyDesc: e.target.value }))}
                    rows={7}
                    style={{ ...input({ minHeight: 160 }), resize: "vertical" as const }}
                  />
                </div>
              </div>

              {agent.type === "voice" && (
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20, display: "grid", gap: 14 }}>
                  <div style={{ fontWeight: 900, fontSize: 18 }}>Contexto del agente</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 8 }}>Idioma</label>
                      <select
                        value={ctxForm.language}
                        onChange={(e) => setCtxForm((s) => ({ ...s, language: e.target.value }))}
                        style={input({ appearance: "none" as const })}
                      >
                        <option value="es-ES">Español - España</option>
                        <option value="es-MX">Español - LatAm</option>
                        <option value="en-US">English - US</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 8 }}>Nombre de identidad</label>
                      <input
                        value={ctxForm.identityName}
                        onChange={(e) => {
                          const v = e.target.value;
                          setCtxForm((s) => ({ ...s, identityName: v }));
                          setEdit((s) => ({ ...s, name: v }));
                        }}
                        style={input()}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 8 }}>Propósito</label>
                    <select
                      value={ctxForm.purpose}
                      onChange={(e) => {
                        const v = e.target.value;
                        setCtxForm((s) => ({ ...s, purpose: v }));
                        setEdit((s) => ({ ...s, role: v }));
                      }}
                      style={input({ appearance: "none" as const })}
                    >
                      <option value="">Selecciona propósito</option>
                      {PURPOSE_OPTIONS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 8 }}>Instrucciones importantes</label>
                    <textarea
                      value={ctxForm.importantInstructions}
                      onChange={(e) => {
                        const v = e.target.value;
                        setCtxForm((s) => ({ ...s, importantInstructions: v }));
                        setEdit((s) => ({ ...s, prompt: v }));
                      }}
                      rows={6}
                      style={{ ...input({ minHeight: 140 }), resize: "vertical" as const }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 8 }}>
                      Identificador de llamadas (opcional)
                    </label>
                    <div style={{ color: C.dim, fontSize: 12, marginBottom: 8 }}>
                      Numero que veran los contactos en llamadas salientes.
                    </div>
                    <input
                      value={ctxForm.callerIdNumber}
                      onChange={(e) => setCtxForm((s) => ({ ...s, callerIdNumber: e.target.value }))}
                      placeholder="+57 300 123 4567"
                      style={input()}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 8 }}>
                      ID de agente para flujos
                    </label>
                    <div style={{ ...flex({ alignItems: "center", justifyContent: "space-between", gap: 10 }), backgroundColor: C.dark, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px" }}>
                      <span style={{ color: C.white, fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace", fontSize: 13, wordBreak: "break-all" as const }}>
                        {agent.id}
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(String(agent.id || ""));
                          } catch {
                            // ignore
                          }
                        }}
                        style={{ border: `1px solid ${C.border}`, backgroundColor: "transparent", color: C.white, borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontWeight: 800, flexShrink: 0 }}
                      >
                        Copiar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "probar" && agent.type === "voice" && (
            <div style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18, minHeight: 620 }}>
              <VoiceTestPanel
                agentName={edit.name || agent.name}
                agentRole={edit.role || agent.description}
                agentPrompt={edit.prompt || String(cfg?.system_prompt || "")}
                companyContext={ctxForm.companyDesc || String(cfg?.company_desc || "")}
                voiceSettings={{
                  voice: edit.voice,
                  model: "gpt-4.1",
                }}
              />
            </div>
          )}

          {tab === "configuracion" && (
            <>
               {agent.type === "voice" && agentKind !== "notetaker" ? (
                <div style={{ ...col(), gap: 14 }}>
                  <div style={{ ...flex({ alignItems: "center", justifyContent: "space-between" }) }}>
                    <div style={{ fontWeight: 900, fontSize: 18 }}>Configuración</div>
                    <button
                      onClick={saveSettings}
                      disabled={saving}
                      style={{ padding: "12px 18px", borderRadius: 12, border: "none", backgroundColor: saving ? C.dim : C.lime, color: "#111", cursor: saving ? "not-allowed" : "pointer", fontWeight: 900 }}
                    >
                      {saving ? "Guardando..." : "Guardar cambios"}
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "360px 1fr 220px", gap: 14 }}>
                    {/* left voice panel */}
                    <div style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18 }}>
                      <div style={{ display: "grid", gap: 12 }}>
                        <details open style={{ backgroundColor: C.dark, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12 }}>
                          <summary style={{ cursor: "pointer", fontWeight: 900, marginBottom: 12 }}>🔊 Configuración de voz</summary>
                          <div style={{ display: "grid", gap: 10 }}>
                            <select value={edit.voice} onChange={e => setEdit(s => ({ ...s, voice: e.target.value }))} style={input({ appearance: "none" as const })}>
                              {(["marin", "cedar", "coral", "alloy", "ash", "ballad", "echo", "fable", "nova", "onyx", "sage", "shimmer", "verse"] as const).map(v => (
                                <option key={v} value={v}>{v}</option>
                              ))}
                            </select>
                            <select value={edit.voiceModel} onChange={e => setEdit(s => ({ ...s, voiceModel: e.target.value }))} style={input({ appearance: "none" as const })}>
                              {["Elevenlabs Turbo V2.5", "OpenAI TTS", "Azure Neural"].map(m => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                            <label style={{ ...flex({ alignItems: "center", justifyContent: "space-between" }), color: C.muted, fontSize: 13 }}>
                              <span>Sonido de fondo</span>
                              <input type="checkbox" checked={voiceCfg.backgroundSound} onChange={e => setVoiceCfg(s => ({ ...s, backgroundSound: e.target.checked }))} />
                            </label>
                            <div style={{ color: C.muted, fontSize: 13 }}>Sensibilidad {voiceCfg.sensitivity.toFixed(1)}</div>
                            <input type="range" min={0.2} max={2} step={0.1} value={voiceCfg.sensitivity} onChange={e => setVoiceCfg(s => ({ ...s, sensitivity: Number(e.target.value) }))} />
                            <div style={{ color: C.muted, fontSize: 13 }}>Sensibilidad a la interrupción {voiceCfg.interruptionSensitivity.toFixed(1)}</div>
                            <input type="range" min={0} max={1} step={0.1} value={voiceCfg.interruptionSensitivity} onChange={e => setVoiceCfg(s => ({ ...s, interruptionSensitivity: Number(e.target.value) }))} />
                            <label style={{ ...flex({ alignItems: "center", justifyContent: "space-between" }), color: C.muted, fontSize: 13 }}>
                              <span>Escucha activa</span>
                              <input type="checkbox" checked={voiceCfg.activeListening} onChange={e => setVoiceCfg(s => ({ ...s, activeListening: e.target.checked }))} />
                            </label>
                            <input value={voiceCfg.boostedKeywords} onChange={e => setVoiceCfg(s => ({ ...s, boostedKeywords: e.target.value }))} placeholder="hola, adiós" style={input()} />
                            <label style={{ ...flex({ alignItems: "center", justifyContent: "space-between" }), color: C.muted, fontSize: 13 }}>
                              <span>Habla limpia</span>
                              <input type="checkbox" checked={voiceCfg.cleanSpeech} onChange={e => setVoiceCfg(s => ({ ...s, cleanSpeech: e.target.checked }))} />
                            </label>
                            <select value={voiceCfg.transcriptFormatMode} onChange={e => setVoiceCfg(s => ({ ...s, transcriptFormatMode: e.target.value as any }))} style={input({ appearance: "none" as const })}>
                              <option value="fast">Rápido</option>
                              <option value="accurate">Preciso</option>
                            </select>
                            <div style={{ ...flex({ gap: 8 }) }}>
                              <input type="number" value={voiceCfg.reminderFrequencyMs} onChange={e => setVoiceCfg(s => ({ ...s, reminderFrequencyMs: Number(e.target.value || 0) }))} style={input({ flex: 1 })} />
                              <input type="number" value={voiceCfg.reminderTimes} onChange={e => setVoiceCfg(s => ({ ...s, reminderTimes: Number(e.target.value || 0) }))} style={input({ width: 90 })} />
                            </div>
                          </div>
                        </details>

                        <details style={{ backgroundColor: C.dark, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12 }}>
                          <summary style={{ cursor: "pointer", fontWeight: 900, marginBottom: 12 }}>🎙 Configuración de conversación</summary>
                          <div style={{ display: "grid", gap: 10 }}>
                            <label style={{ ...flex({ alignItems: "center", justifyContent: "space-between" }), color: C.muted, fontSize: 13 }}><span>Sonido de fondo</span><input type="checkbox" checked={conversationCfg.backgroundSound} onChange={e => setConversationCfg(s => ({ ...s, backgroundSound: e.target.checked }))} /></label>
                            <div style={{ color: C.muted, fontSize: 13 }}>Sensibilidad {conversationCfg.sensitivity.toFixed(1)}</div>
                            <input type="range" min={0.2} max={2} step={0.1} value={conversationCfg.sensitivity} onChange={e => setConversationCfg(s => ({ ...s, sensitivity: Number(e.target.value) }))} />
                            <div style={{ color: C.muted, fontSize: 13 }}>Sensibilidad a la interrupción {conversationCfg.interruptionSensitivity.toFixed(1)}</div>
                            <input type="range" min={0} max={1} step={0.1} value={conversationCfg.interruptionSensitivity} onChange={e => setConversationCfg(s => ({ ...s, interruptionSensitivity: Number(e.target.value) }))} />
                            <label style={{ ...flex({ alignItems: "center", justifyContent: "space-between" }), color: C.muted, fontSize: 13 }}><span>Escucha activa</span><input type="checkbox" checked={conversationCfg.activeListening} onChange={e => setConversationCfg(s => ({ ...s, activeListening: e.target.checked }))} /></label>
                            <input value={conversationCfg.boostedKeywords} onChange={e => setConversationCfg(s => ({ ...s, boostedKeywords: e.target.value }))} placeholder="hola, adiós" style={input()} />
                            <label style={{ ...flex({ alignItems: "center", justifyContent: "space-between" }), color: C.muted, fontSize: 13 }}><span>Habla limpia</span><input type="checkbox" checked={conversationCfg.cleanSpeech} onChange={e => setConversationCfg(s => ({ ...s, cleanSpeech: e.target.checked }))} /></label>
                            <select value={conversationCfg.transcriptFormatMode} onChange={e => setConversationCfg(s => ({ ...s, transcriptFormatMode: e.target.value as any }))} style={input({ appearance: "none" as const })}><option value="fast">Rápido</option><option value="accurate">Preciso</option></select>
                          </div>
                        </details>

                        <details style={{ backgroundColor: C.dark, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12 }}>
                          <summary style={{ cursor: "pointer", fontWeight: 900, marginBottom: 12 }}>📞 Configuración de llamadas</summary>
                          <div style={{ display: "grid", gap: 10 }}>
                            <label style={{ ...flex({ alignItems: "center", justifyContent: "space-between" }), color: C.muted, fontSize: 13 }}><span>Detección de Buzón de Voz</span><input type="checkbox" checked={callCfg.voicemailDetection} onChange={e => setCallCfg(s => ({ ...s, voicemailDetection: e.target.checked }))} /></label>
                            <select value={callCfg.voicemailBehavior} onChange={e => setCallCfg(s => ({ ...s, voicemailBehavior: e.target.value as any }))} style={input({ appearance: "none" as const })}>
                              <option value="hangup">Colgar si llega al buzón de voz</option>
                              <option value="leave_message">Dejar un mensaje si llega al buzón de voz</option>
                            </select>
                            <div style={{ color: C.muted, fontSize: 13 }}>Finalizar llamada en silencio (s)</div>
                            <input type="number" value={callCfg.endCallSilenceSec} onChange={e => setCallCfg(s => ({ ...s, endCallSilenceSec: Number(e.target.value || 0) }))} style={input()} />
                            <div style={{ color: C.muted, fontSize: 13 }}>Duración máxima de llamada (s)</div>
                            <input type="number" value={callCfg.maxCallDurationSec} onChange={e => setCallCfg(s => ({ ...s, maxCallDurationSec: Number(e.target.value || 0) }))} style={input()} />
                            <div style={{ color: C.muted, fontSize: 13 }}>Retraso de respuesta inicial (s)</div>
                            <input type="number" value={callCfg.initialResponseDelaySec} onChange={e => setCallCfg(s => ({ ...s, initialResponseDelaySec: Number(e.target.value || 0) }))} style={input()} />
                          </div>
                        </details>

                        <details style={{ backgroundColor: C.dark, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12 }}>
                          <summary style={{ cursor: "pointer", fontWeight: 900, marginBottom: 12 }}>⌨ Entrada del teclado</summary>
                          <label style={{ ...flex({ alignItems: "center", justifyContent: "space-between" }), color: C.muted, fontSize: 13 }}>
                            <span>Detección DTMF</span>
                            <input type="checkbox" checked={keyboardCfg.detectDtmf} onChange={e => setKeyboardCfg({ detectDtmf: e.target.checked })} />
                          </label>
                        </details>

                        <details style={{ backgroundColor: C.dark, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12 }}>
                          <summary style={{ cursor: "pointer", fontWeight: 900, marginBottom: 12 }}>⚙ Acciones del agente</summary>
                          <div style={{ display: "grid", gap: 8 }}>
                            {ACTION_TOOL_OPTIONS.map((tool) => {
                              const enabled = actionsCfg.includes(tool);
                              return (
                                <label key={tool} style={{ ...flex({ alignItems: "center", gap: 8 }), color: C.muted, fontSize: 13 }}>
                                  <input
                                    type="checkbox"
                                    checked={enabled}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setActionsCfg((prev) =>
                                        checked ? Array.from(new Set([...prev, tool])) : prev.filter((t) => t !== tool)
                                      );
                                    }}
                                  />
                                  <span>{tool}</span>
                                </label>
                              );
                            })}
                          </div>
                        </details>

                        <details style={{ backgroundColor: C.dark, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12 }}>
                          <summary style={{ cursor: "pointer", fontWeight: 900, marginBottom: 12 }}>🧠 Brains (Configuración avanzada)</summary>
                          <div style={{ display: "grid", gap: 10 }}>
                            <div style={{ color: C.muted, fontSize: 13 }}>Fragmentos a recuperar</div>
                            <input type="number" min={1} max={10} value={brainsAdvancedCfg.chunksToRetrieve} onChange={e => setBrainsAdvancedCfg(s => ({ ...s, chunksToRetrieve: Math.max(1, Math.min(10, Number(e.target.value || 1))) }))} style={input()} />
                            <div style={{ color: C.muted, fontSize: 13 }}>Umbral de similitud {brainsAdvancedCfg.similarityThreshold.toFixed(2)}</div>
                            <input type="range" min={0} max={1} step={0.01} value={brainsAdvancedCfg.similarityThreshold} onChange={e => setBrainsAdvancedCfg(s => ({ ...s, similarityThreshold: Number(e.target.value) }))} />
                          </div>
                        </details>
                      </div>
                    </div>

                    {/* middle prompt editor */}
                    <div style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18, minWidth: 0 }}>
                      <div style={{ ...flex({ alignItems: "center", justifyContent: "space-between" }), marginBottom: 12 }}>
                        <div style={{ fontWeight: 900 }}>Instrucciones</div>
                        <div style={{ color: C.dim, fontSize: 12, fontWeight: 900 }}>Modelo: GPT 4.1</div>
                      </div>
                      <textarea
                        value={edit.prompt}
                        onChange={e => setEdit(s => ({ ...s, prompt: e.target.value }))}
                        rows={22}
                        style={{ ...input({ minHeight: 520, fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace" }), resize: "vertical" as const }}
                      />
                      <div style={{ ...flex({ alignItems: "center", justifyContent: "space-between" }), marginTop: 12 }}>
                        <button
                          onClick={improvePromptWithAI}
                          disabled={improvingPrompt}
                          style={{ padding: "12px 16px", borderRadius: 12, border: `1px solid ${C.lime}`, backgroundColor: "transparent", color: C.lime, fontWeight: 900, cursor: improvingPrompt ? "not-allowed" : "pointer", opacity: improvingPrompt ? 0.7 : 1 }}
                        >
                          {improvingPrompt ? "Mejorando..." : "✦ Mejorar con IA"}
                        </button>
                        <select style={input({ width: 140, appearance: "none" as const })} defaultValue="gpt-4.1">
                          <option value="gpt-4.1">GPT 4.1</option>
                          <option value="gpt-4o">GPT 4o</option>
                        </select>
                      </div>
                    </div>

                    {/* index */}
                    <div style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18 }}>
                      <div style={{ ...flex({ alignItems: "center", justifyContent: "space-between" }), marginBottom: 12 }}>
                        <div style={{ fontWeight: 900, color: C.muted, fontSize: 12, letterSpacing: 0.6 }}>ÍNDICE</div>
                        <button style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontWeight: 900 }}>×</button>
                      </div>
                      <div style={{ display: "grid", gap: 10 }}>
                        {promptIndex.map(h => (
                          <div key={h} style={{ ...flex({ alignItems: "center", gap: 10 }), color: C.white, fontWeight: 800 }}>
                            <span style={{ color: C.muted }}>🔖</span>
                            <span style={{ fontSize: 13 }}>{h}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 14 }}>
                  <div style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18 }}>
                    <div style={{ ...flex({ alignItems: "center", justifyContent: "space-between" }), marginBottom: 12 }}>
                      <div style={{ fontWeight: 900, fontSize: 18 }}>Configuración</div>
                      <button
                        onClick={saveSettings}
                        disabled={saving}
                        style={{ padding: "10px 14px", borderRadius: 12, border: "none", backgroundColor: saving ? C.dim : C.lime, color: "#111", cursor: saving ? "not-allowed" : "pointer", fontWeight: 900 }}
                      >
                        {saving ? "Guardando..." : "Guardar"}
                      </button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 12, color: C.dim, marginBottom: 6 }}>Nombre</div>
                        <input value={edit.name} onChange={e => setEdit(s => ({ ...s, name: e.target.value }))} style={input()} />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: C.dim, marginBottom: 6 }}>Rol / objetivo</div>
                        <input value={edit.role} onChange={e => setEdit(s => ({ ...s, role: e.target.value }))} style={input()} />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: C.dim, marginBottom: 6 }}>{agent.type === "flow" ? "Notas" : "Prompt"}</div>
                        <textarea value={edit.prompt} onChange={e => setEdit(s => ({ ...s, prompt: e.target.value }))} rows={12} style={{ ...input({ minHeight: 320 }), resize: "vertical" as const }} />
                      </div>

                      {agent.type === "flow" && (
                        <button
                          type="button"
                          onClick={() => router.push(`/start/flows/${agent.id}`)}
                          style={{ padding: "12px 14px", borderRadius: 12, border: `1px solid ${C.blue}`, backgroundColor: "transparent", color: C.blue, fontWeight: 900, cursor: "pointer" }}
                        >
                          Abrir editor de flujo
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18 }}>
                    <div style={{ fontWeight: 900, marginBottom: 10 }}>Datos</div>
                    <div style={{ color: C.dim, fontSize: 12, marginBottom: 8 }}>id</div>
                    <div style={{ color: C.muted, fontSize: 12, wordBreak: "break-all" as const }}>{agent.id}</div>
                    <div style={{ color: C.dim, fontSize: 12, marginTop: 14, marginBottom: 8 }}>config</div>
                    <pre style={{ margin: 0, backgroundColor: C.dark, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, color: "#d1d5db", fontSize: 12, overflow: "auto", maxHeight: 420 }}>
{JSON.stringify(agent.configuration || {}, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </>
           )}

          {tab === "analisis" && agent.type === "voice" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 16 }}>
              <div style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18 }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>📈</div>
                <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 14 }}>Análisis posterior a la llamada</div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 13, color: C.muted, marginBottom: 8, fontWeight: 800 }}>Objetivo de la llamada</div>
                  <textarea
                    value={analysisForm.objective}
                    onChange={(e) => setAnalysisForm((s) => ({ ...s, objective: e.target.value }))}
                    rows={5}
                    style={{ ...input({ minHeight: 140 }), resize: "vertical" as const }}
                  />
                </div>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 8, fontWeight: 800 }}>Variables de recuperación</div>
                <div style={{ display: "grid", gap: 8 }}>
                  {analysisForm.variables.map((v, idx) => (
                    <div key={`${v}-${idx}`} style={{ ...flex({ alignItems: "center", gap: 8 }) }}>
                      <input
                        value={v}
                        onChange={(e) =>
                          setAnalysisForm((s) => ({
                            ...s,
                            variables: s.variables.map((item, i) => (i === idx ? e.target.value : item)),
                          }))
                        }
                        style={input({ flex: 1 })}
                      />
                      <button
                        onClick={() => setAnalysisForm((s) => ({ ...s, variables: s.variables.filter((_, i) => i !== idx) }))}
                        style={{ border: `1px solid ${C.border}`, backgroundColor: "transparent", color: C.white, borderRadius: 8, padding: "8px 10px", cursor: "pointer" }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setAnalysisForm((s) => ({ ...s, variables: [...s.variables, ""] }))}
                  style={{ marginTop: 10, border: `1px solid ${C.border}`, backgroundColor: "transparent", color: C.muted, borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontWeight: 700 }}
                >
                  + Agregar variable
                </button>
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  style={{ marginTop: 14, padding: "10px 14px", borderRadius: 10, border: "none", backgroundColor: saving ? C.dim : C.lime, color: "#111", fontWeight: 900, cursor: saving ? "not-allowed" : "pointer" }}
                >
                  {saving ? "Guardando..." : "Guardar análisis"}
                </button>
              </div>
              <div style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18 }}>
                <div style={{ ...flex({ alignItems: "center", justifyContent: "space-between" }), marginBottom: 12 }}>
                  <div style={{ fontWeight: 900 }}>Prompt de referencia</div>
                  <div style={{ color: C.dim, fontSize: 12, fontWeight: 900 }}>GPT 4.1</div>
                </div>
                <textarea
                  value={edit.prompt}
                  onChange={(e) => setEdit((s) => ({ ...s, prompt: e.target.value }))}
                  rows={22}
                  style={{ ...input({ minHeight: 560, fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace" }), resize: "vertical" as const }}
                />
              </div>
            </div>
          )}

          {tab === "registro" && agent.type === "voice" && (
            <div style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
              <div style={{ padding: 16, borderBottom: `1px solid ${C.border}`, ...flex({ alignItems: "center", justifyContent: "space-between", gap: 12 }) }}>
                <div style={{ fontWeight: 900 }}>Registro de llamadas</div>
                <div style={{ width: 320, maxWidth: "60%" }}>
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." style={input()} />
                </div>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
                  <thead>
                    <tr style={{ backgroundColor: C.dark }}>
                      {[
                        "Contacto",
                        "Canal",
                        "Estado",
                        "Duración",
                        "Fecha",
                      ].map((h) => (
                        <th key={h} style={{ textAlign: "left", fontSize: 12, color: C.dim, padding: "12px 14px", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredConversations.length ? filteredConversations.map((c) => (
                      <tr key={c.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ fontWeight: 900 }}>{c.contact_name || "-"}</div>
                          <div style={{ color: C.dim, fontSize: 12 }}>{c.contact_phone || ""}</div>
                        </td>
                        <td style={{ padding: "12px 14px", color: C.muted }}>{c.channel || "voice"}</td>
                        <td style={{ padding: "12px 14px", color: C.muted }}>{c.status || "completed"}</td>
                        <td style={{ padding: "12px 14px", color: C.white }}>{fmtDuration(Number(c.duration_seconds || 0))}</td>
                        <td style={{ padding: "12px 14px", color: C.dim }}>{c.started_at ? new Date(c.started_at).toLocaleString() : "-"}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} style={{ padding: 28, textAlign: "center", color: C.dim }}>
                          No hay llamadas registradas aún.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "metrica" && agent.type === "voice" && (
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 12 }}>
                {[
                  { label: "Créditos usados", value: String(voiceMetrics.creditsUsed) },
                  { label: "Total de llamadas", value: String(voiceMetrics.totalCalls) },
                  { label: "Contactos llamados", value: String(voiceMetrics.uniqueContacts) },
                  { label: "Tasa de conexión", value: `${voiceMetrics.connectionRate.toFixed(1)}%` },
                  { label: "Duración promedio", value: fmtDuration(voiceMetrics.avgDuration) },
                ].map((m) => (
                  <div key={m.label} style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16 }}>
                    <div style={{ color: C.dim, fontSize: 12, marginBottom: 8 }}>{m.label}</div>
                    <div style={{ fontSize: 34, fontWeight: 900 }}>{m.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18 }}>
                  <div style={{ fontWeight: 900, marginBottom: 10 }}>Llamadas realizadas</div>
                  <div style={{ height: 240, borderRadius: 10, border: `1px solid ${C.border}`, backgroundColor: C.dark, padding: 14 }}>
                    <div style={{ height: "100%", display: "flex", alignItems: "flex-end", gap: 12 }}>
                      <div style={{ width: 46, height: `${Math.min(100, voiceMetrics.totalCalls * 8)}%`, backgroundColor: "#4ade80", borderRadius: 6 }} />
                      <div style={{ width: 46, height: `${Math.min(100, voiceMetrics.connectedCalls * 8)}%`, backgroundColor: "#60a5fa", borderRadius: 6 }} />
                    </div>
                  </div>
                </div>

                <div style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18 }}>
                  <div style={{ fontWeight: 900, marginBottom: 10 }}>Embudo de contacto</div>
                  <div style={{ height: 240, borderRadius: 10, border: `1px solid ${C.border}`, backgroundColor: C.dark, overflow: "hidden" }}>
                    <div style={{ height: "50%", backgroundColor: "#60a5fa" }} />
                    <div style={{ height: "35%", backgroundColor: "#fcd34d" }} />
                    <div style={{ height: "15%", backgroundColor: "#86efac" }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "cerebro" && (
            <div style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
              <div style={{ ...flex({ alignItems: "center", justifyContent: "space-between" }), marginBottom: 20 }}>
                <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>Cerebro</h2>
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  style={{ padding: "10px 16px", borderRadius: 10, border: "none", backgroundColor: saving ? C.dim : C.lime, color: "#111", fontWeight: 900, cursor: saving ? "not-allowed" : "pointer" }}
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>

              <div style={{ ...flex({ gap: 10 }), marginBottom: 16 }}>
                {([
                  { id: "website", label: "Sitio web" },
                  { id: "files", label: "Archivos" },
                  { id: "config", label: "Configuración" },
                ] as const).map((it) => (
                  <button
                    key={it.id}
                    onClick={() => setBrainTab(it.id)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: `1px solid ${brainTab === it.id ? C.lime : C.border}`,
                      backgroundColor: brainTab === it.id ? "rgba(163,230,53,0.08)" : "transparent",
                      color: brainTab === it.id ? C.lime : C.muted,
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    {it.label}
                  </button>
                ))}
              </div>

              {brainTab === "website" && (
                <div style={{ display: "grid", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>URL del sitio</div>
                    <input
                      value={brainForm.websiteUrl}
                      onChange={(e) => setBrainForm((s) => ({ ...s, websiteUrl: e.target.value }))}
                      placeholder="https://www.tusitio.com"
                      style={input()}
                    />
                  </div>
                  <div style={{ color: C.dim, fontSize: 12 }}>
                    Usa esta URL como fuente de contexto para respuestas del agente.
                  </div>
                </div>
              )}

              {brainTab === "files" && (
                <FileUploadPanel
                  existingFiles={brainForm.files}
                  onFilesAdded={(files) => setBrainForm((s) => ({ ...s, files: [...s.files, ...files] }))}
                  onFileRemoved={(idx) => setBrainForm((s) => ({ ...s, files: s.files.filter((_, i) => i !== idx) }))}
                />
              )}

              {brainTab === "config" && (
                <div style={{ display: "grid", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>Nombre de contexto</div>
                    <input
                      value={brainForm.contextName}
                      onChange={(e) => setBrainForm((s) => ({ ...s, contextName: e.target.value }))}
                      style={input()}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>Descripción</div>
                    <textarea
                      value={brainForm.contextDescription}
                      onChange={(e) => setBrainForm((s) => ({ ...s, contextDescription: e.target.value }))}
                      rows={4}
                      style={{ ...input({ minHeight: 110 }), resize: "vertical" as const }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "publicar" && (
            <div style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 20 }}>Publicar Agente</h2>
              <div style={{ backgroundColor: C.dark, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={publishForm.isPublic}
                      onChange={(e) => setPublishForm((s) => ({ ...s, isPublic: e.target.checked }))}
                      style={{ width: 20, height: 20 }}
                    />
                    <span style={{ fontWeight: 700, color: C.white }}>Hacer Público</span>
                  </label>
                  <p style={{ color: C.muted, fontSize: 13, marginTop: 8, marginLeft: 32 }}>Versión compartible e integrable</p>
                </div>

                <div style={{ color: C.white, fontWeight: 800, marginBottom: 10 }}>Insertar en tu web</div>
                <div style={{ marginTop: 8, padding: "12px 16px", backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 8, fontFamily: "monospace", fontSize: 12, color: C.muted, overflowX: "auto" }}>
                  {`<script src="https://widget.botz.fyi/agent.js?agentId=${agent.id}"></script>`}
                </div>
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(`<script src="https://widget.botz.fyi/agent.js?agentId=${agent.id}"></script>`);
                    } catch {
                      // ignore
                    }
                  }}
                  style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.lime}`, backgroundColor: "transparent", color: C.lime, fontWeight: 800, cursor: "pointer" }}
                >
                  📋 Copiar script
                </button>

                <div style={{ marginTop: 18 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={publishForm.additionalInstructions}
                      onChange={(e) => setPublishForm((s) => ({ ...s, additionalInstructions: e.target.checked }))}
                      style={{ width: 18, height: 18 }}
                    />
                    <span style={{ color: C.white, fontWeight: 700 }}>Instrucciones adicionales</span>
                  </label>
                  <div style={{ color: C.muted, fontSize: 13, marginBottom: 8 }}>Mensaje de bienvenida</div>
                  <textarea
                    value={publishForm.welcomeMessage}
                    onChange={(e) => setPublishForm((s) => ({ ...s, welcomeMessage: e.target.value }))}
                    rows={4}
                    style={{ ...input({ minHeight: 100 }), resize: "vertical" as const }}
                  />
                </div>

                <div style={{ marginTop: 18 }}>
                  <div style={{ color: C.white, fontWeight: 800, marginBottom: 8 }}>Ejemplos</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {publishForm.examples.map((ex, idx) => (
                      <div key={`${idx}-${ex}`} style={{ ...flex({ alignItems: "center", gap: 8 }) }}>
                        <input
                          value={ex}
                          onChange={(e) =>
                            setPublishForm((s) => ({
                              ...s,
                              examples: s.examples.map((item, i) => (i === idx ? e.target.value : item)),
                            }))
                          }
                          style={input({ flex: 1 })}
                        />
                        <button
                          onClick={() => setPublishForm((s) => ({ ...s, examples: s.examples.filter((_, i) => i !== idx) }))}
                          style={{ border: `1px solid ${C.border}`, backgroundColor: "transparent", color: C.white, borderRadius: 8, padding: "8px 10px", cursor: "pointer" }}
                        >
                          🗑
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setPublishForm((s) => ({ ...s, examples: [...s.examples, ""] }))}
                    style={{ marginTop: 10, border: `1px solid ${C.border}`, backgroundColor: "transparent", color: C.muted, borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontWeight: 700 }}
                  >
                    + Agregar ejemplo
                  </button>
                </div>

                <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <div style={{ color: C.muted, fontSize: 13, marginBottom: 6 }}>Color de fondo</div>
                    <input
                      type="color"
                      value={publishForm.bgColor}
                      onChange={(e) => setPublishForm((s) => ({ ...s, bgColor: e.target.value }))}
                      style={{ ...input({ padding: 4, height: 44 }) }}
                    />
                  </div>
                  <div>
                    <div style={{ color: C.muted, fontSize: 13, marginBottom: 6 }}>Color primario</div>
                    <input
                      type="color"
                      value={publishForm.primaryColor}
                      onChange={(e) => setPublishForm((s) => ({ ...s, primaryColor: e.target.value }))}
                      style={{ ...input({ padding: 4, height: 44 }) }}
                    />
                  </div>
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={publishForm.autoOpen}
                    onChange={(e) => setPublishForm((s) => ({ ...s, autoOpen: e.target.checked }))}
                    style={{ width: 18, height: 18 }}
                  />
                  <span style={{ color: C.white, fontWeight: 700 }}>Apertura automática</span>
                </label>

                <button
                  onClick={saveSettings}
                  disabled={saving}
                  style={{ marginTop: 18, padding: "12px 18px", borderRadius: 10, border: "none", backgroundColor: saving ? C.dim : C.lime, color: "#111", fontWeight: 900, cursor: saving ? "not-allowed" : "pointer" }}
                >
                  {saving ? "Guardando..." : "Guardar publicación"}
                </button>
              </div>
            </div>
          )}

          {tab === "integraciones" && (
            <div style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 20 }}>Integraciones</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                {["Twilio", "WhatsApp", "Slack", "Zapier", "Make", "Discord"].map(integration => (
                  <div key={integration} style={{ backgroundColor: C.dark, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, textAlign: "center" }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🔗</div>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>{integration}</div>
                    <button style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.lime}`, backgroundColor: "transparent", color: C.lime, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                      Conectar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
         </div>
       </main>
     </div>
   );
 }
