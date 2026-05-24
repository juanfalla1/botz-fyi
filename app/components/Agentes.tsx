"use client";

import React from "react";
import { useRouter } from "next/navigation";
import useBotzLanguage from "@/app/start/hooks/useBotzLanguage";
import Vapi from "@vapi-ai/web";

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
  const [callError, setCallError] = React.useState("");
  const [webCallActive, setWebCallActive] = React.useState(false);
  const [webCallBusy, setWebCallBusy] = React.useState(false);
  const [webCallStatus, setWebCallStatus] = React.useState("");
  const [webCallError, setWebCallError] = React.useState("");
  const vapiRef = React.useRef<any>(null);
  const vapiEventsRef = React.useRef(false);

  const goTrial = () => {
    router.push("/start/agents");
  };

  const goVideo = () => {
    if (!demoVideoUrl) return;
    window.open(demoVideoUrl, "_blank");
  };

  const ctaLabel = isEn ? "Start Now" : "Contratar Ahora";

  const bindVapiEvents = React.useCallback((instance: any) => {
    if (!instance || vapiEventsRef.current) return;
    vapiEventsRef.current = true;

    instance.on("call-start", () => {
      setWebCallActive(true);
      setWebCallBusy(false);
      setWebCallError("");
      setWebCallStatus(isEn ? "Connected. Speak naturally." : "Conectado. Habla con naturalidad.");
    });

    instance.on("speech-start", () => {
      setWebCallStatus(isEn ? "Assistant speaking..." : "Asistente hablando...");
    });

    instance.on("speech-end", () => {
      setWebCallStatus(isEn ? "Listening..." : "Escuchando...");
    });

    instance.on("call-end", () => {
      setWebCallActive(false);
      setWebCallBusy(false);
      setWebCallStatus(isEn ? "Call ended." : "Llamada finalizada.");
    });

    instance.on("error", (e: any) => {
      setWebCallBusy(false);
      setWebCallError(String(e?.message || (isEn ? "Web call error." : "Error en llamada web.")));
    });
  }, [isEn]);

  const startWebCall = React.useCallback(async () => {
    const name = String(callName || "").trim();
    const email = String(callEmail || "").trim().toLowerCase();
    const phoneRaw = `${callCountryCode}${callPhone}`.replace(/\s+/g, "").trim();

    if (!name || !email || !callPhone.trim()) {
      setCallError(isEn ? "Complete name, phone and email." : "Completa nombre, telefono y correo.");
      return;
    }

    const publicKey = String(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || "").trim();
    const assistantId = String(process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID || "").trim();

    if (!publicKey || !assistantId) {
      setWebCallError(isEn ? "Missing Vapi keys in env vars." : "Faltan claves de Vapi en variables de entorno.");
      return;
    }

    try {
      setCallError("");
      setWebCallError("");
      setWebCallBusy(true);
      setWebCallStatus(isEn ? "Starting web call..." : "Iniciando llamada web...");

      if (!vapiRef.current) {
        vapiRef.current = new (Vapi as any)(publicKey);
        bindVapiEvents(vapiRef.current);
      }

      await vapiRef.current.start(assistantId, {
        variableValues: {
          name,
          email,
          phone: phoneRaw,
        },
      });
    } catch (err: any) {
      setWebCallBusy(false);
      setWebCallError(String(err?.message || (isEn ? "Could not start web call." : "No se pudo iniciar la llamada web.")));
    }
  }, [bindVapiEvents, callCountryCode, callEmail, callName, callPhone, isEn]);

  const stopWebCall = React.useCallback(async () => {
    try {
      setWebCallBusy(true);
      if (vapiRef.current) {
        await vapiRef.current.stop();
      }
    } catch {
      // ignore stop errors
    } finally {
      setWebCallBusy(false);
      setWebCallActive(false);
      setWebCallStatus(isEn ? "Call ended." : "Llamada finalizada.");
    }
  }, [isEn]);

  React.useEffect(() => {
    return () => {
      if (vapiRef.current) {
        try {
          vapiRef.current.stop();
        } catch {}
      }
    };
  }, []);

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
          <form onSubmit={(e) => { e.preventDefault(); startWebCall(); }} style={{ flex: "1 1 520px", maxWidth: 760, width: "100%" }}>
            <div style={{ display: "grid", gridTemplateColumns: "102px 1fr", gap: 10, marginBottom: 10 }}>
              <select
                value={callCountryCode}
                onChange={(e) => {
                  setCallCountryCode(e.target.value);
                  if (callError) setCallError("");
                }}
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
                onChange={(e) => {
                  setCallPhone(e.target.value.replace(/[^0-9\s-]/g, ""));
                  if (callError) setCallError("");
                }}
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
              onChange={(e) => {
                setCallName(e.target.value);
                if (callError) setCallError("");
              }}
              placeholder={isEn ? "Your name" : "Tu nombre"}
              style={{ width: "100%", borderRadius: 14, border: "1px solid rgba(34,211,238,0.45)", background: "rgba(15,23,42,0.72)", color: "#e2e8f0", padding: "0 18px", marginBottom: 10, fontSize: 18, lineHeight: 1, height: 56, display: "flex", alignItems: "center" }}
            />

            <input
              value={callEmail}
              onChange={(e) => {
                setCallEmail(e.target.value);
                if (callError) setCallError("");
              }}
              placeholder={isEn ? "Your email" : "Tu correo"}
              type="email"
              style={{ width: "100%", borderRadius: 14, border: "1px solid rgba(34,211,238,0.45)", background: "rgba(15,23,42,0.72)", color: "#e2e8f0", padding: "0 18px", marginBottom: 12, fontSize: 18, lineHeight: 1, height: 56, display: "flex", alignItems: "center" }}
            />

            {callError ? <div style={{ color: "#fda4af", fontSize: 13, marginBottom: 8 }}>{callError}</div> : null}

            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button
                type="submit"
                disabled={webCallActive || webCallBusy}
                style={{
                  flex: 1,
                  border: "1px solid rgba(34,211,238,0.55)",
                  borderRadius: 12,
                  background: "rgba(15,23,42,0.75)",
                  color: "#67e8f9",
                  fontWeight: 800,
                  padding: "10px 14px",
                  cursor: webCallActive || webCallBusy ? "not-allowed" : "pointer",
                  opacity: webCallActive || webCallBusy ? 0.7 : 1,
                }}
              >
                {isEn ? "Start Web Call" : "Iniciar llamada web"}
              </button>
              <button
                type="button"
                onClick={stopWebCall}
                disabled={!webCallActive}
                style={{
                  flex: 1,
                  border: "none",
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                  color: "#fff",
                  fontWeight: 800,
                  padding: "10px 14px",
                  cursor: !webCallActive ? "not-allowed" : "pointer",
                  opacity: !webCallActive ? 0.7 : 1,
                }}
              >
                {isEn ? "End Web Call" : "Finalizar llamada web"}
              </button>
            </div>

            {webCallStatus ? <div style={{ color: "#a3e635", fontSize: 12, marginTop: 8 }}>{webCallStatus}</div> : null}
            {webCallError ? <div style={{ color: "#fda4af", fontSize: 12, marginTop: 6 }}>{webCallError}</div> : null}
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
