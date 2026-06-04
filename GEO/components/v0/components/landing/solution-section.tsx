"use client"

import { motion } from "framer-motion"
import { Sparkles, CheckCircle2, Zap } from "lucide-react"

const benefits = [
  "Monitoreo en tiempo real de tu visibilidad en IA",
  "Análisis de competidores en motores generativos",
  "Recomendaciones accionables para mejorar citaciones",
  "Tracking de menciones en ChatGPT, Gemini y más",
]

export function SolutionSection() {
  return (
    <section className="relative py-24 px-4 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-primary/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left content */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm text-primary mb-6">
              <Sparkles className="w-4 h-4" />
              <span>La solución</span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-balance">
              <span className="text-gradient">Botz GEO Engine</span>
              <br />
              Tu ventaja competitiva en la era de la IA
            </h2>
            <p className="text-lg text-muted-foreground mb-8 text-pretty">
              La primera plataforma que te permite auditar, monitorear y optimizar cómo los motores de IA recomiendan tu marca.
            </p>

            <ul className="space-y-4">
              {benefits.map((benefit, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-foreground">{benefit}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Right visual */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="relative">
              {/* Main card */}
              <div className="glass rounded-2xl p-8 glow-primary">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">GEO Score</h3>
                    <p className="text-sm text-muted-foreground">Análisis en tiempo real</p>
                  </div>
                </div>

                {/* Score visualization */}
                <div className="relative mb-6">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-5xl font-bold text-gradient">78</span>
                    <span className="text-sm text-green-400">+12 vs mes anterior</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                      initial={{ width: 0 }}
                      whileInView={{ width: "78%" }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: 0.3 }}
                    />
                  </div>
                </div>

                {/* Mini stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-secondary/30 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">Citaciones</p>
                    <p className="text-lg font-semibold text-foreground">247</p>
                  </div>
                  <div className="bg-secondary/30 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">Competidores</p>
                    <p className="text-lg font-semibold text-foreground">+15</p>
                  </div>
                </div>
              </div>

              {/* Floating elements */}
              <motion.div
                className="absolute -top-4 -right-4 glass rounded-xl p-3"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs text-foreground">Monitoreando</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
