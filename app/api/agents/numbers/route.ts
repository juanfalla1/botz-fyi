import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/api/_utils/auth";
import { getServiceSupabase } from "@/app/api/_utils/supabase";
import { SYSTEM_TENANT_ID } from "@/app/api/_utils/system";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });

  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });

  const { data, error } = await supabase
    .from("agent_phone_numbers")
    .select("*")
    .eq("created_by", guard.user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  const { data: agents } = await supabase
    .from("ai_agents")
    .select("id,name,type,status")
    .eq("tenant_id", SYSTEM_TENANT_ID)
    .eq("created_by", guard.user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ ok: true, data: data || [], agents: agents || [] });
}

export async function POST(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });

  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const phone = String(body?.phone_number_e164 || "").trim();
  if (!phone || !/^\+?[1-9]\d{7,14}$/.test(phone)) {
    return NextResponse.json({ ok: false, error: "Numero invalido. Usa formato E.164, por ejemplo +573001234567" }, { status: 400 });
  }

  const payload = {
    tenant_id: SYSTEM_TENANT_ID,
    created_by: guard.user.id,
    provider: String(body?.provider || "twilio").toLowerCase(),
    friendly_name: String(body?.friendly_name || "").trim(),
    phone_number_e164: phone.startsWith("+") ? phone : `+${phone}`,
    status: String(body?.status || "verified").toLowerCase(),
    assigned_agent_id: body?.assigned_agent_id ? String(body.assigned_agent_id) : null,
    capabilities: body?.capabilities && typeof body.capabilities === "object" ? body.capabilities : { voice: true, sms: false, whatsapp: false },
    metadata: body?.metadata && typeof body.metadata === "object" ? body.metadata : {},
  };

  const { data, error } = await supabase.from("agent_phone_numbers").insert(payload).select("*").single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, data });
}
