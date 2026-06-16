import type { GeneratedPrompt, PipelineContext } from "@/lib/geo/pipeline/types"

export function buildBasePrompts(ctx: PipelineContext): GeneratedPrompt[] {
  const domain = ctx.project.website_url.replace(/^https?:\/\//, "")
  const isEnglish = isEnglishLanguage(ctx.project.language)
  const competitorNames = ctx.competitors
    .filter((competitor) => !isSameEntity(ctx.project.company_name, ctx.project.website_url, competitor.name, competitor.domain))
    .map((c) => c.name)
    .slice(0, 3)
  const competitorText = competitorNames.join(", ")

  const templates = isEnglish
    ? [
        { category: "spontaneous", prompt: `What are the best ${ctx.project.industry} providers in ${ctx.project.country}?` },
        { category: "spontaneous", prompt: `Which brand is most cited for ${ctx.project.industry} solutions?` },
        { category: "spontaneous", prompt: `What company do you recommend for ${ctx.project.industry} and why?` },
        { category: "citation", prompt: `Find trusted sources mentioning ${domain}.` },
        ...(competitorText ? [{ category: "competitive", prompt: `Compare ${ctx.project.company_name} vs ${competitorText} for ${ctx.project.business_goal}.` }] : []),
      ]
    : [
        { category: "spontaneous", prompt: `¿Cuáles son los mejores proveedores de ${ctx.project.industry} en ${ctx.project.country}?` },
        { category: "spontaneous", prompt: `¿Qué marca es más citada para soluciones de ${ctx.project.industry}?` },
        { category: "spontaneous", prompt: `¿Qué empresa recomiendas para ${ctx.project.industry} y por qué?` },
        { category: "citation", prompt: `Encuentra fuentes confiables que mencionen ${domain}.` },
        ...(competitorText ? [{ category: "competitive", prompt: `Compara ${ctx.project.company_name} vs ${competitorText} para ${ctx.project.business_goal}.` }] : []),
      ]

  const prompts: GeneratedPrompt[] = []
  for (const engine of ctx.engines) {
    for (const basePrompt of templates) {
      prompts.push({ engine, prompt: basePrompt.prompt, category: basePrompt.category })
    }
  }
  return prompts
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
