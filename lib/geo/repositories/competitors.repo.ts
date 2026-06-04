import type { SupabaseClient } from "@supabase/supabase-js"
import type { CompetitorRecord } from "@/lib/geo/db-types"

export async function listCompetitors(supabase: SupabaseClient, userId: string, projectId?: string) {
  let query = supabase.from("competitors").select("*").eq("user_id", userId).order("created_at", { ascending: false })
  if (projectId) query = query.eq("project_id", projectId)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as CompetitorRecord[]
}

export async function createCompetitor(supabase: SupabaseClient, input: Omit<CompetitorRecord, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase.from("competitors").insert(input).select("*").single()
  if (error) throw error
  return data as CompetitorRecord
}

export async function updateCompetitor(supabase: SupabaseClient, userId: string, id: string, patch: Partial<Pick<CompetitorRecord, "name" | "domain" | "project_id">>) {
  const { data, error } = await supabase.from("competitors").update(patch).eq("id", id).eq("user_id", userId).select("*").single()
  if (error) throw error
  return data as CompetitorRecord
}

export async function deleteCompetitor(supabase: SupabaseClient, userId: string, id: string) {
  const { error } = await supabase.from("competitors").delete().eq("id", id).eq("user_id", userId)
  if (error) throw error
}

export async function updateCompetitorAliases(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  patch: Partial<Pick<CompetitorRecord, "aliases" | "domain_aliases">>
) {
  const { data, error } = await supabase.from("competitors").update(patch).eq("id", id).eq("user_id", userId).select("*").single()
  if (error) throw error
  return data as CompetitorRecord
}
