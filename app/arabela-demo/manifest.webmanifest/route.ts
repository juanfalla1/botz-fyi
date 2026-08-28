import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    name: "Arabela Salud",
    short_name: "Arabela",
    description: "Demo de la aplicación institucional Arabela Salud",
    start_url: "/arabela-demo",
    scope: "/arabela-demo",
    display: "standalone",
    background_color: "#f4f7fa",
    theme_color: "#0753a6",
    orientation: "portrait-primary",
    icons: [
      { src: "/arabela-demo/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" },
    ],
  }, { headers: { "Content-Type": "application/manifest+json" } });
}
