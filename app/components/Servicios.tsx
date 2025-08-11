"use client";
import React from "react";

export default function Servicios() {
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
        Inteligencia Artificial, Automatización y Productividad Empresarial
      </h2>
      <p style={{
        textAlign: "center",
        color: "#c9d4ea",
        fontSize: "1.22em",
        marginBottom: 34
      }}>
        Con <b>Botz</b>, transforma digitalmente tu organización. Integra <b>inteligencia artificial</b>, automatización y gestión ágil para hacer más con menos, acelerar la innovación y diferenciarte en el mercado.
      </p>
      <h3 style={{
        color: "#10b2cb",
        fontWeight: 700,
        fontSize: "1.28em",
        marginBottom: 22
      }}>
        ¿Qué hacemos diferente?
      </h3>
      <ul style={{ listStyle: "none", padding: 0, marginBottom: 35 }}>
        <li style={{ display: "flex", alignItems: "flex-start", marginBottom: 16 }}>
          <span style={{ fontSize: "1.8em", marginRight: 15 }}>🤖</span>
          <div>
            <b>Automatización avanzada de procesos</b><br />
            Flujos inteligentes con n8n, integración de plataformas, monitoreo en tiempo real y lógica condicional personalizada.
          </div>
        </li>
        <li style={{ display: "flex", alignItems: "flex-start", marginBottom: 16 }}>
          <span style={{ fontSize: "1.8em", marginRight: 15 }}>🧠</span>
          <div>
            <b>Inteligencia Artificial aplicada a negocios</b><br />
            Chatbots, generación automática de respuestas, análisis predictivo, procesamiento de datos y personalización con OpenAI.
          </div>
        </li>
        <li style={{ display: "flex", alignItems: "flex-start", marginBottom: 16 }}>
          <span style={{ fontSize: "1.8em", marginRight: 15 }}>🛒</span>
          <div>
            <b>Desarrollo de soluciones web y ecommerce</b><br />
            Tiendas online inteligentes, integración de pasarelas de pago, conexiones con WhatsApp, Telegram, CRM y más.
          </div>
        </li>
        <li style={{ display: "flex", alignItems: "flex-start", marginBottom: 16 }}>
          <span style={{ fontSize: "1.8em", marginRight: 15 }}>📈</span>
          <div>
            <b>Optimización y gestión de proyectos digitales</b><br />
            Implementación de metodologías ágiles, asesoría en Scrum, monitoreo de KPIs, mentoría y liderazgo digital.
          </div>
        </li>
        <li style={{ display: "flex", alignItems: "flex-start", marginBottom: 16 }}>
          <span style={{ fontSize: "1.8em", marginRight: 15 }}>📲</span>
          <div>
            <b>Integraciones multi-plataforma</b><br />
            WhatsApp, Telegram, Google Sheets, Gmail, API REST, y más de 300 aplicaciones conectadas en tiempo real.
          </div>
        </li>
        <li style={{ display: "flex", alignItems: "flex-start", marginBottom: 16 }}>
          <span style={{ fontSize: "1.8em", marginRight: 15 }}>👨‍💻</span>
          <div>
            <b>Mentoría, capacitación y acompañamiento</b><br />
            Formación en IA, automatización, gestión ágil y cultura digital para equipos de alto desempeño.
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
          🚀 El futuro de tu empresa empieza hoy
        </h4>
        <p style={{
          color: "#c5e9e9",
          textAlign: "center",
          fontSize: "1.13em",
          marginBottom: 0
        }}>
          Impulsa la eficiencia, reduce errores, automatiza tareas repetitivas y toma decisiones basadas en datos con soluciones inteligentes creadas a la medida de tu organización. <br />
          Con <b>Botz</b>, la inteligencia artificial y la automatización son accesibles para tu equipo, sin importar el tamaño de tu empresa.
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
          Escríbenos a info@botz.fyi
        </a>
      </div>
    </section>
  );
}
