"use client";
import React, { useState } from "react";
import "./AutomatizacionN8N.css";

const steps = [
  {
    icon: "🌐",
    label: "Webhook",
    desc: "Recibe datos del sitio",
    detail: "Recibe y dispara el flujo con solicitudes HTTP desde el sitio web."
  },
  {
    icon: "📊",
    label: "Google Sheets",
    desc: "Registra la información",
    detail: "Guarda automáticamente cada entrada recibida en Google Sheets."
  },
  {
    icon: "✉️",
    label: "Gmail",
    desc: "Envía confirmación",
    detail: "Envía correos de confirmación o aviso a usuarios y equipo."
  },
  {
    icon: "🤖",
    label: "OpenAI",
    desc: "Genera respuestas",
    detail: "Genera mensajes, análisis o respuestas personalizadas usando IA."
  },
  {
    icon: "📲",
    label: "Telegram",
    desc: "Entrega al usuario",
    detail: "Envía la información o respuesta final directamente al usuario."
  }
];

const ventajas = [
  {
    icon: "⚡",
    title: "Respuesta 85% Más Rápida",
    desc: "Reduce tiempos y automatiza procesos críticos en minutos."
  },
  {
    icon: "🔌",
    title: "+300 Integraciones",
    desc: "Conecta APIs y apps como CRMs, WhatsApp, pagos, redes y más."
  },
  {
    icon: "👾",
    title: "No-Code Visual",
    desc: "Flujos visuales con lógica avanzada, ¡sin necesidad de programar!"
  },
  {
    icon: "📈",
    title: "Escalabilidad Dinámica",
    desc: "Crece automáticamente según la demanda y carga de datos."
  },
  {
    icon: "🧠",
    title: "Lógica y Condiciones",
    desc: "Soporta ramificaciones complejas y automatizaciones inteligentes."
  },
  {
    icon: "🔍",
    title: "Monitoreo en Tiempo Real",
    desc: "Observa, depura y optimiza todos tus flujos en vivo."
  }
];

// Posiciones para cada nodo, separados (ajusta según necesidad visual)
const nodePositions = [
  { x: 80, y: 80 },
  { x: 260, y: 80 },
  { x: 440, y: 80 },
  { x: 620, y: 80 },
  { x: 800, y: 80 }
];

export default function AutomatizacionN8N() {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <section style={{ margin: "60px 0 80px 0", position: "relative" }}>
      <h2 className="section-title" style={{ color: "#10b2cb" }}>
        Automatizaciones de flujos
      </h2>
      <p style={{ textAlign: "center", color: "#ccc", fontSize: "1.12em", marginBottom: 28 }}>
        Un flujo inteligente para transformar tu operación: <b>botzflow orquesta tu proceso de extremo a extremo.</b>
      </p>
      {/* === Fondo y flujo n8n === */}
      <div className="n8n-flowchart-bg" />
      <div className="n8n-flowchart-canvas">
        {/* SVG para conexiones */}
        <svg className="n8n-flowchart-svg" width="1000" height="200">
          {steps.map((_, i) =>
            i < steps.length - 1 ? (
              <path
                key={i}
                d={`
                  M${nodePositions[i].x + 70},${nodePositions[i].y}
                  C${nodePositions[i].x + 110},${nodePositions[i].y} ${nodePositions[i + 1].x - 40},${nodePositions[i + 1].y} ${nodePositions[i + 1].x},${nodePositions[i + 1].y}
                `}
                className="n8n-flowchart-connector"
              />
            ) : null
          )}
        </svg>
        {/* Nodos */}
        {steps.map((step, i) => (
          <div
            key={i}
            className="n8n-flowchart-node"
            style={{
              left: nodePositions[i].x,
              top: nodePositions[i].y,
              position: "absolute"
            }}
            onClick={() => setSelected(i)}
          >
            <div className="n8n-flowchart-node-icon">{step.icon}</div>
            <div className="n8n-flowchart-node-label">{step.label}</div>
            <div className="n8n-flowchart-node-desc">{step.desc}</div>
          </div>
        ))}
      </div>
      {/* === Fin flujo n8n === */}
      <div style={{ margin: "70px auto 0", maxWidth: 950 }}>
        <h3 style={{ color: "#10b2cb", marginBottom: 24, fontWeight: 600, textAlign: "center", fontSize: "1.28em" }}>
          Ventajas Clave de Automatizar con botzflow
        </h3>
        <div className="n8n-ventajas-grid">
          {ventajas.map((v, i) => (
            <div className="n8n-ventaja-card" key={i}>
              <span className="n8n-ventaja-icon">{v.icon}</span>
              <div className="n8n-ventaja-title">{v.title}</div>
              <div className="n8n-ventaja-desc">{v.desc}</div>
            </div>
          ))}
        </div>
      </div>
      {/* Modal explicativo */}
      {selected !== null && (
        <div className="n8n-modal" onClick={() => setSelected(null)}>
          <div className="n8n-modal-content" onClick={e => e.stopPropagation()}>
            <button className="n8n-modal-close" onClick={() => setSelected(null)} title="Cerrar">×</button>
            <div style={{ fontSize: "2.5em", marginBottom: ".2em" }}>{steps[selected].icon}</div>
            <h3 style={{ color: "#10b2cb", marginTop: 0 }}>{steps[selected].label}</h3>
            <div style={{ fontSize: "1.13em", margin: "1em 0" }}>{steps[selected].detail}</div>
          </div>
        </div>
      )}
    </section>
  );
}

