import type { SupabaseClient } from "@supabase/supabase-js"
import type { GeoPromptRecord } from "@/lib/geo/db-types"

type CreateGeoPromptInput = Omit<GeoPromptRecord, "id" | "created_at" | "updated_at">
type UpdateGeoPromptInput = Partial<Pick<GeoPromptRecord, "prompt" | "category" | "engines" | "country" | "language" | "enabled" | "metadata">>

export async function listGeoPrompts(supabase: SupabaseClient, userId: string, projectId: string) {
  const { data, error } = await supabase
    .from("geo_prompts")
    .select("*")
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as GeoPromptRecord[]
}

export async function createGeoPrompt(supabase: SupabaseClient, input: CreateGeoPromptInput) {
  const { data, error } = await supabase.from("geo_prompts").insert(input).select("*").single()
  if (error) throw error
  return data as GeoPromptRecord
}

export async function updateGeoPrompt(supabase: SupabaseClient, userId: string, projectId: string, promptId: string, patch: UpdateGeoPromptInput) {
  const { data, error } = await supabase
    .from("geo_prompts")
    .update(patch)
    .eq("id", promptId)
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .select("*")
    .single()
  if (error) throw error
  return data as GeoPromptRecord
}

export async function deleteGeoPrompt(supabase: SupabaseClient, userId: string, projectId: string, promptId: string) {
  const { error } = await supabase
    .from("geo_prompts")
    .delete()
    .eq("id", promptId)
    .eq("project_id", projectId)
    .eq("user_id", userId)
  if (error) throw error
}
