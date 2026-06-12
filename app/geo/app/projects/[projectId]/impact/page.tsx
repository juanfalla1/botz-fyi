"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ArrowLeft, BarChart3, Eye, Quote, Target, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AppHeader } from "@/GEO/components/geo/app-shell"
import { useGeoI18n } from "@/GEO/components/geo/i18n"
import { supabaseGeo } from "@/app/geo/supabaseGeoClient"

type Snapshot = { audit_id: string; date: string; geo_score: number; ai_visibility: number; citations_count: number; prompts_won: number; prompts_lost: number }
type Delta = Omit<Snapshot, "audit_id" | "date">

export default function ImpactPage() {
  const params = useParams<{ projectId: string }>()
  const { locale } = useGeoI18n()
  const isEn = locale === "en"
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [delta, setDelta] = useState<Delta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const { data: { session } } = await supabaseGeo.auth.getSession()
        if (!session?.access_token) throw new Error(isEn ? "Login required." : "Debes iniciar sesion.")
        const res = await fetch(`/api/geo/projects/${params.projectId}/impact`, { headers: { Authorization: `Bearer ${session.access_token}` } })
        const json = (await res.json().catch(() => null)) as { data?: { snapshots?: Snapshot[]; delta?: Delta | null }; error?: string } | null
        if (!res.ok || !json?.data) throw new Error(json?.error || (isEn ? "Could not load impact." : "No se pudo cargar impacto."))
        if (mounted) { setSnapshots(json.data.snapshots ?? []); setDelta(json.data.delta ?? null) }
      } catch (err) { if (mounted) setError(err instanceof Error ? err.message : isEn ? "Could not load impact." : "No se pudo cargar impacto.") }
      finally { if (mounted) setLoading(false) }
    }
    void load(); return () => { mounted = false }
  }, [isEn, params.projectId])

  const latest = snapshots[snapshots.length - 1]
  return <><AppHeader /><div className="p-6 space-y-6"><div><Button variant="ghost" className="mb-2 px-0 text-muted-foreground hover:text-foreground" asChild><Link href={`/geo/app/projects/${params.projectId}`}><ArrowLeft className="mr-2 h-4 w-4" />{isEn ? "Back to project" : "Volver al proyecto"}</Link></Button><h2 className="text-2xl font-bold">{isEn ? "Impact Tracking" : "Seguimiento de impacto"}</h2><p className="text-muted-foreground">{isEn ? "Before/after movement from completed GEO audits." : "Movimiento antes/después desde auditorías GEO completadas."}</p></div>{loading && <Card className="glass border-border"><CardContent className="py-14 text-center text-muted-foreground">{isEn ? "Loading impact..." : "Cargando impacto..."}</CardContent></Card>}{!loading && error && <Card className="glass border-border"><CardContent className="py-14 text-center text-muted-foreground">{error}</CardContent></Card>}{!loading && !error && snapshots.length === 0 && <Card className="glass border-border"><CardContent className="py-14 text-center text-muted-foreground">{isEn ? "Run at least one completed audit to start tracking impact." : "Ejecuta al menos una auditoría completada para iniciar seguimiento de impacto."}</CardContent></Card>}{latest && <><div className="grid gap-4 md:grid-cols-4"><Metric icon={TrendingUp} label="GEO Score" value={`${latest.geo_score}/100`} delta={delta?.geo_score} /><Metric icon={Eye} label={isEn ? "AI Visibility" : "Visibilidad IA"} value={`${latest.ai_visibility}%`} delta={delta?.ai_visibility} /><Metric icon={Quote} label={isEn ? "Citations" : "Citaciones"} value={String(latest.citations_count)} delta={delta?.citations_count} /><Metric icon={Target} label={isEn ? "Prompts Won" : "Prompts ganados"} value={String(latest.prompts_won)} delta={delta?.prompts_won} /></div><Card className="glass border-border"><CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" />{isEn ? "Audit trend" : "Tendencia por auditoría"}</CardTitle></CardHeader><CardContent className="space-y-3">{snapshots.map((item) => <Link key={item.audit_id} href={`/geo/app/audits/${item.audit_id}`} className="grid gap-3 rounded-xl border border-border bg-secondary/20 p-4 text-sm transition-colors hover:bg-secondary/35 md:grid-cols-[160px_1fr_120px_120px]"><span className="text-muted-foreground">{new Date(item.date).toLocaleDateString(locale === "en" ? "en-US" : "es-ES")}</span><div className="h-3 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${Math.max(0, Math.min(100, item.geo_score))}%` }} /></div><span>{item.geo_score}/100</span><span className="text-muted-foreground">{item.prompts_won} wins</span></Link>)}</CardContent></Card></>}</div></>
}

function Metric({ icon: Icon, label, value, delta }: { icon: typeof TrendingUp; label: string; value: string; delta?: number }) { return <Card className="glass border-border"><CardContent className="p-5"><div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary"><Icon className="h-5 w-5" /></div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-3xl font-bold">{value}</p>{typeof delta === "number" && <p className={`mt-2 text-xs ${delta >= 0 ? "text-green-400" : "text-red-300"}`}>{delta >= 0 ? "+" : ""}{delta}</p>}</CardContent></Card> }
