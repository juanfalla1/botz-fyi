"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { FaRobot, FaCheckCircle, FaEnvelope, FaTelegramPlane, FaArrowRight } from "react-icons/fa";
import { MdHttp, MdEmail, MdOutlineAnalytics } from "react-icons/md";
import { SiGooglesheets } from "react-icons/si";
import useBotzLanguage from "@/app/start/hooks/useBotzLanguage";

const stepsEn = [
  {
    icon: <MdHttp size={40} className="text-cyan-400" />,
    title: "Lead Intake",
    description: "The system automatically receives a new contact from your website."
  },
  {
    icon: <FaRobot size={40} className="text-pink-400" />,
    title: "AI Qualification",
    description: "AI analyzes the lead to determine type, urgency and category."
  },
  {
    icon: <SiGooglesheets size={40} className="text-green-400" />,
    title: "Google Sheets Logging",
    description: "Lead data is stored in a spreadsheet or database in real time."
  },
  {
    icon: <FaEnvelope size={40} className="text-indigo-400" />,
    title: "Email Delivery",
    description: "An automatic email is sent to the contact with relevant or welcome information."
  },
  {
    icon: <FaTelegramPlane size={40} className="text-blue-400" />,
    title: "Telegram Alert",
    description: "Your team receives an immediate Telegram alert to act quickly."
  },
  {
    icon: <FaCheckCircle size={40} className="text-emerald-400" />,
    title: "Process complete",
    description: "The full flow runs without manual intervention. Lead is ready for follow-up."
  }
];

const stepsEs = [
  { icon: <MdHttp size={40} className="text-cyan-400" />, title: "Recepcion del Lead", description: "El sistema recibe automaticamente un nuevo contacto a traves del sitio web." },
  { icon: <FaRobot size={40} className="text-pink-400" />, title: "Clasificacion con IA", description: "Una inteligencia artificial analiza el lead para determinar su tipo, urgencia y categoria." },
  { icon: <SiGooglesheets size={40} className="text-green-400" />, title: "Registro en Google Sheets", description: "Los datos del lead se almacenan en hoja de calculo o base de datos en tiempo real." },
  { icon: <FaEnvelope size={40} className="text-indigo-400" />, title: "Envio de correo", description: "Se envia un correo automatico al contacto con informacion relevante." },
  { icon: <FaTelegramPlane size={40} className="text-blue-400" />, title: "Notificacion por Telegram", description: "Tu equipo recibe una notificacion inmediata por Telegram para actuar sin demoras." },
  { icon: <FaCheckCircle size={40} className="text-emerald-400" />, title: "Proceso completado", description: "Todo el flujo se ejecuta sin intervencion manual. Lead listo para seguimiento." },
];

const HotLeadFlowDemo = () => {
  const language = useBotzLanguage("en");
  const isEn = language === "en";
  const steps = isEn ? stepsEn : stepsEs;

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
          {isEn ? "Lead Acquisition Solution with hotLead" : "Solucion para la Captacion de Leads con hotLead"}
        </h2>
        <p style={{
          fontSize: "clamp(1em, 2.5vw, 1.125rem)",
          color: "#ccc",
          marginBottom: "2rem",
          maxWidth: "min(700px, 95vw)",
          margin: "0 auto 2rem",
          lineHeight: 1.6
        }}>
          {isEn ? "This flow shows step by step how hotLead turns a cold contact into a real opportunity." : "Este flujo muestra paso a paso como hotLead transforma un contacto frio en una oportunidad real."}
        </p>

        {/* Mid-page CTA */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <a 
            href="/start" 
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "12px",
              background: "linear-gradient(90deg, #00baff 0%, #007bff 100%)",
              color: "#fff",
              padding: "1rem 2.5rem",
              borderRadius: "50px",
              fontSize: "1.1rem",
              fontWeight: "bold",
              textDecoration: "none",
              boxShadow: "0 10px 20px rgba(0, 186, 255, 0.3)",
              transition: "transform 0.3s ease"
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-5px)"}
            onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}
          >
            {isEn ? "Try the mortgage lead management tool" : "Prueba la herramienta para gestion de leads de hipotecas"}
            <FaArrowRight />
          </a>
        </motion.div>

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
