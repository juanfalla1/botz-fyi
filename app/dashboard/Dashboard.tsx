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
} from "recharts";
import LeadsTable from "./LeadsTable";

/* ===========================
   Modales Login / Registro
=========================== */
function AuthModals() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [name, setName] = useState("");

  (globalThis as any).openLogin = () => setLoginOpen(true);
  (globalThis as any).openSignup = () => setSignupOpen(true);

  return (
    <>
      {/* Modal Login */}
      {loginOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-96 rounded-lg bg-white p-6">
            <h3 className="mb-4 text-xl font-bold text-[#112f46]">Iniciar Sesión</h3>
            <input
              type="email"
              placeholder="Email"
              className="mb-3 w-full rounded border p-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Contraseña"
              className="mb-3 w-full rounded border p-2"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                className="rounded bg-gray-300 px-3 py-1"
                onClick={() => setLoginOpen(false)}
              >
                Cancelar
              </button>
              <button className="rounded bg-[#10b2cb] px-3 py-1 text-white">
                Ingresar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Registro */}
      {signupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-96 rounded-lg bg-white p-6">
            <h3 className="mb-4 text-xl font-bold text-[#112f46]">Crear Cuenta</h3>
            <input
              type="text"
              placeholder="Nombre completo"
              className="mb-3 w-full rounded border p-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              type="email"
              placeholder="Email"
              className="mb-3 w-full rounded border p-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Contraseña"
              className="mb-3 w-full rounded border p-2"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                className="rounded bg-gray-300 px-3 py-1"
                onClick={() => setSignupOpen(false)}
              >
                Cancelar
              </button>
              <button className="rounded bg-[#10b2cb] px-3 py-1 text-white">
                Registrarse
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ===========================
          Dashboard
=========================== */
export default function Dashboard() {
  const [leads, setLeads] = useState<any[]>([]);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    const { data, error } = await supabase
      .from("leads")
      .select("id, name, email, phone, company, interest, status, created_at"); // 👈 aquí incluimos id
    if (!error) setLeads(data || []);
  };

  // KPIs base
  const total = leads.length;

  // Leads del mes
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const leadsMes = leads.filter((l) => {
    if (!l.created_at) return false;
    const d = new Date(l.created_at);
    return d >= monthStart && d <= now;
  }).length;

  const metaMes = 200;
  const avanceMes = metaMes ? Math.min(100, Math.round((leadsMes / metaMes) * 100)) : 0;

  // Tasa de conversión
  const estadosGanadores = ["convertido", "won", "sale", "closed", "cerrado", "vendido"];
  const convertidos = leads.filter((l) =>
    estadosGanadores.includes(String(l.status || "").toLowerCase())
  ).length;
  const metaConversion = 30;
  const tasaConversionNum = total ? (convertidos / total) * 100 : 0;
  const tasaConversion = Math.round(tasaConversionNum);
  const avanceConversion = Math.min(100, Math.round((tasaConversion / metaConversion) * 100));

  // Origen
  const getOrigin = (l: any) => l.origin || l.channel || l.source || l.company || "Desconocido";
  const origenMap: Record<string, number> = {};
  leads.forEach((l) => {
    const key = String(getOrigin(l));
    origenMap[key] = (origenMap[key] || 0) + 1;
  });
  const origenData = Object.entries(origenMap).map(([label, value]) => ({ label, value }));

  // Estado
  const statusData = leads.reduce((acc: any, l) => {
    const k = l.status || "sin_estado";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(statusData).map(([name, value]) => ({ name, value }));

  // Por fecha
  const fechaData: Record<string, number> = {};
  leads.forEach((l) => {
    const d = l.created_at ? new Date(l.created_at).toLocaleDateString() : "Sin fecha";
    fechaData[d] = (fechaData[d] || 0) + 1;
  });
  const barData = Object.entries(fechaData).map(([date, count]) => ({ date, count }));

  return (
    <div className="space-y-6 p-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Panel de Leads</h1>
        <div className="flex gap-2">
          <button
            className="rounded bg-[#10b2cb] px-3 py-1 text-white"
            onClick={() => (globalThis as any).openLogin()}
          >
            Login
          </button>
          <button
            className="rounded bg-white px-3 py-1 text-[#10b2cb]"
            onClick={() => (globalThis as any).openSignup()}
          >
            Registro
          </button>
        </div>
      </div>

      <p className="text-gray-300">Métricas en tiempo real y detalle</p>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Leads del Mes */}
        <div className="rounded-2xl bg-white p-6 shadow-lg">
          <h3 className="text-xl font-semibold text-[#112f46]">Leads del Mes</h3>
          <div className="mt-4">
            <div className="text-5xl font-bold text-[#2c6bed] bg-gradient-to-r from-yellow-400 to-orange-500 p-2 rounded-lg shadow-lg">
              {leadsMes}
            </div>
            <div className="mt-2 flex items-center justify-between text-gray-600">
              <span>Meta: {metaMes}</span>
              <span>{avanceMes}%</span>
            </div>
            <div className="relative mt-3 w-full h-6 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 h-6 rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${avanceMes}%`,
                  backgroundColor: "#FFD700",
                }}
              />
            </div>
          </div>
        </div>

        {/* Tasa de Conversión */}
        <div className="rounded-2xl bg-white p-6 shadow-lg">
          <h3 className="text-xl font-semibold text-[#112f46]">Tasa de Conversión</h3>
          <div className="mt-4">
            <div className="text-5xl font-bold text-[#2c6bed] bg-gradient-to-r from-green-400 to-blue-500 p-2 rounded-lg shadow-lg">
              {tasaConversion}%
            </div>
            <div className="mt-2 flex items-center justify-between text-gray-600">
              <span>Meta: {metaConversion}%</span>
              <span>{avanceConversion}%</span>
            </div>
            <div className="relative mt-3 w-full h-6 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 h-6 rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${avanceConversion}%`,
                  backgroundColor: "#FFD700",
                }}
              />
            </div>
          </div>
        </div>

        {/* Leads por Origen */}
        <div className="rounded-2xl bg-white p-6 shadow-lg">
          <h3 className="text-xl font-semibold text-[#112f46]">Leads por Origen</h3>
          <div className="mt-4" style={{ width: "100%", height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={origenData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#2c6bed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg bg-white p-4 shadow">
          <h3 className="mb-2 font-semibold">Leads por Estado</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90}>
                {pieData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={["#0088FE", "#00C49F", "#FFBB28", "#FF8042"][i % 4]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg bg-white p-4 shadow">
          <h3 className="mb-2 font-semibold">Leads por Fecha</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#10b2cb" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabla */}
      <LeadsTable leads={leads} setLeads={setLeads}  />

      {/* Modales */}
      <AuthModals />
    </div>
  );
}





