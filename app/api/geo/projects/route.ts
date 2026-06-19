import { NextResponse } from "next/server";
import { projectSchema } from "@geo/validators/project.schema";
import { getGeoApiClient } from "@/lib/geo/api-auth";
import { createProject, listProjects } from "@/lib/geo/repositories/projects.repo";

function isAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "")
  return message.includes("token") || message.includes("Unauthorized") || message.includes("Missing bearer") || message.includes("Supabase server env")
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (error && typeof error === "object" && "message" in error) return String((error as { message?: unknown }).message)
  return String(error || "Unexpected project error")
}

function normalizeCompetitorInput(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  const withoutProtocol = trimmed.replace(/^https?:\/\//i, "").replace(/^www\./i, "")
  const host = withoutProtocol.split(/[/?#]/)[0]
  const looksLikeDomain = /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host)
  return {
    name: looksLikeDomain ? host.split(".")[0].replace(/[-_]+/g, " ") : trimmed,
    domain: looksLikeDomain ? host : null,
  }
}

function buildInitialPrompts(input: { company: string; industry: string; country: string; language: string; businessGoal: string; competitors: Array<{ name: string }> }) {
  const isEnglish = input.language.toLowerCase().startsWith("en") || input.language.toLowerCase().includes("ingl")
  const categoryContext = refineCategoryContext(buildCategoryContext(input.industry, input.businessGoal, isEnglish), isEnglish)
  if (!categoryContext) return []
  const companyKey = normalizeEntity(input.company)
  const competitorNames = input.competitors.map((competitor) => competitor.name).filter((name) => Boolean(name) && normalizeEntity(name) !== companyKey).slice(0, 3)
  const competitorText = competitorNames.join(", ")
  const templates = isEnglish
    ? [
        { category: "recommendation", prompt: `Which companies offer ${categoryContext} in ${input.country}?` },
        { category: "product", prompt: `What platforms help B2B teams with ${categoryContext}?` },
        { category: "product", prompt: `What company would you recommend for ${categoryContext} in ${input.country}, and why?` },
        { category: "assisted", prompt: `When evaluating ${input.company} for ${categoryContext}, what strengths, gaps and proof points should a buyer verify?` },
        ...(competitorNames.length > 0 ? [{ category: "comparison", prompt: `Compare ${input.company} vs ${competitorText} for ${categoryContext} in ${input.country}. Which option is stronger for buyers and why?` }] : []),
        ...(competitorNames.length > 0 ? [{ category: "alternative", prompt: `What are the best alternatives to ${competitorText} for ${categoryContext}?` }] : []),
        { category: "trust", prompt: `What external trusted sources mention ${input.company} or ${input.company.toLowerCase()} for ${categoryContext}? Exclude the brand's own website.` },
      ]
    : [
        { category: "recommendation", prompt: `¿Qué empresas ofrecen ${categoryContext} en ${input.country}?` },
        { category: "product", prompt: `¿Qué plataformas ayudan a equipos B2B con ${categoryContext}?` },
        { category: "product", prompt: `¿Qué empresa recomendarías para ${categoryContext} en ${input.country} y por qué?` },
        { category: "assisted", prompt: `Al evaluar ${input.company} para ${categoryContext}, ¿qué fortalezas, brechas y pruebas debería validar un comprador?` },
        ...(competitorNames.length > 0 ? [{ category: "comparison", prompt: `Compara ${input.company} vs ${competitorText} para ${categoryContext} en ${input.country}. ¿Qué opción es más fuerte para compradores y por qué?` }] : []),
        ...(competitorNames.length > 0 ? [{ category: "alternative", prompt: `¿Cuáles son las mejores alternativas a ${competitorText} para ${categoryContext}?` }] : []),
        { category: "trust", prompt: `¿Qué fuentes externas confiables mencionan a ${input.company} para ${categoryContext}? Excluye el sitio propio de la marca.` },
      ]

  const seen = new Set<string>()
  return templates.filter((item) => {
    const key = item.prompt.toLowerCase().trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function buildCategoryContext(industry: string, businessGoal: string, isEnglish: boolean) {
  const cleanIndustry = cleanup(industry)
  const cleanGoal = cleanup(businessGoal)
  const genericGoal = /^(measure and improve|medir y mejorar|mejorar visibilidad|ai visibility|geo visibility|visibilidad)/i.test(cleanGoal)
  const genericIndustry = isGenericCategory(cleanIndustry)

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

function normalizeEntity(value: string) {
  return value.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/.?#]/)[0].replace(/[^a-z0-9]+/g, "").trim()
}

export async function GET(req: Request) {
  try {
    const { supabase, user } = await getGeoApiClient(req);
    const data = await listProjects(supabase, user.id);
    return NextResponse.json({ data, mode: "live" });
  } catch (error) {
    return NextResponse.json({ data: [], mode: "error", error: errorMessage(error) }, { status: isAuthError(error) ? 401 : 500 });
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = projectSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    const { supabase, user } = await getGeoApiClient(req);
    const data = await createProject(supabase, {
      user_id: user.id,
      workspace_id: body.workspace_id ?? null,
      company_name: parsed.data.company_name,
      website_url: parsed.data.website_url,
      country: parsed.data.country,
      language: parsed.data.language,
      industry: parsed.data.industry,
      business_goal: parsed.data.business_goal,
    });

    const competitors = parsed.data.competitors.map(normalizeCompetitorInput).filter(Boolean) as Array<{ name: string; domain: string | null }>
    if (competitors.length > 0) {
      const { error: competitorsError } = await supabase.from("competitors").insert(
        competitors.map((competitor) => ({
          user_id: user.id,
          project_id: data.id,
          name: competitor.name,
          domain: competitor.domain,
        }))
      )
      if (competitorsError) throw competitorsError
    }

    const initialPrompts = buildInitialPrompts({
      company: parsed.data.company_name,
      industry: parsed.data.industry,
      country: parsed.data.country,
      language: parsed.data.language,
      businessGoal: parsed.data.business_goal,
      competitors,
    })
    if (initialPrompts.length > 0) {
      const { error: promptsError } = await supabase.from("geo_prompts").insert(
        initialPrompts.map((item) => ({
          user_id: user.id,
          project_id: data.id,
          prompt: item.prompt,
          category: item.category,
          engines: ["openai", "gemini", "perplexity"],
          country: parsed.data.country,
          language: parsed.data.language,
          enabled: true,
          metadata: { source: "project_creation" },
        }))
      )
      if (promptsError) throw promptsError
    }

    return NextResponse.json({ data, mode: "live" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: isAuthError(error) ? 401 : 500 });
  }
}
