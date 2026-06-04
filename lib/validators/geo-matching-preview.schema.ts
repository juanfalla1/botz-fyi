import { z } from "zod"

export const geoMatchingPreviewSchema = z.object({
  project_id: z.string().uuid(),
  text: z.string().min(1).max(20000),
  competitors: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        name: z.string().min(1).max(120),
        domain: z.string().min(1).max(255).optional(),
      })
    )
    .max(100)
    .default([]),
})

export type GeoMatchingPreviewInput = z.infer<typeof geoMatchingPreviewSchema>
