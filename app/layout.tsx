import "./styles/globals.css";
import ClientProvider from "./start/client-provider";
import CookieBanner from "./components/CookieBanner";
import Header from "./components/Header";
import type { Metadata } from "next";


export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.botz.fyi"),
  title: {
    default: "Botz | IA para Agentes, Automatización y Ventas",
    template: "%s | Botz",
  },
  description:
    "Botz impulsa ventas y operación con IA: agentes inteligentes, automatización de procesos, WhatsApp, n8n y dashboards en tiempo real.",
  applicationName: "Botz",
  keywords: [
    "Botz",
    "IA para ventas",
    "agentes IA",
    "automatizacion con IA",
    "automatizacion hipotecaria",
    "bot hipotecario",
    "n8n",
    "WhatsApp API",
    "CRM con IA",
  ],
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-32x32.png",
    apple: "/favicon-512x512.png",
  },
  openGraph: {
    title: "Botz | IA para Agentes, Automatización y Ventas",
    description:
      "Agentes IA, automatizaciones con n8n, WhatsApp y flujos comerciales para captar, calificar y convertir más clientes.",
    url: "https://www.botz.fyi",
    siteName: "Botz",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Botz - IA para automatización y agentes",
      },
    ],
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Botz | IA para Agentes, Automatización y Ventas",
    description:
      "Automatiza ventas y operaciones con Botz: agentes IA, flujos n8n, WhatsApp y dashboards en tiempo real.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 🔹 Schema de Organization (ya validado)
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

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Botz",
    url: "https://www.botz.fyi",
    inLanguage: "es",
    publisher: {
      "@type": "Organization",
      name: "BOTZ",
      url: "https://www.botz.fyi",
    },
  };

  // 🔹 Schema de FAQPage (las 5 preguntas)
  const faqJson = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "¿Qué es BOTZ y cómo ayuda a automatizar procesos empresariales?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "BOTZ es una plataforma de automatización inteligente que integra IA, bots de WhatsApp, n8n y flujos automatizados para optimizar tareas repetitivas, mejorar la atención al cliente y aumentar la productividad de las empresas.",
        },
      },
      {
        "@type": "Question",
        name: "¿BOTZ se conecta con WhatsApp, CRM y otras herramientas?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Sí. BOTZ integra WhatsApp API, CRMs, Google Sheets, Gmail, Telegram, bases de datos, ERPs y otros sistemas mediante n8n e integraciones personalizadas, para que toda la información quede centralizada y automatizada.",
        },
      },
      {
        "@type": "Question",
        name: "¿Qué tipo de procesos puedo automatizar con BOTZ?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Con BOTZ puedes automatizar la captación y calificación de leads, respuestas automáticas con IA, envíos de información, validación de datos y documentos, registro en CRM o bases de datos, notificaciones internas y creación de dashboards para seguimiento de tus flujos.",
        },
      },
      {
        "@type": "Question",
        name: "¿Necesito conocimientos técnicos para usar BOTZ?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "No. BOTZ diseña, configura y mantiene las automatizaciones por ti. Solo defines el proceso que quieres mejorar y nosotros te entregamos el flujo listo, documentado y con monitoreo, para que tu equipo lo use sin conocimientos técnicos.",
        },
      },
      {
        "@type": "Question",
        name: "¿Cuánto tiempo toma implementar una automatización con BOTZ?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Depende del alcance del proyecto. Automatizaciones puntuales, como flujos de leads o atención inicial por WhatsApp, pueden estar listas entre 48 y 72 horas. Proyectos más complejos, integrados con ERPs o múltiples sistemas, suelen tardar entre 7 y 14 días.",
        },
      },
    ],
  };

  return (
    <html lang="es">
        <head>
        {/* Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* FAQPage */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJson) }}
        />
        {/* WebSite */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body>
        {/* ✅ Redirect recovery hash (/#access_token=...&type=recovery) -> /auth/reset#... */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var h = window.location.hash || "";
                  if (h.includes("access_token=") && h.includes("type=recovery")) {
                    window.location.replace("/auth/reset" + h);
                  }
                } catch (e) {}
              })();
            `,
          }}
        />

        <Header />
        <ClientProvider>
          {children}
        </ClientProvider>
        <CookieBanner />
      </body>
    </html>
  );
}


