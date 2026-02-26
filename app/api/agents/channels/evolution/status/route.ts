import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/api/_utils/auth";
import { getServiceSupabase } from "@/app/api/_utils/supabase";
import { SYSTEM_TENANT_ID } from "@/app/api/_utils/system";
import { evolutionService } from "../../../../../../lib/services/evolution.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeQr(raw: any): string | null {
  const qr = String(raw || "").trim();
  if (!qr) return null;
  if (qr.startsWith("data:image")) return qr;
  if (qr.startsWith("base64,")) return `data:image/png;${qr}`;
  return `data:image/png;base64,${qr}`;
}

function userInstanceName(userId: string) {
  const safe = String(userId || "").replace(/[^a-zA-Z0-9_-]/g, "");
  return `tenant_agents_${safe}`;
}

export async function GET(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });

  try {
    const supabase = getServiceSupabase();
    if (!supabase) return NextResponse.json({ ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });

    const instanceName = userInstanceName(guard.user.id);
    const status = await evolutionService.getStatus(instanceName);
    const qr = status === "connected" ? null : normalizeQr(await evolutionService.getQRCode(instanceName));

    const { data: existing } = await supabase
      .from("agent_channel_connections")
      .select("id,config")
      .eq("created_by", guard.user.id)
      .eq("channel_type", "whatsapp")
      .eq("provider", "evolution")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      const nextConfig = {
        ...(existing?.config && typeof existing.config === "object" ? existing.config : {}),
        evolution_instance_name: instanceName,
        connection_mode: "qr",
        product: "agents",
      };
      await supabase
        .from("agent_channel_connections")
        .update({
          status,
          config: nextConfig,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .eq("created_by", guard.user.id);
    } else if (status !== "disconnected") {
      await supabase.from("agent_channel_connections").insert({
        tenant_id: SYSTEM_TENANT_ID,
        created_by: guard.user.id,
        channel_type: "whatsapp",
        provider: "evolution",
        display_name: "WhatsApp QR (Evolution)",
        status,
        assigned_agent_id: null,
        config: {
          evolution_instance_name: instanceName,
          connection_mode: "qr",
          product: "agents",
        },
      });
    }

    return NextResponse.json({
      ok: true,
      data: {
        provider: "evolution",
        channel_type: "whatsapp",
        status,
        connected: status === "connected",
        instance_name: instanceName,
        qr_code: qr,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "No se pudo consultar estado Evolution" }, { status: 500 });
  }
}
