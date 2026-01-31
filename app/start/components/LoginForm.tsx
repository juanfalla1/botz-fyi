"use client";
import React, { useState } from "react";
import { supabase } from "./supabaseClient"; 
import { Mail, Lock, LogIn, Loader2, AlertCircle } from "lucide-react";

interface LoginFormProps {
  onSuccess: (userData?: { rol: string; nombre: string }) => void;
  onRegisterClick?: () => void; // Nuevo: para ir a registro
}

export default function LoginForm({ onSuccess, onRegisterClick }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      if (data.session) {
        // Obtener perfil del usuario (rol y nombre)
        const { data: profileData } = await supabase
          .from("team_members")
          .select("id, nombre, rol, activo")
          .eq("user_id", data.session.user.id)
          .single();

        if (profileData && !profileData.activo) {
          await supabase.auth.signOut();
          throw new Error("Tu cuenta ha sido desactivada. Contacta al administrador.");
        }

        // Pasar datos al callback (o valores por defecto si no tiene perfil)
        onSuccess({
          rol: profileData?.rol || "admin",
          nombre: profileData?.nombre || email.split("@")[0]
        });
      }
    } catch (err: any) {
      if (err.message.includes("Invalid login")) {
        setError("Email o contraseña incorrectos");
      } else if (err.message.includes("Email not confirmed")) {
        setError("Debes confirmar tu email antes de iniciar sesión");
      } else {
        setError(err.message || "Error al iniciar sesión");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 12px 12px 45px",
    borderRadius: "12px",
    background: "rgba(30, 41, 59, 0.5)",
    border: "1px solid rgba(71, 85, 105, 0.5)",
    color: "#fff",
    outline: "none",
    fontSize: "14px",
    boxSizing: "border-box"
  };

  return (
    <div style={{
      width: "100%",
      maxWidth: "400px",
      margin: "0 auto",
      background: "rgba(15, 23, 42, 0.9)",
      backdropFilter: "blur(20px)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "24px",
      padding: "40px",
      boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
      textAlign: "center",
      boxSizing: "border-box"
    }}>
      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "center" }}>
        <div style={{ background: "rgba(59, 130, 246, 0.2)", padding: "16px", borderRadius: "50%", color: "#60a5fa" }}>
          <Lock size={32} />
        </div>
      </div>
      
      <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "#fff", marginBottom: "8px" }}>Bienvenido a Botz</h2>
      <p style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "30px" }}>Ingresa para gestionar tus leads reales</p>

      <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        
        {/* Email Input */}
        <div style={{ position: "relative", width: "100%" }}>
          <Mail size={18} color="#94a3b8" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input 
            type="email" 
            placeholder="correo@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
        </div>

        {/* Password Input */}
        <div style={{ position: "relative", width: "100%" }}>
          <Lock size={18} color="#94a3b8" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input 
            type="password" 
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={inputStyle}
          />
        </div>

        {error && (
          <div style={{ background: "rgba(239, 68, 68, 0.1)", color: "#fca5a5", padding: "10px", borderRadius: "8px", fontSize: "12px", display: "flex", alignItems: "center", gap: "8px", textAlign: "left" }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} /> 
            <span>{error}</span>
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading}
          style={{
            background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
            color: "#fff",
            padding: "14px",
            borderRadius: "12px",
            border: "none",
            fontWeight: "bold",
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            marginTop: "10px",
            opacity: loading ? 0.7 : 1,
            width: "100%",
            boxSizing: "border-box"
          }}
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <LogIn size={20} />}
          {loading ? "Entrando..." : "Iniciar Sesión"}
        </button>
      </form>
      
      <p style={{ marginTop: "20px", fontSize: "12px", color: "#64748b" }}>
        ¿Eres nuevo en el equipo?{" "}
        <span 
          onClick={onRegisterClick}
          style={{ color: "#60a5fa", cursor: "pointer", textDecoration: "underline" }}
        >
          Crear cuenta
        </span>
      </p>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}