import { NextResponse } from "next/server";
import { getRequestUser } from "../../../_utils/guards";
import { getServiceSupabase } from "@/app/api/_utils/supabase";
import { SYSTEM_TENANT_ID } from "@/app/api/_utils/system";

function makeState() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function resolveTenantIdForOAuth(userId: string): Promise<string> {
  const svc = getServiceSupabase();
  if (!svc) return SYSTEM_TENANT_ID;

  const byAuth = await svc
    .from("team_members")
    .select("tenant_id")
    .eq("auth_user_id", userId)
    .eq("activo", true)
    .maybeSingle();
  if (byAuth?.data?.tenant_id) return String(byAuth.data.tenant_id);

  const byUser = await svc
    .from("team_members")
    .select("tenant_id")
    .eq("user_id", userId)
    .eq("activo", true)
    .maybeSingle();
  if (byUser?.data?.tenant_id) return String(byUser.data.tenant_id);

  const bySub = await svc
    .from("subscriptions")
    .select("tenant_id")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .maybeSingle();
  if (bySub?.data?.tenant_id) return String(bySub.data.tenant_id);

  return SYSTEM_TENANT_ID;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const requestedTenantId = String(body?.tenant_id || body?.tenantId || "").trim() || null;

    const { user, error: userErr } = await getRequestUser(req);
    if (!user) return NextResponse.json({ ok: false, error: userErr || "Unauthorized" }, { status: 401 });

    const resolvedTenantId = await resolveTenantIdForOAuth(user.id);
    if (requestedTenantId && requestedTenantId !== resolvedTenantId) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

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
    res.cookies.set("botz_google_oauth_tenant", resolvedTenantId, {
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
