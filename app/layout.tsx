import "./styles/globals.css";
import CookieBanner from "./components/CookieBanner";
import Header from "./components/Header";   // 👈 agrega esto

export const metadata = {
  title: "botz - Automatización Inteligente",
  description:
    "Transforma la productividad empresarial con agentes inteligentes",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <Header />   {/* 👈 ahora el header siempre está visible */}
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}




