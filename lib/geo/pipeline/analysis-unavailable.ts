import type { AnalysisOutput, GeneratedPrompt, PipelineContext } from "@/lib/geo/pipeline/types"

export function runUnavailableAnalysis(ctx: PipelineContext, prompts: GeneratedPrompt[]): AnalysisOutput {
  void prompts
  return {
    geo_score: 0,
    ai_visibility: 0,
    citations_count: 0,
    prompts_won: 0,
    engines: ctx.engines,
    recommendations: [
      {
        title: "Configure live AI engines",
        description: "No live AI engine returned usable results. Configure OpenAI, Gemini, Perplexity or SerpApi keys to generate a real GEO score.",
        priority: "high",
      },
    ],
    summary: `No live AI results were available for ${ctx.project.company_name}. GEO score was not estimated from simulated data.`,
  }
}
