import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/api/_utils/auth";
import { getServiceSupabase } from "@/app/api/_utils/supabase";
import { checkEntitlementAccess } from "@/app/api/_utils/entitlement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });

  try {
    const supabase = getServiceSupabase();
    if (!supabase) {
      return NextResponse.json({
        ok: true,
        data: {
          env: {
            NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL),
            SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
            OPENAI_API_KEY: Boolean(process.env.OPENAI_API_KEY),
            EVOLUTION_API_URL: Boolean(process.env.EVOLUTION_API_URL),
            EVOLUTION_API_KEY: Boolean(process.env.EVOLUTION_API_KEY),
          },
          error: "Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE URL",
        },
      });
    }

    const { data: channel, error: channelErr } = await supabase
      .from("agent_channel_connections")
      .select("id,display_name,status,assigned_agent_id,config,updated_at")
      .eq("created_by", guard.user.id)
      .eq("channel_type", "whatsapp")
      .eq("provider", "evolution")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (channelErr) {
      return NextResponse.json({ ok: false, error: channelErr.message }, { status: 500 });
    }

    let agent: any = null;
    let entitlement: any = null;
    if (channel?.assigned_agent_id) {
      const { data: foundAgent } = await supabase
        .from("ai_agents")
        .select("id,name,status,created_by")
        .eq("id", String(channel.assigned_agent_id))
        .maybeSingle();
      agent = foundAgent || null;

      if (agent?.created_by) {
        const access = await checkEntitlementAccess(supabase as any, String(agent.created_by));
        entitlement = {
          ok: access.ok,
          code: access.code || null,
          error: access.error || null,
        };
      }
    }

    const origin = new URL(req.url).origin;

    return NextResponse.json({
      ok: true,
      data: {
        env: {
          NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL),
          SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
          OPENAI_API_KEY: Boolean(process.env.OPENAI_API_KEY),
          EVOLUTION_API_URL: Boolean(process.env.EVOLUTION_API_URL),
          EVOLUTION_API_KEY: Boolean(process.env.EVOLUTION_API_KEY),
        },
        expected_webhook_url: `${origin}/api/agents/channels/evolution/webhook`,
        user_id: guard.user.id,
        channel: channel || null,
        agent,
        entitlement,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Diagnostics error" }, { status: 500 });
  }
}
