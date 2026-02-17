"use client";

import React, { useState } from "react";
import { supabase } from "../../supabaseClient"; // ✅ app/start/components -> app/supabaseClient

export default function AuthModal({
  open,
  onClose,
  onLoggedIn,
}: {
  open: boolean;
  onClose: () => void;
  onLoggedIn?: () => void;
}) {
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (!open) return null;

  const close = () => {
    setErr(null);
    setMsg(null);
    setMode("login");
    onClose();
  };

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setMsg(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      setMsg("✅ Sesión iniciada");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("botz-auth-refresh"));
      }
      onLoggedIn?.();
      close();
    } catch (e: any) {
      setErr(e?.message || "Error iniciando sesión");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setMsg(null);

    try {
      const redirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/auth/reset` : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;

      setMsg("📩 Te enviamos un correo para restablecer tu contraseña.");
    } catch (e: any) {
      setErr(e?.message || "Error enviando recuperación");
    } finally {
      setLoading(false);
    }
  }

  const cardStyle: React.CSSProperties = {
    width: "92vw",
    maxWidth: 520,
    borderRadius: 22,
    padding: 22,
    background:
      "linear-gradient(180deg, rgba(14,24,40,0.96) 0%, rgba(7,12,22,0.96) 100%)",
    border: "1px solid rgba(34,211,238,0.18)",
    boxShadow:
      "0 30px 90px rgba(0,0,0,0.55), 0 0 0 1px rgba(34,211,238,0.06) inset",
    position: "relative",
    overflow: "hidden",
  };

  const glowStyle: React.CSSProperties = {
    position: "absolute",
    inset: -120,
    background:
      "radial-gradient(circle at 20% 20%, rgba(34,211,238,0.18), transparent 55%), radial-gradient(circle at 80% 30%, rgba(99,102,241,0.16), transparent 60%), radial-gradient(circle at 50% 90%, rgba(16,185,129,0.10), transparent 55%)",
    filter: "blur(20px)",
    pointerEvents: "none",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    color: "rgba(226,232,240,0.80)",
    marginBottom: 6,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    borderRadius: 14,
    border: "1px solid rgba(34,211,238,0.22)",
    background: "rgba(2,6,23,0.55)",
    color: "#e2e8f0",
    padding: "12px 14px",
    outline: "none",
    boxShadow: "0 0 0 1px rgba(34,211,238,0.06) inset",
  };

  const btnPrimary: React.CSSProperties = {
    width: "100%",
    borderRadius: 14,
    border: "1px solid rgba(34,211,238,0.35)",
    background: "linear-gradient(180deg, rgba(34,211,238,0.22), rgba(34,211,238,0.10))",
    color: "#e2e8f0",
    padding: "12px 14px",
    cursor: "pointer",
    fontWeight: 800,
    letterSpacing: 0.2,
    boxShadow: "0 12px 40px rgba(34,211,238,0.12)",
  };

  const btnGhost: React.CSSProperties = {
    width: "100%",
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(255,255,255,0.04)",
    color: "rgba(226,232,240,0.9)",
    padding: "12px 14px",
    cursor: "pointer",
  };

  const smallLink: React.CSSProperties = {
    background: "transparent",
    border: "none",
    padding: 0,
    cursor: "pointer",
    textDecoration: "underline",
    color: "rgba(34,211,238,0.95)",
    fontSize: 13,
    fontWeight: 700,
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
      }}
    >
      <button
        onClick={close}
        aria-label="Cerrar"
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.62)",
          border: "none",
          backdropFilter: "blur(6px)",
        }}
      />

      <div style={cardStyle}>
        <div style={glowStyle} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: "rgba(34,211,238,0.85)", fontWeight: 800, letterSpacing: 0.8 }}>
              BOTZ ACCESS
            </div>
            <h2 style={{ margin: "6px 0 0", fontSize: 18, fontWeight: 900, color: "#e2e8f0" }}>
              {mode === "login" ? "Iniciar sesión" : "Recuperar contraseña"}
            </h2>
          </div>

          <button
            onClick={close}
            disabled={loading}
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              border: "1px solid rgba(148,163,184,0.18)",
              background: "rgba(255,255,255,0.06)",
              color: "#e2e8f0",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ height: 14 }} />

        {mode === "login" ? (
          <form onSubmit={handleLogin} style={{ display: "grid", gap: 12 }}>
            <div>
              <div style={labelStyle}>Correo</div>
              <input
                style={inputStyle}
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <div style={labelStyle}>Contraseña</div>
              <input
                style={inputStyle}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {err && (
              <div
                style={{
                  fontSize: 13,
                  color: "#fecaca",
                  background: "rgba(239,68,68,0.10)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  padding: "10px 12px",
                  borderRadius: 14,
                }}
              >
                {err}
              </div>
            )}

            {msg && (
              <div
                style={{
                  fontSize: 13,
                  color: "#bbf7d0",
                  background: "rgba(16,185,129,0.10)",
                  border: "1px solid rgba(16,185,129,0.25)",
                  padding: "10px 12px",
                  borderRadius: 14,
                }}
              >
                {msg}
              </div>
            )}

            <button type="submit" disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.75 : 1 }}>
              {loading ? "Ingresando..." : "Ingresar"}
            </button>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                type="button"
                style={smallLink}
                onClick={() => {
                  setMode("reset");
                  setErr(null);
                  setMsg(null);
                }}
                disabled={loading}
              >
                Olvidé mi contraseña
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleReset} style={{ display: "grid", gap: 12 }}>
            <div>
              <div style={labelStyle}>Correo</div>
              <input
                style={inputStyle}
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            {err && (
              <div
                style={{
                  fontSize: 13,
                  color: "#fecaca",
                  background: "rgba(239,68,68,0.10)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  padding: "10px 12px",
                  borderRadius: 14,
                }}
              >
                {err}
              </div>
            )}

            {msg && (
              <div
                style={{
                  fontSize: 13,
                  color: "#bbf7d0",
                  background: "rgba(16,185,129,0.10)",
                  border: "1px solid rgba(16,185,129,0.25)",
                  padding: "10px 12px",
                  borderRadius: 14,
                }}
              >
                {msg}
              </div>
            )}

            <button type="submit" disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.75 : 1 }}>
              {loading ? "Enviando..." : "Enviar correo de recuperación"}
            </button>

            <button
              type="button"
              disabled={loading}
              style={btnGhost}
              onClick={() => {
                setMode("login");
                setErr(null);
                setMsg(null);
              }}
            >
              Volver a login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
