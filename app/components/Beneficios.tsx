"use client";
import React from "react";
import useBotzLanguage from "@/app/start/hooks/useBotzLanguage";

const Beneficios = () => {
  const language = useBotzLanguage("en");
  const isEn = language === "en";

  return <section id="beneficios">
    <div className="overlay"></div>
    <div className="content animate__animated animate__fadeInUp">
      <h3>{isEn ? "Key Benefits" : "Beneficios Clave"}</h3>
      <ul>
        <li>{isEn ? "Up to 90% fewer human errors and 3x faster execution" : "Reduccion del 90% en errores humanos y aumento de 3x en velocidad"}</li>
        <li>{isEn ? "Operational cost reduction of up to 60%" : "Reduccion de costos operativos hasta en un 60%"}</li>
        <li>{isEn ? "Frictionless scalability as your business grows" : "Escalabilidad sin friccion para crecer con tu negocio"}</li>
        <li>{isEn ? "AI-assisted decisions with real-time recommendations" : "Toma de decisiones asistida por IA con recomendaciones en tiempo real"}</li>
      </ul>
      <div className="feature-cards">
        <div className="feature-card">
          <div className="feature-icon">
            <i className="fas fa-clock"></i>
          </div>
          <h4>{isEn ? "Time Savings" : "Ahorro de Tiempo"}</h4>
          <p>{isEn ? "Recover up to 20 hours per employee every week." : "Recupera hasta 20 horas semanales por empleado."}</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">
            <i className="fas fa-money-bill-wave"></i>
          </div>
          <h4>{isEn ? "Cost Reduction" : "Reduccion de Costos"}</h4>
          <p>{isEn ? "Lower operating expenses significantly." : "Disminuye gastos operativos significativamente."}</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">
            <i className="fas fa-rocket"></i>
          </div>
          <h4>{isEn ? "Scalability" : "Escalabilidad"}</h4>
          <p>{isEn ? "Scale operations without increasing team workload." : "Adapta tu operacion sin aumentar carga de trabajo."}</p>
        </div>
      </div>
    </div>
  </section>
};

export default Beneficios;
