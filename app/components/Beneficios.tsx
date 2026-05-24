"use client";
import React from "react";
import useBotzLanguage from "@/app/start/hooks/useBotzLanguage";
import PhoneChatDemo from "./PhoneChatDemo";
import "./ManychatSections.css";

const Beneficios = () => {
  const language = useBotzLanguage("en");
  const isEn = language === "en";

  return <section id="beneficios" className="btzm-section btzm-beneficios">
    <div className="btzm-panel" style={{ marginBottom: "16px" }}>
      <div className="btzm-split">
        <div className="btzm-copy">
          <p className="btzm-kicker">{isEn ? "KEY BENEFITS" : "BENEFICIOS CLAVE"}</p>
          <h3>{isEn ? "Less manual work, more revenue" : "Menos trabajo manual, mas ingresos"}</h3>
          <p>{isEn ? "Botz turns conversations from Instagram and TikTok into predictable sales actions for your team." : "Botz convierte conversaciones de Instagram y TikTok en acciones comerciales predecibles para tu equipo."}</p>
          <ul className="btzm-list">
            <li>{isEn ? "Capture and qualify leads automatically" : "Captura y califica leads automaticamente"}</li>
            <li>{isEn ? "Activate follow-ups with zero friction" : "Activa seguimientos sin friccion"}</li>
            <li>{isEn ? "Book appointments in seconds" : "Agenda citas en segundos"}</li>
          </ul>
        </div>
        <div className="btzm-media btzm-media-benefits">
          <div className="btzm-person" />
          <div className="btzm-phone btzm-phone-benefits btzm-phone-faq">
            <div className="btzm-phone-inner btzm-phone-inner-faq">
              <div className="btzm-platforms">
                <span className="btzm-platform">Instagram</span>
                <span className="btzm-platform">TikTok</span>
              </div>
              <div className="btzm-visual-cover" />
              <PhoneChatDemo
                botAvatar="/avatars/botz-avatar.png"
                messages={isEn ? [
                  { sender: "client", text: "Hi, I want information about your services.", avatar: "/avatars/client-business.jpg" },
                  { sender: "bot", text: "Sure. Are you looking for a website, automation, or lead generation?" },
                  { sender: "client", text: "I want to automate Instagram and TikTok messages.", avatar: "/avatars/client-business.jpg" },
                  { sender: "bot", text: "Perfect. I can reply to DMs, qualify leads, and trigger follow-ups." },
                  { sender: "client", text: "What if someone is ready to buy?", avatar: "/avatars/client-business.jpg" },
                  { sender: "bot", text: "I detect high intent and send a payment link or schedule a call." },
                  { sender: "bot", text: "This lead has strong purchase intent." }
                ] : [
                  { sender: "client", text: "Hola, quiero informacion sobre tus servicios.", avatar: "/avatars/client-business.jpg" },
                  { sender: "bot", text: "Claro. Buscas pagina web, automatizacion o captacion de leads?" },
                  { sender: "client", text: "Quiero automatizar mensajes de Instagram y TikTok.", avatar: "/avatars/client-business.jpg" },
                  { sender: "bot", text: "Perfecto. Puedo responder DMs, calificar leads y activar seguimientos." },
                  { sender: "client", text: "Y si alguien esta listo para comprar?", avatar: "/avatars/client-business.jpg" },
                  { sender: "bot", text: "Lo detecto y envio link de pago o agenda una llamada." },
                  { sender: "bot", text: "Este lead tiene alta intencion de compra." }
                ]}
                actions={isEn ? ["Open profile", "Send follow-up"] : ["Abrir perfil", "Enviar seguimiento"]}
              />
              <div className="btzm-faq-step">{isEn ? "Answer FAQs" : "Responde FAQs"}</div>
            </div>
          </div>
          <div className="btzm-chat-float btzm-chat-a btzm-float-benefits-a">
            <p>{isEn ? "New qualified lead" : "Nuevo lead calificado"}</p>
            <button>{isEn ? "Open profile" : "Abrir perfil"}</button>
          </div>
          <div className="btzm-chat-float btzm-chat-b btzm-float-benefits-b">
            <p>{isEn ? "Estimated close: 72%" : "Cierre estimado: 72%"}</p>
            <button>{isEn ? "View insights" : "Ver insights"}</button>
          </div>
        </div>
      </div>
    </div>
    <div className="btzm-grid">
      <article className="btzm-card">
        <h4>{isEn ? "Automated agents 24/7" : "Agentes autonomos 24/7"}</h4>
        <p>{isEn ? "AI agents handle routine operations day and night without supervision." : "Los agentes de IA trabajan dia y noche en tareas rutinarias sin supervision."}</p>
        <span className="btzm-chip">{isEn ? "Always active" : "Siempre activos"}</span>
      </article>
      <article className="btzm-card">
        <h4>{isEn ? "NLP that understands intent" : "NLP que entiende intencion"}</h4>
        <p>{isEn ? "Natural interactions that answer, qualify and route each conversation with context." : "Interacciones naturales que responden, califican y enrutan cada conversacion con contexto."}</p>
        <span className="btzm-chip">{isEn ? "Fluid conversations" : "Conversaciones fluidas"}</span>
      </article>
      <article className="btzm-card">
        <h4>{isEn ? "Predictive analytics" : "Analitica predictiva"}</h4>
        <p>{isEn ? "Forecasts outcomes and suggests best actions from live and historical data." : "Anticipa resultados y recomienda acciones optimas con datos en vivo e historicos."}</p>
        <span className="btzm-chip">{isEn ? "Smarter decisions" : "Decisiones mas inteligentes"}</span>
      </article>
      <article className="btzm-card">
        <h4>{isEn ? "90% fewer errors" : "90% menos errores"}</h4>
        <p>{isEn ? "Standardized execution reduces human mistakes and speeds delivery 3x." : "La ejecucion estandarizada reduce errores humanos y acelera la entrega hasta 3x."}</p>
        <span className="btzm-chip">{isEn ? "Higher quality" : "Mayor calidad"}</span>
      </article>
      <article className="btzm-card">
        <h4>{isEn ? "Up to 60% lower costs" : "Hasta 60% menos costos"}</h4>
        <p>{isEn ? "Automating repetitive work lowers operating costs and frees your team." : "Automatizar tareas repetitivas reduce costos operativos y libera a tu equipo."}</p>
        <span className="btzm-chip">{isEn ? "Lean operation" : "Operacion eficiente"}</span>
      </article>
      <article className="btzm-card">
        <h4>{isEn ? "Scalable growth" : "Escalabilidad sin friccion"}</h4>
        <p>{isEn ? "Grow demand, channels and clients without multiplying workload." : "Escala demanda, canales y clientes sin multiplicar carga de trabajo."}</p>
        <span className="btzm-chip">{isEn ? "Built to scale" : "Listo para escalar"}</span>
      </article>
    </div>
  </section>
};

export default Beneficios;
