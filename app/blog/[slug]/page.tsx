import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BLOG_POSTS, getPostBySlug } from "../posts";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) {
    return {
      title: "Articulo no encontrado",
    };
  }

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return notFound();

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      "@type": "Person",
      name: "Juan Carlos Garcia",
    },
    publisher: {
      "@type": "Organization",
      name: "Botz",
      logo: {
        "@type": "ImageObject",
        url: "https://www.botz.fyi/og-image.png",
      },
    },
    mainEntityOfPage: `https://www.botz.fyi/blog/${post.slug}`,
  };

  return (
    <main style={{ minHeight: "100vh", background: "#070f1d", color: "#e5e7eb", padding: "110px 16px 48px" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <article style={{ maxWidth: 860, margin: "0 auto" }}>
        <Link href="/blog" style={{ color: "#38bdf8", textDecoration: "none", fontWeight: 700 }}>
          ← Volver al blog
        </Link>

        <h1 style={{ margin: "12px 0 0", color: "#fff", fontWeight: 900, fontSize: "clamp(30px,5vw,46px)", lineHeight: 1.08 }}>
          {post.title}
        </h1>

        <p style={{ marginTop: 10, color: "#9ca3af", fontSize: 14 }}>
          {post.date} · {post.readTime} · keyword: {post.keyword}
        </p>

        <p style={{ marginTop: 14, color: "#cbd5e1", fontSize: 18, lineHeight: 1.5 }}>{post.description}</p>

        <div style={{ marginTop: 22, display: "grid", gap: 18 }}>
          {post.sections.map((section) => (
            <section key={section.heading}>
              <h2 style={{ margin: 0, color: "#22d3ee", fontSize: 24 }}>{section.heading}</h2>
              <p style={{ marginTop: 8, color: "#d1d5db", lineHeight: 1.65 }}>{section.content}</p>
            </section>
          ))}
        </div>

        <section style={{ marginTop: 28, border: "1px solid rgba(148,163,184,.24)", borderRadius: 14, background: "rgba(15,23,42,.45)", padding: 14 }}>
          <h2 style={{ margin: 0, fontSize: 22, color: "#fff" }}>Preguntas frecuentes</h2>
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {post.faq.map((item) => (
              <div key={item.q}>
                <h3 style={{ margin: 0, color: "#22d3ee", fontSize: 16 }}>{item.q}</h3>
                <p style={{ margin: "5px 0 0", color: "#cbd5e1", lineHeight: 1.5 }}>{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/demo" style={{ padding: "10px 14px", borderRadius: 10, fontWeight: 800, background: "#0ea5e9", color: "#07101c", textDecoration: "none" }}>
            Ver demo
          </Link>
          <Link href="/pricing" style={{ padding: "10px 14px", borderRadius: 10, fontWeight: 800, border: "1px solid rgba(148,163,184,.35)", color: "#e5e7eb", textDecoration: "none" }}>
            Ver planes
          </Link>
        </section>
      </article>
    </main>
  );
}
