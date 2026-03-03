"use client";

import React, { useState } from "react";
import { supabaseAgents } from "../supabaseAgentsClient";
import useBotzLanguage from "../../hooks/useBotzLanguage";

export default function AgentsAuthModal({
  open,
  onClose,
  onLoggedIn,
}: {
  open: boolean;
  onClose: () => void;
  onLoggedIn?: () => void;
}) {
  const language = useBotzLanguage("es");
  const tr = (es: string, en: string) => (language === "en" ? en : es);
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (!open) return null;

  const authErrorText = (mode: "login" | "signup" | "reset", raw: string) => {
    const msg = String(raw || "").toLowerCase();
    if (mode === "login") {
      if (/invalid login credentials|invalid credentials/.test(msg)) {
        return tr("Correo o contrasena incorrectos.", "Incorrect email or password.");
      }
      if (/email not confirmed/.test(msg)) {
        return tr("Debes confirmar tu correo antes de iniciar sesion.", "You must confirm your email before signing in.");
      }
      return raw || tr("Error iniciando sesion", "Sign-in error");
    }

    if (mode === "signup") {
      if (/user already registered|already registered/.test(msg)) {
        return tr(
          "Este correo ya esta registrado. Usa Iniciar sesion o Recuperar contrasena.",
          "This email is already registered. Use Sign in or Reset password."
        );
      }
      if (/password should be at least/i.test(msg)) {
        return tr("La contrasena debe tener al menos 6 caracteres.", "Password must be at least 6 characters.");
      }
      return raw || tr("Error creando cuenta", "Sign-up error");
    }

    if (/invalid email/.test(msg)) return tr("Correo invalido.", "Invalid email.");
    return raw || tr("Error enviando recuperacion", "Password reset request error");
  };

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
      console.log("[AgentsAuth] Starting Google OAuth, redirectTo:", redirectUrl);
      
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
      
      console.log("[AgentsAuth] OAuth response:", { data, error });
      
      if (error) {
        console.error("[AgentsAuth] OAuth error:", error);
        throw error;
      }

      if (!data?.url) {
        throw new Error(tr("No se pudo iniciar el flujo de OAuth", "Could not start OAuth flow"));
      }

      console.log("[AgentsAuth] OAuth started successfully, redirecting to:", data.url);

    } catch (e: any) {
      console.error("[AgentsAuth] Full error:", e);
      setErr(e?.message || tr("Error iniciando con Google", "Error signing in with Google"));
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setMsg(null);

    try {
      const normalizedEmail = String(email || "").trim().toLowerCase();
      const { data, error } = await supabaseAgents.auth.signInWithPassword({ email: normalizedEmail, password });
      if (error) throw error;

      setMsg(tr("Sesion iniciada. Cargando...", "Signed in. Loading..."));
      
      setTimeout(() => {
        onLoggedIn?.();
        close();
        window.location.reload();
      }, 800);
    } catch (e: any) {
      const raw = String(e?.message || "");
      setErr(authErrorText("login", raw));
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setMsg(null);
    try {
      const normalizedEmail = String(email || "").trim().toLowerCase();
      const emailRedirectTo = typeof window !== "undefined" ? `${window.location.origin}/start/agents` : undefined;
      const { data, error } = await supabaseAgents.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo,
          data: { product_key: "agents" },
        },
      });
      if (error) throw error;

      const maybeIdentities = (data?.user as any)?.identities;
      const emailAlreadyExists = Array.isArray(maybeIdentities) && maybeIdentities.length === 0;
      if (emailAlreadyExists) {
        setErr(tr("Este correo ya esta registrado. Usa Iniciar sesion o Recuperar.", "This email is already registered. Use Sign in or Reset."));
        setLoading(false);
        return;
      }

      if (!data?.user) {
        setErr(tr("No se pudo crear la cuenta. Intenta de nuevo.", "Could not create account. Try again."));
        setLoading(false);
        return;
      }

      const isYahoo = /@(yahoo\.com|yahoo\.es|yahoo\.com\.[a-z]{2})$/i.test(normalizedEmail);

      if (!data?.session) {
        setMsg(
          isYahoo
            ? tr(
                "Cuenta creada. Revisa tu correo para confirmar (tambien Spam/No deseado en Yahoo) y luego inicia sesion.",
                "Account created. Check your email to confirm (also Spam/Junk in Yahoo), then sign in."
              )
            : tr(
                "Cuenta creada. Revisa tu correo para confirmar y luego inicia sesion.",
                "Account created. Check your email to confirm, then sign in."
              )
        );
        setLoading(false);
        return;
      }

      setMsg(tr("Cuenta creada con exito. Entrando...", "Account created successfully. Entering..."));
      setTimeout(() => {
        onLoggedIn?.();
        close();
        window.location.reload();
      }, 600);
    } catch (e: any) {
      const raw = String(e?.message || "");
      setErr(authErrorText("signup", raw));
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setMsg(null);

    try {
      const normalizedEmail = String(email || "").trim().toLowerCase();
      const redirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/start/agents/reset` : undefined;

      const { error } = await supabaseAgents.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });
      if (error) throw error;

      setMsg(tr("Te enviamos un correo para restablecer tu contrasena.", "We sent you an email to reset your password."));
    } catch (e: any) {
      const raw = String(e?.message || "");
      setErr(authErrorText("reset", raw));
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
            {mode === "login"
              ? tr("Iniciar sesion - Agentes", "Sign in - Agents")
              : mode === "signup"
              ? tr("Crear cuenta - Agentes", "Create account - Agents")
              : tr("Recuperar contrasena", "Reset password")}
          </h2>
          <p style={{ fontSize: 14, color: "rgba(226,232,240,0.6)", margin: "0 0 20px" }}>
            {mode === "login"
              ? tr("Accede a tu cuenta de Agentes", "Access your Agents account")
              : mode === "signup"
              ? tr("Crea tu cuenta para Agentes", "Create your Agents account")
              : tr("Te enviaremos un correo para resetear tu contrasena", "We will send you an email to reset your password")}
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
                placeholder={tr("Contrasena", "Password")}
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
                {loading ? tr("Cargando...", "Loading...") : tr("Iniciar sesion", "Sign in")}
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
                  {tr("Continuar con Google", "Continue with Google")}
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
                placeholder={tr("Contrasena", "Password")}
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
                {loading ? tr("Cargando...", "Loading...") : tr("Crear cuenta", "Create account")}
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
                {loading ? tr("Cargando...", "Loading...") : tr("Enviar", "Send")}
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
              {tr("Iniciar sesion", "Sign in")}
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
              {tr("Crear cuenta", "Create account")}
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
              {tr("Recuperar", "Reset")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
