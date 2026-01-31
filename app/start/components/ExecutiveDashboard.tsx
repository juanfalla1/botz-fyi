"use client";

import React, { useState, useEffect } from "react";
import { TrendingUp, Users, DollarSign, Clock, Calendar, Lock, Loader2, ArrowRight, ShieldCheck, Filter } from "lucide-react";
import { supabase } from "./supabaseClient"; 

// --- ESTILOS ---
const glassStyle: React.CSSProperties = {
  background: "rgba(10, 15, 30, 0.8)",
  border: "1px solid rgba(16, 178, 203, 0.2)",
  borderRadius: "24px",
  padding: "32px",
  backdropFilter: "blur(12px)",
  boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
  color: "#fff",
  minHeight: "600px",
  fontFamily: "system-ui, sans-serif",
  position: "relative"
};

const cardStyle: React.CSSProperties = {
  background: "rgba(13, 22, 45, 0.6)",
  padding: "20px",
  borderRadius: "16px",
  border: "1px solid rgba(255,255,255,0.05)",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

// ✅ ACEPTAMOS EL FILTRO COMO PROP
export default function ExecutiveDashboard({ filter }: { filter?: string | null }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [metrics, setMetrics] = useState<any>(null);

  // ✅ RE-CARGAR DATOS CUANDO CAMBIA EL FILTRO
  useEffect(() => {
    if (isAuthenticated) fetchRealData();
  }, [filter, isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password === "admin123") {
        setTimeout(() => {
            setIsAuthenticated(true);
            fetchRealData(); 
        }, 800);
    } else {
        setTimeout(() => {
            setError("Contraseña incorrecta.");
            setLoading(false);
        }, 500);
    }
  };

  const fetchRealData = async () => {
    try {
        const { data: leads, error } = await supabase
            .from('leads')
            .select('*');

        if (error) throw error;

        if (leads) {
            // ✅ APLICAMOS EL FILTRO GLOBAL AQUÍ
            let filteredLeads = leads;
            
            if (filter) {
                // Buscamos coincidencias (ej: si filtro es "Meta", busca en "Meta Ads")
                filteredLeads = leads.filter(l => 
                    l.source && l.source.toLowerCase().includes(filter.toLowerCase())
                );
            }

            const total = filteredLeads.length;
            
            // Filtro de ventas (Firmado + Convertido)
            const firmados = filteredLeads.filter(l => {
                const s = l.status ? l.status.toUpperCase() : "";
                return s === 'FIRMADO' || s === 'CONVERTIDO' || s === 'GANADA' || s === 'VENTA';
            });

            const comision = firmados.reduce((sum, l) => sum + (Number(l.commission) || 0), 0);
            
            const countByStatus = (status: string) => filteredLeads.filter(l => l.status && l.status.toUpperCase() === status.toUpperCase()).length;
            
            const getTop = (field: string) => {
                const counts: any = {};
                filteredLeads.forEach((l: any) => {
                    const val = l[field] || "Desconocido";
                    counts[val] = (counts[val] || 0) + 1;
                });
                return Object.entries(counts)
                    .sort(([,a]:any, [,b]:any) => b - a)
                    .slice(0, 4)
                    .map(([name, count]) => ({ name, count }));
            };

            const tasaCalculada = total ? (firmados.length / total) * 100 : 0;
            const tasaVisible = tasaCalculada < 1 && tasaCalculada > 0 ? tasaCalculada.toFixed(1) : Math.round(tasaCalculada);

            setMetrics({
                kpis: {
                    totalLeads: total,
                    tasaCierre: tasaVisible,
                    comision: comision,
                    tiempoPromedio: 12
                },
                funnel: [
                    { stage: "Nuevo", count: countByStatus('NUEVO') + countByStatus('Nuevo'), color: "#94a3b8" },
                    { stage: "Contactado", count: countByStatus('CONTACTADO') + countByStatus('SEGUIMIENTO'), color: "#22d3ee" },
                    { stage: "Documentación", count: countByStatus('DOCUMENTACIÓN'), color: "#38bdf8" },
                    { stage: "Pre-aprobado", count: countByStatus('PRE-APROBADO'), color: "#818cf8" },
                    { stage: "Cierre / Venta", count: firmados.length, color: "#10b981" },
                ],
                bancos: getTop('bank'),  
                canales: getTop('source')
            });
        }
    } catch (err) {
        console.error("Error Supabase:", err);
    } finally {
        setLoading(false);
    }
  };

  // --- VISTA 1: LOGIN ---
  if (!isAuthenticated) {
    return (
      <div style={{ ...glassStyle, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: "380px", textAlign: "center" }}>
          <div style={{ marginBottom: "25px", display: "inline-flex", padding: "20px", background: "rgba(34, 211, 238, 0.1)", borderRadius: "50%", border: "1px solid rgba(34, 211, 238, 0.3)" }}>
            <Lock size={40} color="#22d3ee" />
          </div>
          <h2 style={{ fontSize: "24px", fontWeight: "800", marginBottom: "10px", color: "#fff" }}>Acceso Ejecutivo</h2>
          <p style={{ color: "#94a3b8", marginBottom: "30px", fontSize: "14px" }}>Datos protegidos del CRM.</p>
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            <input type="password" placeholder="Contraseña..." value={password} onChange={(e) => setPassword(e.target.value)} style={{ background: "rgba(13, 22, 45, 0.8)", border: "1px solid rgba(255,255,255,0.1)", padding: "16px", borderRadius: "12px", color: "#fff", outline: "none", textAlign: "center", fontSize: "16px" }} />
            {error && <p style={{ color: "#f43f5e", fontSize: "13px", margin: 0 }}>{error}</p>}
            <button type="submit" disabled={loading} style={{ background: loading ? "#334155" : "#22d3ee", color: "#0f172a", border: "none", padding: "16px", borderRadius: "12px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
              {loading ? <Loader2 className="animate-spin" /> : <>Desbloquear <ArrowRight size={18} /></>}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- VISTA 2: CARGANDO ---
  if (!metrics) return <div style={{ ...glassStyle, display: "flex", alignItems: "center", justifyContent: "center" }}><Loader2 size={50} color="#22d3ee" className="animate-spin" /></div>;

  // --- VISTA 3: DASHBOARD ---
  return (
    <div style={glassStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <div>
          <h2 style={{ fontSize: "24px", fontWeight: "800", display: "flex", alignItems: "center", gap: "12px", margin: 0 }}>
            <TrendingUp size={24} color="#22d3ee" /> Analytics CRM
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "14px", marginTop: "4px" }}>
             {/* ✅ INDICADOR DE FILTRO ACTIVO */}
             {filter ? (
                <span style={{color: "#22d3ee", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px"}}>
                   <Filter size={14}/> Filtrando solo datos de: <span style={{textTransform:"uppercase"}}>{filter}</span>
                </span>
             ) : (
                `Datos globales de ${metrics.kpis.totalLeads} leads`
             )}
          </p>
        </div>
        <div style={{ padding: "8px 16px", background: "rgba(255,255,255,0.05)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", gap: "8px" }}>
           <Calendar size={16} color="#94a3b8"/> <span style={{color:"#fff", fontWeight:"bold"}}>Tiempo Real</span>
        </div>
      </div>

      {/* KPI CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "30px" }}>
        <KpiCard icon={<Users size={20} color="#22d3ee"/>} label="Leads Totales" value={metrics.kpis.totalLeads} />
        <KpiCard icon={<TrendingUp size={20} color="#f472b6"/>} label="Tasa de Cierre" value={`${metrics.kpis.tasaCierre}%`} />
        <KpiCard icon={<DollarSign size={20} color="#10b981"/>} label="Comisión" value={`$${metrics.kpis.comision.toLocaleString()}`} highlight />
        <KpiCard icon={<Clock size={20} color="#fbbf24"/>} label="Tiempo Promedio" value={`${metrics.kpis.tiempoPromedio} días`} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "30px" }}>
        {/* FUNNEL */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#94a3b8", marginBottom: "15px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px" }}>Funnel</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            {metrics.funnel.map((item: any, i: number) => {
                const max = metrics.kpis.totalLeads || 1;
                const percent = Math.round((item.count / max) * 100);
                
                return (
                <div key={i} style={{ display: "flex", alignItems: "center", fontSize: "14px" }}>
                    <span style={{ width: "110px", color: "#cbd5e1" }}>{item.stage}</span>
                    <div style={{ flexGrow: 1, background: "rgba(255,255,255,0.05)", height: "12px", borderRadius: "6px", margin: "0 15px", overflow: "hidden" }}>
                        <div style={{ width: `${percent}%`, background: item.color, height: "100%", borderRadius: "6px", transition: "width 0.5s ease" }}></div>
                    </div>
                    <span style={{ width: "40px", textAlign: "right", color: "#fff", fontWeight: "bold" }}>{item.count}</span>
                </div>
            )})}
          </div>
        </div>

        {/* TABLAS */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={cardStyle}>
                <h3 style={{ fontSize: "14px", fontWeight: "bold", color: "#94a3b8", marginBottom: "10px" }}>Top Canales</h3>
                {metrics.canales.length > 0 ? metrics.canales.map((c: any, i: number) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <span style={{ color: "#cbd5e1" }}>{c.name}</span>
                        <span style={{ color: "#fff", fontWeight: "bold" }}>{c.count}</span>
                    </div>
                )) : <p style={{color: "#64748b", fontSize: "12px"}}>Sin datos</p>}
            </div>
             <div style={cardStyle}>
                <h3 style={{ fontSize: "14px", fontWeight: "bold", color: "#94a3b8", marginBottom: "10px" }}>Top Bancos</h3>
                {metrics.bancos.length > 0 ? metrics.bancos.map((b: any, i: number) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <span style={{ color: "#cbd5e1" }}>{b.name}</span>
                        <span style={{ color: "#22d3ee", fontWeight: "bold" }}>{b.count}</span>
                    </div>
                )) : <p style={{color: "#64748b", fontSize: "12px"}}>Sin datos</p>}
            </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, highlight = false }: any) {
    return (
        <div style={{ background: highlight ? "rgba(34, 211, 238, 0.1)" : "rgba(13, 22, 45, 0.6)", border: highlight ? "1px solid rgba(34, 211, 238, 0.3)" : "1px solid rgba(255,255,255,0.05)", padding: "20px", borderRadius: "16px", display: "flex", flexDirection: "column", gap: "5px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{ fontSize: "24px", fontWeight: "bold", color: "#fff" }}>{value}</span>
                <div style={{ padding: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "8px" }}>{icon}</div>
            </div>
            <span style={{ fontSize: "12px", color: highlight ? "#22d3ee" : "#94a3b8", textTransform: "uppercase" }}>{label}</span>
        </div>
    )
}