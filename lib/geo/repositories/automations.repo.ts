import type { SupabaseClient } from "@supabase/supabase-js"
import type { AutomationRecord } from "@/lib/geo/db-types"

export async function listAutomations(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.from("automations").select("*").eq("user_id", userId).order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as AutomationRecord[]
}

export async function createAutomation(
  supabase: SupabaseClient,
  input: Pick<AutomationRecord, "user_id" | "project_id" | "competitor_id" | "name" | "frequency" | "enabled" | "config">
) {
  const { data, error } = await supabase.from("automations").insert(input).select("*").single()
  if (error) throw error
  return data as AutomationRecord
}

export async function updateAutomation(supabase: SupabaseClient, userId: string, id: string, patch: Partial<AutomationRecord>) {
  const { data, error } = await supabase.from("automations").update(patch).eq("id", id).eq("user_id", userId).select("*").single()
  if (error) throw error
  return data as AutomationRecord
}

export async function deleteAutomation(supabase: SupabaseClient, userId: string, id: string) {
  const { error } = await supabase.from("automations").delete().eq("id", id).eq("user_id", userId)
  if (error) throw error
}
