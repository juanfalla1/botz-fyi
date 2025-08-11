"use client";

import React, { useState, useEffect } from "react";

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "bot"; content: string }[]>([]);

  // ✅ Mensaje automático al cargar la página
  useEffect(() => {
    setMessages([
      {
        role: "bot",
        content: "¡Hola! 👋 Soy tu asistente IA. ¿En qué puedo ayudarte hoy?"
      }
    ]);
  }, []);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input }as const;
    setMessages((prev) => [...prev, userMessage, { role: "bot", content: "Procesando..." }]);
    setInput("");

    const response = await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: input }),
    });

    const data = await response.json();
    setMessages((prev) => [...prev.slice(0, -1), { role: "bot", content: data.response }]);
  };

  return (
    <div className="z-50">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="botz-glow-button"
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            backgroundColor: "#00b4d8",
            padding: "16px",
            borderRadius: "50%",
            zIndex: 9999,
            border: "none",
            cursor: "pointer"
          }}
          title="Abrir Chat IA"
        >
          <img
            src="/img/agent-icon.png"
            alt="Agente virtual"
            style={{
              width: "24px",
              height: "24px",
              objectFit: "contain",
            }}
          />
        </button>
      )}

      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "90px",
            right: "24px",
            width: "320px",
            backgroundColor: "#0a1427",
            border: "1px solid #00b4d8",
            borderRadius: "12px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              backgroundColor: "#00b4d8",
              color: "#0a1427",
              padding: "12px",
              fontWeight: "bold",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>🤖 Chat IA</span>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                fontSize: "18px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              ×
            </button>
          </div>

          <div
            style={{
              padding: "12px",
              maxHeight: "250px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              fontSize: "14px",
            }}
          >
            {messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  backgroundColor: msg.role === "user" ? "#1b2a3a" : "#132c42",
                  color: msg.role === "user" ? "white" : "#00b4d8",
                  padding: "8px 12px",
                  borderRadius: "8px",
                }}
              >
                {msg.content}
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              borderTop: "1px solid #00b4d8",
              backgroundColor: "#040917",
              padding: "8px",
            }}
          >
            <input
              type="text"
              placeholder="Escribe algo..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              style={{
                flex: 1,
                padding: "8px",
                backgroundColor: "#0a1427",
                color: "white",
                border: "1px solid #00b4d8",
                borderRight: "none",
                borderRadius: "6px 0 0 6px",
                outline: "none",
              }}
            />
            <button
              onClick={sendMessage}
              style={{
                backgroundColor: "#00b4d8",
                color: "#0a1427",
                padding: "8px 16px",
                fontWeight: "bold",
                border: "none",
                borderRadius: "0 6px 6px 0",
                cursor: "pointer",
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBot;


