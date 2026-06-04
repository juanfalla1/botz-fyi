import { buildAiOverviewsProvider } from "@/lib/geo/engines/providers/ai-overviews.provider"
import { buildGeminiProvider } from "@/lib/geo/engines/providers/gemini.provider"
import { buildOpenAiProvider } from "@/lib/geo/engines/providers/openai.provider"
import { buildPerplexityProvider } from "@/lib/geo/engines/providers/perplexity.provider"
import type { EngineId, EngineProvider } from "@/lib/geo/engines/types"

function normalizeEngineId(input: string): EngineId | null {
  const x = input.trim().toLowerCase()
  if (x === "openai" || x === "chatgpt") return "openai"
  if (x === "perplexity") return "perplexity"
  if (x === "gemini") return "gemini"
  if (x === "ai_overviews" || x === "aioverviews" || x === "ai-overviews") return "ai_overviews"
  return null
}

export function getProviderForEngine(input: string): EngineProvider | null {
  const id = normalizeEngineId(input)
  if (!id) return null
  if (id === "openai") return buildOpenAiProvider()
  if (id === "perplexity") return buildPerplexityProvider()
  if (id === "gemini") return buildGeminiProvider()
  return buildAiOverviewsProvider()
}

export function resolveProviders(engines: string[]) {
  const providers: EngineProvider[] = []
  const skipped: string[] = []
  for (const engine of engines) {
    const provider = getProviderForEngine(engine)
    if (!provider) {
      skipped.push(engine)
      continue
    }
    providers.push(provider)
  }
  return { providers, skipped }
}
