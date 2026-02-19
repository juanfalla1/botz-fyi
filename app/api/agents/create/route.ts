import { NextResponse } from "next/server";
import { getAnonSupabaseWithToken } from "@/app/api/_utils/supabase";
import { getRequestUser } from "@/app/api/_utils/auth";
import { SYSTEM_TENANT_ID } from "@/app/api/_utils/system";

export async function POST(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });
  }

  const supabase = getAnonSupabaseWithToken(guard.token);
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Missing SUPABASE env (URL or ANON)" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const name = String(body?.name || "").trim();
    const type = String(body?.type || "").trim();

    if (!name || !type) {
      return NextResponse.json({ ok: false, error: "Missing name or type" }, { status: 400 });
    }

    const payload = {
      name,
      type,
      description: body?.description || "",
      configuration: body?.configuration || {},
      voice_settings: body?.voice_settings || null,
      tenant_id: SYSTEM_TENANT_ID,
      created_by: guard.user.id,
      status: body?.status || "draft",
    };

    const { data, error } = await supabase
      .from("ai_agents")
      .insert(payload)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
