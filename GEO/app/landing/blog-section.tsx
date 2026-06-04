"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowRight, Clock, Sparkles, BookOpen, GitCompare, GraduationCap, TrendingUp, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGeoI18n } from "@/GEO/components/geo/i18n"

export function BlogSection() {
  const { locale } = useGeoI18n()
  const isEn = locale === "en"
  const articles = [
    {
      title: isEn ? "What is GEO in 2026: The new era of AI positioning" : "Qué es GEO en 2026: La nueva era del posicionamiento en IA",
      excerpt: isEn
        ? "Discover how ChatGPT, Gemini, and AI Overviews are replacing traditional SEO and how brands now compete to become AI's recommended answer."
        : "Descubre cómo ChatGPT, Gemini y AI Overviews están reemplazando el SEO tradicional y cómo las marcas ahora compiten por convertirse en la respuesta recomendada por la IA.",
      category: isEn ? "Guide" : "Guía",
      readTime: "8 min",
      cta: isEn ? "Read article" : "Leer artículo",
      href: "/geo/blog/what-is-geo-2026",
      icon: BookOpen,
      gradient: "from-violet-600/40 via-primary/30 to-indigo-600/20",
      accentColor: "text-violet-400",
      glowColor: "bg-violet-500/20"
    },
    {
      title: isEn ? "SEO vs GEO: Key differences shaping the digital future" : "SEO vs GEO: Las diferencias clave que definirán el futuro digital",
      excerpt: isEn
        ? "While SEO optimizes traditional search engines, GEO optimizes how AI models understand, recommend, and cite your brand."
        : "Mientras el SEO optimiza buscadores tradicionales, GEO optimiza cómo los modelos de IA entienden, recomiendan y citan tu marca.",
      category: isEn ? "Comparison" : "Comparativa",
      readTime: "6 min",
      cta: isEn ? "Explore comparison" : "Explorar comparativa",
      href: "/geo/blog/seo-vs-geo",
      icon: GitCompare,
      gradient: "from-cyan-600/40 via-accent/30 to-teal-600/20",
      accentColor: "text-cyan-400",
      glowColor: "bg-cyan-500/20"
    },
    {
      title: isEn ? "How to get ChatGPT to recommend your brand" : "Cómo lograr que ChatGPT recomiende tu marca",
      excerpt: isEn
        ? "Learn practical strategies to improve your AI Visibility Score, increase mentions, and position your company in generative responses."
        : "Aprende estrategias reales para mejorar tu AI Visibility Score, aumentar menciones y posicionar tu empresa dentro de respuestas generativas.",
      category: isEn ? "Tutorial" : "Tutorial",
      readTime: "10 min",
      cta: isEn ? "View guide" : "Ver guía",
      href: "/geo/blog/chatgpt-brand-visibility",
      icon: GraduationCap,
      gradient: "from-emerald-600/40 via-green-500/30 to-teal-600/20",
      accentColor: "text-emerald-400",
      glowColor: "bg-emerald-500/20"
    },
    {
      title: isEn ? "AI Search Optimization: The future of digital marketing in 2026" : "AI Search Optimization: El futuro del marketing digital en 2026",
      excerpt: isEn
        ? "AI-powered search is transforming the internet. Learn how to prepare to lead in ChatGPT, Gemini, and Perplexity."
        : "La búsqueda impulsada por IA está transformando internet. Descubre cómo prepararte para dominar ChatGPT, Gemini y Perplexity.",
      category: isEn ? "Trends" : "Tendencias",
      readTime: "5 min",
      cta: isEn ? "Discover trends" : "Descubrir tendencias",
      href: "/geo/blog/ai-search-optimization",
      icon: TrendingUp,
      gradient: "from-orange-600/40 via-amber-500/30 to-yellow-600/20",
      accentColor: "text-orange-400",
      glowColor: "bg-orange-500/20"
    }
  ]

  return (
    <section id="blog" className="relative py-32 px-4 overflow-hidden">
      {/* Enhanced background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute bottom-0 left-1/4 w-[800px] h-[500px] bg-primary/8 rounded-full blur-[180px]" />
        <div className="absolute top-1/4 right-0 w-[600px] h-[400px] bg-accent/6 rounded-full blur-[150px]" />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-16"
        >
          <div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/20 text-sm text-muted-foreground mb-6"
            >
              <Zap className="w-4 h-4 text-primary" />
              <span className="font-medium">{isEn ? "GEO Resource Center" : "Centro de Recursos GEO"}</span>
            </motion.div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-5 tracking-tight">
              {isEn ? "Master" : "Domina el"}{" "}
              <span className="text-gradient bg-gradient-to-r from-primary via-accent to-chart-3 bg-clip-text text-transparent">AI Search</span>
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
              {isEn
                ? "Advanced strategies, technical guides, and the latest trends in generative AI search optimization."
                : "Estrategias avanzadas, guías técnicas y las últimas tendencias en optimización para motores de IA generativa."}
            </p>
          </div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Button 
              variant="outline" 
              className="glass border-border hover:bg-primary/10 hover:border-primary/40 shrink-0 px-6 py-6 text-base font-medium transition-all duration-300 group"
            >
              {isEn ? "View all articles" : "Ver todos los artículos"}
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {articles.map((article, index) => {
            const IconComponent = article.icon
            return (
              <Link key={index} href={article.href}>
                <motion.article
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.6, delay: index * 0.12 }}
                  className="group relative cursor-pointer h-full"
                >
                {/* Animated hover glow */}
                <motion.div 
                  className={`absolute -inset-1 bg-gradient-to-br ${article.gradient} rounded-3xl opacity-0 group-hover:opacity-100 transition-all duration-700 blur-2xl`}
                  initial={false}
                  whileHover={{ scale: 1.02 }}
                />
                
                <div className="relative glass rounded-2xl overflow-hidden border border-border/50 hover:border-primary/40 transition-all duration-500 h-full flex flex-col">
                  {/* Premium header with gradient and icon */}
                  <div className={`h-56 bg-gradient-to-br ${article.gradient} relative overflow-hidden`}>
                    {/* Animated mesh pattern */}
                    <div className="absolute inset-0 opacity-30">
                      <div className="absolute inset-0" style={{
                        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
                        backgroundSize: '24px 24px'
                      }} />
                    </div>
                    
                    {/* Floating animated elements */}
                    <motion.div 
                      className="absolute top-6 right-6 w-20 h-20 rounded-2xl bg-background/10 backdrop-blur-md border border-white/10"
                      animate={{ 
                        y: [0, -8, 0],
                        rotate: [0, 3, 0]
                      }}
                      transition={{ 
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                    <motion.div 
                      className="absolute bottom-6 left-6 w-14 h-14 rounded-full bg-background/10 backdrop-blur-md border border-white/10"
                      animate={{ 
                        y: [0, 6, 0],
                        x: [0, 4, 0]
                      }}
                      transition={{ 
                        duration: 3.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.5
                      }}
                    />
                    <motion.div 
                      className="absolute top-1/3 left-1/4 w-10 h-10 rounded-lg bg-background/8 backdrop-blur-sm border border-white/5"
                      animate={{ 
                        scale: [1, 1.1, 1],
                        opacity: [0.5, 0.8, 0.5]
                      }}
                      transition={{ 
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 1
                      }}
                    />

                    {/* Center icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.div 
                        className="w-24 h-24 rounded-2xl bg-background/15 backdrop-blur-lg flex items-center justify-center border border-white/20 shadow-2xl"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <IconComponent className="w-10 h-10 text-white/90" strokeWidth={1.5} />
                      </motion.div>
                    </div>

                    {/* Top gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent" />
                  </div>

                  {/* Content */}
                  <div className="p-7 flex-1 flex flex-col">
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`px-3 py-1.5 rounded-full ${article.glowColor} ${article.accentColor} text-xs font-semibold tracking-wide uppercase`}>
                        {article.category}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        {article.readTime}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors duration-300 leading-tight">
                      {article.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-5 flex-1">
                      {article.excerpt}
                    </p>
                    <motion.div 
                      className="flex items-center gap-2 text-sm font-semibold text-primary group-hover:gap-3 transition-all duration-300"
                      whileHover={{ x: 4 }}
                    >
                      <span>{article.cta}</span>
                      <ArrowRight className="w-4 h-4" />
                    </motion.div>
                  </div>
                  </div>
                </motion.article>
              </Link>
            )
          })}
        </div>

        {/* Bottom stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-16 glass rounded-2xl p-6 border border-border/50"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                { value: "50+", label: isEn ? "Published articles" : "Artículos publicados" },
                { value: "10K+", label: isEn ? "Monthly readers" : "Lectores mensuales" },
                { value: "4.9", label: isEn ? "Average rating" : "Calificación promedio" },
                { value: "2026", label: isEn ? "Updated content" : "Contenido actualizado" }
              ].map((stat, i) => (
              <div key={i} className="space-y-1">
                <div className="text-2xl md:text-3xl font-bold text-gradient bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-xs md:text-sm text-muted-foreground font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
