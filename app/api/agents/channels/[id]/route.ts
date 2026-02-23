import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/api/_utils/auth";
import { getServiceSupabase } from "@/app/api/_utils/supabase";
import { protectConfig, redactConfig } from "@/app/api/_utils/secret-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await getRequestUser(req);
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });

  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const patch: any = { updated_at: new Date().toISOString() };

  if (body.display_name !== undefined) patch.display_name = String(body.display_name || "").trim();
  if (body.status !== undefined) patch.status = String(body.status || "disconnected").toLowerCase();
  if (body.webhook_url !== undefined) patch.webhook_url = body.webhook_url ? String(body.webhook_url).trim() : null;
  if (body.phone_number_id !== undefined) patch.phone_number_id = body.phone_number_id ? String(body.phone_number_id) : null;
  if (body.assigned_agent_id !== undefined) patch.assigned_agent_id = body.assigned_agent_id ? String(body.assigned_agent_id) : null;
  if (body.config !== undefined && typeof body.config === "object") {
    const { data: existing } = await supabase
      .from("agent_channel_connections")
      .select("config")
      .eq("id", id)
      .eq("created_by", guard.user.id)
      .maybeSingle();

    const merged = { ...(existing?.config || {}), ...(body.config || {}) };
    patch.config = protectConfig(merged);
  }

  const { data, error } = await supabase
    .from("agent_channel_connections")
    .update(patch)
    .eq("id", id)
    .eq("created_by", guard.user.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, data: { ...data, config: redactConfig((data as any)?.config) } });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await getRequestUser(req);
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });

  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });

  const { id } = await ctx.params;
  const { error } = await supabase.from("agent_channel_connections").delete().eq("id", id).eq("created_by", guard.user.id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
