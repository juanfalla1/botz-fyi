import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Bot Hipotecario por WhatsApp con IA",
  description:
    "Automatiza atencion y seguimiento de leads hipotecarios por WhatsApp con IA: respuesta inmediata, scoring y accion comercial.",
  alternates: { canonical: "/bot-hipotecario-whatsapp" },
};

export default function BotHipotecarioWhatsappPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#070f1d", color: "#e5e7eb", padding: "110px 16px 48px" }}>
      <section style={{ maxWidth: 1040, margin: "0 auto" }}>
        <h1 style={{ fontSize: "clamp(30px,5vw,50px)", lineHeight: 1.05, margin: 0, color: "#fff", fontWeight: 900 }}>
          Bot Hipotecario por WhatsApp
        </h1>
        <p style={{ marginTop: 14, fontSize: 18, maxWidth: 860, color: "#9ca3af" }}>
          Conversaciones automatizadas con IA para captar datos clave, calificar prospectos y activar el siguiente paso comercial sin friccion.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12, marginTop: 22 }}>
          {[
            ["Entrada", "WhatsApp API, formularios y campañas de pago."],
            ["Inteligencia", "Prompt comercial, reglas y scoring de oportunidad."],
            ["Salida", "CRM actualizado, alertas al asesor y tablero de seguimiento."],
          ].map(([title, text]) => (
            <article key={title} style={{ border: "1px solid rgba(148,163,184,.25)", borderRadius: 14, background: "rgba(15,23,42,.45)", padding: 14 }}>
              <h2 style={{ margin: 0, fontSize: 16, color: "#22d3ee" }}>{title}</h2>
              <p style={{ margin: "8px 0 0", color: "#cbd5e1", fontSize: 14, lineHeight: 1.45 }}>{text}</p>
            </article>
          ))}
        </div>

        <div style={{ marginTop: 26, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/pricing" style={{ padding: "10px 14px", borderRadius: 10, fontWeight: 800, background: "#0ea5e9", color: "#07101c", textDecoration: "none" }}>
            Empezar
          </Link>
          <Link href="/demo" style={{ padding: "10px 14px", borderRadius: 10, fontWeight: 800, border: "1px solid rgba(148,163,184,.35)", color: "#e5e7eb", textDecoration: "none" }}>
            Probar demo
          </Link>
        </div>
      </section>
    </main>
  );
}
