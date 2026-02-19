import { NextResponse } from "next/server";
import { getAnonSupabaseWithToken } from "@/app/api/_utils/supabase";
import { getRequestUser } from "@/app/api/_utils/auth";
import { SYSTEM_TENANT_ID } from "@/app/api/_utils/system";

export async function GET(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });
  }

  const supabase = getAnonSupabaseWithToken(guard.token);
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Missing SUPABASE env (URL or ANON)" }, { status: 500 });
  }

  try {
    const { data, error } = await supabase
      .from("ai_agents")
      .select("*")
      .eq("tenant_id", SYSTEM_TENANT_ID)
      .eq("created_by", guard.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: data || [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
