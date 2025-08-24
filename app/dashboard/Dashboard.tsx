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
import { motion } from "framer-motion";
import LeadsTable from "./LeadsTable";

export default function Dashboard() {
  const [leads, setLeads] = useState<any[]>([]);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // auth
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [name, setName] = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setSession(data.session);
        setUserName(
          data.session.user.user_metadata.full_name || data.session.user.email
        );
      }
      setLoading(false);
    };
    checkSession();
  }, []);

  useEffect(() => {
    if (session) fetchLeads();
  }, [session]);

  const fetchLeads = async () => {
    const { data, error } = await supabase
      .from("leads")
      .select("id, name, email, phone, company, interest, status, created_at");
    if (!error) setLeads(data || []);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#112f46] text-white">
        <p className="animate-pulse">Cargando...</p>
      </div>
    );
  }

  // 🔹 Pantalla Login / Registro
  if (!session) {
    return (
      <div className="relative min-h-screen w-full">
        {/* 🔹 Botón Home fijo arriba derecha */}
        <div className="absolute top-4 right-6 z-50">
          <button
            onClick={() => (window.location.href = "/")}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 
                       hover:from-blue-700 hover:to-cyan-600 text-white px-5 py-2 
                       rounded-xl shadow-lg hover:shadow-xl transition-transform 
                       transform hover:scale-105"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9.75L12 4l9 5.75M4.5 10.5v9.75h15V10.5M9 21V12h6v9"
              />
            </svg>
            Home
          </button>
        </div>

        <motion.div
          className="flex flex-col items-center justify-center min-h-screen w-full"
          style={{
            backgroundImage: "url('/bg-leads.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundAttachment: "fixed",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        >
          {/* ✅ Card flotante animado con tilt */}
          <motion.div
            initial={{ x: 200, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 60, damping: 15 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            onMouseMove={(e) => {
              const card = e.currentTarget;
              const rect = card.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              const rotateX = (y / rect.height - 0.5) * 10;
              const rotateY = (x / rect.width - 0.5) * -10;
              card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.03)`;
            }}
            onMouseLeave={(e) => {
              const card = e.currentTarget;
              card.style.transform = "rotateX(0deg) rotateY(0deg) scale(1)";
            }}
            className="relative w-[320px] p-8 rounded-2xl shadow-[0_0_30px_rgba(16,178,203,0.5)] 
                       bg-[#0d2236]/70 backdrop-blur-xl border border-[#10b2cb]/40 
                       hover:shadow-[0_0_40px_rgba(16,178,203,0.8)] transition-transform duration-300 mr-10"
          >
            {/* Glow animado */}
            <motion.div
              className="absolute -inset-0.5 bg-gradient-to-r from-[#10b2cb] via-[#2c6bed] to-[#10b2cb] rounded-2xl blur opacity-40"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ repeat: Infinity, duration: 3 }}
            ></motion.div>

            <div className="relative z-10 text-white">
              <h2 className="text-2xl font-bold mb-6 text-right">
                {mode === "login"
                  ? "Bienvenido de nuevo 👋"
                  : "Crea tu cuenta 🚀"}
              </h2>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (mode === "login") {
                    const { error } = await supabase.auth.signInWithPassword({
                      email,
                      password: pwd,
                    });
                    if (error) alert("Error al iniciar sesión: " + error.message);
                    else location.reload();
                  } else {
                    const { error } = await supabase.auth.signUp({
                      email,
                      password: pwd,
                      options: { data: { full_name: name } },
                    });
                    if (error) alert("Error al registrarse: " + error.message);
                    else {
                      alert("Cuenta creada, revisa tu correo para confirmar ✅");
                      setMode("login");
                    }
                  }
                }}
                className="flex flex-col gap-4"
              >
                {mode === "signup" && (
                  <input
                    type="text"
                    placeholder="Nombre completo"
                    className="p-3 rounded-lg text-black focus:ring-2 focus:ring-[#10b2cb]"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                )}
                <input
                  type="email"
                  placeholder="Correo"
                  className="p-3 rounded-lg text-black focus:ring-2 focus:ring-[#10b2cb]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <input
                  type="password"
                  placeholder="Contraseña"
                  className="p-3 rounded-lg text-black focus:ring-2 focus:ring-[#10b2cb]"
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  required
                />
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gradient-to-r from-[#10b2cb] to-[#2c6bed] py-3 rounded-lg font-semibold hover:opacity-90 transition"
                >
                  {mode === "login" ? "Entrar" : "Registrarse"}
                </motion.button>
              </form>

              <p className="mt-6 text-right text-sm text-gray-300">
                {mode === "login" ? (
                  <>
                    ¿No tienes cuenta?{" "}
                    <button
                      className="underline text-[#10b2cb]"
                      onClick={() => setMode("signup")}
                    >
                      Regístrate aquí
                    </button>
                  </>
                ) : (
                  <>
                    ¿Ya tienes cuenta?{" "}
                    <button
                      className="underline text-[#10b2cb]"
                      onClick={() => setMode("login")}
                    >
                      Inicia sesión
                    </button>
                  </>
                )}
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // 🔹 Dashboard con sesión
  const total = leads.length;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const leadsMes = leads.filter((l) => {
    if (!l.created_at) return false;
    const d = new Date(l.created_at);
    return d >= monthStart && d <= now;
  }).length;

  const metaMes = 200;
  const avanceMes = metaMes
    ? Math.min(100, Math.round((leadsMes / metaMes) * 100))
    : 0;

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
  const metaConversion = 30;
  const tasaConversionNum = total ? (convertidos / total) * 100 : 0;
  const tasaConversion = Math.round(tasaConversionNum);
  const avanceConversion = Math.min(
    100,
    Math.round((tasaConversion / metaConversion) * 100)
  );

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

  return (
    <div className="space-y-6 p-6 bg-[#112f46] min-h-screen">
      {/* Header con usuario + logout + botón Home */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Panel de Leads</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => (window.location.href = "/")}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 
                       hover:from-blue-700 hover:to-cyan-600 text-white px-5 py-2 
                       rounded-xl shadow-lg hover:shadow-xl transition-transform 
                       transform hover:scale-105"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9.75L12 4l9 5.75M4.5 10.5v9.75h15V10.5M9 21V12h6v9"
              />
            </svg>
            Home
          </button>
          <span className="text-white font-medium">👤 {userName}</span>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      <p className="text-gray-300">Métricas en tiempo real y detalle</p>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-2xl bg-white p-6 shadow-lg hover:shadow-xl transition">
          <h3 className="text-xl font-semibold text-[#112f46]">Leads del Mes</h3>
          <div className="mt-4">
            <div className="text-5xl font-bold text-[#2c6bed]">{leadsMes}</div>
            <div className="mt-2 flex items-center justify-between text-gray-600">
              <span>Meta: {metaMes}</span>
              <span>{avanceMes}%</span>
            </div>
            <div className="relative mt-3 w-full h-4 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 h-4 rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${avanceMes}%`,
                  backgroundColor: "#FFD700",
                }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-lg hover:shadow-xl transition">
          <h3 className="text-xl font-semibold text-[#112f46]">
            Tasa de Conversión
          </h3>
          <div className="mt-4">
            <div className="text-5xl font-bold text-[#2c6bed]">
              {tasaConversion}%
            </div>
            <div className="mt-2 flex items-center justify-between text-gray-600">
              <span>Meta: {metaConversion}%</span>
              <span>{avanceConversion}%</span>
            </div>
            <div className="relative mt-3 w-full h-4 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 h-4 rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${avanceConversion}%`,
                  backgroundColor: "#10b2cb",
                }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-lg hover:shadow-xl transition">
          <h3 className="text-xl font-semibold text-[#112f46]">
            Leads por Origen
          </h3>
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
        <div className="rounded-lg bg-white p-4 shadow hover:shadow-lg transition">
          <h3 className="mb-2 font-semibold">Leads por Estado</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                outerRadius={90}
              >
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

        <div className="rounded-lg bg-white p-4 shadow hover:shadow-lg transition">
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

      {/* Tabla de Leads */}
      <LeadsTable leads={leads} setLeads={setLeads} />
    </div>
  );
}

