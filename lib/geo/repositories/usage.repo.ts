import type { SupabaseClient } from "@supabase/supabase-js"
import type { UsageEventRecord } from "@/lib/geo/db-types"

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
