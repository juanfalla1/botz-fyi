"use client";

import React, { useEffect, useRef, useState } from "react";
import { FaRocket, FaBrain, FaRobot, FaChartBar, FaEnvelopeOpenText } from "react-icons/fa";
import "../styles/HotLead.css";
import useBotzLanguage from "@/app/start/hooks/useBotzLanguage";

const benefitsEn = [
  {
    title: "Effortless capture",
    description: "Never lose a contact: centralize leads from forms, social media and more.",
    icon: <FaRocket className="benefit-icon" />, 
    metric: { label: "Leads captured", value: 125, icon: <FaChartBar /> },
  },
  {
    title: "Intelligent qualification",
    description: "OpenAI detects intent and automatically prioritizes your highest-value leads.",
    icon: <FaBrain className="benefit-icon" />, 
    metric: { label: "Leads qualified", value: 113, icon: <FaBrain /> },
  },
  {
    title: "Instant response",
    description: "Customers get immediate personalized AI replies, increasing engagement.",
    icon: <FaRobot className="benefit-icon" />, 
    metric: { label: "Replies sent", value: 108, icon: <FaRobot /> },
  },
  {
    title: "Structured data",
    description: "Google Sheets stores all leads for easier analysis and follow-up.",
    icon: <FaChartBar className="benefit-icon" />, 
    metric: { label: "Leads stored", value: 105, icon: <FaChartBar /> },
  },
  {
    title: "Team notification",
    description: "Your team is alerted instantly to act without delays.",
    icon: <FaEnvelopeOpenText className="benefit-icon" />, 
    metric: { label: "Notifications sent", value: 97, icon: <FaEnvelopeOpenText /> },
  },
];

const benefitsEs = [
  {
    title: "Captura sin esfuerzo",
    description: "No pierdas ningun contacto: centraliza los leads desde formularios, redes sociales y mas.",
    icon: <FaRocket className="benefit-icon" />,
    metric: { label: "Leads capturados", value: 125, icon: <FaChartBar /> },
  },
  {
    title: "Clasificacion inteligente",
    description: "OpenAI detecta intenciones y prioriza automaticamente los leads mas valiosos.",
    icon: <FaBrain className="benefit-icon" />,
    metric: { label: "Leads clasificados", value: 113, icon: <FaBrain /> },
  },
  {
    title: "Respuesta instantanea",
    description: "El cliente recibe respuestas inmediatas y personalizadas con IA.",
    icon: <FaRobot className="benefit-icon" />,
    metric: { label: "Respuestas enviadas", value: 108, icon: <FaRobot /> },
  },
  {
    title: "Datos estructurados",
    description: "Google Sheets guarda todos los leads para analisis y seguimiento.",
    icon: <FaChartBar className="benefit-icon" />,
    metric: { label: "Leads almacenados", value: 105, icon: <FaChartBar /> },
  },
  {
    title: "Notificacion al equipo",
    description: "Tu equipo es alertado al instante para actuar sin demoras.",
    icon: <FaEnvelopeOpenText className="benefit-icon" />,
    metric: { label: "Notificaciones enviadas", value: 97, icon: <FaEnvelopeOpenText /> },
  },
];

const HotLeadBenefits = () => {
  const language = useBotzLanguage("en");
  const isEn = language === "en";
  const benefits = isEn ? benefitsEn : benefitsEs;
  const [animatedValues, setAnimatedValues] = useState(benefits.map(() => 0));
  const intervalRefs = useRef<(NodeJS.Timeout | null)[]>(benefits.map(() => null));

  useEffect(() => {
    setAnimatedValues(benefits.map(() => 0));
    intervalRefs.current = benefits.map(() => null);
  }, [isEn]);

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
        <h2>{isEn ? "Benefits of Automation with HotLead" : "Beneficios de la Automatizacion con HotLead"}</h2>
        <p>
          {isEn ? "See how each step in lead capture and management creates real business impact." : "Descubre como cada paso del proceso de captacion y gestion de leads genera ventajas reales para tu negocio."}
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
