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
      </head>
      <body>
        <Header />
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}





