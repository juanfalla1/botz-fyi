"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
 import { Sparkles, ArrowRight, Eye, EyeOff, Building2, Globe, Briefcase } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabaseGeo, supabaseGeoProjectRef, supabaseGeoUrlConfigured } from "@/app/geo/supabaseGeoClient"
import { useGeoI18n } from "@/GEO/components/geo/i18n"
import { ensureTrialSubscription, normalizeRequestedPlan } from "@/GEO/lib/billing"

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
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [company, setCompany] = useState("")
  const [website, setWebsite] = useState("")
  const [industry, setIndustry] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { locale, setLocale } = useGeoI18n()
  const lt = (es: string, en: string) => (locale === "en" ? en : es)
  const requestedPlan = normalizeRequestedPlan(searchParams.get("plan"))
  const planLabel = requestedPlan ? requestedPlan[0].toUpperCase() + requestedPlan.slice(1) : "Starter"
  const trialCopy = lt(`Empieza tu prueba gratis de ${planLabel}: 3 GEO Audits incluidos, sin tarjeta.`, `Start your free ${planLabel} trial: 3 GEO Audits included, no card required.`)

  const handleCreateAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage(null)

    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const normalizedEmail = email.trim().toLowerCase()
    if (!supabaseGeoUrlConfigured) {
      setLoading(false)
      setErrorMessage("GEO Supabase no esta configurado. Revisa NEXT_PUBLIC_GEO_SUPABASE_URL y NEXT_PUBLIC_GEO_SUPABASE_ANON_KEY.")
      return
    }
    if (typeof window !== "undefined" && window.location.hostname !== "localhost" && supabaseGeoProjectRef !== "xgedzmeguukvqdotnqap") {
      setLoading(false)
      setErrorMessage(`GEO esta conectado al Supabase incorrecto (${supabaseGeoProjectRef}). Debe ser xgedzmeguukvqdotnqap.`)
      return
    }
    const { data, error } = await supabaseGeo.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: origin ? `${origin}/geo/login` : undefined,
        data: {
          full_name: name,
          company_name: company,
          website_url: website,
          industry,
        },
      },
    })

    if (error) {
      setLoading(false)
      setErrorMessage(/already registered/i.test(error.message) ? `Este email ya existe en Auth del proyecto conectado (${supabaseGeoProjectRef}). Inicia sesion o usa otro correo.` : `${error.message} (${supabaseGeoProjectRef})`)
      return
    }

    if (!data.session) {
      if (data.user?.id) {
        try {
          await ensureTrialSubscription(data.user.id, requestedPlan)
        } catch {
          // no-op: phase 2 can run before migrations are applied
        }
      }

      const { error: signInError } = await supabaseGeo.auth.signInWithPassword({ email: normalizedEmail, password })
      if (signInError) {
        setLoading(false)
        setErrorMessage("Cuenta creada. Revisa tu email para confirmar y luego inicia sesion.")
        return
      }
    }

    if (data.user?.id) {
      try {
        await ensureTrialSubscription(data.user.id, requestedPlan)
      } catch {
        // no-op: phase 2 can run before migrations are applied
      }
    }

    setLoading(false)
    router.push("/geo/app")
    router.refresh()
  }

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
          <Link href="/geo" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
            {lt("← Volver al sitio", "← Back to site")}
          </Link>

          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#0b1020] border border-border flex items-center justify-center overflow-hidden">
              <Image src="/botz-logo.png" alt="Botz" width={22} height={22} className="object-contain" />
            </div>
            <span className="text-xl font-bold">Botz GEO Engine</span>
            <div className="ml-auto inline-flex rounded-lg border border-border overflow-hidden">
              <button type="button" onClick={() => setLocale("es")} className={locale === "es" ? "px-2 py-1 text-xs bg-primary/20 text-primary" : "px-2 py-1 text-xs text-muted-foreground"}>ES</button>
              <button type="button" onClick={() => setLocale("en")} className={locale === "en" ? "px-2 py-1 text-xs bg-primary/20 text-primary" : "px-2 py-1 text-xs text-muted-foreground"}>EN</button>
            </div>
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
                <h1 className="text-2xl font-bold mb-2">{lt("Crear cuenta", "Create account")}</h1>
                <p className="text-muted-foreground mb-6">{lt("Comienza con tu informacion personal", "Start with your personal information")}</p>
                <p className="text-sm text-primary mb-6">{trialCopy}</p>

                 <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); setStep(2) }}>
                  <div className="space-y-2">
                    <Label htmlFor="name">{lt("Nombre completo", "Full name")}</Label>
                    <Input
                      id="name"
                      type="text"
                       placeholder={lt("Juan Garcia", "John Smith")}
                      className="bg-input border-border h-12"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">{lt("Email corporativo", "Work email")}</Label>
                    <Input
                      id="email"
                      type="email"
                       placeholder={lt("juan@empresa.com", "john@company.com")}
                      className="bg-input border-border h-12"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">{lt("Contrasena", "Password")}</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                         placeholder={lt("Minimo 8 caracteres", "Minimum 8 characters")}
                        className="bg-input border-border h-12 pr-12"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        minLength={8}
                        required
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
                    {lt("Continuar", "Continue")}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </form>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold mb-2">{lt("Tu empresa", "Your company")}</h1>
                <p className="text-muted-foreground mb-6">{lt("Cuentanos sobre tu negocio", "Tell us about your business")}</p>
                <p className="text-sm text-primary mb-6">{trialCopy}</p>

                <form className="space-y-5" onSubmit={handleCreateAccount}>
                  <div className="space-y-2">
                    <Label htmlFor="company">{lt("Nombre de la empresa", "Company name")}</Label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                       <Input
                         id="company"
                         type="text"
                         placeholder="Acme Inc."
                         className="bg-input border-border h-12 pl-12"
                         value={company}
                         onChange={(e) => setCompany(e.target.value)}
                         required
                       />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">{lt("URL del sitio web", "Website URL")}</Label>
                    <div className="relative">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                       <Input
                         id="website"
                         type="url"
                         placeholder="https://acme.com"
                         className="bg-input border-border h-12 pl-12"
                         value={website}
                         onChange={(e) => setWebsite(e.target.value)}
                         required
                       />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="industry">{lt("Industria", "Industry")}</Label>
                    <Select onValueChange={setIndustry}>
                      <SelectTrigger className="bg-input border-border h-12">
                        <SelectValue placeholder={lt("Selecciona tu industria", "Select your industry")} />
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
                      {lt("Atras", "Back")}
                    </Button>
                    <Button type="submit" className="flex-1 h-12 bg-primary hover:bg-primary/90 glow-primary" disabled={loading || !industry}>
                      {loading ? lt("Creando...", "Creating...") : lt("Crear cuenta", "Create account")}
                      {!loading && <ArrowRight className="w-5 h-5 ml-2" />}
                    </Button>
                  </div>
                  {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}
                </form>
              </>
            )}

            <div className="mt-6 text-center">
              <p className="text-muted-foreground text-sm">
                {lt("Ya tienes cuenta?", "Already have an account?")}{" "}
                <Link href="/geo/login" className="text-primary hover:underline font-medium">
                  {lt("Iniciar sesion", "Sign in")}
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
