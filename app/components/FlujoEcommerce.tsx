"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
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

type DemoLine = { speaker: "cliente" | "bot"; text: string };

const CALL_DEMOS = [
  {
    id: "reservas",
    label: "Agente de reservas",
    title: "Conversacion ejemplo: reserva",
    audioSrc: "/audio/demos/reserva-real.mp3",
    script: [
      { speaker: "cliente", text: "Hola, quiero reservar una mesa para esta noche." },
      { speaker: "bot", text: "Claro, con gusto. Te ayudo en menos de un minuto. Para cuantas personas seria la reserva?" },
      { speaker: "cliente", text: "Para cuatro personas, a las ocho de la noche." },
      { speaker: "bot", text: "Perfecto. Tengo disponibilidad a las ocho o a las ocho y treinta. Cual prefieres?" },
      { speaker: "cliente", text: "A las ocho esta bien." },
      { speaker: "bot", text: "Listo. Para confirmar la reserva, me compartes tu nombre y un numero de contacto?" },
      { speaker: "cliente", text: "Si, Laura Gomez, numero 300 555 0142." },
      { speaker: "bot", text: "Perfecto, Laura. Reserva confirmada para hoy a las ocho PM, mesa para cuatro personas. Te envio confirmacion y ubicacion por WhatsApp." },
      { speaker: "cliente", text: "Buenisimo, gracias." },
      { speaker: "bot", text: "Con gusto. Si llegas con retraso de mas de quince minutos, avisanos por este mismo canal para conservar la mesa." },
    ],
    preview: [
      { speaker: "Cliente", text: "Hola, quiero reservar una mesa para hoy" },
      { speaker: "BOTZ IA", text: "Perfecto. Para cuantas personas y a que hora te gustaria?" },
      { speaker: "Cliente", text: "Para 4 personas, a las 8:00 pm" },
      { speaker: "BOTZ IA", text: "Genial. Me compartes nombre y telefono para confirmar?" },
      { speaker: "Cliente", text: "Laura Gomez, 300 555 0142" },
      { speaker: "BOTZ IA", text: "Listo, reserva confirmada. Te envio la confirmacion por WhatsApp." },
    ],
  },
  {
    id: "ventas",
    label: "Agente de ventas",
    title: "Conversacion ejemplo: ventas consultiva",
    audioSrc: "/audio/demos/ventas-real.mp3",
    script: [
      { speaker: "cliente", text: "Hola, quiero automatizar WhatsApp para mi equipo comercial." },
      { speaker: "bot", text: "Perfecto. Te hago tres preguntas rapidas para recomendarte la mejor opcion. Cuantos leads reciben al mes?" },
      { speaker: "cliente", text: "Unos mil doscientos leads entre pauta y referidos." },
      { speaker: "bot", text: "Excelente. Con ese volumen, Botz puede responder, calificar y agendar de forma automatica. Te propongo una demo de quince minutos hoy o manana." },
      { speaker: "cliente", text: "Manana en la tarde." },
      { speaker: "bot", text: "Agendado para manana a las cuatro PM. Te envio invitacion y checklist por WhatsApp y correo." },
    ],
    preview: [
      { speaker: "Cliente", text: "Quiero automatizar WhatsApp para ventas" },
      { speaker: "BOTZ IA", text: "Perfecto. Cuantos leads reciben al mes y que canal usan mas?" },
      { speaker: "Cliente", text: "Cerca de 1200 leads al mes" },
      { speaker: "BOTZ IA", text: "Con ese volumen, te recomiendo demo de 15 minutos. Te agendo hoy o manana." },
    ],
  },
  {
    id: "soporte",
    label: "Agente de soporte",
    title: "Conversacion ejemplo: soporte al cliente",
    audioSrc: "/audio/demos/soporte-real.mp3",
    script: [
      { speaker: "cliente", text: "Hola, hice un pedido y todavia no me llega." },
      { speaker: "bot", text: "Te ayudo enseguida. Me compartes por favor tu numero de pedido?" },
      { speaker: "cliente", text: "Si, es el pedido C R M guion tres dos uno ocho." },
      { speaker: "bot", text: "Gracias. Ya lo valide: esta en ruta y llega hoy entre cuatro y seis PM. Quieres que te envie el link de seguimiento por WhatsApp?" },
      { speaker: "cliente", text: "Si, por favor." },
      { speaker: "bot", text: "Listo, enviado. Si no llega en esa ventana, te priorizo con un asesor humano de inmediato." },
    ],
    preview: [
      { speaker: "Cliente", text: "Mi pedido no llega" },
      { speaker: "BOTZ IA", text: "Te ayudo. Me compartes tu numero de pedido?" },
      { speaker: "Cliente", text: "Pedido CRM-3218" },
      { speaker: "BOTZ IA", text: "Esta en ruta, llega hoy 4-6 PM. Te envio seguimiento por WhatsApp." },
    ],
  },
] as const;

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

const pickBestVoice = (voices: SpeechSynthesisVoice[], role: "cliente" | "bot") => {
  const score = (v: SpeechSynthesisVoice) => {
    const name = String(v.name || "").toLowerCase();
    const lang = String(v.lang || "").toLowerCase();
    let s = 0;
    if (/es-/.test(lang)) s += 30;
    if (/es-mx|es-co|es-es|es-us/.test(lang)) s += 20;
    if (/natural|neural|online/.test(name)) s += 40;
    if (/microsoft|google/.test(name)) s += 18;
    if (role === "bot" && /helena|elena|dalia|laura|isabella|sofia|lucia|maria/.test(name)) s += 14;
    if (role === "cliente" && /pablo|jorge|carlos|diego|andres|mateo|sebastian/.test(name)) s += 12;
    return s;
  };

  return [...voices].sort((a, b) => score(b) - score(a))[0] || null;
};

export default function FlujoEcommerce() {
  const ALWAYS_SYNTHETIC_DEMO = true;
  const [selected, setSelected] = useState<number | null>(null);
  const [layout, setLayout] = useState(() => getEcommerceLayout(800));
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioAvailabilityByDemo, setAudioAvailabilityByDemo] = useState<Record<string, boolean>>({});
  const [demoId, setDemoId] = useState<(typeof CALL_DEMOS)[number]["id"]>("reservas");

  const activeDemo = CALL_DEMOS.find((d) => d.id === demoId) || CALL_DEMOS[0];
  const hasRealAudio = audioAvailabilityByDemo[activeDemo.id] !== false;

  const ttsVoices = useMemo(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return { clientVoice: null as SpeechSynthesisVoice | null, botVoice: null as SpeechSynthesisVoice | null };
    }
    const voices = window.speechSynthesis.getVoices();
    const esVoices = voices.filter((v) => String(v.lang || "").toLowerCase().startsWith("es"));
    const pool = esVoices.length ? esVoices : voices;
    if (!pool.length) {
      return { clientVoice: null as SpeechSynthesisVoice | null, botVoice: null as SpeechSynthesisVoice | null };
    }
    const botVoice = pickBestVoice(pool, "bot");
    const clientCandidates = pool.filter((v) => v.voiceURI !== botVoice?.voiceURI);
    const clientVoice = pickBestVoice(clientCandidates.length ? clientCandidates : pool, "cliente");
    return {
      clientVoice: clientVoice || null,
      botVoice: botVoice || null,
    };
  }, [demoId]);

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
    const script = activeDemo.script;

    setIsPlaying(true);
    let index = 0;

    const speakNext = () => {
      if (index >= script.length) {
        setIsPlaying(false);
        return;
      }

      const line = script[index];
      const utterance = new SpeechSynthesisUtterance(line.text);
      utterance.lang = "es-ES";
      utterance.rate = line.speaker === "bot" ? 0.97 : 1.01;
      utterance.pitch = line.speaker === "bot" ? 1.0 : 0.95;
      if (line.speaker === "bot" && ttsVoices.botVoice) utterance.voice = ttsVoices.botVoice;
      if (line.speaker === "cliente" && ttsVoices.clientVoice) utterance.voice = ttsVoices.clientVoice;
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
    if (ALWAYS_SYNTHETIC_DEMO && !hasRealAudio) {
      if (typeof window !== "undefined" && "speechSynthesis" in window && isPlaying) {
        window.speechSynthesis.cancel();
        setIsPlaying(false);
        return;
      }
      playSyntheticCall();
      return;
    }

    if (!hasRealAudio) {
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

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  }, [demoId]);

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
          <div className="ecom-live-kicker">Llamada demo + orquestacion por etapas</div>
          <div className="ecom-live-sub">Demos realistas de conversacion para mostrar calidad profesional.</div>
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
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
              <select
                value={demoId}
                onChange={(e) => setDemoId(e.target.value as (typeof CALL_DEMOS)[number]["id"])}
                style={{
                  flex: "1 1 230px",
                  minWidth: 200,
                  maxWidth: 320,
                  borderRadius: 10,
                  border: "1px solid rgba(34,211,238,0.35)",
                  background: "rgba(8,16,34,0.9)",
                  color: "#dbeafe",
                  padding: "9px 12px",
                  fontWeight: 700,
                }}
              >
                {CALL_DEMOS.map((d) => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </select>
              <button className="ecom-audio-toggle" onClick={toggleAudio} style={{ marginBottom: 0 }}>
                {isPlaying ? "Pausar demo" : `Escuchar ${activeDemo.label.toLowerCase()}`}
              </button>
            </div>
            <button className="ecom-play" onClick={toggleAudio} aria-label="Reproducir llamada">
              {isPlaying ? "❚❚" : "▶"}
            </button>
            <audio
              ref={audioRef}
              className="ecom-call-audio-hidden"
              preload="none"
              src={activeDemo.audioSrc}
              onError={() => setAudioAvailabilityByDemo((prev) => ({ ...prev, [activeDemo.id]: false }))}
              onCanPlay={() => setAudioAvailabilityByDemo((prev) => ({ ...prev, [activeDemo.id]: true }))}
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
            <div className="ecom-details-title">{activeDemo.title}</div>
            {activeDemo.preview.map((line, idx) => (
              <div key={`${line.speaker}-${idx}`} className="ecom-details-line">
                <strong>{line.speaker}:</strong> "{line.text}"
              </div>
            ))}
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
