export type GeoPlanKey = "trial" | "starter" | "growth" | "enterprise"

export type GeoPlanLimits = {
  projects_limit: number
  audits_limit: number
  prompts_limit: number
}

export const GEO_PLAN_LIMITS: Record<GeoPlanKey, GeoPlanLimits> = {
  trial: { projects_limit: 1, audits_limit: 3, prompts_limit: 25 },
  starter: { projects_limit: 1, audits_limit: 10, prompts_limit: 100 },
  growth: { projects_limit: 5, audits_limit: 100, prompts_limit: 1000 },
  enterprise: { projects_limit: 1000000, audits_limit: 1000000, prompts_limit: 1000000 },
}

export const GEO_PLAN_PRICE_ENV: Record<Exclude<GeoPlanKey, "trial" | "enterprise">, string> = {
  starter: "GEO_STRIPE_PRICE_STARTER_MONTHLY",
  growth: "GEO_STRIPE_PRICE_GROWTH_MONTHLY",
}

export function normalizeGeoPlan(value: unknown): GeoPlanKey | null {
  const plan = String(value || "").toLowerCase().trim()
  if (plan === "trial" || plan === "starter" || plan === "growth" || plan === "enterprise") return plan
  return null
}

export function paidGeoPlan(value: unknown): "starter" | "growth" | null {
  const plan = normalizeGeoPlan(value)
  return plan === "starter" || plan === "growth" ? plan : null
}

export function limitsForGeoPlan(value: unknown) {
  const plan = normalizeGeoPlan(value) ?? "trial"
  return GEO_PLAN_LIMITS[plan]
}
