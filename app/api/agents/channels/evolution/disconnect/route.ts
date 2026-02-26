import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/api/_utils/auth";
import { getServiceSupabase } from "@/app/api/_utils/supabase";
import { evolutionService } from "../../../../../../lib/services/evolution.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function userInstanceName(userId: string) {
  const safe = String(userId || "").replace(/[^a-zA-Z0-9_-]/g, "");
  return `tenant_agents_${safe}`;
}

export async function POST(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });

  try {
    const supabase = getServiceSupabase();
    if (!supabase) return NextResponse.json({ ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });

    const instanceName = userInstanceName(guard.user.id);

    try {
      await evolutionService.disconnect(instanceName);
    } catch {
      // Si la instancia ya estaba cerrada/no disponible, igual marcamos desconectado localmente.
    }

    await supabase
      .from("agent_channel_connections")
      .update({
        status: "disconnected",
        updated_at: new Date().toISOString(),
      })
      .eq("created_by", guard.user.id)
      .eq("channel_type", "whatsapp")
      .eq("provider", "evolution");

    return NextResponse.json({ ok: true, data: { status: "disconnected" } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "No se pudo desconectar Evolution" }, { status: 500 });
  }
}
