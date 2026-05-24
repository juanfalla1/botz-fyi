"use client";
import React from "react";
import useBotzLanguage from "@/app/start/hooks/useBotzLanguage";
import PhoneChatDemo from "./PhoneChatDemo";
import "./ManychatSections.css";

const Vision = () => {
  const language = useBotzLanguage("en");
  const isEn = language === "en";

  return <section id="vision" className="btzm-section btzm-vision">
    <div className="btzm-panel">
      <div className="btzm-split">
        <div className="btzm-copy">
          <p className="btzm-kicker">{isEn ? "CAPABILITY OVERVIEW" : "VISION GENERAL DE CAPACIDADES"}</p>
          <h3>{isEn ? "Your AI growth engine" : "Tu motor de crecimiento con IA"}</h3>
          <p>{isEn ? "From first message to closed deal, Botz orchestrates every touchpoint with commercial context." : "Desde el primer mensaje hasta el cierre, Botz orquesta cada punto de contacto con contexto comercial."}</p>
          <div className="btzm-grid">
            <article className="btzm-card">
              <h4>{isEn ? "Smart routing" : "Enrutamiento inteligente"}</h4>
              <p>{isEn ? "Prioritizes high-intent conversations in real time." : "Prioriza conversaciones de alta intencion en tiempo real."}</p>
            </article>
            <article className="btzm-card">
              <h4>{isEn ? "Conversation memory" : "Memoria conversacional"}</h4>
              <p>{isEn ? "Remembers context to keep replies relevant and personal." : "Recuerda contexto para respuestas relevantes y personalizadas."}</p>
            </article>
            <article className="btzm-card">
              <h4>{isEn ? "Conversion actions" : "Acciones de conversion"}</h4>
              <p>{isEn ? "Triggers links, reminders and handoffs at the right moment." : "Activa links, recordatorios y handoffs en el momento exacto."}</p>
            </article>
            <article className="btzm-card">
              <h4>{isEn ? "Revenue visibility" : "Visibilidad de ingresos"}</h4>
              <p>{isEn ? "Tracks each flow impact with clear and useful analytics." : "Mide el impacto de cada flujo con analitica clara y accionable."}</p>
            </article>
          </div>
        </div>
        <div className="btzm-media btzm-media-vision">
          <div className="btzm-person" />
          <div className="btzm-phone btzm-phone-vision btzm-phone-story">
            <div className="btzm-phone-inner btzm-phone-inner-story">
              <div className="btzm-platforms">
                <span className="btzm-platform">Instagram</span>
                <span className="btzm-platform">TikTok</span>
              </div>
              <p className="btzm-thread-title">{isEn ? "Replied to your story" : "Respondio a tu historia"}</p>
              <div className="btzm-story-card" />
              <PhoneChatDemo
                botAvatar="/avatars/botz-avatar.png"
                messages={isEn ? [
                  { sender: "client", text: "Someone replied to your story.", avatar: "/avatars/client-growth.jpg" },
                  { sender: "client", text: "I'm interested in automating my sales.", avatar: "/avatars/client-growth.jpg" },
                  { sender: "bot", text: "High intent detected. I recommend scheduling a demo." },
                  { sender: "bot", text: "I can also activate reminders and store conversation context." },
                  { sender: "client", text: "Yes, I want a demo.", avatar: "/avatars/client-growth.jpg" },
                  { sender: "bot", text: "Suggested demo: tomorrow at 11:00 AM." },
                  { sender: "bot", text: "Flow updated with +3 new opportunities." }
                ] : [
                  { sender: "client", text: "Respondio a tu historia.", avatar: "/avatars/client-growth.jpg" },
                  { sender: "client", text: "Me interesa automatizar mis ventas.", avatar: "/avatars/client-growth.jpg" },
                  { sender: "bot", text: "Detecte intencion alta. Recomiendo agendar demo." },
                  { sender: "bot", text: "Tambien puedo activar recordatorio y guardar contexto." },
                  { sender: "client", text: "Si, quiero una demo.", avatar: "/avatars/client-growth.jpg" },
                  { sender: "bot", text: "Demo sugerida: manana 11:00 AM." },
                  { sender: "bot", text: "Flujo actualizado con +3 oportunidades nuevas." }
                ]}
                actions={isEn ? ["Run", "Open panel", "Schedule 6:00"] : ["Ejecutar", "Abrir panel", "Programar 6:00"]}
              />
              <div className="btzm-story-step">{isEn ? "Auto-reply on every story" : "Auto respuesta en historias"}</div>
            </div>
          </div>
          <div className="btzm-chat-float btzm-chat-a btzm-float-vision-a">
            <p>{isEn ? "Lead score: 92. Best action: schedule demo." : "Score del lead: 92. Mejor accion: agendar demo."}</p>
            <button>{isEn ? "Run action" : "Ejecutar"}</button>
          </div>
          <div className="btzm-chat-float btzm-chat-b btzm-float-vision-b">
            <p>{isEn ? "Revenue flow updated. +3 opportunities." : "Flujo comercial actualizado. +3 oportunidades."}</p>
            <button>{isEn ? "Open dashboard" : "Abrir panel"}</button>
          </div>
        </div>
      </div>
    </div>
  </section>
};

export default Vision;
