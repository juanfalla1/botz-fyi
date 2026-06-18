import type { GeneratedPrompt, PipelineContext } from "@/lib/geo/pipeline/types"

export function buildBasePrompts(ctx: PipelineContext): GeneratedPrompt[] {
  const domain = ctx.project.website_url.replace(/^https?:\/\//, "")
  const isEnglish = isEnglishLanguage(ctx.project.language)
  const categoryContext = buildCategoryContext(ctx.project.industry, ctx.project.business_goal, isEnglish)
  const competitorNames = ctx.competitors
    .filter((competitor) => !isSameEntity(ctx.project.company_name, ctx.project.website_url, competitor.name, competitor.domain))
    .map((c) => c.name)
    .slice(0, 3)
  const competitorText = competitorNames.join(", ")

  const templates = isEnglish
    ? [
        { category: "spontaneous", prompt: `What are the best providers for ${categoryContext} in ${ctx.project.country}?` },
        { category: "spontaneous", prompt: `Which brands are most cited for ${categoryContext}?` },
        { category: "spontaneous", prompt: `What company do you recommend for ${categoryContext} in ${ctx.project.country}, and why?` },
        { category: "citation", prompt: `Find trusted sources mentioning ${domain}.` },
        ...(competitorText ? [{ category: "competitive", prompt: `Compare ${ctx.project.company_name} vs ${competitorText} for ${categoryContext} in ${ctx.project.country}. Which option is stronger for buyers and why?` }] : []),
      ]
    : [
        { category: "spontaneous", prompt: `¿Cuáles son los mejores proveedores para ${categoryContext} en ${ctx.project.country}?` },
        { category: "spontaneous", prompt: `¿Qué marcas son más citadas para ${categoryContext}?` },
        { category: "spontaneous", prompt: `¿Qué empresa recomiendas para ${categoryContext} en ${ctx.project.country} y por qué?` },
        { category: "citation", prompt: `Encuentra fuentes confiables que mencionen ${domain}.` },
        ...(competitorText ? [{ category: "competitive", prompt: `Compara ${ctx.project.company_name} vs ${competitorText} para ${categoryContext} en ${ctx.project.country}. ¿Qué opción es más fuerte para compradores y por qué?` }] : []),
      ]

  const prompts: GeneratedPrompt[] = []
  for (const engine of ctx.engines) {
    for (const basePrompt of templates) {
      prompts.push({ engine, prompt: basePrompt.prompt, category: basePrompt.category })
    }
  }
  return prompts
}

function buildCategoryContext(industry: string, businessGoal: string, isEnglish: boolean) {
  const cleanIndustry = cleanup(industry)
  const cleanGoal = cleanup(businessGoal)
  const genericGoal = /^(measure and improve|medir y mejorar|mejorar visibilidad|ai visibility|geo visibility|visibilidad)/i.test(cleanGoal)
  const genericIndustry = /^(saas\s*\/\s*software|software|saas|technology|tecnologia|tecnología|services|servicios)$/i.test(cleanIndustry)

  if (cleanGoal && !genericGoal) {
    if (!cleanIndustry || cleanGoal.toLowerCase().includes(cleanIndustry.toLowerCase())) return cleanGoal
    return isEnglish ? `${cleanGoal} in ${cleanIndustry}` : `${cleanGoal} en ${cleanIndustry}`
  }

  if (genericIndustry) {
    return isEnglish
      ? `${cleanIndustry || "the target category"} solutions for the specific business use case described on the company's website`
      : `soluciones de ${cleanIndustry || "la categoría objetivo"} para el caso de uso específico descrito en el sitio web de la empresa`
  }

  return cleanIndustry || (isEnglish ? "the target business category" : "la categoría empresarial objetivo")
}

function cleanup(value: string) {
  return String(value || "").replace(/\s+/g, " ").trim()
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
