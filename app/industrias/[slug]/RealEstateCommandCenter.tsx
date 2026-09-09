"use client";

import { useState } from "react";
import {
  ArrowRight,
  BadgeDollarSign,
  Bot,
  Building2,
  Check,
  Database,
  Globe2,
  Home,
  Mail,
  MessageCircle,
  UserRound,
} from "lucide-react";
import useBotzLanguage from "@/app/start/hooks/useBotzLanguage";
import styles from "./realEstateCommandCenter.module.css";

type Scenario = "buy" | "rent" | "sell";

const content = {
  es: {
    eyebrow: "BOTZ REAL ESTATE COMMAND CENTER",
    title: "Mira a BOTZ trabajando",
    intro: "Un lead entra. BOTZ responde, califica, coordina y convierte la conversación en una acción.",
    demo: "Demostración con datos ficticios",
    conversation: "Conversación simulada",
    operations: "BOTZ Operations",
    scenarios: { buy: "Comprar", rent: "Arrendar", sell: "Vender" },
    client: "Cliente",
    flow: ["Instagram / Web", "WhatsApp", "BOTZ AI", "Lead calificado", "Agenda / visita", "CRM", "Asesor"],
    integrations: "Integraciones disponibles en BOTZ",
    closing: "Ahora imagina BOTZ trabajando con tus propiedades.",
    cta: "Ver BOTZ con mis propiedades",
    data: {
      buy: {
        property: "Condo · Toronto",
        price: "$585,000",
        details: "2 habitaciones · 2 baños",
        messages: [
          ["client", "Hola, vi este apartamento en Instagram. ¿Sigue disponible?"],
          ["bot", "Sí. ¿Buscas comprar este mes? Puedo ayudarte a coordinar una visita."],
          ["client", "Sí, ya tengo preaprobación."],
          ["bot", "Perfecto. Tengo disponibilidad mañana a las 4:30 p. m."],
        ],
        tasks: ["Lead identificado", "Propiedad asociada", "Intención de compra detectada", "Preaprobación registrada", "Visita coordinada", "CRM actualizado", "Asesor notificado"],
      },
      rent: {
        property: "Condo · Toronto",
        price: "$2,850 / mes",
        details: "2 habitaciones · 2 baños",
        messages: [
          ["client", "Hola, vi este apartamento en Instagram. ¿Sigue disponible?"],
          ["bot", "Sí. ¿Buscas mudarte este mes? Puedo ayudarte a coordinar una visita."],
          ["client", "Sí, este mes."],
          ["bot", "Perfecto. Tengo disponibilidad mañana a las 4:30 p. m."],
        ],
        tasks: ["Lead identificado", "Propiedad asociada", "Intención de arriendo detectada", "Disponibilidad verificada", "Visita coordinada", "CRM actualizado", "Asesor notificado"],
      },
      sell: {
        property: "Condominio · Toronto",
        price: "Valor estimado $620,000",
        details: "2 habitaciones · 2 baños",
        messages: [
          ["client", "Quiero vender mi apartamento en Toronto este trimestre."],
          ["bot", "Claro. ¿En qué zona está y cuántas habitaciones tiene?"],
          ["client", "Downtown, 2 habitaciones y 2 baños."],
          ["bot", "Entendido. Puedo coordinar una valoración con un asesor."],
        ],
        tasks: ["Lead identificado", "Propiedad registrada", "Intención de venta detectada", "Zona y plazo capturados", "Valoración coordinada", "CRM actualizado", "Asesor notificado"],
      },
    },
  },
  en: {
    eyebrow: "BOTZ REAL ESTATE COMMAND CENTER",
    title: "Watch BOTZ working",
    intro: "A lead comes in. BOTZ responds, qualifies, coordinates and turns the conversation into action.",
    demo: "Demo with fictional data",
    conversation: "Simulated conversation",
    operations: "BOTZ Operations",
    scenarios: { buy: "Buy", rent: "Rent", sell: "Sell" },
    client: "Client",
    flow: ["Instagram / Web", "WhatsApp", "BOTZ AI", "Qualified lead", "Schedule / visit", "CRM", "Advisor"],
    integrations: "Integrations available in BOTZ",
    closing: "Now imagine BOTZ working with your properties.",
    cta: "See BOTZ with my properties",
    data: {
      buy: {
        property: "Condo · Toronto",
        price: "$585,000",
        details: "2 bedrooms · 2 baths",
        messages: [
          ["client", "Hi, I saw this apartment on Instagram. Is it still available?"],
          ["bot", "Yes. Are you looking to buy this month? I can help coordinate a visit."],
          ["client", "Yes, I already have pre-approval."],
          ["bot", "Great. I have availability tomorrow at 4:30 p.m."],
        ],
        tasks: ["Lead identified", "Property matched", "Purchase intent detected", "Pre-approval recorded", "Visit scheduled", "CRM updated", "Advisor notified"],
      },
      rent: {
        property: "Condo · Toronto",
        price: "$2,850 / month",
        details: "2 bedrooms · 2 baths",
        messages: [
          ["client", "Hi, I saw this apartment on Instagram. Is it still available?"],
          ["bot", "Yes. Are you looking to move this month? I can help coordinate a visit."],
          ["client", "Yes, this month."],
          ["bot", "Great. I have availability tomorrow at 4:30 p.m."],
        ],
        tasks: ["Lead identified", "Property matched", "Rental intent detected", "Availability verified", "Visit scheduled", "CRM updated", "Advisor notified"],
      },
      sell: {
        property: "Condo · Toronto",
        price: "Estimated value $620,000",
        details: "2 bedrooms · 2 baths",
        messages: [
          ["client", "I want to sell my Toronto apartment this quarter."],
          ["bot", "Sure. What area is it in and how many bedrooms does it have?"],
          ["client", "Downtown, 2 bedrooms and 2 baths."],
          ["bot", "Understood. I can coordinate a valuation with an advisor."],
        ],
        tasks: ["Lead identified", "Property registered", "Sell intent detected", "Area and timeline captured", "Valuation scheduled", "CRM updated", "Advisor notified"],
      },
    },
  },
} as const;

const scenarios: Array<{ key: Scenario; icon: typeof Home }> = [
  { key: "buy", icon: Home },
  { key: "rent", icon: Building2 },
  { key: "sell", icon: BadgeDollarSign },
];

export default function RealEstateCommandCenter({ onContact }: { onContact: () => void }) {
  const language = useBotzLanguage("es");
  const t = language === "en" ? content.en : content.es;
  const [scenario, setScenario] = useState<Scenario>("rent");
  const active = t.data[scenario];

  return (
    <section className={styles.section} id="real-estate-command-center">
      <div className={styles.intro}>
        <span>{t.eyebrow}</span>
        <h2>{t.title}</h2>
        <p>{t.intro}</p>
        <small>{t.demo}</small>
      </div>

      <div className={styles.tabs} role="tablist" aria-label={t.conversation}>
        {scenarios.map(({ key, icon: Icon }) => (
          <button key={key} type="button" role="tab" aria-selected={scenario === key} onClick={() => setScenario(key)}>
            <Icon size={16} /> {t.scenarios[key]}
          </button>
        ))}
      </div>

      <div className={styles.console}>
        <article className={styles.conversation}>
          <header><span>{t.conversation}</span><i /></header>
          <div className={styles.property}>
            <Building2 size={21} />
            <div><strong>{active.property}</strong><span>{active.price}</span><small>{active.details}</small></div>
          </div>
          <div className={styles.messages}>
            {active.messages.map(([sender, message], index) => (
              <div className={sender === "bot" ? styles.botMessage : styles.clientMessage} key={`${scenario}-${index}`}>
                <span>{sender === "bot" ? <Bot size={13} /> : <UserRound size={13} />}{sender === "bot" ? "BOTZ" : t.client}</span>
                <p>{message}</p>
              </div>
            ))}
          </div>
        </article>

        <article className={styles.operations}>
          <header><span>{t.operations}</span><i /></header>
          <ul>{active.tasks.map((task) => <li key={task}><Check size={13} /> {task}</li>)}</ul>
          <div className={styles.flow}>
            {t.flow.map((step, index) => (
              <div key={step}><span>{index === 2 && <Bot size={13} />}{step}</span>{index < t.flow.length - 1 && <i>↓</i>}</div>
            ))}
          </div>
        </article>
      </div>

      <div className={styles.integrations}>
        <p>{t.integrations}</p>
        <div>
          <span><MessageCircle size={17} /> WhatsApp</span>
          <span><Mail size={17} /> Gmail</span>
          <span><Database size={17} /> Zoho</span>
        </div>
      </div>

      <div className={styles.cta}>
        <Globe2 size={25} />
        <h3>{t.closing}</h3>
        <button type="button" onClick={onContact}>{t.cta} <ArrowRight size={16} /></button>
      </div>
    </section>
  );
}
