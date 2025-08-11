'use client';
import React from 'react';

const SuccessCases = () => {
  return (
    <section id="casos" className="section">
      <h3 className="section-title">Casos de Éxito</h3>
      <p>Conoce cómo nuestra IA ha transformado negocios reales.</p>

      <div className="casos-grid">
        <div className="caso">
          <i className="fas fa-shoe-prints fa-3x icono"></i>
          <h4>HOOK E-commerce Inteligente</h4>
          <p>
            Desde el diseño hasta el despliegue final, Botz lideró el desarrollo integral del ecommerce HOOK, destacando un diseño visual atractivo, completamente responsivo y adaptado a los colores corporativos. Se integró una pasarela de pagos segura con Wompi, un chatbot con inteligencia artificial conectado a OpenAI y flujos automatizados vía WhatsApp y Telegram. Además, se realizó una optimización avanzada para buscadores (SEO), configuración de dominio personalizado y soporte técnico post-lanzamiento. Andrés Castillo, CEO de HOOK, confió plenamente en Botz para llevar su visión digital al siguiente nivel.
          </p>
        </div>

        <div className="caso">
          <i className="fas fa-store fa-3x icono"></i>
          <h4>Retail Automatizado</h4>
          <p>Reducción del 40% en tiempo de atención y aumento del 25% en ventas.</p>
        </div>

        <div className="caso">
          <i className="fas fa-industry fa-3x icono"></i>
          <h4>Industria 4.0</h4>
          <p>Monitoreo inteligente de procesos y disminución de errores operativos.</p>
        </div>

        <div className="caso">
          <i className="fas fa-headset fa-3x icono"></i>
          <h4>Soporte IA 24/7</h4>
          <p>Atención constante y personalizada a miles de clientes al mes.</p>
        </div>
      </div>
    </section>
  );
};

export default SuccessCases;

