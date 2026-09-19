import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/api/_utils/auth";
import { getServiceSupabase } from "@/app/api/_utils/supabase";
import { revealConfig } from "@/app/api/_utils/secret-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function testMetaWhatsApp(cfg: Record<string, string>) {
  const token = String(cfg.permanent_token || cfg.access_token || "").trim();
  const phoneId = String(cfg.phone_number_id || "").trim();
  if (!token || !phoneId) return { ok: false, error: "Falta token o phone_number_id" };

  const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(phoneId)}?fields=id,display_phone_number`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: String(json?.error?.message || "Meta credential test failed") };
  }
  return { ok: true };
}

async function testTwilioVoice(cfg: Record<string, string>) {
  const sid = String(cfg.account_sid || "").trim();
  const token = String(cfg.auth_token || "").trim();
  if (!sid || !token) return { ok: false, error: "Falta Account SID o Auth Token" };

  const basic = Buffer.from(`${sid}:${token}`).toString("base64");
  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}.json`;
  const res = await fetch(url, { headers: { Authorization: `Basic ${basic}` } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: String(json?.message || "Twilio credential test failed") };
  }
  return { ok: true };
}

export async function POST(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const channelType = String(body?.channel_type || "").toLowerCase();
  const provider = String(body?.provider || "").toLowerCase();
  const config = body?.config && typeof body.config === "object" ? body.config : {};

  try {
    if (provider === "meta" && (channelType === "whatsapp" || channelType === "instagram")) {
      const out = await testMetaWhatsApp(config);
      return NextResponse.json(out, { status: out.ok ? 200 : 400 });
    }
    if (provider === "twilio" && channelType === "voice") {
      const out = await testTwilioVoice(config);
      return NextResponse.json(out, { status: out.ok ? 200 : 400 });
    }
    if (provider === "meta-embedded" && channelType === "whatsapp") {
      const connectionId = String(body?.connection_id || "").trim();
      const supabase = getServiceSupabase();
      if (!connectionId || !supabase) return NextResponse.json({ ok: false, error: "Conexión inválida" }, { status: 400 });

      const { data: connection, error } = await supabase
        .from("agent_channel_connections")
        .select("id,assigned_agent_id,config")
        .eq("id", connectionId)
        .eq("created_by", guard.user.id)
        .eq("channel_type", "whatsapp")
        .eq("provider", "meta")
        .maybeSingle();
      if (error || !connection) return NextResponse.json({ ok: false, error: error?.message || "Conexión no encontrada" }, { status: 404 });
      if (!connection.assigned_agent_id) return NextResponse.json({ ok: false, error: "Asigna un agente antes de probar" }, { status: 400 });

      const out = await testMetaWhatsApp(revealConfig(connection.config || {}));
      if (out.ok) {
        await supabase.from("agent_channel_connections").update({ status: "connected", updated_at: new Date().toISOString() }).eq("id", connectionId).eq("created_by", guard.user.id);
      }
      return NextResponse.json(out, { status: out.ok ? 200 : 400 });
    }

    return NextResponse.json({ ok: true, warning: "Proveedor sin test automatico aun" });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "No se pudo validar credenciales" }, { status: 500 });
  }
}
