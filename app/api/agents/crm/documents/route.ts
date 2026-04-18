import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/api/_utils/auth";
import { getServiceSupabase } from "@/app/api/_utils/supabase";
import { resolveCrmOwnerScope } from "@/app/api/agents/crm/_scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isMissingTableError(err: any, tableName: string) {
  const msg = String(err?.message || "").toLowerCase();
  const t = tableName.toLowerCase();
  return (
    msg.includes("does not exist") ||
    msg.includes("could not find the table") ||
    msg.includes("schema cache")
  ) && msg.includes(t);
}

export async function GET(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });

  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });

  const scope = await resolveCrmOwnerScope(supabase, guard.user.id);
  if (!scope.ok) return NextResponse.json({ ok: false, error: scope.error || "CRM no habilitado" }, { status: scope.status || 403 });
  const ownerId = scope.ownerId;
  const url = new URL(req.url);
  const contactId = String(url.searchParams.get("contact_id") || "").trim();
  const quoteDraftId = String(url.searchParams.get("quote_draft_id") || "").trim();
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || 60)));

  let q = supabase
    .from("agent_crm_documents")
    .select("id,contact_id,quote_draft_id,doc_type,bucket_name,file_path,file_name,mime_type,file_size_bytes,metadata,created_at,updated_at")
    .eq("created_by", ownerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (contactId) q = q.eq("contact_id", contactId);
  if (quoteDraftId) q = q.eq("quote_draft_id", quoteDraftId);

  const { data, error } = await q;
  if (error) {
    if (isMissingTableError(error, "agent_crm_documents")) {
      return NextResponse.json({ ok: false, code: "missing_table", error: "Falta migración CRM documents (agent_crm_documents)" }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, data: Array.isArray(data) ? data : [] });
}

export async function POST(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });

  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });

  const scope = await resolveCrmOwnerScope(supabase, guard.user.id);
  if (!scope.ok) return NextResponse.json({ ok: false, error: scope.error || "CRM no habilitado" }, { status: scope.status || 403 });
  const ownerId = scope.ownerId;
  const body = await req.json().catch(() => ({}));
  const docType = String(body?.doc_type || "other").trim() || "other";
  const bucketName = String(body?.bucket_name || "").trim();
  const filePath = String(body?.file_path || "").trim();
  const fileName = String(body?.file_name || "").trim();
  const mimeType = String(body?.mime_type || "").trim() || null;
  const fileSizeBytes = Number(body?.file_size_bytes || 0) || null;
  const contactId = String(body?.contact_id || "").trim() || null;
  const quoteDraftId = String(body?.quote_draft_id || "").trim() || null;
  const metadata = body?.metadata && typeof body.metadata === "object" ? body.metadata : {};

  if (!bucketName || !filePath || !fileName) {
    return NextResponse.json({ ok: false, error: "Missing bucket_name, file_path or file_name" }, { status: 400 });
  }

  const payload = {
    tenant_id: null,
    created_by: ownerId,
    contact_id: contactId,
    quote_draft_id: quoteDraftId,
    doc_type: docType,
    bucket_name: bucketName,
    file_path: filePath,
    file_name: fileName,
    mime_type: mimeType,
    file_size_bytes: fileSizeBytes,
    metadata,
  };

  const { data, error } = await supabase
    .from("agent_crm_documents")
    .insert(payload)
    .select("id,contact_id,quote_draft_id,doc_type,bucket_name,file_path,file_name,mime_type,file_size_bytes,metadata,created_at,updated_at")
    .single();

  if (error) {
    if (isMissingTableError(error, "agent_crm_documents")) {
      return NextResponse.json({ ok: false, code: "missing_table", error: "Falta migración CRM documents (agent_crm_documents)" }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, data });
}
