"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Plus, Copy, Bot, Link2, Trash2, Pencil, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "./supabaseClient";
import { useAuth } from "../MainLayout";
import useBotzLanguage from "../hooks/useBotzLanguage";

type AgentChannel = "whatsapp" | "webchat" | "form";

type BotAgent = {
  id: string;
  tenant_id: string;
  name: string;
  channel: AgentChannel;
  language: "es" | "en";
  system_prompt: string;
  is_active: boolean;
  updated_at: string;
};

type WebhookToken = {
  id: string;
  tenant_id: string;
  agent_id: string;
  token: string;
  label: string | null;
  is_active: boolean;
  created_at: string;
};

const COPY: Record<"es" | "en", Record<string, string>> = {
  es: {
    title: "Agentes IA",
    subtitle: "Configura asistentes por canal sin tocar el codigo.",
    createAgent: "Crear agente",
    agents: "Agentes",
    tokens: "Conexiones",
    name: "Nombre",
    channel: "Canal",
    language: "Idioma",
    prompt: "Instrucciones del agente",
    promptHint: "Define el rol, tono, datos que captura y como debe responder.",
    active: "Activo",
    inactive: "Inactivo",
    save: "Guardar",
    cancel: "Cancelar",
    delete: "Eliminar",
    edit: "Editar",
    connectionUrl: "URL de conexion",
    copy: "Copiar",
    newConnection: "Nueva conexion",
    label: "Etiqueta",
    create: "Crear",
    copied: "Copiado",
    needTenant: "No se detecto tenant. Entra como admin de un tenant para crear agentes.",
    needLogin: "Inicia sesion para ver esta seccion.",
    adminOnly: "Solo admin.",
  },
  en: {
    title: "AI Agents",
    subtitle: "Configure assistants per channel without changing code.",
    createAgent: "Create agent",
    agents: "Agents",
    tokens: "Connections",
    name: "Name",
    channel: "Channel",
    language: "Language",
    prompt: "Agent instructions",
    promptHint: "Define role, tone, data capture, and response rules.",
    active: "Active",
    inactive: "Inactive",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    connectionUrl: "Connection URL",
    copy: "Copy",
    newConnection: "New connection",
    label: "Label",
    create: "Create",
    copied: "Copied",
    needTenant: "No tenant detected. Sign in as a tenant admin to create agents.",
    needLogin: "Sign in to view this section.",
    adminOnly: "Admin only.",
  },
};

const DEFAULT_PROMPT_ES =
  "Eres un asistente virtual para una empresa de hipotecas. Tu objetivo es capturar datos del cliente, responder preguntas frecuentes y crear un lead limpio en el CRM.\n\nReglas:\n- Se breve y claro.\n- Pide un dato por mensaje.\n- Si el cliente no sabe, ofrece opciones.\n- No inventes informacion.\n";

const DEFAULT_PROMPT_EN =
  "You are a virtual assistant for a mortgage business. Your goal is to capture lead data, answer common questions, and create a clean lead in the CRM.\n\nRules:\n- Be brief and clear.\n- Ask one piece of information per message.\n- If the user is unsure, offer options.\n- Do not fabricate information.\n";

export default function AgentsStudio() {
  const language = useBotzLanguage();
  const t = COPY[language];
  const { user, tenantId, subscription, isAdmin, isPlatformAdmin, hasPermission } = useAuth();

  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [tenantOptions, setTenantOptions] = useState<string[]>([]);

  const [resolvedTenantId, setResolvedTenantId] = useState<string>("");

  const [agents, setAgents] = useState<BotAgent[]>([]);
  const [tokens, setTokens] = useState<WebhookToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [showAgentModal, setShowAgentModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<BotAgent | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const [draftName, setDraftName] = useState("");
  const [draftChannel, setDraftChannel] = useState<AgentChannel>("whatsapp");
  const [draftLang, setDraftLang] = useState<"es" | "en">("es");
  const [draftPrompt, setDraftPrompt] = useState(DEFAULT_PROMPT_ES);
  const [draftActive, setDraftActive] = useState(true);

  const [newTokenAgentId, setNewTokenAgentId] = useState<string>("");
  const [newTokenLabel, setNewTokenLabel] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const canManage = Boolean(user) && (isAdmin || isPlatformAdmin || hasPermission("manage_agents"));

  const effectiveTenantId =
    tenantId ||
    resolvedTenantId ||
    (subscription as any)?.tenant_id ||
    (isPlatformAdmin ? selectedTenantId : "") ||
    null;
  const canCreate = canManage && Boolean(effectiveTenantId);

  const connectionBaseUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/api/inbound`;
  }, []);

  const fetchData = async () => {
    if (!canManage) return;
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      if (!isPlatformAdmin && !effectiveTenantId) {
        setAgents([]);
        setTokens([]);
        return;
      }

      const agentsQuery = supabase
        .from("bot_agents")
        .select("id, tenant_id, name, channel, language, system_prompt, is_active, updated_at")
        .order("updated_at", { ascending: false })
        .limit(100);

      const tokensQuery = supabase
        .from("bot_webhook_tokens")
        .select("id, tenant_id, agent_id, token, label, is_active, created_at")
        .order("created_at", { ascending: false })
        .limit(200);

      const [{ data: aData, error: aErr }, { data: tData, error: tErr }] = await Promise.all([
        isPlatformAdmin
          ? (selectedTenantId ? agentsQuery.eq("tenant_id", selectedTenantId as any) : agentsQuery)
          : agentsQuery.eq("tenant_id", effectiveTenantId as any),
        isPlatformAdmin
          ? (selectedTenantId ? tokensQuery.eq("tenant_id", selectedTenantId as any) : tokensQuery)
          : tokensQuery.eq("tenant_id", effectiveTenantId as any),
      ]);

      if (aErr) throw aErr;
      if (tErr) throw tErr;
      setAgents((aData || []) as any);
      setTokens((tData || []) as any);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, resolvedTenantId, (subscription as any)?.tenant_id, isAdmin, isPlatformAdmin, selectedTenantId]);

  useEffect(() => {
    const run = async () => {
      if (!user) return;
      if (isPlatformAdmin) return;
      if (tenantId) return;
      if (resolvedTenantId) return;

      // Prefer subscription.tenant_id if present.
      const subTid = (subscription as any)?.tenant_id;
      if (subTid) {
        setResolvedTenantId(String(subTid));
        return;
      }

      // Fallback: query subscriptions by user_id.
      try {
        const { data: sub, error: subErr } = await supabase
          .from("subscriptions")
          .select("tenant_id")
          .eq("user_id", user.id)
          .in("status", ["active", "trialing"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (subErr) return;

        const tid = (sub as any)?.tenant_id;
        if (tid) setResolvedTenantId(String(tid));
      } catch {
        // ignore
      }
    };
    run();
  }, [user, tenantId, resolvedTenantId, subscription, isPlatformAdmin]);

  useEffect(() => {
    const run = async () => {
      if (!isPlatformAdmin) return;
      try {
        const tenantIds = new Set<string>();

        // Prefer team_members as source of tenant_ids
        const { data: tm, error: tmErr } = await supabase
          .from("team_members")
          .select("tenant_id")
          .not("tenant_id", "is", null)
          .limit(1000);
        if (!tmErr) {
          for (const row of tm || []) {
            const tid = (row as any)?.tenant_id;
            if (tid) tenantIds.add(String(tid));
          }
        }

        // Fallback: subscriptions (some tenants may only exist here)
        const { data: subs } = await supabase
          .from("subscriptions")
          .select("tenant_id")
          .not("tenant_id", "is", null)
          .limit(1000);
        for (const row of subs || []) {
          const tid = (row as any)?.tenant_id;
          if (tid) tenantIds.add(String(tid));
        }

        const list = Array.from(tenantIds).sort();
        setTenantOptions(list);

        // Auto-select for platform admin when possible
        if (!tenantId && list.length > 0) {
          if (!selectedTenantId || !list.includes(selectedTenantId)) {
            setSelectedTenantId(list[0]);
          }
        }
      } catch {
        // ignore
      }
    };
    run();
  }, [isPlatformAdmin, tenantId, selectedTenantId]);

  const openCreateAgent = () => {
    setEditingAgent(null);
    setModalError(null);
    setDraftName("");
    setDraftChannel("whatsapp");
    setDraftLang("es");
    setDraftPrompt(DEFAULT_PROMPT_ES);
    setDraftActive(true);
    setShowAgentModal(true);
  };

  const openEditAgent = (agent: BotAgent) => {
    setEditingAgent(agent);
    setModalError(null);
    setDraftName(agent.name);
    setDraftChannel(agent.channel);
    setDraftLang(agent.language);
    setDraftPrompt(agent.system_prompt);
    setDraftActive(Boolean(agent.is_active));
    setShowAgentModal(true);
  };

  const saveAgent = async () => {
    console.log("[AgentsStudio] saveAgent", {
      isPlatformAdmin,
      tenantId,
      selectedTenantId,
      effectiveTenantId,
      draftName: draftName.trim(),
      draftChannel,
      draftLang,
    });
    // For edit, we can rely on the existing row tenant_id.
    if (!editingAgent && !canCreate) {
      const msg = isPlatformAdmin
        ? (language === "en" ? "Select a tenant first." : "Selecciona un tenant primero.")
        : t.needTenant;
      setError(msg);
      setModalError(msg);
      return;
    }
    if (!draftName.trim()) return;
    setLoading(true);
    setError(null);
    setModalError(null);
    try {
      const system_prompt =
        draftPrompt.trim() || (draftLang === "en" ? DEFAULT_PROMPT_EN : DEFAULT_PROMPT_ES);

      if (editingAgent) {
        // Do not update tenant_id/created_by on edit to avoid RLS/consistency issues.
        const payload = {
          name: draftName.trim(),
          channel: draftChannel,
          language: draftLang,
          system_prompt,
          is_active: draftActive,
          updated_at: new Date().toISOString(),
        };

        const { data: updated, error: updErr } = await supabase
          .from("bot_agents")
          .update(payload)
          .eq("id", editingAgent.id)
          .select("id")
          .maybeSingle();
        if (updErr) throw updErr;
        if (!updated?.id) throw new Error("No se pudo guardar el agente.");
      } else {
        const payload = {
          tenant_id: effectiveTenantId,
          name: draftName.trim(),
          channel: draftChannel,
          language: draftLang,
          system_prompt,
          is_active: draftActive,
          created_by: user?.id || null,
        };
        const { data: inserted, error: insErr } = await supabase
          .from("bot_agents")
          .insert(payload)
          .select("id")
          .single();
        if (insErr) throw insErr;
        console.log("[AgentsStudio] inserted agent", inserted);
      }
      setShowAgentModal(false);
      await fetchData();
    } catch (e: any) {
      const msg = e?.message || String(e);
      setError(msg);
      setModalError(msg);
      console.error("[AgentsStudio] saveAgent failed", e);
    } finally {
      setLoading(false);
    }
  };

  const deleteAgent = async (agent: BotAgent) => {
    if (!canCreate) return;
    if (!confirm(`${t.delete}: ${agent.name}?`)) return;
    setLoading(true);
    setError(null);
    try {
      const { error: delErr } = await supabase.from("bot_agents").delete().eq("id", agent.id);
      if (delErr) throw delErr;
      await fetchData();
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const createToken = async () => {
    if (!canCreate) {
      setError(t.needTenant);
      return;
    }
    if (!newTokenAgentId) return;
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      console.log("[AgentsStudio] createToken", {
        isPlatformAdmin,
        tenantId,
        selectedTenantId,
        effectiveTenantId,
        newTokenAgentId,
        label: newTokenLabel.trim() || null,
      });

      const { error: insErr } = await supabase.from("bot_webhook_tokens").insert({
        tenant_id: effectiveTenantId,
        agent_id: newTokenAgentId,
        label: newTokenLabel.trim() || null,
        created_by: user?.id || null,
      });
      if (insErr) throw insErr;

      // Best-effort: fetch the row we just created so the UI updates immediately.
      const { data: latestToken, error: selErr } = await supabase
        .from("bot_webhook_tokens")
        .select("id, tenant_id, agent_id, token, label, is_active, created_at")
        .eq("tenant_id", effectiveTenantId as any)
        .eq("agent_id", newTokenAgentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!selErr && latestToken) {
        setTokens((prev) => {
          const exists = prev.some((p) => p.id === (latestToken as any).id);
          return exists ? prev : ([latestToken as any, ...prev] as any);
        });
        setNotice(language === "en" ? "Connection created." : "Conexion creada.");
      }

      setNewTokenLabel("");
      await fetchData();
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1200);
    } catch {
      // ignore
    }
  };

  if (!user) {
    return (
      <div style={{ padding: "30px", color: "var(--botz-muted)" }}>{t.needLogin}</div>
    );
  }

  if (!canManage) {
    return (
      <div style={{ padding: "30px", color: "var(--botz-muted)" }}>{t.adminOnly}</div>
    );
  }

  return (
    <div style={{
      background: "var(--botz-panel)",
      border: "1px solid var(--botz-border)",
      borderRadius: "24px",
      padding: "24px",
      boxShadow: "var(--botz-shadow)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "rgba(34, 211, 238, 0.14)", border: "1px solid rgba(34, 211, 238, 0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bot size={20} color="#22d3ee" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "var(--botz-text)" }}>{t.title}</h2>
              <div style={{ marginTop: "4px", fontSize: "12px", color: "var(--botz-muted)" }}>{t.subtitle}</div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {isPlatformAdmin && !tenantId && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <div style={{ fontSize: "12px", color: "var(--botz-muted)", fontWeight: 800 }}>
                {language === "en" ? "Tenant:" : "Tenant:"}
              </div>
              <select
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
                style={{
                  minWidth: "320px",
                  maxWidth: "480px",
                  padding: "10px 12px",
                  borderRadius: "12px",
                  border: "1px solid var(--botz-border)",
                  background: "var(--botz-surface)",
                  color: "var(--botz-text)",
                  outline: "none",
                }}
              >
                <option value="">{language === "en" ? "Select a tenant" : "Selecciona un tenant"}</option>
                {tenantOptions.map((tid) => (
                  <option key={tid} value={tid}>
                    {tid}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={openCreateAgent}
            disabled={!canCreate || loading}
            style={{
              padding: "10px 14px",
              borderRadius: "12px",
              border: "1px solid rgba(34, 211, 238, 0.35)",
              background: "rgba(34, 211, 238, 0.12)",
              color: "var(--botz-text)",
              cursor: canCreate ? "pointer" : "not-allowed",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              fontWeight: 800,
              fontSize: "13px",
              opacity: canCreate ? 1 : 0.6,
            }}
          >
            <Plus size={16} /> {t.createAgent}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ marginTop: "14px", padding: "10px 12px", borderRadius: "12px", border: "1px solid rgba(239, 68, 68, 0.25)", background: "rgba(239, 68, 68, 0.08)", color: "#ef4444", fontSize: "12px" }}>
          {error}
        </div>
      )}

      {notice && (
        <div style={{ marginTop: "14px", padding: "10px 12px", borderRadius: "12px", border: "1px solid rgba(34, 197, 94, 0.25)", background: "rgba(34, 197, 94, 0.08)", color: "#22c55e", fontSize: "12px" }}>
          {notice}
        </div>
      )}

      {!effectiveTenantId && (
        <div style={{ marginTop: "14px", padding: "10px 12px", borderRadius: "12px", border: "1px solid rgba(245, 158, 11, 0.25)", background: "rgba(245, 158, 11, 0.08)", color: "#f59e0b", fontSize: "12px" }}>
          {isPlatformAdmin
            ? (language === "en" ? "Select a tenant to create agents." : "Selecciona un tenant para crear agentes.")
            : t.needTenant}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "14px", marginTop: "18px" }}>
        <div style={{
          background: "var(--botz-surface-2)",
          border: "1px solid var(--botz-border)",
          borderRadius: "16px",
          padding: "14px",
          minHeight: "360px",
        }}>
          <div style={{ fontSize: "12px", fontWeight: 900, color: "var(--botz-text)", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "12px" }}>
            {t.agents}
          </div>

          {loading && agents.length === 0 ? (
            <div style={{ padding: "10px", color: "var(--botz-muted)" }}>...</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {agents.map((a) => (
                <div key={a.id} style={{
                  padding: "12px",
                  borderRadius: "14px",
                  border: "1px solid var(--botz-border-soft)",
                  background: "var(--botz-surface)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: a.is_active ? "#22c55e" : "#64748b" }} />
                      <div style={{ fontWeight: 900, color: "var(--botz-text)", fontSize: "13px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</div>
                    </div>
                    <div style={{ marginTop: "4px", fontSize: "11px", color: "var(--botz-muted)" }}>
                      {a.channel} · {a.language} · {a.is_active ? t.active : t.inactive}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      onClick={() => openEditAgent(a)}
                      disabled={!canCreate || loading}
                      style={{ background: "transparent", border: "1px solid var(--botz-border)", color: "var(--botz-text)", borderRadius: "10px", padding: "8px", cursor: canCreate ? "pointer" : "not-allowed", opacity: canCreate ? 1 : 0.6 }}
                      title={t.edit}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => deleteAgent(a)}
                      disabled={!canCreate || loading}
                      style={{ background: "transparent", border: "1px solid rgba(239, 68, 68, 0.35)", color: "#ef4444", borderRadius: "10px", padding: "8px", cursor: canCreate ? "pointer" : "not-allowed", opacity: canCreate ? 1 : 0.6 }}
                      title={t.delete}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}

              {agents.length === 0 && (
                <div style={{ padding: "10px", color: "var(--botz-muted)" }}>
                  {language === "en" ? "No agents yet" : "Aun no hay agentes"}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{
          background: "var(--botz-surface-2)",
          border: "1px solid var(--botz-border)",
          borderRadius: "16px",
          padding: "14px",
          minHeight: "360px",
        }}>
          <div style={{ fontSize: "12px", fontWeight: 900, color: "var(--botz-text)", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "12px" }}>
            {t.tokens}
          </div>

          <div style={{
            padding: "12px",
            borderRadius: "14px",
            border: "1px solid var(--botz-border-soft)",
            background: "var(--botz-surface)",
            marginBottom: "12px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              <Link2 size={14} color="#22d3ee" />
              <div style={{ fontWeight: 900, color: "var(--botz-text)", fontSize: "13px" }}>{t.newConnection}</div>
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <select
                value={newTokenAgentId}
                onChange={(e) => setNewTokenAgentId(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: "180px",
                  padding: "10px 12px",
                  borderRadius: "12px",
                  border: "1px solid var(--botz-border)",
                  background: "var(--botz-surface)",
                  color: "var(--botz-text)",
                  outline: "none",
                }}
              >
                <option value="">{language === "en" ? "Select agent" : "Selecciona agente"}</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.channel})
                  </option>
                ))}
              </select>
              <input
                value={newTokenLabel}
                onChange={(e) => setNewTokenLabel(e.target.value)}
                placeholder={t.label}
                style={{
                  flex: 1,
                  minWidth: "160px",
                  padding: "10px 12px",
                  borderRadius: "12px",
                  border: "1px solid var(--botz-border)",
                  background: "var(--botz-surface)",
                  color: "var(--botz-text)",
                  outline: "none",
                }}
              />
              <button
                onClick={createToken}
                disabled={!canCreate || loading || !newTokenAgentId}
                style={{
                  padding: "10px 12px",
                  borderRadius: "12px",
                  border: "1px solid rgba(34, 211, 238, 0.35)",
                  background: "rgba(34, 211, 238, 0.14)",
                  color: "var(--botz-text)",
                  cursor: canCreate ? "pointer" : "not-allowed",
                  fontWeight: 900,
                  opacity: (!canCreate || !newTokenAgentId) ? 0.6 : 1,
                }}
              >
                {t.create}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {tokens.map((tk) => {
              const url = `${connectionBaseUrl}?token=${tk.token}`;
              const agent = agents.find((a) => a.id === tk.agent_id);
              return (
                <div key={tk.id} style={{
                  padding: "12px",
                  borderRadius: "14px",
                  border: "1px solid var(--botz-border-soft)",
                  background: "var(--botz-surface)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {tk.is_active ? (
                          <CheckCircle2 size={14} color="#22c55e" />
                        ) : (
                          <XCircle size={14} color="#64748b" />
                        )}
                        <div style={{ fontWeight: 900, color: "var(--botz-text)", fontSize: "13px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {tk.label || (agent ? agent.name : tk.agent_id.slice(0, 8))}
                        </div>
                      </div>
                      <div style={{ marginTop: "4px", fontSize: "11px", color: "var(--botz-muted)" }}>
                        {t.connectionUrl}
                      </div>
                      <div style={{ marginTop: "6px", fontSize: "12px", color: "var(--botz-text)", wordBreak: "break-all" }}>
                        {url}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <button
                        onClick={() => copyToClipboard(url, tk.id)}
                        style={{ background: "transparent", border: "1px solid var(--botz-border)", color: "var(--botz-text)", borderRadius: "10px", padding: "8px", cursor: "pointer" }}
                        title={t.copy}
                      >
                        <Copy size={14} />
                      </button>
                      <div style={{ fontSize: "11px", color: "var(--botz-muted)", minWidth: "58px" }}>
                        {copied === tk.id ? t.copied : ""}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {tokens.length === 0 && (
              <div style={{ padding: "10px", color: "var(--botz-muted)" }}>
                {language === "en" ? "No connections yet" : "Aun no hay conexiones"}
              </div>
            )}
          </div>
        </div>
      </div>

      {showAgentModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.68)",
          backdropFilter: "blur(6px)",
          zIndex: 99999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}>
          <div style={{
            width: "min(920px, 96vw)",
            maxHeight: "90vh",
            overflow: "auto",
            background: "var(--botz-surface-2)",
            border: "1px solid var(--botz-border)",
            borderRadius: "20px",
            boxShadow: "var(--botz-shadow)",
          }}>
            <div style={{ padding: "18px 18px 12px", borderBottom: "1px solid var(--botz-border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                <div style={{ fontWeight: 900, color: "var(--botz-text)", fontSize: "16px" }}>
                  {editingAgent ? `${t.edit}: ${editingAgent.name}` : t.createAgent}
                </div>
                <button
                  onClick={() => setShowAgentModal(false)}
                  style={{ background: "transparent", border: "1px solid var(--botz-border)", color: "var(--botz-text)", borderRadius: "12px", padding: "8px 10px", cursor: "pointer" }}
                >
                  {t.cancel}
                </button>
              </div>
            </div>

            <div style={{ padding: "18px" }}>
              {modalError && (
                <div style={{
                  marginBottom: "12px",
                  padding: "10px 12px",
                  borderRadius: "12px",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  background: "rgba(239, 68, 68, 0.08)",
                  color: "#ef4444",
                  fontSize: "12px",
                  lineHeight: 1.35,
                }}>
                  {modalError}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                <div>
                  <div style={{ fontSize: "12px", color: "var(--botz-muted)", marginBottom: "6px" }}>{t.name}</div>
                  <input
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "12px", border: "1px solid var(--botz-border)", background: "var(--botz-surface)", color: "var(--botz-text)", outline: "none" }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "var(--botz-muted)", marginBottom: "6px" }}>{t.channel}</div>
                  <select
                    value={draftChannel}
                    onChange={(e) => setDraftChannel(e.target.value as AgentChannel)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "12px", border: "1px solid var(--botz-border)", background: "var(--botz-surface)", color: "var(--botz-text)", outline: "none" }}
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="webchat">Web chat</option>
                    <option value="form">Formulario</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "var(--botz-muted)", marginBottom: "6px" }}>{t.language}</div>
                  <select
                    value={draftLang}
                    onChange={(e) => {
                      const v = e.target.value as "es" | "en";
                      setDraftLang(v);
                      if (!draftPrompt.trim()) {
                        setDraftPrompt(v === "en" ? DEFAULT_PROMPT_EN : DEFAULT_PROMPT_ES);
                      }
                    }}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "12px", border: "1px solid var(--botz-border)", background: "var(--botz-surface)", color: "var(--botz-text)", outline: "none" }}
                  >
                    <option value="es">ES</option>
                    <option value="en">EN</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "12px" }}>
                <button
                  onClick={() => setDraftActive((v) => !v)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "12px",
                    border: "1px solid var(--botz-border)",
                    background: draftActive ? "rgba(34,197,94,0.12)" : "var(--botz-surface-3)",
                    color: draftActive ? "#22c55e" : "var(--botz-muted)",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    fontWeight: 900,
                    fontSize: "12px",
                  }}
                >
                  {draftActive ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                  {draftActive ? t.active : t.inactive}
                </button>
              </div>

              <div style={{ marginTop: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "10px" }}>
                  <div>
                    <div style={{ fontSize: "12px", color: "var(--botz-muted)", marginBottom: "6px" }}>{t.prompt}</div>
                    <div style={{ fontSize: "11px", color: "var(--botz-muted)" }}>{t.promptHint}</div>
                  </div>
                  <button
                    onClick={() => setDraftPrompt(draftLang === "en" ? DEFAULT_PROMPT_EN : DEFAULT_PROMPT_ES)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: "12px",
                      border: "1px solid var(--botz-border)",
                      background: "var(--botz-surface-3)",
                      color: "var(--botz-text)",
                      cursor: "pointer",
                      fontWeight: 800,
                      fontSize: "12px",
                    }}
                  >
                    {language === "en" ? "Use template" : "Usar plantilla"}
                  </button>
                </div>

                <textarea
                  value={draftPrompt}
                  onChange={(e) => setDraftPrompt(e.target.value)}
                  rows={12}
                  style={{
                    marginTop: "10px",
                    width: "100%",
                    padding: "12px",
                    borderRadius: "14px",
                    border: "1px solid var(--botz-border)",
                    background: "var(--botz-surface)",
                    color: "var(--botz-text)",
                    outline: "none",
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                    fontSize: "12px",
                    lineHeight: 1.5,
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "14px" }}>
                <button
                  onClick={() => setShowAgentModal(false)}
                  style={{ padding: "10px 14px", borderRadius: "12px", border: "1px solid var(--botz-border)", background: "transparent", color: "var(--botz-text)", cursor: "pointer", fontWeight: 900 }}
                >
                  {t.cancel}
                </button>
                <button
                  onClick={saveAgent}
                  disabled={!draftName.trim() || loading}
                  style={{ padding: "10px 14px", borderRadius: "12px", border: "none", background: "#22d3ee", color: "#001018", cursor: "pointer", fontWeight: 1000, opacity: (!draftName.trim() || loading) ? 0.6 : 1 }}
                >
                  {t.save}
                </button>
              </div>

              {!effectiveTenantId && (
                <div style={{ marginTop: "12px", fontSize: "11px", color: "var(--botz-muted)" }}>
                  {language === "en" ? "Tenant is required to save." : "Se requiere tenant para guardar."}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
