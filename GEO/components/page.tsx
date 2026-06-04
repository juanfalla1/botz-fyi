"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AppHeader } from "@/components/geo/app-shell"
import {
  Plus,
  Zap,
  Clock,
  CheckCircle2,
  AlertCircle,
  Pause,
  Play,
  Pencil,
  Trash2,
  X,
  Mail,
  Calendar,
  Timer,
  BarChart3,
  TrendingUp,
  Activity,
  Bot,
  RefreshCw,
  ChevronDown,
  Sparkles,
} from "lucide-react"
import { supabaseGeo } from "@/app/geo/supabaseGeoClient"
import type { AutomationRecord, ProjectRecord } from "@/lib/geo/db-types"

type UiAutomation = {
  id: string
  name: string
  projectId: string | null
  project: string
  status: "active" | "paused" | "error"
  frequency: "daily" | "weekly" | "monthly"
  engines: string[]
  email: string
  lastRun: string | null
  nextRun: string | null
  enabled: boolean
  lastStatus: string | null
  lastEmail: Record<string, unknown> | null
  history: Array<Record<string, unknown>>
}

type ToastState = { kind: "success" | "error" | "info"; message: string } | null

const statusConfig = {
  active: {
    label: "Activa",
    icon: CheckCircle2,
    className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  paused: {
    label: "Pausada",
    icon: Pause,
    className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  },
  error: {
    label: "Error",
    icon: AlertCircle,
    className: "bg-red-500/20 text-red-400 border-red-500/30",
  },
}

const frequencyConfig: Record<string, string> = {
  daily: "Diario",
  weekly: "Semanal",
  monthly: "Mensual",
}

const engineColors: Record<string, string> = {
  ChatGPT: "bg-emerald-500/20 text-emerald-400",
  Gemini: "bg-blue-500/20 text-blue-400",
  Perplexity: "bg-purple-500/20 text-purple-400",
  "AI Overviews": "bg-orange-500/20 text-orange-400",
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function formatFullDate(dateString: string | null) {
  if (!dateString) return "--"
  const date = new Date(dateString)
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export default function AutomationsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [runningAutomationId, setRunningAutomationId] = useState<string | null>(null)
  const [runProgress, setRunProgress] = useState<string | null>(null)
  const [automations, setAutomations] = useState<UiAutomation[]>([])
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [formData, setFormData] = useState({
    name: "",
    project: "",
    frequency: "weekly",
    engines: [] as string[],
    email: "",
    enabled: true,
  })

  const toastNow = (next: ToastState) => {
    setToast(next)
    window.setTimeout(() => setToast(null), 2600)
  }

  const mapAutomation = (record: AutomationRecord, projectsMap: Map<string, string>): UiAutomation => {
    const config = (record.config ?? {}) as Record<string, unknown>
    const lastRun = typeof config.last_run === "string" ? config.last_run : null
    const nextRun = typeof config.next_run === "string" ? config.next_run : null
    const email = typeof config.email === "string" ? config.email : "--"
    const lastStatus = typeof config.last_status === "string" ? config.last_status : null
    const lastEmail = config.last_email && typeof config.last_email === "object" ? config.last_email as Record<string, unknown> : null
    const history = Array.isArray(config.history) ? config.history.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object") : []
    const enginesRaw = Array.isArray(config.engines) ? config.engines : []
    const engines = enginesRaw.filter((engine): engine is string => typeof engine === "string")
    const project = record.project_id ? projectsMap.get(record.project_id) ?? "Proyecto" : "Sin proyecto"
    const hasError = typeof config.last_error === "string" && config.last_error.length > 0
    const status = hasError ? "error" : record.enabled ? "active" : "paused"

    const frequency = ["daily", "weekly", "monthly"].includes(record.frequency) ? (record.frequency as UiAutomation["frequency"]) : "weekly"

    return {
      id: record.id,
      name: record.name,
      projectId: record.project_id,
      project,
      status,
      frequency,
      engines,
      email,
      lastRun,
      nextRun,
      enabled: record.enabled,
      lastStatus,
      lastEmail,
      history,
    }
  }

  const loadData = async () => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const {
        data: { session },
      } = await supabaseGeo.auth.getSession()
      if (!session?.access_token) throw new Error("AUTH_REQUIRED")

      const [projectsRes, automationsRes] = await Promise.all([
        fetch("/api/geo/projects", { headers: { Authorization: `Bearer ${session.access_token}` } }),
        fetch("/api/geo/automations", { headers: { Authorization: `Bearer ${session.access_token}` } }),
      ])

      const projectsJson = projectsRes.ok
        ? ((await projectsRes.json()) as { data?: ProjectRecord[]; mode?: string })
        : { data: [] as ProjectRecord[] }
      const projectsList = projectsJson.data ?? []
      setProjects(projectsList)
      const projectsMap = new Map(projectsList.map((p) => [p.id, p.company_name]))

      if (!automationsRes.ok) throw new Error("AUTOMATIONS_UNAVAILABLE")
      const automationsJson = (await automationsRes.json()) as { data?: AutomationRecord[]; mode?: string; warning?: string }
      const list = (automationsJson.data ?? []).map((item) => mapAutomation(item, projectsMap))
      setAutomations(list)

      if (automationsJson.mode !== "live") {
        toastNow({ kind: "info", message: "Automations endpoint in demo mode." })
      }
    } catch (error) {
      setAutomations([])
      const code = error instanceof Error ? error.message : ""
      setErrorMessage(
        code === "AUTH_REQUIRED"
          ? "Inicia sesión para cargar tus automatizaciones."
          : "Automatizaciones no disponibles por ahora. Puedes crear una cuando el backend esté conectado."
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const metrics = useMemo(() => {
    const total = automations.length
    const active = automations.filter((a) => a.status === "active").length
    const paused = automations.filter((a) => a.status === "paused").length
    const failed = automations.filter((a) => a.status === "error").length
    const latestRun = automations
      .map((a) => a.lastRun)
      .filter((d): d is string => Boolean(d))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null

    return [
      { title: "Total Automatizaciones", value: String(total), change: `${active} activas`, icon: Zap, color: "primary" },
      { title: "Ejecuciones Exitosas", value: String(active), change: `${paused} pausadas`, icon: CheckCircle2, color: "emerald-400" },
      { title: "Fallidas", value: String(failed), change: `${failed} con error`, icon: AlertCircle, color: "red-400" },
      { title: "Ultima ejecucion", value: latestRun ? formatDate(latestRun) : "--", change: latestRun ? "reciente" : "sin historial", icon: Timer, color: "blue-400" },
    ]
  }, [automations])

  const handleEngineToggle = (engine: string) => {
    setFormData((prev) => ({
      ...prev,
      engines: prev.engines.includes(engine)
        ? prev.engines.filter((e) => e !== engine)
        : [...prev.engines, engine],
    }))
  }

  const resetForm = () => {
    setEditId(null)
    setFormData({
      name: "",
      project: "",
      frequency: "weekly",
      engines: [],
      email: "",
      enabled: true,
    })
  }

  const openCreate = () => {
    resetForm()
    setShowModal(true)
  }

  const openEdit = (auto: UiAutomation) => {
    setEditId(auto.id)
    setFormData({
      name: auto.name,
      project: auto.projectId ?? "",
      frequency: auto.frequency,
      engines: auto.engines,
      email: auto.email === "--" ? "" : auto.email,
      enabled: auto.enabled,
    })
    setShowModal(true)
  }

  const saveAutomation = async () => {
    if (!formData.name.trim() || !formData.project) {
      toastNow({ kind: "error", message: "Nombre y proyecto son obligatorios." })
      return
    }

    setSaving(true)
    try {
      const {
        data: { session },
      } = await supabaseGeo.auth.getSession()
      if (!session?.access_token) throw new Error("Unauthorized")

      const payload = {
        name: formData.name.trim(),
        project_id: formData.project,
        frequency: formData.frequency,
        enabled: formData.enabled,
        config: {
          engines: formData.engines,
          email: formData.email.trim(),
        },
      }

      if (editId) {
        const res = await fetch("/api/geo/automations/action", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ id: editId, ...payload }),
        })
        if (!res.ok) throw new Error("No se pudo actualizar")
        toastNow({ kind: "success", message: "Automatizacion actualizada." })
      } else {
        const res = await fetch("/api/geo/automations", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error("No se pudo crear")
        toastNow({ kind: "success", message: "Automatizacion creada." })
      }

      setShowModal(false)
      resetForm()
      await loadData()
    } catch (error) {
      toastNow({ kind: "error", message: error instanceof Error ? error.message : "Operacion fallida" })
    } finally {
      setSaving(false)
    }
  }

  const toggleEnabled = async (auto: UiAutomation) => {
    try {
      const {
        data: { session },
      } = await supabaseGeo.auth.getSession()
      if (!session?.access_token) throw new Error("Unauthorized")
      const res = await fetch("/api/geo/automations/action", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ id: auto.id, enabled: !auto.enabled }),
      })
      if (!res.ok) throw new Error("No se pudo actualizar estado")
      await loadData()
      toastNow({ kind: "success", message: auto.enabled ? "Automatizacion pausada." : "Automatizacion activada." })
    } catch (error) {
      toastNow({ kind: "error", message: error instanceof Error ? error.message : "Operacion fallida" })
    }
  }

  const deleteAutomation = async (id: string) => {
    try {
      const {
        data: { session },
      } = await supabaseGeo.auth.getSession()
      if (!session?.access_token) throw new Error("Unauthorized")
      const res = await fetch(`/api/geo/automations/action?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) throw new Error("No se pudo eliminar")
      setConfirmDeleteId(null)
      toastNow({ kind: "success", message: "Automatizacion eliminada." })
      await loadData()
    } catch (error) {
      toastNow({ kind: "error", message: error instanceof Error ? error.message : "Operacion fallida" })
    }
  }

  const runNow = async (auto: UiAutomation) => {
    try {
      setRunningAutomationId(auto.id)
      setRunProgress("Creando auditoría GEO...")
      toastNow({ kind: "info", message: "Ejecutando automatizacion. Esto puede tardar unos minutos..." })
      const {
        data: { session },
      } = await supabaseGeo.auth.getSession()
      if (!session?.access_token) throw new Error("Unauthorized")
      setRunProgress("Consultando motores IA y calculando score...")
      const res = await fetch("/api/geo/automations/run", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ id: auto.id }),
      })
      setRunProgress("Guardando resultados y enviando reporte...")
      const json = (await res.json().catch(() => null)) as { error?: string; data?: { email?: { sent?: boolean; reason?: string } } } | null
      if (!res.ok) throw new Error(json?.error || "No se pudo ejecutar")
      const email = json?.data?.email
      toastNow({ kind: "success", message: email?.sent ? "Automatizacion ejecutada y correo enviado." : `Automatizacion ejecutada. Email: ${email?.reason ?? "no enviado"}` })
      await loadData()
    } catch (error) {
      toastNow({ kind: "error", message: error instanceof Error ? error.message : "Operacion fallida" })
    } finally {
      setRunningAutomationId(null)
      setRunProgress(null)
    }
  }

  const hasAutomations = automations.length > 0
  const executionHistory = automations.flatMap((auto) => auto.history.map((item) => ({ ...item, automation: auto.name, project: auto.project })))

  return (
    <>
      <AppHeader />
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">GEO Automations</h2>
            <p className="text-muted-foreground">
              Automatiza auditorías GEO, monitoreo IA y reportes automáticos.
            </p>
          </div>
          <Button
            className="bg-primary hover:bg-primary/90 glow-primary"
            onClick={openCreate}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Automatización
          </Button>
        </div>

        {toast && (
          <div className={`rounded-xl border px-4 py-3 text-sm ${toast.kind === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : toast.kind === "error" ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-primary/30 bg-primary/10 text-primary"}`}>
            {toast.message}
          </div>
        )}

        {errorMessage && !loading && (
          <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">{errorMessage}</div>
        )}

        {/* Metrics */}
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card className="glass border-border hover:border-primary/50 transition-colors h-full">
                <CardContent className="min-h-[170px] p-5 sm:p-6 flex flex-col justify-center">
                  <div className="flex items-start justify-between mb-6">
                    <div
                      className={`w-12 h-12 rounded-2xl bg-${metric.color}/20 flex items-center justify-center`}
                    >
                      <metric.icon className={`w-6 h-6 text-${metric.color}`} />
                    </div>
                  </div>
                  <div className="text-4xl font-bold leading-none mb-2">{metric.value}</div>
                  <p className="text-base text-muted-foreground">{metric.title}</p>
                  <p className="text-xs text-primary mt-1">{metric.change}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Main Content */}
        {loading ? (
          <Card className="glass border-border">
            <CardContent className="py-14 text-center text-muted-foreground">Cargando automatizaciones...</CardContent>
          </Card>
        ) : hasAutomations ? (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Automations List */}
            <div className="lg:col-span-2 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
              >
                <Card className="glass border-border">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Zap className="w-5 h-5 text-primary" />
                      Automatizaciones Activas
                    </CardTitle>
                    <span className="text-sm text-muted-foreground">
                      {automations.length} configuradas
                    </span>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {automations.map((auto, index) => {
                      const status = statusConfig[auto.status as keyof typeof statusConfig]
                      const StatusIcon = status.icon
                      return (
                        <motion.div
                          key={auto.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                          className="p-4 rounded-xl bg-secondary/30 border border-border hover:border-primary/30 transition-all group"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                                <Bot className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <h4 className="font-semibold">{auto.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {auto.project}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${status.className}`}
                            >
                              <StatusIcon className="w-3 h-3" />
                              {status.label}
                            </span>
                          </div>

                          {runningAutomationId === auto.id && runProgress && (
                            <div className="mb-4 rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm text-primary">
                              <div className="mb-2 flex items-center gap-2 font-medium">
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                {runProgress}
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                                <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-primary to-accent" />
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                            <div>
                              <p className="text-muted-foreground text-xs mb-1">
                                Frecuencia
                              </p>
                              <p className="font-medium flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {frequencyConfig[auto.frequency]}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs mb-1">
                                Última ejecución
                              </p>
                              <p className="font-medium">
                                {formatFullDate(auto.lastRun)}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs mb-1">
                                Próxima ejecución
                              </p>
                              <p className="font-medium">
                                {formatFullDate(auto.nextRun)}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs mb-1">
                                Email
                              </p>
                              <p className="font-medium flex items-center gap-1 truncate">
                                <Mail className="w-3 h-3 shrink-0" />
                                <span className="truncate">{auto.email}</span>
                              </p>
                              {auto.lastEmail && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {auto.lastEmail.sent ? "Ultimo correo enviado" : `Email: ${String(auto.lastEmail.reason ?? "no enviado")}`}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex flex-wrap gap-1">
                              {auto.engines.map((engine) => (
                                <span
                                  key={engine}
                                  className={`px-2 py-0.5 rounded text-xs font-medium ${engineColors[engine]}`}
                                >
                                  {engine}
                                </span>
                              ))}
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-primary h-8 w-8 p-0"
                                onClick={() => openEdit(auto)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-yellow-400 h-8 w-8 p-0"
                                onClick={() => toggleEnabled(auto)}
                              >
                                {auto.status === "paused" ? (
                                  <Play className="w-4 h-4" />
                                ) : (
                                  <Pause className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-emerald-400 h-8 w-8 p-0"
                                onClick={() => runNow(auto)}
                                disabled={runningAutomationId === auto.id}
                              >
                                <RefreshCw className={`w-4 h-4 ${runningAutomationId === auto.id ? "animate-spin" : ""}`} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-red-400 h-8 w-8 p-0"
                                onClick={() => setConfirmDeleteId(auto.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Execution History */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 }}
              >
                <Card className="glass border-border">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Clock className="w-5 h-5 text-accent" />
                      Historial de Ejecuciones
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {executionHistory.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border p-6 text-center">
                        <p className="font-medium">Sin ejecuciones todavía</p>
                        <p className="mt-1 text-sm text-muted-foreground">Usa el botón de ejecutar ahora o espera la próxima ejecución programada.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {executionHistory.slice(0, 8).map((item, index) => (
                          <div key={index} className="rounded-xl border border-border bg-secondary/25 p-3 text-sm">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="font-medium">{String(item.automation)} · {String(item.project)}</p>
                                <p className="text-xs text-muted-foreground">{formatFullDate(typeof item.at === "string" ? item.at : null)} · Audit {String(item.audit_id ?? "--")}</p>
                              </div>
                              <div className="text-right">
                                <p className={String(item.status) === "completed" ? "text-emerald-400" : String(item.status) === "failed" ? "text-red-400" : "text-yellow-400"}>{String(item.status ?? "queued")}</p>
                                <p className="text-xs text-muted-foreground">Score {String(item.score ?? "--")}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Analytics Sidebar */}
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 }}
              >
                <Card className="glass border-border">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-primary" />
                      Analíticas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Success Rate Chart Placeholder */}
                    <div className="p-4 rounded-xl bg-secondary/30 border border-border">
                      <p className="text-sm text-muted-foreground mb-3">
                        Tasa de Éxito (7 días)
                      </p>
                      <div className="flex items-end gap-1 h-20">
                        {[85, 92, 88, 100, 95, 98, 100].map((value, i) => (
                          <div
                            key={i}
                            className="flex-1 bg-gradient-to-t from-primary/40 to-primary rounded-t transition-all hover:from-primary/60 hover:to-primary"
                            style={{ height: `${value}%` }}
                          />
                        ))}
                      </div>
                      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                        <span>Lun</span>
                        <span>Mar</span>
                        <span>Mié</span>
                        <span>Jue</span>
                        <span>Vie</span>
                        <span>Sáb</span>
                        <span>Dom</span>
                      </div>
                    </div>

                    {/* Execution Time Trend */}
                    <div className="p-4 rounded-xl bg-secondary/30 border border-border">
                      <p className="text-sm text-muted-foreground mb-2">
                        Tiempo Promedio
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold">2m 15s</span>
                        <span className="text-xs text-emerald-400 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          -12%
                        </span>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-accent to-primary"
                          style={{ width: "65%" }}
                        />
                      </div>
                    </div>

                    {/* Engines Distribution */}
                    <div className="p-4 rounded-xl bg-secondary/30 border border-border">
                      <p className="text-sm text-muted-foreground mb-3">
                        Distribución por Motor
                      </p>
                      <div className="space-y-2">
                        {[
                          { name: "ChatGPT", value: 85, color: "emerald" },
                          { name: "Gemini", value: 72, color: "blue" },
                          { name: "Perplexity", value: 58, color: "purple" },
                          { name: "AI Overviews", value: 34, color: "orange" },
                        ].map((engine) => (
                          <div key={engine.name} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>{engine.name}</span>
                              <span className="text-muted-foreground">
                                {engine.value}%
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                              <div
                                className={`h-full rounded-full bg-${engine.color}-400`}
                                style={{ width: `${engine.value}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Activity Indicator */}
                    <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                          <Activity className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">Sistema Activo</p>
                          <p className="text-xs text-muted-foreground">
                            Todas las automatizaciones funcionando
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        ) : (
          /* Empty State */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <Card className="glass border-border">
              <CardContent className="py-16">
                <div className="text-center max-w-md mx-auto">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-6">
                    <Zap className="w-10 h-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    No tienes automatizaciones todavía
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Crea tu primera automatización para programar auditorías GEO,
                    monitoreo continuo y reportes automáticos.
                  </p>
                  <Button
                    className="bg-primary hover:bg-primary/90 glow-primary"
                    onClick={openCreate}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Crear primera automatización
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* New Automation Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="glass border-border">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-xl font-semibold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    {editId ? "Editar Automatización" : "Nueva Automatización"}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setShowModal(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Name */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Nombre de automatización
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Auditoría semanal mi marca"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, name: e.target.value }))
                      }
                      className="w-full px-4 py-2.5 bg-secondary/50 border border-border rounded-lg text-sm focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>

                  {/* Project */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Proyecto</label>
                    <div className="relative">
                      <select
                        value={formData.project}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            project: e.target.value,
                          }))
                        }
                        className="w-full px-4 py-2.5 bg-secondary/50 border border-border rounded-lg text-sm focus:outline-none focus:border-primary/50 transition-colors appearance-none"
                      >
                        <option value="">Seleccionar proyecto</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>{project.company_name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>

                  {/* Frequency */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Frecuencia</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: "daily", label: "Diario" },
                        { value: "weekly", label: "Semanal" },
                        { value: "monthly", label: "Mensual" },
                      ].map((freq) => (
                        <button
                          key={freq.value}
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              frequency: freq.value,
                            }))
                          }
                          className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                            formData.frequency === freq.value
                              ? "bg-primary/20 border-primary/50 text-primary"
                              : "bg-secondary/50 border-border text-muted-foreground hover:border-primary/30"
                          }`}
                        >
                          {freq.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Engines */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Motores IA</label>
                    <div className="grid grid-cols-2 gap-2">
                      {["ChatGPT", "Gemini", "Perplexity", "AI Overviews"].map(
                        (engine) => (
                          <button
                            key={engine}
                            onClick={() => handleEngineToggle(engine)}
                            className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                              formData.engines.includes(engine)
                                ? engineColors[engine] + " border-current"
                                : "bg-secondary/50 border-border text-muted-foreground hover:border-primary/30"
                            }`}
                          >
                            {engine}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email destino</label>
                    <input
                      type="email"
                      placeholder="reportes@tuempresa.com"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, email: e.target.value }))
                      }
                      className="w-full px-4 py-2.5 bg-secondary/50 border border-border rounded-lg text-sm focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>

                  {/* Enabled Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border">
                    <div>
                      <p className="font-medium">Activar automatización</p>
                      <p className="text-xs text-muted-foreground">
                        Comenzará a ejecutarse según la frecuencia seleccionada
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, enabled: !prev.enabled }))
                      }
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        formData.enabled ? "bg-primary" : "bg-secondary"
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          formData.enabled ? "left-7" : "left-1"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1 border-border"
                      onClick={() => {
                        resetForm()
                        setShowModal(false)
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button className="flex-1 bg-primary hover:bg-primary/90 glow-primary" onClick={saveAutomation} disabled={saving}>
                      {saving ? "Guardando..." : "Guardar automatización"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDeleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setConfirmDeleteId(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="glass border-border">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Eliminar automatizacion</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Esta accion no se puede deshacer.</p>
                  <div className="mt-4 flex gap-2 justify-end">
                    <Button variant="outline" className="border-border" onClick={() => setConfirmDeleteId(null)}>Cancelar</Button>
                    <Button className="bg-red-600 hover:bg-red-500" onClick={() => deleteAutomation(confirmDeleteId)}>Eliminar</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
