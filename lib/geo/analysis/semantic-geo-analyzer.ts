import type { NormalizedEngineResult } from "@/lib/geo/engines/types"
import type { PipelineContext } from "@/lib/geo/pipeline/types"
import { semanticGeoAnalysisJsonSchema, semanticGeoAnalysisSchema, type SemanticGeoAnalysis } from "@/lib/geo/analysis/semantic-geo-analysis.schema"

const SYSTEM_PROMPT = `Eres el Analizador Semántico Principal y Experto en GEO (Generative Engine Optimization) de Star GEO.
Audita de forma objetiva, técnica y precisa respuestas de motores generativos.
Responde únicamente JSON válido, sin markdown, estrictamente en español.
No inventes fuentes ni menciones. Si no hay evidencia, usa arrays vacíos o valores conservadores.`

type AnalyzerInput = {
  context: PipelineContext
  normalizedResults: NormalizedEngineResult[]
  hardScore: {
    geo_score: number
    ai_visibility: number
    citations_count: number
    prompts_won: number
    prompts_lost?: number
  }
}

export async function runSemanticGeoAnalyzer(input: AnalyzerInput): Promise<SemanticGeoAnalysis | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  const timeoutMs = Number(process.env.GEO_SEMANTIC_ANALYZER_TIMEOUT_MS ?? 30000)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 30000)

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.GEO_SEMANTIC_ANALYZER_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.1,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "geo_audit_analysis",
            strict: true,
            schema: semanticGeoAnalysisJsonSchema,
          },
        },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildAnalyzerPrompt(input) },
        ],
      }),
      signal: controller.signal,
    })

    if (!response.ok) throw new Error(`Semantic analyzer OpenAI error ${response.status}`)

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const content = data.choices?.[0]?.message?.content
    if (!content) return null

    const parsed = semanticGeoAnalysisSchema.safeParse(JSON.parse(content))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function buildAnalyzerPrompt({ context, normalizedResults, hardScore }: AnalyzerInput) {
  const compactResponses = normalizedResults.slice(0, 40).map((item) => ({
    engine: item.engine,
    query: item.prompt,
    brand_mentioned: item.brandMentioned,
    competitor_mentions: item.competitorMentions,
    citations: item.citations.slice(0, 8),
    citation_domains: item.citationDomains.slice(0, 8),
    ranking_position: item.rankingPosition,
    won: item.won,
    lost: item.lost,
    confidence: item.confidence,
    raw_response: truncate(item.rawText, 2200),
  }))

  return JSON.stringify({
    brand_name: context.project.company_name,
    brand_domain: context.project.website_url,
    market: context.project.country,
    language: context.project.language,
    industry: context.project.industry,
    business_goal: context.project.business_goal,
    competitors_list: context.competitors.map((competitor) => competitor.name),
    queries_list: [...new Set(normalizedResults.map((item) => item.prompt))].slice(0, 50),
    hard_metrics_for_calibration: hardScore,
    ai_raw_responses_and_citations: compactResponses,
    analysis_instructions: [
      "Calcula geo_score de 0 a 100 considerando visibilidad, orden de aparicion, sentimiento y autoridad de fuentes.",
      "Extrae menciones directas o indirectas de la marca con snippet, contexto y posicion.",
      "Compara visibilidad de marca contra competidores rastreados y competidores descubiertos.",
      "Genera recomendaciones, riesgos, siguientes acciones y resumen ejecutivo en español profesional.",
    ],
  })
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength)}...`
}
