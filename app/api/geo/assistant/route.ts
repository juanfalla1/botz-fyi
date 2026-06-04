import OpenAI from "openai"
import { NextResponse } from "next/server"
import { z } from "zod"

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(1200),
})

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(12),
  locale: z.enum(["es", "en"]).optional(),
})

const GEO_SYSTEM_PROMPT = `
Eres el asistente comercial y de soporte de Botz GEO.

Reglas obligatorias:
- Responde SOLO sobre Botz GEO, la landing de Botz GEO, demos, precios, soporte, onboarding, GEO Score, auditorias GEO, prompts, competidores, reportes, automatizaciones, visibilidad en ChatGPT, Gemini, Perplexity, AI Overviews, SEO vs GEO, optimizacion de contenido para motores de IA y productos relacionados de Botz GEO.
- Si el usuario pregunta algo fuera de Botz GEO o sus productos, responde brevemente que solo puedes ayudar con Botz GEO y redirige a una pregunta util sobre demo, precios, GEO Score o soporte.
- No inventes datos internos, precios exactos, descuentos, contratos, integraciones no confirmadas ni resultados de auditorias reales.
- Si preguntan por precios, explica que dependen de marca, prompts, competidores, auditorias y reportes; invita a agendar demo o escribir por WhatsApp.
- Si preguntan por una demo, explica que pueden agendar una demo para revisar marca, mercado, competidores y oportunidades de visibilidad IA.
- Si preguntan por contacto humano, indica que usen el enlace de WhatsApp del chat o la pagina de agendar demo.
- Mantente breve, claro y orientado a venta/soporte. Maximo 120 palabras salvo que pidan detalle.
- Escribe en el idioma del usuario. Si no es claro, usa espanol.

Contexto de producto:
Botz GEO ayuda a empresas a medir y mejorar su visibilidad en motores de IA. Incluye GEO Score, auditorias por prompts, analisis de apariciones/citaciones/posicion, competidores, recomendaciones, oportunidades de contenido, reportes, automatizaciones y seguimiento de motores como ChatGPT, Gemini, Perplexity y Google AI Overviews.
`

export async function POST(request: Request) {
  try {
    const parsed = requestSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 })
    }

    const apiKey = String(process.env.OPENAI_API_KEY || "").trim()
    if (!apiKey) {
      return NextResponse.json(
        {
          ok: false,
          error: "AI_NOT_CONFIGURED",
          reply:
            parsed.data.locale === "en"
              ? "AI support is not configured yet. I can still help you with Botz GEO basics, demos, pricing and WhatsApp contact."
              : "El soporte IA aun no esta configurado. Igual puedo ayudarte con Botz GEO, demos, precios y contacto por WhatsApp.",
        },
        { status: 503 },
      )
    }

    const openai = new OpenAI({ apiKey })
    const completion = await openai.chat.completions.create({
      model: process.env.GEO_ASSISTANT_OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.35,
      max_tokens: 260,
      messages: [
        { role: "system", content: GEO_SYSTEM_PROMPT },
        ...parsed.data.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ],
    })

    const reply = completion.choices[0]?.message?.content?.trim()
    if (!reply) {
      return NextResponse.json({ ok: false, error: "EMPTY_AI_REPLY" }, { status: 502 })
    }

    return NextResponse.json({ ok: true, reply })
  } catch (error) {
    console.error("[geo-assistant]", error)
    return NextResponse.json({ ok: false, error: "AI_ASSISTANT_FAILED" }, { status: 500 })
  }
}
