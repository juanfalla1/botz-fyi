import type { EnginePromptInput, EngineProvider, EngineRawResponse } from "@/lib/geo/engines/types"

const PERPLEXITY_URL = "https://api.perplexity.ai/chat/completions"

async function runPerplexityPrompt(apiKey: string, model: string, input: EnginePromptInput): Promise<EngineRawResponse> {
  const timeoutMs = Number(process.env.GEO_ENGINE_TIMEOUT_MS ?? 20000)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 20000)

  try {
    const response = await fetch(PERPLEXITY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "You are an analyst. Return concise answer and include source URLs when available.",
          },
          {
            role: "user",
            content: input.neutral
              ? input.prompt
              : `Brand: ${input.brandName} (${input.brandDomain}). Competitors: ${input.competitorNames.join(", ")}. Prompt: ${input.prompt}`,
          },
        ],
      }),
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`Perplexity error ${response.status}`)

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
      citations?: string[]
    }

    return {
      text: data.choices?.[0]?.message?.content ?? "",
      citations: Array.isArray(data.citations) ? data.citations.map((x) => String(x)) : [],
    }
  } finally {
    clearTimeout(timer)
  }
}

export function buildPerplexityProvider(): EngineProvider {
  const apiKey = process.env.GEO_PERPLEXITY_API_KEY ?? process.env.PERPLEXITY_API_KEY
  const model = process.env.GEO_PERPLEXITY_MODEL ?? process.env.PERPLEXITY_MODEL ?? "sonar"
  if (!apiKey) {
    return {
      id: "perplexity",
      status: "disabled",
      reason: "GEO_PERPLEXITY_API_KEY or PERPLEXITY_API_KEY is missing",
      runPrompt: async () => ({ text: "" }),
    }
  }

  return {
    id: "perplexity",
    status: "configured",
    runPrompt: (input) => runPerplexityPrompt(apiKey, model, input),
  }
}
