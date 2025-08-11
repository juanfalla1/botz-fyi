"use client";
import React, { useState } from "react";
import styles from "../styles/Hero.module.css";
import DemoModal from "./DemoModal";

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
        <h2 className={styles.heroTitle}>
          Automatización inteligente de procesos con IA
        </h2>
        <p className={styles.heroSubtitle}>
          botz es tu plataforma para transformar la productividad empresarial
          mediante agentes inteligentes que automatizan tareas y decisiones.
        </p>
        <button
          className={styles.heroButton}
          onClick={() => setShowModal(true)}
        >
          Solicitar Demo <i className="fas fa-arrow-right"></i>
        </button>
      </div>

      {showModal && <DemoModal onClose={() => setShowModal(false)} />}
    </section>
  );
};

export default Hero;


