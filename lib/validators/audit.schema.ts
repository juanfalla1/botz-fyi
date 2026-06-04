import { z } from "zod";

export const auditSchema = z.object({
  project_id: z.string().min(2),
  base_url: z.string().url(),
  crawl_depth: z.number().int().min(1).max(3),
  engines: z.array(z.enum(["openai", "gemini", "perplexity", "ai_overviews"])) .min(1).max(4),
  language: z.string().min(2).max(10),
  country: z.string().min(2).max(80),
  competitors: z.array(z.string()).max(5).optional().default([]),
  max_pages: z.number().int().max(20).default(20),
  max_prompts_per_engine: z.number().int().max(10).default(10),
});

export type AuditInput = z.infer<typeof auditSchema>;
