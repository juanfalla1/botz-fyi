"use client";
import React, { useState } from "react";
import "./FlujoVisual.css";

const nodes = [
  {
    id: "percepcion",
    label: "Percepción",
    desc: "Entrada omnicanal",
    detail: "Entrada de datos desde formularios o mensajería.",
    icon: "👁️"
  },
  {
    id: "memoria",
    label: "Memoria",
    desc: "Consulta de datos",
    detail: "Consulta a fuentes como Google Sheets o bases de datos.",
    icon: "💾"
  },
  {
    id: "nucleo",
    label: "Núcleo Cognitivo",
    desc: "Inteligencia central",
    detail: "Análisis y toma de decisiones usando OpenAI.",
    icon: "🧠"
  },
  {
    id: "procesamiento",
    label: "Procesamiento",
    desc: "Automatización",
    detail: "Evaluación contextual y lógica basada en datos.",
    icon: "⚙️"
  },
  {
    id: "accion",
    label: "Acción",
    desc: "Respuesta automática",
    detail: "Respuesta automática enviada al cliente.",
    icon: "⚡"
  }
];

const connections = [
  [0, 2],
  [1, 2],
  [3, 2],
  [4, 2]
];

// ✅ Espaciado más amplio para separación visual
const nodePos = [
  { x: 180, y: 100 },
  { x: 180, y: 280 },
  { x: 440, y: 190 },
  { x: 700, y: 100 },
  { x: 700, y: 280 }
];

const nodeWidth = 180;
const nodeHeight = 180;

export default function FlujoVisual() {
  const [selectedNode, setSelectedNode] = useState<number | null>(null);

  return (
    <section id="flujo-cognitivo-visual" style={{ marginBottom: 60 }}>
      <h2 className="section-title" style={{
        color: "#00baff",
        textAlign: "center",
        marginBottom: "0.5em",
        fontSize: "2em"
      }}>
        <span role="img" aria-label="Flujo" style={{ marginRight: 10 }}>📊</span>
        Flujo Cognitivo Visual
      </h2>
      <p style={{
        fontSize: "1.1em",
        textAlign: "center",
        margin: "0 auto 1.5em",
        maxWidth: 700,
        color: "#e6e6e6"
      }}>
        Este diagrama muestra cómo BOTZ procesa datos desde la percepción, consulta su memoria, analiza en su núcleo cognitivo y ejecuta acciones automatizadas.        
      </p>
      <div style={{
        position: "relative",
        width: 880,
        maxWidth: "98vw",
        margin: "0 auto",
        height: 420,
        minHeight: 360
      }}>
        <svg
          className="flujo-svg"
          width="880"
          height="420"
          style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none", zIndex: 1 }}
        >
          {connections.map(([from, to], idx) => (
            <line
              key={idx}
              x1={nodePos[from].x}
              y1={nodePos[from].y}
              x2={nodePos[to].x}
              y2={nodePos[to].y}
            />
          ))}
        </svg>
        {nodes.map((node, i) => (
          <div
            key={node.id}
            className={`flujo-node node-${node.id}`}
            style={{
              position: "absolute",
              left: nodePos[i].x - nodeWidth / 2,
              top: nodePos[i].y - nodeHeight / 2,
              width: nodeWidth,
              height: nodeHeight,
              zIndex: 2,
              textAlign: "center",
              cursor: "pointer",
              boxSizing: "border-box"
            }}
            onClick={() => setSelectedNode(i)}
          >
            <div className="flujo-node-icon" style={{ fontSize: "2.5em", margin: "14px auto 5px" }}>
              {node.icon}
            </div>
            <div className="flujo-node-label" style={{
              fontWeight: 700,
              fontSize: "1.27em",
              marginBottom: 4,
              color: "#00baff"
            }}>
              {node.label}
            </div>
            <div className="flujo-node-desc">
              {node.desc}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {selectedNode !== null && (
        <div className="node-modal" onClick={() => setSelectedNode(null)}>
          <div className="node-modal-content" onClick={e => e.stopPropagation()}>
            <button className="node-modal-close" onClick={() => setSelectedNode(null)} title="Cerrar">&times;</button>
            <div style={{ fontSize: "2.8em", marginBottom: ".3em" }}>{nodes[selectedNode].icon}</div>
            <h3 style={{ color: "#00baff", marginTop: 0 }}>{nodes[selectedNode].label}</h3>
            <div style={{ fontSize: "1.35em", marginBottom: "1.3em", color: "#fff" }}>{nodes[selectedNode].detail}</div>
          </div>
        </div>
      )}
    </section>
  );
}
