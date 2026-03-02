"use client";
import React from "react";
import { FaCheckCircle, FaRocket, FaCogs } from "react-icons/fa";
import useBotzLanguage from "@/app/start/hooks/useBotzLanguage";

const CasoExitoHook = () => {
  const language = useBotzLanguage("en");
  const isEn = language === "en";

  return (
    <section id="caso-exito-hook" className="content animate__animated animate__fadeIn">
      <h3 style={{ color: "var(--primary)" }}>🚀 {isEn ? "Success Story: HOOK" : "Caso de Exito: HOOK"}</h3>
      <p>
        {isEn ? (
          <>Client <strong>HOOK</strong> trusted <strong>botz</strong> to build a digital solution from scratch with high technical standards and a professional approach.</>
        ) : (
          <>El cliente <strong>HOOK</strong> confio en <strong>botz</strong> para crear una solucion digital desde cero, con altos estandares tecnicos y enfoque profesional.</>
        )}
      </p>

      <p style={{ marginTop: "1em" }}>
        {isEn ? "Here are the key components delivered for this project:" : "A continuacion, los componentes clave desarrollados para este proyecto:"}
      </p>

      <ul style={{ marginTop: "1em", paddingLeft: "1.2em", listStyle: "none" }}>
        <li>
          <FaCheckCircle color="#00B4D8" /> <strong>{isEn ? "Custom web design" : "Diseno web personalizado"}</strong> {isEn ? "aligned with brand identity." : "basado en identidad visual de marca."}
        </li>
        <li>
          <FaCogs color="#00B4D8" /> <strong>{isEn ? "Full website development" : "Desarrollo completo del sitio"}</strong> {isEn ? "in React with modular architecture and responsive design." : "en React con estructura modular y diseno responsivo."}
        </li>
        <li>
          <FaRocket color="#00B4D8" /> <strong>{isEn ? "Custom AI chatbot integration" : "Integracion de chatbot con IA"}</strong> {isEn ? "to answer FAQs in real time." : "personalizado para responder preguntas frecuentes en tiempo real."}
        </li>
        <li>
          <FaCheckCircle color="#00B4D8" /> <strong>{isEn ? "WhatsApp integration" : "Conexion con WhatsApp"}</strong> {isEn ? "for direct and immediate support." : "para atencion directa e inmediata."}
        </li>
        <li>
          <FaCheckCircle color="#00B4D8" /> <strong>{isEn ? "Payment gateway" : "Pasarela de pagos"}</strong> {isEn ? "integrated with Wompi for secure sales." : "integrada con Wompi para ventas seguras."}
        </li>
        <li>
          <FaCheckCircle color="#00B4D8" /> <strong>{isEn ? "SEO optimization" : "Optimizacion SEO"}</strong> {isEn ? "with metadata, Google Business Profile and JSON-LD structure." : "con metadatos, Google Business Profile y estructura JSON-LD."}
        </li>
        <li>
          <FaCheckCircle color="#00B4D8" /> <strong>{isEn ? "Production deployment" : "Despliegue en produccion"}</strong> {isEn ? "on Vercel with custom domain setup." : "con Vercel y conexion a dominio personalizado."}
        </li>
      </ul>

    {/* Client testimonial */}
  <div className="testimonial-block">
    <blockquote>
      {isEn
        ? "Thanks to this work, HOOK achieved a strong online presence, automated processes and an optimized user experience."
        : "Gracias a este trabajo, HOOK logro una presencia solida en linea, procesos automatizados y experiencia de usuario optimizada."}
    </blockquote>
    <p className="author">- Andres Castillo, {isEn ? "CEO at HOOK" : "CEO de HOOK"}</p>
  </div>
</section>
  );
};

export default CasoExitoHook;
