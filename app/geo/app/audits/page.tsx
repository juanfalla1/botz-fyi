"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { AppHeader } from "@/GEO/components/geo/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Activity, ArrowRight, BarChart3, FileSearch, MessageSquare, Plus, Search, SlidersHorizontal, Globe, Trash2 } from "lucide-react"
import { useGeoI18n } from "@/GEO/components/geo/i18n"
import { useEffect, useMemo, useState } from "react"
import { supabaseGeo } from "@/app/geo/supabaseGeoClient"

function statusClass(status: string) {
  if (status === "Completed") return "text-emerald-400 bg-emerald-500/15 border-emerald-500/30"
  if (status === "Running") return "text-yellow-400 bg-yellow-500/15 border-yellow-500/30"
  return "text-red-400 bg-red-500/15 border-red-500/30"
}

export default function AuditsPage() {
  const { locale } = useGeoI18n()
  const isEn = locale === "en"
  const [apiAudits, setApiAudits] = useState<Array<{ id: string; base_url: string; final_score: number | null; created_at: string; engines?: unknown }>>([])
  const [apiJobs, setApiJobs] = useState<Array<{ id: string; audit_id: string | null; status: string; created_at: string }>>([])
  const [usageTotals, setUsageTotals] = useState<Record<string, number>>({})
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; brand: string } | null>(null)
  const [deleteError, setDeleteError] = useState("")

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const {
        data: { session },
      } = await supabaseGeo.auth.getSession()
      if (!session?.access_token) return
      const [auditsRes, usageRes] = await Promise.all([
        fetch("/api/geo/audits", { headers: { Authorization: `Bearer ${session.access_token}` } }),
        fetch("/api/geo/usage", { headers: { Authorization: `Bearer ${session.access_token}` } }),
      ])
      if (!auditsRes.ok) return
      const json = (await auditsRes.json()) as {
        data?: {
          audits?: Array<{ id: string; base_url: string; final_score: number | null; created_at: string; engines?: unknown }>
          jobs?: Array<{ id: string; audit_id: string | null; status: string; created_at: string }>
        }
      }
      const usageJson = usageRes.ok ? (await usageRes.json()) as { data?: { totals?: Record<string, number> } } : { data: { totals: {} } }
      if (!mounted) return
      setApiAudits(json.data?.audits ?? [])
      setApiJobs(json.data?.jobs ?? [])
      setUsageTotals(usageJson.data?.totals ?? {})
    }
    void load()
    const interval = setInterval(load, 5000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  const completedScores = useMemo(() => apiAudits.map((a) => a.final_score).filter((s): s is number => s !== null), [apiAudits])
  const averageScore = completedScores.length > 0 ? Math.round(completedScores.reduce((acc, score) => acc + score, 0) / completedScores.length) : 0
  const activeMonitoring = useMemo(() => {
    const activeAuditIds = new Set(apiJobs.filter((j) => j.status === "running" || j.status === "queued").map((j) => j.audit_id).filter(Boolean))
    return activeAuditIds.size
  }, [apiJobs])

  const localizedMetrics = [
    { title: "Total Audits", value: String(apiAudits.length), sub: isEn ? "real records" : "registros reales", icon: FileSearch, iconClass: "text-primary", badgeClass: "bg-primary/20" },
    { title: "Avg GEO Score", value: String(averageScore), sub: isEn ? "from completed audits" : "de auditorias completadas", icon: BarChart3, iconClass: "text-accent", badgeClass: "bg-accent/20" },
    { title: "Active Monitoring", value: String(activeMonitoring), sub: isEn ? "queued/running jobs" : "jobs en cola/ejecucion", icon: Activity, iconClass: "text-emerald-400", badgeClass: "bg-emerald-500/10" },
    { title: "AI Mentions", value: String(usageTotals.prompt_used ?? 0), sub: isEn ? "usage events" : "eventos de uso", icon: MessageSquare, iconClass: "text-blue-400", badgeClass: "bg-blue-500/10" },
  ]

  const baseAudits = apiAudits.map((a) => {
    const job = apiJobs.find((j) => j.audit_id === a.id)
    const engines = Array.isArray(a.engines) ? a.engines.map((engine) => String(engine)) : []
    return {
      id: a.id,
      brand: a.base_url.replace(/^https?:\/\//, "").split("/")[0],
      domain: a.base_url.replace(/^https?:\/\//, "").split("/")[0],
      score: a.final_score,
      visibility: a.final_score ? `${Math.min(100, Math.round(a.final_score))}%` : "--",
      status: job?.status === "completed" ? "Completed" : job?.status === "running" || job?.status === "queued" ? "Running" : job?.status === "failed" ? "Failed" : "Running",
      engines: engines.length > 0 ? engines : ["openai", "gemini"],
      createdAt: new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(a.created_at)),
    }
  })

  const localizedAudits = baseAudits.map((a) => ({
    ...a,
    createdAt: isEn
      ? a.createdAt
          .replace("ene", "Jan")
          .replace("día", "day")
          .replace("días", "days")
      : a.createdAt,
  }))

  const deleteAudit = async (auditId: string) => {
    setDeletingId(auditId)
    setDeleteError("")
    try {
      const {
        data: { session },
      } = await supabaseGeo.auth.getSession()
      if (!session?.access_token) throw new Error("No active session")
      const res = await fetch("/api/geo/audits/delete", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id: auditId }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        throw new Error(json?.error || "Could not delete audit")
      }
      setApiAudits((current) => current.filter((audit) => audit.id !== auditId))
      setApiJobs((current) => current.filter((job) => job.audit_id !== auditId))
      setDeleteTarget(null)
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : isEn ? "Could not delete audit." : "No se pudo eliminar la auditoría.")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <AppHeader />
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">GEO Audits</h2>
            <p className="text-muted-foreground">{isEn ? "Complete history of AI visibility audits" : "Historial completo de auditorias de visibilidad IA"}</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 glow-primary" asChild>
            <Link href="/geo/app/audits/new">
              <Plus className="w-4 h-4 mr-2" />
              {isEn ? "New Audit" : "Nueva Auditoria"}
            </Link>
          </Button>
        </div>

        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          {localizedMetrics.map((metric, index) => (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.07 }}
            >
              <Card className="glass border-border hover:border-primary/50 transition-colors h-full">
                <CardContent className="min-h-[170px] p-5 sm:p-6 flex flex-col justify-center">
                  <div className="flex items-start justify-between mb-6">
                    <div className={`w-12 h-12 rounded-2xl ${metric.badgeClass} flex items-center justify-center`}>
                      <metric.icon className={`w-6 h-6 ${metric.iconClass}`} />
                    </div>
                  </div>
                  <div className="text-4xl font-bold leading-none mb-2">{metric.value}</div>
                  <p className="text-base text-muted-foreground">{metric.title}</p>
                  <p className="text-xs text-primary mt-1">{metric.sub}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Card className="glass border-border">
          <CardContent className="p-4 flex gap-3 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input className="w-full h-12 rounded-xl border border-border bg-secondary/30 pl-12 pr-4" placeholder={isEn ? "Search by brand or domain..." : "Buscar por marca o dominio..."} />
            </div>
            <Button variant="outline" className="border-border h-12 px-5">
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              {isEn ? "Filters" : "Filtros"}
            </Button>
          </CardContent>
        </Card>

        <Card className="glass border-border">
          <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-3xl">{isEn ? "All Audits" : "Todas las Auditorias"}</CardTitle>
              <p className="text-muted-foreground">{localizedAudits.length} {isEn ? "audits" : "auditorias"}</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-hidden">
              <table className="w-full table-fixed">
                <colgroup>
                  <col className="w-[28%]" />
                  <col className="w-[13%]" />
                  <col className="w-[10%]" />
                  <col className="w-[13%]" />
                  <col className="w-[12%]" />
                  <col className="w-[12%]" />
                  <col className="w-[12%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="px-4 py-4">Brand</th>
                    <th className="px-3 py-4">GEO Score</th>
                    <th className="px-3 py-4">Visibility</th>
                    <th className="px-3 py-4">Status</th>
                    <th className="px-3 py-4">Engines</th>
                    <th className="px-3 py-4">Created</th>
                    <th className="px-4 py-4 text-right">{isEn ? "Actions" : "Acciones"}</th>
                  </tr>
                </thead>
                <tbody>
                  {localizedAudits.length === 0 && (
                    <tr>
                        <td colSpan={7} className="py-12 text-center">
                        <p className="text-base font-medium">{isEn ? "No audits yet" : "Sin auditorias aun"}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{isEn ? "Create your first GEO audit to start tracking visibility." : "Crea tu primera auditoria GEO para empezar a medir visibilidad."}</p>
                        <Button className="mt-4" asChild>
                          <Link href="/geo/app/audits/new">{isEn ? "Create Audit" : "Crear auditoria"}</Link>
                        </Button>
                      </td>
                    </tr>
                  )}
                  {localizedAudits.map((audit) => (
                    <tr key={audit.id} className="border-b border-border/50 hover:bg-secondary/20">
                      <td className="px-4 py-5">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/20 flex items-center justify-center">
                            <FileSearch className="w-5 h-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <Link href={`/geo/app/audits/detail?id=${audit.id}`} className="block truncate font-medium text-lg hover:text-primary hover:underline" title={audit.brand}>
                              {audit.brand}
                            </Link>
                            <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                              <Globe className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate" title={audit.domain}>{audit.domain}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-5">
                        {audit.score === null ? (
                          <span className="text-muted-foreground">--</span>
                        ) : (
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <div className="h-2 w-14 shrink-0 overflow-hidden rounded-full bg-secondary">
                              <div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${audit.score}%` }} />
                            </div>
                            <span className="font-semibold">{audit.score}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-5 font-semibold whitespace-nowrap">{audit.visibility}</td>
                      <td className="px-3 py-5">
                        <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs ${statusClass(audit.status)}`}>{audit.status}</span>
                      </td>
                      <td className="px-3 py-5">
                        <div className="flex flex-wrap gap-1.5">
                          {audit.engines.slice(0, 2).map((engine) => (
                            <span key={`${audit.brand}-${engine}`} className="text-xs px-2 py-1 rounded bg-primary/15 text-primary">
                              {engine === "openai" ? "ChatGPT" : engine === "gemini" ? "Gemini" : engine === "perplexity" ? "Perplexity" : engine}
                            </span>
                          ))}
                          {audit.engines.length > 2 && <span className="rounded bg-secondary px-2 py-1 text-xs text-muted-foreground">+{audit.engines.length - 2}</span>}
                        </div>
                      </td>
                      <td className="px-3 py-5 text-xs text-muted-foreground">{audit.createdAt}</td>
                      <td className="px-4 py-5 text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="outline" className="border-border" asChild>
                            <Link href={`/geo/app/audits/detail?id=${audit.id}`}>
                              {isEn ? "View" : "Ver"}
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-500/30 text-red-300 hover:bg-red-500/10 hover:text-red-200"
                            onClick={() => {
                              setDeleteError("")
                              setDeleteTarget({ id: audit.id, brand: audit.brand })
                            }}
                            disabled={deletingId === audit.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {deleteTarget && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <Card className="w-full max-w-lg border-red-500/30 bg-background shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-200">
                  <Trash2 className="h-5 w-5" />
                  {isEn ? "Delete this audit?" : "¿Eliminar esta auditoría?"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <p className="text-sm text-muted-foreground">
                  {isEn
                    ? "This will delete the audit and its associated execution logs, scores and generated recommendations. This action cannot be undone."
                    : "Esto eliminará la auditoría y sus logs de ejecución, scores y recomendaciones generadas. Esta acción no se puede deshacer."}
                </p>
                <div className="rounded-xl border border-border bg-secondary/30 p-3 text-sm">
                  <p className="font-medium">{deleteTarget.brand}</p>
                  <p className="break-all text-muted-foreground">{deleteTarget.id}</p>
                </div>
                {deleteError && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {deleteError}
                  </div>
                )}
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 border-border" onClick={() => setDeleteTarget(null)} disabled={deletingId === deleteTarget.id}>
                    {isEn ? "Cancel" : "Cancelar"}
                  </Button>
                  <Button className="flex-1 bg-red-600 text-white hover:bg-red-700" onClick={() => deleteAudit(deleteTarget.id)} disabled={deletingId === deleteTarget.id}>
                    {deletingId === deleteTarget.id ? (isEn ? "Deleting..." : "Eliminando...") : isEn ? "Delete permanently" : "Eliminar definitivamente"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  )
}
