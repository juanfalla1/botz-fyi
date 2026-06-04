"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowRight, Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabaseGeo } from "@/app/geo/supabaseGeoClient"
import { useGeoI18n } from "@/GEO/components/geo/i18n"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { locale, setLocale, t } = useGeoI18n()
  const lt = (es: string, en: string) => (locale === "en" ? en : es)

  const toFriendlyAuthError = (rawMessage: string) => {
    const msg = rawMessage.toLowerCase()
    if (msg.includes("email not confirmed")) {
      return lt("Tu email aun no esta confirmado.", "Your email is not confirmed yet.")
    }
    if (msg.includes("invalid login credentials") || msg.includes("invalid_grant")) {
      return lt("Email o contrasena incorrectos.", "Invalid email or password.")
    }
    if (msg.includes("email rate limit exceeded")) {
      return lt("Demasiados intentos. Prueba de nuevo en unos minutos.", "Too many attempts. Try again in a few minutes.")
    }
    return rawMessage
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage(null)
    setInfoMessage(null)

    const normalizedEmail = email.trim().toLowerCase()
    const normalizedPassword = password

    const { error } = await supabaseGeo.auth.signInWithPassword({
      email: normalizedEmail,
      password: normalizedPassword,
    })

    setLoading(false)
    if (error) {
      setErrorMessage(toFriendlyAuthError(error.message))
      return
    }

    const { data: sessionData, error: sessionError } = await supabaseGeo.auth.getSession()
    if (sessionError) {
      setErrorMessage(sessionError.message)
      return
    }
    if (!sessionData.session) {
      setErrorMessage(
        lt(
          "El login fue exitoso pero no se encontro sesion activa. Intenta de nuevo.",
          "Login succeeded but no active session was found. Please try again."
        )
      )
      return
    }

    const nextPath = searchParams.get("next") || "/geo/app"
    const safeNextPath = nextPath.startsWith("/") ? nextPath : "/geo/app"
    router.push(safeNextPath)
    router.refresh()
    if (typeof window !== "undefined") {
      window.location.assign(safeNextPath)
    }
  }

  const handleResendConfirmation = async () => {
    if (!email) {
      setErrorMessage(lt("Ingresa tu email para reenviar confirmacion.", "Enter your email to resend confirmation."))
      return
    }
    setErrorMessage(null)
    setInfoMessage(null)
    const origin = typeof window !== "undefined" ? window.location.origin : undefined
    const normalizedEmail = email.trim().toLowerCase()
    const { error } = await supabaseGeo.auth.resend({
      type: "signup",
      email: normalizedEmail,
      options: { emailRedirectTo: origin ? `${origin}/geo/login` : undefined },
    })
    if (error) {
      setErrorMessage(error.message)
      return
    }
    setInfoMessage(lt("Te reenviamos el correo de confirmacion.", "We resent the confirmation email."))
  }

  const handleGoogleLogin = async () => {
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/geo/app` : undefined
    const { error } = await supabaseGeo.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    })
    if (error) {
      setErrorMessage(error.message)
    }
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: "2s" }} />
      </div>

      {/* Left side - Login form */}
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
            <h1 className="text-2xl font-bold mb-2">{lt("Bienvenido de vuelta", "Welcome back")}</h1>
            <p className="text-muted-foreground mb-8">{lt("Inicia sesion para acceder a tu dashboard", "Sign in to access your dashboard")}</p>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                    placeholder={lt("tu@empresa.com", "you@company.com")}
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
                    placeholder="••••••••"
                    className="bg-input border-border h-12 pr-12"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="rounded border-border" />
                  <span className="text-muted-foreground">{t("rememberMe")}</span>
                </label>
                <Link href="/geo/forgot-password" className="text-sm text-primary hover:underline">
                  {t("forgotPassword")}
                </Link>
              </div>

              {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}
              {infoMessage && <p className="text-sm text-green-400">{infoMessage}</p>}
              {errorMessage?.includes("no esta confirmado") && (
                <Button type="button" variant="ghost" className="w-full h-10" onClick={handleResendConfirmation}>
                  {lt("Reenviar correo de confirmacion", "Resend confirmation email")}
                </Button>
              )}

              <Button type="submit" className="w-full h-12 bg-primary hover:bg-primary/90 glow-primary" disabled={loading}>
                {loading ? t("loggingIn") : t("signIn")}
                {!loading && <ArrowRight className="w-5 h-5 ml-2" />}
              </Button>

              <Button type="button" variant="outline" className="w-full h-12 border-border" onClick={handleGoogleLogin}>
                {t("loginWithGoogle")}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-muted-foreground text-sm">
                {lt("No tienes cuenta?", "Do not have an account?")}{" "}
                <Link href="/geo/register" className="text-primary hover:underline font-medium">
                  {lt("Crear cuenta", "Create account")}
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right side - GEO Score visual */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="glass rounded-3xl p-8 glow-accent max-w-lg w-full"
        >
          <div className="text-center mb-8">
            <p className="text-muted-foreground text-sm uppercase tracking-wider mb-2">Tu visibilidad IA</p>
            <h2 className="text-xl font-semibold mb-6">GEO Score</h2>
            
            {/* Circular score */}
            <div className="relative w-48 h-48 mx-auto mb-6">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-secondary"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="url(#scoreGradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${78 * 2.83} ${100 * 2.83}`}
                />
                <defs>
                  <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-bold text-gradient">78</span>
                <span className="text-muted-foreground text-sm">de 100</span>
              </div>
            </div>
          </div>

          {/* Score breakdown */}
          <div className="space-y-4">
            <ScoreItem label="Visibilidad IA" value={82} />
            <ScoreItem label="Probabilidad de Citación" value={75} />
            <ScoreItem label="Fortaleza de Entidad" value={68} />
            <ScoreItem label="Claridad de Contenido" value={85} />
          </div>
        </motion.div>
      </div>
    </div>
  )
}

function ScoreItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, delay: 0.5 }}
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
        />
      </div>
    </div>
  )
}
