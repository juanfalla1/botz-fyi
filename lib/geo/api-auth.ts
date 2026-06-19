import { createClient } from "@supabase/supabase-js"
import { SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from "@/app/api/_utils/supabase"
import { isGeoAdminEmail } from "@/lib/geo/admin"

const DEFAULT_PROD_SUPABASE_REF = "chyzxaspglbwnenagtjv"
export const GEO_SUPABASE_URL = process.env.GEO_SUPABASE_URL || SUPABASE_URL
export const GEO_SUPABASE_ANON_KEY = process.env.GEO_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY
const GEO_SUPABASE_SERVICE_ROLE_KEY = process.env.GEO_SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE_KEY

function assertSafeGeoWrite(req: Request) {
  const method = req.method.toUpperCase()
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return
  if (process.env.NODE_ENV !== "development") return
  if (process.env.ALLOW_GEO_PROD_DB_WRITES === "true") return

  const prodRef = process.env.GEO_PROD_SUPABASE_REF || DEFAULT_PROD_SUPABASE_REF
  if (GEO_SUPABASE_URL?.includes(`${prodRef}.supabase.co`)) {
    throw new Error("Blocked GEO write: local development is connected to the production Supabase project. Set a non-production Supabase URL for local testing.")
  }
}

function getGeoAnonSupabaseWithToken(accessToken: string) {
  if (!GEO_SUPABASE_URL || !GEO_SUPABASE_ANON_KEY) return null
  const token = String(accessToken || "").trim()
  if (!token) return null
  return createClient(GEO_SUPABASE_URL, GEO_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

function getGeoServiceSupabase() {
  if (!GEO_SUPABASE_URL || !GEO_SUPABASE_SERVICE_ROLE_KEY) return null
  return createClient(GEO_SUPABASE_URL, GEO_SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

export async function getGeoApiClient(req: Request) {
  const auth = req.headers.get("authorization") || ""
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : ""
  if (!token) throw new Error("Missing bearer token")

  if (!GEO_SUPABASE_URL || !GEO_SUPABASE_ANON_KEY) {
    throw new Error("Supabase server env missing")
  }

  assertSafeGeoWrite(req)

  const userResponse = await fetch(`${GEO_SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: GEO_SUPABASE_ANON_KEY,
    },
  })
  const userData = await userResponse.json().catch(() => null)

  if (!userResponse.ok || !userData?.id) {
    throw new Error(userData?.msg || userData?.message || userData?.error_description || userData?.error || "Invalid Supabase user token")
  }

  const serviceSupabase = getGeoServiceSupabase()
  if (serviceSupabase) {
    return { supabase: serviceSupabase, user: userData, isAdmin: isGeoAdminEmail(userData.email) }
  }

  const supabase = getGeoAnonSupabaseWithToken(token)
  if (!supabase) throw new Error("Supabase client unavailable: check GEO_SUPABASE_URL/GEO_SUPABASE_ANON_KEY or global Supabase env")
  return { supabase, user: userData, isAdmin: isGeoAdminEmail(userData.email) }
}
