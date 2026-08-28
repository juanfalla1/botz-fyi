import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "CIE | Demo de gestión SAIE",
  description: "Demo comercial ficticio para la gestión integral de una institución SAIE de gran escala.",
  applicationName: "CIE Demo",
  manifest: "/cie-demo/manifest.webmanifest",
  icons: {
    icon: "/cie-demo/icon.svg",
    apple: "/cie-demo/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#123c69",
  width: "device-width",
  initialScale: 1,
};

export default function CieDemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
