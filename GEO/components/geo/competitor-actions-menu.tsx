"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import {
  MoreHorizontal,
  FileText,
  Scale,
 RotateCw,
 Sparkles,
 Download,
 Bell,
 Trash2,
  Eye,
} from "lucide-react"
import { supabaseGeo } from "@/app/geo/supabaseGeoClient"

type Props = {
  competitorId: string
  competitorName: string
  locale: "es" | "en"
}

export function CompetitorActionsMenu({ competitorId, competitorName, locale }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])

  const isEn = locale === "en"
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(competitorId)

  const authHeaders = async () => {
    const {
      data: { session },
    } = await supabaseGeo.auth.getSession()
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
  }

  const notify = (message: string) => {
    setFeedback(message)
    setTimeout(() => setFeedback(null), 2800)
  }

  const runAgain = async () => {
    notify(isEn ? "Opening audit flow with this competitor context." : "Abriendo flujo de auditoria con contexto del competidor.")
    router.push(`/geo/app/audits/new?competitor=${competitorId}`)
  }

  const startMonitoring = async () => {
    if (!isUuid) return notify(isEn ? "This action needs a real competitor record." : "Esta accion requiere un competidor real.")
    const headers = await authHeaders()
    const res = await fetch("/api/geo/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({
        project_id: null,
        competitor_id: competitorId,
        name: `Monitoring ${competitorName}`,
        frequency: "weekly",
        enabled: true,
        config: { source: "competitors_actions", competitorId },
      }),
    })
    if (!res.ok) return notify(isEn ? "Monitoring could not be started." : "No se pudo iniciar el monitoreo.")
    notify(isEn ? "Monitoring started." : "Monitoreo iniciado.")
  }

  const deleteCompetitorReal = async () => {
    if (!isUuid) return notify(isEn ? "This action needs a real competitor record." : "Esta accion requiere un competidor real.")
    const headers = await authHeaders()
    const res = await fetch(`/api/geo/competitors/${competitorId}`, {
      method: "DELETE",
      headers: { ...headers },
    })
    if (!res.ok) return notify(isEn ? "Delete failed, please try again." : "No se pudo eliminar, intenta nuevamente.")
    if (typeof window !== "undefined") window.location.reload()
  }

  const actions = useMemo(
    () => [
      { key: "view", label: isEn ? "View Audit" : "Ver Auditoria", icon: Eye, onClick: () => (isUuid ? router.push(`/geo/app/audits?competitor=${competitorId}`) : notify(isEn ? "No linked audit yet." : "Aun no hay auditoria vinculada.")) },
      { key: "compare", label: isEn ? "Compare" : "Comparar", icon: Scale, onClick: () => router.push(`/geo/app/competitors?compare=${competitorId}`) },
      { key: "run", label: isEn ? "Run Again" : "Ejecutar de nuevo", icon: RotateCw, onClick: runAgain },
      { key: "ai", label: isEn ? "AI Recommendations" : "Recomendaciones IA", icon: Sparkles, onClick: () => router.push("/geo/app/reports?tab=recommendations") },
      { key: "export", label: isEn ? "Export Report" : "Exportar reporte", icon: Download, onClick: () => router.push(`/geo/app/reports?competitor=${competitorId}`) },
      { key: "monitor", label: isEn ? "Start Monitoring" : "Iniciar monitoreo", icon: Bell, onClick: startMonitoring },
      { key: "delete", label: isEn ? "Delete" : "Eliminar", icon: Trash2, destructive: true, onClick: deleteCompetitorReal },
    ],
    [competitorId, isEn, router]
  )

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }

    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onEscape)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onEscape)
    }
  }, [open])

  const onMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = itemRefs.current.findIndex((el) => el === document.activeElement)
    if (event.key === "ArrowDown") {
      event.preventDefault()
      const next = (currentIndex + 1 + actions.length) % actions.length
      itemRefs.current[next]?.focus()
    }
    if (event.key === "ArrowUp") {
      event.preventDefault()
      const prev = (currentIndex - 1 + actions.length) % actions.length
      itemRefs.current[prev]?.focus()
    }
    if (event.key === "Home") {
      event.preventDefault()
      itemRefs.current[0]?.focus()
    }
    if (event.key === "End") {
      event.preventDefault()
      itemRefs.current[actions.length - 1]?.focus()
    }
  }

  return (
    <div className="relative inline-flex" ref={rootRef}>
      <button
        type="button"
        aria-label={isEn ? `Actions for ${competitorName}` : `Acciones para ${competitorName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-all hover:border-primary/30 hover:bg-primary/10 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            role="menu"
            onKeyDown={onMenuKeyDown}
            className="absolute right-0 top-11 z-50 w-60 overflow-hidden rounded-xl border border-primary/20 bg-[#0b1020]/95 p-1.5 shadow-2xl shadow-black/50 backdrop-blur-md"
          >
            {actions.map((action, index) => (
              <button
                key={action.key}
                ref={(el) => {
                  itemRefs.current[index] = el
                }}
                type="button"
                role="menuitem"
                onClick={() => {
                  action.onClick()
                  setOpen(false)
                }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                  action.destructive
                    ? "text-red-300 hover:bg-red-500/15 hover:text-red-200"
                    : "text-slate-200 hover:bg-primary/15 hover:text-white"
                }`}
              >
                <action.icon className="h-4 w-4 shrink-0" />
                <span>{action.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {feedback && <div className="absolute right-0 top-[calc(100%+56px)] z-50 rounded-lg border border-primary/30 bg-[#0b1020]/95 px-3 py-2 text-xs text-slate-200 shadow-lg">{feedback}</div>}
    </div>
  )
}
