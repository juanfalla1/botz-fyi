import type { AnalysisOutput, GeneratedPrompt, PipelineContext } from "@/lib/geo/pipeline/types"

function hashSeed(input: string) {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function runStructuredPlaceholderAnalysis(ctx: PipelineContext, prompts: GeneratedPrompt[]): AnalysisOutput {
  const seed = hashSeed(`${ctx.project.id}:${ctx.project.website_url}:${ctx.engines.join(",")}`)
  const geo_score = 55 + (seed % 36)
  const ai_visibility = 45 + ((seed >> 1) % 46)
  const citations_count = 20 + ((seed >> 2) % 180)
  const prompts_won = Math.max(1, Math.floor(prompts.length * (0.2 + ((seed % 30) / 100))))

  const recommendations: AnalysisOutput["recommendations"] = [
    {
      title: "Improve entity consistency",
      description: "Keep brand naming and schema organization data consistent across priority pages.",
      priority: "high",
    },
    {
      title: "Publish comparison content",
      description: "Add structured competitor comparison pages targeting high-intent prompts.",
      priority: "medium",
    },
    {
      title: "Strengthen citation signals",
      description: "Include verifiable stats and source-backed claims for better citation probability.",
      priority: "low",
    },
  ]

  const summary = `Placeholder analysis for ${ctx.project.company_name}: GEO score ${geo_score}, visibility ${ai_visibility}, citations ${citations_count}.`

  return {
    geo_score,
    ai_visibility,
    citations_count,
    prompts_won,
    engines: ctx.engines,
    recommendations,
    summary,
  }
}
