"use client"

import { useState } from "react"
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

// Mock data for automations
const automations = [
  {
    id: "auto_001",
    name: "Auditoría Semanal TechFlow",
    project: "TechFlow Solutions",
    status: "active",
    frequency: "weekly",
    engines: ["ChatGPT", "Gemini", "Perplexity"],
    email: "team@techflow.io",
    lastRun: "2024-01-15T10:30:00Z",
    nextRun: "2024-01-22T10:30:00Z",
  },
  {
    id: "auto_002",
    name: "Monitoreo Diario DataPrime",
    project: "DataPrime Analytics",
    status: "active",
    frequency: "daily",
    engines: ["ChatGPT", "Perplexity"],
    email: "alerts@dataprime.com",
    lastRun: "2024-01-15T08:00:00Z",
    nextRun: "2024-01-16T08:00:00Z",
  },
  {
    id: "auto_003",
    name: "Reporte Mensual CloudNova",
    project: "CloudNova Systems",
    status: "paused",
    frequency: "monthly",
    engines: ["ChatGPT", "Gemini", "AI Overviews"],
    email: "reports@cloudnova.ai",
    lastRun: "2024-01-01T09:00:00Z",
    nextRun: null,
  },
  {
    id: "auto_004",
    name: "Tracking Competidores",
    project: "InnovateTech Corp",
    status: "error",
    frequency: "weekly",
    engines: ["ChatGPT", "Gemini"],
    email: "marketing@innovatetech.co",
    lastRun: "2024-01-14T14:00:00Z",
    nextRun: null,
  },
]

const executionHistory = [
  {
    id: "exec_001",
    project: "TechFlow Solutions",
    date: "2024-01-15T10:30:00Z",
    status: "success",
    duration: "2m 34s",
    trigger: "scheduled",
  },
  {
    id: "exec_002",
    project: "DataPrime Analytics",
    date: "2024-01-15T08:00:00Z",
    status: "success",
    duration: "1m 45s",
    trigger: "scheduled",
  },
  {
    id: "exec_003",
    project: "InnovateTech Corp",
    date: "2024-01-14T14:00:00Z",
    status: "failed",
    duration: "0m 12s",
    trigger: "manual",
  },
  {
    id: "exec_004",
    project: "CloudNova Systems",
    date: "2024-01-01T09:00:00Z",
    status: "success",
    duration: "3m 02s",
    trigger: "scheduled",
  },
]

const metrics = [
  {
    title: "Total Automatizaciones",
    value: "12",
    change: "+3 este mes",
    icon: Zap,
    color: "primary",
  },
  {
    title: "Ejecuciones Exitosas",
    value: "156",
    change: "98.2% tasa éxito",
    icon: CheckCircle2,
    color: "emerald-400",
  },
  {
    title: "Fallidas",
    value: "3",
    change: "1.8% del total",
    icon: AlertCircle,
    color: "red-400",
  },
  {
    title: "Tiempo Promedio",
    value: "2m 15s",
    change: "-12% vs anterior",
    icon: Timer,
    color: "blue-400",
  },
]

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

const historyStatusConfig: Record<string, { label: string; className: string }> = {
  success: {
    label: "Exitoso",
    className: "bg-emerald-500/20 text-emerald-400",
  },
  failed: {
    label: "Fallido",
    className: "bg-red-500/20 text-red-400",
  },
}

const triggerConfig: Record<string, string> = {
  scheduled: "Programado",
  manual: "Manual",
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
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    project: "",
    frequency: "weekly",
    engines: [] as string[],
    email: "",
    enabled: true,
  })

  const handleEngineToggle = (engine: string) => {
    setFormData((prev) => ({
      ...prev,
      engines: prev.engines.includes(engine)
        ? prev.engines.filter((e) => e !== engine)
        : [...prev.engines, engine],
    }))
  }

  const resetForm = () => {
    setFormData({
      name: "",
      project: "",
      frequency: "weekly",
      engines: [],
      email: "",
      enabled: true,
    })
  }

  const hasAutomations = automations.length > 0

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
            onClick={() => setShowModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Automatización
          </Button>
        </div>

        {/* Metrics */}
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
                    <div
                      className={`w-10 h-10 rounded-xl bg-${metric.color}/20 flex items-center justify-center`}
                    >
                      <metric.icon className={`w-5 h-5 text-${metric.color}`} />
                    </div>
                  </div>
                  <div className="text-3xl font-bold mb-1">{metric.value}</div>
                  <p className="text-sm text-muted-foreground">{metric.title}</p>
                  <p className="text-xs text-primary mt-1">{metric.change}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Main Content */}
        {hasAutomations ? (
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
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-yellow-400 h-8 w-8 p-0"
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
                              >
                                <RefreshCw className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-red-400 h-8 w-8 p-0"
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
                    <div className="space-y-3">
                      {executionHistory.map((exec, index) => (
                        <motion.div
                          key={exec.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.05 }}
                          className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border border-border/50"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                exec.status === "success"
                                  ? "bg-emerald-400"
                                  : "bg-red-400"
                              }`}
                            />
                            <div>
                              <p className="font-medium text-sm">{exec.project}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(exec.date)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${
                                historyStatusConfig[exec.status].className
                              }`}
                            >
                              {historyStatusConfig[exec.status].label}
                            </span>
                            <span className="text-muted-foreground">
                              {exec.duration}
                            </span>
                            <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-secondary/50">
                              {triggerConfig[exec.trigger]}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
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
                    onClick={() => setShowModal(true)}
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
                    Nueva Automatización
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
                        <option value="techflow">TechFlow Solutions</option>
                        <option value="dataprime">DataPrime Analytics</option>
                        <option value="cloudnova">CloudNova Systems</option>
                        <option value="innovate">InnovateTech Corp</option>
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
                    <Button className="flex-1 bg-primary hover:bg-primary/90 glow-primary">
                      Guardar automatización
                    </Button>
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
