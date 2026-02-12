"use client";
import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, Sparkles, Zap } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa6";
import useBotzLanguage from "../hooks/useBotzLanguage";

export type ChatMsg = { 
  role: "bot" | "user"; 
  text: string; 
  options?: string[];
  timestamp?: string;
};

interface ChatBoxProps {
  chat: ChatMsg[];
  isTyping: boolean;
  onSend?: (text: string) => void;
}

export default function ChatBox({ chat, isTyping, onSend }: ChatBoxProps) {
  const language = useBotzLanguage();
  const copy = {
    es: {
      assistantName: "Botz Assistant",
      onlineStatus: "En línea • Responde en segundos",
      aiActive: "IA Activa",
      waitingConnection: "Esperando conexión...",
      emptyHint: "Completa el formulario para iniciar la conversación",
      youLabel: "TÚ",
      inputPlaceholder: "Escribe tu mensaje...",
      timeLocale: "es-ES",
    },
    en: {
      assistantName: "Botz Assistant",
      onlineStatus: "Online • Replies in seconds",
      aiActive: "AI Active",
      waitingConnection: "Waiting for connection...",
      emptyHint: "Fill out the form to start the conversation",
      youLabel: "YOU",
      inputPlaceholder: "Type your message...",
      timeLocale: "en-US",
    },
  } as const;

  const t = copy[language];

  const [input, setInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Limpiar timeout anterior si existe
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Delay para asegurar que el mensaje se renderizó
    scrollTimeoutRef.current = setTimeout(() => {
      if (messagesContainerRef.current) {
        const container = messagesContainerRef.current;
        container.scrollTop = container.scrollHeight;
      }
    }, 100);

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [chat, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !onSend) return;
    onSend(input);
    setInput("");
  };

  const handleOptionClick = (optionText: string) => {
    if (onSend) onSend(optionText);
  };

  const formatTime = () => {
    const now = new Date();
    return now.toLocaleTimeString(t.timeLocale, { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div style={{
      background: "linear-gradient(180deg, rgba(10, 15, 30, 0.95) 0%, rgba(10, 15, 30, 0.85) 100%)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "24px",
      display: "flex",
      flexDirection: "column",
      height: "100%",
      minHeight: "450px",
      maxHeight: "600px",
      overflow: "hidden",
      boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
      position: "relative"
    }}>
      
      {/* Header Premium */}
      <div style={{
        padding: "20px 24px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        background: "linear-gradient(135deg, rgba(37, 211, 102, 0.1) 0%, transparent 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 24px rgba(37, 211, 102, 0.3)"
          }}>
            <FaWhatsapp size={24} color="#fff" />
          </div>
          <div>
            <div style={{ 
              fontSize: "16px", 
              fontWeight: "700", 
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              {t.assistantName}
              <Sparkles size={14} color="#25D366" />
            </div>
            <div style={{ 
              fontSize: "12px", 
              color: "#25D366",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}>
              <div style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#25D366",
                animation: "pulse 2s infinite"
              }} />
              {t.onlineStatus}
            </div>
          </div>
        </div>
        
        <div style={{
          background: "rgba(255,255,255,0.05)",
          padding: "8px 14px",
          borderRadius: "20px",
          fontSize: "11px",
          color: "#64748b",
          display: "flex",
          alignItems: "center",
          gap: "6px"
        }}>
          <Zap size={12} color="#22d3ee" />
          {t.aiActive}
        </div>
      </div>

      {/* Mensajes */}
      <div 
        ref={messagesContainerRef}
        style={{ 
          flex: 1, 
          padding: "24px", 
          overflowY: "auto", 
          display: "flex", 
          flexDirection: "column", 
          gap: "20px"
        }}
      >
        {chat.length === 0 && (
          <div style={{ 
            textAlign: "center", 
            marginTop: "80px", 
            color: "#475569",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px"
          }}>
            <div style={{
              width: "80px",
              height: "80px",
              borderRadius: "24px",
              background: "rgba(255,255,255,0.03)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <FaWhatsapp size={40} style={{ opacity: 0.2 }} />
            </div>
            <div>
              <div style={{ fontSize: "16px", fontWeight: "600", color: "#64748b", marginBottom: "4px" }}>
                {t.waitingConnection}
              </div>
              <div style={{ fontSize: "13px", color: "#475569" }}>
                {t.emptyHint}
              </div>
            </div>
          </div>
        )}

        {chat.map((msg, i) => (
          <div 
            key={i} 
            style={{ 
              display: "flex", 
              flexDirection: "column",
              alignItems: msg.role === "user" ? "flex-end" : "flex-start",
              gap: "8px",
              maxWidth: "90%",
              alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
              animation: "messageIn 0.4s ease"
            }}
          >
            {/* Avatar y mensaje */}
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
              {msg.role === "bot" && (
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: "0 4px 12px rgba(37, 211, 102, 0.3)"
                }}>
                  <Bot size={18} color="#fff" />
                </div>
              )}
              
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{
                  background: msg.role === "user" 
                    ? "linear-gradient(135deg, #22d3ee 0%, #0891b2 100%)"
                    : "rgba(255,255,255,0.08)",
                  color: msg.role === "user" ? "#000" : "#e2e8f0",
                  padding: "14px 18px",
                  borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  fontSize: "14px",
                  lineHeight: "1.6",
                  fontWeight: msg.role === "user" ? "500" : "400",
                  boxShadow: msg.role === "user" ? "0 4px 16px rgba(34, 211, 238, 0.2)" : "none",
                  maxWidth: "320px"
                }}>
                  {msg.text}
                </div>
                
                {/* Timestamp */}
                <div style={{
                  fontSize: "10px",
                  color: "#475569",
                  paddingLeft: msg.role === "bot" ? "4px" : "0",
                  paddingRight: msg.role === "user" ? "4px" : "0",
                  textAlign: msg.role === "user" ? "right" : "left"
                }}>
                  {msg.timestamp || formatTime()}
                </div>
              </div>

              {msg.role === "user" && (
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: "14px",
                  fontWeight: "700",
                  color: "#fff"
                }}>
                  {t.youLabel}
                </div>
              )}
            </div>

            {/* Opciones de respuesta rápida */}
            {msg.options && msg.role === "bot" && (
              <div style={{ 
                display: "flex", 
                flexWrap: "wrap", 
                gap: "8px", 
                marginLeft: "48px",
                animation: "fadeIn 0.5s ease 0.2s both"
              }}>
                {msg.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleOptionClick(opt)}
                    style={{
                      background: "rgba(34, 211, 238, 0.1)",
                      border: "1px solid rgba(34, 211, 238, 0.3)",
                      color: "#22d3ee",
                      padding: "10px 16px",
                      borderRadius: "24px",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "all 0.2s ease"
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = "#22d3ee";
                      e.currentTarget.style.color = "#000";
                      e.currentTarget.style.transform = "scale(1.05)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = "rgba(34, 211, 238, 0.1)";
                      e.currentTarget.style.color = "#22d3ee";
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div style={{ 
            display: "flex", 
            gap: "12px", 
            alignItems: "flex-end",
            animation: "messageIn 0.3s ease"
          }}>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(37, 211, 102, 0.3)"
            }}>
              <Bot size={18} color="#fff" />
            </div>
            <div style={{
              padding: "16px 20px",
              background: "rgba(255,255,255,0.08)",
              borderRadius: "18px 18px 18px 4px",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}>
              <div className="typing-dot" style={{ animationDelay: "0s" }} />
              <div className="typing-dot" style={{ animationDelay: "0.15s" }} />
              <div className="typing-dot" style={{ animationDelay: "0.3s" }} />
            </div>
          </div>
        )}
      </div>

      {/* Input Premium */}
      <form 
        onSubmit={handleSubmit} 
        style={{ 
          padding: "20px 24px",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          gap: "12px",
          background: "rgba(0,0,0,0.3)"
        }}
      >
        <div style={{
          flex: 1,
          position: "relative"
        }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={t.inputPlaceholder}
            style={{
              width: "100%",
              background: isFocused ? "rgba(34, 211, 238, 0.05)" : "rgba(255,255,255,0.05)",
              border: isFocused ? "2px solid rgba(34, 211, 238, 0.3)" : "2px solid rgba(255,255,255,0.1)",
              borderRadius: "16px",
              padding: "14px 20px",
              color: "#fff",
              outline: "none",
              fontSize: "14px",
              transition: "all 0.2s ease",
              boxSizing: "border-box"
            }}
          />
        </div>
        
        <button 
          type="submit" 
          disabled={!input.trim()}
          style={{
            background: input.trim() 
              ? "linear-gradient(135deg, #22d3ee 0%, #0891b2 100%)"
              : "rgba(255,255,255,0.1)",
            border: "none",
            borderRadius: "16px",
            width: "52px",
            height: "52px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: input.trim() ? "#000" : "rgba(255,255,255,0.3)",
            cursor: input.trim() ? "pointer" : "default",
            transition: "all 0.2s ease",
            boxShadow: input.trim() ? "0 4px 16px rgba(34, 211, 238, 0.3)" : "none"
          }}
        >
          <Send size={20} />
        </button>
      </form>

      <style jsx global>{`
        .typing-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22d3ee;
          animation: typingBounce 1.4s infinite ease-in-out;
        }
        
        @keyframes typingBounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes messageIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
