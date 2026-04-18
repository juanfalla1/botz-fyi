import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/api/_utils/auth";
import { getServiceSupabase } from "@/app/api/_utils/supabase";
import { evolutionService } from "../../../../../lib/services/evolution.service";
import { buildQuotePdfFromDraft } from "../_utils/pdf";
import { resolveCrmOwnerScope } from "@/app/api/agents/crm/_scope";

export const runtime = "nodejs";

function normalizeOutboundPhone(raw: string) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `57${digits}`;
  return digits;
}

function userInstanceName(userId: string) {
  const safe = String(userId || "").replace(/[^a-zA-Z0-9_-]/g, "");
  return `tenant_agents_${safe}`;
}

function isQuoteDraftStatusConstraintError(err: any) {
  const msg = String(err?.message || "").toLowerCase();
  return msg.includes("agent_quote_drafts_status_check") || (msg.includes("check constraint") && msg.includes("agent_quote_drafts"));
}

export async function POST(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });

  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "Missing Supabase env" }, { status: 500 });
  const scope = await resolveCrmOwnerScope(supabase, guard.user.id);
  if (!scope.ok) return NextResponse.json({ ok: false, error: scope.error || "CRM no habilitado" }, { status: scope.status || 403 });
  const ownerId = scope.ownerId;

  try {
    const body = await req.json().catch(() => ({}));
    const draftId = String(body?.draftId || "").trim();
    const requestedTo = String(body?.to || "").trim();
    const requestedInstance = String(body?.instanceName || "").trim();

    if (!draftId) {
      return NextResponse.json({ ok: false, error: "Missing draftId" }, { status: 400 });
    }

    const { data: draft, error } = await supabase
      .from("agent_quote_drafts")
      .select("*")
      .eq("id", draftId)
      .eq("created_by", ownerId)
      .maybeSingle();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    if (!draft) return NextResponse.json({ ok: false, error: "Draft no encontrado" }, { status: 404 });

    const payload = draft?.payload && typeof draft.payload === "object" ? draft.payload : {};
    const to = normalizeOutboundPhone(requestedTo || String((draft as any).customer_phone || "") || String((payload as any).customer_phone || ""));
    if (!to || to.length < 10) {
      return NextResponse.json({ ok: false, error: "Telefono destino invalido para WhatsApp" }, { status: 400 });
    }

    const instanceName = requestedInstance || userInstanceName(ownerId);
    const { pdfBase64, fileName } = await buildQuotePdfFromDraft(draftId, draft);
    const caption = `Cotizacion preliminar ${fileName}`;
    const sendResult = await evolutionService.sendDocument(instanceName, to, {
      base64: pdfBase64,
      fileName,
      caption,
      mimetype: "application/pdf",
    });

    const mergedPayload = {
      ...(draft as any).payload,
      whatsapp_send: {
        at: new Date().toISOString(),
        to,
        instanceName,
        fileName,
      },
    };

    const updateResult = await supabase
      .from("agent_quote_drafts")
      .update({ status: "quote", payload: mergedPayload } as any)
      .eq("id", draftId)
      .eq("created_by", ownerId);

    if (updateResult.error && isQuoteDraftStatusConstraintError(updateResult.error)) {
      const legacyResult = await supabase
        .from("agent_quote_drafts")
        .update({ status: "sent", payload: mergedPayload } as any)
        .eq("id", draftId)
        .eq("created_by", ownerId);
      if (legacyResult.error) {
        return NextResponse.json({ ok: false, error: legacyResult.error.message }, { status: 400 });
      }
    } else if (updateResult.error) {
      return NextResponse.json({ ok: false, error: updateResult.error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: { draftId, to, instanceName, fileName, sendResult } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
