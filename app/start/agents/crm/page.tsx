"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { authedFetch } from "@/app/start/agents/authedFetchAgents";
import { AuthRequiredError } from "@/app/start/agents/authedFetchAgents";

const CRM_STAGE_KEYS = ["analysis", "study", "quote", "purchase_order", "invoicing"] as const;
type CrmStage = (typeof CRM_STAGE_KEYS)[number];

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
  status: CrmStage;
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
  stage_labels: { analysis: string; study: string; quote: string; purchase_order: string; invoicing: string };
  contact_fields: Array<{ key: string; label: string; visible: boolean; required: boolean }>;
};

type IntegrationAccessState = {
  requester_user_id: string;
  requester_email: string;
  is_owner: boolean;
  self_enabled: boolean;
  self_enabled_updated_at: string | null;
};

type CrmTab = "dashboard" | "pipeline" | "contacts";

const CONTACT_FIELD_DEFAULTS = [
  { key: "name", label: "Nombre", visible: true, required: true },
  { key: "email", label: "Email", visible: true, required: true },
  { key: "phone", label: "Telefono", visible: true, required: true },
  { key: "company", label: "Empresa", visible: true, required: false },
  { key: "assigned_agent_name", label: "Asignado a", visible: false, required: false },
  { key: "last_channel", label: "Canal", visible: false, required: false },
  { key: "last_product", label: "Ultimo producto", visible: false, required: false },
  { key: "status", label: "Estado", visible: false, required: false },
  { key: "quotes_count", label: "Cotizaciones generadas", visible: true, required: false },
  { key: "quote_requests_count", label: "Solicitudes de cotizacion", visible: true, required: false },
  { key: "last_quote_value_cop", label: "Ultimo valor cotizado", visible: true, required: false },
  { key: "total_quoted_cop", label: "Valor total cotizado", visible: true, required: false },
  { key: "last_intent", label: "Ultima intencion", visible: true, required: false },
  { key: "lead_temperature", label: "Temperatura", visible: true, required: false },
  { key: "last_quote_sent_at", label: "Ultima cotizacion enviada", visible: true, required: false },
  { key: "tech_sheet_requests_count", label: "Solicitudes ficha/imagen", visible: true, required: false },
  { key: "next_action", label: "Proxima accion", visible: false, required: false },
  { key: "next_action_at", label: "Fecha proxima accion", visible: false, required: false },
  { key: "last_activity_at", label: "Ultima actividad", visible: true, required: false },
];

export default function AgentsCrmPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<"es" | "en">("es");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [pipeline, setPipeline] = useState<Record<CrmStage, Draft[]>>({ analysis: [], study: [], quote: [], purchase_order: [], invoicing: [] });
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [updatingId, setUpdatingId] = useState<string>("");
  const [updatingContactKey, setUpdatingContactKey] = useState<string>("");
  const [settings, setSettings] = useState<CrmSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [agentOptions, setAgentOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [channelSummary, setChannelSummary] = useState<Array<{ channel: string; count: number }>>([]);
  const [byAgent, setByAgent] = useState<Array<{ agent_id: string; agent_name: string; total: number; quote: number; purchase_order: number; invoicing: number; pipeline_cop: number }>>([]);
  const [funnel, setFunnel] = useState<Array<{ key: string; label: string; value: number }>>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAgent, setFilterAgent] = useState("all");
  const [filterChannel, setFilterChannel] = useState("all");
  const [filterQuoteDemand, setFilterQuoteDemand] = useState("all");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactDetail, setContactDetail] = useState<{ contact?: any; drafts: any[]; conversations: any[]; timeline: Array<{ at: string; kind: string; text: string }>; notes?: Array<{ id: string; note: string; created_at: string }> } | null>(null);
  const [contactLoading, setContactLoading] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingContact, setSavingContact] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<"one" | "selected">("one");
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [selectedContactKeys, setSelectedContactKeys] = useState<string[]>([]);
  const [integrationAccess, setIntegrationAccess] = useState<IntegrationAccessState | null>(null);
  const [integrationLoading, setIntegrationLoading] = useState(false);
  const [integrationSaving, setIntegrationSaving] = useState(false);
  const [integrationTargetEmail, setIntegrationTargetEmail] = useState("");
  const [integrationTargetEnabled, setIntegrationTargetEnabled] = useState(true);
  const [integrationNotes, setIntegrationNotes] = useState("");
  const [activeTab, setActiveTab] = useState<CrmTab>("dashboard");
  const [showContactFieldsConfig, setShowContactFieldsConfig] = useState(false);
  const [dashboardHoverKey, setDashboardHoverKey] = useState("");
  const [flowHoverKey, setFlowHoverKey] = useState("");

  const tr = (es: string, en: string) => (language === "en" ? en : es);

  const normalizeStage = (raw: string): CrmStage => {
    const s = String(raw || "").toLowerCase();
    if (s === "analysis" || s === "study" || s === "quote" || s === "purchase_order" || s === "invoicing") return s;
    if (s === "draft") return "analysis";
    if (s === "sent") return "quote";
    if (s === "won") return "purchase_order";
    if (s === "lost") return "invoicing";
    return "analysis";
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("botz-language");
    if (saved === "es" || saved === "en") setLanguage(saved);
  }, []);

  const money = (n: number) => new Intl.NumberFormat(language === "en" ? "en-US" : "es-CO", { maximumFractionDigits: 0 }).format(Number(n || 0));

  const toDateTimeLocalValue = (raw: any) => {
    const s = String(raw || "").trim();
    if (!s) return "";
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return s.slice(0, 16);
    const d = new Date(s);
    if (!Number.isFinite(d.getTime())) return "";
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };

  const colMinWidth = (key: string) => {
    if (key === "name") return 180;
    if (key === "email") return 220;
    if (key === "phone") return 140;
    if (key === "company") return 160;
    if (key === "status") return 150;
    if (key === "next_action") return 220;
    if (key === "next_action_at") return 210;
    if (key === "last_intent") return 220;
    if (key === "last_product") return 260;
    return 130;
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      setIntegrationLoading(true);
      const integrationRes = await authedFetch("/api/agents/crm/integration-access");
      const integrationJson = await integrationRes.json();
      if (integrationRes.ok && integrationJson?.ok) {
        setIntegrationAccess(integrationJson?.data || null);
      } else {
        setIntegrationAccess(null);
      }

      const settingsRes = await authedFetch("/api/agents/crm/settings");
      const settingsJson = await settingsRes.json();
      if (!settingsRes.ok || !settingsJson?.ok) throw new Error(settingsJson?.error || "No se pudo cargar configuración CRM");
      setSettings(settingsJson?.data || null);

      const res = await authedFetch("/api/agents/crm/overview");
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo cargar CRM");
      setSummary(json?.data?.summary || null);
      setPipeline(json?.data?.pipeline || { analysis: [], study: [], quote: [], purchase_order: [], invoicing: [] });
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
      setIntegrationLoading(false);
      setLoading(false);
    }
  };

  const saveIntegrationAccess = async () => {
    if (!integrationAccess?.is_owner) {
      setError(tr("Solo un owner puede autorizar CRM.", "Only an owner can authorize CRM."));
      return;
    }
    const targetEmail = integrationTargetEmail.trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes("@")) {
      setError(tr("Ingresa un correo válido para autorizar CRM.", "Enter a valid email to authorize CRM."));
      return;
    }

    setIntegrationSaving(true);
    setError(null);
    try {
      const res = await authedFetch("/api/agents/crm/integration-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_email: targetEmail,
          enabled: integrationTargetEnabled,
          source: "crm_front_owner_panel",
          notes: integrationNotes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo actualizar autorización CRM");
      await fetchData();
      setIntegrationNotes("");
    } catch (e: any) {
      if (e instanceof AuthRequiredError) {
        setError(tr("Sesion expirada. Inicia sesion de nuevo en Agents.", "Session expired. Sign in again in Agents."));
        router.push("/start/agents?auth=login");
        return;
      }
      setError(String(e?.message || "Error actualizando autorización CRM"));
    } finally {
      setIntegrationSaving(false);
    }
  };

  const enableMyCrmNow = async () => {
    if (!integrationAccess?.is_owner || !integrationAccess?.requester_user_id) return;
    setIntegrationSaving(true);
    setError(null);
    try {
      const res = await authedFetch("/api/agents/crm/integration-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_user_id: integrationAccess.requester_user_id,
          enabled: true,
          source: "crm_front_owner_panel",
          notes: "Auto habilitado por owner desde CRM",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo habilitar CRM");
      await fetchData();
    } catch (e: any) {
      setError(String(e?.message || "Error habilitando CRM"));
    } finally {
      setIntegrationSaving(false);
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
    const key = normalizeStage(status);
    if (key === "analysis") return tr("Analisis de Necesidad", "Needs Analysis");
    if (key === "study") return tr("Estudio", "Study");
    if (key === "quote") return tr("Cotizacion", "Quote");
    if (key === "purchase_order") return tr("Orden de Compra", "Purchase Order");
    if (key === "invoicing") return tr("Facturacion", "Invoicing");
    return stageLabel("analysis");
  };

  const stageOptions = useMemo(
    () => [
      { value: "analysis" as CrmStage, label: tr("Analisis de Necesidad", "Needs Analysis") },
      { value: "study" as CrmStage, label: tr("Estudio", "Study") },
      { value: "quote" as CrmStage, label: tr("Cotizacion", "Quote") },
      { value: "purchase_order" as CrmStage, label: tr("Orden de Compra", "Purchase Order") },
      { value: "invoicing" as CrmStage, label: tr("Facturacion", "Invoicing") },
    ],
    [language]
  );

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

  const deleteContactInline = async (c: Contact) => {
    setUpdatingContactKey(String(c.key || ""));
    try {
      const res = await authedFetch("/api/agents/crm/contact", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: c.phone, email: c.email, contact_key: c.key }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo eliminar contacto");
      if (selectedContact && String(selectedContact.key || "") === String(c.key || "")) {
        setSelectedContact(null);
        setContactDetail(null);
      }
      await fetchData();
    } catch (e: any) {
      setError(String(e?.message || "Error eliminando contacto"));
    } finally {
      setUpdatingContactKey("");
    }
  };

  const openDeleteModal = (c: Contact) => {
    setDeleteTarget(c);
    setDeleteMode("one");
    setDeleteModalOpen(true);
  };

  const openDeleteSelectedModal = () => {
    if (!selectedContactKeys.length) return;
    setDeleteTarget(null);
    setDeleteMode("selected");
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (updatingContactKey) return;
    setDeleteModalOpen(false);
    setDeleteTarget(null);
    setDeleteMode("one");
  };

  const confirmDelete = async () => {
    if (deleteMode === "one") {
      if (!deleteTarget) return;
      await deleteContactInline(deleteTarget);
      closeDeleteModal();
      return;
    }

    const rows = visibleContacts.filter((c) => selectedContactKeys.includes(String(c.key || "")));
    if (!rows.length) {
      closeDeleteModal();
      return;
    }

    setUpdatingContactKey("bulk");
    try {
      for (const c of rows) {
        const res = await authedFetch("/api/agents/crm/contact", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: c.phone, email: c.email, contact_key: c.key }),
        });
        const json = await res.json();
        if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo eliminar todos los contactos");
      }
      if (selectedContact) {
        setSelectedContact(null);
        setContactDetail(null);
      }
      await fetchData();
      setSelectedContactKeys([]);
      closeDeleteModal();
    } catch (e: any) {
      setError(String(e?.message || "Error eliminando contactos"));
    } finally {
      setUpdatingContactKey("");
    }
  };

  const openContactDetail = async (c: Contact) => {
    setActiveTab("contacts");
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
    () => CRM_STAGE_KEYS.map((key) => ({ key, title: stageLabel(key), rows: pipeline[key] || [] })),
    [pipeline, stageOptions]
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
      if (filterStatus !== "all" && normalizeStage(String(c.status || "analysis")) !== normalizeStage(filterStatus)) return false;
      if (filterAgent !== "all" && String(c.assigned_agent_id || "") !== filterAgent) return false;
      if (filterChannel !== "all" && String(c.last_channel || "") !== filterChannel) return false;
      if (filterQuoteDemand === "with_quotes") {
        const has = Number((c as any).quote_requests_count || c.quotes_count || 0) > 0;
        if (!has) return false;
      }
      if (!q) return true;
      const hay = `${c.name || ""} ${c.email || ""} ${c.phone || ""} ${c.company || ""} ${c.last_product || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [contacts, search, filterStatus, filterAgent, filterChannel, filterQuoteDemand]);

  const visibleContacts = useMemo(() => filteredContacts.slice(0, 200), [filteredContacts]);

  useEffect(() => {
    const valid = new Set(contacts.map((c) => String(c.key || "")));
    setSelectedContactKeys((prev) => prev.filter((k) => valid.has(k)));
  }, [contacts]);

  const isSelected = (c: Contact) => selectedContactKeys.includes(String(c.key || ""));

  const toggleSelect = (c: Contact) => {
    const key = String(c.key || "");
    if (!key) return;
    setSelectedContactKeys((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
  };

  const toggleSelectAllVisible = () => {
    const keys = visibleContacts.map((c) => String(c.key || "")).filter(Boolean);
    const allSelected = keys.length > 0 && keys.every((k) => selectedContactKeys.includes(k));
    setSelectedContactKeys(allSelected ? selectedContactKeys.filter((k) => !keys.includes(k)) : Array.from(new Set([...selectedContactKeys, ...keys])));
  };

  const filteredPipeline = useMemo(() => {
    const statusSet = new Set(filteredContacts.map((c) => String(c.phone || "") + "|" + String(c.email || "").toLowerCase()));
    const byStatus: Record<CrmStage, Draft[]> = {
      analysis: columns.find((c) => c.key === "analysis")?.rows || [],
      study: columns.find((c) => c.key === "study")?.rows || [],
      quote: columns.find((c) => c.key === "quote")?.rows || [],
      purchase_order: columns.find((c) => c.key === "purchase_order")?.rows || [],
      invoicing: columns.find((c) => c.key === "invoicing")?.rows || [],
    };
    const apply = (rows: Draft[]) => {
      if (filterStatus !== "all") return rows.filter((r) => normalizeStage(r.status) === normalizeStage(filterStatus));
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
      analysis: apply(byStatus.analysis),
      study: apply(byStatus.study),
      quote: apply(byStatus.quote),
      purchase_order: apply(byStatus.purchase_order),
      invoicing: apply(byStatus.invoicing),
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

  const allDeals = useMemo(() => {
    const map = new Map<string, Draft>();
    CRM_STAGE_KEYS.flatMap((k) => pipeline[k] || []).forEach((d) => {
      const id = String(d?.id || "").trim();
      if (!id || map.has(id)) return;
      map.set(id, d);
    });
    return Array.from(map.values());
  }, [pipeline]);

  const flowSeries = useMemo(() => {
    const DAY = 24 * 60 * 60 * 1000;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const prevStart = new Date(today.getTime() - 59 * DAY);
    const buckets = Array.from({ length: 60 }, () => 0);

    for (const d of allDeals) {
      const dt = new Date(String(d?.created_at || ""));
      if (Number.isNaN(dt.getTime())) continue;
      const day = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
      const idx = Math.floor((day.getTime() - prevStart.getTime()) / DAY);
      if (idx >= 0 && idx < 60) buckets[idx] += 1;
    }

    const previous = buckets.slice(0, 30);
    const current = buckets.slice(30, 60);
    const labels = Array.from({ length: 30 }, (_, i) => {
      const dt = new Date(today.getTime() - (29 - i) * DAY);
      return dt.toLocaleDateString(language === "en" ? "en-US" : "es-CO", { day: "numeric", month: "short" });
    });
    const currentTotal = current.reduce((acc, n) => acc + n, 0);
    const previousTotal = previous.reduce((acc, n) => acc + n, 0);
    return { current, previous, labels, currentTotal, previousTotal };
  }, [allDeals, language]);

  const flowMax = Math.max(1, ...flowSeries.current, ...flowSeries.previous);

  const opportunitiesTotal = Number(summary?.opportunities || 0);
  const purchaseOrderDeals = Number(summary?.purchase_order || 0);
  const invoicingDeals = Number(summary?.invoicing || 0);
  const openDeals = Math.max(0, opportunitiesTotal - purchaseOrderDeals - invoicingDeals);
  const outcomeBase = [
    { key: "purchase_order", label: tr("Orden de compra", "Purchase order"), value: purchaseOrderDeals, color: "#34d399" },
    { key: "invoicing", label: tr("Facturacion", "Invoicing"), value: invoicingDeals, color: "#f87171" },
    { key: "open", label: tr("Abiertas", "Open"), value: openDeals, color: "#60a5fa" },
  ];
  const outcomeTotal = Math.max(0, outcomeBase.reduce((acc, item) => acc + Number(item.value || 0), 0));
  const outcomeSlices = outcomeBase
    .filter((item) => item.value > 0)
    .map((item) => ({ ...item, fraction: outcomeTotal > 0 ? item.value / outcomeTotal : 0 }));

  const quotedValue = Number(summary?.total_quotes_requested_cop || 0);
  const inProcessValue = Number(summary?.total_pipeline_cop || 0);
  const closedValue = Number((summary as any)?.total_closed_won_cop || 0);
  const valueBars = [
    { key: "quoted", label: tr("Valor cotizado", "Quoted value"), value: quotedValue, color: "#60a5fa" },
    { key: "process", label: tr("Valor en gestión", "Value in process"), value: inProcessValue, color: "#22d3ee" },
    { key: "closed", label: tr("Valor cerrado", "Closed value"), value: closedValue, color: "#34d399" },
  ];
  const maxValueBar = Math.max(1, ...valueBars.map((item) => Number(item.value || 0)));

  return (
    <div style={{ minHeight: "100vh", backgroundColor: C.bg, color: C.white, fontFamily: "Inter,-apple-system,sans-serif" }}>
      <div style={{ height: 56, backgroundColor: C.dark, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 18px", gap: 12 }}>
        <button onClick={() => router.push("/start/agents")} style={{ background: "none", border: "none", color: C.lime, cursor: "pointer", fontWeight: 900 }}>{tr("← Volver", "← Back")}</button>
        <div style={{ fontWeight: 900, fontSize: 16 }}>{tr("CRM de Agents", "Agents CRM")}</div>
      </div>

      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "20px 18px 40px" }}>
        <div style={{ color: C.muted, marginBottom: 14 }}>
          {tr("Gestión comercial unificada con leads, cotizaciones y seguimiento desde WhatsApp.", "Unified sales management with leads, quotes and WhatsApp follow-ups.")}
        </div>

        {error && <div style={{ marginBottom: 12, border: `1px solid ${C.border}`, background: "rgba(239,68,68,0.12)", color: "#fca5a5", padding: "10px 12px", borderRadius: 10 }}>{error}</div>}

        {!!settings?.enabled && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {([
              { key: "dashboard", label: tr("Dashboard", "Dashboard") },
              { key: "pipeline", label: tr("Negocios", "Deals") },
              { key: "contacts", label: tr("Contactos", "Contacts") },
            ] as Array<{ key: CrmTab; label: string }>).map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    border: `1px solid ${active ? "rgba(163,230,53,0.55)" : C.border}`,
                    borderRadius: 999,
                    background: active ? "rgba(163,230,53,0.16)" : C.card,
                    color: active ? C.lime : C.white,
                    fontWeight: active ? 800 : 700,
                    fontSize: 13,
                    padding: "8px 12px",
                    cursor: "pointer",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {!!settings?.enabled && (activeTab === "pipeline" || activeTab === "contacts") && (
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, background: C.card, padding: 12, marginBottom: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr repeat(4,minmax(160px,1fr))", gap: 10 }}>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tr("Buscar contacto, correo, producto...", "Search contact, email, product...")} style={{ padding: "9px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }} />
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: "9px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }}>
                <option value="all">{tr("Todos los estados", "All statuses")}</option>
                {stageOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <select value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)} style={{ padding: "9px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }}>
                <option value="all">{tr("Todos los asesores", "All assignees")}</option>
                {agentOptions.map((a) => <option key={a.id} value={a.id}>{a.name || a.id}</option>)}
              </select>
              <select value={filterChannel} onChange={(e) => setFilterChannel(e.target.value)} style={{ padding: "9px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }}>
                <option value="all">{tr("Todos los canales", "All channels")}</option>
                {channelSummary.map((c) => <option key={c.channel} value={c.channel}>{c.channel}</option>)}
              </select>
              <select value={filterQuoteDemand} onChange={(e) => setFilterQuoteDemand(e.target.value)} style={{ padding: "9px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }}>
                <option value="all">{tr("Todos los clientes", "All customers")}</option>
                <option value="with_quotes">{tr("Clientes con cotizaciones", "Customers with quotes")}</option>
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
          <div style={{ fontWeight: 800 }}>{tr("Estado de integración CRM", "CRM integration status")}</div>
          <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
            {tr("El owner puede habilitar/deshabilitar accesos CRM desde este panel de integración.", "Owner can enable/disable CRM access from this integration panel.")}
          </div>

          <div style={{ marginTop: 10, border: `1px solid ${C.border}`, borderRadius: 10, background: C.dark, padding: 10 }}>
            <div style={{ color: C.muted, fontSize: 12 }}>
              {tr("Tu usuario", "Your user")}:
              {" "}
              <b style={{ color: C.white }}>{integrationAccess?.requester_email || "-"}</b>
              {" · "}
              {integrationLoading
                ? tr("validando permisos...", "checking permissions...")
                : (integrationAccess?.is_owner ? tr("rol owner", "owner role") : tr("sin rol owner", "not owner role"))}
            </div>
            <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
              {tr("Estado CRM para este usuario", "CRM status for this user")}: {integrationAccess?.self_enabled ? tr("habilitado", "enabled") : tr("deshabilitado", "disabled")}
              {integrationAccess?.self_enabled_updated_at ? ` (${new Date(integrationAccess.self_enabled_updated_at).toLocaleString()})` : ""}
            </div>

            {integrationAccess?.is_owner && (
              <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.8fr", gap: 8 }}>
                  <input
                    value={integrationTargetEmail}
                    onChange={(e) => setIntegrationTargetEmail(e.target.value)}
                    placeholder={tr("Correo del usuario a autorizar (ej: asesor@botz.fyi)", "User email to authorize (e.g. sales@botz.fyi)")}
                    style={{ padding: "9px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.white }}
                  />
                  <select
                    value={integrationTargetEnabled ? "on" : "off"}
                    onChange={(e) => setIntegrationTargetEnabled(e.target.value === "on")}
                    style={{ padding: "9px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.white }}
                  >
                    <option value="on">{tr("Habilitar CRM", "Enable CRM")}</option>
                    <option value="off">{tr("Deshabilitar CRM", "Disable CRM")}</option>
                  </select>
                </div>
                <input
                  value={integrationNotes}
                  onChange={(e) => setIntegrationNotes(e.target.value)}
                  placeholder={tr("Nota opcional de autorización", "Optional authorization note")}
                  style={{ padding: "9px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.white }}
                />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    onClick={saveIntegrationAccess}
                    disabled={integrationSaving}
                    style={{
                      border: "none",
                      borderRadius: 8,
                      background: C.lime,
                      color: "#0b0e14",
                      fontWeight: 800,
                      cursor: integrationSaving ? "not-allowed" : "pointer",
                      opacity: integrationSaving ? 0.65 : 1,
                      padding: "9px 12px",
                    }}
                  >
                    {integrationSaving ? tr("Guardando...", "Saving...") : tr("Guardar autorización", "Save authorization")}
                  </button>
                  <button
                    onClick={enableMyCrmNow}
                    disabled={integrationSaving || !!settings?.enabled}
                    style={{
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      background: C.bg,
                      color: C.white,
                      fontWeight: 700,
                      cursor: integrationSaving || !!settings?.enabled ? "not-allowed" : "pointer",
                      opacity: integrationSaving || !!settings?.enabled ? 0.65 : 1,
                      padding: "9px 12px",
                    }}
                  >
                    {tr("Habilitar mi CRM ahora", "Enable my CRM now")}
                  </button>
                </div>
              </div>
            )}
          </div>

          {!!settings?.enabled && (
            <div style={{ marginTop: 12 }}>
              <button
                onClick={() => setShowContactFieldsConfig((prev) => !prev)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  background: C.dark,
                  color: C.white,
                  fontWeight: 700,
                  padding: "8px 10px",
                  cursor: "pointer",
                }}
              >
                {showContactFieldsConfig ? "▾" : "▸"} {tr("Campos visibles de contactos", "Visible contact fields")}
              </button>
              {showContactFieldsConfig && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 8, marginTop: 8 }}>
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
              )}
            </div>
          )}
        </div>

        {!settings?.enabled && !loading && (
          <div style={{ border: `1px dashed ${C.border}`, borderRadius: 12, background: C.dark, color: C.muted, padding: 16, marginBottom: 12 }}>
            {tr("CRM deshabilitado para este cliente. El owner puede habilitarlo desde el panel de integración de esta pantalla.", "CRM is disabled for this client. The owner can enable it from this screen integration panel.")}
          </div>
        )}

        {settings?.enabled && (
          <>

        {activeTab === "dashboard" && (
          <>

        <div style={{ border: `1px solid ${C.border}`, borderRadius: 14, background: C.card, padding: 12, marginBottom: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>{tr("Dashboard comercial", "Sales dashboard")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.9fr", gap: 12 }}>
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, background: "linear-gradient(180deg,#101522,#0c111b)", padding: 12 }}>
              <div style={{ color: C.white, fontWeight: 700, marginBottom: 8 }}>{tr("Flujo 30 días (oportunidades creadas)", "30-day flow (created opportunities)")}</div>
              <div style={{ color: C.muted, fontSize: 12, marginBottom: 10 }}>
                {tr("Compara la cantidad diaria de oportunidades creadas: últimos 30 días vs los 30 días anteriores.", "Compares daily created opportunities: last 30 days vs previous 30 days.")}
              </div>
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, background: "#0b0f18", padding: 10, position: "relative" }}>
                {(() => {
                  const w = 620;
                  const h = 190;
                  const px = 8;
                  const py = 12;
                  const len = flowSeries.current.length || 30;
                  const toX = (i: number) => px + (i * (w - px * 2)) / Math.max(1, len - 1);
                  const toY = (v: number) => h - py - (v / Math.max(1, flowMax)) * (h - py * 2);
                  const currPoints = flowSeries.current.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
                  const prevPoints = flowSeries.previous.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
                  const areaPoints = `${toX(0)},${h - py} ${currPoints} ${toX(len - 1)},${h - py}`;
                  const delta = flowSeries.currentTotal - flowSeries.previousTotal;
                  const trendColor = delta > 0 ? "#34d399" : delta < 0 ? "#f87171" : C.muted;
                  const hoverMatch = /^(cur|prev)-(\d+)$/.exec(flowHoverKey);
                  const hoverSeries = hoverMatch?.[1] === "prev" ? "prev" : hoverMatch?.[1] === "cur" ? "cur" : "";
                  const hoverIndex = hoverMatch ? Number(hoverMatch[2]) : -1;
                  const hoverValue = hoverSeries === "cur"
                    ? Number(flowSeries.current[hoverIndex] || 0)
                    : hoverSeries === "prev"
                      ? Number(flowSeries.previous[hoverIndex] || 0)
                      : 0;
                  const hoverX = hoverIndex >= 0 ? toX(hoverIndex) : 0;
                  const hoverY = hoverIndex >= 0 ? toY(hoverValue) : 0;
                  return (
                    <>
                      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 210, display: "block" }}>
                        <defs>
                          <linearGradient id="crmFlowArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="rgba(96,165,250,0.38)" />
                            <stop offset="100%" stopColor="rgba(96,165,250,0.02)" />
                          </linearGradient>
                        </defs>
                        {[0, 0.25, 0.5, 0.75, 1].map((n) => (
                          <line key={`grid-${n}`} x1={px} x2={w - px} y1={py + n * (h - py * 2)} y2={py + n * (h - py * 2)} stroke="rgba(148,163,184,0.22)" strokeDasharray="4 4" />
                        ))}
                        {hoverIndex >= 0 && <line x1={hoverX} x2={hoverX} y1={py} y2={h - py} stroke="rgba(255,255,255,0.25)" strokeDasharray="5 5" />}
                        <polygon points={areaPoints} fill="url(#crmFlowArea)" />
                        <polyline fill="none" stroke="#60a5fa" strokeWidth="2.5" points={currPoints} />
                        <polyline fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 5" points={prevPoints} />
                        {flowSeries.current.map((v, i) => (
                          <circle
                            key={`cur-pt-${i}`}
                            cx={toX(i)}
                            cy={toY(v)}
                            r={flowHoverKey === `cur-${i}` ? 4 : 3}
                            fill="#60a5fa"
                            style={{ cursor: "pointer" }}
                            onMouseEnter={() => setFlowHoverKey(`cur-${i}`)}
                            onMouseLeave={() => setFlowHoverKey("")}
                          />
                        ))}
                        {flowSeries.previous.map((v, i) => (
                          <circle
                            key={`prev-pt-${i}`}
                            cx={toX(i)}
                            cy={toY(v)}
                            r={flowHoverKey === `prev-${i}` ? 4 : 3}
                            fill="#f59e0b"
                            style={{ cursor: "pointer" }}
                            onMouseEnter={() => setFlowHoverKey(`prev-${i}`)}
                            onMouseLeave={() => setFlowHoverKey("")}
                          />
                        ))}
                        {flowSeries.current.map((v, i) => (
                          i % 6 === 0 || i === flowSeries.current.length - 1
                            ? <text key={`lb-${i}`} x={toX(i)} y={h - 2} fill="rgba(156,163,175,0.9)" fontSize="10" textAnchor="middle">{flowSeries.labels[i]}</text>
                            : null
                        ))}
                      </svg>
                      {hoverIndex >= 0 && (
                        <div
                          style={{
                            position: "absolute",
                            left: `${(hoverX / w) * 100}%`,
                            top: `${Math.max(10, (hoverY / h) * 100)}%`,
                            transform: "translate(-50%,-115%)",
                            background: "#111827",
                            border: `1px solid ${C.border}`,
                            borderRadius: 10,
                            padding: "8px 10px",
                            minWidth: 150,
                            pointerEvents: "none",
                          }}
                        >
                          <div style={{ fontSize: 12, color: C.white, fontWeight: 800 }}>
                            {flowSeries.labels[hoverIndex] || "-"}
                          </div>
                          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                            {hoverSeries === "cur" ? tr("Últimos 30 días", "Last 30 days") : tr("Mes anterior", "Previous month")}: <b style={{ color: C.white }}>{hoverValue}</b> {tr("oportunidades", "opportunities")}
                          </div>
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, gap: 8, flexWrap: "wrap" }}>
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12 }}>
                          <span style={{ color: C.muted }}><span style={{ color: "#60a5fa" }}>●</span> {tr("Últimos 30 días", "Last 30 days")}: <b style={{ color: C.white }}>{flowSeries.currentTotal}</b> {tr("oportunidades", "opportunities")}</span>
                          <span style={{ color: C.muted }}><span style={{ color: "#f59e0b" }}>●</span> {tr("Mes anterior", "Previous month")}: <b style={{ color: C.white }}>{flowSeries.previousTotal}</b> {tr("oportunidades", "opportunities")}</span>
                        </div>
                        <div style={{ fontSize: 12, color: trendColor }}>
                          {delta >= 0 ? "+" : ""}{delta} {tr("oportunidades vs mes anterior", "opportunities vs previous month")}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, background: "linear-gradient(180deg,#101522,#0c111b)", padding: 12 }}>
              <div style={{ color: C.white, fontWeight: 700, marginBottom: 8 }}>{tr("Resultados y montos", "Results and values")}</div>
              <div style={{ color: C.muted, fontSize: 12, marginBottom: 10 }}>
                {tr("Comparativos con datos reales del CRM.", "Comparisons with real CRM data.")}
              </div>

              <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, background: "#0f1117", padding: 10, marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>{tr("Torta de resultados", "Results pie")}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ position: "relative", width: 130, height: 130, flex: "0 0 auto" }}>
                    <svg width="130" height="130" viewBox="0 0 130 130" style={{ transform: "rotate(-90deg)" }}>
                      <circle cx="65" cy="65" r="44" fill="none" stroke="rgba(148,163,184,0.22)" strokeWidth="16" />
                      {(() => {
                        const circumference = 2 * Math.PI * 44;
                        let acc = 0;
                        return outcomeSlices.map((slice) => {
                          const dash = Math.max(0, slice.fraction * circumference);
                          const active = dashboardHoverKey === `out-${slice.key}`;
                          const node = (
                            <circle
                              key={slice.key}
                              cx="65"
                              cy="65"
                              r="44"
                              fill="none"
                              stroke={slice.color}
                              strokeWidth={active ? 18 : 16}
                              strokeDasharray={`${dash} ${circumference}`}
                              strokeDashoffset={-acc * circumference}
                              style={{ cursor: "pointer", transition: "all .18s ease" }}
                              onMouseEnter={() => setDashboardHoverKey(`out-${slice.key}`)}
                              onMouseLeave={() => setDashboardHoverKey("")}
                            />
                          );
                          acc += slice.fraction;
                          return node;
                        });
                      })()}
                    </svg>
                    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ color: C.white, fontWeight: 900, fontSize: 18 }}>{outcomeTotal}</div>
                        <div style={{ color: C.muted, fontSize: 11 }}>{tr("negocios", "deals")}</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 6, width: "100%" }}>
                    {outcomeBase.map((item) => (
                      <div
                        key={item.key}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, border: `1px solid ${dashboardHoverKey === `out-${item.key}` ? item.color : C.border}`, borderRadius: 8, padding: "6px 8px", background: "#0b0e14", cursor: "pointer" }}
                        onMouseEnter={() => setDashboardHoverKey(`out-${item.key}`)}
                        onMouseLeave={() => setDashboardHoverKey("")}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: 6, color: C.muted }}>
                          <span style={{ width: 9, height: 9, borderRadius: 999, background: item.color, display: "inline-block" }} />
                          {item.label}
                        </span>
                        <b style={{ color: C.white }}>{item.value}</b>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, background: "#0f1117", padding: 10 }}>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>{tr("Barras de valor", "Value bars")}</div>
                <div style={{ display: "grid", gap: 8 }}>
                  {valueBars.map((row) => {
                    const pct = Math.max(4, Math.round((Number(row.value || 0) / maxValueBar) * 100));
                    return (
                      <div key={row.key}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                          <span style={{ color: C.muted }}>{row.label}</span>
                          <b style={{ color: C.white }}>COP {money(row.value)}</b>
                        </div>
                        <div style={{ height: 8, borderRadius: 999, background: "#0b0e14", overflow: "hidden", border: `1px solid ${C.border}` }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${row.color}, #93c5fd)` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 10, marginBottom: 14 }}>
          <Metric label={tr("Contactos", "Contacts")} value={summary?.contacts ?? 0} />
          <Metric label={tr("Oportunidades", "Opportunities")} value={summary?.opportunities ?? 0} />
          <Metric label={tr("Solicitudes cotización", "Quote requests")} value={summary?.quotes_requested ?? 0} />
          <Metric label={tr("Análisis", "Analysis")} value={summary?.analysis ?? 0} />
          <Metric label={tr("Estudio", "Study")} value={summary?.study ?? 0} />
          <Metric label={tr("Cotización", "Quote")} value={summary?.quote ?? 0} />
          <Metric label={tr("Orden de compra", "Purchase order")} value={summary?.purchase_order ?? 0} />
          <Metric label={tr("Facturación", "Invoicing")} value={summary?.invoicing ?? 0} />
          <Metric label={tr("Contactos con cotización", "Contacts with quotes")} value={summary?.contacts_with_quote_requests ?? 0} />
          <Metric label={tr("Contactos con ficha/imagen", "Contacts with spec/image")} value={summary?.contacts_with_tech_sheet_requests ?? 0} />
          <Metric label={tr("Valor total cotizado", "Total quoted value")} value={`COP ${money(summary?.total_quotes_requested_cop ?? 0)}`} accent={C.blue} />
          <Metric label={tr("Valor en gestión COP", "Value in process COP")} value={money(summary?.total_pipeline_cop ?? 0)} accent={C.blue} />
        </div>

          </>
        )}

        {activeTab === "pipeline" && (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 14, background: C.card, padding: 12, marginBottom: 16 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>{tr("Negocios", "Deals")}</div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns.length},minmax(250px,1fr))`, gap: 10, overflowX: "auto" }}>
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
                        value={normalizeStage(d.status)}
                        onChange={(e) => void updateStatus(d.id, e.target.value as Draft["status"])}
                        disabled={updatingId === d.id}
                        style={{ width: "100%", marginTop: 8, padding: "7px 8px", borderRadius: 7, border: `1px solid ${C.border}`, background: C.card, color: C.white }}
                      >
                        {stageOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                  ))}
                  {!loading && (((filteredPipeline as any)[col.key] || []).length === 0) && <div style={{ color: C.muted, fontSize: 12 }}>{tr("Sin registros", "No records")}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        {activeTab === "contacts" && (
          <>
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ background: C.card, padding: "10px 12px", fontWeight: 800, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{tr("Contactos", "Contacts")}</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                onClick={openDeleteSelectedModal}
                disabled={!selectedContactKeys.length || Boolean(updatingContactKey)}
                style={{ border: `1px solid ${C.border}`, borderRadius: 8, background: selectedContactKeys.length ? "#2a1216" : C.dark, color: selectedContactKeys.length ? "#fca5a5" : C.muted, padding: "6px 10px", cursor: selectedContactKeys.length ? "pointer" : "not-allowed", fontSize: 12 }}
              >
                {tr("Eliminar seleccionados", "Delete selected")} ({selectedContactKeys.length})
              </button>
              <button onClick={downloadCsv} style={{ border: `1px solid ${C.border}`, borderRadius: 8, background: C.dark, color: C.white, padding: "6px 10px", cursor: "pointer", fontSize: 12 }}>
                {tr("Descargar Excel (CSV)", "Download Excel (CSV)")}
              </button>
            </div>
          </div>
          <div style={{ overflowX: "auto", overflowY: "hidden" }}>
          <table style={{ width: "max-content", minWidth: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: C.dark }}>
              <tr>
                <th style={{ ...th, minWidth: 40 }}>
                  <input
                    type="checkbox"
                    checked={visibleContacts.length > 0 && visibleContacts.every((c) => selectedContactKeys.includes(String(c.key || "")))}
                    onChange={toggleSelectAllVisible}
                  />
                </th>
                {(visibleContactFields.length ? visibleContactFields : [{ key: "name", label: tr("Nombre", "Name") } as any]).map((f: any) => (
                  <th key={f.key} style={{ ...th, minWidth: colMinWidth(f.key) }}>{f.label}</th>
                ))}
                <th style={{ ...th, minWidth: 110 }}>{tr("Acciones", "Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {!loading && filteredContacts.length === 0 && (
                <tr><td colSpan={Math.max(3, visibleContactFields.length + 2)} style={{ padding: 12, color: C.muted }}>{tr("Aun no hay contactos.", "No contacts yet.")}</td></tr>
              )}
              {visibleContacts.map((c) => (
                <tr key={c.key} style={{ borderTop: `1px solid ${C.border}`, cursor: "pointer" }} onClick={() => void openContactDetail(c)}>
                  <td style={{ ...td, minWidth: 40 }} onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={isSelected(c)} onChange={() => toggleSelect(c)} />
                  </td>
                  {(visibleContactFields.length ? visibleContactFields : [{ key: "name", label: tr("Nombre", "Name") } as any]).map((f: any) => (
                    <td key={f.key} style={{ ...td, minWidth: colMinWidth(f.key) }} onClick={(e) => {
                      if (f.key === "status" || f.key === "next_action" || f.key === "next_action_at") e.stopPropagation();
                    }}>
                      {f.key === "status" ? (
                        <select
                          value={normalizeStage(String(c.status || "analysis"))}
                          disabled={updatingContactKey === String(c.key || "")}
                          onChange={(e) => void updateContactStatusInline(c, e.target.value)}
                          style={{ width: "100%", minWidth: 136, padding: "7px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#0b0e14", color: C.white, fontSize: 13 }}
                        >
                          {stageOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      ) : f.key === "next_action" ? (
                        <select
                          value={String(c.next_action || "")}
                          disabled={updatingContactKey === String(c.key || "")}
                          onChange={(e) => void updateContactNextActionInline(c, e.target.value)}
                          style={{ width: "100%", minWidth: 210, padding: "7px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#0b0e14", color: C.white, fontSize: 13 }}
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
                          value={toDateTimeLocalValue(c.next_action_at)}
                          disabled={updatingContactKey === String(c.key || "")}
                          onChange={(e) => void updateContactNextActionAtInline(c, e.target.value)}
                          style={{ width: "100%", minWidth: 190, padding: "7px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#0b0e14", color: C.white, fontSize: 13 }}
                        />
                      ) : renderContactValue(c, f.key)}
                    </td>
                  ))}
                  <td style={{ ...td, minWidth: 110 }} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openDeleteModal(c)}
                        disabled={Boolean(updatingContactKey)}
                        style={{ border: `1px solid ${C.border}`, borderRadius: 8, background: "#2a1216", color: "#fca5a5", padding: "6px 10px", cursor: "pointer", fontSize: 12 }}
                      >
                        {tr("Eliminar", "Delete")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
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
                value={normalizeStage(String(selectedContact.status || "analysis"))}
                onChange={(e) => void saveContactPatch({ status: e.target.value })}
                style={{ padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }}
              >
                {stageOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>

              <input
                placeholder={tr("Proxima accion", "Next action")}
                defaultValue={String(selectedContact.next_action || "")}
                onBlur={(e) => void saveContactPatch({ next_action: e.target.value })}
                style={{ padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.dark, color: C.white }}
              />

              <input
                type="datetime-local"
                defaultValue={toDateTimeLocalValue(selectedContact.next_action_at)}
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

        {deleteModalOpen && (
          <div
            onClick={closeDeleteModal}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(2,6,23,0.72)",
              zIndex: 3000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 14,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "min(540px, 100%)",
                borderRadius: 14,
                border: `1px solid ${C.border}`,
                background: "linear-gradient(180deg, rgba(28,33,44,0.98), rgba(19,24,34,0.98))",
                boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
                padding: 14,
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 17, marginBottom: 8 }}>{tr("Eliminar contacto", "Delete contact")}</div>
              <div style={{ color: C.muted, fontSize: 13, marginBottom: 10 }}>
                {tr("Elige si deseas eliminar solo este contacto o los contactos que seleccionaste en la tabla.", "Choose whether to delete only this contact or the contacts you selected in the table.")}
              </div>

              <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", background: C.dark }}>
                  <input type="radio" name="delete-mode" checked={deleteMode === "one"} onChange={() => setDeleteMode("one")} />
                  <span style={{ fontSize: 13 }}>
                    {tr("Eliminar solo este contacto", "Delete only this contact")}:{" "}
                    <b>{deleteTarget?.name || deleteTarget?.email || deleteTarget?.phone || "-"}</b>
                  </span>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", background: C.dark }}>
                  <input type="radio" name="delete-mode" checked={deleteMode === "selected"} onChange={() => setDeleteMode("selected")} />
                  <span style={{ fontSize: 13 }}>
                    {tr("Eliminar contactos seleccionados", "Delete selected contacts")} ({selectedContactKeys.length})
                  </span>
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  onClick={closeDeleteModal}
                  disabled={Boolean(updatingContactKey)}
                  style={{ border: `1px solid ${C.border}`, borderRadius: 9, background: C.dark, color: C.white, padding: "8px 12px", cursor: "pointer", fontWeight: 700 }}
                >
                  {tr("Cancelar", "Cancel")}
                </button>
                <button
                  onClick={() => void confirmDelete()}
                  disabled={Boolean(updatingContactKey)}
                  style={{ border: "none", borderRadius: 9, background: "#ef4444", color: "#fff", padding: "8px 12px", cursor: "pointer", fontWeight: 800 }}
                >
                  {updatingContactKey ? tr("Eliminando...", "Deleting...") : tr("Confirmar eliminación", "Confirm delete")}
                </button>
              </div>
            </div>
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
