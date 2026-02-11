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

      if (authTenantId) {
        setTenantId(authTenantId);
        setTenantResolved(true);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const tid =
        session?.user?.user_metadata?.tenant_id ||
        session?.user?.app_metadata?.tenant_id ||
        null;
      console.log('[Kanban] 🎯 Tenant ID resolved:', tid);
      setTenantId(tid);
      setTenantResolved(true);
    };

    resolveTenant();
  }, [authLoading, authTenantId]);

  useEffect(() => {
    if (tenantResolved && !authLoading) {
      fetchLeads(false);
    }
  }, [globalFilter, tenantResolved, authLoading, isAsesor, teamMemberId, tenantId]);

const fetchLeads = async (silent: boolean) => {
    console.log('[Kanban] 🚀 fetchLeads started, silent:', silent);
    if (!silent) setLoading(true);
    
    try {
      console.log('[Kanban] 📡 Fetching leads for tenant:', tenantId, 'isAsesor:', isAsesor, 'teamMemberId:', teamMemberId);
      if (isAsesor && !teamMemberId) {
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
      if (isAsesor && teamMemberId) {
        console.log('[Kanban] 👤 Asesor detectado, filtrando por asesor_id/assigned_to:', teamMemberId);
        query = query.or(`asesor_id.eq.${teamMemberId},assigned_to.eq.${teamMemberId}`);
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

  if (loading && leads.length === 0) return <div style={{ padding: "40px", color: "#64748b", textAlign: "center" }}>Cargando Tablero...</div>;

  return (
    <div onClick={() => { setActiveMenuLeadId(null); setActiveMenuColId(null); }} style={{ display: "flex", gap: "16px", overflowX: "auto", paddingBottom: "20px", height: "calc(100vh - 200px)", alignItems: "flex-start" }}>
      {columns.map((col) => {
        const colLeads = leads.filter(l => (l.status || "NUEVO").toUpperCase() === col.id);
        return (
          <div key={col.id} onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, col.id)} style={{ minWidth: "280px", maxWidth: "280px", background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "16px", display: "flex", flexDirection: "column", height: "100%", backdropFilter: "blur(10px)" }}>
            
            <div style={{ padding: "16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: col.color }} />
                <span style={{ fontWeight: "bold", color: "#fff", fontSize: "13px" }}>{col.title}</span>
                <span style={{ background: "rgba(255,255,255,0.1)", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", color: "#cbd5e1" }}>{colLeads.length}</span>
              </div>
              <MoreVertical size={16} color="#64748b" style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); setActiveMenuColId(activeMenuColId === col.id ? null : col.id); }} />
              
              {activeMenuColId === col.id && (
                <div style={{ position: "absolute", top: "40px", right: "10px", background: "#0f172a", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", zIndex: 100, padding: "6px", minWidth: "170px", boxShadow: "0 20px 40px rgba(0,0,0,0.45)" }}>
                  <button onClick={() => setModalEditCol({id: col.id, title: col.title})} style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", color: "#fff", padding: "10px", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                    <Pencil size={14} /> Cambiar nombre
                  </button>
                  <button onClick={() => setModalDeleteCol(col)} style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", color: "#ef4444", padding: "10px", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                    <Trash2 size={14} /> Eliminar etapa
                  </button>
                </div>
              )}
            </div>

            <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "10px", overflowY: "auto", flex: 1 }}>
              {colLeads.map((lead) => (
                <div key={lead.id} draggable onDragStart={(e) => onDragStart(e, lead)} style={{ background: "#1e293b", padding: "14px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)", cursor: "grab", position: "relative" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ fontSize: "10px", background: "rgba(255,255,255,0.05)", padding: "2px 6px", borderRadius: "4px", color: "#94a3b8" }}>{lead.source || "Web"}</span>
                    <MoreHorizontal size={14} color="#64748b" style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); setActiveMenuLeadId(activeMenuLeadId === lead.id ? null : lead.id); }} />
                    
                    {activeMenuLeadId === lead.id && (
                      <div style={{ position: "absolute", top: "30px", right: "10px", background: "#0f172a", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", zIndex: 100, padding: "6px", minWidth: "160px", boxShadow: "0 20px 40px rgba(0,0,0,0.45)" }}>
                        <button onClick={() => openHistory(lead)} style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", color: "#fff", padding: "10px", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                          <History size={14} /> Ver historial
                        </button>
                        <button onClick={() => deleteLead(lead)} style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", color: "#ef4444", padding: "10px", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                          <Trash2 size={14} /> Eliminar lead
                        </button>
                      </div>
                    )}
                  </div>
                  <div style={{ fontWeight: "bold", color: "#fff", fontSize: "14px" }}>{lead.name}</div>
                  <div style={{ color: "#34d399", fontSize: "12px", fontWeight: "bold", margin: "8px 0" }}>{formatMoney((lead as any).precio_real)}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "10px" }}>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={() => window.open(`tel:${(lead as any).phone}`)} style={{ background: "rgba(59,130,246,0.1)", border: "none", padding: "6px", borderRadius: "6px", color: "#3b82f6", cursor: "pointer" }}><Phone size={14}/></button>
                      <button onClick={() => window.open(`https://wa.me/${(lead as any).phone}`)} style={{ background: "rgba(34,197,94,0.1)", border: "none", padding: "6px", borderRadius: "6px", color: "#22c55e", cursor: "pointer" }}><MessageCircle size={14}/></button>
                    </div>
                    <div style={{ fontSize: "10px", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}><Calendar size={10} /> {new Date((lead as any).created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <button onClick={() => setShowAddCol(true)} style={{ minWidth: "44px", height: "44px", borderRadius: "14px", background: "rgba(255,255,255,0.06)", border: "1px dashed rgba(255,255,255,0.18)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Plus size={18} color="#94a3b8" /></button>

      {/* --- MODAL DE HISTORIAL --- */}
      {historyLead && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 }}>
          <div style={{ width: 500, maxHeight: "80vh", background: "#0b1220", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, padding: 24, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h3 style={{ color: "#fff", fontSize: 18, fontWeight: "bold" }}>Historial de Lead</h3>
                <p style={{ color: "#94a3b8", fontSize: 13 }}>{historyLead.name}</p>
              </div>
              <button onClick={() => setHistoryLead(null)} style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}><X size={20} /></button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
              {leadLogs.length > 0 ? leadLogs.map((log, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.03)", padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ fontSize: 13, color: "#fff", marginBottom: 4 }}>{log.text}</div>
                  <div style={{ fontSize: 11, color: "#64748b", display: "flex", gap: 8 }}>
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
          <div style={{ width: 380, background: "#0b1220", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, padding: 24 }}>
            <h3 style={{ color: "#fff", marginBottom: 16, fontSize: 18, fontWeight: "bold" }}>
              {showAddCol ? "Nueva Etapa" : modalEditCol ? "Cambiar nombre" : "¿Eliminar etapa?"}
            </h3>
            {(showAddCol || modalEditCol) ? (
              <input autoFocus value={showAddCol ? newColTitle : modalEditCol?.title} onChange={(e) => showAddCol ? setNewColTitle(e.target.value) : setModalEditCol({...modalEditCol!, title: e.target.value})} style={{ width: "100%", background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 12, color: "#fff", outline: "none", marginBottom: 20 }} />
            ) : (
              <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 20 }}>¿Eliminar "{modalDeleteCol?.title}"? Esta acción no se puede deshacer.</p>
            )}
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => { setModalEditCol(null); setModalDeleteCol(null); setShowAddCol(false); }} style={{ flex: 1, padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#fff", cursor: "pointer" }}>Cancelar</button>
              <button onClick={showAddCol ? addColumn : modalEditCol ? confirmRenameCol : confirmDeleteCol} style={{ flex: 1, padding: 12, borderRadius: 12, border: "none", background: modalDeleteCol ? "#ef4444" : "#3b82f6", color: "#fff", fontWeight: "bold", cursor: "pointer" }}>
                {modalDeleteCol ? "Eliminar" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
