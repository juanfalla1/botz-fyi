"use client"

import { useEffect, useRef, useState } from "react"
import { MessageCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGeoI18n } from "@/GEO/components/geo/i18n"

type ChatMessage = {
  role: "bot" | "user"
  text: string
}

export function GeoAssistantWidget() {
  const { locale } = useGeoI18n()
  const isEn = locale === "en"
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [chatInput, setChatInput] = useState("")
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "bot",
      text: isEn
        ? "Hi, I am the Botz GEO assistant. I can help with GEO Score, audits, prompts, competitors, automations, reports and next steps to improve your visibility in ChatGPT, Gemini, Perplexity and AI Overviews."
        : "Hola, soy el asistente GEO de Botz. Puedo ayudarte con GEO Score, auditorías, prompts, competidores, automatizaciones, reportes y próximos pasos para mejorar tu visibilidad en ChatGPT, Gemini, Perplexity y AI Overviews.",
    },
  ])
  const whatsappUrl =
    process.env.NEXT_PUBLIC_GEO_SUPPORT_WHATSAPP ||
    "https://wa.me/14374351594?text=Hola%2C%20vengo%20de%20la%20landing%20de%20Botz%20GEO%20y%20quiero%20ayuda"

  useEffect(() => {
    const openAssistant = () => setIsOpen(true)
    window.addEventListener("open-geo-assistant", openAssistant)
    return () => window.removeEventListener("open-geo-assistant", openAssistant)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages, isOpen])

  const getGeoReply = (text: string) => {
    const lower = text.toLowerCase()

    if (/^(hola|buenas|hello|hi|hey|qué tal|que tal)\b/.test(lower)) {
      return isEn
        ? "Hi. I can help you understand Botz GEO, check if your brand is visible in AI answers, or connect you with the team. What would you like to do: see a demo, ask about pricing, or improve your GEO Score?"
        : "Hola. Puedo ayudarte a entender Botz GEO, revisar si tu marca aparece en respuestas de IA o conectarte con el equipo. ¿Qué quieres hacer: ver una demo, preguntar precios o mejorar tu GEO Score?"
    }

    if (lower.includes("demo") || lower.includes("agenda") || lower.includes("agendar") || lower.includes("reunión") || lower.includes("reunion")) {
      return isEn
        ? "You can book a GEO demo from the booking page. We will review your brand, competitors and AI visibility opportunities with real data. If you prefer WhatsApp, use the link below and I will identify the message as coming from the Botz GEO landing."
        : "Puedes agendar una demo GEO desde la página de agenda. Revisamos tu marca, competidores y oportunidades de visibilidad en IA con datos reales. Si prefieres WhatsApp, usa el link de abajo y el mensaje llegará identificado como cliente de la landing Botz GEO."
    }

    if (lower.includes("precio") || lower.includes("plan") || lower.includes("costo") || lower.includes("pricing") || lower.includes("cuánto") || lower.includes("cuanto")) {
      return isEn
        ? "Botz GEO plans depend on the number of brands, prompts, competitors, audits and reports you need. For a precise quote, share your website and market through WhatsApp or book a demo."
        : "Los planes de Botz GEO dependen de cuántas marcas, prompts, competidores, auditorías y reportes necesitas. Para darte una cotización precisa, comparte tu web y mercado por WhatsApp o agenda una demo."
    }

    if (lower.includes("whatsapp") || lower.includes("contact") || lower.includes("humano") || lower.includes("asesor") || lower.includes("vendedor")) {
      return isEn
        ? "Use the WhatsApp link below to talk with the team. The message is prefilled so we know you came from the Botz GEO landing."
        : "Usa el link de WhatsApp de abajo para hablar con el equipo. El mensaje ya viene marcado para saber que llegas desde la landing de Botz GEO."
    }

    if (lower.includes("score") || lower.includes("puntaje")) {
      return isEn
        ? "The GEO Score measures how likely your brand is to be cited or recommended by AI engines. It combines visibility, mentions, citations, won prompts and entity consistency."
        : "El GEO Score mide tu probabilidad de aparecer citado o recomendado por motores IA. Combina visibilidad, menciones, citaciones, prompts ganados y consistencia de entidad."
    }

    if (lower.includes("prompt")) {
      return isEn
        ? "Prompts lets you define real questions your customers would ask ChatGPT, Gemini or Perplexity. Botz measures whether your brand appears, its position and the competitors mentioned."
        : "En Prompts defines preguntas reales que tus clientes harían a ChatGPT, Gemini o Perplexity. Botz mide si tu marca aparece, en qué posición y contra qué competidores."
    }

    if (lower.includes("compet")) {
      return isEn
        ? "Competitors shows which brands dominate AI answers, who receives more mentions and where you have visibility gaps to win."
        : "Competidores permite comparar quién domina las respuestas IA, qué marcas reciben más menciones y dónde tienes brechas para ganar visibilidad."
    }

    if (lower.includes("reporte") || lower.includes("report")) {
      return isEn
        ? "Reports summarize audits, trends, opportunities and recommendations for weekly or monthly GEO performance tracking."
        : "Reportes resume auditorías, tendencias, oportunidades y recomendaciones. Sirve para seguimiento semanal o mensual del rendimiento GEO."
    }

    if (lower.includes("automat")) {
      return isEn
        ? "Automations schedule recurring audits and reports so you can monitor AI visibility changes without running everything manually."
        : "Automatizaciones programa auditorías y reportes recurrentes para monitorear cambios de visibilidad IA sin hacerlo manualmente."
    }

    if (lower.includes("chatgpt") || lower.includes("gemini") || lower.includes("perplexity") || lower.includes("ai overview")) {
      return isEn
        ? "Botz GEO analyzes how your brand appears in AI engines like ChatGPT, Gemini, Perplexity and AI Overviews: mentions, citations, position, competitors and content gaps."
        : "Botz GEO analiza cómo aparece tu marca en motores IA como ChatGPT, Gemini, Perplexity y AI Overviews: menciones, citaciones, posición, competidores y brechas de contenido."
    }

    return isEn
      ? "I can help with demo, pricing, GEO Score, audits, prompts, competitors and reports. If you want direct support, use the WhatsApp link below and we will know you came from the Botz GEO landing."
      : "Puedo ayudarte con demo, precios, GEO Score, auditorías, prompts, competidores y reportes. Si quieres atención directa, usa el link de WhatsApp de abajo y sabremos que vienes desde la landing de Botz GEO."
  }

  const sendGeoChat = async (suggestedText?: string) => {
    const text = (suggestedText ?? chatInput).trim()
    if (!text || isSending) return

    const nextMessages: ChatMessage[] = [...chatMessages, { role: "user", text }]
    setChatMessages(nextMessages)
    setChatInput("")
    setIsSending(true)

    try {
      const response = await fetch("/api/geo/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale: isEn ? "en" : "es",
          messages: nextMessages.slice(-10).map((message) => ({
            role: message.role === "bot" ? "assistant" : "user",
            content: message.text,
          })),
        }),
      })
      const data = await response.json().catch(() => null)
      const reply = typeof data?.reply === "string" && data.reply.trim() ? data.reply.trim() : getGeoReply(text)
      setChatMessages((prev) => [...prev, { role: "bot", text: reply }])
    } catch {
      setChatMessages((prev) => [...prev, { role: "bot", text: getGeoReply(text) }])
    } finally {
      setIsSending(false)
    }
  }

  return (
    <>
      {!isOpen && (
        <Button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-50 h-12 w-12 rounded-full bg-primary p-0 shadow-2xl shadow-primary/25 hover:bg-primary/90"
          aria-label={isEn ? "Ask GEO" : "Preguntar GEO"}
        >
          <MessageCircle className="h-5 w-5" />
        </Button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[min(420px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-primary/40 bg-[#07111f] shadow-2xl shadow-primary/20">
          <div className="flex items-center justify-between border-b border-primary/30 bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-2 font-semibold">
              <MessageCircle className="h-4 w-4" /> Botz GEO Assistant
            </div>
            <button type="button" onClick={() => setIsOpen(false)} className="rounded-lg p-1 hover:bg-white/15" aria-label={isEn ? "Close assistant" : "Cerrar asistente"}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="h-80 space-y-3 overflow-y-auto p-4">
            {chatMessages.map((message, index) => (
              <div key={index} className={`rounded-xl px-4 py-3 text-sm ${message.role === "bot" ? "bg-secondary/50 text-foreground" : "ml-8 bg-primary/20 text-primary"}`}>
                {message.text}
              </div>
            ))}
            {isSending && (
              <div className="rounded-xl bg-secondary/50 px-4 py-3 text-sm text-muted-foreground">
                {isEn ? "Botz GEO is thinking..." : "Botz GEO esta pensando..."}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="border-t border-border p-3">
            <div className="mb-3 flex flex-wrap gap-2">
              {[isEn ? "Book a demo" : "Agendar demo", isEn ? "Pricing" : "Precios", "GEO Score", "WhatsApp"].map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => sendGeoChat(label)}
                  disabled={isSending}
                  className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary transition hover:bg-primary/20"
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") sendGeoChat()
                }}
                disabled={isSending}
                placeholder={isEn ? "Ask about Botz GEO..." : "Pregunta sobre Botz GEO..."}
                className="min-w-0 flex-1 rounded-xl border border-border bg-secondary/30 px-3 py-2 text-sm outline-none focus:border-primary/60"
              />
              <Button type="button" onClick={() => sendGeoChat()} disabled={isSending} className="bg-primary hover:bg-primary/90">
                {isSending ? (isEn ? "Sending" : "Enviando") : isEn ? "Send" : "Enviar"}
              </Button>
            </div>
            <a href={whatsappUrl} target="_blank" rel="noreferrer" className="mt-2 block text-xs font-medium text-green-400 hover:text-green-300 hover:underline">
              {isEn ? "Talk to a human on WhatsApp" : "Hablar con un humano por WhatsApp"}
            </a>
          </div>
        </div>
      )}
    </>
  )
}
