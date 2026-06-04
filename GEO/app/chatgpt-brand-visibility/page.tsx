"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Clock, Calendar, User, GraduationCap, Zap, TrendingUp, MessageSquare, Brain, Target, BarChart3, Sparkles, Quote, CheckCircle2, Lightbulb, ChevronRight, Share2, Bookmark, FileText, Link2, Database, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGeoI18n } from "@/GEO/components/geo/i18n"

const tableOfContents = [
  { id: "introduccion", title: "Introducción" },
  { id: "como-funciona", title: "Cómo ChatGPT elige marcas" },
  { id: "estrategias", title: "Estrategias clave" },
  { id: "contenido", title: "Creando contenido citeable" },
  { id: "autoridad", title: "Construyendo autoridad" },
  { id: "monitoreo", title: "Monitoreo y medición" },
  { id: "errores", title: "Errores a evitar" },
  { id: "conclusion", title: "Conclusión" }
]

const relatedArticles = [
  {
    title: "Qué es GEO en 2026",
    href: "/geo/blog/what-is-geo-2026",
    category: "Guía"
  },
  {
    title: "SEO vs GEO: Las diferencias clave",
    href: "/geo/blog/seo-vs-geo",
    category: "Comparativa"
  },
  {
    title: "AI Search Optimization: El futuro",
    href: "/geo/blog/ai-search-optimization",
    category: "Tendencias"
  }
]

export default function ChatGPTBrandVisibilityPage() {
  const { locale } = useGeoI18n()
  const isEn = locale === "en"
  const t = (es: string, en: string) => (isEn ? en : es)

  const tableOfContents = [
    { id: "introduccion", title: t("Introducción", "Introduction") },
    { id: "como-funciona", title: t("Cómo ChatGPT elige marcas", "How ChatGPT chooses brands") },
    { id: "estrategias", title: t("Estrategias clave", "Key strategies") },
    { id: "contenido", title: t("Creando contenido citeable", "Creating citable content") },
    { id: "autoridad", title: t("Construyendo autoridad", "Building authority") },
    { id: "monitoreo", title: t("Monitoreo y medición", "Monitoring and measurement") },
    { id: "errores", title: t("Errores a evitar", "Mistakes to avoid") },
    { id: "conclusion", title: t("Conclusión", "Conclusion") },
  ]

  const relatedArticles = [
    {
      title: t("Qué es GEO en 2026", "What is GEO in 2026"),
      href: "/geo/blog/what-is-geo-2026",
      category: t("Guía", "Guide"),
    },
    {
      title: t("SEO vs GEO: Las diferencias clave", "SEO vs GEO: Key differences"),
      href: "/geo/blog/seo-vs-geo",
      category: t("Comparativa", "Comparison"),
    },
    {
      title: t("AI Search Optimization: El futuro", "AI Search Optimization: The future"),
      href: "/geo/blog/ai-search-optimization",
      category: t("Tendencias", "Trends"),
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[800px] h-[600px] bg-emerald-600/10 rounded-full blur-[180px]" />
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
            <span className="text-foreground">{t("Tutorial", "Tutorial")}</span>
          </motion.div>

          {/* Category badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-semibold mb-6"
          >
            <GraduationCap className="w-4 h-4" />
            <span>{t("TUTORIAL PRÁCTICO", "PRACTICAL TUTORIAL")}</span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight"
          >
            {t("Cómo lograr que", "How to get")}{" "}
            <span className="text-gradient bg-gradient-to-r from-emerald-400 via-primary to-accent bg-clip-text text-transparent">
              {t("ChatGPT recomiende tu marca", "ChatGPT to recommend your brand")}
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
              "Aprende estrategias reales y probadas para mejorar tu AI Visibility Score, aumentar menciones y posicionar tu empresa dentro de respuestas generativas.",
              "Learn practical, proven strategies to improve your AI Visibility Score, increase mentions, and position your company inside generative responses."
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
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-primary flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-medium text-foreground">{t("Equipo Botz", "Botz Team")}</div>
                <div className="text-xs">GEO Research</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{t("8 Mayo, 2026", "May 8, 2026")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{t("10 min de lectura", "10 min read")}</span>
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

                {/* Quick tip card */}
                <div className="glass rounded-2xl p-6 border border-emerald-500/20 mt-6">
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-emerald-400" />
                    {t("Tip rápido", "Quick tip")}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "ChatGPT prioriza marcas con contenido único, estadísticas propietarias y presencia consistente en fuentes autoritativas.",
                      "ChatGPT prioritizes brands with unique content, proprietary statistics, and consistent presence in authoritative sources."
                    )}
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
                    "Imagina que alguien pregunta a ChatGPT: \u201c\u00bfCu\u00e1l es la mejor herramienta para X?\u201d y tu marca aparece como la respuesta recomendada. Esto no es magia\u2014es GEO bien ejecutado.",
                    "Imagine someone asks ChatGPT: \u201cWhat is the best tool for X?\u201d and your brand appears as the recommended answer. This is not magic\u2014it is well-executed GEO."
                  )}
                </p>
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  {t(
                    "En este tutorial paso a paso, te mostraremos exactamente cómo aumentar la probabilidad de que ChatGPT, Gemini y otros modelos de IA citen y recomienden tu marca.",
                    "In this step-by-step tutorial, we will show you exactly how to increase the probability that ChatGPT, Gemini, and other AI models cite and recommend your brand."
                  )}
                </p>

                {/* Key metrics callout */}
                <div className="glass rounded-2xl p-6 border border-emerald-500/20">
                  <h4 className="font-semibold text-foreground mb-4">{t("Lo que aprenderás", "What you will learn")}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { value: "5", label: t("Estrategias clave", "Key strategies") },
                      { value: "12", label: t("Tácticas prácticas", "Practical tactics") },
                      { value: "3", label: t("Errores a evitar", "Mistakes to avoid") },
                      { value: "100%", label: t("Aplicable hoy", "Applicable today") }
                    ].map((stat, i) => (
                      <div key={i} className="text-center">
                        <div className="text-2xl font-bold text-emerald-400">{stat.value}</div>
                        <div className="text-xs text-muted-foreground">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* How ChatGPT chooses brands */}
              <section id="como-funciona" className="mb-16">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-emerald-400" />
                  </span>
                  {t("Cómo ChatGPT elige qué marcas recomendar", "How ChatGPT chooses which brands to recommend")}
                </h2>

                <p className="text-muted-foreground leading-relaxed mb-8">
                  {t(
                    "Antes de implementar tácticas, es crucial entender cómo los LLMs deciden qué marcas mencionar:",
                    "Before implementing tactics, it is crucial to understand how LLMs decide which brands to mention:"
                  )}
                </p>

                <div className="space-y-4 mb-8">
                  {[
                    {
                      icon: Database,
                      title: "Training Data",
                       desc: t("ChatGPT fue entrenado con datos hasta cierta fecha. Tu presencia en esos datos históricos importa.", "ChatGPT was trained on data up to a certain date. Your presence in that historical data matters.")
                    },
                    {
                      icon: Link2,
                      title: "RAG (Retrieval Augmented Generation)",
                       desc: t("Para consultas actuales, ChatGPT busca información en tiempo real y prioriza fuentes autoritativas.", "For current queries, ChatGPT retrieves real-time information and prioritizes authoritative sources.")
                    },
                    {
                      icon: Users,
                       title: t("Frecuencia de menciones", "Mention frequency"),
                       desc: t("Cuanto más consistentemente aparezcas en múltiples fuentes de calidad, mayor probabilidad de citación.", "The more consistently you appear across multiple high-quality sources, the higher your citation probability.")
                    },
                    {
                      icon: FileText,
                       title: t("Contenido estructurado", "Structured content"),
                       desc: t("Información clara, organizada y con datos concretos es más fácil de citar para un LLM.", "Clear, organized information with concrete data is easier for an LLM to cite.")
                    }
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: i * 0.1 }}
                      className="flex items-start gap-4 glass rounded-xl p-5 border border-border/50"
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                        <item.icon className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">{item.title}</h4>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Key Strategies */}
              <section id="estrategias" className="mb-16">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Target className="w-5 h-5 text-primary" />
                  </span>
                  {t("5 Estrategias clave", "5 Key strategies")}
                </h2>

                <div className="space-y-8">
                  {[
                    {
                      num: "01",
                       title: t("Domina tu nicho con autoridad semántica", "Own your niche with semantic authority"),
                       desc: t("No intentes ser todo para todos. Enfócate en ser LA fuente definitiva en tu área específica.", "Do not try to be everything for everyone. Focus on becoming THE definitive source in your specific area."),
                      tactics: [
                        t("Crea contenido en profundidad sobre tu tema principal", "Create deep content around your core topic"),
                        t("Publica estudios y datos propietarios únicos", "Publish studies and unique proprietary data"),
                        t("Mantén consistencia de mensaje en todas las plataformas", "Keep messaging consistent across all platforms"),
                        t("Desarrolla un glosario de términos de tu industria", "Build an industry glossary")
                      ]
                    },
                    {
                      num: "02",
                       title: t("Construye presencia en fuentes que ChatGPT confía", "Build presence in sources ChatGPT trusts"),
                       desc: t("Los LLMs dan más peso a ciertas fuentes. Asegúrate de estar presente en ellas.", "LLMs assign more weight to certain sources. Make sure you are present there."),
                      tactics: [
                        t("Wikipedia (crear/editar artículo si es relevante)", "Wikipedia (create/edit article if relevant)"),
                        t("Publicaciones de prensa reconocidas", "Recognized press publications"),
                        t("Papers académicos y estudios de investigación", "Academic papers and research studies"),
                        t("Directorios y comparativas de la industria", "Industry directories and comparisons")
                      ]
                    },
                    {
                      num: "03",
                       title: t("Optimiza tu contenido para citación", "Optimize your content for citation"),
                       desc: t("Formatea tu contenido de manera que sea fácil para un LLM extraer y citar.", "Format your content so an LLM can easily extract and cite it."),
                      tactics: [
                        t("Incluye definiciones claras y concisas", "Include clear and concise definitions"),
                        t("Usa listas numeradas y comparativas", "Use numbered and comparison lists"),
                        t("Agrega estadísticas con fuentes claras", "Add statistics with clear sources"),
                        t("Estructura con headers semánticos (H1, H2, H3)", "Structure with semantic headers (H1, H2, H3)")
                      ]
                    },
                    {
                      num: "04",
                       title: t("Implementa structured data avanzado", "Implement advanced structured data"),
                       desc: t("Schema.org y datos estructurados ayudan a los LLMs a entender tu contenido.", "Schema.org and structured data help LLMs understand your content."),
                      tactics: [
                        t("JSON-LD para Organization y Product", "JSON-LD for Organization and Product"),
                        t("FAQPage schema para preguntas frecuentes", "FAQPage schema for FAQs"),
                        t("HowTo schema para tutoriales", "HowTo schema for tutorials"),
                        t("Review schema para testimonios", "Review schema for testimonials")
                      ]
                    },
                    {
                      num: "05",
                       title: t("Monitorea y ajusta continuamente", "Monitor and adjust continuously"),
                       desc: t("GEO no es una acción única. Requiere monitoreo y optimización constante.", "GEO is not a one-time action. It requires ongoing monitoring and optimization."),
                      tactics: [
                        t("Audita regularmente tu visibilidad en ChatGPT", "Regularly audit your visibility in ChatGPT"),
                        t("Trackea menciones de competidores", "Track competitor mentions"),
                        t("Identifica gaps en queries relevantes", "Identify gaps in relevant queries"),
                        t("Ajusta estrategia basado en resultados", "Adjust strategy based on results")
                      ]
                    }
                  ].map((strategy, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                      className="glass rounded-2xl p-6 border border-border/50 hover:border-primary/30 transition-all"
                    >
                      <div className="flex items-start gap-4 mb-4">
                        <span className="text-4xl font-bold text-primary/30">{strategy.num}</span>
                        <div>
                          <h3 className="text-xl font-semibold text-foreground">{strategy.title}</h3>
                          <p className="text-muted-foreground mt-1">{strategy.desc}</p>
                        </div>
                      </div>
                      <div className="ml-16 space-y-2">
                        {strategy.tactics.map((tactic, j) => (
                          <div key={j} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="text-muted-foreground">{tactic}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Creating Citable Content */}
              <section id="contenido" className="mb-16">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-cyan-400" />
                  </span>
                  {t("Creando contenido citeable", "Creating citable content")}
                </h2>

                <p className="text-muted-foreground leading-relaxed mb-8">
                  {t("No todo contenido es igual de citeable. Aquí están los formatos que ChatGPT prefiere:", "Not all content is equally citable. Here are the formats ChatGPT prefers:")}
                </p>

                <div className="grid md:grid-cols-2 gap-4 mb-8">
                  {[
                     { type: t("Estadísticas únicas", "Unique statistics"), example: t("\"El 73% de los usuarios prefieren...\"", "\"73% of users prefer...\""), score: t("Alta", "High") },
                     { type: t("Definiciones claras", "Clear definitions"), example: t("\"GEO es la práctica de...\"", "\"GEO is the practice of...\""), score: t("Alta", "High") },
                     { type: t("Listas comparativas", "Comparison lists"), example: t("\"Top 5 herramientas para...\"", "\"Top 5 tools for...\""), score: t("Media-Alta", "Medium-High") },
                     { type: t("Tutoriales paso a paso", "Step-by-step tutorials"), example: t("\"Paso 1: Configura... Paso 2:...\"", "\"Step 1: Setup... Step 2:...\""), score: t("Media-Alta", "Medium-High") },
                     { type: t("Casos de estudio", "Case studies"), example: t("\"La empresa X logró Y resultado...\"", "\"Company X achieved Y result...\""), score: t("Media", "Medium") },
                     { type: t("Opiniones genéricas", "Generic opinions"), example: t("\"Creemos que es importante...\"", "\"We think it is important...\""), score: t("Baja", "Low") }
                  ].map((item, i) => (
                    <div key={i} className="glass rounded-xl p-4 border border-border/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-foreground text-sm">{item.type}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          item.score === "Alta" ? "bg-emerald-500/20 text-emerald-400" :
                          item.score === "Media-Alta" ? "bg-cyan-500/20 text-cyan-400" :
                          item.score === "Media" ? "bg-yellow-500/20 text-yellow-400" :
                          "bg-red-500/20 text-red-400"
                        }`}>
                          {t("Citabilidad", "Citability")}: {item.score}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground italic">{item.example}</p>
                    </div>
                  ))}
                </div>

                {/* Example callout */}
                <div className="glass rounded-2xl p-6 border border-cyan-500/20 bg-cyan-500/5">
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-cyan-400" />
                    {t("Ejemplo de contenido altamente citeable", "Example of highly citable content")}
                  </h4>
                  <div className="bg-background/50 rounded-xl p-4 text-sm font-mono text-muted-foreground">
                    <p className="mb-2"><span className="text-cyan-400">{t("Definición", "Definition")}:</span> {t("\u201cGEO (Generative Engine Optimization) es la práctica de optimizar contenido para maximizar visibilidad en respuestas de IA.\u201d", "\u201cGEO (Generative Engine Optimization) is the practice of optimizing content to maximize visibility in AI answers.\u201d")}</p>
                    <p className="mb-2"><span className="text-cyan-400">{t("Estadística", "Statistic")}:</span> {t("\u201cSegún datos de Botz, las marcas con alto GEO Score ven un 340% más de menciones en ChatGPT.\u201d", "\u201cAccording to Botz data, brands with high GEO Score see 340% more mentions in ChatGPT.\u201d")}</p>
                    <p><span className="text-cyan-400">{t("Comparativa", "Comparison")}:</span> {t("\u201cA diferencia del SEO que optimiza rankings, GEO optimiza citaciones directas en respuestas generativas.\u201d", "\u201cUnlike SEO, which optimizes rankings, GEO optimizes direct citations in generative responses.\u201d")}</p>
                  </div>
                </div>
              </section>

              {/* Building Authority */}
              <section id="autoridad" className="mb-16">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-accent" />
                  </span>
                  {t("Construyendo autoridad semántica", "Building semantic authority")}
                </h2>

                <p className="text-muted-foreground leading-relaxed mb-8">
                  {t(
                    "La autoridad semántica es el nivel de confianza que los LLMs tienen en tu contenido sobre un tema específico. Así es como la construyes:",
                    "Semantic authority is the level of trust LLMs have in your content about a specific topic. This is how you build it:"
                  )}
                </p>

                {/* Authority pyramid */}
                <div className="glass rounded-2xl p-6 border border-border/50 mb-8">
                  <h4 className="font-semibold text-foreground mb-6 text-center">{t("Pirámide de Autoridad Semántica", "Semantic Authority Pyramid")}</h4>
                  <div className="space-y-3">
                    {[
                      { level: t("Nivel 5", "Level 5"), title: t("Líder de pensamiento", "Thought leader"), desc: t("Tu marca define el estándar de la industria", "Your brand defines the industry standard"), width: "w-1/3" },
                      { level: t("Nivel 4", "Level 4"), title: t("Experto reconocido", "Recognized expert"), desc: t("Citado por otras fuentes autoritativas", "Cited by other authoritative sources"), width: "w-1/2" },
                      { level: t("Nivel 3", "Level 3"), title: t("Fuente confiable", "Trusted source"), desc: t("Contenido consistente y de calidad", "Consistent, high-quality content"), width: "w-2/3" },
                      { level: t("Nivel 2", "Level 2"), title: t("Participante activo", "Active participant"), desc: t("Presente en conversaciones de la industria", "Present in industry conversations"), width: "w-5/6" },
                      { level: t("Nivel 1", "Level 1"), title: t("Nuevo entrante", "New entrant"), desc: t("Sin presencia significativa aún", "No significant presence yet"), width: "w-full" }
                    ].map((item, i) => (
                      <div key={i} className={`${item.width} mx-auto`}>
                        <div className={`glass rounded-lg p-3 border ${i === 0 ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-border/50'}`}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-primary">{item.level}</span>
                            <span className="font-medium text-foreground text-sm">{item.title}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 text-right">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quote */}
                <div className="relative glass rounded-2xl p-8 border border-primary/20">
                  <Quote className="absolute top-4 left-4 w-8 h-8 text-primary/30" />
                  <blockquote className="text-xl font-medium text-foreground italic pl-8">
                    {t("\u201cNo se trata de aparecer en todas partes\u2014se trata de ser la referencia indiscutible en tu área de expertise.\u201d", "\u201cIt is not about being everywhere\u2014it is about becoming the undeniable reference in your area of expertise.\u201d")}
                  </blockquote>
                </div>
              </section>

              {/* Monitoring */}
              <section id="monitoreo" className="mb-16">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-primary" />
                  </span>
                  {t("Monitoreo y medición", "Monitoring and measurement")}
                </h2>

                <p className="text-muted-foreground leading-relaxed mb-8">
                  {t("Lo que no se mide, no se puede mejorar. Estas son las métricas clave a trackear:", "What is not measured cannot be improved. These are the key metrics to track:")}
                </p>

                <div className="glass rounded-2xl border border-border/50 overflow-hidden">
                  <div className="grid grid-cols-3 bg-secondary/50 p-4 border-b border-border/50">
                    <div className="font-semibold text-foreground text-sm">{t("Métrica", "Metric")}</div>
                    <div className="font-semibold text-center text-foreground text-sm">{t("Qué mide", "What it measures")}</div>
                    <div className="font-semibold text-center text-foreground text-sm">{t("Frecuencia", "Frequency")}</div>
                  </div>
                  {[
                    { metric: "AI Visibility Score", measures: t("Visibilidad general en IA", "Overall AI visibility"), freq: t("Semanal", "Weekly") },
                    { metric: "Citation Rate", measures: t("% de queries con citación", "% of queries with citation"), freq: t("Semanal", "Weekly") },
                    { metric: "Brand Mentions", measures: t("Menciones totales", "Total mentions"), freq: t("Diario", "Daily") },
                    { metric: "Competitor Gap", measures: t("Diferencia vs competidores", "Difference vs competitors"), freq: t("Mensual", "Monthly") },
                    { metric: "Query Coverage", measures: t("Cobertura de queries target", "Target query coverage"), freq: t("Quincenal", "Biweekly") },
                    { metric: "Sentiment Score", measures: t("Tono de las menciones", "Mention tone"), freq: t("Mensual", "Monthly") }
                  ].map((row, i) => (
                    <div key={i} className={`grid grid-cols-3 p-4 ${i % 2 === 0 ? 'bg-transparent' : 'bg-secondary/20'}`}>
                      <div className="font-medium text-primary text-sm">{row.metric}</div>
                      <div className="text-center text-muted-foreground text-sm">{row.measures}</div>
                      <div className="text-center text-foreground text-sm">{row.freq}</div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Mistakes to avoid */}
              <section id="errores" className="mb-16">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-destructive" />
                  </span>
                  {t("Errores comunes a evitar", "Common mistakes to avoid")}
                </h2>

                <div className="space-y-4">
                  {[
                    {
                      error: t("Spamear ChatGPT con tu marca", "Spamming ChatGPT with your brand"),
                      why: t("Los LLMs detectan patrones artificiales y pueden ignorar o penalizar contenido que parece manipulativo.", "LLMs detect artificial patterns and may ignore or penalize content that looks manipulative."),
                      solution: t("Enfócate en crear valor real, no en mencionar tu marca repetidamente.", "Focus on creating real value, not repeating your brand name.")
                    },
                    {
                      error: t("Ignorar fuentes autoritativas", "Ignoring authoritative sources"),
                      why: t("Sin presencia en fuentes que los LLMs confían, tu contenido tiene menos peso.", "Without presence in sources LLMs trust, your content carries less weight."),
                      solution: t("Invierte en PR, Wikipedia (si es relevante), y publicaciones de la industria.", "Invest in PR, Wikipedia (if relevant), and industry publications.")
                    },
                    {
                      error: t("Contenido genérico sin diferenciación", "Generic content without differentiation"),
                      why: t("Los LLMs tienen acceso a millones de fuentes. El contenido genérico se pierde.", "LLMs access millions of sources. Generic content gets lost."),
                      solution: t("Genera datos propietarios, estudios únicos y perspectivas originales.", "Generate proprietary data, unique studies, and original perspectives.")
                    }
                  ].map((item, i) => (
                    <div key={i} className="glass rounded-xl p-5 border border-destructive/20 bg-destructive/5">
                      <div className="flex items-start gap-3">
                        <span className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center shrink-0 text-sm font-bold text-destructive">
                          {i + 1}
                        </span>
                        <div>
                          <h4 className="font-semibold text-foreground mb-2">{item.error}</h4>
                          <p className="text-sm text-muted-foreground mb-3"><strong>{t("Por qué falla", "Why it fails")}:</strong> {item.why}</p>
                          <p className="text-sm text-emerald-400"><strong>{t("Solución", "Solution")}:</strong> {item.solution}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Conclusion */}
              <section id="conclusion" className="mb-16">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                  </span>
                  {t("Conclusión", "Conclusion")}
                </h2>

                <p className="text-muted-foreground leading-relaxed mb-6">
                  {t(
                    "Lograr que ChatGPT recomiende tu marca no es cuestión de trucos o atajos. Requiere una estrategia consistente de creación de valor, construcción de autoridad y optimización continua.",
                    "Getting ChatGPT to recommend your brand is not about tricks or shortcuts. It requires a consistent strategy of value creation, authority building, and continuous optimization."
                  )}
                </p>

                <p className="text-muted-foreground leading-relaxed mb-8">
                  {t(
                    "Las marcas que comiencen hoy a implementar estas estrategias tendrán una ventaja significativa sobre aquellas que esperen. El momento de actuar es ahora.",
                    "Brands that start implementing these strategies today will have a significant advantage over those that wait. The time to act is now."
                  )}
                </p>

                {/* Summary checklist */}
                <div className="glass rounded-xl p-6 border border-emerald-500/20 mb-8">
                  <h4 className="font-semibold text-foreground mb-4">{t("Checklist de implementación", "Implementation checklist")}</h4>
                  <div className="grid md:grid-cols-2 gap-2">
                    {[
                      t("Auditar visibilidad actual en ChatGPT", "Audit current visibility in ChatGPT"),
                      t("Identificar queries target relevantes", "Identify relevant target queries"),
                      t("Crear contenido citeable y único", "Create unique and citable content"),
                      t("Implementar Schema.org avanzado", "Implement advanced Schema.org"),
                      t("Construir presencia en fuentes autoritativas", "Build presence in authoritative sources"),
                      t("Establecer sistema de monitoreo", "Set up a monitoring system"),
                      t("Analizar competidores en AI search", "Analyze competitors in AI search"),
                      t("Optimizar continuamente basado en datos", "Continuously optimize based on data")
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-muted-foreground">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA Box */}
                <div className="relative glass rounded-2xl p-8 border border-primary/30 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-primary/10" />
                  <div className="relative z-10">
                    <h3 className="text-2xl font-bold text-foreground mb-3">
                      {t("¿Listo para que ChatGPT recomiende tu marca?", "Ready for ChatGPT to recommend your brand?")}
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      {t(
                        "Analiza tu visibilidad actual en ChatGPT y otros motores de IA con nuestra auditoría gratuita de GEO Score.",
                        "Analyze your current visibility in ChatGPT and other AI engines with our free GEO Score audit."
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
