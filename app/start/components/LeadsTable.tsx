"use client";
import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "./supabaseClient";
import LeadDetailsDrawer from "./LeadDetailsDrawer";
import AsignarAsesor from "./Asignarasesor";
import { useAuth } from "../MainLayout";
import {
  Search,
  Download,
  Upload,
  MessageCircle,
  Mail,
  Bot,
  Zap,
  Plus,
  Trash2,
  X,
  AlertTriangle,
} from "lucide-react";

type AppLanguage = "es" | "en";

const LEADS_TEXT: Record<
  AppLanguage,
  {
    searchPlaceholder: string;
    newLead: string;
    export: string;
    deleteLeadTitle: string;
    createLeadTitle: string;
    cancel: string;
    save: string;
    saving: string;
    deleteTitle: string;
    deleting: string;
    delete: string;
    noResponse: string;

    rowsPerPage: string;
    previous: string;
    next: string;
    noResultsForChannel: (channel: string) => string;
    noLeadsForFilters: string;

    fieldName: string;
    fieldEmail: string;
    fieldPhone: string;
    exampleName: string;
    exampleEmail: string;
    examplePhone: string;
    phoneRequiredError: string;
    notLeadsTableError: string;
    saveFailedPerms: string;

    statusNew: string;
    statusFollowUp: string;
    statusConverted: string;
    statusSigned: string;
    statusNotConverted: string;
    statusContacted: string;
    statusSecondContact: string;
    statusDocs: string;
    statusNotInterested: string;

    actionPlaceholder: string;
    actionCallToday: string;
    actionSendWhatsapp: string;
    actionSendEmail: string;
    actionScheduleMeeting: string;
    actionDone: string;

    ratingPending: string;
    ratingHot: string;
    ratingWarm: string;
    ratingCold: string;

    ratingLabel: string;
    nextActionLabel: string;
    botzSummaryTitle: string;

    channelLabel: string;
    allStatuses: string;
    upload: string;
    showing: (shown: number, total: number) => string;
    clearFilters: string;
    thBotzAnalysis: string;
    thNameEmail: string;
    thPhone: string;
    thStatus: string;
    thNextAction: string;
    thRating: string;
    thAdvisor: string;
    viewBotzAnalysis: string;
  }
> = {
  es: {
    searchPlaceholder: "Buscar cliente o asesor...",
    newLead: "Nuevo Lead",
    export: "Exportar",
    deleteLeadTitle: "Eliminar lead",
    createLeadTitle: "Crear Lead",
    cancel: "Cancelar",
    save: "Guardar",
    saving: "Guardando...",
    deleteTitle: "Eliminar Lead",
    deleting: "Eliminando...",
    delete: "Eliminar",
    noResponse: "Sin Respuesta",

    rowsPerPage: "Filas por página:",
    previous: "Anterior",
    next: "Siguiente",
    noResultsForChannel: (channel) => `No se encontraron leads del canal: ${channel}`,
    noLeadsForFilters: "No hay leads con los filtros seleccionados.",

    fieldName: "Nombre",
    fieldEmail: "Email",
    fieldPhone: "Teléfono",
    exampleName: "Ej: Juan Pérez",
    exampleEmail: "Ej: juan@email.com",
    examplePhone: "Ej: +34 612 345 678",
    phoneRequiredError: "El teléfono es obligatorio.",
    notLeadsTableError: "Este registro no pertenece a la tabla leads. No se puede eliminar desde aquí.",
    saveFailedPerms: "No se pudo guardar el cambio. Verifica permisos de edición para este lead.",

    statusNew: "NUEVO",
    statusFollowUp: "SEGUIMIENTO",
    statusConverted: "CONVERTIDO",
    statusSigned: "FIRMADO",
    statusNotConverted: "NO CONVERTIDO",
    statusContacted: "CONTACTADO",
    statusSecondContact: "SEGUNDO CONTACTO",
    statusDocs: "DOCUMENTACIÓN",
    statusNotInterested: "NO INTERESADO",

    actionPlaceholder: "-- Acción --",
    actionCallToday: "Llamar hoy",
    actionSendWhatsapp: "Enviar WhatsApp",
    actionSendEmail: "Enviar Email",
    actionScheduleMeeting: "Agendar Reunión",
    actionDone: "Finalizado",

    ratingPending: "Pendiente",
    ratingHot: "Caliente",
    ratingWarm: "Tibio",
    ratingCold: "Frío",

    ratingLabel: "Calificación",
    nextActionLabel: "Próxima acción",
    botzSummaryTitle: "Ver Resumen y Cálculo Botz",

    channelLabel: "Canal:",
    allStatuses: "⭐ Todos los Estados",
    upload: "Cargar",
    showing: (shown, total) => `Mostrando ${shown} de ${total} leads`,
    clearFilters: "✕ Limpiar filtros",
    thBotzAnalysis: "ANÁLISIS BOTZ",
    thNameEmail: "NOMBRE / EMAIL",
    thPhone: "TELÉFONO",
    thStatus: "ESTADO",
    thNextAction: "PRÓXIMA ACCIÓN",
    thRating: "CALIFICACIÓN",
    thAdvisor: "ASESOR",
    viewBotzAnalysis: "Ver Análisis Botz",
  },
  en: {
    searchPlaceholder: "Search customer or advisor...",
    newLead: "New Lead",
    export: "Export",
    deleteLeadTitle: "Delete lead",
    createLeadTitle: "Create Lead",
    cancel: "Cancel",
    save: "Save",
    saving: "Saving...",
    deleteTitle: "Delete Lead",
    deleting: "Deleting...",
    delete: "Delete",
    noResponse: "No response",

    rowsPerPage: "Rows per page:",
    previous: "Previous",
    next: "Next",
    noResultsForChannel: (channel) => `No leads found for channel: ${channel}`,
    noLeadsForFilters: "No leads match the selected filters.",

    fieldName: "Name",
    fieldEmail: "Email",
    fieldPhone: "Phone",
    exampleName: "e.g. John Doe",
    exampleEmail: "e.g. john@email.com",
    examplePhone: "e.g. +1 555 123 4567",
    phoneRequiredError: "Phone is required.",
    notLeadsTableError: "This record is not in the leads table. It cannot be deleted from here.",
    saveFailedPerms: "Could not save changes. Verify edit permissions for this lead.",

    statusNew: "NEW",
    statusFollowUp: "FOLLOW-UP",
    statusConverted: "CONVERTED",
    statusSigned: "SIGNED",
    statusNotConverted: "NOT CONVERTED",
    statusContacted: "CONTACTED",
    statusSecondContact: "SECOND CONTACT",
    statusDocs: "DOCUMENTS",
    statusNotInterested: "NOT INTERESTED",

    actionPlaceholder: "-- Action --",
    actionCallToday: "Call today",
    actionSendWhatsapp: "Send WhatsApp",
    actionSendEmail: "Send email",
    actionScheduleMeeting: "Schedule meeting",
    actionDone: "Done",

    ratingPending: "Pending",
    ratingHot: "Hot",
    ratingWarm: "Warm",
    ratingCold: "Cold",

    ratingLabel: "Rating",
    nextActionLabel: "Next action",
    botzSummaryTitle: "View Botz Summary & Calculation",

    channelLabel: "Channel:",
    allStatuses: "⭐ All statuses",
    upload: "Upload",
    showing: (shown, total) => `Showing ${shown} of ${total} leads`,
    clearFilters: "✕ Clear filters",
    thBotzAnalysis: "BOTZ ANALYSIS",
    thNameEmail: "NAME / EMAIL",
    thPhone: "PHONE",
    thStatus: "STATUS",
    thNextAction: "NEXT ACTION",
    thRating: "RATING",
    thAdvisor: "ADVISOR",
    viewBotzAnalysis: "View Botz Analysis",
  },
};

// INTERFAZ DE DATOS
export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  source?: string;
  origen?: string;
  status?: string;
  next_action?: string;
  notes?: string;
  calificacion?: string;
  created_at: string;
  ingresos_netos?: number;
  precio_real?: number;
  aportacion_real?: number;
  otras_cuotas?: number;
  edad?: number;
  estado_operacion?: string;
  vivienda_tipo?: string;
  situacion_laboral?: string;
  commission?: number;
  bank?: string;
  asesor_id?: string;
  asesor_nombre?: string;
  resumen_chat?: string | null;
  ultimo_mensaje_bot?: string | null;
  last_msg_id?: string | null;
  sourceTable?: string;
  tenant_id?: string;
  user_id?: string;
}

export default function LeadsTable({
  initialLeads,
  session,
  globalFilter,
  onLeadPatch,
}: {
  initialLeads: Lead[];
  session?: any;
  globalFilter?: string | null;
 onLeadPatch?: ((..._args: any[]) => void) | undefined;


}) {

  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [language, setLanguage] = useState<AppLanguage>("es");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // =========================
  // ✅ PAGINACIÓN DE VISTA (UI)
  // =========================
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);


  const safeLeads = leads || [];
  const t = LEADS_TEXT[language];

  const hydrateLeadChatSummary = async (lead: Lead) => {
    try {
      if (!lead?.id) return;
      // Si ya tenemos el resumen, no volver a pedirlo
      if ((lead as any).resumen_chat) return;

      const { data, error } = await supabase
        .from("leads")
        .select("resumen_chat")
        .eq("id", lead.id)
        .maybeSingle();

      if (error) return;
      const resumen_chat = (data as any)?.resumen_chat || null;

      setLeads((prev) => prev.map((l) => (l.id === lead.id ? ({ ...l, resumen_chat } as any) : l)));
      setSelectedLead((prev) => (prev && prev.id === lead.id ? ({ ...prev, resumen_chat } as any) : prev));
      onLeadPatch?.(lead.id, { resumen_chat } as any);
    } catch {
      // ignore
    }
  };

  const openLead = (lead: Lead) => {
    setSelectedLead(lead);
    hydrateLeadChatSummary(lead);
  };

  useEffect(() => {
    // Mantener la tabla sincronizada con la data que llega por props (paginada/en background)
    setLeads(initialLeads || []);
  }, [initialLeads]);

  useEffect(() => {
    const saved = localStorage.getItem("botz-language");
    if (saved === "es" || saved === "en") {
      setLanguage(saved);
    }

    const onLangChange = (event: Event) => {
      const next = (event as CustomEvent<AppLanguage>).detail;
      if (next === "es" || next === "en") {
        setLanguage(next);
      }
    };

    window.addEventListener("botz-language-change", onLangChange);
    return () => window.removeEventListener("botz-language-change", onLangChange);
  }, []);

  // =========================
  // ✅ SOLO CREAR LEAD (no editar ni eliminar)
  // =========================
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [leadModalLoading, setLeadModalLoading] = useState(false);
  const [leadModalError, setLeadModalError] = useState<string | null>(null);

  const [formName, setFormName] = useState<string>("");
  const [formEmail, setFormEmail] = useState<string>("");
  const [formPhone, setFormPhone] = useState<string>("");
  const [formStatus, setFormStatus] = useState<string>("NUEVO");
  const [formNextAction, setFormNextAction] = useState<string>("");
  const [formCalificacion, setFormCalificacion] = useState<string>("");
  const [advisorTenants, setAdvisorTenants] = useState<Array<{ id: string; name?: string }>>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");

  // ✅ NUEVO: Acceso a sincronización global
  const { triggerDataRefresh, isAsesor, teamMemberId, tenantId: authTenantId, user } = useAuth();

  // =========================
  // ✅ Confirmación bonita para eliminar
  // =========================
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openDeleteModal = (lead: Lead) => {
    setDeleteError(null);
    setDeleteTarget(lead);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setDeleteTarget(null);
    setDeleteError(null);
    setDeleteLoading(false);
  };

  const openCreateLead = () => {
    setLeadModalError(null);
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setFormStatus("NUEVO");
    setFormNextAction("");
    setFormCalificacion("");
    setLeadModalOpen(true);
  };

  const closeLeadModal = () => {
    setLeadModalOpen(false);
    setLeadModalError(null);
    setLeadModalLoading(false);
  };

  const safeTenantId =
    session?.user?.user_metadata?.tenant_id ||
    session?.user?.app_metadata?.tenant_id ||
    null;

  useEffect(() => {
    if (!leadModalOpen || !isAsesor) return;

    let cancelled = false;
    const run = async () => {
      const authUserId = session?.user?.id || user?.id || null;
      const authEmail = session?.user?.email || user?.email || null;
      if (!authUserId && !authEmail) return;

      let ids: string[] = [];

      if (authUserId) {
        const { data } = await supabase
          .from("team_members")
          .select("tenant_id")
          .eq("auth_user_id", authUserId)
          .or("activo.is.null,activo.eq.true");
        ids = (data || []).map((r: any) => String(r?.tenant_id || "")).filter(Boolean);
      }

      if (ids.length === 0 && authEmail) {
        const { data } = await supabase
          .from("team_members")
          .select("tenant_id")
          .eq("email", authEmail)
          .or("activo.is.null,activo.eq.true");
        ids = (data || []).map((r: any) => String(r?.tenant_id || "")).filter(Boolean);
      }

      const uniqueIds = Array.from(new Set(ids));
      const rows = uniqueIds.map((id) => ({ id }));

      if (cancelled) return;
      setAdvisorTenants(rows);

      const preferred = String(authTenantId || safeTenantId || "");
      const hasSelected = selectedTenantId && rows.some((r) => String(r.id) === String(selectedTenantId));
      if (hasSelected) return;

      if (preferred && rows.some((r) => String(r.id) === preferred)) {
        setSelectedTenantId(preferred);
      } else if (rows.length > 0) {
        setSelectedTenantId(String(rows[0].id));
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [leadModalOpen, isAsesor, session?.user?.id, session?.user?.email, user?.id, user?.email, authTenantId, safeTenantId, selectedTenantId]);

  const normalizeStatus = (status: string | null | undefined) => {
    if (!status) return "NUEVO";
    const raw = status.toUpperCase().trim();
    if (raw === "") return "NUEVO";
    const s = raw.replace(/\s+/g, "_");
    const map: Record<string, string> = {
      NEW: "NUEVO",
      CONTACTED: "CONTACTADO",
      CONVERTED: "CONVERTIDO",
      SIGNED: "FIRMADO",
      NOT_CONVERTED: "NO_CONVERTIDO",
      NO_CONVERTIDO: "NO_CONVERTIDO",
      NO_CONVERTIDO_: "NO_CONVERTIDO",
      NO_CONVERTIDO__: "NO_CONVERTIDO",
      NO_CONVERTIDO___: "NO_CONVERTIDO",
      NO_INTERESADO: "NO_INTERESADO",
      DOCUMENTACION: "DOCUMENTACION",
      DOCUMENTACIÓN: "DOCUMENTACION",
    };
    return map[s] || s;
  };

  const withTimeout = async <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
    let t: any;
    const timeout = new Promise<T>((_resolve, reject) => {
      t = setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms);
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(t);
    }
  };

  // ✅ IMPORTANTE: async para poder usar await
  const handleSaveLead = async () => {
    setLeadModalError(null);

    if (!formName.trim()) {
      setLeadModalError("El nombre es obligatorio.");
      return;
    }
    if (!formPhone.trim()) {
      setLeadModalError(t.phoneRequiredError);
      return;
    }

    setLeadModalLoading(true);

    try {
      let resolvedTenantId = selectedTenantId || safeTenantId || authTenantId || null;
      let resolvedTeamMemberId = teamMemberId || null;

      if (isAsesor) {
        const authUserId = session?.user?.id || user?.id || null;
        const authEmail = session?.user?.email || user?.email || null;

        if (authUserId && (!resolvedTenantId || !resolvedTeamMemberId)) {
          const { data: tmByAuth } = await supabase
            .from("team_members")
            .select("id, tenant_id")
            .eq("auth_user_id", authUserId)
            .eq("activo", true)
            .maybeSingle();

          if (tmByAuth) {
            if (!resolvedTeamMemberId) resolvedTeamMemberId = tmByAuth.id || resolvedTeamMemberId;
            if (!resolvedTenantId) resolvedTenantId = tmByAuth.tenant_id || resolvedTenantId;
          }
        }

        if (authUserId && resolvedTenantId && !resolvedTeamMemberId) {
          const { data: tmByAuthTenant } = await supabase
            .from("team_members")
            .select("id, tenant_id")
            .eq("auth_user_id", authUserId)
            .eq("tenant_id", resolvedTenantId)
            .eq("activo", true)
            .maybeSingle();

          if (tmByAuthTenant) {
            resolvedTeamMemberId = tmByAuthTenant.id || resolvedTeamMemberId;
          }
        }

        if ((!resolvedTenantId || !resolvedTeamMemberId) && authEmail) {
          const { data: tmByEmail } = await supabase
            .from("team_members")
            .select("id, tenant_id")
            .eq("email", authEmail)
            .eq("activo", true)
            .maybeSingle();

          if (tmByEmail) {
            if (!resolvedTeamMemberId) resolvedTeamMemberId = tmByEmail.id || resolvedTeamMemberId;
            if (!resolvedTenantId) resolvedTenantId = tmByEmail.tenant_id || resolvedTenantId;
          }
        }

        if (authEmail && resolvedTenantId && !resolvedTeamMemberId) {
          const { data: tmByEmailTenant } = await supabase
            .from("team_members")
            .select("id, tenant_id")
            .eq("email", authEmail)
            .eq("tenant_id", resolvedTenantId)
            .eq("activo", true)
            .maybeSingle();

          if (tmByEmailTenant) {
            resolvedTeamMemberId = tmByEmailTenant.id || resolvedTeamMemberId;
          }
        }
      }

      if (isAsesor && !resolvedTeamMemberId) {
        throw new Error("No se pudo identificar el asesor actual. Revisa team_members (auth_user_id/email).");
      }

      if (!resolvedTenantId) {
        throw new Error("No se pudo resolver tenant_id para este lead.");
      }

      const payload: any = {
        name: formName.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim(),
        status: normalizeStatus(formStatus),
        next_action: formNextAction || "",
        calificacion: formCalificacion || "",
        origen: "manual",
      };

      const { data: { session: apiSession } } = await supabase.auth.getSession();
      const accessToken = apiSession?.access_token || null;
      if (!accessToken) throw new Error("Sesion expirada. Vuelve a iniciar sesión.");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      let response: Response;
      try {
        response = await fetch("/api/leads/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            tenantId: resolvedTenantId,
            advisorId: isAsesor ? (resolvedTeamMemberId || null) : null,
            lead: payload,
          }),
          signal: controller.signal,
        });
      } catch (err: any) {
        if (err?.name === "AbortError") {
          throw new Error("guardar lead timeout after 12000ms");
        }
        throw err;
      } finally {
        clearTimeout(timeoutId);
      }

      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.ok === false) {
        const msg = result?.error || `Error guardando el lead (HTTP ${response.status})`;
        setLeadModalError(msg);
        return;
      }

      if (result?.assignedToOther) {
        setLeadModalError("Este lead ya existe y esta asignado a otro asesor.");
        return;
      }

      triggerDataRefresh();
      closeLeadModal();
    } catch (e: any) {
      console.error(e);
      setLeadModalError(e?.message || "Error guardando el lead.");
    } finally {
      setLeadModalLoading(false);
    }
  };

  
  const handleDeleteLead = (lead: Lead) => {
    // Seguridad: si en algún punto mezclas tablas, solo borramos los de leads
    if (lead.sourceTable && lead.sourceTable !== "leads") {
      alert(t.notLeadsTableError);
      return;
    }

    openDeleteModal(lead);
  };

  const confirmDeleteLead = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    setDeleteLoading(true);

    try {
      console.log("🗑️ Intentando eliminar lead:", deleteTarget.id, deleteTarget.name);
      
      // Primero intentamos eliminar los logs relacionados (si existen)
      try {
        const { error: logError } = await supabase
          .from("lead_logs")
          .delete()
          .eq("lead_id", deleteTarget.id);
        
        if (logError) {
          console.warn("No se pudieron eliminar logs (puede que no existan):", logError);
        }
      } catch (e) {
        console.warn("Tabla lead_logs no existe o error:", e);
      }

      // Ahora eliminamos el lead
      const response = await supabase
        .from("leads")
        .delete()
        .eq("id", deleteTarget.id);

      console.log("Respuesta completa de Supabase:", JSON.stringify(response, null, 2));
      console.log("Status:", response.status);
      console.log("StatusText:", response.statusText);
      console.log("Error:", response.error);
      console.log("Data:", response.data);

      if (response.error) {
        console.error("Error de Supabase:", JSON.stringify(response.error, null, 2));
        const errorMsg = response.error.message || response.error.details || response.error.hint || "Error desconocido de Supabase";
        throw new Error(errorMsg);
      }

      // Si el status no es exitoso (204 es éxito para DELETE)
      if (response.status && response.status >= 400) {
        throw new Error(`Error HTTP ${response.status}: ${response.statusText || 'Error en la petición'}`);
      }

      // Verificar que realmente se eliminó
      const { data: checkData, error: checkError } = await supabase
        .from("leads")
        .select("id")
        .eq("id", deleteTarget.id)
        .maybeSingle();

      console.log("Verificación post-delete:", { checkData, checkError });

      if (checkData) {
        console.error("⚠️ El lead aún existe después de intentar eliminar");
        throw new Error("No se pudo eliminar el lead. Verifica los permisos DELETE en Supabase (RLS policies).");
      }

      console.log("✅ Lead eliminado correctamente de la base de datos");

      // Actualizar estado local
      setLeads((prev) => prev.filter((l) => l.id !== deleteTarget.id));

      closeDeleteModal();
    } catch (e: any) {
      console.error("Error completo:", e);
      console.error("Error stack:", e?.stack);
      setDeleteError(e?.message || "Error eliminando el lead. Revisa la consola para más detalles.");
    } finally {
      setDeleteLoading(false);
    }
  };



  const wideColTh: React.CSSProperties = {
    minWidth: 220,
    padding: "12px 14px",
    textAlign: "left",
    whiteSpace: "nowrap",
  };
  const wideColTd: React.CSSProperties = {
    minWidth: 220,
    padding: "12px 14px",
    verticalAlign: "middle",
  };

  const advisorStickyWidth = 220;

  // When using sticky columns, the background must be (almost) opaque or
  // underlying text will bleed through during horizontal scroll / layout shifts.
  // Keep it consistent across the whole table to avoid a visible "patch".
  const stickyTableBg = "rgba(10, 15, 28, 0.96)";

  const advisorStickyTh: React.CSSProperties = {
    ...wideColTh,
    position: "sticky",
    right: 0,
    zIndex: 5,
    background: stickyTableBg,
    borderLeft: "none",
    boxShadow: "none",
  };
  const advisorStickyTd: React.CSSProperties = {
    ...wideColTd,
    position: "sticky",
    right: 0,
    zIndex: 4,
    background: stickyTableBg,
    borderLeft: "none",
    boxShadow: "none",
  };

  const ratingStickyTh: React.CSSProperties = {
    ...wideColTh,
    position: "sticky",
    right: advisorStickyWidth,
    zIndex: 4,
    background: stickyTableBg,
    borderLeft: "none",
    boxShadow: "none",
  };

  const ratingStickyTd: React.CSSProperties = {
    ...wideColTd,
    position: "sticky",
    right: advisorStickyWidth,
    zIndex: 3,
    background: stickyTableBg,
    borderLeft: "none",
    boxShadow: "none",
  };

  const filteredLeads = safeLeads.filter((lead) => {
    const s = searchTerm.toLowerCase();
    const matchesSearch =
      (lead.name && lead.name.toLowerCase().includes(s)) ||
      (lead.email && lead.email.toLowerCase().includes(s)) ||
      ((lead as any).phone && String((lead as any).phone).toLowerCase().includes(s)) ||
      (lead.asesor_nombre && lead.asesor_nombre.toLowerCase().includes(s)) ||
      ((lead as any).asesor && String((lead as any).asesor).toLowerCase().includes(s));

    const leadStatus = normalizeStatus(lead.status);
    const filterValue = statusFilter.toUpperCase().trim();

    let matchesStatus = true;
    if (filterValue !== "TODOS") {
      matchesStatus = leadStatus === filterValue;
    }

    const leadDate = new Date(lead.created_at);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (end) end.setHours(23, 59, 59);
    const matchesDate = (!start || leadDate >= start) && (!end || leadDate <= end);

    let matchesGlobal = true;
    if (globalFilter) {
      const source = (lead.source || lead.origen || "").toLowerCase();
      matchesGlobal = source.includes(globalFilter.toLowerCase());
    }

    return matchesSearch && matchesStatus && matchesDate && matchesGlobal;
  });

  // =========================
  // ✅ PAGINACIÓN (solo vista, NO filtra data)
  // =========================
  const totalFiltered = filteredLeads.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = pageStart + pageSize;
  const paginatedLeads = filteredLeads.slice(pageStart, pageEnd);

  useEffect(() => {
    // Si cambian filtros/búsqueda, vuelve a la primera página
    setPage(1);
  }, [searchTerm, statusFilter, startDate, endDate, globalFilter]);

  useEffect(() => {
    // Si la página actual queda fuera del rango (por cambio de tamaño/filtros), ajusta
    if (page > totalPages) setPage(totalPages);
  }, [totalPages]);


  const handleUpdate = async (id: string, field: string, value: string) => {
    const cleanValue =
    field === "status"
      ? String(value || "NUEVO").trim().toUpperCase().replace(/\s+/g, "_")
      : value;

  const previousLead = leads.find((l) => l.id === id) as any;
  const previousValue = previousLead ? previousLead[field] : undefined;

  setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: cleanValue } : l)));
  onLeadPatch?.(id, { [field]: cleanValue } as any);
  const { error } = await supabase.from("leads").update({ [field]: cleanValue }).eq("id", id);
    if (error) {
      console.error("Error saving:", error);
      setLeads((prev) => prev.map((l: any) => (l.id === id ? { ...l, [field]: previousValue } : l)));
      onLeadPatch?.(id, { [field]: previousValue } as any);
      alert(t.saveFailedPerms);
    } else {
      // ✅ NUEVO: Sincronizar con dashboard ejecutivo
      triggerDataRefresh();
    }

    if (!error && (field === "status" || field === "calificacion" || field === "next_action")) {
      let tipo = "status";
      let texto = `Cambio de estado a ${value.toUpperCase()}`;
      if (field === "calificacion") {
        tipo = "note";
        texto = `Calificación actualizada: ${value}`;
      }
      if (field === "next_action") {
        tipo = "system";
        texto = `Próxima acción definida: ${value}`;
      }

      try {
        await supabase.from("lead_logs").insert([
          {
            lead_id: id,
            type: tipo,
            text: texto,
            user_name: "Sistema",
          },
        ]);
      } catch (e) {
        console.warn("lead_logs insert skipped:", e);
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("user_id", session?.user?.id || "");
    try {
      alert("📤 Procesando...");
      const res = await fetch("/api/upload-leads", { method: "POST", body: formData });
      if (res.ok) window.location.reload();
    } catch (e) {
      console.error(e);
    }
  };

  const exportExcel = () => {
    const data = filteredLeads.map((l) => ({
      Nombre: l.name,
      Email: l.email,
      Telefono: l.phone,
      Estado: l.status,
      Accion: l.next_action,
      Calificacion: l.calificacion,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    XLSX.writeFile(wb, "leads.xlsx");
  };

  const getStatusColor = (status: string | null | undefined) => {
    const value = normalizeStatus(status);
    switch (value) {
      case "NUEVO":
        return { bg: "rgba(59, 130, 246, 0.2)", text: "#60a5fa", border: "#3b82f6" };
      case "SEGUIMIENTO":
        return { bg: "rgba(245, 158, 11, 0.2)", text: "#fbbf24", border: "#f59e0b" };
      case "CONVERTIDO":
      case "FIRMADO":
        return { bg: "rgba(16, 185, 129, 0.2)", text: "#34d399", border: "#10b981" };
      case "NO_INTERESADO":
        return { bg: "rgba(100, 116, 139, 0.2)", text: "#94a3b8", border: "#64748b" };
      case "NO_CONVERTIDO":
        return { bg: "rgba(239, 68, 68, 0.2)", text: "#f87171", border: "#ef4444" };
      default:
        return { bg: "rgba(255, 255, 255, 0.05)", text: "#fff", border: "transparent" };
    }
  };

  const getCalificacionColor = (calificacion: string | null | undefined) => {
    const value = (calificacion || "").toLowerCase();
    switch (value) {
      case "caliente":
        return { bg: "rgba(249, 115, 22, 0.2)", text: "#fb923c", border: "#f97316" };
      case "tibio":
        return { bg: "rgba(234, 179, 8, 0.2)", text: "#facc15", border: "#eab308" };
      case "frio":
      case "frío":
        return { bg: "rgba(56, 189, 248, 0.2)", text: "#38bdf8", border: "#0ea5e9" };
      case "sin respuesta":
        return { bg: "rgba(100, 116, 139, 0.2)", text: "#94a3b8", border: "#64748b" };
      default:
        return { bg: "rgba(255, 255, 255, 0.05)", text: "#cbd5e1", border: "rgba(255,255,255,0.1)" };
    }
  };

  const getStatusFilterStyle = () => {
    switch (statusFilter) {
      case "NUEVO":
        return { bg: "rgba(59, 130, 246, 0.15)", border: "#3b82f6", text: "#60a5fa" };
      case "SEGUIMIENTO":
        return { bg: "rgba(245, 158, 11, 0.15)", border: "#f59e0b", text: "#fbbf24" };
      case "CONVERTIDO":
      case "FIRMADO":
        return { bg: "rgba(16, 185, 129, 0.15)", border: "#10b981", text: "#34d399" };
      case "NO CONVERTIDO":
        return { bg: "rgba(239, 68, 68, 0.15)", border: "#ef4444", text: "#f87171" };
      default:
        return { bg: "rgba(30, 41, 59, 0.5)", border: "rgba(71, 85, 105, 0.5)", text: "#fff" };
    }
  };

  const statusFilterStyle = getStatusFilterStyle();

  return (
    <>
      <div
        style={{
          background: "rgba(15, 23, 42, 0.6)",
          position: "relative",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(51, 65, 85, 0.5)",
          borderRadius: "20px",
          padding: "24px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          marginTop: "30px",
          maxWidth: "100%",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", gap: "12px", alignItems: "center", flex: 1, minWidth: "300px", flexWrap: "wrap" }}>
            {globalFilter && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(34, 211, 238, 0.1)",
                  border: "1px solid rgba(34, 211, 238, 0.3)",
                  padding: "8px 12px",
                  borderRadius: "10px",
                  color: "#22d3ee",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
              >
                <Zap size={14} fill="#22d3ee" /> {t.channelLabel} {globalFilter}
              </div>
            )}

            <div style={{ position: "relative", flex: 1, minWidth: "180px" }}>
              <Search size={18} color="#94a3b8" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  background: "rgba(30, 41, 59, 0.5)",
                  border: "1px solid rgba(71, 85, 105, 0.5)",
                  padding: "10px 10px 10px 40px",
                  borderRadius: "12px",
                  color: "#fff",
                  outline: "none",
                }}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                background: statusFilterStyle.bg,
                border: `1px solid ${statusFilterStyle.border}`,
                padding: "10px 16px",
                borderRadius: "12px",
                color: statusFilterStyle.text,
                cursor: "pointer",
                fontWeight: statusFilter !== "TODOS" ? "bold" : "normal",
                transition: "all 0.2s ease",
              }}
            >
              <option value="TODOS" style={{ background: "#0f172a", color: "#fff" }}>
                {t.allStatuses}
              </option>
              <option value="NUEVO" style={{ background: "#0f172a", color: "#60a5fa" }}>
                🔵 {t.statusNew}
              </option>
              <option value="SEGUIMIENTO" style={{ background: "#0f172a", color: "#fbbf24" }}>
                🟡 {t.statusFollowUp}
              </option>
              <option value="CONVERTIDO" style={{ background: "#0f172a", color: "#34d399" }}>
                🟢 {t.statusConverted}
              </option>
              <option value="FIRMADO" style={{ background: "#0f172a", color: "#34d399" }}>
                🟢 {t.statusSigned}
              </option>
              <option value="NO_CONVERTIDO" style={{ background: "#0f172a", color: "#f87171" }}>
                🔴 {t.statusNotConverted}
              </option>
              <option value="NO_INTERESADO" style={{ background: "#0f172a", color: "#f87171" }}>
                🔴 {t.statusNotInterested}
              </option>
              <option value="CONTACTADO" style={{ background: "#0f172a", color: "#a78bfa" }}>
  🟣 {t.statusContacted}
 </option>

<option value="SEGUNDO_CONTACTO" style={{ background: "#0f172a", color: "#f59e0b" }}>
  🟠 {t.statusSecondContact}
</option>

<option value="DOCUMENTACION" style={{ background: "#0f172a", color: "#fde047" }}>
  🟡 {t.statusDocs}
</option>

            </select>

            <div style={{ display: "flex", gap: "5px" }}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  background: "rgba(30,41,59,0.5)",
                  border: "1px solid rgba(71,85,105,0.5)",
                  borderRadius: "8px",
                  color: "#fff",
                  padding: "8px",
                  colorScheme: "dark",
                }}
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  background: "rgba(30,41,59,0.5)",
                  border: "1px solid rgba(71,85,105,0.5)",
                  borderRadius: "8px",
                  color: "#fff",
                  padding: "8px",
                  colorScheme: "dark",
                }}
              />
            </div>
          </div>

          {/* ✅ BOTONES A LA DERECHA */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end" }}>
            
            {/* ✅ BOTÓN NUEVO LEAD - VISIBLE */}
            <button
              type="button"
              onClick={openCreateLead}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "linear-gradient(135deg, rgba(34, 211, 238, 0.15), rgba(59, 130, 246, 0.15))",
                color: "#22d3ee",
                border: "1px solid rgba(34, 211, 238, 0.3)",
                padding: "10px 16px",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: "0 2px 10px rgba(34, 211, 238, 0.1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, rgba(34, 211, 238, 0.25), rgba(59, 130, 246, 0.25))";
                e.currentTarget.style.boxShadow = "0 4px 15px rgba(34, 211, 238, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, rgba(34, 211, 238, 0.15), rgba(59, 130, 246, 0.15))";
                e.currentTarget.style.boxShadow = "0 2px 10px rgba(34, 211, 238, 0.1)";
              }}
            >
              <Plus size={16} /> {t.newLead}
            </button>

            <div style={{ position: "relative" }}>
              <input type="file" id="upfile" hidden onChange={handleFileUpload} />
              <label
                htmlFor="upfile"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "rgba(59, 130, 246, 0.1)",
                  color: "#60a5fa",
                  border: "1px solid rgba(59, 130, 246, 0.2)",
                  padding: "10px 16px",
                  borderRadius: "12px",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                <Upload size={16} /> {t.upload}
              </label>
            </div>

            <button type="button"
              onClick={exportExcel}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(16, 185, 129, 0.1)",
                color: "#34d399",
                border: "1px solid rgba(16, 185, 129, 0.2)",
                padding: "10px 16px",
                borderRadius: "12px",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              <Download size={16} /> {t.export}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: "16px", marginBottom: "16px", fontSize: "12px", color: "#64748b", alignItems: "center" }}>
          <span>
            {t.showing(paginatedLeads.length, filteredLeads.length)}
          </span>
          {(statusFilter !== "TODOS" || globalFilter) && (
            <button type="button"
              onClick={() => setStatusFilter("TODOS")}
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#f87171",
                padding: "4px 10px",
                borderRadius: "6px",
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              {t.clearFilters}
            </button>
          )}
        </div>

        <div style={{ overflowX: "auto", overflowY: "visible", maxWidth: "100%", paddingBottom: "150px", position: "relative" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "14px",
              color: "#cbd5e1",
              tableLayout: "fixed",
              minWidth: "1240px",
              background: stickyTableBg,
              borderRadius: "14px",
              overflow: "hidden",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", textAlign: "left" }}>
                <th style={{ padding: "12px 10px", color: "#94a3b8", whiteSpace: "nowrap", width: "240px" }}>{t.thBotzAnalysis}</th>
                <th style={{ padding: "12px 10px", color: "#94a3b8", whiteSpace: "nowrap", width: "220px" }}>{t.thNameEmail}</th>
                <th style={{ padding: "12px 10px", color: "#94a3b8", whiteSpace: "nowrap", width: "120px" }}>{t.thPhone}</th>
                <th style={{ padding: "12px 10px", color: "#94a3b8", whiteSpace: "nowrap", width: "140px" }}>{t.thStatus}</th>
                <th style={{ padding: "12px 10px", color: "#94a3b8", whiteSpace: "nowrap", width: "140px" }}>{t.thNextAction}</th>
                <th style={{ ...ratingStickyTh, padding: "12px 10px", color: "#94a3b8", whiteSpace: "nowrap", width: "140px" }}>{t.thRating}</th>
                <th style={{ ...advisorStickyTh, padding: "12px 10px", color: "#94a3b8", whiteSpace: "nowrap", width: "220px" }}>{t.thAdvisor}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLeads.map((lead) => {
                const cleanStatus = normalizeStatus(lead.status);
                const statusStyles = getStatusColor(cleanStatus);

                const isViable =
                  String((lead as any)?.estado_operacion || "")
                    .trim()
                    .toUpperCase() === "VIABLE";

                // UI-only defaults: if lead is viable, show it as hot + call today
                const effectiveNextAction = (lead.next_action || "").trim()
                  ? (lead.next_action as any)
                  : isViable
                    ? "Llamar hoy"
                    : "";

                const effectiveCalificacion = (lead.calificacion || "").trim()
                  ? (lead.calificacion as any)
                  : isViable
                    ? "Caliente"
                    : "";

                const calificacionStyles = getCalificacionColor(effectiveCalificacion);

                return (
                  <tr
                    key={lead.id}
                    onClick={() => openLead(lead)}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "pointer" }}
                    onMouseEnter={(e) => ((e.currentTarget.style.background = "rgba(255,255,255,0.02)"))}
                    onMouseLeave={(e) => ((e.currentTarget.style.background = "transparent"))}
                  >
                    <td style={{ padding: "12px 10px", whiteSpace: "nowrap", width: "240px", maxWidth: "240px", overflow: "hidden" }}>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "nowrap", overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
                        <button type="button"
                          onClick={() => openLead(lead)}
                          title={t.botzSummaryTitle}
                          style={{
                            background: "linear-gradient(90deg, #3b82f6, #8b5cf6)",
                            border: "none",
                            padding: "6px 10px",
                            borderRadius: "8px",
                            color: "white",
                            fontSize: "11px",
                            fontWeight: "bold",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <Bot size={14} /> {t.viewBotzAnalysis}
                        </button>

                        <div style={{ width: "1px", height: "20px", background: "rgba(255,255,255,0.1)", margin: "0 2px" }} />

                        <button type="button"
                          onClick={() => window.open(`https://wa.me/${lead.phone}`, "_blank")}
                          style={{ background: "rgba(34, 197, 94, 0.1)", border: "none", padding: "6px", borderRadius: "6px", color: "#22c55e", cursor: "pointer" }}
                        >
                          <MessageCircle size={16} />
                        </button>
                        <button type="button"
                          onClick={() => window.open(`mailto:${lead.email}`, "_blank")}
                          style={{ background: "rgba(59, 130, 246, 0.1)", border: "none", padding: "6px", borderRadius: "6px", color: "#3b82f6", cursor: "pointer" }}
                        >
                          <Mail size={16} />
                        </button>
                        {/* ✅ BOTÓN ELIMINAR MÁS PEQUEÑO */}
                        <button type="button"
                          onClick={() => handleDeleteLead(lead)}
                          title={t.deleteLeadTitle}
                          style={{ 
                            background: "rgba(239, 68, 68, 0.08)", 
                            border: "none", 
                            padding: "5px", 
                            borderRadius: "5px", 
                            color: "#f87171", 
                            cursor: "pointer",
                            opacity: 0.7,
                            transition: "all 0.2s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = "1";
                            e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = "0.7";
                            e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)";
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>

                    <td style={{ padding: "12px 10px", maxWidth: "220px" }}>
                      <div style={{ fontWeight: "bold", color: "#f1f5f9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lead.name}</div>
                      <div style={{ fontSize: "12px", color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lead.email}</div>
                    </td>

                    <td style={{ padding: "12px 10px", fontFamily: "monospace", whiteSpace: "nowrap" }}>{lead.phone}</td>

                    <td style={{ ...wideColTd, padding: "12px 10px" }} onClick={(e) => e.stopPropagation()}>
                      <select
                        value={cleanStatus}
                        onChange={(e) => handleUpdate(lead.id, "status", e.target.value)}
                        style={{
                          background: statusStyles.bg,
                          color: statusStyles.text,
                          border: `1px solid ${statusStyles.border}`,
                          padding: "4px 8px",
                          borderRadius: "8px",
                          fontSize: "12px",
                          fontWeight: "bold",
                          cursor: "pointer",
                          outline: "none",
                          width: "100%",
                          minWidth: "110px",
                        }}
                      >
                        <option value="NUEVO" style={{ background: "#0f172a" }}>🔵 {t.statusNew}</option>
                        <option value="SEGUIMIENTO" style={{ background: "#0f172a" }}>🟡 {t.statusFollowUp}</option>
                        <option value="CONVERTIDO" style={{ background: "#0f172a" }}>🟢 {t.statusConverted}</option>
                        <option value="FIRMADO" style={{ background: "#0f172a" }}>🟢 {t.statusSigned}</option>
                        <option value="NO_CONVERTIDO" style={{ background: "#0f172a" }}>🔴 {t.statusNotConverted}</option>
                        <option value="CONTACTADO" style={{ background: "#0f172a" }}>🟣 {t.statusContacted}</option>
                        <option value="SEGUNDO_CONTACTO" style={{ background: "#0f172a" }}>🟠 {t.statusSecondContact}</option>
                        <option value="DOCUMENTACION" style={{ background: "#0f172a" }}>🟡 {t.statusDocs}</option>
                        <option value="NO_INTERESADO" style={{ background: "#0f172a" }}>🟦 {t.statusNotInterested}</option>


                      </select>
                    </td>

                    <td style={{ ...wideColTd, padding: "12px 10px" }} onClick={(e) => e.stopPropagation()}>
                      <select
                        value={effectiveNextAction}
                        onChange={(e) => handleUpdate(lead.id, "next_action", e.target.value)}
                        style={{
                          background: "transparent",
                          color: "#cbd5e1",
                          border: "1px solid rgba(255,255,255,0.1)",
                          padding: "4px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          outline: "none",
                          width: "100%",
                          minWidth: "110px",
                        }}
                      >
                        <option value="" style={{ background: "#0f172a" }}>{t.actionPlaceholder}</option>
                        <option value="Llamar hoy" style={{ background: "#0f172a" }}>📞 {t.actionCallToday}</option>
                        <option value="Enviar WhatsApp" style={{ background: "#0f172a" }}>💬 {t.actionSendWhatsapp}</option>
                        <option value="Enviar Email" style={{ background: "#0f172a" }}>📧 {t.actionSendEmail}</option>
                        <option value="Agendar Reunión" style={{ background: "#0f172a" }}>📅 {t.actionScheduleMeeting}</option>
                        <option value="Finalizado" style={{ background: "#0f172a" }}>✔️ {t.actionDone}</option>
                      </select>
                    </td>

                    <td style={{ ...ratingStickyTd, padding: "12px 10px" }} onClick={(e) => e.stopPropagation()}>
                      <select
                        value={effectiveCalificacion}
                        onChange={(e) => handleUpdate(lead.id, "calificacion", e.target.value)}
                        style={{
                          background: calificacionStyles.bg,
                          color: calificacionStyles.text,
                          border: `1px solid ${calificacionStyles.border}`,
                          padding: "4px 8px",
                          borderRadius: "8px",
                          fontSize: "12px",
                          fontWeight: "bold",
                          cursor: "pointer",
                          outline: "none",
                          width: "100%",
                          minWidth: "110px",
                        }}
                      >
                        <option value="" style={{ background: "#0f172a" }}>📝 {t.ratingPending}</option>
                        <option value="Caliente" style={{ background: "#0f172a" }}>🔥 {t.ratingHot}</option>
                        <option value="Tibio" style={{ background: "#0f172a" }}>🧐 {t.ratingWarm}</option>
                        <option value="Frio" style={{ background: "#0f172a" }}>❄️ {t.ratingCold}</option>
                        <option value="Sin Respuesta" style={{ background: "#0f172a" }}>📵 {t.noResponse}</option>
                      </select>
                    </td>

                    <td style={{ ...advisorStickyTd, padding: "12px 10px" }} onClick={(e) => e.stopPropagation()}>
                      <AsignarAsesor
                        leadId={lead.id}
                        currentAsesorId={lead.asesor_id}
                        currentAsesorNombre={lead.asesor_nombre}
                        variant="dropdown"
                        size="sm"
                        onAssigned={(asesorId, asesorNombre) => {
                          setLeads((prev) =>
                            prev.map((l) =>
                              l.id === lead.id ? { ...l, asesor_id: asesorId || undefined, asesor_nombre: asesorNombre || undefined } : l
                            )
                          );
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* ========================= */}
          {/* ✅ CONTROLES DE PAGINACIÓN */}
          {/* ========================= */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              marginTop: "14px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#94a3b8", fontSize: "12px" }}>
              <span>{t.rowsPerPage}</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
                style={{
                  background: "rgba(30, 41, 59, 0.5)",
                  border: "1px solid rgba(71, 85, 105, 0.5)",
                  padding: "8px 10px",
                  borderRadius: "10px",
                  color: "#fff",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>

              <span style={{ opacity: 0.9 }}>
                Página <strong style={{ color: "#22d3ee" }}>{safePage}</strong> de {totalPages}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                style={{
                  background: "rgba(30, 41, 59, 0.5)",
                  border: "1px solid rgba(71, 85, 105, 0.5)",
                  padding: "8px 12px",
                  borderRadius: "10px",
                  color: "#fff",
                  cursor: safePage <= 1 ? "not-allowed" : "pointer",
                  opacity: safePage <= 1 ? 0.5 : 1,
                  fontWeight: 700,
                  fontSize: "12px",
                }}
              >
                {t.previous}
              </button>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                style={{
                  background: "rgba(30, 41, 59, 0.5)",
                  border: "1px solid rgba(71, 85, 105, 0.5)",
                  padding: "8px 12px",
                  borderRadius: "10px",
                  color: "#fff",
                  cursor: safePage >= totalPages ? "not-allowed" : "pointer",
                  opacity: safePage >= totalPages ? 0.5 : 1,
                  fontWeight: 700,
                  fontSize: "12px",
                }}
              >
                {t.next}
              </button>
            </div>
          </div>


          {filteredLeads.length === 0 && (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
              {globalFilter ? t.noResultsForChannel(globalFilter) : t.noLeadsForFilters}
            </div>
          )}
        </div>
      </div>

      <LeadDetailsDrawer lead={selectedLead} isOpen={!!selectedLead} onClose={() => setSelectedLead(null)} />

      {/* ✅ MODAL CREAR LEAD - MEJORADO Y CENTRADO */}
      {leadModalOpen && (
        <div
          onClick={closeLeadModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 480,
              background: "linear-gradient(145deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.95))",
              border: "1px solid rgba(34, 211, 238, 0.2)",
              borderRadius: 20,
              boxShadow: "0 25px 80px rgba(0, 0, 0, 0.6), 0 0 40px rgba(34, 211, 238, 0.1)",
              overflow: "hidden",
            }}
          >
            {/* Header del modal */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "18px 24px",
                borderBottom: "1px solid rgba(51, 65, 85, 0.5)",
                background: "rgba(34, 211, 238, 0.05)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "linear-gradient(135deg, rgba(34, 211, 238, 0.2), rgba(59, 130, 246, 0.2))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Plus size={18} color="#22d3ee" />
                </div>
                <span style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 17 }}>{t.createLeadTitle}</span>
              </div>
              <button
                type="button"
                onClick={closeLeadModal}
                style={{
                  background: "rgba(148, 163, 184, 0.1)",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: 8,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(148, 163, 184, 0.2)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(148, 163, 184, 0.1)")}
              >
                <X size={18} />
              </button>
            </div>

            {/* Contenido del modal */}
            <div style={{ padding: "20px 24px" }}>
              {leadModalError && (
                <div
                  style={{
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.25)",
                    color: "#fca5a5",
                    borderRadius: 12,
                    padding: "12px 14px",
                    marginBottom: 16,
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <AlertTriangle size={16} />
                  {leadModalError}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Nombre */}
                <div>
                  <label style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600, marginBottom: 6, display: "block" }}>
                    {t.fieldName} *
                  </label>
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder={t.exampleName}
                    style={{
                      width: "100%",
                      background: "rgba(30, 41, 59, 0.6)",
                      border: "1px solid rgba(71, 85, 105, 0.5)",
                      padding: "12px 14px",
                      borderRadius: 12,
                      color: "#fff",
                      outline: "none",
                      fontSize: 14,
                      transition: "border-color 0.2s",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(34, 211, 238, 0.5)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(71, 85, 105, 0.5)")}
                  />
                </div>

                {/* Email */}
                <div>
                  <label style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600, marginBottom: 6, display: "block" }}>
                    {t.fieldEmail}
                  </label>
                  <input
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder={t.exampleEmail}
                    style={{
                      width: "100%",
                      background: "rgba(30, 41, 59, 0.6)",
                      border: "1px solid rgba(71, 85, 105, 0.5)",
                      padding: "12px 14px",
                      borderRadius: 12,
                      color: "#fff",
                      outline: "none",
                      fontSize: 14,
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(34, 211, 238, 0.5)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(71, 85, 105, 0.5)")}
                  />
                </div>

                {/* Teléfono */}
                <div>
                  <label style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600, marginBottom: 6, display: "block" }}>
                    {t.fieldPhone} *
                  </label>
                  <input
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder={t.examplePhone}
                    style={{
                      width: "100%",
                      background: "rgba(30, 41, 59, 0.6)",
                      border: "1px solid rgba(71, 85, 105, 0.5)",
                      padding: "12px 14px",
                      borderRadius: 12,
                      color: "#fff",
                      outline: "none",
                      fontSize: 14,
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(34, 211, 238, 0.5)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(71, 85, 105, 0.5)")}
                  />
                </div>

                {/* Empresa (solo si el asesor tiene mas de un tenant) */}
                {isAsesor && advisorTenants.length > 1 && (
                  <div>
                    <label style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600, marginBottom: 6, display: "block" }}>
                      Empresa
                    </label>
                    <select
                      value={selectedTenantId}
                      onChange={(e) => setSelectedTenantId(e.target.value)}
                      style={{
                        width: "100%",
                        background: "rgba(30, 41, 59, 0.6)",
                        border: "1px solid rgba(71, 85, 105, 0.5)",
                        padding: "12px 14px",
                        borderRadius: 12,
                        color: "#fff",
                        outline: "none",
                        fontSize: 14,
                        boxSizing: "border-box",
                      }}
                    >
                      {advisorTenants.map((tn) => (
                        <option key={tn.id} value={tn.id} style={{ background: "#0f172a" }}>
                          {tn.name || `Tenant ${String(tn.id).slice(0, 8)}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Estado y Calificación en fila */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600, marginBottom: 6, display: "block" }}>
                      Estado
                    </label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value)}
                      style={{
                        width: "100%",
                        background: "rgba(30, 41, 59, 0.6)",
                        border: "1px solid rgba(71, 85, 105, 0.5)",
                        padding: "12px 14px",
                        borderRadius: 12,
                        color: "#fff",
                        outline: "none",
                        fontSize: 14,
                        cursor: "pointer",
                        boxSizing: "border-box",
                      }}
                    >
                      <option value="NUEVO" style={{ background: "#0f172a" }}>🔵 {t.statusNew}</option>
                      <option value="SEGUIMIENTO" style={{ background: "#0f172a" }}>🟡 {t.statusFollowUp}</option>
                      <option value="CONVERTIDO" style={{ background: "#0f172a" }}>🟢 {t.statusConverted}</option>
                      <option value="FIRMADO" style={{ background: "#0f172a" }}>🟢 {t.statusSigned}</option>
                      <option value="NO CONVERTIDO" style={{ background: "#0f172a" }}>🔴 {t.statusNotConverted}</option>
                      <option value="CONTACTADO" style={{ background: "#0f172a" }}>🟣 {t.statusContacted}</option>
                      <option value="SEGUNDO_CONTACTO" style={{ background: "#0f172a" }}>🟠 {t.statusSecondContact}</option>
                      <option value="DOCUMENTACIÓN" style={{ background: "#0f172a" }}>🟡 {t.statusDocs}</option>

                    </select>
                  </div>

                  <div>
                      <label style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600, marginBottom: 6, display: "block" }}>
                        {t.ratingLabel}
                      </label>
                    <select
                      value={formCalificacion}
                      onChange={(e) => setFormCalificacion(e.target.value)}
                      style={{
                        width: "100%",
                        background: "rgba(30, 41, 59, 0.6)",
                        border: "1px solid rgba(71, 85, 105, 0.5)",
                        padding: "12px 14px",
                        borderRadius: 12,
                        color: "#fff",
                        outline: "none",
                        fontSize: 14,
                        cursor: "pointer",
                        boxSizing: "border-box",
                      }}
                    >
                      <option value="" style={{ background: "#0f172a" }}>📝 {t.ratingPending}</option>
                      <option value="Caliente" style={{ background: "#0f172a" }}>🔥 {t.ratingHot}</option>
                      <option value="Tibio" style={{ background: "#0f172a" }}>🧐 {t.ratingWarm}</option>
                      <option value="Frio" style={{ background: "#0f172a" }}>❄️ {t.ratingCold}</option>
                      <option value="Sin Respuesta" style={{ background: "#0f172a" }}>📵 {t.noResponse}</option>
                    </select>
                  </div>
                </div>

                {/* Próxima acción */}
                <div>
                  <label style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600, marginBottom: 6, display: "block" }}>
                    {t.nextActionLabel}
                  </label>
                  <select
                    value={formNextAction}
                    onChange={(e) => setFormNextAction(e.target.value)}
                    style={{
                      width: "100%",
                      background: "rgba(30, 41, 59, 0.6)",
                      border: "1px solid rgba(71, 85, 105, 0.5)",
                      padding: "12px 14px",
                      borderRadius: 12,
                      color: "#fff",
                      outline: "none",
                      fontSize: 14,
                      cursor: "pointer",
                      boxSizing: "border-box",
                    }}
                  >
                    <option value="" style={{ background: "#0f172a" }}>{t.actionPlaceholder}</option>
                    <option value="Llamar hoy" style={{ background: "#0f172a" }}>📞 {t.actionCallToday}</option>
                    <option value="Enviar WhatsApp" style={{ background: "#0f172a" }}>💬 {t.actionSendWhatsapp}</option>
                    <option value="Enviar Email" style={{ background: "#0f172a" }}>📧 {t.actionSendEmail}</option>
                    <option value="Agendar Reunión" style={{ background: "#0f172a" }}>📅 {t.actionScheduleMeeting}</option>
                    <option value="Finalizado" style={{ background: "#0f172a" }}>✔️ {t.actionDone}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Footer del modal */}
            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "flex-end",
                padding: "16px 24px",
                borderTop: "1px solid rgba(51, 65, 85, 0.5)",
                background: "rgba(15, 23, 42, 0.5)",
              }}
            >
              <button
                type="button"
                onClick={closeLeadModal}
                style={{
                  background: "rgba(148, 163, 184, 0.1)",
                  border: "1px solid rgba(148, 163, 184, 0.2)",
                  color: "#e2e8f0",
                  padding: "10px 20px",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 500,
                  transition: "all 0.2s",
                }}
                disabled={leadModalLoading}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(148, 163, 184, 0.2)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(148, 163, 184, 0.1)")}
              >
                {t.cancel}
              </button>

              <button
                type="button"
                onClick={handleSaveLead}
                style={{
                  background: "linear-gradient(135deg, rgba(34, 211, 238, 0.2), rgba(59, 130, 246, 0.2))",
                  border: "1px solid rgba(34, 211, 238, 0.35)",
                  color: "#22d3ee",
                  padding: "10px 24px",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 700,
                  transition: "all 0.2s",
                  boxShadow: "0 4px 15px rgba(34, 211, 238, 0.15)",
                }}
                disabled={leadModalLoading}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(34, 211, 238, 0.25)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 15px rgba(34, 211, 238, 0.15)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {leadModalLoading ? t.saving : t.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ MODAL CONFIRMAR ELIMINACIÓN - MEJORADO */}
      {deleteModalOpen && (
        <div
          onClick={closeDeleteModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 420,
              background: "linear-gradient(145deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.95))",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              borderRadius: 20,
              boxShadow: "0 25px 80px rgba(0, 0, 0, 0.6), 0 0 40px rgba(239, 68, 68, 0.1)",
              overflow: "hidden",
            }}
          >
            {/* Header del modal */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "18px 24px",
                borderBottom: "1px solid rgba(51, 65, 85, 0.5)",
                background: "rgba(239, 68, 68, 0.05)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "rgba(239, 68, 68, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Trash2 size={18} color="#f87171" />
                </div>
                <span style={{ fontWeight: 700, color: "#fecaca", fontSize: 17 }}>{t.deleteTitle}</span>
              </div>
              <button
                type="button"
                onClick={closeDeleteModal}
                style={{
                  background: "rgba(148, 163, 184, 0.1)",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: 8,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(148, 163, 184, 0.2)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(148, 163, 184, 0.1)")}
              >
                <X size={18} />
              </button>
            </div>

            {/* Contenido del modal */}
            <div style={{ padding: "24px" }}>
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.15)",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <AlertTriangle size={20} color="#f87171" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ color: "#fecaca", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                    ¿Estás seguro?
                  </div>
                  <div style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.5 }}>
                    Vas a eliminar el lead{" "}
                    <span style={{ color: "#fff", fontWeight: 700 }}>
                      "{deleteTarget?.name || "seleccionado"}"
                    </span>
                    . Esta acción no se puede deshacer.
                  </div>
                </div>
              </div>

              {deleteError && (
                <div
                  style={{
                    background: "rgba(239, 68, 68, 0.12)",
                    border: "1px solid rgba(239, 68, 68, 0.25)",
                    color: "#fca5a5",
                    borderRadius: 12,
                    padding: "12px 14px",
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <AlertTriangle size={16} />
                  {deleteError}
                </div>
              )}
            </div>

            {/* Footer del modal */}
            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "flex-end",
                padding: "16px 24px",
                borderTop: "1px solid rgba(51, 65, 85, 0.5)",
                background: "rgba(15, 23, 42, 0.5)",
              }}
            >
              <button
                type="button"
                onClick={closeDeleteModal}
                style={{
                  background: "rgba(148, 163, 184, 0.1)",
                  border: "1px solid rgba(148, 163, 184, 0.2)",
                  color: "#e2e8f0",
                  padding: "10px 20px",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 500,
                }}
                disabled={deleteLoading}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(148, 163, 184, 0.2)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(148, 163, 184, 0.1)")}
              >
                {t.cancel}
              </button>

              <button
                type="button"
                onClick={confirmDeleteLead}
                style={{
                  background: "linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.2))",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                  color: "#fecaca",
                  padding: "10px 24px",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 700,
                  transition: "all 0.2s",
                  boxShadow: "0 4px 15px rgba(239, 68, 68, 0.15)",
                }}
                disabled={deleteLoading}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(239, 68, 68, 0.25)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 15px rgba(239, 68, 68, 0.15)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {deleteLoading ? t.deleting : t.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
