import { z } from "zod"

export const semanticGeoAnalysisSchema = z.object({
  geo_score: z.number().int().min(0).max(100),
  brand_visibility: z.number().min(0).max(100),
  sentiment: z.object({
    label: z.enum(["positivo", "neutral", "negativo"]),
    score: z.number().min(0).max(1),
    summary: z.string(),
  }),
  ai_mentions: z.array(z.object({
    snippet: z.string(),
    context: z.string(),
    position: z.enum(["primera_opcion", "lista_secundaria", "mencion_indirecta", "no_mencionada"]),
  })),
  competitor_visibility: z.array(z.object({
    name: z.string(),
    visibility_score: z.number().min(0).max(100),
    is_tracked: z.boolean(),
  })),
  cited_sources: z.array(z.object({
    source_name: z.string(),
    url: z.string(),
    influence: z.enum(["alta", "media", "baja"]),
  })),
  recommendations: z.array(z.object({
    priority: z.enum(["alta", "media", "baja"]),
    impact: z.enum(["alto", "medio", "bajo"]),
    action_item: z.string(),
    details: z.string(),
  })),
  risks: z.array(z.object({
    risk_type: z.string(),
    severity: z.enum(["critica", "media", "baja"]),
    description: z.string(),
  })),
  next_actions: z.array(z.string()).min(1).max(5),
  executive_summary: z.string(),
})

export type SemanticGeoAnalysis = z.infer<typeof semanticGeoAnalysisSchema>

export const semanticGeoAnalysisJsonSchema = {
  type: "object",
  properties: {
    geo_score: { type: "integer", description: "Puntaje GEO global de la marca del 0 al 100 basado en visibilidad, autoridad y sentimiento." },
    brand_visibility: { type: "number", description: "Porcentaje de visibilidad estimado para la marca objetivo (0 a 100)." },
    sentiment: {
      type: "object",
      properties: {
        label: { type: "string", enum: ["positivo", "neutral", "negativo"] },
        score: { type: "number", description: "Nivel de confianza o intensidad del sentimiento, de 0.0 a 1.0." },
        summary: { type: "string", description: "Breve justificación de por qué se asignó este sentimiento." },
      },
      required: ["label", "score", "summary"],
      additionalProperties: false,
    },
    ai_mentions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          snippet: { type: "string" },
          context: { type: "string" },
          position: { type: "string", enum: ["primera_opcion", "lista_secundaria", "mencion_indirecta", "no_mencionada"] },
        },
        required: ["snippet", "context", "position"],
        additionalProperties: false,
      },
    },
    competitor_visibility: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          visibility_score: { type: "number" },
          is_tracked: { type: "boolean" },
        },
        required: ["name", "visibility_score", "is_tracked"],
        additionalProperties: false,
      },
    },
    cited_sources: {
      type: "array",
      items: {
        type: "object",
        properties: {
          source_name: { type: "string" },
          url: { type: "string" },
          influence: { type: "string", enum: ["alta", "media", "baja"] },
        },
        required: ["source_name", "url", "influence"],
        additionalProperties: false,
      },
    },
    recommendations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          priority: { type: "string", enum: ["alta", "media", "baja"] },
          impact: { type: "string", enum: ["alto", "medio", "bajo"] },
          action_item: { type: "string" },
          details: { type: "string" },
        },
        required: ["priority", "impact", "action_item", "details"],
        additionalProperties: false,
      },
    },
    risks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          risk_type: { type: "string" },
          severity: { type: "string", enum: ["critica", "media", "baja"] },
          description: { type: "string" },
        },
        required: ["risk_type", "severity", "description"],
        additionalProperties: false,
      },
    },
    next_actions: { type: "array", items: { type: "string" } },
    executive_summary: { type: "string" },
  },
  required: [
    "geo_score",
    "brand_visibility",
    "sentiment",
    "ai_mentions",
    "competitor_visibility",
    "cited_sources",
    "recommendations",
    "risks",
    "next_actions",
    "executive_summary",
  ],
  additionalProperties: false,
} as const
