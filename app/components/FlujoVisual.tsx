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

const logosInput = [
  { name: "WhatsApp", logo: "https://cdn.simpleicons.org/whatsapp/25D366" },
  { name: "Meta", logo: "https://cdn.simpleicons.org/meta/0081FB" },
  { name: "Instagram", logo: "https://cdn.simpleicons.org/instagram/E4405F" },
  { name: "Messenger", logo: "https://cdn.simpleicons.org/messenger/00B2FF" },
  { name: "Telegram", logo: "https://cdn.simpleicons.org/telegram/26A5E4" },
  { name: "Typeform", logo: "https://cdn.simpleicons.org/typeform/ffffff" },
  { name: "Gmail", logo: "https://cdn.simpleicons.org/gmail/EA4335" },
  { name: "Google Ads", logo: "https://cdn.simpleicons.org/googleads/4285F4" },
];

const logosContext = [
  { name: "HubSpot", logo: "https://cdn.simpleicons.org/hubspot/FF7A59" },
  { name: "Salesforce", logo: "https://cdn.simpleicons.org/salesforce/00A1E0" },
  { name: "Google Drive", logo: "https://cdn.simpleicons.org/googledrive/34A853" },
  { name: "Google Sheets", logo: "https://cdn.simpleicons.org/googlesheets/34A853" },
  { name: "Notion", logo: "https://cdn.simpleicons.org/notion/ffffff" },
  { name: "Airtable", logo: "https://cdn.simpleicons.org/airtable/18BFFF" },
  { name: "MySQL", logo: "https://cdn.simpleicons.org/mysql/4479A1" },
  { name: "PostgreSQL", logo: "https://cdn.simpleicons.org/postgresql/4169E1" },
];

const logosDecision = [
  { name: "OpenAI", logo: "https://cdn.simpleicons.org/openai/ffffff" },
  { name: "Anthropic", logo: "https://cdn.simpleicons.org/anthropic/ffffff" },
  { name: "Gemini", logo: "https://cdn.simpleicons.org/googlegemini/8E75B2" },
  { name: "HuggingFace", logo: "https://cdn.simpleicons.org/huggingface/FFD21E" },
  { name: "PyTorch", logo: "https://cdn.simpleicons.org/pytorch/EE4C2C" },
  { name: "TensorFlow", logo: "https://cdn.simpleicons.org/tensorflow/FF6F00" },
  { name: "Scikit-learn", logo: "https://cdn.simpleicons.org/scikitlearn/F7931E" },
  { name: "Jupyter", logo: "https://cdn.simpleicons.org/jupyter/F37626" },
];

const logosExecution = [
  { name: "n8n", logo: "https://cdn.simpleicons.org/n8n/EA4B71" },
  { name: "Make", logo: "https://cdn.simpleicons.org/make/6D3EF2" },
  { name: "Google Calendar", logo: "https://cdn.simpleicons.org/googlecalendar/4285F4" },
  { name: "Trello", logo: "https://cdn.simpleicons.org/trello/0079BF" },
  { name: "Asana", logo: "https://cdn.simpleicons.org/asana/F06A6A" },
  { name: "Gmail", logo: "https://cdn.simpleicons.org/gmail/EA4335" },
  { name: "Google Drive", logo: "https://cdn.simpleicons.org/googledrive/34A853" },
  { name: "Google Sheets", logo: "https://cdn.simpleicons.org/googlesheets/34A853" },
  { name: "Google Docs", logo: "https://cdn.simpleicons.org/googledocs/4285F4" },
  { name: "ClickUp", logo: "https://cdn.simpleicons.org/clickup/7B68EE" },
  { name: "Monday", logo: "https://cdn.simpleicons.org/mondaydotcom/F7B318" },
  { name: "Notion", logo: "https://cdn.simpleicons.org/notion/ffffff" },
  { name: "Airtable", logo: "https://cdn.simpleicons.org/airtable/18BFFF" },
  { name: "Twilio", logo: "https://cdn.simpleicons.org/twilio/F22F46" },
  { name: "Slack", logo: "https://cdn.simpleicons.org/slack/6E41E2" },
];

const logosOutcome = [
  { name: "Power BI", logo: "https://cdn.simpleicons.org/powerbi/F2C811" },
  { name: "Tableau", logo: "https://cdn.simpleicons.org/tableau/E97627" },
  { name: "GA4", logo: "https://cdn.simpleicons.org/googleanalytics/E37400" },
  { name: "Looker", logo: "https://cdn.simpleicons.org/looker/4285F4" },
  { name: "Metabase", logo: "https://cdn.simpleicons.org/metabase/509EE3" },
  { name: "Snowflake", logo: "https://cdn.simpleicons.org/snowflake/29B5E8" },
  { name: "BigQuery", logo: "https://cdn.simpleicons.org/googlebigquery/669DF6" },
  { name: "Databricks", logo: "https://cdn.simpleicons.org/databricks/FF3621" },
  { name: "Segment", logo: "https://cdn.simpleicons.org/segment/52BD95" },
  { name: "Mixpanel", logo: "https://cdn.simpleicons.org/mixpanel/7856FF" },
  { name: "Stripe", logo: "https://cdn.simpleicons.org/stripe/635BFF" },
  { name: "HubSpot", logo: "https://cdn.simpleicons.org/hubspot/FF7A59" },
  { name: "Salesforce", logo: "https://cdn.simpleicons.org/salesforce/00A1E0" },
  { name: "Airtable", logo: "https://cdn.simpleicons.org/airtable/18BFFF" },
  { name: "Google Cloud", logo: "https://cdn.simpleicons.org/googlecloud/4285F4" },
];

const cardsEn: StoryCard[] = [
  {
    title: "Signal Intake",
    subtitle: "Every channel, one horizon",
    desc: "Incoming requests from web, paid traffic, WhatsApp and calls arrive in a single visual stream.",
    metric: "24/7 live capture",
    mediaLabel: "Input channels connected",
    tools: logosInput,
  },
  {
    title: "Context Expansion",
    subtitle: "Memory that matters",
    desc: "Your CRM, history and customer intent are fused into one rich profile before any response is sent.",
    metric: "Unified client memory",
    mediaLabel: "Context sources in sync",
    tools: logosContext,
  },
  {
    title: "Decision Engine",
    subtitle: "Precision over noise",
    desc: "The core ranks urgency, predicts conversion potential and chooses the best next move automatically.",
    metric: "Adaptive intelligence",
    mediaLabel: "Decision intelligence stack",
    tools: logosDecision,
  },
  {
    title: "Autonomous Execution",
    subtitle: "Action in motion",
    desc: "Follow-ups, scheduling, routing and internal tasks are triggered with cinematic fluidity.",
    metric: "Hands-free operations",
    mediaLabel: "Execution automations",
    tools: logosExecution,
  },
  {
    title: "Outcome Layer",
    subtitle: "Revenue-ready outputs",
    desc: "Each interaction ends as a measurable result: qualified lead, booked meeting or closed opportunity.",
    metric: "Business impact visible",
    mediaLabel: "Outcome dashboards",
    tools: logosOutcome,
  },
];

const cardsEs: StoryCard[] = [
  {
    title: "Entrada de Señales",
    subtitle: "Todos los canales, un horizonte",
    desc: "Solicitudes desde web, pauta, WhatsApp y llamadas llegan en una sola corriente visual.",
    metric: "Captura 24/7 en vivo",
    mediaLabel: "Canales de entrada conectados",
    tools: logosInput,
  },
  {
    title: "Expansión de Contexto",
    subtitle: "Memoria que realmente importa",
    desc: "Tu CRM, historial e intención del cliente se fusionan en un perfil rico antes de responder.",
    metric: "Memoria unificada",
    mediaLabel: "Fuentes de contexto sincronizadas",
    tools: logosContext,
  },
  {
    title: "Motor de Decisiones",
    subtitle: "Precisión por encima del ruido",
    desc: "El núcleo prioriza urgencia, predice potencial de conversión y define la mejor acción.",
    metric: "Inteligencia adaptativa",
    mediaLabel: "Stack de decisiones IA",
    tools: logosDecision,
  },
  {
    title: "Ejecución Autónoma",
    subtitle: "Acción en movimiento",
    desc: "Seguimientos, agendas, enrutamiento y tareas internas se activan con fluidez cinematográfica.",
    metric: "Operación manos libres",
    mediaLabel: "Automatizaciones de ejecución",
    tools: logosExecution,
  },
  {
    title: "Capa de Resultados",
    subtitle: "Salida orientada a ingresos",
    desc: "Cada interacción termina en resultado medible: lead calificado, cita o oportunidad cerrada.",
    metric: "Impacto visible",
    mediaLabel: "Dashboards de resultados",
    tools: logosOutcome,
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
        <h2>{isEn ? "A cognitive flow designed like a premium film sequence" : "Un flujo cognitivo diseñado como una secuencia cinematográfica premium"}</h2>
        <span>
          {isEn
            ? "No technical diagrams. Just a living narrative of how AI turns raw demand into high-value outcomes."
            : "Sin diagramas técnicos. Solo una narrativa viva de cómo la IA transforma demanda en resultados de alto valor."}
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
                          const chip = el.parentElement as HTMLElement | null;
                          if (chip) chip.style.display = "none";
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
