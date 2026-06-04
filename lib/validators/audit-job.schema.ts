import { z } from "zod"

export const manualAuditSchema = z.object({
  project_id: z.string().uuid(),
  base_url: z.string().url(),
  crawl_depth: z.number().int().min(1).max(3).default(1),
  engines: z.array(z.string()).default(["chatgpt", "gemini", "perplexity"]),
})
