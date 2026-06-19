import { NextResponse } from "next/server"
import { getGeoApiClient } from "@/lib/geo/api-auth"
import { competitiveSnapshot, latestAuditSnapshot, latestCrawlEvidence, loadGeoActionContext, normalizePriority, numberFrom, objectArray, previousAuditSnapshot, priorityRank } from "@/lib/geo/action-engine"
import { isPositiveBrandEvidence } from "@/lib/geo/evidence-rules"

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
  improves_metric: string
  estimated_score_lift: { min: number; max: number }
  estimated_time: string
  evidence: Array<{ label: string; value: string }>
  status: "pending" | "in_progress" | "implemented"
  audit_id: string
  created_at: string | null
}

type ExecutionOffer = {
  id: string
  name: string
  solves: string
  improves: string[]
  deliverables: string[]
}

export async function GET(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await params
    const { supabase, user } = await getGeoApiClient(req)
    const context = await loadGeoActionContext(supabase, user.id, projectId)
    if (!context) return NextResponse.json({ error: "Project not found" }, { status: 404 })
    const latest = latestAuditSnapshot(context)
    const actions = buildActions(context)
    const competitive = hasCompetitiveSample(latest) ? competitiveSnapshot(context) : emptyCompetitiveSnapshot(context.competitors.length)
    const crawl = latestCrawlEvidence(context)

    return NextResponse.json({
      mode: "live",
      data: {
        project: context.project,
        latest_audit: latest,
        previous_audit: previousAuditSnapshot(context),
        crawl_evidence: crawl,
        competitive_insights: competitive,
        execution_framework: executionFramework(),
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
  const baseUrl = normalizeUrl(project.website_url)
  const actionCategory = inferActionCategory(context)
  const industrySlug = slugify(actionCategory)
  const competitive = competitiveSnapshot(context)
  const validCompetitors = context.competitors.filter((competitor) => !isSameEntity(project, competitor.name, competitor.domain))
  const spontaneousVisibility = numberFrom(snapshot?.spontaneous_visibility)
  const citationCoverage = numberFrom(snapshot?.citation_coverage)
  const competitiveVisibility = numberFrom(snapshot?.competitive_visibility)
  const hasCompetitive = hasCompetitiveSample(snapshot)
  const topCompetitor = hasCompetitive && competitive.top_competitor && !isSameEntity(project, competitive.top_competitor.name, null) ? competitive.top_competitor : null
  const crawl = latestCrawlEvidence(context)
  const previous = previousAuditSnapshot(context)
  const crawlText = summarizeCrawl(crawl)
  const promptText = summarizePrompts(context)
  const marketContext = [actionCategory, project.country].filter(Boolean).join(" en ") || "su mercado"
  const missedNeutralPrompts = missedNeutralPromptExamples(context)
  const actions: ActionItem[] = []
  const add = (action: ActionItem) => {
    if (actions.some((item) => item.category === action.category)) return
    actions.push(action)
  }

  if (spontaneousVisibility < 60) {
    add({
      id: "homepage-ai-positioning",
      category: "Posicionamiento de marca",
      title: `Clarificar el posicionamiento de ${project.company_name} para ${actionCategory}`,
      description: `La auditoria muestra ${spontaneousVisibility}% de visibilidad espontanea para ${project.company_name}. ${promptText} ${crawlText}`,
      why_important: `Los modelos generativos necesitan entender entidad, casos de uso, mercado y diferenciales desde paginas rastreables. Para ${project.company_name}, la prioridad es convertir el sitio en una fuente clara sobre ${marketContext}.`,
      priority: "high",
      estimated_impact: "high",
      difficulty: "medium",
      type: "content",
      implementation_type: "Copy + estructura de landing",
      affected_pages: [baseUrl],
      suggested_action: `Actualizar la home de ${project.company_name} con una propuesta de valor verificable para ${actionCategory}: para quien es, casos de uso, diferenciales, pruebas y FAQs alineadas con los prompts evaluados de esta auditoria.`,
      deliverables: [`Nuevo hero para ${actionCategory}`, "Seccion de casos de uso", "Bloque 'por que elegirnos'", "FAQs orientadas a prompts de IA"],
      improves_metric: "Visibilidad espontánea + claridad del posicionamiento",
      estimated_score_lift: { min: 5, max: 12 },
      estimated_time: "3 a 5 días",
      evidence: evidenceFor("positioning", context, crawl, previous),
      status: "pending",
      audit_id: context.latestAudit?.id ?? "",
      created_at: context.latestAudit?.completed_at ?? null,
    })
  }

  if (hasCompetitive && (numberFrom(snapshot?.prompts_lost) > 0 || topCompetitor || validCompetitors.length > 0) && (topCompetitor || validCompetitors.length > 0)) {
    const competitorName = topCompetitor?.name ?? validCompetitors[0]?.name ?? "competidores principales"
    add({
      id: "comparison-page",
      category: "Comparación competitiva",
      title: `Defender a ${project.company_name} frente a ${competitorName}`,
      description: topCompetitor
        ? `${competitorName} aparece como competidor mencionado en ${topCompetitor.mentions} resultado(s) de IA y el win rate competitivo actual es ${competitiveVisibility}%. La marca necesita contenido de decision que explique diferencias, fortalezas y casos de uso frente a ese competidor.`
        : `La marca tiene competidores definidos y el win rate competitivo actual es ${competitiveVisibility}%. Falta contenido de decision para prompts donde el usuario compara opciones, alternativas o proveedores.`,
      why_important: "Las consultas tipo 'mejores', 'alternativas', 'vs' y 'comparar' son prompts de alta intencion comercial. Si la marca no tiene contenido comparativo, los motores de IA se apoyan en competidores con mejor evidencia.",
      priority: "high",
      estimated_impact: "high",
      difficulty: "medium",
      type: "competitive",
      implementation_type: "Nueva pagina comparativa",
      affected_pages: [`${baseUrl}/comparativas`, `${baseUrl}/alternativas`, `${baseUrl}/${slugify(project.company_name)}-vs-${slugify(competitorName)}`],
      suggested_action: `Publicar una pagina '${project.company_name} vs ${competitorName}' y una matriz de alternativas con diferencias, casos de uso, alcance, FAQs y prueba social verificable.`,
      deliverables: [`Pagina ${project.company_name} vs ${competitorName}`, "Pagina de alternativas", "Tabla comparativa", "FAQs de decision"],
      improves_metric: "Win rate competitivo",
      estimated_score_lift: { min: 4, max: 10 },
      estimated_time: "4 a 7 días",
      evidence: evidenceFor("competitive", context, crawl, previous),
      status: "pending",
      audit_id: context.latestAudit?.id ?? "",
      created_at: context.latestAudit?.completed_at ?? null,
    })
  }

  if (spontaneousVisibility < 70) {
    add({
      id: "industry-landing",
      category: "Contenido por industria",
      title: `Crear una landing para ${actionCategory} enfocada en prompts neutrales`,
      description: `La muestra neutral no esta recomendando a ${project.company_name}. ${promptText} Una landing especifica debe responder esa intencion sin depender de que el usuario nombre la marca.`,
      why_important: `Si la IA no encuentra una pagina clara sobre ${marketContext}, tiende a recomendar alternativas con mejor evidencia publica o contenido mas especifico. Esta accion debe responder las consultas reales donde la marca no aparecio.`,
      priority: spontaneousVisibility < 40 ? "high" : "medium",
      estimated_impact: "high",
      difficulty: "medium",
      type: "content",
      implementation_type: "Nueva pagina/landing",
      affected_pages: [`${baseUrl}/${industrySlug}`],
      suggested_action: `Crear una pagina para ${actionCategory} que responda los prompts neutrales evaluados${missedNeutralPrompts.length > 0 ? `, especialmente: ${missedNeutralPrompts.slice(0, 2).map((prompt) => `"${prompt}"`).join(" y ")}` : ""}. Debe incluir problema, solucion, casos de uso, FAQs, evidencia y CTA.`,
      deliverables: [`Landing sobre ${actionCategory}`, "Copy completo", "FAQs del caso de uso", "Metadata SEO/GEO"],
      improves_metric: "Visibilidad espontánea",
      estimated_score_lift: { min: 5, max: 12 },
      estimated_time: "3 a 6 días",
      evidence: evidenceFor("landing", context, crawl, previous),
      status: "pending",
      audit_id: context.latestAudit?.id ?? "",
      created_at: context.latestAudit?.completed_at ?? null,
    })
  }

  if (hasCompetitive && topCompetitor) {
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
      improves_metric: "Win rate competitivo + autoridad/confianza",
      estimated_score_lift: { min: 4, max: 9 },
      estimated_time: "5 a 8 días",
      evidence: evidenceFor("competitive", context, crawl, previous),
      status: "pending",
      audit_id: context.latestAudit?.id ?? "",
      created_at: context.latestAudit?.completed_at ?? null,
    })
  }

  add({
    id: "faq-schema",
    category: "Estructura para IA",
    title: `Agregar FAQs y Schema JSON-LD sobre ${actionCategory}`,
    description: `Las paginas deben responder preguntas concretas que usuarios hacen a motores de IA sobre ${actionCategory}. Esas respuestas deben estar visibles y estructuradas.`,
    why_important: "Las FAQs ayudan a los modelos a extraer respuestas directas y el schema mejora la claridad semantica para buscadores y sistemas de recuperacion.",
    priority: spontaneousVisibility < 35 ? "high" : "medium",
    estimated_impact: "medium",
    difficulty: "easy",
    type: "technical",
    implementation_type: "Contenido + JSON-LD",
    affected_pages: [baseUrl, `${baseUrl}/${industrySlug}`],
    suggested_action: `Agregar 6 a 10 preguntas reales por pagina sobre ${actionCategory}: que es, para quien sirve, diferencia vs alternativas, beneficios, integraciones, precios o siguiente paso. Publicar FAQPage JSON-LD donde aplique.`,
    deliverables: [`Bloque FAQ sobre ${actionCategory}`, "FAQPage JSON-LD", "Preguntas por intencion de busqueda", "Validacion de schema"],
    improves_metric: "Claridad del posicionamiento",
    estimated_score_lift: { min: 2, max: 6 },
    estimated_time: "1 a 3 días",
    evidence: evidenceFor("faq", context, crawl, previous),
    status: "pending",
    audit_id: context.latestAudit?.id ?? "",
    created_at: context.latestAudit?.completed_at ?? null,
  })

  if (numberFrom(snapshot?.citations_count) < 3 || citationCoverage < 50) {
    add({
      id: "authority-proof",
      category: "Autoridad y confianza",
      title: `Crear evidencia citable para ${project.company_name}`,
      description: `La auditoria muestra cobertura de citations de ${citationCoverage}%. ${project.company_name} necesita activos que puedan verificarse y citarse desde respuestas IA.`,
      why_important: `Sin evidencia verificable, las respuestas pueden mencionar fuentes de terceros o no citar a ${project.company_name}. Las citas deben salir de paginas reales, casos, datos y claims comprobables.`,
      priority: citationCoverage < 30 ? "high" : "medium",
      estimated_impact: "medium",
      difficulty: "medium",
      type: "authority",
      implementation_type: "Contenido de autoridad",
      affected_pages: [`${baseUrl}/casos-de-exito`, `${baseUrl}/recursos`],
      suggested_action: `Crear activos citables para ${project.company_name}: caso de uso, metodologia, FAQs con respuestas directas y claims verificables conectados al sitio auditado.`,
      deliverables: ["Caso de exito", "Bloque de prueba social", "Claims con fuente", "Pagina de recursos citables"],
      improves_metric: "Cobertura de citations + autoridad/confianza",
      estimated_score_lift: { min: 3, max: 8 },
      estimated_time: "4 a 8 días",
      evidence: evidenceFor("authority", context, crawl, previous),
      status: "pending",
      audit_id: context.latestAudit?.id ?? "",
      created_at: context.latestAudit?.completed_at ?? null,
    })
  }

  return actions.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority)).slice(0, 6)
}

function hasCompetitiveSample(snapshot: ReturnType<typeof latestAuditSnapshot>) {
  return numberFrom(snapshot?.competitive_results) > 0
}

function emptyCompetitiveSnapshot(trackedCompetitors: number) {
  return {
    tracked_competitors: trackedCompetitors,
    mentioned_competitors: 0,
    top_competitor: null,
    competitors: [],
  }
}

function summarizeCrawl(crawl: ReturnType<typeof latestCrawlEvidence>) {
  if (crawl.pages_crawled === 0) return "No hay paginas crawl disponibles para respaldar cambios especificos del sitio."
  const pages = crawl.pages
    .slice(0, 3)
    .map((page) => page.title || page.url)
    .filter(Boolean)
  return `El crawl leyo ${crawl.pages_crawled} pagina(s), ${crawl.total_words} palabras, incluyendo: ${pages.join("; ")}.`
}

function summarizePrompts(context: Awaited<ReturnType<typeof loadGeoActionContext>> extends infer T ? NonNullable<T> : never) {
  const queryPrompts = context.aiQueries.map((query) => {
    const answer = query.ai_answers[0]
    const raw = answer?.raw_response && typeof answer.raw_response === "object" ? answer.raw_response : {}
    const promptKind = String(raw.prompt_kind ?? query.intent ?? "spontaneous")
    return {
      prompt: query.prompt,
      prompt_kind: promptKind,
      mentioned: isPositiveBrandEvidence({
        prompt: query.prompt,
        answerText: String(answer?.answer_text ?? ""),
        rawMentioned: Boolean(raw.brand_mentioned),
        promptKind,
        companyName: context.project.company_name,
        websiteUrl: context.project.website_url,
      }),
    }
  })
  if (queryPrompts.length > 0) {
    const neutral = queryPrompts.filter((item) => String(item.prompt_kind ?? "spontaneous") === "spontaneous")
    const missed = neutral.filter((item) => item.mentioned === false).map((item) => String(item.prompt ?? "")).filter(Boolean)
    if (missed.length > 0) return `No aparecio en prompts neutrales como: "${missed.slice(0, 2).join('" y "')}".`
    if (neutral.length > 0) return `La auditoria evaluo ${neutral.length} prompt(s) neutrales.`
  }

  const prompts = objectArray(context.latestSummary.evaluated_prompts)
  const neutral = prompts.filter((item) => String(item.prompt_kind ?? "spontaneous") === "spontaneous")
  const missed = neutral.filter((item) => item.mentioned === false).map((item) => String(item.prompt ?? "")).filter(Boolean)
  if (missed.length > 0) return `No aparecio en prompts neutrales como: "${missed.slice(0, 2).join('" y "')}".`
  if (neutral.length > 0) return `La auditoria evaluo ${neutral.length} prompt(s) neutrales.`
  return "La auditoria no guardo detalle suficiente de prompts neutrales para citar ejemplos especificos."
}

function missedNeutralPromptExamples(context: Awaited<ReturnType<typeof loadGeoActionContext>> extends infer T ? NonNullable<T> : never) {
  const fromQueries = context.aiQueries.map((query) => {
    const answer = query.ai_answers[0]
    const raw = answer?.raw_response && typeof answer.raw_response === "object" ? answer.raw_response : {}
    const promptKind = String(raw.prompt_kind ?? query.intent ?? "spontaneous")
    return {
      prompt: query.prompt,
      prompt_kind: promptKind,
      mentioned: isPositiveBrandEvidence({
        prompt: query.prompt,
        answerText: String(answer?.answer_text ?? ""),
        rawMentioned: Boolean(raw.brand_mentioned),
        promptKind,
        companyName: context.project.company_name,
        websiteUrl: context.project.website_url,
      }),
    }
  })
  const source = fromQueries.length > 0 ? fromQueries : objectArray(context.latestSummary.evaluated_prompts)
  return source
    .filter((item) => String(item.prompt_kind ?? "spontaneous") === "spontaneous" && item.mentioned === false)
    .map((item) => String(item.prompt ?? "").trim())
    .filter(Boolean)
}

function inferActionCategory(context: Awaited<ReturnType<typeof loadGeoActionContext>> extends infer T ? NonNullable<T> : never) {
  const prompts = [
    ...context.aiQueries.map((query) => query.prompt),
    ...objectArray(context.latestSummary.evaluated_prompts).map((item) => String(item.prompt ?? "")),
  ].map(cleanText).filter(Boolean)
  const combined = prompts.join(" ").toLowerCase()

  if (/agentes? de ia|ai agents?|whatsapp|seguimiento de leads|lead follow-up|soporte al cliente|customer support/.test(combined)) {
    return "agentes de IA para ventas, soporte, WhatsApp y seguimiento de leads"
  }

  const country = cleanText(context.project.country ?? "")
  for (const prompt of prompts) {
    const extracted = extractCategoryFromPrompt(prompt, country)
    if (extracted && !isGenericActionCategory(extracted)) return extracted
  }

  const goal = cleanText(context.project.business_goal ?? "")
  if (goal && !isGenericActionCategory(goal)) return goal
  const industry = cleanText(context.project.industry ?? "")
  if (industry && !isGenericActionCategory(industry)) return industry
  return "la categoria principal del negocio"
}

function extractCategoryFromPrompt(prompt: string, country: string) {
  const normalized = cleanText(prompt).replace(/[¿?]/g, "")
  const patterns = [
    /(?:para|for)\s+(.+?)\s+(?:en|in)\s+[a-záéíóúñ\s]+$/i,
    /(?:con|with)\s+(.+?)$/i,
    /(?:ofrecen|offer)\s+(.+?)\s+(?:en|in)\s+[a-záéíóúñ\s]+$/i,
  ]
  for (const pattern of patterns) {
    const match = normalized.match(pattern)
    const value = cleanText(match?.[1] ?? "")
    if (!value) continue
    return country ? value.replace(new RegExp(`\\s+${escapeRegExp(country)}$`, "i"), "").trim() : value
  }
  return ""
}

function isGenericActionCategory(value: string) {
  const normalized = cleanText(value).toLowerCase()
  if (!normalized) return true
  return /^(e-?commerce|software|saas|servicios|services|technology|tecnologia|tecnología|retail|marketplace|industria|industry)$/i.test(normalized)
}

function cleanText(value: string) {
  return String(value || "").replace(/\s+/g, " ").trim()
}

function evidenceFor(kind: string, context: Awaited<ReturnType<typeof loadGeoActionContext>> extends infer T ? NonNullable<T> : never, crawl: ReturnType<typeof latestCrawlEvidence>, previous: ReturnType<typeof previousAuditSnapshot>): Array<{ label: string; value: string }> {
  const snapshot = latestAuditSnapshot(context)
  const evidence: Array<{ label: string; value: string }> = []
  evidence.push({ label: "Auditoría", value: snapshot ? `GEO Score ${snapshot.geo_score}/100, visibilidad espontánea ${snapshot.spontaneous_visibility}%` : "Sin auditoría completada" })
  if (previous?.delta) evidence.push({ label: "Cambio vs auditoría anterior", value: `GEO ${formatDelta(previous.delta.geo_score)}, espontánea ${formatDelta(previous.delta.spontaneous_visibility)}, competitivo ${formatDelta(previous.delta.competitive_visibility)}` })
  if (crawl.pages_crawled > 0) evidence.push({ label: "Sitio analizado", value: `${crawl.pages_crawled} página(s), ${crawl.total_words} palabras detectadas` })
  else evidence.push({ label: "Sitio analizado", value: "No se pudo leer el sitio aún; recomendación basada en auditoría IA y prompts guardados" })
  if (kind === "competitive") {
    const competitive = competitiveSnapshot(context)
    evidence.push({ label: "Competencia", value: hasCompetitiveSample(snapshot) && competitive.top_competitor ? `${competitive.top_competitor.name} apareció ${competitive.top_competitor.mentions} vez/veces` : "Sin muestra competitiva suficiente" })
  }
  if (kind === "authority") evidence.push({ label: "Citations", value: `Cobertura ${numberFrom(snapshot?.citation_coverage)}%, fuentes detectadas ${numberFrom(snapshot?.citations_count)}` })
  return evidence
}

function formatDelta(value: number) {
  return `${value > 0 ? "+" : ""}${value}`
}

function isSameEntity(project: { company_name: string; website_url: string }, name: string | null | undefined, domain: string | null | undefined) {
  const projectName = normalizeEntity(project.company_name)
  const projectDomain = normalizeHost(project.website_url)
  const candidateName = normalizeEntity(name ?? "")
  const candidateDomain = normalizeHost(domain ?? "")
  if (candidateName && (candidateName === projectName || candidateName === normalizeEntity(projectDomain.split(".")[0] ?? ""))) return true
  if (candidateDomain && projectDomain && candidateDomain === projectDomain) return true
  return false
}

function normalizeEntity(value: string) {
  return value.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/.?#]/)[0].replace(/[^a-z0-9]+/g, "").trim()
}

function normalizeHost(value: string) {
  return value.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0]
}

function executionFramework(): ExecutionOffer[] {
  return [
    {
      id: "positioning-product-analysis",
      name: "Análisis de producto y posicionamiento",
      solves: "Define qué debe entender la IA sobre la empresa, categoría, casos de uso, diferenciales y mercado objetivo.",
      improves: ["GEO Score", "Visibilidad espontánea", "Win rate competitivo"],
      deliverables: ["Mapa de posicionamiento", "Propuesta de valor", "Mensajes por segmento", "Claims verificables"],
    },
    {
      id: "website-seo-geo",
      name: "Página web, SEO y estructura GEO",
      solves: "Convierte la web en una fuente clara para motores IA y buscadores.",
      improves: ["Visibilidad espontánea", "Cobertura de citations", "Confianza del análisis"],
      deliverables: ["Home optimizada", "SEO técnico", "FAQ Schema", "Páginas citables"],
    },
    {
      id: "landing-pages",
      name: "Landings por industria, producto o caso de uso",
      solves: "Crea páginas específicas que responden preguntas reales de clientes y motores IA.",
      improves: ["Visibilidad espontánea", "Prompts ganados", "Conversión"],
      deliverables: ["Landing sectorial", "Copy completo", "FAQs", "CTA y medición"],
    },
    {
      id: "content-social-citations",
      name: "Contenido, redes y citations",
      solves: "Genera señales externas e internas para que la marca sea mencionable, confiable y verificable.",
      improves: ["Cobertura de citations", "Autoridad", "Presión competitiva"],
      deliverables: ["Calendario de contenido", "Posts de autoridad", "Casos de éxito", "Citations en Google/medios/directorios"],
    },
    {
      id: "competitive-monitoring",
      name: "Vigilancia competitiva y mejora continua",
      solves: "Monitorea si competidores suben y ajusta el plan de ejecución con nuevas auditorías.",
      improves: ["GEO Score", "Win rate competitivo", "Roadmap de ejecución"],
      deliverables: ["Monitoreo recurrente", "Alertas", "Reporte ejecutivo", "Backlog priorizado"],
    },
  ]
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
