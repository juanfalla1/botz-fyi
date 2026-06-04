import { z } from "zod"

export const automationCreateSchema = z.object({
  project_id: z.string().uuid().optional().nullable(),
  competitor_id: z.string().uuid().optional().nullable(),
  name: z.string().min(2),
  frequency: z.enum(["daily", "weekly", "monthly"]).default("weekly"),
  enabled: z.boolean().default(true),
  config: z.record(z.unknown()).default({}),
})

export const automationUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  frequency: z.enum(["daily", "weekly", "monthly"]).optional(),
  enabled: z.boolean().optional(),
  config: z.record(z.unknown()).optional(),
})
