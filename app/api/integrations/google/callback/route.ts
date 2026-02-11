import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

type GoogleTokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

async function fetchGoogleEmail(accessToken: string): Promise<string | null> {
  // userinfo.email (openid)
  const r = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) return null;
  const j: any = await r.json();
  return j?.email ?? null;
}

async function fetchGmailProfile(accessToken: string) {
  const r = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) return null;
  return await r.json();
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!state) {
      return NextResponse.json({ ok: false, error: "Missing state" }, { status: 400 });
    }
    if (!code) {
      return NextResponse.json({ ok: false, error: "Missing code" }, { status: 400 });
    }

    // ✅ Next.js 16: cookies() es async
    const cookieStore = await cookies();

    const expectedState = cookieStore.get("botz_google_oauth_state")?.value || null;
    if (!expectedState || expectedState !== state) {
      return NextResponse.json({ ok: false, error: "Invalid state" }, { status: 400 });
    }

    const tenantId = cookieStore.get("botz_google_oauth_tenant")?.value || null;
    const userId = cookieStore.get("botz_google_oauth_user")?.value || null;

    if (!tenantId || !userId) {
      return NextResponse.json(
        { ok: false, error: "Missing tenant_id or user_id (cookies)" },
        { status: 400 }
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { ok: false, error: "Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET" },
        { status: 500 }
      );
    }

    const redirectUri = `${url.origin}/api/integrations/google/callback`;

    // Exchange code -> tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });

    if (!tokenRes.ok) {
      const t = await tokenRes.text();
      return NextResponse.json(
        { ok: false, error: "TOKEN_EXCHANGE_FAILED", details: t },
        { status: 500 }
      );
    }

    const tokenJson = (await tokenRes.json()) as GoogleTokenResponse;
    if (!tokenJson.access_token) {
      return NextResponse.json(
        { ok: false, error: "Missing access_token from Google" },
        { status: 500 }
      );
    }

    const accessToken = tokenJson.access_token;

    // Email (userinfo) + Gmail profile
    const emailFromUserinfo = await fetchGoogleEmail(accessToken);
    const gmailProfile = await fetchGmailProfile(accessToken);
    const emailAddress = emailFromUserinfo || gmailProfile?.emailAddress || null;

    const nowIso = new Date().toISOString();
    const expiresAt = tokenJson.expires_in
      ? new Date(Date.now() + tokenJson.expires_in * 1000).toISOString()
      : null;

    // Guardamos tokens + perfil
    const credentialsToStore = {
      ...tokenJson,
      expires_at: expiresAt,
      gmail_profile: gmailProfile,
      emailAddress,
    };

    // Supabase (service role)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { ok: false, error: "Missing SUPABASE env (URL or SERVICE_ROLE)" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // ✅ UPSERT (idempotente) para evitar duplicate key por UNIQUE (user_id, channel_type, provider)
    const { error: upsertErr } = await supabase
      .from("integrations")
      .upsert(
        {
          tenant_id: tenantId,
          user_id: userId,
          channel_type: "gmail",
          provider: "google",
          status: "connected",
          credentials: credentialsToStore,
          config: null,
          email_address: emailAddress,
          updated_at: nowIso,
          last_activity: nowIso,
        },
        { onConflict: "user_id,channel_type,provider" }
      );

    if (upsertErr) {
      return NextResponse.json(
        { ok: false, error: "DB_UPSERT_FAILED", details: upsertErr.message },
        { status: 500 }
      );
    }

    // Limpieza cookies state
    // En vez de redirect, cerramos el popup y la página principal se refresca sola
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Gmail conectado</title></head>
        <body style="background:#0f172a;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
          <div style="text-align:center">
            <div style="font-size:48px;margin-bottom:16px">✅</div>
            <h2>Gmail conectado exitosamente</h2>
            <p style="color:#94a3b8">Esta ventana se cerrará automáticamente...</p>
          </div>
          <script>
            setTimeout(function() { window.close(); }, 1500);
          </script>
        </body>
      </html>
    `;

    const res = new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
    res.cookies.set("botz_google_oauth_state", "", { path: "/", maxAge: 0 });

    return res;
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", details: String(e?.message || e) },
      { status: 500 }
    );
  }
}
