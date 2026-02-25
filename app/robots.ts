import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/start/", "/dashboard", "/settings", "/login"],
      },
    ],
    sitemap: "https://www.botz.fyi/sitemap.xml",
    host: "https://www.botz.fyi",
  };
}
