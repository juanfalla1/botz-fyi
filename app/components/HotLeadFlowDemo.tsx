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
        <h2 className="text-4xl font-bold text-cyan-400 mb-4">Solucion Para la Captación de Leads con HotLead</h2>
        <p className="text-lg text-gray-300 mb-10">
          Este flujo muestra paso a paso cómo HotLead transforma un contacto frío en una oportunidad real.
        </p>
        <div className="grid md:grid-cols-3 gap-10">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              className="bg-[#121827] rounded-xl p-6 shadow-md border border-gray-700"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.2 }}
            >
              <div className="flex justify-center mb-4">{step.icon}</div>
              <h3 className="text-xl font-semibold mb-2 text-cyan-300">{step.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HotLeadFlowDemo;
