import React from "react";

const Beneficios = () => (
  <section id="beneficios">
    <div className="overlay"></div>
    <div className="content animate__animated animate__fadeInUp">
      <h3>Beneficios Clave</h3>
      <ul>
        <li>Reducción del 90% en errores humanos y aumento de 3x en velocidad</li>
        <li>Reducción de costos operativos hasta en un 60%</li>
        <li>Escalabilidad sin fricción para crecer con tu negocio</li>
        <li>Toma de decisiones asistida por IA con recomendaciones en tiempo real</li>
      </ul>
      <div className="feature-cards">
        <div className="feature-card">
          <div className="feature-icon">
            <i className="fas fa-clock"></i>
          </div>
          <h4>Ahorro de Tiempo</h4>
          <p>Recupera hasta 20 horas semanales por empleado.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">
            <i className="fas fa-money-bill-wave"></i>
          </div>
          <h4>Reducción de Costos</h4>
          <p>Disminuye gastos operativos significativamente.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">
            <i className="fas fa-rocket"></i>
          </div>
          <h4>Escalabilidad</h4>
          <p>Adapta tu operación sin aumentar carga de trabajo.</p>
        </div>
      </div>
    </div>
  </section>
);

export default Beneficios;
