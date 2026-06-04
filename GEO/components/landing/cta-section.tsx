"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles } from "lucide-react"
import { useGeoI18n } from "@/GEO/components/geo/i18n"

export function CTASection() {
  const { locale } = useGeoI18n()
  const isEn = locale === "en"

  return (
    <section className="relative py-24 px-4 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-primary/20 rounded-full blur-[150px] animate-pulse-glow" />
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-accent/20 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: "2s" }} />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="glass rounded-3xl p-8 md:p-12 text-center glow-primary"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm mb-6">
            <Sparkles className="w-4 h-4" />
            <span>{isEn ? "Start free" : "Comienza gratis"}</span>
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-balance">
            {isEn ? "Ready to dominate" : "Listo para dominar la"}{" "}
            <span className="text-gradient">{isEn ? "AI search" : "busqueda con IA"}</span>?
          </h2>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 text-pretty">
            {isEn
              ? "Join the brands already optimizing their visibility on ChatGPT, Gemini, Perplexity, and AI Overviews."
              : "Unete a las marcas que ya estan optimizando su visibilidad en ChatGPT, Gemini, Perplexity y AI Overviews."}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" className="text-base px-8 py-6 bg-primary hover:bg-primary/90 glow-primary" asChild>
              <Link href="/geo/register">
              {isEn ? "Create GEO Audit" : "Crear GEO Audit"}
              <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8 py-6 glass border-border hover:bg-secondary" asChild>
              <Link href="/geo/agendar-demo">
              {isEn ? "Book demo" : "Agendar demo"}
              </Link>
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mt-6">
            {isEn ? "No credit card required • Setup in 5 minutes" : "No requiere tarjeta de credito • Setup en 5 minutos"}
          </p>
        </motion.div>
      </div>
    </section>
  )
}
