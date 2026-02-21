import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/app/api/_utils/supabase";
import { getRequestUser } from "@/app/api/_utils/auth";
import { AGENTS_PRODUCT_KEY } from "@/app/api/_utils/entitlement";

const TRIAL_DAYS = 3;

function planToCredits(planKey: string) {
  if (planKey === "prime") return 1500000;
  if (planKey === "scale") return 500000;
  return 2000;
}

function nowIso() {
  return new Date().toISOString();
}

export async function GET(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Missing SUPABASE env (SERVICE_ROLE)" }, { status: 500 });
  }

  try {
    const { data: existing, error: selErr } = await supabase
      .from("agent_entitlements")
      .select("*")
      .eq("user_id", guard.user.id)
      .eq("product_key", AGENTS_PRODUCT_KEY)
      .maybeSingle();

    if (selErr) {
      return NextResponse.json({ ok: false, error: selErr.message }, { status: 400 });
    }

    if (!existing) {
      const trialStart = new Date();
      const trialEnd = new Date(trialStart.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
      const plan_key = "pro";
      const payload = {
        user_id: guard.user.id,
        product_key: AGENTS_PRODUCT_KEY,
        plan_key,
        status: "trial",
        credits_limit: planToCredits(plan_key),
        credits_used: 0,
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

      return NextResponse.json({ ok: true, data: inserted });
    }

    // Ensure trial window exists
    let next = existing as any;
    if (String(next.status) === "trial" && (!next.trial_start || !next.trial_end)) {
      const trialStart = next.trial_start ? new Date(next.trial_start) : new Date();
      const trialEnd = next.trial_end ? new Date(next.trial_end) : new Date(trialStart.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
      const { data: updated, error: updErr } = await supabase
        .from("agent_entitlements")
        .update({ trial_start: trialStart.toISOString(), trial_end: trialEnd.toISOString() })
        .eq("user_id", guard.user.id)
        .eq("product_key", AGENTS_PRODUCT_KEY)
        .select("*")
        .single();
      if (!updErr && updated) next = updated;
    }

    return NextResponse.json({ ok: true, data: next });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
