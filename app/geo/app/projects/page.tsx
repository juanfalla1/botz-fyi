"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AppHeader } from "@/components/geo/app-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabaseGeo } from "@/app/geo/supabaseGeoClient"
import { useGeoI18n } from "@/GEO/components/geo/i18n"
import { BarChart3, ExternalLink, FileSearch, MessageSquare, Plus, Trash2 } from "lucide-react"

type Project = {
  id: string
  company_name: string
  website_url: string
  country: string
  language: string
  industry: string
  created_at: string
}

type Audit = {
  id: string
  project_id: string | null
  status: string
  final_score: number | null
  created_at: string
  completed_at?: string | null
}

export default function ProjectsPage() {
  const { locale } = useGeoI18n()
  const isEn = locale === "en"
  const [projects, setProjects] = useState<Project[]>([])
  const [audits, setAudits] = useState<Audit[]>([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    const {
      data: { session },
    } = await supabaseGeo.auth.getSession()
    if (!session?.access_token) {
      setLoading(false)
      return
    }
    const headers = { Authorization: `Bearer ${session.access_token}` }
    const [projectsRes, auditsRes] = await Promise.all([
      fetch("/api/geo/projects", { headers }),
      fetch("/api/geo/audits", { headers }),
    ])
    if (projectsRes.ok) {
      const json = (await projectsRes.json()) as { data?: Project[] }
      setProjects(json.data ?? [])
    }
    if (auditsRes.ok) {
      const json = (await auditsRes.json()) as { data?: { audits?: Audit[] } }
      setAudits(json.data?.audits ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const projectStats = useMemo(() => {
    const stats = new Map<string, { audits: number; completed: number; avgScore: number; lastAudit: string | null }>()
    for (const project of projects) stats.set(project.id, { audits: 0, completed: 0, avgScore: 0, lastAudit: null })
    for (const audit of audits) {
      if (!audit.project_id) continue
      const current = stats.get(audit.project_id) ?? { audits: 0, completed: 0, avgScore: 0, lastAudit: null }
      const scores = audits.filter((item) => item.project_id === audit.project_id && typeof item.final_score === "number").map((item) => item.final_score as number)
      stats.set(audit.project_id, {
        audits: current.audits + 1,
        completed: current.completed + (audit.status === "completed" ? 1 : 0),
        avgScore: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0,
        lastAudit: current.lastAudit && new Date(current.lastAudit) > new Date(audit.created_at) ? current.lastAudit : audit.created_at,
      })
    }
    return stats
  }, [audits, projects])

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const {
      data: { session },
    } = await supabaseGeo.auth.getSession()
    if (!session?.access_token) {
      setFeedback(isEn ? "Login required." : "Debes iniciar sesion.")
      setDeleting(false)
      return
    }
    const res = await fetch(`/api/geo/projects/${deleteTarget.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (res.ok) {
      setProjects((current) => current.filter((project) => project.id !== deleteTarget.id))
      setFeedback(isEn ? "Project deleted." : "Proyecto eliminado.")
      setDeleteTarget(null)
    } else {
      const payload = (await res.json().catch(() => ({}))) as { error?: string }
      setFeedback(payload.error || (isEn ? "Could not delete project." : "No se pudo eliminar el proyecto."))
    }
    setDeleting(false)
    setTimeout(() => setFeedback(null), 3500)
  }

  return (
    <>
      <AppHeader />
      <div className="p-6 space-y-6">
        {feedback && <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">{feedback}</div>}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">{isEn ? "Projects" : "Proyectos"}</h2>
            <p className="text-muted-foreground">{isEn ? "Manage brands, audits and GEO workflows." : "Gestiona marcas, auditorias y flujos GEO."}</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90" asChild>
            <Link href="/geo/app/projects/new"><Plus className="mr-2 h-4 w-4" />{isEn ? "New Project" : "Nuevo proyecto"}</Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="glass border-border"><CardContent className="p-5"><p className="text-sm text-muted-foreground">{isEn ? "Projects" : "Proyectos"}</p><p className="mt-2 text-3xl font-bold">{projects.length}</p></CardContent></Card>
          <Card className="glass border-border"><CardContent className="p-5"><p className="text-sm text-muted-foreground">{isEn ? "Audits" : "Auditorias"}</p><p className="mt-2 text-3xl font-bold">{audits.length}</p></CardContent></Card>
          <Card className="glass border-border"><CardContent className="p-5"><p className="text-sm text-muted-foreground">{isEn ? "Completed" : "Completadas"}</p><p className="mt-2 text-3xl font-bold">{audits.filter((audit) => audit.status === "completed").length}</p></CardContent></Card>
        </div>

        <Card className="glass border-border">
          <CardHeader><CardTitle>{isEn ? "Project Portfolio" : "Portafolio de proyectos"}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {!loading && projects.length === 0 && (
              <div className="rounded-xl border border-dashed border-border p-8 text-center">
                <p className="font-medium">{isEn ? "No projects yet" : "Sin proyectos todavia"}</p>
                <p className="mt-1 text-sm text-muted-foreground">{isEn ? "Create your first brand project to start measuring GEO visibility." : "Crea tu primer proyecto de marca para medir visibilidad GEO."}</p>
                <Button className="mt-4" asChild><Link href="/geo/app/projects/new">{isEn ? "Create Project" : "Crear proyecto"}</Link></Button>
              </div>
            )}
            {loading && <p className="text-sm text-muted-foreground">{isEn ? "Loading projects..." : "Cargando proyectos..."}</p>}
            {projects.map((project) => {
              const stats = projectStats.get(project.id) ?? { audits: 0, completed: 0, avgScore: 0, lastAudit: null }
              return (
                <div key={project.id} className="rounded-2xl border border-border bg-secondary/20 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">{project.company_name}</h3>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{project.country}</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{project.website_url} · {project.industry} · {project.language}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{isEn ? "Created" : "Creado"}: {new Date(project.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center sm:min-w-[320px]">
                      <div className="rounded-xl bg-background/50 p-3"><p className="text-xs text-muted-foreground">Audits</p><p className="font-bold">{stats.audits}</p></div>
                      <div className="rounded-xl bg-background/50 p-3"><p className="text-xs text-muted-foreground">Score</p><p className="font-bold">{stats.avgScore || "-"}</p></div>
                      <div className="rounded-xl bg-background/50 p-3"><p className="text-xs text-muted-foreground">{isEn ? "Done" : "Listas"}</p><p className="font-bold">{stats.completed}</p></div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" asChild><Link href={`/geo/app/projects/${project.id}`}><ExternalLink className="mr-2 h-4 w-4" />{isEn ? "Open" : "Abrir"}</Link></Button>
                    <Button size="sm" variant="outline" asChild><Link href="/geo/app/audits/new"><FileSearch className="mr-2 h-4 w-4" />{isEn ? "Run Audit" : "Ejecutar audit"}</Link></Button>
                    <Button size="sm" variant="outline" asChild><Link href={`/geo/app/projects/${project.id}/prompts`}><MessageSquare className="mr-2 h-4 w-4" />Prompts</Link></Button>
                    <Button size="sm" variant="outline" asChild><Link href={`/geo/app/projects/${project.id}/recommendations`}><BarChart3 className="mr-2 h-4 w-4" />{isEn ? "Actions" : "Acciones"}</Link></Button>
                    <Button size="sm" variant="outline" className="border-red-500/40 text-red-300 hover:bg-red-500/10" onClick={() => setDeleteTarget(project)}><Trash2 className="mr-2 h-4 w-4" />{isEn ? "Delete" : "Eliminar"}</Button>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl">
            <h3 className="text-lg font-semibold">{isEn ? "Delete project?" : "¿Eliminar proyecto?"}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{isEn ? "This removes the project and related GEO data. This action cannot be undone." : "Esto elimina el proyecto y datos GEO relacionados. Esta accion no se puede deshacer."}</p>
            <p className="mt-3 rounded-xl bg-secondary/40 p-3 text-sm font-medium">{deleteTarget.company_name}</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>{isEn ? "Cancel" : "Cancelar"}</Button>
              <Button className="bg-red-600 hover:bg-red-700" onClick={confirmDelete} disabled={deleting}>{deleting ? (isEn ? "Deleting..." : "Eliminando...") : (isEn ? "Delete" : "Eliminar")}</Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
