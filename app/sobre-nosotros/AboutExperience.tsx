"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BrainCircuit,
  Check,
  Globe2,
  HeartHandshake,
  Lightbulb,
  Linkedin,
  MapPin,
  Network,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  Workflow,
} from "lucide-react";
import useBotzLanguage from "@/app/start/hooks/useBotzLanguage";
import styles from "./about.module.css";

const copy = {
  es: {
    eyebrow: "ESTRATEGIA HUMANA. EJECUCION CON IA.",
    title: "Construimos operaciones que trabajan tan rapido como crecen las ideas.",
    intro: "BOTZ combina vision de negocio, automatizacion y agentes de IA para convertir procesos fragmentados en sistemas que capturan, deciden y ejecutan.",
    cta: "Conocer como trabajamos",
    ask: "Hablar con BOTZ",
    metrics: [
      { value: "20+", label: "anos de experiencia combinada" },
      { value: "3", label: "continentes con experiencia de proyecto" },
      { value: "2", label: "hubs: Toronto y Bogota" },
      { value: "24/7", label: "operaciones disenadas para escalar" },
    ],
    manifestoEyebrow: "POR QUE EXISTE BOTZ",
    manifestoTitle: "La tecnologia debe liberar talento, no crear mas trabajo.",
    manifestoText: "Creemos que las personas deben concentrarse en criterio, creatividad y relaciones. BOTZ se ocupa de conectar datos, responder senales, ejecutar tareas y mantener visible lo que sigue.",
    principles: [
      { title: "Negocio primero", text: "No automatizamos por moda. Partimos del resultado, la friccion y el impacto medible." },
      { title: "Diseno conectado", text: "Agentes, CRM, datos y workflows funcionan como una operacion, no como herramientas aisladas." },
      { title: "Confianza operativa", text: "Construimos trazabilidad, controles y acompanamiento para que la IA sea util y gobernable." },
    ],
    methodEyebrow: "COMO TRABAJAMOS",
    methodTitle: "De un proceso complejo a una operacion clara.",
    methodIntro: "Un metodo practico para entender, construir, desplegar y mejorar sin perder de vista a las personas que usan el sistema.",
    method: [
      { step: "01", title: "Descubrimos", text: "Mapeamos objetivos, usuarios, datos, herramientas y cuellos de botella reales." },
      { step: "02", title: "Disenamos", text: "Definimos el flujo, las decisiones, los agentes y las integraciones necesarias." },
      { step: "03", title: "Implementamos", text: "Construimos por etapas, probamos escenarios y preparamos al equipo para operar." },
      { step: "04", title: "Optimizamos", text: "Medimos uso, calidad e impacto para mejorar continuamente el sistema." },
    ],
    presenceEyebrow: "PRESENCIA, CONTEXTO Y EJECUCION",
    presenceTitle: "Una perspectiva internacional con acompanamiento cercano.",
    locations: [
      { city: "Toronto", country: "Canada", text: "Estrategia de producto, alianzas y operaciones para Norteamerica." },
      { city: "Bogota", country: "Colombia", text: "Implementacion, automatizacion y acompanamiento para Latinoamerica." },
    ],
    teamEyebrow: "EL EQUIPO",
    teamTitle: "Experiencia que conecta negocio, tecnologia y transformacion.",
    founderRole: "Founder & Project Manager",
    founderText: "Lidera estrategia, arquitectura de soluciones y proyectos de transformacion digital con experiencia en Espana, Colombia y Canada.",
    directorRole: "Business Transformation & AI",
    directorText: "Lidera automatizacion, producto y transformacion de procesos con experiencia en banca, automotriz y tecnologia en America y Asia.",
    finalTitle: "No vendemos tecnologia aislada. Construimos capacidad operativa.",
    finalText: "Empecemos por el proceso que hoy consume mas tiempo, pierde mas oportunidades o limita el crecimiento.",
    finalCta: "Explorar una oportunidad con BOTZ",
  },
  en: {
    eyebrow: "HUMAN STRATEGY. AI EXECUTION.",
    title: "We build operations that move as fast as ideas grow.",
    intro: "BOTZ combines business vision, automation and AI agents to turn fragmented processes into systems that capture, decide and execute.",
    cta: "See how we work",
    ask: "Talk to BOTZ",
    metrics: [
      { value: "20+", label: "years of combined experience" },
      { value: "3", label: "continents with project experience" },
      { value: "2", label: "hubs: Toronto and Bogota" },
      { value: "24/7", label: "operations designed to scale" },
    ],
    manifestoEyebrow: "WHY BOTZ EXISTS",
    manifestoTitle: "Technology should free talent, not create more work.",
    manifestoText: "We believe people should focus on judgment, creativity and relationships. BOTZ connects data, responds to signals, executes tasks and keeps the next action visible.",
    principles: [
      { title: "Business first", text: "We do not automate for novelty. We start with outcomes, friction and measurable impact." },
      { title: "Connected design", text: "Agents, CRM, data and workflows operate as one system, not isolated tools." },
      { title: "Operational trust", text: "We build traceability, controls and support so AI remains useful and governable." },
    ],
    methodEyebrow: "HOW WE WORK",
    methodTitle: "From a complex process to a clear operation.",
    methodIntro: "A practical method to understand, build, deploy and improve without losing sight of the people using the system.",
    method: [
      { step: "01", title: "Discover", text: "We map goals, users, data, tools and the real operational bottlenecks." },
      { step: "02", title: "Design", text: "We define the flow, decisions, agents and integrations required." },
      { step: "03", title: "Implement", text: "We build in stages, test scenarios and prepare the team to operate." },
      { step: "04", title: "Optimize", text: "We measure adoption, quality and impact to continuously improve the system." },
    ],
    presenceEyebrow: "PRESENCE, CONTEXT AND EXECUTION",
    presenceTitle: "An international perspective with close support.",
    locations: [
      { city: "Toronto", country: "Canada", text: "Product strategy, partnerships and operations for North America." },
      { city: "Bogota", country: "Colombia", text: "Implementation, automation and support for Latin America." },
    ],
    teamEyebrow: "THE TEAM",
    teamTitle: "Experience connecting business, technology and transformation.",
    founderRole: "Founder & Project Manager",
    founderText: "Leads strategy, solution architecture and digital transformation projects with experience in Spain, Colombia and Canada.",
    directorRole: "Business Transformation & AI",
    directorText: "Leads automation, product and process transformation with experience across banking, automotive and technology in the Americas and Asia.",
    finalTitle: "We do not sell isolated technology. We build operational capacity.",
    finalText: "Let us start with the process that consumes the most time, loses the most opportunities or limits growth.",
    finalCta: "Explore an opportunity with BOTZ",
  },
};

const principleIcons = [Target, Network, ShieldCheck];
const methodIcons = [Lightbulb, BrainCircuit, Workflow, Rocket];

export default function AboutExperience() {
  const language = useBotzLanguage("es");
  const t = language === "en" ? copy.en : copy.es;

  return (
    <main className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroGrid} />
        <div className={styles.heroGlow} />
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}><Sparkles size={15} /> {t.eyebrow}</div>
            <h1>{t.title}</h1>
            <p>{t.intro}</p>
            <div className={styles.heroActions}>
              <a href="#como-trabajamos">{t.cta} <ArrowRight size={17} /></a>
              <a href="/#contacto">{t.ask}</a>
            </div>
          </div>
          <div className={styles.heroSystem}>
            <div className={styles.systemOrbit}><i /><i /><i /></div>
            <div className={styles.systemCore}><BrainCircuit size={35} /><span>BOTZ</span><strong>AI OPERATIONS</strong></div>
            <div className={styles.systemLabelA}>Strategy</div>
            <div className={styles.systemLabelB}>Automation</div>
            <div className={styles.systemLabelC}>Intelligence</div>
          </div>
        </div>
      </div>

      <div className={styles.metrics}>
        {t.metrics.map((metric) => <div key={metric.label}><strong>{metric.value}</strong><span>{metric.label}</span></div>)}
      </div>

      <div className={styles.manifesto}>
        <div className={styles.manifestoCopy}><span>{t.manifestoEyebrow}</span><h2>{t.manifestoTitle}</h2><p>{t.manifestoText}</p></div>
        <div className={styles.principles}>
          {t.principles.map((principle, index) => {
            const Icon = principleIcons[index];
            return <motion.article key={principle.title} initial={false} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }}><Icon size={21} /><div><h3>{principle.title}</h3><p>{principle.text}</p></div></motion.article>;
          })}
        </div>
      </div>

      <div className={styles.method} id="como-trabajamos">
        <div className={styles.sectionHeading}><span>{t.methodEyebrow}</span><h2>{t.methodTitle}</h2><p>{t.methodIntro}</p></div>
        <div className={styles.methodGrid}>
          <div className={styles.methodLine}><i /></div>
          {t.method.map((item, index) => {
            const Icon = methodIcons[index];
            return <article key={item.step}><div className={styles.methodTop}><span>{item.step}</span><Icon size={20} /></div><h3>{item.title}</h3><p>{item.text}</p></article>;
          })}
        </div>
      </div>

      <div className={styles.presence}>
        <div className={styles.presenceCopy}><span>{t.presenceEyebrow}</span><h2>{t.presenceTitle}</h2><Globe2 size={145} /></div>
        <div className={styles.locationGrid}>{t.locations.map((location) => <article key={location.city}><MapPin size={21} /><div><span>{location.country}</span><h3>{location.city}</h3><p>{location.text}</p></div></article>)}</div>
      </div>

      <div className={styles.team}>
        <div className={styles.sectionHeading}><span>{t.teamEyebrow}</span><h2>{t.teamTitle}</h2></div>
        <div className={styles.teamGrid}>
          <article className={styles.teamCard}>
            <div className={styles.teamImage}><Image src="/juan-carlos.png" alt="Juan Carlos Garcia Falla" fill sizes="(max-width: 700px) 100vw, 45vw" /></div>
            <div className={styles.teamContent}><span>{t.founderRole}</span><h3>Juan Carlos Garcia Falla</h3><p>{t.founderText}</p><a href="https://www.linkedin.com/in/juan-carlos-garc%C3%ADa-falla" target="_blank" rel="noreferrer"><Linkedin size={16} /> LinkedIn</a></div>
          </article>
          <article className={styles.teamCard}>
            <div className={styles.teamImage}><Image src="/sandra.png" alt="Sandra Alvarado" fill sizes="(max-width: 700px) 100vw, 45vw" /></div>
            <div className={styles.teamContent}><span>{t.directorRole}</span><h3>Sandra Alvarado</h3><p>{t.directorText}</p><a href="https://www.linkedin.com/in/sandra-alvarado-78047740" target="_blank" rel="noreferrer"><Linkedin size={16} /> LinkedIn</a></div>
          </article>
        </div>
      </div>

      <div className={styles.finalCta}>
        <div><span><HeartHandshake size={18} /> BOTZ</span><h2>{t.finalTitle}</h2><p>{t.finalText}</p></div>
        <a href="/#contacto">{t.finalCta} <ArrowRight size={17} /></a>
      </div>
    </main>
  );
}
