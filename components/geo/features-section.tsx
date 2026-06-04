"use client"

import { motion } from "framer-motion"
import { 
  Eye, 
  Quote, 
  Users, 
  Lightbulb, 
  FileSearch, 
  RefreshCw,
  ArrowUpRight
} from "lucide-react"

const features = [
  {
    icon: <Eye className="w-6 h-6" />,
    title: "AI Visibility Score",
    description: "Mide tu presencia en ChatGPT, Gemini, Perplexity y AI Overviews con un score unificado y accionable.",
    gradient: "from-primary/20 to-accent/20"
  },
  {
    icon: <Quote className="w-6 h-6" />,
    title: "Citation Tracking",
    description: "Rastrea cada vez que un motor de IA menciona o recomienda tu marca, productos o contenido.",
    gradient: "from-accent/20 to-chart-3/20"
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "Competitor Intelligence",
    description: "Analiza cómo la IA posiciona a tus competidores y descubre oportunidades para superarlos.",
    gradient: "from-chart-3/20 to-chart-4/20"
  },
  {
    icon: <Lightbulb className="w-6 h-6" />,
    title: "GEO Recommendations",
    description: "Recibe recomendaciones específicas para mejorar cómo los LLMs entienden y recomiendan tu marca.",
    gradient: "from-chart-4/20 to-primary/20"
  },
  {
    icon: <FileSearch className="w-6 h-6" />,
    title: "Content Opportunities",
    description: "Identifica gaps de contenido que puedes crear para aumentar tu visibilidad en respuestas de IA.",
    gradient: "from-primary/20 to-chart-5/20"
  },
  {
    icon: <RefreshCw className="w-6 h-6" />,
    title: "Continuous Monitoring",
    description: "Monitoreo 24/7 de tu visibilidad con alertas instantáneas cuando algo cambia en tu presencia IA.",
    gradient: "from-chart-5/20 to-accent/20"
  }
]

export function FeaturesSection() {
  return (
    <section className="relative py-24 px-4 overflow-hidden">
      <div className="relative z-10 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-balance">
            Todo lo que necesitas para{" "}
            <span className="text-gradient">dominar la IA</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            Una suite completa de herramientas para optimizar tu visibilidad en la nueva era de búsqueda generativa.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              gradient={feature.gradient}
              delay={index * 0.1}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function FeatureCard({
  icon,
  title,
  description,
  gradient,
  delay
}: {
  icon: React.ReactNode
  title: string
  description: string
  gradient: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay }}
      className="group relative"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl`} />
      <div className="relative glass rounded-2xl p-6 h-full hover:border-primary/30 transition-all duration-300 hover:translate-y-[-4px]">
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
            {icon}
          </div>
          <ArrowUpRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </motion.div>
  )
}
