import type { Metadata, Viewport } from "next"
import { Inter, Geist_Mono } from "next/font/google"
import "@/GEO/app/globals.css"
import { GeoI18nProvider } from "@/GEO/components/geo/i18n"
import { GeoAssistantWidget } from "@/GEO/components/geo/geo-assistant-widget"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})

export const metadata: Metadata = {
  title: "Botz GEO Engine",
  description: "Haz que la IA recomiende tu marca.",
}

export const viewport: Viewport = {
  themeColor: "#0f0a1a",
}

export default function GeoLayout({ children }: { children: React.ReactNode }) {
  return (
    <GeoI18nProvider>
      <div className={`geo-scope ${inter.variable} ${geistMono.variable} font-sans antialiased bg-background`}>
        {children}
        <GeoAssistantWidget />
      </div>
    </GeoI18nProvider>
  )
}
