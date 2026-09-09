"use client";

import { ArrowRight, ExternalLink } from "lucide-react";
import useBotzLanguage from "@/app/start/hooks/useBotzLanguage";
import styles from "./b2bCommercialDemo.module.css";

const copy = {
  es: {
    eyebrow: "CRM COMERCIAL BOTZ · DEMO FUNCIONAL",
    title: "Opera cuentas, oportunidades y seguimientos desde un CRM real.",
    intro: "Explora el pipeline, mueve negocios entre etapas y crea actividades sobre cuentas B2B precargadas. Esta es una instancia funcional del CRM BOTZ.",
    open: "Abrir CRM en pantalla completa",
    contact: "Quiero adaptar este CRM a mi empresa",
    titleFrame: "CRM BOTZ para servicios profesionales",
  },
  en: {
    eyebrow: "BOTZ SALES CRM · FUNCTIONAL DEMO",
    title: "Run accounts, opportunities and follow-ups from a real CRM.",
    intro: "Explore the pipeline, move deals across stages and create activities for preloaded B2B accounts. This is a functional BOTZ CRM instance.",
    open: "Open full-screen CRM",
    contact: "I want to adapt this CRM to my business",
    titleFrame: "BOTZ CRM for professional services",
  },
} as const;

export default function B2BCommercialDemo({ onContact }: { trigger: number; onContact: () => void }) {
  const language = useBotzLanguage("es");
  const t = language === "en" ? copy.en : copy.es;

  return (
    <section className={styles.section} id="b2b-commercial-demo">
      <div className={styles.heading}>
        <div>
          <span>{t.eyebrow}</span>
          <h2>{t.title}</h2>
          <p>{t.intro}</p>
        </div>
        <div className={styles.actions}>
          <a href="/avanza-crm/inicio?embed=1" target="_blank" rel="noreferrer">{t.open} <ExternalLink size={15} /></a>
          <button type="button" onClick={onContact}>{t.contact} <ArrowRight size={15} /></button>
        </div>
      </div>

      <div className={styles.crmShell}>
        <div className={styles.browserBar}>
          <div><i /><i /><i /></div>
          <span>botz.fyi / crm / pipeline</span>
          <strong>LIVE DEMO</strong>
        </div>
        <iframe src="/avanza-crm/inicio?embed=1" title={t.titleFrame} loading="lazy" />
      </div>
      <p className={styles.mobileHint}>{t.open}</p>
    </section>
  );
}
