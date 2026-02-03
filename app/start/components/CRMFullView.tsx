"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { 
  Users, Calendar, Activity, TrendingUp, BarChart3, Globe, PieChart as PieIcon,
  Loader2, LogOut, Settings, X, Zap, MessageCircle, Share2, 
  ChevronLeft, Layout, Save, Briefcase
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area 
} from "recharts";
import LeadsTable, { Lead } from "./LeadsTable";
import LoginForm from "./LoginForm";
import RegistroAsesor from "./RegistroAsesor"; // ✅ CAMBIO 1: Nuevo import

// ================= 1. ESQUEMAS DE CONFIGURACIÓN =================
const CHANNEL_SCHEMAS: Record<string, any> = {
  whatsapp: {
    title: "WhatsApp Business API",
    fields: [
      { id: "phone_id", label: "Identificador de número de teléfono", type: "text", defaultValue: "927985817066043" },
      { id: "waba_id", label: "Identificador de cuenta de WhatsApp Business", type: "text", defaultValue: "1558972865146795" },
      { id: "verify_token", label: "WHATSAPP_VERIFY_TOKEN", type: "text", placeholder: "Token para validar el Webhook" },
      { id: "access_token", label: "WHATSAPP_ACCESS_TOKEN", type: "password", placeholder: "Token de acceso permanente" }
    ]
  },
  meta: {
    title: "Meta Ads (Facebook & Instagram)",
    fields: [
      { id: "instance_name", label: "Nombre de esta Instancia", type: "text", placeholder: "Ej: Meta_Principal" }, 
      { id: "pixel_id", label: "ID del Píxel", type: "text", placeholder: "Ej: 88273645" },
      { id: "access_token", label: "System User Access Token", type: "password", placeholder: "EAAB..." },
      { id: "ad_account", label: "ID Cuenta Publicitaria", type: "text", placeholder: "act_12345" },
      { id: "app_secret", label: "App Secret (Seguridad)", type: "password", placeholder: "Desde Meta Developers" },
      { id: "page_id", label: "ID de la Página vinculada", type: "text", placeholder: "ID numérico de la FanPage" }
    ]
  },
  mortgage_strategy: {
    title: "Reglas de Calificación Hipotecaria",
    fields: [
      { id: "min_income", label: "Ingreso Mensual Mínimo (€)", type: "number", defaultValue: "1500" },
      { id: "interest_rate", label: "Tasa de Interés para Cálculos (%)", type: "number", defaultValue: "3.5" },
      { id: "max_ltv", label: "LTV Máximo Permitido (%)", type: "number", defaultValue: "80" }
    ]
  },
  landings: {
    title: "Landing Pages & Sitios Web",
    fields: [
      { id: "webhook_url", label: "URL de recepción (Webhook)", type: "text", defaultValue: "https://api.botz.com/v1/webhook/incoming", readonly: true },
      { id: "api_key", label: "API Key de Validación", type: "password", placeholder: "Clave para validar envíos" }
    ]
  }
};

// ================= ESTILOS =================
const cardStyle: React.CSSProperties = {
  background: "rgba(15, 23, 42, 0.6)", 
  backdropFilter: "blur(12px)",
  border: "1px solid rgba(51, 65, 85, 0.5)",
  borderRadius: "20px",
  padding: "24px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
  display: "flex",
  flexDirection: "column",
  animation: "fadeIn 0.5s ease-in-out"
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const name = data.name; 
    const value = data.value;
    const color = data.payload.fill || data.payload.color;

    return (
      <div style={{ background: "#0f172a", border: "1px solid #334155", padding: "12px", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)", minWidth: "140px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
          <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: color }}></div>
          <p style={{ fontWeight: "bold", color: "#f8fafc", fontSize: "13px", margin: 0 }}>{name}</p>
        </div>
        <p style={{ color: "#94a3b8", fontSize: "12px", margin: 0, paddingLeft: "18px" }}>
          Cantidad: <span style={{ fontWeight: "bold", color: "#fff", fontSize: "14px" }}>{value}</span>
        </p>
      </div>
    );
  }
  return null;
};

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#ef4444", "#06b6d4", "#84cc16"];

// 👇 AQUÍ ESTÁ LA SOLUCIÓN AL ERROR ROJO 👇
// Estamos definiendo que este componente ACEPTA "globalFilter"
export default function CRMFullView({ globalFilter }: { globalFilter?: string | null }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'week' | 'month'>('month');
  const [authView, setAuthView] = useState<"login" | "register">("login"); // ✅ CAMBIO 2: Nuevo estado
  
  // ESTADOS PARA EL MODAL
  const [showConfig, setShowConfig] = useState(false);
  const [activeConfigTab, setActiveConfigTab] = useState("canales");
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);


  // ✅ FIX: traer TODOS los registros (evita límite ~1000) sin cambiar el diseño
  const fetchAllByUser = async (table: string, userId: string) => {
    const pageSize = 500;
    let from = 0;
    let all: any[] = [];

    while (true) {
      const to = from + pageSize - 1;

      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      if (!data || data.length === 0) break;

      all = all.concat(data);

      // si la página trae menos que el tamaño, ya no hay más
      if (data.length < pageSize) break;

      from += pageSize;
    }

    return all;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (session) {
        const leadsData = await fetchAllByUser("leads", session.user.id);
        const trackerData = await fetchAllByUser("demo_tracker_botz", session.user.id);

        const normalize = (arr: any[], source: string) => arr.map((l) => {
            let rawOrigin = l.origen || l.source || l.channel;
            if (!rawOrigin || (typeof rawOrigin === 'string' && rawOrigin.trim() === "")) {
                rawOrigin = "";
            }
            return {
                ...l,
                sourceTable: source,
                // Cambia la línea 156 por esta:
                status: (String(l.status || "nuevo").toLowerCase() === "nuevo" ? "Nuevo" : (l.status || "Nuevo")),
                created_at: l.created_at || new Date().toISOString(),
                origen: String(rawOrigin).trim()
            };
        });

        const allData = [
          ...normalize(leadsData || [], "leads"),
          ...normalize(trackerData || [], "demo_tracker_botz")
        ];

        setLeads(allData.sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime()));
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setLeads([]);
  };

  // Lógica de filtrado unificada (Fecha + Filtro Global del Dock)
  const filteredLeads = leads.filter(l => {
    // 1. Filtro de Fecha
    if (!l.created_at) return false;
    const date = new Date(l.created_at);
    const now = new Date();
    const daysToSubtract = timeFilter === 'week' ? 5 : 30; 
    const limitDate = new Date();
    limitDate.setDate(now.getDate() - daysToSubtract);
    
    const matchesDate = date >= limitDate;

    // 2. Filtro Global (Dock) para que los gráficos también cambien
    let matchesGlobal = true;
    if (globalFilter) {
        const source = (l.origen || l.source || "").toLowerCase();
        matchesGlobal = source.includes(globalFilter.toLowerCase());
    }

    return matchesDate && matchesGlobal;
  });

  const totalLeads = leads.length; 
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const leadsMes = leads.filter(l => l.created_at && new Date(l.created_at) >= monthStart).length;
  const convertidos = leads.filter(l => ["convertido", "cerrado", "vendido"].includes((l.status || "").toLowerCase())).length;
  const tasaConversion = totalLeads > 0 ? ((convertidos / totalLeads) * 100).toFixed(1) : "0";

  const daysToShow = timeFilter === 'week' ? 5 : 30;
  const activityData = Array.from({ length: daysToShow }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (daysToShow - 1 - i)); 
    const label = d.toLocaleDateString("es-ES", { weekday: 'short', day: 'numeric' });
    const count = filteredLeads.filter(l => {
        const leadDate = new Date(l.created_at);
        return leadDate.getDate() === d.getDate() && leadDate.getMonth() === d.getMonth();
    }).length;
    return { day: label, leads: count };
  });

  const channelMap: Record<string, number> = {};
  filteredLeads.forEach(l => {
    let origin = l.origen || "Web";
    let key = origin.charAt(0).toUpperCase() + origin.slice(1);
    channelMap[key] = (channelMap[key] || 0) + 1;
  });
  
  const channelData = Object.entries(channelMap).map(([name, value], i) => ({
    name, value, color: COLORS[i % COLORS.length]
  }));

  const statusMap: Record<string, number> = {};
  filteredLeads.forEach(l => { 
    const status = l.status || "nuevo";
    statusMap[status] = (statusMap[status] || 0) + 1; 
  });
  const statusData = Object.entries(statusMap).map(([name, value], i) => ({
    name, value, color: COLORS[(i + 2) % COLORS.length]
  }));

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: "100px" }}><Loader2 className="animate-spin" size={32} color="#10b2cb" /></div>;
  
  // ✅ CAMBIO 3: Render de login/registro
  if (!session) {
    if (authView === "login") {
      return (
        <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <LoginForm 
            onSuccess={fetchData} 
            onRegisterClick={() => setAuthView("register")}
          />
        </div>
      );
    } else {
      return (
        <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <RegistroAsesor
            onSuccess={() => setAuthView("login")}
            onLoginClick={() => setAuthView("login")}
          />
        </div>
      );
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "30px", width: "100%" }}>
      
      {/* HEADER INTEGRADO */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "8px", background: "rgba(30, 41, 59, 0.5)", padding: "4px", borderRadius: "12px", border: "1px solid rgba(71, 85, 105, 0.5)" }}>
            <button onClick={() => setTimeFilter('week')} style={{ padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "bold", cursor: "pointer", border: "none", background: timeFilter === 'week' ? "#3b82f6" : "transparent", color: "white" }}>Semanal (5d)</button>
            <button onClick={() => setTimeFilter('month')} style={{ padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "bold", cursor: "pointer", border: "none", background: timeFilter === 'month' ? "#3b82f6" : "transparent", color: "white" }}>Mensual</button>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => setShowConfig(true)} style={btnConfigStyle}><Settings size={14} /> Centro de Control</button>
          <button onClick={handleLogout} style={btnLogoutStyle}><LogOut size={14} /> Salir</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
        {[
          { label: "Leads Totales", val: totalLeads, icon: <Users color="#60a5fa" />, sub: "Base de datos completa" },
          { label: "Leads este Mes", val: leadsMes, icon: <Calendar color="#facc15" />, sub: "Desde el día 1" },
          { label: "Tasa Conversión", val: `${tasaConversion}%`, icon: <TrendingUp color="#10b981" />, sub: `${convertidos} ventas` },
          { label: "Canales Activos", val: channelData.length, icon: <Activity color="#e879f9" />, sub: "Fuentes de tráfico" },
        ].map((kpi, i) => (
          <div key={i} style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}><span style={{ color: "#94a3b8", fontSize: "14px" }}>{kpi.label}</span>{kpi.icon}</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "#fff" }}>{kpi.val}</div>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* GRÁFICOS CON TÍTULOS */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "20px" }}>
        <div style={{ ...cardStyle, minHeight: "300px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#fff", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}><BarChart3 size={18} color="#60a5fa" /> Flujo: Últimos {timeFilter === 'week' ? "5 días" : "30 días"}</h3>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={activityData}>
              <defs><linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#60a5fa" stopOpacity={0.8}/><stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="leads" stroke="#60a5fa" fillOpacity={1} fill="url(#colorLeads)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ ...cardStyle, minHeight: "300px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#fff", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}><Globe size={18} color="#10b981" /> Canales</h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={channelData.length > 0 ? channelData : [{name:'Vacío', value:1, color:'#334155'}]} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" nameKey="name">
                {channelData.map((entry, index) => <Cell key={index} fill={entry.color} stroke="none" />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

         <div style={{ ...cardStyle, minHeight: "300px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#fff", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}><PieIcon size={18} color="#facc15" /> Estados</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusData} layout="vertical">
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={110} stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                {statusData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ✅ SE PASA EL FILTRO A LA TABLA */}
    <LeadsTable
  initialLeads={leads}
  session={session}
  globalFilter={globalFilter}
  onLeadPatch={(id, patch) => {
    setLeads((prev: any[]) =>
      prev.map((l: any) => (String(l.id) === String(id) ? { ...l, ...patch } : l))
    );
  }}
/>


      {/* ✅ MODAL CONFIGURACIÓN CON PERSISTENCIA */}
      {showConfig && (
        <div style={overlayStyle}>
          <div style={modalContainerStyle}>
            <button onClick={() => {setShowConfig(false); setSelectedChannel(null);}} style={closeButtonStyle}><X size={24} /></button>
            <div style={{ padding: "40px" }}>
              <h2 style={{ color: "#fff", fontSize: "24px", fontWeight: "800", marginBottom: "30px", display: "flex", alignItems: "center", gap: "12px" }}>
                <Zap color="#10b2cb" fill="#10b2cb" size={24} /> Centro de Control Botz
              </h2>

              <div style={{ display: "flex", gap: "30px", minHeight: "480px" }}>
                <aside style={sidebarStyle}>
                  <MenuButton label="Canales" id="canales" icon={<Globe size={18} />} active={activeConfigTab} onClick={setActiveConfigTab} />
                  <MenuButton label="Estrategia" id="strategy" icon={<Briefcase size={18} />} active={activeConfigTab} onClick={setActiveConfigTab} />
                  <MenuButton label="Cuenta" id="cuenta" icon={<Users size={18} />} active={activeConfigTab} onClick={setActiveConfigTab} />
                </aside>

                <main style={contentAreaStyle}>
                  {activeConfigTab === "canales" && (
                    !selectedChannel ? (
                      <div style={{animation: "fadeIn 0.3s ease"}}>
                        <h3 style={{ color: "#fff", marginBottom: "20px" }}>Fuentes de Captación</h3>
                        <ChannelRow label="WhatsApp Business" icon={<MessageCircle color="#25D366" />} onConfigure={() => setSelectedChannel("whatsapp")} />
                        <ChannelRow label="Meta Ads" icon={<Share2 color="#0081FB" />} onConfigure={() => setSelectedChannel("meta")} />
                        <ChannelRow label="Landing Pages" icon={<Layout color="#e879f9" />} onConfigure={() => setSelectedChannel("landings")} />
                      </div>
                    ) : (
                      <PersistConfigForm channelId={selectedChannel} onBack={() => setSelectedChannel(null)} />
                    )
                  )}
                  {activeConfigTab === "strategy" && (
                    <PersistConfigForm channelId="mortgage_strategy" onBack={() => setActiveConfigTab("canales")} />
                  )}
                </main>
              </div>
            </div>
          </div>
        </div>
      )}
    </div> 
  );
}

// COMPONENTE DE FORMULARIO PERSISTENTE
function PersistConfigForm({ channelId, onBack }: { channelId: string, onBack: () => void }) {
  const schema = CHANNEL_SCHEMAS[channelId];
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data } = await supabase.from("user_configs").select("settings").eq("user_id", session.user.id).eq("channel", channelId).maybeSingle();
        if (data?.settings) setFormData(data.settings);
        else {
          const initialData = schema.fields.reduce((acc: any, f: any) => { if (f.defaultValue) acc[f.id] = f.defaultValue; return acc; }, {});
          setFormData(initialData);
        }
      } finally { setLoading(false); }
    };
    load();
  }, [channelId]);

  const save = async () => {
    try {
      setSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { error } = await supabase.from("user_configs").upsert({
          user_id: session.user.id, channel: channelId, settings: formData, updated_at: new Date().toISOString()
      }, { onConflict: 'user_id, channel' });
      if (error) throw error;
      alert("✅ Configuración guardada.");
      onBack();
    } catch (err) { alert("Error al guardar."); } finally { setSaving(false); }
  };

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: "50px" }}><Loader2 className="animate-spin" color="#10b2cb" /></div>;

  return (
    <div style={{animation: "fadeIn 0.3s ease"}}>
      <button onClick={onBack} style={{background: "none", border: "none", color: "#10b2cb", cursor: "pointer", marginBottom: "20px", display: "flex", alignItems: "center", gap: "5px", fontSize: "14px", padding: 0}}><ChevronLeft size={16} /> Volver</button>
      <h3 style={{ color: "#fff", marginBottom: "24px", fontSize: "18px" }}>{schema.title}</h3>
      <div style={{display: "flex", flexDirection: "column", gap: "18px"}}>
        {schema.fields.map((f: any) => (
          <div key={f.id} style={{display: "flex", flexDirection: "column", gap: "6px"}}>
            <label style={{color: "#94a3b8", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase"}}>{f.label}</label>
            <input type={f.type} value={formData[f.id] || ""} onChange={(e) => setFormData({...formData, [f.id]: e.target.value})} placeholder={f.placeholder} readOnly={f.readonly} style={{ background: f.readonly ? "rgba(0,0,0,0.2)" : "rgba(30, 41, 59, 0.5)", border: "1px solid rgba(255,255,255,0.1)", padding: "12px", borderRadius: "10px", color: "#fff", outline: "none", fontSize: "14px" }} />
          </div>
        ))}
        <button onClick={save} disabled={saving} style={{ marginTop: "10px", background: "#10b2cb", color: "#fff", border: "none", padding: "14px", borderRadius: "12px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
          {saving ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> Guardar Configuración</>}
        </button>
      </div>
    </div>
  );
}

// COMPONENTES AUXILIARES
function MenuButton({ label, id, icon, active, onClick }: any) {
  const isA = active === id;
  return (
    <button onClick={() => onClick(id)} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderRadius: "10px", background: isA ? "rgba(16, 178, 203, 0.15)" : "transparent", color: isA ? "#10b2cb" : "#94a3b8", border: "none", cursor: "pointer", fontWeight: isA ? "bold" : "normal", textAlign: "left" }}>{icon} {label}</button>
  );
}

function ChannelRow({ label, icon, onConfigure }: any) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#fff" }}>{icon} <span style={{fontSize: "14px"}}>{label}</span></div>
      <button onClick={onConfigure} style={{ background: "rgba(16,178,203,0.1)", color: "#10b2cb", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}>Configurar</button>
    </div>
  );
}

const btnConfigStyle = { display: "flex", alignItems: "center", gap: "8px", background: "rgba(16, 178, 203, 0.1)", color: "#10b2cb", border: "1px solid rgba(16, 178, 203, 0.3)", padding: "8px 16px", borderRadius: "10px", fontSize: "12px", fontWeight: "bold" as const, cursor: "pointer" };
const btnLogoutStyle = { display: "flex", alignItems: "center", gap: "8px", background: "rgba(239, 68, 68, 0.1)", color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.2)", padding: "8px 16px", borderRadius: "10px", fontSize: "12px", fontWeight: "bold" as const, cursor: "pointer" };
const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center" };
const modalContainerStyle: React.CSSProperties = { width: "95%", maxWidth: "850px", background: "#0d1117", borderRadius: "24px", border: "1px solid rgba(16, 178, 203, 0.3)", position: "relative" };
const sidebarStyle: React.CSSProperties = { width: "220px", display: "flex", flexDirection: "column", gap: "5px" };
const contentAreaStyle: React.CSSProperties = { flex: 1, background: "rgba(255,255,255,0.02)", borderRadius: "20px", padding: "30px", border: "1px solid rgba(255,255,255,0.05)" };
const closeButtonStyle: React.CSSProperties = { position: "absolute", top: "20px", right: "20px", background: "none", border: "none", color: "#64748b", cursor: "pointer" };