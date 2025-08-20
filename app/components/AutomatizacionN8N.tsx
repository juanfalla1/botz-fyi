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

// ✅ Layout responsivo para AutomatizacionN8N
const getN8nLayout = (width: number) => {
  if (width <= 650) {
    // Móvil: Layout vertical
    return {
      containerWidth: width,
      containerHeight: steps.length * 140 + 40,
      showConnections: false,
      isMobile: true,
      nodePositions: [] // No usaremos posiciones en móvil
    };
  } else if (width <= 900) {
    // Tablet: Layout horizontal más compacto
    const nodeSpacing = (width - 160) / (steps.length - 1);
    return {
      containerWidth: width,
      containerHeight: 200,
      showConnections: true,
      isMobile: false,
      nodePositions: steps.map((_, i) => ({
        x: 80 + i * nodeSpacing,
        y: 80
      }))
    };
  } else {
    // Desktop: Layout original
    return {
      containerWidth: 1000,
      containerHeight: 200,
      showConnections: true,
      isMobile: false,
      nodePositions: [
        { x: 80, y: 80 },
        { x: 260, y: 80 },
        { x: 440, y: 80 },
        { x: 620, y: 80 },
        { x: 800, y: 80 }
      ]
    };
  }
};

export default function AutomatizacionN8N() {
  const [selected, setSelected] = useState<number | null>(null);
  const [layout, setLayout] = useState(() => getN8nLayout(1000));

  // ✅ Listener para redimensionamiento
  useEffect(() => {
    const handleResize = () => {
      const container = document.querySelector('.n8n-flowchart-canvas')?.parentElement;
      if (container) {
        const width = Math.min(container.clientWidth - 40, 1000);
        setLayout(getN8nLayout(width));
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <section style={{ margin: "60px 0 80px 0", position: "relative", padding: "0 1rem" }}>
      <h2 className="section-title" style={{ 
        color: "#10b2cb",
        fontSize: "clamp(1.5em, 4vw, 2.5em)"
      }}>
        Automatizaciones de flujos
      </h2>
      <p style={{ 
        textAlign: "center", 
        color: "#ccc", 
        fontSize: "clamp(1em, 2.5vw, 1.12em)", 
        marginBottom: 28,
        maxWidth: "min(700px, 95vw)",
        margin: "0 auto 28px"
      }}>
        Un flujo inteligente para transformar tu operación: <b>botzflow orquesta tu proceso de extremo a extremo.</b>
      </p>
      {/* === Fondo y flujo n8n === */}
      {!layout.isMobile && <div className="n8n-flowchart-bg" />}
      <div 
        className="n8n-flowchart-canvas"
        style={{
          width: "min(1000px, 98vw)",
          height: layout.containerHeight,
          margin: "0 auto 12px auto"
        }}
      >
        {/* SVG para conexiones - Solo mostrar en desktop y tablet */}
        {layout.showConnections && !layout.isMobile && (
          <svg 
            className="n8n-flowchart-svg" 
            width="100%" 
            height="100%"
            viewBox={`0 0 ${layout.containerWidth} ${layout.containerHeight}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {steps.map((_, i) =>
              i < steps.length - 1 ? (
                <path
                  key={i}
                  d={`
                    M${layout.nodePositions[i].x + 60},${layout.nodePositions[i].y + 60}
                    C${layout.nodePositions[i].x + 100},${layout.nodePositions[i].y + 60} ${layout.nodePositions[i + 1].x + 20},${layout.nodePositions[i + 1].y + 60} ${layout.nodePositions[i + 1].x + 60},${layout.nodePositions[i + 1].y + 60}
                  `}
                  className="n8n-flowchart-connector"
                />
              ) : null
            )}
          </svg>
        )}
        {/* Nodos */}
        {steps.map((step, i) => {
          let nodeStyle: React.CSSProperties;
          
          if (layout.isMobile) {
            // Layout vertical para móvil
            nodeStyle = {
              position: "static",
              display: "flex",
              alignItems: "center",
              textAlign: "left",
              width: "min(340px, 90vw)",
              height: "auto",
              margin: "0 auto 16px auto",
              padding: "16px",
              borderRadius: "16px",
              gap: "16px"
            };
          } else {
            // Layout horizontal para desktop/tablet
            nodeStyle = {
              left: layout.nodePositions[i].x,
              top: layout.nodePositions[i].y,
              position: "absolute"
            };
          }
          
          return (
            <div
              key={i}
              className="n8n-flowchart-node"
              style={nodeStyle}
              onClick={() => setSelected(i)}
            >
              <div className="n8n-flowchart-node-icon" style={{
                flexShrink: 0,
                width: layout.isMobile ? "60px" : "52px",
                height: layout.isMobile ? "60px" : "52px",
                fontSize: layout.isMobile ? "2em" : "2.4em",
                marginBottom: layout.isMobile ? 0 : "6px"
              }}>
                {step.icon}
              </div>
              <div className="n8n-flowchart-node-content">
                <div className="n8n-flowchart-node-label">{step.label}</div>
                <div className="n8n-flowchart-node-desc">{step.desc}</div>
                {layout.isMobile && (
                  <div className="n8n-flowchart-node-detail" style={{
                    fontSize: "0.85em",
                    color: "#b8b8b8",
                    marginTop: "4px",
                    lineHeight: 1.3
                  }}>
                    {step.detail}
                  </div>
                )}
              </div>
            </div>
          );
        })}
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

