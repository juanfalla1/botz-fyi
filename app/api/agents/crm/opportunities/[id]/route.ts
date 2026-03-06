import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/api/_utils/auth";
import { getServiceSupabase } from "@/app/api/_utils/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["draft", "sent", "won", "lost"]);

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await getRequestUser(req);
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });

  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const nextStatus = String(body?.status || "").toLowerCase();
  if (!ALLOWED.has(nextStatus)) {
    return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("agent_quote_drafts")
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("created_by", guard.user.id)
    .select("id,status,updated_at")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, data });
}
