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
      <body>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.addEventListener('click', function (event) {
                var link = event.target && event.target.closest ? event.target.closest('a') : null;
                if (!link) return;
                var href = link.getAttribute('href') || '';
                if (!href.match(/^\/go\/[A-Za-z0-9]{10}/)) return;
                try {
                  var url = new URL(href, window.location.origin);
                  var record = {
                    asin: (url.pathname.split('/').pop() || '').toUpperCase(),
                    source: url.searchParams.get('source') || 'unknown',
                    timestamp: Date.now(),
                    path: window.location.pathname
                  };
                  localStorage.setItem('sdc_last_amazon_click', JSON.stringify(record));
                } catch (error) {}
              }, { capture: true });
            `,
          }}
        />
      </body>
    </html>
  );
}
