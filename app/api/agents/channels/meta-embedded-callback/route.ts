import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/api/_utils/auth";
import { getServiceSupabase } from "@/app/api/_utils/supabase";
import { SYSTEM_TENANT_ID } from "@/app/api/_utils/system";
import { protectConfig, revealConfig } from "@/app/api/_utils/secret-config";
import { checkEntitlementAccess, getPlanLimits, hasAdminEntitlementOverride } from "@/app/api/_utils/entitlement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const META_CALLBACK_URL = "https://www.botz.fyi/api/agents/channels/meta-embedded-callback";
const META_EMBEDDED_SIGNUP_CONFIG_ID = "901068936216673";
type MetaOnboardingMode = "signup" | "existing";

function appUrl() {
  return String(process.env.NEXT_PUBLIC_APP_URL || "https://www.botz.fyi").replace(/\/$/, "");
}

function errorRedirect(code: string) {
  return NextResponse.redirect(`${appUrl()}/start/agents/channels?meta_error=${encodeURIComponent(code)}`);
}

function signState(userId: string, agentId: string, mode: MetaOnboardingMode, secret: string) {
  const payload = Buffer.from(JSON.stringify({ userId, agentId, mode, issuedAt: Date.now() })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function verifyState(state: string, secret: string) {
  const [payload, signature] = state.split(".");
  if (!payload || !signature) return null;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!parsed?.userId || !parsed?.agentId || Date.now() - Number(parsed.issuedAt || 0) > 30 * 60 * 1000) return null;
    const mode = parsed.mode === "existing" ? "existing" : "signup";
    return { userId: String(parsed.userId), agentId: String(parsed.agentId), mode } as {
      userId: string;
      agentId: string;
      mode: MetaOnboardingMode;
    };
  } catch {
    return null;
  }
}

type MetaCompletionResult = { ok: true; connectionId: string } | { ok: false; error: string };

async function completeMetaAuthorization(input: {
  appId: string;
  appSecret: string;
  code: string;
  includeRedirectUri: boolean;
  signup: NonNullable<ReturnType<typeof verifyState>>;
}): Promise<MetaCompletionResult> {
  const { appId, appSecret, code, includeRedirectUri, signup } = input;
  const { userId, agentId, mode } = signup;
  const fail = (error: string): MetaCompletionResult => ({ ok: false, error });
  const tokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
  tokenUrl.searchParams.set("client_id", appId);
  tokenUrl.searchParams.set("client_secret", appSecret);
  if (includeRedirectUri) tokenUrl.searchParams.set("redirect_uri", META_CALLBACK_URL);
  tokenUrl.searchParams.set("code", code);
  const tokenRes = await fetch(tokenUrl, { headers: { accept: "application/json" }, cache: "no-store" });
  const tokenJson = await tokenRes.json().catch(() => ({}));
  const accessToken = String(tokenJson?.access_token || "").trim();
  if (!tokenRes.ok || !accessToken) return fail("token_exchange_failed");

  const identityUrl = new URL("https://graph.facebook.com/v21.0/me");
  identityUrl.searchParams.set("fields", "id,client_business_id");
  identityUrl.searchParams.set("access_token", accessToken);
  const identityRes = await fetch(identityUrl, { headers: { accept: "application/json" }, cache: "no-store" });
  const identityJson = await identityRes.json().catch(() => ({}));

  let businesses: any[] = [];
  const clientBusinessId = String(identityJson?.client_business_id || "").trim();
  if (identityRes.ok && clientBusinessId) {
    const businessUrl = new URL(`https://graph.facebook.com/v21.0/${encodeURIComponent(clientBusinessId)}`);
    businessUrl.searchParams.set("fields", "id,name,owned_whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number}}" );
    businessUrl.searchParams.set("access_token", accessToken);
    const businessRes = await fetch(businessUrl, { headers: { accept: "application/json" }, cache: "no-store" });
    const businessJson = await businessRes.json().catch(() => ({}));
    if (businessRes.ok && businessJson?.id) businesses = [businessJson];
  }
  if (!businesses.length) {
    const businessUrl = new URL("https://graph.facebook.com/v21.0/me/businesses");
    businessUrl.searchParams.set("fields", "id,name,owned_whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number}}" );
    businessUrl.searchParams.set("access_token", accessToken);
    const businessRes = await fetch(businessUrl, { headers: { accept: "application/json" }, cache: "no-store" });
    const businessJson = await businessRes.json().catch(() => ({}));
    businesses = businessRes.ok && Array.isArray(businessJson?.data) ? businessJson.data : [];
  }
  const business = businesses.find((item: any) => item?.owned_whatsapp_business_accounts?.data?.[0]?.phone_numbers?.data?.[0]) || businesses[0];
  const waba = business?.owned_whatsapp_business_accounts?.data?.[0];
  const phone = waba?.phone_numbers?.data?.[0];
  if (!waba?.id || !phone?.id) return fail("whatsapp_business_not_found");

  const subscribeRes = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(String(waba.id))}/subscribed_apps`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!subscribeRes.ok) return fail("webhook_subscription_failed");

  const supabase = getServiceSupabase();
  if (!supabase) return fail("storage_unavailable");
  const { data: assignedAgent } = await supabase
    .from("ai_agents")
    .select("id,status")
    .eq("id", agentId)
    .eq("tenant_id", SYSTEM_TENANT_ID)
    .eq("created_by", userId)
    .maybeSingle();
  if (!assignedAgent || String(assignedAgent.status || "").toLowerCase() === "archived") return fail("assigned_agent_not_found");
  const entitlement = await checkEntitlementAccess(supabase as any, userId);
  if (!entitlement.ok) return fail("entitlement_blocked");
  const { data: existingRows, error: existingError } = await supabase
    .from("agent_channel_connections")
    .select("id,config")
    .eq("created_by", userId)
    .eq("channel_type", "whatsapp")
    .eq("provider", "meta");
  if (existingError) return fail("connection_lookup_failed");
  const existing = (existingRows || []).find((row: any) => {
    const current = revealConfig(row?.config || {});
    return String(current?.phone_number_id || "") === String(phone.id);
  });
  const currentConfig = existing ? revealConfig((existing as any).config || {}) : {};
  const verifyToken = String(currentConfig?.verify_token || "").trim() || crypto.randomBytes(32).toString("base64url");
  const config = protectConfig({
    ...currentConfig,
    waba_id: String(waba.id),
    phone_number_id: String(phone.id),
    permanent_token: accessToken,
    verify_token: verifyToken,
    business_name: String(business?.name || waba?.name || "WhatsApp Business"),
    display_phone_number: String(phone?.display_phone_number || ""),
    onboarding_mode: mode,
    _schema: "whatsapp:meta",
    _schema_title: "WhatsApp Cloud API (Meta)",
  });
  let connectionId = String(existing?.id || "");
  if (connectionId) {
    const { error } = await supabase.from("agent_channel_connections").update({ display_name: String(business?.name || "WhatsApp Business"), assigned_agent_id: agentId, status: "pending", config, updated_at: new Date().toISOString() }).eq("id", connectionId).eq("created_by", userId);
    if (error) return fail("connection_save_failed");
  } else {
    if (!hasAdminEntitlementOverride(userId)) {
      const limits = getPlanLimits(String((entitlement as any)?.entitlement?.plan_key || "pro"));
      const { count, error: countError } = await supabase
        .from("agent_channel_connections")
        .select("id", { count: "exact", head: true })
        .eq("created_by", userId);
      if (countError) return fail("channel_limit_check_failed");
      if (limits.max_channels > 0 && Number(count || 0) >= limits.max_channels) return fail("channels_limit_reached");
    }
    const { data, error } = await supabase.from("agent_channel_connections").insert({ tenant_id: SYSTEM_TENANT_ID, created_by: userId, assigned_agent_id: agentId, channel_type: "whatsapp", provider: "meta", display_name: String(business?.name || "WhatsApp Business"), status: "pending", config }).select("id").single();
    if (error || !data?.id) return fail("connection_save_failed");
    connectionId = String(data.id);
  }

  return { ok: true, connectionId };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const appId = String(process.env.META_APP_ID || process.env.NEXT_PUBLIC_META_APP_ID || "").trim();
  const appSecret = String(process.env.META_APP_SECRET || "").trim();
  const configSecret = String(process.env.AGENTS_CONFIG_SECRET || "").trim();

  if (url.searchParams.get("start") === "1") {
    const guard = await getRequestUser(req);
    if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });
    if (!appId || !appSecret || !configSecret) {
      return NextResponse.json({ ok: false, error: "Meta no está configurado en este entorno" }, { status: 503 });
    }
    const assignedAgentId = String(url.searchParams.get("assigned_agent_id") || "").trim();
    const supabase = getServiceSupabase();
    if (!assignedAgentId || !supabase) return NextResponse.json({ ok: false, error: "Selecciona un agente BOTZ" }, { status: 400 });
    const { data: agent } = await supabase
      .from("ai_agents")
      .select("id,status")
      .eq("id", assignedAgentId)
      .eq("tenant_id", SYSTEM_TENANT_ID)
      .eq("created_by", guard.user.id)
      .maybeSingle();
    if (!agent || String(agent.status || "").toLowerCase() === "archived") {
      return NextResponse.json({ ok: false, error: "Agente BOTZ inválido" }, { status: 400 });
    }
    const mode: MetaOnboardingMode = url.searchParams.get("mode") === "existing" ? "existing" : "signup";
    const state = signState(guard.user.id, assignedAgentId, mode, appSecret);
    if (mode === "existing") {
      return NextResponse.json({
        ok: true,
        sdk: { app_id: appId, config_id: META_EMBEDDED_SIGNUP_CONFIG_ID, state },
      });
    }

    const authorize = new URL("https://www.facebook.com/v21.0/dialog/oauth");
    authorize.searchParams.set("client_id", appId);
    authorize.searchParams.set("redirect_uri", META_CALLBACK_URL);
    authorize.searchParams.set("config_id", META_EMBEDDED_SIGNUP_CONFIG_ID);
    authorize.searchParams.set("response_type", "code");
    authorize.searchParams.set("override_default_response_type", "true");
    authorize.searchParams.set("state", state);
    return NextResponse.json({ ok: true, url: authorize.toString() });
  }

  if (!appId || !appSecret || !configSecret) return errorRedirect("meta_not_configured");

  const code = String(url.searchParams.get("code") || "").trim();
  const state = String(url.searchParams.get("state") || "").trim();
  const signup = verifyState(state, appSecret);
  if (!code || !signup || signup.mode !== "signup") return errorRedirect("invalid_state");

  const result = await completeMetaAuthorization({ appId, appSecret, code, includeRedirectUri: true, signup });
  if (!result.ok) return errorRedirect(result.error);
  return NextResponse.redirect(`${appUrl()}/start/agents/channels?meta_connection_id=${encodeURIComponent(result.connectionId)}`);
}

export async function POST(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });

  const appId = String(process.env.META_APP_ID || process.env.NEXT_PUBLIC_META_APP_ID || "").trim();
  const appSecret = String(process.env.META_APP_SECRET || "").trim();
  const configSecret = String(process.env.AGENTS_CONFIG_SECRET || "").trim();
  if (!appId || !appSecret || !configSecret) {
    return NextResponse.json({ ok: false, error: "Meta no está configurado en este entorno" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const code = String(body?.code || "").trim();
  const state = String(body?.state || "").trim();
  const sessionEvent = String(body?.session_event || "").trim();
  const signup = verifyState(state, appSecret);
  if (!code || !signup || signup.mode !== "existing" || signup.userId !== guard.user.id) {
    return NextResponse.json({ ok: false, error: "Autorización Meta inválida" }, { status: 400 });
  }
  if (sessionEvent !== "FINISH_GRANT_ONLY_API_ACCESS") {
    return NextResponse.json({ ok: false, error: "Meta no completó App-Only Install" }, { status: 400 });
  }

  const result = await completeMetaAuthorization({ appId, appSecret, code, includeRedirectUri: false, signup });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  return NextResponse.json({
    ok: true,
    connection_id: result.connectionId,
    redirect_url: `/start/agents/channels?meta_connection_id=${encodeURIComponent(result.connectionId)}`,
  });
}
