"use client";
import React, { useState, useEffect } from "react";
import "./FlujoVisual.css";

const nodes = [
  { id: "percepcion", label: "Percepción", desc: "Entrada omnicanal", detail: "Entrada de datos desde formularios o mensajería.", icon: "👁️" },
  { id: "memoria", label: "Memoria", desc: "Consulta de datos", detail: "Consulta a fuentes como Google Sheets o bases de datos.", icon: "💾" },
  { id: "nucleo", label: "Núcleo Cognitivo", desc: "Inteligencia central", detail: "Análisis y toma de decisiones usando OpenAI.", icon: "🧠" },
  { id: "procesamiento", label: "Procesamiento", desc: "Automatización", detail: "Evaluación contextual y lógica basada en datos.", icon: "⚙️" },
  { id: "accion", label: "Acción", desc: "Respuesta automática", detail: "Respuesta automática enviada al cliente.", icon: "⚡" }
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
        { x: 180, y: 100 },
        { x: 180, y: 280 },
        { x: 440, y: 190 },
        { x: 700, y: 100 },
        { x: 700, y: 280 }
      ],
      nodeSize: { width: 180, height: 180 },
      containerHeight: 420,
      showConnections: true
    };
  }
};

export default function FlujoVisual() {
  const [selectedNode, setSelectedNode] = useState<number | null>(null);

  // ✅ Estado seguro para SSR → arranca con 880
  const [containerWidth, setContainerWidth] = useState(880);
  const [layout, setLayout] = useState(() => getResponsiveLayout(880));

  // ✅ Flag de montaje
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true); // se activa en cliente
  }, []);

  // ✅ Listener para redimensionamiento
  useEffect(() => {
    const handleResize = () => {
      const container = document.getElementById("flujo-cognitivo-visual");
      if (container) {
        const width = Math.min(container.offsetWidth - 40, 880);
        setContainerWidth(width);
        setLayout(getResponsiveLayout(width));
      }
    };

    handleResize(); // Ejecutar inmediatamente en el cliente
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <section id="flujo-cognitivo-visual" style={{ marginBottom: 60 }}>
      <h2
        className="section-title"
        style={{
          color: "#00baff",
          textAlign: "center",
          marginBottom: "0.5em",
          fontSize: "clamp(1.5em, 4vw, 2em)"
        }}
      >
        <span role="img" aria-label="Flujo" style={{ marginRight: 10 }}>
          📊
        </span>
        Flujo Cognitivo Visual
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
        Este diagrama muestra cómo botz procesa datos desde la percepción, consulta su memoria,
        analiza en su núcleo cognitivo y ejecuta acciones automatizadas.
      </p>
      <div
        style={{
          position: "relative",
          width: "min(880px, 98vw)",
          margin: "0 auto",
          height: layout.containerHeight,
          minHeight: layout.containerHeight
        }}
      >
        {layout.showConnections && (
          <svg
            className="flujo-svg"
            width="100%"
            height="100%"
            style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none", zIndex: 1 }}
            viewBox={`0 0 ${containerWidth} ${layout.containerHeight}`}
            preserveAspectRatio="xMidYMid meet"
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

      {/* Modal */}
      {selectedNode !== null && (
        <div className="node-modal" onClick={() => setSelectedNode(null)}>
          <div className="node-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="node-modal-close"
              onClick={() => setSelectedNode(null)}
              title="Cerrar"
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
