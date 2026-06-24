import type { GeneratedPrompt, PipelineContext } from "@/lib/geo/pipeline/types"
import type { CrawledPage } from "@/lib/geo/crawler"

export function buildBasePrompts(ctx: PipelineContext, crawledPages: CrawledPage[] = []): GeneratedPrompt[] {
  const domain = ctx.project.website_url.replace(/^https?:\/\//, "")
  const isEnglish = isEnglishLanguage(ctx.project.language)
  const pageContext = buildPageContext(crawledPages, ctx.project.company_name, ctx.project.website_url)
  const categoryContext = refineCategoryContext(buildCategoryContext(ctx.project.industry, ctx.project.business_goal, isEnglish, pageContext), isEnglish)
  if (!categoryContext) return []
  const competitorNames = ctx.competitors
    .filter((competitor) => !isSameEntity(ctx.project.company_name, ctx.project.website_url, competitor.name, competitor.domain))
    .map((c) => c.name)
    .slice(0, 3)
  const competitorPrompts = competitorNames.map((competitorName) => ({
    category: "comparison",
    prompt: isEnglish
      ? `Compare ${ctx.project.company_name} vs ${competitorName} for ${categoryContext} in ${ctx.project.country}. Which option is stronger for buyers and why?`
      : `Compara ${ctx.project.company_name} vs ${competitorName} para ${categoryContext} en ${ctx.project.country}. ¿Qué opción es más fuerte para compradores y por qué?`,
  }))

  const templates = isEnglish
    ? [
        { category: "spontaneous", prompt: `Which companies offer ${categoryContext} in ${ctx.project.country}?` },
        { category: "spontaneous", prompt: `What platforms help B2B teams with ${categoryContext}?` },
        { category: "spontaneous", prompt: `What company would you recommend for ${categoryContext} in ${ctx.project.country}, and why?` },
        { category: "assisted", prompt: `When evaluating ${ctx.project.company_name} for ${categoryContext}, what strengths, gaps and proof points should a buyer verify?` },
        { category: "citation", prompt: `Find external trusted sources mentioning ${domain}. Exclude the brand's own website.` },
        ...competitorPrompts,
      ]
    : [
        { category: "spontaneous", prompt: `¿Qué empresas ofrecen ${categoryContext} en ${ctx.project.country}?` },
        { category: "spontaneous", prompt: `¿Qué plataformas ayudan a equipos B2B con ${categoryContext}?` },
        { category: "spontaneous", prompt: `¿Qué empresa recomendarías para ${categoryContext} en ${ctx.project.country} y por qué?` },
        { category: "assisted", prompt: `Al evaluar ${ctx.project.company_name} para ${categoryContext}, ¿qué fortalezas, brechas y pruebas debería validar un comprador?` },
        { category: "citation", prompt: `Encuentra fuentes externas confiables que mencionen ${domain}. Excluye el sitio propio de la marca.` },
        ...competitorPrompts,
      ]

  const prompts: GeneratedPrompt[] = []
  for (const engine of ctx.engines) {
    for (const basePrompt of templates) {
      prompts.push({ engine, prompt: basePrompt.prompt, category: basePrompt.category })
    }
  }
  return prompts
}

function buildCategoryContext(industry: string, businessGoal: string, isEnglish: boolean, pageContext: string | null = null) {
  const cleanIndustry = cleanup(industry)
  const cleanGoal = cleanup(businessGoal)
  const genericGoal = /^(measure and improve|medir y mejorar|mejorar visibilidad|ai visibility|geo visibility|visibilidad)/i.test(cleanGoal)
  const genericIndustry = isGenericCategory(cleanIndustry)

  if (pageContext && !isGenericCategory(pageContext)) return pageContext

  if (cleanGoal && !genericGoal && !isGenericCategory(cleanGoal)) {
    if (!cleanIndustry || cleanGoal.toLowerCase().includes(cleanIndustry.toLowerCase())) return cleanGoal
    return isEnglish ? `${cleanGoal} in ${cleanIndustry}` : `${cleanGoal} en ${cleanIndustry}`
  }

  if (genericIndustry) {
    return null
  }

  return cleanIndustry || (isEnglish ? "the target business category" : "la categoría empresarial objetivo")
}

function refineCategoryContext(value: string | null, isEnglish: boolean) {
  const context = cleanup(value ?? "")
  if (!context) return null
  const lower = context.toLowerCase()
  const isAiAutomationRevenue = /ai agents|agentes de ia|automation|automatiz|revenue|ventas|leads|whatsapp|soporte|support|sales/.test(lower) && /ai|ia|agent|agente|automat/.test(lower)
  if (!isAiAutomationRevenue) return context
  return isEnglish
    ? "AI agents for automating sales, customer support, WhatsApp conversations and lead follow-up"
    : "agentes de IA para automatizar ventas, soporte al cliente, conversaciones de WhatsApp y seguimiento de leads"
}

function isGenericCategory(value: string) {
  const normalized = cleanup(value).toLowerCase()
  if (!normalized) return true
  const broadCategories = /^(saas\s*\/\s*software|software|saas|technology|tecnologia|tecnología|services|servicios|e-?commerce|comercio electronico|comercio electrónico|retail|marketplace|tienda online|ventas online)$/i
  if (broadCategories.test(normalized)) return true
  const words = normalized.split(/\s+/).filter(Boolean)
  return words.length <= 2 && /(e-?commerce|software|saas|retail|marketplace|servicios|services|tecnolog)/i.test(normalized)
}

function cleanup(value: string) {
  return String(value || "").replace(/\s+/g, " ").trim()
}

function buildPageContext(pages: CrawledPage[], companyName: string, websiteUrl: string) {
  const text = pages
    .slice(0, 5)
    .map((page) => [page.title, page.description, page.content.slice(0, 2500)].filter(Boolean).join(". "))
    .join(" ")
  const cleaned = cleanup(text)
  if (!cleaned) return null

  const sentences = cleaned.split(/(?<=[.!?])\s+/).map((item) => cleanup(item)).filter(Boolean)
  const selected = sentences
    .map((sentence) => ({ sentence, score: scorePageContextSentence(sentence) }))
    .filter((item) => item.sentence.length >= 35 && item.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.sentence ?? sentences[0]
  if (!selected) return null

  return removeBrandFromContext(selected, companyName, websiteUrl).replace(/\s+/g, " ").slice(0, 220).trim()
}

function scorePageContextSentence(sentence: string) {
  const value = sentence.toLowerCase()
  let score = 0
  const productSignals = [
    /automat/, /whatsapp/, /crm/, /agente|agent/, /\bia\b|\bai\b/, /venta|sales/, /soporte|support/, /cliente|customer/, /plataforma|platform/, /software/, /soluci[oó]n|solution/, /cotiza|quote/, /lead/, /marketing/, /call|voz|voice/, /b2b/, /e-?commerce|commerce/, /reservas?|booking/, /salud|health/, /finanzas?|finance/, /inmobiliari|real estate/, /contabilidad|accounting/
  ]
  for (const signal of productSignals) if (signal.test(value)) score += 2
  if (/para\s+(empresas|equipos|pymes|negocios|clientes)|for\s+(businesses|teams|companies|customers)/.test(value)) score += 3
  if (/automatiza|mejora|reduce|aumenta|captaci[oó]n|seguimiento|convierte|optimize|automate|improve|increase|generate|convert/.test(value)) score += 2
  if (/contacto|terms|privacy|cookies|login|sign in|agenda una demo|book a demo/.test(value)) score -= 4
  if (/^\s*(home|inicio|blog|pricing|precios|terms|privacy)\b/.test(value)) score -= 3
  return score
}

function removeBrandFromContext(value: string, companyName: string, websiteUrl: string) {
  const brand = cleanup(companyName)
  const host = websiteUrl.replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0]
  const hostName = host.split(".")[0] ?? ""
  return value
    .replace(new RegExp(`^\\s*${escapeRegExp(brand)}\\s*[|:–—-]\\s*`, "i"), "")
    .replace(new RegExp(`^\\s*${escapeRegExp(hostName)}\\s*[|:–—-]\\s*`, "i"), "")
    .replace(new RegExp(`\\b${escapeRegExp(brand)}\\b\\s*[|:–—-]?\\s*`, "gi"), "")
    .trim()
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function isEnglishLanguage(value: string) {
  const language = value.toLowerCase().trim()
  return language === "en" || language.startsWith("en-") || language.includes("ingl") || language.includes("english")
}

function isSameEntity(companyName: string, websiteUrl: string, competitorName: string, competitorDomain: string | null) {
  const projectName = normalizeEntity(companyName)
  const projectHost = normalizeHost(websiteUrl)
  const projectHostName = normalizeEntity(projectHost.split(".")[0] ?? "")
  const candidateName = normalizeEntity(competitorName)
  const candidateHost = normalizeHost(competitorDomain ?? competitorName)
  return Boolean(candidateName && (candidateName === projectName || candidateName === projectHostName)) || Boolean(candidateHost && projectHost && candidateHost === projectHost)
}

function normalizeEntity(value: string) {
  return value.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/.?#]/)[0].replace(/[^a-z0-9]+/g, "").trim()
}

function normalizeHost(value: string) {
  return value.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0]
}
