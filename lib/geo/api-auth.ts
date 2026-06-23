import { createClient } from "@supabase/supabase-js"
import { isGeoAdminEmail } from "@/lib/geo/admin"

const DEFAULT_PROD_SUPABASE_REF = "xgedzmeguukvqdotnqap"
export const GEO_SUPABASE_URL = process.env.GEO_SUPABASE_URL || ""
export const GEO_SUPABASE_ANON_KEY = process.env.GEO_SUPABASE_ANON_KEY || ""
const GEO_SUPABASE_SERVICE_ROLE_KEY = process.env.GEO_SUPABASE_SERVICE_ROLE_KEY || ""
const MAIN_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ""
const EXPLICIT_BLOCKED_REFS = (process.env.GEO_BLOCKED_SUPABASE_REFS || "")
  .split(",")
  .map((ref) => ref.trim())
  .filter(Boolean)

function getSupabaseProjectRef(url: string) {
  try {
    return new URL(url).hostname.split(".")[0] || ""
  } catch {
    return ""
  }
}

function assertGeoProjectIsSeparated() {
  const geoRef = getSupabaseProjectRef(GEO_SUPABASE_URL)
  const mainRef = getSupabaseProjectRef(MAIN_SUPABASE_URL)
  const blockedRefs = new Set([mainRef, ...EXPLICIT_BLOCKED_REFS].filter(Boolean))
  if (geoRef && blockedRefs.has(geoRef)) {
    throw new Error(`Blocked GEO Supabase: GEO is connected to a non-GEO Supabase project (${geoRef}). Set GEO_SUPABASE_URL to the dedicated GEO project.`)
  }
}

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

export function getGeoServiceSupabase() {
  if (!GEO_SUPABASE_URL || !GEO_SUPABASE_SERVICE_ROLE_KEY) return null
  assertGeoProjectIsSeparated()
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

  assertGeoProjectIsSeparated()
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
  if (!supabase) throw new Error("Supabase client unavailable: check GEO_SUPABASE_URL/GEO_SUPABASE_ANON_KEY")
  return { supabase, user: userData, isAdmin: isGeoAdminEmail(userData.email) }
}
