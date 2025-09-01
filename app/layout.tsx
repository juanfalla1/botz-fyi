import "./styles/globals.css";
import CookieBanner from "./components/CookieBanner";
import Header from "./components/Header";

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
    "predicción"
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
    url: "https://www.botz.fyi", // cámbialo por tu dominio si es distinto
    siteName: "botz",
    images: [
      {
        url: "/og-image.png", // 🔹 Aquí va la imagen OG que te generaré (1200x630)
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
    images: ["/og-image.png"], // 🔹 Usamos la misma imagen OG
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <Header />
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}







