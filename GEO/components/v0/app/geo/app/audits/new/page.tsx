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
  { id: "chatgpt", name: "ChatGPT", icon: "🤖", description: "OpenAI GPT-4" },
  { id: "gemini", name: "Gemini", icon: "✨", description: "Google AI" },
  { id: "perplexity", name: "Perplexity", icon: "🔍", description: "AI Search" },
  { id: "ai-overviews", name: "AI Overviews", icon: "🌐", description: "Google SGE" },
]

export default function NewAuditPage() {
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
              <form className="space-y-8">
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
                        placeholder="Ej: TechStartup Pro"
                        className="bg-input border-border h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="website">URL del sitio web</Label>
                      <div className="relative">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          id="website"
                          type="url"
                          placeholder="https://ejemplo.com"
                          className="bg-input border-border h-12 pl-12"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="country">País objetivo</Label>
                      <Select>
                        <SelectTrigger className="bg-input border-border h-12">
                          <SelectValue placeholder="Selecciona un país" />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map((country) => (
                            <SelectItem key={country} value={country.toLowerCase()}>
                              {country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="language">Idioma</Label>
                      <Select>
                        <SelectTrigger className="bg-input border-border h-12">
                          <SelectValue placeholder="Selecciona un idioma" />
                        </SelectTrigger>
                        <SelectContent>
                          {languages.map((language) => (
                            <SelectItem key={language} value={language.toLowerCase()}>
                              {language}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="industry">Industria</Label>
                      <Select>
                        <SelectTrigger className="bg-input border-border h-12">
                          <SelectValue placeholder="Selecciona tu industria" />
                        </SelectTrigger>
                        <SelectContent>
                          {industries.map((industry) => (
                            <SelectItem key={industry} value={industry.toLowerCase().replace(/ /g, "-")}>
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
                    <Input
                      placeholder="Competidor 1 (URL o nombre)"
                      className="bg-input border-border h-12"
                    />
                    <Input
                      placeholder="Competidor 2 (URL o nombre)"
                      className="bg-input border-border h-12"
                    />
                    <Input
                      placeholder="Competidor 3 (URL o nombre)"
                      className="bg-input border-border h-12"
                    />
                    <Input
                      placeholder="Competidor 4 (URL o nombre)"
                      className="bg-input border-border h-12"
                    />
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
                        <Checkbox id={engine.id} defaultChecked />
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
                <div className="flex items-center justify-between pt-6 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    El análisis puede tardar entre 2-5 minutos
                  </p>
                  <Button
                    type="submit"
                    size="lg"
                    className="bg-primary hover:bg-primary/90 glow-primary px-8"
                    asChild
                  >
                    <Link href="/geo/app/audits/demo">
                      <Sparkles className="w-5 h-5 mr-2" />
                      Iniciar GEO Audit
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Link>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  )
}
