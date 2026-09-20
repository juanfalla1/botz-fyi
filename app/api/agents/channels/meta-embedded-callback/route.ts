import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/api/_utils/auth";
import { getServiceSupabase } from "@/app/api/_utils/supabase";
import { SYSTEM_TENANT_ID } from "@/app/api/_utils/system";
import { protectConfig } from "@/app/api/_utils/secret-config";
import { checkEntitlementAccess, getPlanLimits, hasAdminEntitlementOverride } from "@/app/api/_utils/entitlement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const META_CALLBACK_URL = "https://www.botz.fyi/api/agents/channels/meta-embedded-callback";

function appUrl() {
  return String(process.env.NEXT_PUBLIC_APP_URL || "https://www.botz.fyi").replace(/\/$/, "");
}

function errorRedirect(code: string) {
  return NextResponse.redirect(`${appUrl()}/start/agents/channels?meta_error=${encodeURIComponent(code)}`);
}

function signState(userId: string, secret: string) {
  const payload = Buffer.from(JSON.stringify({ userId, issuedAt: Date.now() })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function verifyState(state: string, secret: string) {
  const [payload, signature] = state.split(".");
  if (!payload || !signature) return "";
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return "";
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!parsed?.userId || Date.now() - Number(parsed.issuedAt || 0) > 10 * 60 * 1000) return "";
    return String(parsed.userId);
  } catch {
    return "";
  }
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
    const state = signState(guard.user.id, appSecret);
    const authorize = new URL("https://www.facebook.com/v21.0/dialog/oauth");
    authorize.searchParams.set("client_id", appId);
    authorize.searchParams.set("redirect_uri", META_CALLBACK_URL);
    authorize.searchParams.set("scope", "business_management,whatsapp_business_management,whatsapp_business_messaging");
    authorize.searchParams.set("response_type", "code");
    authorize.searchParams.set("state", state);
    return NextResponse.json({ ok: true, url: authorize.toString() });
  }

  if (!appId || !appSecret || !configSecret) return errorRedirect("meta_not_configured");

  const code = String(url.searchParams.get("code") || "").trim();
  const state = String(url.searchParams.get("state") || "").trim();
  const userId = verifyState(state, appSecret);
  if (!code || !userId) return errorRedirect("invalid_state");

  const tokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
  tokenUrl.searchParams.set("client_id", appId);
  tokenUrl.searchParams.set("client_secret", appSecret);
  tokenUrl.searchParams.set("redirect_uri", META_CALLBACK_URL);
  tokenUrl.searchParams.set("code", code);
  const tokenRes = await fetch(tokenUrl, { headers: { accept: "application/json" }, cache: "no-store" });
  const tokenJson = await tokenRes.json().catch(() => ({}));
  const accessToken = String(tokenJson?.access_token || "").trim();
  if (!tokenRes.ok || !accessToken) return errorRedirect("token_exchange_failed");

  const businessUrl = new URL("https://graph.facebook.com/v21.0/me/businesses");
  businessUrl.searchParams.set("fields", "id,name,owned_whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number}}" );
  businessUrl.searchParams.set("access_token", accessToken);
  const businessRes = await fetch(businessUrl, { headers: { accept: "application/json" }, cache: "no-store" });
  const businessJson = await businessRes.json().catch(() => ({}));
  const businesses = Array.isArray(businessJson?.data) ? businessJson.data : [];
  const business = businesses.find((item: any) => item?.owned_whatsapp_business_accounts?.data?.[0]?.phone_numbers?.data?.[0]) || businesses[0];
  const waba = business?.owned_whatsapp_business_accounts?.data?.[0];
  const phone = waba?.phone_numbers?.data?.[0];
  if (!businessRes.ok || !waba?.id || !phone?.id) return errorRedirect("whatsapp_business_not_found");

  const subscribeRes = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(String(waba.id))}/subscribed_apps`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!subscribeRes.ok) return errorRedirect("webhook_subscription_failed");

  const supabase = getServiceSupabase();
  if (!supabase) return errorRedirect("storage_unavailable");
  const entitlement = await checkEntitlementAccess(supabase as any, userId);
  if (!entitlement.ok) return errorRedirect("entitlement_blocked");
  const config = protectConfig({
    waba_id: String(waba.id),
    phone_number_id: String(phone.id),
    permanent_token: accessToken,
    business_name: String(business?.name || waba?.name || "WhatsApp Business"),
    display_phone_number: String(phone?.display_phone_number || ""),
    _schema: "whatsapp:meta",
    _schema_title: "WhatsApp Cloud API (Meta)",
  });
  const { data: existing } = await supabase
    .from("agent_channel_connections")
    .select("id")
    .eq("created_by", userId)
    .eq("channel_type", "whatsapp")
    .eq("provider", "meta")
    .limit(1)
    .maybeSingle();

  let connectionId = String(existing?.id || "");
  if (connectionId) {
    const { error } = await supabase.from("agent_channel_connections").update({ display_name: String(business?.name || "WhatsApp Business"), status: "pending", config, updated_at: new Date().toISOString() }).eq("id", connectionId).eq("created_by", userId);
    if (error) return errorRedirect("connection_save_failed");
  } else {
    if (!hasAdminEntitlementOverride(userId)) {
      const limits = getPlanLimits(String((entitlement as any)?.entitlement?.plan_key || "pro"));
      const { count, error: countError } = await supabase
        .from("agent_channel_connections")
        .select("id", { count: "exact", head: true })
        .eq("created_by", userId);
      if (countError) return errorRedirect("channel_limit_check_failed");
      if (limits.max_channels > 0 && Number(count || 0) >= limits.max_channels) return errorRedirect("channels_limit_reached");
    }
    const { data, error } = await supabase.from("agent_channel_connections").insert({ tenant_id: SYSTEM_TENANT_ID, created_by: userId, channel_type: "whatsapp", provider: "meta", display_name: String(business?.name || "WhatsApp Business"), status: "pending", config }).select("id").single();
    if (error || !data?.id) return errorRedirect("connection_save_failed");
    connectionId = String(data.id);
  }

  return NextResponse.redirect(`${appUrl()}/start/agents/channels?meta_connection_id=${encodeURIComponent(connectionId)}`);
}
