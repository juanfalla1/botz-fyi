import type { EnginePromptInput, EngineProvider, EngineRawResponse } from "@/lib/geo/engines/types"

const SERPAPI_URL = "https://serpapi.com/search.json"

async function runAiOverviewsPrompt(apiKey: string, input: EnginePromptInput): Promise<EngineRawResponse> {
  const timeoutMs = Number(process.env.GEO_ENGINE_TIMEOUT_MS ?? 20000)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 20000)
  const params = new URLSearchParams({
    engine: "google",
    q: input.prompt,
    api_key: apiKey,
  })

  try {
    const response = await fetch(`${SERPAPI_URL}?${params.toString()}`, { signal: controller.signal })
    if (!response.ok) throw new Error(`AI Overviews SerpApi error ${response.status}`)
    const data = (await response.json()) as {
      ai_overview?: { text?: string; answer?: string; sources?: Array<{ link?: string; title?: string }> }
      answer_box?: { answer?: string; snippet?: string; link?: string }
      organic_results?: Array<{ title?: string; link?: string; snippet?: string }>
    }
    const aiOverviewText = data.ai_overview?.text ?? data.ai_overview?.answer
    const organicText = data.organic_results?.slice(0, 5).map((item) => [item.title, item.snippet, item.link].filter(Boolean).join(" - ")).join("\n")
    const text = aiOverviewText ?? data.answer_box?.answer ?? data.answer_box?.snippet ?? organicText ?? ""
    const citations = [
      ...(data.ai_overview?.sources?.map((source) => source.link).filter(Boolean) ?? []),
      data.answer_box?.link,
      ...(data.organic_results?.slice(0, 5).map((item) => item.link).filter(Boolean) ?? []),
    ].filter((item): item is string => Boolean(item))

    return { text, citations, meta: { provider: "serpapi", has_ai_overview: Boolean(aiOverviewText) } }
  } finally {
    clearTimeout(timer)
  }
}

export function buildAiOverviewsProvider(): EngineProvider {
  const apiKey = process.env.SERPAPI_API_KEY ?? process.env.SERP_API_KEY
  if (!apiKey) {
    return {
      id: "ai_overviews",
      status: "disabled",
      reason: "SERPAPI_API_KEY is missing",
      runPrompt: async () => ({ text: "" }),
    }
  }

  return {
    id: "ai_overviews",
    status: "configured",
    runPrompt: (input) => runAiOverviewsPrompt(apiKey, input),
  }
}
