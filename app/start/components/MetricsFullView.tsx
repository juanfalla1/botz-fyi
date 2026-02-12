"use client";
import React from "react";
import { BarChart3, TrendingUp } from "lucide-react";

export default function MetricsFullView({ metrics }: { metrics: any }) {
  return (
    <div style={{ background: "var(--botz-panel)", borderRadius: "24px", padding: "30px", border: "1px solid var(--botz-border)" }}>
      <h2 style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "30px" }}>
        <BarChart3 color="#e879f9" /> Métricas de Conversión
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
        <div style={{ textAlign: "center", background: "var(--botz-surface-3)", padding: "30px", borderRadius: "20px" }}>
          <div style={{ fontSize: "40px", fontWeight: "bold", color: "#22c55e" }}>{metrics.score}/100</div>
          <div style={{ color: "var(--botz-muted)", marginTop: "10px" }}>Lead Score</div>
        </div>
        <div style={{ textAlign: "center", background: "var(--botz-surface-3)", padding: "30px", borderRadius: "20px" }}>
           <TrendingUp size={40} color="#60a5fa" style={{ margin: "0 auto" }} />
           <div style={{ fontSize: "24px", fontWeight: "bold", marginTop: "10px" }}>{metrics.viability}</div>
           <div style={{ color: "var(--botz-muted)" }}>Viabilidad</div>
        </div>
      </div>
    </div>
  );
}
