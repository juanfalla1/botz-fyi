"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  Check,
  ClipboardCheck,
  Gauge,
  Layers3,
  MessageSquareText,
  Network,
  Radar,
  Sparkles,
  Target,
  Users,
  Workflow,
} from "lucide-react";
import useBotzLanguage from "@/app/start/hooks/useBotzLanguage";
import type { IndustryData } from "./industryData";
import styles from "./industry.module.css";
import MortgageDemoModal from "./MortgageDemoModal";

const capabilityIcons = [Radar, Bot, ClipboardCheck];
const flowIcons = [MessageSquareText, Target, Layers3, Workflow, Gauge];

export default function IndustryExperience({ industry }: { industry: IndustryData }) {
  const language = useBotzLanguage("es");
  const content = language === "en" ? industry.copy.en : industry.copy.es;
  const restaurant = industry.slug === "restaurantes-hospitalidad";
  const finanzas = industry.slug === "finanzas-hipotecas-seguros";
  const primaryHref = restaurant ? "https://restaurantos.botz.fyi/pricing" : "https://www.botz.fyi/#contacto";
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <main
      className={styles.page}
      style={{ "--industry-accent": industry.accent, "--industry-rgb": industry.accentRgb } as React.CSSProperties}
    >
      <div className={styles.hero}>
        <div className={styles.heroImage} style={{ backgroundImage: `linear-gradient(90deg, rgba(4,9,18,.98) 0%, rgba(4,9,18,.74) 48%, rgba(4,9,18,.16) 100%), url(${industry.image})` }} />
        <div className={styles.heroGrid} />
        <div className={styles.heroContent}>
          <motion.div className={styles.eyebrow} initial={false} animate={{ opacity: 1 }}><Sparkles size={15} /> {content.eyebrow}</motion.div>
          <h1>{content.title}</h1>
          <p>{content.intro}</p>
          <div className={styles.heroActions}>
            {finanzas ? (
              <button
                type="button"
                onClick={() => setDemoOpen(true)}
                style={{
                  display: "inline-flex",
                  minHeight: 52,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 9,
                  padding: "0 21px",
                  border: "1px solid rgba(var(--industry-rgb),.45)",
                  borderRadius: 14,
                  background:
                    "linear-gradient(120deg, rgba(var(--industry-rgb),.96), rgba(var(--industry-rgb),.58))",
                  color: "#031019",
                  fontSize: 13,
                  fontWeight: 850,
                  fontFamily: "inherit",
                  boxShadow: "0 18px 42px rgba(var(--industry-rgb),.2)",
                  cursor: "pointer",
                  transition: "transform .2s ease",
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {content.primaryCta} <ArrowRight size={17} />
              </button>
            ) : (
              <a href={primaryHref}>{content.primaryCta} <ArrowRight size={17} /></a>
            )}
            <a href="#industry-flow">{content.secondaryCta}</a>
          </div>
          <div className={styles.liveBadge}><i /> {content.badge}</div>
        </div>
      </div>

      <div className={styles.capabilitiesSection}>
        <div className={styles.sectionIntro}>
          <span>{content.challengeEyebrow}</span>
          <h2>{content.challengeTitle}</h2>
        </div>
        <div className={styles.capabilityGrid}>
          {content.capabilities.map((capability, index) => {
            const Icon = capabilityIcons[index];
            return (
              <motion.article key={capability.title} initial={false} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }}>
                <div className={styles.capabilityIcon}><Icon size={22} /></div>
                <h3>{capability.title}</h3>
                <p>{capability.text}</p>
                <strong>{capability.metric}</strong>
              </motion.article>
            );
          })}
        </div>
      </div>

      <div className={styles.flowSection} id="industry-flow">
        <div className={styles.flowVisual} style={{ backgroundImage: `linear-gradient(180deg, rgba(5,10,20,.08), rgba(5,10,20,.9)), url(${industry.secondaryImage})` }}>
          <div><Network size={24} /><span>BOTZ</span><strong>INDUSTRY<br />ENGINE</strong></div>
        </div>
        <div className={styles.flowContent}>
          <span>{content.flowEyebrow}</span>
          <h2>{content.flowTitle}</h2>
          <div className={styles.flowSteps}>
            {content.flow.map((step, index) => {
              const Icon = flowIcons[index];
              return (
                <div key={step.title}>
                  <i>0{index + 1}</i>
                  <div><Icon size={18} /></div>
                  <span><strong>{step.title}</strong><small>{step.text}</small></span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={styles.cockpitSection}>
        <div className={styles.cockpitCopy}>
          <span>{content.cockpitEyebrow}</span>
          <h2>{content.cockpitTitle}</h2>
          <p>{content.cockpitText}</p>
          <div className={styles.signalPills}><em><i /> AI active</em><em><i /> CRM sync</em><em><i /> 24/7</em></div>
        </div>
        <div className={styles.dashboard}>
          <div className={styles.dashboardTop}><div><i /><i /><i /></div><span><Users size={14} /> {content.queueTitle}</span><em>LIVE</em></div>
          <div className={styles.queue}>
            {content.queue.map((item, index) => (
              <motion.div key={item.name} animate={{ x: [0, 3, 0] }} transition={{ repeat: Infinity, duration: 4, delay: index * .5 }}>
                <span>{item.name.slice(0, 1)}</span>
                <div><strong>{item.name}</strong><small>{item.detail}</small></div>
                <em>{item.score}</em>
              </motion.div>
            ))}
          </div>
          <div className={styles.activity}>
            <div><span>Automation activity</span><strong>+31.8%</strong></div>
            <div>{[46, 72, 58, 88, 64, 96, 78, 100].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div>
          </div>
        </div>
      </div>

      <div className={styles.resultsSection}>
        <div><span><Sparkles size={16} /> BOTZ INDUSTRY AI</span><h2>{content.resultTitle}</h2></div>
        <div>{content.results.map((result) => <p key={result}><Check size={16} /> {result}</p>)}</div>
        <a href={primaryHref}>{content.finalCta} <ArrowRight size={17} /></a>
      </div>

      {finanzas && (
        <MortgageDemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
      )}
    </main>
  );
}
