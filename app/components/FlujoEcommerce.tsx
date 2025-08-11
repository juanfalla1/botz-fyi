"use client";
import React, { useState } from "react";
import "./FlujoEcommerce.css";

const steps = [
  {
    icon: "🔎",
    title: "Análisis\nPredictivo",
    desc: "Detecta patrones y anticipa picos de demanda.",
    usecase: "Detecta cuándo subir inventario por alta demanda."
  },
  {
    icon: "🛰️",
    title: "Monitoreo\nGlobal",
    desc: "Observa ventas y logística en tiempo real.",
    usecase: "Notifica retrasos de entregas a clientes automáticamente."
  },
  {
    icon: "🧬",
    title: "Personalización\nIA",
    desc: "Ajusta recomendaciones a cada cliente.",
    usecase: "Sugiere productos relevantes durante la compra."
  },
  {
    icon: "🪙",
    title: "Pagos\nInteligentes",
    desc: "Procesa y valida pagos instantáneamente.",
    usecase: "Reintenta cobros fallidos sin intervención manual."
  },
  {
    icon: "🤝",
    title: "Cierre\nAutomático",
    desc: "Cierra ventas y notifica éxito al equipo.",
    usecase: "Confirma automáticamente ventas exitosas y dispara agradecimientos."
  }
];

export default function FlujoEcommerce() {
  const [selected, setSelected] = useState<number | null>(null);

  const centerX = 330;
  const centerY = 280;
  const radius = 190;
  const angleStep = (2 * Math.PI) / steps.length;

  return (
    <section style={{ margin: "70px 0 70px 0" }}>
      <h2 className="section-title" style={{ color: "#00fff2" }}>
        Arquitectura Ecommerce HOOK
      </h2>
      <p style={{ textAlign: "center", color: "#ccc", fontSize: "1.18em", marginBottom: 35 }}>
        Descubre cómo la tecnología conecta y automatiza cada etapa del ecommerce moderno.
      </p>
      <div className="flujo-e-container">
        {/* Líneas del flujo */}
        <svg
          width={centerX * 2}
          height={centerY * 2}
          className="flujo-e-svg"
        >
          {steps.map((_, i) => {
            const x1 = centerX + radius * Math.cos(i * angleStep - Math.PI / 2);
            const y1 = centerY + radius * Math.sin(i * angleStep - Math.PI / 2);
            const x2 =
              centerX +
              radius *
                Math.cos(((i + 1) % steps.length) * angleStep - Math.PI / 2);
            const y2 =
              centerY +
              radius *
                Math.sin(((i + 1) % steps.length) * angleStep - Math.PI / 2);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                className="flujo-e-line"
              />
            );
          })}
        </svg>
        {/* Nodos */}
        {steps.map((step, i) => {
          const x = centerX + radius * Math.cos(i * angleStep - Math.PI / 2) - 70;
          const y = centerY + radius * Math.sin(i * angleStep - Math.PI / 2) - 70;
          return (
            <div
              key={i}
              className="flujo-e-node"
              style={{
                left: x,
                top: y,
                position: "absolute",
                width: 140,
                height: 140
              }}
              onClick={() => setSelected(i)}
            >
              <div style={{ fontSize: "2.1em", marginBottom: 6 }}>{step.icon}</div>
              <div className="flujo-e-title">
                {step.title.split("\n").map((line, idx) => (
                  <span key={idx}>
                    {line}
                    <br />
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {/* Modal explicativo */}
      {selected !== null && (
        <div className="flujo-e-modal" onClick={() => setSelected(null)}>
          <div className="flujo-e-modal-content" onClick={e => e.stopPropagation()}>
            <button className="flujo-e-modal-close" onClick={() => setSelected(null)} title="Cerrar">
              ×
            </button>
            <div style={{ fontSize: "2.5em", marginBottom: ".3em" }}>{steps[selected].icon}</div>
            <h3 style={{ color: "#00fff2", marginTop: 0 }}>{steps[selected].title.replace('\n', ' ')}</h3>
            <div style={{ fontSize: "1.12em", margin: "1em 0" }}>{steps[selected].desc}</div>
            <div style={{ fontWeight: 700, color: "#fff", marginBottom: ".4em" }}>Caso de Uso:</div>
            <div style={{ fontSize: "1.13em" }}>{steps[selected].usecase}</div>
          </div>
        </div>
      )}
    </section>
  );
}


