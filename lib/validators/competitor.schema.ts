import { z } from "zod"

export const competitorCreateSchema = z.object({
  project_id: z.string().uuid().optional().nullable(),
  name: z.string().min(2),
  domain: z.string().optional().nullable(),
})

export const competitorUpdateSchema = z.object({
  project_id: z.string().uuid().optional().nullable(),
  name: z.string().min(2).optional(),
  domain: z.string().optional().nullable(),
})
