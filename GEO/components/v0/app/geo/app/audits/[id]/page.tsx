"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AppHeader } from "@/components/geo/app-shell"
import {
  ArrowLeft,
  Download,
  Share2,
  Play,
  Pause,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Globe,
  Eye,
  Quote,
  Target,
  Zap,
  FileText,
  Lightbulb,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Search,
  Filter,
  Copy,
  MoreHorizontal,
  Sparkles,
  Award,
  Link2,
  Users,
  History,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
} from "lucide-react"
import Link from "next/link"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from "recharts"

// Mock audit data
const auditData = {
  id: "audit-20240315-001",
  projectName: "TechStartup Pro",
  domain: "techstartup.com",
  status: "completed",
  createdAt: "2024-03-15T14:30:00Z",
  completedAt: "2024-03-15T14:45:00Z",
  duration: "15 min",
  geoScore: 78,
  previousScore: 73,
  promptsTested: 120,
  promptsWon: 47,
  brandMentions: 89,
  totalCitations: 1284,
}

// Engine breakdown data
const engineBreakdown = [
  {
    name: "ChatGPT",
    score: 82,
    visibility: 68,
    mentions: 32,
    citations: 456,
    promptsWon: 18,
    promptsTested: 30,
    color: "#10b981",
    bgColor: "bg-emerald-500/20",
    textColor: "text-emerald-400",
  },
  {
    name: "Gemini",
    score: 75,
    visibility: 61,
    mentions: 24,
    citations: 312,
    promptsWon: 12,
    promptsTested: 30,
    color: "#3b82f6",
    bgColor: "bg-blue-500/20",
    textColor: "text-blue-400",
  },
  {
    name: "Perplexity",
    score: 78,
    visibility: 65,
    mentions: 21,
    citations: 298,
    promptsWon: 11,
    promptsTested: 30,
    color: "#f97316",
    bgColor: "bg-orange-500/20",
    textColor: "text-orange-400",
  },
  {
    name: "AI Overviews",
    score: 71,
    visibility: 52,
    mentions: 12,
    citations: 218,
    promptsWon: 6,
    promptsTested: 30,
    color: "#a855f7",
    bgColor: "bg-violet-500/20",
    textColor: "text-violet-400",
  },
]

// Prompt results data
const promptResults = [
  {
    id: 1,
    prompt: "Mejor software de gestión de proyectos para startups",
    engine: "ChatGPT",
    mentioned: true,
    position: 1,
    citations: 3,
    confidence: 94,
    status: "won",
  },
  {
    id: 2,
    prompt: "Herramientas SaaS para automatización empresarial",
    engine: "Gemini",
    mentioned: true,
    position: 2,
    citations: 2,
    confidence: 87,
    status: "won",
  },
  {
    id: 3,
    prompt: "Alternativas a Monday.com para equipos remotos",
    engine: "Perplexity",
    mentioned: true,
    position: 3,
    citations: 4,
    confidence: 82,
    status: "won",
  },
  {
    id: 4,
    prompt: "Software de productividad empresarial 2024",
    engine: "ChatGPT",
    mentioned: true,
    position: 5,
    citations: 1,
    confidence: 68,
    status: "mentioned",
  },
  {
    id: 5,
    prompt: "Mejores plataformas de gestión de tareas",
    engine: "AI Overviews",
    mentioned: false,
    position: null,
    citations: 0,
    confidence: 23,
    status: "not_mentioned",
  },
  {
    id: 6,
    prompt: "Herramientas de colaboración para empresas",
    engine: "Gemini",
    mentioned: true,
    position: 4,
    citations: 2,
    confidence: 75,
    status: "mentioned",
  },
]

// Brand mentions evidence
const brandMentions = [
  {
    id: 1,
    prompt: "Mejor software de gestión de proyectos",
    engine: "ChatGPT",
    context: "Para startups, TechStartup Pro ofrece una solución completa con funcionalidades de gestión de proyectos, automatización y colaboración en equipo...",
    sentiment: "positive",
    position: 1,
  },
  {
    id: 2,
    prompt: "Alternativas a Monday.com",
    engine: "Perplexity",
    context: "Entre las alternativas más recomendadas está TechStartup Pro, que destaca por su interfaz intuitiva y precios competitivos para equipos pequeños...",
    sentiment: "positive",
    position: 3,
  },
  {
    id: 3,
    prompt: "Herramientas SaaS empresariales",
    engine: "Gemini",
    context: "TechStartup Pro es una opción viable aunque con funcionalidades limitadas en comparación con soluciones enterprise como Asana o Jira...",
    sentiment: "neutral",
    position: 2,
  },
]

// Competitors detected
const competitorsDetected = [
  { name: "Asana", mentions: 45, position: 1.2, trend: "stable" },
  { name: "Monday.com", mentions: 42, position: 1.5, trend: "up" },
  { name: "Trello", mentions: 38, position: 2.1, trend: "down" },
  { name: "ClickUp", mentions: 35, position: 2.4, trend: "up" },
  { name: "Notion", mentions: 32, position: 2.8, trend: "stable" },
  { name: "TechStartup Pro", mentions: 28, position: 3.2, trend: "up", isYou: true },
]

// Citations/domains
const citationsDomains = [
  { domain: "techcrunch.com", count: 156, authority: 92, type: "media" },
  { domain: "g2.com", count: 134, authority: 88, type: "review" },
  { domain: "capterra.com", count: 112, authority: 85, type: "review" },
  { domain: "producthunt.com", count: 98, authority: 82, type: "community" },
  { domain: "linkedin.com", count: 87, authority: 95, type: "social" },
  { domain: "medium.com", count: 76, authority: 78, type: "blog" },
]

// Confidence reasons
const confidenceReasons = [
  {
    factor: "Autoridad de dominio",
    score: 85,
    impact: "positive",
    description: "Tu dominio tiene alta autoridad en el sector SaaS",
  },
  {
    factor: "Menciones en medios",
    score: 72,
    impact: "positive",
    description: "Presencia en TechCrunch, ProductHunt y G2",
  },
  {
    factor: "Contenido estructurado",
    score: 65,
    impact: "neutral",
    description: "Schema markup parcialmente implementado",
  },
  {
    factor: "Backlinks de calidad",
    score: 78,
    impact: "positive",
    description: "Enlaces desde sitios de alta autoridad",
  },
  {
    factor: "Cobertura de keywords",
    score: 45,
    impact: "negative",
    description: "Falta contenido para varios términos clave",
  },
]

// Recommendations
const recommendations = [
  {
    id: 1,
    type: "critical",
    title: "Optimizar Knowledge Graph",
    description: "Tu entidad no está bien definida. Implementa schema markup completo en todas las páginas principales.",
    impact: "Alto",
    effort: "Medio",
    expectedGain: "+8-12 puntos",
  },
  {
    id: 2,
    type: "important",
    title: "Crear contenido comparativo",
    description: "Desarrolla páginas de comparación vs Asana, Monday.com y ClickUp para capturar búsquedas de alternativas.",
    impact: "Alto",
    effort: "Alto",
    expectedGain: "+5-8 puntos",
  },
  {
    id: 3,
    type: "moderate",
    title: "Mejorar página de pricing",
    description: "La página de precios carece de información estructurada. Añade FAQ y comparativa de planes.",
    impact: "Medio",
    effort: "Bajo",
    expectedGain: "+3-5 puntos",
  },
  {
    id: 4,
    type: "suggestion",
    title: "Aumentar presencia en medios",
    description: "Busca menciones en publicaciones de alto DA como Forbes, Entrepreneur o TechCrunch.",
    impact: "Medio",
    effort: "Alto",
    expectedGain: "+4-6 puntos",
  },
]

// Timeline/logs
const auditLogs = [
  { time: "14:30:00", event: "Auditoría iniciada", type: "info" },
  { time: "14:30:15", event: "Configuración cargada: 4 motores, 120 prompts", type: "info" },
  { time: "14:31:00", event: "ChatGPT: Iniciando análisis (30 prompts)", type: "progress" },
  { time: "14:35:22", event: "ChatGPT: Completado - 18/30 prompts ganados", type: "success" },
  { time: "14:35:30", event: "Gemini: Iniciando análisis (30 prompts)", type: "progress" },
  { time: "14:39:45", event: "Gemini: Completado - 12/30 prompts ganados", type: "success" },
  { time: "14:39:52", event: "Perplexity: Iniciando análisis (30 prompts)", type: "progress" },
  { time: "14:43:18", event: "Perplexity: Completado - 11/30 prompts ganados", type: "success" },
  { time: "14:43:25", event: "AI Overviews: Iniciando análisis (30 prompts)", type: "progress" },
  { time: "14:44:30", event: "AI Overviews: Rate limit alcanzado, reintentando...", type: "warning" },
  { time: "14:44:55", event: "AI Overviews: Completado - 6/30 prompts ganados", type: "success" },
  { time: "14:45:00", event: "Auditoría completada exitosamente", type: "success" },
]

// Engine score chart data
const engineChartData = engineBreakdown.map((e) => ({
  name: e.name,
  score: e.score,
  color: e.color,
}))

// Radar data for score breakdown
const scoreRadarData = [
  { subject: "Visibility", value: 68, fullMark: 100 },
  { subject: "Citations", value: 72, fullMark: 100 },
  { subject: "Authority", value: 78, fullMark: 100 },
  { subject: "Content", value: 65, fullMark: 100 },
  { subject: "Competition", value: 82, fullMark: 100 },
]

export default function AuditDetailPage() {
  const [promptFilter, setPromptFilter] = useState<"all" | "won" | "mentioned" | "not_mentioned">("all")
  const [showAllLogs, setShowAllLogs] = useState(false)

  const filteredPrompts = promptResults.filter((p) => {
    if (promptFilter === "all") return true
    return p.status === promptFilter
  })

  const displayedLogs = showAllLogs ? auditLogs : auditLogs.slice(-5)

  return (
    <>
      <AppHeader />
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <Link
              href="/geo/app/audits"
              className="mt-1 p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-bold">Auditoría GEO</h1>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Completado
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Globe className="w-4 h-4" />
                  {auditData.projectName} ({auditData.domain})
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  15 Mar 2024, 14:30
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  Duración: {auditData.duration}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="glass border-border">
              <RefreshCw className="w-4 h-4 mr-2" />
              Repetir
            </Button>
            <Button variant="outline" size="sm" className="glass border-border">
              <Share2 className="w-4 h-4 mr-2" />
              Compartir
            </Button>
            <Button variant="outline" size="sm" className="glass border-border">
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>

        {/* GEO Score Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="glass border-border overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row items-center gap-8">
                {/* Main Score Ring */}
                <div className="text-center">
                  <div className="relative w-40 h-40 mx-auto">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-secondary"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        stroke="url(#scoreGrad)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${auditData.geoScore * 2.64} ${100 * 2.64}`}
                      />
                      <defs>
                        <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#a855f7" />
                          <stop offset="100%" stopColor="#6366f1" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-5xl font-bold text-gradient">{auditData.geoScore}</span>
                      <span className="text-xs text-muted-foreground">de 100</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <span className="text-emerald-400 text-sm font-medium flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      +{auditData.geoScore - auditData.previousScore}
                    </span>
                    <span className="text-muted-foreground text-xs">vs anterior</span>
                  </div>
                </div>

                {/* Score Breakdown Radar */}
                <div className="flex-1 h-[200px] hidden lg:block">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={scoreRadarData}>
                      <PolarGrid stroke="#333" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: "#888", fontSize: 11 }} />
                      <Radar
                        name="Score"
                        dataKey="value"
                        stroke="#a855f7"
                        fill="#a855f7"
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 w-full lg:w-auto">
                  <div className="p-3 rounded-xl bg-secondary/50 text-center lg:text-left">
                    <p className="text-xs text-muted-foreground">Prompts Ganados</p>
                    <p className="text-xl font-bold text-amber-400">{auditData.promptsWon}/{auditData.promptsTested}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-secondary/50 text-center lg:text-left">
                    <p className="text-xs text-muted-foreground">Menciones</p>
                    <p className="text-xl font-bold text-cyan-400">{auditData.brandMentions}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-secondary/50 text-center lg:text-left">
                    <p className="text-xs text-muted-foreground">Citaciones</p>
                    <p className="text-xl font-bold text-emerald-400">{auditData.totalCitations.toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-secondary/50 text-center lg:text-left">
                    <p className="text-xs text-muted-foreground">Motores</p>
                    <p className="text-xl font-bold text-violet-400">4</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Engine Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="glass border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Desglose por Motor IA</CardTitle>
              <p className="text-sm text-muted-foreground">Rendimiento en cada plataforma de IA</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {engineBreakdown.map((engine, index) => (
                  <motion.div
                    key={engine.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
                    className="p-4 rounded-xl bg-secondary/30 border border-border hover:border-primary/30 transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-sm font-medium px-2 py-1 rounded-lg ${engine.bgColor} ${engine.textColor}`}>
                        {engine.name}
                      </span>
                      <span className="text-2xl font-bold">{engine.score}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Visibility</span>
                        <span>{engine.visibility}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${engine.visibility}%`, backgroundColor: engine.color }}
                        />
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Prompts</span>
                        <span>{engine.promptsWon}/{engine.promptsTested}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Menciones</span>
                        <span>{engine.mentions}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Citaciones</span>
                        <span>{engine.citations}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Engine Comparison Chart */}
              <div className="mt-6 h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={engineChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} stroke="#666" fontSize={11} />
                    <YAxis type="category" dataKey="name" stroke="#666" fontSize={11} width={90} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1a1a2e",
                        border: "1px solid #333",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                      {engineChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Prompt Results Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="glass border-border">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-lg font-semibold">Resultados de Prompts</CardTitle>
                  <p className="text-sm text-muted-foreground">{promptResults.length} prompts analizados</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={promptFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPromptFilter("all")}
                    className={promptFilter === "all" ? "" : "glass border-border"}
                  >
                    Todos
                  </Button>
                  <Button
                    variant={promptFilter === "won" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPromptFilter("won")}
                    className={promptFilter === "won" ? "bg-emerald-600" : "glass border-border"}
                  >
                    Ganados
                  </Button>
                  <Button
                    variant={promptFilter === "mentioned" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPromptFilter("mentioned")}
                    className={promptFilter === "mentioned" ? "bg-amber-600" : "glass border-border"}
                  >
                    Mencionados
                  </Button>
                  <Button
                    variant={promptFilter === "not_mentioned" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPromptFilter("not_mentioned")}
                    className={promptFilter === "not_mentioned" ? "bg-rose-600" : "glass border-border"}
                  >
                    Sin mención
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Prompt</th>
                      <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Motor</th>
                      <th className="text-center py-3 px-3 text-xs font-medium text-muted-foreground">Mencionado</th>
                      <th className="text-center py-3 px-3 text-xs font-medium text-muted-foreground">Posición</th>
                      <th className="text-center py-3 px-3 text-xs font-medium text-muted-foreground">Citaciones</th>
                      <th className="text-center py-3 px-3 text-xs font-medium text-muted-foreground">Confianza</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPrompts.map((prompt, index) => (
                      <tr
                        key={prompt.id}
                        className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2 max-w-[300px]">
                            <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="text-sm truncate">{prompt.prompt}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-xs px-2 py-1 rounded-lg font-medium ${
                            prompt.engine === "ChatGPT" ? "bg-emerald-500/20 text-emerald-400" :
                            prompt.engine === "Gemini" ? "bg-blue-500/20 text-blue-400" :
                            prompt.engine === "Perplexity" ? "bg-orange-500/20 text-orange-400" :
                            "bg-violet-500/20 text-violet-400"
                          }`}>
                            {prompt.engine}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {prompt.mentioned ? (
                            <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto" />
                          ) : (
                            <XCircle className="w-5 h-5 text-rose-400 mx-auto" />
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {prompt.position ? (
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-sm font-bold ${
                              prompt.position === 1 ? "bg-amber-500/20 text-amber-400" :
                              prompt.position <= 3 ? "bg-emerald-500/20 text-emerald-400" :
                              "bg-secondary text-muted-foreground"
                            }`}>
                              #{prompt.position}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center text-sm">{prompt.citations}</td>
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-12 h-1.5 rounded-full bg-secondary overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  prompt.confidence >= 80 ? "bg-emerald-500" :
                                  prompt.confidence >= 50 ? "bg-amber-500" :
                                  "bg-rose-500"
                                }`}
                                style={{ width: `${prompt.confidence}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-8">{prompt.confidence}%</span>
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

        {/* Two Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Brand Mentions Evidence */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Card className="glass border-border h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Quote className="w-5 h-5 text-cyan-400" />
                  Evidencia de Menciones
                </CardTitle>
                <p className="text-sm text-muted-foreground">Contexto de cómo aparece tu marca</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {brandMentions.map((mention, index) => (
                    <div
                      key={mention.id}
                      className={`p-4 rounded-xl border ${
                        mention.sentiment === "positive" ? "border-emerald-500/30 bg-emerald-500/5" :
                        mention.sentiment === "negative" ? "border-rose-500/30 bg-rose-500/5" :
                        "border-border bg-secondary/30"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded-lg ${
                          mention.engine === "ChatGPT" ? "bg-emerald-500/20 text-emerald-400" :
                          mention.engine === "Gemini" ? "bg-blue-500/20 text-blue-400" :
                          "bg-orange-500/20 text-orange-400"
                        }`}>
                          {mention.engine}
                        </span>
                        <span className="text-xs text-muted-foreground">Posición #{mention.position}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{mention.prompt}</p>
                      <p className="text-sm text-foreground/90 italic">&quot;{mention.context}&quot;</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Competitors Detected */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
          >
            <Card className="glass border-border h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Target className="w-5 h-5 text-rose-400" />
                  Competidores Detectados
                </CardTitle>
                <p className="text-sm text-muted-foreground">Marcas que aparecen en los mismos prompts</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {competitorsDetected.map((competitor, index) => (
                    <div
                      key={competitor.name}
                      className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                        competitor.isYou ? "bg-primary/10 border border-primary/30" : "bg-secondary/30 hover:bg-secondary/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </span>
                        <div>
                          <span className={`text-sm font-medium ${competitor.isYou ? "text-primary" : ""}`}>
                            {competitor.name}
                            {competitor.isYou && <span className="ml-2 text-xs text-primary">(Tú)</span>}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-center">
                          <p className="text-muted-foreground text-xs">Menciones</p>
                          <p className="font-medium">{competitor.mentions}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-muted-foreground text-xs">Pos. Avg</p>
                          <p className="font-medium">{competitor.position}</p>
                        </div>
                        <div className={`w-5 h-5 flex items-center justify-center ${
                          competitor.trend === "up" ? "text-emerald-400" :
                          competitor.trend === "down" ? "text-rose-400" :
                          "text-muted-foreground"
                        }`}>
                          {competitor.trend === "up" ? <TrendingUp className="w-4 h-4" /> :
                           competitor.trend === "down" ? <TrendingDown className="w-4 h-4" /> :
                           <span className="text-xs">—</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Citations/Domains */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Card className="glass border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Link2 className="w-5 h-5 text-emerald-400" />
                Dominios Citados
              </CardTitle>
              <p className="text-sm text-muted-foreground">Fuentes que los LLMs utilizan para tu marca</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {citationsDomains.map((domain, index) => (
                  <div
                    key={domain.domain}
                    className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-xs font-medium text-muted-foreground">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium flex items-center gap-1">
                          {domain.domain}
                          <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </p>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          domain.type === "media" ? "bg-blue-500/20 text-blue-400" :
                          domain.type === "review" ? "bg-amber-500/20 text-amber-400" :
                          domain.type === "community" ? "bg-violet-500/20 text-violet-400" :
                          domain.type === "social" ? "bg-cyan-500/20 text-cyan-400" :
                          "bg-emerald-500/20 text-emerald-400"
                        }`}>
                          {domain.type}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{domain.count}</p>
                      <p className="text-xs text-muted-foreground">DA: {domain.authority}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Two Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Confidence Reasons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.45 }}
          >
            <Card className="glass border-border h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-400" />
                  Factores de Confianza
                </CardTitle>
                <p className="text-sm text-muted-foreground">Por qué los LLMs mencionan o ignoran tu marca</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {confidenceReasons.map((reason, index) => (
                    <div key={index} className="p-3 rounded-xl bg-secondary/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{reason.factor}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                reason.impact === "positive" ? "bg-emerald-500" :
                                reason.impact === "negative" ? "bg-rose-500" :
                                "bg-amber-500"
                              }`}
                              style={{ width: `${reason.score}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-8">{reason.score}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{reason.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Recommendations */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <Card className="glass border-border h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-400" />
                  Recomendaciones
                </CardTitle>
                <p className="text-sm text-muted-foreground">Acciones para mejorar tu GEO Score</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recommendations.map((rec, index) => (
                    <div
                      key={rec.id}
                      className={`p-3 rounded-xl border ${
                        rec.type === "critical" ? "border-rose-500/30 bg-rose-500/5" :
                        rec.type === "important" ? "border-amber-500/30 bg-amber-500/5" :
                        "border-border bg-secondary/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-sm font-medium">{rec.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                          rec.impact === "Alto" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                        }`}>
                          {rec.impact}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{rec.description}</p>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-muted-foreground">Esfuerzo: {rec.effort}</span>
                        <span className="text-emerald-400">{rec.expectedGain}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Timeline/Logs Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.55 }}
        >
          <Card className="glass border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <History className="w-5 h-5 text-violet-400" />
                    Registro de Ejecución
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Timeline de la auditoría</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllLogs(!showAllLogs)}
                >
                  {showAllLogs ? "Mostrar menos" : "Ver todo"}
                  <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${showAllLogs ? "rotate-180" : ""}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {displayedLogs.map((log, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-secondary/30 transition-colors"
                  >
                    <span className="text-xs text-muted-foreground font-mono w-16 shrink-0">{log.time}</span>
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      log.type === "success" ? "bg-emerald-400" :
                      log.type === "warning" ? "bg-amber-400" :
                      log.type === "error" ? "bg-rose-400" :
                      log.type === "progress" ? "bg-blue-400" :
                      "bg-muted-foreground"
                    }`} />
                    <span className="text-sm">{log.event}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  )
}
