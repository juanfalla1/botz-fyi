"use client";
import React, { useState } from "react";
import "./ArchitectureDiagram.css"; // Ajusta la ruta si lo pones en otro lado

const agents = [
  {
    title: "Sensado Inteligente",
    subtitle: "Captura de Información",
    icon: "🤖",
    desc: "Recopila datos desde formularios, APIs y canales de mensajería en tiempo real.",
    borderClass: "agent-sensado"
  },
  {
    title: "Almacenamiento Dinámico",
    subtitle: "Gestión y consulta de datos",
    icon: "💾",
    desc: "Registra y recupera información en Google Sheets, bases de datos o sistemas externos.",
    borderClass: "agent-almacenamiento"
  },
  {
    title: "Mente Analítica",
    subtitle: "Procesamiento avanzado de decisiones",
    icon: "🧠",
    desc: "Analiza patrones, toma decisiones inteligentes y aprende continuamente.",
    borderClass: "agent-mente"
  },
  {
    title: "Motor de Automatización",
    subtitle: "Ejecución de procesos inteligentes",
    icon: "⚙️",
    desc: "Orquesta tareas, aplica reglas y automatiza flujos de trabajo complejos.",
    borderClass: "agent-motor"
  },
  {
    title: "Respuesta Instantánea",
    subtitle: "Entrega de resultados en tiempo real",
    icon: "⚡",
    desc: "Informa, responde y ejecuta acciones directamente al cliente final.",
    borderClass: "agent-respuesta"
  }
];

export default function ArchitectureDiagram() {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <section style={{ margin: "80px auto 40px", padding: "0 40px", width: "100%", maxWidth: "1400px", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <h2 className="section-title" style={{ textAlign: "center", fontSize: "2.8em", marginBottom: "16px" }}>Arquitectura de Nuestros Agentes IA</h2>
      <p className="section-subtitle" style={{ textAlign: "center", fontSize: "1.3em", maxWidth: "800px", margin: "0 auto 40px", color: "#ccc" }}>
        Cada agente actúa como un bot especializado, trabajando en equipo para optimizar tu proceso de negocio.
      </p>
      <div style={{ position: "relative", width: "100%", maxWidth: "1400px", marginTop: "2em" }}>
        {/* Líneas conectoras */}
        <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }}>
          <line x1="10%" y1="50%" x2="28%" y2="50%" stroke="#22d3ee" strokeWidth="3" strokeDasharray="8 4" />
          <line x1="38%" y1="50%" x2="56%" y2="50%" stroke="#22d3ee" strokeWidth="3" strokeDasharray="8 4" />
          <line x1="66%" y1="50%" x2="84%" y2="50%" stroke="#22d3ee" strokeWidth="3" strokeDasharray="8 4" />
          <line x1="94%" y1="50%" x2="100%" y2="50%" stroke="#22d3ee" strokeWidth="3" strokeDasharray="8 4" />
        </svg>
        <div className="agentes-grid" style={{ width: "100%", justifyContent: "space-between", position: "relative", zIndex: 1 }}>
        {agents.map((a, idx) => (
          <div
            key={a.title}
            className={`agente-card ${a.borderClass}`}
            onClick={() => setSelected(idx)}
            tabIndex={0}
            role="button"
            aria-label={a.title}
          >
            <div className="agente-icon">{a.icon}</div>
            <div className="agente-title">{a.title}</div>
            <div className="agente-subtitle">{a.subtitle}</div>
          </div>
        ))}
        </div>
      </div>

      {selected !== null && (
        <div className="agente-modal-bg" onClick={() => setSelected(null)}>
          <div className="agente-modal" onClick={e => e.stopPropagation()}>
            <button className="agente-close" onClick={() => setSelected(null)}>&times;</button>
            <div className="agente-icon" style={{ fontSize: "2.6em" }}>
              {agents[selected].icon}
            </div>
            <h3 style={{ margin: "12px 0 2px", color: "var(--primary)" }}>{agents[selected].title}</h3>
            <div style={{ color: "#0aa6b8", fontSize: "1.1em", marginBottom: 12 }}>
              {agents[selected].subtitle}
            </div>
            <p style={{ fontSize: "1.12em" }}>{agents[selected].desc}</p>
          </div>
        </div>
      )}
    </section>
  );
}
