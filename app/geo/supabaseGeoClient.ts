import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_GEO_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_GEO_SUPABASE_ANON_KEY || ""
const resolvedSupabaseUrl = supabaseUrl || "https://missing-geo-supabase-url.supabase.co"
const resolvedSupabaseAnonKey = supabaseAnonKey || "missing-geo-supabase-anon-key"
const supabaseProjectRef = (() => {
  try {
    return new URL(resolvedSupabaseUrl).hostname.split(".")[0] || "default"
  } catch {
    return "default"
  }
})()
const storageKey = `sb-botz-geo-auth-${supabaseProjectRef}`

export const supabaseGeoProjectRef = supabaseProjectRef
export const supabaseGeoUrlConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (typeof window !== "undefined") {
  if (!supabaseUrl || !supabaseAnonKey) console.error("GEO Supabase env missing: set NEXT_PUBLIC_GEO_SUPABASE_URL and NEXT_PUBLIC_GEO_SUPABASE_ANON_KEY")
  const legacyKey = "sb-botz-geo-auth"
  if (legacyKey !== storageKey) window.localStorage.removeItem(legacyKey)
}

export const supabaseGeo = createClient(resolvedSupabaseUrl, resolvedSupabaseAnonKey, {
  auth: {
    storageKey,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
