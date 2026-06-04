"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AppHeader } from "@/GEO/components/geo/app-shell"
import { useGeoI18n } from "@/GEO/components/geo/i18n"
import { supabaseGeo } from "@/app/geo/supabaseGeoClient"

export default function NewProjectPage() {
  const router = useRouter()
  const { locale } = useGeoI18n()
  const isEn = locale === "en"
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setFeedback(null)
    const form = new FormData(event.currentTarget)
    const payload = {
      company_name: String(form.get("company_name") ?? "").trim(),
      website_url: String(form.get("website_url") ?? "").trim(),
      country: String(form.get("country") ?? "").trim(),
      language: String(form.get("language") ?? "").trim(),
      industry: String(form.get("industry") ?? "").trim(),
      business_goal: String(form.get("business_goal") ?? "").trim(),
      competitors: [],
    }
    try {
      const {
        data: { session },
      } = await supabaseGeo.auth.getSession()
      if (!session?.access_token) throw new Error(isEn ? "Sign in to create a project." : "Inicia sesión para crear un proyecto.")
      const res = await fetch("/api/geo/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(isEn ? "Could not create project." : "No se pudo crear el proyecto.")
      const json = (await res.json()) as { data?: { id?: string }; mode?: string }
      if (json.mode !== "live") throw new Error(isEn ? "Project creation is unavailable in demo mode." : "La creación de proyectos no está disponible en modo demo.")
      router.push(json.data?.id ? `/geo/app/projects/${json.data.id}` : "/geo/app")
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : isEn ? "Could not create project." : "No se pudo crear el proyecto.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <AppHeader />
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold">{isEn ? "Create GEO Project" : "Crear proyecto GEO"}</h2>
          <p className="text-muted-foreground">{isEn ? "Register a brand to start monitoring AI visibility." : "Registra una marca para empezar a monitorear visibilidad IA."}</p>
        </div>
        {feedback && <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">{feedback}</div>}
        <Card className="glass border-border max-w-3xl">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <input name="company_name" required placeholder={isEn ? "Company name" : "Nombre de empresa"} className="rounded-xl border border-border bg-secondary/40 px-4 py-3" />
              <input name="website_url" required type="url" placeholder="https://example.com" className="rounded-xl border border-border bg-secondary/40 px-4 py-3" />
              <input name="country" required placeholder={isEn ? "Country" : "País"} className="rounded-xl border border-border bg-secondary/40 px-4 py-3" />
              <input name="language" required placeholder={isEn ? "Language code, e.g. en" : "Código de idioma, ej. es"} className="rounded-xl border border-border bg-secondary/40 px-4 py-3" />
              <input name="industry" required placeholder={isEn ? "Industry" : "Industria"} className="rounded-xl border border-border bg-secondary/40 px-4 py-3" />
              <textarea name="business_goal" required placeholder={isEn ? "Business goal" : "Objetivo comercial"} className="sm:col-span-2 rounded-xl border border-border bg-secondary/40 px-4 py-3" rows={4} />
              <Button disabled={saving} className="sm:col-span-2 bg-primary hover:bg-primary/90">
                {saving ? (isEn ? "Saving..." : "Guardando...") : isEn ? "Save project" : "Guardar proyecto"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
