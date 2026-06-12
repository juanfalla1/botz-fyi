"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, BarChart3, FileSearch, Globe, MessageSquare, Sparkles, Target, Users, Wrench, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AppHeader } from "@/GEO/components/geo/app-shell"
import { useGeoI18n } from "@/GEO/components/geo/i18n"
import { supabaseGeo } from "@/app/geo/supabaseGeoClient"
import type { CompetitorRecord, GeoAuditRecord, GeoPromptRecord, ProjectRecord } from "@/lib/geo/db-types"

type LoadState = {
  project: ProjectRecord | null
  audits: GeoAuditRecord[]
  competitors: CompetitorRecord[]
  prompts: GeoPromptRecord[]
}

function parseSummary(summary: string | null): Record<string, unknown> {
  if (!summary) return {}
  try {
    const parsed = JSON.parse(summary)
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function numberFrom(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

export default function ProjectHubReal() {
  const params = useParams<{ projectId?: string }>()
  const projectId = params?.projectId
  const { locale } = useGeoI18n()
  const isEn = locale === "en"
  const [state, setState] = useState<LoadState>({ project: null, audits: [], competitors: [], prompts: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [competitorName, setCompetitorName] = useState("")
  const [competitorDomain, setCompetitorDomain] = useState("")
  const [savingCompetitor, setSavingCompetitor] = useState(false)
  const [competitorFeedback, setCompetitorFeedback] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!projectId) return
      setLoading(true)
      setError(null)
      try {
        const {
          data: { session },
        } = await supabaseGeo.auth.getSession()
        if (!session?.access_token) throw new Error(isEn ? "Sign in to view this project." : "Inicia sesión para ver este proyecto.")
        const headers = { Authorization: `Bearer ${session.access_token}` }
        const [projectRes, auditsRes, competitorsRes, promptsRes] = await Promise.all([
          fetch(`/api/geo/projects/${projectId}`, { headers }),
          fetch("/api/geo/audits", { headers }),
          fetch(`/api/geo/competitors?project_id=${projectId}`, { headers }),
          fetch(`/api/geo/projects/${projectId}/prompts`, { headers }),
        ])
        if (!projectRes.ok) throw new Error(isEn ? "Project not found or unavailable." : "Proyecto no encontrado o no disponible.")
        const projectJson = (await projectRes.json()) as { data?: ProjectRecord }
        const auditsJson = auditsRes.ok ? ((await auditsRes.json()) as { data?: { audits?: GeoAuditRecord[] } }) : { data: { audits: [] } }
        const competitorsJson = competitorsRes.ok ? ((await competitorsRes.json()) as { data?: CompetitorRecord[] }) : { data: [] }
        const promptsJson = promptsRes.ok ? ((await promptsRes.json()) as { data?: GeoPromptRecord[] }) : { data: [] }
        const projectAudits = (auditsJson.data?.audits ?? []).filter((audit) => audit.project_id === projectId)
        if (mounted) {
          setState({
            project: projectJson.data ?? null,
            audits: projectAudits,
            competitors: competitorsJson.data ?? [],
            prompts: promptsJson.data ?? [],
          })
        }
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : isEn ? "Could not load project." : "No se pudo cargar el proyecto.")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [projectId, isEn])

  const latestAudit = state.audits[0]
  const latestSummary = useMemo(() => parseSummary(latestAudit?.summary ?? null), [latestAudit?.summary])
  const score = latestAudit?.final_score ?? numberFrom(latestSummary.geo_score)
  const activePrompts = state.prompts.filter((prompt) => prompt.enabled).length
  const completedAudits = state.audits.filter((audit) => audit.status === "completed").length

  const addProjectCompetitor = async () => {
    if (!projectId || !competitorName.trim()) {
      setCompetitorFeedback(isEn ? "Competitor name is required." : "El nombre del competidor es obligatorio.")
      return
    }
    setSavingCompetitor(true)
    setCompetitorFeedback(null)
    try {
      const {
        data: { session },
      } = await supabaseGeo.auth.getSession()
      if (!session?.access_token) throw new Error(isEn ? "Sign in to add competitors." : "Inicia sesión para agregar competidores.")
      const res = await fetch("/api/geo/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          project_id: projectId,
          name: competitorName.trim(),
          domain: competitorDomain.trim() || null,
        }),
      })
      const json = (await res.json().catch(() => null)) as { data?: CompetitorRecord; error?: string } | null
      if (!res.ok || !json?.data) throw new Error(json?.error || (isEn ? "Could not add competitor." : "No se pudo agregar el competidor."))
      setState((current) => ({ ...current, competitors: [json.data as CompetitorRecord, ...current.competitors] }))
      setCompetitorName("")
      setCompetitorDomain("")
      setCompetitorFeedback(isEn ? "Competitor added to this project." : "Competidor agregado a este proyecto.")
    } catch (err) {
      setCompetitorFeedback(err instanceof Error ? err.message : isEn ? "Could not add competitor." : "No se pudo agregar el competidor.")
    } finally {
      setSavingCompetitor(false)
    }
  }

  return (
    <>
      <AppHeader />
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Button variant="ghost" className="mb-2 px-0 text-muted-foreground hover:text-foreground" asChild>
              <Link href="/geo/app"><ArrowLeft className="mr-2 h-4 w-4" />{isEn ? "Back to dashboard" : "Volver al dashboard"}</Link>
            </Button>
            <h2 className="text-2xl font-bold">{state.project?.company_name ?? (isEn ? "Project Hub" : "Hub del proyecto")}</h2>
            <p className="text-muted-foreground">{state.project?.website_url ?? (isEn ? "Real project workspace" : "Workspace real del proyecto")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link href={`/geo/app/projects/${projectId}/prompts`}>{isEn ? "Prompts" : "Prompts"}</Link></Button>
            <Button asChild className="bg-primary hover:bg-primary/90"><Link href={`/geo/app/projects/${projectId}/audits/new`}>{isEn ? "New Audit" : "Nueva auditoría"}</Link></Button>
          </div>
        </div>

        {loading && <Card className="glass border-border"><CardContent className="py-14 text-center text-muted-foreground">{isEn ? "Loading project..." : "Cargando proyecto..."}</CardContent></Card>}
        {!loading && error && <Card className="glass border-border"><CardContent className="py-14 text-center text-muted-foreground">{error}</CardContent></Card>}

        {!loading && !error && state.project && (
          <>
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              {[
                { label: "GEO Score", value: score > 0 ? `${score}/100` : "--", icon: Sparkles },
                { label: isEn ? "Audits" : "Auditorías", value: String(state.audits.length), icon: FileSearch },
                { label: isEn ? "Active Prompts" : "Prompts activos", value: String(activePrompts), icon: MessageSquare },
                { label: isEn ? "Competitors" : "Competidores", value: String(state.competitors.length), icon: Users },
                { label: isEn ? "Completed" : "Completadas", value: String(completedAudits), icon: Target },
              ].map((item) => (
                <Card key={item.label} className="glass border-border">
                  <CardContent className="min-h-[150px] p-5 flex flex-col justify-center">
                    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary"><item.icon className="h-5 w-5" /></div>
                    <div className="text-3xl font-bold">{item.value}</div>
                    <p className="text-sm text-muted-foreground">{item.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="glass border-border">
                <CardHeader><CardTitle>{isEn ? "Project Context" : "Contexto del proyecto"}</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p><strong>{isEn ? "Company" : "Empresa"}:</strong> {state.project.company_name}</p>
                  <p className="flex items-center gap-2"><Globe className="h-4 w-4 text-primary" />{state.project.website_url}</p>
                  <p><strong>{isEn ? "Country" : "País"}:</strong> {state.project.country || "--"}</p>
                  <p><strong>{isEn ? "Language" : "Idioma"}:</strong> {state.project.language || "--"}</p>
                  <p><strong>{isEn ? "Industry" : "Industria"}:</strong> {state.project.industry || "--"}</p>
                </CardContent>
              </Card>

              <Card className="glass border-border">
                <CardHeader><CardTitle>{isEn ? "Latest Audit" : "Última auditoría"}</CardTitle></CardHeader>
                <CardContent>
                  {!latestAudit && <p className="text-sm text-muted-foreground">{isEn ? "No audits yet. Run one to generate GEO evidence." : "Sin auditorías todavía. Ejecuta una para generar evidencia GEO."}</p>}
                  {latestAudit && (
                    <div className="space-y-3 text-sm">
                      <p><strong>{isEn ? "Status" : "Estado"}:</strong> {latestAudit.status}</p>
                      <p><strong>URL:</strong> {latestAudit.base_url}</p>
                      <p><strong>{isEn ? "Created" : "Creada"}:</strong> {new Date(latestAudit.created_at).toLocaleString(locale === "en" ? "en-US" : "es-ES")}</p>
                      <Button asChild variant="outline"><Link href={`/geo/app/audits/${latestAudit.id}`}>{isEn ? "Open detail" : "Abrir detalle"}</Link></Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="glass border-border">
              <CardHeader><CardTitle>{isEn ? "Project Competitors" : "Competidores del proyecto"}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                  <input
                    value={competitorName}
                    onChange={(event) => setCompetitorName(event.target.value)}
                    placeholder={isEn ? "Competitor name" : "Nombre del competidor"}
                    className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm"
                  />
                  <input
                    value={competitorDomain}
                    onChange={(event) => setCompetitorDomain(event.target.value)}
                    placeholder={isEn ? "Domain, optional" : "Dominio, opcional"}
                    className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm"
                  />
                  <Button onClick={addProjectCompetitor} disabled={savingCompetitor} className="bg-primary hover:bg-primary/90">
                    {savingCompetitor ? (isEn ? "Adding..." : "Agregando...") : isEn ? "Add" : "Agregar"}
                  </Button>
                </div>
                {competitorFeedback && <p className="text-sm text-primary">{competitorFeedback}</p>}
                {state.competitors.length === 0 && <p className="text-sm text-muted-foreground">{isEn ? "No competitors linked to this project yet." : "Aún no hay competidores vinculados a este proyecto."}</p>}
                {state.competitors.length > 0 && (
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {state.competitors.map((competitor) => (
                      <div key={competitor.id} className="rounded-xl border border-border bg-secondary/25 p-3 text-sm">
                        <p className="font-medium">{competitor.name}</p>
                        <p className="text-xs text-muted-foreground">{competitor.domain || "--"}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="glass border-border lg:col-span-2">
                <CardHeader><CardTitle>{isEn ? "Recent Audits" : "Auditorías recientes"}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {state.audits.length === 0 && <p className="text-sm text-muted-foreground">{isEn ? "No audit history for this project." : "No hay historial de auditorías para este proyecto."}</p>}
                  {state.audits.slice(0, 5).map((audit) => (
                    <Link key={audit.id} href={`/geo/app/audits/${audit.id}`} className="flex items-center justify-between rounded-xl border border-border bg-secondary/25 p-3 text-sm transition-colors hover:bg-secondary/40">
                      <span>{audit.base_url}</span>
                      <span className="text-muted-foreground">{audit.final_score ?? "--"}</span>
                    </Link>
                  ))}
                </CardContent>
              </Card>

              <Card className="glass border-border">
                <CardHeader><CardTitle>{isEn ? "Next Actions" : "Siguientes acciones"}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" variant="outline" asChild><Link href={`/geo/app/projects/${projectId}/recommendations`}><BarChart3 className="mr-2 h-4 w-4" />{isEn ? "Recommendations" : "Recomendaciones"}</Link></Button>
                  <Button className="w-full justify-start" variant="outline" asChild><Link href={`/geo/app/projects/${projectId}/content-opportunities`}><Zap className="mr-2 h-4 w-4" />{isEn ? "Content Opportunities" : "Oportunidades"}</Link></Button>
                  <Button className="w-full justify-start" variant="outline" asChild><Link href={`/geo/app/projects/${projectId}/technical-fixes`}><Wrench className="mr-2 h-4 w-4" />{isEn ? "Technical Fixes" : "Fixes técnicos"}</Link></Button>
                  <Button className="w-full justify-start" variant="outline" asChild><Link href={`/geo/app/projects/${projectId}/impact`}><Target className="mr-2 h-4 w-4" />{isEn ? "Impact Tracking" : "Impacto"}</Link></Button>
                  <Button className="w-full justify-start" variant="outline" asChild><Link href="/geo/app/automations"><Target className="mr-2 h-4 w-4" />{isEn ? "Automations" : "Automatizaciones"}</Link></Button>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </>
  )
}
