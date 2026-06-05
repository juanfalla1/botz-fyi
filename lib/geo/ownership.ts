import type { SupabaseClient } from "@supabase/supabase-js"

export async function assertProjectOwner(supabase: SupabaseClient, userId: string, projectId?: string | null) {
  if (!projectId) return null
  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", userId)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error("Project not found or not owned by user")
  return data
}

export async function assertCompetitorOwner(supabase: SupabaseClient, userId: string, competitorId?: string | null) {
  if (!competitorId) return null
  const { data, error } = await supabase
    .from("competitors")
    .select("id")
    .eq("id", competitorId)
    .eq("user_id", userId)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error("Competitor not found or not owned by user")
  return data
}

export async function listOwnedAuditIds(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("audit_jobs")
    .select("audit_id")
    .eq("user_id", userId)
    .not("audit_id", "is", null)
  if (error) throw error
  return Array.from(new Set((data ?? []).map((row) => String(row.audit_id)).filter(Boolean)))
}
