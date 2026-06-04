"use client"

import { motion } from "framer-motion"
import { Globe, Brain, Search, BarChart3, Lightbulb, Rocket } from "lucide-react"

const steps = [
  {
    icon: <Globe className="w-6 h-6" />,
    number: "01",
    title: "Crawl",
    description: "Analizamos tu sitio web, contenido y presencia digital existente."
  },
  {
    icon: <Brain className="w-6 h-6" />,
    number: "02",
    title: "Analyze",
    description: "Procesamos tu información con nuestro motor de análisis GEO."
  },
  {
    icon: <Search className="w-6 h-6" />,
    number: "03",
    title: "Query AI Engines",
    description: "Consultamos ChatGPT, Gemini, Perplexity y AI Overviews."
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    number: "04",
    title: "Score",
    description: "Calculamos tu AI Visibility Score y métricas clave."
  },
  {
    icon: <Lightbulb className="w-6 h-6" />,
    number: "05",
    title: "Recommend",
    description: "Generamos recomendaciones personalizadas para tu marca."
  },
  {
    icon: <Rocket className="w-6 h-6" />,
    number: "06",
    title: "Optimize",
    description: "Implementa las mejoras y observa cómo crece tu visibilidad."
  }
]

export function HowItWorksSection() {
  return (
    <section className="relative py-24 px-4 overflow-hidden">
      {/* Background effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-balance">
            Cómo funciona
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            Un proceso simple de 6 pasos para dominar tu visibilidad en motores de IA.
          </p>
        </motion.div>

        {/* Steps grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative"
            >
              {/* Connection line for desktop */}
              {index < steps.length - 1 && index !== 2 && (
                <div className="hidden lg:block absolute top-8 left-full w-full h-[1px] bg-gradient-to-r from-border to-transparent z-0" />
              )}
              
              <div className="relative glass rounded-2xl p-6 hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    {step.icon}
                  </div>
                  <span className="text-3xl font-bold text-primary/30">{step.number}</span>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
