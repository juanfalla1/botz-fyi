"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Play, RefreshCw, Volume2 } from "lucide-react";
import styles from "./healthOperationsDemo.module.css";

const copy = {
  es: {
    eyebrow: "DEMO DE OPERACIÓN ASISTENCIAL",
    title: "Mira cómo BOTZ coordina una operación de salud y bienestar.",
    intro: "Una vista de autorizaciones, documentación, profesionales, asistencias y tareas administrativas en un solo entorno.",
    play: "Reproducir desde el inicio",
    playing: "Demo reproduciéndose",
    sound: "Usa los controles para activar el sonido",
    contact: "Quiero diseñar mi flujo de atención",
    note: "Demo de operaciones BOTZ · 1:14 min",
    benefits: ["Documentación y autorizaciones", "Coordinación de profesionales", "Seguimiento administrativo"],
  },
  en: {
    eyebrow: "CARE OPERATIONS DEMO",
    title: "See how BOTZ coordinates a health and wellness operation.",
    intro: "A unified view of authorizations, documentation, professionals, attendance and administrative tasks.",
    play: "Play from the beginning",
    playing: "Demo playing",
    sound: "Use the controls to turn on sound",
    contact: "I want to design my care workflow",
    note: "BOTZ operations demo · 1:14 min",
    benefits: ["Documentation and authorizations", "Professional coordination", "Administrative follow-up"],
  },
} as const;

export default function HealthOperationsDemo({ trigger, onContact, language }: { trigger: number; onContact: () => void; language: "es" | "en" }) {
  const t = language === "en" ? copy.en : copy.es;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const playFromStart = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    void video.play();
  };

  useEffect(() => {
    if (trigger > 0) playFromStart();
  }, [trigger]);

  return (
    <section className={styles.section} id="health-operations-demo">
      <div className={styles.copy}>
        <span>{t.eyebrow}</span>
        <h2>{t.title}</h2>
        <p>{t.intro}</p>
        <ul>{t.benefits.map((benefit) => <li key={benefit}><Check size={14} /> {benefit}</li>)}</ul>
        <div className={styles.actions}>
          <button type="button" onClick={playFromStart}><RefreshCw size={15} /> {t.play}</button>
          <button type="button" onClick={onContact}>{t.contact} <ArrowRight size={15} /></button>
        </div>
      </div>
      <div className={styles.videoShell}>
        <div className={styles.videoTop}><strong>BOTZ</strong><span><i /> {playing ? t.playing : t.eyebrow}</span></div>
        <video ref={videoRef} className={styles.video} src="/botz-demo-comercial.mp4" controls muted loop playsInline preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
        <div className={styles.videoMeta}><span><Play size={13} /> {t.note}</span><span><Volume2 size={13} /> {t.sound}</span></div>
      </div>
    </section>
  );
}
