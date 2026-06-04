import type { SupabaseClient } from "@supabase/supabase-js"
import type { NotificationRecord } from "@/lib/geo/db-types"

export async function listNotifications(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50)
  if (error) throw error
  return (data ?? []) as NotificationRecord[]
}

export async function markNotificationRead(supabase: SupabaseClient, userId: string, id: string) {
  const { data, error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single()
  if (error) throw error
  return data as NotificationRecord
}

export async function seedNotificationIfEmpty(supabase: SupabaseClient, userId: string) {
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId)
  if ((count ?? 0) > 0) return
  await supabase.from("notifications").insert([
    { user_id: userId, title: "GEO audit queued", body: "Your latest GEO scan is queued.", level: "info" },
    { user_id: userId, title: "Weekly snapshot ready", body: "Your weekly visibility snapshot is available.", level: "success" },
  ])
}

export async function createNotification(
  supabase: SupabaseClient,
  input: Pick<NotificationRecord, "user_id" | "title" | "body" | "level" | "metadata">
) {
  const { data, error } = await supabase.from("notifications").insert(input).select("*").single()
  if (error) throw error
  return data as NotificationRecord
}
