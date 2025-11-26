"use client";
export const dynamic = 'force-dynamic';
import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  LabelList
} from "recharts";
import LeadsTable from "./LeadsTable";

// 🔥 1. COMPONENTE CUSTOM TOOLTIP PARA EL PIECHART
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const name = payload[0].name;
    const value = payload[0].value;
    
    return (
      <div style={{
        backgroundColor: '#0d2236', // Fondo oscuro
        border: '1px solid #10b2cb', // Borde cian
        borderRadius: '8px',
        padding: '8px 12px',
        color: '#ffffff', // 🔥 Fuerza el texto a blanco
        fontSize: '12px',
      }}>
        {/* Nombre de la Categoría (seguimiento, nuevo, etc.) */}
        <p className="label font-bold capitalize">{`${name}`}</p>
        {/* Valor o Conteo */}
        <p className="desc text-cyan-400">{`Leads: ${value}`}</p>
      </div>
    );
  }
  return null;
};
// -------------------------------------------------------------------------


export default function Dashboard() {
  const [leads, setLeads] = useState<any[]>([]);
  const [session, setSession] = useState<any>(null);
  const [userName, setUserName] = useState("");

  // ✅ Revisar sesión al cargar
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setSession(data.session);
        setUserName(
          data.session.user.user_metadata.full_name || data.session.user.email
        );
      }
    };
    checkSession();
  }, []);

  // ✅ Traer leads del usuario
  useEffect(() => {
    if (session) fetchLeads();
  }, [session]);

  const fetchLeads = async () => {
    if (!session) return;

    // 1. Leads normales
    const { data: leadsData, error: leadsError } = await supabase
      .from("leads")
      .select(
        "id, name, email, phone, company, interest, status, created_at, user_id, notes, next_action, calificacion, etapa, resumen_chat, origen, next_call_date" 
      )
      .eq("user_id", session.user.id);

    // 2. Demo tracker (si aplica)
    const { data: trackerData, error: trackerError } = await supabase
      .from("demo_tracker_botz")
      .select(
        "id, name, email, phone, company, interest, status, created_at, user_id"
      )
      .eq("user_id", session.user.id);

    // 🔥 3. Normalizar datos
    const normalize = (arr: any[], source: string) =>
      arr.map((l) => ({
        id: l.id,
        name: l.name || "Sin nombre",
        email: l.email || "Sin email",
        phone: l.phone || "Sin teléfono",
        company: l.company || "N/A",
        interest: l.interest || "Sin interés",
        status: l.status || "sin_estado",
        created_at: l.created_at,
        user_id: l.user_id,
        sourceTable: source,
        // Campos nuevos
        notes: l.notes,
        next_action: l.next_action,
        calificacion: l.calificacion,
        etapa: l.etapa,
        resumen_chat: l.resumen_chat,
        origen: l.origen || l.source || "web", 
        next_call_date: l.next_call_date, // Mapeo de la fecha de recordatorio
      }));

    const allData = [
      ...normalize(leadsData || [], "leads"),
      ...normalize(trackerData || [], "demo_tracker_botz"),
    ];

    if (!leadsError) setLeads(allData);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    window.location.href = "/";
  };

  // ✅ Si no hay sesión → mandamos al login
  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#112f46] text-white">
        <p className="text-xl">Debes iniciar sesión para ver el Dashboard.</p>
      </div>
    );
  }

  // 📊 KPIs
  // 🚨 FIX: Aseguramos que leads sea un array antes de leer length
  const validLeads = leads || [];
  const total = validLeads.length; 
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const leadsMes = validLeads.filter((l) => {
    if (!l.created_at) return false;
    const d = new Date(l.created_at);
    return d >= monthStart && d <= now;
  }).length;

  const estadosGanadores = [
    "convertido",
    "won",
    "sale",
    "closed",
    "cerrado",
    "vendido",
  ];
  const convertidos = validLeads.filter((l) =>
    estadosGanadores.includes(String(l.status || "").toLowerCase())
  ).length;
  const tasaConversionNum = total ? (convertidos / total) * 100 : 0;
  const tasaConversion = Math.round(tasaConversionNum);

  const kpiData = [
    { name: "Leads Mes", value: leadsMes },
    { name: "Conversión %", value: tasaConversion },
  ];

  // -------------------------------------------------------------------------
  // 👇 CÁLCULO DINÁMICO DEL MÁXIMO DEL EJE Y (Aplicado a los 3 gráficos de barras)
  
  // 1. Cálculo para Indicadores Clave (KPIs)
  const maxKpiValue = Math.max(...kpiData.map(item => item.value));
  const kpiYMax = Math.ceil(maxKpiValue * 1.1 / 5) * 5; 
  
  const getOrigin = (l: any) =>
    l.origen || l.origin || l.channel || l.source || "Desconocido";
    
  const origenMap: Record<string, number> = {};
  validLeads.forEach((l) => { // Usamos validLeads
    const key = String(getOrigin(l));
    origenMap[key] = (origenMap[key] || 0) + 1;
  });
  const origenData = Object.entries(origenMap).map(([label, value]) => ({
    label,
    value,
  }));

  // 2. Cálculo para Leads por Origen
  const maxOrigenValue = Math.max(...origenData.map(item => item.value), 0);
  const origenYMax = Math.ceil(maxOrigenValue * 1.1 / 5) * 5;

  const statusData = validLeads.reduce((acc: any, l) => { // Usamos validLeads
    const k = l.status || "sin_estado";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(statusData).map(([name, value]) => ({
    name,
    value,
  }));

  // 🔥 3. CÁLCULO Y ORDENAMIENTO PARA LEADS POR FECHA
  const dateObjects: Record<string, { date: Date, count: number }> = {}; 
  
  validLeads.forEach((l) => {
    if (l.created_at) {
        // Usar la fecha sin hora para agrupar
        const dateObj = new Date(l.created_at);
        dateObj.setHours(0, 0, 0, 0); 
        
        // Usamos formato YYYY-MM-DD para la clave de agrupación
        const dateKey = dateObj.toISOString().split('T')[0]; 
        
        if (dateObjects[dateKey]) {
            dateObjects[dateKey].count += 1;
        } else {
            dateObjects[dateKey] = { date: dateObj, count: 1 };
        }
    }
  });

  // Convertir a array y ordenar cronológicamente por la fecha real
  const barData = Object.values(dateObjects)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map(item => ({
        // Formatear la fecha para la visualización (ej: DD/MM/YYYY)
        date: item.date.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-'),
        count: item.count,
    }));


  // 4. Cálculo para Leads por Fecha
  const maxFechaValue = Math.max(...barData.map(item => item.count), 0);
  const fechaYMax = Math.ceil(maxFechaValue * 1.1 / 5) * 5;
  // -------------------------------------------------------------------------

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  // 🔥 ESTILO DE TOOLTIP PERSONALIZADO PARA EL CONTENEDOR (Solo para los BarCharts)
  const customTooltipStyle = {
    backgroundColor: '#0d2236', // Fondo oscuro
    border: '1px solid #10b2cb', // Borde cian
    borderRadius: '8px',
    color: '#ffffff', // Esto solo afecta al texto si NO hay Custom component
    fontSize: '12px',
    padding: '8px',
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 bg-[#112f46] min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-white text-center">
          Panel de Leads
        </h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => (window.location.href = "/")}
            className="bg-white text-[#112f46] font-bold py-1 px-6 rounded-full shadow hover:bg-gray-100 transition-all border border-gray-200 text-sm"
          >
            Home
          </button>
          
          <span className="text-white font-medium text-sm sm:text-base">👤 {userName}</span>
          
          <button
            onClick={handleLogout}
            className="bg-white text-[#112f46] font-bold py-1 px-6 rounded-full shadow hover:bg-gray-100 transition-all border border-gray-200 text-sm"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      <p className="text-gray-300 text-center text-sm sm:text-lg">
        Métricas en tiempo real y detalle
      </p>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-4 sm:p-6 shadow-lg text-center">
          <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-cyan-400 mb-4">
            Indicadores Clave
          </h3>
          <ResponsiveContainer width="100%" height={200} className="sm:h-[250px] md:h-[300px]">
            <BarChart data={kpiData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              {/* KPI Y-AXIS AJUSTADO */}
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} domain={[0, kpiYMax]} /> 
              {/* Tooltip con estilo personalizado (Oscuro) */}
              <Tooltip contentStyle={customTooltipStyle} /> 
              {/* ANCHO DE BARRA FIJO */}
              <Bar dataKey="value" fill="#2c6bed" barSize={60} radius={[4, 4, 0, 0]}> 
                <LabelList dataKey="value" position="top" fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl bg-white p-4 sm:p-6 shadow-lg text-center">
          <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-cyan-400 mb-4">
            Leads por Origen
          </h3>
          <ResponsiveContainer width="100%" height={200} className="sm:h-[250px] md:h-[300px]">
            <BarChart data={origenData} margin={{ top: 20, right: 20, left: 20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              {/* Visualización de Fechas: Ajuste a ángulo más suave (-25) */}
              <XAxis dataKey="label" angle={-25} textAnchor="end" height={60} tick={{ fontSize: 10 }} />
              {/* ORIGEN Y-AXIS AJUSTADO */}
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} domain={[0, origenYMax]} />
              <Tooltip contentStyle={customTooltipStyle} />
              <Bar dataKey="value" fill="#2c6bed" name="Leads">
                <LabelList dataKey="value" position="top" fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg bg-white p-4 sm:p-6 shadow text-center">
          <h3 className="text-lg sm:text-xl md:text-2xl font-semibold mb-4">
            Leads por Estado
          </h3>
          <ResponsiveContainer width="100%" height={200} className="sm:h-[250px] md:h-[300px]">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={70}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              {/* 🔥 CORRECCIÓN FINAL: Usamos el Custom Tooltip para forzar el color del texto a blanco */}
              <Tooltip content={<CustomTooltip />} />
              <Legend layout="vertical" verticalAlign="middle" align="right" />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg bg-white p-4 sm:p-6 shadow text-center">
          <h3 className="text-lg sm:text-xl md:text-2xl font-semibold mb-4">
            Leads por Fecha
          </h3>
          <ResponsiveContainer width="100%" height={200} className="sm:h-[250px] md:h-[300px]">
            {/* barData ahora está ordenado cronológicamente */}
            <BarChart data={barData} margin={{ top: 20, right: 20, left: 20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              {/* Visualización de Fechas: Ajuste a ángulo más suave (-25) */}
              <XAxis dataKey="date" angle={-25} textAnchor="end" height={60} tick={{ fontSize: 10 }} />
              {/* FECHA Y-AXIS AJUSTADO */}
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} domain={[0, fechaYMax]}/> 
              <Tooltip contentStyle={customTooltipStyle} />
              <Bar dataKey="count" fill="#10b2cb">
                <LabelList dataKey="count" position="top" fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabla */}
      <LeadsTable leads={leads} setLeads={setLeads} session={session} />
    </div>
  );
}