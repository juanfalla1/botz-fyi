"use client";
import React, { useState } from "react";
import styles from "../styles/Hero.module.css";
import DemoModal from "./DemoModal";
import TextRotator from "./TextRotator";

const Hero = () => {
  const [showModal, setShowModal] = useState(false);

  return (
    <section className={styles.hero}>
      <div className={styles.floatingElements}>
        <a href="#header">
          <div
            className={styles.floatingElement}
            style={{ width: 100, height: 100, top: "20%", left: "10%" }}
            title="Ir al inicio"
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
              words={[
                "Agentes IA",
                "Automatización",
                "Procesos Inteligentes",
                "Flujos de Trabajo",
                "Integraciones",
                "Chatbots"
              ]}
              prefix=""
              suffix=""
              highlightColor="#22d3ee"
              typingSpeed={50}
              deletingSpeed={25}
              pauseDuration={1500}
            />
          </div>
          <div>que transforman tu negocio</div>
        </h2>

        <p className={styles.heroSubtitle}>
          botz es tu plataforma para transformar la productividad empresarial
          mediante agentes inteligentes que automatizan tareas y decisiones.
        </p>

        <button
          className={styles.heroButton}
          onClick={() => setShowModal(true)}
        >
          Prueba Demo en vivo <i className="fas fa-arrow-right"></i>
        </button>

        {/* 👇 TEXTO NUEVO (CLAVE PARA EL TRIAL) */}
        <p
          style={{
            marginTop: "12px",
            fontSize: "0.9rem",
            color: "rgba(255,255,255,0.8)",
          }}
        >
          Demo en vivo · Sin tarjeta
        </p>
      </div>

      {showModal && <DemoModal onClose={() => setShowModal(false)} />}
    </section>
  );
};

export default Hero;
