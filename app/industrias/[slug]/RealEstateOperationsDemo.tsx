"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Play, RefreshCw, Volume2 } from "lucide-react";
import styles from "./healthOperationsDemo.module.css";

const copy = {
  es: {
    eyebrow: "DEMO DE OPERACIÓN INMOBILIARIA",
    title: "Sigue un mismo caso desde WhatsApp hasta el estudio hipotecario.",
    intro: "Una demostración sobre la herramienta BOTZ real con CRM, análisis IA, Kanban, canales, alertas, indicadores y financiación conectados.",
    play: "Reproducir desde el inicio",
    playing: "Demo reproduciéndose",
    sound: "Usa los controles para activar el sonido",
    contact: "Quiero diseñar mi operación inmobiliaria",
    note: "Demo de operaciones BOTZ",
    benefits: ["Caso unificado en CRM y Kanban", "WhatsApp y análisis BOTZ", "Viabilidad y cálculo hipotecario"],
  },
  en: {
    eyebrow: "REAL ESTATE OPERATIONS DEMO",
    title: "Follow one case from WhatsApp to mortgage analysis.",
    intro: "A demonstration on the real BOTZ tool, connecting CRM, AI analysis, Kanban, channels, alerts, metrics and financing.",
    play: "Play from the beginning",
    playing: "Demo playing",
    sound: "Use the controls to turn on sound",
    contact: "I want to design my real estate operation",
    note: "BOTZ operations demo",
    benefits: ["One case across CRM and Kanban", "WhatsApp and BOTZ analysis", "Mortgage feasibility and calculation"],
  },
} as const;

export default function RealEstateOperationsDemo({ trigger, onContact, language }: { trigger: number; onContact: () => void; language: "es" | "en" }) {
  const t = language === "en" ? copy.en : copy.es;
  const source = language === "en" ? "/botz-real-estate-operations-demo-en.mp4" : "/botz-real-estate-operations-demo.mp4";
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const playFromStart = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    void video.play();
  };

  useEffect(() => {
    videoRef.current?.load();
    setPlaying(false);
  }, [source]);

  useEffect(() => {
    if (trigger > 0) playFromStart();
  }, [trigger]);

  return (
    <section className={styles.section} id="real-estate-operations-demo">
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
        <video ref={videoRef} className={styles.video} src={source} controls loop playsInline preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
        <div className={styles.videoMeta}><span><Play size={13} /> {t.note}</span><span><Volume2 size={13} /> {t.sound}</span></div>
      </div>
    </section>
  );
}
