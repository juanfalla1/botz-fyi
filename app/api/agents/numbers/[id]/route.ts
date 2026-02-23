import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/api/_utils/auth";
import { getServiceSupabase } from "@/app/api/_utils/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await getRequestUser(req);
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });

  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const patch: any = {
    updated_at: new Date().toISOString(),
  };

  if (body.friendly_name !== undefined) patch.friendly_name = String(body.friendly_name || "").trim();
  if (body.status !== undefined) patch.status = String(body.status || "verified").toLowerCase();
  if (body.assigned_agent_id !== undefined) patch.assigned_agent_id = body.assigned_agent_id ? String(body.assigned_agent_id) : null;
  if (body.capabilities !== undefined && typeof body.capabilities === "object") patch.capabilities = body.capabilities;

  const { data, error } = await supabase
    .from("agent_phone_numbers")
    .update(patch)
    .eq("id", id)
    .eq("created_by", guard.user.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, data });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await getRequestUser(req);
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });

  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });

  const { id } = await ctx.params;
  const { error } = await supabase.from("agent_phone_numbers").delete().eq("id", id).eq("created_by", guard.user.id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
