import { NextResponse } from "next/server";
import { getAnonSupabaseWithToken, getServiceSupabase } from "@/app/api/_utils/supabase";
import { getRequestUser } from "@/app/api/_utils/auth";
import { SYSTEM_TENANT_ID } from "@/app/api/_utils/system";
import { executeFlow } from "@/app/api/flows/_utils/executor";
import { AGENTS_PRODUCT_KEY, logUsageEvent } from "@/app/api/_utils/entitlement";

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

export async function POST(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });
  }

  const anonSupa = getAnonSupabaseWithToken(guard.token);
  const serviceSupa = getServiceSupabase();
  if (!anonSupa || !serviceSupa) {
    return NextResponse.json({ ok: false, error: "Missing SUPABASE env" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const id = String(body?.id || "");
    const mode = (String(body?.mode || "test") === "run" ? "run" : "test") as "test" | "run";
    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    }

    const { data: agent, error } = await anonSupa
      .from("ai_agents")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", SYSTEM_TENANT_ID)
      .eq("created_by", guard.user.id)
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    const flow = agent?.configuration?.flow || {};
    const nodes = Array.isArray(flow.nodes) ? flow.nodes : [];
    const edges = Array.isArray(flow.edges) ? flow.edges : [];
    const nodeConfigs = flow.node_configs && typeof flow.node_configs === "object" ? flow.node_configs : {};
    const templateConfig = flow.template_config && typeof flow.template_config === "object" ? flow.template_config : {};

    // ── entitlement gate (trial + credits) ──
    const { data: ent, error: entErr } = await serviceSupa
      .from("agent_entitlements")
      .select("*")
      .eq("user_id", guard.user.id)
      .eq("product_key", AGENTS_PRODUCT_KEY)
      .maybeSingle();

    if (entErr) {
      return NextResponse.json({ ok: false, error: entErr.message }, { status: 400 });
    }

    let entitlement: any = ent;
    if (!entitlement) {
      const payload = {
        user_id: guard.user.id,
        product_key: AGENTS_PRODUCT_KEY,
        plan_key: "pro",
        status: "trial",
        credits_limit: PLAN_CREDITS.pro,
        credits_used: 0,
        trial_start: nowIso(),
        trial_end: addDaysIso(3),
      };
      const { data: inserted, error: insErr } = await serviceSupa
        .from("agent_entitlements")
        .insert(payload)
        .select("*")
        .single();
      if (insErr) {
        return NextResponse.json({ ok: false, error: insErr.message }, { status: 400 });
      }
      entitlement = inserted;
    }

    const status = String(entitlement.status || "trial");
    if (status === "blocked") {
      return NextResponse.json({ ok: false, code: "blocked", error: "Cuenta bloqueada" }, { status: 403 });
    }

    const trialEnd = entitlement.trial_end ? new Date(entitlement.trial_end) : null;
    if ((status === "trial" || status === "trialing") && trialEnd && Date.now() > trialEnd.getTime()) {
      return NextResponse.json({ ok: false, code: "trial_expired", error: "Trial terminado" }, { status: 403 });
    }

    // Execute flow
    const execution = executeFlow({ nodes, edges, nodeConfigs, templateConfig, mode });

    // MVP credit burn: "lo mas barato" (tokens equivalentes)
    const stepCount = Array.isArray((execution as any)?.steps) ? (execution as any).steps.length : 0;
    const creditDelta = Math.max(1, stepCount) * (mode === "run" ? 2 : 1);

    const prevEntUsed = Number(entitlement.credits_used || 0) || 0;
    const entLimit = Number(entitlement.credits_limit || 0) || 0;
    if (entLimit > 0 && prevEntUsed + creditDelta > entLimit) {
      return NextResponse.json({ ok: false, code: "credits_exhausted", error: "Creditos agotados" }, { status: 402 });
    }

    const prevCredits = Number(agent?.credits_used || 0) || 0;
    const nextCredits = prevCredits + creditDelta;

    const prevExecs = Array.isArray(flow.executions) ? flow.executions : [];
    const nextExecs = [execution, ...prevExecs].slice(0, 50);
    const nextCfg = { ...(agent.configuration || {}) };
    nextCfg.flow = { ...flow, executions: nextExecs };

    const { data: updated, error: updateErr } = await anonSupa
      .from("ai_agents")
      .update({ configuration: nextCfg, credits_used: nextCredits })
      .eq("id", id)
      .eq("tenant_id", SYSTEM_TENANT_ID)
      .eq("created_by", guard.user.id)
      .select("*")
      .single();

    if (updateErr) {
      return NextResponse.json({ ok: false, error: updateErr.message }, { status: 400 });
    }

    // Update entitlement usage (service role).
    const { error: entUpdErr } = await serviceSupa
      .from("agent_entitlements")
      .update({ credits_used: prevEntUsed + creditDelta })
      .eq("user_id", guard.user.id)
      .eq("product_key", AGENTS_PRODUCT_KEY);
    if (entUpdErr) {
      console.warn("agent_entitlements update failed:", entUpdErr.message);
    }

    await logUsageEvent(serviceSupa as any, guard.user.id, creditDelta, {
      endpoint: "/start/api/flows/run",
      action: "flow_execute",
      metadata: { mode, steps: stepCount, flow_id: id },
    });

    return NextResponse.json({ ok: true, execution, data: updated });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
