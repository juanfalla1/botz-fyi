import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/api/_utils/auth";
import { getServiceSupabase } from "@/app/api/_utils/supabase";
import { SYSTEM_TENANT_ID } from "@/app/api/_utils/system";
import { protectConfig, redactConfig } from "@/app/api/_utils/secret-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });

  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });

  const { data, error } = await supabase
    .from("agent_channel_connections")
    .select("*")
    .eq("created_by", guard.user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  const [{ data: agents }, { data: numbers }] = await Promise.all([
    supabase.from("ai_agents").select("id,name,type,status").eq("tenant_id", SYSTEM_TENANT_ID).eq("created_by", guard.user.id),
    supabase.from("agent_phone_numbers").select("id,friendly_name,phone_number_e164,status").eq("created_by", guard.user.id).order("created_at", { ascending: false }),
  ]);

  const safe = (data || []).map((r: any) => ({ ...r, config: redactConfig(r?.config) }));
  return NextResponse.json({ ok: true, data: safe, agents: agents || [], numbers: numbers || [] });
}

export async function POST(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });

  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });

  try {
    const body = await req.json().catch(() => ({}));
    const channelType = String(body?.channel_type || "voice").toLowerCase();
    const provider = String(body?.provider || "twilio").toLowerCase();
    const display = String(body?.display_name || "").trim();
    if (!display) return NextResponse.json({ ok: false, error: "Falta nombre del canal" }, { status: 400 });

    const payload = {
      tenant_id: SYSTEM_TENANT_ID,
      created_by: guard.user.id,
      channel_type: channelType,
      provider,
      display_name: display,
      status: String(body?.status || "disconnected").toLowerCase(),
      webhook_url: body?.webhook_url ? String(body.webhook_url).trim() : null,
      phone_number_id: body?.phone_number_id ? String(body.phone_number_id) : null,
      assigned_agent_id: body?.assigned_agent_id ? String(body.assigned_agent_id) : null,
      config: protectConfig(body?.config && typeof body.config === "object" ? body.config : {}),
    };

    const { data, error } = await supabase.from("agent_channel_connections").insert(payload).select("*").single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, data: { ...data, config: redactConfig((data as any)?.config) } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "No se pudo guardar credenciales" }, { status: 500 });
  }
}
