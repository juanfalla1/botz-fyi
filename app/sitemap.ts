import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://www.botz.fyi";
  const now = new Date();

  const routes = [
    "",
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

  return routes.map((route) => ({
    url: `${base}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : 0.7,
  }));
}
