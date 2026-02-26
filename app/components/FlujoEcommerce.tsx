"use client";
import React, { useEffect, useRef, useState } from "react";
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
  if (width <= 700) {
    return {
      containerWidth: width,
      containerHeight: steps.length * 80 + 40,
      showConnections: false,
      isMobile: true,
      nodeSize: 0,
      nodePositions: [] as Array<{ x: number; y: number }>,
    };
  }

  const nodeSize = width >= 1000 ? 196 : 170;
  const centerX = width * 0.5;
  const centerY = width >= 1000 ? 300 : 250;
  const radius = Math.max(150, Math.min(width * 0.25, width >= 1000 ? 228 : 180));
  const nodePositions = steps.map((_, i) => {
    const angle = i * ((2 * Math.PI) / steps.length) - Math.PI / 2;
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });

  if (width <= 1000) {
    return {
      containerWidth: width,
      containerHeight: 560,
      showConnections: true,
      isMobile: false,
      nodeSize,
      nodePositions,
    };
  }

  return {
    containerWidth: width,
    containerHeight: 640,
    showConnections: true,
    isMobile: false,
    nodeSize,
    nodePositions,
  };
};

export default function FlujoEcommerce() {
  const [selected, setSelected] = useState<number | null>(null);
  const [layout, setLayout] = useState(() => getEcommerceLayout(800));
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioAvailable, setAudioAvailable] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      const container = document.querySelector(".flujo-e-container")?.parentElement;
      if (container) {
        const width = Math.min(container.clientWidth - 20, 1120);
        setLayout(getEcommerceLayout(width));
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const playSyntheticCall = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const synth = window.speechSynthesis;
    const script = [
      "Cliente: Hola, quiero saber si califico para credito hipotecario.",
      "Botz IA: Claro. Te hago cuatro preguntas rapidas para validar perfil.",
      "Cliente: Tengo ingreso mensual de dos millones cuatrocientos y cuota inicial del dieciocho por ciento.",
      "Botz IA: Perfecto. Tu perfil es apto. Te agendo asesoria hoy a las cinco y treinta PM.",
      "Cliente: Excelente, confirmo.",
      "Botz IA: Listo. Te envio confirmacion por WhatsApp y correo.",
    ];

    setIsPlaying(true);
    let index = 0;

    const speakNext = () => {
      if (index >= script.length) {
        setIsPlaying(false);
        return;
      }

      const line = script[index];
      const utterance = new SpeechSynthesisUtterance(line);
      utterance.lang = "es-ES";
      utterance.rate = line.startsWith("Botz IA") ? 0.98 : 1.02;
      utterance.pitch = line.startsWith("Botz IA") ? 1.03 : 0.96;
      utterance.onend = () => {
        index += 1;
        speakNext();
      };
      utterance.onerror = () => {
        setIsPlaying(false);
      };
      synth.speak(utterance);
    };

    synth.cancel();
    speakNext();
  };

  const toggleAudio = () => {
    if (!audioAvailable) {
      if (typeof window !== "undefined" && "speechSynthesis" in window && isPlaying) {
        window.speechSynthesis.cancel();
        setIsPlaying(false);
        return;
      }
      playSyntheticCall();
      return;
    }

    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }
    audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  };

  return (
    <section style={{ margin: "54px 0 54px 0", padding: "0 1rem" }}>
      <h2
        className="section-title"
        style={{
          color: "#22d3ee",
          fontSize: "clamp(1.8em, 4vw, 2.8em)"
        }}
      >
        Botz, E-commerce con IA
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
          maxWidth: "1120px",
          height: layout.containerHeight,
          margin: layout.isMobile ? "0" : "0 auto"
        }}
      >
        {!layout.isMobile && (
          <svg className="flujo-e-svg" viewBox={`0 0 ${layout.containerWidth} ${layout.containerHeight}`} preserveAspectRatio="none">
            {steps.map((_, i) => {
              const current = layout.nodePositions[i];
              const next = layout.nodePositions[(i + 1) % steps.length];
              if (!current || !next) return null;
              return (
                <path
                  key={`link-${i}`}
                  className="flujo-e-line"
                  d={`M ${current.x} ${current.y} Q ${(current.x + next.x) / 2} ${(current.y + next.y) / 2} ${next.x} ${next.y}`}
                />
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
              width: "100%",
              maxWidth: "340px",
              height: "auto",
              margin: "0 auto 16px",
              padding: "12px",
              borderRadius: "16px",
              gap: "12px"
            };
          } else {
            const node = layout.nodePositions[i];
            const size = layout.nodeSize;
            nodeStyle = {
              left: node.x - size / 2,
              top: node.y - size / 2,
              position: "absolute",
              width: size,
              height: size
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
                  width: layout.isMobile ? "60px" : "72px",
                  height: layout.isMobile ? "60px" : "72px",
                  borderRadius: "50%",
                  background: "rgba(34, 211, 238, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
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

      <div className="ecom-live" aria-label="Llamada grabada y etapas">
        <div className="ecom-live-head">
          <div className="ecom-live-kicker">Llamada grabada + orquestacion por etapas</div>
          <div className="ecom-live-sub">Escucha una llamada real de ejemplo y observa como se conecta cada paso.</div>
        </div>

        <div className="ecom-call-scene">
          <div className="ecom-contact-card">
            <img src="/img/agent-icon.png" alt="Robot BOTZ" className="ecom-contact-photo" />
            <div className="ecom-contact-name">Botz Voice IA</div>
            <div className="ecom-contact-phone">+52 8900-9293</div>
            <div className="ecom-contact-actions">
              <span className="ok">📞</span>
              <span className="end">☎️</span>
            </div>
          </div>

          <div className="ecom-wave-wrap">
            <button className="ecom-audio-toggle" onClick={toggleAudio}>
              {isPlaying ? "Pausar llamada" : "Escuchar llamada real"}
            </button>
            <button className="ecom-play" onClick={toggleAudio} aria-label="Reproducir llamada">
              {isPlaying ? "❚❚" : "▶"}
            </button>
            <audio
              ref={audioRef}
              className="ecom-call-audio-hidden"
              preload="none"
              src="/audio/demo-llamada-botz.mp3"
              onError={() => setAudioAvailable(false)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            />
            <svg className="ecom-wave-svg" viewBox="0 0 900 220" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="ecom-wave-grad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.6" />
                  <stop offset="45%" stopColor="#22d3ee" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#f0abfc" stopOpacity="0.62" />
                </linearGradient>
              </defs>
              <path className="ecom-wave a" d="M0 120 C120 40, 220 45, 320 120 S520 195, 640 125 S820 50, 900 120" />
              <path className="ecom-wave b" d="M0 130 C130 70, 230 80, 320 128 S520 170, 640 130 S820 80, 900 130" />
              <path className="ecom-wave c" d="M0 115 C115 62, 220 70, 320 118 S520 165, 640 122 S820 62, 900 115" />
            </svg>
          </div>

          <div className="ecom-details-card">
            <div className="ecom-details-title">Conversacion real</div>
            <div className="ecom-details-line"><strong>Cliente:</strong> "Quiero saber si califico para credito"</div>
            <div className="ecom-details-line"><strong>BOTZ IA:</strong> "Perfecto, te hago 4 preguntas y te digo viabilidad"</div>
            <div className="ecom-details-line"><strong>Cliente:</strong> "Ingreso 2.4M y tengo 18% de cuota inicial"</div>
            <div className="ecom-details-line"><strong>BOTZ IA:</strong> "Perfil apto. Te agenda asesoria hoy a las 5:30 pm"</div>
          </div>
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
          <span>Procesamiento IA</span>
          <span>Validacion</span>
          <span>Cierre</span>
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
