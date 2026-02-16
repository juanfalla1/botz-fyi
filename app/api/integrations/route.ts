import { NextResponse } from "next/server";
import { assertTenantAccess } from "../_utils/guards";
import { getServiceSupabase } from "../_utils/supabase";

type IntegrationRow = {
  id: string;
  user_id: string | null;
  tenant_id: string | null;
  channel_type: string;
  provider: string;
  status: string | null;
  email_address: string | null;
  credentials?: any;
  last_activity: string | null;
  updated_at: string | null;
  created_at: string | null;
};

function normalizeStatus(s: any) {
  const v = String(s || "disconnected").toLowerCase().trim();
  if (v === "connected" || v === "pending" || v === "disconnected") return v;
  return "disconnected";
}

function pickEmail(row?: IntegrationRow | null) {
  const c: any = row?.credentials || {};
  return row?.email_address || c?.emailAddress || c?.email || null;
}

function mapToConnectorId(row: IntegrationRow) {
  if (row.channel_type === "gmail") return "gmail";
  if (row.channel_type === "whatsapp") return "whatsapp_qr";
  if (row.channel_type === "whatsapp_cloud") return "whatsapp_business";
  if (row.provider === "whatsapp_cloud" || row.provider === "whatsapp_business") return "whatsapp_business";
  return null;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const requestedTenantIdRaw = url.searchParams.get("tenant_id");
    const requestedTenantId = requestedTenantIdRaw && requestedTenantIdRaw !== "null" && requestedTenantIdRaw !== "undefined"
      ? requestedTenantIdRaw
      : null;

    const guard = await assertTenantAccess({ req, requestedTenantId });
    if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });

    const tenantId = guard.tenantId;

    const supabase = getServiceSupabase();
    if (!supabase) {
      return NextResponse.json({ ok: false, error: "Missing SUPABASE env (URL or SERVICE_ROLE)" }, { status: 500 });
    }

    const { data, error } = await supabase
      .from("integrations")
      .select("id,user_id,tenant_id,channel_type,provider,status,email_address,credentials,last_activity,updated_at,created_at")
      .eq("tenant_id", tenantId)
      .order("updated_at", { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, error: "DB_ERROR", details: error.message }, { status: 500 });
    }

    const rows = (data || []) as any as IntegrationRow[];

    const byId: Record<string, IntegrationRow | null> = {
      gmail: null,
      whatsapp_qr: null,
      whatsapp_business: null,
    };

    for (const r of rows) {
      const id = mapToConnectorId(r);
      if (!id) continue;
      if (!byId[id]) byId[id] = r;
    }

    const items = [
      {
        id: "whatsapp_qr",
        name: "WhatsApp Personal (QR)",
        status: normalizeStatus(byId.whatsapp_qr?.status),
        channel_type: byId.whatsapp_qr?.channel_type ?? "whatsapp",
        provider: byId.whatsapp_qr?.provider ?? "evolution",
        email: null,
        last_activity: byId.whatsapp_qr?.last_activity ?? null,
        updated_at: byId.whatsapp_qr?.updated_at ?? null,
      },
      {
        id: "whatsapp_business",
        name: "WhatsApp Business (Cloud)",
        status: normalizeStatus(byId.whatsapp_business?.status),
        channel_type: byId.whatsapp_business?.channel_type ?? "whatsapp_cloud",
        provider: byId.whatsapp_business?.provider ?? "whatsapp_cloud",
        email: null,
        last_activity: byId.whatsapp_business?.last_activity ?? null,
        updated_at: byId.whatsapp_business?.updated_at ?? null,
      },
      {
        id: "gmail",
        name: "Gmail",
        status: normalizeStatus(byId.gmail?.status),
        channel_type: byId.gmail?.channel_type ?? "gmail",
        provider: byId.gmail?.provider ?? "google",
        email: pickEmail(byId.gmail),
        last_activity: byId.gmail?.last_activity ?? null,
        updated_at: byId.gmail?.updated_at ?? null,
      },
    ];

    return NextResponse.json({ ok: true, tenant_id: tenantId, items });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", details: e?.message || String(e) },
      { status: 500 }
    );
  }
}
