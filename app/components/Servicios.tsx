"use client";
import React from "react";
import useBotzLanguage from "@/app/start/hooks/useBotzLanguage";

export default function Servicios() {
  const language = useBotzLanguage("en");
  const isEn = language === "en";

  return (
    <section style={{
      margin: "50px 0",
      background: "#181f2e",
      borderRadius: "18px",
      boxShadow: "0 8px 32px #10b2cb11",
      padding: "44px 28px",
      maxWidth: 920,
      marginLeft: "auto",
      marginRight: "auto",
      color: "#e4e8ee"
    }}>
      <h2 style={{
        color: "#16e0c7",
        fontSize: "2.35em",
        fontWeight: 900,
        marginBottom: 10,
        textAlign: "center",
        letterSpacing: "-0.01em"
      }}>
        {isEn ? "Artificial Intelligence, Automation and Business Productivity" : "Inteligencia Artificial, Automatizacion y Productividad Empresarial"}
      </h2>
      <p style={{
        textAlign: "center",
        color: "#c9d4ea",
        fontSize: "1.22em",
        marginBottom: 34
      }}>
        {isEn ? (
          <>With <b>Botz</b>, digitally transform your organization. Integrate <b>artificial intelligence</b>, automation and agile operations to do more with less, accelerate innovation and stand out in your market.</>
        ) : (
          <>Con <b>Botz</b>, transforma digitalmente tu organizacion. Integra <b>inteligencia artificial</b>, automatizacion y gestion agil para hacer mas con menos, acelerar la innovacion y diferenciarte en el mercado.</>
        )}
      </p>
      <h3 style={{
        color: "#10b2cb",
        fontWeight: 700,
        fontSize: "1.28em",
        marginBottom: 22
      }}>
        {isEn ? "What makes us different?" : "Que hacemos diferente?"}
      </h3>
      <ul style={{ listStyle: "none", padding: 0, marginBottom: 35 }}>
        <li style={{ display: "flex", alignItems: "flex-start", marginBottom: 16 }}>
          <span style={{ fontSize: "1.8em", marginRight: 15 }}>🤖</span>
          <div>
            <b>{isEn ? "Advanced process automation" : "Automatizacion avanzada de procesos"}</b><br />
            {isEn ? "Intelligent n8n flows, platform integrations, real-time monitoring and custom conditional logic." : "Flujos inteligentes con n8n, integracion de plataformas, monitoreo en tiempo real y logica condicional personalizada."}
          </div>
        </li>
        <li style={{ display: "flex", alignItems: "flex-start", marginBottom: 16 }}>
          <span style={{ fontSize: "1.8em", marginRight: 15 }}>🧠</span>
          <div>
            <b>{isEn ? "Business-focused AI" : "Inteligencia Artificial aplicada a negocios"}</b><br />
            {isEn ? "Chatbots, automated responses, predictive analytics, data processing and personalization with OpenAI." : "Chatbots, generacion automatica de respuestas, analisis predictivo, procesamiento de datos y personalizacion con OpenAI."}
          </div>
        </li>
        <li style={{ display: "flex", alignItems: "flex-start", marginBottom: 16 }}>
          <span style={{ fontSize: "1.8em", marginRight: 15 }}>🛒</span>
          <div>
            <b>{isEn ? "Web and e-commerce solutions" : "Desarrollo de soluciones web y ecommerce"}</b><br />
            {isEn ? "Smart online stores, payment gateway integration, and connections with WhatsApp, Telegram, CRM and more." : "Tiendas online inteligentes, integracion de pasarelas de pago, conexiones con WhatsApp, Telegram, CRM y mas."}
          </div>
        </li>
        <li style={{ display: "flex", alignItems: "flex-start", marginBottom: 16 }}>
          <span style={{ fontSize: "1.8em", marginRight: 15 }}>📈</span>
          <div>
            <b>{isEn ? "Digital project optimization and management" : "Optimizacion y gestion de proyectos digitales"}</b><br />
            {isEn ? "Agile implementation, Scrum advisory, KPI monitoring, mentoring and digital leadership." : "Implementacion de metodologias agiles, asesoria en Scrum, monitoreo de KPIs, mentoria y liderazgo digital."}
          </div>
        </li>
        <li style={{ display: "flex", alignItems: "flex-start", marginBottom: 16 }}>
          <span style={{ fontSize: "1.8em", marginRight: 15 }}>📲</span>
          <div>
            <b>{isEn ? "Multi-platform integrations" : "Integraciones multi-plataforma"}</b><br />
            {isEn ? "WhatsApp, Telegram, Google Sheets, Gmail, REST APIs and 300+ apps connected in real time." : "WhatsApp, Telegram, Google Sheets, Gmail, API REST y mas de 300 aplicaciones conectadas en tiempo real."}
          </div>
        </li>
        <li style={{ display: "flex", alignItems: "flex-start", marginBottom: 16 }}>
          <span style={{ fontSize: "1.8em", marginRight: 15 }}>👨‍💻</span>
          <div>
            <b>{isEn ? "Mentoring and enablement" : "Mentoria, capacitacion y acompanamiento"}</b><br />
            {isEn ? "Training in AI, automation, agile management and digital culture for high-performance teams." : "Formacion en IA, automatizacion, gestion agil y cultura digital para equipos de alto desempeno."}
          </div>
        </li>
      </ul>
      <div style={{
        margin: "38px auto 0",
        maxWidth: 650,
        background: "#212a3c",
        borderRadius: "12px",
        padding: "32px 22px"
      }}>
        <h4 style={{
          color: "#00fff2",
          fontWeight: 800,
          fontSize: "1.18em",
          textAlign: "center",
          marginBottom: 12,
          letterSpacing: "-.01em"
        }}>
          {isEn ? "🚀 Your companys future starts today" : "🚀 El futuro de tu empresa empieza hoy"}
        </h4>
        <p style={{
          color: "#c5e9e9",
          textAlign: "center",
          fontSize: "1.13em",
          marginBottom: 0
        }}>
          {isEn ? (
            <>Boost efficiency, reduce errors, automate repetitive tasks and make data-driven decisions with intelligent solutions tailored to your organization. <br />With <b>Botz</b>, AI and automation are accessible for your team, no matter your company size.</>
          ) : (
            <>Impulsa la eficiencia, reduce errores, automatiza tareas repetitivas y toma decisiones basadas en datos con soluciones inteligentes creadas a la medida de tu organizacion. <br />Con <b>Botz</b>, la inteligencia artificial y la automatizacion son accesibles para tu equipo, sin importar el tamano de tu empresa.</>
          )}
        </p>
      </div>
      <div style={{
        marginTop: 35,
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
      }}>
        <a
          href="mailto:info@botz.fyi"
          style={{
            background: "linear-gradient(90deg, #16e0c7 60%, #10b2cb 100%)",
            color: "#181f2e",
            fontWeight: 700,
            fontSize: "1.15em",
            borderRadius: "8px",
            padding: "15px 35px",
            textDecoration: "none",
            boxShadow: "0 2px 16px #10b2cb33",
            marginBottom: 0,
            transition: "background .18s"
          }}
        >
          {isEn ? "Contact us at info@botz.fyi" : "Escribenos a info@botz.fyi"}
        </a>
      </div>
    </section>
  );
}
