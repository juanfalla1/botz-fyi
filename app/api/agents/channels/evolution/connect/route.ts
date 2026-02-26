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

function extractQr(payload: any): string | null {
  return normalizeQr(payload?.qr_code || payload?.qr || payload?.qrcode || payload?.base64 || null);
}

function userInstanceToken(userId: string) {
  return `agents_${String(userId || "").replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

function userInstanceName(userId: string) {
  return `tenant_${userInstanceToken(userId)}`;
}

async function upsertChannelRow(params: {
  userId: string;
  assignedAgentId?: string | null;
  status: string;
  instanceName: string;
}) {
  const supabase = getServiceSupabase();
  if (!supabase) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  const { userId, assignedAgentId = null, status, instanceName } = params;
  const { data: existing } = await supabase
    .from("agent_channel_connections")
    .select("id,display_name,assigned_agent_id,config")
    .eq("created_by", userId)
    .eq("channel_type", "whatsapp")
    .eq("provider", "evolution")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextConfig = {
    ...(existing?.config && typeof existing.config === "object" ? existing.config : {}),
    evolution_instance_name: instanceName,
    connection_mode: "qr",
    product: "agents",
  };

  if (existing?.id) {
    const patch: Record<string, any> = {
      status,
      config: nextConfig,
      updated_at: new Date().toISOString(),
    };
    if (assignedAgentId) patch.assigned_agent_id = assignedAgentId;

    const { error } = await supabase
      .from("agent_channel_connections")
      .update(patch)
      .eq("id", existing.id)
      .eq("created_by", userId);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase.from("agent_channel_connections").insert({
    tenant_id: SYSTEM_TENANT_ID,
    created_by: userId,
    channel_type: "whatsapp",
    provider: "evolution",
    display_name: "WhatsApp QR (Evolution)",
    status,
    assigned_agent_id: assignedAgentId || null,
    config: nextConfig,
  });
  if (error) throw new Error(error.message);
}

export async function POST(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const assignedAgentId = body?.assigned_agent_id ? String(body.assigned_agent_id) : null;
    const instanceName = userInstanceName(guard.user.id);
    const instanceToken = userInstanceToken(guard.user.id);

    let status = await evolutionService.getStatus(instanceName);
    let qr = status === "connected" ? null : normalizeQr(await evolutionService.getQRCode(instanceName));

    if (!qr && status !== "connected") {
      const createRes = await evolutionService.createInstance(instanceToken);
      qr = extractQr(createRes) || normalizeQr(await evolutionService.getQRCode(instanceName));
      status = await evolutionService.getStatus(instanceName);
    }

    await upsertChannelRow({
      userId: guard.user.id,
      assignedAgentId,
      status,
      instanceName,
    });

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
    return NextResponse.json({ ok: false, error: e?.message || "No se pudo iniciar conexion Evolution" }, { status: 500 });
  }
}
