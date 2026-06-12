"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ArrowLeft, CheckCircle2, Code2, ShieldCheck, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AppHeader } from "@/GEO/components/geo/app-shell"
import { useGeoI18n } from "@/GEO/components/geo/i18n"
import { supabaseGeo } from "@/app/geo/supabaseGeoClient"

type Fix = { id: string; title: string; problem: string; impact: string; implementation: string; priority: "high" | "medium" | "low"; status: "detected" | "needs_review" }

export default function TechnicalFixesPage() {
  const params = useParams<{ projectId: string }>()
  const { locale } = useGeoI18n()
  const isEn = locale === "en"
  const [fixes, setFixes] = useState<Fix[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const { data: { session } } = await supabaseGeo.auth.getSession()
        if (!session?.access_token) throw new Error(isEn ? "Login required." : "Debes iniciar sesion.")
        const res = await fetch(`/api/geo/projects/${params.projectId}/technical-fixes`, { headers: { Authorization: `Bearer ${session.access_token}` } })
        const json = (await res.json().catch(() => null)) as { data?: { fixes?: Fix[] }; error?: string } | null
        if (!res.ok || !json?.data) throw new Error(json?.error || (isEn ? "Could not load technical fixes." : "No se pudieron cargar fixes técnicos."))
        if (mounted) setFixes(json.data.fixes ?? [])
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : isEn ? "Could not load technical fixes." : "No se pudieron cargar fixes técnicos.")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void load()
    return () => { mounted = false }
  }, [isEn, params.projectId])

  return <><AppHeader /><div className="p-6 space-y-6"><div><Button variant="ghost" className="mb-2 px-0 text-muted-foreground hover:text-foreground" asChild><Link href={`/geo/app/projects/${params.projectId}`}><ArrowLeft className="mr-2 h-4 w-4" />{isEn ? "Back to project" : "Volver al proyecto"}</Link></Button><h2 className="text-2xl font-bold">{isEn ? "GEO Technical Fixes" : "Fixes técnicos GEO"}</h2><p className="text-muted-foreground">{isEn ? "Structural checklist for AI visibility, schema, authority and answerability." : "Checklist estructural para visibilidad IA, schema, autoridad y respuestas claras."}</p></div><Card className="glass border-primary/30 bg-primary/5"><CardContent className="flex items-center justify-between p-6"><div><h3 className="text-xl font-semibold">{isEn ? "Implementation checklist" : "Checklist de implementación"}</h3><p className="mt-2 text-sm text-muted-foreground">{isEn ? "Use this as the technical scope for dev/content teams." : "Usa esto como alcance técnico para equipos de desarrollo/contenido."}</p></div><Wrench className="h-10 w-10 text-primary" /></CardContent></Card>{loading && <Card className="glass border-border"><CardContent className="py-14 text-center text-muted-foreground">{isEn ? "Loading fixes..." : "Cargando fixes..."}</CardContent></Card>}{!loading && error && <Card className="glass border-border"><CardContent className="py-14 text-center text-muted-foreground">{error}</CardContent></Card>}<div className="grid gap-4 md:grid-cols-2">{fixes.map((fix) => <Card key={fix.id} className={`glass border-border ${fix.status === "detected" ? "border-primary/40" : ""}`}><CardContent className="p-5"><div className="mb-4 flex items-start justify-between gap-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">{fix.status === "detected" ? <ShieldCheck className="h-5 w-5" /> : <Code2 className="h-5 w-5" />}</div><div><h3 className="font-semibold">{fix.title}</h3><p className="text-xs text-muted-foreground">{fix.status === "detected" ? (isEn ? "Detected from audit signals" : "Detectado por señales de auditoría") : (isEn ? "Needs review" : "Requiere revisión")}</p></div></div><span className={`rounded-full px-2.5 py-1 text-xs ${priorityClass(fix.priority)}`}>{priorityLabel(fix.priority, isEn)}</span></div><div className="space-y-3 text-sm"><p><strong>{isEn ? "Problem" : "Problema"}:</strong> <span className="text-muted-foreground">{fix.problem}</span></p><p><strong>{isEn ? "Expected impact" : "Impacto esperado"}:</strong> <span className="text-muted-foreground">{fix.impact}</span></p><p><strong>{isEn ? "Implementation" : "Implementación"}:</strong> <span className="text-muted-foreground">{fix.implementation}</span></p></div></CardContent></Card>)}</div>{!loading && !error && fixes.length === 0 && <Card className="glass border-border"><CardContent className="py-14 text-center text-muted-foreground">{isEn ? "No technical fixes available yet." : "Aún no hay fixes técnicos disponibles."}</CardContent></Card>}</div></>
}

function priorityLabel(priority: Fix["priority"], isEn: boolean) { return priority === "high" ? (isEn ? "High" : "Alta") : priority === "low" ? (isEn ? "Low" : "Baja") : (isEn ? "Medium" : "Media") }
function priorityClass(priority: Fix["priority"]) { return priority === "high" ? "bg-red-500/15 text-red-300" : priority === "low" ? "bg-green-500/15 text-green-300" : "bg-yellow-500/15 text-yellow-300" }
