"use client";

import React, { useState, useEffect } from "react";

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "bot"; content: string }[]>([]);

  // Mensaje automático al iniciar
  useEffect(() => {
    setMessages([
      {
        role: "bot",
        content: "¡Hola! 👋 Soy tu asistente IA. ¿En qué puedo ayudarte hoy?",
      },
    ]);
  }, []);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input } as const;
    setMessages((prev) => [...prev, userMessage, { role: "bot", content: "Procesando..." }]);
    setInput("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message: input }),
      });
      const data = await response.json();
      setMessages((prev) => [...prev.slice(0, -1), { role: "bot", content: data.response }]);
    } catch {
      setMessages((prev) => [...prev.slice(0, -1), { role: "bot", content: "⚠️ Error al conectar." }]);
    }
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
            cursor: "pointer",
          }}
          title="Abrir Chat IA"
        >
          <img
            src="/img/agent-icon.png"
            alt="Agente virtual"
            style={{ width: "24px", height: "24px", objectFit: "contain" }}
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
          {/* Header */}
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

          {/* Messages */}
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

          {/* Footer con input, botón enviar y WhatsApp */}
          <div
            style={{
              display: "flex",
              borderTop: "1px solid #00b4d8",
              backgroundColor: "#040917",
              padding: "8px",
              gap: "6px",
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

            {/* Botón WhatsApp con SVG */}
            <a
              href="https://wa.me/573154829949"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                backgroundColor: "#25D366",
                width: "40px",
                height: "40px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 32 32"
                width="22"
                height="22"
                fill="white"
              >
                <path d="M16.001 3.2c-7.083 0-12.8 5.717-12.8 12.8 0 2.262.597 4.474 1.733 6.418l-1.837 6.72 6.881-1.805c1.87 1.02 3.982 1.56 6.023 1.56h.001c7.083 0 12.799-5.717 12.799-12.8 0-3.414-1.332-6.621-3.75-9.05-2.418-2.43-5.624-3.762-9.05-3.762zm0 23.36c-1.792 0-3.55-.48-5.09-1.39l-.364-.214-4.084 1.07 1.09-3.987-.237-.375a9.564 9.564 0 01-1.46-5.085c0-5.302 4.316-9.619 9.619-9.619 2.568 0 4.979 1 6.791 2.813 1.813 1.813 2.813 4.224 2.813 6.791 0 5.302-4.316 9.619-9.618 9.619zm5.273-7.147c-.288-.144-1.707-.84-1.972-.935-.265-.096-.458-.144-.651.144-.192.288-.744.935-.913 1.126-.168.192-.337.216-.625.072-.288-.144-1.216-.448-2.316-1.427-.856-.764-1.435-1.707-1.604-1.995-.168-.288-.018-.444.126-.588.129-.128.288-.337.432-.505.144-.168.192-.288.288-.48.096-.192.048-.36-.024-.504-.072-.144-.651-1.571-.893-2.147-.24-.576-.48-.497-.651-.505l-.556-.01c-.192 0-.504.072-.769.36s-1.009.984-1.009 2.4 1.034 2.784 1.176 2.976c.144.192 2.037 3.112 4.937 4.367.69.298 1.229.477 1.648.612.693.22 1.325.189 1.824.115.557-.083 1.707-.696 1.948-1.366.24-.67.24-1.246.168-1.366-.072-.12-.264-.192-.553-.336z"/>
              </svg>
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBot;

