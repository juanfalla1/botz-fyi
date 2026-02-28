import { SupabaseClient } from "@supabase/supabase-js";
import { getServiceSupabase } from "@/app/api/_utils/supabase";

export const AGENTS_PRODUCT_KEY = "agents";
export const ADMIN_OVERRIDE_USER_ID = "841263c6-196d-49cd-b5ba-aae0b097014f";
export const TRIAL_DAYS = 3;
export const TRIAL_CREDITS_LIMIT = 1000;

type UsageEventInput = {
  endpoint: string;
  action: string;
  metadata?: Record<string, any>;
};

const PLAN_CREDITS: Record<string, number> = {
  pro: 10000,
  scale: 100000,
  prime: 500000,
};

type PlanLimits = {
  credits_limit: number;
  max_agents: number;
  max_channels: number;
  allow_overage: boolean;
  grace_ratio: number;
};

const PLAN_LIMITS: Record<string, PlanLimits> = {
  pro: { credits_limit: 10000, max_agents: 1, max_channels: 1, allow_overage: false, grace_ratio: 0.1 },
  scale: { credits_limit: 100000, max_agents: 10, max_channels: 10, allow_overage: true, grace_ratio: 0 },
  prime: { credits_limit: 500000, max_agents: 50, max_channels: 50, allow_overage: true, grace_ratio: 0 },
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

export function getPlanLimits(planKey: string): PlanLimits {
  const key = String(planKey || "pro").toLowerCase();
  return PLAN_LIMITS[key] || PLAN_LIMITS.pro;
}

export function hasAdminEntitlementOverride(userId: string) {
  return String(userId || "") === ADMIN_OVERRIDE_USER_ID;
}

function getHardCreditsLimit(baseLimit: number, limits: PlanLimits): number {
  const limit = Math.max(0, Math.floor(Number(baseLimit || 0)));
  if (limits.allow_overage || limit <= 0) return Number.MAX_SAFE_INTEGER;
  const graceRatio = Math.max(0, Number(limits.grace_ratio || 0));
  return Math.floor(limit * (1 + graceRatio));
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
    credits_limit: TRIAL_CREDITS_LIMIT,
    credits_used: 0,
    trial_start: nowIso(),
    trial_end: addDaysIso(TRIAL_DAYS),
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

  if (hasAdminEntitlementOverride(userId)) {
    console.log("[entitlement] ADMIN OVERRIDE: Unlimited credits for user", userId);
    return { ok: true, statusCode: 200, code: "ok", error: null as string | null, entitlement: { ...ent, credits_limit: 999999999 } };
  }

  console.log("[entitlement] debug", { userId, used, limit, credits_limit: ent?.credits_limit, plan_key: ent?.plan_key });
  const limits = getPlanLimits(String(ent?.plan_key || "pro"));
  const hardLimit = getHardCreditsLimit(limit, limits);
  if (used >= hardLimit) {
    if (limits.allow_overage) {
      return { ok: true, statusCode: 200, code: "overage", error: null as string | null, entitlement: ent };
    }
    return { ok: false, statusCode: 402, code: "credits_exhausted", error: "Creditos agotados", entitlement: ent };
  }

  if (!limits.allow_overage && limit > 0 && used >= limit) {
    return { ok: true, statusCode: 200, code: "grace", error: null as string | null, entitlement: ent };
  }

  return { ok: true, statusCode: 200, code: "ok", error: null as string | null, entitlement: ent };
}

export async function consumeEntitlementCredits(supabase: SupabaseClient, userId: string, delta: number) {
  const creditDelta = Math.max(0, Math.floor(Number(delta || 0)));
  if (creditDelta <= 0) return { ok: true };

  if (hasAdminEntitlementOverride(userId)) {
    console.log("[entitlement] ADMIN OVERRIDE: Bypassing credit consumption for user", userId);
    return { ok: true, statusCode: 200, code: "ok", error: null as string | null };
  }

  const access = await checkEntitlementAccess(supabase, userId);
  if (!access.ok) return access;

  const ent = access.entitlement as any;
  const used = Number(ent?.credits_used || 0) || 0;
  const limit = Number(ent?.credits_limit || 0) || planToCredits(String(ent?.plan_key || "pro"));
  const planLimits = getPlanLimits(String(ent?.plan_key || "pro"));
  const hardLimit = getHardCreditsLimit(limit, planLimits);

  if (used + creditDelta > hardLimit) {
    if (!planLimits.allow_overage) {
      return { ok: false, statusCode: 402, code: "credits_exhausted", error: "Creditos agotados" };
    }
  }

  const { error } = await supabase
    .from("agent_entitlements")
    .update({ credits_used: used + creditDelta })
    .eq("user_id", userId)
    .eq("product_key", AGENTS_PRODUCT_KEY);

  if (error) {
    return { ok: false, statusCode: 500, code: "credits_update_failed", error: error.message };
  }

  const overage = planLimits.allow_overage && limit > 0 && used + creditDelta > limit;
  const grace = !planLimits.allow_overage && limit > 0 && used + creditDelta > limit;
  return { ok: true, statusCode: 200, code: overage ? "overage" : grace ? "grace" : "ok", error: null as string | null };
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
