"use client"

import Link from "next/link"
import { FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AppHeader } from "@/GEO/components/geo/app-shell"
import { useGeoI18n } from "@/GEO/components/geo/i18n"

export default function ContentOpportunitiesPage() {
  const { locale } = useGeoI18n()
  const isEn = locale === "en"

  return (
    <>
      <AppHeader />
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold">{isEn ? "Content Opportunities" : "Oportunidades de contenido"}</h2>
          <p className="text-muted-foreground">
            {isEn ? "Content briefs will be created from real prompt and audit gaps." : "Los briefs de contenido se crearán desde brechas reales de prompts y auditorías."}
          </p>
        </div>
        <Card className="glass border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <FileText className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold">{isEn ? "No content opportunities yet" : "Sin oportunidades todavía"}</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              {isEn ? "When audits detect missing citations or weak answers, opportunities will appear here." : "Cuando las auditorías detecten citas faltantes o respuestas débiles, aparecerán oportunidades aquí."}
            </p>
            <Button className="mt-6 bg-primary hover:bg-primary/90" asChild>
              <Link href="/geo/app/prompts">{isEn ? "Review Prompts" : "Revisar prompts"}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
