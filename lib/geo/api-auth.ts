import { getAnonSupabaseWithToken, getServiceSupabase, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/app/api/_utils/supabase"
import { isGeoAdminEmail } from "@/lib/geo/admin"

export async function getGeoApiClient(req: Request) {
  const auth = req.headers.get("authorization") || ""
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : ""
  if (!token) throw new Error("Missing bearer token")

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase server env missing")
  }

  const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
    },
  })
  const userData = await userResponse.json().catch(() => null)

  if (!userResponse.ok || !userData?.id) {
    throw new Error(userData?.msg || userData?.message || userData?.error_description || userData?.error || "Invalid Supabase user token")
  }

  const serviceSupabase = getServiceSupabase()
  if (serviceSupabase) {
    return { supabase: serviceSupabase, user: userData, isAdmin: isGeoAdminEmail(userData.email) }
  }

  const supabase = getAnonSupabaseWithToken(token)
  if (!supabase) throw new Error("Supabase client unavailable: check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY")
  return { supabase, user: userData, isAdmin: isGeoAdminEmail(userData.email) }
}
