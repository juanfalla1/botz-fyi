"use client";

import React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import useBotzLanguage from "@/app/start/hooks/useBotzLanguage";
import Vapi from "@vapi-ai/web";
import "./Agentes.css";

interface AgentCardProps {
  name: string;
  avatar: React.ReactNode;
  imageSrc?: string;
  color: string;
  capabilities: string[];
  templateId?: string;
  agentType?: 'voice' | 'text' | 'flow';
  videoSrc?: string;
  ctaLabel: string;
  onSelect: () => void;
}

type AgentItem = Omit<AgentCardProps, "ctaLabel" | "onSelect">;

const AgentCard = ({ name, avatar, imageSrc, color, capabilities, ctaLabel, onSelect }: AgentCardProps) => {
  return (
    <article className="showcase-agent-card" onClick={onSelect}>
      <div className="showcase-agent-glow" aria-hidden="true" />
      <div className="showcase-agent-mockup" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <h3>{name}</h3>

      <div
          className="showcase-agent-avatar"
          style={{ borderColor: `${color}55` }}
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

      <div className="showcase-agent-capabilities">
        {capabilities.map((cap, idx) => (
          <div key={idx} className="showcase-agent-capability">
            <span>✓</span>
            <span>{cap}</span>
          </div>
        ))}
      </div>

      <button
        className="showcase-agent-cta"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSelect();
        }}
      >
        {ctaLabel}
      </button>
    </article>
  );
};

function AgentDetailModal({ agent, isEn, onClose, onViewDemo, onOpenPlatform }: { agent: AgentItem; isEn: boolean; onClose: () => void; onViewDemo: () => void; onOpenPlatform: () => void }) {
  const problems = isEn
    ? ["Manual handoffs between teams", "Slow response times", "Disconnected customer data"]
    : ["Handoffs manuales entre equipos", "Tiempos de respuesta lentos", "Datos del cliente desconectados"];
  const flow = isEn
    ? ["Customer signal", agent.name, "BOTZ Orchestrator", "Business system", "Next action"]
    : ["Señal del cliente", agent.name, "BOTZ Orchestrator", "Sistema del negocio", "Siguiente acción"];

  return (
    <div className="agent-modal-backdrop" role="dialog" aria-modal="true" aria-label={agent.name} onClick={onClose}>
      <div className="agent-modal" onClick={(event) => event.stopPropagation()}>
        <button className="agent-modal-back" type="button" onClick={onClose}>{isEn ? "Back to agents" : "Volver a agentes"}</button>
        <button className="agent-modal-close" type="button" onClick={onClose} aria-label={isEn ? "Close" : "Cerrar"}>×</button>
        <div className="agent-modal-hero">
          <div className="agent-modal-avatar" style={{ borderColor: `${agent.color}66` }}>
            {agent.imageSrc ? <img src={agent.imageSrc} alt={agent.name} /> : agent.avatar}
          </div>
          <div>
            <span className="agent-modal-kicker">{isEn ? "AI Workforce" : "Fuerza laboral IA"}</span>
            <h3>{agent.name}</h3>
            <p>
              {isEn
                ? `${agent.name} is a specialized AI agent that works with BOTZ Orchestrator to move work from request to action.`
                : `${agent.name} es un agente de IA especializado que trabaja con BOTZ Orchestrator para mover el trabajo desde la solicitud hasta la accion.`}
            </p>
          </div>
        </div>

        <div className="agent-modal-grid">
          <section>
            <h4>{isEn ? "What it does" : "Qué hace"}</h4>
            <ul>{agent.capabilities.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
          <section>
            <h4>{isEn ? "Problems it solves" : "Problemas que resuelve"}</h4>
            <ul>{problems.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
        </div>

        <section className="agent-modal-flow">
          <h4>{isEn ? "Workflow" : "Flujo de trabajo"}</h4>
          <div>
            {flow.map((step, index) => (
              <React.Fragment key={`${step}-${index}`}>
                <span>{step}</span>
                {index < flow.length - 1 && <i>→</i>}
              </React.Fragment>
            ))}
          </div>
        </section>

        <div className="agent-modal-actions">
          <button type="button" onClick={onViewDemo}>{isEn ? "Watch demo" : "Ver demo"}</button>
          <button type="button" onClick={onOpenPlatform}>{isEn ? "Open Platform" : "Abrir plataforma"}</button>
        </div>
      </div>
    </div>
  );
}

function AgentVideoModal({ src, title, isEn, onClose }: { src: string; title: string; isEn: boolean; onClose: () => void }) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="agent-video-backdrop" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="agent-video-modal" onClick={(event) => event.stopPropagation()}>
        <div className="agent-video-head">
          <div>
            <span>{isEn ? "Agent demo" : "Demo del agente"}</span>
            <strong>{title}</strong>
          </div>
          <button type="button" onClick={onClose} aria-label={isEn ? "Close video" : "Cerrar video"}>×</button>
        </div>
        <div className="agent-video-frame">
          <video key={src} src={src} controls autoPlay playsInline />
        </div>
      </div>
    </div>,
    document.body
  );
}

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
  const [selectedAgentIndex, setSelectedAgentIndex] = React.useState<number | null>(null);
  const [videoDemo, setVideoDemo] = React.useState<{ src: string; title: string } | null>(null);
  const vapiRef = React.useRef<any>(null);
  const vapiEventsRef = React.useRef(false);

  const goTrial = () => {
    router.push("/start/agents");
  };

  const goVideo = () => {
    if (!demoVideoUrl) return;
    window.open(demoVideoUrl, "_blank");
  };

  const ctaLabel = isEn ? "Learn More" : "Conocer más";

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
      videoSrc: "/videos/Recepcionista.mp4",
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
      videoSrc: "/videos/lead calificador.mp4",
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
      videoSrc: "/videos/seguimiento en ventas.mp4",
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
      videoSrc: "/videos/soporte al cliente.mp4",
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
      videoSrc: "/videos/Recepcionista.mp4",
    },
    {
      name: "Calificador de Leads IA",
      avatar: "🎯",
      imageSrc: "/img/Calificador%20de%20Leads%20IA.png",
      color: "#a3e635",
      capabilities: ["Califica leads al instante", "Genera interaccion", "Puntua y enruta", "Actualiza tu CRM"],
      templateId: "lia",
      agentType: "voice" as const,
      videoSrc: "/videos/lead calificador.mp4",
    },
    {
      name: "Seguimiento de Ventas IA",
      avatar: "📧",
      imageSrc: "/img/seguimiento%20de%20ventas.png",
      color: "#a3e635",
      capabilities: ["Envia seguimientos", "Nutre prospectos", "Reactiva leads", "Actualiza tu CRM"],
      templateId: "alex",
      agentType: "text" as const,
      videoSrc: "/videos/seguimiento en ventas.mp4",
    },
    {
      name: "Soporte al Cliente IA",
      avatar: "🎧",
      imageSrc: "/img/soporte%20al%20cliente.png",
      color: "#a3e635",
      capabilities: ["Resuelve problemas", "Responde FAQs", "Gestiona incidencias", "Escala a humanos"],
      agentType: "text" as const,
      videoSrc: "/videos/soporte al cliente.mp4",
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
      videoSrc: "/videos/onboarding.mp4",
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
      videoSrc: "/videos/evaluador.mp4",
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
      videoSrc: "/videos/cobranza.mp4",
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
      videoSrc: "/videos/crea el tuyo.mp4",
    },
  ] : [
    {
      name: "Especialista de Onboarding IA",
      avatar: "👋",
      imageSrc: "/img/onboarding.png",
      color: "#a3e635",
      capabilities: ["Guia onboarding", "Impulsa adopcion", "Envia encuestas", "Rastrea progreso"],
      agentType: "text" as const,
      videoSrc: "/videos/onboarding.mp4",
    },
    {
      name: "Evaluador de Candidatos IA (HR)",
      avatar: "👔",
      imageSrc: "/img/evaluardor%20de%20candidatos.png",
      color: "#a3e635",
      capabilities: ["Filtra candidatos", "Hace preguntas estructuradas", "Identifica talento", "Actualiza ATS"],
      agentType: "voice" as const,
      videoSrc: "/videos/evaluador.mp4",
    },
    {
      name: "Especialista de Cobranza IA",
      avatar: "💰",
      imageSrc: "/img/cobranza.png",
      color: "#a3e635",
      capabilities: ["Llama por saldos", "Recupera pagos", "Envia recordatorios", "Actualiza tu CRM"],
      agentType: "voice" as const,
      videoSrc: "/videos/cobranza.mp4",
    },
    {
      name: "Crea el Tuyo",
      avatar: "✨",
      imageSrc: "/img/crea%20el%20tuyo.png",
      color: "#a3e635",
      capabilities: ["Crea un agente IA personalizado", "Sin codigo", "Describe lo que necesitas", "Botz lo construye"],
      videoSrc: "/videos/crea el tuyo.mp4",
    },
  ];

  const allAgents = [...topRowAgents, ...bottomRowAgents];
  const selectedAgent = selectedAgentIndex === null ? null : allAgents[selectedAgentIndex] || null;
  const operatingStats = isEn
    ? ["8 specialized agents", "1 connected workforce", "Every workflow in motion"]
    : ["8 agentes especializados", "1 fuerza laboral conectada", "Cada flujo en movimiento"];

  return (
    <section className="agentes-showcase-shell" style={{ padding: "clamp(42px, 8vw, 100px) clamp(12px, 4vw, 40px)", background: "#02040a" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto", position: "relative", zIndex: 2 }}>
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
            {isEn ? "Meet Your AI Workforce" : "Conoce tu AI Workforce"}
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
            {isEn
              ? "Specialized AI agents work together through BOTZ Orchestrator to execute sales, support, onboarding, collections and operations workflows."
              : "Agentes de IA especializados trabajan juntos a través de BOTZ Orchestrator para ejecutar flujos de ventas, soporte, onboarding, cobranza y operaciones."}
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

         <div className="showcase-orchestrator-map" aria-hidden="true">
           <span>{isEn ? "Connected by" : "Conectados por"}</span>
           <strong>BOTZ Orchestrator</strong>
           <div className="showcase-orchestrator-lines">
             <i /><i /><i /><i />
           </div>
         </div>

          <div className="showcase-agent-grid">
             {allAgents.map((agent, index) => (
               <AgentCard key={`${agent.name}-${index}`} {...agent} ctaLabel={ctaLabel} onSelect={() => setSelectedAgentIndex(index)} />
             ))}
           </div>

          <section className="agent-command-center" aria-label={isEn ? "BOTZ AI Workforce command center" : "Centro de comando AI Workforce BOTZ"}>
            <div className="agent-command-copy">
              <span>{isEn ? "BOTZ AI Workforce" : "AI Workforce BOTZ"}</span>
              <h3>{isEn ? "One operating system for every agent." : "Un sistema operativo para todos tus agentes."}</h3>
              <p>
                {isEn
                  ? "BOTZ connects reception, sales, support, onboarding, HR, collections and custom agents into one coordinated workforce that moves work from signal to outcome."
                  : "BOTZ conecta recepción, ventas, soporte, onboarding, talento humano, cobranza y agentes personalizados en una fuerza laboral coordinada que convierte señales en resultados."}
              </p>
              <div className="agent-command-stats">
                {operatingStats.map((item) => <strong key={item}>{item}</strong>)}
              </div>
            </div>

            <div className="agent-command-screen">
              <div className="agent-command-orb">
                <span>BOTZ</span>
                <strong>Orchestrator</strong>
              </div>
              <div className="agent-command-video-grid">
                {allAgents.map((agent, index) => (
                  <button
                    key={`workforce-${agent.name}-${index}`}
                    type="button"
                    className="agent-command-video"
                    onClick={() => agent.videoSrc && setVideoDemo({ src: agent.videoSrc, title: agent.name })}
                    onMouseEnter={(event) => event.currentTarget.querySelector("video")?.play().catch(() => {})}
                    onFocus={(event) => event.currentTarget.querySelector("video")?.play().catch(() => {})}
                    aria-label={isEn ? `Watch ${agent.name} demo` : `Ver demo de ${agent.name}`}
                  >
                    {agent.videoSrc ? <video src={agent.videoSrc} muted loop playsInline preload="metadata" /> : null}
                    <span>{agent.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

        {selectedAgent && (
          <AgentDetailModal
            agent={selectedAgent}
            isEn={isEn}
            onClose={() => setSelectedAgentIndex(null)}
            onViewDemo={() => {
              if (selectedAgent.videoSrc) {
                setSelectedAgentIndex(null);
                setVideoDemo({ src: selectedAgent.videoSrc, title: selectedAgent.name });
                return;
              }
              setSelectedAgentIndex(null);
              document.getElementById("agents-live-demo")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            onOpenPlatform={goTrial}
          />
        )}

        {videoDemo && (
          <AgentVideoModal
            src={videoDemo.src}
            title={videoDemo.title}
            isEn={isEn}
            onClose={() => setVideoDemo(null)}
          />
        )}

        <div id="agents-live-demo" style={{ marginTop: 40, marginBottom: 18, padding: "0 clamp(8px, 2vw, 28px)" }}>
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
