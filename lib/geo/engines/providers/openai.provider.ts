import type { EnginePromptInput, EngineProvider, EngineRawResponse } from "@/lib/geo/engines/types"

const OPENAI_URL = "https://api.openai.com/v1/responses"

async function runOpenAiPrompt(apiKey: string, model: string, input: EnginePromptInput): Promise<EngineRawResponse> {
  const timeoutMs = Number(process.env.GEO_ENGINE_TIMEOUT_MS ?? 20000)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 20000)

  try {
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "user",
            content: input.neutral
              ? `${input.prompt}\nReturn concise answer with sources when possible.`
              : `Brand: ${input.brandName} (${input.brandDomain}). Competitors: ${input.competitorNames.join(", ")}.\nPrompt: ${input.prompt}\nReturn concise answer with sources when possible.`,
          },
        ],
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`OpenAI error ${response.status}`)
    }

    const data = (await response.json()) as {
      output_text?: string
      output?: Array<{ content?: Array<{ text?: string }> }>
    }
    const text = data.output_text ?? data.output?.flatMap((x) => x.content ?? []).map((c) => c.text ?? "").join("\n") ?? ""
    return { text }
  } finally {
    clearTimeout(timer)
  }
}

export function buildOpenAiProvider(): EngineProvider {
  const apiKey = process.env.OPENAI_API_KEY
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini"
  if (!apiKey) {
    return {
      id: "openai",
      status: "disabled",
      reason: "OPENAI_API_KEY is missing",
      runPrompt: async () => ({ text: "" }),
    }
  }

  return {
    id: "openai",
    status: "configured",
    runPrompt: (input) => runOpenAiPrompt(apiKey, model, input),
  }
}
