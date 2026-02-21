"use client";

import React, { useState, useRef, useEffect } from "react";
import { authedFetch } from "@/app/start/agents/authedFetchAgents";

interface ChatTestPanelProps {
  agentName: string;
  agentRole: string;
  agentPrompt: string;
  companyContext: string;
  brainFiles?: { name: string; content: string; type: string }[];
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

export default function ChatTestPanel({
  agentName,
  agentRole,
  agentPrompt,
  companyContext,
  brainFiles = [],
}: ChatTestPanelProps) {
  const [messages, setMessages] = useState<{ role: "user" | "agent"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const indexedFiles = (brainFiles || []).filter((f) => String(f?.content || "").trim().length > 0);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsTyping(true);
    setError(null);

    try {
      // Construir el contexto del agente
      const context = `
Tu nombre es: ${agentName}
Tu rol/propósito es: ${agentRole}
Instrucciones: ${agentPrompt}
${companyContext ? `Información de la empresa: ${companyContext}` : ""}
${indexedFiles.length > 0 ? `\nDocumentación relevante disponible: ${indexedFiles.map(f => f.name).join(", ")}` : ""}
`;

      // Realizar la llamada a la API
      const res = await authedFetch("/api/agents/chat-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          context,
          conversationHistory: messages,
          brainFiles: indexedFiles.map(f => ({ name: f.name, content: f.content })),
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json?.error || "No se pudo obtener respuesta");
      }

      const json = await res.json();
      const agentResponse = json?.response || "No pude procesar tu solicitud.";
      
      setMessages(prev => [...prev, { role: "agent", content: agentResponse }]);
    } catch (err: any) {
      console.error("Error en chat:", err);
      setError(err?.message || "Error al conectar con el agente");
      const errorMsg = "Disculpa, tengo problemas técnicos. Intenta de nuevo en unos momentos.";
      setMessages(prev => [...prev, { role: "agent", content: errorMsg }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      height: "100%",
      flex: 1,
      minHeight: 560,
      backgroundColor: C.dark,
      borderRadius: 14,
      border: `1px solid ${C.border}`,
    }}>
      {/* Header */}
      <div style={{ 
        padding: "16px 20px", 
        borderBottom: `1px solid ${C.border}`,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          backgroundColor: C.purple,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
        }}>
          🤖
        </div>
        <div>
          <div style={{ color: C.white, fontWeight: 600, fontSize: 16 }}>
            {agentName || "Agente"}
          </div>
          <div style={{ color: C.muted, fontSize: 13 }}>
            {agentRole || "Asistente virtual"} • En línea
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div style={{
          padding: "12px 16px",
          backgroundColor: "rgba(239,68,68,0.15)",
          color: "#f87171",
          fontSize: 13,
          borderBottom: `1px solid rgba(239,68,68,0.3)`,
        }}>
          ⚠️ {error}
        </div>
      )}

      {brainFiles.length > 0 && indexedFiles.length === 0 && (
        <div style={{
          padding: "10px 16px",
          backgroundColor: "rgba(245,158,11,0.15)",
          color: "#fbbf24",
          fontSize: 12,
          borderBottom: `1px solid rgba(245,158,11,0.35)`,
        }}>
          Los archivos cargados aun no tienen contenido indexado. Vuelve a subirlos en la pestaña Archivos.
        </div>
      )}

      {/* Messages */}
      <div style={{ 
        flex: 1, 
        overflow: "auto", 
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}>
        {messages.length === 0 ? (
          <div style={{ 
            textAlign: "center", 
            color: C.muted, 
            marginTop: 40,
            padding: "0 40px",
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: C.white, marginBottom: 8 }}>
              Inicia una conversación
            </div>
            <div style={{ fontSize: 14 }}>
              Escribe un mensaje para probar cómo responde tu agente de texto
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "80%",
                backgroundColor: msg.role === "user" ? C.blue : "rgba(139,92,246,0.2)",
                padding: "12px 16px",
                borderRadius: 12,
                borderBottomRightRadius: msg.role === "user" ? 4 : 12,
                borderBottomLeftRadius: msg.role === "agent" ? 4 : 12,
              }}
            >
              <div style={{ 
                fontSize: 12, 
                fontWeight: 600, 
                color: msg.role === "user" ? "rgba(255,255,255,0.8)" : C.purple,
                marginBottom: 4,
                textTransform: "capitalize",
              }}>
                {msg.role === "user" ? "Tú" : agentName || "Agente"}
              </div>
              <div style={{ color: C.white, fontSize: 14, lineHeight: 1.5 }}>
                {msg.content}
              </div>
            </div>
          ))
        )}
        
        {isTyping && (
          <div style={{
            alignSelf: "flex-start",
            backgroundColor: "rgba(139,92,246,0.2)",
            padding: "12px 16px",
            borderRadius: 12,
            borderBottomLeftRadius: 4,
          }}>
            <div style={{ color: C.muted, fontSize: 14 }}>
              <span style={{ animation: "pulse 1s infinite" }}>•</span>
              <span style={{ animation: "pulse 1s infinite 0.2s" }}>•</span>
              <span style={{ animation: "pulse 1s infinite 0.4s" }}>•</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ 
        padding: "16px 20px", 
        borderTop: `1px solid ${C.border}`,
        display: "flex",
        gap: 12,
      }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Escribe un mensaje..."
          style={{
            flex: 1,
            padding: "12px 16px",
            borderRadius: 10,
            border: `1px solid ${C.border}`,
            backgroundColor: "rgba(0,0,0,0.3)",
            color: C.white,
            fontSize: 14,
            outline: "none",
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isTyping}
          style={{
            padding: "12px 24px",
            borderRadius: 10,
            border: "none",
            backgroundColor: input.trim() && !isTyping ? C.blue : C.dim,
            color: "#fff",
            fontWeight: 600,
            fontSize: 14,
            cursor: input.trim() && !isTyping ? "pointer" : "not-allowed",
            transition: "all 0.2s",
          }}
        >
          Enviar
        </button>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
