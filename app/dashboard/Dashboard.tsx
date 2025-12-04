"use client";
export const dynamic = "force-dynamic";

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
  LabelList,
  Line
} from "recharts";
import LeadsTable from "./LeadsTable";

// 🔥 CUSTOM TOOLTIP PARA PIE CHART
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const name = payload[0].name;
    const value = payload[0].value;

    return (
      <div
        style={{
          backgroundColor: "#0d2236",
          border: "1px solid #10b2cb",
          borderRadius: "8px",
          padding: "8px 12px",
          color: "#ffffff",
          fontSize: "12px",
        }}
      >
        <p className="label font-bold capitalize">{`${name}`}</p>
        <p className="desc text-cyan-400">{`Leads: ${value}`}</p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [leads, setLeads] = useState<any[]>([]);
  const [session, setSession] = useState<any>(null);
  const [userName, setUserName] = useState("");

  // Revisar sesión
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

  // Traer leads cuando haya sesión
  useEffect(() => {
    if (session) fetchLeads();
  }, [session]);

  const fetchLeads = async () => {
    if (!session) return;

    const { data: leadsData } = await supabase
      .from("leads")
      .select(
        "id, name, email, phone, company, interest, status, created_at, user_id, notes, next_action, calificacion, etapa, resumen_chat, origen, next_call_date"
      )
      .eq("user_id", session.user.id);

    const { data: trackerData } = await supabase
      .from("demo_tracker_botz")
      .select(
        "id, name, email, phone, company, interest, status, created_at, user_id"
      )
      .eq("user_id", session.user.id);

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
        notes: l.notes,
        next_action: l.next_action,
        calificacion: l.calificacion,
        etapa: l.etapa,
        resumen_chat: l.resumen_chat,
        origen: l.origen || l.source || "web",
        next_call_date: l.next_call_date,
      }));

    const allData = [
      ...normalize(leadsData || [], "leads"),
      ...normalize(trackerData || [], "demo_tracker_botz"),
    ];

    setLeads(allData);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    window.location.href = "/";
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#112f46] text-white">
        <p className="text-xl">Debes iniciar sesión para ver el Dashboard.</p>
      </div>
    );
  }

  // ================= KPIs =================
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

  // ========== MES → LEADS + CONVERSIÓN ==========
  const conversionPorMes: any = {};

  validLeads.forEach((l) => {
    if (!l.created_at) return;

    const fecha = new Date(l.created_at);
    const key = fecha.toLocaleDateString("es-ES", {
      month: "short",
      year: "numeric",
    });

    const esConvertido = estadosGanadores.includes(
      String(l.status || "").toLowerCase()
    );

    if (!conversionPorMes[key]) {
      conversionPorMes[key] = { leads: 0, convertidos: 0 };
    }

    conversionPorMes[key].leads++;
    if (esConvertido) conversionPorMes[key].convertidos++;
  });

  const mesesCombinadosData = Object.entries(conversionPorMes)
    .map(([mes, obj]: any) => ({
      mes,
      leads: obj.leads,
      conversion:
        obj.leads > 0
          ? Number(((obj.convertidos / obj.leads) * 100).toFixed(1))
          : 0,
    }))
    .sort((a: any, b: any) => {
      const d1 = new Date("01 " + a.mes);
      const d2 = new Date("01 " + b.mes);
      return d1 - d2;
    });

  // ================= LEADS POR ORIGEN =================
  const getOrigin = (l: any) =>
    l.origen || l.origin || l.channel || l.source || "Desconocido";

  const origenMap: Record<string, number> = {};
  validLeads.forEach((l) => {
    const key = String(getOrigin(l));
    origenMap[key] = (origenMap[key] || 0) + 1;
  });

  const origenData = Object.entries(origenMap).map(([label, value]) => ({
    label,
    value,
  }));

  // ================= LEADS POR ESTADO =================
  const statusData = validLeads.reduce((acc: any, l) => {
    const k = l.status || "sin_estado";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(statusData).map(([name, value]) => ({
    name,
    value,
  }));

  // ================= LEADS POR DÍA =================
  const fechaDataMap: Record<
    string,
    { date: Date; count: number; displayDate: string }
  > = {};

  validLeads.forEach((l) => {
    if (!l.created_at) return;

    const dateObj = new Date(l.created_at);
    dateObj.setHours(0, 0, 0, 0);

    const dateKey = dateObj.toISOString().split("T")[0];
    const displayDate = dateObj.toLocaleDateString("es-ES");

    if (fechaDataMap[dateKey]) {
      fechaDataMap[dateKey].count += 1;
    } else {
      fechaDataMap[dateKey] = { date: dateObj, count: 1, displayDate };
    }
  });

  const barData = Object.values(fechaDataMap)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((item) => ({
      date: item.displayDate,
      count: item.count,
    }));

  // ================= COLORES =================
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

  const customTooltipStyle = {
    backgroundColor: "#0d2236",
    border: "1px solid #10b2cb",
    borderRadius: "8px",
    color: "#ffffff",
    fontSize: "12px",
    padding: "8px",
  };

  // ================= UI =================
  return (
    <div className="space-y-6 p-4 sm:p-6 bg-[#112f46] min-h-screen">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-white text-center">
          Panel de Leads
        </h1>

        <div className="flex items-center gap-4">
          <button
            onClick={() => (window.location.href = "/")}
            className="bg-white text-[#112f46] font-bold py-1 px-6 rounded-full"
          >
            Home
          </button>
          <span className="text-white font-medium text-sm sm:text-base">
            👤 {userName}
          </span>
          <button
            onClick={handleLogout}
            className="bg-white text-[#112f46] font-bold py-1 px-6 rounded-full"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      <p className="text-gray-300 text-center text-sm sm:text-lg">
        Métricas en tiempo real y detalle
      </p>

      {/* ===================== KPI COMBINADO: LEADS + CONVERSIÓN POR MES ===================== */}
      <div className="rounded-2xl bg-white p-4 sm:p-6 shadow-lg text-center">
        <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-cyan-400 mb-4">
          Indicadores Clave
        </h3>

        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={mesesCombinadosData}>
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis
              dataKey="mes"
              tick={{ fontSize: 12 }}
              angle={-25}
              textAnchor="end"
              height={60}
            />

            <YAxis
              yAxisId="left"
              allowDecimals={false}
              tick={{ fontSize: 12 }}
            />

            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
            />

            <Tooltip contentStyle={customTooltipStyle} />

            {/* BARRAS = LEADS */}
            <Bar
              yAxisId="left"
              dataKey="leads"
              fill="#2c6bed"
              barSize={60}
              radius={[4, 4, 0, 0]}
            >
              <LabelList dataKey="leads" position="top" fontSize={12} />
            </Bar>

            {/* LÍNEA = CONVERSIÓN */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="conversion"
              stroke="#10b2cb"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />

            <Legend />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ===================== LEADS POR ORIGEN ===================== */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-2xl bg-white p-4 sm:p-6 shadow-lg text-center">
          <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-cyan-400 mb-4">
            Leads por Origen
          </h3>

          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={origenData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                angle={-25}
                textAnchor="end"
                height={60}
                tick={{ fontSize: 10 }}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={customTooltipStyle} />

              <Bar dataKey="value" fill="#2c6bed">
                <LabelList dataKey="value" position="top" fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ===================== LEADS POR ESTADO ===================== */}
        <div className="rounded-lg bg-white p-4 sm:p-6 shadow text-center">
          <h3 className="text-lg sm:text-xl md:text-2xl font-semibold mb-4">
            Leads por Estado
          </h3>

          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={70}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend layout="vertical" verticalAlign="middle" align="right" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ===================== LEADS POR DÍA ===================== */}
      <div className="rounded-lg bg-white p-4 sm:p-6 shadow text-center">
        <h3 className="text-lg sm:text-xl md:text-2xl font-semibold mb-4">
          Leads por Día
        </h3>

        <div style={{ width: "100%", overflowX: "auto" }}>
          <div style={{ width: Math.max(barData.length * 80, 800) }}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  angle={-35}
                  textAnchor="end"
                  height={60}
                  tick={{ fontSize: 10 }}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Bar dataKey="count" fill="#10b2cb">
                  <LabelList dataKey="count" position="top" fontSize={12} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* TABLA */}
      <LeadsTable leads={leads} setLeads={setLeads} session={session} />
    </div>
  );
}
