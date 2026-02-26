"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authedFetch } from "@/app/start/agents/authedFetchAgents";

const C = {
  bg: "#1a1d26",
  card: "#22262d",
  dark: "#111318",
  border: "rgba(255,255,255,0.10)",
  lime: "#a3e635",
  white: "#ffffff",
  muted: "#9ca3af",
};

type Agent = { id: string; name: string; type: string };
type Phone = { id: string; friendly_name: string; phone_number_e164: string };
type Channel = {
  id: string;
  display_name: string;
  channel_type: string;
  provider: string;
  status: string;
  phone_number_id: string | null;
  assigned_agent_id: string | null;
  config?: Record<string, any>;
};

type CredField = {
  key: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  secret?: boolean;
};

const CRED_SCHEMAS: Record<string, { title: string; notes: string; fields: CredField[] }> = {
  "voice:twilio": {
    title: "Voz con Twilio",
    notes: "Requiere cuenta Twilio y numero/Caller ID. Usa webhooks para enrutamiento de llamadas.",
    fields: [
      { key: "account_sid", label: "Account SID", required: true, placeholder: "ACxxxxxxxx" },
      { key: "auth_token", label: "Auth Token", required: true, secret: true, placeholder: "Token privado" },
      { key: "twiml_app_sid", label: "TwiML App SID", placeholder: "APxxxxxxxx (opcional)" },
    ],
  },
  "voice:sip": {
    title: "Voz por SIP",
    notes: "Conecta troncal SIP para llamadas entrantes/salientes.",
    fields: [
      { key: "sip_domain", label: "SIP Domain", required: true, placeholder: "sip.tudominio.com" },
      { key: "sip_username", label: "SIP Username", required: true, placeholder: "usuario" },
      { key: "sip_password", label: "SIP Password", required: true, secret: true, placeholder: "password" },
      { key: "trunk_uri", label: "Trunk URI", placeholder: "sip:proveedor.com" },
    ],
  },
  "whatsapp:meta": {
    title: "WhatsApp Cloud API (Meta)",
    notes: "Necesitas WABA, numero de WhatsApp y token permanente de Meta.",
    fields: [
      { key: "waba_id", label: "WABA ID", required: true, placeholder: "ID de WhatsApp Business Account" },
      { key: "phone_number_id", label: "Phone Number ID", required: true, placeholder: "ID del numero en Meta" },
      { key: "permanent_token", label: "Access Token", required: true, secret: true, placeholder: "Token permanente" },
      { key: "verify_token", label: "Verify Token", required: true, secret: true, placeholder: "Token para webhook" },
    ],
  },
  "whatsapp:twilio": {
    title: "WhatsApp con Twilio",
    notes: "Necesitas habilitar el sender de WhatsApp en Twilio.",
    fields: [
      { key: "account_sid", label: "Account SID", required: true, placeholder: "ACxxxxxxxx" },
      { key: "auth_token", label: "Auth Token", required: true, secret: true, placeholder: "Token privado" },
      { key: "whatsapp_number", label: "Numero WhatsApp", required: true, placeholder: "whatsapp:+1415..." },
    ],
  },
  "whatsapp:messagebird": {
    title: "WhatsApp con MessageBird",
    notes: "Configura canal y workspace en MessageBird.",
    fields: [
      { key: "workspace_id", label: "Workspace ID", required: true, placeholder: "workspace_xxx" },
      { key: "channel_id", label: "Channel ID", required: true, placeholder: "channel_xxx" },
      { key: "access_key", label: "Access Key", required: true, secret: true, placeholder: "API Key" },
    ],
  },
  "instagram:messagebird": {
    title: "Instagram con MessageBird",
    notes: "Conecta el canal de Instagram en MessageBird.",
    fields: [
      { key: "workspace_id", label: "Workspace ID", required: true, placeholder: "workspace_xxx" },
      { key: "channel_id", label: "Channel ID", required: true, placeholder: "channel_xxx" },
      { key: "access_key", label: "Access Key", required: true, secret: true, placeholder: "API Key" },
    ],
  },
  "instagram:meta": {
    title: "Instagram Direct con Meta",
    notes: "Requiere app Meta, pagina vinculada y token activo.",
    fields: [
      { key: "ig_account_id", label: "Instagram Account ID", required: true, placeholder: "ID cuenta IG" },
      { key: "page_id", label: "Facebook Page ID", required: true, placeholder: "ID pagina" },
      { key: "access_token", label: "Access Token", required: true, secret: true, placeholder: "Token Meta" },
      { key: "verify_token", label: "Verify Token", required: true, secret: true, placeholder: "Token webhook" },
    ],
  },
  "webchat:botz": {
    title: "Webchat embebido",
    notes: "Usa widget de Botz y restringe por dominio si quieres.",
    fields: [
      { key: "allowed_domain", label: "Dominio permitido", placeholder: "https://tu-dominio.com" },
      { key: "signing_secret", label: "Signing Secret", secret: true, placeholder: "Opcional" },
    ],
  },
};

const PROVIDERS_BY_CHANNEL: Record<string, string[]> = {
  voice: ["twilio", "sip", "other"],
  whatsapp: ["meta", "twilio", "messagebird", "other"],
  instagram: ["meta", "messagebird", "other"],
  webchat: ["botz", "other"],
};

export default function AgentChannelsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<Channel[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [numbers, setNumbers] = useState<Phone[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [canAdvanced, setCanAdvanced] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [form, setForm] = useState({
    display_name: "",
    channel_type: "voice",
    provider: "twilio",
    phone_number_id: "",
    assigned_agent_id: "",
    webhook_url: "",
    config: {} as Record<string, string>,
  });
  const [copyMsg, setCopyMsg] = useState("");
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [onboardingForm, setOnboardingForm] = useState({
    legal_name: "",
    tax_id: "",
    has_meta_business: "yes",
    number_linked: "no",
    contact_name: "",
    contact_email: "",
  });
  const [onboardingBusy, setOnboardingBusy] = useState(false);
  const [onboardingMsg, setOnboardingMsg] = useState("");
  const [assistModal, setAssistModal] = useState<{ open: boolean; channel_type: string; provider: string }>({ open: false, channel_type: "whatsapp", provider: "meta" });
  const [assistDetails, setAssistDetails] = useState<Record<string, string>>({
    channel_name: "",
    assigned_agent_id: "",
    workspace_id: "",
    channel_id: "",
    access_key: "",
    account_sid: "",
    auth_token: "",
    twilio_phone_number: "",
  });
  const [evolutionModalOpen, setEvolutionModalOpen] = useState(false);
  const [evolutionBusy, setEvolutionBusy] = useState(false);
  const [evolutionError, setEvolutionError] = useState<string | null>(null);
  const [evolutionStatus, setEvolutionStatus] = useState<"connected" | "pending" | "disconnected">("disconnected");
  const [evolutionQr, setEvolutionQr] = useState<string | null>(null);
  const [evolutionDisconnectBusy, setEvolutionDisconnectBusy] = useState(false);
  const pollRef = useRef<number | null>(null);

  const schemaKey = `${form.channel_type}:${form.provider}`;
  const preselectedAgentId = String(searchParams.get("agentId") || "").trim();
  const preselectedAgent = agents.find((a) => a.id === preselectedAgentId) || null;
  const activeSchema = CRED_SCHEMAS[schemaKey] || {
    title: "Configuracion personalizada",
    notes: "Este canal no tiene plantilla predefinida. Completa campos basicos y webhook.",
    fields: [] as CredField[],
  };

  const callbackUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/whatsapp/meta/callback`
    : "https://tu-dominio.com/api/whatsapp/meta/callback";
  const evolutionWebhookUrl = (() => {
    if (typeof window === "undefined") return "https://tu-dominio.com/api/agents/channels/evolution/webhook";
    const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    const publicBase = String(process.env.NEXT_PUBLIC_APP_URL || "https://www.botz.fyi").replace(/\/$/, "");
    const base = isLocal ? publicBase : window.location.origin;
    return `${base}/api/agents/channels/evolution/webhook`;
  })();

  const genVerifyToken = () => {
    const token = `botz_meta_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36)}`;
    setForm((s) => ({ ...s, config: { ...s.config, verify_token: token } }));
  };

  const copyText = async (txt: string, okLabel: string) => {
    try {
      await navigator.clipboard.writeText(txt);
      setCopyMsg(okLabel);
      window.setTimeout(() => setCopyMsg(""), 1800);
    } catch {
      setCopyMsg("No se pudo copiar");
      window.setTimeout(() => setCopyMsg(""), 1800);
    }
  };

  const stopPolling = () => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const fetchEvolutionStatus = async () => {
    const res = await authedFetch("/api/agents/channels/evolution/status");
    const json = await res.json();
    if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo consultar estado Evolution");
    const nextStatus = String(json?.data?.status || "disconnected") as "connected" | "pending" | "disconnected";
    setEvolutionStatus(nextStatus);
    setEvolutionQr(json?.data?.qr_code ? String(json.data.qr_code) : null);
    if (nextStatus === "connected") {
      stopPolling();
      await fetchData();
    }
  };

  const startPolling = () => {
    stopPolling();
    pollRef.current = window.setInterval(() => {
      void fetchEvolutionStatus().catch(() => {
        // no-op: se mantiene estado actual hasta siguiente intento
      });
    }, 4000);
  };

  const connectEvolution = async () => {
    setEvolutionBusy(true);
    setEvolutionError(null);
    setEvolutionModalOpen(true);
    try {
      const assignedAgentId = preselectedAgentId || form.assigned_agent_id || null;
      const res = await authedFetch("/api/agents/channels/evolution/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigned_agent_id: assignedAgentId }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo iniciar conexion Evolution");

      const status = String(json?.data?.status || "disconnected") as "connected" | "pending" | "disconnected";
      setEvolutionStatus(status);
      setEvolutionQr(json?.data?.qr_code ? String(json.data.qr_code) : null);
      await fetchData();

      if (status !== "connected") startPolling();
    } catch (e: any) {
      setEvolutionError(String(e?.message || "No se pudo iniciar conexion Evolution"));
    } finally {
      setEvolutionBusy(false);
    }
  };

  const disconnectEvolution = async () => {
    setEvolutionDisconnectBusy(true);
    setEvolutionError(null);
    try {
      const res = await authedFetch("/api/agents/channels/evolution/disconnect", {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo desconectar Evolution");
      setEvolutionStatus("disconnected");
      setEvolutionQr(null);
      stopPolling();
      await fetchData();
    } catch (e: any) {
      setEvolutionError(String(e?.message || "No se pudo desconectar Evolution"));
    } finally {
      setEvolutionDisconnectBusy(false);
    }
  };

  const submitOnboardingRequest = async (override?: { channel_type: string; provider: string; details?: Record<string, string> }) => {
    setOnboardingBusy(true);
    setError(null);
    setOnboardingMsg("");
    try {
      const channelType = override?.channel_type || "whatsapp";
      const provider = override?.provider || "meta";
      const res = await authedFetch("/api/agents/channels/onboarding-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel_type: channelType,
          provider,
          legal_name: onboardingForm.legal_name,
          tax_id: onboardingForm.tax_id,
          has_meta_business: onboardingForm.has_meta_business === "yes",
          number_linked: onboardingForm.number_linked === "yes",
          contact_name: onboardingForm.contact_name,
          contact_email: onboardingForm.contact_email,
          details: override?.details || {},
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo crear solicitud");
      setOnboardingMsg("Solicitud enviada. Te contactaremos para onboarding.");
      setAssistModal((s) => ({ ...s, open: false }));
      if (json?.meeting_url) {
        window.open(String(json.meeting_url), "_blank", "noopener,noreferrer");
      }
    } catch (e: any) {
      setError(String(e?.message || "No se pudo solicitar onboarding"));
    } finally {
      setOnboardingBusy(false);
    }
  };

  const recheckWebhook = async (id: string) => {
    setVerifyingId(id);
    setError(null);
    try {
      const res = await authedFetch("/api/agents/channels/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo revalidar");
      await fetchData();
      if (json?.data?.verified) {
        setCopyMsg("Webhook verificado ✅");
      } else {
        setCopyMsg("Webhook aun pendiente");
      }
      window.setTimeout(() => setCopyMsg(""), 1800);
    } catch (e: any) {
      setError(String(e?.message || "No se pudo revalidar webhook"));
    } finally {
      setVerifyingId(null);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, accessRes] = await Promise.all([
        authedFetch("/api/agents/channels"),
        authedFetch("/api/agents/channels/access"),
      ]);
      const json = await res.json();
      const accessJson = await accessRes.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo cargar canales");
      setRows(Array.isArray(json.data) ? json.data : []);
      setAgents(Array.isArray(json.agents) ? json.agents : []);
      setNumbers(Array.isArray(json.numbers) ? json.numbers : []);
      const advanced = Boolean(accessJson?.data?.advanced_channels);
      setCanAdvanced(advanced);
      setAdvancedOpen(advanced);
    } catch (e: any) {
      setError(String(e?.message || "Error cargando canales"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchData(); }, []);

  useEffect(() => {
    if (!preselectedAgentId || agents.length === 0) return;
    const exists = agents.some((a) => a.id === preselectedAgentId);
    if (!exists) return;
    setForm((s) => (s.assigned_agent_id === preselectedAgentId ? s : { ...s, assigned_agent_id: preselectedAgentId }));
  }, [preselectedAgentId, agents]);

  useEffect(() => {
    return () => stopPolling();
  }, []);

  useEffect(() => {
    if (canAdvanced) return;
    void fetchEvolutionStatus().catch(() => {
      // no-op initial check
    });
  }, [canAdvanced]);

  const createChannel = async () => {
    try {
      const missing = activeSchema.fields.filter((f) => f.required && !String(form.config[f.key] || "").trim());
      if (missing.length) {
        throw new Error(`Faltan credenciales requeridas: ${missing.map((m) => m.label).join(", ")}`);
      }

      const testRes = await authedFetch("/api/agents/channels/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel_type: form.channel_type,
          provider: form.provider,
          config: form.config,
        }),
      });
      const testJson = await testRes.json();
      if (!testRes.ok || !testJson?.ok) {
        throw new Error(testJson?.error || "No se pudo validar credenciales");
      }

      const res = await authedFetch("/api/agents/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          phone_number_id: form.phone_number_id || null,
          assigned_agent_id: form.assigned_agent_id || null,
          config: {
            ...form.config,
            _schema: schemaKey,
            _schema_title: activeSchema.title,
          },
          status: "connected",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo crear canal");
      setForm({ display_name: "", channel_type: "voice", provider: "twilio", phone_number_id: "", assigned_agent_id: "", webhook_url: "", config: {} });
      await fetchData();
    } catch (e: any) {
      setError(String(e?.message || "Error creando canal"));
    }
  };

  const patch = async (id: string, body: any) => {
    const res = await authedFetch(`/api/agents/channels/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo actualizar canal");
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: C.bg, color: C.white, fontFamily: "Inter,-apple-system,sans-serif" }}>
      <div style={{ height: 56, backgroundColor: C.dark, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 18px", gap: 12 }}>
        <button onClick={() => router.push("/start/agents")} style={{ background: "none", border: "none", color: C.lime, cursor: "pointer", fontWeight: 900 }}>← Volver</button>
        <div style={{ fontWeight: 900, fontSize: 16 }}>Canales</div>
      </div>

      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "22px 18px 36px" }}>
        <div style={{ color: C.muted, marginBottom: 14 }}>Conecta canales reales (voz, WhatsApp, webchat), asigna numero y agente responsable.</div>
        {preselectedAgent && (
          <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 12, border: `1px solid ${C.border}`, background: "rgba(163,230,53,0.12)", color: C.white, fontSize: 13 }}>
            Agente preseleccionado: <strong>{preselectedAgent.name}</strong>. Las nuevas conexiones quedaran asignadas a este agente.
          </div>
        )}
        {error && <div style={{ marginBottom: 12, border: `1px solid ${C.border}`, background: "rgba(239,68,68,0.12)", color: "#fca5a5", padding: "10px 12px", borderRadius: 10 }}>{error}</div>}

        {!canAdvanced && (
          <div style={{ marginBottom: 12, padding: "12px 14px", borderRadius: 12, border: `1px solid ${C.border}`, background: "rgba(0,150,255,0.09)", color: C.white }}>
            <div style={{ fontWeight: 900, marginBottom: 4 }}>Modo asistido</div>
            <div style={{ color: C.muted, fontSize: 13 }}>La configuracion tecnica avanzada esta reservada al equipo Botz. Completa onboarding asistido para activar tu canal.</div>
          </div>
        )}

        {!canAdvanced && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10, marginBottom: 12 }}>
            <div style={{ borderRadius: 12, border: "1px solid rgba(163,230,53,0.35)", background: "rgba(163,230,53,0.08)", padding: 12 }}>
              <div style={{ fontWeight: 900, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span>WhatsApp QR (Evolution)</span>
                <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 900, background: evolutionStatus === "connected" ? "rgba(16,185,129,0.18)" : evolutionStatus === "pending" ? "rgba(245,158,11,0.16)" : "rgba(107,114,128,0.18)", color: evolutionStatus === "connected" ? "#34d399" : evolutionStatus === "pending" ? "#fbbf24" : "#9ca3af" }}>
                  {evolutionStatus === "connected" ? "Conectado" : evolutionStatus === "pending" ? "Pendiente" : "Sin conectar"}
                </span>
              </div>
              <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>Conecta un numero para Agentes escaneando QR. No mezcla con Hipotecario.</div>
              <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr auto", gap: 6 }}>
                <input value={evolutionWebhookUrl} readOnly style={{ padding: "7px 8px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white, fontSize: 11 }} />
                <button onClick={() => void copyText(evolutionWebhookUrl, "Webhook copiado")} style={{ borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.white, fontSize: 11, padding: "0 8px", cursor: "pointer", fontWeight: 800 }}>
                  Copiar
                </button>
              </div>
              <button
                onClick={() => void connectEvolution()}
                disabled={evolutionBusy}
                style={{ marginTop: 10, borderRadius: 8, border: `1px solid ${C.lime}`, background: "transparent", color: C.lime, padding: "8px 10px", cursor: evolutionBusy ? "not-allowed" : "pointer", fontWeight: 800 }}
              >
                {evolutionBusy ? "Iniciando..." : "Conectar por QR"}
              </button>
              {evolutionStatus === "connected" && (
                <button
                  onClick={() => void disconnectEvolution()}
                  disabled={evolutionDisconnectBusy}
                  style={{ marginTop: 8, borderRadius: 8, border: "1px solid rgba(239,68,68,0.45)", background: "rgba(239,68,68,0.12)", color: "#fca5a5", padding: "8px 10px", cursor: evolutionDisconnectBusy ? "not-allowed" : "pointer", fontWeight: 800, width: "100%" }}
                >
                  {evolutionDisconnectBusy ? "Desconectando..." : "Desconectar"}
                </button>
              )}
            </div>

            {[
              { channel_type: "whatsapp", provider: "meta", title: "WhatsApp (Meta)", desc: "Configuracion asistida con Meta" },
              { channel_type: "whatsapp", provider: "messagebird", variant: "legacy", title: "MessageBird WhatsApp (Legado)", desc: "Canal legado de MessageBird" },
              { channel_type: "instagram", provider: "messagebird", title: "MessageBird Instagram", desc: "Mensajes de Instagram por MessageBird" },
              { channel_type: "whatsapp", provider: "messagebird", title: "MessageBird WhatsApp", desc: "Workspace + channel en MessageBird" },
              { channel_type: "whatsapp", provider: "twilio", title: "Twilio WhatsApp", desc: "Conecta tu remitente de WhatsApp en Twilio" },
              { channel_type: "messenger", provider: "messagebird", title: "MessageBird Messenger", desc: "Facebook Messenger por MessageBird" },
            ].map((x) => (
              <div key={`${x.channel_type}-${x.provider}-${(x as any).variant || "std"}`} style={{ borderRadius: 12, border: `1px solid ${C.border}`, background: C.card, padding: 12 }}>
                <div style={{ fontWeight: 900, fontSize: 15 }}>{x.title}</div>
                <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{x.desc}</div>
                <button
                  onClick={() => {
                    setAssistModal({ open: true, channel_type: x.channel_type, provider: x.provider });
                    setAssistDetails((s) => ({ ...s, variant: String((x as any).variant || "") }));
                    setOnboardingMsg("");
                    setError(null);
                  }}
                  style={{ marginTop: 10, borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.white, padding: "8px 10px", cursor: "pointer", fontWeight: 800 }}
                >
                  Agregar conexión
                </button>
              </div>
            ))}
          </div>
        )}

        {canAdvanced && (
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr .9fr 1fr 1fr auto", gap: 10, marginBottom: 10, padding: 14, borderRadius: 14, border: `1px solid ${C.border}`, background: C.card }}>
          <input value={form.display_name} onChange={(e) => setForm((s) => ({ ...s, display_name: e.target.value }))} placeholder="Nombre del canal" style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }} />
          <select
            value={form.channel_type}
            onChange={(e) => {
              const ch = e.target.value;
              const providers = PROVIDERS_BY_CHANNEL[ch] || ["other"];
              setForm((s) => ({ ...s, channel_type: ch, provider: providers[0], config: {} }));
            }}
            style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }}
          >
            <option value="voice">Voz</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="webchat">Webchat</option>
            <option value="instagram">Instagram</option>
          </select>
          <select value={form.provider} onChange={(e) => setForm((s) => ({ ...s, provider: e.target.value, config: {} }))} style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }}>
            {(PROVIDERS_BY_CHANNEL[form.channel_type] || ["other"]).map((p) => (
              <option key={p} value={p}>{p === "other" ? "Otro" : p === "botz" ? "Botz" : p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
          <select value={form.phone_number_id} onChange={(e) => setForm((s) => ({ ...s, phone_number_id: e.target.value }))} style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }}>
            <option value="">Numero (opcional)</option>
            {numbers.map((n) => <option key={n.id} value={n.id}>{n.friendly_name || n.phone_number_e164}</option>)}
          </select>
          <select value={form.assigned_agent_id} onChange={(e) => setForm((s) => ({ ...s, assigned_agent_id: e.target.value }))} style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }}>
            <option value="">Agente</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <button onClick={() => void createChannel()} style={{ borderRadius: 10, border: "none", background: C.lime, color: "#111", fontWeight: 900, padding: "0 14px", cursor: "pointer" }}>Conectar</button>
        </div>
        )}

        <div style={{ marginBottom: 14, padding: 14, borderRadius: 14, border: `1px solid ${C.border}`, background: C.card }}>
          {canAdvanced && (
            <button
              type="button"
              onClick={() => setAdvancedOpen((v) => !v)}
              style={{ marginBottom: 10, borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.white, padding: "6px 10px", cursor: "pointer", fontWeight: 800 }}
            >
              {advancedOpen ? "Ocultar configuracion avanzada" : "Mostrar configuracion avanzada"}
            </button>
          )}

          {(canAdvanced ? advancedOpen : schemaKey === "whatsapp:meta") && (
            <>
          {canAdvanced && (
            <>
          <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>Credenciales - {activeSchema.title}</div>
          <div style={{ color: C.muted, fontSize: 13, marginBottom: 10 }}>{activeSchema.notes}</div>

          {schemaKey === "whatsapp:meta" && (
            <div style={{ marginBottom: 12, padding: 10, borderRadius: 10, border: `1px solid ${C.border}`, background: "rgba(0,150,255,0.08)" }}>
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>Asistente de webhook Meta</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginBottom: 8 }}>
                <input
                  value={callbackUrl}
                  readOnly
                  style={{ padding: "9px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white, fontSize: 12 }}
                />
                <button onClick={() => void copyText(callbackUrl, "Callback copiado")} style={{ borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.white, padding: "0 10px", cursor: "pointer", fontWeight: 800 }}>
                  Copiar callback
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={genVerifyToken} style={{ borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.white, padding: "8px 10px", cursor: "pointer", fontWeight: 800 }}>
                  Generar verify token
                </button>
                <button onClick={() => void copyText(String(form.config.verify_token || ""), "Verify token copiado")} style={{ borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.white, padding: "8px 10px", cursor: "pointer", fontWeight: 800 }}>
                  Copiar verify token
                </button>
                {copyMsg && <span style={{ color: C.lime, fontSize: 12, fontWeight: 800 }}>{copyMsg}</span>}
              </div>
              <div style={{ marginTop: 8, color: C.muted, fontSize: 12 }}>
                Estado webhook: se marca automaticamente como verificado cuando Meta completa el challenge.
              </div>
            </div>
          )}
            </>
          )}

          {schemaKey === "whatsapp:meta" && (
            <div style={{ marginBottom: 12, padding: 12, borderRadius: 10, border: `1px solid ${C.border}`, background: "rgba(255,255,255,0.02)" }}>
              <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 8 }}>Onboarding asistido (recomendado)</div>
              <div style={{ color: C.muted, fontSize: 12, marginBottom: 10 }}>
                Si prefieres, completa estos datos y nuestro equipo lo configura contigo en reunion.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <input value={onboardingForm.legal_name} onChange={(e) => setOnboardingForm((s) => ({ ...s, legal_name: e.target.value }))} placeholder="Nombre legal empresa" style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }} />
                <input value={onboardingForm.tax_id} onChange={(e) => setOnboardingForm((s) => ({ ...s, tax_id: e.target.value }))} placeholder="NIT / ID fiscal" style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }} />
                <select value={onboardingForm.has_meta_business} onChange={(e) => setOnboardingForm((s) => ({ ...s, has_meta_business: e.target.value }))} style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }}>
                  <option value="yes">Tiene cuenta Meta Business: Si</option>
                  <option value="no">Tiene cuenta Meta Business: No</option>
                </select>
                <select value={onboardingForm.number_linked} onChange={(e) => setOnboardingForm((s) => ({ ...s, number_linked: e.target.value }))} style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }}>
                  <option value="no">Numero ya vinculado en WhatsApp: No</option>
                  <option value="yes">Numero ya vinculado en WhatsApp: Si</option>
                </select>
                <input value={onboardingForm.contact_name} onChange={(e) => setOnboardingForm((s) => ({ ...s, contact_name: e.target.value }))} placeholder="Nombre de contacto" style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }} />
                <input value={onboardingForm.contact_email} onChange={(e) => setOnboardingForm((s) => ({ ...s, contact_email: e.target.value }))} placeholder="Email de contacto" style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }} />
              </div>
              <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  onClick={() => void submitOnboardingRequest()}
                  disabled={onboardingBusy}
                  style={{ borderRadius: 8, border: "none", background: C.lime, color: "#111", padding: "10px 12px", cursor: "pointer", fontWeight: 900 }}
                >
                  {onboardingBusy ? "Enviando..." : "Programar reunion"}
                </button>
                {onboardingMsg && <span style={{ color: C.lime, fontSize: 12, fontWeight: 800 }}>{onboardingMsg}</span>}
              </div>
            </div>
          )}

          {canAdvanced && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
            {activeSchema.fields.map((f) => (
              <div key={f.key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, color: C.muted, fontWeight: 800 }}>{f.label}{f.required ? " *" : ""}</label>
                <input
                  type={f.secret ? "password" : "text"}
                  value={form.config[f.key] || ""}
                  onChange={(e) => setForm((s) => ({ ...s, config: { ...s.config, [f.key]: e.target.value } }))}
                  placeholder={f.placeholder || "Escribe aqui"}
                  style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }}
                />
              </div>
            ))}
          </div>
          )}

          {canAdvanced && (
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr", gap: 6 }}>
            <label style={{ fontSize: 12, color: C.muted, fontWeight: 800 }}>Webhook URL (opcional por ahora)</label>
            <input
              value={form.webhook_url}
              onChange={(e) => setForm((s) => ({ ...s, webhook_url: e.target.value }))}
              placeholder="https://tu-dominio.com/api/webhook"
              style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }}
            />
          </div>
          )}
            </>
          )}
        </div>

        <div style={{ borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: C.card }}>
              <tr>
                <th style={{ textAlign: "left", padding: 12 }}>Canal</th>
                <th style={{ textAlign: "left", padding: 12 }}>Tipo</th>
                <th style={{ textAlign: "left", padding: 12 }}>Proveedor</th>
                <th style={{ textAlign: "left", padding: 12 }}>Numero</th>
                <th style={{ textAlign: "left", padding: 12 }}>Agente</th>
                <th style={{ textAlign: "left", padding: 12 }}>Estado</th>
                <th style={{ textAlign: "left", padding: 12 }}>Credenciales</th>
                <th style={{ textAlign: "left", padding: 12 }}>Webhook</th>
                <th style={{ textAlign: "left", padding: 12 }}>Ultimo inbound</th>
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 && <tr><td colSpan={9} style={{ padding: 14, color: C.muted }}>Sin canales configurados.</td></tr>}
              {rows.map((r) => (
                <tr key={r.id} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: 12 }}>{r.display_name}</td>
                  <td style={{ padding: 12 }}>{r.channel_type}</td>
                  <td style={{ padding: 12 }}>{r.provider}</td>
                  <td style={{ padding: 12 }}>
                    <select disabled={!canAdvanced} value={r.phone_number_id || ""} onChange={async (e) => { await patch(r.id, { phone_number_id: e.target.value || null }); await fetchData(); }} style={{ padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white, opacity: canAdvanced ? 1 : 0.65 }}>
                      <option value="">Sin numero</option>
                      {numbers.map((n) => <option key={n.id} value={n.id}>{n.friendly_name || n.phone_number_e164}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: 12 }}>
                    <select disabled={!canAdvanced} value={r.assigned_agent_id || ""} onChange={async (e) => { await patch(r.id, { assigned_agent_id: e.target.value || null }); await fetchData(); }} style={{ padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white, opacity: canAdvanced ? 1 : 0.65 }}>
                      <option value="">Sin agente</option>
                      {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: 12 }}>
                    <select disabled={!canAdvanced} value={r.status} onChange={async (e) => { await patch(r.id, { status: e.target.value }); await fetchData(); }} style={{ padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white, opacity: canAdvanced ? 1 : 0.65 }}>
                      <option value="connected">Conectado</option>
                      <option value="disconnected">Desconectado</option>
                      <option value="pending">Pendiente</option>
                    </select>
                  </td>
                  <td style={{ padding: 12, color: C.muted, fontSize: 12 }}>
                    {(r.config && typeof r.config === "object")
                      ? `${Object.keys(r.config).filter((k) => !k.startsWith("_")).length} campo(s)`
                      : "0 campo(s)"}
                  </td>
                  <td style={{ padding: 12 }}>
                    {r.provider === "meta" && r.channel_type === "whatsapp" ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ padding: "4px 8px", borderRadius: 999, fontSize: 11, fontWeight: 900, border: `1px solid ${C.border}`, background: (r.config as any)?.__meta_webhook_verified ? "rgba(16,185,129,0.16)" : "rgba(245,158,11,0.16)", color: (r.config as any)?.__meta_webhook_verified ? "#34d399" : "#fbbf24" }}>
                          {(r.config as any)?.__meta_webhook_verified ? "Verificado" : "Pendiente"}
                        </span>
                        <button
                          onClick={() => void recheckWebhook(r.id)}
                          disabled={verifyingId === r.id || !canAdvanced}
                          style={{ borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.white, padding: "4px 8px", fontSize: 11, cursor: "pointer", fontWeight: 800, opacity: canAdvanced ? 1 : 0.65 }}
                        >
                          {verifyingId === r.id ? "Revisando..." : "Revalidar"}
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: C.muted, fontSize: 12 }}>N/A</span>
                    )}
                  </td>
                  <td style={{ padding: 12, color: C.muted, fontSize: 12 }}>
                    {(r.config as any)?.__meta_last_inbound_at
                      ? new Date((r.config as any).__meta_last_inbound_at).toLocaleString()
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {evolutionModalOpen && (
          <div onClick={() => { stopPolling(); setEvolutionModalOpen(false); }} style={{ position: "fixed", inset: 0, zIndex: 81, background: "rgba(2,6,23,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 620, borderRadius: 14, border: `1px solid ${C.border}`, background: C.card, padding: 16 }}>
              <div style={{ fontWeight: 900, fontSize: 24, marginBottom: 4 }}>WhatsApp QR (Evolution)</div>
              <div style={{ color: C.muted, marginBottom: 12, fontSize: 13 }}>Esta conexion corresponde solo a Agentes. Escanea el QR con el numero que quieres usar para este producto.</div>

              {evolutionError && (
                <div style={{ marginBottom: 10, border: `1px solid ${C.border}`, background: "rgba(239,68,68,0.12)", color: "#fca5a5", padding: "8px 10px", borderRadius: 8, fontSize: 12 }}>
                  {evolutionError}
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: C.muted }}>Estado</span>
                <span style={{ padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 900, background: evolutionStatus === "connected" ? "rgba(16,185,129,0.18)" : "rgba(245,158,11,0.16)", color: evolutionStatus === "connected" ? "#34d399" : "#fbbf24" }}>
                  {evolutionStatus === "connected" ? "Conectado" : evolutionStatus === "pending" ? "Pendiente de escaneo" : "Desconectado"}
                </span>
              </div>

              {evolutionQr ? (
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                  <img src={evolutionQr} alt="QR Evolution" style={{ width: 260, height: 260, borderRadius: 10, border: `1px solid ${C.border}`, background: "#fff", objectFit: "contain" }} />
                </div>
              ) : (
                <div style={{ marginBottom: 12, color: C.muted, fontSize: 13 }}>
                  {evolutionStatus === "connected" ? "El numero ya esta conectado." : "Aun no hay QR disponible. Pulsa refrescar para reintentar."}
                </div>
              )}

              <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.6, marginBottom: 12 }}>
                Pasos: 1) Abre WhatsApp en tu telefono. 2) Ve a Dispositivos vinculados. 3) Escanea este QR. 4) Espera estado Conectado.
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button onClick={() => void fetchEvolutionStatus()} style={{ borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.white, padding: "9px 12px", cursor: "pointer", fontWeight: 800 }}>
                  Refrescar
                </button>
                <button onClick={() => { stopPolling(); setEvolutionModalOpen(false); }} style={{ borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.white, padding: "9px 12px", cursor: "pointer" }}>Cerrar</button>
              </div>
            </div>
          </div>
        )}

        {!canAdvanced && assistModal.open && (
          <div onClick={() => setAssistModal((s) => ({ ...s, open: false }))} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(2,6,23,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 780, borderRadius: 14, border: `1px solid ${C.border}`, background: C.card, padding: 16 }}>
              <div style={{ fontWeight: 900, fontSize: 26, marginBottom: 6 }}>Conexión {assistModal.channel_type === "whatsapp" ? "WhatsApp" : "de canal"}</div>
              <div style={{ color: C.muted, marginBottom: 12 }}>Completa estos datos para que el equipo Botz termine la configuracion contigo.</div>

              {assistModal.channel_type === "whatsapp" && assistModal.provider === "meta" ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <input value={onboardingForm.legal_name} onChange={(e) => setOnboardingForm((s) => ({ ...s, legal_name: e.target.value }))} placeholder="Nombre legal empresa" style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }} />
                  <input value={onboardingForm.tax_id} onChange={(e) => setOnboardingForm((s) => ({ ...s, tax_id: e.target.value }))} placeholder="NIT / ID fiscal" style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }} />
                  <select value={onboardingForm.has_meta_business} onChange={(e) => setOnboardingForm((s) => ({ ...s, has_meta_business: e.target.value }))} style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }}>
                    <option value="yes">Tiene cuenta Meta Business: Si</option>
                    <option value="no">Tiene cuenta Meta Business: No</option>
                  </select>
                  <select value={onboardingForm.number_linked} onChange={(e) => setOnboardingForm((s) => ({ ...s, number_linked: e.target.value }))} style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }}>
                    <option value="no">Numero ya vinculado en WhatsApp: No</option>
                    <option value="yes">Numero ya vinculado en WhatsApp: Si</option>
                  </select>
                  <input value={onboardingForm.contact_name} onChange={(e) => setOnboardingForm((s) => ({ ...s, contact_name: e.target.value }))} placeholder="Nombre de contacto" style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }} />
                  <input value={onboardingForm.contact_email} onChange={(e) => setOnboardingForm((s) => ({ ...s, contact_email: e.target.value }))} placeholder="Email de contacto" style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }} />
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <select value={assistDetails.assigned_agent_id || ""} onChange={(e) => setAssistDetails((s) => ({ ...s, assigned_agent_id: e.target.value }))} style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }}>
                    <option value="">Asignar agente (opcional)</option>
                    {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  <input value={assistDetails.channel_name || ""} onChange={(e) => setAssistDetails((s) => ({ ...s, channel_name: e.target.value }))} placeholder="Nombre del canal" style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }} />
                  <input value={assistDetails.workspace_id || ""} onChange={(e) => setAssistDetails((s) => ({ ...s, workspace_id: e.target.value }))} placeholder="ID de Workspace" style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }} />
                  <input value={assistDetails.channel_id || ""} onChange={(e) => setAssistDetails((s) => ({ ...s, channel_id: e.target.value }))} placeholder="ID de canal" style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }} />
                  <input type="password" value={assistDetails.access_key || ""} onChange={(e) => setAssistDetails((s) => ({ ...s, access_key: e.target.value }))} placeholder="Llave de acceso" style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }} />
                  <input value={onboardingForm.contact_email} onChange={(e) => setOnboardingForm((s) => ({ ...s, contact_email: e.target.value }))} placeholder="Email de contacto" style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }} />
                </div>
              )}

              <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button onClick={() => setAssistModal((s) => ({ ...s, open: false }))} style={{ borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.white, padding: "9px 12px", cursor: "pointer" }}>Cancelar</button>
                <button
                  onClick={() => void submitOnboardingRequest({ channel_type: assistModal.channel_type, provider: assistModal.provider, details: assistDetails })}
                  disabled={onboardingBusy}
                  style={{ borderRadius: 8, border: "none", background: C.lime, color: "#111", padding: "9px 12px", cursor: "pointer", fontWeight: 900 }}
                >
                  {onboardingBusy ? "Enviando..." : "Programar reunion"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
