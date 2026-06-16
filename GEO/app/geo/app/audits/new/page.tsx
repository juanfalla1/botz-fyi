"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { AppHeader } from "@/components/geo/app-shell"
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Globe,
  Building2,
  Target,
  Zap,
  Bot,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useGeoI18n } from "@/GEO/components/geo/i18n"
import { supabaseGeo } from "@/app/geo/supabaseGeoClient"

const industries = [
  "E-commerce",
  "SaaS / Software",
  "Fintech",
  "Healthcare",
  "Education",
  "Travel & Tourism",
  "Real Estate",
  "Marketing & Advertising",
  "Media & Entertainment",
  "Retail",
  "Manufacturing",
  "Other",
]

const countries = [
  "España",
  "México",
  "Argentina",
  "Colombia",
  "Canadá",
  "Chile",
  "Estados Unidos",
  "Reino Unido",
  "Alemania",
  "Francia",
  "Brasil",
]

const languages = [
  "Español",
  "Inglés",
  "Portugués",
  "Francés",
  "Alemán",
  "Italiano",
]

const engines = [
  { id: "openai", name: "ChatGPT", icon: "🤖", description: "OpenAI GPT-4" },
  { id: "gemini", name: "Gemini", icon: "✨", description: "Google AI" },
  { id: "perplexity", name: "Perplexity", icon: "🔍", description: "AI Search" },
  { id: "ai_overviews", name: "AI Overviews", icon: "🌐", description: "Google AI Overviews via SerpApi" },
]

export default function NewAuditPage() {
  const router = useRouter()
  const { locale } = useGeoI18n()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [brand, setBrand] = useState("")
  const [website, setWebsite] = useState("")
  const [country, setCountry] = useState("Colombia")
  const [language, setLanguage] = useState("es")
  const [industry, setIndustry] = useState("E-commerce")
  const [competitors, setCompetitors] = useState(["", "", "", "", ""])
  const [selectedEngines, setSelectedEngines] = useState(["openai", "gemini", "perplexity"])
  const [submitError, setSubmitError] = useState("")

  const handleCreateAudit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError("")

    const cleanBrand = brand.trim()
    const cleanWebsite = website.trim()
    const cleanCompetitors = competitors.map((competitor) => competitor.trim()).filter(Boolean).slice(0, 5)

    if (!cleanBrand || !cleanWebsite) {
      setSubmitError(locale === "en" ? "Brand name and website are required." : "El nombre de marca y el sitio web son obligatorios.")
      setIsSubmitting(false)
      return
    }

    if (selectedEngines.length === 0) {
      setSubmitError(locale === "en" ? "Select at least one AI engine." : "Selecciona al menos un motor de IA.")
      setIsSubmitting(false)
      return
    }

    try {
      const {
        data: { session },
      } = await supabaseGeo.auth.getSession()

      if (!session?.access_token) {
        setSubmitError(locale === "en" ? "Please sign in again to create the audit." : "Inicia sesión de nuevo para crear la auditoría.")
        setIsSubmitting(false)
        return
      }

      const authDebugRes = await fetch("/api/geo/auth-debug", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const authDebugJson = await authDebugRes.json().catch(() => null)
      if (!authDebugRes.ok || !authDebugJson?.ok) {
        throw new Error(`AUTH_DEBUG: ${authDebugJson?.reason || "UNKNOWN"}${authDebugJson?.message ? ` - ${authDebugJson.message}` : ""}`)
      }

      const authHeaders = {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      }

      const projectRes = await fetch("/api/geo/projects", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          company_name: cleanBrand,
          website_url: cleanWebsite,
          country,
          language,
          industry,
          business_goal: locale === "en"
            ? `Measure and improve ${cleanBrand} visibility in AI answers for ${country}.`
            : `Medir y mejorar la visibilidad de ${cleanBrand} en respuestas de IA para ${country}.`,
          competitors: cleanCompetitors,
        }),
      })

      const projectJson = await projectRes.json().catch(() => null)
      if (!projectRes.ok || !projectJson?.data?.id) {
        throw new Error(projectJson?.error || "PROJECT_CREATE_FAILED")
      }

      const auditRes = await fetch("/api/geo/audits", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          project_id: projectJson.data.id,
          base_url: cleanWebsite,
          crawl_depth: 1,
          engines: selectedEngines,
          language,
          country,
          competitors: cleanCompetitors,
          max_pages: 10,
          max_prompts_per_engine: 5,
        }),
      })

      const auditJson = await auditRes.json().catch(() => null)
      if (!auditRes.ok || !auditJson?.data?.audit?.id) {
        throw new Error(auditJson?.error || "AUDIT_CREATE_FAILED")
      }

      router.push("/geo/app/audits")
    } catch (error) {
      setSubmitError(
        locale === "en"
          ? "The audit could not be created. Check your session and GEO backend configuration."
          : `No se pudo crear la auditoría. ${error instanceof Error && error.message !== "AUDIT_CREATE_FAILED" && error.message !== "PROJECT_CREATE_FAILED" ? error.message : "Revisa la sesión y la configuración del backend GEO."}`,
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <AppHeader />
      <div className="p-6 max-w-4xl mx-auto">
        {/* Back button */}
        <Link
          href="/geo/app"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al dashboard
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-sm text-primary mb-4">
              <Zap className="w-4 h-4" />
              Nueva Auditoría
            </div>
            <h1 className="text-3xl font-bold mb-2">Crear GEO Audit</h1>
            <p className="text-muted-foreground">
              Analiza la visibilidad de tu marca en los principales motores de búsqueda IA
            </p>
          </div>

          {/* Form */}
          <Card className="glass border-border glow-primary">
            <CardContent className="p-8">
              <form className="space-y-8" onSubmit={handleCreateAudit}>
                {/* Brand Info Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 pb-4 border-b border-border">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-semibold">Información de la Marca</h2>
                      <p className="text-sm text-muted-foreground">Datos básicos para el análisis</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="brand">Nombre de la marca</Label>
                        <Input
                          id="brand"
                          value={brand}
                          onChange={(event) => setBrand(event.target.value)}
                          placeholder="Ej: TechStartup Pro"
                          className="bg-input border-border h-12"
                          required
                        />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="website">URL del sitio web</Label>
                      <div className="relative">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          id="website"
                          type="url"
                          value={website}
                          onChange={(event) => setWebsite(event.target.value)}
                          placeholder="https://ejemplo.com"
                          className="bg-input border-border h-12 pl-12"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="country">País objetivo</Label>
                      <Select value={country} onValueChange={setCountry}>
                        <SelectTrigger className="bg-input border-border h-12">
                          <SelectValue placeholder="Selecciona un país" />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map((country) => (
                            <SelectItem key={country} value={country}>
                              {country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="language">Idioma</Label>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger className="bg-input border-border h-12">
                          <SelectValue placeholder="Selecciona un idioma" />
                        </SelectTrigger>
                        <SelectContent>
                          {languages.map((languageOption) => (
                            <SelectItem key={languageOption} value={languageOption === "Inglés" ? "en" : languageOption === "Portugués" ? "pt" : languageOption === "Francés" ? "fr" : languageOption === "Alemán" ? "de" : languageOption === "Italiano" ? "it" : "es"}>
                              {languageOption}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="industry">Industria</Label>
                      <Select value={industry} onValueChange={setIndustry}>
                        <SelectTrigger className="bg-input border-border h-12">
                          <SelectValue placeholder="Selecciona tu industria" />
                        </SelectTrigger>
                        <SelectContent>
                          {industries.map((industry) => (
                            <SelectItem key={industry} value={industry}>
                              {industry}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Competitors Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 pb-4 border-b border-border">
                    <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                      <Target className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <h2 className="font-semibold">Competidores</h2>
                      <p className="text-sm text-muted-foreground">Añade hasta 5 competidores para comparar</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {competitors.map((competitor, index) => (
                      <Input
                        key={index}
                        value={competitor}
                        onChange={(event) => setCompetitors((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))}
                        placeholder={`Competidor ${index + 1} (URL o nombre)`}
                        className="bg-input border-border h-12"
                      />
                    ))}
                  </div>
                </div>

                {/* AI Engines Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 pb-4 border-b border-border">
                    <div className="w-10 h-10 rounded-xl bg-chart-3/20 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-chart-3" />
                    </div>
                    <div>
                      <h2 className="font-semibold">Motores de IA</h2>
                      <p className="text-sm text-muted-foreground">Selecciona los motores a evaluar</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {engines.map((engine) => (
                      <label
                        key={engine.id}
                        className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50 hover:bg-secondary cursor-pointer transition-colors border border-transparent hover:border-primary/50"
                      >
                        <Checkbox
                          id={engine.id}
                          checked={selectedEngines.includes(engine.id)}
                          onCheckedChange={(checked) => {
                            setSelectedEngines((current) => checked ? [...current, engine.id] : current.filter((id) => id !== engine.id))
                          }}
                        />
                        <div className="text-2xl">{engine.icon}</div>
                        <div className="flex-1">
                          <p className="font-medium">{engine.name}</p>
                          <p className="text-sm text-muted-foreground">{engine.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                {submitError && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {submitError}
                  </div>
                )}

                <div className="flex items-center justify-between pt-6 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    El análisis puede tardar entre 2-5 minutos
                  </p>
                  <Button type="submit" size="lg" className="bg-primary hover:bg-primary/90 glow-primary px-8" disabled={isSubmitting}>
                    <Sparkles className="w-5 h-5 mr-2" />
                    {isSubmitting ? (locale === "en" ? "Creating..." : "Creando...") : locale === "en" ? "Start GEO Audit" : "Iniciar GEO Audit"}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {showUpgradeModal && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <Card className="w-full max-w-md glass border-border">
                <CardHeader>
                  <CardTitle>{locale === "en" ? "Upgrade required" : "Upgrade requerido"}</CardTitle>
                  <CardDescription>
                    {locale === "en"
                      ? "You reached your GEO Audit limit for this plan."
                      : "Alcanzaste el limite de GEO Audits para este plan."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setShowUpgradeModal(false)}>
                    {locale === "en" ? "Close" : "Cerrar"}
                  </Button>
                  <Button className="flex-1 bg-primary hover:bg-primary/90" asChild>
                    <Link href="/geo/app/billing">{locale === "en" ? "Upgrade" : "Upgrade"}</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </motion.div>
      </div>
    </>
  )
}
