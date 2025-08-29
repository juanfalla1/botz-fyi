import "./styles/globals.css";
import CookieBanner from "./components/CookieBanner";
import CookieConsent from "./components/CookieConsent";

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
        {children}
        <CookieConsent />
        <CookieBanner />
      </body>
    </html>
  );
}


