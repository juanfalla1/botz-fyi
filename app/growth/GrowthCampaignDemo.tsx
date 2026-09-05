"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Bot,
  CalendarCheck,
  Check,
  CircleDollarSign,
  MousePointerClick,
  Pause,
  Play,
  Search,
  Sparkles,
  Target,
  UserRoundCheck,
  Volume2,
  VolumeX,
} from "lucide-react";
import styles from "./growth.module.css";

type DemoLanguage = "es" | "en";

const demoCopy = {
  es: {
    eyebrow: "DEMO MULTICANAL · DATOS SIMULADOS",
    title: "Mira como una campana se convierte en una oportunidad real.",
    intro: "Una historia interactiva desde la inversion en Google y Meta hasta la conversacion, la cita y el ingreso atribuido.",
    play: "Reproducir demo",
    pause: "Pausar",
    restart: "Ver de nuevo",
    playing: "Simulacion en curso",
    ready: "Lista para reproducir",
    chapters: "Capitulos",
    result: "Resultado de la simulacion",
    galleryEyebrow: "COCKPIT DE CAMPANAS",
    galleryTitle: "La operacion completa, visible en un solo lugar.",
    galleryIntro: "Explora las pantallas que conectan campanas, rendimiento, atribucion y reportes automaticos.",
    galleryScreens: [
      { title: "Campanas multicanal", detail: "Controla estado, presupuesto, inversion y conversion desde una vista unificada." },
      { title: "Rendimiento y atribucion", detail: "Compara resultados, costo por adquisicion, ingresos y ROAS en tiempo real." },
      { title: "Reportes programados", detail: "Configura entregas recurrentes para que cada equipo reciba la informacion correcta." },
      { title: "Panel ejecutivo multicanal", detail: "Compara conversiones, sesiones, inversion e ingresos de todos tus canales." },
    ],
    stages: [
      { id: "launch", label: "Lanzamiento", kicker: "01 · PAUTA MULTICANAL", title: "Una campana. Dos motores de demanda.", description: "Google captura intencion activa. Meta crea descubrimiento y recupera visitantes. BOTZ Growth observa ambos canales desde el primer dolar.", metric: "$5,000", metricLabel: "Inversion demo" },
      { id: "signals", label: "Senales", kicker: "02 · LECTURA EN TIEMPO REAL", title: "Los clics no valen lo mismo.", description: "BOTZ compara busquedas, audiencias y anuncios. Detecta alto interes en Google y una creatividad de Meta que consume presupuesto sin generar conversaciones.", metric: "-18%", metricLabel: "Costo por oportunidad" },
      { id: "capture", label: "Captura", kicker: "03 · UNA PERSONA, TODO EL CONTEXTO", title: "Una senal se convierte en perfil.", description: "El sistema unifica formulario, clic, pagina visitada y fuente. Elimina duplicados y conserva la campana que origino la oportunidad.", metric: "87/100", metricLabel: "Intent score" },
      { id: "conversation", label: "Conversacion", kicker: "04 · RESPUESTA INMEDIATA", title: "BOTZ convierte interes en dialogo.", description: "El agente responde, entiende la necesidad, valida presupuesto y recomienda el siguiente paso sin hacer esperar al cliente.", metric: "8 sec", metricLabel: "Primera respuesta" },
      { id: "action", label: "Accion", kicker: "05 · DEL CHAT AL EQUIPO", title: "La oportunidad sale lista para avanzar.", description: "BOTZ agenda una reunion, asigna responsable y envia al CRM el contexto completo para que el equipo llegue preparado.", metric: "1 cita", metricLabel: "Accion confirmada" },
      { id: "revenue", label: "Atribucion", kicker: "06 · DEL ANUNCIO AL INGRESO", title: "Ahora sabes que inversion produjo negocio.", description: "La venta regresa a la campana de origen. BOTZ muestra costo, canal, recorrido y resultado para orientar la siguiente decision de presupuesto.", metric: "4.8x", metricLabel: "ROAS atribuido" },
    ],
    labels: {
      google: "Google Ads",
      meta: "Meta Ads",
      searchIntent: "Intencion activa",
      discovery: "Descubrimiento",
      highIntent: "Alta intencion",
      lowConversion: "Baja conversion",
      budgetMoved: "Presupuesto optimizado",
      newLead: "Nueva oportunidad",
      source: "Fuente",
      interest: "Interes",
      timeline: "Compra estimada",
      customer: "Necesito informacion y quiero hablar con alguien.",
      bot: "Claro. Primero validemos lo que necesitas para conectarte con el especialista correcto.",
      qualified: "Oportunidad calificada",
      meeting: "Reunion confirmada",
      crm: "CRM actualizado",
      campaign: "Campana",
      opportunity: "Oportunidad",
      conversion: "Conversion",
      revenue: "Ingreso",
      before: "Antes: canales y ventas desconectados",
      after: "Con BOTZ: campana → conversacion → conversion",
    },
  },
  en: {
    eyebrow: "MULTICHANNEL DEMO · SIMULATED DATA",
    title: "Watch a campaign become a real opportunity.",
    intro: "An interactive story from Google and Meta investment to conversation, meeting and attributed revenue.",
    play: "Play demo",
    pause: "Pause",
    restart: "Watch again",
    playing: "Simulation running",
    ready: "Ready to play",
    chapters: "Chapters",
    result: "Simulation outcome",
    galleryEyebrow: "CAMPAIGN COCKPIT",
    galleryTitle: "The complete operation, visible in one place.",
    galleryIntro: "Explore the screens connecting campaigns, performance, attribution and automated reporting.",
    galleryScreens: [
      { title: "Multichannel campaigns", detail: "Control status, budget, spend and conversions from one unified view." },
      { title: "Performance and attribution", detail: "Compare results, acquisition cost, revenue and ROAS in real time." },
      { title: "Scheduled reports", detail: "Set recurring deliveries so every team receives the right information." },
      { title: "Multichannel executive dashboard", detail: "Compare conversions, sessions, spend and revenue across every channel." },
    ],
    stages: [
      { id: "launch", label: "Launch", kicker: "01 · MULTICHANNEL MEDIA", title: "One campaign. Two demand engines.", description: "Google captures active intent. Meta creates discovery and recovers visitors. BOTZ Growth watches both channels from the first dollar.", metric: "$5,000", metricLabel: "Demo investment" },
      { id: "signals", label: "Signals", kicker: "02 · REAL-TIME READING", title: "Not every click is worth the same.", description: "BOTZ compares searches, audiences and ads. It finds strong Google intent and a Meta creative spending budget without starting conversations.", metric: "-18%", metricLabel: "Cost per opportunity" },
      { id: "capture", label: "Capture", kicker: "03 · ONE PERSON, FULL CONTEXT", title: "A signal becomes a profile.", description: "The system unifies form, click, visited page and source. It removes duplicates and keeps the campaign that originated the opportunity.", metric: "87/100", metricLabel: "Intent score" },
      { id: "conversation", label: "Conversation", kicker: "04 · IMMEDIATE RESPONSE", title: "BOTZ turns interest into dialogue.", description: "The agent responds, understands the need, validates budget and recommends the next step without making the customer wait.", metric: "8 sec", metricLabel: "First response" },
      { id: "action", label: "Action", kicker: "05 · FROM CHAT TO TEAM", title: "The opportunity is ready to move.", description: "BOTZ schedules a meeting, assigns an owner and sends full context to the CRM so the team arrives prepared.", metric: "1 meeting", metricLabel: "Confirmed action" },
      { id: "revenue", label: "Attribution", kicker: "06 · FROM AD TO REVENUE", title: "Now you know which investment produced business.", description: "The sale returns to its source campaign. BOTZ shows cost, channel, journey and outcome to guide the next budget decision.", metric: "4.8x", metricLabel: "Attributed ROAS" },
    ],
    labels: {
      google: "Google Ads",
      meta: "Meta Ads",
      searchIntent: "Active intent",
      discovery: "Discovery",
      highIntent: "High intent",
      lowConversion: "Low conversion",
      budgetMoved: "Budget optimized",
      newLead: "New opportunity",
      source: "Source",
      interest: "Interest",
      timeline: "Estimated purchase",
      customer: "I need more information and want to speak with someone.",
      bot: "Of course. Let us validate what you need so I can connect you with the right specialist.",
      qualified: "Qualified opportunity",
      meeting: "Meeting confirmed",
      crm: "CRM updated",
      campaign: "Campaign",
      opportunity: "Opportunity",
      conversion: "Conversion",
      revenue: "Revenue",
      before: "Before: channels and sales disconnected",
      after: "With BOTZ: campaign → conversation → conversion",
    },
  },
} as const;

const productScreens = [
  "/audio/audio/demo/campaigns-botz.png",
  "/audio/audio/demo/performance-botz.png",
  "/audio/audio/demo/reports-botz.png",
  "/audio/audio/demo/dashboard-botz.png",
] as const;

function SceneVisual({ scene, labels }: { scene: string; labels: typeof demoCopy.es.labels | typeof demoCopy.en.labels }) {
  if (scene === "launch") {
    return <div className={styles.demoLaunch}>
      <div className={styles.channelPanel}><span className={styles.googleMark}>G</span><div><small>{labels.google}</small><strong>{labels.searchIntent}</strong></div><em>52%</em></div>
      <div className={styles.demoMerge}><i /><span>BOTZ<br />GROWTH</span><i /></div>
      <div className={styles.channelPanel}><span className={styles.metaMark}>M</span><div><small>{labels.meta}</small><strong>{labels.discovery}</strong></div><em>48%</em></div>
    </div>;
  }

  if (scene === "signals") {
    return <div className={styles.signalBoard}>
      <div className={styles.signalRow}><span className={styles.googleMark}>G</span><strong>{labels.highIntent}</strong><div><i style={{ width: "82%" }} /></div><em>3.9%</em></div>
      <div className={styles.signalRow}><span className={styles.metaMark}>M</span><strong>{labels.lowConversion}</strong><div><i style={{ width: "34%" }} /></div><em>0.8%</em></div>
      <div className={styles.optimizationPulse}><Sparkles size={16} /><span>{labels.budgetMoved}</span><ArrowUpRight size={17} /></div>
    </div>;
  }

  if (scene === "capture") {
    return <div className={styles.profileScene}>
      <div className={styles.profileAvatar}>AM</div>
      <div className={styles.profileData}><small>{labels.newLead}</small><strong>Alex Morgan</strong><span>{labels.source}<b>Google Search</b></span><span>{labels.interest}<b>Premium solution</b></span><span>{labels.timeline}<b>30 days</b></span></div>
      <div className={styles.scoreDial}><span>87</span><small>INTENT</small></div>
    </div>;
  }

  if (scene === "conversation") {
    return <div className={styles.conversationScene}>
      <div className={styles.messageCustomer}>{labels.customer}</div>
      <div className={styles.messageBot}><Bot size={18} /><span>{labels.bot}</span></div>
      <div className={styles.typingDots}><i /><i /><i /></div>
    </div>;
  }

  if (scene === "action") {
    return <div className={styles.actionScene}>
      <div className={styles.actionNode}><UserRoundCheck /><span>{labels.qualified}</span><Check /></div>
      <div className={styles.actionLine}><i /></div>
      <div className={styles.actionNode}><CalendarCheck /><span>{labels.meeting}</span><Check /></div>
      <div className={styles.actionLine}><i /></div>
      <div className={styles.actionNode}><Target /><span>{labels.crm}</span><Check /></div>
    </div>;
  }

  return <div className={styles.revenueScene}>
    <div className={styles.revenuePath}>
      <div><Search /><span>{labels.campaign}</span><strong>$1,040</strong></div><i />
      <div><MousePointerClick /><span>{labels.opportunity}</span><strong>$38</strong></div><i />
      <div><UserRoundCheck /><span>{labels.conversion}</span><strong>1</strong></div><i />
      <div><CircleDollarSign /><span>{labels.revenue}</span><strong>$5,000</strong></div>
    </div>
    <div className={styles.attributionCompare}><span>{labels.before}</span><strong>{labels.after}</strong></div>
  </div>;
}

export default function GrowthCampaignDemo({ language }: { language: DemoLanguage }) {
  const content = demoCopy[language];
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sceneProgress, setSceneProgress] = useState(0);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(language === "es" ? 42 : 37);
  const [isMuted, setIsMuted] = useState(false);
  const safeSceneIndex = Math.min(Math.max(sceneIndex, 0), content.stages.length - 1);
  const scene = content.stages[safeSceneIndex] || content.stages[0];
  const audioSrc = language === "es" ? "/audio/growth-campaign-demo-es.mp3" : "/audio/growth-campaign-demo-en.mp3";

  useEffect(() => {
    setSceneIndex(0);
    setSceneProgress(0);
    setAudioProgress(0);
    setAudioDuration(language === "es" ? 42 : 37);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.load();
    }
  }, [language]);

  const selectScene = (index: number) => {
    setSceneIndex(index);
    setSceneProgress(0);
    const audio = audioRef.current;
    if (audio && Number.isFinite(audio.duration)) {
      audio.currentTime = (index / content.stages.length) * audio.duration;
      setAudioProgress((audio.currentTime / audio.duration) * 100);
    }
  };

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      return;
    }
    if (audio.ended || audioProgress >= 100) {
      audio.currentTime = 0;
      setSceneIndex(0);
      setSceneProgress(0);
      setAudioProgress(0);
    }
    audio.play().catch(() => setIsPlaying(false));
  };

  const formatTime = (seconds: number) => {
    const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.round(seconds)) : 0;
    return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, "0")}`;
  };

  return <section className={styles.campaignDemoSection} aria-labelledby="campaign-demo-title">
    <div className={styles.demoIntro}>
      <span>{content.eyebrow}</span>
      <h2 id="campaign-demo-title">{content.title}</h2>
      <p>{content.intro}</p>
    </div>

    <div className={styles.demoCinema}>
      <div className={styles.cinemaTopbar}>
        <div><i /><i /><i /></div>
        <span><b /> {isPlaying ? content.playing : content.ready}</span>
        <em>BOTZ GROWTH / DEMO 01</em>
      </div>

      <div className={styles.cinemaStage} key={`${language}-${scene.id}`}>
        <div className={styles.sceneCopy}>
          <span>{scene.kicker}</span>
          <h3>{scene.title}</h3>
          <p>{scene.description}</p>
          <div className={styles.sceneMetric}><strong>{scene.metric}</strong><small>{scene.metricLabel}</small></div>
        </div>
        <div className={styles.sceneVisual}><SceneVisual scene={scene.id} labels={content.labels} /></div>
        <div className={styles.sceneNumber}>0{sceneIndex + 1}</div>
      </div>

      <div className={styles.cinemaControls}>
        <button type="button" onClick={togglePlayback} aria-label={isPlaying ? content.pause : content.play}>
          {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
        </button>
        <span>{isPlaying ? content.pause : sceneProgress === 100 ? content.restart : content.play}</span>
        <button className={styles.muteButton} type="button" onClick={() => {
          const nextMuted = !isMuted;
          setIsMuted(nextMuted);
          if (audioRef.current) audioRef.current.muted = nextMuted;
        }} aria-label={isMuted ? "Enable sound" : "Mute sound"}>
          {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </button>
        <input
          className={styles.videoProgress}
          type="range"
          min="0"
          max="100"
          value={audioProgress}
          aria-label="Narration progress"
          style={{ "--growth-audio-progress": `${audioProgress}%` } as React.CSSProperties}
          onChange={(event) => {
            const next = Number(event.target.value);
            const audio = audioRef.current;
            if (audio && Number.isFinite(audio.duration)) audio.currentTime = (next / 100) * audio.duration;
            setAudioProgress(next);
          }}
        />
        <time>{formatTime((audioProgress / 100) * audioDuration)} / {formatTime(audioDuration)}</time>
      </div>

      <audio
        ref={audioRef}
        src={audioSrc}
        preload="metadata"
        onLoadedMetadata={(event) => setAudioDuration(event.currentTarget.duration || audioDuration)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setAudioProgress(100);
          setSceneProgress(100);
          setSceneIndex(content.stages.length - 1);
        }}
        onTimeUpdate={(event) => {
          const audio = event.currentTarget;
          if (!audio.duration) return;
          const totalProgress = audio.currentTime / audio.duration;
          const rawScene = Math.min(Math.floor(totalProgress * content.stages.length), content.stages.length - 1);
          const progressWithinScene = ((totalProgress * content.stages.length) - rawScene) * 100;
          setAudioProgress(totalProgress * 100);
          setSceneIndex(rawScene);
          setSceneProgress(progressWithinScene);
        }}
      />

      <div className={styles.chapterRail}>
        <span>{content.chapters}</span>
        <div>{content.stages.map((item, index) => <button key={item.id} type="button" className={index === sceneIndex ? styles.activeChapter : ""} onClick={() => selectScene(index)}><i /><span>0{index + 1}</span><strong>{item.label}</strong></button>)}</div>
      </div>
    </div>

    <div className={styles.demoDisclaimer}><Sparkles size={14} /><span>{content.result}: Google + Meta → BOTZ → CRM → revenue. {language === "es" ? "Datos demostrativos; no usa cuentas ni conexiones reales." : "Demonstration data; no real accounts or connections are used."}</span></div>
    <div className={styles.productGallery}>
      <div className={styles.productGalleryHeading}>
        <span>{content.galleryEyebrow}</span>
        <h3>{content.galleryTitle}</h3>
        <p>{content.galleryIntro}</p>
      </div>
      <div className={styles.productScreenGrid}>
        {content.galleryScreens.map((screen, index) => (
          <figure className={styles.productScreenCard} key={`${screen.title}-${index}`}>
            <div className={styles.productScreenImage}>
              <img src={productScreens[index]} alt={`${screen.title} — BOTZ Growth`} loading="lazy" />
              <span>0{index + 1}</span>
            </div>
            <figcaption>
              <strong>{screen.title}</strong>
              <p>{screen.detail}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  </section>;
}
