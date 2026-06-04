"use client"

import Link from "next/link"
import { Lightbulb } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AppHeader } from "@/GEO/components/geo/app-shell"
import { useGeoI18n } from "@/GEO/components/geo/i18n"

export default function RecommendationsPage() {
  const { locale } = useGeoI18n()
  const isEn = locale === "en"

  return (
    <>
      <AppHeader />
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold">{isEn ? "Recommendations" : "Recomendaciones"}</h2>
          <p className="text-muted-foreground">
            {isEn ? "Actionable recommendations will appear after completed audits." : "Las recomendaciones accionables aparecerán después de auditorías completadas."}
          </p>
        </div>
        <Card className="glass border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Lightbulb className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold">{isEn ? "No recommendations yet" : "Sin recomendaciones todavía"}</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              {isEn ? "Run a GEO audit to generate prioritized recommendations from real audit evidence." : "Ejecuta una auditoría GEO para generar recomendaciones priorizadas desde evidencia real."}
            </p>
            <Button className="mt-6 bg-primary hover:bg-primary/90" asChild>
              <Link href="/geo/app/audits/new">{isEn ? "Run GEO Audit" : "Ejecutar auditoría GEO"}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
