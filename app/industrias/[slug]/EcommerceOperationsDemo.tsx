"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Play, RefreshCw, Volume2 } from "lucide-react";
import styles from "./healthOperationsDemo.module.css";

const copy = {
  es: {
    eyebrow: "DEMO COMMERCE OPERATIONS BOTZ",
    title: "Mira cómo BOTZ convierte una solicitud en una cotización lista para avanzar.",
    intro: "El agente interpreta la necesidad, consulta el catálogo, registra la oportunidad en CRM y prepara el siguiente paso comercial.",
    play: "Reproducir desde el inicio",
    playing: "Demo reproduciéndose",
    sound: "Usa los controles para activar el sonido",
    contact: "Quiero automatizar mi operación commerce",
    note: "Demo BOTZ · catálogo, cotización y CRM · 1:33 min",
    benefits: ["Solicitud y contexto del cliente", "Búsqueda de producto y cotización", "CRM, seguimiento y aprobación humana"],
  },
  en: {
    eyebrow: "BOTZ COMMERCE OPERATIONS DEMO",
    title: "See BOTZ turn a customer request into a quote ready to move forward.",
    intro: "The agent understands the need, searches the catalog, records the opportunity in CRM and prepares the next commercial step.",
    play: "Play from the beginning",
    playing: "Demo playing",
    sound: "Use the controls to turn on sound",
    contact: "I want to automate my commerce operation",
    note: "BOTZ demo · catalog, quotation and CRM · 1:33 min",
    benefits: ["Customer request and context", "Product search and quotation", "CRM, follow-up and human approval"],
  },
} as const;

export default function EcommerceOperationsDemo({ trigger, onContact, language }: { trigger: number; onContact: () => void; language: "es" | "en" }) {
  const t = language === "en" ? copy.en : copy.es;
  const source = language === "en" ? "/botz-commerce-operations-demo-en.mp4" : "/botz-commerce-operations-demo.mp4";
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
    <section className={styles.section} id="ecommerce-operations-demo">
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
