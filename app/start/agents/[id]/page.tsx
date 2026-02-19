"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/app/supabaseClient";
import AuthModal from "@/app/start/agents/components/AgentsAuthModal";
import { authedFetch, AuthRequiredError } from "@/app/start/_utils/authedFetch";

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
  if (kind === "notetaker") return "Notetaker";
  if (type === "voice") return "Agente de Voz";
  if (type === "text") return "Agente de Texto";
  return "Flujo";
};

const typeBadge = (t: AgentType) => {
  if (t === "voice") return { bg: "rgba(239,68,68,.15)", fg: "#f87171", label: "Voz" };
  if (t === "text") return { bg: `${C.blue}22`, fg: C.blue, label: "Texto" };
  return { bg: "rgba(139,92,246,.15)", fg: "#a78bfa", label: "Flujo" };
};

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
  const [tab, setTab] = useState<"overview" | "conversations" | "settings">("overview");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const [edit, setEdit] = useState({
    name: "",
    role: "",
    prompt: "",
    voice: "nova",
    voiceModel: "Elevenlabs Turbo V2.5",
    voiceSpeed: 1.0,
    voiceTemperature: 1.0,
    voiceVolume: 1.0,
  });

  useEffect(() => {
    if (!agentId) return;
    fetchAgent();
  }, [agentId]);

  // ✅ IMPORTANTE: Agentes requiere login independiente
  useEffect(() => {
    let mounted = true;
    
    // Verificar si ya estamos en "modo Agentes"
    const isAgentsMode = typeof window !== "undefined" ? localStorage.getItem("botz-agents-mode") === "true" : false;
    
    if (!isAgentsMode) {
      // Primera vez en Agentes - forzar login independiente
      console.log("🔄 [Agentes Detail] Primera visita - requiere login independiente");
      if (!mounted) return;
      setUser(null);
      setAuthLoading(false);
      setOpenAuth(true);
      return;
    }
    
    (async () => {
      const { data } = await supabase.auth.getSession();
      const u = data?.session?.user || null;
      if (!mounted) return;
      setUser(u);
      setAuthLoading(false);
      setOpenAuth(!u);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user || null;
      setUser(u);
      setOpenAuth(!u);
      if (u && typeof window !== "undefined") {
        localStorage.setItem("botz-agents-mode", "true");
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
      const vs = data?.voice_settings || {};
      setEdit({
        name: data?.name || "",
        role: data?.description || "",
        prompt,
        voice: data?.voice_settings?.voice_id || "nova",
        voiceModel: String(vs.voice_model || vs.model || "Elevenlabs Turbo V2.5"),
        voiceSpeed: Number(vs.voice_speed ?? vs.speed ?? 1.0),
        voiceTemperature: Number(vs.voice_temperature ?? vs.temperature ?? 1.0),
        voiceVolume: Number(vs.voice_volume ?? vs.volume ?? 1.0),
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

      if (agent.type === "flow") {
        nextCfg.flow = { ...(nextCfg.flow || {}), goal: edit.role, notes: edit.prompt };
      } else if (kind === "notetaker") {
        nextCfg.notetaker = { ...(nextCfg.notetaker || {}), notes: edit.prompt };
      } else {
        nextCfg.system_prompt = edit.prompt;
      }

      const patch: any = {
        name: edit.name,
        description: edit.role,
        configuration: nextCfg,
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
      : ["Identidad", "Objetivos", "Contexto", "Guía de Estilo", "Restricciones", "Flujo Conversacional", "Variables de Entrada"];
  }, [edit.prompt]);

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
                Notetaker
              </span>
            )}
            <span style={{ color: C.dim, fontSize: 12 }}>{headerTitle}</span>
          </div>

          <div style={flex({ alignItems: "center", gap: 10 })}>
            <span style={{ fontSize: 12, color: C.muted }}>
              Estado: <span style={{ color: agent.status === "active" ? C.lime : agent.status === "paused" ? "#fbbf24" : C.dim, fontWeight: 900 }}>{agent.status}</span>
            </span>
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
            {([
              { id: "overview", label: "Resumen" },
              { id: "conversations", label: "Conversaciones" },
              { id: "settings", label: "Configuracion" },
            ] as const).map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
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

          {tab === "conversations" && (
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

          {tab === "settings" && (
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
                      <div style={{ ...flex({ alignItems: "center", justifyContent: "space-between" }), marginBottom: 14 }}>
                        <div style={{ fontWeight: 900 }}>🔊 Configuración de voz</div>
                        <div style={{ color: C.dim, fontWeight: 900 }}>⌃</div>
                      </div>

                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 12, color: C.muted, fontWeight: 900, marginBottom: 7 }}>Voz</div>
                        <select value={edit.voice} onChange={e => setEdit(s => ({ ...s, voice: e.target.value }))} style={input({ appearance: "none" as const })}>
                          {(["alloy", "echo", "fable", "onyx", "nova", "shimmer"] as const).map(v => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 12, color: C.muted, fontWeight: 900, marginBottom: 7 }}>Modelo de voz</div>
                        <select value={edit.voiceModel} onChange={e => setEdit(s => ({ ...s, voiceModel: e.target.value }))} style={input({ appearance: "none" as const })}>
                          {[
                            "Elevenlabs Turbo V2.5",
                            "OpenAI TTS",
                            "Azure Neural",
                          ].map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <div style={{ ...flex({ alignItems: "center", justifyContent: "space-between" }), marginBottom: 8 }}>
                          <div style={{ fontSize: 12, color: C.muted, fontWeight: 900 }}>Velocidad de voz</div>
                          <div style={{ color: C.dim, fontSize: 12, fontWeight: 900 }}>{edit.voiceSpeed.toFixed(2)}</div>
                        </div>
                        <input
                          type="range"
                          min={0.7}
                          max={1.4}
                          step={0.05}
                          value={edit.voiceSpeed}
                          onChange={e => setEdit(s => ({ ...s, voiceSpeed: Number(e.target.value) }))}
                          style={{ width: "100%" }}
                        />
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <div style={{ ...flex({ alignItems: "center", justifyContent: "space-between" }), marginBottom: 8 }}>
                          <div style={{ fontSize: 12, color: C.muted, fontWeight: 900 }}>Temperatura de voz</div>
                          <div style={{ color: C.dim, fontSize: 12, fontWeight: 900 }}>{edit.voiceTemperature.toFixed(2)}</div>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={2}
                          step={0.05}
                          value={edit.voiceTemperature}
                          onChange={e => setEdit(s => ({ ...s, voiceTemperature: Number(e.target.value) }))}
                          style={{ width: "100%" }}
                        />
                      </div>

                      <div>
                        <div style={{ ...flex({ alignItems: "center", justifyContent: "space-between" }), marginBottom: 8 }}>
                          <div style={{ fontSize: 12, color: C.muted, fontWeight: 900 }}>Volumen de voz</div>
                          <div style={{ color: C.dim, fontSize: 12, fontWeight: 900 }}>{edit.voiceVolume.toFixed(2)}</div>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={2}
                          step={0.05}
                          value={edit.voiceVolume}
                          onChange={e => setEdit(s => ({ ...s, voiceVolume: Number(e.target.value) }))}
                          style={{ width: "100%" }}
                        />
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
                        <button style={{ padding: "12px 16px", borderRadius: 12, border: `1px solid ${C.lime}`, backgroundColor: "transparent", color: C.lime, fontWeight: 900, cursor: "pointer" }}>
                          ✦ Mejorar con IA
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
        </div>
      </main>
    </div>
  );
}
