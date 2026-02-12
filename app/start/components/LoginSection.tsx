// components/LoginSection.tsx
"use client";

import React, { useState } from "react";
import { LogIn, UserPlus, Lock, Eye, EyeOff, Mail, Key } from "lucide-react";

interface LoginSectionProps {
  onLogin: (email: string, password: string) => void;
  onRegister: (email: string, password: string, plan: string) => void;
  isLoading?: boolean;
}

const LoginSection: React.FC<LoginSectionProps> = ({ onLogin, onRegister, isLoading = false }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("basic");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoginMode) {
      onLogin(email, password);
    } else {
      onRegister(email, password, selectedPlan);
    }
  };

  return (
    <div style={{
      maxWidth: "400px",
      margin: "0 auto",
      background: "var(--botz-panel)",
      border: "1px solid var(--botz-border)",
      borderRadius: "24px",
      padding: "40px",
      backdropFilter: "blur(20px)",
      boxShadow: "var(--botz-shadow)"
    }}>
      <div style={{ textAlign: "center", marginBottom: "30px" }}>
        <div style={{
          width: "60px",
          height: "60px",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          borderRadius: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px"
        }}>
          <Lock size={28} color="#fff" />
        </div>
        <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "8px" }}>
          {isLoginMode ? "Acceso a Botz" : "Crear Cuenta"}
        </h2>
        <p style={{ color: "var(--botz-muted)", fontSize: "14px" }}>
          {isLoginMode 
            ? "Ingresa con tu email y contraseña del plan" 
            : "Regístrate para acceder a la plataforma"}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Email */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "12px", color: "#8b949e" }}>
            <Mail size={12} style={{ marginRight: "6px", verticalAlign: "middle" }} />
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "12px 16px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "12px",
              color: "#fff",
              fontSize: "14px",
              outline: "none",
              transition: "all 0.3s"
            }}
            placeholder="tu@email.com"
          />
        </div>

        {/* Password */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "12px", color: "#8b949e" }}>
            <Key size={12} style={{ marginRight: "6px", verticalAlign: "middle" }} />
            Contraseña
          </label>
          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px 16px",
                paddingRight: "50px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                color: "#fff",
                fontSize: "14px",
                outline: "none"
              }}
              placeholder="Tu contraseña del plan"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                color: "#8b949e",
                cursor: "pointer",
                padding: "4px"
              }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Plan Selection (only for register) */}
        {!isLoginMode && (
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "12px", color: "#8b949e" }}>
              Seleccionar Plan
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {["basic", "pro", "enterprise"].map((plan) => (
                <label
                  key={plan}
                  style={{
                    padding: "12px",
                    background: selectedPlan === plan 
                      ? "rgba(102, 126, 234, 0.2)" 
                      : "rgba(255,255,255,0.05)",
                    border: `1px solid ${selectedPlan === plan ? "#667eea" : "rgba(255,255,255,0.1)"}`,
                    borderRadius: "12px",
                    cursor: "pointer",
                    textAlign: "center",
                    fontSize: "12px",
                    textTransform: "capitalize",
                    color: selectedPlan === plan ? "#fff" : "#8b949e"
                  }}
                >
                  <input
                    type="radio"
                    name="plan"
                    value={plan}
                    checked={selectedPlan === plan}
                    onChange={(e) => setSelectedPlan(e.target.value)}
                    style={{ display: "none" }}
                  />
                  {plan === "basic" && "Básico"}
                  {plan === "pro" && "Profesional"}
                  {plan === "enterprise" && "Empresarial"}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: "100%",
            padding: "14px",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            border: "none",
            borderRadius: "12px",
            color: "#fff",
            fontSize: "14px",
            fontWeight: "bold",
            cursor: isLoading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            opacity: isLoading ? 0.7 : 1
          }}
        >
          {isLoading ? (
            "Procesando..."
          ) : (
            <>
              {isLoginMode ? <LogIn size={18} /> : <UserPlus size={18} />}
              {isLoginMode ? "Acceder a la Plataforma" : "Crear Cuenta"}
            </>
          )}
        </button>

        {/* Switch Mode */}
        <div style={{ textAlign: "center", marginTop: "20px", paddingTop: "20px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <button
            type="button"
            onClick={() => setIsLoginMode(!isLoginMode)}
            style={{
              background: "transparent",
              border: "none",
              color: "#667eea",
              cursor: "pointer",
              fontSize: "13px",
              textDecoration: "underline"
            }}
          >
            {isLoginMode 
              ? "¿No tienes cuenta? Regístrate aquí" 
              : "¿Ya tienes cuenta? Inicia sesión"}
          </button>
        </div>
      </form>

      {/* Info */}
      <div style={{ 
        marginTop: "24px", 
        padding: "12px", 
        background: "rgba(102, 126, 234, 0.1)", 
        borderRadius: "8px", 
        fontSize: "11px", 
        color: "#8b949e",
        textAlign: "center"
      }}>
        <Lock size={10} style={{ marginRight: "6px", verticalAlign: "middle" }} />
        Tu contraseña del plan es la misma para acceder a la plataforma
      </div>
    </div>
  );
};

export default LoginSection;
