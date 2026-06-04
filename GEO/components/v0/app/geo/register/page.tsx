"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sparkles, ArrowRight, Eye, EyeOff, Building2, Globe, Briefcase } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

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

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [step, setStep] = useState(1)

  return (
    <div className="min-h-screen flex bg-background">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] animate-pulse-glow" />
        <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: "2s" }} />
      </div>

      {/* Left side - Visual */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-lg"
        >
          <h2 className="text-4xl font-bold mb-6 leading-tight">
            Empieza a dominar{" "}
            <span className="text-gradient">la búsqueda IA</span>
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Únete a las marcas líderes que ya optimizan su visibilidad en ChatGPT, Gemini, Perplexity y AI Overviews.
          </p>

          {/* Feature cards */}
          <div className="space-y-4">
            <FeatureCard
              icon={<Sparkles className="w-5 h-5" />}
              title="Auditoría GEO completa"
              description="Analiza tu presencia en todos los motores de IA"
            />
            <FeatureCard
              icon={<Globe className="w-5 h-5" />}
              title="Monitoreo en tiempo real"
              description="Rastrea menciones y citaciones automáticamente"
            />
            <FeatureCard
              icon={<Briefcase className="w-5 h-5" />}
              title="Insights accionables"
              description="Recomendaciones claras para mejorar tu visibilidad"
            />
          </div>
        </motion.div>
      </div>

      {/* Right side - Registration form */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">Botz GEO Engine</span>
          </div>

          {/* Form card */}
          <div className="glass rounded-2xl p-8 glow-primary">
            <div className="flex items-center gap-2 mb-6">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 1 ? "bg-primary text-white" : "bg-secondary text-muted-foreground"}`}>
                1
              </div>
              <div className={`flex-1 h-1 rounded-full ${step >= 2 ? "bg-primary" : "bg-secondary"}`} />
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 2 ? "bg-primary text-white" : "bg-secondary text-muted-foreground"}`}>
                2
              </div>
            </div>

            {step === 1 ? (
              <>
                <h1 className="text-2xl font-bold mb-2">Crear cuenta</h1>
                <p className="text-muted-foreground mb-6">Comienza con tu información personal</p>

                <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); setStep(2) }}>
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre completo</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Juan García"
                      className="bg-input border-border h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email corporativo</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="juan@empresa.com"
                      className="bg-input border-border h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Mínimo 8 caracteres"
                        className="bg-input border-border h-12 pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-12 bg-primary hover:bg-primary/90">
                    Continuar
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </form>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold mb-2">Tu empresa</h1>
                <p className="text-muted-foreground mb-6">Cuéntanos sobre tu negocio</p>

                <form className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="company">Nombre de la empresa</Label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="company"
                        type="text"
                        placeholder="Acme Inc."
                        className="bg-input border-border h-12 pl-12"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">URL del sitio web</Label>
                    <div className="relative">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="website"
                        type="url"
                        placeholder="https://acme.com"
                        className="bg-input border-border h-12 pl-12"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
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

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 h-12 glass border-border"
                      onClick={() => setStep(1)}
                    >
                      Atrás
                    </Button>
                    <Button type="submit" className="flex-1 h-12 bg-primary hover:bg-primary/90 glow-primary" asChild>
                      <Link href="/geo/app">
                        Crear cuenta
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </Link>
                    </Button>
                  </div>
                </form>
              </>
            )}

            <div className="mt-6 text-center">
              <p className="text-muted-foreground text-sm">
                ¿Ya tienes cuenta?{" "}
                <Link href="/geo/login" className="text-primary hover:underline font-medium">
                  Iniciar sesión
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass rounded-xl p-4 flex items-start gap-4"
    >
      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </motion.div>
  )
}
