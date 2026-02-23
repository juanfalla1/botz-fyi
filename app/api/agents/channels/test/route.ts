import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/api/_utils/auth";

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

    return NextResponse.json({ ok: true, warning: "Proveedor sin test automatico aun" });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "No se pudo validar credenciales" }, { status: 500 });
  }
}
