import type { SupabaseClient } from "@supabase/supabase-js"

export async function seedGeoIfEmpty(supabase: SupabaseClient, userId: string) {
  const { count } = await supabase.from("projects").select("id", { head: true, count: "exact" }).eq("user_id", userId)
  if ((count ?? 0) > 0) return

  const { data: project } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      company_name: "Botz AI",
      website_url: "https://botz.fyi",
      country: "Colombia",
      language: "es",
      industry: "AI Automation",
      business_goal: "Improve AI visibility",
    })
    .select("id")
    .single()

  if (!project) return

  await supabase.from("competitors").insert([
    { user_id: userId, project_id: project.id, name: "Competitor Alpha", domain: "alpha.com" },
    { user_id: userId, project_id: project.id, name: "Industry Leader", domain: "leader.io" },
  ])
}
