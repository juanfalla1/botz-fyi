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
import { useGeoI18n } from "@/GEO/components/geo/i18n"
import { useEffect, useState } from "react"
import { getMySubscription, type GeoSubscription } from "@/GEO/lib/billing"
import { supabaseGeo } from "@/app/geo/supabaseGeoClient"
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
    value: "0",
    suffix: "/100",
    change: "—",
    trend: "neutral",
    icon: Eye,
  },
  {
    title: "Citation Probability",
    value: "0",
    suffix: "%",
    change: "—",
    trend: "neutral",
    icon: Quote,
  },
  {
    title: "Prompts used",
    value: "0",
    suffix: "",
    change: "—",
    trend: "neutral",
    icon: Building2,
  },
  {
    title: "Competitors Tracked",
    value: "0",
    suffix: "",
    change: "—",
    trend: "neutral",
    icon: Target,
  },
]

type DashboardAudit = {
  id: string
  project_id: string | null
  base_url: string
  final_score: number | null
  created_at: string
  completed_at?: string | null
  status?: string
  summary?: unknown
}

type DashboardProject = {
  id?: string
  company_name?: string
  website_url?: string
}

export default function DashboardPage() {
  const { t, locale } = useGeoI18n()
  const isEn = locale === "en"
  const [subscription, setSubscription] = useState<GeoSubscription | null>(null)
  const [projectsLive, setProjectsLive] = useState<Array<{ id: string; name: string; audits: number; lastAudit: string }>>([])
  const [recentAuditsLive, setRecentAuditsLive] = useState<Array<{ id: string; brand: string; date: string; score: number; status: string }>>([])
  const [metricsLive, setMetricsLive] = useState(metrics.map((metric) => ({
    ...metric,
    title: locale === "en" ? metric.title : localizeMetricTitle(metric.title),
  })))
  const [chartLive, setChartLive] = useState<Array<{ date: string; score: number; citations: number }>>([])

  useEffect(() => {
    let mounted = true
    void getMySubscription()
      .then((sub) => {
        if (mounted) setSubscription(sub)
      })
      .catch(() => {
        if (mounted) setSubscription(null)
      })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const {
        data: { session },
      } = await supabaseGeo.auth.getSession()
      if (!session?.access_token) return

      const [projectsRes, auditsRes, usageRes, competitorsRes] = await Promise.all([
        fetch("/api/geo/projects", { headers: { Authorization: `Bearer ${session.access_token}` } }),
        fetch("/api/geo/audits", { headers: { Authorization: `Bearer ${session.access_token}` } }),
        fetch("/api/geo/usage", { headers: { Authorization: `Bearer ${session.access_token}` } }),
        fetch("/api/geo/competitors", { headers: { Authorization: `Bearer ${session.access_token}` } }),
      ])

      if (!mounted) return

      let projectsList: DashboardProject[] = []
      if (projectsRes.ok) {
        const pj = (await projectsRes.json()) as { data?: DashboardProject[] }
        projectsList = pj.data ?? []
      }

      let auditsList: DashboardAudit[] = []
      if (auditsRes.ok) {
        const aj = (await auditsRes.json()) as { data?: { audits?: DashboardAudit[] } }
        auditsList = aj.data?.audits ?? []
        const mapped = auditsList.slice(0, 5).map((a) => ({
          id: a.id,
          brand: a.base_url.replace(/^https?:\/\//, "").split("/")[0],
          date: new Date(a.created_at).toLocaleString(),
          score: a.final_score ?? 0,
          status: a.status ?? "completed",
        }))
        if (mapped.length > 0) setRecentAuditsLive(mapped)
      }

      const auditsByProject = auditsList.reduce<Record<string, DashboardAudit[]>>((acc, audit) => {
        if (!audit.project_id) return acc
        acc[audit.project_id] = [...(acc[audit.project_id] ?? []), audit]
        return acc
      }, {})
      const groupedProjects = new Map<string, { id: string; name: string; audits: number; lastAudit: string; lastDate: number }>()
      projectsList.forEach((project, index) => {
        const name = project.company_name?.trim() || project.website_url?.replace(/^https?:\/\//, "").split("/")[0] || (isEn ? "Project" : "Proyecto")
        const key = `${name.toLowerCase()}|${(project.website_url ?? "").toLowerCase()}`
        const projectAudits = project.id ? auditsByProject[project.id] ?? [] : []
        const latest = projectAudits
          .map((audit) => new Date(audit.completed_at ?? audit.created_at).getTime())
          .filter(Number.isFinite)
          .sort((a, b) => b - a)[0]
        const existing = groupedProjects.get(key)
        groupedProjects.set(key, {
          id: existing?.id ?? project.id ?? `${key}-${index}`,
          name,
          audits: (existing?.audits ?? 0) + projectAudits.length,
          lastDate: Math.max(existing?.lastDate ?? 0, latest ?? 0),
          lastAudit: "",
        })
      })
      setProjectsLive(Array.from(groupedProjects.values()).map((project) => ({
        ...project,
        lastAudit: project.lastDate > 0 ? new Date(project.lastDate).toLocaleDateString() : (isEn ? "No audits" : "Sin auditorias"),
      })).sort((a, b) => b.audits - a.audits).slice(0, 5))

      const completedChart = auditsList
        .filter((audit) => audit.status === "completed" && typeof audit.final_score === "number")
        .sort((a, b) => new Date(a.completed_at ?? a.created_at).getTime() - new Date(b.completed_at ?? b.created_at).getTime())
        .slice(-8)
        .map((audit) => {
          const summary = parseSummary(audit.summary)
          return {
            date: new Date(audit.completed_at ?? audit.created_at).toLocaleDateString(locale === "en" ? "en-US" : "es-ES", { month: "short", day: "numeric" }),
            score: audit.final_score ?? 0,
            citations: numberFrom(summary.citations_count ?? summary.citations),
          }
        })
      setChartLive(completedChart)

      if (usageRes.ok && competitorsRes.ok) {
        const uj = (await usageRes.json()) as { data?: { totals?: Record<string, number> } }
        const cj = (await competitorsRes.json()) as { data?: Array<unknown> }
        const totals = uj.data?.totals ?? {}
        const completedScores = auditsList.map((a) => a.final_score).filter((s): s is number => s !== null)
        const avgScore = completedScores.length > 0 ? Math.round(completedScores.reduce((acc, score) => acc + score, 0) / completedScores.length) : 0
        const auditsCount = totals.geo_audit_created ?? auditsList.length
        const promptCount = totals.prompt_used ?? 0
        const competitorsCount = (cj.data ?? []).length
        setMetricsLive([
          { ...metrics[0], title: isEn ? "AI Visibility Score" : "Score de visibilidad IA", value: String(avgScore), change: auditsCount > 0 ? String(auditsCount) : "—" },
          { ...metrics[1], title: isEn ? "AI Visibility" : "Visibilidad IA", value: String(Math.min(100, avgScore)), change: completedScores.length > 0 ? String(completedScores.length) : "—" },
          { ...metrics[2], title: isEn ? "Prompts used" : "Prompts ejecutados", value: String(promptCount || 0), change: promptCount > 0 ? String(promptCount) : "—" },
          { ...metrics[3], title: isEn ? "Competitors Tracked" : "Competidores monitoreados", value: String(competitorsCount || 0), change: "—" },
        ])
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [isEn])

  return (
    <>
      <AppHeader />
      <div className="p-6 space-y-6">
        <Link href="/geo" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
          {locale === "en" ? "← Back to site" : "← Volver al sitio"}
        </Link>

        {/* Header with CTA */}
        <div className="flex items-center justify-between">
          <div>
              <h2 className="text-2xl font-bold">{t("overview")}</h2>
              <p className="text-muted-foreground">{t("yourAiPerformance")}</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 glow-primary" asChild>
            <Link href="/geo/app/audits/new">
              <Plus className="w-5 h-5 mr-2" />
              {t("runGeoAudit")}
            </Link>
          </Button>
        </div>

        {/* Metric Cards */}
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          {metricsLive.map((metric, index) => (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card className="glass border-border hover:border-primary/50 transition-colors h-full">
                <CardContent className="min-h-[170px] p-5 sm:p-6 flex flex-col justify-center">
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                      <metric.icon className="w-6 h-6 text-primary" />
                    </div>
                    {metric.trend !== "neutral" && (
                      <div className={`flex items-center gap-1 text-sm ${metric.trend === "up" ? "text-green-400" : "text-red-400"}`}>
                        {metric.trend === "up" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {metric.change}
                      </div>
                    )}
                  </div>
                  <div className="text-4xl font-bold leading-none mb-2">
                    {metric.value}
                    <span className="text-xl text-muted-foreground font-normal">{metric.suffix}</span>
                  </div>
                  <p className="text-base text-muted-foreground">{metric.title}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Card className="glass border-border">
          <CardContent className="p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{locale === "en" ? "Current plan" : "Plan actual"}</p>
                <p className="text-lg font-semibold capitalize leading-tight">{subscription?.plan ?? "trial"}</p>
              </div>
              <div className="h-px w-full bg-border sm:h-8 sm:w-px" />
              <p className="text-sm text-muted-foreground">
                {locale === "en" ? "Audits" : "Auditorias"}: {subscription?.audits_used ?? 0} / {subscription?.audits_limit ?? 3} {locale === "en" ? "used" : "usados"}
              </p>
              <p className="text-sm text-muted-foreground">
                {locale === "en" ? "Prompts" : "Prompts"}: {subscription?.prompts_used ?? 0} / {subscription?.prompts_limit ?? 25} {locale === "en" ? "used" : "usados"}
              </p>
            </div>
            <Button asChild size="sm" className="bg-primary hover:bg-primary/90 md:self-center">
              <Link href="/geo/app/billing">{locale === "en" ? "Upgrade" : "Mejorar plan"}</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Charts and Tables */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="xl:col-span-2"
          >
            <Card className="glass border-border">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">{isEn ? "GEO Score trend" : "Evolución GEO Score"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {chartLive.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
                      <p className="font-medium">{isEn ? "No GEO trend yet" : "Sin evolución GEO todavía"}</p>
                      <p className="mt-1 max-w-md text-sm text-muted-foreground">{isEn ? "Run a completed audit to build the score trend." : "Ejecuta una auditoría completada para construir la evolución real del score."}</p>
                      <Button className="mt-4" asChild><Link href="/geo/app/audits/new">{isEn ? "Run GEO Audit" : "Ejecutar auditoría GEO"}</Link></Button>
                    </div>
                  ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartLive}
                    >
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
                        name={isEn ? "Citations" : "Citaciones"}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  )}
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
                <CardTitle className="text-lg font-semibold">{t("projects")}</CardTitle>
                <Button variant="ghost" size="sm" className="text-primary" asChild>
                  <Link href="/geo/app/projects/new">{isEn ? "New" : "Nuevo"}</Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {projectsLive.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center">
                    <p className="font-medium">{isEn ? "No projects yet" : "Sin proyectos aun"}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{isEn ? "Create a project to start audits and reports." : "Crea un proyecto para comenzar auditorias y reportes."}</p>
                    <Button className="mt-3" asChild><Link href="/geo/app/projects/new">{isEn ? "Create Project" : "Crear proyecto"}</Link></Button>
                  </div>
                )}
                {projectsLive.map((project) => (
                  <Link
                    key={project.id}
                    href={`/geo/app/projects/${project.id}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
                  >
                    <div>
                      <p className="font-medium text-sm">{project.name}</p>
                      <p className="text-xs text-muted-foreground">{project.audits} {isEn ? "audits" : "auditorias"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{project.lastAudit}</p>
                    </div>
                  </Link>
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
              <CardTitle className="text-lg font-semibold">{t("recentAudits")}</CardTitle>
              <Button variant="ghost" size="sm" className="text-primary" asChild>
                <Link href="/geo/app/audits">
                  {isEn ? "View all" : "Ver todas"}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-hidden lg:overflow-x-visible">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{isEn ? "Brand" : "Marca"}</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{isEn ? "Date" : "Fecha"}</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">GEO Score</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">{isEn ? "Status" : "Estado"}</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">{isEn ? "Action" : "Acción"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAuditsLive.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-sm text-muted-foreground">{isEn ? "No recent audits. Run your first GEO audit." : "Sin auditorias recientes. Ejecuta tu primera auditoria GEO."}</td>
                      </tr>
                    )}
                    {recentAuditsLive.map((audit) => (
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
                            {isEn ? "Completed" : "Completado"}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/geo/app/audits/detail?id=${audit.id}`}>
                              <ExternalLink className="w-4 h-4 mr-1" />
                              {isEn ? "View" : "Ver"}
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

function localizeMetricTitle(title: string) {
  const labels: Record<string, string> = {
    "AI Visibility Score": "Score de visibilidad IA",
    "Citation Probability": "Visibilidad IA",
    "Prompts used": "Prompts ejecutados",
    "Competitors Tracked": "Competidores monitoreados",
  }
  return labels[title] ?? title
}

function parseSummary(summary: unknown): Record<string, unknown> {
  if (summary && typeof summary === "object" && !Array.isArray(summary)) return summary as Record<string, unknown>
  if (typeof summary !== "string") return {}
  try {
    const parsed = JSON.parse(summary)
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

function numberFrom(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : Number.isFinite(Number(value)) ? Number(value) : 0
}
