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
  const competitorNames = input.competitors.map((competitor) => competitor.name).filter(Boolean).slice(0, 3)
  const competitorText = competitorNames.length > 0 ? competitorNames.join(", ") : isEnglish ? "market alternatives" : "alternativas del mercado"
  const templates = isEnglish
    ? [
        { category: "recommendation", prompt: `What are the best ${input.industry} providers in ${input.country}?` },
        { category: "comparison", prompt: `Compare ${input.company} vs ${competitorText} for ${input.businessGoal}.` },
        { category: "alternative", prompt: `What are the best alternatives to ${competitorText} for ${input.industry}?` },
        { category: "product", prompt: `Which company do you recommend for ${input.industry} solutions in ${input.country}?` },
        { category: "trust", prompt: `What trusted sources mention ${input.company} in the ${input.industry} market?` },
      ]
    : [
        { category: "recommendation", prompt: `Cuales son los mejores proveedores de ${input.industry} en ${input.country}?` },
        { category: "comparison", prompt: `Compara ${input.company} vs ${competitorText} para ${input.businessGoal}.` },
        { category: "alternative", prompt: `Cuales son las mejores alternativas a ${competitorText} para ${input.industry}?` },
        { category: "product", prompt: `Que empresa recomiendas para soluciones de ${input.industry} en ${input.country}?` },
        { category: "trust", prompt: `Que fuentes confiables mencionan a ${input.company} en el mercado de ${input.industry}?` },
      ]

  const seen = new Set<string>()
  return templates.filter((item) => {
    const key = item.prompt.toLowerCase().trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
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
