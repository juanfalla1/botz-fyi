import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/api/_utils/auth";
import { getServiceSupabase } from "@/app/api/_utils/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["draft", "sent", "won", "lost"]);

function normalizePhone(raw: string | null | undefined) {
  return String(raw || "").replace(/\D/g, "");
}

function phoneTail10(raw: string | null | undefined) {
  const n = normalizePhone(raw);
  return n.length > 10 ? n.slice(-10) : n;
}

function isMissingTableError(err: any, tableName: string) {
  const msg = String(err?.message || "").toLowerCase();
  const t = tableName.toLowerCase();
  return (
    msg.includes("does not exist") ||
    msg.includes("could not find the table") ||
    msg.includes("schema cache")
  ) && msg.includes(t);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await getRequestUser(req);
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });

  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const nextStatus = String(body?.status || "").toLowerCase();
  if (!ALLOWED.has(nextStatus)) {
    return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });
  }

  const { data: draftRow, error: draftErr } = await supabase
    .from("agent_quote_drafts")
    .select("id,created_by,customer_name,customer_email,customer_phone,company_name")
    .eq("id", id)
    .eq("created_by", guard.user.id)
    .maybeSingle();
  if (draftErr) return NextResponse.json({ ok: false, error: draftErr.message }, { status: 400 });
  if (!draftRow) return NextResponse.json({ ok: false, error: "Opportunity not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("agent_quote_drafts")
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("created_by", guard.user.id)
    .select("id,status,updated_at")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  try {
    const email = String((draftRow as any)?.customer_email || "").trim().toLowerCase();
    const phone = phoneTail10((draftRow as any)?.customer_phone);
    const contactKey = phone || email;
    if (contactKey) {
      const { data: existing } = await supabase
        .from("agent_crm_contacts")
        .select("id")
        .eq("created_by", guard.user.id)
        .or(phone ? `contact_key.eq.${contactKey},phone.like.%${phone}` : `contact_key.eq.${contactKey}`)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        await supabase
          .from("agent_crm_contacts")
          .update({ status: nextStatus })
          .eq("id", existing.id)
          .eq("created_by", guard.user.id);
      } else {
        await supabase
          .from("agent_crm_contacts")
          .insert({
            tenant_id: null,
            created_by: guard.user.id,
            contact_key: contactKey,
            name: (draftRow as any)?.customer_name || null,
            email: email || null,
            phone: phone || null,
            company: (draftRow as any)?.company_name || null,
            status: nextStatus,
          });
      }
    }
  } catch (syncErr: any) {
    if (!isMissingTableError(syncErr, "agent_crm_contacts")) {
      console.warn("[crm-opportunity] status sync warning", syncErr?.message || syncErr);
    }
  }

  return NextResponse.json({ ok: true, data });
}
