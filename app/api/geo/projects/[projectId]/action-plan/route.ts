import { NextResponse } from "next/server"
import { getGeoApiClient } from "@/lib/geo/api-auth"
import { competitiveSnapshot, latestAuditSnapshot, loadGeoActionContext, normalizePriority, numberFrom, priorityRank } from "@/lib/geo/action-engine"

type ActionItem = {
  id: string
  category: string
  title: string
  description: string
  why_important: string
  priority: "high" | "medium" | "low"
  estimated_impact: "high" | "medium" | "low"
  difficulty: "easy" | "medium" | "hard"
  type: string
  implementation_type: string
  affected_pages: string[]
  suggested_action: string
  deliverables: string[]
  status: "pending" | "in_progress" | "implemented"
  audit_id: string
  created_at: string | null
}

export async function GET(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await params
    const { supabase, user } = await getGeoApiClient(req)
    const context = await loadGeoActionContext(supabase, user.id, projectId)
    if (!context) return NextResponse.json({ error: "Project not found" }, { status: 404 })
    const actions = buildActions(context)
    const competitive = competitiveSnapshot(context)

    return NextResponse.json({
      mode: "live",
      data: {
        project: context.project,
        latest_audit: latestAuditSnapshot(context),
        competitive_insights: competitive,
        actions,
        content_opportunities: context.opportunities,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load action plan" }, { status: 500 })
  }
}

function buildActions(context: Awaited<ReturnType<typeof loadGeoActionContext>> extends infer T ? NonNullable<T> : never): ActionItem[] {
  const project = context.project
  const snapshot = latestAuditSnapshot(context)
  const allSignals = [...context.recommendations, ...context.opportunities]
    .map((item) => `${item.title ?? ""} ${item.description ?? ""} ${item.suggested_action ?? ""} ${item.brief ?? ""} ${item.target_prompt ?? ""}`)
    .join(" ")
    .toLowerCase()
  const baseUrl = normalizeUrl(project.website_url)
  const industrySlug = slugify(project.industry || "industria")
  const competitive = competitiveSnapshot(context)
  const topCompetitor = competitive.top_competitor
  const actions: ActionItem[] = []
  const add = (action: ActionItem) => {
    if (actions.some((item) => item.category === action.category)) return
    actions.push(action)
  }

  if (numberFrom(snapshot?.ai_visibility) < 60 || allSignals.includes("seo") || allSignals.includes("brand")) {
    add({
      id: "homepage-ai-positioning",
      category: "Posicionamiento de marca",
      title: "Reescribir la home para que la IA entienda exactamente qué vende la empresa",
      description: `La auditoria muestra baja visibilidad IA. La pagina principal debe explicar en lenguaje directo que hace ${project.company_name}, para quien, en que mercado y por que deberia recomendarse frente a alternativas.`,
      why_important: "Los modelos generativos extraen entidades, casos de uso y diferenciadores desde paginas claras. Si la home es vaga, la IA no tiene razones fuertes para recomendar la marca.",
      priority: "high",
      estimated_impact: "high",
      difficulty: "medium",
      type: "content",
      implementation_type: "Copy + estructura de landing",
      affected_pages: [baseUrl],
      suggested_action: "Agregar arriba del fold una propuesta de valor clara, una seccion 'para quien es', diferenciadores, casos de uso, prueba social y preguntas frecuentes orientadas a IA.",
      deliverables: ["Nuevo hero con propuesta de valor", "Seccion de casos de uso", "Bloque 'por que elegirnos'", "FAQs orientadas a prompts de IA"],
      status: "pending",
      audit_id: context.latestAudit?.id ?? "",
      created_at: context.latestAudit?.completed_at ?? null,
    })
  }

  add({
    id: "industry-landing",
    category: "Contenido por industria",
    title: `Crear una landing especifica para ${project.industry || "el nicho principal"}`,
    description: "Hoy el cliente necesita paginas que respondan prompts especificos, no solo una pagina general. Una landing por industria ayuda a capturar recomendaciones de IA cuando el usuario pregunta por soluciones para un sector concreto.",
    why_important: "ChatGPT, Gemini y Perplexity tienden a recomendar marcas que tienen contenido explicito para el caso de uso o industria mencionada en el prompt.",
    priority: "high",
    estimated_impact: "high",
    difficulty: "medium",
    type: "content",
    implementation_type: "Nueva pagina/landing",
    affected_pages: [`${baseUrl}/${industrySlug}`],
    suggested_action: `Crear una pagina para ${project.industry || "la industria objetivo"} con problema, solucion, beneficios, casos de uso, FAQs, prueba social y CTA.`,
    deliverables: ["Landing por industria", "Copy completo", "FAQs del nicho", "Metadata SEO/GEO"],
    status: "pending",
    audit_id: context.latestAudit?.id ?? "",
    created_at: context.latestAudit?.completed_at ?? null,
  })

  if (allSignals.includes("competitor") || allSignals.includes("compar") || numberFrom(snapshot?.prompts_lost) > 0 || topCompetitor || context.competitors.length > 0) {
    const competitorName = topCompetitor?.name ?? context.competitors[0]?.name ?? "competidores principales"
    add({
      id: "comparison-page",
      category: "Comparación competitiva",
      title: `Crear comparativas directas contra ${competitorName}`,
      description: topCompetitor
        ? `${competitorName} aparece como competidor mencionado en ${topCompetitor.mentions} resultado(s) de IA. La marca necesita contenido de decision que explique diferencias, fortalezas y casos de uso frente a ese competidor.`
        : "La marca ya tiene competidores definidos. Falta contenido de decision para prompts donde el usuario compara opciones, alternativas o proveedores.",
      why_important: "Las consultas tipo 'mejores', 'alternativas', 'vs' y 'comparar' son prompts de alta intencion comercial. Si la marca no tiene contenido comparativo, los motores de IA se apoyan en competidores con mejor evidencia.",
      priority: "high",
      estimated_impact: "high",
      difficulty: "medium",
      type: "competitive",
      implementation_type: "Nueva pagina comparativa",
      affected_pages: [`${baseUrl}/comparativas`, `${baseUrl}/alternativas`, `${baseUrl}/${slugify(project.company_name)}-vs-${slugify(competitorName)}`],
      suggested_action: `Publicar una pagina '${project.company_name} vs ${competitorName}' y una matriz de alternativas con diferencias, casos de uso, alcance, FAQs y prueba social verificable.`,
      deliverables: [`Pagina ${project.company_name} vs ${competitorName}`, "Pagina de alternativas", "Tabla comparativa", "FAQs de decision"],
      status: "pending",
      audit_id: context.latestAudit?.id ?? "",
      created_at: context.latestAudit?.completed_at ?? null,
    })
  }

  if (topCompetitor) {
    add({
      id: "competitive-evidence-gap",
      category: "Brecha frente al competidor",
      title: `Cerrar la brecha de evidencia frente a ${topCompetitor.name}`,
      description: `${topCompetitor.name} fue detectado en ${topCompetitor.engines.length} motor(es): ${topCompetitor.engines.join(", ")}. Esto indica que la IA encuentra señales suficientes para mencionarlo dentro del contexto competitivo.`,
      why_important: "Para desplazar a un competidor en respuestas generativas no basta con nombrarlo: hay que crear evidencia comparativa, claims verificables y paginas que respondan directamente las dudas de decision.",
      priority: "high",
      estimated_impact: "high",
      difficulty: "medium",
      type: "competitive",
      implementation_type: "Contenido + autoridad",
      affected_pages: [`${baseUrl}/casos-de-exito`, `${baseUrl}/comparativas`, baseUrl],
      suggested_action: `Agregar secciones que demuestren por que elegir ${project.company_name} frente a ${topCompetitor.name}: resultados, diferenciadores, integraciones, soporte, velocidad, cobertura y casos reales.`,
      deliverables: ["Bloque de diferenciadores", "Claims con evidencia", "Casos o pruebas verificables", "FAQs contra objeciones competitivas"],
      status: "pending",
      audit_id: context.latestAudit?.id ?? "",
      created_at: context.latestAudit?.completed_at ?? null,
    })
  }

  add({
    id: "faq-schema",
    category: "Estructura para IA",
    title: "Agregar FAQs y Schema JSON-LD en las paginas principales",
    description: "Las paginas deben responder preguntas concretas que usuarios hacen a motores de IA. Esas respuestas deben estar visibles y estructuradas.",
    why_important: "Las FAQs ayudan a los modelos a extraer respuestas directas y el schema mejora la claridad semantica para buscadores y sistemas de recuperacion.",
    priority: "high",
    estimated_impact: "medium",
    difficulty: "easy",
    type: "technical",
    implementation_type: "Contenido + JSON-LD",
    affected_pages: [baseUrl, `${baseUrl}/${industrySlug}`],
    suggested_action: "Agregar 6 a 10 preguntas reales por pagina: que es, para quien sirve, diferencia vs alternativas, beneficios, integraciones, precios o siguiente paso. Publicar FAQPage JSON-LD donde aplique.",
    deliverables: ["Bloque FAQ", "FAQPage JSON-LD", "Preguntas por intencion de busqueda", "Validacion de schema"],
    status: "pending",
    audit_id: context.latestAudit?.id ?? "",
    created_at: context.latestAudit?.completed_at ?? null,
  })

  if (numberFrom(snapshot?.citations_count) < 3 || allSignals.includes("source") || allSignals.includes("citation") || allSignals.includes("authority")) {
    add({
      id: "authority-proof",
      category: "Autoridad y confianza",
      title: "Publicar pruebas verificables: casos de éxito, resultados y fuentes citables",
      description: "La auditoria muestra pocas citaciones. La marca necesita activos que la IA pueda usar como evidencia: casos, metricas, clientes, integraciones, certificaciones o articulos fuente.",
      why_important: "Los motores de IA citan y recomiendan con mas confianza cuando encuentran evidencia externa o paginas con claims verificables.",
      priority: "medium",
      estimated_impact: "medium",
      difficulty: "medium",
      type: "authority",
      implementation_type: "Contenido de autoridad",
      affected_pages: [`${baseUrl}/casos-de-exito`, `${baseUrl}/recursos`],
      suggested_action: "Crear al menos un caso de exito, una pagina de recursos y bloques de prueba social en home/landings con resultados concretos y verificables.",
      deliverables: ["Caso de exito", "Bloque de prueba social", "Claims con fuente", "Pagina de recursos citables"],
      status: "pending",
      audit_id: context.latestAudit?.id ?? "",
      created_at: context.latestAudit?.completed_at ?? null,
    })
  }

  if (allSignals.includes("social") || allSignals.includes("influencer") || allSignals.includes("local")) {
    add({
      id: "local-authority-distribution",
      category: "Distribución y autoridad local",
      title: "Convertir presencia local en señales citables, no solo publicar en redes",
      description: "La recomendacion de redes/influencers debe traducirse en activos que la IA pueda encontrar: menciones, articulos, alianzas, eventos y paginas enlazables.",
      why_important: "Las redes ayudan a distribucion, pero la visibilidad GEO mejora cuando esas acciones generan paginas, menciones y fuentes indexables.",
      priority: "medium",
      estimated_impact: "medium",
      difficulty: "hard",
      type: "authority",
      implementation_type: "PR + contenido indexable",
      affected_pages: [`${baseUrl}/recursos`, `${baseUrl}/alianzas`],
      suggested_action: "Crear una pagina de alianzas/participaciones y convertir colaboraciones locales en articulos, menciones y backlinks verificables.",
      deliverables: ["Pagina de alianzas", "Brief de PR local", "Lista de medios/partners", "Contenido indexable por colaboracion"],
      status: "pending",
      audit_id: context.latestAudit?.id ?? "",
      created_at: context.latestAudit?.completed_at ?? null,
    })
  }

  return actions.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority)).slice(0, 6)
}

function normalizeUrl(url: string) {
  return url.replace(/\/$/, "")
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "industria"
}
