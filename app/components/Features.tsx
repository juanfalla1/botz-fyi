import React from "react";

const Features = () => (
  <section id="funcionalidades">
    <div className="overlay"></div>
    <div className="content animate__animated animate__fadeInUp">
      <h3>Funcionalidades Inteligentes</h3>
      <ul className="list-none space-y-3">
        <li className="flex items-start">
          <i className="fas fa-check-circle text-blue-500 mr-2 mt-1"></i>
          <span>Automatización por agentes de IA que aprenden y se adaptan</span>
        </li>
        <li className="flex items-start">
          <i className="fas fa-check-circle text-blue-500 mr-2 mt-1"></i>
          <span>Predicción basada en datos históricos con precisión del 95%</span>
        </li>
        <li className="flex items-start">
          <i className="fas fa-check-circle text-blue-500 mr-2 mt-1"></i>
          <span>Optimización de tareas repetitivas con ahorro de hasta 80% de tiempo</span>
        </li>
        <li className="flex items-start">
          <i className="fas fa-check-circle text-blue-500 mr-2 mt-1"></i>
          <span>Control de procesos con dashboards inteligentes en tiempo real</span>
        </li>
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

export default Features;
