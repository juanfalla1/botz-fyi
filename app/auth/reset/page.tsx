"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    // Cuando el usuario abre el link del correo, Supabase pone la sesión en la URL (hash)
    // y el cliente la detecta si detectSessionInUrl está habilitado.
    (async () => {
      setErr(null);
      setMsg(null);

      const { data, error } = await supabase.auth.getSession();
      if (error) {
        setErr(error.message);
        setHasSession(false);
        setLoading(false);
        return;
      }

      setHasSession(!!data.session);
      setLoading(false);
    })();
  }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    if (password.length < 6) {
      setErr("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== password2) {
      setErr("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setMsg("✅ Contraseña actualizada. Ya puedes iniciar sesión.");
      // opcional: cerrar sesión y volver al login
      await supabase.auth.signOut();
      // window.location.href = "/start"; // si quieres
    } catch (e: any) {
      setErr(e?.message || "No se pudo actualizar la contraseña.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 18 }}>
      <div
        style={{
          width: "92vw",
          maxWidth: 520,
          borderRadius: 22,
          padding: 22,
          background: "rgba(7,12,22,0.96)",
          border: "1px solid rgba(34,211,238,0.18)",
          boxShadow: "0 30px 90px rgba(0,0,0,0.55)",
          color: "#e2e8f0",
        }}
      >
        <div style={{ fontSize: 12, color: "rgba(34,211,238,0.85)", fontWeight: 800, letterSpacing: 0.8 }}>
          BOTZ ACCESS
        </div>
        <h1 style={{ margin: "6px 0 0", fontSize: 18, fontWeight: 900 }}>
          Restablecer contraseña
        </h1>

        <div style={{ height: 14 }} />

        {loading ? (
          <div>Cargando...</div>
        ) : !hasSession ? (
          <div style={{ fontSize: 13, color: "#fecaca" }}>
            No se detectó una sesión de recuperación. Abre esta página desde el link del correo de recuperación.
          </div>
        ) : (
          <form onSubmit={onSave} style={{ display: "grid", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: "rgba(226,232,240,0.80)", marginBottom: 6 }}>
                Nueva contraseña
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  borderRadius: 14,
                  border: "1px solid rgba(34,211,238,0.22)",
                  background: "rgba(2,6,23,0.55)",
                  color: "#e2e8f0",
                  padding: "12px 14px",
                  outline: "none",
                }}
                placeholder="••••••••"
                required
              />
            </div>

            <div>
              <div style={{ fontSize: 12, color: "rgba(226,232,240,0.80)", marginBottom: 6 }}>
                Confirmar contraseña
              </div>
              <input
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                style={{
                  width: "100%",
                  borderRadius: 14,
                  border: "1px solid rgba(34,211,238,0.22)",
                  background: "rgba(2,6,23,0.55)",
                  color: "#e2e8f0",
                  padding: "12px 14px",
                  outline: "none",
                }}
                placeholder="••••••••"
                required
              />
            </div>

            {err && (
              <div style={{ fontSize: 13, color: "#fecaca", background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.25)", padding: "10px 12px", borderRadius: 14 }}>
                {err}
              </div>
            )}

            {msg && (
              <div style={{ fontSize: 13, color: "#bbf7d0", background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.25)", padding: "10px 12px", borderRadius: 14 }}>
                {msg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                borderRadius: 14,
                border: "1px solid rgba(34,211,238,0.35)",
                background: "linear-gradient(180deg, rgba(34,211,238,0.22), rgba(34,211,238,0.10))",
                color: "#e2e8f0",
                padding: "12px 14px",
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              {loading ? "Guardando..." : "Guardar nueva contraseña"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
