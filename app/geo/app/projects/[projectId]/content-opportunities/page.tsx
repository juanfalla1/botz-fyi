"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ArrowLeft, FileText, ListChecks, Search, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AppHeader } from "@/GEO/components/geo/app-shell"
import { useGeoI18n } from "@/GEO/components/geo/i18n"
import { supabaseGeo } from "@/app/geo/supabaseGeoClient"

type Opportunity = {
  id: string
  title: string
  target_prompt: string
  intent: string
  recommended_format: string
  priority: "high" | "medium" | "low"
  brief: string
  why_it_matters: string
  suggested_outline: string[]
}

export default function ContentOpportunitiesPage() {
  const params = useParams<{ projectId: string }>()
  const { locale } = useGeoI18n()
  const isEn = locale === "en"
  const [items, setItems] = useState<Opportunity[]>([])
  const [projectName, setProjectName] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const { data: { session } } = await supabaseGeo.auth.getSession()
        if (!session?.access_token) throw new Error(isEn ? "Login required." : "Debes iniciar sesion.")
        const res = await fetch(`/api/geo/projects/${params.projectId}/content-opportunities`, { headers: { Authorization: `Bearer ${session.access_token}` } })
        const json = (await res.json().catch(() => null)) as { data?: { project?: { company_name?: string }; opportunities?: Opportunity[] }; error?: string } | null
        if (!res.ok || !json?.data) throw new Error(json?.error || (isEn ? "Could not load opportunities." : "No se pudieron cargar oportunidades."))
        if (mounted) {
          setItems(json.data.opportunities ?? [])
          setProjectName(json.data.project?.company_name ?? "")
        }
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : isEn ? "Could not load opportunities." : "No se pudieron cargar oportunidades.")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void load()
    return () => { mounted = false }
  }, [isEn, params.projectId])

  return (
    <>
      <AppHeader />
      <div className="p-6 space-y-6">
        <div>
          <Button variant="ghost" className="mb-2 px-0 text-muted-foreground hover:text-foreground" asChild>
            <Link href={`/geo/app/projects/${params.projectId}`}><ArrowLeft className="mr-2 h-4 w-4" />{isEn ? "Back to project" : "Volver al proyecto"}</Link>
          </Button>
          <h2 className="text-2xl font-bold">{isEn ? "Content Gap Analysis" : "Análisis de brechas de contenido"}</h2>
          <p className="text-muted-foreground">{isEn ? "Prioritized content assets based on real prompt and audit gaps." : "Activos de contenido priorizados desde brechas reales de prompts y auditorías."}</p>
        </div>

        <Card className="glass border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-wide text-primary">{projectName || (isEn ? "Project" : "Proyecto")}</p>
              <h3 className="mt-1 text-xl font-semibold">{isEn ? "What content should be created next?" : "¿Qué contenido se debe crear ahora?"}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{isEn ? "Use these briefs to produce pages, FAQs and comparison assets that AI engines can cite." : "Usa estos briefs para producir páginas, FAQs y comparativas que los motores de IA puedan citar."}</p>
            </div>
            <Sparkles className="h-10 w-10 text-primary" />
          </CardContent>
        </Card>

        {loading && <Card className="glass border-border"><CardContent className="py-14 text-center text-muted-foreground">{isEn ? "Loading opportunities..." : "Cargando oportunidades..."}</CardContent></Card>}
        {!loading && error && <Card className="glass border-border"><CardContent className="py-14 text-center text-muted-foreground">{error}</CardContent></Card>}
        {!loading && !error && items.length === 0 && <EmptyState isEn={isEn} />}

        <div className="grid gap-4">
          {items.map((item) => (
            <Card key={item.id} className={`glass border-border ${item.priority === "high" ? "border-primary/40" : ""}`}>
              <CardContent className="grid gap-5 p-5 lg:grid-cols-[1fr_360px]">
                <div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${priorityClass(item.priority)}`}>{priorityLabel(item.priority, isEn)}</span>
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">{item.recommended_format.replace(/_/g, " ")}</span>
                  </div>
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.brief}</p>
                  <div className="mt-4 rounded-xl border border-border bg-secondary/20 p-4">
                    <p className="mb-1 flex items-center gap-2 text-sm font-medium"><Search className="h-4 w-4 text-primary" />Prompt / gap</p>
                    <p className="text-sm text-muted-foreground">{item.target_prompt}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-background/40 p-4">
                  <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><ListChecks className="h-4 w-4 text-primary" />{isEn ? "Suggested outline" : "Estructura sugerida"}</p>
                  <div className="space-y-2">
                    {item.suggested_outline.map((step, index) => <p key={step} className="text-sm text-muted-foreground"><span className="mr-2 text-primary">{index + 1}.</span>{step}</p>)}
                  </div>
                  <p className="mt-4 text-xs text-muted-foreground">{item.why_it_matters}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  )
}

function EmptyState({ isEn }: { isEn: boolean }) {
  return <Card className="glass border-border"><CardContent className="flex flex-col items-center justify-center py-16 text-center"><div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary"><FileText className="h-8 w-8" /></div><h3 className="text-lg font-semibold">{isEn ? "No content gaps yet" : "Sin brechas de contenido todavía"}</h3><p className="mt-2 max-w-md text-sm text-muted-foreground">{isEn ? "Run a completed audit to generate prioritized content opportunities from real evidence." : "Ejecuta una auditoría completada para generar oportunidades priorizadas desde evidencia real."}</p></CardContent></Card>
}

function priorityLabel(priority: Opportunity["priority"], isEn: boolean) {
  if (priority === "high") return isEn ? "High priority" : "Alta prioridad"
  if (priority === "low") return isEn ? "Low priority" : "Baja prioridad"
  return isEn ? "Medium priority" : "Prioridad media"
}

function priorityClass(priority: Opportunity["priority"]) {
  if (priority === "high") return "bg-red-500/15 text-red-300"
  if (priority === "low") return "bg-green-500/15 text-green-300"
  return "bg-yellow-500/15 text-yellow-300"
}
