import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://smartdeals.ca"),
  title: {
    default: "Smart Deals Canada | Amazon.ca Finds",
    template: "%s | Smart Deals Canada",
  },
  description: "Fresh Amazon.ca finds, Canada deals and trending products curated automatically by Smart Deals.",
  openGraph: {
    title: "Smart Deals Canada",
    description: "Fresh Amazon.ca finds and Canada deals updated automatically.",
    url: "https://smartdeals.ca",
    siteName: "Smart Deals Canada",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-CA">
      <body>{children}</body>
    </html>
  );
}
