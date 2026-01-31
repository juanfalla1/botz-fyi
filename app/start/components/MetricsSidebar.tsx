"use client";

import React, { useState, useEffect } from "react"; // ✅ Agregados los hooks necesarios
import { CheckCircle2, Circle, Activity } from "lucide-react"; 

interface Metrics {
  score?: number;
  viability?: string;
}

interface CalculoHipoteca {
  score?: number;
  valorVivienda?: number | string;
  ingresosMensuales?: number | string;
  ahorros?: number | string;
  edad?: number | string;
}

interface MetricsSidebarProps {
  metrics?: Metrics;
  calculoHipoteca?: CalculoHipoteca;
}

export function MetricsSidebar({
  metrics,
  calculoHipoteca,
}: MetricsSidebarProps) {
  // Blinda los datos para evitar errores si no vienen definidos
  const leadScore = metrics?.score ?? "--";
  const viability = metrics?.viability ?? "Pendiente";
  const hipotecaScore = calculoHipoteca?.score ?? "--";

  // ✅ CORRECCIÓN DE HIDRATACIÓN:
  // Estado para guardar el ID solo cuando el componente ya cargó en el navegador
  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    // Generamos el ID solo una vez montado el componente en el cliente
    setSessionId(Math.random().toString(36).substring(7).toUpperCase());
  }, []);

  // Definimos los campos clave para el monitor de Botz IA
  const checkFields = [
    { label: "Precio Vivienda", value: calculoHipoteca?.valorVivienda },
    { label: "Ingresos Mensuales", value: calculoHipoteca?.ingresosMensuales },
    { label: "Aportación/Ahorros", value: calculoHipoteca?.ahorros },
    { label: "Edad Titular", value: calculoHipoteca?.edad },
  ];

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        borderRadius: "24px",
        padding: "24px",
        minWidth: "280px",
        border: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        flexDirection: "column",
        gap: "20px"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <Activity size={18} color="#22d3ee" />
        <h3 style={{ fontSize: "16px", margin: 0, fontWeight: "600" }}>Monitor de Inteligencia</h3>
      </div>

      {/* SECCIÓN: LEAD SCORE PRINCIPAL */}
      <div
        style={{
          background: "rgba(0,0,0,0.25)",
          padding: "20px",
          borderRadius: "18px",
          border: "1px solid rgba(255,255,255,0.05)"
        }}
      >
        <div style={{ fontSize: "11px", color: "#8b949e", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>
          Lead Score Global
        </div>
        <div style={{ fontSize: "36px", fontWeight: "bold", color: "#c084fc", lineHeight: "1" }}>
          {leadScore}
        </div>
        <div style={{ 
            marginTop: "12px", 
            fontSize: "13px", 
            fontWeight: "600",
            color: viability === "Alta" ? "#22c55e" : viability === "Media" ? "#facc15" : "#f87171" 
        }}>
          Viabilidad: {viability}
        </div>
        <div style={{ fontSize: "10px", color: "#8b949e", marginTop: "4px" }}>
          Métrica Hipotecaria: {hipotecaScore}/100
        </div>
      </div>

      {/* SECCIÓN: DATOS DETECTADOS POR BOTZ IA */}
      <div
        style={{
          background: "rgba(34,211,238,0.03)", // Sutil tinte cian
          padding: "20px",
          borderRadius: "18px",
          border: "1px dashed rgba(34,211,238,0.2)"
        }}
      >
        <div style={{ 
          fontSize: "11px", 
          color: "#22d3ee", 
          marginBottom: "16px", 
          textTransform: "uppercase",
          fontWeight: "800",
          letterSpacing: "0.5px"
        }}>
          Datos detectados por Botz IA
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {checkFields.map((field, idx) => {
            // Un campo se considera detectado si tiene valor y no es "0"
            const isDetected = field.value && field.value !== 0 && field.value !== "0" && field.value !== "";
            
            return (
              <div 
                key={idx} 
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "12px",
                  transition: "all 0.4s ease",
                  opacity: isDetected ? 1 : 0.3
                }}
              >
                {isDetected ? (
                  <CheckCircle2 size={18} color="#22d3ee" fill="rgba(34,211,238,0.1)" />
                ) : (
                  <Circle size={18} color="#444" />
                )}
                <span style={{ 
                  fontSize: "14px", 
                  color: isDetected ? "#fff" : "#8b949e",
                  fontWeight: isDetected ? "500" : "400"
                }}>
                  {field.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ textAlign: "center", fontSize: "10px", color: "#444", marginTop: "auto" }}>
        {/* ✅ Usamos la variable de estado segura */}
        ID de Sesión: {sessionId || "Cargando..."}
      </div>
    </div>
  );
}