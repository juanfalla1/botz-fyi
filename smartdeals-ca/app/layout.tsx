import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.smart-deals-canada.com"),
  title: {
    default: "Smart Deals Canada",
    template: "%s | Smart Deals Canada",
  },
  description: "Fresh Amazon.ca finds, Canada deals and trending products curated automatically by Smart Deals.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "Smart Deals Canada",
    description: "Fresh Amazon.ca finds and Canada deals updated automatically.",
    url: "https://www.smart-deals-canada.com",
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
