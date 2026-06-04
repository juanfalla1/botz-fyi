"use client"

import { motion } from "framer-motion"
import { 
  Eye, 
  Quote, 
  Users, 
  Lightbulb, 
  FileSearch, 
  RefreshCw,
  Sparkles,
  BarChart3,
  Zap
} from "lucide-react"
import { useGeoI18n } from "@/GEO/components/geo/i18n"

export function ProductSection() {
  const { locale } = useGeoI18n()
  const isEn = locale === "en"
  const capabilities = [
    {
      icon: <Eye className="w-5 h-5" />,
      title: isEn ? "Analyze visibility in AI engines" : "Analiza visibilidad en motores de IA",
      description: isEn ? "Measure how your brand appears in ChatGPT, Gemini, Perplexity, and AI Overviews." : "Mide como aparece tu marca en ChatGPT, Gemini, Perplexity y AI Overviews."
    },
    {
      icon: <Quote className="w-5 h-5" />,
      title: isEn ? "Detect mentions and citations" : "Detecta menciones y citaciones",
      description: isEn ? "Track every time an LLM mentions or recommends your brand." : "Rastrea cada vez que un LLM menciona o recomienda tu marca."
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: isEn ? "Compare competitors" : "Compara competidores",
      description: isEn ? "Analyze how AI positions your competitors vs your brand." : "Analiza como la IA posiciona a tu competencia vs tu marca."
    },
    {
      icon: <Lightbulb className="w-5 h-5" />,
      title: isEn ? "Generate GEO recommendations" : "Genera recomendaciones GEO",
      description: isEn ? "Specific actions to improve your AI presence." : "Acciones especificas para mejorar tu presencia en IA."
    },
    {
      icon: <FileSearch className="w-5 h-5" />,
      title: isEn ? "Find content opportunities" : "Identifica oportunidades de contenido",
      description: isEn ? "Discover which content to create to increase visibility." : "Descubre que contenido crear para aumentar visibilidad."
    },
    {
      icon: <RefreshCw className="w-5 h-5" />,
      title: isEn ? "Monitor ranking changes" : "Monitorea cambios en rankings IA",
      description: isEn ? "Alerts when your positioning changes in AI responses." : "Alertas cuando cambia tu posicionamiento en respuestas de IA."
    }
  ]

  return (
    <section id="producto" className="relative py-24 px-4 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-primary/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm text-muted-foreground mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>{isEn ? "AI Search Optimization Platform" : "Plataforma de Optimizacion AI Search"}</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-balance">
            {isEn ? "The definitive" : "La plataforma de"}{" "}
            <span className="text-gradient">GEO definitiva</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto text-pretty">
            {isEn
              ? "Botz GEO Engine is an AI Search Optimization (GEO) platform that helps brands understand how they appear in ChatGPT, Gemini, Perplexity, and AI Overviews."
              : "Botz GEO Engine es una plataforma de AI Search Optimization (GEO) que ayuda a las marcas a entender como aparecen en ChatGPT, Gemini, Perplexity y AI Overviews."}
          </p>
        </motion.div>

        {/* Main content grid */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Dashboard mockup */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="relative order-2 lg:order-1"
          >
            <div className="relative">
              {/* Glow effect behind */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-transparent rounded-3xl blur-2xl" />
              
              {/* Mini dashboard mockup */}
              <div className="relative glass rounded-2xl p-6 border border-border/50">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">GEO Dashboard</div>
                       <div className="text-xs text-muted-foreground">{isEn ? "Overview" : "Vista general"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-chart-4/20 text-chart-4 text-xs font-medium">
                    <Zap className="w-3 h-3" />
                    {isEn ? "Live" : "En vivo"}
                  </div>
                </div>

                {/* Score cards row */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="glass rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-primary">78</div>
                    <div className="text-xs text-muted-foreground">AI Score</div>
                  </div>
                  <div className="glass rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-chart-4">42%</div>
                     <div className="text-xs text-muted-foreground">{isEn ? "Citations" : "Citaciones"}</div>
                  </div>
                  <div className="glass rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-accent">156</div>
                     <div className="text-xs text-muted-foreground">{isEn ? "Mentions" : "Menciones"}</div>
                  </div>
                </div>

                {/* Mini chart */}
                <div className="glass rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                     <span className="text-sm font-medium text-foreground">{isEn ? "Visibility by engine" : "Visibilidad por motor"}</span>
                  </div>
                  <div className="flex items-end justify-between gap-2 h-20">
                    {[75, 62, 88, 45].map((height, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div 
                          className="w-full rounded-t-md bg-gradient-to-t from-primary/50 to-primary"
                          style={{ height: `${height}%` }}
                        />
                        <span className="text-[10px] text-muted-foreground">
                          {["GPT", "Gem", "Perp", "AIO"][i]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right: Capabilities list */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="order-1 lg:order-2"
          >
            <div className="space-y-4">
              {capabilities.map((cap, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="group flex items-start gap-4 p-4 rounded-xl glass hover:border-primary/30 transition-all duration-300"
                >
                  <div className="w-10 h-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                    {cap.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{cap.title}</h3>
                    <p className="text-sm text-muted-foreground">{cap.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
