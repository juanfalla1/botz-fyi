import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_GEO_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co"
const supabaseAnonKey = process.env.NEXT_PUBLIC_GEO_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key"
const supabaseProjectRef = (() => {
  try {
    return new URL(supabaseUrl).hostname.split(".")[0] || "default"
  } catch {
    return "default"
  }
})()
const storageKey = `sb-botz-geo-auth-${supabaseProjectRef}`

if (typeof window !== "undefined") {
  const legacyKey = "sb-botz-geo-auth"
  if (legacyKey !== storageKey) window.localStorage.removeItem(legacyKey)
}

export const supabaseGeo = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
