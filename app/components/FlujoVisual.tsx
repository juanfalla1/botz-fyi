"use client";

import React from "react";
import "./FlujoVisual.css";
import useBotzLanguage from "@/app/start/hooks/useBotzLanguage";

type StoryCard = {
  title: string;
  subtitle: string;
  desc: string;
  metric: string;
  mediaLabel: string;
  tools: Array<{ name: string; logo: string }>;
};

const movingLogos = [
  { name: "n8n", logo: "https://cdn.simpleicons.org/n8n/EA4B71" },
  { name: "Zapier", logo: "https://cdn.simpleicons.org/zapier/FF4F00" },
  { name: "Make", logo: "https://cdn.simpleicons.org/make/6D3EF2" },
  { name: "Google Calendar", logo: "https://cdn.simpleicons.org/googlecalendar/4285F4" },
  { name: "Google Drive", logo: "https://cdn.simpleicons.org/googledrive/34A853" },
  { name: "Gmail", logo: "https://cdn.simpleicons.org/gmail/EA4335" },
  { name: "Google Sheets", logo: "https://cdn.simpleicons.org/googlesheets/34A853" },
  { name: "Slack", logo: "https://cdn.simpleicons.org/slack/6E41E2" },
];

const cardsEn: StoryCard[] = [
  {
    title: "Signal Intake",
    subtitle: "Every channel, one horizon",
    desc: "Incoming requests from web, paid traffic, WhatsApp and calls arrive in a single visual stream.",
    metric: "24/7 live capture",
    mediaLabel: "Input channels connected",
    tools: movingLogos,
  },
  {
    title: "Context Expansion",
    subtitle: "Memory that matters",
    desc: "Your CRM, history and customer intent are fused into one rich profile before any response is sent.",
    metric: "Unified client memory",
    mediaLabel: "Context sources in sync",
    tools: movingLogos,
  },
  {
    title: "Decision Engine",
    subtitle: "Precision over noise",
    desc: "The core ranks urgency, predicts conversion potential and chooses the best next move automatically.",
    metric: "Adaptive intelligence",
    mediaLabel: "Decision intelligence stack",
    tools: movingLogos,
  },
  {
    title: "Autonomous Execution",
    subtitle: "Action in motion",
    desc: "Follow-ups, scheduling, routing and internal tasks are triggered with cinematic fluidity.",
    metric: "Hands-free operations",
    mediaLabel: "Execution automations",
    tools: movingLogos,
  },
  {
    title: "Outcome Layer",
    subtitle: "Revenue-ready outputs",
    desc: "Each interaction ends as a measurable result: qualified lead, booked meeting or closed opportunity.",
    metric: "Business impact visible",
    mediaLabel: "Outcome dashboards",
    tools: movingLogos,
  },
];

const cardsEs: StoryCard[] = [
  {
    title: "Entrada de Senales",
    subtitle: "Todos los canales, un horizonte",
    desc: "Solicitudes desde web, pauta, WhatsApp y llamadas llegan en una sola corriente visual.",
    metric: "Captura 24/7 en vivo",
    mediaLabel: "Canales de entrada conectados",
    tools: movingLogos,
  },
  {
    title: "Expansion de Contexto",
    subtitle: "Memoria que realmente importa",
    desc: "Tu CRM, historial e intencion del cliente se fusionan en un perfil rico antes de responder.",
    metric: "Memoria unificada",
    mediaLabel: "Fuentes de contexto sincronizadas",
    tools: movingLogos,
  },
  {
    title: "Motor de Decisiones",
    subtitle: "Precision por encima del ruido",
    desc: "El nucleo prioriza urgencia, predice potencial de conversion y define la mejor accion.",
    metric: "Inteligencia adaptativa",
    mediaLabel: "Stack de decisiones IA",
    tools: movingLogos,
  },
  {
    title: "Ejecucion Autonoma",
    subtitle: "Accion en movimiento",
    desc: "Seguimientos, agendas, enrutamiento y tareas internas se activan con fluidez cinematografica.",
    metric: "Operacion manos libres",
    mediaLabel: "Automatizaciones de ejecucion",
    tools: movingLogos,
  },
  {
    title: "Capa de Resultados",
    subtitle: "Salida orientada a ingresos",
    desc: "Cada interaccion termina en resultado medible: lead calificado, cita o oportunidad cerrada.",
    metric: "Impacto visible",
    mediaLabel: "Dashboards de resultados",
    tools: movingLogos,
  },
];

export default function FlujoVisual() {
  const language = useBotzLanguage("en");
  const isEn = language === "en";
  const cards = isEn ? cardsEn : cardsEs;


  return (
    <section className="cognitive-story">
      <div className="cognitive-story__header reveal-up">
        <p>{isEn ? "VISUAL STORYTELLING" : "STORYTELLING VISUAL"}</p>
        <h2>{isEn ? "A cognitive flow designed like a premium film sequence" : "Un flujo cognitivo disenado como una secuencia cinematografica premium"}</h2>
        <span>
          {isEn
            ? "No technical diagrams. Just a living narrative of how AI turns raw demand into high-value outcomes."
            : "Sin diagramas tecnicos. Solo una narrativa viva de como la IA transforma demanda en resultados de alto valor."}
        </span>
      </div>

      <div className="cognitive-story__grid">
        {cards.map((card, i) => (
          <article key={card.title} className="cognitive-story-card reveal-up" style={{ animationDelay: `${i * 90}ms` }}>
            <div className="cognitive-story-card__media" aria-hidden="true">
              <div className="cognitive-story-card__scan" />
              <div className="cognitive-story-card__dots">
                <span />
                <span />
                <span />
              </div>
              <div className="cognitive-story-card__label">{card.mediaLabel}</div>
              <div className="cognitive-story-card__tool-marquee">
                <div className="cognitive-story-card__tool-track">
                  {[...card.tools, ...card.tools, ...card.tools].map((tool, idx) => (
                    <div key={`${tool.name}-${idx}`} className="cognitive-story-card__tool-chip">
                      <img
                        src={tool.logo}
                        alt={tool.name}
                        loading="eager"
                        onError={(e) => {
                          const el = e.currentTarget as HTMLImageElement;
                          el.src = "https://cdn.simpleicons.org/zapier/FF4F00";
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="cognitive-story-card__pulse" />
            </div>
            <h3>{card.title}</h3>
            <p className="cognitive-story-card__subtitle">{card.subtitle}</p>
            <p className="cognitive-story-card__desc">{card.desc}</p>
            <div className="cognitive-story-card__metric">{card.metric}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
