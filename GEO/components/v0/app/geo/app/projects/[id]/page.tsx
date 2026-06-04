"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AppHeader } from "@/components/geo/app-shell"
import {
  Play,
  TrendingUp,
  TrendingDown,
  Eye,
  Quote,
  Target,
  ArrowRight,
  Calendar,
  ExternalLink,
  Globe,
  MapPin,
  Languages,
  Zap,
  FileText,
  Lightbulb,
  Trophy,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MoreHorizontal,
  RefreshCw,
  Download,
  ChevronRight,
  Sparkles,
  BarChart3,
  Users,
  MessageSquare,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from "recharts"

// Mock project data
const project = {
  id: "techstartup-pro",
  name: "TechStartup Pro",
  domain: "techstartup.com",
  country: "España",
  language: "Español",
  countryCode: "ES",
  createdAt: "2024-01-15",
  lastAudit: "Hace 2 horas",
}

// Compact metrics
const metrics = [
  {
    title: "GEO Score",
    value: "78",
    suffix: "/100",
    change: "+5.2%",
    trend: "up",
    icon: Sparkles,
    color: "text-violet-400",
    bgColor: "bg-violet-500/20",
  },
  {
    title: "AI Visibility",
    value: "64",
    suffix: "%",
    change: "+12.3%",
    trend: "up",
    icon: Eye,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/20",
  },
  {
    title: "Citations",
    value: "1,284",
    suffix: "",
    change: "+8.7%",
    trend: "up",
    icon: Quote,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20",
  },
  {
    title: "Prompts Won",
    value: "47",
    suffix: "/120",
    change: "+15%",
    trend: "up",
    icon: Trophy,
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
  },
  {
    title: "Competitors",
    value: "8",
    suffix: "",
    change: "—",
    trend: "neutral",
    icon: Target,
    color: "text-rose-400",
    bgColor: "bg-rose-500/20",
  },
]

// Latest audit data
const latestAudit = {
  id: "audit-123",
  date: "2024-03-15",
  timeAgo: "Hace 2 horas",
  geoScore: 78,
  previousScore: 73,
  aiVisibility: 64,
  citations: 1284,
  engines: ["ChatGPT", "Gemini", "Perplexity"],
  status: "completed",
  promptsTested: 120,
  promptsWon: 47,
}

// Competitor snapshot
const competitors = [
  { name: "CompetitorA", score: 82, change: "+3%", trend: "up" },
  { name: "CompetitorB", score: 71, change: "-2%", trend: "down" },
  { name: "CompetitorC", score: 68, change: "+1%", trend: "up" },
  { name: "CompetitorD", score: 65, change: "0%", trend: "neutral" },
]

// Active prompts
const activePrompts = [
  { prompt: "Mejor software de gestión de proyectos", position: 1, engine: "ChatGPT", status: "won" },
  { prompt: "Herramientas SaaS para startups", position: 2, engine: "Gemini", status: "won" },
  { prompt: "Alternativas a Monday.com", position: 3, engine: "Perplexity", status: "won" },
  { prompt: "Software de productividad empresarial", position: 5, engine: "ChatGPT", status: "mentioned" },
]

// Recommendations
const recommendations = [
  {
    title: "Optimizar página de pricing",
    impact: "Alto",
    impactColor: "text-emerald-400 bg-emerald-500/20",
    description: "Añadir schema markup y mejorar CTAs",
  },
  {
    title: "Crear contenido comparativo",
    impact: "Alto",
    impactColor: "text-emerald-400 bg-emerald-500/20",
    description: "Artículos vs competidores principales",
  },
  {
    title: "Mejorar autoridad de marca",
    impact: "Medio",
    impactColor: "text-amber-400 bg-amber-500/20",
    description: "Conseguir menciones en medios relevantes",
  },
]

// Automations
const automations = [
  { name: "Auditoría Semanal", frequency: "Cada lunes", status: "active", lastRun: "Hace 2 días" },
  { name: "Monitoreo Competidores", frequency: "Diario", status: "active", lastRun: "Hace 5 horas" },
]

// Reports
const reports = [
  { name: "Reporte Mensual - Marzo 2024", type: "monthly", date: "01/03/2024" },
  { name: "Análisis Competitivo Q1", type: "competitive", date: "15/02/2024" },
]

// Chart data
const scoreHistory = [
  { date: "Ene", score: 52 },
  { date: "Feb", score: 58 },
  { date: "Mar", score: 62 },
  { date: "Abr", score: 68 },
  { date: "May", score: 73 },
  { date: "Jun", score: 78 },
]

// Radar data for competitor comparison
const radarData = [
  { metric: "GEO Score", you: 78, avg: 68 },
  { metric: "Visibility", you: 64, avg: 55 },
  { metric: "Citations", you: 72, avg: 58 },
  { metric: "Authority", you: 68, avg: 62 },
  { metric: "Content", you: 75, avg: 60 },
]

export default function ProjectHubPage() {
  return (
    <>
      <AppHeader />
      <div className="p-6 space-y-6">
        {/* Project Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
        >
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xl font-bold shrink-0">
              {project.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Globe className="w-4 h-4" />
                  {project.domain}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {project.country}
                </span>
                <span className="flex items-center gap-1.5">
                  <Languages className="w-4 h-4" />
                  {project.language}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  Último audit: {project.lastAudit}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Sincronizar
            </Button>
            <Button className="bg-primary hover:bg-primary/90 glow-primary">
              <Play className="w-4 h-4 mr-2" />
              Run GEO Audit
            </Button>
          </div>
        </motion.div>

        {/* Compact Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card className="glass border-border hover:border-primary/30 transition-all group">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-8 h-8 rounded-lg ${metric.bgColor} flex items-center justify-center`}>
                      <metric.icon className={`w-4 h-4 ${metric.color}`} />
                    </div>
                    {metric.trend !== "neutral" && (
                      <span className={`text-xs font-medium flex items-center gap-0.5 ${
                        metric.trend === "up" ? "text-emerald-400" : "text-rose-400"
                      }`}>
                        {metric.trend === "up" ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        {metric.change}
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-bold">
                    {metric.value}
                    <span className="text-sm text-muted-foreground font-normal">{metric.suffix}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{metric.title}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - 2 cols */}
          <div className="lg:col-span-2 space-y-6">
            {/* Latest Audit Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <Card className="glass border-border overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-lg font-semibold">Última Auditoría</CardTitle>
                    <p className="text-sm text-muted-foreground">{latestAudit.timeAgo}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Completado
                    </span>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/geo/app/audits/${latestAudit.id}`}>
                        Ver detalles
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="p-3 rounded-xl bg-secondary/50">
                      <p className="text-xs text-muted-foreground mb-1">GEO Score</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-violet-400">{latestAudit.geoScore}</span>
                        <span className="text-xs text-emerald-400">+{latestAudit.geoScore - latestAudit.previousScore}</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-secondary/50">
                      <p className="text-xs text-muted-foreground mb-1">AI Visibility</p>
                      <span className="text-2xl font-bold text-cyan-400">{latestAudit.aiVisibility}%</span>
                    </div>
                    <div className="p-3 rounded-xl bg-secondary/50">
                      <p className="text-xs text-muted-foreground mb-1">Prompts Ganados</p>
                      <span className="text-2xl font-bold text-amber-400">{latestAudit.promptsWon}/{latestAudit.promptsTested}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-secondary/50">
                      <p className="text-xs text-muted-foreground mb-1">Motores</p>
                      <div className="flex flex-wrap gap-1">
                        {latestAudit.engines.map((engine) => (
                          <span key={engine} className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary">
                            {engine}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Mini Score History Chart */}
                  <div className="h-[120px] mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={scoreHistory}>
                        <defs>
                          <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} domain={[40, 100]} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1a1a2e",
                            border: "1px solid #333",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="score"
                          stroke="#a855f7"
                          strokeWidth={2}
                          fill="url(#scoreGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Active Prompts */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
            >
              <Card className="glass border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-lg font-semibold">Prompts Activos</CardTitle>
                    <p className="text-sm text-muted-foreground">Tu posición en respuestas IA</p>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/geo/app/audits">
                      Ver todos
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {activePrompts.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                            item.status === "won" 
                              ? "bg-emerald-500/20 text-emerald-400" 
                              : "bg-amber-500/20 text-amber-400"
                          }`}>
                            #{item.position}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{item.prompt}</p>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              item.engine === "ChatGPT" ? "bg-emerald-500/20 text-emerald-400" :
                              item.engine === "Gemini" ? "bg-blue-500/20 text-blue-400" :
                              "bg-orange-500/20 text-orange-400"
                            }`}>
                              {item.engine}
                            </span>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${
                          item.status === "won" 
                            ? "bg-emerald-500/20 text-emerald-400" 
                            : "bg-amber-500/20 text-amber-400"
                        }`}>
                          {item.status === "won" ? "Ganado" : "Mencionado"}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Recommendations Preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 }}
            >
              <Card className="glass border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-amber-400" />
                      Recomendaciones
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Acciones para mejorar tu GEO Score</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    Ver todas
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {recommendations.map((rec, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors group cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                          <Lightbulb className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium">{rec.title}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${rec.impactColor}`}>
                              {rec.impact}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{rec.description}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Right Column - 1 col */}
          <div className="space-y-6">
            {/* Competitor Snapshot */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.35 }}
            >
              <Card className="glass border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg font-semibold">Competidores</CardTitle>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/geo/app/competitors">
                      <Target className="w-4 h-4" />
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Mini Radar Chart */}
                  <div className="h-[160px] mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#333" />
                        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: "#888" }} />
                        <Radar
                          name="Tú"
                          dataKey="you"
                          stroke="#a855f7"
                          fill="#a855f7"
                          fillOpacity={0.3}
                        />
                        <Radar
                          name="Promedio"
                          dataKey="avg"
                          stroke="#666"
                          fill="#666"
                          fillOpacity={0.1}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Competitor List */}
                  <div className="space-y-2">
                    {competitors.map((comp, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-secondary flex items-center justify-center text-xs font-medium">
                            {index + 1}
                          </div>
                          <span className="text-sm">{comp.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{comp.score}</span>
                          <span className={`text-xs ${
                            comp.trend === "up" ? "text-emerald-400" : 
                            comp.trend === "down" ? "text-rose-400" : "text-muted-foreground"
                          }`}>
                            {comp.change}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Automations Preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.45 }}
            >
              <Card className="glass border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-400" />
                    Automatizaciones
                  </CardTitle>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/geo/app/automations">
                      <MoreHorizontal className="w-4 h-4" />
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent className="pt-0">
                  {automations.length > 0 ? (
                    <div className="space-y-3">
                      {automations.map((auto, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 rounded-xl bg-secondary/30"
                        >
                          <div>
                            <p className="text-sm font-medium">{auto.name}</p>
                            <p className="text-xs text-muted-foreground">{auto.frequency}</p>
                          </div>
                          <div className="text-right">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-400">
                              Activa
                            </span>
                            <p className="text-xs text-muted-foreground mt-1">{auto.lastRun}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={Zap}
                      title="Sin automatizaciones"
                      description="Configura auditorías automáticas"
                      action="Crear"
                      href="/geo/app/automations"
                    />
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Reports Preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 }}
            >
              <Card className="glass border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-cyan-400" />
                    Reportes
                  </CardTitle>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/geo/app/reports">
                      <MoreHorizontal className="w-4 h-4" />
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent className="pt-0">
                  {reports.length > 0 ? (
                    <div className="space-y-3">
                      {reports.map((report, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              report.type === "monthly" ? "bg-violet-500/20" : "bg-cyan-500/20"
                            }`}>
                              <FileText className={`w-4 h-4 ${
                                report.type === "monthly" ? "text-violet-400" : "text-cyan-400"
                              }`} />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{report.name}</p>
                              <p className="text-xs text-muted-foreground">{report.date}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={FileText}
                      title="Sin reportes"
                      description="Genera tu primer reporte"
                      action="Crear"
                      href="/geo/app/reports"
                    />
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  )
}

// Empty State Component
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  action: string
  href: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>
      <h4 className="text-sm font-medium mb-1">{title}</h4>
      <p className="text-xs text-muted-foreground mb-3">{description}</p>
      <Button variant="outline" size="sm" asChild>
        <Link href={href}>
          {action}
          <ArrowRight className="w-4 h-4 ml-1" />
        </Link>
      </Button>
    </div>
  )
}

// Loading State Component
function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
      <p className="text-sm text-muted-foreground">Cargando datos del proyecto...</p>
    </div>
  )
}
