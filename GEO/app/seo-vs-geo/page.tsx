"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Clock, Calendar, User, GitCompare, Zap, TrendingUp, Search, Brain, Target, BarChart3, Sparkles, Quote, CheckCircle2, X, ChevronRight, Share2, Bookmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGeoI18n } from "@/GEO/components/geo/i18n"

export default function SEOvsGEOPage() {
  const { locale } = useGeoI18n()
  const isEn = locale === "en"
  const t = (es: string, en: string) => (isEn ? en : es)

  const tableOfContents = [
    { id: "introduccion", title: t("Introducción", "Introduction") },
    { id: "definiciones", title: t("Definiciones clave", "Key definitions") },
    { id: "comparativa", title: t("Comparativa detallada", "Detailed comparison") },
    { id: "cuando-usar", title: t("Cuándo usar cada uno", "When to use each") },
    { id: "integracion", title: t("Estrategia integrada", "Integrated strategy") },
    { id: "futuro", title: t("El futuro híbrido", "The hybrid future") },
    { id: "conclusion", title: t("Conclusión", "Conclusion") },
  ]

  const relatedArticles = [
    { title: t("Qué es GEO en 2026", "What is GEO in 2026"), href: "/geo/blog/what-is-geo-2026", category: t("Guía", "Guide") },
    { title: t("Cómo lograr que ChatGPT recomiende tu marca", "How to get ChatGPT to recommend your brand"), href: "/geo/blog/chatgpt-brand-visibility", category: t("Tutorial", "Tutorial") },
    { title: t("AI Search Optimization: El futuro", "AI Search Optimization: The future"), href: "/geo/blog/ai-search-optimization", category: t("Tendencias", "Trends") },
  ]

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
            <Link href="/geo" className="hover:text-primary transition-colors">{t("Inicio", "Home")}</Link>
            <ChevronRight className="w-4 h-4" />
            <Link href="/geo#blog" className="hover:text-primary transition-colors">Blog</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground">{t("Comparativa", "Comparison")}</span>
          </motion.div>

          {/* Category badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/20 text-cyan-400 text-sm font-semibold mb-6"
          >
            <GitCompare className="w-4 h-4" />
            <span>{t("COMPARATIVA", "COMPARISON")}</span>
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
              {t("Las diferencias clave", "Key differences")}
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
              "Mientras el SEO optimiza para buscadores tradicionales, GEO optimiza cómo los modelos de IA entienden, recomiendan y citan tu marca. Descubre las diferencias que definirán el futuro digital.",
              "While SEO optimizes for traditional search engines, GEO optimizes how AI models understand, recommend, and cite your brand. Discover the differences shaping the digital future."
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
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-primary flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-medium text-foreground">{t("Equipo Botz", "Botz Team")}</div>
                <div className="text-xs">GEO Research</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{t("10 Mayo, 2026", "May 10, 2026")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{t("6 min de lectura", "6 min read")}</span>
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

                {/* Quick comparison card */}
                <div className="glass rounded-2xl p-6 border border-cyan-500/20 mt-6">
                  <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-cyan-400" />
                    {t("Resumen rápido", "Quick summary")}
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
              className="w-full max-w-none min-w-0"
            >
              {/* Introduction */}
              <section id="introduccion" className="mb-16">
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  {t(
                    "Durante dos décadas, SEO (Search Engine Optimization) ha sido la piedra angular del marketing digital. Pero con la irrupción de ChatGPT, Gemini y otros motores de IA generativa, ha surgido una nueva disciplina: GEO (Generative Engine Optimization).",
                    "For two decades, SEO (Search Engine Optimization) has been the cornerstone of digital marketing. But with the rise of ChatGPT, Gemini, and other generative AI engines, a new discipline has emerged: GEO (Generative Engine Optimization)."
                  )}
                </p>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {t(
                    "En esta comparativa exhaustiva, analizaremos las diferencias fundamentales entre ambas estrategias y cómo las marcas inteligentes están integrando ambos enfoques para dominar el panorama digital de 2026.",
                    "In this in-depth comparison, we will analyze the fundamental differences between both strategies and how smart brands are integrating both approaches to dominate the 2026 digital landscape."
                  )}
                </p>
              </section>

              {/* Definitions */}
              <section id="definiciones" className="mb-16">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-cyan-400" />
                  </span>
                  {t("Definiciones clave", "Key definitions")}
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
                      <strong className="text-foreground">Search Engine Optimization</strong>
                      {" — "}
                      {t(
                        "Conjunto de técnicas para mejorar el posicionamiento de un sitio web en los resultados orgánicos de buscadores como Google, Bing y Yahoo.",
                        "A set of techniques to improve a website's ranking in organic search results on engines like Google, Bing, and Yahoo."
                      )}
                    </p>
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <div className="text-xs text-muted-foreground mb-2">{t("Enfocado en:", "Focused on:")}</div>
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
                      <strong className="text-foreground">Generative Engine Optimization</strong>
                      {" — "}
                      {t(
                        "Práctica de optimizar contenido y autoridad de marca para maximizar visibilidad, citaciones y recomendaciones en respuestas generadas por IA.",
                        "The practice of optimizing content and brand authority to maximize visibility, citations, and recommendations in AI-generated responses."
                      )}
                    </p>
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <div className="text-xs text-muted-foreground mb-2">{t("Enfocado en:", "Focused on:")}</div>
                      <div className="flex flex-wrap gap-2">
                        {[t("Citaciones", "Citations"), "AI Visibility", t("Semántica", "Semantics"), t("Autoridad", "Authority")].map(tag => (
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
                  {t("Comparativa detallada", "Detailed comparison")}
                </h2>

                {/* Comparison Table */}
                <div className="glass rounded-2xl border border-border/50 overflow-hidden mb-8">
                  <div className="grid grid-cols-3 bg-gradient-to-r from-blue-500/10 via-transparent to-cyan-500/10 p-5 border-b border-border/50">
                    <div className="font-semibold text-foreground">{t("Aspecto", "Aspect")}</div>
                    <div className="font-semibold text-center text-blue-400">SEO</div>
                    <div className="font-semibold text-center text-cyan-400">GEO</div>
                  </div>
                  {[
                    { 
                      aspect: t("Objetivo principal", "Primary goal"), 
                      seo: t("Ranking en página 1 de Google", "Rank on Google page 1"), 
                      geo: t("Ser citado en respuestas de IA", "Be cited in AI responses")
                    },
                    { 
                      aspect: t("Métricas clave", "Key metrics"), 
                      seo: t("Posición, impresiones, clics, CTR", "Position, impressions, clicks, CTR"), 
                      geo: "AI Visibility Score, Citation Rate"
                    },
                    { 
                      aspect: t("Tipo de resultado", "Result type"), 
                      seo: t("Lista de 10 enlaces azules", "List of 10 blue links"), 
                      geo: t("Una respuesta directa con fuentes", "A direct answer with sources")
                    },
                    { 
                      aspect: t("Competencia", "Competition"), 
                      seo: t("Compites con ~10 resultados", "You compete with ~10 results"), 
                      geo: t("Compites por ser LA respuesta", "You compete to be THE answer")
                    },
                    { 
                      aspect: t("Contenido", "Content"), 
                        seo: t("Optimizado para keywords", "Optimized for keywords"), 
                      geo: t("Optimizado para comprensión LLM", "Optimized for LLM understanding")
                    },
                    { 
                      aspect: t("Autoridad", "Authority"), 
                      seo: t("Backlinks y Domain Authority", "Backlinks and Domain Authority"), 
                      geo: t("Semantic Authority y E-E-A-T", "Semantic Authority and E-E-A-T")
                    },
                    { 
                      aspect: t("Algoritmo", "Algorithm"), 
                      seo: t("PageRank y señales web", "PageRank and web signals"), 
                      geo: t("Training data de LLMs", "LLM training data")
                    },
                    { 
                      aspect: t("Tiempo de impacto", "Time to impact"), 
                      seo: t("Semanas a meses", "Weeks to months"), 
                      geo: t("Meses a trimestres", "Months to quarters")
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
                      {t("Flujo SEO tradicional", "Traditional SEO flow")}
                    </h4>
                    <div className="space-y-3">
                      {[
                        t("Usuario busca en Google", "User searches on Google"),
                        t("Ve lista de 10 resultados", "Sees list of 10 results"),
                        t("Decide qué enlace clicar", "Decides which link to click"),
                        t("Visita tu sitio web", "Visits your website"),
                        t("Encuentra la información", "Finds the information")
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
                      {t("Flujo GEO", "GEO flow")}
                    </h4>
                    <div className="space-y-3">
                      {[
                        t("Usuario pregunta a ChatGPT", "User asks ChatGPT"),
                        t("IA procesa y sintetiza info", "AI processes and synthesizes info"),
                        t("Genera respuesta con fuentes", "Generates answer with sources"),
                        t("Tu marca es citada/recomendada", "Your brand is cited/recommended"),
                        t("Usuario confía en la respuesta", "User trusts the answer")
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
                  {t("Cuándo usar cada uno", "When to use each")}
                </h2>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Prioritize SEO */}
                  <div className="glass rounded-xl p-6 border border-border/50">
                    <h4 className="font-semibold text-foreground mb-4">{t("Prioriza SEO cuando:", "Prioritize SEO when:")}</h4>
                    <ul className="space-y-3">
                      {[
                        t("Tu audiencia usa búsqueda tradicional", "Your audience uses traditional search"),
                        t("Necesitas tráfico web directo", "You need direct web traffic"),
                        t("Vendes productos/servicios locales", "You sell local products/services"),
                        t("Tu modelo depende de visitas al sitio", "Your model depends on site visits"),
                        t("Tienes presupuesto limitado para empezar", "You have a limited starting budget")
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
                    <h4 className="font-semibold text-foreground mb-4">{t("Prioriza GEO cuando:", "Prioritize GEO when:")}</h4>
                    <ul className="space-y-3">
                      {[
                        t("Tu audiencia es early adopter de IA", "Your audience is an AI early adopter"),
                        t("Buscas posicionamiento de marca", "You seek brand positioning"),
                        t("Compites en mercados B2B/tech", "You compete in B2B/tech markets"),
                        t("Tu producto es complejo de explicar", "Your product is complex to explain"),
                        t("Quieres ventaja competitiva a largo plazo", "You want long-term competitive advantage")
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
                  {t("Estrategia integrada", "Integrated strategy")}
                </h2>

                {/* Quote callout */}
                <div className="relative glass rounded-2xl p-8 border border-primary/20 mb-8">
                  <Quote className="absolute top-4 left-4 w-8 h-8 text-primary/30" />
                  <blockquote className="text-xl font-medium text-foreground italic pl-8">
                    {t("\u201cLas marcas ganadoras en 2026 no eligen entre SEO y GEO\u2014dominan ambos con una estrategia integrada que maximiza visibilidad en todos los canales de búsqueda.\u201d", "\u201cWinning brands in 2026 do not choose between SEO and GEO—they master both with an integrated strategy that maximizes visibility across all search channels.\u201d")}
                  </blockquote>
                </div>

                <p className="text-muted-foreground leading-relaxed mb-8">
                  {t("La realidad es que SEO y GEO no son mutuamente excluyentes. De hecho, muchas tácticas se complementan y refuerzan mutuamente:", "The reality is that SEO and GEO are not mutually exclusive. In fact, many tactics complement and reinforce each other:")}
                </p>

                <div className="glass rounded-2xl p-6 border border-border/50">
                  <h4 className="font-semibold text-foreground mb-4">{t("Sinergias SEO + GEO", "SEO + GEO synergies")}</h4>
                  <div className="space-y-4">
                    {[
                      { 
                        seo: t("Contenido de alta calidad", "High-quality content"),
                        geo: t("Contenido citeable por LLMs", "LLM-citable content"),
                        benefit: t("Un mismo contenido sirve para ambos", "One content strategy serves both")
                      },
                      { 
                        seo: "Structured Data (Schema)",
                        geo: t("Datos entendibles por IA", "Data understandable by AI"),
                        benefit: t("Schema.org beneficia a ambos", "Schema.org benefits both")
                      },
                      { 
                        seo: "E-E-A-T (Experience, Expertise)",
                        geo: t("Autoridad Semántica", "Semantic Authority"),
                        benefit: t("La credibilidad se transfiere", "Credibility transfers")
                      },
                      { 
                        seo: t("Backlinks de sitios autoritativos", "Backlinks from authoritative sites"),
                        geo: t("Citaciones en múltiples fuentes", "Citations across multiple sources"),
                        benefit: t("Ambos validan tu autoridad", "Both validate your authority")
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
                          <div className="text-xs text-emerald-400 mb-1">{t("Sinergia", "Synergy")}</div>
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
                  {t("El futuro híbrido", "The hybrid future")}
                </h2>

                <p className="text-muted-foreground leading-relaxed mb-8">
                  {t("Para 2027, esperamos ver una convergencia donde las líneas entre SEO y GEO se difuminen aún más:", "By 2027, we expect convergence where the lines between SEO and GEO blur even more:")}
                </p>

                {/* Future predictions */}
                <div className="space-y-4">
                  {[
                    {
                      year: "2026",
                       prediction: t("AI Overviews de Google integra ambos mundos", "Google AI Overviews integrates both worlds"),
                      icon: Search
                    },
                    {
                      year: "2026",
                       prediction: t("ChatGPT Search compite directamente con Google", "ChatGPT Search competes directly with Google"),
                      icon: Brain
                    },
                    {
                      year: "2027",
                       prediction: t("Herramientas de marketing unifican SEO + GEO", "Marketing tools unify SEO + GEO"),
                      icon: Target
                    },
                    {
                      year: "2027",
                       prediction: t("Nuevas métricas híbridas de visibilidad total", "New hybrid total-visibility metrics"),
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
                  {t("Conclusión", "Conclusion")}
                </h2>

                <p className="text-muted-foreground leading-relaxed mb-6">
                  {t("La pregunta no debería ser \u201cSEO o GEO\u201d, sino \u201ccómo integro ambos de manera efectiva\u201d. Las marcas que entiendan esta realidad y desarrollen capacidades en ambas disciplinas serán las que dominen la visibilidad digital en los próximos años.", "The question should not be \u201cSEO or GEO,\u201d but \u201chow do I integrate both effectively?\u201d Brands that understand this reality and build capabilities in both disciplines will dominate digital visibility in the coming years.")}
                </p>

                <div className="grid md:grid-cols-2 gap-4 mb-8">
                  <div className="glass rounded-xl p-5 border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <X className="w-4 h-4 text-destructive" />
                      <span className="font-semibold text-foreground">{t("No hagas esto", "Do not do this")}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t("Abandonar SEO completamente por GEO, o ignorar GEO pensando que SEO es suficiente.", "Abandon SEO entirely for GEO, or ignore GEO thinking SEO is enough.")}
                    </p>
                  </div>
                  <div className="glass rounded-xl p-5 border border-emerald-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="font-semibold text-foreground">{t("Haz esto", "Do this")}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t("Desarrolla una estrategia híbrida que optimice para buscadores tradicionales y motores de IA.", "Develop a hybrid strategy that optimizes for traditional search engines and AI engines.")}
                    </p>
                  </div>
                </div>

                {/* CTA Box */}
                <div className="relative glass rounded-2xl p-8 border border-primary/30 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-primary/10" />
                  <div className="relative z-10">
                    <h3 className="text-2xl font-bold text-foreground mb-3">
                      {t("Descubre tu posición en ambos mundos", "Discover your position in both worlds")}
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      {t("Analiza cómo tu marca se posiciona tanto en búsqueda tradicional como en motores de IA con un reporte completo de GEO Score.", "Analyze how your brand positions in both traditional search and AI engines with a complete GEO Score report.")}
                    </p>
                    <div className="flex flex-wrap gap-4">
                      <Button asChild className="bg-primary hover:bg-primary/90">
                        <Link href="/geo/register">
                          {t("Analizar mi marca", "Analyze my brand")}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Link>
                      </Button>
                      <Button variant="outline" asChild className="glass border-border hover:border-primary/40">
                        <Link href="/geo/blog/what-is-geo-2026">
                          {t("Leer guía de GEO", "Read GEO guide")}
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
