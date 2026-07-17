import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.smart-deals-canada.com"),
  title: {
    default: "SD Canada",
    template: "%s | SD Canada",
  },
  description: "Fresh Amazon.ca finds, Canada deals and trending products curated automatically by Smart Deals.",
  icons: {
    icon: "/Smart%20Deals%20logo.png",
    shortcut: "/Smart%20Deals%20logo.png",
    apple: "/Smart%20Deals%20logo.png",
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
