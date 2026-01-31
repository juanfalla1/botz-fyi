"use client";
import React from "react";
import { BarChart3, TrendingUp } from "lucide-react";

export default function MetricsFullView({ metrics }: { metrics: any }) {
  return (
    <div style={{ background: "rgba(10, 15, 30, 0.6)", borderRadius: "24px", padding: "30px", border: "1px solid rgba(255,255,255,0.1)" }}>
      <h2 style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "30px" }}>
        <BarChart3 color="#e879f9" /> Métricas de Conversión
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
        <div style={{ textAlign: "center", background: "rgba(255,255,255,0.05)", padding: "30px", borderRadius: "20px" }}>
          <div style={{ fontSize: "40px", fontWeight: "bold", color: "#22c55e" }}>{metrics.score}/100</div>
          <div style={{ color: "#8b949e", marginTop: "10px" }}>Lead Score</div>
        </div>
        <div style={{ textAlign: "center", background: "rgba(255,255,255,0.05)", padding: "30px", borderRadius: "20px" }}>
           <TrendingUp size={40} color="#60a5fa" style={{ margin: "0 auto" }} />
           <div style={{ fontSize: "24px", fontWeight: "bold", marginTop: "10px" }}>{metrics.viability}</div>
           <div style={{ color: "#8b949e" }}>Viabilidad</div>
        </div>
      </div>
    </div>
  );
}