"use client";

import React, { useState, useRef, useEffect } from "react";

interface ChatTestPanelProps {
  agentName: string;
  agentRole: string;
  agentPrompt: string;
  companyContext: string;
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
}: ChatTestPanelProps) {
  const [messages, setMessages] = useState<{ role: "user" | "agent"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

    // Simulated agent response (placeholder for API)
    setTimeout(() => {
      const responses = [
        `¡Hola! Soy ${agentName}. ${agentRole}. ¿En qué puedo ayudarte hoy?`,
        "Entiendo. Déjame buscar esa información para ti.",
        "Claro, puedo ayudarte con eso. ¿Tienes alguna preferencia específica?",
        "Perfecto, he registrado tu solicitud. ¿Algo más en lo que pueda asistirte?",
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      setMessages(prev => [...prev, { role: "agent", content: randomResponse }]);
      setIsTyping(false);
    }, 1500);
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
