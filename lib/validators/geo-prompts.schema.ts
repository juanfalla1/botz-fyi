import { z } from "zod"

const engineSchema = z.enum(["openai", "gemini", "perplexity", "ai-overviews", "ChatGPT", "Gemini", "Perplexity", "AI Overviews"])

export const geoPromptCreateSchema = z.object({
  prompt: z.string().trim().min(8).max(1000),
  category: z.string().trim().min(2).max(80).default("general"),
  engines: z.array(engineSchema).max(8).default([]),
  country: z.string().trim().max(80).optional().nullable(),
  language: z.string().trim().max(40).optional().nullable(),
  enabled: z.boolean().default(true),
  metadata: z.record(z.unknown()).default({}),
})

export const geoPromptUpdateSchema = geoPromptCreateSchema.partial()
