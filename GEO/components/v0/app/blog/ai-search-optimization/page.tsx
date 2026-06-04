"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Clock, Calendar, User, TrendingUp, Zap, Brain, Target, BarChart3, Sparkles, Quote, CheckCircle2, Globe, Cpu, Search, Eye, ChevronRight, Share2, Bookmark, Rocket, LineChart } from "lucide-react"
import { Button } from "@/components/ui/button"

const tableOfContents = [
  { id: "introduccion", title: "Introducción" },
  { id: "panorama", title: "El panorama actual" },
  { id: "motores", title: "Motores de AI Search" },
  { id: "tendencias", title: "Tendencias 2026" },
  { id: "predicciones", title: "Predicciones 2027" },
  { id: "preparacion", title: "Cómo prepararte" },
  { id: "conclusion", title: "Conclusión" }
]

const relatedArticles = [
  {
    title: "Qué es GEO en 2026",
    href: "/blog/what-is-geo-2026",
    category: "Guía"
  },
  {
    title: "SEO vs GEO: Las diferencias clave",
    href: "/blog/seo-vs-geo",
    category: "Comparativa"
  },
  {
    title: "Cómo lograr que ChatGPT recomiende tu marca",
    href: "/blog/chatgpt-brand-visibility",
    category: "Tutorial"
  }
]

export default function AISearchOptimizationPage() {
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
            <Link href="/" className="hover:text-primary transition-colors">Inicio</Link>
            <ChevronRight className="w-4 h-4" />
            <Link href="/#blog" className="hover:text-primary transition-colors">Blog</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground">Tendencias</span>
          </motion.div>

          {/* Category badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/20 text-orange-400 text-sm font-semibold mb-6"
          >
            <TrendingUp className="w-4 h-4" />
            <span>TENDENCIAS 2026</span>
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
              El futuro del marketing digital
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-xl text-muted-foreground mb-8 leading-relaxed"
          >
            La búsqueda impulsada por IA está transformando internet. Descubre cómo prepararte 
            para dominar ChatGPT, Gemini, Perplexity y el futuro del descubrimiento de información.
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
                <div className="font-medium text-foreground">Equipo Botz</div>
                <div className="text-xs">GEO Research</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>5 Mayo, 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>5 min de lectura</span>
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

                {/* Trend indicator */}
                <div className="glass rounded-2xl p-6 border border-orange-500/20 mt-6">
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Rocket className="w-4 h-4 text-orange-400" />
                    Dato clave
                  </h4>
                  <div className="text-3xl font-bold text-orange-400 mb-1">340%</div>
                  <p className="text-sm text-muted-foreground">
                    Crecimiento de AI Search año tras año
                  </p>
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
                  Estamos viviendo el cambio más significativo en la historia de la búsqueda desde que 
                  Google lanzó PageRank hace más de 25 años. La inteligencia artificial generativa 
                  no solo está cambiando cómo buscamos—está redefiniendo qué significa &ldquo;encontrar información&rdquo;.
                </p>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Este artículo explora las tendencias que están moldeando el futuro del marketing digital 
                  y cómo las marcas inteligentes se están preparando para dominar en esta nueva era.
                </p>
              </section>

              {/* Current Landscape */}
              <section id="panorama" className="mb-16">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-orange-400" />
                  </span>
                  El panorama actual de AI Search
                </h2>

                <p className="text-muted-foreground leading-relaxed mb-8">
                  En 2026, el ecosistema de búsqueda ha evolucionado dramáticamente:
                </p>

                {/* Stats grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  {[
                    { value: "65%", label: "Búsquedas sin clic", trend: "+12% YoY" },
                    { value: "1.5B", label: "Usuarios ChatGPT", trend: "+85% YoY" },
                    { value: "42%", label: "Queries con AI Overview", trend: "+28% YoY" },
                    { value: "$47B", label: "Mercado AI Search", trend: "+340% YoY" }
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
                  <h4 className="font-semibold text-foreground mb-4">Cambio en el comportamiento de búsqueda</h4>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Google tradicional</span>
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
                        <span className="text-muted-foreground">Búsqueda vertical (Amazon, YouTube)</span>
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
                  <p className="text-xs text-muted-foreground mt-4">*Datos estimados para mercado global, Mayo 2026</p>
                </div>
              </section>

              {/* AI Search Engines */}
              <section id="motores" className="mb-16">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Cpu className="w-5 h-5 text-primary" />
                  </span>
                  Los principales motores de AI Search
                </h2>

                <div className="space-y-4">
                  {[
                    {
                      name: "ChatGPT Search",
                      company: "OpenAI",
                      users: "1.5B+ usuarios",
                      desc: "El líder del mercado. Integración profunda con GPT-5, búsqueda en tiempo real y capacidades multimodales avanzadas.",
                      color: "emerald"
                    },
                    {
                      name: "Google AI Overviews",
                      company: "Google",
                      users: "42% de queries",
                      desc: "Integrado en Google Search. Respuestas generativas en la parte superior de los resultados tradicionales.",
                      color: "blue"
                    },
                    {
                      name: "Gemini",
                      company: "Google DeepMind",
                      users: "800M+ usuarios",
                      desc: "Modelo multimodal nativo. Integración con Google Workspace y Android.",
                      color: "cyan"
                    },
                    {
                      name: "Perplexity",
                      company: "Perplexity AI",
                      users: "100M+ usuarios",
                      desc: "Enfocado en investigación y citaciones. Muestra fuentes de manera prominente.",
                      color: "violet"
                    },
                    {
                      name: "Claude Search",
                      company: "Anthropic",
                      users: "En beta",
                      desc: "Enfoque en seguridad y precisión. Capacidades de investigación avanzadas.",
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
                  Tendencias clave de 2026
                </h2>

                <div className="space-y-6">
                  {[
                    {
                      trend: "Zero-Click Search se convierte en norma",
                      impact: "Alto",
                      desc: "La mayoría de búsquedas informacionales ahora terminan sin un clic. Los usuarios obtienen respuestas directas de la IA.",
                      implication: "Las marcas deben optimizar para ser citadas, no solo rankeadas."
                    },
                    {
                      trend: "Búsqueda conversacional multiturno",
                      impact: "Alto",
                      desc: "Los usuarios hacen seguimiento con preguntas adicionales en lugar de nuevas búsquedas. Las sesiones de búsqueda son más largas y profundas.",
                      implication: "El contenido debe anticipar preguntas de seguimiento."
                    },
                    {
                      trend: "AI Agents para tareas complejas",
                      impact: "Medio-Alto",
                      desc: "Los usuarios delegan tareas completas a agentes de IA: \"Encuentra y compara seguros de auto para mí\".",
                      implication: "Las marcas necesitan APIs y datos estructurados para ser descubribles por agentes."
                    },
                    {
                      trend: "Personalización extrema",
                      impact: "Medio",
                      desc: "Las respuestas de IA se personalizan basándose en historial, preferencias y contexto del usuario.",
                      implication: "La segmentación de audiencia se vuelve más importante."
                    },
                    {
                      trend: "Multimodalidad nativa",
                      impact: "Medio",
                      desc: "Búsquedas que combinan texto, imagen, voz y video. \"¿Qué planta es esta?\" con foto.",
                      implication: "El contenido visual optimizado es crítico."
                    }
                  ].map((item, i) => (
                    <div key={i} className="glass rounded-xl p-5 border border-border/50">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-semibold text-foreground">{item.trend}</h4>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          item.impact === "Alto" ? "bg-red-500/20 text-red-400" :
                          item.impact === "Medio-Alto" ? "bg-orange-500/20 text-orange-400" :
                          "bg-yellow-500/20 text-yellow-400"
                        }`}>
                          Impacto: {item.impact}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{item.desc}</p>
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5">
                        <Target className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <p className="text-sm text-foreground"><strong>Implicación:</strong> {item.implication}</p>
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
                  Predicciones para 2027
                </h2>

                {/* Quote */}
                <div className="relative glass rounded-2xl p-8 border border-primary/20 mb-8">
                  <Quote className="absolute top-4 left-4 w-8 h-8 text-primary/30" />
                  <blockquote className="text-xl font-medium text-foreground italic pl-8">
                    &ldquo;Para 2027, la distinción entre &apos;buscar&apos; y &apos;preguntar a la IA&apos; habrá desaparecido 
                    por completo para la mayoría de usuarios.&rdquo;
                  </blockquote>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    {
                      prediction: "50%+ de búsquedas serán AI-first",
                      probability: "90%",
                      icon: Search
                    },
                    {
                      prediction: "Google integrará Gemini en todo Search",
                      probability: "95%",
                      icon: Globe
                    },
                    {
                      prediction: "Nuevas métricas de AI visibility estándar",
                      probability: "85%",
                      icon: BarChart3
                    },
                    {
                      prediction: "AI Agents gestionarán compras complejas",
                      probability: "70%",
                      icon: Cpu
                    },
                    {
                      prediction: "SEO tradicional perderá 30% de relevancia",
                      probability: "75%",
                      icon: TrendingUp
                    },
                    {
                      prediction: "Regulación de transparencia en AI Search",
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
                  Cómo prepararte para el futuro
                </h2>

                <p className="text-muted-foreground leading-relaxed mb-8">
                  Las marcas que actúen ahora tendrán una ventaja significativa. Aquí está tu roadmap:
                </p>

                <div className="space-y-4">
                  {[
                    {
                      phase: "Q2 2026",
                      title: "Auditoría y baseline",
                      tasks: [
                        "Analiza tu visibilidad actual en ChatGPT, Gemini y Perplexity",
                        "Identifica competidores que ya aparecen en respuestas de IA",
                        "Establece métricas base de GEO Score"
                      ]
                    },
                    {
                      phase: "Q3 2026",
                      title: "Optimización de contenido",
                      tasks: [
                        "Crea contenido específicamente citeable (estadísticas, definiciones)",
                        "Implementa Schema.org avanzado",
                        "Desarrolla datos propietarios únicos"
                      ]
                    },
                    {
                      phase: "Q4 2026",
                      title: "Construcción de autoridad",
                      tasks: [
                        "Establece presencia en fuentes autoritativas",
                        "Genera backlinks de sitios que los LLMs confían",
                        "Publica estudios y research original"
                      ]
                    },
                    {
                      phase: "Q1 2027",
                      title: "Escala y optimización",
                      tasks: [
                        "Automatiza monitoreo de AI visibility",
                        "Optimiza basado en datos de Q4",
                        "Expande a nuevos motores de AI Search"
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
                  Conclusión
                </h2>

                <p className="text-muted-foreground leading-relaxed mb-6">
                  El futuro del marketing digital no es incierto—es AI-first. Las marcas que 
                  entiendan esta realidad y comiencen a adaptar sus estrategias hoy serán las 
                  que dominen el descubrimiento de información en los próximos años.
                </p>

                <p className="text-muted-foreground leading-relaxed mb-8">
                  La buena noticia es que aún estamos en las etapas tempranas. Hay tiempo para 
                  posicionarte, pero la ventana se está cerrando. El momento de actuar es ahora.
                </p>

                {/* Key takeaways */}
                <div className="glass rounded-xl p-6 border border-orange-500/20 mb-8">
                  <h4 className="font-semibold text-foreground mb-4">Puntos clave</h4>
                  <div className="space-y-3">
                    {[
                      "AI Search está creciendo 340% año tras año",
                      "65% de búsquedas ya no generan clics",
                      "Las marcas deben optimizar para citación, no solo ranking",
                      "La autoridad semántica es el nuevo PageRank",
                      "2026-2027 es la ventana crítica para establecer posición"
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
                      ¿Listo para dominar AI Search?
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Descubre cómo se posiciona tu marca en ChatGPT, Gemini y otros motores de IA 
                      con nuestra auditoría completa de GEO Score.
                    </p>
                    <div className="flex flex-wrap gap-4">
                      <Button asChild className="bg-primary hover:bg-primary/90">
                        <Link href="/geo/register">
                          Comenzar auditoría gratuita
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
