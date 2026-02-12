"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { Lead } from "./LeadsTable";
import { useAuth } from "../MainLayout";
import { 
  MoreHorizontal, MessageCircle, Phone, 
  DollarSign, Calendar, MoreVertical,
  Pencil, Trash2, History, X, Plus, Clock 
} from "lucide-react";

type AppLanguage = "es" | "en";

const KANBAN_TEXT: Record<
  AppLanguage,
  {
    loadingBoard: string;
    rename: string;
    deleteStage: string;
    deleteLead: string;
    newStage: string;
    deleteStageQuestion: string;
    deleteStageConfirm: (title?: string) => string;
    irreversible: string;
    delete: string;
    save: string;
  }
> = {
  es: {
    loadingBoard: "Cargando Tablero...",
    rename: "Cambiar nombre",
    deleteStage: "Eliminar etapa",
    deleteLead: "Eliminar lead",
    newStage: "Nueva Etapa",
    deleteStageQuestion: "¿Eliminar etapa?",
    deleteStageConfirm: (title) => `¿Eliminar \"${title || ""}\"?`,
    irreversible: "Esta acción no se puede deshacer.",
    delete: "Eliminar",
    save: "Guardar",
  },
  en: {
    loadingBoard: "Loading board...",
    rename: "Rename",
    deleteStage: "Delete stage",
    deleteLead: "Delete lead",
    newStage: "New Stage",
    deleteStageQuestion: "Delete stage?",
    deleteStageConfirm: (title) => `Delete \"${title || ""}\"?`,
    irreversible: "This action cannot be undone.",
    delete: "Delete",
    save: "Save",
  },
};

// COLUMNAS BASE (Se usan solo la primera vez)
const BASE_COLUMNS = [
  { id: "NUEVO", title: "🆕 Nuevo Lead", color: "#64748b", base: true },
  { id: "CONTACTADO", title: "📞 Contactado", color: "#3b82f6", base: true },
  { id: "DOCUMENTACIÓN", title: "📂 Documentación", color: "#f59e0b", base: true },
  { id: "PRE-APROBADO", title: "✅ Pre-Aprobado", color: "#8b5cf6", base: true },
  { id: "FIRMADO", title: "🏆 Firmado (Venta)", color: "#10b981", base: true }
];

type Column = { id: string; title: string; color: string; base?: boolean };

function normalizeColumnId(input: string) {
  const cleaned = (input || "").trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return cleaned.replace(/[^A-Z0-9 ]+/g, "").replace(/\s+/g, "_") || "NUEVA_COLUMNA";
}

export default function KanbanBoard({ globalFilter }: { globalFilter?: string | null }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, isAsesor, teamMemberId, tenantId: authTenantId, loading: authLoading, triggerDataRefresh } = useAuth();
  const [language, setLanguage] = useState<AppLanguage>("es");
  const [resolvedTeamMemberId, setResolvedTeamMemberId] = useState<string | null>(teamMemberId || null);
  const t = KANBAN_TEXT[language];

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
  
  console.log('[Kanban] 🔄 Component rendered, user:', user?.email, 'isAsesor:', isAsesor);

  // UI States para Menús
  const [activeMenuColId, setActiveMenuColId] = useState<string | null>(null);
  const [activeMenuLeadId, setActiveMenuLeadId] = useState<string | null>(null);

  // Estados para Modales Profesionales
  const [modalEditCol, setModalEditCol] = useState<{id: string, title: string} | null>(null);
  const [modalDeleteCol, setModalDeleteCol] = useState<Column | null>(null);
  const [showAddCol, setShowAddCol] = useState(false);
  const [newColTitle, setNewColTitle] = useState("");

  // Estado para Modal de Historial
  const [historyLead, setHistoryLead] = useState<Lead | null>(null);
  const [leadLogs, setLeadLogs] = useState<any[]>([]);

  // 1. CARGAR DATOS (filtrado por tenant_id y rol)
  const [tenantId, setTenantId] = useState<string | null>(authTenantId || null);
  const [tenantResolved, setTenantResolved] = useState(false);

  useEffect(() => {
    const resolveTenant = async () => {
      if (authLoading) return;

      try {
        // 1) Preferir lo que ya resolvio el AuthProvider (team_members)
        if (authTenantId) {
          setTenantId(authTenantId);
        }

        if (teamMemberId) {
          setResolvedTeamMemberId(teamMemberId);
        }

        // 2) Fallback: JWT metadata
        if (!authTenantId) {
          const { data: { session } } = await supabase.auth.getSession();
          const tid =
            session?.user?.user_metadata?.tenant_id ||
            session?.user?.app_metadata?.tenant_id ||
            null;
          console.log('[Kanban] 🎯 Tenant ID resolved (metadata):', tid);
          if (tid) setTenantId(tid);
        }

        // 3) Fallback final (clave para asesores): resolver desde team_members
        // Esto evita quedarse pegado en "Cargando" si no existe tenant_id en metadata.
        if (isAsesor && (!authTenantId || !teamMemberId)) {
          const authUserId = user?.id || null;
          const authEmail = user?.email || null;

          if (authUserId) {
            const { data: tmByAuth } = await supabase
              .from('team_members')
              .select('id, tenant_id')
              .eq('auth_user_id', authUserId)
              .eq('activo', true)
              .maybeSingle();

            const fallbackTeamMemberId = tmByAuth?.id || null;
            const fallbackTenantId = tmByAuth?.tenant_id || null;

            if (fallbackTeamMemberId) setResolvedTeamMemberId(fallbackTeamMemberId);
            if (fallbackTenantId) setTenantId(fallbackTenantId);
          }

          if ((!resolvedTeamMemberId || !tenantId) && authEmail) {
            const { data: tmByEmail } = await supabase
              .from('team_members')
              .select('id, tenant_id')
              .eq('email', authEmail)
              .eq('activo', true)
              .maybeSingle();

            const fallbackTeamMemberId = tmByEmail?.id || null;
            const fallbackTenantId = tmByEmail?.tenant_id || null;

            if (fallbackTeamMemberId) setResolvedTeamMemberId(fallbackTeamMemberId);
            if (fallbackTenantId) setTenantId(fallbackTenantId);
          }
        }
      } catch (e) {
        console.error('[Kanban] ❌ Error resolviendo tenant/teamMember:', e);
      } finally {
        setTenantResolved(true);
      }
    };

    resolveTenant();
  }, [authLoading, authTenantId, isAsesor, teamMemberId, user?.id, user?.email]);

  useEffect(() => {
    if (tenantResolved && !authLoading) {
      fetchLeads(false);
    }
  }, [globalFilter, tenantResolved, authLoading, isAsesor, resolvedTeamMemberId, tenantId]);

const fetchLeads = async (silent: boolean) => {
    console.log('[Kanban] 🚀 fetchLeads started, silent:', silent);
    if (!silent) setLoading(true);
    
    try {
      console.log('[Kanban] 📡 Fetching leads for tenant:', tenantId, 'isAsesor:', isAsesor, 'teamMemberId:', resolvedTeamMemberId);
      if (isAsesor && !resolvedTeamMemberId) {
        console.warn('[Kanban] ⚠️ Asesor sin teamMemberId, no se consultan leads');
        setLeads([]);
        return;
      }

      let query = supabase.from("leads").select("*");
      
      // Filtrar por tenant
      if (tenantId) {
        console.log('[Kanban] ✅ Adding tenant_id filter:', tenantId);
        query = query.eq("tenant_id", tenantId);
      } else {
        console.warn('[Kanban] ⚠️ NO tenant_id found!');
      }
      
      // Si es asesor, filtrar solo sus leads asignados
      if (isAsesor && resolvedTeamMemberId) {
        console.log('[Kanban] 👤 Asesor detectado, filtrando por asesor_id/assigned_to:', resolvedTeamMemberId);
        query = query.or(`asesor_id.eq.${resolvedTeamMemberId},assigned_to.eq.${resolvedTeamMemberId}`);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[Kanban] ❌ Error fetching leads:', error);
      } else {
        console.log('[Kanban] ✅ Query succeeded, leads count:', data?.length || 0);
      }
      
      if (data) {
        const rows = data as Lead[];
        const filteredRows = globalFilter
          ? rows.filter((lead: any) => {
              const source = String(lead?.source || lead?.origen || '').toLowerCase();
              return source.includes(globalFilter.toLowerCase());
            })
          : rows;

        console.log('[Kanban] 📊 Setting', filteredRows.length, 'leads to state');
        setLeads(filteredRows);
      }
    } catch (err) {
      console.error('[Kanban] 💥 Exception in fetchLeads:', err);
    } finally {
      console.log('[Kanban] 🏁 Setting loading to false');
      setLoading(false);
    }
  };

  // ✅ PERSISTENCIA CORREGIDA: Solo carga BASE_COLUMNS si el localStorage está vacío
  useEffect(() => {
    try {
      const raw = localStorage.getItem("botz_kanban_custom_columns_v1");
      if (raw) {
        const savedColumns = JSON.parse(raw) as Column[];
        if (savedColumns.length > 0) {
          setColumns(savedColumns);
        } else {
          setColumns(BASE_COLUMNS);
        }
      } else {
        setColumns(BASE_COLUMNS);
      }
    } catch (e) {
      setColumns(BASE_COLUMNS);
    }
  }, []);

  // ✅ GUARDADO CORREGIDO: Guarda la lista completa (incluyendo eliminaciones)
  useEffect(() => {
    if (columns.length > 0) {
      localStorage.setItem("botz_kanban_custom_columns_v1", JSON.stringify(columns));
    }
  }, [columns]);

  // 2. LÓGICA DE HISTORIAL
  const openHistory = async (lead: Lead) => {
    setHistoryLead(lead);
    setActiveMenuLeadId(null);
    const { data } = await supabase
      .from("lead_logs")
      .select("*")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false });
    if (data) setLeadLogs(data);
  };

  // 3. ACCIONES DE COLUMNA
  const addColumn = () => {
    if (!newColTitle.trim()) return;
    const id = normalizeColumnId(newColTitle);
    if (columns.some(c => c.id === id)) return;
    setColumns([...columns, { id, title: newColTitle, color: "#8b5cf6", base: false }]);
    setNewColTitle(""); setShowAddCol(false);
  };

  const confirmRenameCol = () => {
    if (!modalEditCol) return;
    setColumns(prev => prev.map(c => c.id === modalEditCol.id ? { ...c, title: modalEditCol.title } : c));
    setModalEditCol(null); setActiveMenuColId(null);
  };

  const confirmDeleteCol = async () => {
    if (!modalDeleteCol) return;
    const leadsInColumn = leads.filter((l) => (l.status || "NUEVO").toUpperCase() === modalDeleteCol.id);
    if (leadsInColumn.length > 0) {
      const leadIds = leadsInColumn.map((l) => l.id);
      setLeads((prev) => prev.map((l) => (leadIds.includes(l.id) ? { ...l, status: "NUEVO" } : l)));

      const { error } = await supabase
        .from("leads")
        .update({ status: "NUEVO", updated_at: new Date().toISOString() })
        .in("id", leadIds);

      if (error) {
        console.error('[Kanban] ❌ Error devolviendo leads a NUEVO:', error);
        await fetchLeads(false);
        alert('No se pudo guardar el cambio de estado. Revisa permisos de este usuario.');
        return;
      }

      triggerDataRefresh();
    }
    setColumns(prev => prev.filter(c => c.id !== modalDeleteCol.id));
    setModalDeleteCol(null); setActiveMenuColId(null);
  };

  // 4. DRAG & DROP
  const onDragStart = (e: React.DragEvent, lead: Lead) => {
    setDraggedLead(lead);
    e.dataTransfer.setData("text/plain", lead.id);
  };

  const onDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    if (!draggedLead) return;

    const previousStatus = draggedLead.status || "NUEVO";

    setLeads((prev) => prev.map((l) => (l.id === draggedLead.id ? { ...l, status: targetStatus } : l)));

    const { error: updateError } = await supabase
      .from("leads")
      .update({ status: targetStatus, updated_at: new Date().toISOString() })
      .eq("id", draggedLead.id);

    if (updateError) {
      console.error('[Kanban] ❌ Error actualizando estado:', updateError);
      setLeads((prev) => prev.map((l) => (l.id === draggedLead.id ? { ...l, status: previousStatus } : l)));
      alert('No se pudo guardar el cambio de estado. Revisa permisos del asesor sobre este lead.');
      setDraggedLead(null);
      return;
    }

    try {
      await supabase.from("lead_logs").insert([
        {
          lead_id: draggedLead.id,
          type: "status",
          text: `Cambio de estado en Kanban: ${String(previousStatus).toUpperCase()} → ${String(targetStatus).toUpperCase()}`,
          user_name: user?.email || "Sistema",
        },
      ]);
    } catch (logError) {
      console.warn('[Kanban] ⚠️ No se pudo insertar en bitácora lead_logs:', logError);
    }

    triggerDataRefresh();
    setDraggedLead(null);
  };

  const deleteLead = async (lead: Lead) => {
    setLeads(prev => prev.filter(l => l.id !== lead.id));
    await supabase.from("leads").delete().eq("id", lead.id);
    setActiveMenuLeadId(null);
  };

  const formatMoney = (amount?: number) => {
    if (!amount) return "$0";
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(amount);
  };

  if (loading && leads.length === 0) return <div style={{ padding: "40px", color: "var(--botz-muted)", textAlign: "center" }}>{t.loadingBoard}</div>;

  return (
    <div onClick={() => { setActiveMenuLeadId(null); setActiveMenuColId(null); }} style={{ display: "flex", gap: "16px", overflowX: "auto", paddingBottom: "20px", height: "calc(100vh - 200px)", alignItems: "flex-start" }}>
      {columns.map((col) => {
        const colLeads = leads.filter(l => (l.status || "NUEVO").toUpperCase() === col.id);
        return (
          <div key={col.id} onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, col.id)} style={{ minWidth: "280px", maxWidth: "280px", background: "var(--botz-panel)", border: "1px solid var(--botz-border-soft)", borderRadius: "16px", display: "flex", flexDirection: "column", height: "100%", backdropFilter: "blur(10px)" }}>
            
            <div style={{ padding: "16px", borderBottom: "1px solid var(--botz-border-soft)", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: col.color }} />
                <span style={{ fontWeight: "bold", color: "var(--botz-text)", fontSize: "13px" }}>{col.title}</span>
                <span style={{ background: "var(--botz-surface-3)", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", color: "var(--botz-muted)" }}>{colLeads.length}</span>
              </div>
              <MoreVertical size={16} color="var(--botz-muted-2)" style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); setActiveMenuColId(activeMenuColId === col.id ? null : col.id); }} />
              
              {activeMenuColId === col.id && (
                <div style={{ position: "absolute", top: "40px", right: "10px", background: "var(--botz-surface-2)", borderRadius: "12px", border: "1px solid var(--botz-border)", zIndex: 100, padding: "6px", minWidth: "170px", boxShadow: "var(--botz-shadow-2)" }}>
                  <button onClick={() => setModalEditCol({id: col.id, title: col.title})} style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", color: "var(--botz-text)", padding: "10px", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                    <Pencil size={14} /> {t.rename}
                  </button>
                  <button onClick={() => setModalDeleteCol(col)} style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", color: "#ef4444", padding: "10px", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                    <Trash2 size={14} /> {t.deleteStage}
                  </button>
                </div>
              )}
            </div>

            <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "10px", overflowY: "auto", flex: 1 }}>
              {colLeads.map((lead) => (
                <div key={lead.id} draggable onDragStart={(e) => onDragStart(e, lead)} style={{ background: "var(--botz-surface)", padding: "14px", borderRadius: "12px", border: "1px solid var(--botz-border-soft)", cursor: "grab", position: "relative" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ fontSize: "10px", background: "var(--botz-surface-3)", padding: "2px 6px", borderRadius: "4px", color: "var(--botz-muted)" }}>{lead.source || "Web"}</span>
                    <MoreHorizontal size={14} color="var(--botz-muted-2)" style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); setActiveMenuLeadId(activeMenuLeadId === lead.id ? null : lead.id); }} />
                    
                    {activeMenuLeadId === lead.id && (
                      <div style={{ position: "absolute", top: "30px", right: "10px", background: "var(--botz-surface-2)", borderRadius: "12px", border: "1px solid var(--botz-border)", zIndex: 100, padding: "6px", minWidth: "160px", boxShadow: "var(--botz-shadow-2)" }}>
                        <button onClick={() => openHistory(lead)} style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", color: "var(--botz-text)", padding: "10px", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                          <History size={14} /> Ver historial
                        </button>
                        <button onClick={() => deleteLead(lead)} style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", color: "#ef4444", padding: "10px", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                          <Trash2 size={14} /> {t.deleteLead}
                        </button>
                      </div>
                    )}
                  </div>
                  <div style={{ fontWeight: "bold", color: "var(--botz-text)", fontSize: "14px" }}>{lead.name}</div>
                  <div style={{ color: "#34d399", fontSize: "12px", fontWeight: "bold", margin: "8px 0" }}>{formatMoney((lead as any).precio_real)}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--botz-border-soft)", paddingTop: "10px" }}>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={() => window.open(`tel:${(lead as any).phone}`)} style={{ background: "rgba(59,130,246,0.1)", border: "none", padding: "6px", borderRadius: "6px", color: "#3b82f6", cursor: "pointer" }}><Phone size={14}/></button>
                      <button onClick={() => window.open(`https://wa.me/${(lead as any).phone}`)} style={{ background: "rgba(34,197,94,0.1)", border: "none", padding: "6px", borderRadius: "6px", color: "#22c55e", cursor: "pointer" }}><MessageCircle size={14}/></button>
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--botz-muted-2)", display: "flex", alignItems: "center", gap: "4px" }}><Calendar size={10} /> {new Date((lead as any).created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <button onClick={() => setShowAddCol(true)} style={{ minWidth: "44px", height: "44px", borderRadius: "14px", background: "var(--botz-surface-3)", border: "1px dashed var(--botz-border-strong)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Plus size={18} color="var(--botz-muted)" /></button>

      {/* --- MODAL DE HISTORIAL --- */}
      {historyLead && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 }}>
          <div style={{ width: 500, maxHeight: "80vh", background: "var(--botz-surface-2)", border: "1px solid var(--botz-border)", borderRadius: 24, padding: 24, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h3 style={{ color: "var(--botz-text)", fontSize: 18, fontWeight: "bold" }}>Historial de Lead</h3>
                <p style={{ color: "var(--botz-muted)", fontSize: 13 }}>{historyLead.name}</p>
              </div>
              <button onClick={() => setHistoryLead(null)} style={{ background: "transparent", border: "none", color: "var(--botz-muted)", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
              {leadLogs.length > 0 ? leadLogs.map((log, i) => (
                <div key={i} style={{ background: "var(--botz-surface-3)", padding: 12, borderRadius: 12, border: "1px solid var(--botz-border-soft)" }}>
                  <div style={{ fontSize: 13, color: "var(--botz-text)", marginBottom: 4 }}>{log.text}</div>
                  <div style={{ fontSize: 11, color: "var(--botz-muted-2)", display: "flex", gap: 8 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={10}/> {new Date(log.created_at).toLocaleString()}</span>
                    <span>• {log.user_name}</span>
                  </div>
                </div>
              )) : <div style={{ textAlign: "center", color: "#475569", padding: 20 }}>Sin actividad registrada.</div>}
            </div>
          </div>
        </div>
      )}

      {/* --- MODALES DE ETAPA --- */}
      {(modalEditCol || modalDeleteCol || showAddCol) && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 }}>
          <div style={{ width: 380, background: "var(--botz-surface-2)", border: "1px solid var(--botz-border)", borderRadius: 24, padding: 24 }}>
            <h3 style={{ color: "var(--botz-text)", marginBottom: 16, fontSize: 18, fontWeight: "bold" }}>
              {showAddCol ? t.newStage : modalEditCol ? t.rename : t.deleteStageQuestion}
            </h3>
            {(showAddCol || modalEditCol) ? (
              <input autoFocus value={showAddCol ? newColTitle : modalEditCol?.title} onChange={(e) => showAddCol ? setNewColTitle(e.target.value) : setModalEditCol({...modalEditCol!, title: e.target.value})} style={{ width: "100%", background: "var(--botz-surface)", border: "1px solid var(--botz-border)", borderRadius: 12, padding: 12, color: "var(--botz-text)", outline: "none", marginBottom: 20 }} />
            ) : (
              <p style={{ color: "var(--botz-muted)", fontSize: 14, marginBottom: 20 }}>{t.deleteStageConfirm(modalDeleteCol?.title)} {t.irreversible}</p>
            )}
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => { setModalEditCol(null); setModalDeleteCol(null); setShowAddCol(false); }} style={{ flex: 1, padding: 12, borderRadius: 12, border: "1px solid var(--botz-border)", background: "transparent", color: "var(--botz-text)", cursor: "pointer" }}>Cancelar</button>
              <button onClick={showAddCol ? addColumn : modalEditCol ? confirmRenameCol : confirmDeleteCol} style={{ flex: 1, padding: 12, borderRadius: 12, border: "none", background: modalDeleteCol ? "#ef4444" : "#3b82f6", color: "#fff", fontWeight: "bold", cursor: "pointer" }}>
                {modalDeleteCol ? t.delete : t.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
