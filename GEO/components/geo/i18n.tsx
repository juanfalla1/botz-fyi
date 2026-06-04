"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"

type Locale = "es" | "en"

type Dict = Record<string, string>

const dictionaries: Record<Locale, Dict> = {
  es: {
    dashboard: "Dashboard",
    welcomeBack: "Bienvenido de vuelta",
    geoAudits: "GEO Audits",
    competitors: "Competidores",
    reports: "Reportes",
    automations: "Automatizaciones",
    prompts: "Prompts",
    settings: "Configuración",
    help: "Ayuda",
    billing: "Facturación",
    logout: "Cerrar sesión",
    signIn: "Iniciar sesión",
    createAccount: "Crear cuenta",
    forgotPassword: "Olvidaste tu contrasena?",
    rememberMe: "Recordarme",
    loggingIn: "Entrando...",
    loginWithGoogle: "Ingresar con Google",
    overview: "Overview",
    yourAiPerformance: "Tu rendimiento de visibilidad IA",
    runGeoAudit: "Run GEO Audit",
    projects: "Proyectos",
    seeAll: "Ver todos",
    recentAudits: "Auditorias Recientes",
    allAudits: "Todas las Auditorias",
    newAudit: "Nueva Auditoria",
    createGeoAudit: "Crear GEO Audit",
    backToDashboard: "Volver al dashboard",
    share: "Compartir",
    exportPdf: "Exportar PDF",
    recommendations: "Recomendaciones",
    competitorsTitle: "Competidores",
    reportsTitle: "Reportes",
    settingsTitle: "Configuración",
    helpCenter: "Centro de Ayuda",
    navProduct: "Producto",
    navFeatures: "Caracteristicas",
    navHow: "Como funciona",
    navBlog: "Blog",
    navPricing: "Pricing",
  },
  en: {
    dashboard: "Dashboard",
    welcomeBack: "Welcome back",
    geoAudits: "GEO Audits",
    competitors: "Competitors",
    reports: "Reports",
    automations: "Automations",
    prompts: "Prompts",
    settings: "Settings",
    help: "Help",
    billing: "Billing",
    logout: "Log out",
    signIn: "Sign in",
    createAccount: "Create account",
    forgotPassword: "Forgot your password?",
    rememberMe: "Remember me",
    loggingIn: "Signing in...",
    loginWithGoogle: "Continue with Google",
    overview: "Overview",
    yourAiPerformance: "Your AI visibility performance",
    runGeoAudit: "Run GEO Audit",
    projects: "Projects",
    seeAll: "See all",
    recentAudits: "Recent Audits",
    allAudits: "All Audits",
    newAudit: "New Audit",
    createGeoAudit: "Create GEO Audit",
    backToDashboard: "Back to dashboard",
    share: "Share",
    exportPdf: "Export PDF",
    recommendations: "Recommendations",
    competitorsTitle: "Competitors",
    reportsTitle: "Reports",
    settingsTitle: "Settings",
    helpCenter: "Help Center",
    navProduct: "Product",
    navFeatures: "Features",
    navHow: "How it works",
    navBlog: "Blog",
    navPricing: "Pricing",
  },
}

type I18nContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function GeoI18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("es")

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("geo-locale") : null
    if (stored === "es" || stored === "en") setLocaleState(stored)
  }, [])

  const setLocale = (next: Locale) => {
    setLocaleState(next)
    if (typeof window !== "undefined") window.localStorage.setItem("geo-locale", next)
    if (typeof document !== "undefined") document.cookie = `geo_locale=${next}; path=/; max-age=31536000`
  }

  const value = useMemo<I18nContextValue>(() => {
    return {
      locale,
      setLocale,
      t: (key: string) => dictionaries[locale][key] || key,
    }
  }, [locale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useGeoI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error("useGeoI18n must be used within GeoI18nProvider")
  return ctx
}
