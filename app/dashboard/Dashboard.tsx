"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
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
    const { data, error } = await supabase
      .from("leads")
      .select(
        "id, name, email, phone, company, interest, status, created_at, user_id"
      )
      .eq("user_id", session.user.id);
    if (!error) setLeads(data || []);
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
  const total = leads.length;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const leadsMes = leads.filter((l) => {
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
  const convertidos = leads.filter((l) =>
    estadosGanadores.includes(String(l.status || "").toLowerCase())
  ).length;
  const tasaConversionNum = total ? (convertidos / total) * 100 : 0;
  const tasaConversion = Math.round(tasaConversionNum);

  const kpiData = [
    { name: "Leads Mes", value: leadsMes },
    { name: "Conversión %", value: tasaConversion },
  ];

  const getOrigin = (l: any) =>
    l.origin || l.channel || l.source || l.company || "Desconocido";
  const origenMap: Record<string, number> = {};
  leads.forEach((l) => {
    const key = String(getOrigin(l));
    origenMap[key] = (origenMap[key] || 0) + 1;
  });
  const origenData = Object.entries(origenMap).map(([label, value]) => ({
    label,
    value,
  }));

  const statusData = leads.reduce((acc: any, l) => {
    const k = l.status || "sin_estado";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(statusData).map(([name, value]) => ({
    name,
    value,
  }));

  const fechaData: Record<string, number> = {};
  leads.forEach((l) => {
    const d = l.created_at
      ? new Date(l.created_at).toLocaleDateString()
      : "Sin fecha";
    fechaData[d] = (fechaData[d] || 0) + 1;
  });
  const barData = Object.entries(fechaData).map(([date, count]) => ({
    date,
    count,
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

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
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 
                       hover:from-blue-700 hover:to-cyan-600 text-white px-4 py-2 
                       rounded-xl shadow-lg hover:shadow-xl transition-transform 
                       transform hover:scale-105 text-sm sm:text-lg"
          >
            Home
          </button>
          <span className="text-white font-medium text-sm sm:text-lg">👤 {userName}</span>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition text-sm sm:text-lg"
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
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#2c6bed">
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
              <XAxis dataKey="label" angle={-45} textAnchor="end" height={60} tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: 'white', borderRadius: '5px', fontSize: '12px' }} />
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
                outerRadius={70} // más compacto en móvil
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend layout="vertical" verticalAlign="middle" align="right" />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg bg-white p-4 sm:p-6 shadow text-center">
          <h3 className="text-lg sm:text-xl md:text-2xl font-semibold mb-4">
            Leads por Fecha
          </h3>
          <ResponsiveContainer width="100%" height={200} className="sm:h-[250px] md:h-[300px]">
            <BarChart data={barData} margin={{ top: 20, right: 20, left: 20, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" angle={-45} textAnchor="end" height={60} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
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
