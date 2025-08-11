"use client";

import React, { useEffect, useRef, useState } from "react";
import { FaRocket, FaBrain, FaRobot, FaChartBar, FaEnvelopeOpenText } from "react-icons/fa";
import "../styles/HotLead.css";

const benefits = [
  {
    title: "Captura sin esfuerzo",
    description: "No pierdas ningún contacto: centraliza los leads desde formularios, redes sociales y más.",
    icon: <FaRocket className="benefit-icon" />, 
    metric: { label: "Leads capturados", value: 125, icon: <FaChartBar /> },
  },
  {
    title: "Clasificación inteligente",
    description: "OpenAI detecta intenciones y prioriza automáticamente los leads más valiosos.",
    icon: <FaBrain className="benefit-icon" />, 
    metric: { label: "Leads clasificados", value: 113, icon: <FaBrain /> },
  },
  {
    title: "Respuesta instantánea",
    description: "El cliente recibe una respuesta inmediata y personalizada con IA, aumentando el interés.",
    icon: <FaRobot className="benefit-icon" />, 
    metric: { label: "Respuestas enviadas", value: 108, icon: <FaRobot /> },
  },
  {
    title: "Datos estructurados",
    description: "Google Sheets guarda todos los leads para facilitar el análisis y seguimiento.",
    icon: <FaChartBar className="benefit-icon" />, 
    metric: { label: "Leads almacenados", value: 105, icon: <FaChartBar /> },
  },
  {
    title: "Notificación al equipo",
    description: "Tu equipo es alertado al instante para actuar sin demoras.",
    icon: <FaEnvelopeOpenText className="benefit-icon" />, 
    metric: { label: "Notificaciones enviadas", value: 97, icon: <FaEnvelopeOpenText /> },
  },
];

const HotLeadBenefits = () => {
  const [animatedValues, setAnimatedValues] = useState(benefits.map(() => 0));
  const intervalRefs = useRef<(NodeJS.Timeout | null)[]>(benefits.map(() => null));

  const startAnimation = (index: number, target: number) => {
    clearInterval(intervalRefs.current[index]!);
    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      setAnimatedValues((prev) => {
        const updated = [...prev];
        updated[index] = current;
        return updated;
      });
      if (current >= target) clearInterval(interval);
    }, 15);
    intervalRefs.current[index] = interval;
  };

  return (
    <section id="hotlead-benefits" className="hotlead-benefits-section">
      <div className="hotlead-benefits-header">
        <h2>Beneficios de la Automatización con HotLead</h2>
        <p>
          Descubre cómo cada paso del proceso de captación y gestión de leads genera ventajas reales para tu negocio.
        </p>
      </div>
      <div className="benefits-grid">
        {benefits.map((benefit, index) => (
          <div
            key={index}
            className="benefit-card animate-fade-in"
            onMouseEnter={() => startAnimation(index, benefit.metric.value)}
            onMouseLeave={() => setAnimatedValues((prev) => {
              const updated = [...prev];
              updated[index] = 0;
              return updated;
            })}
          >
            <div className="benefit-content">
              <div className="benefit-left">
                {benefit.icon}
              </div>
              <div className="benefit-right">
                <h3>{benefit.title}</h3>
                <p>{benefit.description}</p>
              </div>
              <div className="benefit-dashboard">
                <div className="benefit-metric">
                  {benefit.metric.icon} <span>{benefit.metric.label}:</span> {animatedValues[index]}
                </div>
                <div className="metric-bar">
                  <div
                    className="bar-fill"
                    style={{ width: `${(animatedValues[index] / benefit.metric.value) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HotLeadBenefits;



