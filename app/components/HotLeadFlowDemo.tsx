"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { FaRobot, FaCheckCircle, FaEnvelope, FaTelegramPlane } from "react-icons/fa";
import { MdHttp, MdEmail, MdOutlineAnalytics } from "react-icons/md";
import { SiGooglesheets } from "react-icons/si";

const steps = [
  {
    icon: <MdHttp size={40} className="text-cyan-400" />,
    title: "Recepción del Lead",
    description: "El sistema recibe automáticamente un nuevo contacto a través del sitio web."
  },
  {
    icon: <FaRobot size={40} className="text-pink-400" />,
    title: "Clasificación con IA",
    description: "Una inteligencia artificial analiza el lead para determinar su tipo, urgencia y categoría."
  },
  {
    icon: <SiGooglesheets size={40} className="text-green-400" />,
    title: "Registro en Google Sheets",
    description: "Los datos del lead son almacenados ordenadamente en una hoja de cálculo en tiempo real."
  },
  {
    icon: <FaEnvelope size={40} className="text-indigo-400" />,
    title: "Envío de correo",
    description: "Se envía un correo automático al contacto con información relevante o de bienvenida."
  },
  {
    icon: <FaTelegramPlane size={40} className="text-blue-400" />,
    title: "Notificación por Telegram",
    description: "Tu equipo recibe una notificación inmediata por Telegram para actuar sin demoras."
  },
  {
    icon: <FaCheckCircle size={40} className="text-emerald-400" />,
    title: "¡Proceso completado!",
    description: "Todo el flujo fue ejecutado sin intervención manual. Lead listo para seguimiento."
  }
];

const HotLeadFlowDemo = () => {
  return (  
    <section className="py-20 px-6 bg-[#0a0f1c] text-white">
      <div className="max-w-6xl mx-auto text-center">
        <h2 style={{
          fontSize: "clamp(1.8em, 5vw, 2.5em)",
          fontWeight: "bold",
          color: "#00baff",
          marginBottom: "1rem",
          lineHeight: 1.2
        }}>
          Solución Para la Captación de Leads con HotLead
        </h2>
        <p style={{
          fontSize: "clamp(1em, 2.5vw, 1.125rem)",
          color: "#ccc",
          marginBottom: "2.5rem",
          maxWidth: "min(700px, 95vw)",
          margin: "0 auto 2.5rem",
          lineHeight: 1.6
        }}>
          Este flujo muestra paso a paso cómo HotLead transforma un contacto frío en una oportunidad real.
        </p>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 90vw), 1fr))",
          gap: "1.5rem",
          maxWidth: "100%"
        }}>
          {steps.map((step, index) => (
            <motion.div
              key={index}
              style={{
                background: "#121827",
                borderRadius: "12px",
                padding: "1.5rem",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
                border: "1px solid #374151",
                minHeight: "200px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                textAlign: "center"
              }}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.2 }}
            >
              <div style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: "1rem",
                fontSize: "2.5rem"
              }}>
                {step.icon}
              </div>
              <h3 style={{
                fontSize: "clamp(1.1em, 3vw, 1.25rem)",
                fontWeight: "600",
                marginBottom: "0.5rem",
                color: "#00baff",
                lineHeight: 1.3
              }}>
                {step.title}
              </h3>
              <p style={{
                fontSize: "clamp(0.85em, 2.2vw, 0.875rem)",
                color: "#9CA3AF",
                lineHeight: 1.6,
                margin: 0
              }}>
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HotLeadFlowDemo;
