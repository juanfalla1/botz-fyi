"use client";

import React from "react";
import "./ArchitectureDiagram.css";
import useBotzLanguage from "@/app/start/hooks/useBotzLanguage";

type CoreCard = {
  title: string;
  subtitle: string;
  desc: string;
  accent: string;
};

const cardsEn: CoreCard[] = [
  {
    title: "Signal Capture",
    subtitle: "Multichannel intake",
    desc: "Leads, forms, calls and messages enter one intelligent context.",
    accent: "cyan",
  },
  {
    title: "Context Memory",
    subtitle: "Unified data layer",
    desc: "Every interaction updates client memory and business state in real time.",
    accent: "blue",
  },
  {
    title: "Reasoning Layer",
    subtitle: "Adaptive decisions",
    desc: "The core evaluates intent, urgency and best next action for each scenario.",
    accent: "emerald",
  },
  {
    title: "Execution Studio",
    subtitle: "Automated operations",
    desc: "Tasks are orchestrated across CRM, messaging, docs and internal tools.",
    accent: "indigo",
  },
  {
    title: "Live Response",
    subtitle: "Human-like delivery",
    desc: "Customers receive precise responses with seamless handoff when needed.",
    accent: "teal",
  },
];

const cardsEs: CoreCard[] = [
  {
    title: "Captura de Senales",
    subtitle: "Ingreso multicanal",
    desc: "Leads, formularios, llamadas y mensajes entran en un mismo contexto inteligente.",
    accent: "cyan",
  },
  {
    title: "Memoria Contextual",
    subtitle: "Capa unificada de datos",
    desc: "Cada interaccion actualiza la memoria del cliente y el estado del negocio.",
    accent: "blue",
  },
  {
    title: "Capa de Razonamiento",
    subtitle: "Decisiones adaptativas",
    desc: "El nucleo evalua intencion, urgencia y la mejor accion para cada caso.",
    accent: "emerald",
  },
  {
    title: "Studio de Ejecucion",
    subtitle: "Operacion automatizada",
    desc: "Las tareas se orquestan entre CRM, mensajeria, documentos y herramientas.",
    accent: "indigo",
  },
  {
    title: "Respuesta Viva",
    subtitle: "Entrega natural",
    desc: "Cada cliente recibe respuestas precisas con handoff humano cuando aplica.",
    accent: "teal",
  },
];

export default function ArchitectureDiagram() {
  const language = useBotzLanguage("en");
  const isEn = language === "en";
  const cards = isEn ? cardsEn : cardsEs;

  return (
    <section className="core-showcase" aria-label={isEn ? "Cognitive core" : "Nucleo cognitivo"}>
      <div className="core-bg-orb core-bg-orb-a" aria-hidden="true" />
      <div className="core-bg-orb core-bg-orb-b" aria-hidden="true" />

      <div className="core-header reveal-up">
        <p className="core-kicker">{isEn ? "COGNITIVE CORE" : "NUCLEO COGNITIVO"}</p>
        <h2>{isEn ? "Where intelligence becomes motion" : "Donde la inteligencia se convierte en movimiento"}</h2>
        <p>
          {isEn
            ? "A cinematic AI nucleus orchestrating context, decisions and execution with premium visual flow."
            : "Un nucleo de IA cinematografico que orquesta contexto, decisiones y ejecucion con un flujo visual premium."}
        </p>
      </div>

      <div className="core-stage reveal-up">
        <div className="core-lines" aria-hidden="true" />
        <div className="core-particles" aria-hidden="true" />

        <div className="core-center" role="img" aria-label={isEn ? "Animated AI core" : "Nucleo de IA animado"}>
          <div className="core-center-ring" />
          <div className="core-center-ring core-center-ring-soft" />
          <div className="core-center-dot" />
          <span>{isEn ? "AI Core" : "Nucleo IA"}</span>
        </div>

        {cards.map((card, index) => (
          <article
            key={card.title}
            className={`core-card core-card-${index + 1} accent-${card.accent} reveal-up`}
            style={{ animationDelay: `${index * 90}ms` }}
          >
            <div className="core-card-icon" aria-hidden="true">
              <i />
            </div>
            <h3>{card.title}</h3>
            <p className="core-card-subtitle">{card.subtitle}</p>
            <p className="core-card-desc">{card.desc}</p>
            <div className="core-card-visual" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
