"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { authedFetch } from "@/app/start/agents/authedFetchAgents";
import { AuthRequiredError } from "@/app/start/agents/authedFetchAgents";

const C = {
  bg: "#1a1d26",
  card: "#22262d",
  dark: "#111318",
  border: "rgba(255,255,255,0.10)",
  lime: "#a3e635",
  white: "#ffffff",
  muted: "#9ca3af",
  blue: "#60a5fa",
};

type Draft = {
  id: string;
  agent_id?: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  company_name: string | null;
  product_name: string | null;
  total_cop: number | null;
  status: "draft" | "sent" | "won" | "lost";
  created_at: string;
  updated_at: string;
};

type Contact = {
  key: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  quotes_count: number;
  total_quoted_cop: number;
  last_activity_at: string;
  status: string;
  [k: string]: any;
};

type CrmSettings = {
  enabled: boolean;
  stage_labels: { draft: string; sent: string; won: string; lost: string };
  contact_fields: Array<{ key: string; label: string; visible: boolean; required: boolean }>;
};

const CONTACT_FIELD_DEFAULTS = [
  { key: "name", label: "Nombre", visible: true, required: true },
  { key: "email", label: "Email", visible: true, required: true },
  { key: "phone", label: "Telefono", visible: true, required: true },
  { key: "company", label: "Empresa", visible: true, required: false },
  { key: "assigned_agent_name", label: "Asignado a", visible: false, required: false },
  { key: "last_channel", label: "Canal", visible: false, required: false },
  { key: "last_product", label: "Ultimo producto", visible: false, required: false },
  { key: "status", label: "Estado", visible: false, required: false },
  { key: "last_intent", label: "Ultima intencion", visible: true, required: false },
  { key: "lead_temperature", label: "Temperatura", visible: true, required: false },
  { key: "last_quote_sent_at", label: "Ultima cotizacion enviada", visible: true, required: false },
  { key: "quote_requests_count", label: "Solicitudes de cotizacion", visible: true, required: false },
  { key: "tech_sheet_requests_count", label: "Solicitudes ficha/imagen", visible: true, required: false },
  { key: "last_quote_value_cop", label: "Ultimo valor cotizado", visible: true, required: false },
  { key: "total_quoted_cop", label: "Valor total cotizado", visible: true, required: false },
  { key: "next_action", label: "Proxima accion", visible: false, required: false },
  { key: "next_action_at", label: "Fecha proxima accion", visible: false, required: false },
  { key: "quotes_count", label: "Cotizaciones generadas", visible: false, required: false },
  { key: "last_activity_at", label: "Ultima actividad", visible: true, required: false },
];

export default function AgentsCrmPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<"es" | "en">("es");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [pipeline, setPipeline] = useState<{ draft: Draft[]; sent: Draft[]; won: Draft[]; lost: Draft[] }>({ draft: [], sent: [], won: [], lost: [] });
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [updatingId, setUpdatingId] = useState<string>("");
  const [updatingContactKey, setUpdatingContactKey] = useState<string>("");
  const [settings, setSettings] = useState<CrmSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [agentOptions, setAgentOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [channelSummary, setChannelSummary] = useState<Array<{ channel: string; count: number }>>([]);
  const [byAgent, setByAgent] = useState<Array<{ agent_id: string; agent_name: string; total: number; sent: number; won: number; lost: number; pipeline_cop: number }>>([]);
  const [funnel, setFunnel] = useState<Array<{ key: string; label: string; value: number }>>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAgent, setFilterAgent] = useState("all");
  const [filterChannel, setFilterChannel] = useState("all");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactDetail, setContactDetail] = useState<{ contact?: any; drafts: any[]; conversations: any[]; timeline: Array<{ at: string; kind: string; text: string }>; notes?: Array<{ id: string; note: string; created_at: string }> } | null>(null);
  const [contactLoading, setContactLoading] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingContact, setSavingContact] = useState(false);

  const tr = (es: string, en: string) => (language === "en" ? en : es);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("botz-language");
    if (saved === "es" || saved === "en") setLanguage(saved);
  }, []);

  const money = (n: number) => new Intl.NumberFormat(language === "en" ? "en-US" : "es-CO", { maximumFractionDigits: 0 }).format(Number(n || 0));

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const settingsRes = await authedFetch("/api/agents/crm/settings");
      const settingsJson = await settingsRes.json();
      if (!settingsRes.ok || !settingsJson?.ok) throw new Error(settingsJson?.error || "No se pudo cargar configuración CRM");
      setSettings(settingsJson?.data || null);

      const res = await authedFetch("/api/agents/crm/overview");
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo cargar CRM");
      setSummary(json?.data?.summary || null);
      setPipeline(json?.data?.pipeline || { draft: [], sent: [], won: [], lost: [] });
      setContacts(Array.isArray(json?.data?.contacts) ? json.data.contacts : []);
      setAgentOptions(Array.isArray(json?.data?.agents) ? json.data.agents : []);
      setChannelSummary(Array.isArray(json?.data?.channel_summary) ? json.data.channel_summary : []);
      setByAgent(Array.isArray(json?.data?.by_agent) ? json.data.by_agent : []);
      setFunnel(Array.isArray(json?.data?.funnel) ? json.data.funnel : []);
    } catch (e: any) {
      if (e instanceof AuthRequiredError) {
        setError(tr("Sesion expirada. Inicia sesion de nuevo en Agents.", "Session expired. Sign in again in Agents."));
        router.push("/start/agents?auth=login");
        return;
      }
      setError(String(e?.message || "Error cargando CRM"));
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (patch: Partial<CrmSettings>) => {
    if (!settings) return;
    setSavingSettings(true);
    setError(null);
    try {
      const res = await authedFetch("/api/agents/crm/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo guardar configuración CRM");
      setSettings(json?.data || settings);
      await fetchData();
    } catch (e: any) {
      if (e instanceof AuthRequiredError) {
        setError(tr("Sesion expirada. Inicia sesion de nuevo en Agents.", "Session expired. Sign in again in Agents."));
        router.push("/start/agents?auth=login");
        return;
      }
      setError(String(e?.message || "Error guardando configuración"));
    } finally {
      setSavingSettings(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const updateStatus = async (id: string, status: Draft["status"]) => {
    setUpdatingId(id);
    try {
      const res = await authedFetch(`/api/agents/crm/opportunities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo actualizar etapa");
      await fetchData();
    } catch (e: any) {
      if (e instanceof AuthRequiredError) {
        setError(tr("Sesion expirada. Inicia sesion de nuevo en Agents.", "Session expired. Sign in again in Agents."));
        router.push("/start/agents?auth=login");
        return;
      }
      setError(String(e?.message || "Error actualizando etapa"));
    } finally {
      setUpdatingId("");
    }
  };

  const stageLabel = (status: string) => {
    const key = String(status || "").toLowerCase();
    if (key === "draft") return settings?.stage_labels?.draft || tr("Nuevo", "New");
    if (key === "sent") return settings?.stage_labels?.sent || tr("Cotizacion enviada", "Quote sent");
    if (key === "won") return settings?.stage_labels?.won || tr("Ganado", "Won");
    if (key === "lost") return settings?.stage_labels?.lost || tr("Perdido", "Lost");
    return status || "-";
  };

  const patchContactInline = async (c: Contact, patch: any, fallbackError: string) => {
    setUpdatingContactKey(String(c.key || ""));
    try {
      const res = await authedFetch("/api/agents/crm/contact", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: c.phone,
          email: c.email,
          name: c.name,
          company: c.company,
          ...patch,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || fallbackError);
      await fetchData();
      if (selectedContact && String(selectedContact.key || "") === String(c.key || "")) {
        await openContactDetail({ ...selectedContact, ...patch } as Contact);
      }
    } catch (e: any) {
      setError(String(e?.message || fallbackError));
    } finally {
      setUpdatingContactKey("");
    }
  };

  const updateContactStatusInline = async (c: Contact, status: string) => {
    await patchContactInline(c, { status }, "No se pudo actualizar estado del contacto");
  };

  const updateContactNextActionInline = async (c: Contact, next_action: string) => {
    await patchContactInline(c, { next_action }, "No se pudo actualizar próxima acción");
  };

  const updateContactNextActionAtInline = async (c: Contact, localDateTime: string) => {
    const next_action_at = localDateTime ? new Date(localDateTime).toISOString() : null;
    await patchContactInline(c, { next_action_at }, "No se pudo actualizar fecha de próxima acción");
  };

  const openContactDetail = async (c: Contact) => {
    setSelectedContact(c);
    setContactLoading(true);
    setContactDetail(null);
    try {
      const q = new URLSearchParams();
      if (c.phone) q.set("phone", c.phone);
      if (c.email) q.set("email", c.email);
      const res = await authedFetch(`/api/agents/crm/contact?${q.toString()}`);
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo cargar detalle de contacto");
      const data = json?.data || { drafts: [], conversations: [], timeline: [], notes: [] };
      setContactDetail(data);
      if (data?.contact) {
        setSelectedContact((prev) => ({ ...(prev || c), ...(data.contact || {}) } as Contact));
      }
    } catch (e: any) {
      setError(String(e?.message || "Error cargando detalle de contacto"));
    } finally {
      setContactLoading(false);
    }
  };

  const saveContactPatch = async (patch: any) => {
    if (!selectedContact) return;
    setSavingContact(true);
    try {
      const res = await authedFetch("/api/agents/crm/contact", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: selectedContact.phone,
          email: selectedContact.email,
          name: selectedContact.name,
          company: selectedContact.company,
          ...patch,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo guardar contacto");
      await fetchData();
      await openContactDetail(selectedContact);
    } catch (e: any) {
      setError(String(e?.message || "Error guardando contacto"));
    } finally {
      setSavingContact(false);
    }
  };

  const addContactNote = async () => {
    if (!selectedContact || !noteDraft.trim()) return;
    setSavingContact(true);
    try {
      const res = await authedFetch("/api/agents/crm/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: selectedContact.phone,
          email: selectedContact.email,
          name: selectedContact.name,
          company: selectedContact.company,
          note: noteDraft.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo guardar bitacora");
      setNoteDraft("");
      await openContactDetail(selectedContact);
      await fetchData();
    } catch (e: any) {
      setError(String(e?.message || "Error guardando bitacora"));
    } finally {
      setSavingContact(false);
    }
  };

  const columns = useMemo(
    () => [
      { key: "draft", title: settings?.stage_labels?.draft || tr("Nuevo", "New"), rows: pipeline.draft },
      { key: "sent", title: settings?.stage_labels?.sent || tr("Cotizacion enviada", "Quote sent"), rows: pipeline.sent },
      { key: "won", title: settings?.stage_labels?.won || tr("Ganado", "Won"), rows: pipeline.won },
      { key: "lost", title: settings?.stage_labels?.lost || tr("Perdido", "Lost"), rows: pipeline.lost },
    ],
    [pipeline, language, settings]
  );

  const mergedContactFields = useMemo(() => {
    const fromSettings = Array.isArray(settings?.contact_fields) ? settings!.contact_fields : [];
    const keys = new Set(fromSettings.map((f) => f.key));
    const extra = CONTACT_FIELD_DEFAULTS.filter((f) => !keys.has(f.key));
    return [...fromSettings, ...extra];
  }, [settings]);

  const visibleContactFields = mergedContactFields.filter((f) => f.visible);

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter((c) => {
      if (filterStatus !== "all" && String(c.status || "") !== filterStatus) return false;
      if (filterAgent !== "all" && String(c.assigned_agent_id || "") !== filterAgent) return false;
      if (filterChannel !== "all" && String(c.last_channel || "") !== filterChannel) return false;
      if (!q) return true;
      const hay = `${c.name || ""} ${c.email || ""} ${c.phone || ""} ${c.company || ""} ${c.last_product || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [contacts, search, filterStatus, filterAgent, filterChannel]);

  const filteredPipeline = useMemo(() => {
    const statusSet = new Set(filteredContacts.map((c) => String(c.phone || "") + "|" + String(c.email || "").toLowerCase()));
    const byStatus = {
      draft: columns[0]?.rows || [],
      sent: columns[1]?.rows || [],
      won: columns[2]?.rows || [],
      lost: columns[3]?.rows || [],
    };
    const apply = (rows: Draft[]) => {
      if (filterStatus !== "all") return rows.filter((r) => r.status === filterStatus);
      if (filterAgent !== "all") return rows.filter((r: any) => String((r as any).agent_id || "") === filterAgent);
      if (filterChannel === "all" && !search.trim()) return rows;
      return rows.filter((r) => {
        const key = `${String(r.customer_phone || "").replace(/\D/g, "")}|${String(r.customer_email || "").toLowerCase()}`;
        if (statusSet.has(key)) return true;
        const q = search.trim().toLowerCase();
        if (!q) return false;
        const hay = `${r.customer_name || ""} ${r.company_name || ""} ${r.product_name || ""}`.toLowerCase();
        return hay.includes(q);
      });
    };
    return {
      draft: apply(byStatus.draft),
      sent: apply(byStatus.sent),
      won: apply(byStatus.won),
      lost: apply(byStatus.lost),
    };
  }, [columns, filteredContacts, filterStatus, filterAgent, filterChannel, search]);

  const downloadCsv = () => {
    const cols = (visibleContactFields.length ? visibleContactFields : [{ key: "name", label: tr("Nombre", "Name") } as any]);
    const sep = ";";
    const headers = cols.map((c: any) => String(c.label || c.key));
    const lines = [headers.join(sep)];
    for (const c of filteredContacts) {
      const row = cols.map((f: any) => {
        const raw = String(renderContactValue(c, f.key) || "").replace(/\r?\n/g, " ");
        const escaped = raw.replace(/"/g, '""');
        return `"${escaped}"`;
      });
      lines.push(row.join(sep));
    }
    const csvContent = `\uFEFF${lines.join("\n")}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agents-crm-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderContactValue = (c: Contact, key: string) => {
    if (key === "last_activity_at") return c.last_activity_at ? new Date(c.last_activity_at).toLocaleString() : "-";
    if (key === "next_action_at") return c.next_action_at ? new Date(c.next_action_at).toLocaleString() : "-";
    if (key === "last_quote_sent_at") return c.last_quote_sent_at ? new Date(c.last_quote_sent_at).toLocaleString() : "-";
    if (key === "last_quote_at") return c.last_quote_at ? new Date(c.last_quote_at).toLocaleString() : "-";
    if (key === "status") return stageLabel(String(c.status || ""));
    if (key === "total_quoted_cop" || key === "last_quote_value_cop") return `COP ${money(Number(c[key] || 0))}`;
    if (key === "lead_temperature") {
      const v = String(c.lead_temperature || "cold").toLowerCase();
      if (v === "hot") return tr("Caliente", "Hot");
      if (v === "warm") return tr("Tibio", "Warm");
      if (v === "closed_won") return tr("Cerrado ganado", "Closed won");
      if (v === "closed_lost") return tr("Cerrado perdido", "Closed lost");
      return tr("Frio", "Cold");
    }
    const v = c[key];
    return v == null || v === "" ? "-" : String(v);
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: C.bg, color: C.white, fontFamily: "Inter,-apple-system,sans-serif" }}>
      <div style={{ height: 56, backgroundColor: C.dark, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 18px", gap: 12 }}>
        <button onClick={() => router.push("/start/agents")} style={{ background: "none", border: "none", color: C.lime, cursor: "pointer", fontWeight: 900 }}>{tr("← Volver", "← Back")}</button>
        <div style={{ fontWeight: 900, fontSize: 16 }}>{tr("CRM de Agents", "Agents CRM")}</div>
      </div>

      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "20px 18px 40px" }}>
        <div style={{ color: C.muted, marginBottom: 14 }}>
          {tr("Pipeline comercial unificado con leads, cotizaciones y seguimiento desde WhatsApp.", "Unified sales pipeline with leads, quotes and WhatsApp follow-ups.")}
        </div>

        {error && <div style={{ marginBottom: 12, border: `1px solid ${C.border}`, background: "rgba(239,68,68,0.12)", color: "#fca5a5", padding: "10px 12px", borderRadius: 10 }}>{error}</div>}

        {!!settings?.enabled && (
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, background: C.card, padding: 12, marginBottom: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr repeat(3,minmax(160px,1fr))", gap: 10 }}>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tr("Buscar contacto, correo, producto...", "Search contact, email, product...")} style={{ padding: "9px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }} />
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: "9px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }}>
                <option value="all">{tr("Todos los estados", "All statuses")}</option>
                <option value="draft">{settings?.stage_labels?.draft || tr("Nuevo", "New")}</option>
                <option value="sent">{settings?.stage_labels?.sent || tr("Cotizacion enviada", "Quote sent")}</option>
                <option value="won">{settings?.stage_labels?.won || tr("Ganado", "Won")}</option>
                <option value="lost">{settings?.stage_labels?.lost || tr("Perdido", "Lost")}</option>
              </select>
              <select value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)} style={{ padding: "9px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }}>
                <option value="all">{tr("Todos los asesores", "All assignees")}</option>
                {agentOptions.map((a) => <option key={a.id} value={a.id}>{a.name || a.id}</option>)}
              </select>
              <select value={filterChannel} onChange={(e) => setFilterChannel(e.target.value)} style={{ padding: "9px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }}>
                <option value="all">{tr("Todos los canales", "All channels")}</option>
                {channelSummary.map((c) => <option key={c.channel} value={c.channel}>{c.channel}</option>)}
              </select>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              {channelSummary.map((c) => (
                <span key={c.channel} style={{ border: `1px solid ${C.border}`, borderRadius: 999, background: C.dark, color: C.muted, fontSize: 12, padding: "4px 10px" }}>
                  {c.channel}: {c.count}
                </span>
              ))}
            </div>
          </div>
        )}

        <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, background: C.card, padding: 12, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 800 }}>{tr("Habilitación por cliente", "Client enablement")}</div>
              <div style={{ color: C.muted, fontSize: 12 }}>{tr("Activa o desactiva este CRM solo para este cliente/tenant.", "Enable or disable this CRM for this client/tenant only.")}</div>
            </div>
            <button
              onClick={() => void saveSettings({ enabled: !Boolean(settings?.enabled) })}
              disabled={savingSettings}
              style={{ border: "none", borderRadius: 10, background: settings?.enabled ? "#ef4444" : C.lime, color: settings?.enabled ? "#fff" : "#111", fontWeight: 900, padding: "9px 12px", cursor: "pointer" }}
            >
              {settings?.enabled ? tr("Deshabilitar CRM", "Disable CRM") : tr("Habilitar CRM", "Enable CRM")}
            </button>
          </div>

          {!!settings?.enabled && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>{tr("Campos visibles de contactos", "Visible contact fields")}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 8 }}>
                {mergedContactFields.map((f) => (
                  <label key={f.key} style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", background: C.dark }}>
                    <input
                      type="checkbox"
                      checked={Boolean(f.visible)}
                      onChange={() => {
                        const next = mergedContactFields.map((x) => (x.key === f.key ? { ...x, visible: !x.visible } : x));
                        void saveSettings({ contact_fields: next });
                      }}
                    />
                    <span style={{ fontSize: 13 }}>{f.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {!settings?.enabled && !loading && (
          <div style={{ border: `1px dashed ${C.border}`, borderRadius: 12, background: C.dark, color: C.muted, padding: 16, marginBottom: 12 }}>
            {tr("CRM deshabilitado para este cliente. Haz clic en 'Habilitar CRM' para activarlo cuando quieras.", "CRM is disabled for this client. Click 'Enable CRM' whenever you want to activate it.")}
          </div>
        )}

        {settings?.enabled && (
          <>

        <div style={{ border: `1px solid ${C.border}`, borderRadius: 14, background: C.card, padding: 12, marginBottom: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>{tr("Dashboard comercial", "Sales dashboard")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12 }}>
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, background: C.dark, padding: 10 }}>
              <div style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>{tr("Embudo de oportunidades", "Opportunity funnel")}</div>
              <div style={{ display: "grid", gap: 8 }}>
                {funnel.map((f) => {
                  const max = Math.max(...funnel.map((x) => Number(x.value || 0)), 1);
                  const w = Math.max(8, Math.round((Number(f.value || 0) / max) * 100));
                  return (
                    <div key={f.key}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted }}>
                        <span>{f.label}</span>
                        <span>{f.value}</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 999, background: "#0b0e14", overflow: "hidden" }}>
                        <div style={{ width: `${w}%`, height: "100%", background: "linear-gradient(90deg,#60a5fa,#22d3ee)" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, background: C.dark, padding: 10 }}>
              <div style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>{tr("Rendimiento por asesor", "Performance by assignee")}</div>
              <div style={{ display: "grid", gap: 8, maxHeight: 180, overflow: "auto" }}>
                {byAgent.slice(0, 8).map((a) => (
                  <div key={a.agent_id} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, background: "#0f1117" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <b>{a.agent_name || a.agent_id}</b>
                      <span style={{ color: C.blue }}>COP {money(a.pipeline_cop)}</span>
                    </div>
                    <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{tr("Total", "Total")}: {a.total} · Sent: {a.sent} · Won: {a.won}</div>
                  </div>
                ))}
                {!byAgent.length && <div style={{ color: C.muted, fontSize: 12 }}>{tr("Sin actividad de asesores", "No assignee activity")}</div>}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 10, marginBottom: 14 }}>
          <Metric label={tr("Contactos", "Contacts")} value={summary?.contacts ?? 0} />
          <Metric label={tr("Oportunidades", "Opportunities")} value={summary?.opportunities ?? 0} />
          <Metric label={tr("Solicitudes cotización", "Quote requests")} value={summary?.quotes_requested ?? 0} />
          <Metric label={tr("Cotizaciones enviadas", "Quotes sent")} value={summary?.quotes_sent ?? 0} />
          <Metric label={tr("Contactos con cotización", "Contacts with quotes")} value={summary?.contacts_with_quote_requests ?? 0} />
          <Metric label={tr("Contactos con ficha/imagen", "Contacts with spec/image")} value={summary?.contacts_with_tech_sheet_requests ?? 0} />
          <Metric label={tr("Ganadas", "Won")} value={summary?.won ?? 0} />
          <Metric label={tr("Perdidas", "Lost")} value={summary?.lost ?? 0} />
          <Metric label={tr("Valor total cotizado", "Total quoted value")} value={`COP ${money(summary?.total_quotes_requested_cop ?? 0)}`} accent={C.blue} />
          <Metric label={tr("Pipeline COP", "Pipeline COP")} value={money(summary?.total_pipeline_cop ?? 0)} accent={C.blue} />
        </div>

        <div style={{ border: `1px solid ${C.border}`, borderRadius: 14, background: C.card, padding: 12, marginBottom: 16 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>{tr("Pipeline", "Pipeline")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(250px,1fr))", gap: 10, overflowX: "auto" }}>
            {columns.map((col) => (
              <div key={col.key} style={{ minHeight: 230, border: `1px solid ${C.border}`, borderRadius: 10, background: C.dark, padding: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontWeight: 800 }}>{col.title}</div>
                  <div style={{ color: C.muted, fontSize: 12 }}>{(filteredPipeline as any)[col.key]?.length || 0}</div>
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {((filteredPipeline as any)[col.key] || []).slice(0, 8).map((d: any) => (
                    <div key={d.id} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, background: "#0f1117" }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{d.customer_name || d.company_name || tr("Cliente sin nombre", "Unnamed customer")}</div>
                      <div style={{ color: C.muted, fontSize: 12 }}>{d.product_name || "-"}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12 }}>
                        <span style={{ color: C.blue }}>COP {money(Number(d.total_cop || 0))}</span>
                        <span style={{ color: C.muted }}>{new Date(d.created_at).toLocaleDateString()}</span>
                      </div>
                      <select
                        value={d.status}
                        onChange={(e) => void updateStatus(d.id, e.target.value as Draft["status"])}
                        disabled={updatingId === d.id}
                        style={{ width: "100%", marginTop: 8, padding: "7px 8px", borderRadius: 7, border: `1px solid ${C.border}`, background: C.card, color: C.white }}
                      >
                        <option value="draft">{settings?.stage_labels?.draft || tr("Nuevo", "New")}</option>
                        <option value="sent">{settings?.stage_labels?.sent || tr("Cotizacion enviada", "Quote sent")}</option>
                        <option value="won">{settings?.stage_labels?.won || tr("Ganado", "Won")}</option>
                        <option value="lost">{settings?.stage_labels?.lost || tr("Perdido", "Lost")}</option>
                      </select>
                    </div>
                  ))}
                  {!loading && (((filteredPipeline as any)[col.key] || []).length === 0) && <div style={{ color: C.muted, fontSize: 12 }}>{tr("Sin registros", "No records")}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ background: C.card, padding: "10px 12px", fontWeight: 800, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{tr("Contactos", "Contacts")}</span>
            <button onClick={downloadCsv} style={{ border: `1px solid ${C.border}`, borderRadius: 8, background: C.dark, color: C.white, padding: "6px 10px", cursor: "pointer", fontSize: 12 }}>
              {tr("Descargar Excel (CSV)", "Download Excel (CSV)")}
            </button>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: C.dark }}>
              <tr>
                {(visibleContactFields.length ? visibleContactFields : [{ key: "name", label: tr("Nombre", "Name") } as any]).map((f: any) => (
                  <th key={f.key} style={th}>{f.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && filteredContacts.length === 0 && (
                <tr><td colSpan={Math.max(1, visibleContactFields.length)} style={{ padding: 12, color: C.muted }}>{tr("Aun no hay contactos.", "No contacts yet.")}</td></tr>
              )}
              {filteredContacts.slice(0, 200).map((c) => (
                <tr key={c.key} style={{ borderTop: `1px solid ${C.border}`, cursor: "pointer" }} onClick={() => void openContactDetail(c)}>
                  {(visibleContactFields.length ? visibleContactFields : [{ key: "name", label: tr("Nombre", "Name") } as any]).map((f: any) => (
                    <td key={f.key} style={td} onClick={(e) => {
                      if (f.key === "status" || f.key === "next_action" || f.key === "next_action_at") e.stopPropagation();
                    }}>
                      {f.key === "status" ? (
                        <select
                          value={String(c.status || "draft")}
                          disabled={updatingContactKey === String(c.key || "")}
                          onChange={(e) => void updateContactStatusInline(c, e.target.value)}
                          style={{ width: "100%", padding: "6px 8px", borderRadius: 7, border: `1px solid ${C.border}`, background: C.dark, color: C.white }}
                        >
                          <option value="draft">{settings?.stage_labels?.draft || tr("Nuevo", "New")}</option>
                          <option value="sent">{settings?.stage_labels?.sent || tr("Cotizacion enviada", "Quote sent")}</option>
                          <option value="won">{settings?.stage_labels?.won || tr("Ganado", "Won")}</option>
                          <option value="lost">{settings?.stage_labels?.lost || tr("Perdido", "Lost")}</option>
                        </select>
                      ) : f.key === "next_action" ? (
                        <select
                          value={String(c.next_action || "")}
                          disabled={updatingContactKey === String(c.key || "")}
                          onChange={(e) => void updateContactNextActionInline(c, e.target.value)}
                          style={{ width: "100%", padding: "6px 8px", borderRadius: 7, border: `1px solid ${C.border}`, background: C.dark, color: C.white }}
                        >
                          <option value="">{tr("Sin acción", "No action")}</option>
                          <option value="Calificar lead y validar necesidad">{tr("Calificar lead", "Qualify lead")}</option>
                          <option value="Enviar catalogo/ficha tecnica por WhatsApp">{tr("Enviar ficha/catálogo", "Send catalog/spec")}</option>
                          <option value="Seguimiento de cotizacion enviada">{tr("Seguimiento cotización", "Quote follow-up")}</option>
                          <option value="Llamar para resolver objeciones y cierre">{tr("Llamar para cierre", "Call to close")}</option>
                          <option value="Coordinar pago y entrega">{tr("Coordinar pago y entrega", "Arrange payment and delivery")}</option>
                          <option value="Reactivar contacto en 30 dias">{tr("Reactivar en 30 días", "Reactivate in 30 days")}</option>
                          {!!String(c.next_action || "").trim() && ![
                            "Calificar lead y validar necesidad",
                            "Enviar catalogo/ficha tecnica por WhatsApp",
                            "Seguimiento de cotizacion enviada",
                            "Llamar para resolver objeciones y cierre",
                            "Coordinar pago y entrega",
                            "Reactivar contacto en 30 dias",
                          ].includes(String(c.next_action || "")) && (
                            <option value={String(c.next_action)}>{String(c.next_action)}</option>
                          )}
                        </select>
                      ) : f.key === "next_action_at" ? (
                        <input
                          type="datetime-local"
                          value={c.next_action_at ? String(c.next_action_at).slice(0, 16) : ""}
                          disabled={updatingContactKey === String(c.key || "")}
                          onChange={(e) => void updateContactNextActionAtInline(c, e.target.value)}
                          style={{ width: "100%", padding: "6px 8px", borderRadius: 7, border: `1px solid ${C.border}`, background: C.dark, color: C.white }}
                        />
                      ) : renderContactValue(c, f.key)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedContact && (
          <div style={{ marginTop: 14, border: `1px solid ${C.border}`, borderRadius: 14, background: C.card, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontWeight: 800 }}>{selectedContact.name || selectedContact.email || selectedContact.phone || tr("Detalle de contacto", "Contact detail")}</div>
              <button onClick={() => { setSelectedContact(null); setContactDetail(null); }} style={{ border: `1px solid ${C.border}`, background: C.dark, color: C.white, borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>{tr("Cerrar", "Close")}</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(180px,1fr))", gap: 8, marginBottom: 10 }}>
              <select
                disabled={savingContact}
                value={String(selectedContact.assigned_agent_id || "")}
                onChange={(e) => void saveContactPatch({ assigned_agent_id: e.target.value || null })}
                style={{ padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }}
              >
                <option value="">{tr("Sin asesor asignado", "Unassigned")}</option>
                {agentOptions.map((a) => <option key={a.id} value={a.id}>{a.name || a.id}</option>)}
              </select>

              <select
                disabled={savingContact}
                value={String(selectedContact.status || "draft")}
                onChange={(e) => void saveContactPatch({ status: e.target.value })}
                style={{ padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }}
              >
                <option value="draft">{settings?.stage_labels?.draft || tr("Nuevo", "New")}</option>
                <option value="sent">{settings?.stage_labels?.sent || tr("Cotizacion enviada", "Quote sent")}</option>
                <option value="won">{settings?.stage_labels?.won || tr("Ganado", "Won")}</option>
                <option value="lost">{settings?.stage_labels?.lost || tr("Perdido", "Lost")}</option>
              </select>

              <input
                placeholder={tr("Proxima accion", "Next action")}
                defaultValue={String(selectedContact.next_action || "")}
                onBlur={(e) => void saveContactPatch({ next_action: e.target.value })}
                style={{ padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }}
              />

              <input
                type="datetime-local"
                defaultValue={selectedContact.next_action_at ? String(selectedContact.next_action_at).slice(0, 16) : ""}
                onBlur={(e) => void saveContactPatch({ next_action_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                style={{ padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }}
              />
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <span style={{ border: `1px solid ${C.border}`, borderRadius: 999, background: C.dark, color: C.muted, fontSize: 12, padding: "4px 10px" }}>
                {tr("Solicitudes cotización", "Quote requests")}: {Number((selectedContact as any)?.quote_requests_count || (selectedContact as any)?.quotes_count || 0)}
              </span>
              <span style={{ border: `1px solid ${C.border}`, borderRadius: 999, background: C.dark, color: C.muted, fontSize: 12, padding: "4px 10px" }}>
                {tr("Solicitudes ficha/imagen", "Spec/image requests")}: {Number((selectedContact as any)?.tech_sheet_requests_count || 0)}
              </span>
              <span style={{ border: `1px solid ${C.border}`, borderRadius: 999, background: C.dark, color: C.muted, fontSize: 12, padding: "4px 10px" }}>
                {tr("Ultimo valor", "Last quote")}: COP {money(Number((selectedContact as any)?.last_quote_value_cop || 0))}
              </span>
              <span style={{ border: `1px solid ${C.border}`, borderRadius: 999, background: C.dark, color: C.muted, fontSize: 12, padding: "4px 10px" }}>
                {tr("Valor acumulado", "Total quoted")}: COP {money(Number((selectedContact as any)?.total_quoted_cop || 0))}
              </span>
            </div>

            {contactLoading && <div style={{ color: C.muted }}>{tr("Cargando detalle...", "Loading detail...")}</div>}
            {!contactLoading && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, background: C.dark, padding: 10 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>{tr("Cotizaciones", "Quotes")}</div>
                  <div style={{ display: "grid", gap: 6, maxHeight: 240, overflow: "auto" }}>
                    {(contactDetail?.drafts || []).map((d: any) => (
                      <div key={d.id} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, background: "#0f1117" }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{d.product_name || "-"}</div>
                        <div style={{ color: C.muted, fontSize: 12 }}>{new Date(d.created_at).toLocaleString()} · {stageLabel(d.status)}</div>
                        <div style={{ color: C.blue, fontSize: 12 }}>COP {money(Number(d.total_cop || 0))}</div>
                      </div>
                    ))}
                    {!(contactDetail?.drafts || []).length && <div style={{ color: C.muted, fontSize: 12 }}>{tr("Sin cotizaciones", "No quotes")}</div>}
                  </div>
                </div>
                <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, background: C.dark, padding: 10 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>{tr("Timeline", "Timeline")}</div>
                  <div style={{ display: "grid", gap: 6, maxHeight: 240, overflow: "auto" }}>
                    {(contactDetail?.timeline || []).map((t, idx) => (
                      <div key={`${t.at}-${idx}`} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, background: "#0f1117" }}>
                        <div style={{ color: C.muted, fontSize: 11 }}>{new Date(t.at).toLocaleString()} · {t.kind === "assistant" ? tr("Bot", "Bot") : t.kind === "user" ? tr("Cliente", "Customer") : t.kind}</div>
                        <div style={{ fontSize: 13 }}>{t.text}</div>
                      </div>
                    ))}
                    {!(contactDetail?.timeline || []).length && <div style={{ color: C.muted, fontSize: 12 }}>{tr("Sin actividad", "No activity")}</div>}
                  </div>
                </div>
                <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, background: C.dark, padding: 10 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>{tr("Bitacora", "Logbook")}</div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    <input
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      placeholder={tr("Escribe seguimiento o proxima gestion...", "Write follow-up or next action...")}
                      style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#0f1117", color: C.white }}
                    />
                    <button onClick={() => void addContactNote()} disabled={savingContact || !noteDraft.trim()} style={{ border: "none", borderRadius: 8, background: C.lime, color: "#111", fontWeight: 800, padding: "0 10px", cursor: "pointer" }}>{tr("Guardar", "Save")}</button>
                  </div>
                  <div style={{ display: "grid", gap: 6, maxHeight: 240, overflow: "auto" }}>
                    {(contactDetail?.notes || []).map((n) => (
                      <div key={n.id} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, background: "#0f1117" }}>
                        <div style={{ color: C.muted, fontSize: 11 }}>{new Date(n.created_at).toLocaleString()}</div>
                        <div style={{ fontSize: 13 }}>{n.note}</div>
                      </div>
                    ))}
                    {!(contactDetail?.notes || []).length && <div style={{ color: C.muted, fontSize: 12 }}>{tr("Sin notas", "No notes")}</div>}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: any; accent?: string }) {
  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, background: "#22262d", padding: "12px 14px" }}>
      <div style={{ color: "#9ca3af", fontSize: 12 }}>{label}</div>
      <div style={{ marginTop: 6, fontWeight: 900, fontSize: 20, color: accent || "#ffffff" }}>{String(value)}</div>
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: 10, fontSize: 12, color: "#9ca3af" };
const td: React.CSSProperties = { padding: 10, fontSize: 13 };
