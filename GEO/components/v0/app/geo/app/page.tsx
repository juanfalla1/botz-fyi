"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AppHeader } from "@/components/geo/app-shell"
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Eye,
  Quote,
  Building2,
  Target,
  ArrowRight,
  Calendar,
  ExternalLink,
} from "lucide-react"
import Link from "next/link"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts"

const metrics = [
  {
    title: "AI Visibility Score",
    value: "78",
    suffix: "/100",
    change: "+5.2%",
    trend: "up",
    icon: Eye,
  },
  {
    title: "Citation Probability",
    value: "64",
    suffix: "%",
    change: "+12.3%",
    trend: "up",
    icon: Quote,
  },
  {
    title: "Brand Mentions",
    value: "1,284",
    suffix: "",
    change: "+8.7%",
    trend: "up",
    icon: Building2,
  },
  {
    title: "Competitors Tracked",
    value: "12",
    suffix: "",
    change: "—",
    trend: "neutral",
    icon: Target,
  },
]

const chartData = [
  { date: "Ene", score: 52, citations: 35 },
  { date: "Feb", score: 58, citations: 42 },
  { date: "Mar", score: 55, citations: 38 },
  { date: "Abr", score: 62, citations: 48 },
  { date: "May", score: 68, citations: 55 },
  { date: "Jun", score: 72, citations: 62 },
  { date: "Jul", score: 78, citations: 64 },
]

const recentAudits = [
  {
    id: "demo",
    brand: "TechStartup Pro",
    date: "Hace 2 horas",
    score: 78,
    status: "completed",
  },
  {
    id: "2",
    brand: "Competitor A",
    date: "Hace 1 día",
    score: 65,
    status: "completed",
  },
  {
    id: "3",
    brand: "Industry Leader",
    date: "Hace 3 días",
    score: 82,
    status: "completed",
  },
]

const projects = [
  { name: "TechStartup Pro", audits: 12, lastAudit: "Hace 2 horas" },
  { name: "SaaS Platform", audits: 8, lastAudit: "Hace 2 días" },
  { name: "E-commerce Brand", audits: 5, lastAudit: "Hace 1 semana" },
]

export default function DashboardPage() {
  return (
    <>
      <AppHeader />
      <div className="p-6 space-y-6">
        {/* Header with CTA */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Overview</h2>
            <p className="text-muted-foreground">Tu rendimiento de visibilidad IA</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 glow-primary" asChild>
            <Link href="/geo/app/audits/new">
              <Plus className="w-5 h-5 mr-2" />
              Run GEO Audit
            </Link>
          </Button>
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
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                      <metric.icon className="w-5 h-5 text-primary" />
                    </div>
                    {metric.trend !== "neutral" && (
                      <div className={`flex items-center gap-1 text-sm ${metric.trend === "up" ? "text-green-400" : "text-red-400"}`}>
                        {metric.trend === "up" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {metric.change}
                      </div>
                    )}
                  </div>
                  <div className="text-3xl font-bold mb-1">
                    {metric.value}
                    <span className="text-lg text-muted-foreground font-normal">{metric.suffix}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{metric.title}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Charts and Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="lg:col-span-2"
          >
            <Card className="glass border-border">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Evolución GEO Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorCitations" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="date" stroke="#666" fontSize={12} />
                      <YAxis stroke="#666" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1a1a2e",
                          border: "1px solid #333",
                          borderRadius: "8px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="score"
                        stroke="#a855f7"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorScore)"
                        name="GEO Score"
                      />
                      <Area
                        type="monotone"
                        dataKey="citations"
                        stroke="#6366f1"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorCitations)"
                        name="Citations"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Projects */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <Card className="glass border-border h-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-semibold">Proyectos</CardTitle>
                <Button variant="ghost" size="sm" className="text-primary">
                  Ver todos
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {projects.map((project) => (
                  <div
                    key={project.name}
                    className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
                  >
                    <div>
                      <p className="font-medium text-sm">{project.name}</p>
                      <p className="text-xs text-muted-foreground">{project.audits} audits</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{project.lastAudit}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Recent Audits Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          <Card className="glass border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Auditorías Recientes</CardTitle>
              <Button variant="ghost" size="sm" className="text-primary" asChild>
                <Link href="/geo/app/audits">
                  Ver todas
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Marca</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Fecha</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">GEO Score</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Estado</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAudits.map((audit) => (
                      <tr key={audit.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary text-sm font-medium">
                              {audit.brand.charAt(0)}
                            </div>
                            <span className="font-medium">{audit.brand}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-muted-foreground text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {audit.date}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 rounded-full bg-secondary overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                                style={{ width: `${audit.score}%` }}
                              />
                            </div>
                            <span className="font-medium">{audit.score}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                            Completado
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/geo/app/audits/${audit.id}`}>
                              <ExternalLink className="w-4 h-4 mr-1" />
                              Ver
                            </Link>
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
