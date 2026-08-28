import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    name: "CIE - Centro de Integración Escolar",
    short_name: "CIE",
    description: "Demo comercial de gestión integral SAIE",
    start_url: "/cie-demo",
    scope: "/cie-demo",
    display: "standalone",
    background_color: "#f4f7f8",
    theme_color: "#123c69",
    orientation: "portrait-primary",
    icons: [
      { src: "/cie-demo/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" },
    ],
  }, { headers: { "Content-Type": "application/manifest+json" } });
}
