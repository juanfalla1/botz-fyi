"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AppHeader } from "@/components/geo/app-shell"
import {
  Plus,
  MessageSquare,
  Search,
  Filter,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  X,
  Globe,
  CheckCircle2,
  Pause,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  Eye,
  Zap,
  Sparkles,
  ChevronDown,
  Play,
  Clock,
  Award,
  AlertCircle,
} from "lucide-react"
import { useParams } from "next/navigation"
import { supabaseGeo } from "@/app/geo/supabaseGeoClient"
import { useGeoI18n } from "@/GEO/components/geo/i18n"
import type { GeoPromptRecord, ProjectRecord } from "@/lib/geo/db-types"

type PromptItem = {
  id: string
  text: string
  category: string
  status: "active" | "inactive"
  engines: string[]
  country: string
  language: string
  performance: {
    position: number
    visibility: number
    mentions: number
    trend: "up" | "down" | "stable"
  }
  projects: string[]
  projectIds: string[]
  createdAt: string
  lastAudit: string | null
  lastRunResults: Array<Record<string, unknown>>
}

type PromptQuality = {
  level: "high" | "medium" | "low"
  reason: string
  optimizedPrompt: string | null
}

// Mock data for prompts
const prompts = [
  {
    id: "prompt_001",
    text: "¿Cuál es el mejor software de gestión de proyectos para startups en 2024?",
    category: "product",
    status: "active",
    engines: ["ChatGPT", "Gemini", "Perplexity"],
    country: "Colombia",
    language: "Español",
    performance: {
      position: 1,
      visibility: 92,
      mentions: 156,
      trend: "up",
    },
    projects: ["TechFlow Solutions", "DataPrime Analytics"],
    createdAt: "2024-01-10T10:30:00Z",
    lastAudit: "2024-01-15T08:00:00Z",
  },
  {
    id: "prompt_002",
    text: "Best cloud analytics platform for enterprise data management",
    category: "comparison",
    status: "active",
    engines: ["ChatGPT", "Perplexity", "AI Overviews"],
    country: "US",
    language: "English",
    performance: {
      position: 2,
      visibility: 78,
      mentions: 89,
      trend: "up",
    },
    projects: ["CloudNova Systems"],
    createdAt: "2024-01-08T14:20:00Z",
    lastAudit: "2024-01-14T12:00:00Z",
  },
  {
    id: "prompt_003",
    text: "¿Qué herramienta de automatización de marketing recomiendan para ecommerce?",
    category: "recommendation",
    status: "active",
    engines: ["ChatGPT", "Gemini"],
    country: "MX",
    language: "Español",
    performance: {
      position: 3,
      visibility: 65,
      mentions: 45,
      trend: "stable",
    },
    projects: ["InnovateTech Corp"],
    createdAt: "2024-01-05T09:15:00Z",
    lastAudit: "2024-01-13T16:00:00Z",
  },
  {
    id: "prompt_004",
    text: "Top AI-powered customer service solutions for SaaS companies",
    category: "product",
    status: "inactive",
    engines: ["ChatGPT"],
    country: "UK",
    language: "English",
    performance: {
      position: 8,
      visibility: 32,
      mentions: 12,
      trend: "down",
    },
    projects: ["StartupHub Pro"],
    createdAt: "2024-01-02T11:00:00Z",
    lastAudit: "2024-01-10T10:00:00Z",
  },
  {
    id: "prompt_005",
    text: "Meilleur logiciel de comptabilité pour PME en France",
    category: "comparison",
    status: "active",
    engines: ["ChatGPT", "Gemini", "Perplexity"],
    country: "FR",
    language: "Français",
    performance: {
      position: 1,
      visibility: 88,
      mentions: 124,
      trend: "up",
    },
    projects: ["AI Dynamics"],
    createdAt: "2023-12-28T08:30:00Z",
    lastAudit: "2024-01-15T09:00:00Z",
  },
  {
    id: "prompt_006",
    text: "¿Cuáles son las mejores alternativas a Salesforce para pequeñas empresas?",
    category: "alternative",
    status: "active",
    engines: ["ChatGPT", "Perplexity", "AI Overviews"],
    country: "AR",
    language: "Español",
    performance: {
      position: 4,
      visibility: 58,
      mentions: 67,
      trend: "up",
    },
    projects: ["TechFlow Solutions"],
    createdAt: "2023-12-20T15:45:00Z",
    lastAudit: "2024-01-12T14:00:00Z",
  },
]

const categories = [
  { id: "all", label: "Todos", count: prompts.length },
  { id: "product", label: "Producto", count: prompts.filter(p => p.category === "product").length },
  { id: "comparison", label: "Comparativa", count: prompts.filter(p => p.category === "comparison").length },
  { id: "recommendation", label: "Recomendación", count: prompts.filter(p => p.category === "recommendation").length },
  { id: "alternative", label: "Alternativa", count: prompts.filter(p => p.category === "alternative").length },
]

const metrics = [
  {
    title: "Total Prompts",
    value: "48",
    change: "+8 este mes",
    icon: MessageSquare,
    color: "primary",
  },
  {
    title: "Prompts Ganados",
    value: "32",
    change: "66.7% win rate",
    icon: Award,
    color: "emerald-400",
  },
  {
    title: "Prompts Activos",
    value: "42",
    change: "87.5% del total",
    icon: Zap,
    color: "blue-400",
  },
  {
    title: "Avg. Posición",
    value: "#2.4",
    change: "+0.8 vs anterior",
    icon: Target,
    color: "accent",
  },
]

const statusConfig = {
  active: {
    label: "Activo",
    icon: CheckCircle2,
    className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  inactive: {
    label: "Inactivo",
    icon: Pause,
    className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  },
}

const categoryConfig: Record<string, { label: string; className: string }> = {
  product: { label: "Producto", className: "bg-blue-500/20 text-blue-400" },
  comparison: { label: "Comparativa", className: "bg-purple-500/20 text-purple-400" },
  recommendation: { label: "Recomendación", className: "bg-emerald-500/20 text-emerald-400" },
  alternative: { label: "Alternativa", className: "bg-orange-500/20 text-orange-400" },
}

const engineColors: Record<string, string> = {
  ChatGPT: "bg-emerald-500/20 text-emerald-400",
  Gemini: "bg-blue-500/20 text-blue-400",
  Perplexity: "bg-purple-500/20 text-purple-400",
  "AI Overviews": "bg-orange-500/20 text-orange-400",
}

const countryFlags: Record<string, string> = {
  ES: "🇪🇸",
  US: "🇺🇸",
  MX: "🇲🇽",
  UK: "🇬🇧",
  FR: "🇫🇷",
  AR: "🇦🇷",
  DE: "🇩🇪",
}

function formatDate(dateString: string | null) {
  if (!dateString) return "--"
  const date = new Date(dateString)
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)
}

function normalizeEngineLabel(engine: string) {
  const value = engine.toLowerCase().trim()
  if (value === "openai" || value === "chatgpt") return "OpenAI"
  if (value === "gemini") return "Gemini"
  if (value === "perplexity") return "Perplexity"
  if (value === "ai_overviews" || value === "ai overviews") return "AI Overviews"
  return engine
}

function resultForEngine(prompt: PromptItem, engine: string) {
  const normalized = normalizeEngineLabel(engine).toLowerCase()
  return prompt.lastRunResults.find((result) => normalizeEngineLabel(String(result.engine ?? "")).toLowerCase() === normalized) ?? null
}

function resultCompetitors(result: Record<string, unknown> | null) {
  const competitors = result?.competitors
  return Array.isArray(competitors) ? competitors.map((item) => cleanAiText(String(item))).filter(Boolean).slice(0, 4) : []
}

function resultPreview(result: Record<string, unknown> | null) {
  const preview = cleanAiText(String(result?.answer_preview ?? "").replace(/\s+/g, " ").trim())
  return preview.length > 150 ? `${preview.slice(0, 150)}...` : preview
}

function cleanAiText(value: string) {
  return value.replace(/\*\*/g, "").replace(/`/g, "").trim()
}

function extractCompanyCandidates(text: string) {
  const clean = text.replace(/\s+/g, " ").trim()
  if (!clean) return []

  const blocked = /^(en colombia|algunos|incluyen|proveedores|empresas|soluciones|opciones|entre|como|por ejemplo|the best|some of|providers|companies|depende|que|qué|porque|aunque|tambien|también|ademas|además|fuente|g2|capterra|saas|software)$/i
  const isCandidate = (name: string) => {
    const lower = name.toLowerCase()
    const words = name.split(/\s+/).filter(Boolean)
    return name.length >= 2 &&
      name.length <= 45 &&
      words.length <= 4 &&
      /^[A-ZÁÉÍÓÚÑ0-9]/.test(name) &&
      !name.includes(",") &&
      !name.includes(":") &&
      !blocked.test(name) &&
      !/\b(necesitas|ofrece|permite|incluye|integra|consulta|reseñas|plataformas|suscripcion|suscripción|onboarding|automatizado|escalabilidad|gestion|gestión|logistica|logística|talento|recursos humanos|conocida|delivery|servicios|tecnologicos|tecnológicos|expandido)\b/i.test(name) &&
      !lower.startsWith("que ") &&
      !lower.startsWith("aunque ") &&
      !lower.startsWith("ha ")
  }

  const boldMatches = Array.from(clean.matchAll(/\*\*([^*]+)\*\*/g))
    .map((match) => cleanAiText(match[1].replace(/^\d+[.)]\s*/, "").trim()))
    .filter(isCandidate)
  if (boldMatches.length > 0) return Array.from(new Set(boldMatches)).slice(0, 6)

  const chunks = clean
    .split(/(?:^|\s)(?:\d+[.)]\s+|[-•]\s+)/)
    .map((item) => item.trim())
    .filter(Boolean)
  const candidates = chunks.length > 1 ? chunks : clean.split(/,|;|\by\b|\band\b/i)
  return Array.from(new Set(candidates.map((item) => {
    const name = item
      .replace(/^(en colombia|algunos de los mejores proveedores de saas incluyen:?|incluyen:?|como:?|por ejemplo:?)/i, "")
      .split(/:| - | – | — |\(/)[0]
      .replace(/^\d+[.)]\s*/, "")
      .replace(/\*\*/g, "")
      .trim()
    return name
  }).filter(isCandidate).slice(0, 5)))
}

function mentionedCompanies(result: Record<string, unknown> | null) {
  return Array.from(new Set([...resultCompetitors(result), ...extractCompanyCandidates(String(result?.answer_preview ?? ""))])).slice(0, 5)
}

function wordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length
}

function hasAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term))
}

function optimizePromptSuggestion(prompt: string, isEn: boolean) {
  const lower = prompt.toLowerCase()
  const trimmed = prompt.trim().replace(/[?¿!¡.]+$/g, "")
  if (hasAny(lower, ["agente de voz", "agentes de voz", "voice agent", "voice agents", "voice ai", "voz ia"])) {
    return isEn
      ? "Which companies offer the best AI-powered voice agents for automating calls, sales, and customer support in business environments?"
      : "¿Qué empresas ofrecen los mejores agentes de voz impulsados por IA para automatizar llamadas, ventas y atención al cliente en entornos empresariales?"
  }
  if (hasAny(lower, ["software", "plataforma", "platform", "herramienta", "tool", "solución", "solution"])) {
    return isEn
      ? `${trimmed} for business use cases, specifying the category, target users, and evaluation criteria?`
      : `${trimmed} para casos de uso empresariales, especificando la categoría, los usuarios objetivo y los criterios de evaluación?`
  }
  return isEn
    ? `${trimmed} in a clearly defined business category, specifying the use case, target customer, and evaluation criteria?`
    : `${trimmed} en una categoría empresarial claramente definida, especificando el caso de uso, el cliente objetivo y los criterios de evaluación?`
}

function evaluatePromptQuality(prompt: string, isEn: boolean): PromptQuality {
  const lower = prompt.toLowerCase().trim()
  const words = wordCount(prompt)
  const hasContext = hasAny(lower, [" para ", " for ", " en ", " in ", " de ", " del ", " con ", " with ", "b2b", "saas", "enterprise", "empresarial", "ventas", "soporte", "atención", "customer", "support"])
  const broadBest = hasAny(lower, ["mejor", "mejores", "best", "top", "recomiendan", "recommend"])
  const broadSubject = hasAny(lower, ["empresa", "empresas", "company", "companies", "herramienta", "herramientas", "tool", "tools", "software", "plataforma", "platform"])
  const ambiguousVoice = hasAny(lower, ["agente de voz", "agentes de voz", "voice agent", "voice agents"])

  if (words <= 8 || (broadBest && broadSubject && !hasContext) || ambiguousVoice && !hasAny(lower, ["llamadas", "ventas", "atención", "soporte", "contact center", "call", "sales", "support", "enterprise", "empresarial"])) {
    return {
      level: "low",
      reason: isEn
        ? "The query is too broad and can point different engines to different product categories or evaluation criteria."
        : "La consulta es demasiado amplia y puede llevar a cada motor a categorías o criterios de evaluación distintos.",
      optimizedPrompt: optimizePromptSuggestion(prompt, isEn),
    }
  }

  if (broadBest && broadSubject && !hasAny(lower, ["criterio", "criteria", "precio", "integración", "integration", "industry", "industria", "país", "country", "segmento", "segment"])) {
    return {
      level: "medium",
      reason: isEn
        ? "The intent is understandable, but it may still be interpreted with different ranking criteria across engines."
        : "La intención se entiende, pero todavía puede interpretarse con criterios de ranking distintos entre motores.",
      optimizedPrompt: optimizePromptSuggestion(prompt, isEn),
    }
  }

  return {
    level: "high",
    reason: isEn ? "The query has a clear and specific intent." : "La consulta tiene una intención clara y específica.",
    optimizedPrompt: null,
  }
}

function PromptQualityWarning({ prompt, isEn, className = "" }: { prompt: string; isEn: boolean; className?: string }) {
  const quality = evaluatePromptQuality(prompt, isEn)
  if (quality.level === "high") return null
  return (
    <div className={`rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs text-yellow-100 ${className}`}>
      <div className="mb-2 flex items-center gap-2 font-medium text-yellow-300">
        <AlertCircle className="h-4 w-4" />
        {isEn ? "Prompt quality" : "Calidad del prompt"}: {quality.level === "medium" ? (isEn ? "Medium" : "Media") : (isEn ? "Low" : "Baja")}
      </div>
      <p className="text-yellow-100/80">{quality.reason}</p>
      {quality.optimizedPrompt && (
        <p className="mt-2 text-muted-foreground">
          <span className="text-foreground">{isEn ? "Suggested optimized version:" : "Versión optimizada sugerida:"}</span> {quality.optimizedPrompt}
        </p>
      )}
    </div>
  )
}

function PromptEngineBreakdown({ prompt, isEn }: { prompt: PromptItem; isEn: boolean }) {
  return (
    <div className="mt-3 rounded-xl border border-border/70 bg-background/35 p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">{isEn ? "Companies mentioned by engine" : "Empresas mencionadas por motor"}</p>
      <div className="space-y-2">
        {prompt.engines.map((engine) => {
          const result = resultForEngine(prompt, engine)
          const status = String(result?.status ?? "")
          const mentioned = Boolean(result?.mentioned)
          const companies = mentionedCompanies(result)
          const preview = resultPreview(result)
          const reason = String(result?.reason ?? "")
          return (
            <div key={engine} className="rounded-lg border border-border/60 bg-secondary/20 p-2">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-foreground">{normalizeEngineLabel(engine)}</span>
                {!result ? <span className="text-[11px] text-muted-foreground">{isEn ? "No run" : "Sin ejecución"}</span> : status !== "live" ? <span className="text-[11px] text-yellow-300">{isEn ? "Configuration error" : "Error de configuración"}</span> : mentioned ? <span className="text-[11px] text-emerald-400">{isEn ? "Target brand mentioned" : "Marca objetivo mencionada"}</span> : <span className="text-[11px] text-red-300">{isEn ? "Target brand not mentioned" : "Marca objetivo no aparece"}</span>}
              </div>
              {status !== "live" && reason ? (
                <p className="line-clamp-2 text-xs text-yellow-200/90">{reason}</p>
              ) : companies.length > 0 ? (
                <p className="text-xs text-muted-foreground"><span className="text-foreground">{isEn ? "Mentioned companies:" : "Empresas mencionadas:"}</span> {companies.join(", ")}</p>
              ) : preview ? (
                <p className="line-clamp-2 text-xs text-muted-foreground">{preview}</p>
              ) : (
                <p className="text-xs text-muted-foreground">{isEn ? "Run this prompt to see which companies the engine mentions." : "Ejecuta este prompt para ver qué empresas menciona ese motor."}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function PromptsLibraryPage() {
  const params = useParams<{ projectId?: string }>()
  const scopedProjectId = params?.projectId
  const { locale } = useGeoI18n()
  const isEn = locale === "en"
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [projectsLive, setProjectsLive] = useState<ProjectRecord[]>([])
  const [promptsLive, setPromptsLive] = useState<PromptItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [engineFilter, setEngineFilter] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<PromptItem | null>(null)
  const [viewingResultsPrompt, setViewingResultsPrompt] = useState<PromptItem | null>(null)
  const [runningPromptId, setRunningPromptId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards")

  const [formData, setFormData] = useState({
    text: "",
    category: "product",
    engines: [] as string[],
    country: "ES",
    language: "Español",
    projects: [] as string[],
    status: "active",
  })

  const mapPrompt = (record: GeoPromptRecord, projectMap: Map<string, string>): PromptItem => {
    const metadata = record.metadata ?? {}
    const position = typeof metadata.position === "number" ? metadata.position : 0
    const visibility = typeof metadata.visibility === "number" ? metadata.visibility : 0
    const mentions = typeof metadata.mentions === "number" ? metadata.mentions : 0
    const trend = metadata.trend === "down" || metadata.trend === "stable" ? metadata.trend : "up"
    return {
      id: record.id,
      text: record.prompt,
      category: record.category,
      status: record.enabled ? "active" : "inactive",
      engines: record.engines.length > 0 ? record.engines : ["ChatGPT"],
      country: record.country ?? "Colombia",
      language: record.language ?? "Español",
      performance: { position, visibility, mentions, trend },
      projects: [projectMap.get(record.project_id) ?? "Project"],
      projectIds: [record.project_id],
      createdAt: record.created_at,
      lastAudit: typeof metadata.last_run === "string" ? metadata.last_run : null,
      lastRunResults: Array.isArray(metadata.last_run_results) ? metadata.last_run_results as Array<Record<string, unknown>> : [],
    }
  }

  const loadPrompts = async () => {
    setLoading(true)
    try {
      const {
        data: { session },
      } = await supabaseGeo.auth.getSession()
      if (!session?.access_token) throw new Error("Unauthorized")

      const projectsRes = await fetch("/api/geo/projects", { headers: { Authorization: `Bearer ${session.access_token}` } })
      if (!projectsRes.ok) throw new Error("Could not load projects")
      const projectsJson = (await projectsRes.json()) as { data?: ProjectRecord[] }
      const projectsList = projectsJson.data ?? []
      setProjectsLive(projectsList)
      const projectMap = new Map(projectsList.map((project) => [project.id, project.company_name]))
      const targetProjectIds = scopedProjectId ? [scopedProjectId] : projectsList.map((project) => project.id)

      const responses = await Promise.all(
        targetProjectIds.map(async (projectId) => {
          const res = await fetch(`/api/geo/prompts?project_id=${encodeURIComponent(projectId)}`, { headers: { Authorization: `Bearer ${session.access_token}` } })
          if (!res.ok) return [] as GeoPromptRecord[]
          const json = (await res.json()) as { data?: GeoPromptRecord[] }
          return json.data ?? []
        })
      )
      setPromptsLive(responses.flat().map((record) => mapPrompt(record, projectMap)))
    } catch (error) {
      setPromptsLive([])
      setFeedback(error instanceof Error ? error.message : "Could not load prompts")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPrompts()
  }, [scopedProjectId])

  const prompts = promptsLive

  const categories = useMemo(() => [
    { id: "all", label: isEn ? "All" : "Todos", count: prompts.length },
    { id: "product", label: isEn ? "Product" : "Producto", count: prompts.filter((p) => p.category === "product").length },
    { id: "comparison", label: isEn ? "Comparison" : "Comparativa", count: prompts.filter((p) => p.category === "comparison").length },
    { id: "recommendation", label: isEn ? "Recommendation" : "Recomendación", count: prompts.filter((p) => p.category === "recommendation").length },
    { id: "alternative", label: isEn ? "Alternative" : "Alternativa", count: prompts.filter((p) => p.category === "alternative").length },
  ], [isEn, prompts])

  const metrics = useMemo(() => {
    const active = prompts.filter((p) => p.status === "active").length
    const won = prompts.filter((p) => p.performance.position > 0 && p.performance.position <= 3).length
    const avgPosition = prompts.length > 0 ? prompts.reduce((sum, p) => sum + (p.performance.position || 0), 0) / prompts.length : 0
    return [
      { title: "Total Prompts", value: String(prompts.length), change: isEn ? "real records" : "registros reales", icon: MessageSquare, color: "primary" },
      { title: isEn ? "Won Prompts" : "Prompts Ganados", value: String(won), change: prompts.length > 0 ? `${Math.round((won / prompts.length) * 100)}% win rate` : "0% win rate", icon: Award, color: "emerald-400" },
      { title: isEn ? "Active Prompts" : "Prompts Activos", value: String(active), change: prompts.length > 0 ? `${Math.round((active / prompts.length) * 100)}% ${isEn ? "of total" : "del total"}` : "0%", icon: Zap, color: "blue-400" },
      { title: isEn ? "Avg. Position" : "Avg. Posición", value: avgPosition > 0 ? `#${avgPosition.toFixed(1)}` : "--", change: isEn ? "from prompt metadata" : "desde metadata", icon: Target, color: "accent" },
    ]
  }, [isEn, prompts])

  const filteredPrompts = prompts.filter((prompt) => {
    const matchesSearch = prompt.text.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === "all" || prompt.category === categoryFilter
    const matchesStatus = !statusFilter || prompt.status === statusFilter
    const matchesEngine = !engineFilter || prompt.engines.includes(engineFilter)
    return matchesSearch && matchesCategory && matchesStatus && matchesEngine
  })

  const hasActiveFilters = statusFilter || engineFilter
  const hasPrompts = prompts.length > 0

  const handleEngineToggle = (engine: string) => {
    setFormData((prev) => ({
      ...prev,
      engines: prev.engines.includes(engine)
        ? prev.engines.filter((e) => e !== engine)
        : [...prev.engines, engine],
    }))
  }

  const openEditModal = (prompt: PromptItem) => {
    setEditingPrompt(prompt)
    setFormData({
      text: prompt.text,
      category: prompt.category,
      engines: prompt.engines,
      country: prompt.country,
      language: prompt.language,
      projects: prompt.projectIds,
      status: prompt.status,
    })
    setShowModal(true)
  }

  const openCreateModal = () => {
    setEditingPrompt(null)
    setFormData({
      text: "",
      category: "product",
      engines: [],
      country: "Colombia",
      language: isEn ? "English" : "Español",
      projects: scopedProjectId ? [scopedProjectId] : projectsLive[0]?.id ? [projectsLive[0].id] : [],
      status: "active",
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingPrompt(null)
  }

  const savePrompt = async () => {
    const projectId = formData.projects[0] ?? scopedProjectId
    if (!projectId || !formData.text.trim() || formData.engines.length === 0) {
      setFeedback(isEn ? "Prompt, project and at least one engine are required." : "Prompt, proyecto y al menos un motor son obligatorios.")
      return
    }

    setSaving(true)
    try {
      const {
        data: { session },
      } = await supabaseGeo.auth.getSession()
      if (!session?.access_token) throw new Error("Unauthorized")

      const payload = {
        project_id: projectId,
        prompt: formData.text.trim(),
        category: formData.category,
        engines: formData.engines,
        country: formData.country,
        language: formData.language,
        enabled: formData.status === "active",
        metadata: {},
      }

      const res = await fetch("/api/geo/prompts", {
        method: editingPrompt ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(editingPrompt ? { ...payload, prompt_id: editingPrompt.id } : payload),
      })
      if (!res.ok) throw new Error(editingPrompt ? "Could not update prompt" : "Could not create prompt")
      setFeedback(editingPrompt ? (isEn ? "Prompt updated." : "Prompt actualizado.") : (isEn ? "Prompt created." : "Prompt creado."))
      closeModal()
      await loadPrompts()
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Prompt operation failed")
    } finally {
      setSaving(false)
    }
  }

  const deletePrompt = async (prompt: PromptItem) => {
    const projectId = prompt.projectIds[0]
    if (!projectId || !window.confirm(isEn ? "Delete this prompt?" : "Eliminar este prompt?")) return
    try {
      const {
        data: { session },
      } = await supabaseGeo.auth.getSession()
      if (!session?.access_token) throw new Error("Unauthorized")
      const res = await fetch(`/api/geo/prompts?project_id=${encodeURIComponent(projectId)}&prompt_id=${encodeURIComponent(prompt.id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) throw new Error("Could not delete prompt")
      setFeedback(isEn ? "Prompt deleted." : "Prompt eliminado.")
      await loadPrompts()
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not delete prompt")
    }
  }

  const updatePromptStatus = async (prompt: PromptItem, enabled: boolean) => {
    const projectId = prompt.projectIds[0]
    if (!projectId) return
    try {
      const {
        data: { session },
      } = await supabaseGeo.auth.getSession()
      if (!session?.access_token) throw new Error("Unauthorized")
      const res = await fetch("/api/geo/prompts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ project_id: projectId, prompt_id: prompt.id, enabled }),
      })
      if (!res.ok) throw new Error("Could not update prompt status")
      setFeedback(enabled ? (isEn ? "Prompt activated." : "Prompt activado.") : (isEn ? "Prompt paused." : "Prompt pausado."))
      await loadPrompts()
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not update prompt status")
    }
  }

  const duplicatePrompt = (prompt: PromptItem) => {
    setEditingPrompt(null)
    setFormData({
      text: prompt.text,
      category: prompt.category,
      engines: prompt.engines,
      country: prompt.country,
      language: prompt.language,
      projects: prompt.projectIds,
      status: "active",
    })
    setShowModal(true)
  }

  const runPromptNow = async (prompt: PromptItem) => {
    const projectId = prompt.projectIds[0]
    if (!projectId) return
    setRunningPromptId(prompt.id)
    setFeedback(null)
    try {
      const {
        data: { session },
      } = await supabaseGeo.auth.getSession()
      if (!session?.access_token) throw new Error("Unauthorized")
      const res = await fetch("/api/geo/prompts/run", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ project_id: projectId, prompt_id: prompt.id }),
      })
      const json = (await res.json().catch(() => null)) as { error?: string; data?: { results?: Array<{ status?: string; mentioned?: boolean }> } } | null
      if (!res.ok) throw new Error(json?.error || "Could not run prompt")
      const liveCount = json?.data?.results?.filter((item) => item.status === "live").length ?? 0
      const mentions = json?.data?.results?.filter((item) => item.mentioned).length ?? 0
      setFeedback(isEn ? `Prompt executed: ${mentions}/${liveCount} engines mentioned the brand.` : `Prompt ejecutado: ${mentions}/${liveCount} motores mencionaron la marca.`)
      await loadPrompts()
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : isEn ? "Could not run prompt." : "No se pudo ejecutar el prompt.")
    } finally {
      setRunningPromptId(null)
    }
  }

  return (
    <>
      <AppHeader />
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">{isEn ? "Prompts Library" : "Biblioteca de Prompts"}</h2>
            <p className="text-muted-foreground">
              {isEn ? "Manage the prompts you monitor across each AI engine" : "Gestiona los prompts que monitoreas en cada motor de IA"}
            </p>
          </div>
          <Button
            className="bg-primary hover:bg-primary/90 glow-primary"
            onClick={openCreateModal}
          >
            <Plus className="w-4 h-4 mr-2" />
            {isEn ? "Add Prompt" : "Añadir Prompt"}
          </Button>
        </div>

        {feedback && (
          <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
            {feedback}
          </div>
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

        {/* Category Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  categoryFilter === cat.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {cat.label}
                <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                  categoryFilter === cat.id
                    ? "bg-white/20"
                    : "bg-secondary"
                }`}>
                  {cat.count}
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <Card className="glass border-border">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar prompts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-secondary/50 border border-border rounded-lg text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-2 bg-secondary/50 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode("cards")}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                      viewMode === "cards"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Cards
                  </button>
                  <button
                    onClick={() => setViewMode("table")}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                      viewMode === "table"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Tabla
                  </button>
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
                        Estado
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
                        Motor IA
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

        {/* Prompts Content */}
        {loading ? (
          <Card className="glass border-border">
            <CardContent className="py-14 text-center text-muted-foreground">
              {isEn ? "Loading prompts..." : "Cargando prompts..."}
            </CardContent>
          </Card>
        ) : hasPrompts ? (
          <>
            {viewMode === "cards" ? (
              /* Cards View */
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPrompts.map((prompt, index) => {
                  const status = statusConfig[prompt.status as keyof typeof statusConfig]
                  const StatusIcon = status.icon
                  const category = categoryConfig[prompt.category] ?? categoryConfig.product
                  const TrendIcon = prompt.performance.trend === "up" 
                    ? TrendingUp 
                    : prompt.performance.trend === "down" 
                    ? TrendingDown 
                    : BarChart3

                  return (
                    <motion.div
                      key={prompt.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <Card className="glass border-border hover:border-primary/50 transition-all group h-full">
                        <CardContent className="p-5">
                          {/* Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${category.className}`}>
                                {category.label}
                              </span>
                              <button
                                onClick={() => updatePromptStatus(prompt, prompt.status !== "active")}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${status.className}`}
                              >
                                <StatusIcon className="w-3 h-3" />
                                {status.label}
                              </button>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => openEditModal(prompt)}
                                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                               <button
                                 onClick={() => duplicatePrompt(prompt)}
                                 className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
                               >
                                 <Copy className="w-3.5 h-3.5" />
                               </button>
                              <button
                                onClick={() => deletePrompt(prompt)}
                                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-red-400 transition-colors"
                              >
                                 <Trash2 className="w-3.5 h-3.5" />
                               </button>
                            </div>
                          </div>

                          {/* Prompt Text */}
                          <p className="text-sm font-medium mb-4 line-clamp-2 min-h-[2.5rem]">
                            {prompt.text}
                          </p>

                          <PromptQualityWarning prompt={prompt.text} isEn={isEn} className="mb-4" />

                          {/* Country/Language */}
                          <div className="flex items-center gap-2 mb-4">
                            <span className="text-lg">{countryFlags[prompt.country] ?? "🌐"}</span>
                            <span className="text-xs text-muted-foreground">{prompt.language}</span>
                          </div>

                          {/* Engines */}
                          <div className="flex flex-wrap gap-1 mb-4">
                            {prompt.engines.map((engine) => (
                              <span
                                key={engine}
                                className={`px-2 py-0.5 rounded text-xs font-medium ${engineColors[engine]}`}
                              >
                                {engine}
                              </span>
                            ))}
                          </div>

                          {/* Performance Metrics */}
                          <div className="p-3 rounded-xl bg-secondary/30 border border-border">
                            <div className="grid grid-cols-3 gap-3 text-center">
                              <div>
                                <div className={`text-lg font-bold ${
                                  prompt.performance.position <= 3 
                                    ? "text-emerald-400" 
                                    : prompt.performance.position <= 5 
                                    ? "text-yellow-400"
                                    : "text-muted-foreground"
                                }`}>
                                  {prompt.performance.position > 0 ? `#${prompt.performance.position}` : "--"}
                                </div>
                                <p className="text-xs text-muted-foreground">Posición</p>
                              </div>
                              <div>
                                <div className="text-lg font-bold">{prompt.performance.visibility}%</div>
                                <p className="text-xs text-muted-foreground">Visibilidad</p>
                              </div>
                              <div>
                                <div className="text-lg font-bold flex items-center justify-center gap-1">
                                  {prompt.performance.mentions}
                                  <TrendIcon className={`w-3 h-3 ${
                                    prompt.performance.trend === "up" 
                                      ? "text-emerald-400" 
                                      : prompt.performance.trend === "down" 
                                      ? "text-red-400"
                                      : "text-muted-foreground"
                                  }`} />
                                </div>
                                <p className="text-xs text-muted-foreground">Menciones</p>
                              </div>
                            </div>
                          </div>

                          <PromptEngineBreakdown prompt={prompt} isEn={isEn} />

                          {prompt.lastAudit && (
                            <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
                              <div className="flex items-center justify-between gap-3">
                                <span>{isEn ? "Last run" : "Última ejecución"}: {formatDate(prompt.lastAudit)}</span>
                                <button className="text-primary hover:text-primary/80" onClick={() => setViewingResultsPrompt(prompt)}>
                                  {isEn ? "View answers" : "Ver respuestas"}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Footer */}
                          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {formatDate(prompt.lastAudit)}
                            </div>
                            <Button size="sm" className="h-8 bg-primary hover:bg-primary/90" onClick={() => runPromptNow(prompt)} disabled={runningPromptId === prompt.id || prompt.status !== "active"}>
                              <Play className="mr-1.5 h-3.5 w-3.5" />
                              {runningPromptId === prompt.id ? (isEn ? "Running" : "Ejecutando") : (isEn ? "Run now" : "Ejecutar ahora")}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            ) : (
              /* Table View */
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 }}
              >
                <Card className="glass border-border">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-semibold">
                      Todos los Prompts
                    </CardTitle>
                    <span className="text-sm text-muted-foreground">
                      {filteredPrompts.length} de {prompts.length} prompts
                    </span>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                              Prompt
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                              Categoría
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                              Estado
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                              Motores
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                              País
                            </th>
                            <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                              Posición
                            </th>
                            <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                              Visibilidad
                            </th>
                            <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                              Menciones
                            </th>
                            <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                              Acciones
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPrompts.map((prompt) => {
                            const status = statusConfig[prompt.status as keyof typeof statusConfig]
                            const StatusIcon = status.icon
                  const category = categoryConfig[prompt.category] ?? categoryConfig.product
                            const TrendIcon = prompt.performance.trend === "up" 
                              ? TrendingUp 
                              : prompt.performance.trend === "down" 
                              ? TrendingDown 
                              : BarChart3

                            return (
                              <tr
                                key={prompt.id}
                                className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                              >
                                <td className="py-4 px-4 max-w-xs">
                                  <p className="text-sm font-medium truncate" title={prompt.text}>
                                    {prompt.text}
                                  </p>
                                </td>
                                <td className="py-4 px-4">
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${category.className}`}>
                                    {category.label}
                                  </span>
                                </td>
                                <td className="py-4 px-4">
                                  <button
                                    onClick={() => updatePromptStatus(prompt, prompt.status !== "active")}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${status.className}`}
                                  >
                                    <StatusIcon className="w-3 h-3" />
                                    {status.label}
                                  </button>
                                </td>
                                <td className="py-4 px-4">
                                  <div className="flex flex-wrap gap-1">
                                    {prompt.engines.slice(0, 2).map((engine) => (
                                      <span
                                        key={engine}
                                        className={`px-2 py-0.5 rounded text-xs font-medium ${engineColors[engine]}`}
                                      >
                                        {engine}
                                      </span>
                                    ))}
                                    {prompt.engines.length > 2 && (
                                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-secondary text-muted-foreground">
                                        +{prompt.engines.length - 2}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-4 px-4">
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">{countryFlags[prompt.country]}</span>
                                    <span className="text-xs text-muted-foreground">{prompt.language}</span>
                                  </div>
                                </td>
                                <td className="py-4 px-4 text-center">
                                  <span className={`font-bold ${
                                    prompt.performance.position <= 3 
                                      ? "text-emerald-400" 
                                      : prompt.performance.position <= 5 
                                      ? "text-yellow-400"
                                      : "text-muted-foreground"
                                  }`}>
                                    {prompt.performance.position > 0 ? `#${prompt.performance.position}` : "--"}
                                  </span>
                                </td>
                                <td className="py-4 px-4 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="w-12 h-1.5 rounded-full bg-secondary overflow-hidden">
                                      <div
                                        className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                                        style={{ width: `${prompt.performance.visibility}%` }}
                                      />
                                    </div>
                                    <span className="text-sm">{prompt.performance.visibility}%</span>
                                  </div>
                                </td>
                                <td className="py-4 px-4 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <span className="font-medium">{prompt.performance.mentions}</span>
                                    <TrendIcon className={`w-3 h-3 ${
                                      prompt.performance.trend === "up" 
                                        ? "text-emerald-400" 
                                        : prompt.performance.trend === "down" 
                                        ? "text-red-400"
                                        : "text-muted-foreground"
                                    }`} />
                                  </div>
                                </td>
                                <td className="py-4 px-4">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-muted-foreground hover:text-primary h-8 w-8 p-0"
                                      onClick={() => runPromptNow(prompt)}
                                      disabled={runningPromptId === prompt.id || prompt.status !== "active"}
                                    >
                                      <Play className="w-4 h-4" />
                                    </Button>
                                    {prompt.lastRunResults.length > 0 && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-muted-foreground hover:text-primary h-8 w-8 p-0"
                                        onClick={() => setViewingResultsPrompt(prompt)}
                                      >
                                        <Eye className="w-4 h-4" />
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-muted-foreground hover:text-primary h-8 w-8 p-0"
                                      onClick={() => openEditModal(prompt)}
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-muted-foreground hover:text-primary h-8 w-8 p-0"
                                      onClick={() => duplicatePrompt(prompt)}
                                    >
                                      <Copy className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-muted-foreground hover:text-red-400 h-8 w-8 p-0"
                                      onClick={() => deletePrompt(prompt)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* No Results */}
            {filteredPrompts.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-16"
              >
                <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Sin resultados</h3>
                <p className="text-muted-foreground text-center max-w-sm mb-4">
                  No se encontraron prompts con los filtros seleccionados.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("")
                    setCategoryFilter("all")
                    setStatusFilter(null)
                    setEngineFilter(null)
                  }}
                >
                  Limpiar filtros
                </Button>
              </motion.div>
            )}
          </>
        ) : (
          /* Empty State */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <Card className="glass border-border">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-6">
                  <MessageSquare className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  No tienes prompts configurados
                </h3>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                  Añade prompts para monitorear cómo los motores de IA responden a búsquedas relevantes para tu marca.
                </p>
                <Button
                  className="bg-primary hover:bg-primary/90 glow-primary"
                  onClick={openCreateModal}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Crear primer prompt
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={closeModal}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-background border border-border rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div>
                  <h3 className="text-xl font-bold">
                    {editingPrompt ? (isEn ? "Edit Prompt" : "Editar Prompt") : (isEn ? "New Prompt" : "Nuevo Prompt")}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {editingPrompt
                      ? isEn ? "Update the prompt details" : "Modifica los detalles del prompt"
                      : isEn ? "Add a new prompt to monitor" : "Añade un nuevo prompt para monitorear"}
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
                {/* Prompt Text */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {isEn ? "Prompt text" : "Texto del prompt"} <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={formData.text}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, text: e.target.value }))
                    }
                    placeholder={isEn ? "Example: What is the best project management software for startups?" : "Ej: ¿Cuál es el mejor software de gestión para startups?"}
                    rows={3}
                    className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors resize-none"
                  />
                  {formData.text.trim() && <PromptQualityWarning prompt={formData.text} isEn={isEn} />}
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">{isEn ? "Category" : "Categoría"}</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(categoryConfig).map(([key, config]) => (
                      <button
                        key={key}
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, category: key }))
                        }
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                          formData.category === key
                            ? config.className + " border-current"
                            : "bg-secondary/50 border-border text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        {config.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Engines */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {isEn ? "AI Engines" : "Motores IA"} <span className="text-red-400">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {["ChatGPT", "Gemini", "Perplexity", "AI Overviews"].map(
                      (engine) => (
                        <button
                          key={engine}
                          onClick={() => handleEngineToggle(engine)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
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

                {/* Country & Language */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{isEn ? "Country" : "País"}</label>
                    <select
                      value={formData.country}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, country: e.target.value }))
                      }
                      className="w-full px-4 py-2.5 bg-secondary/50 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors appearance-none cursor-pointer"
                    >
                      <option value="Colombia">🇨🇴 Colombia</option>
                      <option value="Canadá">🇨🇦 Canadá</option>
                      <option value="España">🇪🇸 España</option>
                      <option value="Estados Unidos">🇺🇸 Estados Unidos</option>
                      <option value="México">🇲🇽 México</option>
                      <option value="Reino Unido">🇬🇧 Reino Unido</option>
                      <option value="Francia">🇫🇷 Francia</option>
                      <option value="Argentina">🇦🇷 Argentina</option>
                      <option value="Alemania">🇩🇪 Alemania</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{isEn ? "Language" : "Idioma"}</label>
                    <select
                      value={formData.language}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, language: e.target.value }))
                      }
                      className="w-full px-4 py-2.5 bg-secondary/50 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors appearance-none cursor-pointer"
                    >
                      <option value="Español">Español</option>
                      <option value="English">English</option>
                      <option value="Français">Français</option>
                      <option value="Deutsch">Deutsch</option>
                    </select>
                  </div>
                </div>

                {!scopedProjectId && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {isEn ? "Project" : "Proyecto"} <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={formData.projects[0] ?? ""}
                      onChange={(e) => setFormData((prev) => ({ ...prev, projects: e.target.value ? [e.target.value] : [] }))}
                      className="w-full px-4 py-2.5 bg-secondary/50 border border-border rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors appearance-none cursor-pointer"
                    >
                      <option value="">{isEn ? "Select a project" : "Selecciona un proyecto"}</option>
                      {projectsLive.map((project) => (
                        <option key={project.id} value={project.id}>{project.company_name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Status Toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border">
                  <div>
                    <p className="font-medium">{isEn ? "Prompt status" : "Estado del prompt"}</p>
                    <p className="text-sm text-muted-foreground">
                      {formData.status === "active"
                        ? isEn ? "The prompt is active and will be monitored" : "El prompt está activo y será monitoreado"
                        : isEn ? "The prompt is paused" : "El prompt está pausado"}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        status: prev.status === "active" ? "inactive" : "active",
                      }))
                    }
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      formData.status === "active" ? "bg-primary" : "bg-secondary"
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        formData.status === "active" ? "left-7" : "left-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-secondary/20">
                <Button variant="outline" onClick={closeModal}>
                  {isEn ? "Cancel" : "Cancelar"}
                </Button>
                <Button className="bg-primary hover:bg-primary/90 glow-primary" onClick={savePrompt} disabled={saving}>
                  {saving ? (isEn ? "Saving..." : "Guardando...") : editingPrompt ? (isEn ? "Save changes" : "Guardar cambios") : (isEn ? "Create prompt" : "Crear prompt")}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingResultsPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setViewingResultsPrompt(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-3xl rounded-2xl border border-border bg-background shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-border p-6">
                <div>
                  <h3 className="text-xl font-bold">{isEn ? "AI Answers" : "Respuestas IA"}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{viewingResultsPrompt.text}</p>
                  <p className="mt-2 text-xs text-primary">{isEn ? "Neutral query: the brand is not injected into the AI prompt." : "Consulta neutral: la marca no se inyecta en el prompt enviado a la IA."}</p>
                </div>
                <button className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground" onClick={() => setViewingResultsPrompt(null)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
                {viewingResultsPrompt.lastRunResults.length === 0 && <p className="text-sm text-muted-foreground">{isEn ? "No run results yet." : "Aún no hay resultados de ejecución."}</p>}
                {viewingResultsPrompt.lastRunResults.map((result, index) => {
                  const status = String(result.status ?? "")
                  const mentioned = Boolean(result.mentioned)
                  const companies = mentionedCompanies(result)
                  return (
                    <div key={index} className={`rounded-xl border p-4 ${status === "live" ? mentioned ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5" : "border-yellow-500/30 bg-yellow-500/10"}`}>
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {status === "live" ? mentioned ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <AlertCircle className="h-4 w-4 text-red-400" /> : <AlertCircle className="h-4 w-4 text-yellow-400" />}
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{String(result.engine ?? "Motor IA")}</span>
                        </div>
                        <div className="text-right text-sm">
                          {status !== "live" ? <span className="text-yellow-300">{isEn ? "Configuration error" : "Error de configuración"}</span> : mentioned ? <span className="text-green-400">Mencionado</span> : <span className="text-red-400">No aparece</span>}
                          {typeof result.position === "number" && result.position > 0 && <p className="text-xs text-muted-foreground">Posición {result.position}</p>}
                        </div>
                      </div>
                      {result.reason && <p className="text-sm text-muted-foreground">{String(result.reason)}</p>}
                      {companies.length > 0 && (
                        <div className="mb-3 rounded-lg border border-border/70 bg-background/40 p-3">
                          <p className="mb-1 text-xs font-medium text-muted-foreground">{isEn ? "Companies mentioned in the answer" : "Empresas mencionadas en la respuesta"}</p>
                          <div className="flex flex-wrap gap-2">
                            {companies.map((name) => <span key={name} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-foreground">{name}</span>)}
                          </div>
                        </div>
                      )}
                      {result.answer_preview && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{cleanAiText(String(result.answer_preview))}</p>}
                    </div>
                  )
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
