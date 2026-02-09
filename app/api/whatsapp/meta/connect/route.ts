import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const tenantId = String(body.tenantId || body.tenant_id || "").trim();
    if (!tenantId) {
      return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
    }

    const meta_phone_number_id = String(body.meta_phone_number_id || "").trim();
    const meta_waba_id = String(body.meta_waba_id || "").trim();
    const meta_access_token = String(body.meta_access_token || "").trim();
    const meta_verify_token = String(body.meta_verify_token || "").trim();

    if (!meta_phone_number_id || !meta_waba_id || !meta_access_token || !meta_verify_token) {
      return NextResponse.json({ error: "Missing Meta credentials" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("whatsapp_connections")
      .upsert(
        {
          tenant_id: tenantId,
          provider: "meta",
          meta_phone_number_id,
          meta_waba_id,
          meta_access_token,
          meta_verify_token,
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: "tenant_id,provider" as any }
      );

    if (error) throw error;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.botz.fyi";

    return NextResponse.json({
      ok: true,
      webhook_url: `${appUrl}/api/whatsapp/meta/callback`,
      verify_token: meta_verify_token,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "META_CONNECT_FAILED" }, { status: 500 });
  }
}
