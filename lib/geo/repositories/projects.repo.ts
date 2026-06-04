import type { SupabaseClient } from "@supabase/supabase-js"
import type { ProjectRecord } from "@/lib/geo/db-types"

function getSupabaseErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (error && typeof error === "object" && "message" in error) return String((error as { message?: unknown }).message)
  return String(error || "Unknown Supabase error")
}

export async function listProjects(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.from("projects").select("*").eq("user_id", userId).order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as ProjectRecord[]
}

export async function createProject(
  supabase: SupabaseClient,
  input: Omit<ProjectRecord, "id" | "created_at" | "updated_at" | "workspace_id"> & { workspace_id?: string | null }
) {
  const payload: Record<string, unknown> = { ...input }
  if (!payload.workspace_id) delete payload.workspace_id

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const { data, error } = await supabase.from("projects").insert(payload).select("*").single()
    if (!error) return data as ProjectRecord

    const message = getSupabaseErrorMessage(error)
    const missingColumn = message.match(/'([^']+)' column/)?.[1]
    if (missingColumn && missingColumn in payload) {
      delete payload[missingColumn]
      continue
    }

    throw new Error(message)
  }

  throw new Error("Project creation failed after schema fallback attempts")
}

export async function updateProjectAliases(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  patch: Partial<Pick<ProjectRecord, "brand_aliases" | "domain_aliases" | "entity_stopwords">>
) {
  const { data, error } = await supabase.from("projects").update(patch).eq("id", id).eq("user_id", userId).select("*").single()
  if (error) throw error
  return data as ProjectRecord
}

export async function getProjectForMatchingPreview(supabase: SupabaseClient, userId: string, id: string) {
  const { data, error } = await supabase
    .from("projects")
    .select("id, user_id, company_name, website_url, language, country, brand_aliases, domain_aliases, entity_stopwords")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null

  return {
    id: String(data.id),
    user_id: String(data.user_id),
    company_name: String(data.company_name),
    website_url: String(data.website_url),
    language: data.language ? String(data.language) : null,
    country: data.country ? String(data.country) : null,
    brand_aliases: Array.isArray(data.brand_aliases) ? data.brand_aliases.map((x) => String(x)) : [],
    domain_aliases: Array.isArray(data.domain_aliases) ? data.domain_aliases.map((x) => String(x)) : [],
    entity_stopwords: Array.isArray(data.entity_stopwords) ? data.entity_stopwords.map((x) => String(x)) : [],
  }
}
