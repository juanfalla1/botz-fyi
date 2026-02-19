import { NextResponse } from "next/server";
import { getAnonSupabaseWithToken } from "@/app/api/_utils/supabase";
import { getRequestUser } from "@/app/api/_utils/auth";
import { SYSTEM_TENANT_ID } from "@/app/api/_utils/system";

const TRIAL_DAYS = 3;

function planToCredits(planKey: string) {
  if (planKey === "prime") return 1500000;
  if (planKey === "scale") return 500000;
  return 100000;
}

export async function GET(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });
  }

  const supabase = getAnonSupabaseWithToken(guard.token);
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Missing SUPABASE env (URL or ANON)" }, { status: 500 });
  }

  try {
    const { data: existing, error: selErr } = await supabase
      .from("agent_entitlements")
      .select("*")
      .eq("user_id", guard.user.id)
      .maybeSingle();

    if (selErr) {
      return NextResponse.json({ ok: false, error: selErr.message }, { status: 400 });
    }

    // Compute current credits used from existing agents/flows as a source of truth.
    const { data: agents, error: agentsErr } = await supabase
      .from("ai_agents")
      .select("credits_used")
      .eq("tenant_id", SYSTEM_TENANT_ID)
      .eq("created_by", guard.user.id);

    if (agentsErr) {
      return NextResponse.json({ ok: false, error: agentsErr.message }, { status: 400 });
    }

    const creditsUsedTotal = (agents || []).reduce((sum: number, a: any) => sum + (Number(a?.credits_used || 0) || 0), 0);

    if (!existing) {
      const trialStart = new Date();
      const trialEnd = new Date(trialStart.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
      const plan_key = "pro";
      const payload = {
        user_id: guard.user.id,
        plan_key,
        status: "trial",
        credits_limit: planToCredits(plan_key),
        credits_used: creditsUsedTotal,
        trial_start: trialStart.toISOString(),
        trial_end: trialEnd.toISOString(),
      };

      const { data: inserted, error: insErr } = await supabase
        .from("agent_entitlements")
        .insert(payload)
        .select("*")
        .single();

      if (insErr) {
        return NextResponse.json({ ok: false, error: insErr.message }, { status: 400 });
      }

      return NextResponse.json({ ok: true, data: inserted, credits_used_total: creditsUsedTotal });
    }

    // Keep credits_used in sync if legacy data exists.
    let next = existing as any;
    if ((Number(next.credits_used || 0) || 0) !== creditsUsedTotal) {
      const { data: updated, error: updErr } = await supabase
        .from("agent_entitlements")
        .update({ credits_used: creditsUsedTotal })
        .eq("user_id", guard.user.id)
        .select("*")
        .single();
      if (!updErr && updated) next = updated;
    }

    // Ensure trial window exists for trial users
    if (String(next.status) === "trial" && (!next.trial_start || !next.trial_end)) {
      const trialStart = next.trial_start ? new Date(next.trial_start) : new Date();
      const trialEnd = next.trial_end ? new Date(next.trial_end) : new Date(trialStart.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
      const { data: updated, error: updErr } = await supabase
        .from("agent_entitlements")
        .update({ trial_start: trialStart.toISOString(), trial_end: trialEnd.toISOString() })
        .eq("user_id", guard.user.id)
        .select("*")
        .single();
      if (!updErr && updated) next = updated;
    }

    return NextResponse.json({ ok: true, data: next, credits_used_total: creditsUsedTotal });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
