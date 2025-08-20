"use client";

import React, { useState, useEffect } from "react";
import Lottie from "lottie-react";
import botAnimation from "@/assets/lottie/robot.json";
import "@/styles/HotLead.css";

const HotLeadAnimatedFlow = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 650);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
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
    <section 
      id="flujo-hotlead" 
      style={{
        padding: "4rem 1rem",
        background: "#0a0f1c",
        color: "white",
        textAlign: "center",
        minHeight: "500px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center"
      }}
    >
      <h2 style={{
        fontSize: "clamp(1.8em, 5vw, 2.5em)",
        fontWeight: "bold",
        color: "#00baff",
        marginBottom: "1rem",
        lineHeight: 1.2
      }}>
        Flujo Inteligente de HotLead
      </h2>
      <p style={{
        fontSize: "clamp(1em, 2.5vw, 1.125rem)",
        color: "#ccc",
        marginBottom: "3rem",
        maxWidth: "min(600px, 95vw)",
        lineHeight: 1.6
      }}>
        Este es el recorrido que realiza un lead desde que entra al formulario
        hasta su clasificación y notificación automática.
      </p>

      <div style={{
        position: "relative",
        width: "min(800px, 95vw)",
        height: "auto",
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: "center",
        justifyContent: "center",
        gap: "2rem"
      }}>
        <div style={{
          width: isMobile ? "120px" : "150px",
          height: isMobile ? "120px" : "150px",
          marginBottom: isMobile ? "1rem" : "0"
        }}>
          <Lottie 
            animationData={botAnimation} 
            loop 
            autoplay 
            style={{ width: "100%", height: "100%" }}
          />
        </div>

        <div style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap"
        }}>
          {steps.map((step, index) => (
            <div 
              key={step.id} 
              style={{
                display: "flex",
                flexDirection: isMobile ? "row" : "column",
                alignItems: "center",
                gap: "0.5rem",
                padding: "1rem",
                background: "#121827",
                borderRadius: "12px",
                border: "1px solid #374151",
                minWidth: isMobile ? "min(280px, 90vw)" : "120px",
                textAlign: "center"
              }}
            >
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "#00baff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: "bold",
                fontSize: "1.2rem",
                flexShrink: 0
              }}>
                {index + 1}
              </div>
              <div style={{
                fontSize: "clamp(0.9em, 2.2vw, 1rem)",
                color: "#ccc",
                lineHeight: 1.4,
                textAlign: isMobile ? "left" : "center"
              }}>
                {step.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HotLeadAnimatedFlow;
