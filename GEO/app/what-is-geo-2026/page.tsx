"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Clock, Calendar, User, BookOpen, Zap, TrendingUp, Brain, Target, BarChart3, Sparkles, Quote, CheckCircle2, AlertCircle, ChevronRight, Share2, Bookmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGeoI18n } from "@/GEO/components/geo/i18n"

export default function WhatIsGEO2026Page() {
  const { locale } = useGeoI18n()
  const isEn = locale === "en"
  const t = (es: string, en: string) => (isEn ? en : es)

  const tableOfContents = [
    { id: "introduccion", title: t("Introducción", "Introduction") },
    { id: "que-es-geo", title: t("¿Qué es GEO?", "What is GEO?") },
    { id: "por-que-importa", title: t("Por qué importa en 2026", "Why it matters in 2026") },
    { id: "diferencias-seo", title: t("GEO vs SEO tradicional", "GEO vs traditional SEO") },
    { id: "componentes", title: t("Componentes clave", "Key components") },
    { id: "estrategias", title: t("Estrategias de implementación", "Implementation strategies") },
    { id: "metricas", title: t("Métricas y KPIs", "Metrics and KPIs") },
    { id: "conclusion", title: t("Conclusión", "Conclusion") }
  ]

  const relatedArticles = [
    {
      title: t("SEO vs GEO: Las diferencias clave", "SEO vs GEO: Key differences"),
      href: "/geo/blog/seo-vs-geo",
      category: t("Comparativa", "Comparison")
    },
    {
      title: t("Cómo lograr que ChatGPT recomiende tu marca", "How to get ChatGPT to recommend your brand"),
      href: "/geo/blog/chatgpt-brand-visibility",
      category: "Tutorial"
    },
    {
      title: t("AI Search Optimization: El futuro", "AI Search Optimization: The future"),
      href: "/geo/blog/ai-search-optimization",
      category: t("Tendencias", "Trends")
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[800px] h-[600px] bg-violet-600/10 rounded-full blur-[180px]" />
          <div className="absolute bottom-0 right-1/4 w-[600px] h-[400px] bg-primary/8 rounded-full blur-[150px]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2 text-sm text-muted-foreground mb-8"
          >
            <Link href="/geo" className="hover:text-primary transition-colors">{t("Inicio", "Home")}</Link>
            <ChevronRight className="w-4 h-4" />
            <Link href="/geo#blog" className="hover:text-primary transition-colors">Blog</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground">{t("Guía", "Guide")}</span>
          </motion.div>

          {/* Category badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/20 text-violet-400 text-sm font-semibold mb-6"
          >
            <BookOpen className="w-4 h-4" />
            <span>{t("GUÍA COMPLETA", "COMPLETE GUIDE")}</span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight"
          >
            {t("Qué es GEO en 2026:", "What is GEO in 2026:")}{" "}
            <span className="text-gradient bg-gradient-to-r from-violet-400 via-primary to-accent bg-clip-text text-transparent">
              {t("La nueva era del posicionamiento en IA", "The new era of AI positioning")}
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-xl text-muted-foreground mb-8 leading-relaxed"
          >
            {t(
              "Descubre cómo ChatGPT, Gemini y AI Overviews están transformando la búsqueda digital y cómo las marcas ahora compiten por convertirse en la respuesta recomendada por la IA.",
              "Discover how ChatGPT, Gemini, and AI Overviews are transforming digital search, and how brands now compete to become the response recommended by AI."
            )}
          </motion.p>

          {/* Meta info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground mb-8"
          >
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-primary flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-medium text-foreground">{t("Equipo Botz", "Botz Team")}</div>
                <div className="text-xs">GEO Research</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{t("15 Mayo, 2026", "May 15, 2026")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{t("8 min de lectura", "8 min read")}</span>
            </div>
          </motion.div>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex items-center gap-4"
          >
            <Button variant="outline" size="sm" className="glass border-border hover:border-primary/40">
              <Share2 className="w-4 h-4 mr-2" />
              {t("Compartir", "Share")}
            </Button>
            <Button variant="outline" size="sm" className="glass border-border hover:border-primary/40">
              <Bookmark className="w-4 h-4 mr-2" />
              {t("Guardar", "Save")}
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Content Section */}
      <section className="relative px-4 pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)] items-start gap-12">
            {/* Sticky Table of Contents */}
            <motion.aside
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="hidden md:block self-start"
            >
              <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
                <div className="glass rounded-2xl p-6 border border-border/50">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                    {t("Contenido", "Contents")}
                  </h3>
                  <nav className="space-y-1">
                    {tableOfContents.map((item, index) => (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        className="flex items-center gap-3 py-2 px-3 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-all group"
                      >
                        <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-medium group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                          {index + 1}
                        </span>
                        {item.title}
                      </a>
                    ))}
                  </nav>
                </div>
              </div>
            </motion.aside>

            {/* Main Content */}
            <motion.article
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="w-full max-w-none min-w-0"
            >
              {/* Introduction */}
              <section id="introduccion" className="mb-16">
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  {t(
                    "El panorama del marketing digital está experimentando su transformación más significativa desde la aparición de Google. En 2026, más del 40% de las búsquedas en línea ya no terminan en un clic tradicional—terminan con una respuesta generada por IA.",
                    "The digital marketing landscape is experiencing its most significant transformation since the rise of Google. In 2026, more than 40% of online searches no longer end in a traditional click—they end with an AI-generated answer."
                  )}
                </p>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {t("Esta guía completa te llevará a través de todo lo que necesitas saber sobre", "This complete guide will take you through everything you need to know about")}
                  <strong className="text-foreground"> Generative Engine Optimization (GEO)</strong>,
                  {" "}
                  {t("la disciplina que está redefiniendo cómo las marcas se posicionan en la era de la inteligencia artificial.", "the discipline redefining how brands position themselves in the age of artificial intelligence.")}
                </p>
              </section>

              {/* What is GEO */}
              <section id="que-es-geo" className="mb-16">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-violet-400" />
                  </span>
                  {t("¿Qué es GEO?", "What is GEO?")}
                </h2>
                
                <div className="glass rounded-2xl p-6 border border-violet-500/20 mb-8">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-primary/20 flex items-center justify-center shrink-0">
                      <Sparkles className="w-6 h-6 text-violet-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">{t("Definición", "Definition")}</h4>
                      <p className="text-muted-foreground">
                        <strong className="text-foreground">GEO (Generative Engine Optimization)</strong>
                        {" "}
                        {t(
                          "es la práctica de optimizar contenido, datos estructurados y autoridad de marca para maximizar la visibilidad, citaciones y recomendaciones dentro de respuestas generadas por modelos de IA como ChatGPT, Gemini, Perplexity y AI Overviews de Google.",
                          "is the practice of optimizing content, structured data, and brand authority to maximize visibility, citations, and recommendations within responses generated by AI models such as ChatGPT, Gemini, Perplexity, and Google AI Overviews."
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-muted-foreground leading-relaxed mb-6">
                  {t(
                    "A diferencia del SEO tradicional que optimiza para algoritmos de ranking basados en palabras clave y backlinks, GEO se enfoca en cómo los Large Language Models (LLMs) procesan, comprenden y sintetizan información para generar respuestas.",
                    "Unlike traditional SEO, which optimizes for keyword- and backlink-based ranking algorithms, GEO focuses on how Large Language Models (LLMs) process, understand, and synthesize information to generate responses."
                  )}
                </p>

                {/* Key concepts grid */}
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { icon: Target, title: "AI Visibility Score", desc: t("Métrica que mide qué tan frecuentemente tu marca aparece en respuestas de IA", "Metric measuring how often your brand appears in AI responses") },
                    { icon: BarChart3, title: "Citation Rate", desc: t("Porcentaje de respuestas donde la IA cita tu contenido como fuente", "Percentage of responses where AI cites your content as a source") },
                    { icon: TrendingUp, title: "Brand Mentions", desc: t("Frecuencia con la que tu marca es mencionada en contextos relevantes", "How frequently your brand is mentioned in relevant contexts") },
                    { icon: Zap, title: "Semantic Authority", desc: t("Nivel de confianza que los LLMs tienen en tu contenido", "Level of trust LLMs have in your content") }
                  ].map((item, i) => (
                    <div key={i} className="glass rounded-xl p-5 border border-border/50 hover:border-primary/30 transition-colors">
                      <item.icon className="w-5 h-5 text-primary mb-3" />
                      <h4 className="font-semibold text-foreground mb-1">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Why it matters */}
              <section id="por-que-importa" className="mb-16">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </span>
                  {t("Por qué importa en 2026", "Why it matters in 2026")}
                </h2>

                <p className="text-muted-foreground leading-relaxed mb-8">
                  {t(
                    "Los datos son contundentes. La forma en que los usuarios buscan información ha cambiado fundamentalmente:",
                    "The data is clear. The way users search for information has fundamentally changed:"
                  )}
                </p>

                {/* Stats visualization */}
                <div className="glass rounded-2xl p-8 border border-border/50 mb-8">
                  <h4 className="text-lg font-semibold mb-6 text-center">{t("Evolución del comportamiento de búsqueda", "Evolution of search behavior")}</h4>
                  <div className="space-y-6">
                    {[
                      { label: t("Búsquedas que terminan sin clic", "Searches ending without a click"), value: 65, color: "bg-violet-500" },
                      { label: t("Usuarios que prefieren respuestas de IA", "Users who prefer AI answers"), value: 58, color: "bg-primary" },
                      { label: t("Consultas procesadas por AI Overviews", "Queries processed by AI Overviews"), value: 42, color: "bg-accent" },
                      { label: t("Crecimiento de ChatGPT Search YoY", "ChatGPT Search YoY growth"), value: 340, color: "bg-emerald-500", suffix: "%" }
                    ].map((stat, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">{stat.label}</span>
                          <span className="font-semibold text-foreground">{stat.value}{stat.suffix || "%"}</span>
                        </div>
                        <div className="h-3 bg-secondary rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${Math.min(stat.value, 100)}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 1, delay: i * 0.1 }}
                            className={`h-full ${stat.color} rounded-full`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quote callout */}
                <div className="relative glass rounded-2xl p-8 border border-primary/20 mb-8">
                  <Quote className="absolute top-4 left-4 w-8 h-8 text-primary/30" />
                  <blockquote className="text-xl font-medium text-foreground italic pl-8">
                    {t(
                      "\u201cEn 2026, si tu marca no aparece en las respuestas de ChatGPT o Gemini, básicamente no existes para una generación completa de usuarios.\u201d",
                      "\u201cIn 2026, if your brand does not appear in ChatGPT or Gemini responses, you basically do not exist for an entire generation of users.\u201d"
                    )}
                  </blockquote>
                  <cite className="block mt-4 pl-8 text-sm text-muted-foreground not-italic">
                    {t("— Análisis del mercado de AI Search, Q1 2026", "— AI Search market analysis, Q1 2026")}
                  </cite>
                </div>
              </section>

              {/* GEO vs SEO */}
              <section id="diferencias-seo" className="mb-16">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-cyan-400" />
                  </span>
                  {t("GEO vs SEO tradicional", "GEO vs traditional SEO")}
                </h2>

                <div className="glass rounded-2xl border border-border/50 overflow-hidden">
                  <div className="grid grid-cols-3 bg-secondary/50 p-4 border-b border-border/50">
                    <div className="font-semibold text-foreground">{t("Aspecto", "Aspect")}</div>
                    <div className="font-semibold text-center text-muted-foreground">{t("SEO Tradicional", "Traditional SEO")}</div>
                    <div className="font-semibold text-center text-primary">GEO</div>
                  </div>
                  {[
                    { aspect: t("Objetivo", "Goal"), seo: t("Rankings en SERPs", "SERP rankings"), geo: t("Citaciones en respuestas IA", "Citations in AI responses") },
                    { aspect: t("Métricas", "Metrics"), seo: t("Posición, CTR, tráfico", "Position, CTR, traffic"), geo: "AI Visibility, Citation Rate" },
                    { aspect: t("Contenido", "Content"), seo: "Keywords, backlinks", geo: t("Contexto semántico, entidades", "Semantic context, entities") },
                    { aspect: t("Algoritmo", "Algorithm"), seo: t("PageRank, señales web", "PageRank, web signals"), geo: "LLM training data, RAG" },
                    { aspect: t("Usuario", "User"), seo: t("Clics a tu sitio", "Clicks to your site"), geo: t("Respuesta directa con tu marca", "Direct answer with your brand") },
                    { aspect: t("Competencia", "Competition"), seo: t("Top 10 resultados", "Top 10 results"), geo: t("Una sola respuesta recomendada", "A single recommended answer") }
                  ].map((row, i) => (
                    <div key={i} className={`grid grid-cols-3 p-4 ${i % 2 === 0 ? 'bg-transparent' : 'bg-secondary/20'}`}>
                      <div className="font-medium text-foreground">{row.aspect}</div>
                      <div className="text-center text-muted-foreground text-sm">{row.seo}</div>
                      <div className="text-center text-primary text-sm font-medium">{row.geo}</div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Key components */}
              <section id="componentes" className="mb-16">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-emerald-400" />
                  </span>
                  {t("Componentes clave de GEO", "Key GEO components")}
                </h2>

                <div className="space-y-6">
                  {[
                    {
                      num: "01",
                      title: t("Autoridad Semántica", "Semantic Authority"),
                      desc: t("Los LLMs evalúan la consistencia y profundidad de tu contenido sobre temas específicos. Cuanto más coherente y experto seas en un dominio, más probable es que te citen.", "LLMs evaluate the consistency and depth of your content on specific topics. The more coherent and expert you are in a domain, the more likely they are to cite you."),
                      items: [t("Contenido en profundidad por tema", "In-depth content by topic"), t("Consistencia de marca y mensaje", "Brand and messaging consistency"), t("Datos propietarios y estudios únicos", "Proprietary data and unique studies")]
                    },
                    {
                      num: "02",
                      title: t("Estructura de Datos", "Data Structure"),
                      desc: t("Schema markup, entidades claramente definidas y relaciones entre conceptos ayudan a los LLMs a comprender y sintetizar tu información.", "Schema markup, clearly defined entities, and relationships between concepts help LLMs understand and synthesize your information."),
                      items: [t("JSON-LD y Schema.org optimizado", "Optimized JSON-LD and Schema.org"), t("Knowledge Graph propio", "Own Knowledge Graph"), t("APIs de datos estructurados", "Structured data APIs")]
                    },
                    {
                      num: "03",
                      title: t("Presencia Multi-Fuente", "Multi-source Presence"),
                      desc: t("Los modelos de IA validan información cruzando múltiples fuentes. Tu marca debe aparecer consistentemente en Wikipedia, medios, papers y más.", "AI models validate information by cross-checking multiple sources. Your brand must appear consistently on Wikipedia, media outlets, papers, and more."),
                      items: [t("Wikipedia y fuentes autoritativas", "Wikipedia and authoritative sources"), t("Menciones en prensa y medios", "Mentions in press and media"), t("Citations en papers y estudios", "Citations in papers and studies")]
                    },
                    {
                      num: "04",
                      title: t("Contenido Citeable", "Citable Content"),
                      desc: t("Formatos específicos que los LLMs prefieren citar: estadísticas, definiciones, listas, comparativas y datos únicos.", "Specific formats that LLMs prefer to cite: statistics, definitions, lists, comparisons, and unique data."),
                      items: [t("Estadísticas propietarias", "Proprietary statistics"), t("Definiciones claras", "Clear definitions"), t("Comparativas y benchmarks", "Comparisons and benchmarks")]
                    }
                  ].map((component, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                      className="glass rounded-2xl p-6 border border-border/50 hover:border-primary/30 transition-all"
                    >
                      <div className="flex items-start gap-4">
                        <span className="text-4xl font-bold text-primary/30">{component.num}</span>
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-foreground mb-2">{component.title}</h3>
                          <p className="text-muted-foreground mb-4">{component.desc}</p>
                          <ul className="space-y-2">
                            {component.items.map((item, j) => (
                              <li key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Strategies */}
              <section id="estrategias" className="mb-16">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                    <Target className="w-5 h-5 text-orange-400" />
                  </span>
                  {t("Estrategias de implementación", "Implementation strategies")}
                </h2>

                {/* Warning callout */}
                <div className="glass rounded-xl p-5 border border-orange-500/30 bg-orange-500/5 mb-8">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">{t("Importante", "Important")}</h4>
                      <p className="text-sm text-muted-foreground">
                        {t(
                          "GEO no reemplaza el SEO—lo complementa. Las marcas más exitosas en 2026 mantienen estrategias híbridas que optimizan para ambos mundos.",
                          "GEO does not replace SEO—it complements it. The most successful brands in 2026 maintain hybrid strategies that optimize for both worlds."
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    t("Audita tu presencia actual en respuestas de IA", "Audit your current presence in AI responses"),
                    t("Identifica gaps en autoridad semántica", "Identify gaps in semantic authority"),
                    t("Crea contenido específicamente citeable", "Create content specifically citable"),
                    t("Optimiza structured data para LLMs", "Optimize structured data for LLMs"),
                    t("Monitorea menciones en ChatGPT/Gemini", "Monitor mentions in ChatGPT/Gemini"),
                    t("Construye presencia en fuentes autoritativas", "Build presence in authoritative sources"),
                    t("Desarrolla datos propietarios únicos", "Develop unique proprietary data"),
                    t("Implementa tracking de AI visibility", "Implement AI visibility tracking")
                  ].map((strategy, i) => (
                    <div key={i} className="flex items-center gap-3 glass rounded-xl p-4 border border-border/50">
                      <span className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
                        {i + 1}
                      </span>
                      <span className="text-sm text-foreground">{strategy}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Metrics */}
              <section id="metricas" className="mb-16">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-primary" />
                  </span>
                  {t("Métricas y KPIs", "Metrics and KPIs")}
                </h2>

                <p className="text-muted-foreground leading-relaxed mb-8">
                  {t("Medir el éxito en GEO requiere nuevas métricas que van más allá del tráfico web tradicional:", "Measuring GEO success requires new metrics that go beyond traditional web traffic:")}
                </p>

                <div className="glass rounded-2xl p-6 border border-border/50">
                  <div className="grid md:grid-cols-3 gap-6">
                    {[
                      { metric: "GEO Score", value: "0-100", desc: t("Puntuación compuesta de visibilidad en IA", "Composite AI visibility score") },
                      { metric: "Citation Rate", value: "%", desc: t("Porcentaje de queries donde te citan", "Percentage of queries where you are cited") },
                      { metric: "Brand Mentions", value: "#", desc: t("Menciones en respuestas generativas", "Mentions in generative responses") },
                      { metric: "AI Visibility", value: "%", desc: t("Visibilidad en motores de IA", "Visibility in AI engines") },
                      { metric: "Prompt Coverage", value: "%", desc: t("Cobertura de queries relevantes", "Coverage of relevant queries") },
                      { metric: "Competitor Gap", value: "±", desc: t("Diferencia vs competidores", "Difference vs competitors") }
                    ].map((item, i) => (
                      <div key={i} className="text-center p-4 rounded-xl bg-secondary/30">
                        <div className="text-2xl font-bold text-primary mb-1">{item.value}</div>
                        <div className="font-semibold text-foreground text-sm mb-1">{item.metric}</div>
                        <div className="text-xs text-muted-foreground">{item.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Conclusion */}
              <section id="conclusion" className="mb-16">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-accent" />
                  </span>
                  {t("Conclusión", "Conclusion")}
                </h2>

                <p className="text-muted-foreground leading-relaxed mb-6">
                  {t(
                    "GEO representa el futuro del posicionamiento digital. Las marcas que comiencen a implementar estrategias de optimización para motores generativos hoy tendrán una ventaja competitiva significativa en los próximos años.",
                    "GEO represents the future of digital positioning. Brands that start implementing optimization strategies for generative engines today will have a significant competitive advantage in the coming years."
                  )}
                </p>

                <p className="text-muted-foreground leading-relaxed mb-8">
                  {t(
                    "La clave está en entender que no se trata solo de aparecer en resultados de búsqueda, sino de convertirse en la fuente de verdad que los modelos de IA eligen citar y recomendar.",
                    "The key is understanding that it is not only about appearing in search results, but becoming the source of truth AI models choose to cite and recommend."
                  )}
                </p>

                {/* CTA Box */}
                <div className="relative glass rounded-2xl p-8 border border-primary/30 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
                  <div className="relative z-10">
                    <h3 className="text-2xl font-bold text-foreground mb-3">
                      {t("¿Listo para optimizar tu presencia en IA?", "Ready to optimize your AI presence?")}
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      {t(
                        "Descubre tu GEO Score actual y obtén recomendaciones personalizadas para mejorar tu visibilidad en ChatGPT, Gemini y otros motores de IA.",
                        "Discover your current GEO Score and get personalized recommendations to improve your visibility in ChatGPT, Gemini, and other AI engines."
                      )}
                    </p>
                    <div className="flex flex-wrap gap-4">
                      <Button asChild className="bg-primary hover:bg-primary/90">
                        <Link href="/geo/register">
                          {t("Comenzar auditoría gratuita", "Start free audit")}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Link>
                      </Button>
                      <Button variant="outline" asChild className="glass border-border hover:border-primary/40">
                        <Link href="/geo/app">
                          {t("Ver demo del dashboard", "View dashboard demo")}
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </section>

              {/* Related Articles */}
              <section className="border-t border-border pt-12">
                <h3 className="text-xl font-bold mb-6">{t("Artículos relacionados", "Related articles")}</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {relatedArticles.map((article, i) => (
                    <Link
                      key={i}
                      href={article.href}
                      className="glass rounded-xl p-5 border border-border/50 hover:border-primary/40 transition-all group"
                    >
                      <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                        {article.category}
                      </span>
                      <h4 className="font-semibold text-foreground mt-2 group-hover:text-primary transition-colors">
                        {article.title}
                      </h4>
                      <div className="flex items-center gap-1 mt-3 text-sm text-muted-foreground group-hover:text-primary transition-colors">
                        <span>{t("Leer más", "Read more")}</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>

              {/* Back to blog */}
              <div className="mt-12 pt-8 border-t border-border">
                <Link 
                  href="/geo#blog" 
                  className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t("Volver al blog", "Back to blog")}
                </Link>
              </div>
            </motion.article>
          </div>
        </div>
      </section>
    </div>
  )
}
