"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Clock, Calendar, User, BookOpen, Zap, TrendingUp, Brain, Target, BarChart3, Sparkles, Quote, CheckCircle2, AlertCircle, ChevronRight, Share2, Bookmark } from "lucide-react"
import { Button } from "@/components/ui/button"

const tableOfContents = [
  { id: "introduccion", title: "Introducción" },
  { id: "que-es-geo", title: "¿Qué es GEO?" },
  { id: "por-que-importa", title: "Por qué importa en 2026" },
  { id: "diferencias-seo", title: "GEO vs SEO tradicional" },
  { id: "componentes", title: "Componentes clave" },
  { id: "estrategias", title: "Estrategias de implementación" },
  { id: "metricas", title: "Métricas y KPIs" },
  { id: "conclusion", title: "Conclusión" }
]

const relatedArticles = [
  {
    title: "SEO vs GEO: Las diferencias clave",
    href: "/blog/seo-vs-geo",
    category: "Comparativa"
  },
  {
    title: "Cómo lograr que ChatGPT recomiende tu marca",
    href: "/blog/chatgpt-brand-visibility",
    category: "Tutorial"
  },
  {
    title: "AI Search Optimization: El futuro",
    href: "/blog/ai-search-optimization",
    category: "Tendencias"
  }
]

export default function WhatIsGEO2026Page() {
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
            <Link href="/" className="hover:text-primary transition-colors">Inicio</Link>
            <ChevronRight className="w-4 h-4" />
            <Link href="/#blog" className="hover:text-primary transition-colors">Blog</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground">Guía</span>
          </motion.div>

          {/* Category badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/20 text-violet-400 text-sm font-semibold mb-6"
          >
            <BookOpen className="w-4 h-4" />
            <span>GUÍA COMPLETA</span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight"
          >
            Qué es GEO en 2026:{" "}
            <span className="text-gradient bg-gradient-to-r from-violet-400 via-primary to-accent bg-clip-text text-transparent">
              La nueva era del posicionamiento en IA
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-xl text-muted-foreground mb-8 leading-relaxed"
          >
            Descubre cómo ChatGPT, Gemini y AI Overviews están transformando la búsqueda digital 
            y cómo las marcas ahora compiten por convertirse en la respuesta recomendada por la IA.
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
                <div className="font-medium text-foreground">Equipo Botz</div>
                <div className="text-xs">GEO Research</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>15 Mayo, 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>8 min de lectura</span>
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
              Compartir
            </Button>
            <Button variant="outline" size="sm" className="glass border-border hover:border-primary/40">
              <Bookmark className="w-4 h-4 mr-2" />
              Guardar
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Content Section */}
      <section className="relative px-4 pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-[280px_1fr] gap-12">
            {/* Sticky Table of Contents */}
            <motion.aside
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="hidden lg:block"
            >
              <div className="sticky top-8">
                <div className="glass rounded-2xl p-6 border border-border/50">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                    Contenido
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
              className="max-w-3xl"
            >
              {/* Introduction */}
              <section id="introduccion" className="mb-16">
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  El panorama del marketing digital está experimentando su transformación más significativa 
                  desde la aparición de Google. En 2026, más del 40% de las búsquedas en línea 
                  ya no terminan en un clic tradicional—terminan con una respuesta generada por IA.
                </p>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Esta guía completa te llevará a través de todo lo que necesitas saber sobre 
                  <strong className="text-foreground"> Generative Engine Optimization (GEO)</strong>, 
                  la disciplina que está redefiniendo cómo las marcas se posicionan en la era de la inteligencia artificial.
                </p>
              </section>

              {/* What is GEO */}
              <section id="que-es-geo" className="mb-16">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-violet-400" />
                  </span>
                  ¿Qué es GEO?
                </h2>
                
                <div className="glass rounded-2xl p-6 border border-violet-500/20 mb-8">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-primary/20 flex items-center justify-center shrink-0">
                      <Sparkles className="w-6 h-6 text-violet-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Definición</h4>
                      <p className="text-muted-foreground">
                        <strong className="text-foreground">GEO (Generative Engine Optimization)</strong> es la práctica de optimizar 
                        contenido, datos estructurados y autoridad de marca para maximizar la visibilidad, 
                        citaciones y recomendaciones dentro de respuestas generadas por modelos de IA 
                        como ChatGPT, Gemini, Perplexity y AI Overviews de Google.
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-muted-foreground leading-relaxed mb-6">
                  A diferencia del SEO tradicional que optimiza para algoritmos de ranking basados en palabras clave 
                  y backlinks, GEO se enfoca en cómo los Large Language Models (LLMs) procesan, comprenden 
                  y sintetizan información para generar respuestas.
                </p>

                {/* Key concepts grid */}
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { icon: Target, title: "AI Visibility Score", desc: "Métrica que mide qué tan frecuentemente tu marca aparece en respuestas de IA" },
                    { icon: BarChart3, title: "Citation Rate", desc: "Porcentaje de respuestas donde la IA cita tu contenido como fuente" },
                    { icon: TrendingUp, title: "Brand Mentions", desc: "Frecuencia con la que tu marca es mencionada en contextos relevantes" },
                    { icon: Zap, title: "Semantic Authority", desc: "Nivel de confianza que los LLMs tienen en tu contenido" }
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
                  Por qué importa en 2026
                </h2>

                <p className="text-muted-foreground leading-relaxed mb-8">
                  Los datos son contundentes. La forma en que los usuarios buscan información 
                  ha cambiado fundamentalmente:
                </p>

                {/* Stats visualization */}
                <div className="glass rounded-2xl p-8 border border-border/50 mb-8">
                  <h4 className="text-lg font-semibold mb-6 text-center">Evolución del comportamiento de búsqueda</h4>
                  <div className="space-y-6">
                    {[
                      { label: "Búsquedas que terminan sin clic", value: 65, color: "bg-violet-500" },
                      { label: "Usuarios que prefieren respuestas de IA", value: 58, color: "bg-primary" },
                      { label: "Consultas procesadas por AI Overviews", value: 42, color: "bg-accent" },
                      { label: "Crecimiento de ChatGPT Search YoY", value: 340, color: "bg-emerald-500", suffix: "%" }
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
                    &ldquo;En 2026, si tu marca no aparece en las respuestas de ChatGPT o Gemini, 
                    básicamente no existes para una generación completa de usuarios.&rdquo;
                  </blockquote>
                  <cite className="block mt-4 pl-8 text-sm text-muted-foreground not-italic">
                    — Análisis del mercado de AI Search, Q1 2026
                  </cite>
                </div>
              </section>

              {/* GEO vs SEO */}
              <section id="diferencias-seo" className="mb-16">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-cyan-400" />
                  </span>
                  GEO vs SEO tradicional
                </h2>

                <div className="glass rounded-2xl border border-border/50 overflow-hidden">
                  <div className="grid grid-cols-3 bg-secondary/50 p-4 border-b border-border/50">
                    <div className="font-semibold text-foreground">Aspecto</div>
                    <div className="font-semibold text-center text-muted-foreground">SEO Tradicional</div>
                    <div className="font-semibold text-center text-primary">GEO</div>
                  </div>
                  {[
                    { aspect: "Objetivo", seo: "Rankings en SERPs", geo: "Citaciones en respuestas IA" },
                    { aspect: "Métricas", seo: "Posición, CTR, tráfico", geo: "AI Visibility, Citation Rate" },
                    { aspect: "Contenido", seo: "Keywords, backlinks", geo: "Contexto semántico, entidades" },
                    { aspect: "Algoritmo", seo: "PageRank, señales web", geo: "LLM training data, RAG" },
                    { aspect: "Usuario", seo: "Clics a tu sitio", geo: "Respuesta directa con tu marca" },
                    { aspect: "Competencia", seo: "Top 10 resultados", geo: "Una sola respuesta recomendada" }
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
                  Componentes clave de GEO
                </h2>

                <div className="space-y-6">
                  {[
                    {
                      num: "01",
                      title: "Autoridad Semántica",
                      desc: "Los LLMs evalúan la consistencia y profundidad de tu contenido sobre temas específicos. Cuanto más coherente y experto seas en un dominio, más probable es que te citen.",
                      items: ["Contenido en profundidad por tema", "Consistencia de marca y mensaje", "Datos propietarios y estudios únicos"]
                    },
                    {
                      num: "02",
                      title: "Estructura de Datos",
                      desc: "Schema markup, entidades claramente definidas y relaciones entre conceptos ayudan a los LLMs a comprender y sintetizar tu información.",
                      items: ["JSON-LD y Schema.org optimizado", "Knowledge Graph propio", "APIs de datos estructurados"]
                    },
                    {
                      num: "03",
                      title: "Presencia Multi-Fuente",
                      desc: "Los modelos de IA validan información cruzando múltiples fuentes. Tu marca debe aparecer consistentemente en Wikipedia, medios, papers y más.",
                      items: ["Wikipedia y fuentes autoritativas", "Menciones en prensa y medios", "Citations en papers y estudios"]
                    },
                    {
                      num: "04",
                      title: "Contenido Citeable",
                      desc: "Formatos específicos que los LLMs prefieren citar: estadísticas, definiciones, listas, comparativas y datos únicos.",
                      items: ["Estadísticas propietarias", "Definiciones claras", "Comparativas y benchmarks"]
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
                  Estrategias de implementación
                </h2>

                {/* Warning callout */}
                <div className="glass rounded-xl p-5 border border-orange-500/30 bg-orange-500/5 mb-8">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">Importante</h4>
                      <p className="text-sm text-muted-foreground">
                        GEO no reemplaza el SEO—lo complementa. Las marcas más exitosas en 2026 
                        mantienen estrategias híbridas que optimizan para ambos mundos.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    "Audita tu presencia actual en respuestas de IA",
                    "Identifica gaps en autoridad semántica",
                    "Crea contenido específicamente citeable",
                    "Optimiza structured data para LLMs",
                    "Monitorea menciones en ChatGPT/Gemini",
                    "Construye presencia en fuentes autoritativas",
                    "Desarrolla datos propietarios únicos",
                    "Implementa tracking de AI visibility"
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
                  Métricas y KPIs
                </h2>

                <p className="text-muted-foreground leading-relaxed mb-8">
                  Medir el éxito en GEO requiere nuevas métricas que van más allá del tráfico web tradicional:
                </p>

                <div className="glass rounded-2xl p-6 border border-border/50">
                  <div className="grid md:grid-cols-3 gap-6">
                    {[
                      { metric: "GEO Score", value: "0-100", desc: "Puntuación compuesta de visibilidad en IA" },
                      { metric: "Citation Rate", value: "%", desc: "Porcentaje de queries donde te citan" },
                      { metric: "Brand Mentions", value: "#", desc: "Menciones en respuestas generativas" },
                      { metric: "AI Visibility", value: "%", desc: "Visibilidad en motores de IA" },
                      { metric: "Prompt Coverage", value: "%", desc: "Cobertura de queries relevantes" },
                      { metric: "Competitor Gap", value: "±", desc: "Diferencia vs competidores" }
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
                  Conclusión
                </h2>

                <p className="text-muted-foreground leading-relaxed mb-6">
                  GEO representa el futuro del posicionamiento digital. Las marcas que comiencen a 
                  implementar estrategias de optimización para motores generativos hoy tendrán una 
                  ventaja competitiva significativa en los próximos años.
                </p>

                <p className="text-muted-foreground leading-relaxed mb-8">
                  La clave está en entender que no se trata solo de aparecer en resultados de búsqueda, 
                  sino de convertirse en la fuente de verdad que los modelos de IA eligen citar y recomendar.
                </p>

                {/* CTA Box */}
                <div className="relative glass rounded-2xl p-8 border border-primary/30 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
                  <div className="relative z-10">
                    <h3 className="text-2xl font-bold text-foreground mb-3">
                      ¿Listo para optimizar tu presencia en IA?
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Descubre tu GEO Score actual y obtén recomendaciones personalizadas 
                      para mejorar tu visibilidad en ChatGPT, Gemini y otros motores de IA.
                    </p>
                    <div className="flex flex-wrap gap-4">
                      <Button asChild className="bg-primary hover:bg-primary/90">
                        <Link href="/geo/register">
                          Comenzar auditoría gratuita
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Link>
                      </Button>
                      <Button variant="outline" asChild className="glass border-border hover:border-primary/40">
                        <Link href="/geo/app">
                          Ver demo del dashboard
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </section>

              {/* Related Articles */}
              <section className="border-t border-border pt-12">
                <h3 className="text-xl font-bold mb-6">Artículos relacionados</h3>
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
                        <span>Leer más</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>

              {/* Back to blog */}
              <div className="mt-12 pt-8 border-t border-border">
                <Link 
                  href="/#blog" 
                  className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver al blog
                </Link>
              </div>
            </motion.article>
          </div>
        </div>
      </section>
    </div>
  )
}
