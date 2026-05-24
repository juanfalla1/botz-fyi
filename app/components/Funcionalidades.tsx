"use client";
import React from "react";
import useBotzLanguage from "@/app/start/hooks/useBotzLanguage";
import PhoneChatDemo from "./PhoneChatDemo";
import "./ManychatSections.css";

export default function Funcionalidades() {
  const language = useBotzLanguage("en");
  const isEn = language === "en";

  return (
    <section id="funcionalidades" className="btzm-section btzm-funcionalidades">
      <div className="btzm-panel">
        <div className="btzm-split">
          <div className="btzm-copy">
            <p className="btzm-kicker">{isEn ? "AUTOMATICALLY" : "AUTOMATICAMENTE"}</p>
            <h3>{isEn ? "Turn messages into customers" : "Convierte mensajes en clientes"}</h3>
            <ul className="btzm-list">
              <li>{isEn ? "Reply to DMs" : "Responde DMs"}</li>
              <li>{isEn ? "Qualify leads" : "Califica leads"}</li>
              <li>{isEn ? "Schedule calls" : "Agenda llamadas"}</li>
              <li>{isEn ? "Send payment links" : "Envia links de pago"}</li>
            </ul>
            <p>{isEn ? "When someone asks for pricing, Botz replies, qualifies intent and closes the next action automatically." : "Cuando alguien pregunta precio, Botz responde, califica la intencion y cierra la siguiente accion automaticamente."}</p>
            <div className="btzm-grid">
              <article className="btzm-card">
                <h4>{isEn ? "Autonomous Agents" : "Agentes Autonomos"}</h4>
                <p>{isEn ? "Run full sales and support flows 24/7 with business rules." : "Ejecutan flujos completos de ventas y soporte 24/7 con reglas de negocio."}</p>
              </article>
              <article className="btzm-card">
                <h4>{isEn ? "NLP Processing" : "Procesamiento NLP"}</h4>
                <p>{isEn ? "Understand intent, urgency and context to answer naturally." : "Entienden intencion, urgencia y contexto para responder de forma natural."}</p>
              </article>
              <article className="btzm-card">
                <h4>{isEn ? "Predictive Analytics" : "Analitica Predictiva"}</h4>
                <p>{isEn ? "Anticipate outcomes and trigger the best next conversion action." : "Anticipan resultados y activan la mejor siguiente accion de conversion."}</p>
              </article>
            </div>
          </div>
          <div className="btzm-media btzm-media-func">
            <div className="btzm-person" />
            <div className="btzm-phone btzm-phone-func btzm-phone-dm">
              <div className="btzm-phone-inner btzm-phone-inner-dm">
                <div className="btzm-platforms">
                  <span className="btzm-platform">Instagram</span>
                  <span className="btzm-platform">TikTok</span>
                </div>
                <p className="btzm-thread-title">{isEn ? "New DMs" : "Nuevos DMs"}</p>
                <PhoneChatDemo
                  botAvatar="/avatars/botz-avatar.png"
                  messages={isEn ? [
                    { sender: "client", text: "Hi, I saw your ad. How much does business automation cost?", avatar: "/avatars/client-salon.jpg" },
                    { sender: "bot", text: "Great question. I can help you. What type of business do you have?" },
                    { sender: "client", text: "I run a beauty salon.", avatar: "/avatars/client-salon.jpg" },
                    { sender: "bot", text: "Perfect. We can automate bookings, WhatsApp replies, and customer follow-up." },
                    { sender: "client", text: "Can I also receive leads in my CRM?", avatar: "/avatars/client-salon.jpg" },
                    { sender: "bot", text: "Yes. Every lead is scored and sent automatically to your CRM." },
                    { sender: "bot", text: "Would you like to book a call?" },
                    { sender: "client", text: "Today at 4:00 PM works for me.", avatar: "/avatars/client-salon.jpg" },
                    { sender: "bot", text: "Done. Appointment confirmed and lead saved." }
                  ] : [
                    { sender: "client", text: "Hola, vi tu anuncio. Cuanto cuesta automatizar mi negocio?", avatar: "/avatars/client-salon.jpg" },
                    { sender: "bot", text: "Claro, puedo ayudarte. Que tipo de negocio tienes?" },
                    { sender: "client", text: "Tengo un salon de belleza.", avatar: "/avatars/client-salon.jpg" },
                    { sender: "bot", text: "Perfecto. Podemos automatizar reservas, respuestas por WhatsApp y seguimiento de clientes." },
                    { sender: "client", text: "Tambien puedo recibir leads en mi CRM?", avatar: "/avatars/client-salon.jpg" },
                    { sender: "bot", text: "Si. Cada lead se califica y se envia automaticamente al CRM." },
                    { sender: "bot", text: "Quieres agendar una llamada?" },
                    { sender: "client", text: "Hoy 4:00 PM.", avatar: "/avatars/client-salon.jpg" },
                    { sender: "bot", text: "Listo. Cita confirmada y lead guardado." }
                  ]}
                  actions={isEn ? ["Today 4:00 PM", "Tomorrow 10:00 AM"] : ["Hoy 4:00 PM", "Manana 10:00 AM"]}
                />
              </div>
            </div>
            <div className="btzm-chat-float btzm-chat-a btzm-float-func-a">
              <p>{isEn ? "Lead sent to CRM" : "Lead enviado al CRM"}</p>
              <button>{isEn ? "Open lead" : "Ver lead"}</button>
            </div>
            <div className="btzm-chat-float btzm-chat-b btzm-float-func-b">
              <p>{isEn ? "Appointment confirmed" : "Cita confirmada"}</p>
              <button>{isEn ? "View details" : "Ver detalles"}</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
