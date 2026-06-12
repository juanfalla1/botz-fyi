import type { SupabaseClient } from "@supabase/supabase-js"
import type { UsageEventRecord } from "@/lib/geo/db-types"

type SubscriptionRecord = {
  id: string
  user_id: string
  status: string
  audits_limit: number
  audits_used: number
  prompts_limit: number
  prompts_used: number
}

function isUsageSchemaMismatch(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "")
  return message.includes("subscriptions.audits_limit") || message.includes("subscriptions.prompts_limit") || message.includes("subscriptions.audits_used") || message.includes("subscriptions.prompts_used") || message.includes("42703")
}

export async function listUsageEvents(supabase: SupabaseClient, userId: string, limit = 100) {
  const { data, error } = await supabase
    .from("usage_events")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as UsageEventRecord[]
}

export async function createUsageEvent(
  supabase: SupabaseClient,
  input: Pick<UsageEventRecord, "user_id" | "event_type" | "amount" | "metadata">
) {
  const { data, error } = await supabase.from("usage_events").insert(input).select("*").single()
  if (error) throw error
  return data as UsageEventRecord
}

export async function ensureServerSubscription(supabase: SupabaseClient, userId: string) {
  const { data: existing, error: existingError } = await supabase
    .from("subscriptions")
    .select("id, user_id, status, audits_limit, audits_used, prompts_limit, prompts_used")
    .eq("user_id", userId)
    .maybeSingle()
  if (existingError) throw existingError
  if (existing) return existing as SubscriptionRecord

  const { data, error } = await supabase
    .from("subscriptions")
    .insert({
      user_id: userId,
      plan: "trial",
      status: "active",
      audits_limit: 3,
      audits_used: 0,
      prompts_limit: 25,
      prompts_used: 0,
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    })
    .select("id, user_id, status, audits_limit, audits_used, prompts_limit, prompts_used")
    .single()
  if (error) throw error
  return data as SubscriptionRecord
}

export async function consumeServerUsage(
  supabase: SupabaseClient,
  userId: string,
  type: "audit" | "prompt",
  amount: number,
  metadata: Record<string, unknown>
) {
  let subscription: SubscriptionRecord
  try {
    subscription = await ensureServerSubscription(supabase, userId)
  } catch (error) {
    if (!isUsageSchemaMismatch(error)) throw error
    await createUsageEvent(supabase, {
      user_id: userId,
      event_type: type === "audit" ? "geo_audit_created" : "prompt_used",
      amount,
      metadata: { ...metadata, limit_check_skipped: true, reason: "legacy_subscription_schema" },
    })
    return
  }
  if (subscription.status !== "active") throw new Error("Subscription is not active")

  const usedKey = type === "audit" ? "audits_used" : "prompts_used"
  const limitKey = type === "audit" ? "audits_limit" : "prompts_limit"
  const nextUsed = Number(subscription[usedKey]) + amount
  const limit = Number(subscription[limitKey])
  if (nextUsed > limit) {
    const label = type === "audit" ? "GEO audit" : "prompt"
    throw new Error(`${label} limit reached for current plan`)
  }

  const { error: updateError } = await supabase
    .from("subscriptions")
    .update({ [usedKey]: nextUsed })
    .eq("id", subscription.id)
  if (updateError) throw updateError

  await createUsageEvent(supabase, {
    user_id: userId,
    event_type: type === "audit" ? "geo_audit_created" : "prompt_used",
    amount,
    metadata,
  })
}
