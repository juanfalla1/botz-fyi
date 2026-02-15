"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { useAuth } from "../MainLayout";
import { 
  FaWhatsapp,
  FaPhone,
  FaCalendarAlt,
  FaCheckCircle,
  FaPlay,
  FaExclamationTriangle,
} from "react-icons/fa";
import { 
  AlertTriangle, 
  Clock, 
  Zap, 
  X, 
  ChevronRight,
  MessageSquare,
  Calendar,
  User,
  TrendingUp,
  RefreshCw,
  Loader2
} from "lucide-react";

type AppLanguage = "es" | "en";

const SLA_TEXT: Record<
  AppLanguage,
  {
    title: string;
    noAlerts: string;
    noEmail: string;
    suggestedActions: string;
    createTask: string;
    cancel: string;
    saving: string;
    confirmAppointment: string;
    scheduleAppointmentTitle: string;
    dateLabel: string;
    timeLabel: string;
    quickTimes: string;

    refresh: string;
    autoPlay: string;
    activeAlerts: string;
    critical: string;

    all: string;
    priorityAll: string;
    priorityHigh: string;
    priorityMedium: string;
    priorityLow: string;

    informationTitle: string;
    resendMessage: string;
    docTemplate: string;
    escalate: string;
    dtiLabel: string;
    scoreLabel: string;

    autoPlayActivatedTitle: string;
    autoPlayActivatedDesc: string;
    ignore: string;
    executeAll: string;
    slaShort: string;
    channel: string;
    stage: string;
    advisor: string;
    amount: string;
    suggestedWhatsapp: string;
    suggestedUpdateContacted: string;
    suggestedLogAction: string;
    pendingAction: string;
    noInitialResponse: string;
    followUpPending: string;
    waitingDocs: string;
    noAppointment: string;
    unnamedLead: string;
    unassigned: string;
    leadReceived: string;

    priority: string;
    criticalTitle: string;
    criticalSubtitle: string;
    dueSoonTitle: string;
    dueSoonSubtitle: string;
    watchTitle: string;
    watchSubtitle: string;

    taskDescription: string;
    taskPlaceholder: string;
    quickTasks: string;
    quickTasksItems: string[];

    overdueAgo: string;
    dueIn: string;
    min: string;
    overdueTag: string;
    dueTag: string;

    actionWhatsapp: string;
    actionCall: string;
    actionSchedule: string;
    actionResolved: string;
  }
> = {
  es: {
    title: "Centro de Control SLA",
    noAlerts: "✅ Sin alertas en esta categoría",
    noEmail: "Sin email",
    suggestedActions: "Acciones sugeridas:",
    createTask: "Crear Tarea",
    cancel: "Cancelar",
    saving: "Guardando...",
    confirmAppointment: "Confirmar Cita",
    scheduleAppointmentTitle: "Agendar Cita",
    dateLabel: "Fecha",
    timeLabel: "Hora",
    quickTimes: "Horarios rápidos",

    refresh: "Actualizar",
    autoPlay: "Auto-Play SLA",
    activeAlerts: "alertas activas",
    critical: "críticas",

    all: "Todos",
    priorityAll: "Todas",
    priorityHigh: "alta",
    priorityMedium: "media",
    priorityLow: "baja",

    informationTitle: "Información",
    resendMessage: "Reenviar mensaje",
    docTemplate: "Plantilla Doc",
    escalate: "Escalar",
    dtiLabel: "DTI",
    scoreLabel: "Score",

    autoPlayActivatedTitle: "Auto-Play SLA Activado",
    autoPlayActivatedDesc: "Se detectó una alerta crítica que requiere acción inmediata",
    ignore: "Ignorar",
    executeAll: "Ejecutar Todo",
    slaShort: "SLA",
    channel: "Canal",
    stage: "Etapa",
    advisor: "Asesor",
    amount: "Monto",
    suggestedWhatsapp: "Enviar WhatsApp con plantilla de seguimiento",
    suggestedUpdateContacted: "Actualizar estado a 'Contactado'",
    suggestedLogAction: "Registrar acción en historial",
    pendingAction: "Pendiente de acción",
    noInitialResponse: "Sin respuesta inicial",
    followUpPending: "Follow-up pendiente",
    waitingDocs: "Esperando documentos",
    noAppointment: "Sin cita agendada",
    unnamedLead: "Sin nombre",
    unassigned: "Sin asignar",
    leadReceived: "Lead recibido",

    priority: "Prioridad",
    criticalTitle: "🔥 Críticas",
    criticalSubtitle: "Vencidas o < 10 min",
    dueSoonTitle: "⏳ Por Vencer",
    dueSoonSubtitle: "Próximas 2 horas",
    watchTitle: "🧊 En Observación",
    watchSubtitle: "Riesgo no urgente",

    taskDescription: "Descripción de la tarea",
    taskPlaceholder: "¿Qué hay que hacer con este lead?",
    quickTasks: "Tareas rápidas",
    quickTasksItems: [
      "Llamar para seguimiento",
      "Enviar información adicional",
      "Solicitar documentos faltantes",
      "Revisar expediente",
      "Confirmar datos bancarios",
    ],

    overdueAgo: "Vencido hace",
    dueIn: "Vence en",
    min: "min",
    overdueTag: "VENCIDO",
    dueTag: "VENCE EN",

    actionWhatsapp: "WhatsApp",
    actionCall: "Llamar",
    actionSchedule: "Agendar",
    actionResolved: "Resuelto",
  },
  en: {
    title: "SLA Control Center",
    noAlerts: "✅ No alerts in this category",
    noEmail: "No email",
    suggestedActions: "Suggested actions:",
    createTask: "Create Task",
    cancel: "Cancel",
    saving: "Saving...",
    confirmAppointment: "Confirm Appointment",
    scheduleAppointmentTitle: "Schedule Appointment",
    dateLabel: "Date",
    timeLabel: "Time",
    quickTimes: "Quick times",

    refresh: "Refresh",
    autoPlay: "Auto-Play SLA",
    activeAlerts: "active alerts",
    critical: "critical",

    all: "All",
    priorityAll: "All",
    priorityHigh: "high",
    priorityMedium: "medium",
    priorityLow: "low",

    informationTitle: "Information",
    resendMessage: "Resend message",
    docTemplate: "Doc template",
    escalate: "Escalate",
    dtiLabel: "DTI",
    scoreLabel: "Score",

    autoPlayActivatedTitle: "Auto-Play SLA Activated",
    autoPlayActivatedDesc: "A critical alert requires immediate action",
    ignore: "Ignore",
    executeAll: "Run All",
    slaShort: "SLA",
    channel: "Channel",
    stage: "Stage",
    advisor: "Advisor",
    amount: "Amount",
    suggestedWhatsapp: "Send WhatsApp follow-up template",
    suggestedUpdateContacted: "Update status to 'Contactado'",
    suggestedLogAction: "Log action to history",
    pendingAction: "Pending action",
    noInitialResponse: "No initial response",
    followUpPending: "Follow-up pending",
    waitingDocs: "Waiting for documents",
    noAppointment: "No appointment scheduled",
    unnamedLead: "Unnamed",
    unassigned: "Unassigned",
    leadReceived: "Lead received",

    priority: "Priority",
    criticalTitle: "🔥 Critical",
    criticalSubtitle: "Overdue or < 10 min",
    dueSoonTitle: "⏳ Due Soon",
    dueSoonSubtitle: "Next 2 hours",
    watchTitle: "🧊 Watch",
    watchSubtitle: "Non-urgent risk",

    taskDescription: "Task description",
    taskPlaceholder: "What needs to be done for this lead?",
    quickTasks: "Quick tasks",
    quickTasksItems: [
      "Call for follow-up",
      "Send additional information",
      "Request missing documents",
      "Review file",
      "Confirm banking details",
    ],

    overdueAgo: "Overdue by",
    dueIn: "Due in",
    min: "min",
    overdueTag: "OVERDUE",
    dueTag: "DUE IN",

    actionWhatsapp: "WhatsApp",
    actionCall: "Call",
    actionSchedule: "Schedule",
    actionResolved: "Resolved",
  },
};

function getUiLanguage(): AppLanguage {
  if (typeof window === "undefined") return "es";
  const saved = localStorage.getItem("botz-language");
  return saved === "en" ? "en" : "es";
}

// ============================================
// TIPOS
// ============================================
interface SLAAlert {
  id: string;
  leadId: string;
  leadName: string;
  phone: string;
  email?: string;
  canal: string;
  etapa: string;
  asesor: string;
  prioridad: "alta" | "media" | "baja";
  tipo: "critica" | "por_vencer" | "observacion";
  motivo: string;
  tiempoRestante: number;
  slaMinutos: number;
  ultimoEvento: string;
  fechaCreacion: Date;
  monto?: number;
  dti?: number;
  score?: number;
  sourceTable: string;
}

interface SLAFilters {
  canal: string | null;
  etapa: string | null;
  asesor: string | null;
  prioridad: string | null;
}

type FilterOption = string | { value: string; label: string };

// ============================================
// CONFIGURACIÓN DE SLAs POR ETAPA (en minutos)
// ============================================
const SLA_CONFIG: Record<string, { sla: number; prioridad: "alta" | "media" | "baja" }> = {
  "nuevo": { sla: 5, prioridad: "alta" },           // 5 min para responder lead nuevo
  "contactado": { sla: 120, prioridad: "media" },   // 2 horas para follow-up
  "interesado": { sla: 240, prioridad: "media" },   // 4 horas
  "documentacion": { sla: 1440, prioridad: "media" }, // 24 horas
  "pre-aprobado": { sla: 2880, prioridad: "baja" }, // 48 horas
  "aprobado": { sla: 4320, prioridad: "baja" },     // 72 horas
  "default": { sla: 60, prioridad: "media" }
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function SLAControlCenter() {
  const { isAdmin, isAsesor, teamMemberId, tenantId, loading: authLoading, dataRefreshKey } = useAuth();
  const [alerts, setAlerts] = useState<SLAAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<AppLanguage>(getUiLanguage());
  const t = SLA_TEXT[language];
  const [filters, setFilters] = useState<SLAFilters>({
    canal: null,
    etapa: null,
    asesor: null,
    prioridad: null,
  });
  const [autoMode, setAutoMode] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<SLAAlert | null>(null);
  const [showAutoPlayModal, setShowAutoPlayModal] = useState(false);
  const [autoPlayAlert, setAutoPlayAlert] = useState<SLAAlert | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [agendaAlert, setAgendaAlert] = useState<SLAAlert | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskAlert, setTaskAlert] = useState<SLAAlert | null>(null);

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

  // Re-transform alerts when language changes
  useEffect(() => {
    if (authLoading) return;
    fetchLeads(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // ============================================
  // CARGAR LEADS DESDE SUPABASE
  // ============================================
  const fetchLeads = async (showFullLoading = false) => {
    try {
      if (showFullLoading) setLoading(true);

      if (authLoading) {
        return;
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setLoading(false);
        return;
      }

      const resolvedTenantId =
        tenantId ||
        session.user?.user_metadata?.tenant_id ||
        session.user?.app_metadata?.tenant_id ||
        null;

      // ✅ Seguridad: si no hay tenant o rol válido, no mostramos nada.
      if (!resolvedTenantId) {
        setAlerts([]);
        return;
      }

      if (!isAdmin && !teamMemberId) {
        // Usuario sin rol/miembro asignado (registro nuevo): no puede ver SLA de nadie.
        setAlerts([]);
        return;
      }

      // Cargar leads por tenant y rol
      let query = supabase.from("leads").select("*");

      query = query.eq("tenant_id", resolvedTenantId);

      if (!isAdmin && teamMemberId) {
        // Asesor o usuario no-admin: solo sus leads.
        query = query.or(`asesor_id.eq.${teamMemberId},assigned_to.eq.${teamMemberId}`);
      }

      const { data: leadsData, error: leadsError } = await query;
      if (leadsError) throw leadsError;

      // Transformar a alertas SLA (solo tabla: leads)
      const allLeads = [
        ...(leadsData || []).map(l => ({ ...l, sourceTable: "leads" }))
      ];

      const slaAlerts = allLeads.map(lead => transformToSLAAlert(lead)).filter(Boolean) as SLAAlert[];
      
      // Ordenar por urgencia (tiempo restante ascendente)
      slaAlerts.sort((a, b) => a.tiempoRestante - b.tiempoRestante);
      
      setAlerts(slaAlerts);
    } catch (error) {
      console.error("Error fetching leads:", error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // TRANSFORMAR LEAD A ALERTA SLA
  // ============================================
  const transformToSLAAlert = (lead: any): SLAAlert | null => {
    const translateMotivo = (raw: string) => {
      if (language !== "en") return raw;
      const normalized = String(raw || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ");

      const map: Record<string, string> = {
        "pendiente de accion": "Pending action",
        "sin respuesta inicial": "No initial response",
        "follow-up pendiente": "Follow-up pending",
        "follow up pendiente": "Follow-up pending",
        "esperando documentos": "Waiting for documents",
        "sin cita agendada": "No appointment scheduled",
      };

      return map[normalized] || raw;
    };

    // Usar etapa o status, lo que exista
    const status = String(lead.etapa || lead.status || "nuevo")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\s-]+/g, "_");
    const config = SLA_CONFIG[status] || SLA_CONFIG["default"];
    
    // Calcular tiempo transcurrido desde última actualización
    const lastUpdate = new Date(lead.updated_at || lead.created_at);
    const now = new Date();
    const minutosTranscurridos = Math.floor((now.getTime() - lastUpdate.getTime()) / 60000);
    const tiempoRestante = config.sla - minutosTranscurridos;

    // Determinar tipo de alerta
    let tipo: "critica" | "por_vencer" | "observacion";
    if (tiempoRestante < 0 || tiempoRestante < 10) {
      tipo = "critica";
    } else if (tiempoRestante <= 120) {
      tipo = "por_vencer";
    } else {
      tipo = "observacion";
    }

    // Determinar motivo basado en datos reales
    let motivo = lead.motivo_principal ? translateMotivo(lead.motivo_principal) : t.pendingAction;
    if (status === "nuevo" && minutosTranscurridos > 5) {
      motivo = t.noInitialResponse;
    } else if (status === "contactado") {
      motivo = t.followUpPending;
    } else if (status === "documentacion") {
      motivo = t.waitingDocs;
    } else if (status === "interesado") {
      motivo = t.noAppointment;
    } else if (lead.siguiente_paso) {
      motivo = translateMotivo(lead.siguiente_paso);
    }

    // Determinar canal
    const origen = lead.origen || lead.source || lead.channel || "";
    let canal = "Web";
    if (origen.toLowerCase().includes("whatsapp")) canal = "WhatsApp";
    else if (origen.toLowerCase().includes("meta") || origen.toLowerCase().includes("facebook")) canal = "Meta";
    else if (origen.toLowerCase().includes("instagram")) canal = "Instagram";

    return {
      id: lead.id,
      leadId: lead.lead_id || lead.id,
      leadName: lead.name || lead.nombre || t.unnamedLead,
      phone: lead.phone || lead.telefono || "",
      email: lead.email || "",
      canal,
      etapa: status.charAt(0).toUpperCase() + status.slice(1),
      asesor: (lead.asesor_nombre || lead.asesor) || t.unassigned,
      prioridad: config.prioridad,
      tipo,
      motivo,
      tiempoRestante,
      slaMinutos: config.sla,
      ultimoEvento: lead.next_action || lead.notes || t.leadReceived,
      fechaCreacion: new Date(lead.created_at),
      monto: lead.precio_real || lead.precio_inmueble_eur || lead.monto,
      dti: lead.dti,
      score: lead.score || lead.lead_score || lead.calificacion,
      sourceTable: lead.sourceTable
    };
  };

  useEffect(() => {
    if (authLoading) return;

    fetchLeads(true); // Primera carga: mostrar loading completo

    // Actualizar cada 2 minutos (sin loading completo)
    const interval = setInterval(() => fetchLeads(false), 120000);
    return () => clearInterval(interval);
  }, [authLoading, isAdmin, isAsesor, teamMemberId, tenantId]);

  useEffect(() => {
    if (!authLoading) {
      fetchLeads(false);
    }
  }, [dataRefreshKey, authLoading]);

  // Filtrar alertas
  const filteredAlerts = alerts.filter(alert => {
    if (filters.canal && filters.canal !== "all" && alert.canal !== filters.canal) return false;
    if (filters.etapa && filters.etapa !== "all" && alert.etapa.toLowerCase() !== filters.etapa.toLowerCase()) return false;
    if (filters.asesor && filters.asesor !== "all" && alert.asesor !== filters.asesor) return false;
    if (filters.prioridad && filters.prioridad !== "all" && alert.prioridad !== filters.prioridad) return false;
    return true;
  });

  // Separar por tipo
  const criticas = filteredAlerts.filter(a => a.tipo === "critica");
  const porVencer = filteredAlerts.filter(a => a.tipo === "por_vencer");
  const observacion = filteredAlerts.filter(a => a.tipo === "observacion");

  // Obtener valores únicos para filtros
  const etapasUnicas: FilterOption[] = [{ value: "all", label: t.all }, ...Array.from(new Set(alerts.map(a => a.etapa)))];
  const canalesUnicos: FilterOption[] = [{ value: "all", label: t.all }, ...Array.from(new Set(alerts.map(a => a.canal)))];
  const asesoresUnicos: FilterOption[] = [{ value: "all", label: t.all }, ...Array.from(new Set(alerts.map(a => a.asesor)))];
  const prioridadesUnicas: FilterOption[] = [
    { value: "all", label: t.priorityAll },
    { value: "alta", label: t.priorityHigh },
    { value: "media", label: t.priorityMedium },
    { value: "baja", label: t.priorityLow },
  ];

  // Auto-play: detectar alertas críticas
  useEffect(() => {
    if (autoMode && criticas.length > 0 && !showAutoPlayModal) {
      const alertaMasUrgente = criticas.reduce((prev, curr) => 
        curr.tiempoRestante < prev.tiempoRestante ? curr : prev
      );
      setAutoPlayAlert(alertaMasUrgente);
      setShowAutoPlayModal(true);
    }
  }, [autoMode, criticas.length]);

  // ============================================
  // ACCIONES
  // ============================================
  const handleAction = async (action: string, alert: SLAAlert) => {
    setActionLoading(`${action}-${alert.id}`);
    
    try {
      switch (action) {
        case "whatsapp":
          const phone = alert.phone.replace(/[^0-9]/g, "");
          const message = encodeURIComponent(`Hola ${alert.leadName}, soy del equipo de atención. ¿En qué puedo ayudarte?`);
          window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
          await updateLeadStatus(alert, "contactado", "WhatsApp enviado");
          break;

        case "llamar":
          window.open(`tel:${alert.phone}`, "_self");
          await updateLeadStatus(alert, alert.etapa.toLowerCase(), "Llamada realizada");
          break;

        case "agendar":
          setAgendaAlert(alert);
          setShowAgendaModal(true);
          setActionLoading(null);
          return; // No refrescar aún

        case "resuelto":
          await updateLeadStatus(alert, "contactado", "Marcado como resuelto");
          // Remover de alertas localmente (no necesita recargar)
          setAlerts(prev => prev.filter(a => a.id !== alert.id));
          setSelectedAlert(null);
          setActionLoading(null);
          return; // Salir sin llamar fetchLeads

        case "reintentar":
          // Reenviar mensaje automático
          const phoneRetry = alert.phone.replace(/[^0-9]/g, "");
          const retryMsg = encodeURIComponent(`Hola ${alert.leadName}, queremos retomar tu consulta. ¿Sigues interesado?`);
          window.open(`https://wa.me/${phoneRetry}?text=${retryMsg}`, "_blank");
          await updateLeadStatus(alert, alert.etapa.toLowerCase(), "Mensaje reenviado");
          break;

        case "plantilla":
          const phoneDoc = alert.phone.replace(/[^0-9]/g, "");
          const templateMsg = encodeURIComponent(
            `Hola ${alert.leadName}, para continuar con tu solicitud necesitamos:\n\n` +
            `📄 DNI/NIE (ambas caras)\n` +
            `💰 Últimas 3 nóminas\n` +
            `🏦 Movimientos bancarios (3 meses)\n\n` +
            `¿Puedes enviarnos estos documentos?`
          );
          window.open(`https://wa.me/${phoneDoc}?text=${templateMsg}`, "_blank");
          await updateLeadStatus(alert, "documentacion", "Plantilla documentación enviada");
          break;

        case "tarea":
          setTaskAlert(alert);
          setShowTaskModal(true);
          setActionLoading(null);
          return; // No refrescar aún

        case "escalar":
          await updateLeadStatus(alert, alert.etapa.toLowerCase(), "ESCALADO - Requiere atención urgente");
          break;
      }

      await fetchLeads(false); // Recargar sin loading completo
    } finally {
      setActionLoading(null);
    }
  };

  const handleAgendaSubmit = async (fecha: string, hora: string) => {
    if (agendaAlert && fecha && hora) {
      setActionLoading(`agendar-${agendaAlert.id}`);
      await updateLeadStatus(agendaAlert, "interesado", `Cita agendada: ${fecha} ${hora}`);
      setShowAgendaModal(false);
      setAgendaAlert(null);
      await fetchLeads(false); // Recargar sin loading completo
      setActionLoading(null);
    }
  };

  const handleTaskSubmit = async (descripcion: string) => {
    if (taskAlert && descripcion) {
      setActionLoading(`tarea-${taskAlert.id}`);
      await updateLeadStatus(taskAlert, taskAlert.etapa.toLowerCase(), `Tarea: ${descripcion}`);
      setShowTaskModal(false);
      setTaskAlert(null);
      await fetchLeads(false); // Recargar sin loading completo
      setActionLoading(null);
    }
  };

  const updateLeadStatus = async (alertItem: SLAAlert, newStatus: string, action: string) => {
    try {
      const { error } = await supabase
        .from(alertItem.sourceTable)
        .update({ 
          status: newStatus,
          etapa: newStatus,
          next_action: action,
          siguiente_paso: action,
          notes: `[SLA ${new Date().toLocaleString()}] ${action}`,
          updated_at: new Date().toISOString()
        })
        .eq("id", alertItem.id);

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }
    } catch (err) {
      console.error("Error updating lead:", err);
    }
  };

  const handleAutoPlayExecute = async () => {
    if (autoPlayAlert) {
      // Ejecutar acciones automáticas
      await handleAction("whatsapp", autoPlayAlert);
      await updateLeadStatus(autoPlayAlert, "contactado", "Auto-play: WhatsApp + Tarea creada");
      
      setShowAutoPlayModal(false);
      setAutoPlayAlert(null);
      fetchLeads(false); // Recargar sin loading completo
    }
  };

  // ============================================
  // RENDER
  // ============================================
  if (loading) {
    return (
      <div style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0a0a0f 0%, #12121a 50%, #0d0d14 100%)",
      }}>
        <Loader2 className="animate-spin" size={40} color="#10b2cb" />
      </div>
    );
  }

  return (
    <div style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      background: "linear-gradient(135deg, #0a0a0f 0%, #12121a 50%, #0d0d14 100%)",
      color: "#e4e4e7",
      fontFamily: "'Inter', -apple-system, sans-serif",
      overflow: "hidden",
    }}>
      
      {/* HEADER */}
      <div style={{
        padding: "20px 24px",
        borderBottom: "1px solid var(--botz-border-soft)",
        background: "var(--botz-panel)",
        backdropFilter: "blur(10px)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #ef4444, #f97316)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <AlertTriangle size={20} color="#fff" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "var(--botz-text)" }}>
                {t.title}
              </h1>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--botz-muted)" }}>
                {filteredAlerts.length} {t.activeAlerts} • {criticas.length} {t.critical}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Botón Refrescar */}
            <button
              onClick={() => fetchLeads(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 12px",
                background: "var(--botz-surface-3)",
                border: "1px solid var(--botz-border)",
                borderRadius: "8px",
                color: "var(--botz-muted)",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              <RefreshCw size={14} />
              {t.refresh}
            </button>

            {/* Toggle Auto/Manual */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "8px 16px",
              background: autoMode ? "rgba(34, 197, 94, 0.15)" : "var(--botz-surface-3)",
              borderRadius: "10px",
              border: `1px solid ${autoMode ? "rgba(34, 197, 94, 0.3)" : "var(--botz-border)"}`,
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
            onClick={() => setAutoMode(!autoMode)}
            >
              <Zap size={16} color={autoMode ? "#22c55e" : "#71717a"} />
              <span style={{ fontSize: "13px", fontWeight: 600, color: autoMode ? "#22c55e" : "var(--botz-muted)" }}>
                {t.autoPlay}
              </span>
              <div style={{
                width: "36px",
                height: "20px",
                borderRadius: "10px",
                background: autoMode ? "#22c55e" : "var(--botz-border-strong)",
                position: "relative",
                transition: "all 0.3s ease",
              }}>
                <div style={{
                  width: "16px",
                  height: "16px",
                  borderRadius: "50%",
                  background: "#fff",
                  position: "absolute",
                  top: "2px",
                  left: autoMode ? "18px" : "2px",
                  transition: "all 0.3s ease",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                }} />
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <FilterSelect
            label={t.channel}
            value={filters.canal || "all"}
            options={canalesUnicos}
            onChange={(v) => setFilters(prev => ({ ...prev, canal: v }))}
          />
          <FilterSelect
            label={t.stage}
            value={filters.etapa || "all"}
            options={etapasUnicas}
            onChange={(v) => setFilters(prev => ({ ...prev, etapa: v }))}
          />
          <FilterSelect
            label={t.advisor}
            value={filters.asesor || "all"}
            options={asesoresUnicos}
            onChange={(v) => setFilters(prev => ({ ...prev, asesor: v }))}
          />
          <FilterSelect
            label={t.priority}
            value={filters.prioridad || "all"}
            options={prioridadesUnicas}
            onChange={(v) => setFilters(prev => ({ ...prev, prioridad: v }))}
          />
        </div>
      </div>

      {/* COLUMNAS */}
      <div style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: "16px",
        padding: "20px 24px",
        overflow: "hidden",
      }}>
        <SLAColumn
          title={t.criticalTitle}
          subtitle={t.criticalSubtitle}
          alerts={criticas}
          color="#ef4444"
          bgColor="rgba(239, 68, 68, 0.08)"
          borderColor="rgba(239, 68, 68, 0.2)"
          onSelectAlert={setSelectedAlert}
          onAction={handleAction}
          actionLoading={actionLoading}
        />

        <SLAColumn
          title={t.dueSoonTitle}
          subtitle={t.dueSoonSubtitle}
          alerts={porVencer}
          color="#f59e0b"
          bgColor="rgba(245, 158, 11, 0.08)"
          borderColor="rgba(245, 158, 11, 0.2)"
          onSelectAlert={setSelectedAlert}
          onAction={handleAction}
          actionLoading={actionLoading}
        />

        <SLAColumn
          title={t.watchTitle}
          subtitle={t.watchSubtitle}
          alerts={observacion}
          color="#3b82f6"
          bgColor="rgba(59, 130, 246, 0.08)"
          borderColor="rgba(59, 130, 246, 0.2)"
          onSelectAlert={setSelectedAlert}
          onAction={handleAction}
          actionLoading={actionLoading}
        />
      </div>

      {/* DRAWER LATERAL */}
      {selectedAlert && (
        <SLADrawer
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onAction={handleAction}
        />
      )}

      {/* MODAL AUTO-PLAY */}
      {showAutoPlayModal && autoPlayAlert && (
        <AutoPlayModal
          alert={autoPlayAlert}
          onClose={() => {
            setShowAutoPlayModal(false);
            setAutoPlayAlert(null);
          }}
          onExecute={handleAutoPlayExecute}
        />
      )}

      {/* MODAL AGENDAR CITA */}
      {showAgendaModal && agendaAlert && (
        <AgendaModal
          alert={agendaAlert}
          onClose={() => {
            setShowAgendaModal(false);
            setAgendaAlert(null);
          }}
          onSubmit={handleAgendaSubmit}
        />
      )}

      {/* MODAL CREAR TAREA */}
      {showTaskModal && taskAlert && (
        <TaskModal
          alert={taskAlert}
          onClose={() => {
            setShowTaskModal(false);
            setTaskAlert(null);
          }}
          onSubmit={handleTaskSubmit}
        />
      )}
    </div>
  );
}

// ============================================
// COMPONENTES AUXILIARES
// ============================================

function FilterSelect({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (v: string) => void;
}) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "6px 12px",
      background: "rgba(255,255,255,0.05)",
      borderRadius: "8px",
      border: "1px solid rgba(255,255,255,0.1)",
    }}>
      <span style={{ fontSize: "11px", color: "#71717a", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: "transparent",
          border: "none",
          color: "#e4e4e7",
          fontSize: "13px",
          fontWeight: 500,
          cursor: "pointer",
          outline: "none",
        }}
      >
        {options.map((opt) => {
          const o = typeof opt === "string" ? { value: opt, label: opt } : opt;
          return (
            <option key={o.value} value={o.value} style={{ background: "#1a1a2e", color: "#fff" }}>
              {o.label}
            </option>
          );
        })}
      </select>
    </div>
  );
}

function SLAColumn({ title, subtitle, alerts, color, bgColor, borderColor, onSelectAlert, onAction, actionLoading }: {
  title: string;
  subtitle: string;
  alerts: SLAAlert[];
  color: string;
  bgColor: string;
  borderColor: string;
  onSelectAlert: (alert: SLAAlert) => void;
  onAction: (action: string, alert: SLAAlert) => void;
  actionLoading: string | null;
}) {
  const t = SLA_TEXT[getUiLanguage()];
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      background: bgColor,
      borderRadius: "16px",
      border: `1px solid ${borderColor}`,
      overflow: "hidden",
    }}>
      <div style={{
        padding: "16px",
        borderBottom: `1px solid ${borderColor}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#fff" }}>{title}</h3>
          <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#71717a" }}>{subtitle}</p>
        </div>
        <div style={{
          padding: "4px 10px",
          background: color,
          borderRadius: "20px",
          fontSize: "12px",
          fontWeight: 700,
          color: "#fff",
        }}>
          {alerts.length}
        </div>
      </div>

      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "12px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}>
        {alerts.length === 0 ? (
          <div style={{
            padding: "40px 20px",
            textAlign: "center",
            color: "#52525b",
            fontSize: "13px",
          }}>
            {t.noAlerts}
          </div>
        ) : (
          alerts.map(alert => (
            <SLACard
              key={alert.id}
              alert={alert}
              color={color}
              onClick={() => onSelectAlert(alert)}
              onAction={onAction}
              actionLoading={actionLoading}
            />
          ))
        )}
      </div>
    </div>
  );
}

function SLACard({ alert, color, onClick, onAction, actionLoading }: {
  alert: SLAAlert;
  color: string;
  onClick: () => void;
  onAction: (action: string, alert: SLAAlert) => void;
  actionLoading: string | null;
}) {
  const t = SLA_TEXT[getUiLanguage()];
  const isOverdue = alert.tiempoRestante < 0;
  const timeDisplay = isOverdue
    ? `${t.overdueAgo} ${Math.abs(alert.tiempoRestante)} ${t.min}`
    : `${t.dueIn} ${alert.tiempoRestante} ${t.min}`;

  const priorityLabel =
    alert.prioridad === "alta"
      ? t.priorityHigh
      : alert.prioridad === "media"
        ? t.priorityMedium
        : t.priorityLow;

  return (
    <div
      onClick={onClick}
      style={{
        background: "rgba(0,0,0,0.4)",
        borderRadius: "12px",
        border: `1px solid ${isOverdue ? color : "rgba(255,255,255,0.1)"}`,
        padding: "14px",
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = `0 8px 24px ${color}20`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#fff" }}>{alert.leadName}</span>
            <span style={{
              fontSize: "10px",
              padding: "2px 6px",
              background: alert.prioridad === "alta" ? "#ef4444" : alert.prioridad === "media" ? "#f59e0b" : "#3b82f6",
              borderRadius: "4px",
              color: "#fff",
              fontWeight: 600,
              textTransform: "uppercase",
            }}>
              {priorityLabel}
            </span>
          </div>
          <div style={{ fontSize: "11px", color: "#71717a", marginTop: "2px" }}>
            {alert.etapa} • {alert.canal} • {alert.asesor}
          </div>
        </div>
        <ChevronRight size={16} color="#52525b" />
      </div>

      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "8px 10px",
        background: isOverdue ? "rgba(239, 68, 68, 0.15)" : "rgba(255,255,255,0.05)",
        borderRadius: "8px",
        marginBottom: "10px",
      }}>
        <Clock size={14} color={isOverdue ? "#ef4444" : "#f59e0b"} />
        <span style={{
          fontSize: "12px",
          fontWeight: 600,
          color: isOverdue ? "#ef4444" : "#f59e0b",
        }}>
          {timeDisplay}
        </span>
        <span style={{ fontSize: "11px", color: "#71717a", marginLeft: "auto" }}>
          {t.slaShort}: {alert.slaMinutos} {t.min}
        </span>
      </div>

      <div style={{
        fontSize: "12px",
        color: "#a1a1aa",
        marginBottom: "12px",
        display: "flex",
        alignItems: "center",
        gap: "6px",
      }}>
        <AlertTriangle size={12} color={color} />
        {alert.motivo}
      </div>

      <div style={{ display: "flex", gap: "6px" }} onClick={(e) => e.stopPropagation()}>
        <ActionButton 
          icon={<FaWhatsapp size={12} />} 
          label={t.actionWhatsapp}
          color="#25D366" 
          onClick={() => onAction("whatsapp", alert)} 
          loading={actionLoading === `whatsapp-${alert.id}`}
        />
        <ActionButton 
          icon={<FaPhone size={12} />} 
          label={t.actionCall}
          color="#3b82f6" 
          onClick={() => onAction("llamar", alert)} 
          loading={actionLoading === `llamar-${alert.id}`}
        />
        <ActionButton 
          icon={<FaCalendarAlt size={12} />} 
          label={t.actionSchedule}
          color="#8b5cf6" 
          onClick={() => onAction("agendar", alert)} 
          loading={actionLoading === `agendar-${alert.id}`}
        />
        <ActionButton 
          icon={<FaCheckCircle size={12} />} 
          label={t.actionResolved}
          color="#22c55e" 
          onClick={() => onAction("resuelto", alert)} 
          loading={actionLoading === `resuelto-${alert.id}`}
        />
      </div>
    </div>
  );
}

function ActionButton({ icon, label, color, onClick, loading = false }: {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      title={label}
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "4px",
        padding: "8px",
        background: loading ? `${color}10` : `${color}20`,
        border: `1px solid ${color}40`,
        borderRadius: "6px",
        color: color,
        fontSize: "10px",
        fontWeight: 600,
        cursor: loading ? "not-allowed" : "pointer",
        transition: "all 0.2s ease",
        opacity: loading ? 0.7 : 1,
      }}
      onMouseEnter={(e) => {
        if (!loading) e.currentTarget.style.background = `${color}40`;
      }}
      onMouseLeave={(e) => {
        if (!loading) e.currentTarget.style.background = `${color}20`;
      }}
    >
      {loading ? <Loader2 className="animate-spin" size={12} /> : icon}
    </button>
  );
}

function SLADrawer({ alert, onClose, onAction }: {
  alert: SLAAlert;
  onClose: () => void;
  onAction: (action: string, alert: SLAAlert) => void;
}) {
  const t = SLA_TEXT[getUiLanguage()];
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          zIndex: 100,
        }}
      />

      <div style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: "420px",
        background: "linear-gradient(180deg, #18181b 0%, #0f0f12 100%)",
        borderLeft: "1px solid rgba(255,255,255,0.1)",
        zIndex: 101,
        display: "flex",
        flexDirection: "column",
        animation: "slideIn 0.3s ease",
      }}>
        <div style={{
          padding: "20px",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#fff" }}>
              {alert.leadName}
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#71717a" }}>
              {alert.phone} • {alert.email || t.noEmail}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "rgba(255,255,255,0.1)",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={16} color="#fff" />
          </button>
        </div>

        <div style={{ padding: "20px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <InfoCard label={t.amount} value={alert.monto ? `€${alert.monto.toLocaleString()}` : "-"} icon={<TrendingUp size={14} />} />
            <InfoCard label={t.channel} value={alert.canal} icon={<User size={14} />} />
            <InfoCard label={t.dtiLabel} value={alert.dti ? `${alert.dti}%` : "-"} icon={<TrendingUp size={14} />} color={alert.dti && alert.dti > 40 ? "#ef4444" : "#22c55e"} />
            <InfoCard label={t.scoreLabel} value={alert.score ? `${alert.score}/100` : "-"} icon={<Zap size={14} />} color={alert.score && alert.score >= 70 ? "#22c55e" : "#f59e0b"} />
          </div>
        </div>

        <div style={{ flex: 1, padding: "20px", overflowY: "auto" }}>
          <h4 style={{ margin: "0 0 16px", fontSize: "13px", fontWeight: 600, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {t.informationTitle}
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", gap: "12px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#3b82f6", marginTop: "6px", flexShrink: 0 }} />
              <div>
                <p style={{ margin: 0, fontSize: "13px", color: "#e4e4e7" }}>{t.stage}: {alert.etapa}</p>
                <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#52525b" }}>{t.advisor}: {alert.asesor}</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b", marginTop: "6px", flexShrink: 0 }} />
              <div>
                <p style={{ margin: 0, fontSize: "13px", color: "#e4e4e7" }}>{alert.ultimoEvento}</p>
                <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#52525b" }}>
                  {alert.fechaCreacion.toLocaleDateString()} {alert.fechaCreacion.toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div style={{
          padding: "20px",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
        }}>
          <DrawerAction icon={<RefreshCw size={14} />} label={t.resendMessage} color="#f59e0b" onClick={() => onAction("reintentar", alert)} />
          <DrawerAction icon={<MessageSquare size={14} />} label={t.docTemplate} color="#3b82f6" onClick={() => onAction("plantilla", alert)} />
          <DrawerAction icon={<Calendar size={14} />} label={t.createTask} color="#8b5cf6" onClick={() => onAction("tarea", alert)} />
          <DrawerAction icon={<FaExclamationTriangle size={14} />} label={t.escalate} color="#ef4444" onClick={() => onAction("escalar", alert)} />
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}

function InfoCard({ label, value, icon, color = "#3b82f6" }: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <div style={{
      padding: "12px",
      background: "rgba(255,255,255,0.05)",
      borderRadius: "10px",
      border: "1px solid rgba(255,255,255,0.08)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
        <span style={{ color: "#52525b" }}>{icon}</span>
        <span style={{ fontSize: "11px", color: "#71717a", textTransform: "uppercase" }}>{label}</span>
      </div>
      <span style={{ fontSize: "16px", fontWeight: 700, color: color }}>{value}</span>
    </div>
  );
}

function DrawerAction({ icon, label, color, onClick }: {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        padding: "12px",
        background: `${color}15`,
        border: `1px solid ${color}30`,
        borderRadius: "10px",
        color: color,
        fontSize: "12px",
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = `${color}25`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = `${color}15`;
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function AutoPlayModal({ alert, onClose, onExecute }: {
  alert: SLAAlert;
  onClose: () => void;
  onExecute: () => void;
}) {
  const t = SLA_TEXT[getUiLanguage()];
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(8px)",
          zIndex: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "440px",
            background: "linear-gradient(180deg, #1f1f23 0%, #18181b 100%)",
            borderRadius: "20px",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            overflow: "hidden",
            boxShadow: "0 25px 50px rgba(0,0,0,0.5), 0 0 100px rgba(239, 68, 68, 0.1)",
            animation: "popIn 0.3s ease",
          }}
        >
          <div style={{
            padding: "24px",
            background: "linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(249, 115, 22, 0.1))",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            textAlign: "center",
          }}>
            <div style={{
              width: "56px",
              height: "56px",
              margin: "0 auto 16px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #ef4444, #f97316)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "pulse 2s infinite",
            }}>
              <Zap size={28} color="#fff" />
            </div>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#fff" }}>
              {t.autoPlayActivatedTitle}
            </h2>
            <p style={{ margin: "8px 0 0", fontSize: "13px", color: "#a1a1aa" }}>
              {t.autoPlayActivatedDesc}
            </p>
          </div>

          <div style={{ padding: "24px" }}>
            <div style={{
              padding: "16px",
              background: "rgba(239, 68, 68, 0.1)",
              borderRadius: "12px",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              marginBottom: "20px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "15px", fontWeight: 600, color: "#fff" }}>{alert.leadName}</span>
                <span style={{
                  padding: "4px 8px",
                  background: "#ef4444",
                  borderRadius: "6px",
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#fff",
                }}>
                  {alert.tiempoRestante < 0
                    ? `${t.overdueTag} ${Math.abs(alert.tiempoRestante)} ${t.min}`
                    : `${t.dueTag} ${alert.tiempoRestante} ${t.min}`}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: "#a1a1aa" }}>
                {alert.motivo} • {alert.etapa} • {alert.canal}
              </p>
            </div>

            <h4 style={{ margin: "0 0 12px", fontSize: "12px", fontWeight: 600, color: "#71717a", textTransform: "uppercase" }}>
              {t.suggestedActions}
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
              <SuggestedAction icon={<FaWhatsapp />} text={t.suggestedWhatsapp} />
              <SuggestedAction icon={<FaCalendarAlt />} text={t.suggestedUpdateContacted} />
              <SuggestedAction icon={<FaCheckCircle />} text={t.suggestedLogAction} />
            </div>
          </div>

          <div style={{
            padding: "20px 24px",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            gap: "12px",
          }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: "14px",
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "10px",
                color: "#a1a1aa",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t.ignore}
            </button>
            <button
              onClick={onExecute}
              style={{
                flex: 2,
                padding: "14px",
                background: "linear-gradient(135deg, #22c55e, #16a34a)",
                border: "none",
                borderRadius: "10px",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: "0 4px 15px rgba(34, 197, 94, 0.3)",
              }}
            >
              <FaPlay size={12} />
              {t.executeAll}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes popIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          50% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
        }
      `}</style>
    </>
  );
}

function SuggestedAction({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "10px",
      padding: "10px 12px",
      background: "rgba(255,255,255,0.05)",
      borderRadius: "8px",
      fontSize: "13px",
      color: "#e4e4e7",
    }}>
      <span style={{ color: "#22c55e" }}>{icon}</span>
      {text}
    </div>
  );
}

// ============================================
// MODAL AGENDAR CITA
// ============================================
function AgendaModal({ alert, onClose, onSubmit }: {
  alert: SLAAlert;
  onClose: () => void;
  onSubmit: (fecha: string, hora: string) => void;
}) {
  const t = SLA_TEXT[getUiLanguage()];
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!fecha || !hora) return;
    setLoading(true);
    await onSubmit(fecha, hora);
    setLoading(false);
  };

  // Generar fecha mínima (hoy)
  const today = new Date().toISOString().split('T')[0];

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(8px)",
          zIndex: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "400px",
            background: "linear-gradient(180deg, #1f1f23 0%, #18181b 100%)",
            borderRadius: "20px",
            border: "1px solid rgba(139, 92, 246, 0.3)",
            overflow: "hidden",
            boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
            animation: "popIn 0.3s ease",
          }}
        >
          {/* Header */}
          <div style={{
            padding: "24px",
            background: "linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(59, 130, 246, 0.1))",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #8b5cf6, #3b82f6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Calendar size={22} color="#fff" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#fff" }}>
                  {t.scheduleAppointmentTitle}
                </h2>
                <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#a1a1aa" }}>
                  {alert.leadName}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#71717a", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {t.dateLabel}
              </label>
              <input
                type="date"
                value={fecha}
                min={today}
                onChange={(e) => setFecha(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "10px",
                  color: "#fff",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#71717a", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {t.timeLabel}
              </label>
              <input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "10px",
                  color: "#fff",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
            </div>

            {/* Quick options */}
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#71717a", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {t.quickTimes}
              </label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {["09:00", "10:00", "11:00", "12:00", "16:00", "17:00", "18:00"].map(h => (
                  <button
                    key={h}
                    onClick={() => setHora(h)}
                    style={{
                      padding: "8px 12px",
                      background: hora === h ? "#8b5cf6" : "rgba(255,255,255,0.05)",
                      border: `1px solid ${hora === h ? "#8b5cf6" : "rgba(255,255,255,0.1)"}`,
                      borderRadius: "8px",
                      color: hora === h ? "#fff" : "#a1a1aa",
                      fontSize: "12px",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: "20px 24px",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            gap: "12px",
          }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: "12px",
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "10px",
                color: "#a1a1aa",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t.cancel}
            </button>
            <button
              onClick={handleSubmit}
              disabled={!fecha || !hora || loading}
              style={{
                flex: 2,
                padding: "12px",
                background: (!fecha || !hora) ? "#3f3f46" : "linear-gradient(135deg, #8b5cf6, #3b82f6)",
                border: "none",
                borderRadius: "10px",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 700,
                cursor: (!fecha || !hora) ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                opacity: (!fecha || !hora) ? 0.5 : 1,
              }}
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Calendar size={16} />}
              {loading ? t.saving : t.confirmAppointment}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes popIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </>
  );
}

// ============================================
// MODAL CREAR TAREA
// ============================================
function TaskModal({ alert, onClose, onSubmit }: {
  alert: SLAAlert;
  onClose: () => void;
  onSubmit: (descripcion: string) => void;
}) {
  const t = SLA_TEXT[getUiLanguage()];
  const [descripcion, setDescripcion] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!descripcion.trim()) return;
    setLoading(true);
    await onSubmit(descripcion);
    setLoading(false);
  };

  const quickTasks = t.quickTasksItems;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(8px)",
          zIndex: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "420px",
            background: "linear-gradient(180deg, #1f1f23 0%, #18181b 100%)",
            borderRadius: "20px",
            border: "1px solid rgba(59, 130, 246, 0.3)",
            overflow: "hidden",
            boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
            animation: "popIn 0.3s ease",
          }}
        >
          {/* Header */}
          <div style={{
            padding: "24px",
            background: "linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(16, 185, 129, 0.1))",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #3b82f6, #10b981)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <FaCalendarAlt size={20} color="#fff" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#fff" }}>
                   {t.createTask}
                </h2>
                <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#a1a1aa" }}>
                  {alert.leadName}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#71717a", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {t.taskDescription}
              </label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder={t.taskPlaceholder}
                rows={3}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "10px",
                  color: "#fff",
                  fontSize: "14px",
                  outline: "none",
                  resize: "none",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* Quick tasks */}
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#71717a", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {t.quickTasks}
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {quickTasks.map(task => (
                  <button
                    key={task}
                    onClick={() => setDescripcion(task)}
                    style={{
                      padding: "10px 14px",
                      background: descripcion === task ? "rgba(59, 130, 246, 0.2)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${descripcion === task ? "rgba(59, 130, 246, 0.4)" : "rgba(255,255,255,0.08)"}`,
                      borderRadius: "8px",
                      color: descripcion === task ? "#3b82f6" : "#a1a1aa",
                      fontSize: "13px",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.2s",
                    }}
                  >
                    {task}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: "20px 24px",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            gap: "12px",
          }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: "12px",
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "10px",
                color: "#a1a1aa",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t.cancel}
            </button>
            <button
              onClick={handleSubmit}
              disabled={!descripcion.trim() || loading}
              style={{
                flex: 2,
                padding: "12px",
                background: !descripcion.trim() ? "#3f3f46" : "linear-gradient(135deg, #3b82f6, #10b981)",
                border: "none",
                borderRadius: "10px",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 700,
                cursor: !descripcion.trim() ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                opacity: !descripcion.trim() ? 0.5 : 1,
              }}
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <FaCheckCircle size={16} />}
              {loading ? t.saving : t.createTask}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes popIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </>
  );
}
