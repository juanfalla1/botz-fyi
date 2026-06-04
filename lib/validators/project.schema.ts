import { z } from "zod";

export const projectSchema = z.object({
  company_name: z.string().min(2).max(120),
  website_url: z.string().url(),
  country: z.string().min(2).max(80),
  language: z.string().min(2).max(10),
  industry: z.string().min(2).max(80),
  business_goal: z.string().min(10).max(400),
  competitors: z.array(z.string().min(2).max(80)).max(5).optional().default([]),
});

export type ProjectInput = z.infer<typeof projectSchema>;
