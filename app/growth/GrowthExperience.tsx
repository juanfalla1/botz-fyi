"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  ChartNoAxesCombined,
  Check,
  Filter,
  MessageSquareText,
  Network,
  Sparkles,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaTiktok, FaWhatsapp } from "react-icons/fa";
import useBotzLanguage from "@/app/start/hooks/useBotzLanguage";
import GrowthCampaignDemo from "./GrowthCampaignDemo";
import styles from "./growth.module.css";

const socialChannels = [
  { name: "Instagram", icon: FaInstagram, tone: styles.instagram },
  { name: "Facebook", icon: FaFacebookF, tone: styles.facebook },
  { name: "TikTok", icon: FaTiktok, tone: styles.tiktok },
  { name: "LinkedIn", icon: FaLinkedinIn, tone: styles.linkedin },
  { name: "WhatsApp", icon: FaWhatsapp, tone: styles.whatsapp },
];

const copy = {
  es: {
    eyebrow: "EL MOTOR SOCIAL DE BOTZ",
    titleLead: "Convierte cada movimiento en redes en",
    titleAccent: "crecimiento medible.",
    intro: "BOTZ Growth conecta tus canales, captura cada oportunidad y activa el siguiente paso automaticamente con IA.",
    primaryCta: "Activar BOTZ Growth",
    secondaryCta: "Ver el flujo",
    live: "Motor activo",
    captured: "Leads capturados",
    response: "Respuesta promedio",
    conversion: "Conversion potencial",
    flowEyebrow: "UN FLUJO, TODOS TUS CANALES",
    flowTitle: "De una senal social a una oportunidad lista para crecer.",
    steps: [
      { title: "Conecta tus redes", desc: "Instagram, Facebook, TikTok, LinkedIn y WhatsApp alimentan un solo flujo.", tag: "Omnicanal" },
      { title: "Captura cada lead", desc: "Comentarios, mensajes, formularios y anuncios entran automaticamente.", tag: "Siempre activo" },
      { title: "Gestiona con IA", desc: "BOTZ responde, enriquece el perfil y activa seguimientos sin tareas manuales.", tag: "Autonomo" },
      { title: "Segmenta en tiempo real", desc: "Intencion, interes, urgencia y valor organizan cada contacto.", tag: "Precision IA" },
      { title: "Escala el crecimiento", desc: "El equipo recibe oportunidades priorizadas y una ruta clara de conversion.", tag: "Revenue" },
    ],
    cockpitEyebrow: "GROWTH COCKPIT",
    cockpitTitle: "Tu demanda se organiza mientras sucede.",
    cockpitText: "Cada conversacion se convierte en datos accionables, segmentos vivos y proximas acciones.",
    inbox: "Bandeja unificada",
    segments: "Segmentos en vivo",
    qualified: "Alta intencion",
    nurture: "Nutricion automatica",
    reactivation: "Reactivacion",
    leads: [
      { name: "Laura M.", source: "Instagram", intent: "Demo", score: "94" },
      { name: "Carlos R.", source: "LinkedIn", intent: "Pricing", score: "87" },
      { name: "Sofia T.", source: "TikTok", intent: "Info", score: "76" },
    ],
    outcomeTitle: "Una operacion de Growth que nunca deja oportunidades atras.",
    outcomes: ["Respuesta inmediata 24/7", "Leads organizados automaticamente", "Mensajes personalizados por segmento", "Pipeline visible de punta a punta"],
    finalCta: "Construir mi motor de Growth",
  },
  en: {
    eyebrow: "THE BOTZ SOCIAL ENGINE",
    titleLead: "Turn every social movement into",
    titleAccent: "measurable growth.",
    intro: "BOTZ Growth connects your channels, captures every opportunity and triggers the next best action automatically with AI.",
    primaryCta: "Activate BOTZ Growth",
    secondaryCta: "See the flow",
    live: "Engine live",
    captured: "Leads captured",
    response: "Average response",
    conversion: "Conversion potential",
    flowEyebrow: "ONE FLOW, EVERY CHANNEL",
    flowTitle: "From a social signal to an opportunity ready to grow.",
    steps: [
      { title: "Connect your networks", desc: "Instagram, Facebook, TikTok, LinkedIn and WhatsApp feed one flow.", tag: "Omnichannel" },
      { title: "Capture every lead", desc: "Comments, messages, forms and ads enter automatically.", tag: "Always on" },
      { title: "Manage with AI", desc: "BOTZ responds, enriches profiles and follows up without manual work.", tag: "Autonomous" },
      { title: "Segment in real time", desc: "Intent, interest, urgency and value organize every contact.", tag: "AI precision" },
      { title: "Scale growth", desc: "Your team receives prioritized opportunities and a clear conversion path.", tag: "Revenue" },
    ],
    cockpitEyebrow: "GROWTH COCKPIT",
    cockpitTitle: "Your demand gets organized as it happens.",
    cockpitText: "Every conversation becomes actionable data, live segments and a clear next action.",
    inbox: "Unified inbox",
    segments: "Live segments",
    qualified: "High intent",
    nurture: "Automated nurture",
    reactivation: "Reactivation",
    leads: [
      { name: "Laura M.", source: "Instagram", intent: "Demo", score: "94" },
      { name: "Carlos R.", source: "LinkedIn", intent: "Pricing", score: "87" },
      { name: "Sofia T.", source: "TikTok", intent: "Info", score: "76" },
    ],
    outcomeTitle: "A Growth operation that never leaves an opportunity behind.",
    outcomes: ["Immediate response 24/7", "Leads organized automatically", "Personalized messages by segment", "Full-funnel pipeline visibility"],
    finalCta: "Build my Growth engine",
  },
};

const stepIcons = [Network, MessageSquareText, Bot, Filter, ChartNoAxesCombined];

export default function GrowthExperience() {
  const language = useBotzLanguage("es");
  const content = language === "en" ? copy.en : copy.es;

  return (
    <main className={styles.page}>
      <div className={styles.noise} aria-hidden="true" />

      <div className={styles.hero}>
        <div className={styles.heroCopy}>
          <motion.div className={styles.eyebrow} initial={false} animate={{ opacity: 1, y: 0 }}>
            <Sparkles size={15} /> {content.eyebrow}
          </motion.div>
          <motion.h1 initial={false} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            {content.titleLead} <span>{content.titleAccent}</span>
          </motion.h1>
          <motion.p initial={false} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
            {content.intro}
          </motion.p>
          <motion.div className={styles.heroActions} initial={false} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
            <a className={styles.primaryButton} href="/start">
              {content.primaryCta} <ArrowRight size={17} />
            </a>
            <a className={styles.secondaryButton} href="#growth-flow">{content.secondaryCta}</a>
          </motion.div>
        </div>

        <motion.div className={styles.socialEngine} initial={false} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.12, duration: 0.6 }}>
          <div className={styles.engineGlow} />
          <div className={styles.channelOrbit}>
            {socialChannels.map(({ name, icon: Icon, tone }, index) => (
              <motion.div
                className={`${styles.socialNode} ${tone}`}
                key={name}
                animate={{ y: [0, -7, 0], rotate: [0, index % 2 ? 3 : -3, 0] }}
                transition={{ duration: 3.2 + index * 0.25, repeat: Infinity, ease: "easeInOut" }}
                title={name}
              >
                <Icon />
              </motion.div>
            ))}
          </div>
          <div className={styles.engineCore}>
            <span><Zap size={17} /> {content.live}</span>
            <strong>BOTZ<br />GROWTH</strong>
            <div className={styles.corePulse} />
          </div>
          <div className={styles.signalRing} />
          <div className={styles.engineMetrics}>
            <div><small>{content.captured}</small><strong>1,284</strong><em>+18.6%</em></div>
            <div><small>{content.response}</small><strong>8 sec</strong><em>24/7</em></div>
            <div><small>{content.conversion}</small><strong>32.4%</strong><em>AI score</em></div>
          </div>
        </motion.div>
      </div>

      <div className={styles.flowSection} id="growth-flow">
        <div className={styles.sectionHeading}>
          <span>{content.flowEyebrow}</span>
          <h2>{content.flowTitle}</h2>
        </div>
        <div className={styles.flowGrid}>
          <div className={styles.flowLine} aria-hidden="true"><i /></div>
          {content.steps.map((step, index) => {
            const Icon = stepIcons[index];
            return (
              <motion.article
                className={styles.flowCard}
                key={step.title}
                initial={false}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: index * 0.08 }}
              >
                <div className={styles.stepTop}><span>0{index + 1}</span><em>{step.tag}</em></div>
                <div className={styles.stepIcon}><Icon size={22} /></div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </motion.article>
            );
          })}
        </div>
      </div>

      <GrowthCampaignDemo language={language === "en" ? "en" : "es"} />

      <div className={styles.cockpitSection}>
        <div className={styles.cockpitCopy}>
          <span>{content.cockpitEyebrow}</span>
          <h2>{content.cockpitTitle}</h2>
          <p>{content.cockpitText}</p>
          <div className={styles.segmentList}>
            {[content.qualified, content.nurture, content.reactivation].map((segment, index) => (
              <motion.div key={segment} initial={false} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }}>
                <Target size={17} /><span>{segment}</span><strong>{[184, 326, 91][index]}</strong>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div className={styles.dashboard} initial={false} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className={styles.dashboardTop}>
            <div><i /><i /><i /></div><span><Users size={14} /> {content.inbox}</span><em>LIVE</em>
          </div>
          <div className={styles.leadStream}>
            {content.leads.map((lead, index) => (
              <motion.div className={styles.leadRow} key={lead.name} animate={{ x: [0, 3, 0] }} transition={{ duration: 4, delay: index * 0.5, repeat: Infinity }}>
                <div className={styles.avatar}>{lead.name.slice(0, 1)}</div>
                <div><strong>{lead.name}</strong><small>{lead.source} / {lead.intent}</small></div>
                <span>{lead.score}</span>
              </motion.div>
            ))}
          </div>
          <div className={styles.dashboardChart}>
            <div className={styles.chartLabel}><span>{content.segments}</span><strong>+28.4%</strong></div>
            <div className={styles.bars}>
              {[42, 68, 51, 84, 63, 92, 78, 100].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}
            </div>
          </div>
        </motion.div>
      </div>

      <div className={styles.outcomeSection}>
        <div>
          <span><ChartNoAxesCombined size={18} /> BOTZ GROWTH</span>
          <h2>{content.outcomeTitle}</h2>
        </div>
        <div className={styles.outcomeList}>
          {content.outcomes.map((outcome) => <p key={outcome}><Check size={16} /> {outcome}</p>)}
        </div>
        <a href="/start">{content.finalCta} <ArrowRight size={17} /></a>
      </div>
    </main>
  );
}
