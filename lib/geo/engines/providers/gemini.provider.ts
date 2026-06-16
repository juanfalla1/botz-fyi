import type { EnginePromptInput, EngineProvider, EngineRawResponse } from "@/lib/geo/engines/types"

type ServiceAccount = {
  client_email: string
  private_key: string
  token_uri?: string
  project_id?: string
}

let vertexTokenCache: { token: string; expiresAt: number } | null = null

function promptText(input: EnginePromptInput) {
  return input.neutral
    ? `${input.prompt}. Include source URLs when possible.`
    : `Brand: ${input.brandName} (${input.brandDomain}). Competitors: ${input.competitorNames.join(", ")}. Prompt: ${input.prompt}. Include source URLs when possible.`
}

function base64Url(input: string | Buffer) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")
}

function getServiceAccount(): ServiceAccount | null {
  let raw: string | undefined
  try {
    raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64
      ? Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64, "base64").toString("utf8")
      : process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  } catch {
    return null
  }
  if (!raw) return null
  let parsed: Partial<ServiceAccount>
  try {
    parsed = JSON.parse(raw) as Partial<ServiceAccount>
  } catch {
    return null
  }
  if (!parsed.client_email || !parsed.private_key) return null
  return {
    client_email: parsed.client_email,
    private_key: parsed.private_key.replace(/\\n/g, "\n"),
    token_uri: parsed.token_uri,
    project_id: parsed.project_id,
  }
}

async function getVertexAccessToken(serviceAccount: ServiceAccount) {
  const now = Math.floor(Date.now() / 1000)
  if (vertexTokenCache && vertexTokenCache.expiresAt > now + 60) return vertexTokenCache.token

  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }))
  const claim = base64Url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: serviceAccount.token_uri ?? "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }))
  const unsigned = `${header}.${claim}`
  const { createSign } = await import("crypto")
  const signature = createSign("RSA-SHA256").update(unsigned).sign(serviceAccount.private_key)
  const assertion = `${unsigned}.${base64Url(signature)}`
  const response = await fetch(serviceAccount.token_uri ?? "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  })
  if (!response.ok) throw new Error(`Vertex token error ${response.status}`)
  const data = (await response.json()) as { access_token?: string; expires_in?: number }
  if (!data.access_token) throw new Error("Vertex token response missing access_token")
  vertexTokenCache = { token: data.access_token, expiresAt: now + (data.expires_in ?? 3600) }
  return data.access_token
}

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
                text: promptText(input),
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

async function runVertexGeminiPrompt(serviceAccount: ServiceAccount, model: string, input: EnginePromptInput): Promise<EngineRawResponse> {
  const timeoutMs = Number(process.env.GEO_ENGINE_TIMEOUT_MS ?? 20000)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 20000)
  const token = await getVertexAccessToken(serviceAccount)
  const project = process.env.GOOGLE_CLOUD_PROJECT ?? serviceAccount.project_id
  const location = process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1"
  if (!project) throw new Error("GOOGLE_CLOUD_PROJECT is missing")
  const host = location === "global" ? "aiplatform.googleapis.com" : `${location}-aiplatform.googleapis.com`
  const url = `https://${host}/v1/projects/${encodeURIComponent(project)}/locations/${encodeURIComponent(location)}/publishers/google/models/${encodeURIComponent(model)}:generateContent`

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: promptText(input) }] }] }),
      signal: controller.signal,
    })
    if (!response.ok) {
      const details = await response.text().catch(() => "")
      if (response.status === 404 && model !== "gemini-2.0-flash") return runVertexGeminiPrompt(serviceAccount, "gemini-2.0-flash", input)
      throw new Error(`Vertex Gemini error ${response.status}${details ? `: ${details.slice(0, 240)}` : ""}`)
    }
    const data = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("\n") ?? ""
    return { text, meta: { provider: "vertex", project, location, model } }
  } finally {
    clearTimeout(timer)
  }
}

export function buildGeminiProvider(): EngineProvider {
  const provider = (process.env.GEMINI_PROVIDER ?? "api_key").toLowerCase()
  if (provider === "vertex") {
    const serviceAccount = getServiceAccount()
    const model = process.env.VERTEX_GEMINI_MODEL ?? process.env.GEMINI_MODEL ?? "gemini-2.0-flash"
    if (!serviceAccount) {
      return {
        id: "gemini",
        status: "disabled",
        reason: "GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 is missing or invalid",
        runPrompt: async () => ({ text: "" }),
      }
    }
    return {
      id: "gemini",
      status: "configured",
      runPrompt: (input) => runVertexGeminiPrompt(serviceAccount, model, input),
    }
  }

  const apiKey = process.env.GEMINI_API_KEY
  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash"
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
