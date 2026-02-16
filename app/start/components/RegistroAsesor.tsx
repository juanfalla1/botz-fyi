"use client";
import React, { useState } from "react";
import { supabase } from "./supabaseClient"; 
import { Mail, Lock, User, Phone, UserPlus, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { isValidEmail, suggestEmailFix } from "../../utils/email";

interface RegistroAsesorProps {
  onSuccess?: () => void;
  onLoginClick?: () => void;
}

export default function RegistroAsesor({ onSuccess, onLoginClick }: RegistroAsesorProps) {
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    confirmEmail: "",
    telefono: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError(null);

    if (e.target.name === "email") {
      const s = suggestEmailFix(e.target.value);
      setEmailSuggestion(s?.suggested || null);
    }
  };

  const validateForm = () => {
    if (!formData.nombre.trim()) {
      setError("El nombre es requerido");
      return false;
    }
    if (!formData.email.trim()) {
      setError("El email es requerido");
      return false;
    }
    if (!isValidEmail(formData.email)) {
      setError("Email inválido");
      return false;
    }
    if (!formData.confirmEmail.trim()) {
      setError("Confirma tu email");
      return false;
    }
    if (formData.email.trim().toLowerCase() !== formData.confirmEmail.trim().toLowerCase()) {
      setError("Los correos no coinciden");
      return false;
    }
    if (formData.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No se pudo crear el usuario");

      // 2. Crear perfil en team_members
      const { error: profileError } = await supabase
        .from("team_members")
        .insert({
          user_id: authData.user.id,
          nombre: formData.nombre,
          email: formData.email,
          telefono: formData.telefono || null,
          rol: "asesor",
          activo: true,
        });

      if (profileError) {
        console.error("Error creating profile:", profileError);
      }

      setSuccess(true);
      
      setTimeout(() => {
        onSuccess?.();
      }, 2000);

    } catch (err: any) {
      console.error("Error en registro:", err);
      if (err.message.includes("already registered")) {
        setError("Este email ya está registrado. Intenta iniciar sesión.");
      } else {
        setError(err.message || "Error al registrar. Intenta de nuevo.");
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

  // Pantalla de éxito
  if (success) {
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
          <div style={{ 
            background: "rgba(34, 197, 94, 0.2)", 
            padding: "16px", 
            borderRadius: "50%", 
            color: "#4ade80",
            animation: "scaleIn 0.5s ease"
          }}>
            <CheckCircle size={32} />
          </div>
        </div>
        
        <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "#fff", marginBottom: "8px" }}>
          ¡Registro Exitoso!
        </h2>
        <p style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "20px" }}>
          Revisa tu email para confirmar tu cuenta.
          <br />
          Luego podrás iniciar sesión.
        </p>
        
        <button 
          onClick={onLoginClick}
          style={{
            background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
            color: "#fff",
            padding: "14px",
            borderRadius: "12px",
            border: "none",
            fontWeight: "bold",
            cursor: "pointer",
            width: "100%",
            boxSizing: "border-box"
          }}
        >
          Ir a Iniciar Sesión
        </button>

        <style>{`
          @keyframes scaleIn {
            from { transform: scale(0); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

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
        <div style={{ background: "rgba(139, 92, 246, 0.2)", padding: "16px", borderRadius: "50%", color: "#a78bfa" }}>
          <UserPlus size={32} />
        </div>
      </div>
      
      <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "#fff", marginBottom: "8px" }}>Crear Cuenta</h2>
      <p style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "30px" }}>Regístrate como asesor para gestionar leads</p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        
        {/* Nombre */}
        <div style={{ position: "relative", width: "100%" }}>
          <User size={18} color="#94a3b8" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input 
            type="text"
            name="nombre"
            placeholder="Nombre completo"
            value={formData.nombre}
            onChange={handleChange}
            required
            style={inputStyle}
          />
        </div>

        {/* Email */}
        <div style={{ position: "relative", width: "100%" }}>
          <Mail size={18} color="#94a3b8" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input 
            type="email"
            name="email"
            placeholder="correo@empresa.com"
            value={formData.email}
            onChange={handleChange}
            required
            style={inputStyle}
          />
        </div>

        {emailSuggestion && (
          <div
            style={{
              marginTop: "-6px",
              background: "rgba(34, 211, 238, 0.08)",
              border: "1px solid rgba(34, 211, 238, 0.18)",
              borderRadius: "12px",
              padding: "10px 12px",
              fontSize: "12px",
              color: "#cbd5e1",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
            }}
          >
            <span>
              Parece que quisiste decir: <strong style={{ color: "#22d3ee" }}>{emailSuggestion}</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                setFormData((prev) => ({ ...prev, email: emailSuggestion, confirmEmail: emailSuggestion }));
                setEmailSuggestion(null);
              }}
              style={{
                border: "1px solid rgba(34, 211, 238, 0.25)",
                background: "rgba(34, 211, 238, 0.12)",
                color: "#22d3ee",
                borderRadius: "10px",
                padding: "6px 10px",
                fontSize: "12px",
                fontWeight: 800,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Usar
            </button>
          </div>
        )}

        {/* Confirmar Email */}
        <div style={{ position: "relative", width: "100%" }}>
          <Mail size={18} color="#94a3b8" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            type="email"
            name="confirmEmail"
            placeholder="Confirmar correo"
            value={formData.confirmEmail}
            onChange={handleChange}
            required
            style={inputStyle}
          />
        </div>

        {/* Teléfono */}
        <div style={{ position: "relative", width: "100%" }}>
          <Phone size={18} color="#94a3b8" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input 
            type="tel"
            name="telefono"
            placeholder="Teléfono (opcional)"
            value={formData.telefono}
            onChange={handleChange}
            style={inputStyle}
          />
        </div>

        {/* Password */}
        <div style={{ position: "relative", width: "100%" }}>
          <Lock size={18} color="#94a3b8" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input 
            type="password"
            name="password"
            placeholder="Contraseña (mín. 6 caracteres)"
            value={formData.password}
            onChange={handleChange}
            required
            style={inputStyle}
          />
        </div>

        {/* Confirmar Password */}
        <div style={{ position: "relative", width: "100%" }}>
          <Lock size={18} color="#94a3b8" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input 
            type="password"
            name="confirmPassword"
            placeholder="Confirmar contraseña"
            value={formData.confirmPassword}
            onChange={handleChange}
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
            background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
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
            marginTop: "6px",
            opacity: loading ? 0.7 : 1,
            width: "100%",
            boxSizing: "border-box"
          }}
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />}
          {loading ? "Creando cuenta..." : "Crear Cuenta"}
        </button>
      </form>
      
      <p style={{ marginTop: "20px", fontSize: "12px", color: "#64748b" }}>
        ¿Ya tienes cuenta?{" "}
        <span 
          onClick={onLoginClick}
          style={{ color: "#60a5fa", cursor: "pointer", textDecoration: "underline" }}
        >
          Iniciar sesión
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
