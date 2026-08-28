import type { Metadata, Viewport } from "next";
import "./arabela.css";

export const metadata: Metadata = {
  title: "Arabela Salud | Demo institucional",
  description: "Prototipo navegable de la aplicación institucional Arabela Salud.",
  applicationName: "Arabela Salud",
  manifest: "/arabela-demo/manifest.webmanifest",
  icons: {
    icon: "/arabela-demo/icon.svg",
    apple: "/arabela-demo/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0753a6",
  width: "device-width",
  initialScale: 1,
};

export default function ArabelaDemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
