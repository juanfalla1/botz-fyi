import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "IA Hipotecaria para Captacion y Scoring",
  description:
    "Botz ayuda a empresas hipotecarias a captar, calificar y dar seguimiento a leads con agentes IA, WhatsApp y automatizaciones reales.",
  alternates: { canonical: "/ia-hipotecaria" },
};

export default function IAHipotecariaPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#070f1d", color: "#e5e7eb", padding: "110px 16px 48px" }}>
      <section style={{ maxWidth: 1040, margin: "0 auto" }}>
        <h1 style={{ fontSize: "clamp(30px,5vw,50px)", lineHeight: 1.05, margin: 0, color: "#fff", fontWeight: 900 }}>
          IA Hipotecaria para Captacion, Scoring y Cierre
        </h1>
        <p style={{ marginTop: 14, fontSize: 18, maxWidth: 840, color: "#9ca3af" }}>
          Convierte mas oportunidades con un flujo comercial asistido por IA: captura omnicanal, priorizacion automatica y seguimiento inteligente.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, marginTop: 22 }}>
          {[
            ["Captacion", "WhatsApp, formularios, anuncios y CRM en un solo flujo."],
            ["Scoring IA", "Califica leads por perfil, urgencia y viabilidad financiera."],
            ["Seguimiento", "Recordatorios, tareas y mensajes automaticos en cada etapa."],
            ["Control", "Dashboard con metricas de respuesta, conversion y pipeline."],
          ].map(([title, text]) => (
            <article key={title} style={{ border: "1px solid rgba(148,163,184,.25)", borderRadius: 14, background: "rgba(15,23,42,.45)", padding: 14 }}>
              <h2 style={{ margin: 0, fontSize: 16, color: "#22d3ee" }}>{title}</h2>
              <p style={{ margin: "8px 0 0", color: "#cbd5e1", fontSize: 14, lineHeight: 1.45 }}>{text}</p>
            </article>
          ))}
        </div>

        <div style={{ marginTop: 26, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/demo" style={{ padding: "10px 14px", borderRadius: 10, fontWeight: 800, background: "#0ea5e9", color: "#07101c", textDecoration: "none" }}>
            Ver demo
          </Link>
          <Link href="/pricing" style={{ padding: "10px 14px", borderRadius: 10, fontWeight: 800, border: "1px solid rgba(148,163,184,.35)", color: "#e5e7eb", textDecoration: "none" }}>
            Ver planes
          </Link>
        </div>
      </section>
    </main>
  );
}
