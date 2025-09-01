import "./styles/globals.css";
import CookieBanner from "./components/CookieBanner";
import Header from "./components/Header";

export const metadata = {
  title: "botz - Automatización Inteligente",
  description:
    "Botz: Automatización Inteligente con IA, optimización de procesos y dashboards en tiempo real.",
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
      "Automatización con IA: predicciones, optimización y dashboards en tiempo real.",
    url: "https://tusitio.com", // 🔹 cámbialo por tu dominio real
    siteName: "botz",
    images: [
      {
        url: "/favicon-512x512.png", // 🔹 puedes cambiarlo por un banner más grande si quieres
        width: 512,
        height: 512,
        alt: "botz logo",
      },
    ],
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "botz - Automatización Inteligente",
    description:
      "Automatización con IA: predicciones, optimización y dashboards en tiempo real.",
    images: ["/favicon-512x512.png"], // 🔹 también puedes usar un banner aquí
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






