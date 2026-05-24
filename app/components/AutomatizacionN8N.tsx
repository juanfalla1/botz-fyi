"use client";

import React from "react";
import "./AutomatizacionN8N.css";
import useBotzLanguage from "@/app/start/hooks/useBotzLanguage";

type FlowStep = {
  title: string;
  subtitle: string;
  desc: string;
  kpi: string;
};

const flowEn: FlowStep[] = [
  {
    title: "Capture",
    subtitle: "Incoming demand",
    desc: "Leads and requests enter through web, voice and messaging channels.",
    kpi: "Realtime intake",
  },
  {
    title: "Understand",
    subtitle: "Context intelligence",
    desc: "AI identifies intent, urgency and profile to prioritize next best action.",
    kpi: "Smart qualification",
  },
  {
    title: "Orchestrate",
    subtitle: "Flow execution",
    desc: "Automations trigger CRM, notifications, scheduling and team tasks.",
    kpi: "Cross-platform sync",
  },
  {
    title: "Deliver",
    subtitle: "Actionable outcomes",
    desc: "Customers receive responses instantly while your operation updates itself.",
    kpi: "Visible impact",
  },
];

const flowEs: FlowStep[] = [
  {
    title: "Captura",
    subtitle: "Demanda entrante",
    desc: "Leads y solicitudes ingresan por web, voz y mensajeria en tiempo real.",
    kpi: "Ingreso en vivo",
  },
  {
    title: "Entiende",
    subtitle: "Inteligencia contextual",
    desc: "La IA detecta intencion, urgencia y perfil para priorizar la mejor accion.",
    kpi: "Calificacion inteligente",
  },
  {
    title: "Orquesta",
    subtitle: "Ejecucion automatizada",
    desc: "Los flujos activan CRM, notificaciones, agendas y tareas de equipo.",
    kpi: "Sincronizacion total",
  },
  {
    title: "Entrega",
    subtitle: "Resultado accionable",
    desc: "El cliente recibe respuesta inmediata mientras tu operacion se actualiza sola.",
    kpi: "Impacto visible",
  },
];

export default function AutomatizacionN8N() {
  const language = useBotzLanguage("en");
  const isEn = language === "en";
  const flow = isEn ? flowEn : flowEs;

  return (
    <section className="automation-cinematic" aria-label={isEn ? "Automation results" : "Resultados de automatizacion"}>
      <div className="automation-cinematic__header reveal-up">
        <p>{isEn ? "AUTOMATION STORY" : "STORYTELLING DE AUTOMATIZACION"}</p>
        <h2>{isEn ? "From signal to revenue, in one visual flow" : "De senal a resultado, en un solo flujo visual"}</h2>
        <span>
          {isEn
            ? "A premium horizontal narrative that shows how each action compounds into measurable business impact."
            : "Una narrativa horizontal premium que muestra como cada accion se convierte en impacto medible."}
        </span>
      </div>

      <div className="automation-cinematic__track reveal-up">
        <div className="automation-cinematic__line" aria-hidden="true" />
        {flow.map((step, index) => (
          <article key={step.title} className="automation-step" style={{ animationDelay: `${index * 110}ms` }}>
            <div className="automation-step__media" aria-hidden="true">
              <div className="automation-wave" />
              <div className="automation-bars">
                <span />
                <span />
                <span />
                <span />
              </div>
              <small>0{index + 1}</small>
            </div>
            <h3>{step.title}</h3>
            <p className="automation-step__subtitle">{step.subtitle}</p>
            <p className="automation-step__desc">{step.desc}</p>
            <div className="automation-step__kpi">{step.kpi}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
