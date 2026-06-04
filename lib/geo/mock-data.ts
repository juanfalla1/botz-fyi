import type { ContentOpportunity, GeoProject, GeoRecommendation, GeoScore } from "./types";

export const demoProject: GeoProject = {
  id: "proj_01",
  companyName: "Botz AI",
  websiteUrl: "https://botz.fyi",
  country: "Colombia",
  language: "es",
  industry: "AI Automation",
  businessGoal: "Aumentar menciones de marca en respuestas de IA para consultas transaccionales.",
  competitors: ["CompetitorOne", "SearchPilot", "PromptRank"],
};

export const demoScore: GeoScore = {
  aiVisibilityScore: 72,
  citationProbability: 64,
  brandMentionScore: 58,
  competitorDominanceScore: 47,
  contentClarityScore: 79,
  entityConsistencyScore: 68,
  structuredDataScore: 63,
  topicalAuthorityScore: 74,
  freshnessScore: 56,
  trustSignalScore: 70,
  finalScore: 69,
};

export const demoRecommendations: GeoRecommendation[] = [
  {
    id: "rec_1",
    title: "Crear página comparativa por caso de uso",
    description: "Las respuestas de IA citan comparativas con evidencia específica.",
    priority: "high",
    type: "content",
    suggestedAction: "Publica 3 páginas comparativas con estructura FAQ y fuentes verificables.",
    status: "pending",
  },
  {
    id: "rec_2",
    title: "Corregir entidades inconsistentes",
    description: "Nombre de marca y descripción corporativa varían entre páginas.",
    priority: "high",
    type: "entity",
    suggestedAction: "Unifica naming en meta tags, schema.org Organization y footer.",
    status: "in_progress",
  },
  {
    id: "rec_3",
    title: "Añadir Article + FAQ structured data",
    description: "El score de estructura puede mejorar para aumentar probabilidad de cita.",
    priority: "medium",
    type: "structured_data",
    suggestedAction: "Implementa JSON-LD en 10 URLs prioritarias de contenido GEO.",
    status: "pending",
  },
];

export const demoContentOpportunities: ContentOpportunity[] = [
  {
    id: "co_1",
    title: "Guía: mejores herramientas de automatización para inmobiliarias",
    targetPrompt: "¿Qué herramienta recomiendas para automatizar embudos inmobiliarios en LATAM?",
    intent: "commercial",
    engine: "openai",
    recommendedFormat: "landing comparativa",
    priority: "high",
    brief: "Incluir benchmark, casos reales, ROI estimado y criterios de evaluación.",
  },
  {
    id: "co_2",
    title: "Checklist de implementación de agentes IA por WhatsApp",
    targetPrompt: "¿Cómo implementar un agente de WhatsApp sin equipo técnico interno?",
    intent: "informational",
    engine: "gemini",
    recommendedFormat: "blog + descargable",
    priority: "medium",
    brief: "Explicar arquitectura, seguridad, tiempos y métricas de seguimiento.",
  },
];

export const visibilityTrend = [
  { name: "Ene", score: 51 },
  { name: "Feb", score: 56 },
  { name: "Mar", score: 61 },
  { name: "Abr", score: 63 },
  { name: "May", score: 69 },
  { name: "Jun", score: 72 },
];

export const engineMentions = [
  { engine: "OpenAI", mentions: 8 },
  { engine: "Gemini", mentions: 6 },
  { engine: "Perplexity", mentions: 5 },
];
