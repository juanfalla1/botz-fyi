import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co"
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key"

export const supabaseGeo = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: "sb-botz-geo-auth",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
