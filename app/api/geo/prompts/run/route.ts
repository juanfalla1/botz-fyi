import { NextResponse } from "next/server"
import { getGeoApiClient } from "@/lib/geo/api-auth"
import { getProviderForEngine } from "@/lib/geo/engines/provider-registry"
import { normalizeEngineResponse } from "@/lib/geo/engines/normalizer"

function normalizeEngineName(engine: string) {
  const value = engine.toLowerCase().trim()
  if (value === "chatgpt") return "openai"
  if (value === "ai overviews" || value === "ai-overviews") return "ai_overviews"
  return value
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (error && typeof error === "object") {
    const value = error as { message?: unknown; details?: unknown; code?: unknown; hint?: unknown }
    return [value.message, value.details, value.hint, value.code].filter(Boolean).map(String).join(" | ") || "Unknown error"
  }
  return String(error || "Unknown error")
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const promptId = typeof body.prompt_id === "string" ? body.prompt_id : ""
    const projectId = typeof body.project_id === "string" ? body.project_id : ""
    if (!promptId || !projectId) return NextResponse.json({ error: "project_id and prompt_id are required" }, { status: 400 })

    const { supabase, user } = await getGeoApiClient(req)
    const { data: prompt, error: promptError } = await supabase
      .from("geo_prompts")
      .select("*")
      .eq("id", promptId)
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .maybeSingle()
    if (promptError) throw promptError
    if (!prompt) return NextResponse.json({ error: "Prompt not found" }, { status: 404 })

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, company_name, website_url, country, language, industry, business_goal")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .maybeSingle()
    if (projectError) throw projectError
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

    const { data: competitors } = await supabase
      .from("project_competitors")
      .select("competitor_name")
      .eq("project_id", projectId)
    const competitorNames = (competitors ?? []).map((item) => String(item.competitor_name)).filter(Boolean)
    const engines = Array.isArray(prompt.engines) ? prompt.engines.map((item) => normalizeEngineName(String(item))) : ["openai"]
    const results = []

    for (const engine of engines) {
      try {
        const provider = getProviderForEngine(engine)
        if (!provider || provider.status !== "configured") {
          results.push({ engine, status: "disabled", reason: provider?.reason ?? "Provider unavailable" })
          continue
        }

        const raw = await provider.runPrompt({
          prompt: prompt.prompt,
          brandName: project.company_name,
          brandDomain: String(project.website_url).replace(/^https?:\/\//, ""),
          competitorNames,
          neutral: true,
        })
        const normalized = normalizeEngineResponse({
          engine: provider.id,
          prompt: prompt.prompt,
          mode: "live",
          raw,
          brandName: project.company_name,
          brandDomain: String(project.website_url).replace(/^https?:\/\//, ""),
          brandAliases: [],
          domainAliases: [],
          competitorNames,
          competitorAliases: {},
          competitorDomainAliases: {},
          stopwords: [],
          language: project.language,
          country: project.country,
        })
        results.push({
          engine: provider.id,
          status: "live",
          mentioned: normalized.brandMentioned,
          position: normalized.rankingPosition,
          won: normalized.won,
          confidence: normalized.confidence,
          answer_preview: normalized.rawText.slice(0, 600),
          citations: normalized.citations,
          competitors: normalized.competitorMentions,
        })
      } catch (error) {
        results.push({ engine, status: "error", reason: errorMessage(error) })
      }
    }

    const liveResults = results.filter((item) => item.status === "live")
    const mentions = liveResults.filter((item) => Boolean(item.mentioned)).length
    const positions = liveResults.map((item) => typeof item.position === "number" ? item.position : 0).filter((item) => item > 0)
    const visibility = liveResults.length > 0 ? Math.round((mentions / liveResults.length) * 100) : 0
    const position = positions.length > 0 ? Math.round((positions.reduce((sum, item) => sum + item, 0) / positions.length) * 10) / 10 : 0

    const metadata = {
      ...(prompt.metadata && typeof prompt.metadata === "object" ? prompt.metadata : {}),
      last_run: new Date().toISOString(),
      last_run_results: results,
      visibility,
      mentions,
      position,
      trend: mentions > 0 ? "up" : "stable",
    }

    const { data: updated, error: updateError } = await supabase
      .from("geo_prompts")
      .update({ metadata })
      .eq("id", promptId)
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .select("*")
      .single()
    if (updateError) throw updateError

    return NextResponse.json({ data: { prompt: updated, results }, mode: "live" })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not run prompt" }, { status: 500 })
  }
}
