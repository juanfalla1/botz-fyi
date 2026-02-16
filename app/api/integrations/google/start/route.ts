import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// Legacy redirect endpoint.
// Security: it only works if /api/integrations/google/init already set the cookies.

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();

    const state = cookieStore.get("botz_google_oauth_state")?.value || null;
    const tenantId = cookieStore.get("botz_google_oauth_tenant")?.value || null;
    const userId = cookieStore.get("botz_google_oauth_user")?.value || null;

    if (!state || !tenantId || !userId) {
      return NextResponse.json(
        { ok: false, error: "MISSING_OAUTH_CONTEXT", details: "Use /api/integrations/google/init first" },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = `${url.origin}/api/integrations/google/callback`;

    if (!clientId) {
      return NextResponse.json({ ok: false, error: "Missing GOOGLE_CLIENT_ID" }, { status: 500 });
    }

    const scope = [
      "openid",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://mail.google.com/",
      "https://www.googleapis.com/auth/drive.readonly",
    ].join(" ");

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", scope);
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("state", state);

    return NextResponse.redirect(authUrl.toString());
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "SERVER_ERROR", details: String(e?.message || e) }, { status: 500 });
  }
}
