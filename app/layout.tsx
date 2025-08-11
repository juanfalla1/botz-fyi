import './styles/globals.css';

export const metadata = {
  title: 'botz - Automatización Inteligente',
  description: 'Transforma la productividad empresarial con agentes inteligentes',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
