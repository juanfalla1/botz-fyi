import React from "react";

const funcionalidades = [
  "Automatización por agentes de IA que aprenden y se adaptan",
  "Predicción basada en datos históricos con precisión del 95%",
  "Optimización de tareas repetitivas con ahorro de hasta 80% de tiempo",
  "Control de procesos con dashboards inteligentes en tiempo real"
];

export default function Funcionalidades() {
  return (
    <section id="funcionalidades">
      <div className="overlay"></div>
      <div className="content animate__animated animate__fadeInUp">
        <h3>Funcionalidades Inteligentes</h3>
        <ul>
          {funcionalidades.map((item, idx) => (
            <li key={idx}>
              <i className="fas fa-check" style={{
                color: "var(--primary)",
                marginRight: "0.6em",
                fontSize: "1.2em"
              }}></i>
              {item}
            </li>
          ))}
        </ul>

        <div className="feature-cards">
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-robot"></i>
            </div>
            <h4>Agentes Autónomos</h4>
            <p>IA que trabaja 24/7 sin supervisión en tareas rutinarias.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-brain"></i>
            </div>
            <h4>Procesamiento NLP</h4>
            <p>Comprensión avanzada de lenguaje natural para interacciones fluidas.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-chart-line"></i>
            </div>
            <h4>Analítica Predictiva</h4>
            <p>Anticipa resultados y sugiere acciones óptimas basadas en datos.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
