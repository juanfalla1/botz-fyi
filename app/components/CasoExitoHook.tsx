"use client";
import React from "react";
import { FaCheckCircle, FaRocket, FaCogs } from "react-icons/fa";

const CasoExitoHook = () => {
  return (
    <section id="caso-exito-hook" className="content animate__animated animate__fadeIn">
      <h3 style={{ color: "var(--primary)" }}>🚀 Caso de Éxito: HOOK</h3>
      <p>
        El cliente <strong>HOOK</strong>, confió en <strong>botz</strong> para crear una solución digital desde cero, con altos estándares técnicos y enfoque profesional.
      </p>

      <p style={{ marginTop: "1em" }}>
        A continuación, presentamos los componentes clave desarrollados para este proyecto:
      </p>

      <ul style={{ marginTop: "1em", paddingLeft: "1.2em", listStyle: "none" }}>
        <li>
          <FaCheckCircle color="#00B4D8" /> <strong>Diseño web personalizado</strong> basado en identidad visual de la marca.
        </li>
        <li>
          <FaCogs color="#00B4D8" /> <strong>Desarrollo completo del sitio</strong> en React con estructura modular y diseño responsivo.
        </li>
        <li>
          <FaRocket color="#00B4D8" /> <strong>Integración de chatbot con IA</strong> personalizado para responder preguntas frecuentes en tiempo real.
        </li>
        <li>
          <FaCheckCircle color="#00B4D8" /> <strong>Conexión con WhatsApp</strong> para atención directa e inmediata.
        </li>
        <li>
          <FaCheckCircle color="#00B4D8" /> <strong>Pasarela de pagos</strong> integrada con Wompi para ventas seguras.
        </li>
        <li>
          <FaCheckCircle color="#00B4D8" /> <strong>Optimización SEO</strong> con metadatos, Google Business Profile y estructura JSON-LD.
        </li>
        <li>
          <FaCheckCircle color="#00B4D8" /> <strong>Despliegue en producción</strong> con Vercel y conexión a dominio personalizado.
        </li>
      </ul>

    {/* Testimonio del cliente */}
  <div className="testimonial-block">
    <blockquote>
      “Gracias a este trabajo, HOOK logró una presencia sólida en línea, procesos automatizados y experiencia de usuario optimizada.”
    </blockquote>
    <p className="author">— Andrés Castillo, CEO de HOOK</p>
  </div>
</section>
  );
};

export default CasoExitoHook;
