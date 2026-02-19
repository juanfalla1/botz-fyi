"use client";

import React from "react";

interface AgentMetricsProps {
  totalCalls?: number;
  totalConversations?: number;
  avgDuration?: string;
  successRate?: number;
  creditsUsed?: number;
  creditsTotal?: number;
}

const C = {
  bg: "#1a1d26",
  dark: "#111318",
  card: "#22262d",
  border: "rgba(255,255,255,0.08)",
  blue: "#0096ff",
  lime: "#a3e635",
  white: "#ffffff",
  muted: "#9ca3af",
  dim: "#6b7280",
  purple: "#8b5cf6",
  red: "#ef4444",
};

export default function AgentMetrics({
  totalCalls = 0,
  totalConversations = 0,
  avgDuration = "00m 00s",
  successRate = 0,
  creditsUsed = 0,
  creditsTotal = 100000,
}: AgentMetricsProps) {
  const creditsPercentage = Math.min((creditsUsed / creditsTotal) * 100, 100);

  const metrics = [
    {
      label: "Total de interacciones",
      value: totalCalls + totalConversations,
      icon: "📞",
      color: C.blue,
    },
    {
      label: "Duración promedio",
      value: avgDuration,
      icon: "⏱️",
      color: C.lime,
    },
    {
      label: "Tasa de éxito",
      value: `${successRate}%`,
      icon: "✅",
      color: successRate >= 70 ? C.lime : successRate >= 40 ? "#fbbf24" : C.red,
    },
    {
      label: "Créditos usados",
      value: creditsUsed.toLocaleString(),
      icon: "💎",
      color: C.purple,
      subtitle: `de ${creditsTotal.toLocaleString()}`,
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ 
        fontSize: 20, 
        fontWeight: 700, 
        color: C.white, 
        marginBottom: 24,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        <span>📊</span> Métricas del Agente
      </h2>

      {/* Metrics Grid */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", 
        gap: 16,
        marginBottom: 32,
      }}>
        {metrics.map((metric, idx) => (
          <div
            key={idx}
            style={{
              backgroundColor: C.card,
              borderRadius: 12,
              padding: 20,
              border: `1px solid ${C.border}`,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ 
              fontSize: 28, 
              fontWeight: 700, 
              color: metric.color || C.white,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              <span>{metric.icon}</span>
              {metric.value}
              {metric.subtitle && (
                <span style={{ fontSize: 14, color: C.muted, fontWeight: 400 }}>
                  {metric.subtitle}
                </span>
              )}
            </div>
            <div style={{ color: C.muted, fontSize: 14 }}>
              {metric.label}
            </div>
          </div>
        ))}
      </div>

      {/* Credits Progress */}
      <div style={{
        backgroundColor: C.card,
        borderRadius: 12,
        padding: 20,
        border: `1px solid ${C.border}`,
        marginBottom: 24,
      }}>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          marginBottom: 12,
        }}>
          <div style={{ color: C.white, fontWeight: 600 }}>
            💎 Uso de Créditos
          </div>
          <div style={{ color: C.muted, fontSize: 14 }}>
            {creditsUsed.toLocaleString()} / {creditsTotal.toLocaleString()}
          </div>
        </div>
        <div style={{
          height: 8,
          backgroundColor: "rgba(255,255,255,0.1)",
          borderRadius: 4,
          overflow: "hidden",
        }}>
          <div style={{
            height: "100%",
            width: `${creditsPercentage}%`,
            backgroundColor: creditsPercentage > 80 ? C.red : creditsPercentage > 50 ? "#fbbf24" : C.lime,
            borderRadius: 4,
            transition: "width 0.3s ease",
          }} />
        </div>
        <div style={{ 
          marginTop: 8, 
          fontSize: 12, 
          color: C.muted,
          textAlign: "right",
        }}>
          {creditsPercentage.toFixed(1)}% usado
        </div>
      </div>

      {/* Activity Chart Placeholder */}
      <div style={{
        backgroundColor: C.card,
        borderRadius: 12,
        padding: 20,
        border: `1px solid ${C.border}`,
      }}>
        <div style={{ 
          color: C.white, 
          fontWeight: 600, 
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <span>📈</span> Actividad reciente
        </div>
        <div style={{
          height: 200,
          backgroundColor: "rgba(0,0,0,0.2)",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: C.muted,
          fontSize: 14,
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
            <div>Gráfico de actividad</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>(Se conectará con API de métricas)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
