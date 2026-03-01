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
  const [language, setLanguage] = React.useState<"es" | "en">("es");

  const tr = (es: string, en: string) => (language === "en" ? en : es);
  const trPlan = (text: string) => {
    const map: Record<string, string> = {
      "10,000 Creditos": "10,000 Credits",
      "100,000 Creditos": "100,000 Credits",
      "500,000 Creditos": "500,000 Credits",
      "Empieza sin friccion: tu agente principal funciona bien y solo pagas mas cuando escales.": "Start frictionless: your main agent works well and you only pay more when you scale.",
      "Para equipos con volumen: multi-canal, continuidad y crecimiento con overage.": "For high-volume teams: multi-channel continuity and growth with overage.",
      "Operacion critica con IA: alto volumen, onboarding y acompanamiento dedicado.": "Mission-critical AI operations: high volume, onboarding, and dedicated support.",
      "~55 a ~111 llamadas/mes": "~55 to ~111 calls/month",
      "~555 a ~1,111 llamadas/mes": "~555 to ~1,111 calls/month",
      "~2,777 a ~5,555 llamadas/mes": "~2,777 to ~5,555 calls/month",
      "Hasta 1 agente IA": "Up to 1 AI agent",
      "Hasta 1 canal conectado": "Up to 1 connected channel",
      "10,000 creditos por mes (voz + texto)": "10,000 credits per month (voice + text)",
      "Gracia operacional del 10%": "10% operational grace",
      "Sin overage: luego de la gracia se pausa": "No overage: pauses after grace",
      "Hasta 10 agentes IA": "Up to 10 AI agents",
      "Hasta 10 canales conectados": "Up to 10 connected channels",
      "100,000 creditos por mes (voz + texto)": "100,000 credits per month (voice + text)",
      "Overage habilitado": "Overage enabled",
      "Soporte prioritario": "Priority support",
      "Hasta 50 agentes IA": "Up to 50 AI agents",
      "Hasta 50 canales conectados": "Up to 50 connected channels",
      "500,000 creditos por mes (voz + texto)": "500,000 credits per month (voice + text)",
      "Onboarding y soporte dedicado": "Onboarding and dedicated support",
    };
    return language === "en" ? (map[text] || text) : text;
  };

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("botz-language");
    if (saved === "es" || saved === "en") setLanguage(saved);

    const onLanguageChange = (evt: Event) => {
      const next = String((evt as CustomEvent<string>)?.detail || "").toLowerCase();
      if (next === "es" || next === "en") setLanguage(next);
    };

    window.addEventListener("botz-language-change", onLanguageChange as EventListener);
    return () => window.removeEventListener("botz-language-change", onLanguageChange as EventListener);
  }, []);

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
          {tr("← Volver", "← Back")}
        </button>
        <div style={{ fontWeight: 900, fontSize: 16 }}>{tr("Planes (Agentes IA)", "Plans (AI Agents)")}</div>
        <div style={{ marginLeft: "auto", color: C.dim, fontSize: 12, fontWeight: 800 }}>
          {tr("Esto es independiente de la herramienta hipotecaria", "This is independent from the mortgage tool")}
        </div>
      </div>

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "30px 18px 46px" }}>
        <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>{tr("Elige tu plan", "Choose your plan")}</div>
        <div style={{ color: C.muted, marginBottom: 18 }}>
          {tr("Trial inicial: 3 dias y 1000 creditos. Voz y texto usan la misma bolsa de creditos.", "Initial trial: 3 days and 1000 credits. Voice and text use the same credit pool.")}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14 }}>
          {PLANS.map(p => (
            <div key={p.key} style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 18, position: "relative", overflow: "hidden", display: "flex" }}>
              <div style={{ position: "absolute", inset: -60, background: `radial-gradient(circle at 20% 20%, ${p.accent}22, transparent 55%)` }} />
              <div style={{ position: "relative", display: "flex", flexDirection: "column", width: "100%" }}>
                <div>
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
                  <div style={{ marginTop: 10, fontWeight: 900 }}>{trPlan(p.credits)}</div>
                  <div style={{ marginTop: 14, color: C.muted, lineHeight: 1.6 }}>{trPlan(p.desc)}</div>
                  <div style={{ marginTop: 8, color: C.dim, fontSize: 12, lineHeight: 1.45 }}>
                    {tr("Referencia: interaccion de voz estandar consume aprox. 3 creditos por turno (modo rapido 2).", "Reference: a standard voice interaction uses approx. 3 credits per turn (fast mode 2).")}
                  </div>
                  <details style={{ marginTop: 10, border: `1px solid ${C.border}`, borderRadius: 10, background: "rgba(0,0,0,0.14)" }}>
                    <summary style={{ cursor: "pointer", listStyle: "none", padding: "10px 12px", fontSize: 12, fontWeight: 900, color: C.lime }}>
                      {tr("Cuantas llamadas puedo hacer con este plan?", "How many calls can I make with this plan?")}
                    </summary>
                    <div style={{ padding: "0 12px 10px", color: C.white, fontSize: 13, fontWeight: 900 }}>
                      {trPlan(p.callsEstimate)}
                    </div>
                    <div style={{ padding: "0 12px 12px", color: C.dim, fontSize: 12, lineHeight: 1.45 }}>
                      {tr("Estimado para llamadas de 3 minutos promedio. Puede variar segun turnos, velocidad y mezcla voz/texto.", "Estimate for calls averaging 3 minutes. It may vary by number of turns, speed, and voice/text mix.")}
                    </div>
                  </details>
                  <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
                    {p.includes.map((it) => (
                      <div key={it} style={{ color: C.white, fontSize: 13, fontWeight: 700 }}>
                        - {trPlan(it)}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => startCheckout(p.key, p.name)}
                  disabled={payingPlan === p.key}
                  style={{ marginTop: "auto", width: "100%", padding: "12px 14px", borderRadius: 12, border: `1px solid ${p.accent}`, backgroundColor: "transparent", color: p.accent, fontWeight: 900, cursor: "pointer" }}
                >
                  {payingPlan === p.key ? tr("Procesando...", "Processing...") : tr("Seleccionar", "Select")}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24, borderRadius: 14, border: `1px solid ${C.border}`, background: "rgba(0,0,0,0.16)", padding: 16 }}>
          <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 10 }}>{tr("FAQ de planes", "Plans FAQ")}</div>

          <details style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
            <summary style={{ cursor: "pointer", fontWeight: 800 }}>{tr("Que pasa cuando se me acaban los creditos?", "What happens when I run out of credits?")}</summary>
            <div style={{ marginTop: 8, color: C.muted, lineHeight: 1.5, fontSize: 14 }}>
              {tr("En Pro tienes una gracia operacional del 10% y luego se pausa hasta recargar o subir de plan. En Scale y Prime se habilita overage.", "In Pro, you get a 10% operational grace and then usage pauses until top-up or plan upgrade. In Scale and Prime, overage is enabled.")}
            </div>
          </details>

          <details style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, marginTop: 10 }}>
            <summary style={{ cursor: "pointer", fontWeight: 800 }}>{tr("Los creditos de voz y texto son separados?", "Are voice and text credits separate?")}</summary>
            <div style={{ marginTop: 8, color: C.muted, lineHeight: 1.5, fontSize: 14 }}>
              {tr("No. Se consumen desde una sola bolsa unificada. Asi puedes mover el uso entre voz y texto segun necesidad.", "No. They are consumed from a single unified pool, so you can move usage between voice and text as needed.")}
            </div>
          </details>

          <details style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, marginTop: 10 }}>
            <summary style={{ cursor: "pointer", fontWeight: 800 }}>{tr("Cuantos agentes y canales incluye cada plan?", "How many agents and channels are included in each plan?")}</summary>
            <div style={{ marginTop: 8, color: C.muted, lineHeight: 1.5, fontSize: 14 }}>
              Pro: 1 agente y 1 canal. Scale: 10 agentes y 10 canales. Prime: 50 agentes y 50 canales.
            </div>
          </details>

          <details style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, marginTop: 10 }}>
            <summary style={{ cursor: "pointer", fontWeight: 800 }}>{tr("Puedo cambiar de plan en cualquier momento?", "Can I change plans at any time?")}</summary>
            <div style={{ marginTop: 8, color: C.muted, lineHeight: 1.5, fontSize: 14 }}>
              {tr("Si. Puedes subir de plan cuando quieras para evitar pausas y habilitar mas capacidad.", "Yes. You can upgrade anytime to avoid pauses and unlock more capacity.")}
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
