"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AppHeader } from "@/components/geo/app-shell"
import {
  Plus,
  FileSearch,
  BarChart3,
  Activity,
  MessageSquare,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  RefreshCw,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  Globe,
  Sparkles,
  X,
} from "lucide-react"

const audits = [
  {
    id: "aud_001",
    brand: "TechFlow Solutions",
    domain: "techflow.io",
    geoScore: 82,
    visibility: 75,
    status: "completed",
    engines: ["ChatGPT", "Gemini", "Perplexity"],
    country: "US",
    createdAt: "2024-01-15T10:30:00Z",
  },
  {
    id: "aud_002",
    brand: "DataPrime Analytics",
    domain: "dataprime.com",
    geoScore: 68,
    visibility: 62,
    status: "completed",
    engines: ["ChatGPT", "Perplexity"],
    country: "ES",
    createdAt: "2024-01-14T14:20:00Z",
  },
  {
    id: "aud_003",
    brand: "CloudNova Systems",
    domain: "cloudnova.ai",
    geoScore: null,
    visibility: null,
    status: "running",
    engines: ["ChatGPT", "Gemini", "AI Overviews"],
    country: "US",
    createdAt: "2024-01-15T16:45:00Z",
  },
  {
    id: "aud_004",
    brand: "InnovateTech Corp",
    domain: "innovatetech.co",
    geoScore: 91,
    visibility: 88,
    status: "completed",
    engines: ["ChatGPT", "Gemini", "Perplexity", "AI Overviews"],
    country: "UK",
    createdAt: "2024-01-13T09:15:00Z",
  },
  {
    id: "aud_005",
    brand: "StartupHub Pro",
    domain: "startuphub.pro",
    geoScore: null,
    visibility: null,
    status: "failed",
    engines: ["Perplexity"],
    country: "DE",
    createdAt: "2024-01-12T11:00:00Z",
  },
  {
    id: "aud_006",
    brand: "AI Dynamics",
    domain: "aidynamics.io",
    geoScore: 74,
    visibility: 70,
    status: "completed",
    engines: ["ChatGPT", "Gemini"],
    country: "FR",
    createdAt: "2024-01-11T08:30:00Z",
  },
]

const metrics = [
  {
    title: "Total Audits",
    value: "47",
    change: "+12 este mes",
    icon: FileSearch,
    color: "primary",
  },
  {
    title: "Avg GEO Score",
    value: "76",
    change: "+4.2 vs anterior",
    icon: BarChart3,
    color: "accent",
  },
  {
    title: "Active Monitoring",
    value: "8",
    change: "marcas activas",
    icon: Activity,
    color: "green-400",
  },
  {
    title: "AI Mentions",
    value: "1,234",
    change: "+156 esta semana",
    icon: MessageSquare,
    color: "blue-400",
  },
]

const statusConfig = {
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    className: "bg-green-500/20 text-green-400 border-green-500/30",
  },
  running: {
    label: "Running",
    icon: Clock,
    className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  },
  failed: {
    label: "Failed",
    icon: AlertCircle,
    className: "bg-red-500/20 text-red-400 border-red-500/30",
  },
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
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export default function AuditsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [engineFilter, setEngineFilter] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const filteredAudits = audits.filter((audit) => {
    const matchesSearch =
      audit.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      audit.domain.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = !statusFilter || audit.status === statusFilter
    const matchesEngine = !engineFilter || audit.engines.includes(engineFilter)
    return matchesSearch && matchesStatus && matchesEngine
  })

  const hasActiveFilters = statusFilter || engineFilter

  return (
    <>
      <AppHeader />
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">GEO Audits</h2>
            <p className="text-muted-foreground">
              Historial completo de auditorías de visibilidad IA
            </p>
          </div>
          <Link href="/geo/app/audits/new">
            <Button className="bg-primary hover:bg-primary/90 glow-primary">
              <Plus className="w-4 h-4 mr-2" />
              New Audit
            </Button>
          </Link>
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

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Card className="glass border-border">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar por marca o dominio..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-secondary/50 border border-border rounded-lg text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>

                {/* Filter Toggle */}
                <Button
                  variant="outline"
                  className={`border-border ${showFilters ? "bg-primary/20 border-primary/50" : ""}`}
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filtros
                  {hasActiveFilters && (
                    <span className="ml-2 w-2 h-2 rounded-full bg-primary" />
                  )}
                </Button>
              </div>

              {/* Filter Options */}
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 pt-4 border-t border-border"
                >
                  <div className="flex flex-wrap gap-4">
                    {/* Status Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        Status
                      </label>
                      <div className="flex gap-2">
                        {Object.entries(statusConfig).map(([key, config]) => (
                          <button
                            key={key}
                            onClick={() =>
                              setStatusFilter(statusFilter === key ? null : key)
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                              statusFilter === key
                                ? config.className
                                : "bg-secondary/50 border-border text-muted-foreground hover:border-primary/30"
                            }`}
                          >
                            {config.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Engine Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        Engine
                      </label>
                      <div className="flex gap-2">
                        {["ChatGPT", "Gemini", "Perplexity", "AI Overviews"].map(
                          (engine) => (
                            <button
                              key={engine}
                              onClick={() =>
                                setEngineFilter(
                                  engineFilter === engine ? null : engine
                                )
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                engineFilter === engine
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

                    {/* Clear Filters */}
                    {hasActiveFilters && (
                      <div className="flex items-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setStatusFilter(null)
                            setEngineFilter(null)
                          }}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Limpiar filtros
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Audits Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <Card className="glass border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">
                Todas las Auditorías
              </CardTitle>
              <span className="text-sm text-muted-foreground">
                {filteredAudits.length} de {audits.length} auditorías
              </span>
            </CardHeader>
            <CardContent>
              {filteredAudits.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                          Brand
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                          Domain
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                          GEO Score
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                          AI Visibility
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                          Engines
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                          Created At
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAudits.map((audit) => {
                        const status = statusConfig[audit.status as keyof typeof statusConfig]
                        const StatusIcon = status.icon
                        return (
                          <tr
                            key={audit.id}
                            className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                          >
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                                  <Sparkles className="w-5 h-5 text-primary" />
                                </div>
                                <span className="font-medium">{audit.brand}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Globe className="w-4 h-4" />
                                <span className="text-sm">{audit.domain}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              {audit.geoScore !== null ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-2 rounded-full bg-secondary overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                                      style={{ width: `${audit.geoScore}%` }}
                                    />
                                  </div>
                                  <span className="font-medium text-sm">
                                    {audit.geoScore}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">
                                  --
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              {audit.visibility !== null ? (
                                <span className="font-medium">
                                  {audit.visibility}%
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-sm">
                                  --
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${status.className}`}
                              >
                                <StatusIcon className="w-3 h-3" />
                                {status.label}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex flex-wrap gap-1">
                                {audit.engines.slice(0, 2).map((engine) => (
                                  <span
                                    key={engine}
                                    className={`px-2 py-0.5 rounded text-xs font-medium ${engineColors[engine]}`}
                                  >
                                    {engine}
                                  </span>
                                ))}
                                {audit.engines.length > 2 && (
                                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-secondary text-muted-foreground">
                                    +{audit.engines.length - 2}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-sm text-muted-foreground">
                                {formatDate(audit.createdAt)}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center justify-end gap-1">
                                {audit.status === "completed" && (
                                  <Link href={`/geo/app/audits/demo`}>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-muted-foreground hover:text-primary"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  </Link>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-muted-foreground hover:text-primary"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </Button>
                                {audit.status === "completed" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-muted-foreground hover:text-primary"
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Empty State */
                <div className="py-16 text-center">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <FileSearch className="w-10 h-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    No se encontraron auditorías
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    {searchQuery || hasActiveFilters
                      ? "Intenta ajustar tus filtros o términos de búsqueda para encontrar lo que buscas."
                      : "Comienza creando tu primera auditoría GEO para analizar la visibilidad de tu marca en motores de IA."}
                  </p>
                  {!searchQuery && !hasActiveFilters && (
                    <Link href="/geo/app/audits/new">
                      <Button className="bg-primary hover:bg-primary/90 glow-primary">
                        <Plus className="w-4 h-4 mr-2" />
                        Crear Primera Auditoría
                      </Button>
                    </Link>
                  )}
                  {(searchQuery || hasActiveFilters) && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery("")
                        setStatusFilter(null)
                        setEngineFilter(null)
                      }}
                    >
                      Limpiar filtros
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  )
}
