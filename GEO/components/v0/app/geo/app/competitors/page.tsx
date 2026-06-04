"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AppHeader } from "@/components/geo/app-shell"
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Target,
  Eye,
  Quote,
  Trophy,
  Search,
  MoreHorizontal,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
} from "lucide-react"
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
  Legend,
} from "recharts"

const competitors = [
  {
    id: 1,
    name: "Competitor Alpha",
    domain: "alpha.com",
    geoScore: 82,
    visibility: 75,
    citations: 156,
    trend: "up",
    change: "+4.2%",
    promptsWon: 45,
  },
  {
    id: 2,
    name: "Industry Leader",
    domain: "leader.io",
    geoScore: 91,
    visibility: 88,
    citations: 234,
    trend: "up",
    change: "+2.1%",
    promptsWon: 78,
  },
  {
    id: 3,
    name: "Startup Rival",
    domain: "rival.co",
    geoScore: 68,
    visibility: 62,
    citations: 89,
    trend: "down",
    change: "-1.5%",
    promptsWon: 23,
  },
  {
    id: 4,
    name: "Tech Giants Inc",
    domain: "techgiants.com",
    geoScore: 85,
    visibility: 79,
    citations: 198,
    trend: "up",
    change: "+5.8%",
    promptsWon: 56,
  },
  {
    id: 5,
    name: "New Entrant",
    domain: "newentrant.ai",
    geoScore: 54,
    visibility: 48,
    citations: 34,
    trend: "up",
    change: "+12.3%",
    promptsWon: 12,
  },
]

const radarData = [
  { metric: "GEO Score", you: 78, leader: 91, average: 72 },
  { metric: "Visibility", you: 72, leader: 88, average: 65 },
  { metric: "Citations", you: 65, leader: 85, average: 58 },
  { metric: "Authority", you: 70, leader: 82, average: 62 },
  { metric: "Content", you: 80, leader: 78, average: 70 },
  { metric: "Technical", you: 75, leader: 85, average: 68 },
]

const promptsData = [
  { prompt: "Best AI tools", you: 3, competitor: 1 },
  { prompt: "Top SaaS platforms", you: 2, competitor: 4 },
  { prompt: "Enterprise solutions", you: 5, competitor: 2 },
  { prompt: "Startup tools", you: 1, competitor: 3 },
  { prompt: "B2B software", you: 4, competitor: 2 },
]

const metrics = [
  {
    title: "Tu GEO Score",
    value: "78",
    suffix: "/100",
    comparison: "vs 72 promedio",
    icon: Target,
    color: "primary",
  },
  {
    title: "Competidores Tracked",
    value: "5",
    suffix: "",
    comparison: "+2 este mes",
    icon: Eye,
    color: "accent",
  },
  {
    title: "Prompts Ganados",
    value: "34",
    suffix: "",
    comparison: "de 120 totales",
    icon: Trophy,
    color: "green-400",
  },
  {
    title: "Citas Totales",
    value: "711",
    suffix: "",
    comparison: "+89 vs competencia",
    icon: Quote,
    color: "blue-400",
  },
]

export default function CompetitorsPage() {
  return (
    <>
      <AppHeader />
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Competidores</h2>
            <p className="text-muted-foreground">Analiza y compara tu visibilidad IA con la competencia</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="border-border">
              <Filter className="w-4 h-4 mr-2" />
              Filtrar
            </Button>
            <Button className="bg-primary hover:bg-primary/90 glow-primary">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Competidor
            </Button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card className="glass border-border hover:border-primary/50 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-10 h-10 rounded-xl bg-${metric.color}/20 flex items-center justify-center`}>
                      <metric.icon className={`w-5 h-5 text-${metric.color}`} />
                    </div>
                  </div>
                  <div className="text-3xl font-bold mb-1">
                    {metric.value}
                    <span className="text-lg text-muted-foreground font-normal">{metric.suffix}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{metric.title}</p>
                  <p className="text-xs text-primary mt-1">{metric.comparison}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Radar Comparison */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <Card className="glass border-border">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Comparación de Métricas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#333" />
                      <PolarAngleAxis dataKey="metric" tick={{ fill: "#888", fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#666", fontSize: 10 }} />
                      <Radar name="Tú" dataKey="you" stroke="#a855f7" fill="#a855f7" fillOpacity={0.3} strokeWidth={2} />
                      <Radar name="Líder" dataKey="leader" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
                      <Radar name="Promedio" dataKey="average" stroke="#666" fill="#666" fillOpacity={0.1} strokeWidth={1} strokeDasharray="3 3" />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Prompts Won Comparison */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <Card className="glass border-border">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Prompts Ganados vs Competencia</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={promptsData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                      <XAxis type="number" stroke="#666" fontSize={12} />
                      <YAxis dataKey="prompt" type="category" stroke="#666" fontSize={11} width={120} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1a1a2e",
                          border: "1px solid #333",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="you" name="Tú" fill="#a855f7" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="competitor" name="Mejor Competidor" fill="#6366f1" radius={[0, 4, 4, 0]} />
                      <Legend />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Competitors Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          <Card className="glass border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Todos los Competidores</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar competidor..."
                  className="pl-10 pr-4 py-2 bg-secondary/50 border border-border rounded-lg text-sm focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Competidor</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">GEO Score</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">AI Visibility</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Citations</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Prompts Ganados</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Trend</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {competitors.map((competitor) => (
                      <tr key={competitor.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-primary font-bold">
                              {competitor.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium">{competitor.name}</p>
                              <p className="text-xs text-muted-foreground">{competitor.domain}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 rounded-full bg-secondary overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                                style={{ width: `${competitor.geoScore}%` }}
                              />
                            </div>
                            <span className="font-medium text-sm">{competitor.geoScore}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-medium">{competitor.visibility}%</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-medium">{competitor.citations}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary">
                            {competitor.promptsWon} ganados
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className={`flex items-center gap-1 text-sm ${competitor.trend === "up" ? "text-green-400" : "text-red-400"}`}>
                            {competitor.trend === "up" ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                            {competitor.change}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  )
}
