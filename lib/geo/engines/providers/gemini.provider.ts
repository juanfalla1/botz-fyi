import type { EnginePromptInput, EngineProvider, EngineRawResponse } from "@/lib/geo/engines/types"

async function runGeminiPrompt(apiKey: string, model: string, input: EnginePromptInput): Promise<EngineRawResponse> {
  const timeoutMs = Number(process.env.GEO_ENGINE_TIMEOUT_MS ?? 20000)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 20000)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: input.neutral
                  ? `${input.prompt}. Include source URLs when possible.`
                  : `Brand: ${input.brandName} (${input.brandDomain}). Competitors: ${input.competitorNames.join(", ")}. Prompt: ${input.prompt}. Include source URLs when possible.`,
              },
            ],
          },
        ],
      }),
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`Gemini error ${response.status}`)

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("\n") ?? ""
    return { text }
  } finally {
    clearTimeout(timer)
  }
}

export function buildGeminiProvider(): EngineProvider {
  const apiKey = process.env.GEMINI_API_KEY
  const model = process.env.GEMINI_MODEL ?? "gemini-1.5-flash"
  if (!apiKey) {
    return {
      id: "gemini",
      status: "disabled",
      reason: "GEMINI_API_KEY is missing",
      runPrompt: async () => ({ text: "" }),
    }
  }

  return {
    id: "gemini",
    status: "configured",
    runPrompt: (input) => runGeminiPrompt(apiKey, model, input),
  }
}
