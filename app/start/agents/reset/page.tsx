"use client";

import React, { useEffect, useState } from "react";
import useBotzLanguage from "../../hooks/useBotzLanguage";
import { supabaseAgents } from "../supabaseAgentsClient";

export default function AgentsResetPasswordPage() {
  const language = useBotzLanguage("es");
  const tr = (es: string, en: string) => (language === "en" ? en : es);

  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setErr(null);
      setMsg(null);

      const { data, error } = await supabaseAgents.auth.getSession();
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
      setErr(tr("La contrasena debe tener al menos 6 caracteres.", "Password must be at least 6 characters."));
      return;
    }
    if (password !== password2) {
      setErr(tr("Las contrasenas no coinciden.", "Passwords do not match."));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabaseAgents.auth.updateUser({ password });
      if (error) throw error;

      setMsg(tr("Contrasena actualizada. Ya puedes iniciar sesion.", "Password updated. You can now sign in."));
      await supabaseAgents.auth.signOut();
    } catch (e: any) {
      setErr(e?.message || tr("No se pudo actualizar la contrasena.", "Could not update password."));
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
          BOTZ AGENTS
        </div>
        <h1 style={{ margin: "6px 0 0", fontSize: 18, fontWeight: 900 }}>
          {tr("Restablecer contrasena", "Reset password")}
        </h1>

        <div style={{ height: 14 }} />

        {loading ? (
          <div>{tr("Cargando...", "Loading...")}</div>
        ) : !hasSession ? (
          <div style={{ fontSize: 13, color: "#fecaca" }}>
            {tr(
              "No se detecto una sesion de recuperacion. Abre esta pagina desde el enlace del correo.",
              "No recovery session was detected. Open this page from the email reset link."
            )}
          </div>
        ) : (
          <form onSubmit={onSave} style={{ display: "grid", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: "rgba(226,232,240,0.80)", marginBottom: 6 }}>
                {tr("Nueva contrasena", "New password")}
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
                placeholder="........"
                required
              />
            </div>

            <div>
              <div style={{ fontSize: 12, color: "rgba(226,232,240,0.80)", marginBottom: 6 }}>
                {tr("Confirmar contrasena", "Confirm password")}
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
                placeholder="........"
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
              {loading ? tr("Guardando...", "Saving...") : tr("Guardar nueva contrasena", "Save new password")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
