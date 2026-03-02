"use client";
import React, { useState } from "react";
import styles from "../styles/Hero.module.css";
import DemoModal from "./DemoModal";
import TextRotator from "./TextRotator";
import useBotzLanguage from "@/app/start/hooks/useBotzLanguage";

const Hero = () => {
  const [showModal, setShowModal] = useState(false);
  const language = useBotzLanguage("en");
  const t = language === "en"
    ? {
        title: "that transform your business",
        subtitle:
          "botz is your platform to scale business productivity with intelligent agents that automate tasks and decisions.",
        cta: "Try Live Demo",
        note: "Live demo - No card required",
        goTop: "Go to top",
        words: ["AI Agents", "Automation", "Intelligent Processes", "Workflows", "Integrations", "Chatbots"],
      }
    : {
        title: "que transforman tu negocio",
        subtitle:
          "botz es tu plataforma para transformar la productividad empresarial mediante agentes inteligentes que automatizan tareas y decisiones.",
        cta: "Prueba Demo en vivo",
        note: "Demo en vivo - Sin tarjeta",
        goTop: "Ir al inicio",
        words: ["Agentes IA", "Automatizacion", "Procesos Inteligentes", "Flujos de Trabajo", "Integraciones", "Chatbots"],
      };

  return (
    <section className={styles.hero}>
      <div className={styles.floatingElements}>
        <a href="#header">
          <div
            className={styles.floatingElement}
            style={{ width: 100, height: 100, top: "20%", left: "10%" }}
            title={t.goTop}
          />
        </a>
        <div
          className={styles.floatingElement}
          style={{ width: 150, height: 150, top: "60%", left: "80%" }}
        />
      </div>

      <div className={styles.heroContent}>
        <h2 className={styles.heroTitle} style={{ fontSize: "48px", fontWeight: "bold", lineHeight: 1.2, color: "#fff", marginBottom: "20px" }}>
          <div style={{ marginBottom: "8px" }}>
            <TextRotator
              words={t.words}
              prefix=""
              suffix=""
              highlightColor="#22d3ee"
              typingSpeed={50}
              deletingSpeed={25}
              pauseDuration={1500}
            />
          </div>
          <div>{t.title}</div>
        </h2>

        <p className={styles.heroSubtitle}>
          {t.subtitle}
        </p>

        <button
          className={styles.heroButton}
          onClick={() => setShowModal(true)}
        >
          {t.cta} <i className="fas fa-arrow-right"></i>
        </button>

        {/* 👇 TEXTO NUEVO (CLAVE PARA EL TRIAL) */}
        <p
          style={{
            marginTop: "12px",
            fontSize: "0.9rem",
            color: "rgba(255,255,255,0.8)",
          }}
        >
          {t.note}
        </p>
      </div>

      {showModal && <DemoModal onClose={() => setShowModal(false)} />}
    </section>
  );
};

export default Hero;
