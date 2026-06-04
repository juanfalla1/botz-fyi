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

const reports = [
  {
    id: 1,
    name: "GEO Performance Mensual",
    type: "monthly",
    date: "Mayo 2024",
    status: "ready",
    geoScore: 78,
    pages: 24,
    format: "PDF",
  },
  {
    id: 2,
    name: "Competitor Analysis Q2",
    type: "quarterly",
    date: "Q2 2024",
    status: "ready",
    geoScore: 75,
    pages: 42,
    format: "PDF",
  },
  {
    id: 3,
    name: "AI Citation Snapshot",
    type: "snapshot",
    date: "15 Mayo 2024",
    status: "ready",
    geoScore: 78,
    pages: 12,
    format: "PDF",
  },
  {
    id: 4,
    name: "Weekly Performance",
    type: "weekly",
    date: "Semana 20",
    status: "processing",
    geoScore: null,
    pages: null,
    format: "PDF",
  },
  {
    id: 5,
    name: "Brand Mentions Report",
    type: "custom",
    date: "10 Mayo 2024",
    status: "ready",
    geoScore: 72,
    pages: 18,
    format: "Excel",
  },
]

const snapshots = [
  { date: "15 Mayo", score: 78, change: "+3" },
  { date: "8 Mayo", score: 75, change: "+2" },
  { date: "1 Mayo", score: 73, change: "-1" },
  { date: "24 Abril", score: 74, change: "+4" },
  { date: "17 Abril", score: 70, change: "+1" },
]

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
  return (
    <>
      <AppHeader />
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Reportes</h2>
            <p className="text-muted-foreground">Genera y descarga reportes de tu visibilidad IA</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="border-border">
              <Filter className="w-4 h-4 mr-2" />
              Filtrar
            </Button>
            <Button className="bg-primary hover:bg-primary/90 glow-primary">
              <Plus className="w-4 h-4 mr-2" />
              Generar Reporte
            </Button>
          </div>
        </div>

        {/* Report Types */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {reportTypes.map((type, index) => (
            <motion.div
              key={type.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card className="glass border-border hover:border-primary/50 transition-all cursor-pointer group">
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-xl bg-${type.color}/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <type.icon className={`w-6 h-6 text-${type.color}`} />
                  </div>
                  <h3 className="font-semibold mb-1">{type.title}</h3>
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
                <CardTitle className="text-lg font-semibold">Reportes Generados</CardTitle>
                <Button variant="ghost" size="sm" className="text-primary">
                  Ver historial completo
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reports.map((report) => (
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
                              <span>{report.pages} páginas</span>
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
                            <Button size="sm" className="bg-primary hover:bg-primary/90">
                              <Download className="w-4 h-4 mr-2" />
                              Descargar
                            </Button>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm">Procesando...</span>
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
                <CardTitle className="text-lg font-semibold">Snapshots GEO</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {snapshots.map((snapshot, index) => (
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
                        <p className="text-xs text-muted-foreground">Snapshot automático</p>
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

                <Button variant="outline" className="w-full border-border mt-4">
                  <Eye className="w-4 h-4 mr-2" />
                  Ver todos los snapshots
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
                  <h3 className="text-lg font-semibold mb-1">Programar Reportes Automáticos</h3>
                  <p className="text-muted-foreground">Recibe reportes semanales o mensuales directamente en tu email</p>
                </div>
                <Button className="bg-primary hover:bg-primary/90">
                  Configurar Automatización
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  )
}
