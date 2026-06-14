import type { GeneratedPrompt, PipelineContext } from "@/lib/geo/pipeline/types"

export function buildBasePrompts(ctx: PipelineContext): GeneratedPrompt[] {
  const domain = ctx.project.website_url.replace(/^https?:\/\//, "")
  const competitorNames = ctx.competitors.map((c) => c.name).slice(0, 3).join(", ") || "market alternatives"

  const templates = [
    { category: "spontaneous", prompt: `What are the best ${ctx.project.industry} providers in ${ctx.project.country}?` },
    { category: "competitive", prompt: `Compare ${ctx.project.company_name} vs ${competitorNames} for ${ctx.project.business_goal}.` },
    { category: "spontaneous", prompt: `Which brand is most cited for ${ctx.project.industry} solutions?` },
    { category: "spontaneous", prompt: `What company do you recommend for ${ctx.project.industry} and why?` },
    { category: "citation", prompt: `Find trusted sources mentioning ${domain}.` },
  ]

  const prompts: GeneratedPrompt[] = []
  for (const engine of ctx.engines) {
    for (const basePrompt of templates) {
      prompts.push({ engine, prompt: basePrompt.prompt, category: basePrompt.category })
    }
  }
  return prompts
}
