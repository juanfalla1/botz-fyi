"use client";

import React from "react";
import { useRouter } from "next/navigation";

interface AgentCardProps {
  name: string;
  avatar: React.ReactNode;
  color: string;
  capabilities: string[];
  templateId?: string;
  agentType?: 'voice' | 'text' | 'flow';
}

const AgentCard = ({ name, avatar, color, capabilities, templateId, agentType }: AgentCardProps) => {
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
      {/* Nombre arriba */}
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

      {/* Avatar grande del robot */}
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
        }}
      >
        {avatar}
      </div>

      {/* Lista de capacidades con checkmarks */}
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

      {/* Botón Contratar Ahora */}
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
        Contratar Ahora
      </button>
    </div>
  );
};

const Agentes = () => {
  const router = useRouter();
  const demoVideoUrl = process.env.NEXT_PUBLIC_AGENTS_DEMO_VIDEO_URL || "";

  const goTrial = () => {
    router.push("/start/agents");
  };

  const goVideo = () => {
    if (!demoVideoUrl) return;
    window.open(demoVideoUrl, "_blank");
  };

  const topRowAgents = [
    {
      name: "Recepcionista de IA",
      avatar: "🤖",
      color: "#a3e635",
      capabilities: [
        "Atiende cada llamada",
        "Proporciona información",
        "Agenda citas",
        "Actualiza el CRM",
      ],
      templateId: "julia",
      agentType: "text" as const,
    },
    {
      name: "Calificador de Leads de IA",
      avatar: "🎯",
      color: "#a3e635",
      capabilities: [
        "Califica leads al instante",
        "Genera interacción",
        "Puntúa y enruta",
        "Actualiza el CRM",
      ],
      templateId: "lia",
      agentType: "voice" as const,
    },
    {
      name: "Seguimiento de Ventas de IA",
      avatar: "📧",
      color: "#a3e635",
      capabilities: [
        "Envía seguimientos",
        "Nutre prospectos",
        "Reactiva leads",
        "Actualiza el CRM",
      ],
      templateId: "alex",
      agentType: "text" as const,
    },
    {
      name: "Soporte al Cliente de IA",
      avatar: "🎧",
      color: "#a3e635",
      capabilities: [
        "Resuelve problemas",
        "Responde preguntas frecuentes",
        "Soluciona incidencias",
        "Conecta con humanos",
      ],
      agentType: "text" as const,
    },
  ];

  const bottomRowAgents = [
    {
      name: "Especialista de Onboarding de IA",
      avatar: "👋",
      color: "#a3e635",
      capabilities: [
        "Guía el onboarding",
        "Impulsa adopción",
        "Envía encuestas",
        "Rastrea progreso",
      ],
      agentType: "text" as const,
    },
    {
      name: "Evaluador de Candidatos de IA (HR)",
      avatar: "👔",
      color: "#a3e635",
      capabilities: [
        "Filtra candidatos",
        "Hace preguntas estructuradas",
        "Identifica talento calificado",
        "Actualiza el ATS",
      ],
      agentType: "voice" as const,
    },
    {
      name: "Especialista de Cobranza de IA",
      avatar: "💰",
      color: "#a3e635",
      capabilities: [
        "Llama por saldos",
        "Recupera pagos",
        "Envía recordatorios",
        "Actualiza el CRM",
      ],
      agentType: "voice" as const,
    },
    {
      name: "Crea el Tuyo",
      avatar: "✨",
      color: "#a3e635",
      capabilities: [
        "Crea un agente de IA personalizado",
        "Sin usar código",
        "Describe lo que necesitas",
        "Botz lo construye",
      ],
      // No template - goes to main studio
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
            Agentes IA para cada
            <br />
            <span style={{ color: "#a3e635" }}>etapa de tu negocio</span>
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
            Contrata agentes especializados que trabajan 24/7 para escalar tu operación
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
              Prueba Gratis
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
              Ver video de como funciona (2 min)
            </button>
          ) : null}
        </div>

        {/* Primera fila - 4 agentes */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "24px",
            marginBottom: "24px",
          }}
        >
          {topRowAgents.map((agent, index) => (
            <AgentCard key={index} {...agent} />
          ))}
        </div>

        {/* Segunda fila - 4 agentes */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "24px",
          }}
        >
          {bottomRowAgents.map((agent, index) => (
            <AgentCard key={index} {...agent} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Agentes;
