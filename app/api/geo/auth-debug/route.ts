import { NextResponse } from "next/server"
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/app/api/_utils/supabase"

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") || ""
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : ""

  if (!token) {
    return NextResponse.json({ ok: false, reason: "MISSING_TOKEN" }, { status: 401 })
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.json({ ok: false, reason: "SERVER_SUPABASE_ENV_MISSING" }, { status: 500 })
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
    },
  })
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    return NextResponse.json(
      {
        ok: false,
        reason: "SUPABASE_TOKEN_REJECTED",
        status: response.status,
        message: data?.msg || data?.message || data?.error_description || data?.error || "Token rejected by Supabase",
      },
      { status: 401 },
    )
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: data?.id,
      email: data?.email,
    },
  })
}
