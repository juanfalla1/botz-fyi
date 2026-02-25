import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Agentes IA para Inmobiliaria y Ventas",
  description:
    "Implementa agentes IA comerciales para inmobiliaria: respuesta inmediata, calificacion de leads y automatizacion del seguimiento.",
  alternates: { canonical: "/agentes-ia-inmobiliaria" },
};

export default function AgentesIAInmobiliariaPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#070f1d", color: "#e5e7eb", padding: "110px 16px 48px" }}>
      <section style={{ maxWidth: 1040, margin: "0 auto" }}>
        <h1 style={{ fontSize: "clamp(30px,5vw,50px)", lineHeight: 1.05, margin: 0, color: "#fff", fontWeight: 900 }}>
          Agentes IA para Inmobiliaria
        </h1>
        <p style={{ marginTop: 14, fontSize: 18, maxWidth: 860, color: "#9ca3af" }}>
          Atiende prospectos en segundos, prioriza oportunidades y automatiza tareas comerciales con agentes IA entrenados para tu proceso.
        </p>

        <div style={{ marginTop: 20, border: "1px solid rgba(148,163,184,.25)", borderRadius: 14, background: "rgba(15,23,42,.45)", padding: 16 }}>
          <h2 style={{ margin: 0, color: "#22d3ee", fontSize: 18 }}>Que resuelve en operacion diaria</h2>
          <ul style={{ margin: "10px 0 0", paddingLeft: 18, lineHeight: 1.6, color: "#cbd5e1" }}>
            <li>Respuesta automatica en WhatsApp y web para no perder leads.</li>
            <li>Clasificacion por interes, presupuesto y urgencia.</li>
            <li>Seguimiento automatico para citas, documentos y cierres.</li>
            <li>Integracion con CRM, hojas de calculo y correo.</li>
          </ul>
        </div>

        <div style={{ marginTop: 26, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/start/agents/notetaker" style={{ padding: "10px 14px", borderRadius: 10, fontWeight: 800, background: "#0ea5e9", color: "#07101c", textDecoration: "none" }}>
            Ver copiloto comercial
          </Link>
          <Link href="/demo" style={{ padding: "10px 14px", borderRadius: 10, fontWeight: 800, border: "1px solid rgba(148,163,184,.35)", color: "#e5e7eb", textDecoration: "none" }}>
            Ver demo
          </Link>
        </div>
      </section>
    </main>
  );
}
