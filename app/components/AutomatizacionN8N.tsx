"use client";
import React, { useState, useEffect } from "react";
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
  { icon: "⚡", title: "Respuesta 85% Más Rápida", desc: "Reduce tiempos y automatiza procesos críticos en minutos." },
  { icon: "🔌", title: "+300 Integraciones", desc: "Conecta APIs y apps como CRMs, WhatsApp, pagos, redes y más." },
  { icon: "👾", title: "No-Code Visual", desc: "Flujos visuales con lógica avanzada, ¡sin necesidad de programar!" },
  { icon: "📈", title: "Escalabilidad Dinámica", desc: "Crece automáticamente según la demanda y carga de datos." },
  { icon: "🧠", title: "Lógica y Condiciones", desc: "Soporta ramificaciones complejas y automatizaciones inteligentes." },
  { icon: "🔍", title: "Monitoreo en Tiempo Real", desc: "Observa, depura y optimiza todos tus flujos en vivo." }
];

// ✅ Layout responsivo para AutomatizacionN8N
const getN8nLayout = (width: number) => {
  if (width <= 650) {
    // Móvil: tarjetas horizontales
    return {
      containerWidth: width,
      containerHeight: steps.length * 140 + 40,
      showConnections: false,
      isMobile: true,
      nodePositions: [] // No se usan en móvil
    };
  } else if (width <= 900) {
    // Tablet: horizontal compacto
    const containerWidth = Math.min(width, 800);
    const nodeWidth = 190;
    const nodeCenter = nodeWidth / 2;
    const totalNodesWidth = steps.length * nodeWidth;
    const availableSpace = containerWidth - totalNodesWidth;
    const spacing = availableSpace / (steps.length - 1);
    const startX = (containerWidth - totalNodesWidth - (spacing * (steps.length - 1))) / 2;
    
    return {
      containerWidth: containerWidth,
      containerHeight: 200,
      showConnections: true,
      isMobile: false,
      nodeCenter,
      nodePositions: steps.map((_, i) => ({ 
        x: startX + i * (nodeWidth + spacing), 
        y: 80 
      }))
    };
  } else {
    // Escritorio: fila horizontal con conexiones SVG
    const containerWidth = Math.min(width, 1320);
    const nodeWidth = 220;
    const nodeCenter = nodeWidth / 2;
    const totalNodesWidth = steps.length * nodeWidth;
    const availableSpace = containerWidth - totalNodesWidth;
    const spacing = availableSpace / (steps.length - 1);
    const startX = (containerWidth - totalNodesWidth - (spacing * (steps.length - 1))) / 2;
    
    return {
      containerWidth: containerWidth,
      containerHeight: 220,
      showConnections: true,
      isMobile: false,
      nodeCenter,
      nodePositions: steps.map((_, i) => ({ 
        x: startX + i * (nodeWidth + spacing), 
        y: 90 
      }))
    };
  }
};

export default function AutomatizacionN8N() {
  const [selected, setSelected] = useState<number | null>(null);
  const [layout, setLayout] = useState(() => getN8nLayout(1000));

  useEffect(() => {
    const handleResize = () => {
      const container = document.querySelector(".n8n-flowchart-canvas")?.parentElement;
      if (container) {
          const width = Math.min(container.clientWidth - 20, 1320);
          setLayout(getN8nLayout(width));
        }
      };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <section style={{ margin: "60px 0 80px", position: "relative", padding: "0 clamp(12px, 4vw, 40px)", width: "100%", maxWidth: "1400px", boxSizing: "border-box" }}>
      <h2 className="section-title" style={{ color: "#22d3ee", fontSize: "clamp(1.8em, 4vw, 2.8em)", textAlign: "center" }}>
      botzflow, Automatización de Flujos de Procesos
      </h2>
      <p style={{ textAlign: "center", color: "#e2e8f0", fontSize: "clamp(1.2em, 2.5vw, 1.4em)", marginBottom: 40, maxWidth: "800px", margin: "0 auto 40px" }}>
        Un flujo inteligente para transformar tu operación: <b>botzflow orquesta tu proceso de extremo a extremo.</b>
      </p>

      {/* === Fondo y flujo n8n === */}
      {!layout.isMobile && <div className="n8n-flowchart-bg" />}
      <div
        className="n8n-flowchart-canvas"
        style={{
          width: "100%",
          maxWidth: "1320px",
          height: layout.containerHeight,
          margin: layout.isMobile ? "0 0 12px 0" : "0 auto 12px auto",
          display: "flex",
          justifyContent: "center",
          alignItems: "center"
        }}
      >
        {/* SVG conexiones */}
        {layout.showConnections && !layout.isMobile && (
          <svg className="n8n-flowchart-svg" width="100%" height="100%" viewBox={`0 0 ${layout.containerWidth} ${layout.containerHeight}`} preserveAspectRatio="xMidYMid meet">
            {steps.map((_, i) => {
              const center = layout.nodeCenter ?? 60;
              return (
              i < steps.length - 1 ? (
                <path
                  key={i}
                  d={`M${layout.nodePositions[i].x + center},${layout.nodePositions[i].y + center}
                      C${layout.nodePositions[i].x + center + 35},${layout.nodePositions[i].y + center} ${layout.nodePositions[i + 1].x + center - 35},${layout.nodePositions[i + 1].y + center} ${layout.nodePositions[i + 1].x + center},${layout.nodePositions[i + 1].y + center}`}
                  className="n8n-flowchart-connector"
                />
              ) : null
            );})}
          </svg>
        )}

        {/* Nodos */}
        {steps.map((step, i) => {
          let nodeStyle: React.CSSProperties;

          if (layout.isMobile) {
            nodeStyle = {
              position: "static",
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              textAlign: "left",
              width: "100%",
              maxWidth: "340px",
              height: "auto",
              margin: "0 0 16px 0",
              padding: "16px",
              borderRadius: "16px",
              gap: "16px"
            };
          } else {
            nodeStyle = {
              left: layout.nodePositions[i].x,
              top: layout.nodePositions[i].y,
              position: "absolute"
            };
          }

          return (
            <div key={i} className="n8n-flowchart-node" style={nodeStyle} onClick={() => setSelected(i)}>
              <div
                className="n8n-flowchart-node-icon"
                style={{
                  flexShrink: 0,
                  width: layout.isMobile ? "60px" : "52px",
                  height: layout.isMobile ? "60px" : "52px",
                  fontSize: layout.isMobile ? "2em" : "2.4em",
                  marginBottom: layout.isMobile ? 0 : "6px"
                }}
              >
                {step.icon}
              </div>
              <div className="n8n-flowchart-node-content">
                <div className="n8n-flowchart-node-label">{step.label}</div>
                <div className="n8n-flowchart-node-desc">{step.desc}</div>
                {layout.isMobile && (
                  <div className="n8n-flowchart-node-detail" style={{ fontSize: "0.85em", color: "#b8b8b8", marginTop: "4px", lineHeight: 1.3 }}>
                    {step.detail}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* === Ventajas === */}
      <div style={{ margin: "88px auto 0", maxWidth: "1400px", width: "100%", padding: 0, boxSizing: "border-box" }}>
        <h3 style={{ color: "#22d3ee", marginBottom: 24, fontWeight: 600, textAlign: "center", fontSize: "clamp(1.1em, 4.5vw, 1.5em)", lineHeight: 1.25, padding: "0 8px", overflowWrap: "anywhere" }}>
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

      {/* === Modal explicativo === */}
      {selected !== null && (
        <div className="n8n-modal" onClick={() => setSelected(null)}>
          <div className="n8n-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="n8n-modal-close" onClick={() => setSelected(null)} title="Cerrar">
              ×
            </button>
            <div style={{ fontSize: "2.5em", marginBottom: ".2em" }}>{steps[selected].icon}</div>
            <h3 style={{ color: "#10b2cb", marginTop: 0 }}>{steps[selected].label}</h3>
            <div style={{ fontSize: "1.13em", margin: "1em 0" }}>{steps[selected].detail}</div>
          </div>
        </div>
      )}
    </section>
  );
}
