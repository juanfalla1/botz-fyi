"use client";
import React, { useState, useEffect } from "react";
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

const getEcommerceLayout = (width: number) => {
  if (width <= 650) {
    return {
      containerWidth: width,
      containerHeight: steps.length * 80 + 40,
      showConnections: false,
      isMobile: true
    };
  } else if (width <= 900) {
    const centerX = width * 0.5;
    const centerY = 220;
    const radius = Math.min(150, width * 0.22);
    return {
      centerX,
      centerY,
      radius,
      containerWidth: width,
      containerHeight: 440,
      showConnections: true,
      isMobile: false
    };
  } else {
    const centerX = 400;
    const centerY = 280;
    const radius = 220;
    return {
      centerX,
      centerY,
      radius,
      containerWidth: 800,
      containerHeight: 560,
      showConnections: true,
      isMobile: false
    };
  }
};

export default function FlujoEcommerce() {
  const [selected, setSelected] = useState<number | null>(null);
  const [layout, setLayout] = useState(() => getEcommerceLayout(800));

  useEffect(() => {
    const handleResize = () => {
      const container = document.querySelector(".flujo-e-container")?.parentElement;
      if (container) {
        const width = Math.min(container.clientWidth - 40, 660);
        setLayout(getEcommerceLayout(width));
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const angleStep = (2 * Math.PI) / steps.length;

  return (
    <section style={{ margin: "54px 0 54px 0", padding: "0 1rem" }}>
      <h2
        className="section-title"
        style={{
          color: "#22d3ee",
          fontSize: "clamp(1.8em, 4vw, 2.8em)"
        }}
      >
        boty, E-commerce con IA
      </h2>
      <p
        style={{
          textAlign: "center",
          color: "#e2e8f0",
          fontSize: "clamp(1.2em, 2.5vw, 1.4em)",
          marginBottom: 35,
          maxWidth: "min(700px, 95vw)",
          margin: "0 auto 35px"
        }}
      >
        Descubre cómo la tecnología conecta y automatiza cada etapa del ecommerce moderno.
      </p>
      <div
        className="flujo-e-container"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "800px",
          height: layout.containerHeight,
          margin: layout.isMobile ? "0" : "0 auto"
        }}
      >
        {layout.showConnections && !layout.isMobile && (
          <svg
            width="100%"
            height="100%"
            className="flujo-e-svg"
            viewBox={`0 0 ${layout.containerWidth} ${layout.containerHeight}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {steps.map((_, i) => {
              const x1 = layout.centerX! + layout.radius! * Math.cos(i * angleStep - Math.PI / 2);
              const y1 = layout.centerY! + layout.radius! * Math.sin(i * angleStep - Math.PI / 2);
              const x2 =
                layout.centerX! +
                layout.radius! * Math.cos(((i + 1) % steps.length) * angleStep - Math.PI / 2);
              const y2 =
                layout.centerY! +
                layout.radius! * Math.sin(((i + 1) % steps.length) * angleStep - Math.PI / 2);
              return (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className="flujo-e-line" />
              );
            })}
          </svg>
        )}

        {steps.map((step, i) => {
          let nodeStyle: React.CSSProperties;

          if (layout.isMobile) {
            nodeStyle = {
              position: "static",
              display: "flex",
              alignItems: "center",
              textAlign: "left",
              width: "min(320px, 85vw)",
              height: "auto",
              margin: "0 0 16px 20px", // corrido a la izquierda
              padding: "12px",
              borderRadius: "16px",
              gap: "12px"
            };
          } else {
            const x =
              layout.centerX! + layout.radius! * Math.cos(i * angleStep - Math.PI / 2) - 80;
            const y =
              layout.centerY! + layout.radius! * Math.sin(i * angleStep - Math.PI / 2) - 80;
            nodeStyle = {
              left: x,
              top: y,
              position: "absolute",
              width: 160,
              height: 160
            };
          }

          return (
            <div
              key={i}
              className="flujo-e-node"
              style={nodeStyle}
              onClick={() => setSelected(i)}
            >
              <div
                style={{
                  fontSize: layout.isMobile ? "2em" : "2.5em",
                  marginBottom: layout.isMobile ? 0 : 6,
                  flexShrink: 0,
                  width: layout.isMobile ? "60px" : "auto",
                  textAlign: "center"
                }}
              >
                {step.icon}
              </div>
              <div className="flujo-e-content">
                <div className="flujo-e-title">
                  {step.title.split("\n").map((line, idx) => (
                    <span key={idx}>
                      {line}
                      {!layout.isMobile && <br />}
                      {layout.isMobile && idx < step.title.split("\n").length - 1 && " "}
                    </span>
                  ))}
                </div>
                {layout.isMobile && (
                  <div
                    className="flujo-e-desc"
                    style={{
                      fontSize: "0.9em",
                      color: "#ccc",
                      marginTop: "4px",
                      lineHeight: 1.3
                    }}
                  >
                    {step.desc}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Carrusel "robots en vivo" (diferente al flujo anterior) */}
      <div className="ecom-live" aria-label="Robots en vivo">
        <div className="ecom-live-head">
          <div className="ecom-live-kicker">Robots en vivo</div>
          <div className="ecom-live-sub">Un ejemplo visual de como los agentes coordinan cada etapa.</div>
        </div>

        <div className="ecom-live-track" aria-hidden="true">
          <svg className="ecom-live-svg" viewBox="0 0 1120 140" preserveAspectRatio="none">
            <path className="ecom-live-path" d="M40 75 C 240 15, 380 15, 520 75 S 820 135, 940 75 S 1080 15, 1120 75" />
          </svg>

          <div className="ecom-live-bot bot-a" />
          <div className="ecom-live-bot bot-b" />
          <div className="ecom-live-bot bot-c" />
        </div>

        <div className="ecom-live-labels" aria-hidden="true">
          <span>Entrada</span>
          <span>Compra</span>
          <span>IA</span>
          <span>Confirmacion</span>
        </div>
      </div>

      {selected !== null && (
        <div className="flujo-e-modal" onClick={() => setSelected(null)}>
          <div className="flujo-e-modal-content" onClick={e => e.stopPropagation()}>
            <button
              className="flujo-e-modal-close"
              onClick={() => setSelected(null)}
              title="Cerrar"
            >
              ×
            </button>
            <div style={{ fontSize: "2.5em", marginBottom: ".3em" }}>
              {steps[selected].icon}
            </div>
            <h3 style={{ color: "#00fff2", marginTop: 0 }}>
              {steps[selected].title.replace("\n", " ")}
            </h3>
            <div style={{ fontSize: "1.12em", margin: "1em 0" }}>
              {steps[selected].desc}
            </div>
            <div style={{ fontWeight: 700, color: "#fff", marginBottom: ".4em" }}>
              Caso de Uso:
            </div>
            <div style={{ fontSize: "1.13em" }}>{steps[selected].usecase}</div>
          </div>
        </div>
      )}
    </section>
  );
}
