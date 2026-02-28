import { NextResponse } from "next/server";
import { getAnonSupabaseWithToken } from "@/app/api/_utils/supabase";
import { getRequestUser } from "@/app/api/_utils/auth";
import { SYSTEM_TENANT_ID } from "@/app/api/_utils/system";
import { checkEntitlementAccess, getPlanLimits, hasAdminEntitlementOverride } from "@/app/api/_utils/entitlement";

export async function POST(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });
  }

  const supabase = getAnonSupabaseWithToken(guard.token);
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Missing SUPABASE env (URL or ANON)" }, { status: 500 });
  }

  try {
    const access = await checkEntitlementAccess(supabase as any, guard.user.id);
    if (!access.ok) {
      return NextResponse.json({ ok: false, error: access.error || "Entitlement blocked", code: access.code }, { status: access.statusCode || 402 });
    }

    const body = await req.json();
    const name = String(body?.name || "").trim();
    const type = String(body?.type || "").trim();

    if (!name || !type) {
      return NextResponse.json({ ok: false, error: "Missing name or type" }, { status: 400 });
    }

    if (!hasAdminEntitlementOverride(guard.user.id)) {
      const planLimits = getPlanLimits(String((access as any)?.entitlement?.plan_key || "pro"));
      const { count: currentAgents, error: countErr } = await supabase
        .from("ai_agents")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", SYSTEM_TENANT_ID)
        .eq("created_by", guard.user.id);

      if (countErr) {
        return NextResponse.json({ ok: false, error: countErr.message || "No se pudo validar límite de agentes" }, { status: 500 });
      }

      const total = Number(currentAgents || 0);
      if (planLimits.max_agents > 0 && total >= planLimits.max_agents) {
        return NextResponse.json(
          {
            ok: false,
            code: "agents_limit_reached",
            error: `Tu plan permite hasta ${planLimits.max_agents} agente(s). Actualiza tu plan para crear más.`,
            limits: planLimits,
            current: { agents: total },
          },
          { status: 402 }
        );
      }
    }

    const payload = {
      name,
      type,
      description: body?.description || "",
      configuration: body?.configuration || {},
      voice_settings: body?.voice_settings || null,
      tenant_id: SYSTEM_TENANT_ID,
      created_by: guard.user.id,
      status: body?.status || "draft",
    };

    const { data, error } = await supabase
      .from("ai_agents")
      .insert(payload)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
