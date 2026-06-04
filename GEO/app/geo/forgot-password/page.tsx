"use client"

import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Mail, CheckCircle, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { supabaseGeo } from "@/app/geo/supabaseGeoClient"
import { useGeoI18n } from "@/GEO/components/geo/i18n"

type Status = "idle" | "loading" | "success" | "error"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const { locale, setLocale } = useGeoI18n()
  const t = (es: string, en: string) => (locale === "en" ? en : es)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setStatus("loading")
    setErrorMessage(null)

    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const { error } = await supabaseGeo.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${origin}/geo/reset-password`,
    })

    if (error) {
      setStatus("error")
      setErrorMessage(error.message)
      return
    }

    setStatus("success")
  }

  const handleRetry = () => {
    setStatus("idle")
    setErrorMessage(null)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] animate-pulse-glow" />
        <div
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[100px] animate-pulse-glow"
          style={{ animationDelay: "2s" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        <Link href="/geo" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          {t("← Volver al sitio", "← Back to site")}
        </Link>

        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-[#0b1020] border border-border flex items-center justify-center overflow-hidden">
            <Image src="/botz-logo.png" alt="Botz" width={22} height={22} className="object-contain" />
          </div>
          <span className="text-xl font-bold">Botz GEO Engine</span>
          <div className="inline-flex rounded-lg border border-border overflow-hidden">
            <button type="button" onClick={() => setLocale("es")} className={locale === "es" ? "px-2 py-1 text-xs bg-primary/20 text-primary" : "px-2 py-1 text-xs text-muted-foreground"}>ES</button>
            <button type="button" onClick={() => setLocale("en")} className={locale === "en" ? "px-2 py-1 text-xs bg-primary/20 text-primary" : "px-2 py-1 text-xs text-muted-foreground"}>EN</button>
          </div>
        </div>

        <div className="glass rounded-2xl p-8 glow-primary">
          <AnimatePresence mode="wait">
            {status === "success" ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center py-8"
              >
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h1 className="text-2xl font-bold mb-2">{t("Revisa tu correo", "Check your email")}</h1>
                <p className="text-muted-foreground mb-6">
                  {t("Hemos enviado un enlace de recuperacion a", "We sent a recovery link to")}{" "}
                  <span className="text-foreground font-medium">{email}</span>
                </p>
                <p className="text-sm text-muted-foreground mb-8">{t("Si no ves el correo, revisa tu carpeta de spam.", "If you cannot find it, check your spam folder.")}</p>
                <Button variant="outline" className="w-full h-12" asChild>
                  <Link href="/geo/login">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t("Volver a iniciar sesion", "Back to sign in")}
                  </Link>
                </Button>
              </motion.div>
            ) : status === "error" ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center py-8"
              >
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h1 className="text-2xl font-bold mb-2">{t("Error al enviar", "Send failed")}</h1>
                <p className="text-muted-foreground mb-3">{t("No pudimos enviar el correo de recuperacion.", "We could not send the recovery email.")}</p>
                {errorMessage && <p className="text-sm text-red-400 mb-6">{errorMessage}</p>}
                <div className="space-y-3">
                  <Button onClick={handleRetry} className="w-full h-12 bg-primary hover:bg-primary/90 glow-primary">
                    {t("Intentar de nuevo", "Try again")}
                  </Button>
                  <Button variant="outline" className="w-full h-12" asChild>
                    <Link href="/geo/login">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      {t("Volver a iniciar sesion", "Back to sign in")}
                    </Link>
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
                    <Mail className="w-8 h-8 text-primary" />
                  </div>
                  <h1 className="text-2xl font-bold mb-2">{t("Recuperar contrasena", "Recover password")}</h1>
                  <p className="text-muted-foreground">{t("Ingresa tu correo y te enviaremos un enlace para restablecer tu contrasena.", "Enter your email and we will send you a link to reset your password.")}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("Email", "Email")}</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder={t("tu@empresa.com", "you@company.com")}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-input border-border h-12"
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full h-12 bg-primary hover:bg-primary/90 glow-primary" disabled={status === "loading"}>
                    {status === "loading" ? t("Enviando...", "Sending...") : t("Enviar enlace", "Send link")}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <Link href="/geo/login" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t("Volver a iniciar sesion", "Back to sign in")}
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
