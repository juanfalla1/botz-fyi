import { NextResponse } from "next/server";
import { assertTenantAccess, getRequestUser } from "../../../_utils/guards";

function makeState() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const requestedTenantId = String(body?.tenant_id || body?.tenantId || "").trim() || null;

    const { user, error: userErr } = await getRequestUser(req);
    if (!user) return NextResponse.json({ ok: false, error: userErr || "Unauthorized" }, { status: 401 });

    const guard = await assertTenantAccess({ req, requestedTenantId });
    if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json({ ok: false, error: "Missing GOOGLE_CLIENT_ID" }, { status: 500 });
    }

    const url = new URL(req.url);
    const redirectUri = `${url.origin}/api/integrations/google/callback`;

    const state = makeState();

    const scope = [
      "openid",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/calendar.readonly",
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

    const res = NextResponse.json({ ok: true, auth_url: authUrl.toString() });

    res.cookies.set("botz_google_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    res.cookies.set("botz_google_oauth_tenant", guard.tenantId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    res.cookies.set("botz_google_oauth_user", user.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "SERVER_ERROR", details: String(e?.message || e) }, { status: 500 });
  }
}
