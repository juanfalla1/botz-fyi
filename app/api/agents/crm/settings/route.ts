import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/api/_utils/auth";
import { getServiceSupabase } from "@/app/api/_utils/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_STAGE_LABELS = {
  draft: "Nuevo",
  sent: "Cotizacion enviada",
  won: "Ganado",
  lost: "Perdido",
};

const DEFAULT_CONTACT_FIELDS = [
  { key: "name", label: "Nombre", visible: true, required: true },
  { key: "email", label: "Email", visible: true, required: true },
  { key: "phone", label: "Telefono", visible: true, required: true },
  { key: "company", label: "Empresa", visible: true, required: false },
  { key: "assigned_agent_name", label: "Asignado a", visible: false, required: false },
  { key: "last_channel", label: "Canal", visible: false, required: false },
  { key: "last_product", label: "Ultimo producto", visible: false, required: false },
  { key: "status", label: "Estado", visible: false, required: false },
  { key: "last_intent", label: "Ultima intencion", visible: true, required: false },
  { key: "lead_temperature", label: "Temperatura", visible: true, required: false },
  { key: "last_quote_sent_at", label: "Ultima cotizacion enviada", visible: true, required: false },
  { key: "next_action", label: "Proxima accion", visible: false, required: false },
  { key: "next_action_at", label: "Fecha proxima accion", visible: false, required: false },
  { key: "quotes_count", label: "Cotizaciones", visible: true, required: false },
  { key: "last_activity_at", label: "Ultima actividad", visible: true, required: false },
];

function sanitizeContactFields(input: any) {
  if (!Array.isArray(input)) return DEFAULT_CONTACT_FIELDS;
  const safe = input
    .map((f: any) => ({
      key: String(f?.key || "").trim().toLowerCase(),
      label: String(f?.label || "").trim(),
      visible: Boolean(f?.visible),
      required: Boolean(f?.required),
    }))
    .filter((f: any) => f.key && f.label)
    .slice(0, 20);
  return safe.length ? safe : DEFAULT_CONTACT_FIELDS;
}

function sanitizeStageLabels(input: any) {
  const src = input && typeof input === "object" ? input : {};
  return {
    draft: String(src?.draft || DEFAULT_STAGE_LABELS.draft),
    sent: String(src?.sent || DEFAULT_STAGE_LABELS.sent),
    won: String(src?.won || DEFAULT_STAGE_LABELS.won),
    lost: String(src?.lost || DEFAULT_STAGE_LABELS.lost),
  };
}

async function ensureSettings(supabase: any, ownerId: string) {
  const { data: row, error: readErr } = await supabase
    .from("agent_crm_settings")
    .select("id,tenant_id,created_by,enabled,stage_labels,contact_fields,created_at,updated_at")
    .eq("created_by", ownerId)
    .maybeSingle();

  if (readErr) {
    throw new Error(readErr.message);
  }

  if (row) {
    return {
      ...row,
      stage_labels: sanitizeStageLabels(row.stage_labels),
      contact_fields: sanitizeContactFields(row.contact_fields),
    };
  }

  const payload = {
    tenant_id: null,
    created_by: ownerId,
    enabled: false,
    stage_labels: DEFAULT_STAGE_LABELS,
    contact_fields: DEFAULT_CONTACT_FIELDS,
  };
  const { data: inserted, error } = await supabase
    .from("agent_crm_settings")
    .insert(payload)
    .select("id,tenant_id,created_by,enabled,stage_labels,contact_fields,created_at,updated_at")
    .single();
  if (error) throw new Error(error.message);
  return inserted;
}

export async function GET(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });
  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });

  try {
    const data = await ensureSettings(supabase, guard.user.id);
    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (msg.includes("agent_crm_settings") && msg.includes("does not exist")) {
      return NextResponse.json({
        ok: true,
        missing_table: true,
        data: {
          id: null,
          tenant_id: null,
          created_by: guard.user.id,
          enabled: false,
          stage_labels: DEFAULT_STAGE_LABELS,
          contact_fields: DEFAULT_CONTACT_FIELDS,
        },
      });
    }
    return NextResponse.json({ ok: false, error: e?.message || "No se pudo cargar configuración CRM" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });
  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });

  try {
    const body = await req.json().catch(() => ({}));
    const current = await ensureSettings(supabase, guard.user.id);

    const patch: any = {};
    if (typeof body?.enabled === "boolean") patch.enabled = body.enabled;
    if (body?.stage_labels) patch.stage_labels = sanitizeStageLabels(body.stage_labels);
    if (body?.contact_fields) patch.contact_fields = sanitizeContactFields(body.contact_fields);

    if (!Object.keys(patch).length) {
      return NextResponse.json({ ok: true, data: current });
    }

    const { data, error } = await supabase
      .from("agent_crm_settings")
      .update(patch)
      .eq("id", current.id)
      .eq("created_by", guard.user.id)
      .select("id,tenant_id,created_by,enabled,stage_labels,contact_fields,created_at,updated_at")
      .single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (msg.includes("agent_crm_settings") && msg.includes("does not exist")) {
      return NextResponse.json({ ok: false, code: "missing_table", error: "Falta migración CRM settings (agent_crm_settings)" }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: e?.message || "No se pudo actualizar configuración CRM" }, { status: 500 });
  }
}
