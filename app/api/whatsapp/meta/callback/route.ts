import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

// ✅ 1) Meta Webhook Verification (GET)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode !== "subscribe" || !token || !challenge) {
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }

  // Busca el tenant por verify_token (guardado en BD)
  const { data } = await supabaseAdmin
    .from("whatsapp_connections")
    .select("tenant_id")
    .eq("provider", "meta")
    .eq("meta_verify_token", token)
    .limit(1)
    .maybeSingle();

  if (!data?.tenant_id) {
    return NextResponse.json({ error: "Invalid verify token" }, { status: 403 });
  }

  return new NextResponse(challenge, { status: 200 });
}

// ✅ 2) Eventos entrantes (POST)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  // phone_number_id para mapear el tenant
  const phoneId =
    body?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id || null;

  if (!phoneId) return NextResponse.json({ ok: true });

  const { data: conn } = await supabaseAdmin
    .from("whatsapp_connections")
    .select("tenant_id")
    .eq("provider", "meta")
    .eq("meta_phone_number_id", String(phoneId))
    .limit(1)
    .maybeSingle();

  // Aquí después: guardar mensaje / enviar a n8n / etc.
  return NextResponse.json({ ok: true, tenant_id: conn?.tenant_id || null });
}
