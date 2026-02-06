import { NextResponse } from "next/server";

// Genera state simple (string)
function makeState() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const tenantId = url.searchParams.get("tenant_id");
    const userId = url.searchParams.get("user_id");

    if (!tenantId || !userId) {
      return NextResponse.json(
        { ok: false, error: "Missing tenant_id or user_id" },
        { status: 400 }
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = `${url.origin}/api/integrations/google/callback`;

    if (!clientId) {
      return NextResponse.json(
        { ok: false, error: "Missing GOOGLE_CLIENT_ID" },
        { status: 500 }
      );
    }

    const state = makeState();

    // Scopes completos: Gmail (leer, enviar, modificar) + email del usuario
    const scope = [
      "openid",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",      // ✅ AGREGAR: Enviar emails
      "https://www.googleapis.com/auth/gmail.modify",    // ✅ AGREGAR: Modificar emails
      // Si vas a usar Drive también:
      "https://www.googleapis.com/auth/drive.readonly",
    ].join(" ");

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", scope);
    authUrl.searchParams.set("access_type", "offline"); // para refresh_token (si Google lo entrega)
    authUrl.searchParams.set("prompt", "consent"); // fuerza refresh_token en muchos casos
    authUrl.searchParams.set("state", state);

    // IMPORTANTE: setear cookies ANTES del redirect
    const res = NextResponse.redirect(authUrl.toString());

    res.cookies.set("botz_google_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    res.cookies.set("botz_google_oauth_tenant", tenantId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    res.cookies.set("botz_google_oauth_user", userId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    return res;
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", details: String(e?.message || e) },
      { status: 500 }
    );
  }
}