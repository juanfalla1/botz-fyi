"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Clock, Calendar, User, TrendingUp, Zap, Brain, Target, BarChart3, Sparkles, Quote, CheckCircle2, Globe, Cpu, Search, Eye, ChevronRight, Share2, Bookmark, Rocket, LineChart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGeoI18n } from "@/GEO/components/geo/i18n"

export default function AISearchOptimizationPage() {
  const { locale } = useGeoI18n()
  const isEn = locale === "en"
  const t = (es: string, en: string) => (isEn ? en : es)

  const tableOfContents = [
    { id: "introduccion", title: t("Introducción", "Introduction") },
    { id: "panorama", title: t("El panorama actual", "Current landscape") },
    { id: "motores", title: t("Motores de AI Search", "AI Search engines") },
    { id: "tendencias", title: t("Tendencias 2026", "2026 trends") },
    { id: "predicciones", title: t("Predicciones 2027", "2027 predictions") },
    { id: "preparacion", title: t("Cómo prepararte", "How to prepare") },
    { id: "conclusion", title: t("Conclusión", "Conclusion") },
  ]

  const relatedArticles = [
    { title: t("Qué es GEO en 2026", "What is GEO in 2026"), href: "/geo/blog/what-is-geo-2026", category: t("Guía", "Guide") },
    { title: t("SEO vs GEO: Las diferencias clave", "SEO vs GEO: Key differences"), href: "/geo/blog/seo-vs-geo", category: t("Comparativa", "Comparison") },
    { title: t("Cómo lograr que ChatGPT recomiende tu marca", "How to get ChatGPT to recommend your brand"), href: "/geo/blog/chatgpt-brand-visibility", category: t("Tutorial", "Tutorial") },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[800px] h-[600px] bg-orange-600/10 rounded-full blur-[180px]" />
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
            <span className="text-foreground">{t("Tendencias", "Trends")}</span>
          </motion.div>

          {/* Category badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/20 text-orange-400 text-sm font-semibold mb-6"
          >
            <TrendingUp className="w-4 h-4" />
            <span>{t("TENDENCIAS 2026", "TRENDS 2026")}</span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight"
          >
            AI Search Optimization:{" "}
            <span className="text-gradient bg-gradient-to-r from-orange-400 via-primary to-accent bg-clip-text text-transparent">
              {t("El futuro del marketing digital", "The future of digital marketing")}
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
              "La búsqueda impulsada por IA está transformando internet. Descubre cómo prepararte para dominar ChatGPT, Gemini, Perplexity y el futuro del descubrimiento de información.",
              "AI-powered search is transforming the internet. Learn how to prepare to lead in ChatGPT, Gemini, Perplexity, and the future of information discovery."
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
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-primary flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-medium text-foreground">{t("Equipo Botz", "Botz Team")}</div>
                <div className="text-xs">GEO Research</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{t("5 Mayo, 2026", "May 5, 2026")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{t("5 min de lectura", "5 min read")}</span>
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

                {/* Trend indicator */}
                <div className="glass rounded-2xl p-6 border border-orange-500/20 mt-6">
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Rocket className="w-4 h-4 text-orange-400" />
                    {t("Dato clave", "Key stat")}
                  </h4>
                  <div className="text-3xl font-bold text-orange-400 mb-1">340%</div>
                  <p className="text-sm text-muted-foreground">
                    {t("Crecimiento de AI Search año tras año", "AI Search year-over-year growth")}
                  </p>
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
                    "Estamos viviendo el cambio más significativo en la historia de la búsqueda desde que Google lanzó PageRank hace más de 25 años. La inteligencia artificial generativa no solo está cambiando cómo buscamos—está redefiniendo qué significa \u201cencontrar información\u201d.",
                    "We are living through the most significant shift in search history since Google launched PageRank over 25 years ago. Generative AI is not only changing how we search—it is redefining what it means to \u201cfind information.\u201d"
                  )}
                </p>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {t(
                    "Este artículo explora las tendencias que están moldeando el futuro del marketing digital y cómo las marcas inteligentes se están preparando para dominar en esta nueva era.",
                    "This article explores the trends shaping the future of digital marketing and how smart brands are preparing to lead in this new era."
                  )}
                </p>
              </section>

              {/* Current Landscape */}
              <section id="panorama" className="mb-16">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-orange-400" />
                  </span>
                  {t("El panorama actual de AI Search", "The current AI Search landscape")}
                </h2>

                <p className="text-muted-foreground leading-relaxed mb-8">
                  {t("En 2026, el ecosistema de búsqueda ha evolucionado dramáticamente:", "In 2026, the search ecosystem has evolved dramatically:")}
                </p>

                {/* Stats grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  {[
                    { value: "65%", label: t("Búsquedas sin clic", "Zero-click searches"), trend: "+12% YoY" },
                    { value: "1.5B", label: t("Usuarios ChatGPT", "ChatGPT users"), trend: "+85% YoY" },
                    { value: "42%", label: t("Queries con AI Overview", "Queries with AI Overview"), trend: "+28% YoY" },
                    { value: "$47B", label: t("Mercado AI Search", "AI Search market"), trend: "+340% YoY" }
                  ].map((stat, i) => (
                    <div key={i} className="glass rounded-xl p-4 border border-border/50 text-center">
                      <div className="text-2xl font-bold text-orange-400">{stat.value}</div>
                      <div className="text-xs text-muted-foreground mb-1">{stat.label}</div>
                      <div className="text-xs text-emerald-400">{stat.trend}</div>
                    </div>
                  ))}
                </div>

                {/* Market shift visualization */}
                <div className="glass rounded-2xl p-6 border border-border/50">
                  <h4 className="font-semibold text-foreground mb-4">{t("Cambio en el comportamiento de búsqueda", "Search behavior shift")}</h4>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">{t("Google tradicional", "Traditional Google")}</span>
                        <span className="text-foreground">58% → 42%</span>
                      </div>
                      <div className="h-3 bg-secondary rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: "58%" }}
                          whileInView={{ width: "42%" }}
                          viewport={{ once: true }}
                          transition={{ duration: 1.5 }}
                          className="h-full bg-blue-500 rounded-full"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">AI Search (ChatGPT, Gemini, etc.)</span>
                        <span className="text-orange-400">12% → 38%</span>
                      </div>
                      <div className="h-3 bg-secondary rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: "12%" }}
                          whileInView={{ width: "38%" }}
                          viewport={{ once: true }}
                          transition={{ duration: 1.5 }}
                          className="h-full bg-orange-500 rounded-full"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">{t("Búsqueda vertical (Amazon, YouTube)", "Vertical search (Amazon, YouTube)")}</span>
                        <span className="text-foreground">30% → 20%</span>
                      </div>
                      <div className="h-3 bg-secondary rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: "30%" }}
                          whileInView={{ width: "20%" }}
                          viewport={{ once: true }}
                          transition={{ duration: 1.5 }}
                          className="h-full bg-purple-500 rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">{t("*Datos estimados para mercado global, Mayo 2026", "*Estimated data for global market, May 2026")}</p>
                </div>
              </section>

              {/* AI Search Engines */}
              <section id="motores" className="mb-16">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Cpu className="w-5 h-5 text-primary" />
                  </span>
                  {t("Los principales motores de AI Search", "Top AI Search engines")}
                </h2>

                <div className="space-y-4">
                  {[
                    {
                      name: "ChatGPT Search",
                      company: "OpenAI",
                      users: t("1.5B+ usuarios", "1.5B+ users"),
                      desc: t("El líder del mercado. Integración profunda con GPT-5, búsqueda en tiempo real y capacidades multimodales avanzadas.", "The market leader. Deep GPT-5 integration, real-time search, and advanced multimodal capabilities."),
                      color: "emerald"
                    },
                    {
                      name: "Google AI Overviews",
                      company: "Google",
                      users: t("42% de queries", "42% of queries"),
                      desc: t("Integrado en Google Search. Respuestas generativas en la parte superior de los resultados tradicionales.", "Integrated into Google Search. Generative answers at the top of traditional results."),
                      color: "blue"
                    },
                    {
                      name: "Gemini",
                      company: "Google DeepMind",
                      users: t("800M+ usuarios", "800M+ users"),
                      desc: t("Modelo multimodal nativo. Integración con Google Workspace y Android.", "Native multimodal model. Integration with Google Workspace and Android."),
                      color: "cyan"
                    },
                    {
                      name: "Perplexity",
                      company: "Perplexity AI",
                      users: t("100M+ usuarios", "100M+ users"),
                      desc: t("Enfocado en investigación y citaciones. Muestra fuentes de manera prominente.", "Focused on research and citations. Shows sources prominently."),
                      color: "violet"
                    },
                    {
                      name: "Claude Search",
                      company: "Anthropic",
                      users: t("En beta", "In beta"),
                      desc: t("Enfoque en seguridad y precisión. Capacidades de investigación avanzadas.", "Focused on safety and accuracy. Advanced research capabilities."),
                      color: "orange"
                    }
                  ].map((engine, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: i * 0.1 }}
                      className={`glass rounded-xl p-5 border border-${engine.color}-500/20 hover:border-${engine.color}-500/40 transition-all`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-foreground">{engine.name}</h4>
                          <span className="text-xs text-muted-foreground">{engine.company}</span>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full bg-${engine.color}-500/20 text-${engine.color}-400`}>
                          {engine.users}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{engine.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* 2026 Trends */}
              <section id="tendencias" className="mb-16">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                    <LineChart className="w-5 h-5 text-accent" />
                  </span>
                  {t("Tendencias clave de 2026", "Key 2026 trends")}
                </h2>

                <div className="space-y-6">
                  {[
                    {
                      trend: t("Zero-Click Search se convierte en norma", "Zero-click search becomes the norm"),
                      impact: t("Alto", "High"),
                      impactLevel: "high",
                      desc: t("La mayoría de búsquedas informacionales ahora terminan sin un clic. Los usuarios obtienen respuestas directas de la IA.", "Most informational searches now end without a click. Users get direct answers from AI."),
                      implication: t("Las marcas deben optimizar para ser citadas, no solo rankeadas.", "Brands must optimize to be cited, not only ranked.")
                    },
                    {
                      trend: t("Búsqueda conversacional multiturno", "Multi-turn conversational search"),
                      impact: t("Alto", "High"),
                      impactLevel: "high",
                      desc: t("Los usuarios hacen seguimiento con preguntas adicionales en lugar de nuevas búsquedas. Las sesiones de búsqueda son más largas y profundas.", "Users follow up with additional questions instead of new searches. Search sessions are longer and deeper."),
                      implication: t("El contenido debe anticipar preguntas de seguimiento.", "Content should anticipate follow-up questions.")
                    },
                    {
                      trend: t("AI Agents para tareas complejas", "AI agents for complex tasks"),
                      impact: t("Medio-Alto", "Medium-High"),
                      impactLevel: "medium-high",
                      desc: t("Los usuarios delegan tareas completas a agentes de IA: \"Encuentra y compara seguros de auto para mí\".", "Users delegate complete tasks to AI agents: \"Find and compare car insurance for me.\""),
                      implication: t("Las marcas necesitan APIs y datos estructurados para ser descubribles por agentes.", "Brands need APIs and structured data to be discoverable by agents.")
                    },
                    {
                      trend: t("Personalización extrema", "Extreme personalization"),
                      impact: t("Medio", "Medium"),
                      impactLevel: "medium",
                      desc: t("Las respuestas de IA se personalizan basándose en historial, preferencias y contexto del usuario.", "AI responses are personalized based on user history, preferences, and context."),
                      implication: t("La segmentación de audiencia se vuelve más importante.", "Audience segmentation becomes more important.")
                    },
                    {
                      trend: t("Multimodalidad nativa", "Native multimodality"),
                      impact: t("Medio", "Medium"),
                      impactLevel: "medium",
                      desc: t("Búsquedas que combinan texto, imagen, voz y video. \"¿Qué planta es esta?\" con foto.", "Searches combining text, image, voice, and video. \"What plant is this?\" with photo."),
                      implication: t("El contenido visual optimizado es crítico.", "Optimized visual content is critical.")
                    }
                  ].map((item, i) => (
                    <div key={i} className="glass rounded-xl p-5 border border-border/50">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-semibold text-foreground">{item.trend}</h4>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          item.impactLevel === "high" ? "bg-red-500/20 text-red-400" :
                          item.impactLevel === "medium-high" ? "bg-orange-500/20 text-orange-400" :
                          "bg-yellow-500/20 text-yellow-400"
                        }`}>
                          {t("Impacto", "Impact")}: {item.impact}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{item.desc}</p>
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5">
                        <Target className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <p className="text-sm text-foreground"><strong>{t("Implicación", "Implication")}:</strong> {item.implication}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 2027 Predictions */}
              <section id="predicciones" className="mb-16">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-violet-400" />
                  </span>
                  {t("Predicciones para 2027", "Predictions for 2027")}
                </h2>

                {/* Quote */}
                <div className="relative glass rounded-2xl p-8 border border-primary/20 mb-8">
                  <Quote className="absolute top-4 left-4 w-8 h-8 text-primary/30" />
                  <blockquote className="text-xl font-medium text-foreground italic pl-8">
                    {t("\u201cPara 2027, la distinción entre 'buscar' y 'preguntar a la IA' habrá desaparecido por completo para la mayoría de usuarios.\u201d", "\u201cBy 2027, the distinction between 'searching' and 'asking AI' will have disappeared entirely for most users.\u201d")}
                  </blockquote>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    {
                      prediction: t("50%+ de búsquedas serán AI-first", "50%+ of searches will be AI-first"),
                      probability: "90%",
                      icon: Search
                    },
                    {
                      prediction: t("Google integrará Gemini en todo Search", "Google will integrate Gemini across Search"),
                      probability: "95%",
                      icon: Globe
                    },
                    {
                      prediction: t("Nuevas métricas de AI visibility estándar", "New standard AI visibility metrics"),
                      probability: "85%",
                      icon: BarChart3
                    },
                    {
                      prediction: t("AI Agents gestionarán compras complejas", "AI Agents will handle complex purchases"),
                      probability: "70%",
                      icon: Cpu
                    },
                    {
                      prediction: t("SEO tradicional perderá 30% de relevancia", "Traditional SEO will lose 30% relevance"),
                      probability: "75%",
                      icon: TrendingUp
                    },
                    {
                      prediction: t("Regulación de transparencia en AI Search", "Transparency regulation in AI Search"),
                      probability: "60%",
                      icon: Target
                    }
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: i * 0.1 }}
                      className="glass rounded-xl p-4 border border-border/50 hover:border-violet-500/30 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
                          <item.icon className="w-5 h-5 text-violet-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-foreground mb-2">{item.prediction}</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-violet-500 rounded-full"
                                style={{ width: item.probability }}
                              />
                            </div>
                            <span className="text-xs text-violet-400 font-semibold">{item.probability}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* How to Prepare */}
              <section id="preparacion" className="mb-16">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-emerald-400" />
                  </span>
                  {t("Cómo prepararte para el futuro", "How to prepare for the future")}
                </h2>

                <p className="text-muted-foreground leading-relaxed mb-8">
                  {t("Las marcas que actúen ahora tendrán una ventaja significativa. Aquí está tu roadmap:", "Brands that act now will gain a significant advantage. Here is your roadmap:")}
                </p>

                <div className="space-y-4">
                  {[
                    {
                      phase: "Q2 2026",
                      title: t("Auditoría y baseline", "Audit and baseline"),
                      tasks: [
                        t("Analiza tu visibilidad actual en ChatGPT, Gemini y Perplexity", "Analyze your current visibility in ChatGPT, Gemini, and Perplexity"),
                        t("Identifica competidores que ya aparecen en respuestas de IA", "Identify competitors already appearing in AI responses"),
                        t("Establece métricas base de GEO Score", "Set baseline GEO Score metrics")
                      ]
                    },
                    {
                      phase: "Q3 2026",
                      title: t("Optimización de contenido", "Content optimization"),
                      tasks: [
                        t("Crea contenido específicamente citeable (estadísticas, definiciones)", "Create specifically citable content (statistics, definitions)"),
                        t("Implementa Schema.org avanzado", "Implement advanced Schema.org"),
                        t("Desarrolla datos propietarios únicos", "Develop unique proprietary data")
                      ]
                    },
                    {
                      phase: "Q4 2026",
                      title: t("Construcción de autoridad", "Authority building"),
                      tasks: [
                        t("Establece presencia en fuentes autoritativas", "Establish presence in authoritative sources"),
                        t("Genera backlinks de sitios que los LLMs confían", "Generate backlinks from sites LLMs trust"),
                        t("Publica estudios y research original", "Publish studies and original research")
                      ]
                    },
                    {
                      phase: "Q1 2027",
                      title: t("Escala y optimización", "Scale and optimization"),
                      tasks: [
                        t("Automatiza monitoreo de AI visibility", "Automate AI visibility monitoring"),
                        t("Optimiza basado en datos de Q4", "Optimize based on Q4 data"),
                        t("Expande a nuevos motores de AI Search", "Expand to new AI Search engines")
                      ]
                    }
                  ].map((phase, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: i * 0.1 }}
                      className="glass rounded-xl p-5 border border-border/50"
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-sm font-semibold">
                          {phase.phase}
                        </span>
                        <h4 className="font-semibold text-foreground">{phase.title}</h4>
                      </div>
                      <ul className="space-y-2 ml-4">
                        {phase.tasks.map((task, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            {task}
                          </li>
                        ))}
                      </ul>
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
                  {t("El futuro del marketing digital no es incierto—es AI-first. Las marcas que entiendan esta realidad y comiencen a adaptar sus estrategias hoy serán las que dominen el descubrimiento de información en los próximos años.", "The future of digital marketing is not uncertain—it is AI-first. Brands that understand this reality and begin adapting their strategies today will dominate information discovery in the coming years.")}
                </p>

                <p className="text-muted-foreground leading-relaxed mb-8">
                  {t("La buena noticia es que aún estamos en las etapas tempranas. Hay tiempo para posicionarte, pero la ventana se está cerrando. El momento de actuar es ahora.", "The good news is that we are still in the early stages. There is time to position yourself, but the window is closing. The time to act is now.")}
                </p>

                {/* Key takeaways */}
                <div className="glass rounded-xl p-6 border border-orange-500/20 mb-8">
                  <h4 className="font-semibold text-foreground mb-4">{t("Puntos clave", "Key takeaways")}</h4>
                  <div className="space-y-3">
                    {[
                      t("AI Search está creciendo 340% año tras año", "AI Search is growing 340% year over year"),
                      t("65% de búsquedas ya no generan clics", "65% of searches no longer generate clicks"),
                      t("Las marcas deben optimizar para citación, no solo ranking", "Brands must optimize for citation, not just ranking"),
                      t("La autoridad semántica es el nuevo PageRank", "Semantic authority is the new PageRank"),
                      t("2026-2027 es la ventana crítica para establecer posición", "2026-2027 is the critical window to establish position")
                    ].map((point, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center text-xs text-orange-400 font-semibold">
                          {i + 1}
                        </span>
                        <span className="text-muted-foreground">{point}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA Box */}
                <div className="relative glass rounded-2xl p-8 border border-primary/30 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-primary/10" />
                  <div className="relative z-10">
                    <h3 className="text-2xl font-bold text-foreground mb-3">
                      {t("¿Listo para dominar AI Search?", "Ready to dominate AI Search?")}
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      {t("Descubre cómo se posiciona tu marca en ChatGPT, Gemini y otros motores de IA con nuestra auditoría completa de GEO Score.", "Discover how your brand ranks in ChatGPT, Gemini, and other AI engines with our complete GEO Score audit.")}
                    </p>
                    <div className="flex flex-wrap gap-4">
                      <Button asChild className="bg-primary hover:bg-primary/90">
                        <Link href="/geo/register">
                          {t("Comenzar auditoría gratuita", "Start free audit")}
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
