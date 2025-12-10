import "./styles/globals.css";
import CookieBanner from "./components/CookieBanner";
import Header from "./components/Header";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "botz - Automatización Inteligente",
  description:
    "Botz transforma la productividad empresarial con inteligencia artificial: agentes autónomos, predicciones precisas y dashboards en tiempo real que optimizan procesos y ahorran recursos.",
  keywords: [
    "botz",
    "automatización",
    "inteligencia artificial",
    "IA",
    "procesos",
    "dashboards",
    "optimización",
    "predicción",
  ],
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-32x32.png",
    apple: "/favicon-512x512.png",
  },
  openGraph: {
    title: "botz - Automatización Inteligente",
    description:
      "Automatización con IA: predicciones basadas en datos, optimización de tareas repetitivas y dashboards inteligentes en tiempo real para tu negocio.",
    url: "https://www.botz.fyi",
    siteName: "botz",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "botz - Automatización Inteligente",
      },
    ],
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "botz - Automatización Inteligente",
    description:
      "Potencia tu empresa con inteligencia artificial: agentes autónomos, analítica predictiva y dashboards en tiempo real.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "BOTZ",
    url: "https://www.botz.fyi",
    description:
      "BOTZ automatiza procesos empresariales con IA, WhatsApp bots, n8n e integraciones.",
    logo: "https://www.botz.fyi/og-image.png",
    sameAs: [
      "https://www.instagram.com/botz.fyi/",
      "https://www.linkedin.com/company/botz-ai/",
    ],
    address: [
      {
        "@type": "PostalAddress",
        addressLocality: "Toronto",
        addressRegion: "Ontario",
        streetAddress: "689 The Queensway",
        postalCode: "M8Y 1L1",
        addressCountry: "CA",
      },
      {
        "@type": "PostalAddress",
        addressLocality: "Bogotá",
        addressRegion: "Cundinamarca",
        streetAddress: "Calle 127A # C46-5",
        addressCountry: "CO",
      },
    ],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+57 315 482 9949",
      contactType: "customer service",
    },
  };

  return (
    <html lang="es">
      <head>
        <script
          type="application/ld+json"
          // 👇 Schema.org para Google
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <Header />
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}







