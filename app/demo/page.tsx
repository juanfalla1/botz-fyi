"use client";

import { useEffect, useState } from "react";

type Lead = {
  name: string;
  email: string;
  phone: string;
  status: string;
};

export default function DemoPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingSampleData, setUsingSampleData] = useState(false);

  useEffect(() => {
    fetch("/demo/leads")
      .then(async (res) => {
        if (!res.ok) {
          const msg = await res.text();
          throw new Error(msg || "No se pudieron cargar los leads");
        }
        return res.json();
      })
      .then((data: Lead[]) => {
        if (!Array.isArray(data) || data.length === 0) {
          setUsingSampleData(true);
          return;
        }
        setLeads(data);
      })
      .catch(() => {
        setUsingSampleData(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const flowSteps = [
    { title: "Nuevo lead", detail: "Entra desde WhatsApp, web o Instagram", system: "Canal" },
    { title: "BOTZ entiende la intención", detail: "Detecta urgencia, necesidad y etapa comercial", system: "AI Agent" },
    { title: "Consulta el contexto", detail: "Revisa CRM, historial y datos disponibles", system: "CRM" },
    { title: "Califica la oportunidad", detail: "Define prioridad y siguiente mejor acción", system: "Sales Agent" },
    { title: "Ejecuta el siguiente paso", detail: "Agenda, envía resumen o prepara propuesta", system: "Workflow" },
    { title: "Actualiza la operación", detail: "El equipo recibe estado, tarea y trazabilidad", system: "Dashboard" },
  ];

  const hasLiveLeads = leads.length > 0 && !usingSampleData;

  return (
    <main className="demo-page">
      <section className="demo-shell">
        <div className="demo-copy">
          <span className="demo-kicker">BOTZ LIVE DEMO</span>
          <h1>Así opera un lead dentro de BOTZ</h1>
          <p>
            Una vista visual del proceso: BOTZ recibe la solicitud, entiende la intención,
            consulta contexto, asigna el agente correcto y ejecuta la siguiente acción.
          </p>
          <div className="demo-status">
            <span className={loading ? "status-dot loading" : hasLiveLeads ? "status-dot live" : "status-dot demo"} />
            {loading
              ? "Conectando con la demo..."
              : hasLiveLeads
                ? "Conectado a leads reales recientes. Los datos personales se mantienen privados."
                : "Vista demo del flujo. Cuando entren leads reales, el proceso se actualiza en tiempo real."}
          </div>
        </div>

        <div className="demo-stage" aria-label="Animación del flujo de BOTZ">
          <div className="phone-panel">
            <div className="panel-top"><span /> WhatsApp</div>
            <div className="chat-bubble client">Hola, quiero saber si BOTZ puede ayudar a mi equipo comercial.</div>
            <div className="chat-bubble bot">Sí. Primero identifico intención, contexto y siguiente paso.</div>
            <div className="chat-bubble bot accent">Lead detectado: prioridad alta.</div>
          </div>

          <div className="flow-panel">
            {flowSteps.map((step, index) => (
              <article className="flow-step" key={step.title} style={{ animationDelay: `${index * 0.28}s` }}>
                <div className="step-index">{String(index + 1).padStart(2, "0")}</div>
                <div>
                  <span>{step.system}</span>
                  <h2>{step.title}</h2>
                  <p>{step.detail}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="outcome-panel">
            <div className="panel-top"><span /> Resultado</div>
            <div className="outcome-card">
              <strong>Siguiente acción creada</strong>
              <p>Agendar llamada comercial y enviar resumen al CRM.</p>
            </div>
            <div className="mini-actions">
              <span>CRM actualizado</span>
              <span>Agente asignado</span>
              <span>Seguimiento programado</span>
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        .demo-page { min-height: 100vh; padding: 110px 24px 54px; color: #f8fdff; background: radial-gradient(circle at 20% 0%, rgba(0, 186, 255, 0.16), transparent 28rem), #070f1d; }
        .demo-shell { max-width: 1180px; margin: 0 auto; }
        .demo-copy { max-width: 860px; }
        .demo-kicker { color: #67e8f9; font-size: 12px; font-weight: 900; letter-spacing: .18em; }
        h1 { margin: 14px 0 0; font-size: clamp(36px, 6vw, 72px); line-height: .98; letter-spacing: -.05em; }
        p { color: #aab8cc; font-size: 18px; line-height: 1.55; }
        .demo-status { display: inline-flex; align-items: center; gap: 10px; margin-top: 8px; padding: 10px 14px; border: 1px solid rgba(103, 232, 249, .2); border-radius: 999px; color: #dff7ff; background: rgba(255,255,255,.04); }
        .status-dot { width: 10px; height: 10px; border-radius: 50%; background: #38bdf8; box-shadow: 0 0 18px rgba(56, 189, 248, .7); }
        .status-dot.loading { background: #fbbf24; }
        .status-dot.live { background: #22c55e; }
        .status-dot.demo { background: #38bdf8; }
        .demo-stage { display: grid; grid-template-columns: .8fr 1.1fr .8fr; gap: 18px; margin-top: 34px; padding: 18px; border: 1px solid rgba(148, 163, 184, .22); border-radius: 30px; background: rgba(15, 23, 42, .62); box-shadow: 0 28px 80px rgba(0,0,0,.35); }
        .phone-panel, .flow-panel, .outcome-panel { min-height: 440px; padding: 16px; border: 1px solid rgba(148, 163, 184, .18); border-radius: 22px; background: rgba(2, 8, 23, .58); }
        .panel-top { display: flex; align-items: center; gap: 8px; color: #dff7ff; font-weight: 800; }
        .panel-top span { width: 9px; height: 9px; border-radius: 50%; background: #22d3ee; box-shadow: 0 0 14px rgba(34, 211, 238, .8); }
        .chat-bubble { margin-top: 18px; padding: 13px 14px; border-radius: 16px; color: #e5f7ff; background: rgba(255,255,255,.07); animation: riseIn 3.8s ease-in-out infinite; }
        .chat-bubble.client { border-top-left-radius: 4px; }
        .chat-bubble.bot { margin-left: 28px; border-top-right-radius: 4px; background: rgba(34, 211, 238, .12); }
        .chat-bubble.accent { color: #00111d; background: linear-gradient(135deg, #67e8f9, #0ea5e9); font-weight: 900; }
        .flow-panel { display: grid; gap: 10px; }
        .flow-step { display: grid; grid-template-columns: 42px 1fr; gap: 12px; align-items: center; padding: 12px; border: 1px solid rgba(103, 232, 249, .14); border-radius: 18px; background: rgba(255,255,255,.04); animation: pulseStep 4s ease-in-out infinite; }
        .step-index { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 12px; color: #06111f; background: #67e8f9; font-weight: 900; }
        .flow-step span { color: #67e8f9; font-size: 11px; font-weight: 900; letter-spacing: .14em; text-transform: uppercase; }
        .flow-step h2 { margin: 4px 0 0; font-size: 17px; }
        .flow-step p { margin: 4px 0 0; font-size: 13px; color: #aab8cc; }
        .outcome-card { margin-top: 22px; padding: 18px; border-radius: 18px; background: linear-gradient(145deg, rgba(34,211,238,.16), rgba(255,255,255,.05)); border: 1px solid rgba(103,232,249,.18); }
        .outcome-card strong { font-size: 22px; }
        .outcome-card p { margin-bottom: 0; font-size: 15px; }
        .mini-actions { display: grid; gap: 10px; margin-top: 18px; }
        .mini-actions span { padding: 11px 12px; border-radius: 14px; color: #dff7ff; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.08); }
        @keyframes pulseStep { 0%, 100% { border-color: rgba(103, 232, 249, .14); transform: translateX(0); } 50% { border-color: rgba(103, 232, 249, .45); transform: translateX(4px); } }
        @keyframes riseIn { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @media (max-width: 980px) { .demo-stage { grid-template-columns: 1fr; } .phone-panel, .flow-panel, .outcome-panel { min-height: auto; } }
      `}</style>
    </main>
  );
}
