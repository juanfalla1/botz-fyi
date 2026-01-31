"use client";
import React, { useState } from "react";
import { User, Mail, MapPin, ArrowRight, Home, Sparkles, Zap, CheckCircle2 } from "lucide-react";

export default function DemoForm(props: any) {
  const { formData, setFormData, handleLeadCapture, step } = props;
  const [isHovered, setIsHovered] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const isCollapsed = step > 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Verificar campos completados
  const isNameFilled = formData.name && formData.name.length > 2;
  const isEmailFilled = formData.email && formData.email.includes("@");
  const isInterestFilled = formData.interest && formData.interest !== "";
  const completedFields = [isNameFilled, isEmailFilled, isInterestFilled].filter(Boolean).length;

  if (isCollapsed) {
    return (
      <div style={{
        background: "linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%)",
        borderRadius: "16px",
        padding: "16px 20px",
        border: "1px solid rgba(34, 197, 94, 0.3)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        animation: "slideIn 0.5s ease"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "40px",
            height: "40px",
            borderRadius: "12px",
            background: "rgba(34, 197, 94, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <CheckCircle2 size={20} color="#22c55e" />
          </div>
          <div>
            <div style={{ fontSize: "13px", fontWeight: "700", color: "#fff" }}>
              Lead Capturado: {formData.name}
            </div>
            <div style={{ fontSize: "11px", color: "#94a3b8" }}>
              {formData.interest || "Sin definir"} • {formData.country}
            </div>
          </div>
        </div>
        <div style={{
          background: "#22c55e",
          color: "#000",
          padding: "6px 12px",
          borderRadius: "20px",
          fontSize: "10px",
          fontWeight: "700",
          display: "flex",
          alignItems: "center",
          gap: "4px"
        }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#000", animation: "pulse 2s infinite" }} />
          EN PROCESO
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "linear-gradient(180deg, rgba(15, 23, 42, 0.9) 0%, rgba(15, 23, 42, 0.7) 100%)",
        borderRadius: "24px",
        padding: "32px",
        border: "1px solid rgba(255,255,255,0.1)",
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* Efecto de fondo */}
      <div style={{
        position: "absolute",
        top: 0,
        right: 0,
        width: "200px",
        height: "200px",
        background: "radial-gradient(circle, rgba(192, 132, 252, 0.15) 0%, transparent 70%)",
        filter: "blur(40px)",
        pointerEvents: "none"
      }} />

      {/* Header */}
      <div style={{ marginBottom: "28px", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <div style={{
            background: "linear-gradient(135deg, #c084fc 0%, #8b5cf6 100%)",
            padding: "12px",
            borderRadius: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 32px rgba(192, 132, 252, 0.3)"
          }}>
            <Sparkles size={24} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: "24px", fontWeight: "800", margin: 0, color: "#fff", letterSpacing: "-0.5px" }}>
              Simula un Lead Entrante
            </h2>
            <p style={{ fontSize: "13px", color: "#94a3b8", margin: "4px 0 0 0" }}>
              Completa los datos y mira la magia de Botz en acción
            </p>
          </div>
        </div>

        {/* Progress indicator */}
        <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
          {[1, 2, 3].map((num) => (
            <div 
              key={num}
              style={{
                flex: 1,
                height: "4px",
                borderRadius: "2px",
                background: completedFields >= num 
                  ? "linear-gradient(90deg, #c084fc, #22d3ee)" 
                  : "rgba(255,255,255,0.1)",
                transition: "all 0.3s ease"
              }}
            />
          ))}
        </div>
        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "8px" }}>
          {completedFields}/3 campos completados
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={handleLeadCapture} style={{ display: "flex", flexDirection: "column", gap: "20px", position: "relative", zIndex: 1 }}>
        
        {/* Fila 1: Identidad */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <label style={{ 
              fontSize: "12px", 
              color: focusedField === "name" ? "#c084fc" : "#8b949e", 
              marginBottom: "8px", 
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontWeight: "600",
              transition: "color 0.2s"
            }}>
              <User size={14} /> Nombre Completo
              {isNameFilled && <CheckCircle2 size={12} color="#22c55e" />}
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="Ej: Carlos Gómez"
              value={formData.name}
              onChange={handleChange}
              onFocus={() => setFocusedField("name")}
              onBlur={() => setFocusedField(null)}
              style={{
                width: "100%",
                padding: "14px 16px",
                background: focusedField === "name" ? "rgba(192, 132, 252, 0.1)" : "rgba(0,0,0,0.3)",
                border: focusedField === "name" ? "2px solid rgba(192, 132, 252, 0.5)" : "2px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                color: "#fff",
                fontSize: "14px",
                boxSizing: "border-box",
                transition: "all 0.2s ease",
                outline: "none"
              }}
            />
          </div>
          
          <div>
            <label style={{ 
              fontSize: "12px", 
              color: focusedField === "email" ? "#c084fc" : "#8b949e", 
              marginBottom: "8px", 
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontWeight: "600",
              transition: "color 0.2s"
            }}>
              <Mail size={14} /> Email
              {isEmailFilled && <CheckCircle2 size={12} color="#22c55e" />}
            </label>
            <input
              type="email"
              name="email"
              required
              placeholder="Ej: carlos@gmail.com"
              value={formData.email}
              onChange={handleChange}
              onFocus={() => setFocusedField("email")}
              onBlur={() => setFocusedField(null)}
              style={{
                width: "100%",
                padding: "14px 16px",
                background: focusedField === "email" ? "rgba(192, 132, 252, 0.1)" : "rgba(0,0,0,0.3)",
                border: focusedField === "email" ? "2px solid rgba(192, 132, 252, 0.5)" : "2px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                color: "#fff",
                fontSize: "14px",
                boxSizing: "border-box",
                transition: "all 0.2s ease",
                outline: "none"
              }}
            />
          </div>
        </div>

        {/* Fila 2: Contexto */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <label style={{ 
              fontSize: "12px", 
              color: "#8b949e", 
              marginBottom: "8px", 
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontWeight: "600"
            }}>
              <MapPin size={14} /> País de Interés
            </label>
            <select
              name="country"
              value={formData.country}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "14px 16px",
                background: "rgba(0,0,0,0.3)",
                border: "2px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                color: "#fff",
                fontSize: "14px",
                appearance: "none",
                boxSizing: "border-box",
                cursor: "pointer"
              }}
            >
              <option value="Colombia">🇨🇴 Colombia</option>
              <option value="España">🇪🇸 España</option>
              <option value="México">🇲🇽 México</option>
              <option value="Chile">🇨🇱 Chile</option>
              <option value="USA">🇺🇸 Estados Unidos</option>
            </select>
          </div>

          <div>
            <label style={{ 
              fontSize: "12px", 
              color: "#8b949e", 
              marginBottom: "8px", 
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontWeight: "600"
            }}>
              <Home size={14} /> Objetivo
              {isInterestFilled && <CheckCircle2 size={12} color="#22c55e" />}
            </label>
            <select
              name="interest"
              value={formData.interest}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "14px 16px",
                background: "rgba(0,0,0,0.3)",
                border: "2px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                color: "#fff",
                fontSize: "14px",
                appearance: "none",
                boxSizing: "border-box",
                cursor: "pointer"
              }}
            >
              <option value="">Selecciona...</option>
              <option value="Compra Primera Vivienda">🏠 Comprar 1ª Vivienda</option>
              <option value="Segunda Residencia">🏡 Segunda Residencia</option>
              <option value="Inversión">📈 Inversión</option>
              <option value="Refinanciamiento">💰 Mejorar mi Hipoteca</option>
            </select>
          </div>
        </div>

        {/* Botón de Acción */}
        <button
          type="submit"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          disabled={completedFields < 2}
          style={{
            marginTop: "8px",
            background: completedFields >= 2 
              ? "linear-gradient(135deg, #22d3ee 0%, #c084fc 100%)"
              : "rgba(255,255,255,0.1)",
            border: "none",
            padding: "18px",
            borderRadius: "16px",
            color: completedFields >= 2 ? "#000" : "#64748b",
            fontWeight: "800",
            fontSize: "16px",
            cursor: completedFields >= 2 ? "pointer" : "not-allowed",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "12px",
            transform: isHovered && completedFields >= 2 ? "scale(1.02)" : "scale(1)",
            boxShadow: completedFields >= 2 ? "0 8px 32px rgba(34, 211, 238, 0.3)" : "none",
            transition: "all 0.3s ease"
          }}
        >
          <Zap size={20} />
          Iniciar Flujo Interactivo
          <ArrowRight size={20} />
        </button>
        
        <p style={{ textAlign: "center", fontSize: "12px", color: "#64748b", margin: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
          <Sparkles size={14} color="#c084fc" />
          Al iniciar, Botz IA te contactará instantáneamente
        </p>
      </form>

      <style jsx global>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
