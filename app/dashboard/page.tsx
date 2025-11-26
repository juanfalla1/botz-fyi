"use client";
export const dynamic = 'force-dynamic';
import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import Dashboard from "./Dashboard";
import Login from "./Login";

export default function Page() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) setSession(data.session);
      setLoading(false);
    };
    getSession();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#112f46] text-white">
        <p>Cargando...</p>
      </div>
    );
  }

  // 👇 Si no hay sesión → Login
  if (!session) return <Login />;

  // 👇 Si hay sesión → Dashboard
  return (
    // 🔥 CAMBIO: Usamos clases de Tailwind en lugar de style inline
    <div className="bg-[#112f46] min-h-screen"> 
      <main
        className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8" // 1200px es aprox max-w-6xl
      >
        <Dashboard />
      </main>
    </div>
  );
}