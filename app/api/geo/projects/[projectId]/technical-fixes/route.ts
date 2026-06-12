import { NextResponse } from "next/server"
import { getGeoApiClient } from "@/lib/geo/api-auth"
import { latestAuditSnapshot, loadGeoActionContext, normalizePriority } from "@/lib/geo/action-engine"

type Fix = {
  id: string
  title: string
  problem: string
  impact: string
  implementation: string
  priority: "high" | "medium" | "low"
  status: "detected" | "needs_review"
}

export async function GET(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await params
    const { supabase, user } = await getGeoApiClient(req)
    const context = await loadGeoActionContext(supabase, user.id, projectId)
    if (!context) return NextResponse.json({ error: "Project not found" }, { status: 404 })
    return NextResponse.json({ mode: "live", data: { project: context.project, latest_audit: latestAuditSnapshot(context), fixes: buildFixes(context.recommendations, context.opportunities) } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load technical fixes" }, { status: 500 })
  }
}

function buildFixes(recommendations: Array<Record<string, unknown>>, opportunities: Array<Record<string, unknown>>): Fix[] {
  const sourceText = [...recommendations, ...opportunities].map((item) => `${item.title ?? ""} ${item.description ?? ""} ${item.brief ?? ""} ${item.suggested_action ?? ""}`).join(" ").toLowerCase()
  const fixes: Fix[] = []
  const add = (fix: Fix, detected: boolean) => fixes.push({ ...fix, status: detected ? "detected" : "needs_review", priority: detected ? fix.priority : normalizePriority("medium") })
  add({ id: "faq-schema", title: "FAQ Schema", problem: "No hay evidencia suficiente de FAQs estructuradas orientadas a preguntas de IA.", impact: "Mejora la extraccion de respuestas directas por motores de IA.", implementation: "Crear bloque FAQ en paginas clave y publicar JSON-LD FAQPage cuando aplique.", priority: "high", status: "needs_review" }, sourceText.includes("faq"))
  add({ id: "organization-schema", title: "Organization Schema", problem: "La entidad de marca puede necesitar datos estructurados consistentes.", impact: "Ayuda a que los motores entiendan nombre, URL, servicios, ubicacion y perfiles oficiales.", implementation: "Validar Organization schema con logo, sameAs, contactPoint, areaServed y descripcion consistente.", priority: "medium", status: "needs_review" }, sourceText.includes("schema") || sourceText.includes("structured"))
  add({ id: "comparison-pages", title: "Paginas comparativas", problem: "Faltan paginas que expliquen diferencias contra competidores o alternativas.", impact: "Aumenta probabilidad de aparecer en prompts de decision y comparacion.", implementation: "Crear paginas tipo 'Marca vs Competidor' y 'mejores alternativas para ...'.", priority: "high", status: "needs_review" }, sourceText.includes("competitor") || sourceText.includes("compar"))
  add({ id: "industry-pages", title: "Paginas por industria", problem: "La marca puede estar perdiendo prompts por nicho o caso de uso.", impact: "Mejora relevancia para busquedas verticales donde la IA recomienda soluciones especificas.", implementation: "Crear landing por industria con problema, solucion, casos, FAQs y prueba social.", priority: "high", status: "needs_review" }, sourceText.includes("industry") || sourceText.includes("case") || sourceText.includes("use case"))
  add({ id: "proof-assets", title: "Pruebas sociales y casos", problem: "Faltan senales visibles de autoridad: casos, resultados, testimonios o fuentes.", impact: "Aumenta confianza y citabilidad en respuestas generativas.", implementation: "Publicar casos de exito, metricas verificables, testimonios y claims con fuente.", priority: "medium", status: "needs_review" }, sourceText.includes("citation") || sourceText.includes("source") || sourceText.includes("authority"))
  return fixes
}
