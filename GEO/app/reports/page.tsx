"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AppHeader } from "@/components/geo/app-shell"
import {
  Download,
  FileText,
  Calendar,
  Clock,
  Filter,
  Plus,
  Eye,
  Share2,
  MoreHorizontal,
  TrendingUp,
  BarChart3,
  FileSpreadsheet,
  Printer,
} from "lucide-react"
import { useGeoI18n } from "@/GEO/components/geo/i18n"
import { supabaseGeo } from "@/app/geo/supabaseGeoClient"
import { useEffect, useState } from "react"
import Link from "next/link"

const reportTypes = [
  {
    title: "Reporte Mensual",
    description: "Resumen completo de rendimiento GEO",
    icon: Calendar,
    color: "primary",
  },
  {
    title: "Análisis Competitivo",
    description: "Comparación detallada con competencia",
    icon: BarChart3,
    color: "accent",
  },
  {
    title: "Snapshot Rápido",
    description: "Estado actual de visibilidad IA",
    icon: Eye,
    color: "green-400",
  },
  {
    title: "Export Datos",
    description: "Descarga datos en Excel/CSV",
    icon: FileSpreadsheet,
    color: "blue-400",
  },
]

export default function ReportsPage() {
  const { t, locale } = useGeoI18n()
  const isEn = locale === "en"
  const [reportsLive, setReportsLive] = useState<Array<{ id: string; name: string; type: string; date: string; status: string; geoScore: number | null; pages: number | null; format: string; snapshot?: unknown }>>([])
  const [snapshotsLive, setSnapshotsLive] = useState<Array<{ date: string; score: number; change: string }>>([])
  const [loadingReports, setLoadingReports] = useState(true)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const {
        data: { session },
      } = await supabaseGeo.auth.getSession()
      if (!session?.access_token) {
        setLoadingReports(false)
        return
      }
      const [reportsRes, auditsRes] = await Promise.all([
        fetch("/api/geo/reports", { headers: { Authorization: `Bearer ${session.access_token}` } }),
        fetch("/api/geo/audits", { headers: { Authorization: `Bearer ${session.access_token}` } }),
      ])
      if (!mounted) return

      if (reportsRes.ok) {
        const rj = (await reportsRes.json()) as { data?: Array<{ id: string; name: string; report_type: string; status: string; created_at: string; snapshot?: Record<string, unknown> }> }
        if ((rj.data ?? []).length > 0) {
          setReportsLive((rj.data ?? []).map((r) => ({
            id: r.id,
            name: r.name,
            type: r.report_type,
            date: new Date(r.created_at).toLocaleDateString(),
            status: r.status,
            geoScore: typeof r.snapshot?.geo_score === "number" ? r.snapshot.geo_score : null,
            pages: null,
            format: "PDF",
            snapshot: (r as { snapshot?: unknown }).snapshot,
          })))
        }
      }

      if (auditsRes.ok) {
        const aj = (await auditsRes.json()) as { data?: { audits?: Array<{ created_at: string; final_score: number | null }> } }
        const nextSnapshots = (aj.data?.audits ?? []).slice(0, 5).map((a, i) => ({
          date: new Date(a.created_at).toLocaleDateString(),
          score: a.final_score ?? 0,
          change: i % 2 === 0 ? "+1" : "-1",
        }))
        if (nextSnapshots.length > 0) setSnapshotsLive(nextSnapshots)
      }
      setLoadingReports(false)
    }
    void load()
    return () => {
      mounted = false
    }
  }, [])

  const localizedReportTypes = reportTypes.map((type, i) => {
    if (!isEn) return type
    const en = [
      { title: "Monthly Report", description: "Complete GEO performance summary" },
      { title: "Competitive Analysis", description: "Detailed comparison against competition" },
      { title: "Quick Snapshot", description: "Current AI visibility status" },
      { title: "Export Data", description: "Download data as Excel/CSV" },
    ][i]
    return { ...type, ...en }
  })

  const generateReport = async () => {
    const {
      data: { session },
    } = await supabaseGeo.auth.getSession()
    if (!session?.access_token) {
      setFeedback(isEn ? "Login required to generate reports." : "Debes iniciar sesion para generar reportes.")
      setTimeout(() => setFeedback(null), 3000)
      return
    }
    const res = await fetch("/api/geo/reports", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ report_type: "snapshot", name: isEn ? "On-demand report" : "Reporte bajo demanda", format: "pdf" }),
    })
    const payload = (await res.json()) as { mode?: string; data?: { id: string; name: string; report_type: string; status: string; created_at: string; snapshot?: Record<string, unknown> }; error?: string }
    if (res.ok && payload.mode === "live" && payload.data) {
      setReportsLive((current) => [{
        id: payload.data!.id,
        name: payload.data!.name,
        type: payload.data!.report_type,
        date: new Date(payload.data!.created_at).toLocaleDateString(),
        status: payload.data!.status,
        geoScore: typeof payload.data!.snapshot?.geo_score === "number" ? payload.data!.snapshot.geo_score : null,
        pages: null,
        format: "JSON",
        snapshot: payload.data!.snapshot,
      }, ...current])
      setFeedback(isEn ? "Report generated." : "Reporte generado.")
    } else setFeedback(payload.error || (isEn ? "Could not generate report." : "No se pudo generar el reporte."))
    setTimeout(() => setFeedback(null), 3000)
  }

  const downloadReport = (report: { name: string; snapshot?: unknown }) => {
    const payload = JSON.stringify(report.snapshot ?? { name: report.name, note: "No snapshot payload available." }, null, 2)
    const blob = new Blob([payload], { type: "application/json;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${report.name.replace(/\s+/g, "-").toLowerCase()}.json`
    a.click()
    URL.revokeObjectURL(url)
    setFeedback(isEn ? "Download started." : "Descarga iniciada.")
    setTimeout(() => setFeedback(null), 3000)
  }

  return (
    <>
      <AppHeader />
        <div className="p-6 space-y-6">
        {feedback && <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">{feedback}</div>}
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
              <h2 className="text-2xl font-bold">{t("reportsTitle")}</h2>
            <p className="text-muted-foreground">{isEn ? "Generate and download reports for your AI visibility" : "Genera y descarga reportes de tu visibilidad IA"}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="border-border">
              <Filter className="w-4 h-4 mr-2" />
              {isEn ? "Filter" : "Filtrar"}
            </Button>
            <Button className="bg-primary hover:bg-primary/90 glow-primary" onClick={generateReport}>
              <Plus className="w-4 h-4 mr-2" />
              {isEn ? "Generate Report" : "Generar Reporte"}
            </Button>
          </div>
        </div>

        {/* Report Types */}
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          {localizedReportTypes.map((type, index) => (
            <motion.div
              key={type.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card className="glass border-border hover:border-primary/50 transition-all cursor-pointer group h-full">
                <CardContent className="min-h-[170px] p-5 sm:p-6 flex flex-col justify-center">
                  <div className="flex items-start justify-between mb-6">
                    <div className={`w-12 h-12 rounded-2xl bg-${type.color}/20 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <type.icon className={`w-6 h-6 text-${type.color}`} />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold leading-tight mb-2">{type.title}</h3>
                  <p className="text-sm text-muted-foreground">{type.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Reports List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="lg:col-span-2"
          >
            <Card className="glass border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-semibold">{isEn ? "Generated Reports" : "Reportes Generados"}</CardTitle>
                <Button variant="ghost" size="sm" className="text-primary" asChild>
                  <Link href="/geo/app/audits">{isEn ? "View full history" : "Ver historial completo"}</Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {!loadingReports && reportsLive.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border p-8 text-center">
                      <p className="text-base font-medium">{isEn ? "No reports yet" : "Sin reportes aun"}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{isEn ? "Generate your first report from current audits." : "Genera tu primer reporte desde las auditorias actuales."}</p>
                      <Button className="mt-4" onClick={generateReport}>{isEn ? "Generate Report" : "Generar Reporte"}</Button>
                    </div>
                  )}
                  {reportsLive.map((report) => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          report.format === "PDF" 
                            ? "bg-red-500/20 text-red-400" 
                            : "bg-green-500/20 text-green-400"
                        }`}>
                          <FileText className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-medium">{report.name}</h4>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {report.date}
                            </span>
                            {report.pages && (
                             <span>{report.pages} {isEn ? "pages" : "paginas"}</span>
                            )}
                            <span className="px-2 py-0.5 rounded bg-secondary text-xs">
                              {report.format}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {report.status === "ready" ? (
                          <>
                            {report.geoScore && (
                              <div className="text-right mr-4">
                                <p className="text-sm text-muted-foreground">GEO Score</p>
                                <p className="font-bold text-lg">{report.geoScore}</p>
                              </div>
                            )}
                            <Button variant="outline" size="sm" className="border-border opacity-0 group-hover:opacity-100 transition-opacity">
                              <Share2 className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm" className="border-border opacity-0 group-hover:opacity-100 transition-opacity">
                              <Printer className="w-4 h-4" />
                            </Button>
                             <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={() => downloadReport(report)}>
                               <Download className="w-4 h-4 mr-2" />
                               {isEn ? "Download" : "Descargar"}
                            </Button>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                             <span className="text-sm">{isEn ? "Processing..." : "Procesando..."}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* GEO Snapshots */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <Card className="glass border-border h-full">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">{isEn ? "GEO Snapshots" : "Snapshots GEO"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(snapshotsLive.map((snapshot) => ({ ...snapshot, date: isEn ? snapshot.date.replace("Mayo", "May").replace("Abril", "April") : snapshot.date }))).map((snapshot, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{snapshot.date}</p>
                         <p className="text-xs text-muted-foreground">{isEn ? "Automatic snapshot" : "Snapshot automatico"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{snapshot.score}</p>
                      <p className={`text-xs ${snapshot.change.startsWith("+") ? "text-green-400" : "text-red-400"}`}>
                        {snapshot.change}
                      </p>
                    </div>
                  </div>
                ))}

                <Button variant="outline" className="w-full border-border mt-4" asChild>
                  <Link href="/geo/app/audits">
                    <Eye className="w-4 h-4 mr-2" />
                    {isEn ? "View all snapshots" : "Ver todos los snapshots"}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          <Card className="glass border-border bg-gradient-to-r from-primary/10 to-accent/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                   <h3 className="text-lg font-semibold mb-1">{isEn ? "Schedule Automatic Reports" : "Programar Reportes Automaticos"}</h3>
                   <p className="text-muted-foreground">{isEn ? "Receive weekly or monthly reports directly in your email" : "Recibe reportes semanales o mensuales directamente en tu email"}</p>
                </div>
                <Button className="bg-primary hover:bg-primary/90" asChild>
                  <Link href="/geo/app/automations">{isEn ? "Set Automation" : "Configurar Automatizacion"}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  )
}
