"use client"

import { motion } from "framer-motion"
import { ArrowRight, Clock, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGeoI18n } from "@/GEO/components/geo/i18n"

export function BlogSection() {
  const { locale } = useGeoI18n()
  const isEn = locale === "en"
  const articles = [
    {
      title: isEn ? "What is GEO: Complete guide to Generative Engine Optimization" : "Que es GEO: Guia completa de Generative Engine Optimization",
      excerpt: isEn ? "Learn how optimization for generative AI engines works and why it is crucial for your brand in 2024." : "Descubre como funciona la optimizacion para motores de IA generativa y por que es crucial para tu marca en 2024.",
      category: isEn ? "Guide" : "Guia",
      readTime: "8 min",
      gradient: "from-primary/30 to-accent/20"
    },
    {
      title: isEn ? "SEO vs GEO: Key differences you should know" : "SEO vs GEO: Las diferencias clave que debes conocer",
      excerpt: isEn ? "While SEO optimizes for traditional search engines, GEO focuses on how LLMs understand your brand." : "Mientras el SEO optimiza para buscadores tradicionales, GEO se enfoca en como los LLMs entienden tu marca.",
      category: isEn ? "Comparison" : "Comparativa",
      readTime: "6 min",
      gradient: "from-accent/30 to-chart-3/20"
    },
    {
      title: isEn ? "How to appear in ChatGPT answers" : "Como aparecer en las respuestas de ChatGPT",
      excerpt: isEn ? "Proven strategies to get your brand cited and recommended by ChatGPT and other language models." : "Estrategias probadas para que tu marca sea citada y recomendada por ChatGPT y otros modelos de lenguaje.",
      category: isEn ? "Tutorial" : "Tutorial",
      readTime: "10 min",
      gradient: "from-chart-3/30 to-primary/20"
    },
    {
      title: "AI Search Optimization: " + (isEn ? "The future of digital marketing" : "El futuro del marketing digital"),
      excerpt: isEn ? "40% of users already prefer AI answers. Learn how to position in this new era." : "El 40% de los usuarios ya prefieren respuestas de IA. Aprende a posicionarte en esta nueva era.",
      category: isEn ? "Trends" : "Tendencias",
      readTime: "5 min",
      gradient: "from-chart-4/30 to-accent/20"
    }
  ]

  return (
    <section id="blog" className="relative py-24 px-4 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm text-muted-foreground mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
               <span>{isEn ? "GEO Resources" : "Recursos GEO"}</span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-balance">
              {isEn ? "Learn about" : "Aprende sobre"}{" "}
              <span className="text-gradient">AI Search</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl text-pretty">
              {isEn ? "Guides, tutorials, and the latest trends in optimization for AI engines." : "Guias, tutoriales y las ultimas tendencias en optimizacion para motores de IA."}
            </p>
          </div>
          <Button variant="outline" className="glass border-border hover:bg-secondary shrink-0">
            {isEn ? "View all articles" : "Ver todos los articulos"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {articles.map((article, index) => (
            <motion.article
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative cursor-pointer"
            >
              {/* Hover glow */}
              <div className={`absolute inset-0 bg-gradient-to-br ${article.gradient} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl`} />
              
              <div className="relative glass rounded-2xl overflow-hidden hover:border-primary/30 transition-all duration-300">
                {/* Image placeholder with gradient */}
                <div className={`h-48 bg-gradient-to-br ${article.gradient} relative overflow-hidden`}>
                  {/* Decorative elements */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-32 h-32 rounded-full bg-background/10 backdrop-blur-sm flex items-center justify-center">
                      <Sparkles className="w-12 h-12 text-foreground/50" />
                    </div>
                  </div>
                  {/* Floating elements */}
                  <div className="absolute top-4 right-4 w-16 h-16 rounded-lg bg-background/10 backdrop-blur-sm" />
                  <div className="absolute bottom-4 left-4 w-12 h-12 rounded-full bg-background/10 backdrop-blur-sm" />
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium">
                      {article.category}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {article.readTime}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {article.excerpt}
                  </p>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
