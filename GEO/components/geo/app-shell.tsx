"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import {
  LayoutDashboard,
  FileSearch,
  Settings,
  HelpCircle,
  LogOut,
  BarChart3,
  Target,
  Bell,
  CreditCard,
  Check,
  Zap,
  MessageSquare,
  FolderKanban,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabaseGeo } from "@/app/geo/supabaseGeoClient"
import { useGeoI18n } from "@/GEO/components/geo/i18n"

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { t, locale } = useGeoI18n()

  const navigation = [
    { name: t("dashboard"), href: "/geo/app", icon: LayoutDashboard },
    { name: locale === "en" ? "Projects" : "Proyectos", href: "/geo/app/projects", icon: FolderKanban },
    { name: t("geoAudits"), href: "/geo/app/audits", icon: FileSearch },
    { name: t("prompts"), href: "/geo/app/prompts", icon: MessageSquare },
    { name: t("competitors"), href: "/geo/app/competitors", icon: Target },
    { name: t("reports"), href: "/geo/app/reports", icon: BarChart3 },
    { name: t("automations"), href: "/geo/app/automations", icon: Zap },
  ]

  const bottomNav = [
    { name: t("billing"), href: "/geo/app/billing", icon: CreditCard },
    { name: t("settings"), href: "/geo/app/settings", icon: Settings },
    { name: t("help"), href: "/geo/app/help", icon: HelpCircle },
  ]

  const handleLogout = async () => {
    await supabaseGeo.auth.signOut()
    router.push("/geo/login")
    router.refresh()
  }

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className={cn(
        "fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col z-50 transition-all duration-300"
      )}
    >
      {/* Logo */}
      <div className="px-5 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#0b1020] border border-border flex items-center justify-center shrink-0 overflow-hidden">
          <Image src="/botz-logo.png" alt="Botz" width={22} height={22} className="object-contain" />
        </div>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-lg font-bold whitespace-nowrap"
        >
          Botz GEO
        </motion.span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-1 space-y-0.5">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/geo/app" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom nav */}
      <div className="mt-auto px-3 py-2 border-t border-sidebar-border space-y-0.5">
        {bottomNav.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-all"
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span>{item.name}</span>
          </Link>
        ))}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span>{t("logout")}</span>
        </button>
      </div>
    </motion.aside>
  )
}

export function AppHeader() {
  const { locale, setLocale, t } = useGeoI18n()
  const [unreadCount, setUnreadCount] = useState(0)
  const [openNotifications, setOpenNotifications] = useState(false)
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; body: string | null; read_at: string | null }>>([])
  const [loadingNotifications, setLoadingNotifications] = useState(true)

  useEffect(() => {
    let mounted = true
    const loadNotifications = async () => {
      const {
        data: { session },
      } = await supabaseGeo.auth.getSession()
      if (!session?.access_token) {
        setLoadingNotifications(false)
        return
      }

      const res = await fetch("/api/geo/notifications", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) {
        setLoadingNotifications(false)
        return
      }
      const json = (await res.json()) as { data?: Array<{ id: string; title: string; body: string | null; read_at: string | null }> }
      const list = json.data ?? []
      const unread = list.filter((n) => !n.read_at).length
      if (mounted) setNotifications(list)
      if (mounted) setUnreadCount(unread)
      if (mounted) setLoadingNotifications(false)
    }
    void loadNotifications()
    return () => {
      mounted = false
    }
  }, [])

  const markRead = async (id: string) => {
    const {
      data: { session },
    } = await supabaseGeo.auth.getSession()
    if (!session?.access_token) return
    const res = await fetch(`/api/geo/notifications/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (!res.ok) return
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)))
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  return (
    <div className="h-16 border-b border-border bg-background/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-40">
      <div>
        <h1 className="text-lg font-semibold">{t("dashboard")}</h1>
        <p className="text-sm text-muted-foreground">{t("welcomeBack")}</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="inline-flex rounded-lg border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setLocale("es")}
            className={cn("px-2 py-1 text-xs", locale === "es" ? "bg-primary/20 text-primary" : "text-muted-foreground")}
          >
            ES
          </button>
          <button
            type="button"
            onClick={() => setLocale("en")}
            className={cn("px-2 py-1 text-xs", locale === "en" ? "bg-primary/20 text-primary" : "text-muted-foreground")}
          >
            EN
          </button>
        </div>
        <div className="relative">
          <Button variant="ghost" size="icon" className="relative" onClick={() => setOpenNotifications((v) => !v)}>
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />}
          </Button>
          {openNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-background/95 backdrop-blur-md shadow-2xl p-2 z-50">
              <div className="text-xs text-muted-foreground px-2 py-1">{locale === "en" ? "Notifications" : "Notificaciones"}</div>
              <div className="max-h-80 overflow-y-auto space-y-1">
                {loadingNotifications && <div className="px-2 py-2 text-sm text-muted-foreground">{locale === "en" ? "Loading notifications..." : "Cargando notificaciones..."}</div>}
                {!loadingNotifications && notifications.length === 0 && <div className="px-2 py-2 text-sm text-muted-foreground">{locale === "en" ? "No notifications yet" : "Sin notificaciones por ahora"}</div>}
                {notifications.map((n) => (
                  <button key={n.id} type="button" className="w-full text-left px-2 py-2 rounded-lg hover:bg-secondary/50 transition-colors" onClick={() => markRead(n.id)}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium">{n.title}</div>
                        {n.body && <div className="text-xs text-muted-foreground mt-1">{n.body}</div>}
                      </div>
                      {!n.read_at && <Check className="w-4 h-4 text-primary mt-0.5" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-medium text-sm">
          JG
        </div>
      </div>
    </div>
  )
}
