import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/api/_utils/auth";
import { getServiceSupabase } from "@/app/api/_utils/supabase";
import { revealConfig } from "@/app/api/_utils/secret-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });

  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const id = String(body?.id || "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "Missing channel id" }, { status: 400 });

  const { data: row, error } = await supabase
    .from("agent_channel_connections")
    .select("id,created_by,channel_type,provider,config")
    .eq("id", id)
    .eq("created_by", guard.user.id)
    .maybeSingle();

  if (error || !row) return NextResponse.json({ ok: false, error: error?.message || "Canal no encontrado" }, { status: 404 });

  if (String(row.provider) !== "meta" || String(row.channel_type) !== "whatsapp") {
    return NextResponse.json({ ok: true, warning: "No aplica verificacion webhook para este canal" });
  }

  const cfg = revealConfig((row as any).config || {});
  const isVerified = Boolean(cfg?.__meta_webhook_verified);
  const lastInbound = String(cfg?.__meta_last_inbound_at || "");
  const verifiedAt = String(cfg?.__meta_webhook_verified_at || "");

  return NextResponse.json({
    ok: true,
    data: {
      id,
      verified: isVerified,
      verified_at: verifiedAt || null,
      last_inbound_at: lastInbound || null,
    },
  });
}
