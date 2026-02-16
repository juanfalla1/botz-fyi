import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const META_APP_SECRET = process.env.META_APP_SECRET;

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

/**
 * Verifies X-Hub-Signature-256 header from Meta webhooks
 * Returns true if signature is valid, false otherwise
 */
function verifyMetaSignature(payload: string, signatureHeader: string | null): boolean {
  if (!META_APP_SECRET) {
    console.error("META_APP_SECRET not configured");
    return false;
  }

  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false;
  }

  const receivedSignature = signatureHeader.slice(7); // Remove "sha256=" prefix
  
  const hmac = createHmac("sha256", META_APP_SECRET);
  hmac.update(payload);
  const expectedSignature = hmac.digest("hex");

  try {
    // Timing-safe comparison to prevent timing attacks
    const receivedBuf = Buffer.from(receivedSignature, "hex");
    const expectedBuf = Buffer.from(expectedSignature, "hex");
    
    if (receivedBuf.length !== expectedBuf.length) {
      return false;
    }
    
    return timingSafeEqual(receivedBuf, expectedBuf);
  } catch {
    return false;
  }
}

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
  try {
    // Read raw body for signature verification
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");

    // Verify signature to ensure request is from Meta
    if (!verifyMetaSignature(rawBody, signature)) {
      console.warn("Invalid X-Hub-Signature-256 - possible spoofed request");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Parse JSON only after signature verification
    const body = JSON.parse(rawBody);

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
  } catch (error) {
    console.error("Error processing Meta webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
