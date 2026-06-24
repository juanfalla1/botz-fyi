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
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Sparkles,
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
import { useGeoI18n } from "@/GEO/components/geo/i18n"
import { CompetitorActionsMenu } from "@/GEO/components/geo/competitor-actions-menu"
import { useEffect, useMemo, useState } from "react"
import { supabaseGeo } from "@/app/geo/supabaseGeoClient"
import Link from "next/link"

const promptBuckets = ["Brand", "Product", "Category", "Comparison", "Intent"]

type CompetitorInsight = {
  id: string
  name: string
  domain: string | null
  project_id: string | null
  created_at?: string
  geo_score: number
  visibility: number
  citations: number
  prompts_won: number
  mentions: number
  total_checks: number
  engines: string[]
}

type CompetitorSummary = {
  your_geo_score: number
  your_visibility: number
  tracked_competitors: number
  won_prompts: number
  total_citations: number
  leader: { id: string; name: string; geo_score: number; visibility: number } | null
  completed_audits: number
}

type GeoProject = {
  id: string
  company_name: string
  website_url: string
}

type CompetitorSuggestion = {
  name: string
  domain: string | null
  reason: string
  selected: boolean
}

export default function CompetitorsPage() {
  const { t, locale } = useGeoI18n()
  const isEn = locale === "en"
  const [liveCompetitors, setLiveCompetitors] = useState<CompetitorInsight[]>([])
  const [summary, setSummary] = useState<CompetitorSummary | null>(null)
  const [openAddModal, setOpenAddModal] = useState(false)
  const [expandedFields, setExpandedFields] = useState(false)
  const [adding, setAdding] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [savingDetected, setSavingDetected] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [form, setForm] = useState({ name: "", domain: "", country: "", industry: "" })
  const [projects, setProjects] = useState<GeoProject[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [openDetectModal, setOpenDetectModal] = useState(false)
  const [suggestions, setSuggestions] = useState<CompetitorSuggestion[]>([])
  const [manualDetected, setManualDetected] = useState({ name: "", domain: "" })

  const loadCompetitors = async () => {
    const {
      data: { session },
    } = await supabaseGeo.auth.getSession()
    if (!session?.access_token) return
    const res = await fetch("/api/geo/competitors/insights", { headers: { Authorization: `Bearer ${session.access_token}` } })
    if (!res.ok) return
    const json = (await res.json()) as { data?: { competitors?: CompetitorInsight[]; summary?: CompetitorSummary } }
    setLiveCompetitors(json.data?.competitors ?? [])
    setSummary(json.data?.summary ?? null)
  }

  const loadProjects = async () => {
    const {
      data: { session },
    } = await supabaseGeo.auth.getSession()
    if (!session?.access_token) return
    const res = await fetch("/api/geo/projects", { headers: { Authorization: `Bearer ${session.access_token}` } })
    if (!res.ok) return
    const json = (await res.json()) as { data?: GeoProject[] }
    const nextProjects = json.data ?? []
    setProjects(nextProjects)
    setSelectedProjectId((current) => current ?? nextProjects[0]?.id ?? null)
  }

  useEffect(() => {
    let mounted = true
    void Promise.all([loadCompetitors(), loadProjects()]).then(() => {
      if (!mounted) return
    })
    return () => { mounted = false }
  }, [])

  const addCompetitor = async () => {
    if (!form.name.trim() || !form.domain.trim()) {
      setFeedback(isEn ? "Name and domain are required." : "Nombre y dominio son obligatorios.")
      setTimeout(() => setFeedback(null), 2500)
      return
    }
    setAdding(true)
    try {
      const {
        data: { session },
      } = await supabaseGeo.auth.getSession()
      if (!session?.access_token) throw new Error("Unauthorized")
      const res = await fetch("/api/geo/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          name: form.name.trim(),
          domain: form.domain.trim().replace(/^https?:\/\//, ""),
          project_id: selectedProjectId,
        }),
      })
      if (!res.ok) throw new Error("Create failed")
      await loadCompetitors()
      setOpenAddModal(false)
      setForm({ name: "", domain: "", country: "", industry: "" })
      setExpandedFields(false)
      setFeedback(isEn ? "Competitor added successfully." : "Competidor agregado correctamente.")
      setTimeout(() => setFeedback(null), 2600)
    } catch {
      setFeedback(isEn ? "Could not add competitor right now." : "No se pudo agregar el competidor ahora.")
      setTimeout(() => setFeedback(null), 2600)
    } finally {
      setAdding(false)
    }
  }

  const detectCompetitors = async () => {
    if (!selectedProjectId) {
      setFeedback(isEn ? "Create a project before detecting competitors." : "Crea un proyecto antes de detectar competidores.")
      setTimeout(() => setFeedback(null), 2600)
      return
    }
    setDetecting(true)
    try {
      const {
        data: { session },
      } = await supabaseGeo.auth.getSession()
      if (!session?.access_token) throw new Error("Unauthorized")
      const res = await fetch("/api/geo/competitors/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ project_id: selectedProjectId }),
      })
      if (!res.ok) throw new Error("Detection failed")
      const json = (await res.json()) as { data?: Array<{ name: string; domain: string | null; reason: string }> }
      setSuggestions((json.data ?? []).map((item) => ({ ...item, selected: true })))
      setOpenDetectModal(true)
    } catch {
      setFeedback(isEn ? "Could not detect competitors right now." : "No se pudieron detectar competidores ahora.")
      setTimeout(() => setFeedback(null), 2600)
    } finally {
      setDetecting(false)
    }
  }

  const addManualDetected = () => {
    const name = manualDetected.name.trim()
    const domain = manualDetected.domain.trim().replace(/^https?:\/\//, "").replace(/^www\./, "")
    if (!name || !domain) return
    setSuggestions((prev) => [...prev, { name, domain, reason: isEn ? "Added manually." : "Agregado manualmente.", selected: true }])
    setManualDetected({ name: "", domain: "" })
  }

  const saveDetectedCompetitors = async () => {
    const selected = suggestions.filter((item) => item.selected && item.name.trim() && item.domain?.trim())
    if (!selectedProjectId || selected.length === 0) {
      setFeedback(isEn ? "Select at least one competitor with domain." : "Selecciona al menos un competidor con dominio.")
      setTimeout(() => setFeedback(null), 2600)
      return
    }
    setSavingDetected(true)
    try {
      const {
        data: { session },
      } = await supabaseGeo.auth.getSession()
      if (!session?.access_token) throw new Error("Unauthorized")
      for (const competitor of selected) {
        const res = await fetch("/api/geo/competitors", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ name: competitor.name.trim(), domain: competitor.domain?.trim() ?? null, project_id: selectedProjectId }),
        })
        if (!res.ok) throw new Error("Create failed")
      }
      await loadCompetitors()
      setOpenDetectModal(false)
      setSuggestions([])
      setFeedback(isEn ? "Competitors added successfully." : "Competidores agregados correctamente.")
      setTimeout(() => setFeedback(null), 2600)
    } catch {
      setFeedback(isEn ? "Could not save selected competitors." : "No se pudieron guardar los competidores seleccionados.")
      setTimeout(() => setFeedback(null), 2600)
    } finally {
      setSavingDetected(false)
    }
  }

  const tableCompetitors = useMemo(() => {
    return liveCompetitors.map((c) => ({
      id: c.id,
      name: c.name,
      domain: c.domain || "-",
      projectId: c.project_id,
      geoScore: c.geo_score,
      visibility: c.visibility,
      citations: c.citations,
      mentions: c.mentions,
      totalChecks: c.total_checks,
      trend: "up",
      change: c.total_checks > 0 ? `${c.mentions}/${c.total_checks}` : "--",
      promptsWon: c.prompts_won,
    }))
  }, [liveCompetitors])

  const metricsLive = useMemo(
    () => [
      {
        title: isEn ? "Your GEO Score" : "Tu GEO Score",
        value: String(summary?.your_geo_score ?? 0),
        suffix: "/100",
        comparison: summary?.completed_audits ? (isEn ? "latest completed audit" : "ultima auditoria completada") : (isEn ? "pending completed audits" : "pendiente de auditorias completadas"),
        icon: Target,
        color: "primary",
      },
      {
        title: isEn ? "Tracked Competitors" : "Competidores Tracked",
        value: String(summary?.tracked_competitors ?? tableCompetitors.length),
        suffix: "",
        comparison: isEn ? "real records" : "registros reales",
        icon: Eye,
        color: "accent",
      },
      {
        title: isEn ? "Won Prompts" : "Prompts Ganados",
        value: String(summary?.won_prompts ?? 0),
        suffix: "",
        comparison: summary?.completed_audits ? (isEn ? "brand mentions found" : "menciones de marca detectadas") : (isEn ? "pending matching data" : "pendiente de data de matching"),
        icon: Trophy,
        color: "green-400",
      },
      {
        title: isEn ? "Total Citations" : "Citas Totales",
        value: String(summary?.total_citations ?? 0),
        suffix: "",
        comparison: isEn ? "pending extraction" : "pendiente de extraccion",
        icon: Quote,
        color: "blue-400",
      },
    ],
    [isEn, summary, tableCompetitors.length]
  )

  const radarData = useMemo(
    () => {
      const avgScore = tableCompetitors.length > 0 ? Math.round(tableCompetitors.reduce((sum, item) => sum + item.geoScore, 0) / tableCompetitors.length) : 0
      const avgVisibility = tableCompetitors.length > 0 ? Math.round(tableCompetitors.reduce((sum, item) => sum + item.visibility, 0) / tableCompetitors.length) : 0
      return [
        { metric: "GEO Score", you: summary?.your_geo_score ?? 0, leader: summary?.leader?.geo_score ?? 0, average: avgScore },
        { metric: "Visibility", you: summary?.your_visibility ?? 0, leader: summary?.leader?.visibility ?? 0, average: avgVisibility },
        { metric: "Citations", you: summary?.total_citations ?? 0, leader: 0, average: 0 },
        { metric: "Authority", you: summary?.your_geo_score ?? 0, leader: summary?.leader?.geo_score ?? 0, average: avgScore },
        { metric: "Content", you: summary?.your_visibility ?? 0, leader: summary?.leader?.visibility ?? 0, average: avgVisibility },
        { metric: "Technical", you: summary?.your_geo_score ?? 0, leader: summary?.leader?.geo_score ?? 0, average: avgScore },
      ]
    },
    [summary, tableCompetitors]
  )

  const promptsData = useMemo(
    () => {
      const competitorWins = Math.max(0, ...tableCompetitors.map((item) => item.promptsWon))
      return promptBuckets.map((prompt, index) => ({ prompt, you: index === 0 ? summary?.won_prompts ?? 0 : 0, competitor: index === 0 ? competitorWins : 0 }))
    },
    [summary, tableCompetitors]
  )

  return (
    <>
      <AppHeader />
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
              <h2 className="text-2xl font-bold">{t("competitorsTitle")}</h2>
            <p className="text-muted-foreground">{isEn ? "Analyze and compare your AI visibility against competitors" : "Analiza y compara tu visibilidad IA con la competencia"}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="border-border">
              <Filter className="w-4 h-4 mr-2" />
              {isEn ? "Filter" : "Filtrar"}
            </Button>
            <Button variant="outline" className="border-border" onClick={detectCompetitors} disabled={detecting || projects.length === 0}>
              <Sparkles className="w-4 h-4 mr-2" />
              {detecting ? (isEn ? "Detecting..." : "Detectando...") : isEn ? "Detect with AI" : "Detectar competidores con IA"}
            </Button>
            <Button className="bg-primary hover:bg-primary/90 glow-primary" onClick={() => setOpenAddModal(true)}>
              <span className="inline-flex items-center">
                <Plus className="w-4 h-4 mr-2" />
                {isEn ? "Add Competitor" : "Agregar Competidor"}
              </span>
            </Button>
          </div>
        </div>

        {feedback && <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">{feedback}</div>}

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
                    <div className={`w-12 h-12 rounded-2xl bg-${metric.color}/20 flex items-center justify-center`}>
                      <metric.icon className={`w-6 h-6 text-${metric.color}`} />
                    </div>
                  </div>
                  <div className="text-4xl font-bold leading-none mb-2">
                    {metric.value}
                    <span className="text-xl text-muted-foreground font-normal">{metric.suffix}</span>
                  </div>
                  <p className="text-base text-muted-foreground">{metric.title}</p>
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
                <CardTitle className="text-lg font-semibold">{isEn ? "Metrics Comparison" : "Comparacion de Metricas"}</CardTitle>
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
                <CardTitle className="text-lg font-semibold">{isEn ? "Won Prompts vs Competition" : "Prompts Ganados vs Competencia"}</CardTitle>
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
              <CardTitle className="text-lg font-semibold">{isEn ? "All Competitors" : "Todos los Competidores"}</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                   placeholder={isEn ? "Search competitor..." : "Buscar competidor..."}
                  className="pl-10 pr-4 py-2 bg-secondary/50 border border-border rounded-lg text-sm focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-visible">
                <table className="w-full table-fixed">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Competidor</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">GEO Score</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">AI Visibility</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Citations</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Evaluaciones</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Prompts Ganados</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Trend</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableCompetitors.length === 0 && (
                      <tr>
                          <td colSpan={8} className="py-12 text-center">
                          <p className="text-base font-medium">{isEn ? "No competitors yet" : "Sin competidores aun"}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{isEn ? "Add a competitor to compare visibility and recommendations." : "Agrega un competidor para comparar visibilidad y recomendaciones."}</p>
                          <Button className="mt-4" asChild>
                            <Link href="/geo/app/projects/new">{isEn ? "Add Competitor" : "Agregar competidor"}</Link>
                          </Button>
                        </td>
                      </tr>
                    )}
                    {tableCompetitors.map((competitor) => (
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
                          {competitor.totalChecks > 0 ? (
                            <div>
                              <p className="font-medium text-sm">{competitor.mentions}/{competitor.totalChecks}</p>
                              <p className="text-xs text-muted-foreground">{isEn ? "mentions/checks" : "menciones/evaluaciones"}</p>
                            </div>
                          ) : (
                            <div>
                              <p className="font-medium text-sm text-muted-foreground">0</p>
                              <p className="text-xs text-muted-foreground">{isEn ? "run a new audit" : "requiere auditoria nueva"}</p>
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary">
                            {competitor.promptsWon} ganados
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          {competitor.change === "--" ? (
                            <span className="text-sm text-muted-foreground">--</span>
                          ) : (
                            <div className={`flex items-center gap-1 text-sm ${competitor.trend === "up" ? "text-green-400" : "text-red-400"}`}>
                              {competitor.trend === "up" ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                              {competitor.change}
                            </div>
                          )}
                        </td>
                        <td className="relative overflow-visible py-4 px-4 text-right">
                          <CompetitorActionsMenu
                            competitorId={typeof competitor.id === "number" ? String(competitor.id) : competitor.id}
                            competitorName={competitor.name}
                            projectId={competitor.projectId}
                            locale={locale}
                          />
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

      {openAddModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-primary/20 bg-gradient-to-b from-[#0c1224] to-[#0a0f1d] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-white">{isEn ? "Add competitor" : "Agregar competidor"}</h3>
                <p className="mt-1 text-sm text-slate-400">{isEn ? "Quickly track a new brand in your GEO workspace." : "Agrega una marca para monitorear en tu workspace GEO."}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpenAddModal(false)}
                className="rounded-lg border border-border/60 px-2 py-1 text-xs text-slate-300 hover:bg-white/5"
              >
                {isEn ? "Close" : "Cerrar"}
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">{isEn ? "Competitor name" : "Nombre competidor"}</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-border bg-[#111a2d]/80 px-3 text-sm text-white placeholder:text-slate-500 focus:border-primary/50 focus:outline-none"
                  placeholder={isEn ? "Example: Competitor X" : "Ejemplo: Competidor X"}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">{isEn ? "Domain / website" : "Dominio / sitio web"}</label>
                <input
                  value={form.domain}
                  onChange={(e) => setForm((prev) => ({ ...prev, domain: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-border bg-[#111a2d]/80 px-3 text-sm text-white placeholder:text-slate-500 focus:border-primary/50 focus:outline-none"
                  placeholder={isEn ? "competitorx.com" : "competidorx.com"}
                />
              </div>

              <button
                type="button"
                onClick={() => setExpandedFields((v) => !v)}
                className="text-xs font-medium uppercase tracking-wide text-primary hover:text-primary/80"
              >
                {expandedFields ? (isEn ? "Hide optional fields" : "Ocultar campos opcionales") : (isEn ? "Show optional fields" : "Mostrar campos opcionales")}
              </button>

              {expandedFields && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">{isEn ? "Country (optional)" : "Pais (opcional)"}</label>
                    <input
                      value={form.country}
                      onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
                      className="h-10 w-full rounded-xl border border-border bg-[#111a2d]/80 px-3 text-sm text-white placeholder:text-slate-500 focus:border-primary/50 focus:outline-none"
                      placeholder={isEn ? "Colombia" : "Colombia"}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">{isEn ? "Industry (optional)" : "Industria (opcional)"}</label>
                    <input
                      value={form.industry}
                      onChange={(e) => setForm((prev) => ({ ...prev, industry: e.target.value }))}
                      className="h-10 w-full rounded-xl border border-border bg-[#111a2d]/80 px-3 text-sm text-white placeholder:text-slate-500 focus:border-primary/50 focus:outline-none"
                      placeholder={isEn ? "SaaS" : "SaaS"}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button variant="outline" className="border-border" onClick={() => setOpenAddModal(false)}>
                {isEn ? "Cancel" : "Cancelar"}
              </Button>
              <Button className="bg-primary hover:bg-primary/90" onClick={addCompetitor} disabled={adding}>
                {adding ? (isEn ? "Adding..." : "Agregando...") : isEn ? "Add competitor" : "Agregar competidor"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {openDetectModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-primary/20 bg-gradient-to-b from-[#0c1224] to-[#0a0f1d] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-white">{isEn ? "AI competitor detection" : "Deteccion de competidores con IA"}</h3>
                <p className="mt-1 text-sm text-slate-400">
                  {isEn ? "Review each suggestion before adding it to your GEO project." : "Revisa cada sugerencia antes de agregarla a tu proyecto GEO."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpenDetectModal(false)}
                className="rounded-lg border border-border/60 px-2 py-1 text-xs text-slate-300 hover:bg-white/5"
              >
                {isEn ? "Close" : "Cerrar"}
              </button>
            </div>

            <div className="mb-5 rounded-xl border border-border bg-[#111a2d]/60 p-4">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">{isEn ? "Project" : "Proyecto"}</label>
              <select
                value={selectedProjectId ?? ""}
                onChange={(e) => setSelectedProjectId(e.target.value || null)}
                className="h-11 w-full rounded-xl border border-border bg-[#111a2d]/80 px-3 text-sm text-white focus:border-primary/50 focus:outline-none"
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.company_name} - {project.website_url}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full table-fixed">
                <thead className="bg-white/5">
                  <tr>
                    <th className="w-16 px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">OK</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">{isEn ? "Name" : "Nombre"}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">{isEn ? "Domain" : "Dominio"}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">{isEn ? "Reason" : "Motivo"}</th>
                  </tr>
                </thead>
                <tbody>
                  {suggestions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">
                        {isEn ? "No suggestions returned. Add competitors manually below." : "No hubo sugerencias. Agrega competidores manualmente abajo."}
                      </td>
                    </tr>
                  )}
                  {suggestions.map((suggestion, index) => (
                    <tr key={`${suggestion.name}-${suggestion.domain}-${index}`} className="border-t border-border/60">
                      <td className="px-4 py-3 align-top">
                        <input
                          type="checkbox"
                          checked={suggestion.selected}
                          onChange={(e) => setSuggestions((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, selected: e.target.checked } : item))}
                          className="h-4 w-4 accent-primary"
                        />
                      </td>
                      <td className="px-4 py-3 align-top text-sm font-medium text-white">{suggestion.name}</td>
                      <td className="px-4 py-3 align-top text-sm text-slate-300">{suggestion.domain ?? "-"}</td>
                      <td className="px-4 py-3 align-top text-sm text-slate-400">{suggestion.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 rounded-xl border border-border bg-[#111a2d]/60 p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">{isEn ? "Add another manually" : "Agregar otro manualmente"}</p>
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <input
                  value={manualDetected.name}
                  onChange={(e) => setManualDetected((prev) => ({ ...prev, name: e.target.value }))}
                  className="h-10 rounded-xl border border-border bg-[#111a2d]/80 px-3 text-sm text-white placeholder:text-slate-500 focus:border-primary/50 focus:outline-none"
                  placeholder={isEn ? "Competitor name" : "Nombre competidor"}
                />
                <input
                  value={manualDetected.domain}
                  onChange={(e) => setManualDetected((prev) => ({ ...prev, domain: e.target.value }))}
                  className="h-10 rounded-xl border border-border bg-[#111a2d]/80 px-3 text-sm text-white placeholder:text-slate-500 focus:border-primary/50 focus:outline-none"
                  placeholder={isEn ? "domain.com" : "dominio.com"}
                />
                <Button variant="outline" className="border-border" onClick={addManualDetected}>
                  {isEn ? "Add" : "Agregar"}
                </Button>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button variant="outline" className="border-border" onClick={() => setOpenDetectModal(false)}>
                {isEn ? "Cancel" : "Cancelar"}
              </Button>
              <Button className="bg-primary hover:bg-primary/90" onClick={saveDetectedCompetitors} disabled={savingDetected}>
                {savingDetected ? (isEn ? "Saving..." : "Guardando...") : isEn ? "Add selected" : "Agregar seleccionados"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
