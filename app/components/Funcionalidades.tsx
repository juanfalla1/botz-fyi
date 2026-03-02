"use client";
import React from "react";
import useBotzLanguage from "@/app/start/hooks/useBotzLanguage";

export default function Funcionalidades() {
  const language = useBotzLanguage("en");
  const isEn = language === "en";
  const funcionalidades = isEn
    ? [
        "Automation with AI agents that learn and adapt",
        "Prediction based on historical data with up to 95% accuracy",
        "Optimization of repetitive tasks with up to 80% time savings",
        "Process control with real-time intelligent dashboards",
      ]
    : [
        "Automatizacion por agentes de IA que aprenden y se adaptan",
        "Prediccion basada en datos historicos con precision de hasta 95%",
        "Optimizacion de tareas repetitivas con ahorro de hasta 80% de tiempo",
        "Control de procesos con dashboards inteligentes en tiempo real",
      ];

  return (
    <section id="funcionalidades">
      <div className="overlay"></div>
      <div className="content animate__animated animate__fadeInUp">
        <h3>{isEn ? "Intelligent Capabilities" : "Funcionalidades Inteligentes"}</h3>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {funcionalidades.map((item, idx) => (
            <li
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "0.8em"
              }}
            >
              <i
                className="fas fa-check-circle"
                style={{
                  color: "var(--primary)", // o "#00B4D8"
                  marginRight: "0.6em",
                  fontSize: "1.2em"
                }}
              ></i>
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div className="feature-cards">
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-robot"></i>
            </div>
             <h4>{isEn ? "Autonomous Agents" : "Agentes Autonomos"}</h4>
             <p>{isEn ? "AI working 24/7 on routine tasks with minimal supervision." : "IA que trabaja 24/7 sin supervision en tareas rutinarias."}</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-brain"></i>
            </div>
            <h4>{isEn ? "NLP Processing" : "Procesamiento NLP"}</h4>
             <p>{isEn ? "Advanced natural language understanding for smooth interactions." : "Comprension avanzada de lenguaje natural para interacciones fluidas."}</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-chart-line"></i>
            </div>
             <h4>{isEn ? "Predictive Analytics" : "Analitica Predictiva"}</h4>
             <p>{isEn ? "Anticipates outcomes and suggests data-driven actions." : "Anticipa resultados y sugiere acciones optimas basadas en datos."}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
