"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, ExternalLink, Play, RefreshCw, Volume2 } from "lucide-react";
import styles from "./restaurantOperationsDemo.module.css";

const copy = {
  es: {
    eyebrow: "RESTAURANTOS · DEMO OPERATIVO",
    title: "Mira cómo RestaurantOS conecta toda la operación del restaurante.",
    intro: "Un recorrido real por pedidos, cocina, reservas, menú, pagos, empleados, reportes, Copilot, configuración y delivery.",
    play: "Reproducir desde el inicio",
    playing: "Demo reproduciéndose",
    sound: "Activa el sonido para escuchar la narración",
    contact: "Quiero RestaurantOS en mi negocio",
    open: "Abrir RestaurantOS",
    note: "Demo RestaurantOS · 2:23 min",
    benefits: ["Operación y servicio en tiempo real", "Pagos, equipo y reportes conectados", "Copilot y delivery en una sola plataforma"],
  },
  en: {
    eyebrow: "RESTAURANTOS · OPERATIONS DEMO",
    title: "See how RestaurantOS connects the entire restaurant operation.",
    intro: "A real walkthrough of orders, kitchen, reservations, menu, payments, employees, reports, Copilot, settings and delivery.",
    play: "Play from the beginning",
    playing: "Demo playing",
    sound: "Turn on sound to hear the narration",
    contact: "I want RestaurantOS for my business",
    open: "Open RestaurantOS",
    note: "RestaurantOS demo · 2:23 min",
    benefits: ["Real-time operations and service", "Connected payments, team and reports", "Copilot and delivery in one platform"],
  },
} as const;

export default function RestaurantOperationsDemo({ trigger, onContact, language }: { trigger: number; onContact: () => void; language: "es" | "en" }) {
  const t = language === "en" ? copy.en : copy.es;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const source = language === "en" ? "/botz-restaurantos-demo-en.mp4" : "/botz-restaurantos-demo.mp4";

  const playFromStart = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    video.muted = false;
    void video.play();
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.load();
    setPlaying(false);
  }, [source]);

  useEffect(() => {
    if (trigger > 0) playFromStart();
  }, [trigger]);

  return (
    <section className={styles.section} id="restaurant-operations-demo">
      <div className={styles.copy}>
        <span>{t.eyebrow}</span>
        <h2>{t.title}</h2>
        <p>{t.intro}</p>
        <ul>{t.benefits.map((benefit) => <li key={benefit}><Check size={14} /> {benefit}</li>)}</ul>
        <div className={styles.actions}>
          <button type="button" onClick={playFromStart}><RefreshCw size={15} /> {t.play}</button>
          <button type="button" onClick={onContact}>{t.contact} <ArrowRight size={15} /></button>
          <a href="https://restaurantos.botz.fyi" target="_blank" rel="noreferrer">{t.open} <ExternalLink size={14} /></a>
        </div>
      </div>

      <div className={styles.videoShell}>
        <div className={styles.videoTop}><strong>RestaurantOS</strong><span><i /> {playing ? t.playing : t.eyebrow}</span></div>
        <video
          ref={videoRef}
          className={styles.video}
          src={source}
          controls
          playsInline
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
        <div className={styles.videoMeta}><span><Play size={13} /> {t.note}</span><span><Volume2 size={13} /> {t.sound}</span></div>
      </div>
    </section>
  );
}
