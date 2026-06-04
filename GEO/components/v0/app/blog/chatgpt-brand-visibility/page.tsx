"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Clock, Calendar, User, GraduationCap, Zap, TrendingUp, MessageSquare, Brain, Target, BarChart3, Sparkles, Quote, CheckCircle2, Lightbulb, ChevronRight, Share2, Bookmark, FileText, Link2, Database, Users } from "lucide-react"
import { Button } from "@/components/ui/button"

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
    href: "/blog/what-is-geo-2026",
    category: "Guía"
  },
  {
    title: "SEO vs GEO: Las diferencias clave",
    href: "/blog/seo-vs-geo",
    category: "Comparativa"
  },
  {
    title: "AI Search Optimization: El futuro",
    href: "/blog/ai-search-optimization",
    category: "Tendencias"
  }
]

export default function ChatGPTBrandVisibilityPage() {
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
            <Link href="/" className="hover:text-primary transition-colors">Inicio</Link>
            <ChevronRight className="w-4 h-4" />
            <Link href="/#blog" className="hover:text-primary transition-colors">Blog</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground">Tutorial</span>
          </motion.div>

          {/* Category badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-semibold mb-6"
          >
            <GraduationCap className="w-4 h-4" />
            <span>TUTORIAL PRÁCTICO</span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight"
          >
            Cómo lograr que{" "}
            <span className="text-gradient bg-gradient-to-r from-emerald-400 via-primary to-accent bg-clip-text text-transparent">
              ChatGPT recomiende tu marca
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-xl text-muted-foreground mb-8 leading-relaxed"
          >
            Aprende estrategias reales y probadas para mejorar tu AI Visibility Score, 
            aumentar menciones y posicionar tu empresa dentro de respuestas generativas.
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
                <div className="font-medium text-foreground">Equipo Botz</div>
                <div className="text-xs">GEO Research</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>8 Mayo, 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>10 min de lectura</span>
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

                {/* Quick tip card */}
                <div className="glass rounded-2xl p-6 border border-emerald-500/20 mt-6">
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-emerald-400" />
                    Tip rápido
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    ChatGPT prioriza marcas con contenido único, estadísticas propietarias 
                    y presencia consistente en fuentes autoritativas.
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
                  Imagina que alguien pregunta a ChatGPT: &ldquo;¿Cuál es la mejor herramienta para X?&rdquo; 
                  y tu marca aparece como la respuesta recomendada. Esto no es magia—es GEO bien ejecutado.
                </p>
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  En este tutorial paso a paso, te mostraremos exactamente cómo aumentar la probabilidad 
                  de que ChatGPT, Gemini y otros modelos de IA citen y recomienden tu marca.
                </p>

                {/* Key metrics callout */}
                <div className="glass rounded-2xl p-6 border border-emerald-500/20">
                  <h4 className="font-semibold text-foreground mb-4">Lo que aprenderás</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { value: "5", label: "Estrategias clave" },
                      { value: "12", label: "Tácticas prácticas" },
                      { value: "3", label: "Errores a evitar" },
                      { value: "100%", label: "Aplicable hoy" }
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
                  Cómo ChatGPT elige qué marcas recomendar
                </h2>

                <p className="text-muted-foreground leading-relaxed mb-8">
                  Antes de implementar tácticas, es crucial entender cómo los LLMs deciden qué marcas mencionar:
                </p>

                <div className="space-y-4 mb-8">
                  {[
                    {
                      icon: Database,
                      title: "Training Data",
                      desc: "ChatGPT fue entrenado con datos hasta cierta fecha. Tu presencia en esos datos históricos importa."
                    },
                    {
                      icon: Link2,
                      title: "RAG (Retrieval Augmented Generation)",
                      desc: "Para consultas actuales, ChatGPT busca información en tiempo real y prioriza fuentes autoritativas."
                    },
                    {
                      icon: Users,
                      title: "Frecuencia de menciones",
                      desc: "Cuanto más consistentemente aparezcas en múltiples fuentes de calidad, mayor probabilidad de citación."
                    },
                    {
                      icon: FileText,
                      title: "Contenido estructurado",
                      desc: "Información clara, organizada y con datos concretos es más fácil de citar para un LLM."
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
                  5 Estrategias clave
                </h2>

                <div className="space-y-8">
                  {[
                    {
                      num: "01",
                      title: "Domina tu nicho con autoridad semántica",
                      desc: "No intentes ser todo para todos. Enfócate en ser LA fuente definitiva en tu área específica.",
                      tactics: [
                        "Crea contenido en profundidad sobre tu tema principal",
                        "Publica estudios y datos propietarios únicos",
                        "Mantén consistencia de mensaje en todas las plataformas",
                        "Desarrolla un glosario de términos de tu industria"
                      ]
                    },
                    {
                      num: "02",
                      title: "Construye presencia en fuentes que ChatGPT confía",
                      desc: "Los LLMs dan más peso a ciertas fuentes. Asegúrate de estar presente en ellas.",
                      tactics: [
                        "Wikipedia (crear/editar artículo si es relevante)",
                        "Publicaciones de prensa reconocidas",
                        "Papers académicos y estudios de investigación",
                        "Directorios y comparativas de la industria"
                      ]
                    },
                    {
                      num: "03",
                      title: "Optimiza tu contenido para citación",
                      desc: "Formatea tu contenido de manera que sea fácil para un LLM extraer y citar.",
                      tactics: [
                        "Incluye definiciones claras y concisas",
                        "Usa listas numeradas y comparativas",
                        "Agrega estadísticas con fuentes claras",
                        "Estructura con headers semánticos (H1, H2, H3)"
                      ]
                    },
                    {
                      num: "04",
                      title: "Implementa structured data avanzado",
                      desc: "Schema.org y datos estructurados ayudan a los LLMs a entender tu contenido.",
                      tactics: [
                        "JSON-LD para Organization y Product",
                        "FAQPage schema para preguntas frecuentes",
                        "HowTo schema para tutoriales",
                        "Review schema para testimonios"
                      ]
                    },
                    {
                      num: "05",
                      title: "Monitorea y ajusta continuamente",
                      desc: "GEO no es una acción única. Requiere monitoreo y optimización constante.",
                      tactics: [
                        "Audita regularmente tu visibilidad en ChatGPT",
                        "Trackea menciones de competidores",
                        "Identifica gaps en queries relevantes",
                        "Ajusta estrategia basado en resultados"
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
                  Creando contenido citeable
                </h2>

                <p className="text-muted-foreground leading-relaxed mb-8">
                  No todo contenido es igual de citeable. Aquí están los formatos que ChatGPT prefiere:
                </p>

                <div className="grid md:grid-cols-2 gap-4 mb-8">
                  {[
                    { type: "Estadísticas únicas", example: "\"El 73% de los usuarios prefieren...\"", score: "Alta" },
                    { type: "Definiciones claras", example: "\"GEO es la práctica de...\"", score: "Alta" },
                    { type: "Listas comparativas", example: "\"Top 5 herramientas para...\"", score: "Media-Alta" },
                    { type: "Tutoriales paso a paso", example: "\"Paso 1: Configura... Paso 2:...\"", score: "Media-Alta" },
                    { type: "Casos de estudio", example: "\"La empresa X logró Y resultado...\"", score: "Media" },
                    { type: "Opiniones genéricas", example: "\"Creemos que es importante...\"", score: "Baja" }
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
                          Citabilidad: {item.score}
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
                    Ejemplo de contenido altamente citeable
                  </h4>
                  <div className="bg-background/50 rounded-xl p-4 text-sm font-mono text-muted-foreground">
                    <p className="mb-2"><span className="text-cyan-400">Definición:</span> &ldquo;GEO (Generative Engine Optimization) es la práctica de optimizar contenido para maximizar visibilidad en respuestas de IA.&rdquo;</p>
                    <p className="mb-2"><span className="text-cyan-400">Estadística:</span> &ldquo;Según datos de Botz, las marcas con alto GEO Score ven un 340% más de menciones en ChatGPT.&rdquo;</p>
                    <p><span className="text-cyan-400">Comparativa:</span> &ldquo;A diferencia del SEO que optimiza rankings, GEO optimiza citaciones directas en respuestas generativas.&rdquo;</p>
                  </div>
                </div>
              </section>

              {/* Building Authority */}
              <section id="autoridad" className="mb-16">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-accent" />
                  </span>
                  Construyendo autoridad semántica
                </h2>

                <p className="text-muted-foreground leading-relaxed mb-8">
                  La autoridad semántica es el nivel de confianza que los LLMs tienen en tu contenido 
                  sobre un tema específico. Así es como la construyes:
                </p>

                {/* Authority pyramid */}
                <div className="glass rounded-2xl p-6 border border-border/50 mb-8">
                  <h4 className="font-semibold text-foreground mb-6 text-center">Pirámide de Autoridad Semántica</h4>
                  <div className="space-y-3">
                    {[
                      { level: "Nivel 5", title: "Líder de pensamiento", desc: "Tu marca define el estándar de la industria", width: "w-1/3" },
                      { level: "Nivel 4", title: "Experto reconocido", desc: "Citado por otras fuentes autoritativas", width: "w-1/2" },
                      { level: "Nivel 3", title: "Fuente confiable", desc: "Contenido consistente y de calidad", width: "w-2/3" },
                      { level: "Nivel 2", title: "Participante activo", desc: "Presente en conversaciones de la industria", width: "w-5/6" },
                      { level: "Nivel 1", title: "Nuevo entrante", desc: "Sin presencia significativa aún", width: "w-full" }
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
                    &ldquo;No se trata de aparecer en todas partes—se trata de ser la referencia 
                    indiscutible en tu área de expertise.&rdquo;
                  </blockquote>
                </div>
              </section>

              {/* Monitoring */}
              <section id="monitoreo" className="mb-16">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-primary" />
                  </span>
                  Monitoreo y medición
                </h2>

                <p className="text-muted-foreground leading-relaxed mb-8">
                  Lo que no se mide, no se puede mejorar. Estas son las métricas clave a trackear:
                </p>

                <div className="glass rounded-2xl border border-border/50 overflow-hidden">
                  <div className="grid grid-cols-3 bg-secondary/50 p-4 border-b border-border/50">
                    <div className="font-semibold text-foreground text-sm">Métrica</div>
                    <div className="font-semibold text-center text-foreground text-sm">Qué mide</div>
                    <div className="font-semibold text-center text-foreground text-sm">Frecuencia</div>
                  </div>
                  {[
                    { metric: "AI Visibility Score", measures: "Visibilidad general en IA", freq: "Semanal" },
                    { metric: "Citation Rate", measures: "% de queries con citación", freq: "Semanal" },
                    { metric: "Brand Mentions", measures: "Menciones totales", freq: "Diario" },
                    { metric: "Competitor Gap", measures: "Diferencia vs competidores", freq: "Mensual" },
                    { metric: "Query Coverage", measures: "Cobertura de queries target", freq: "Quincenal" },
                    { metric: "Sentiment Score", measures: "Tono de las menciones", freq: "Mensual" }
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
                  Errores comunes a evitar
                </h2>

                <div className="space-y-4">
                  {[
                    {
                      error: "Spamear ChatGPT con tu marca",
                      why: "Los LLMs detectan patrones artificiales y pueden ignorar o penalizar contenido que parece manipulativo.",
                      solution: "Enfócate en crear valor real, no en mencionar tu marca repetidamente."
                    },
                    {
                      error: "Ignorar fuentes autoritativas",
                      why: "Sin presencia en fuentes que los LLMs confían, tu contenido tiene menos peso.",
                      solution: "Invierte en PR, Wikipedia (si es relevante), y publicaciones de la industria."
                    },
                    {
                      error: "Contenido genérico sin diferenciación",
                      why: "Los LLMs tienen acceso a millones de fuentes. El contenido genérico se pierde.",
                      solution: "Genera datos propietarios, estudios únicos y perspectivas originales."
                    }
                  ].map((item, i) => (
                    <div key={i} className="glass rounded-xl p-5 border border-destructive/20 bg-destructive/5">
                      <div className="flex items-start gap-3">
                        <span className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center shrink-0 text-sm font-bold text-destructive">
                          {i + 1}
                        </span>
                        <div>
                          <h4 className="font-semibold text-foreground mb-2">{item.error}</h4>
                          <p className="text-sm text-muted-foreground mb-3"><strong>Por qué falla:</strong> {item.why}</p>
                          <p className="text-sm text-emerald-400"><strong>Solución:</strong> {item.solution}</p>
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
                  Conclusión
                </h2>

                <p className="text-muted-foreground leading-relaxed mb-6">
                  Lograr que ChatGPT recomiende tu marca no es cuestión de trucos o atajos. 
                  Requiere una estrategia consistente de creación de valor, construcción de autoridad 
                  y optimización continua.
                </p>

                <p className="text-muted-foreground leading-relaxed mb-8">
                  Las marcas que comiencen hoy a implementar estas estrategias tendrán una ventaja 
                  significativa sobre aquellas que esperen. El momento de actuar es ahora.
                </p>

                {/* Summary checklist */}
                <div className="glass rounded-xl p-6 border border-emerald-500/20 mb-8">
                  <h4 className="font-semibold text-foreground mb-4">Checklist de implementación</h4>
                  <div className="grid md:grid-cols-2 gap-2">
                    {[
                      "Auditar visibilidad actual en ChatGPT",
                      "Identificar queries target relevantes",
                      "Crear contenido citeable y único",
                      "Implementar Schema.org avanzado",
                      "Construir presencia en fuentes autoritativas",
                      "Establecer sistema de monitoreo",
                      "Analizar competidores en AI search",
                      "Optimizar continuamente basado en datos"
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
                      ¿Listo para que ChatGPT recomiende tu marca?
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Analiza tu visibilidad actual en ChatGPT y otros motores de IA con nuestra 
                      auditoría gratuita de GEO Score.
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
