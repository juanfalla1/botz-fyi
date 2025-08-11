"use client";

import React from "react";
import Lottie from "lottie-react";
import botAnimation from "@/assets/lottie/robot.json";
import "@/styles/HotLeadFlow.css";

const HotLeadAnimatedFlow = () => {
  const steps = [
    {
      id: "step1",
      label: "📥 Lead recibido",
    },
    {
      id: "step2",
      label: "🔍 Calificación IA",
    },
    {
      id: "step3",
      label: "📝 Registro en CRM",
    },
    {
      id: "step4",
      label: "✉️ Notificación personalizada",
    },
    {
      id: "step5",
      label: "📊 Reporte al equipo",
    },
  ];

  return (
    <section id="flujo-hotlead" className="hotlead-flow-container">
      <h2 className="flow-title">Flujo Inteligente de HotLead</h2>
      <p className="flow-subtitle">
        Este es el recorrido que realiza un lead desde que entra al formulario
        hasta su clasificación y notificación automática.
      </p>

      <div className="flow-diagram">
        <div className="bot-central">
          <Lottie animationData={botAnimation} loop autoplay className="bot-lottie" />
        </div>

        <div className="flow-steps">
          {steps.map((step, index) => (
            <div key={step.id} className={`flow-step step-${index + 1}`}>
              <div className="step-circle">
                <span>{index + 1}</span>
              </div>
              <div className="step-label">{step.label}</div>
              {index < steps.length - 1 && <div className="flow-line"></div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HotLeadAnimatedFlow;
