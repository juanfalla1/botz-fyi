"use client";
import React, { useState, useEffect } from "react";
import "./FlujoVisual.css";
import useBotzLanguage from "@/app/start/hooks/useBotzLanguage";

const nodesEn = [
  { id: "percepcion", label: "Perception", desc: "Omnichannel input", detail: "Data input from forms and messaging channels.", icon: "👁️" },
  { id: "memoria", label: "Memory", desc: "Data lookup", detail: "Queries sources like Google Sheets and databases.", icon: "💾" },
  { id: "nucleo", label: "Cognitive Core", desc: "Central intelligence", detail: "Analysis and decision-making powered by OpenAI.", icon: "🧠" },
  { id: "procesamiento", label: "Processing", desc: "Automation", detail: "Context evaluation and data-driven logic.", icon: "⚙️" },
  { id: "accion", label: "Action", desc: "Automated response", detail: "Automated response delivered to the customer.", icon: "⚡" }
];

const nodesEs = [
  { id: "percepcion", label: "Percepcion", desc: "Entrada omnicanal", detail: "Entrada de datos desde formularios o mensajeria.", icon: "👁️" },
  { id: "memoria", label: "Memoria", desc: "Consulta de datos", detail: "Consulta fuentes como Google Sheets y bases de datos.", icon: "💾" },
  { id: "nucleo", label: "Nucleo Cognitivo", desc: "Inteligencia central", detail: "Analisis y toma de decisiones usando OpenAI.", icon: "🧠" },
  { id: "procesamiento", label: "Procesamiento", desc: "Automatizacion", detail: "Evaluacion contextual y logica basada en datos.", icon: "⚙️" },
  { id: "accion", label: "Accion", desc: "Respuesta automatica", detail: "Respuesta automatica enviada al cliente.", icon: "⚡" },
];

const connections = [
  [0, 2],
  [1, 2],
  [3, 2],
  [4, 2]
];

// ✅ Función para obtener posiciones responsivas
const getResponsiveLayout = (width: number) => {
  if (width <= 650) {
    return {
      positions: [
        { x: width / 2, y: 80 },
        { x: width / 2, y: 180 },
        { x: width / 2, y: 280 },
        { x: width / 2, y: 380 },
        { x: width / 2, y: 480 }
      ],
      nodeSize: { width: Math.min(140, width * 0.8), height: Math.min(140, width * 0.8) },
      containerHeight: 580,
      showConnections: false
    };
  } else if (width <= 900) {
    return {
      positions: [
        { x: width * 0.2, y: 80 },
        { x: width * 0.2, y: 220 },
        { x: width * 0.5, y: 150 },
        { x: width * 0.8, y: 80 },
        { x: width * 0.8, y: 220 }
      ],
      nodeSize: { width: 160, height: 160 },
      containerHeight: 360,
      showConnections: true
    };
  } else {
    return {
      positions: [
        { x: width * 0.20, y: 120 },
        { x: width * 0.20, y: 320 },
        { x: width * 0.50, y: 220 },
        { x: width * 0.80, y: 120 },
        { x: width * 0.80, y: 320 }
      ],
      nodeSize: { width: 190, height: 190 },
      containerHeight: 520,
      showConnections: true
    };
  }
};

export default function FlujoVisual() {
  const language = useBotzLanguage("en");
  const isEn = language === "en";
  const nodes = isEn ? nodesEn : nodesEs;
  const [selectedNode, setSelectedNode] = useState<number | null>(null);

  // ✅ Estado seguro para SSR → arranca con 880
  const [containerWidth, setContainerWidth] = useState(880);
  const [layout, setLayout] = useState(() => getResponsiveLayout(880));

  const canvasRef = React.useRef<HTMLDivElement | null>(null);

  // ✅ Flag de montaje
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true); // se activa en cliente
  }, []);

  // ✅ Listener para redimensionamiento
  useEffect(() => {
    const handleResize = () => {
      const el = canvasRef.current;
      if (!el) return;

      // Measure the actual canvas width so SVG and nodes align 1:1
      const measured = Math.round(el.getBoundingClientRect().width);
      const width = Math.max(320, Math.min(measured, 1120));
      setContainerWidth(width);
      setLayout(getResponsiveLayout(width));
    };

    handleResize(); // Ejecutar inmediatamente en el cliente
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <section id="flujo-cognitivo-visual" style={{ marginBottom: 10 }}>
      <h2
        className="section-title"
        style={{
          color: "#00baff",
          textAlign: "center",
          marginBottom: "0.5em",
          fontSize: "clamp(1.5em, 4vw, 2em)"
        }}
      >
        <span role="img" aria-label={isEn ? "Flow" : "Flujo"} style={{ marginRight: 10 }}>
          📊
        </span>
        {isEn ? "Visual Cognitive Flow" : "Flujo Cognitivo Visual"}
      </h2>
      <p
        style={{
          fontSize: "clamp(1em, 2.5vw, 1.1em)",
          textAlign: "center",
          margin: "0 auto 1.5em",
          maxWidth: "min(700px, 95vw)",
          color: "#e6e6e6",
          padding: "0 1rem"
        }}
      >
        {isEn
          ? "This diagram shows how botz processes data from perception, consults memory, reasons in its cognitive core and executes automated actions."
          : "Este diagrama muestra como botz procesa datos desde la percepcion, consulta su memoria, analiza en su nucleo cognitivo y ejecuta acciones automatizadas."}
      </p>
      <div
        ref={canvasRef}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "1120px",
          margin: "0 auto",
          height: layout.containerHeight,
          minHeight: layout.containerHeight,
          boxSizing: "border-box"
        }}
      >
        {layout.showConnections && (
          <svg
            className="flujo-svg"
            width="100%"
            height="100%"
            style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none", zIndex: 1 }}
            viewBox={`0 0 ${containerWidth} ${layout.containerHeight}`}
            preserveAspectRatio="none"
          >
            {connections.map(([from, to], idx) => (
              <line
                key={idx}
                x1={layout.positions[from].x}
                y1={layout.positions[from].y}
                x2={layout.positions[to].x}
                y2={layout.positions[to].y}
              />
            ))}
          </svg>
        )}
        {nodes.map((node, i) => (
          <div
            key={node.id}
            className={`flujo-node node-${node.id}`}
            style={{
              position: "absolute",
              left: layout.positions[i].x - layout.nodeSize.width / 2,
              top: layout.positions[i].y - layout.nodeSize.height / 2,
              width: layout.nodeSize.width,
              height: layout.nodeSize.height,
              zIndex: 2,
              textAlign: "center",
              cursor: "pointer",
              boxSizing: "border-box"
            }}
            onClick={() => setSelectedNode(i)}
          >
            <div
              className="flujo-node-icon"
              style={{
                fontSize: `clamp(1.5em, ${layout.nodeSize.width / 80}em, 2.5em)`,
                margin: "14px auto 5px"
              }}
            >
              {node.icon}
            </div>
            <div className="flujo-node-content">
              <div
                className="flujo-node-label"
                style={{
                  fontWeight: 500,
                  fontSize: `clamp(0.8em, ${layout.nodeSize.width / 200}em, 1em)`,
                  marginBottom: 4,
                  color: "#00baff"
                }}
              >
                {node.label}
              </div>
              {/* ✅ Se renderiza solo en cliente después de montar */}
              {mounted && window.innerWidth <= 900 && (
                <div
                  className="flujo-node-desc"
                  style={{
                    fontSize: `clamp(0.8em, ${layout.nodeSize.width / 160}em, 1em)`
                  }}
                >
                  {node.desc}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Extra context */}
      <div className="flujo-extra" aria-label={isEn ? "Flow summary" : "Resumen del flujo"}>
        <div className="flujo-extra-card">
          <div className="flujo-extra-title">{isEn ? "Inputs" : "Entradas"}</div>
          <div className="flujo-extra-list">
            <div>{isEn ? "WhatsApp, forms and ads" : "WhatsApp, formularios y anuncios"}</div>
            <div>{isEn ? "Lead data and context" : "Datos del lead y contexto"}</div>
            <div>{isEn ? "History and connected sources" : "Historial y fuentes conectadas"}</div>
          </div>
        </div>

        <div className="flujo-extra-card">
          <div className="flujo-extra-title">{isEn ? "Outputs" : "Salidas"}</div>
          <div className="flujo-extra-list">
            <div>{isEn ? "Clean lead in CRM" : "Lead limpio en el CRM"}</div>
            <div>{isEn ? "Actions: follow-up, tasks and messages" : "Acciones: seguimiento, tareas y mensajes"}</div>
            <div>{isEn ? "Results: scoring, viability and PDF" : "Resultados: scoring, viabilidad y PDF"}</div>
          </div>
        </div>

        <div className="flujo-extra-cta">
          <div className="flujo-extra-cta-title">{isEn ? "Want this flow in your business?" : "Quieres este flujo en tu negocio?"}</div>
          <div className="flujo-extra-cta-actions">
            <a className="flujo-extra-btn secondary" href="https://wa.me/573154829949" target="_blank" rel="noopener noreferrer">
              {isEn ? "Chat on WhatsApp" : "Hablar por WhatsApp"}
            </a>
          </div>
        </div>
      </div>

      {/* Visual tech strip */}
      <div className="flujo-robots" aria-hidden="true">
        <svg
          className="flujo-robots-svg"
          viewBox="0 0 1120 170"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="botzGlow" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#00baff" stopOpacity="0.15" />
              <stop offset="0.5" stopColor="#2af7ff" stopOpacity="0.18" />
              <stop offset="1" stopColor="#00ffea" stopOpacity="0.12" />
            </linearGradient>
            <linearGradient id="wire" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#2af7ff" stopOpacity="0.95" />
              <stop offset="1" stopColor="#00baff" stopOpacity="0.85" />
            </linearGradient>
            <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* background */}
          <rect x="0" y="0" width="1120" height="170" rx="18" fill="url(#botzGlow)" />

          {/* wires */}
          <path className="wire" d="M160 85 C 260 30, 360 30, 460 85" />
          <path className="wire" d="M460 85 C 560 140, 660 140, 760 85" />
          <path className="wire" d="M760 85 C 860 30, 960 30, 1060 85" />

          {/* nodes */}
          <g className="botnode" transform="translate(160 85)">
            <circle r="40" fill="#0b1220" stroke="#6e78ff" strokeWidth="3" filter="url(#softGlow)" />
            <g transform="translate(-16 -12)" fill="none" stroke="#c7d2fe" strokeWidth="2" strokeLinecap="round">
              <rect x="0" y="4" width="32" height="24" rx="6" />
              <circle cx="10" cy="16" r="2.5" fill="#c7d2fe" stroke="none" />
              <circle cx="22" cy="16" r="2.5" fill="#c7d2fe" stroke="none" />
              <path d="M12 23 H20" />
              <path d="M16 0 V4" />
              <circle cx="16" cy="0" r="2" fill="#2af7ff" stroke="none" />
            </g>
          </g>

          <g className="botnode" transform="translate(460 85)">
            <circle r="46" fill="#0b1220" stroke="#ffffff" strokeWidth="3" filter="url(#softGlow)" />
            <g transform="translate(-19 -14)" fill="none" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round">
              <rect x="0" y="6" width="38" height="28" rx="8" />
              <circle cx="13" cy="20" r="2.8" fill="#2af7ff" stroke="none" />
              <circle cx="25" cy="20" r="2.8" fill="#2af7ff" stroke="none" />
              <path d="M14 28 H24" />
              <path d="M19 0 V6" />
              <circle cx="19" cy="0" r="2" fill="#ff6ec7" stroke="none" />
            </g>
          </g>

          <g className="botnode" transform="translate(760 85)">
            <circle r="40" fill="#0b1220" stroke="#00ffea" strokeWidth="3" filter="url(#softGlow)" />
            <g transform="translate(-16 -12)" fill="none" stroke="#a7f3d0" strokeWidth="2" strokeLinecap="round">
              <rect x="0" y="4" width="32" height="24" rx="6" />
              <circle cx="10" cy="16" r="2.5" fill="#a7f3d0" stroke="none" />
              <circle cx="22" cy="16" r="2.5" fill="#a7f3d0" stroke="none" />
              <path d="M12 23 H20" />
              <path d="M16 0 V4" />
              <circle cx="16" cy="0" r="2" fill="#2af7ff" stroke="none" />
            </g>
          </g>

          <g className="botnode" transform="translate(1060 85)">
            <circle r="36" fill="#0b1220" stroke="#ffb86c" strokeWidth="3" filter="url(#softGlow)" />
            <g transform="translate(-14 -11)" fill="none" stroke="#fde68a" strokeWidth="2" strokeLinecap="round">
              <rect x="0" y="4" width="28" height="22" rx="6" />
              <circle cx="9" cy="15" r="2.2" fill="#fde68a" stroke="none" />
              <circle cx="19" cy="15" r="2.2" fill="#fde68a" stroke="none" />
              <path d="M10.5 21 H17.5" />
              <path d="M14 0 V4" />
              <circle cx="14" cy="0" r="1.8" fill="#2af7ff" stroke="none" />
            </g>
          </g>

          {/* labels */}
          <g fill="#94a3b8" fontSize="11" fontFamily="system-ui, -apple-system, Segoe UI, sans-serif" textAnchor="middle">
            <text x="160" y="155">{isEn ? "Capture" : "Captura"}</text>
            <text x="460" y="155">{isEn ? "Reasoning" : "Razonamiento"}</text>
            <text x="760" y="155">{isEn ? "Action" : "Accion"}</text>
            <text x="1060" y="155">{isEn ? "Output" : "Salida"}</text>
          </g>
        </svg>
      </div>

      {/* Modal */}
      {selectedNode !== null && (
        <div className="node-modal" onClick={() => setSelectedNode(null)}>
          <div className="node-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="node-modal-close"
              onClick={() => setSelectedNode(null)}
               title={isEn ? "Close" : "Cerrar"}
            >
              &times;
            </button>
            <div style={{ fontSize: "2.8em", marginBottom: ".3em" }}>
              {nodes[selectedNode].icon}
            </div>
            <h3 style={{ color: "#00baff", marginTop: 0 }}>
              {nodes[selectedNode].label}
            </h3>
            <div
              style={{
                fontSize: "1.35em",
                marginBottom: "1.3em",
                color: "#fff"
              }}
            >
              {nodes[selectedNode].detail}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
