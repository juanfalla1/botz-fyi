import { NextResponse } from "next/server"
import { getGeoApiClient } from "@/lib/geo/api-auth"
import { latestAuditSnapshot, loadGeoActionContext, normalizePriority, priorityRank } from "@/lib/geo/action-engine"

export async function GET(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await params
    const { supabase, user } = await getGeoApiClient(req)
    const context = await loadGeoActionContext(supabase, user.id, projectId)
    if (!context) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    const opportunities = context.opportunities.map((item, index) => {
      const title = String(item.title ?? item.target_prompt ?? `Opportunity ${index + 1}`)
      const brief = String(item.brief ?? "Create a content asset to close this GEO visibility gap.")
      return {
        id: String(item.id ?? `${item.audit_id ?? "opportunity"}-${index}`),
        title,
        target_prompt: String(item.target_prompt ?? title),
        intent: String(item.intent ?? "geo_visibility_improvement"),
        recommended_format: String(item.recommended_format ?? "article_or_structured_faq"),
        priority: normalizePriority(item.priority),
        brief,
        why_it_matters: whyItMatters(title, brief),
        suggested_outline: outlineFor(title, brief),
        audit_id: String(item.audit_id ?? ""),
        created_at: item.created_at ? String(item.created_at) : null,
      }
    }).sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))

    return NextResponse.json({ mode: "live", data: { project: context.project, latest_audit: latestAuditSnapshot(context), opportunities } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load content opportunities" }, { status: 500 })
  }
}

function whyItMatters(title: string, brief: string) {
  const text = `${title} ${brief}`.toLowerCase()
  if (text.includes("competitor") || text.includes("compar")) return "Los motores de IA suelen recomendar marcas con contenido comparativo claro para prompts de decision."
  if (text.includes("citation") || text.includes("source") || text.includes("cita")) return "Las respuestas de IA tienden a favorecer marcas con claims verificables y fuentes claras."
  if (text.includes("faq") || text.includes("prompt")) return "Las FAQs estructuradas ayudan a que la IA extraiga respuestas directas sobre la marca."
  return "Cierra una brecha detectada en auditorias reales y aumenta la probabilidad de aparecer en respuestas de IA."
}

function outlineFor(title: string, brief: string) {
  const text = `${title} ${brief}`.toLowerCase()
  if (text.includes("competitor") || text.includes("compar")) return ["Problema del comprador", "Comparativa directa", "Diferenciadores", "Casos de uso", "FAQs de decision"]
  if (text.includes("faq") || text.includes("prompt")) return ["Pregunta principal", "Respuesta corta", "Contexto de marca", "Prueba o fuente", "Siguiente paso"]
  return ["Intencion de busqueda", "Respuesta recomendada", "Claims verificables", "Seccion de confianza", "CTA o proximo paso"]
}
