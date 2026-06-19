import { supabaseGeo } from "@/app/geo/supabaseGeoClient"

export type GeoPlan = "trial" | "starter" | "growth" | "enterprise"
export type SubscriptionStatus = "active" | "inactive" | "canceled" | "past_due"
export type RequestedGeoPlan = Exclude<GeoPlan, "trial">

export type GeoSubscription = {
  id: string
  user_id: string
  plan: GeoPlan
  status: SubscriptionStatus
  audits_limit: number
  audits_used: number
  prompts_limit: number
  prompts_used: number
  current_period_start: string
  current_period_end: string
  metadata?: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export type GeoUsageEvent = {
  id: string
  user_id: string
  event_type: "geo_audit_created" | "prompt_used" | "report_exported"
  amount: number
  metadata: Record<string, unknown>
  created_at: string
}

const defaultPeriodEnd = () => new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString()

export function normalizeRequestedPlan(value: unknown): RequestedGeoPlan | null {
  const plan = String(value || "").toLowerCase().trim()
  return plan === "starter" || plan === "growth" || plan === "enterprise" ? plan : null
}

export async function ensureTrialSubscription(userId: string, requestedPlan?: RequestedGeoPlan | null) {
  const { data: existing, error: existingError } = await supabaseGeo
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  if (existingError) throw existingError
  if (existing) {
    if (!requestedPlan) return existing as GeoSubscription
    const metadata = {
      ...((existing.metadata && typeof existing.metadata === "object") ? existing.metadata as Record<string, unknown> : {}),
      requested_plan: requestedPlan,
      requested_plan_at: new Date().toISOString(),
    }
    const { data, error } = await supabaseGeo
      .from("subscriptions")
      .update({ metadata })
      .eq("id", existing.id)
      .select("*")
      .single()
    if (error) throw error
    return data as GeoSubscription
  }

  const payload = {
    user_id: userId,
    plan: "trial",
    status: "active",
    audits_limit: 3,
    audits_used: 0,
    prompts_limit: 25,
    prompts_used: 0,
    current_period_start: new Date().toISOString(),
    current_period_end: defaultPeriodEnd(),
    metadata: requestedPlan ? { requested_plan: requestedPlan, requested_plan_at: new Date().toISOString() } : {},
  }

  const { data, error } = await supabaseGeo
    .from("subscriptions")
    .insert(payload)
    .select("*")
    .single()

  if (error) throw error
  return data as GeoSubscription
}

export async function getMySubscription() {
  const {
    data: { user },
    error: userError,
  } = await supabaseGeo.auth.getUser()
  if (userError) throw userError
  if (!user) return null

  const { data, error } = await supabaseGeo
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  if (error) throw error
  if (!data) return ensureTrialSubscription(user.id)
  return data as GeoSubscription
}

export async function consumeAudit(metadata: Record<string, unknown>) {
  const subscription = await getMySubscription()
  if (!subscription) throw new Error("No active user")

  if (subscription.audits_used >= subscription.audits_limit) {
    return { ok: false as const, reason: "limit_reached" as const, subscription }
  }

  const nextUsed = subscription.audits_used + 1
  const { error: updateError } = await supabaseGeo
    .from("subscriptions")
    .update({ audits_used: nextUsed })
    .eq("id", subscription.id)

  if (updateError) throw updateError

  const { error: usageError } = await supabaseGeo.from("usage_events").insert({
    user_id: subscription.user_id,
    event_type: "geo_audit_created",
    amount: 1,
    metadata,
  })

  if (usageError) throw usageError

  return {
    ok: true as const,
    subscription: {
      ...subscription,
      audits_used: nextUsed,
    },
  }
}

export async function updatePlanMock(plan: GeoPlan) {
  const subscription = await getMySubscription()
  if (!subscription) throw new Error("No active user")

  const planLimits: Record<GeoPlan, { audits_limit: number; prompts_limit: number }> = {
    trial: { audits_limit: 3, prompts_limit: 25 },
    starter: { audits_limit: 20, prompts_limit: 200 },
    growth: { audits_limit: 100, prompts_limit: 1000 },
    enterprise: { audits_limit: 1000000, prompts_limit: 1000000 },
  }

  const { audits_limit, prompts_limit } = planLimits[plan]

  const { data, error } = await supabaseGeo
    .from("subscriptions")
    .update({
      plan,
      status: "active",
      audits_limit,
      prompts_limit,
      current_period_start: new Date().toISOString(),
      current_period_end: defaultPeriodEnd(),
    })
    .eq("id", subscription.id)
    .select("*")
    .single()

  if (error) throw error
  return data as GeoSubscription
}

export async function getUsageHistory(limit = 20) {
  const {
    data: { user },
    error: userError,
  } = await supabaseGeo.auth.getUser()
  if (userError) throw userError
  if (!user) return [] as GeoUsageEvent[]

  const { data, error } = await supabaseGeo
    .from("usage_events")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as GeoUsageEvent[]
}
