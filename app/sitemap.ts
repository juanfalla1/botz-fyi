import type { MetadataRoute } from "next";
import { BLOG_POSTS } from "./blog/posts";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://www.botz.fyi";
  const now = new Date();

  const routes = [
    "",
    "/blog",
    "/pricing",
    "/demo",
    "/ia-hipotecaria",
    "/agentes-ia-inmobiliaria",
    "/bot-hipotecario-whatsapp",
    "/sobre-nosotros",
    "/privacy",
    "/terms",
    "/payment",
  ];

  const baseRoutes = routes.map((route) => ({
    url: `${base}${route}`,
    lastModified: now,
    changeFrequency: (route === "" ? "daily" : "weekly") as "daily" | "weekly",
    priority: route === "" ? 1 : 0.7,
  }));

  const blogRoutes = BLOG_POSTS.map((post) => ({
    url: `${base}/blog/${post.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.72,
  }));

  return [...baseRoutes, ...blogRoutes];
}
