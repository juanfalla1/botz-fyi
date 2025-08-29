"use client";

import React from "react";

const AboutUs = () => {
  return (
    <section id="nosotros" className="bg-[#0a0f1c] text-white py-20 px-6">
      <div className="max-w-6xl mx-auto text-center space-y-8">
        {/* Título */}
        <h2 className="text-4xl font-bold text-cyan-400">Nosotros</h2>
        <p className="text-lg text-gray-300 max-w-3xl mx-auto">
          En <span className="font-semibold text-white">BOTZ</span> creemos en el poder 
          de la automatización y la inteligencia artificial para transformar negocios.  
          Nuestra misión es ayudar a empresas de todos los tamaños a **optimizar procesos, 
          reducir costos y acelerar su crecimiento** con soluciones innovadoras.
        </p>

        {/* Trayectoria */}
        <div className="bg-[#111827] p-8 rounded-2xl shadow-lg space-y-4">
          <h3 className="text-2xl font-semibold text-cyan-300">Nuestra Trayectoria</h3>
          <p className="text-gray-300 leading-relaxed">
            Con más de <strong>10 años de experiencia</strong> en el liderazgo de proyectos 
            tecnológicos y de transformación digital, hemos trabajado en áreas como:
          </p>
          <ul className="text-left max-w-3xl mx-auto list-disc list-inside text-gray-400 space-y-2">
            <li>Automatización de procesos empresariales con IA y herramientas low-code/no-code.</li>
            <li>Gestión de proyectos de tecnología en sectores como <strong>finanzas, logística, 
                recursos humanos y marketing</strong>.</li>
            <li>Diseño de arquitecturas seguras en la nube y proyectos de ciberseguridad.</li>
            <li>Implementación de chatbots inteligentes conectados con plataformas como 
                WhatsApp, Telegram y CRM.</li>
            <li>Optimización de flujos de datos y dashboards interactivos para toma de decisiones.</li>
          </ul>
          <p className="text-gray-300 leading-relaxed mt-4">
            Nuestra experiencia nos ha permitido acompañar a startups, PYMEs y grandes compañías 
            en la evolución hacia modelos digitales más eficientes.  
            Creemos firmemente que la tecnología no es un fin, sino un **motor para el crecimiento sostenible**.
          </p>
        </div>

        {/* Cierre inspirador */}
        <p className="text-lg font-semibold text-gray-200 max-w-3xl mx-auto">
          En BOTZ no solo construimos soluciones tecnológicas,  
          <span className="text-cyan-400"> construimos confianza, eficiencia y futuro.</span>
        </p>
      </div>
    </section>
  );
};

export default AboutUs;
