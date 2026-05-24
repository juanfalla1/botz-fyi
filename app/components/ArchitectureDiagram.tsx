"use client";
import React, { useState } from "react";
import "./ArchitectureDiagram.css";
import useBotzLanguage from "@/app/start/hooks/useBotzLanguage";

const agentsEn = [
  {
    title: "Intelligent Sensing",
    subtitle: "Data capture",
    icon: "🤖",
    desc: "Collects data from forms, APIs and messaging channels in real time.",
    borderClass: "agent-sensado"
  },
  {
    title: "Dynamic Storage",
    subtitle: "Data management and retrieval",
    icon: "💾",
    desc: "Stores and retrieves information in Google Sheets, databases or external systems.",
    borderClass: "agent-almacenamiento"
  },
  {
    title: "Analytical Core",
    subtitle: "Advanced decision processing",
    icon: "🧠",
    desc: "Analyzes patterns, makes smart decisions and learns continuously.",
    borderClass: "agent-mente"
  },
  {
    title: "Automation Engine",
    subtitle: "Intelligent process execution",
    icon: "⚙️",
    desc: "Orchestrates tasks, applies rules and automates complex workflows.",
    borderClass: "agent-motor"
  },
  {
    title: "Instant Response",
    subtitle: "Real-time output delivery",
    icon: "⚡",
    desc: "Informs, responds and executes actions directly for end users.",
    borderClass: "agent-respuesta"
  }
];

const agentsEs = [
  {
    title: "Sensado Inteligente",
    subtitle: "Captura de informacion",
    icon: "🤖",
    desc: "Recopila datos desde formularios, APIs y canales de mensajeria en tiempo real.",
    borderClass: "agent-sensado",
  },
  {
    title: "Almacenamiento Dinamico",
    subtitle: "Gestion y consulta de datos",
    icon: "💾",
    desc: "Registra y recupera informacion en Google Sheets, bases de datos o sistemas externos.",
    borderClass: "agent-almacenamiento",
  },
  {
    title: "Mente Analitica",
    subtitle: "Procesamiento avanzado de decisiones",
    icon: "🧠",
    desc: "Analiza patrones, toma decisiones inteligentes y aprende continuamente.",
    borderClass: "agent-mente",
  },
  {
    title: "Motor de Automatizacion",
    subtitle: "Ejecucion de procesos inteligentes",
    icon: "⚙️",
    desc: "Orquesta tareas, aplica reglas y automatiza flujos de trabajo complejos.",
    borderClass: "agent-motor",
  },
  {
    title: "Respuesta Instantanea",
    subtitle: "Entrega en tiempo real",
    icon: "⚡",
    desc: "Informa, responde y ejecuta acciones directamente al cliente final.",
    borderClass: "agent-respuesta",
  },
];

export default function ArchitectureDiagram() {
  const language = useBotzLanguage("en");
  const isEn = language === "en";
  const agents = isEn ? agentsEn : agentsEs;
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <section style={{ margin: "80px auto 40px", padding: "0 clamp(12px, 4vw, 40px)", width: "100%", maxWidth: "1400px", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <h2 className="section-title" style={{ textAlign: "center", fontSize: "clamp(1.6em, 4.8vw, 2.8em)", marginBottom: "16px", lineHeight: 1.2 }}>{isEn ? "Architecture of Our AI Agents" : "Arquitectura de Nuestros Agentes IA"}</h2>
      <p className="section-subtitle" style={{ textAlign: "center", fontSize: "clamp(1em, 3.6vw, 1.3em)", maxWidth: "800px", margin: "0 auto 40px", color: "#ccc", padding: "0 6px" }}>
        {isEn ? "Each agent acts as a specialized bot, working together to optimize your business process." : "Cada agente actua como un bot especializado para optimizar tu proceso de negocio."}
      </p>
      <div className="agentes-grid" style={{ width: "100%", position: "relative", zIndex: 1 }}>
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

      {selected !== null && (
        <div className="agente-modal-bg" onClick={() => setSelected(null)}>
          <div className="agente-modal" onClick={e => e.stopPropagation()}>
            <button className="agente-close" onClick={() => setSelected(null)}>&times;</button>
            <div className="agente-icon" style={{ fontSize: "2.6em" }}>
              {agents[selected].icon}
            </div>
            <h3 style={{ margin: "12px 0 2px", color: "#22d3ee" }}>{agents[selected].title}</h3>
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
