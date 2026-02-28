"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { supabaseAgents } from "@/app/start/agents/supabaseAgentsClient";

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
    credits: "10,000 Creditos",
    desc: "Empieza sin friccion: tu agente principal funciona bien y solo pagas mas cuando escales.",
    callsEstimate: "~55 a ~111 llamadas/mes",
    includes: [
      "Hasta 1 agente IA",
      "Hasta 1 canal conectado",
      "10,000 creditos por mes (voz + texto)",
      "Gracia operacional del 10%",
      "Sin overage: luego de la gracia se pausa",
    ],
    accent: C.lime,
    badge: "",
  },
  {
    key: "scale",
    name: "Scale",
    price: "US$499.00",
    credits: "100,000 Creditos",
    desc: "Para equipos con volumen: multi-canal, continuidad y crecimiento con overage.",
    callsEstimate: "~555 a ~1,111 llamadas/mes",
    includes: [
      "Hasta 10 agentes IA",
      "Hasta 10 canales conectados",
      "100,000 creditos por mes (voz + texto)",
      "Overage habilitado",
      "Soporte prioritario",
    ],
    accent: C.blue,
    badge: "Most Popular",
  },
  {
    key: "prime",
    name: "Prime",
    price: "US$1,499.00",
    credits: "500,000 Creditos",
    desc: "Operacion critica con IA: alto volumen, onboarding y acompanamiento dedicado.",
    callsEstimate: "~2,777 a ~5,555 llamadas/mes",
    includes: [
      "Hasta 50 agentes IA",
      "Hasta 50 canales conectados",
      "500,000 creditos por mes (voz + texto)",
      "Overage habilitado",
      "Onboarding y soporte dedicado",
    ],
    accent: "#e879f9",
    badge: "",
  },
] as const;

export default function AgentPlansPage() {
  const router = useRouter();
  const [payingPlan, setPayingPlan] = React.useState<string>("");

  const startCheckout = async (planKey: "pro" | "scale" | "prime", planName: string) => {
    try {
      setPayingPlan(planKey);

      const { data } = await supabaseAgents.auth.getUser();
      const user = data?.user || null;
      if (!user) {
        router.push("/start/agents");
        return;
      }

      let tenantId = String((user.user_metadata as any)?.tenant_id || "").trim();
      if (!tenantId) {
        tenantId = crypto.randomUUID();
        await supabaseAgents.auth.updateUser({ data: { tenant_id: tenantId } });
      }

      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: planKey,
          planName,
          billing: "month",
          userId: user.id,
          email: user.email,
          tenant_id: tenantId,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.url) {
        throw new Error(json?.error || "No se pudo iniciar Stripe");
      }

      window.location.href = String(json.url);
    } catch (e: any) {
      alert(e?.message || "Error iniciando el pago");
    } finally {
      setPayingPlan("");
    }
  };

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
        <div style={{ color: C.muted, marginBottom: 18 }}>
          Trial inicial: 3 dias y 1000 creditos. Voz y texto usan la misma bolsa de creditos.
        </div>

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
                <div style={{ marginTop: 8, color: C.dim, fontSize: 12, lineHeight: 1.45 }}>
                  Referencia: interaccion de voz estandar consume aprox. 3 creditos por turno (modo rapido 2).
                </div>
                <details style={{ marginTop: 10, border: `1px solid ${C.border}`, borderRadius: 10, background: "rgba(0,0,0,0.14)" }}>
                  <summary style={{ cursor: "pointer", listStyle: "none", padding: "10px 12px", fontSize: 12, fontWeight: 900, color: C.lime }}>
                    Cuantas llamadas puedo hacer con este plan?
                  </summary>
                  <div style={{ padding: "0 12px 10px", color: C.white, fontSize: 13, fontWeight: 900 }}>
                    {p.callsEstimate}
                  </div>
                  <div style={{ padding: "0 12px 12px", color: C.dim, fontSize: 12, lineHeight: 1.45 }}>
                    Estimado para llamadas de 3 minutos promedio. Puede variar segun turnos, velocidad y mezcla voz/texto.
                  </div>
                </details>
                <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
                  {p.includes.map((it) => (
                    <div key={it} style={{ color: C.white, fontSize: 13, fontWeight: 700 }}>
                      - {it}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => startCheckout(p.key, p.name)}
                  disabled={payingPlan === p.key}
                  style={{ marginTop: 18, width: "100%", padding: "12px 14px", borderRadius: 12, border: `1px solid ${p.accent}`, backgroundColor: "transparent", color: p.accent, fontWeight: 900, cursor: "pointer" }}
                >
                  {payingPlan === p.key ? "Procesando..." : "Seleccionar"}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24, borderRadius: 14, border: `1px solid ${C.border}`, background: "rgba(0,0,0,0.16)", padding: 16 }}>
          <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 10 }}>FAQ de planes</div>

          <details style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
            <summary style={{ cursor: "pointer", fontWeight: 800 }}>Que pasa cuando se me acaban los creditos?</summary>
            <div style={{ marginTop: 8, color: C.muted, lineHeight: 1.5, fontSize: 14 }}>
              En Pro tienes una gracia operacional del 10% y luego se pausa hasta recargar o subir de plan. En Scale y Prime se habilita overage.
            </div>
          </details>

          <details style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, marginTop: 10 }}>
            <summary style={{ cursor: "pointer", fontWeight: 800 }}>Los creditos de voz y texto son separados?</summary>
            <div style={{ marginTop: 8, color: C.muted, lineHeight: 1.5, fontSize: 14 }}>
              No. Se consumen desde una sola bolsa unificada. Asi puedes mover el uso entre voz y texto segun necesidad.
            </div>
          </details>

          <details style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, marginTop: 10 }}>
            <summary style={{ cursor: "pointer", fontWeight: 800 }}>Cuantos agentes y canales incluye cada plan?</summary>
            <div style={{ marginTop: 8, color: C.muted, lineHeight: 1.5, fontSize: 14 }}>
              Pro: 1 agente y 1 canal. Scale: 10 agentes y 10 canales. Prime: 50 agentes y 50 canales.
            </div>
          </details>

          <details style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, marginTop: 10 }}>
            <summary style={{ cursor: "pointer", fontWeight: 800 }}>Puedo cambiar de plan en cualquier momento?</summary>
            <div style={{ marginTop: 8, color: C.muted, lineHeight: 1.5, fontSize: 14 }}>
              Si. Puedes subir de plan cuando quieras para evitar pausas y habilitar mas capacidad.
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
