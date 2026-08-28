"use client";

import { ArrowRight, Check, ChevronDown, CircleHelp, Clock3, Database, Headphones, Layers3, LockKeyhole, Settings2, Sparkles, Workflow } from "lucide-react";
import useBotzLanguage from "@/app/start/hooks/useBotzLanguage";
import styles from "./faq.module.css";

const copy = {
  es: {
    eyebrow: "PREGUNTAS FRECUENTES",
    title: "Lo que necesitas saber antes de construir con BOTZ.",
    intro: "Respuestas claras sobre como implementamos, conectamos y acompanamos operaciones con automatizacion y agentes de IA.",
    chips: ["Implementacion", "Integraciones", "Seguridad", "Soporte"],
    questions: [
      { category: "Implementacion", question: "Cuanto tiempo toma implementar una solucion BOTZ?", answer: "Depende del alcance y de las integraciones. Un flujo puntual puede estar listo en pocos dias; una operacion con varios agentes, sistemas y reglas se implementa por etapas. Antes de comenzar definimos entregables, responsables, pruebas y criterios de exito." },
      { category: "Inicio", question: "Que necesita mi empresa para comenzar?", answer: "Un proceso prioritario, una persona responsable y acceso controlado a las herramientas que deban conectarse. BOTZ ayuda a mapear el proceso, ordenar la informacion y definir una primera version que genere valor sin intentar automatizar todo al mismo tiempo." },
      { category: "Integraciones", question: "Con que herramientas se puede integrar BOTZ?", answer: "Podemos conectar WhatsApp, correo, formularios, CRM, calendarios, hojas de calculo, bases de datos, ERPs, APIs y plataformas especializadas. La viabilidad depende de los accesos y capacidades tecnicas de cada sistema." },
      { category: "Seguridad", question: "Como manejan la seguridad y privacidad de los datos?", answer: "Aplicamos acceso por roles, credenciales separadas, conexiones seguras, registro de acciones y principio de minimo privilegio. Tambien definimos que informacion puede usar cada agente y cuando una accion requiere validacion humana." },
      { category: "Soporte", question: "Que ocurre despues de la implementacion?", answer: "Acompanamos estabilizacion, monitoreo y mejora. Revisamos errores, calidad de respuestas, uso real y oportunidades de optimizacion. El objetivo no es solo entregar un flujo, sino mantener una operacion confiable." },
      { category: "Personalizacion", question: "Los agentes y automatizaciones se adaptan a nuestra empresa?", answer: "Si. Se configuran con procesos, reglas, tono, documentos, catalogos, criterios de calificacion y permisos propios. No usamos una conversacion generica para todos los negocios." },
      { category: "Escalabilidad", question: "Podemos comenzar pequeno y ampliar despues?", answer: "Si. Recomendamos iniciar con un proceso de alto impacto, medirlo y luego conectar nuevos canales, equipos o agentes. La arquitectura se disena para crecer sin reconstruir todo desde cero." },
      { category: "Procesos", question: "Que tipo de procesos puede automatizar BOTZ?", answer: "Captura y calificacion de leads, respuestas y seguimiento, agenda, documentos, CRM, notificaciones, cotizaciones, soporte, reportes, tareas internas y flujos entre sistemas. Siempre evaluamos excepciones, riesgos y puntos donde debe intervenir una persona." },
      { category: "Control", question: "La IA toma decisiones sin supervision?", answer: "Solo dentro de los limites acordados. Algunas acciones pueden ejecutarse automaticamente y otras requieren aprobacion. Definimos niveles de autonomia, reglas de escalamiento y trazabilidad segun el riesgo de cada proceso." },
    ],
    still: "Tienes una pregunta sobre tu proceso?",
    stillText: "Cuéntanos que quieres mejorar y te ayudamos a identificar un primer flujo viable.",
    cta: "Hablar con el equipo BOTZ",
    note: "Sin compromiso. Empezamos entendiendo el proceso.",
  },
  en: {
    eyebrow: "FREQUENTLY ASKED QUESTIONS",
    title: "What you need to know before building with BOTZ.",
    intro: "Clear answers about how we implement, connect and support operations powered by automation and AI agents.",
    chips: ["Implementation", "Integrations", "Security", "Support"],
    questions: [
      { category: "Implementation", question: "How long does a BOTZ implementation take?", answer: "It depends on scope and integrations. A focused workflow can be ready in days; an operation with multiple agents, systems and rules is delivered in stages. Before starting, we define deliverables, owners, testing and success criteria." },
      { category: "Getting started", question: "What does my company need to begin?", answer: "A priority process, an accountable owner and controlled access to the tools that need to connect. BOTZ helps map the process, organize information and define a first version that creates value without automating everything at once." },
      { category: "Integrations", question: "Which tools can BOTZ integrate with?", answer: "We can connect WhatsApp, email, forms, CRM, calendars, spreadsheets, databases, ERPs, APIs and specialized platforms. Feasibility depends on each system's access and technical capabilities." },
      { category: "Security", question: "How do you handle data security and privacy?", answer: "We use role-based access, separated credentials, secure connections, action logs and least privilege. We also define what information each agent can use and when an action requires human validation." },
      { category: "Support", question: "What happens after implementation?", answer: "We support stabilization, monitoring and improvement. We review errors, response quality, actual adoption and optimization opportunities. The goal is not just to deliver a flow, but to maintain a reliable operation." },
      { category: "Customization", question: "Are agents and automations adapted to our company?", answer: "Yes. They are configured around your processes, rules, tone, documents, catalogs, qualification criteria and permissions. We do not use one generic conversation for every business." },
      { category: "Scalability", question: "Can we start small and expand later?", answer: "Yes. We recommend starting with one high-impact process, measuring it and then connecting more channels, teams or agents. The architecture is designed to grow without rebuilding from scratch." },
      { category: "Processes", question: "What processes can BOTZ automate?", answer: "Lead capture and qualification, responses and follow-up, scheduling, documents, CRM, notifications, quotes, support, reporting, internal tasks and cross-system workflows. We always evaluate exceptions, risks and human checkpoints." },
      { category: "Control", question: "Does AI make decisions without supervision?", answer: "Only within agreed boundaries. Some actions can run automatically while others require approval. We define autonomy levels, escalation rules and traceability based on process risk." },
    ],
    still: "Have a question about your process?",
    stillText: "Tell us what you want to improve and we will help identify a viable first workflow.",
    cta: "Talk to the BOTZ team",
    note: "No commitment. We begin by understanding the process.",
  },
};

const icons = [Clock3, Sparkles, Database, LockKeyhole, Headphones, Settings2, Layers3, Workflow, Check];

export default function FAQExperience() {
  const language = useBotzLanguage("es");
  const t = language === "en" ? copy.en : copy.es;

  return (
    <main className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroGrid} />
        <div className={styles.heroInner}>
          <div className={styles.eyebrow}><CircleHelp size={16} /> {t.eyebrow}</div>
          <h1>{t.title}</h1>
          <p>{t.intro}</p>
          <div className={styles.chips}>{t.chips.map((chip) => <span key={chip}>{chip}</span>)}</div>
        </div>
      </div>

      <div className={styles.faqLayout}>
        <aside>
          <span>BOTZ FAQ</span>
          <strong>09</strong>
          <p>{language === "en" ? "answers for better decisions" : "respuestas para decidir mejor"}</p>
          <div><i /><i /><i /></div>
        </aside>
        <div className={styles.questions}>
          {t.questions.map((item, index) => {
            const Icon = icons[index];
            return (
              <details key={item.question} open={index === 0}>
                <summary>
                  <span><Icon size={18} /></span>
                  <div><small>{item.category}</small><strong>{item.question}</strong></div>
                  <ChevronDown size={18} />
                </summary>
                <p>{item.answer}</p>
              </details>
            );
          })}
        </div>
      </div>

      <div className={styles.cta}>
        <div><span><Sparkles size={16} /> BOTZ</span><h2>{t.still}</h2><p>{t.stillText}</p></div>
        <div><a href="/#contacto">{t.cta} <ArrowRight size={17} /></a><small>{t.note}</small></div>
      </div>
    </main>
  );
}
