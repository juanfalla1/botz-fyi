"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AppHeader } from "@/components/geo/app-shell"
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Share2,
  Eye,
  Quote,
  Zap,
  Target,
  FileText,
  Lightbulb,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react"
import Link from "next/link"
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts"

const scoreBreakdown = [
  { name: "AI Visibility", value: 82, icon: Eye, color: "text-primary" },
  { name: "Citation Probability", value: 68, icon: Quote, color: "text-accent" },
  { name: "Entity Strength", value: 75, icon: Zap, color: "text-chart-3" },
  { name: "Competitor Dominance", value: 62, icon: Target, color: "text-chart-4" },
  { name: "Content Clarity", value: 85, icon: FileText, color: "text-chart-5" },
]

const radarData = [
  { subject: "Visibility", A: 82, B: 75, fullMark: 100 },
  { subject: "Citations", A: 68, B: 72, fullMark: 100 },
  { subject: "Entity", A: 75, B: 65, fullMark: 100 },
  { subject: "Competition", A: 62, B: 80, fullMark: 100 },
  { subject: "Content", A: 85, B: 70, fullMark: 100 },
]

const engineComparison = [
  { name: "ChatGPT", score: 82, color: "#a855f7" },
  { name: "Gemini", score: 75, color: "#6366f1" },
  { name: "Perplexity", score: 78, color: "#8b5cf6" },
  { name: "AI Overviews", score: 71, color: "#a78bfa" },
]

const recommendations = [
  {
    type: "critical",
    title: "Optimiza tu Knowledge Graph",
    description: "Tu entidad no está bien definida en los LLMs. Crea contenido estructurado con schema markup.",
    impact: "Alto",
  },
  {
    type: "important",
    title: "Aumenta las citaciones externas",
    description: "Solo 12% de fuentes autorizadas te mencionan. Desarrolla una estrategia de PR digital.",
    impact: "Alto",
  },
  {
    type: "moderate",
    title: "Mejora la claridad del contenido",
    description: "Tus páginas principales tienen un índice de legibilidad bajo para LLMs.",
    impact: "Medio",
  },
  {
    type: "suggestion",
    title: "Añade FAQ estructuradas",
    description: "Las preguntas frecuentes bien estructuradas aumentan la probabilidad de citación.",
    impact: "Medio",
  },
]

const contentOpportunities = [
  {
    keyword: "mejor software de gestión",
    volume: "5.4K",
    difficulty: "Media",
    currentRank: "No aparece",
    opportunity: 85,
  },
  {
    keyword: "herramientas para startups",
    volume: "3.2K",
    difficulty: "Baja",
    currentRank: "Posición 8",
    opportunity: 72,
  },
  {
    keyword: "automatización empresarial",
    volume: "2.8K",
    difficulty: "Alta",
    currentRank: "Posición 15",
    opportunity: 65,
  },
]

const testedPrompts = [
  {
    prompt: "¿Cuál es el mejor software de gestión para startups?",
    mentioned: true,
    position: 2,
    engine: "ChatGPT",
  },
  {
    prompt: "Recomienda herramientas de automatización empresarial",
    mentioned: false,
    position: null,
    engine: "Gemini",
  },
  {
    prompt: "¿Qué alternativas hay a [Competidor A]?",
    mentioned: true,
    position: 5,
    engine: "Perplexity",
  },
]

export default function AuditResultPage() {
  return (
    <>
      <AppHeader />
      <div className="p-6 space-y-6">
        {/* Back button and header */}
        <div className="flex items-center justify-between">
          <Link
            href="/geo/app"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al dashboard
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="glass border-border">
              <Share2 className="w-4 h-4 mr-2" />
              Compartir
            </Button>
            <Button variant="outline" className="glass border-border">
              <Download className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </div>

        {/* Hero Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="glass border-border glow-primary overflow-hidden">
            <CardContent className="p-8">
              <div className="flex flex-col lg:flex-row items-center gap-8">
                {/* Big Score */}
                <div className="text-center lg:text-left">
                  <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2">GEO Score</p>
                  <div className="relative w-48 h-48 mx-auto lg:mx-0">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-secondary"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="url(#mainScoreGradient)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${78 * 2.83} ${100 * 2.83}`}
                      />
                      <defs>
                        <linearGradient id="mainScoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#a855f7" />
                          <stop offset="100%" stopColor="#6366f1" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-6xl font-bold text-gradient">78</span>
                      <span className="text-muted-foreground text-sm">de 100</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <h1 className="text-2xl font-bold">TechStartup Pro</h1>
                    <p className="text-muted-foreground">techstartup.com</p>
                  </div>
                </div>

                {/* Score Cards */}
                <div className="flex-1 grid grid-cols-2 lg:grid-cols-5 gap-4 w-full">
                  {scoreBreakdown.map((item, index) => (
                    <motion.div
                      key={item.name}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.1 * index }}
                      className="glass rounded-xl p-4 text-center"
                    >
                      <div className={`w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mx-auto mb-3 ${item.color}`}>
                        <item.icon className="w-5 h-5" />
                      </div>
                      <div className="text-2xl font-bold mb-1">{item.value}</div>
                      <p className="text-xs text-muted-foreground leading-tight">{item.name}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Radar Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="glass border-border h-full">
              <CardHeader>
                <CardTitle className="text-lg">Análisis Comparativo</CardTitle>
                <p className="text-sm text-muted-foreground">Tu marca vs. promedio del sector</p>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#333" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: "#888", fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#666", fontSize: 10 }} />
                      <Radar
                        name="Tu marca"
                        dataKey="A"
                        stroke="#a855f7"
                        fill="#a855f7"
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                      <Radar
                        name="Promedio sector"
                        dataKey="B"
                        stroke="#6366f1"
                        fill="#6366f1"
                        fillOpacity={0.2}
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <span className="text-sm text-muted-foreground">Tu marca</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-chart-1" />
                    <span className="text-sm text-muted-foreground">Promedio sector</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Engine Comparison */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="glass border-border h-full">
              <CardHeader>
                <CardTitle className="text-lg">Rendimiento por Motor IA</CardTitle>
                <p className="text-sm text-muted-foreground">Tu visibilidad en cada plataforma</p>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={engineComparison} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} stroke="#666" fontSize={12} />
                      <YAxis type="category" dataKey="name" stroke="#666" fontSize={12} width={80} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1a1a2e",
                          border: "1px solid #333",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                        {engineComparison.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Recommendations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="glass border-border">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Recomendaciones</CardTitle>
                  <p className="text-sm text-muted-foreground">Acciones para mejorar tu GEO Score</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-xl border ${
                      rec.type === "critical"
                        ? "border-red-500/30 bg-red-500/10"
                        : rec.type === "important"
                        ? "border-yellow-500/30 bg-yellow-500/10"
                        : "border-border bg-secondary/30"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          rec.type === "critical"
                            ? "bg-red-500/20 text-red-400"
                            : rec.type === "important"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-primary/20 text-primary"
                        }`}
                      >
                        {rec.type === "critical" || rec.type === "important" ? (
                          <AlertCircle className="w-4 h-4" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium text-sm">{rec.title}</h3>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                            Impacto: {rec.impact}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{rec.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Content Opportunities */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="glass border-border">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <CardTitle className="text-lg">Oportunidades de Contenido</CardTitle>
                  <p className="text-sm text-muted-foreground">Keywords donde puedes mejorar tu visibilidad IA</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Keyword</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Volumen</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Dificultad</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Posición Actual</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Oportunidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contentOpportunities.map((opp, index) => (
                      <tr key={index} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                        <td className="py-4 px-4 font-medium">{opp.keyword}</td>
                        <td className="py-4 px-4 text-muted-foreground">{opp.volume}</td>
                        <td className="py-4 px-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              opp.difficulty === "Baja"
                                ? "bg-green-500/20 text-green-400"
                                : opp.difficulty === "Media"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {opp.difficulty}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-muted-foreground">{opp.currentRank}</td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 rounded-full bg-secondary overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                                style={{ width: `${opp.opportunity}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{opp.opportunity}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tested Prompts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card className="glass border-border">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-chart-3/20 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-chart-3" />
                </div>
                <div>
                  <CardTitle className="text-lg">Prompts Evaluados</CardTitle>
                  <p className="text-sm text-muted-foreground">Preguntas donde analizamos tu aparición</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {testedPrompts.map((prompt, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-xl border ${
                      prompt.mentioned ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {prompt.mentioned ? (
                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-red-400" />
                          )}
                          <span className="text-xs px-2 py-0.5 rounded-full bg-secondary">{prompt.engine}</span>
                        </div>
                        <p className="font-medium">{`"${prompt.prompt}"`}</p>
                      </div>
                      <div className="text-right shrink-0">
                        {prompt.mentioned ? (
                          <div>
                            <p className="text-sm text-green-400 font-medium">Mencionado</p>
                            <p className="text-xs text-muted-foreground">Posición {prompt.position}</p>
                          </div>
                        ) : (
                          <p className="text-sm text-red-400 font-medium">No aparece</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="flex items-center justify-center gap-4 py-8"
        >
          <Button variant="outline" className="glass border-border" asChild>
            <Link href="/geo/app/audits/new">
              Crear nuevo audit
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          <Button className="bg-primary hover:bg-primary/90 glow-primary" asChild>
            <Link href="/geo/app">
              Volver al dashboard
            </Link>
          </Button>
        </motion.div>
      </div>
    </>
  )
}
