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
    <div style={{ background: "var(--botz-bg)", minHeight: "100vh" }}>
      <main
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "32px 20px",
        }}
      >
        <Dashboard />
      </main>
    </div>
  );
}

