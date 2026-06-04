"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Clock, Calendar, User, GitCompare, Zap, TrendingUp, Search, Brain, Target, BarChart3, Sparkles, Quote, CheckCircle2, X, ChevronRight, Share2, Bookmark } from "lucide-react"
import { Button } from "@/components/ui/button"

const tableOfContents = [
  { id: "introduccion", title: "Introducción" },
  { id: "definiciones", title: "Definiciones clave" },
  { id: "comparativa", title: "Comparativa detallada" },
  { id: "cuando-usar", title: "Cuándo usar cada uno" },
  { id: "integracion", title: "Estrategia integrada" },
  { id: "futuro", title: "El futuro híbrido" },
  { id: "conclusion", title: "Conclusión" }
]

const relatedArticles = [
  {
    title: "Qué es GEO en 2026",
    href: "/blog/what-is-geo-2026",
    category: "Guía"
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

export default function SEOvsGEOPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[800px] h-[600px] bg-cyan-600/10 rounded-full blur-[180px]" />
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
            <span className="text-foreground">Comparativa</span>
          </motion.div>

          {/* Category badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/20 text-cyan-400 text-sm font-semibold mb-6"
          >
            <GitCompare className="w-4 h-4" />
            <span>COMPARATIVA</span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight"
          >
            SEO vs GEO:{" "}
            <span className="text-gradient bg-gradient-to-r from-cyan-400 via-primary to-accent bg-clip-text text-transparent">
              Las diferencias clave
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-xl text-muted-foreground mb-8 leading-relaxed"
          >
            Mientras el SEO optimiza para buscadores tradicionales, GEO optimiza cómo los modelos de IA 
            entienden, recomiendan y citan tu marca. Descubre las diferencias que definirán el futuro digital.
          </motion.p>

          {/* Meta info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground mb-8"
          >
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-primary flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-medium text-foreground">Equipo Botz</div>
                <div className="text-xs">GEO Research</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>10 Mayo, 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>6 min de lectura</span>
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

                {/* Quick comparison card */}
                <div className="glass rounded-2xl p-6 border border-cyan-500/20 mt-6">
                  <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-cyan-400" />
                    Resumen rápido
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">SEO</span>
                      <span className="text-foreground">Google Rankings</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">GEO</span>
                      <span className="text-cyan-400">AI Citations</span>
                    </div>
                  </div>
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
                  Durante dos décadas, SEO (Search Engine Optimization) ha sido la piedra angular del marketing digital. 
                  Pero con la irrupción de ChatGPT, Gemini y otros motores de IA generativa, 
                  ha surgido una nueva disciplina: GEO (Generative Engine Optimization).
                </p>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  En esta comparativa exhaustiva, analizaremos las diferencias fundamentales entre ambas estrategias 
                  y cómo las marcas inteligentes están integrando ambos enfoques para dominar el panorama digital de 2026.
                </p>
              </section>

              {/* Definitions */}
              <section id="definiciones" className="mb-16">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-cyan-400" />
                  </span>
                  Definiciones clave
                </h2>

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  {/* SEO Definition */}
                  <div className="glass rounded-2xl p-6 border border-border/50">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center">
                        <Search className="w-6 h-6 text-blue-400" />
                      </div>
                      <h3 className="text-xl font-bold text-foreground">SEO</h3>
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      <strong className="text-foreground">Search Engine Optimization</strong> — Conjunto de técnicas 
                      para mejorar el posicionamiento de un sitio web en los resultados orgánicos de buscadores 
                      como Google, Bing y Yahoo.
                    </p>
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <div className="text-xs text-muted-foreground mb-2">Enfocado en:</div>
                      <div className="flex flex-wrap gap-2">
                        {["Keywords", "Backlinks", "Rankings", "CTR"].map(tag => (
                          <span key={tag} className="px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* GEO Definition */}
                  <div className="glass rounded-2xl p-6 border border-cyan-500/20">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-primary/20 flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-cyan-400" />
                      </div>
                      <h3 className="text-xl font-bold text-foreground">GEO</h3>
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      <strong className="text-foreground">Generative Engine Optimization</strong> — Práctica de optimizar 
                      contenido y autoridad de marca para maximizar visibilidad, citaciones y recomendaciones 
                      en respuestas generadas por IA.
                    </p>
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <div className="text-xs text-muted-foreground mb-2">Enfocado en:</div>
                      <div className="flex flex-wrap gap-2">
                        {["Citaciones", "AI Visibility", "Semántica", "Autoridad"].map(tag => (
                          <span key={tag} className="px-2 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Detailed Comparison */}
              <section id="comparativa" className="mb-16">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-primary" />
                  </span>
                  Comparativa detallada
                </h2>

                {/* Comparison Table */}
                <div className="glass rounded-2xl border border-border/50 overflow-hidden mb-8">
                  <div className="grid grid-cols-3 bg-gradient-to-r from-blue-500/10 via-transparent to-cyan-500/10 p-5 border-b border-border/50">
                    <div className="font-semibold text-foreground">Aspecto</div>
                    <div className="font-semibold text-center text-blue-400">SEO</div>
                    <div className="font-semibold text-center text-cyan-400">GEO</div>
                  </div>
                  {[
                    { 
                      aspect: "Objetivo principal", 
                      seo: "Ranking en página 1 de Google", 
                      geo: "Ser citado en respuestas de IA"
                    },
                    { 
                      aspect: "Métricas clave", 
                      seo: "Posición, impresiones, clics, CTR", 
                      geo: "AI Visibility Score, Citation Rate"
                    },
                    { 
                      aspect: "Tipo de resultado", 
                      seo: "Lista de 10 enlaces azules", 
                      geo: "Una respuesta directa con fuentes"
                    },
                    { 
                      aspect: "Competencia", 
                      seo: "Compites con ~10 resultados", 
                      geo: "Compites por ser LA respuesta"
                    },
                    { 
                      aspect: "Contenido", 
                      seo: "Optimizado para keywords", 
                      geo: "Optimizado para comprensión LLM"
                    },
                    { 
                      aspect: "Autoridad", 
                      seo: "Backlinks y Domain Authority", 
                      geo: "Semantic Authority y E-E-A-T"
                    },
                    { 
                      aspect: "Algoritmo", 
                      seo: "PageRank y señales web", 
                      geo: "Training data de LLMs"
                    },
                    { 
                      aspect: "Tiempo de impacto", 
                      seo: "Semanas a meses", 
                      geo: "Meses a trimestres"
                    }
                  ].map((row, i) => (
                    <div key={i} className={`grid grid-cols-3 p-4 ${i % 2 === 0 ? 'bg-transparent' : 'bg-secondary/20'}`}>
                      <div className="font-medium text-foreground text-sm">{row.aspect}</div>
                      <div className="text-center text-muted-foreground text-sm">{row.seo}</div>
                      <div className="text-center text-cyan-400/90 text-sm">{row.geo}</div>
                    </div>
                  ))}
                </div>

                {/* Visual comparison */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* SEO Journey */}
                  <div className="glass rounded-xl p-6 border border-border/50">
                    <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Search className="w-4 h-4 text-blue-400" />
                      Flujo SEO tradicional
                    </h4>
                    <div className="space-y-3">
                      {[
                        "Usuario busca en Google",
                        "Ve lista de 10 resultados",
                        "Decide qué enlace clicar",
                        "Visita tu sitio web",
                        "Encuentra la información"
                      ].map((step, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          <span className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs text-blue-400">
                            {i + 1}
                          </span>
                          <span className="text-muted-foreground">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* GEO Journey */}
                  <div className="glass rounded-xl p-6 border border-cyan-500/20">
                    <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      Flujo GEO
                    </h4>
                    <div className="space-y-3">
                      {[
                        "Usuario pregunta a ChatGPT",
                        "IA procesa y sintetiza info",
                        "Genera respuesta con fuentes",
                        "Tu marca es citada/recomendada",
                        "Usuario confía en la respuesta"
                      ].map((step, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          <span className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-xs text-cyan-400">
                            {i + 1}
                          </span>
                          <span className="text-muted-foreground">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* When to use each */}
              <section id="cuando-usar" className="mb-16">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <Target className="w-5 h-5 text-emerald-400" />
                  </span>
                  Cuándo usar cada uno
                </h2>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Prioritize SEO */}
                  <div className="glass rounded-xl p-6 border border-border/50">
                    <h4 className="font-semibold text-foreground mb-4">Prioriza SEO cuando:</h4>
                    <ul className="space-y-3">
                      {[
                        "Tu audiencia usa búsqueda tradicional",
                        "Necesitas tráfico web directo",
                        "Vendes productos/servicios locales",
                        "Tu modelo depende de visitas al sitio",
                        "Tienes presupuesto limitado para empezar"
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Prioritize GEO */}
                  <div className="glass rounded-xl p-6 border border-cyan-500/20">
                    <h4 className="font-semibold text-foreground mb-4">Prioriza GEO cuando:</h4>
                    <ul className="space-y-3">
                      {[
                        "Tu audiencia es early adopter de IA",
                        "Buscas posicionamiento de marca",
                        "Compites en mercados B2B/tech",
                        "Tu producto es complejo de explicar",
                        "Quieres ventaja competitiva a largo plazo"
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

              {/* Integration Strategy */}
              <section id="integracion" className="mb-16">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-orange-400" />
                  </span>
                  Estrategia integrada
                </h2>

                {/* Quote callout */}
                <div className="relative glass rounded-2xl p-8 border border-primary/20 mb-8">
                  <Quote className="absolute top-4 left-4 w-8 h-8 text-primary/30" />
                  <blockquote className="text-xl font-medium text-foreground italic pl-8">
                    &ldquo;Las marcas ganadoras en 2026 no eligen entre SEO y GEO—dominan ambos 
                    con una estrategia integrada que maximiza visibilidad en todos los canales de búsqueda.&rdquo;
                  </blockquote>
                </div>

                <p className="text-muted-foreground leading-relaxed mb-8">
                  La realidad es que SEO y GEO no son mutuamente excluyentes. De hecho, muchas tácticas 
                  se complementan y refuerzan mutuamente:
                </p>

                <div className="glass rounded-2xl p-6 border border-border/50">
                  <h4 className="font-semibold text-foreground mb-4">Sinergias SEO + GEO</h4>
                  <div className="space-y-4">
                    {[
                      { 
                        seo: "Contenido de alta calidad",
                        geo: "Contenido citeable por LLMs",
                        benefit: "Un mismo contenido sirve para ambos"
                      },
                      { 
                        seo: "Structured Data (Schema)",
                        geo: "Datos entendibles por IA",
                        benefit: "Schema.org beneficia a ambos"
                      },
                      { 
                        seo: "E-E-A-T (Experience, Expertise)",
                        geo: "Autoridad Semántica",
                        benefit: "La credibilidad se transfiere"
                      },
                      { 
                        seo: "Backlinks de sitios autoritativos",
                        geo: "Citaciones en múltiples fuentes",
                        benefit: "Ambos validan tu autoridad"
                      }
                    ].map((item, i) => (
                      <div key={i} className="grid md:grid-cols-3 gap-4 p-4 rounded-xl bg-secondary/30">
                        <div className="text-sm">
                          <div className="text-xs text-blue-400 mb-1">SEO</div>
                          <div className="text-muted-foreground">{item.seo}</div>
                        </div>
                        <div className="text-sm">
                          <div className="text-xs text-cyan-400 mb-1">GEO</div>
                          <div className="text-muted-foreground">{item.geo}</div>
                        </div>
                        <div className="text-sm">
                          <div className="text-xs text-emerald-400 mb-1">Sinergia</div>
                          <div className="text-foreground font-medium">{item.benefit}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Future */}
              <section id="futuro" className="mb-16">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-accent" />
                  </span>
                  El futuro híbrido
                </h2>

                <p className="text-muted-foreground leading-relaxed mb-8">
                  Para 2027, esperamos ver una convergencia donde las líneas entre SEO y GEO 
                  se difuminen aún más:
                </p>

                {/* Future predictions */}
                <div className="space-y-4">
                  {[
                    {
                      year: "2026",
                      prediction: "AI Overviews de Google integra ambos mundos",
                      icon: Search
                    },
                    {
                      year: "2026",
                      prediction: "ChatGPT Search compite directamente con Google",
                      icon: Brain
                    },
                    {
                      year: "2027",
                      prediction: "Herramientas de marketing unifican SEO + GEO",
                      icon: Target
                    },
                    {
                      year: "2027",
                      prediction: "Nuevas métricas híbridas de visibilidad total",
                      icon: BarChart3
                    }
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: i * 0.1 }}
                      className="flex items-center gap-4 glass rounded-xl p-4 border border-border/50"
                    >
                      <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
                        <item.icon className="w-5 h-5 text-accent" />
                      </div>
                      <div className="flex-1">
                        <span className="text-xs text-accent font-semibold">{item.year}</span>
                        <p className="text-foreground">{item.prediction}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Conclusion */}
              <section id="conclusion" className="mb-16">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </span>
                  Conclusión
                </h2>

                <p className="text-muted-foreground leading-relaxed mb-6">
                  La pregunta no debería ser &ldquo;SEO o GEO&rdquo;, sino &ldquo;cómo integro ambos 
                  de manera efectiva&rdquo;. Las marcas que entiendan esta realidad y desarrollen 
                  capacidades en ambas disciplinas serán las que dominen la visibilidad digital en los próximos años.
                </p>

                <div className="grid md:grid-cols-2 gap-4 mb-8">
                  <div className="glass rounded-xl p-5 border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <X className="w-4 h-4 text-destructive" />
                      <span className="font-semibold text-foreground">No hagas esto</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Abandonar SEO completamente por GEO, o ignorar GEO pensando que SEO es suficiente.
                    </p>
                  </div>
                  <div className="glass rounded-xl p-5 border border-emerald-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="font-semibold text-foreground">Haz esto</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Desarrolla una estrategia híbrida que optimice para buscadores tradicionales y motores de IA.
                    </p>
                  </div>
                </div>

                {/* CTA Box */}
                <div className="relative glass rounded-2xl p-8 border border-primary/30 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-primary/10" />
                  <div className="relative z-10">
                    <h3 className="text-2xl font-bold text-foreground mb-3">
                      Descubre tu posición en ambos mundos
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Analiza cómo tu marca se posiciona tanto en búsqueda tradicional como en motores de IA 
                      con un reporte completo de GEO Score.
                    </p>
                    <div className="flex flex-wrap gap-4">
                      <Button asChild className="bg-primary hover:bg-primary/90">
                        <Link href="/geo/register">
                          Analizar mi marca
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Link>
                      </Button>
                      <Button variant="outline" asChild className="glass border-border hover:border-primary/40">
                        <Link href="/blog/what-is-geo-2026">
                          Leer guía de GEO
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
