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

type ReportSnapshot = Record<string, unknown> & {
  project_name?: string
  base_url?: string
  geo_score?: number
  ai_visibility?: number
  spontaneous_visibility?: number
  assisted_visibility?: number
  competitive_visibility?: number
  citation_coverage?: number
  total_results?: number
  citations_count?: number
  prompts_won?: number
  prompts_lost?: number
  executive_summary?: string
  recommendations?: Array<unknown>
  generated_at?: string
  audit_id?: string
}

type ReportItem = {
  id: string
  name: string
  type: string
  date: string
  status: string
  geoScore: number | null
  pages: number | null
  format: string
  snapshot?: ReportSnapshot
}

const reportTypes = [
  {
    key: "monthly",
    title: "Reporte Mensual",
    description: "Resumen completo de rendimiento GEO",
    icon: Calendar,
    iconClass: "bg-primary/20 text-primary",
  },
  {
    key: "competitive",
    title: "Análisis Competitivo",
    description: "Comparación detallada con competencia",
    icon: BarChart3,
    iconClass: "bg-accent/20 text-accent",
  },
  {
    key: "snapshot",
    title: "Snapshot Rápido",
    description: "Estado actual de visibilidad IA",
    icon: Eye,
    iconClass: "bg-green-500/20 text-green-400",
  },
  {
    key: "export",
    title: "Export Datos",
    description: "Descarga datos en Excel/CSV",
    icon: FileSpreadsheet,
    iconClass: "bg-blue-500/20 text-blue-400",
  },
]

function numberLabel(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value)
  return Number.isFinite(numeric) ? String(Math.round(numeric)) : "0"
}

export default function ReportsPage() {
  const { t, locale } = useGeoI18n()
  const isEn = locale === "en"
  const [reportsLive, setReportsLive] = useState<ReportItem[]>([])
  const [snapshotsLive, setSnapshotsLive] = useState<Array<{ date: string; score: number; change: string }>>([])
  const [loadingReports, setLoadingReports] = useState(true)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [generatingType, setGeneratingType] = useState<string | null>(null)

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
            snapshot: r.snapshot as ReportSnapshot | undefined,
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

  const showFeedback = (message: string) => {
    setFeedback(message)
    setTimeout(() => setFeedback(null), 3000)
  }

  const generateReport = async (reportType = "snapshot") => {
    const {
      data: { session },
    } = await supabaseGeo.auth.getSession()
    if (!session?.access_token) {
      showFeedback(isEn ? "Login required to generate reports." : "Debes iniciar sesion para generar reportes.")
      return
    }
    setGeneratingType(reportType)
    const reportName = reportType === "monthly"
      ? isEn ? "Monthly GEO report" : "Reporte mensual GEO"
      : reportType === "competitive"
      ? isEn ? "Competitive GEO analysis" : "Análisis competitivo GEO"
      : isEn ? "Quick GEO snapshot" : "Snapshot rápido GEO"
    const res = await fetch("/api/geo/reports", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ report_type: reportType, name: reportName, format: "pdf" }),
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
        format: "PDF",
        snapshot: payload.data!.snapshot as ReportSnapshot | undefined,
      }, ...current])
      showFeedback(isEn ? "Report generated." : "Reporte generado.")
    } else showFeedback(payload.error || (isEn ? "Could not generate report." : "No se pudo generar el reporte."))
    setGeneratingType(null)
  }

  const exportCsv = () => {
    const rows = reportsLive.map((report) => ({
      name: report.name,
      type: report.type,
      date: report.date,
      status: report.status,
      geo_score: report.geoScore ?? "",
      spontaneous_visibility: report.snapshot?.spontaneous_visibility ?? report.snapshot?.ai_visibility ?? "",
      citations_count: report.snapshot?.citations_count ?? "",
      prompts_won: report.snapshot?.prompts_won ?? "",
      base_url: report.snapshot?.base_url ?? "",
    }))
    if (rows.length === 0) {
      showFeedback(isEn ? "Generate at least one report before exporting CSV." : "Genera al menos un reporte antes de exportar CSV.")
      return
    }
    const headers = Object.keys(rows[0])
    const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => `"${String(row[header as keyof typeof row] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "geo-reports.csv"
    link.click()
    URL.revokeObjectURL(url)
    showFeedback(isEn ? "CSV export started." : "Export CSV iniciado.")
  }

  const handleReportType = (key: string) => {
    if (key === "export") exportCsv()
    else void generateReport(key)
  }

  const shareReport = async (report: ReportItem) => {
    const text = `${report.name} · GEO Score ${report.geoScore ?? "N/A"}`
    await navigator.clipboard?.writeText(text).catch(() => undefined)
    showFeedback(isEn ? "Report summary copied." : "Resumen del reporte copiado.")
  }

  const downloadReport = async (report: ReportItem) => {
    const { jsPDF } = await import("jspdf/dist/jspdf.umd.min.js")
    const doc = new jsPDF({ unit: "pt", format: "a4" })
    const snapshot = report.snapshot ?? {}
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 44
    let y = 52

    const addText = (text: string, x: number, maxWidth = pageWidth - margin * 2, lineHeight = 14) => {
      const lines = doc.splitTextToSize(text, maxWidth) as string[]
      doc.text(lines, x, y)
      y += lines.length * lineHeight
    }

    const addMetric = (label: string, value: string, x: number, boxY: number) => {
      doc.setFillColor(247, 248, 255)
      doc.roundedRect(x, boxY, 122, 62, 10, 10, "F")
      doc.setTextColor(88, 93, 120)
      doc.setFontSize(9)
      doc.text(label, x + 12, boxY + 20)
      doc.setTextColor(25, 29, 43)
      doc.setFontSize(20)
      doc.setFont("helvetica", "bold")
      doc.text(value, x + 12, boxY + 45)
      doc.setFont("helvetica", "normal")
    }

    doc.setFillColor(12, 16, 31)
    doc.rect(0, 0, pageWidth, 132, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(22)
    doc.text("Botz GEO Executive Report", margin, y)
    y += 30
    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)
    doc.setTextColor(190, 198, 224)
    addText(String(snapshot.project_name ?? report.name), margin, pageWidth - margin * 2, 14)
    addText(String(snapshot.base_url ?? ""), margin, pageWidth - margin * 2, 14)
    y = 156

    addMetric("GEO Score", `${numberLabel(snapshot.geo_score)}/100`, margin, y)
    addMetric(isEn ? "Spontaneous" : "Espontanea", `${numberLabel(snapshot.spontaneous_visibility ?? snapshot.ai_visibility)}%`, margin + 136, y)
    addMetric(isEn ? "Win Rate" : "Win Rate", `${numberLabel(snapshot.competitive_visibility)}%`, margin + 272, y)
    addMetric(isEn ? "Sources" : "Fuentes", numberLabel(snapshot.citations_count), margin + 408, y)
    y += 100

    doc.setTextColor(25, 29, 43)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(15)
    doc.text(isEn ? "Executive Summary" : "Resumen Ejecutivo", margin, y)
    y += 22
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10.5)
    doc.setTextColor(70, 76, 98)
    addText(String(snapshot.executive_summary ?? (isEn ? "No executive summary available for this report." : "No hay resumen ejecutivo disponible para este reporte.")), margin, pageWidth - margin * 2, 14)
    y += 16

    doc.setTextColor(25, 29, 43)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(15)
    doc.text(isEn ? "Recommended Actions" : "Acciones Recomendadas", margin, y)
    y += 22
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10.5)
    const recommendations = Array.isArray(snapshot.recommendations) ? snapshot.recommendations.slice(0, 6) : []
    if (recommendations.length === 0) {
      addText(isEn ? "No recommendations were generated in this snapshot." : "No se generaron recomendaciones en este snapshot.", margin)
    } else {
      recommendations.forEach((item, index) => {
        const rec = item && typeof item === "object" ? item as Record<string, unknown> : {}
        const title = String(rec.title ?? rec.action_item ?? `${isEn ? "Action" : "Accion"} ${index + 1}`)
        const description = String(rec.description ?? rec.details ?? "")
        doc.setTextColor(25, 29, 43)
        doc.setFont("helvetica", "bold")
        addText(`${index + 1}. ${title}`, margin)
        if (description) {
          doc.setFont("helvetica", "normal")
          doc.setTextColor(70, 76, 98)
          addText(description, margin + 14, pageWidth - margin * 2 - 14)
        }
        y += 6
      })
    }

    const footerY = doc.internal.pageSize.getHeight() - 42
    doc.setDrawColor(230, 232, 240)
    doc.line(margin, footerY - 18, pageWidth - margin, footerY - 18)
    doc.setFontSize(8)
    doc.setTextColor(120, 126, 145)
    doc.text(`Audit ID: ${String(snapshot.audit_id ?? "N/A")}`, margin, footerY)
    doc.text(`Generated: ${snapshot.generated_at ? new Date(String(snapshot.generated_at)).toLocaleString() : report.date}`, pageWidth - margin - 180, footerY)
    doc.save(`${report.name.replace(/\s+/g, "-").toLowerCase()}.pdf`)
    setFeedback(isEn ? "PDF download started." : "Descarga PDF iniciada.")
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
            <Button variant="outline" className="border-border" onClick={() => showFeedback(isEn ? "Filters are not needed yet: reports are ordered by newest first." : "Aún no se necesitan filtros: los reportes están ordenados del más reciente al más antiguo.")}>
              <Filter className="w-4 h-4 mr-2" />
              {isEn ? "Filter" : "Filtrar"}
            </Button>
            <Button className="bg-primary hover:bg-primary/90 glow-primary" onClick={() => generateReport("snapshot")} disabled={generatingType !== null}>
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
              <Card className="glass border-border hover:border-primary/50 transition-all cursor-pointer group h-full" onClick={() => handleReportType(type.key)}>
                <CardContent className="min-h-[170px] p-5 sm:p-6 flex flex-col justify-center">
                  <div className="flex items-start justify-between mb-6">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${type.iconClass}`}>
                    <type.icon className="w-6 h-6" />
                    </div>
                    {generatingType === type.key && <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />}
                  </div>
                  <h3 className="text-xl font-semibold leading-tight mb-2">{type.title}</h3>
                  <p className="text-sm text-muted-foreground">{type.description}</p>
                  <p className="mt-4 text-xs text-primary">{type.key === "export" ? (isEn ? "Download CSV" : "Descargar CSV") : (isEn ? "Generate now" : "Generar ahora")}</p>
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
                       <Button className="mt-4" onClick={() => generateReport("snapshot")}>{isEn ? "Generate Report" : "Generar Reporte"}</Button>
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
                            <Button variant="outline" size="sm" className="border-border opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => shareReport(report)}>
                              <Share2 className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm" className="border-border opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => downloadReport(report)}>
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
