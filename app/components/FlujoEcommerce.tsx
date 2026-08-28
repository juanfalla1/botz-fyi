"use client";
import React, { useEffect, useRef, useState } from "react";
import "./FlujoEcommerce.css";
import useBotzLanguage from "@/app/start/hooks/useBotzLanguage";

const stepsEn = [
  {
    title: "Demand Radar",
    desc: "Detect upcoming demand spikes before they impact inventory.",
    usecase: "Botz warns your team early so top products never go out of stock.",
    image: "/img/Calificador de Leads IA.png",
    video: "/fondo-animado.mp4",
    focalY: "30%",
    scale: 1
  },
  {
    title: "Live Operations",
    desc: "Sales, shipping and customer messages are tracked in one live panel.",
    usecase: "If a delivery is delayed, Botz notifies the customer and updates status instantly.",
    image: "/img/soporte al cliente.png",
    video: "/fondo-animado.mp4",
    focalY: "30%",
    scale: 1
  },
  {
    title: "Smart Personalization",
    desc: "Every visitor receives recommendations based on behavior and intent.",
    usecase: "Cart value increases with relevant upsells at checkout.",
    image: "/img/seguimiento de ventas.png",
    video: "/fondo-animado.mp4",
    focalY: "30%",
    scale: 1
  },
  {
    title: "Payment Recovery",
    desc: "Failed charges are recovered with automatic retries and follow-ups.",
    usecase: "Botz recovers lost revenue without manual chasing.",
    image: "/img/cobranza.png",
    video: "/fondo-animado.mp4",
    focalY: "30%",
    scale: 1
  },
  {
    title: "Automatic Closing",
    desc: "Each order closes with confirmation, CRM update and post-sale flow.",
    usecase: "Customers receive instant confirmation while your team sees the sale in real time.",
    image: "/img/Recepcionista.png",
    video: "/fondo-animado.mp4",
    focalY: "34%",
    scale: 0.98
  }
];

const CALL_DEMOS_EN = [
  {
    id: "discovering-botz",
    label: "Discovering BOTZ",
    title: "What BOTZ is and how it helps companies",
    audioSrc: "/audio/audio/demo/que%20hace%20botz.wav",
    duration: "2:34",
    outcome: "Discovery scheduled",
    eyebrow: "BOTZ overview",
    preview: [
      { speaker: "Operations Manager", text: "What does BOTZ actually do?" },
      { speaker: "BOTZ AI", text: "BOTZ combines AI agents, CRM and workflow automation to execute repetitive work." },
      { speaker: "Operations Manager", text: "Which process should we automate first?" },
      { speaker: "BOTZ AI", text: "Start where delays, repeated steps or lost opportunities create the most friction." },
      { speaker: "Operations Manager", text: "Our new leads sometimes wait hours for a response." },
      { speaker: "BOTZ AI", text: "BOTZ can respond, qualify and route each opportunity immediately." },
    ],
  },
  {
    id: "purchase-orders",
    label: "Purchase Order Automation",
    title: "Finding and removing an approval bottleneck",
    audioSrc: "/audio/audio/demo/Purchase%20Order%20Automation.wav",
    duration: "2:32",
    outcome: "Bottleneck removed",
    eyebrow: "Process automation",
    preview: [
      { speaker: "Procurement Manager", text: "Purchase orders can sit for three days without approval." },
      { speaker: "BOTZ AI", text: "Requests enter incomplete and approvals depend on someone checking email." },
      { speaker: "Procurement Manager", text: "We thought the procurement team was understaffed." },
      { speaker: "BOTZ AI", text: "BOTZ validates each request, routes approval and escalates delays automatically." },
      { speaker: "Procurement Manager", text: "Can managers still reject or request changes?" },
      { speaker: "BOTZ AI", text: "Yes. Human control remains while repetitive checking and follow-up disappear." },
    ],
  },
] as const;

const stepsEs = [
  { title: "Radar de Demanda", desc: "Detecta picos de compra antes de que afecten tu inventario.", usecase: "Botz alerta a tu equipo para que no se agoten los productos clave.", image: "/img/Calificador de Leads IA.png", video: "/fondo-animado.mp4", focalY: "30%", scale: 1 },
  { title: "Operacion en Vivo", desc: "Ventas, envios y mensajes de clientes en una sola vista en tiempo real.", usecase: "Si hay retraso, Botz avisa al cliente y actualiza el estado al instante.", image: "/img/soporte al cliente.png", video: "/fondo-animado.mp4", focalY: "30%", scale: 1 },
  { title: "Personalizacion Inteligente", desc: "Cada visitante recibe recomendaciones segun su comportamiento.", usecase: "Aumenta el ticket promedio con sugerencias relevantes al pagar.", image: "/img/seguimiento de ventas.png", video: "/fondo-animado.mp4", focalY: "30%", scale: 1 },
  { title: "Recuperacion de Pagos", desc: "Los pagos fallidos se recuperan con reintentos y seguimiento automatico.", usecase: "Botz recupera ingresos perdidos sin trabajo manual.", image: "/img/cobranza.png", video: "/fondo-animado.mp4", focalY: "30%", scale: 1 },
  { title: "Cierre Automatico", desc: "Cada compra se cierra con confirmacion y actualizacion en CRM.", usecase: "El cliente recibe confirmacion inmediata y tu equipo ve la venta en tiempo real.", image: "/img/Recepcionista.png", video: "/fondo-animado.mp4", focalY: "34%", scale: 0.98 },
];

const CALL_DEMOS_ES = [
  {
    id: "reservas",
    label: "Agente de reservas",
    title: "Conversacion ejemplo: reserva",
    audioSrc: "/audio/audio/demo/mesa%20para%204.wav",
    duration: "0:27",
    outcome: "Reserva confirmada",
    eyebrow: "Hospitalidad",
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
    audioSrc: "/audio/audio/demo/agenda%20botz.wav",
    duration: "0:51",
    outcome: "Demo agendada",
    eyebrow: "Ventas",
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
    audioSrc: "/audio/audio/demo/Soporte.wav",
    duration: "2:11",
    outcome: "Caso resuelto",
    eyebrow: "Servicio al cliente",
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
  {
    id: "procesos",
    label: "Analista de procesos",
    title: "Conversacion ejemplo: deteccion de cuello de botella",
    audioSrc: "/audio/audio/demo/cotizacion.wav",
    duration: "3:15",
    outcome: "Cuello de botella encontrado",
    eyebrow: "Operaciones",
    script: [
      { speaker: "cliente", text: "Las cotizaciones tardan hasta dos dias y estamos perdiendo clientes." },
      { speaker: "bot", text: "Antes de automatizar, quiero identificar donde se detiene realmente el proceso." },
      { speaker: "cliente", text: "Las solicitudes llegan incompletas y copiamos varias veces la misma informacion." },
      { speaker: "bot", text: "Ese es el cuello de botella: reprocesos y solicitudes detenidas sin responsable ni alerta." },
    ],
    preview: [
      { speaker: "Gerente", text: "Las cotizaciones tardan hasta dos dias" },
      { speaker: "BOTZ IA", text: "El retraso comienza antes del precio: las solicitudes llegan incompletas" },
      { speaker: "Gerente", text: "Pensabamos que necesitabamos contratar otra persona" },
      { speaker: "BOTZ IA", text: "Primero eliminamos el reproceso y luego automatizamos la friccion exacta" },
    ],
  },
] as const;

export default function FlujoEcommerce() {
  const language = useBotzLanguage("en");
  const isEn = language === "en";
  const steps = isEn ? stepsEn : stepsEs;
  const CALL_DEMOS = isEn ? CALL_DEMOS_EN : CALL_DEMOS_ES;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioAvailabilityByDemo, setAudioAvailabilityByDemo] = useState<Record<string, boolean>>({});
  const [demoId, setDemoId] = useState<string>("reservas");
  const [progress, setProgress] = useState(0);

  const activeDemo = CALL_DEMOS.find((d) => d.id === demoId) || CALL_DEMOS[0];
  const hasRealAudio = audioAvailabilityByDemo[activeDemo.id] !== false;
  const toggleAudio = () => {
    if (!hasRealAudio) {
      setIsPlaying(false);
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
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setProgress(0);
  }, [demoId]);

  useEffect(() => {
    setDemoId(isEn ? "discovering-botz" : "reservas");
  }, [isEn]);

  return (
    <section style={{ margin: "54px 0 54px 0", padding: "0 1rem" }}>
      <h2
        className="section-title"
        style={{
          color: "#22d3ee",
          fontSize: "clamp(1.8em, 4vw, 2.8em)"
        }}
      >
        {isEn ? "Botz AI for E-commerce" : "Botz, E-commerce con IA"}
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
        {isEn ? "Discover how technology connects and automates every stage of modern e-commerce." : "Descubre como la tecnologia conecta y automatiza cada etapa del ecommerce moderno."}
      </p>
      <div className="ecom-process-grid" aria-label={isEn ? "E-commerce process cards" : "Cards de proceso ecommerce"}>
        {steps.map((step, i) => (
          <article key={`${step.title}-${i}`} className="ecom-process-card">
            <div className="ecom-process-media" aria-hidden="true">
              <video className="ecom-process-video" autoPlay muted loop playsInline preload="metadata">
                <source src={step.video} type="video/mp4" />
              </video>
              <img
                src={step.image}
                alt={step.title}
                style={{
                  objectPosition: `50% ${step.focalY || "30%"}`,
                  ["--img-scale" as any]: String(step.scale || 1),
                }}
              />
              <div className="ecom-process-shine" />
            </div>
            <div className="ecom-process-body">
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
              <span>{step.usecase}</span>
            </div>
          </article>
        ))}
      </div>

      <div className="ecom-live" aria-label={isEn ? "BOTZ voice conversations" : "Conversaciones de voz BOTZ"}>
        <div className="ecom-live-head">
          <div>
            <div className="ecom-live-kicker">{isEn ? "Listen to BOTZ at work" : "Escucha a BOTZ trabajando"}</div>
            <div className="ecom-live-sub">{isEn ? "Two real conversations. From the first request to a measurable outcome." : "Cuatro conversaciones reales. Desde la primera solicitud hasta un resultado medible."}</div>
          </div>
          <span className="ecom-live-badge"><i /> {isEn ? "Real recorded voices" : "Voces reales grabadas"}</span>
        </div>

        <div className="ecom-demo-tabs" role="tablist" aria-label={isEn ? "Choose a conversation" : "Elige una conversacion"} style={{ "--demo-count": CALL_DEMOS.length } as React.CSSProperties}>
          {CALL_DEMOS.map((demo, index) => (
            <button
              key={demo.id}
              type="button"
              role="tab"
              aria-selected={demo.id === activeDemo.id}
              className={`ecom-demo-tab ${demo.id === activeDemo.id ? "active" : ""}`}
              onClick={() => setDemoId(demo.id)}
            >
              <span className="ecom-demo-index">0{index + 1}</span>
              <span><small>{demo.eyebrow}</small><strong>{demo.label}</strong></span>
              <em>{demo.duration}</em>
            </button>
          ))}
        </div>

        <div className="ecom-call-scene">
          <div className={`ecom-voice-stage ${isPlaying ? "is-playing" : ""}`}>
            <div className="ecom-stage-top">
              <span className="ecom-stage-status"><i /> {isPlaying ? (isEn ? "Conversation playing" : "Conversacion en curso") : (isEn ? "Ready to listen" : "Lista para escuchar")}</span>
              <span>{activeDemo.duration}</span>
            </div>
            <div className="ecom-speakers" aria-hidden="true">
              <div className="ecom-speaker client"><span>{isEn ? "Customer" : "Cliente"}</span><i /></div>
              <div className="ecom-sound-bars">{Array.from({ length: 22 }, (_, i) => <i key={i} style={{ animationDelay: `${i * 55}ms` }} />)}</div>
              <div className="ecom-speaker bot"><span>BOTZ IA</span><i /></div>
            </div>
            <button className="ecom-play" onClick={toggleAudio} disabled={!hasRealAudio} aria-label={isPlaying ? (isEn ? "Pause conversation" : "Pausar conversacion") : (isEn ? "Play conversation" : "Reproducir conversacion")}>
              {isPlaying ? "❚❚" : "▶"}
            </button>
            <div className="ecom-player-copy">
              <small>{activeDemo.eyebrow}</small>
              <strong>{activeDemo.title}</strong>
            </div>
            <input
              className="ecom-progress"
              type="range"
              min="0"
              max="100"
              value={progress}
              aria-label={isEn ? "Audio progress" : "Progreso del audio"}
              style={{ "--audio-progress": `${progress}%` } as React.CSSProperties}
              onChange={(event) => {
                const next = Number(event.target.value);
                const audio = audioRef.current;
                if (audio && Number.isFinite(audio.duration)) audio.currentTime = (next / 100) * audio.duration;
                setProgress(next);
              }}
            />
            <audio
              ref={audioRef}
              className="ecom-call-audio-hidden"
              preload="metadata"
              src={activeDemo.audioSrc}
              onError={() => setAudioAvailabilityByDemo((prev) => ({ ...prev, [activeDemo.id]: false }))}
              onCanPlay={() => setAudioAvailabilityByDemo((prev) => ({ ...prev, [activeDemo.id]: true }))}
              onTimeUpdate={(event) => {
                const audio = event.currentTarget;
                setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0);
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => { setIsPlaying(false); setProgress(0); }}
            />
            {!hasRealAudio && <p className="ecom-audio-error">{isEn ? "Audio unavailable." : "Audio no disponible."}</p>}
          </div>

          <div className="ecom-details-card">
            <div className="ecom-details-head"><span>{isEn ? "Conversation highlights" : "Momentos clave"}</span><em>{activeDemo.outcome}</em></div>
            <div className="ecom-transcript">
              {activeDemo.preview.map((line, idx) => {
                const isBot = line.speaker.includes("BOTZ");
                return <div key={`${line.speaker}-${idx}`} className={`ecom-details-line ${isBot ? "bot" : "client"}`}><strong>{line.speaker}</strong><p>{line.text}</p></div>;
              })}
            </div>
            {isEn && <p className="ecom-language-note">Original English audio and transcript</p>}
          </div>
        </div>

        <div className="ecom-outcome-strip" aria-label={isEn ? "Conversation stages" : "Etapas de la conversacion"}>
          {[isEn ? "Listen" : "Escucha", isEn ? "Understand" : "Comprende", isEn ? "Act" : "Actua", activeDemo.outcome].map((label, index) => <div key={label} className={index === 3 ? "result" : ""}><span>0{index + 1}</span><strong>{label}</strong></div>)}
        </div>
      </div>

    </section>
  );
}
