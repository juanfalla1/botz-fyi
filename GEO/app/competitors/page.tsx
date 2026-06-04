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

export default function CompetitorsPage() {
  const { t, locale } = useGeoI18n()
  const isEn = locale === "en"
  const [liveCompetitors, setLiveCompetitors] = useState<Array<{ id: string; name: string; domain: string; created_at?: string }>>([])
  const [openAddModal, setOpenAddModal] = useState(false)
  const [expandedFields, setExpandedFields] = useState(false)
  const [adding, setAdding] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [form, setForm] = useState({ name: "", domain: "", country: "", industry: "" })

  const loadCompetitors = async () => {
    const {
      data: { session },
    } = await supabaseGeo.auth.getSession()
    if (!session?.access_token) return
    const res = await fetch("/api/geo/competitors", { headers: { Authorization: `Bearer ${session.access_token}` } })
    if (!res.ok) return
    const json = (await res.json()) as { data?: Array<{ id: string; name: string; domain: string | null; created_at?: string }> }
    setLiveCompetitors((json.data ?? []).map((c) => ({ id: c.id, name: c.name, domain: c.domain ?? "", created_at: c.created_at })))
  }

  useEffect(() => {
    let mounted = true
    void loadCompetitors().then(() => {
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
          project_id: null,
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

  const tableCompetitors = useMemo(() => {
    return liveCompetitors.map((c) => ({
      id: c.id,
      name: c.name,
      domain: c.domain || "-",
      geoScore: 0,
      visibility: 0,
      citations: 0,
      trend: "up",
      change: "--",
      promptsWon: 0,
    }))
  }, [liveCompetitors])

  const metricsLive = useMemo(
    () => [
      {
        title: isEn ? "Your GEO Score" : "Tu GEO Score",
        value: "0",
        suffix: "/100",
        comparison: isEn ? "pending completed audits" : "pendiente de auditorias completadas",
        icon: Target,
        color: "primary",
      },
      {
        title: isEn ? "Tracked Competitors" : "Competidores Tracked",
        value: String(tableCompetitors.length),
        suffix: "",
        comparison: isEn ? "real records" : "registros reales",
        icon: Eye,
        color: "accent",
      },
      {
        title: isEn ? "Won Prompts" : "Prompts Ganados",
        value: "0",
        suffix: "",
        comparison: isEn ? "pending matching data" : "pendiente de data de matching",
        icon: Trophy,
        color: "green-400",
      },
      {
        title: isEn ? "Total Citations" : "Citas Totales",
        value: "0",
        suffix: "",
        comparison: isEn ? "pending extraction" : "pendiente de extraccion",
        icon: Quote,
        color: "blue-400",
      },
    ],
    [isEn, tableCompetitors.length]
  )

  const radarData = useMemo(
    () => [
      { metric: "GEO Score", you: 0, leader: 0, average: 0 },
      { metric: "Visibility", you: 0, leader: 0, average: 0 },
      { metric: "Citations", you: 0, leader: 0, average: 0 },
      { metric: "Authority", you: 0, leader: 0, average: 0 },
      { metric: "Content", you: 0, leader: 0, average: 0 },
      { metric: "Technical", you: 0, leader: 0, average: 0 },
    ],
    []
  )

  const promptsData = useMemo(
    () => promptBuckets.map((prompt) => ({ prompt, you: 0, competitor: 0 })),
    []
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
              <div className="overflow-x-hidden lg:overflow-x-visible">
                <table className="w-full table-fixed">
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
                    {tableCompetitors.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center">
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
                        <td className="py-4 px-4 text-right">
                          <CompetitorActionsMenu
                            competitorId={typeof competitor.id === "number" ? String(competitor.id) : competitor.id}
                            competitorName={competitor.name}
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
    </>
  )
}
