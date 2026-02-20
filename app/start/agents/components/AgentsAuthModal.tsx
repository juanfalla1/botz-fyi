"use client";

import React, { useState } from "react";
import { supabaseAgents } from "../supabaseAgentsClient";

export default function AgentsAuthModal({
  open,
  onClose,
  onLoggedIn,
}: {
  open: boolean;
  onClose: () => void;
  onLoggedIn?: () => void;
}) {
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
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

  async function handleGoogle() {
    setLoading(true);
    setErr(null);
    setMsg(null);
    try {
      const redirectUrl = typeof window !== "undefined" ? `${window.location.origin}/start/agents` : undefined;
      console.log("🔑 [AgentsAuth] Iniciando OAuth con Google, redirectTo:", redirectUrl);
      
      const { data, error } = await supabaseAgents.auth.signInWithOAuth({
        provider: "google",
        options: { 
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        },
      });
      
      console.log("🔑 [AgentsAuth] OAuth response:", { data, error });
      
      if (error) {
        console.error("🔑 [AgentsAuth] OAuth error:", error);
        throw error;
      }
      
      // Si no hay error pero tampoco hay data.url, algo salió mal
      if (!data?.url) {
        throw new Error("No se pudo iniciar el flujo de OAuth");
      }
      
      // El flujo de OAuth redirige automáticamente, no necesitamos hacer nada más
      console.log("🔑 [AgentsAuth] OAuth iniciado correctamente, redirigiendo a:", data.url);
      
    } catch (e: any) {
      console.error("🔑 [AgentsAuth] Error completo:", e);
      setErr(e?.message || "Error iniciando con Google");
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setMsg(null);

    try {
      const { data, error } = await supabaseAgents.auth.signInWithPassword({ email, password });
      if (error) throw error;

      setMsg("✅ Sesión iniciada. Cargando...");
      
      setTimeout(() => {
        onLoggedIn?.();
        close();
        window.location.reload();
      }, 800);
    } catch (e: any) {
      setErr(e?.message || "Error iniciando sesión");
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setMsg(null);
    try {
      const { data, error } = await supabaseAgents.auth.signUp({ email, password });
      if (error) throw error;

      if (!data?.session) {
        setMsg("Cuenta creada. Revisa tu correo para confirmar y luego inicia sesión.");
        setLoading(false);
        return;
      }

      setMsg("✅ Cuenta creada. Entrando...");
      setTimeout(() => {
        onLoggedIn?.();
        close();
        window.location.reload();
      }, 600);
    } catch (e: any) {
      setErr(e?.message || "Error creando cuenta");
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

      const { error } = await supabaseAgents.auth.resetPasswordForEmail(email, { redirectTo });
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

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: open ? "flex" : "none",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
      }}
      onClick={close}
    >
      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ position: "relative", zIndex: 1 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4, color: "#fff" }}>
            {mode === "login" ? "Iniciar Sesión - Agentes" : mode === "signup" ? "Crear Cuenta - Agentes" : "Recuperar Contraseña"}
          </h2>
          <p style={{ fontSize: 14, color: "rgba(226,232,240,0.6)", margin: "0 0 20px" }}>
            {mode === "login"
              ? "Accede a tu cuenta de Agentes"
              : mode === "signup"
              ? "Crea tu cuenta para Agentes"
              : "Te enviaremos un correo para resetear tu contraseña"}
          </p>

          {msg && (
            <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "#86efac", fontSize: 14 }}>
              {msg}
            </div>
          )}

          {err && (
            <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", fontSize: 14 }}>
              {err}
            </div>
          )}

          {mode === "login" && (
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                style={{
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid rgba(34,211,238,0.2)",
                  background: "rgba(0,0,0,0.3)",
                  color: "#fff",
                  fontSize: 14,
                }}
              />
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                style={{
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid rgba(34,211,238,0.2)",
                  background: "rgba(0,0,0,0.3)",
                  color: "#fff",
                  fontSize: 14,
                }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: 10,
                  borderRadius: 8,
                  border: "none",
                  background: "#0096ff",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.5 : 1,
                }}
              >
                {loading ? "Cargando..." : "Iniciar Sesión"}
              </button>
              
              <div style={{ marginTop: 8 }}>
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={loading}
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.2)",
                    background: "rgba(255,255,255,0.1)",
                    color: "#fff",
                    fontSize: 14,
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.5 : 1,
                    width: "100%",
                  }}
                >
                  Continuar con Google
                </button>
              </div>
            </form>
          )}

          {mode === "signup" && (
            <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                style={{
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid rgba(34,211,238,0.2)",
                  background: "rgba(0,0,0,0.3)",
                  color: "#fff",
                  fontSize: 14,
                }}
              />
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                style={{
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid rgba(34,211,238,0.2)",
                  background: "rgba(0,0,0,0.3)",
                  color: "#fff",
                  fontSize: 14,
                }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: 10,
                  borderRadius: 8,
                  border: "none",
                  background: "#0096ff",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.5 : 1,
                }}
              >
                {loading ? "Cargando..." : "Crear Cuenta"}
              </button>
            </form>
          )}

          {mode === "reset" && (
            <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                style={{
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid rgba(34,211,238,0.2)",
                  background: "rgba(0,0,0,0.3)",
                  color: "#fff",
                  fontSize: 14,
                }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: 10,
                  borderRadius: 8,
                  border: "none",
                  background: "#0096ff",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.5 : 1,
                }}
              >
                {loading ? "Cargando..." : "Enviar"}
              </button>
            </form>
          )}

          <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "center" }}>
            <button
              onClick={() => setMode("login")}
              style={{
                background: mode === "login" ? "#0096ff" : "transparent",
                border: "1px solid rgba(34,211,238,0.2)",
                color: "#fff",
                padding: "6px 12px",
                borderRadius: 6,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Login
            </button>
            <button
              onClick={() => setMode("signup")}
              style={{
                background: mode === "signup" ? "#0096ff" : "transparent",
                border: "1px solid rgba(34,211,238,0.2)",
                color: "#fff",
                padding: "6px 12px",
                borderRadius: 6,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Signup
            </button>
            <button
              onClick={() => setMode("reset")}
              style={{
                background: mode === "reset" ? "#0096ff" : "transparent",
                border: "1px solid rgba(34,211,238,0.2)",
                color: "#fff",
                padding: "6px 12px",
                borderRadius: 6,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
