"use client";
import React, { useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "./supabaseClient";
import LeadDetailsDrawer from "./LeadDetailsDrawer";
import AsignarAsesor from "./Asignarasesor";
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
  initialLeads = [],
  session,
  globalFilter,
}: {
  initialLeads: Lead[];
  session: any;
  globalFilter?: string | null;
}) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const safeLeads = leads || [];

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

  const normalizeStatus = (status: string | null | undefined) => {
    if (!status) return "NUEVO";
    const s = status.toUpperCase().trim();
    if (s === "") return "NUEVO";
    return s;
  };

  // ✅ IMPORTANTE: async para poder usar await
  const handleSaveLead = async () => {
    setLeadModalError(null);

    if (!formName.trim()) {
      setLeadModalError("El nombre es obligatorio.");
      return;
    }
    if (!formPhone.trim()) {
      setLeadModalError("El teléfono es obligatorio.");
      return;
    }

    setLeadModalLoading(true);

    try {
      const payload: any = {
        name: formName.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim(),
        status: normalizeStatus(formStatus),
        next_action: formNextAction || "",
        calificacion: formCalificacion || "",
        origen: "manual",
      };

      if (session?.user?.id) payload.user_id = session.user.id;
      if (safeTenantId) payload.tenant_id = safeTenantId;

      const { data, error } = await supabase
        .from("leads")
        .insert([payload])
        .select("*")
        .single();

      if (error) throw error;

      if (data) {
        setLeads((prev) => [data as Lead, ...prev]);

        // Log opcional (si la tabla existe)
        try {
          await supabase.from("lead_logs").insert([
            {
              lead_id: (data as any).id,
              type: "system",
              text: "Lead creado manualmente desde CRM",
              user_name: "Sistema",
            },
          ]);
        } catch (e) {
          console.warn("lead_logs insert skipped:", e);
        }
      }

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
      alert("Este registro no pertenece a la tabla leads. No se puede eliminar desde aquí.");
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



  const stickyRightTh: React.CSSProperties = {
    minWidth: 220,
    padding: "12px 14px",
    textAlign: "left",
    whiteSpace: "nowrap",
  };
  const stickyRightTd: React.CSSProperties = {
    minWidth: 220,
    padding: "12px 14px",
    verticalAlign: "middle",
  };

  const filteredLeads = safeLeads.filter((lead) => {
    const s = searchTerm.toLowerCase();
    const matchesSearch =
      (lead.name && lead.name.toLowerCase().includes(s)) ||
      (lead.email && lead.email.toLowerCase().includes(s));

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

  const handleUpdate = async (id: string, field: string, value: string) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
    const { error } = await supabase.from("leads").update({ [field]: value }).eq("id", id);
    if (error) console.error("Error saving:", error);

    if (field === "status" || field === "calificacion" || field === "next_action") {
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
      case "NO INTERESADO":
        return { bg: "rgba(100, 116, 139, 0.2)", text: "#94a3b8", border: "#64748b" };
      case "NO CONVERTIDO":
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
                <Zap size={14} fill="#22d3ee" /> Canal: {globalFilter}
              </div>
            )}

            <div style={{ position: "relative", flex: 1, minWidth: "180px" }}>
              <Search size={18} color="#94a3b8" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="text"
                placeholder="Buscar cliente..."
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
                ⭐ Todos los Estados
              </option>
              <option value="NUEVO" style={{ background: "#0f172a", color: "#60a5fa" }}>
                🔵 Nuevo
              </option>
              <option value="SEGUIMIENTO" style={{ background: "#0f172a", color: "#fbbf24" }}>
                🟡 Seguimiento
              </option>
              <option value="CONVERTIDO" style={{ background: "#0f172a", color: "#34d399" }}>
                🟢 Convertido
              </option>
              <option value="FIRMADO" style={{ background: "#0f172a", color: "#34d399" }}>
                🟢 Firmado
              </option>
              <option value="NO CONVERTIDO" style={{ background: "#0f172a", color: "#f87171" }}>
                🔴 No Convertido
              </option>
              <option value="NO INTERESADO" style={{ background: "#0f172a", color: "#f87171" }}>
                🔴 No interesado
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
              <Plus size={16} /> Nuevo Lead
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
                <Upload size={16} /> Cargar
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
              <Download size={16} /> Exportar
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: "16px", marginBottom: "16px", fontSize: "12px", color: "#64748b", alignItems: "center" }}>
          <span>
            Mostrando <strong style={{ color: "#22d3ee" }}>{filteredLeads.length}</strong> de {safeLeads.length} leads
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
              ✕ Limpiar filtros
            </button>
          )}
        </div>

        <div style={{ overflowX: "auto", overflowY: "visible", maxWidth: "100%", paddingBottom: "150px", position: "relative" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", color: "#cbd5e1", tableLayout: "fixed", minWidth: "1240px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", textAlign: "left" }}>
                <th style={{ padding: "12px 10px", color: "#94a3b8", whiteSpace: "nowrap", width: "240px" }}>ANÁLISIS BOTZ</th>
                <th style={{ padding: "12px 10px", color: "#94a3b8", whiteSpace: "nowrap", width: "220px" }}>NOMBRE / EMAIL</th>
                <th style={{ padding: "12px 10px", color: "#94a3b8", whiteSpace: "nowrap", width: "120px" }}>TELÉFONO</th>
                <th style={{ padding: "12px 10px", color: "#94a3b8", whiteSpace: "nowrap", width: "140px" }}>ESTADO</th>
                <th style={{ padding: "12px 10px", color: "#94a3b8", whiteSpace: "nowrap", width: "140px" }}>PRÓXIMA ACCIÓN</th>
                <th style={{ padding: "12px 10px", color: "#94a3b8", whiteSpace: "nowrap", width: "140px" }}>CALIFICACIÓN</th>
                <th style={{ ...stickyRightTh, padding: "12px 10px", color: "#94a3b8", whiteSpace: "nowrap", width: "140px" }}>ASESOR</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => {
                const cleanStatus = normalizeStatus(lead.status);
                const statusStyles = getStatusColor(cleanStatus);
                const calificacionStyles = getCalificacionColor(lead.calificacion);

                return (
                  <tr
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "pointer" }}
                    onMouseEnter={(e) => ((e.currentTarget.style.background = "rgba(255,255,255,0.02)"))}
                    onMouseLeave={(e) => ((e.currentTarget.style.background = "transparent"))}
                  >
                    <td style={{ padding: "12px 10px", whiteSpace: "nowrap", width: "240px", maxWidth: "240px", overflow: "hidden" }}>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "nowrap", overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
                        <button type="button"
                          onClick={() => setSelectedLead(lead)}
                          title="Ver Resumen y Cálculo Botz"
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
                          <Bot size={14} /> Ver Análisis Botz
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
                          title="Eliminar lead"
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

                    <td style={{ ...stickyRightTd, padding: "12px 10px" }} onClick={(e) => e.stopPropagation()}>
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
                        <option value="NUEVO" style={{ background: "#0f172a" }}>🔵 NUEVO</option>
                        <option value="SEGUIMIENTO" style={{ background: "#0f172a" }}>🟡 SEGUIMIENTO</option>
                        <option value="CONVERTIDO" style={{ background: "#0f172a" }}>🟢 CONVERTIDO</option>
                        <option value="FIRMADO" style={{ background: "#0f172a" }}>🟢 FIRMADO</option>
                        <option value="NO CONVERTIDO" style={{ background: "#0f172a" }}>🔴 NO CONVERTIDO</option>
                      </select>
                    </td>

                    <td style={{ ...stickyRightTd, padding: "12px 10px" }} onClick={(e) => e.stopPropagation()}>
                      <select
                        value={lead.next_action || ""}
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
                        <option value="" style={{ background: "#0f172a" }}>-- Acción --</option>
                        <option value="Llamar hoy" style={{ background: "#0f172a" }}>📞 Llamar hoy</option>
                        <option value="Enviar WhatsApp" style={{ background: "#0f172a" }}>💬 Enviar WhatsApp</option>
                        <option value="Enviar Email" style={{ background: "#0f172a" }}>📧 Enviar Email</option>
                        <option value="Agendar Reunión" style={{ background: "#0f172a" }}>📅 Agendar Reunión</option>
                        <option value="Finalizado" style={{ background: "#0f172a" }}>✔️ Finalizado</option>
                      </select>
                    </td>

                    <td style={{ ...stickyRightTd, padding: "12px 10px" }} onClick={(e) => e.stopPropagation()}>
                      <select
                        value={lead.calificacion || ""}
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
                        <option value="" style={{ background: "#0f172a" }}>📝 Pendiente</option>
                        <option value="Caliente" style={{ background: "#0f172a" }}>🔥 Caliente</option>
                        <option value="Tibio" style={{ background: "#0f172a" }}>🧐 Tibio</option>
                        <option value="Frio" style={{ background: "#0f172a" }}>❄️ Frío</option>
                        <option value="Sin Respuesta" style={{ background: "#0f172a" }}>📵 Sin Respuesta</option>
                      </select>
                    </td>

                    <td style={{ ...stickyRightTd, padding: "12px 10px" }} onClick={(e) => e.stopPropagation()}>
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

          {filteredLeads.length === 0 && (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
              {globalFilter ? `No se encontraron leads del canal: ${globalFilter}` : "No hay leads con los filtros seleccionados."}
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
                <span style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 17 }}>Crear Lead</span>
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
                    Nombre *
                  </label>
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ej: Juan Pérez"
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
                    Email
                  </label>
                  <input
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="Ej: juan@email.com"
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
                    Teléfono *
                  </label>
                  <input
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="Ej: +34 612 345 678"
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
                      <option value="NUEVO" style={{ background: "#0f172a" }}>🔵 NUEVO</option>
                      <option value="SEGUIMIENTO" style={{ background: "#0f172a" }}>🟡 SEGUIMIENTO</option>
                      <option value="CONVERTIDO" style={{ background: "#0f172a" }}>🟢 CONVERTIDO</option>
                      <option value="FIRMADO" style={{ background: "#0f172a" }}>🟢 FIRMADO</option>
                      <option value="NO CONVERTIDO" style={{ background: "#0f172a" }}>🔴 NO CONVERTIDO</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600, marginBottom: 6, display: "block" }}>
                      Calificación
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
                      <option value="" style={{ background: "#0f172a" }}>📝 Pendiente</option>
                      <option value="Caliente" style={{ background: "#0f172a" }}>🔥 Caliente</option>
                      <option value="Tibio" style={{ background: "#0f172a" }}>🧐 Tibio</option>
                      <option value="Frio" style={{ background: "#0f172a" }}>❄️ Frío</option>
                      <option value="Sin Respuesta" style={{ background: "#0f172a" }}>📵 Sin Respuesta</option>
                    </select>
                  </div>
                </div>

                {/* Próxima acción */}
                <div>
                  <label style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600, marginBottom: 6, display: "block" }}>
                    Próxima acción
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
                    <option value="" style={{ background: "#0f172a" }}>-- Acción --</option>
                    <option value="Llamar hoy" style={{ background: "#0f172a" }}>📞 Llamar hoy</option>
                    <option value="Enviar WhatsApp" style={{ background: "#0f172a" }}>💬 Enviar WhatsApp</option>
                    <option value="Enviar Email" style={{ background: "#0f172a" }}>📧 Enviar Email</option>
                    <option value="Agendar Reunión" style={{ background: "#0f172a" }}>📅 Agendar Reunión</option>
                    <option value="Finalizado" style={{ background: "#0f172a" }}>✔️ Finalizado</option>
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
                Cancelar
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
                {leadModalLoading ? "Guardando..." : "Guardar"}
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
                <span style={{ fontWeight: 700, color: "#fecaca", fontSize: 17 }}>Eliminar Lead</span>
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
                Cancelar
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
                {deleteLoading ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}