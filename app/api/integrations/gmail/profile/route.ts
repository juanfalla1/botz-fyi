import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const tenant_id = String(body?.tenant_id || "").trim();
    const user_id = String(body?.user_id || "").trim();

    if (!isUuid(tenant_id) || !isUuid(user_id)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_INPUT", details: "tenant_id o user_id inválido" },
        { status: 400 }
      );
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return NextResponse.json(
        { ok: false, error: "MISSING_SUPABASE_ENV" },
        { status: 500 }
      );
    }
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return NextResponse.json(
        { ok: false, error: "MISSING_GOOGLE_ENV" },
        { status: 500 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    // 1) Traer la integración (google + gmail) del tenant y user
    const { data: integ, error: integErr } = await supabase
      .from("integrations")
      .select("tenant_id, user_id, provider, channel_type, status, credentials")
      .eq("tenant_id", tenant_id)
      .eq("user_id", user_id)
      .eq("provider", "google")
      .eq("channel_type", "gmail")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (integErr) {
      return NextResponse.json(
        { ok: false, error: "DB_READ_FAILED", details: integErr.message },
        { status: 500 }
      );
    }

    if (!integ) {
      return NextResponse.json(
        { ok: false, error: "NO_INTEGRATION_FOUND" },
        { status: 404 }
      );
    }

    if (integ.status !== "connected") {
      return NextResponse.json(
        { ok: false, error: "NOT_CONNECTED", status: integ.status },
        { status: 400 }
      );
    }

    const creds = (integ.credentials || {}) as any;

    let access_token: string | null = creds.access_token || null;
    const refresh_token: string | null = creds.refresh_token || null;

    // Si manejas expires_at, úsalo. Si no existe, igual intentamos con el token actual.
    const expires_at = creds.expires_at ? Number(creds.expires_at) : null;
    const now = Math.floor(Date.now() / 1000);

    const mustRefresh =
      !access_token ||
      (expires_at && Number.isFinite(expires_at) && expires_at <= now + 60);

    // 2) Refrescar access_token si hace falta
    if (mustRefresh) {
      if (!refresh_token) {
        return NextResponse.json(
          { ok: false, error: "NO_REFRESH_TOKEN" },
          { status: 400 }
        );
      }

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token,
          grant_type: "refresh_token",
        }),
      });

      const tokenJson = await tokenRes.json();

      if (!tokenRes.ok) {
        return NextResponse.json(
          { ok: false, error: "TOKEN_REFRESH_FAILED", details: tokenJson },
          { status: 401 }
        );
      }

      access_token = tokenJson.access_token;
      const expires_in = Number(tokenJson.expires_in || 3600);
      const new_expires_at = now + expires_in;

      // 3) Guardar el nuevo access_token en credentials (sin tocar refresh_token)
      const newCreds = {
        ...creds,
        access_token,
        expires_at: new_expires_at,
        token_type: tokenJson.token_type || creds.token_type || "Bearer",
        scope: tokenJson.scope || creds.scope,
      };

      const { error: upErr } = await supabase
        .from("integrations")
        .update({ credentials: newCreds, status: "connected" })
        .eq("tenant_id", tenant_id)
        .eq("user_id", user_id)
        .eq("provider", "google")
        .eq("channel_type", "gmail");

      if (upErr) {
        return NextResponse.json(
          { ok: false, error: "DB_UPDATE_FAILED", details: upErr.message },
          { status: 500 }
        );
      }
    }

    // 4) Llamar Gmail profile
    const gmailRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const gmailJson = await gmailRes.json();

    if (!gmailRes.ok) {
      return NextResponse.json(
        { ok: false, error: "GMAIL_API_FAILED", details: gmailJson },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      tenant_id,
      user_id,
      gmail_profile: gmailJson, // emailAddress, messagesTotal, threadsTotal, historyId
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "UNEXPECTED_ERROR", details: e?.message || String(e) },
      { status: 500 }
    );
  }
}
