import { SupabaseClient } from "@supabase/supabase-js";
import { getServiceSupabase } from "@/app/api/_utils/supabase";

export const AGENTS_PRODUCT_KEY = "agents";

type UsageEventInput = {
  endpoint: string;
  action: string;
  metadata?: Record<string, any>;
};

const PLAN_CREDITS: Record<string, number> = {
  pro: 2000,
  scale: 500000,
  prime: 1500000,
};

function nowIso() {
  return new Date().toISOString();
}

function addDaysIso(days: number) {
  const ms = Math.max(0, days) * 24 * 60 * 60 * 1000;
  return new Date(Date.now() + ms).toISOString();
}

function planToCredits(planKey: string) {
  return PLAN_CREDITS[String(planKey || "pro").toLowerCase()] || PLAN_CREDITS.pro;
}

async function getOrCreateEntitlement(supabase: SupabaseClient, userId: string) {
  const { data: existing, error: selErr } = await supabase
    .from("agent_entitlements")
    .select("*")
    .eq("user_id", userId)
    .eq("product_key", AGENTS_PRODUCT_KEY)
    .maybeSingle();

  console.log("[entitlement] getOrCreateEntitlement", { userId, found: !!existing, error: selErr?.message });

  if (selErr) throw new Error(selErr.message || "No se pudo leer entitlements");
  if (existing) return existing as any;

  const payload = {
    user_id: userId,
    product_key: AGENTS_PRODUCT_KEY,
    plan_key: "pro",
    status: "trial",
    credits_limit: planToCredits("pro"),
    credits_used: 0,
    trial_start: nowIso(),
    trial_end: addDaysIso(3),
  };

  const { data: inserted, error: insErr } = await supabase
    .from("agent_entitlements")
    .insert(payload)
    .select("*")
    .single();

  if (insErr) throw new Error(insErr.message || "No se pudo crear entitlement");
  return inserted as any;
}

export async function checkEntitlementAccess(supabase: SupabaseClient, userId: string) {
  console.log("[entitlement] checkEntitlementAccess called", { userId });
  const ent = await getOrCreateEntitlement(supabase, userId);
  console.log("[entitlement] got entitlement", { userId, ent });
  const status = String(ent?.status || "trial").toLowerCase();

  if (status === "blocked") {
    return { ok: false, statusCode: 403, code: "blocked", error: "Cuenta bloqueada", entitlement: ent };
  }

  const trialEnd = ent?.trial_end ? new Date(ent.trial_end) : null;
  const isTrialStatus = status === "trial" || status === "trialing";
  if (isTrialStatus && trialEnd && Date.now() > trialEnd.getTime()) {
    return { ok: false, statusCode: 403, code: "trial_expired", error: "Trial terminado", entitlement: ent };
  }

  const used = Number(ent?.credits_used || 0) || 0;
  const limit = Number(ent?.credits_limit || 0) || planToCredits(String(ent?.plan_key || "pro"));

  const adminOverrideId = "841263c6-196d-49cd-b5ba-aae0b097014f";
  if (userId === adminOverrideId) {
    console.log("[entitlement] ADMIN OVERRIDE: Unlimited credits for user", userId);
    return { ok: true, statusCode: 200, code: "ok", error: null as string | null, entitlement: { ...ent, credits_limit: 999999999 } };
  }

  console.log("[entitlement] debug", { userId, used, limit, credits_limit: ent?.credits_limit, plan_key: ent?.plan_key });
  if (limit > 0 && used >= limit) {
    return { ok: false, statusCode: 402, code: "credits_exhausted", error: "Creditos agotados", entitlement: ent };
  }

  return { ok: true, statusCode: 200, code: "ok", error: null as string | null, entitlement: ent };
}

export async function consumeEntitlementCredits(supabase: SupabaseClient, userId: string, delta: number) {
  const creditDelta = Math.max(0, Math.floor(Number(delta || 0)));
  if (creditDelta <= 0) return { ok: true };

  const adminOverrideId = "841263c6-196d-49cd-b5ba-aae0b097014f";
  if (userId === adminOverrideId) {
    console.log("[entitlement] ADMIN OVERRIDE: Bypassing credit consumption for user", userId);
    return { ok: true, statusCode: 200, code: "ok", error: null as string | null };
  }

  const access = await checkEntitlementAccess(supabase, userId);
  if (!access.ok) return access;

  const ent = access.entitlement as any;
  const used = Number(ent?.credits_used || 0) || 0;
  const limit = Number(ent?.credits_limit || 0) || planToCredits(String(ent?.plan_key || "pro"));

  if (limit > 0 && used + creditDelta > limit) {
    return { ok: false, statusCode: 402, code: "credits_exhausted", error: "Creditos agotados" };
  }

  const { error } = await supabase
    .from("agent_entitlements")
    .update({ credits_used: used + creditDelta })
    .eq("user_id", userId)
    .eq("product_key", AGENTS_PRODUCT_KEY);

  if (error) {
    return { ok: false, statusCode: 500, code: "credits_update_failed", error: error.message };
  }

  return { ok: true, statusCode: 200, code: "ok", error: null as string | null };
}

export async function logUsageEvent(
  supabase: SupabaseClient,
  userId: string,
  creditsDelta: number,
  input: UsageEventInput
) {
  const payload = {
    user_id: userId,
    product_key: AGENTS_PRODUCT_KEY,
    endpoint: String(input.endpoint || "unknown"),
    action: String(input.action || "usage"),
    credits_delta: Math.max(0, Math.floor(Number(creditsDelta || 0))),
    metadata: input.metadata || {},
  };

  const { error } = await supabase.from("agent_usage_events").insert(payload);
  if (error) {
    // Fallback a service role para no perder trazabilidad.
    const svc = getServiceSupabase();
    if (svc) {
      const { error: svcErr } = await svc.from("agent_usage_events").insert(payload);
      if (!svcErr) return { ok: true, error: null as string | null };
      return { ok: false, error: svcErr.message };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null as string | null };
}
