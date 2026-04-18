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

function safeFileName(raw: string) {
  const base = String(raw || "documento.pdf").trim() || "documento.pdf";
  return base.replace(/[^A-Za-z0-9._-]/g, "_");
}

export async function POST(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });

  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });

  try {
    const scope = await resolveCrmOwnerScope(supabase, guard.user.id);
    if (!scope.ok) return NextResponse.json({ ok: false, error: scope.error || "CRM no habilitado" }, { status: scope.status || 403 });
    const ownerId = scope.ownerId;
    const body = await req.json().catch(() => ({}));
    const contactId = String(body?.contact_id || "").trim();
    const quoteDraftId = String(body?.quote_draft_id || "").trim() || null;
    const docType = String(body?.doc_type || "quote_pdf").trim() || "quote_pdf";
    const bucketName = String(body?.bucket_name || "crm-documents").trim() || "crm-documents";
    const mimeType = String(body?.mime_type || "application/pdf").trim() || "application/pdf";
    const fileName = safeFileName(String(body?.file_name || "documento.pdf"));
    const base64Raw = String(body?.pdf_base64 || body?.file_base64 || "").trim();
    const metadata = body?.metadata && typeof body.metadata === "object" ? body.metadata : {};

    if (!contactId) return NextResponse.json({ ok: false, error: "Missing contact_id" }, { status: 400 });
    if (!base64Raw) return NextResponse.json({ ok: false, error: "Missing pdf_base64" }, { status: 400 });

    const base64 = base64Raw.includes(",") ? base64Raw.split(",").pop() || "" : base64Raw;
    const bytes = Buffer.from(base64, "base64");
    if (!bytes.length) return NextResponse.json({ ok: false, error: "Invalid base64 file" }, { status: 400 });

    const path = `${ownerId}/${contactId}/${Date.now()}-${fileName}`;
    const { error: uploadErr } = await supabase.storage
      .from(bucketName)
      .upload(path, bytes, { contentType: mimeType, upsert: false });

    if (uploadErr) {
      return NextResponse.json({ ok: false, error: `Storage upload error: ${uploadErr.message}` }, { status: 400 });
    }

    const payload = {
      tenant_id: null,
      created_by: ownerId,
      contact_id: contactId,
      quote_draft_id: quoteDraftId,
      doc_type: docType,
      bucket_name: bucketName,
      file_path: path,
      file_name: fileName,
      mime_type: mimeType,
      file_size_bytes: bytes.length,
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
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
