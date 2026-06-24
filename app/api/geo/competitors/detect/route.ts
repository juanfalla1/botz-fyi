import { NextResponse } from "next/server"
import { z } from "zod"
import { getGeoApiClient } from "@/lib/geo/api-auth"

const detectSchema = z.object({
  project_id: z.string().uuid(),
})

type SuggestedCompetitor = {
  name: string
  domain: string | null
  reason: string
}

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = detectSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  try {
    const { supabase, user } = await getGeoApiClient(req)
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, company_name, website_url, country, language, industry, business_goal")
      .eq("id", parsed.data.project_id)
      .eq("user_id", user.id)
      .maybeSingle()

    if (projectError) throw projectError
    if (!project) return NextResponse.json({ error: "Project not found or not owned by user" }, { status: 404 })

    const { data: competitors, error: competitorsError } = await supabase
      .from("competitors")
      .select("name, domain")
      .eq("user_id", user.id)
      .eq("project_id", parsed.data.project_id)

    if (competitorsError) throw competitorsError

    const suggestions = await detectCompetitors({
      project: {
        company_name: String(project.company_name || ""),
        website_url: String(project.website_url || ""),
        country: String(project.country || ""),
        language: String(project.language || ""),
        industry: String(project.industry || ""),
        business_goal: String(project.business_goal || ""),
      },
      existingCompetitors: (competitors ?? []).map((item) => ({
        name: String(item.name || ""),
        domain: item.domain ? String(item.domain) : null,
      })),
    })

    return NextResponse.json({ data: suggestions, mode: "live" })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Competitor detection failed" }, { status: 500 })
  }
}

async function detectCompetitors(input: {
  project: {
    company_name: string
    website_url: string
    country: string
    language: string
    industry: string
    business_goal: string
  }
  existingCompetitors: Array<{ name: string; domain: string | null }>
}) {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim()
  if (!apiKey) throw new Error("OPENAI_API_KEY is missing")

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.GEO_COMPETITOR_DETECT_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a B2B market analyst. Return only valid JSON. Do not invent fake domains; use null when unsure.",
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "Suggest 3 to 10 real direct or close competitors for GEO tracking.",
            output_shape: { competitors: [{ name: "string", domain: "domain or null", reason: "short reason" }] },
            rules: [
              "Exclude the user's own company and domain.",
              "Exclude existing competitors.",
              "Prefer competitors relevant to the country, industry and business goal.",
              "Use bare domains without protocol or path.",
              "Keep reasons under 140 characters.",
            ],
            project: input.project,
            existing_competitors: input.existingCompetitors,
          }),
        },
      ],
    }),
  })

  if (!response.ok) throw new Error(`OpenAI competitor detection error ${response.status}`)

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const content = data.choices?.[0]?.message?.content
  if (!content) return []

  const parsed = JSON.parse(content) as { competitors?: unknown }
  const competitors = Array.isArray(parsed.competitors) ? parsed.competitors : []
  return dedupeSuggestions(
    competitors.map((item) => normalizeSuggestion(item)).filter(Boolean) as SuggestedCompetitor[],
    input.project,
    input.existingCompetitors
  ).slice(0, 10)
}

function normalizeSuggestion(value: unknown): SuggestedCompetitor | null {
  if (!value || typeof value !== "object") return null
  const item = value as Record<string, unknown>
  const name = cleanup(String(item.name || ""))
  const domain = normalizeDomain(typeof item.domain === "string" ? item.domain : "")
  const reason = cleanup(String(item.reason || ""))
  if (name.length < 2) return null
  return { name, domain, reason: reason || "Competidor relevante para comparar visibilidad IA." }
}

function dedupeSuggestions(
  suggestions: SuggestedCompetitor[],
  project: { company_name: string; website_url: string },
  existingCompetitors: Array<{ name: string; domain: string | null }>
) {
  const blocked = new Set<string>([normalizeEntity(project.company_name), normalizeDomain(project.website_url) ?? ""])
  for (const competitor of existingCompetitors) {
    blocked.add(normalizeEntity(competitor.name))
    if (competitor.domain) blocked.add(normalizeDomain(competitor.domain) ?? "")
  }

  const seen = new Set<string>()
  return suggestions.filter((suggestion) => {
    const domainKey = suggestion.domain ?? ""
    const nameKey = normalizeEntity(suggestion.name)
    const key = domainKey || nameKey
    if (!key || blocked.has(domainKey) || blocked.has(nameKey) || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function normalizeDomain(value: string) {
  const host = cleanup(value).replace(/^https?:\/\//i, "").replace(/^www\./i, "").split(/[/?#]/)[0].toLowerCase()
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host)) return null
  return host
}

function normalizeEntity(value: string) {
  return cleanup(value).toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/.?#]/)[0].replace(/[^a-z0-9]+/g, "")
}

function cleanup(value: string) {
  return value.replace(/\s+/g, " ").trim()
}
