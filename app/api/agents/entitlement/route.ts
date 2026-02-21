import { NextResponse } from "next/server";
import { getAnonSupabaseWithToken } from "@/app/api/_utils/supabase";
import { getRequestUser } from "@/app/api/_utils/auth";
import { SYSTEM_TENANT_ID } from "@/app/api/_utils/system";
import { AGENTS_PRODUCT_KEY } from "@/app/api/_utils/entitlement";

const TRIAL_DAYS = 3;

function planToCredits(planKey: string) {
  if (planKey === "prime") return 1500000;
  if (planKey === "scale") return 500000;
  return 2000;
}

export async function GET(req: Request) {
  console.log("🔍 [API entitlement] Request recibida");
  
  const guard = await getRequestUser(req);
  console.log("🔍 [API entitlement] Guard result:", guard);
  
  if (!guard.ok) {
    console.error("🔍 [API entitlement] Auth failed:", guard.error);
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
      .eq("product_key", AGENTS_PRODUCT_KEY)
      .maybeSingle();

    if (selErr) {
      console.error("[API entitlement] Error reading agent_entitlements:", selErr);
      return NextResponse.json({ ok: false, error: selErr.message || "read entitlement error" }, { status: 500 });
    }

    // Compute current credits used from existing agents/flows as a source of truth.
    const { data: agents, error: agentsErr } = await supabase
      .from("ai_agents")
      .select("credits_used")
      .eq("tenant_id", SYSTEM_TENANT_ID)
      .eq("created_by", guard.user.id);

    if (agentsErr) {
      console.error("[API entitlement] Error reading ai_agents:", agentsErr);
      return NextResponse.json({ ok: false, error: agentsErr.message || "agents read error" }, { status: 500 });
    }

    const creditsUsedTotal = (agents || []).reduce((sum: number, a: any) => sum + (Number(a?.credits_used || 0) || 0), 0);

    if (!existing) {
      const trialStart = new Date();
      // 3 days trial
      const trialEndIso = new Date(trialStart.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
      const plan_key = "pro";
      
      // NOTA: Eliminamos tenant_id porque la tabla no tiene esa columna
      const payload = {
        user_id: guard.user.id,
        product_key: AGENTS_PRODUCT_KEY,
        plan_key,
        status: "trial",
        credits_limit: planToCredits(plan_key),
        credits_used: creditsUsedTotal,
        trial_start: trialStart.toISOString(),
        trial_end: trialEndIso,
      };

      console.log("📝 [API entitlement] Creando nuevo entitlement:", payload);

      const { data: inserted, error: insErr } = await supabase
        .from("agent_entitlements")
        .insert(payload)
        .select("*")
        .single();

      if (insErr) {
        console.error("❌ [API entitlement] Error al crear auto entitlement:", insErr);
        return NextResponse.json({ ok: false, error: insErr.message || "auto entitlements error" }, { status: 500 });
      }

      console.log("✅ [API entitlement] Entitlement creado exitosamente");
      return NextResponse.json({ ok: true, data: inserted, credits_used_total: creditsUsedTotal });
    }

    // Keep credits_used in sync without lowering server-side usage.
    // IMPORTANT: chat/voice/flow can consume entitlement credits directly,
    // so entitlement may be higher than ai_agents sum.
    let next = existing as any;
    const currentEntUsed = Number(next.credits_used || 0) || 0;
    const desiredEntUsed = Math.max(currentEntUsed, creditsUsedTotal);
    if (currentEntUsed !== desiredEntUsed) {
      const { data: updated, error: updErr } = await supabase
        .from("agent_entitlements")
        .update({ credits_used: desiredEntUsed })
        .eq("user_id", guard.user.id)
        .eq("product_key", AGENTS_PRODUCT_KEY)
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
        .eq("product_key", AGENTS_PRODUCT_KEY)
        .select("*")
        .single();
      if (!updErr && updated) next = updated;
    }

    const mergedCreditsUsed = Number(next?.credits_used || 0) || creditsUsedTotal;
    return NextResponse.json({ ok: true, data: next, credits_used_total: mergedCreditsUsed });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
