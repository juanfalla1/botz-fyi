"use client";

import React from "react";
import { useRouter } from "next/navigation";

const C = {
  bg: "#1a1d26",
  card: "#22262d",
  dark: "#111318",
  border: "rgba(255,255,255,0.10)",
  blue: "#0096ff",
  lime: "#a3e635",
  white: "#ffffff",
  muted: "#9ca3af",
  dim: "#6b7280",
};

const PLANS = [
  {
    key: "pro",
    name: "Pro",
    price: "US$99.00",
    credits: "100,000 Creditos",
    desc: "Ideal para equipos que utilizan IA de forma regular, con soporte asincrono",
    accent: C.lime,
    badge: "",
  },
  {
    key: "scale",
    name: "Scale Up",
    price: "US$499.00",
    credits: "500,000 Creditos",
    desc: "Para empresas con operaciones criticas impulsadas por IA, con soporte prioritario",
    accent: C.blue,
    badge: "Most Popular",
  },
  {
    key: "prime",
    name: "Prime",
    price: "US$1,499.00",
    credits: "1,500,000 Creditos",
    desc: "Usas IA como pilar fundamental, incluye canal de soporte dedicado y onboarding",
    accent: "#e879f9",
    badge: "",
  },
] as const;

export default function AgentPlansPage() {
  const router = useRouter();

  return (
    <div style={{ minHeight: "100vh", backgroundColor: C.bg, color: C.white, fontFamily: "Inter,-apple-system,sans-serif" }}>
      <div style={{ height: 56, backgroundColor: C.dark, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 18px", gap: 12 }}>
        <button onClick={() => router.push("/start/agents")} style={{ background: "none", border: "none", color: C.lime, cursor: "pointer", fontWeight: 900 }}>
          ← Volver
        </button>
        <div style={{ fontWeight: 900, fontSize: 16 }}>Planes (Agentes IA)</div>
        <div style={{ marginLeft: "auto", color: C.dim, fontSize: 12, fontWeight: 800 }}>
          Esto es independiente de la herramienta hipotecaria
        </div>
      </div>

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "30px 18px 46px" }}>
        <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>Elige tu plan</div>
        <div style={{ color: C.muted, marginBottom: 18 }}>Creditos se consumen segun ejecuciones.</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14 }}>
          {PLANS.map(p => (
            <div key={p.key} style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 18, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: -60, background: `radial-gradient(circle at 20% 20%, ${p.accent}22, transparent 55%)` }} />
              <div style={{ position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontWeight: 900, fontSize: 18 }}>{p.name}</div>
                  {p.badge ? (
                    <div style={{ padding: "6px 10px", borderRadius: 999, border: `1px solid ${C.border}`, backgroundColor: "rgba(0,0,0,0.18)", color: C.white, fontSize: 12, fontWeight: 900 }}>
                      {p.badge}
                    </div>
                  ) : (
                    <div />
                  )}
                </div>

                <div style={{ marginTop: 10, fontWeight: 900, fontSize: 26 }}>{p.price} <span style={{ color: C.muted, fontSize: 14, fontWeight: 800 }}>/ per-month</span></div>
                <div style={{ marginTop: 10, fontWeight: 900 }}>{p.credits}</div>
                <div style={{ marginTop: 14, color: C.muted, lineHeight: 1.6 }}>{p.desc}</div>

                <button
                  onClick={() => router.push("/start/agents")}
                  style={{ marginTop: 18, width: "100%", padding: "12px 14px", borderRadius: 12, border: `1px solid ${p.accent}`, backgroundColor: "transparent", color: p.accent, fontWeight: 900, cursor: "pointer" }}
                >
                  Seleccionar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
