"use client"

import { motion } from "framer-motion"
import { AlertTriangle, TrendingDown, Search } from "lucide-react"

export function ProblemSection() {
  return (
    <section className="relative py-24 px-4 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-destructive/5 to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-destructive/10 text-destructive text-sm mb-6">
            <AlertTriangle className="w-4 h-4" />
            <span>El problema</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-balance">
            Google Search ha cambiado.{" "}
            <span className="text-muted-foreground">Para siempre.</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            El 40% de las búsquedas ya no terminan en un clic. Los usuarios obtienen respuestas directamente de la IA.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          <ProblemCard
            icon={<TrendingDown className="w-6 h-6" />}
            stat="-60%"
            title="Menos clics orgánicos"
            description="El tráfico tradicional de SEO está en declive mientras las respuestas de IA toman el control."
            delay={0}
          />
          <ProblemCard
            icon={<Search className="w-6 h-6" />}
            stat="40%"
            title="Zero-click searches"
            description="Las consultas se resuelven directamente en AI Overviews sin visitar tu sitio."
            delay={0.1}
          />
          <ProblemCard
            icon={<AlertTriangle className="w-6 h-6" />}
            stat="¿?"
            title="Invisible para la IA"
            description="Si no optimizas para motores de IA, tu marca simplemente no existe para millones de usuarios."
            delay={0.2}
          />
        </div>
      </div>
    </section>
  )
}

function ProblemCard({
  icon,
  stat,
  title,
  description,
  delay
}: {
  icon: React.ReactNode
  stat: string
  title: string
  description: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay }}
      className="group relative glass rounded-2xl p-6 hover:border-destructive/30 transition-colors"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative">
        <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mb-4 text-destructive">
          {icon}
        </div>
        <div className="text-4xl font-bold text-foreground mb-2">{stat}</div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </motion.div>
  )
}
