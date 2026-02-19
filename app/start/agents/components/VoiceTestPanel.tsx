"use client";

import React, { useState, useRef, useEffect } from "react";

interface VoiceTestPanelProps {
  agentName: string;
  agentRole: string;
  agentPrompt: string;
  companyContext: string;
  voiceSettings?: {
    model?: string;
    voice?: string;
  };
}

const C = {
  bg: "#1a1d26",
  dark: "#111318",
  card: "#22262d",
  hover: "#2a2e36",
  border: "rgba(255,255,255,0.08)",
  blue: "#0096ff",
  lime: "#a3e635",
  white: "#ffffff",
  muted: "#9ca3af",
  dim: "#6b7280",
  purple: "#8b5cf6",
};

export default function VoiceTestPanel({
  agentName,
  agentRole,
  agentPrompt,
  companyContext,
  voiceSettings,
}: VoiceTestPanelProps) {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState<{ speaker: "agent" | "user"; text: string }[]>([]);
  const [variables, setVariables] = useState({
    contact_name: "Juan Carlos",
    contact_email: "",
  });
  const [currentInstruction, setCurrentInstruction] = useState<string>("");
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of transcript
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  // Generate instructions from agent config
  useEffect(() => {
    const instructions = `# Identidad
- Eres **${agentName}**, un agente de voz automatizado de Botz.
- Tu rol es: ${agentRole || "Asistente virtual"}
- ${agentPrompt?.split(".").slice(0, 2).join(".")}

# Contexto de la Empresa
${companyContext?.split(".").slice(0, 3).join(".") || "Empresa Botz - Soluciones de automatización con IA"}

# Objetivos
- Objetivo Primario: Ayudar al cliente de forma clara y eficiente.
- Tono: Profesional, amigable y orientado a resultados.`;
    
    setCurrentInstruction(instructions);
  }, [agentName, agentRole, agentPrompt, companyContext]);

  const handleStartCall = async () => {
    setIsLoading(true);
    
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsLoading(false);
    setIsCallActive(true);
    
    // Add initial agent greeting
    setTranscript([{
      speaker: "agent",
      text: `Hola ${variables.contact_name}, soy ${agentName} de Botz. ¿Puedes oírme bien?`,
    }]);
  };

  const handleEndCall = () => {
    setIsCallActive(false);
    setTranscript([]);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, height: "calc(100vh - 200px)" }}>
      {/* Left Panel - Instructions */}
      <div style={{ 
        backgroundColor: C.dark, 
        borderRadius: 14, 
        border: `1px solid ${C.border}`,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: C.white }}>
          Instrucciones
        </h3>
        
        <div 
          ref={scrollRef}
          style={{ 
            flex: 1, 
            overflow: "auto",
            fontFamily: "monospace",
            fontSize: 14,
            lineHeight: 1.6,
            color: C.muted,
            whiteSpace: "pre-wrap",
            padding: 16,
            backgroundColor: "rgba(0,0,0,0.3)",
            borderRadius: 8,
          }}
        >
          <div style={{ color: C.purple, marginBottom: 8 }}># Identidad</div>
          <div style={{ marginBottom: 16 }}>
            - Eres <strong style={{ color: C.white }}>**{agentName}**</strong>, un agente de voz automatizado de Botz.
            <br />
            - Tu rol es: {agentRole || "Asistente virtual"}
            <br />
            - {agentPrompt?.split(".").slice(0, 2).join(".")}
          </div>
          
          <div style={{ color: C.purple, marginBottom: 8 }}># Objetivos</div>
          <div style={{ marginBottom: 16 }}>
            - Objetivo Primario: Ayudar al cliente de forma clara y eficiente.
            <br />
            - Tono: Profesional, amigable y orientado a resultados.
          </div>
          
          <div style={{ color: C.purple, marginBottom: 8 }}># Contexto de la Empresa</div>
          <div>
            {companyContext || "Empresa Botz - Soluciones de automatización con IA"}
          </div>
        </div>
        
        <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
          <button
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: `1px solid ${C.lime}`,
              backgroundColor: "transparent",
              color: C.lime,
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>✨</span> Generar con IA
          </button>
          
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: C.dim, fontSize: 14 }}>GPT 4.1</span>
            <span style={{ color: C.dim }}>▼</span>
          </div>
        </div>
      </div>

      {/* Right Panel - Web Call Test */}
      <div style={{ 
        backgroundColor: C.dark, 
        borderRadius: 14, 
        border: `1px solid ${C.border}`,
        padding: 24,
        display: "flex",
        flexDirection: "column",
      }}>
        {!isCallActive ? (
          <>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: C.white }}>
              Haz una llamada de prueba
            </h3>
            
            <p style={{ color: C.muted, fontSize: 14, marginBottom: 24 }}>
              Interactúa con tu agente directamente desde el navegador. Es completamente gratis.
            </p>

            <div style={{ marginBottom: 24 }}>
              <div style={{ 
                fontSize: 12, 
                fontWeight: 700, 
                color: C.white, 
                marginBottom: 12,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}>
                Variables de entrada:
              </div>
              <p style={{ color: C.dim, fontSize: 13, marginBottom: 16 }}>
                Configura estas variables para simular una conversación real.
              </p>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <input
                    value="contact_name"
                    disabled
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: `1px solid ${C.border}`,
                      backgroundColor: "rgba(0,0,0,0.3)",
                      color: C.muted,
                      fontSize: 14,
                    }}
                  />
                  <input
                    value={variables.contact_name}
                    onChange={(e) => setVariables({ ...variables, contact_name: e.target.value })}
                    placeholder="Nombre del contacto"
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: `1px solid ${C.border}`,
                      backgroundColor: "rgba(0,0,0,0.3)",
                      color: C.white,
                      fontSize: 14,
                    }}
                  />
                </div>
                
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <input
                    value="contact_email"
                    disabled
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: `1px solid ${C.border}`,
                      backgroundColor: "rgba(0,0,0,0.3)",
                      color: C.muted,
                      fontSize: 14,
                    }}
                  />
                  <input
                    value={variables.contact_email}
                    onChange={(e) => setVariables({ ...variables, contact_email: e.target.value })}
                    placeholder="email@ejemplo.com"
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: `1px solid ${C.border}`,
                      backgroundColor: "rgba(0,0,0,0.3)",
                      color: C.white,
                      fontSize: 14,
                    }}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleStartCall}
              disabled={isLoading}
              style={{
                padding: "14px 28px",
                borderRadius: 10,
                border: `1px solid ${C.lime}`,
                backgroundColor: "transparent",
                color: C.lime,
                fontWeight: 700,
                fontSize: 15,
                cursor: isLoading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                marginTop: "auto",
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? (
                <>
                  <span style={{ animation: "spin 1s linear infinite" }}>⟳</span>
                  Conectando...
                </>
              ) : (
                <>
                  <span>📞</span>
                  Iniciar llamada web
                </>
              )}
            </button>
          </>
        ) : (
          <>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: C.white }}>
              Transcripción de la llamada
            </h3>
            
            <p style={{ color: C.muted, fontSize: 14, marginBottom: 24 }}>
              Sigue la conversación con el agente en tiempo real.
            </p>

            <div 
              style={{ 
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.3)",
                borderRadius: 12,
                padding: 16,
                overflow: "auto",
                marginBottom: 16,
              }}
            >
              {transcript.map((entry, idx) => (
                <div 
                  key={idx} 
                  style={{ 
                    marginBottom: 16,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: entry.speaker === "agent" ? "flex-start" : "flex-end",
                  }}
                >
                  <div 
                    style={{
                      backgroundColor: entry.speaker === "agent" ? "rgba(139,92,246,0.2)" : "rgba(0,150,255,0.2)",
                      padding: "12px 16px",
                      borderRadius: 12,
                      maxWidth: "80%",
                    }}
                  >
                    <div style={{ 
                      fontSize: 12, 
                      fontWeight: 600, 
                      color: entry.speaker === "agent" ? C.purple : C.blue,
                      marginBottom: 4,
                      textTransform: "capitalize",
                    }}>
                      {entry.speaker}
                    </div>
                    <div style={{ color: C.white, fontSize: 14, lineHeight: 1.5 }}>
                      {entry.text}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleEndCall}
              style={{
                padding: "14px 28px",
                borderRadius: 10,
                border: `1px solid ${C.lime}`,
                backgroundColor: C.lime,
                color: C.dark,
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              <span>📞</span>
              Finalizar llamada
            </button>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
