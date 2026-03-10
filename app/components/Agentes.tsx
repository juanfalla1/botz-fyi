"use client";

import React from "react";
import { useRouter } from "next/navigation";
import useBotzLanguage from "@/app/start/hooks/useBotzLanguage";

interface AgentCardProps {
  name: string;
  avatar: React.ReactNode;
  imageSrc?: string;
  color: string;
  capabilities: string[];
  templateId?: string;
  agentType?: 'voice' | 'text' | 'flow';
  ctaLabel: string;
}

const AgentCard = ({ name, avatar, imageSrc, color, capabilities, templateId, agentType, ctaLabel }: AgentCardProps) => {
  const router = useRouter();

  const handleClick = () => {
    // Always send users to the Agent Studio dashboard (not the config wizard).
    router.push("/start/agents");
  };

  return (
    <div
      style={{
        background: "linear-gradient(180deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)",
        borderRadius: "20px",
        padding: "clamp(20px, 3vw, 32px) clamp(16px, 2.6vw, 24px)",
        transition: "all 0.3s ease",
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        minHeight: "430px",
        border: "2px solid rgba(34, 211, 238, 0.3)",
      }}
      onClick={handleClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-8px)";
        e.currentTarget.style.borderColor = "#a3e635";
        e.currentTarget.style.boxShadow = `0 20px 40px rgba(163, 230, 53, 0.2)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor = "rgba(34, 211, 238, 0.3)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Name */}
      <h3 
        style={{ 
          fontSize: "1.3em", 
          fontWeight: "600", 
          color: "#22d3ee", 
          marginBottom: "24px",
          textAlign: "center",
          lineHeight: 1.3,
        }}
      >
        {name}
      </h3>

      {/* Avatar */}
        <div
          style={{
            width: "clamp(102px, 18vw, 140px)",
            height: "clamp(102px, 18vw, 140px)",
            borderRadius: "50%",
          background: `linear-gradient(135deg, rgba(34, 211, 238, 0.2), rgba(34, 211, 238, 0.05))`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "28px",
            border: `2px solid ${color}40`,
            fontSize: "clamp(42px, 7vw, 64px)",
            boxShadow: `0 0 40px ${color}20`,
            overflow: "hidden",
          }}
        >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center 35%",
              borderRadius: "50%",
              display: "block",
            }}
          />
        ) : (
          avatar
        )}
      </div>

      {/* Capabilities list */}
      <div style={{ width: "100%", marginBottom: "24px", flex: 1 }}>
        {capabilities.map((cap, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              marginBottom: "14px",
              fontSize: "clamp(14px, 1.7vw, 16px)",
              color: "#e2e8f0",
              lineHeight: 1.4,
            }}
          >
            <span
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                background: "rgba(34, 211, 238, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#22d3ee",
                fontSize: "12px",
                flexShrink: 0,
                marginTop: "1px",
              }}
            >
              ✓
            </span>
            <span>{cap}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        style={{
          width: "100%",
          background: "#fff",
          color: "#0f172a",
          border: "none",
          padding: "14px 24px",
          borderRadius: "12px",
          fontWeight: "600",
          fontSize: "14px",
          cursor: "pointer",
          transition: "all 0.3s ease",
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleClick();
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = color;
          e.currentTarget.style.color = "#0f172a";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#fff";
          e.currentTarget.style.color = "#0f172a";
        }}
      >
        {ctaLabel}
      </button>
    </div>
  );
};

const Agentes = () => {
  const router = useRouter();
  const language = useBotzLanguage("en");
  const isEn = language === "en";
  const demoVideoUrl = process.env.NEXT_PUBLIC_AGENTS_DEMO_VIDEO_URL || "";
  const [callCountryCode, setCallCountryCode] = React.useState("+57");
  const [callPhone, setCallPhone] = React.useState("");
  const [callName, setCallName] = React.useState("");
  const [callEmail, setCallEmail] = React.useState("");
  const [callLoading, setCallLoading] = React.useState(false);
  const [callError, setCallError] = React.useState("");
  const [callSuccess, setCallSuccess] = React.useState("");
  const [callWarning, setCallWarning] = React.useState("");
  const [callMeta, setCallMeta] = React.useState("");

  const goTrial = () => {
    router.push("/start/agents");
  };

  const goVideo = () => {
    if (!demoVideoUrl) return;
    window.open(demoVideoUrl, "_blank");
  };

  const ctaLabel = isEn ? "Start Now" : "Contratar Ahora";

  const submitLiveCall = async (e: React.FormEvent) => {
    e.preventDefault();
    const phoneRaw = `${callCountryCode}${callPhone}`.replace(/\s+/g, "").trim();
    const email = String(callEmail || "").trim().toLowerCase();
    const name = String(callName || "").trim();

    if (!name || !email || !callPhone.trim()) {
      setCallError(isEn ? "Complete name, phone and email." : "Completa nombre, telefono y correo.");
      setCallSuccess("");
      return;
    }

    setCallLoading(true);
    setCallError("");
    setCallSuccess("");
    setCallWarning("");
    setCallMeta("");

    try {
      const payload = {
        nombre: name,
        email,
        telefono: phoneRaw,
        empresa: "Lead web call Botz",
        interes: "Llamada en vivo de agente",
      };

      const res = await fetch("/api/live-call/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.ok === false || data?.success === false) {
        throw new Error(String(data?.error || data?.message || (isEn ? "Could not request the call." : "No se pudo solicitar la llamada.")));
      }

      if (data?.mode === "webhook") {
        setCallSuccess(isEn ? "Done. We will call you shortly." : "Listo. Te llamaremos en breve.");
        const rows = Array.isArray(data?.data) ? data.data : [];
        const first = rows[0] || {};
        const from = String(first?.from || "").trim();
        const to = String(first?.to || phoneRaw).trim();
        const status = String(first?.status || "queued").trim();
        if (from || to) {
          setCallMeta(
            isEn
              ? `Call created (${status}). From ${from || "Twilio"} to ${to}.`
              : `Llamada creada (${status}). Desde ${from || "Twilio"} hacia ${to}.`
          );
        }
      } else {
        setCallSuccess(isEn ? "Done. Your request was saved." : "Listo. Tu solicitud fue guardada.");
        setCallWarning(
          isEn
            ? "Live call is not connected yet (fallback mode). Configure LIVE_CALL_WEBHOOK_URL in deployment env vars."
            : "La llamada en vivo aun no esta conectada (modo fallback). Configura LIVE_CALL_WEBHOOK_URL en las variables de entorno del despliegue."
        );
      }
      setCallPhone("");
      setCallName("");
      setCallEmail("");
    } catch (err: any) {
      setCallError(String(err?.message || (isEn ? "Could not request the call." : "No se pudo solicitar la llamada.")));
    } finally {
      setCallLoading(false);
    }
  };

  const topRowAgents = isEn ? [
    {
      name: "AI Receptionist",
      avatar: "🤖",
      imageSrc: "/img/Recepcionista.png",
      color: "#a3e635",
      capabilities: [
        "Answers every call",
        "Provides information",
        "Schedules appointments",
        "Updates your CRM",
      ],
      templateId: "julia",
      agentType: "text" as const,
    },
    {
      name: "AI Lead Qualifier",
      avatar: "🎯",
      imageSrc: "/img/Calificador%20de%20Leads%20IA.png",
      color: "#a3e635",
      capabilities: [
        "Qualifies leads instantly",
        "Creates engagement",
        "Scores and routes",
        "Updates your CRM",
      ],
      templateId: "lia",
      agentType: "voice" as const,
    },
    {
      name: "AI Sales Follow-up",
      avatar: "📧",
      imageSrc: "/img/seguimiento%20de%20ventas.png",
      color: "#a3e635",
      capabilities: [
        "Sends follow-ups",
        "Nurtures prospects",
        "Reactivates leads",
        "Updates your CRM",
      ],
      templateId: "alex",
      agentType: "text" as const,
    },
    {
      name: "AI Customer Support",
      avatar: "🎧",
      imageSrc: "/img/soporte%20al%20cliente.png",
      color: "#a3e635",
      capabilities: [
        "Resolves issues",
        "Answers FAQs",
        "Handles incidents",
        "Escalates to humans",
      ],
      agentType: "text" as const,
    },
  ] : [
    {
      name: "Recepcionista de IA",
      avatar: "🤖",
      imageSrc: "/img/Recepcionista.png",
      color: "#a3e635",
      capabilities: ["Atiende cada llamada", "Proporciona informacion", "Agenda citas", "Actualiza tu CRM"],
      templateId: "julia",
      agentType: "text" as const,
    },
    {
      name: "Calificador de Leads IA",
      avatar: "🎯",
      imageSrc: "/img/Calificador%20de%20Leads%20IA.png",
      color: "#a3e635",
      capabilities: ["Califica leads al instante", "Genera interaccion", "Puntua y enruta", "Actualiza tu CRM"],
      templateId: "lia",
      agentType: "voice" as const,
    },
    {
      name: "Seguimiento de Ventas IA",
      avatar: "📧",
      imageSrc: "/img/seguimiento%20de%20ventas.png",
      color: "#a3e635",
      capabilities: ["Envia seguimientos", "Nutre prospectos", "Reactiva leads", "Actualiza tu CRM"],
      templateId: "alex",
      agentType: "text" as const,
    },
    {
      name: "Soporte al Cliente IA",
      avatar: "🎧",
      imageSrc: "/img/soporte%20al%20cliente.png",
      color: "#a3e635",
      capabilities: ["Resuelve problemas", "Responde FAQs", "Gestiona incidencias", "Escala a humanos"],
      agentType: "text" as const,
    },
  ];

  const bottomRowAgents = isEn ? [
    {
      name: "AI Onboarding Specialist",
      avatar: "👋",
      imageSrc: "/img/onboarding.png",
      color: "#a3e635",
      capabilities: [
        "Guides onboarding",
        "Drives adoption",
        "Sends surveys",
        "Tracks progress",
      ],
      agentType: "text" as const,
    },
    {
      name: "AI Candidate Evaluator (HR)",
      avatar: "👔",
      imageSrc: "/img/evaluardor%20de%20candidatos.png",
      color: "#a3e635",
      capabilities: [
        "Screens candidates",
        "Asks structured questions",
        "Identifies qualified talent",
        "Updates ATS",
      ],
      agentType: "voice" as const,
    },
    {
      name: "AI Collections Specialist",
      avatar: "💰",
      imageSrc: "/img/cobranza.png",
      color: "#a3e635",
      capabilities: [
        "Calls overdue accounts",
        "Recovers payments",
        "Sends reminders",
        "Updates your CRM",
      ],
      agentType: "voice" as const,
    },
    {
      name: "Build Your Own",
      avatar: "✨",
      imageSrc: "/img/crea%20el%20tuyo.png",
      color: "#a3e635",
      capabilities: [
        "Create a custom AI agent",
        "No code required",
        "Describe what you need",
        "Botz builds it",
      ],
      // No template - goes to main studio
    },
  ] : [
    {
      name: "Especialista de Onboarding IA",
      avatar: "👋",
      imageSrc: "/img/onboarding.png",
      color: "#a3e635",
      capabilities: ["Guia onboarding", "Impulsa adopcion", "Envia encuestas", "Rastrea progreso"],
      agentType: "text" as const,
    },
    {
      name: "Evaluador de Candidatos IA (HR)",
      avatar: "👔",
      imageSrc: "/img/evaluardor%20de%20candidatos.png",
      color: "#a3e635",
      capabilities: ["Filtra candidatos", "Hace preguntas estructuradas", "Identifica talento", "Actualiza ATS"],
      agentType: "voice" as const,
    },
    {
      name: "Especialista de Cobranza IA",
      avatar: "💰",
      imageSrc: "/img/cobranza.png",
      color: "#a3e635",
      capabilities: ["Llama por saldos", "Recupera pagos", "Envia recordatorios", "Actualiza tu CRM"],
      agentType: "voice" as const,
    },
    {
      name: "Crea el Tuyo",
      avatar: "✨",
      imageSrc: "/img/crea%20el%20tuyo.png",
      color: "#a3e635",
      capabilities: ["Crea un agente IA personalizado", "Sin codigo", "Describe lo que necesitas", "Botz lo construye"],
    },
  ];

  return (
    <section style={{ padding: "clamp(42px, 8vw, 100px) clamp(12px, 4vw, 40px)", background: "#02040a" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "60px" }}>
          <h2
            style={{
              fontSize: "clamp(1.9rem, 5vw, 2.8rem)",
              fontWeight: "bold",
              color: "#fff",
              marginBottom: "16px",
              lineHeight: 1.2,
            }}
          >
            {isEn ? "AI Agents for every" : "Agentes IA para cada"}
            <br />
            <span style={{ color: "#a3e635" }}>{isEn ? "stage of your business" : "etapa de tu negocio"}</span>
          </h2>
          
          <p
            style={{
              fontSize: "clamp(1rem, 2.5vw, 1.3rem)",
              color: "#e2e8f0",
              maxWidth: "700px",
              margin: "0 auto",
              lineHeight: 1.6,
            }}
          >
            {isEn ? "Hire specialized agents that run 24/7 to scale your operation" : "Contrata agentes especializados que trabajan 24/7 para escalar tu operacion"}
          </p>

          <div
            style={{
              marginTop: 20,
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={goTrial}
              style={{
                padding: "13px 22px",
                borderRadius: 12,
                border: "1px solid #1d4ed8",
                background: "linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)",
                color: "#eaf4ff",
                fontWeight: 900,
                fontSize: 16,
                cursor: "pointer",
                transition: "all .22s ease",
                boxShadow: "0 8px 24px rgba(37,99,235,0.35)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 14px 32px rgba(37,99,235,0.45)";
                e.currentTarget.style.filter = "brightness(1.06)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(37,99,235,0.35)";
                e.currentTarget.style.filter = "brightness(1)";
              }}
            >
              {isEn ? "Start Free" : "Prueba Gratis"}
            </button>
          </div>

          {demoVideoUrl ? (
            <button
              onClick={goVideo}
              style={{
                marginTop: 12,
                border: "none",
                background: "transparent",
                color: "#38bdf8",
                fontWeight: 800,
                fontSize: 14,
                cursor: "pointer",
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
               {isEn ? "Watch how it works (2 min)" : "Ver video de como funciona (2 min)"}
            </button>
          ) : null}
        </div>

        {/* Top row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "24px",
            marginBottom: "24px",
          }}
        >
          {topRowAgents.map((agent, index) => (
            <AgentCard key={index} {...agent} ctaLabel={ctaLabel} />
          ))}
        </div>

        {/* Bottom row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "24px",
          }}
        >
          {bottomRowAgents.map((agent, index) => (
            <AgentCard key={index} {...agent} ctaLabel={ctaLabel} />
          ))}
        </div>

        <div style={{ marginTop: 40, marginBottom: 18, padding: "0 clamp(8px, 2vw, 28px)" }}>
          <h3 style={{ margin: 0, color: "#ffffff", fontSize: "clamp(1.8rem, 3.8vw, 3rem)", lineHeight: 1.05, fontWeight: 900 }}>
            {isEn ? "Try our live demo." : "Prueba nuestra demostración en vivo."}
          </h3>
          <p style={{ color: "#e2e8f0", margin: "10px 0 0", fontSize: "clamp(1rem, 1.6vw, 1.85rem)", lineHeight: 1.35 }}>
            {isEn
              ? "Experience how our AI voice agents handle conversations in real time."
              : "Experimente cómo nuestros agentes de voz con inteligencia artificial gestionan las conversaciones en tiempo real."}
          </p>
        </div>

        <div
          style={{
            marginTop: 12,
            marginBottom: 28,
            borderRadius: 24,
            border: "1px solid rgba(34,211,238,0.35)",
            background: "radial-gradient(circle at 25% 30%, rgba(34,211,238,0.14), rgba(15,23,42,0.96) 52%), radial-gradient(circle at 75% 60%, rgba(163,230,53,0.16), rgba(15,23,42,0.96) 55%)",
            padding: "clamp(16px, 3.2vw, 34px)",
            display: "flex",
            flexWrap: "wrap",
            gap: 22,
            alignItems: "center",
            justifyContent: "space-between",
            overflow: "hidden",
          }}
        >
          <form onSubmit={submitLiveCall} style={{ flex: "1 1 520px", maxWidth: 760, width: "100%" }}>
            <div style={{ display: "grid", gridTemplateColumns: "102px 1fr", gap: 10, marginBottom: 10 }}>
              <select
                value={callCountryCode}
                onChange={(e) => setCallCountryCode(e.target.value)}
                style={{
                  width: "100%",
                  borderRadius: 14,
                  border: "1px solid rgba(34,211,238,0.45)",
                  background: "rgba(15,23,42,0.72)",
                  color: "#e2e8f0",
                  padding: "0 12px",
                  fontWeight: 700,
                  fontSize: 17,
                  height: 56,
                  outline: "none",
                }}
              >
                <option value="+1">+1 (US/CA)</option>
                <option value="+57">+57 (CO)</option>
                <option value="+52">+52 (MX)</option>
                <option value="+34">+34 (ES)</option>
                <option value="+54">+54 (AR)</option>
                <option value="+56">+56 (CL)</option>
                <option value="+51">+51 (PE)</option>
                <option value="+593">+593 (EC)</option>
                <option value="+58">+58 (VE)</option>
                <option value="+55">+55 (BR)</option>
              </select>
              <input
                value={callPhone}
                onChange={(e) => setCallPhone(e.target.value.replace(/[^0-9\s-]/g, ""))}
                placeholder={isEn ? "Enter your phone" : "Ingresa tu numero"}
                style={{
                  width: "100%",
                  borderRadius: 14,
                  border: "1px solid rgba(34,211,238,0.45)",
                  background: "rgba(15,23,42,0.72)",
                  color: "#e2e8f0",
                  padding: "0 18px",
                  fontSize: 17,
                  height: 56,
                  outline: "none",
                }}
              />
            </div>

            <input
              value={callName}
              onChange={(e) => setCallName(e.target.value)}
              placeholder={isEn ? "Your name" : "Tu nombre"}
              style={{ width: "100%", borderRadius: 14, border: "1px solid rgba(34,211,238,0.45)", background: "rgba(15,23,42,0.72)", color: "#e2e8f0", padding: "0 18px", marginBottom: 10, fontSize: 18, lineHeight: 1, height: 56, display: "flex", alignItems: "center" }}
            />

            <input
              value={callEmail}
              onChange={(e) => setCallEmail(e.target.value)}
              placeholder={isEn ? "Your email" : "Tu correo"}
              type="email"
              style={{ width: "100%", borderRadius: 14, border: "1px solid rgba(34,211,238,0.45)", background: "rgba(15,23,42,0.72)", color: "#e2e8f0", padding: "0 18px", marginBottom: 12, fontSize: 18, lineHeight: 1, height: 56, display: "flex", alignItems: "center" }}
            />

            {callError ? <div style={{ color: "#fda4af", fontSize: 13, marginBottom: 8 }}>{callError}</div> : null}
            {callWarning ? <div style={{ color: "#fcd34d", fontSize: 13, marginBottom: 8 }}>{callWarning}</div> : null}
            {callSuccess ? <div style={{ color: "#86efac", fontSize: 13, marginBottom: 8 }}>{callSuccess}</div> : null}
            {callMeta ? <div style={{ color: "#7dd3fc", fontSize: 12, marginBottom: 8 }}>{callMeta}</div> : null}

            <button
              type="submit"
              disabled={callLoading}
              style={{
                width: "100%",
                border: "none",
                borderRadius: 12,
                background: "linear-gradient(135deg, #0ea5e9 0%, #22d3ee 100%)",
                color: "#031525",
                fontWeight: 900,
                padding: "12px 16px",
                fontSize: 16,
                cursor: callLoading ? "not-allowed" : "pointer",
                opacity: callLoading ? 0.7 : 1,
              }}
            >
              {callLoading ? (isEn ? "Sending..." : "Enviando...") : (isEn ? "Receive Call" : "Recibir llamada")}
            </button>
            <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 8 }}>
              {isEn
                ? "Trial note: Twilio trial can call only verified numbers."
                : "Nota trial: Twilio en modo prueba solo llama a numeros verificados."}
            </div>
          </form>

          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flex: "0 1 390px", width: "100%", maxWidth: 390 }}>
            <div
              style={{
                width: "100%",
                aspectRatio: "1 / 1",
                borderRadius: "50%",
                background: "radial-gradient(circle at 35% 25%, rgba(163,230,53,0.95), rgba(163,230,53,0.25) 46%, rgba(15,23,42,0.05) 70%)",
                padding: 0,
              }}
            >
              <img
                src="/img/LLama.png"
                alt="Botz live call"
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", borderRadius: "50%", border: "none", display: "block" }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Agentes;
