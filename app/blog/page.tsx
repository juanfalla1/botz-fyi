import type { Metadata } from "next";
import Link from "next/link";
import { BLOG_POSTS } from "./posts";

export const metadata: Metadata = {
  title: "Insights de IA, Agentes y Automatizacion",
  description:
    "Analisis de Botz sobre modelos de IA, agentes, automatizacion, integraciones y resultados empresariales.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndexPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#070f1d", color: "#e5e7eb", padding: "110px 16px 48px" }}>
      <section style={{ maxWidth: 980, margin: "0 auto" }}>
        <h1 style={{ margin: 0, color: "#fff", fontWeight: 900, fontSize: "clamp(32px,5vw,48px)", lineHeight: 1.08 }}>
          Insights de IA, agentes y automatizacion
        </h1>
        <p style={{ marginTop: 12, color: "#9ca3af", fontSize: 17, maxWidth: 860 }}>
          Modelos, arquitectura, tendencias y aprendizajes practicos para convertir la IA en resultados empresariales.
        </p>

        <div id="guias-y-tendencias" style={{ marginTop: 24, display: "grid", gap: 12, scrollMarginTop: 100 }}>
          {BLOG_POSTS.map((post) => (
            <article key={post.slug} style={{ border: "1px solid rgba(148,163,184,.24)", borderRadius: 14, background: "rgba(15,23,42,.45)", padding: 14 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#22d3ee", fontWeight: 800 }}>{post.keyword}</span>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>·</span>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>{post.date}</span>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>· {post.readTime}</span>
              </div>
              <h2 style={{ margin: "8px 0 6px", color: "#fff", fontSize: 24, lineHeight: 1.2 }}>{post.title}</h2>
              <p style={{ margin: 0, color: "#cbd5e1", lineHeight: 1.5 }}>{post.description}</p>
              <div style={{ marginTop: 12 }}>
                <Link href={`/blog/${post.slug}`} style={{ color: "#38bdf8", textDecoration: "none", fontWeight: 800 }}>
                  Leer articulo →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
