import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/api/_utils/auth";
import { getServiceSupabase } from "@/app/api/_utils/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizePhone(raw: string | null | undefined) {
  return String(raw || "").replace(/\D/g, "");
}

function tail10(raw: string | null | undefined) {
  const n = normalizePhone(raw);
  return n.length > 10 ? n.slice(-10) : n;
}

function contactKeyOf(phoneRaw: string | null | undefined, emailRaw: string | null | undefined) {
  const phone = tail10(phoneRaw);
  const email = String(emailRaw || "").trim().toLowerCase();
  return phone || email;
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

function isQuoteDraftStatusConstraintError(err: any) {
  const msg = String(err?.message || "").toLowerCase();
  return msg.includes("agent_quote_drafts_status_check") || (msg.includes("check constraint") && msg.includes("agent_quote_drafts"));
}

function isCrmContactStatusConstraintError(err: any) {
  const msg = String(err?.message || "").toLowerCase();
  return msg.includes("agent_crm_contacts_status_check") || (msg.includes("check constraint") && msg.includes("agent_crm_contacts"));
}

const ALLOWED_STATUS = new Set([
  "analysis", "study", "quote", "purchase_order", "invoicing",
  "analisis", "analisis_de_necesidad", "estudio", "cotizacion", "orden_de_compra", "orden de compra", "facturacion",
  "draft", "sent", "won", "lost",
]);

function normalizeCrmStage(raw: string) {
  const s = String(raw || "").toLowerCase().trim();
  if (s === "analysis" || s === "study" || s === "quote" || s === "purchase_order" || s === "invoicing") return s;
  if (s === "analisis" || s === "analisis_de_necesidad") return "analysis";
  if (s === "estudio") return "study";
  if (s === "cotizacion") return "quote";
  if (s === "orden_de_compra" || s === "orden de compra") return "purchase_order";
  if (s === "facturacion") return "invoicing";
  if (s === "draft") return "analysis";
  if (s === "sent") return "quote";
  if (s === "won") return "purchase_order";
  if (s === "lost") return "invoicing";
  return "analysis";
}

function resolveDraftStage(draft: any): string {
  const payload = draft?.payload && typeof draft.payload === "object" ? draft.payload : {};
  const payloadStageRaw = String((payload as any)?.crm_stage || "").trim();
  if (payloadStageRaw) return normalizeCrmStage(payloadStageRaw);
  return normalizeCrmStage(String(draft?.status || ""));
}

function mapToLegacyQuoteDraftStatus(stage: string) {
  const s = normalizeCrmStage(stage);
  if (s === "analysis") return "draft";
  if (s === "study") return "draft";
  if (s === "quote") return "sent";
  if (s === "purchase_order") return "won";
  if (s === "invoicing") return "lost";
  return "draft";
}

function mapToLegacyContactStatus(stage: string) {
  const s = normalizeCrmStage(stage);
  if (s === "analysis") return "draft";
  if (s === "study") return "draft";
  if (s === "quote") return "sent";
  if (s === "purchase_order") return "won";
  if (s === "invoicing") return "lost";
  return "draft";
}

async function resolveOrCreateContact(supabase: any, ownerId: string, args: { phone?: string; email?: string; name?: string; company?: string }) {
  const phone = normalizePhone(args.phone);
  const phoneKey = tail10(phone);
  const email = String(args.email || "").trim().toLowerCase();
  const contactKey = contactKeyOf(phoneKey, email);
  if (!contactKey) throw new Error("Missing contact key");

  let existing: any = null;
  if (phoneKey) {
    const { data } = await supabase
      .from("agent_crm_contacts")
      .select("id,contact_key,name,email,phone,company,assigned_agent_id,status,next_action,next_action_at,updated_at")
      .eq("created_by", ownerId)
      .or(`contact_key.eq.${contactKey},phone.like.%${phoneKey}`)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    existing = data || null;
  } else {
    const { data } = await supabase
      .from("agent_crm_contacts")
      .select("id,contact_key,name,email,phone,company,assigned_agent_id,status,next_action,next_action_at,updated_at")
      .eq("created_by", ownerId)
      .eq("contact_key", contactKey)
      .maybeSingle();
    existing = data || null;
  }

  if (existing) return existing;

  const payload = {
    tenant_id: null,
    created_by: ownerId,
    contact_key: contactKey,
    name: args.name || null,
    email: email || null,
    phone: phoneKey || null,
    company: args.company || null,
    status: "analysis",
  };

  const { data: inserted, error } = await supabase
    .from("agent_crm_contacts")
    .insert(payload)
    .select("id,contact_key,name,email,phone,company,assigned_agent_id,status,next_action,next_action_at,updated_at")
    .single();
  if (error) {
    if (isCrmContactStatusConstraintError(error)) {
      const { data: insertedLegacy, error: legacyErr } = await supabase
        .from("agent_crm_contacts")
        .insert({ ...payload, status: mapToLegacyContactStatus("analysis") })
        .select("id,contact_key,name,email,phone,company,assigned_agent_id,status,next_action,next_action_at,updated_at")
        .single();
      if (legacyErr) throw new Error(legacyErr.message);
      return insertedLegacy;
    }
    throw new Error(error.message);
  }
  return inserted;
}

export async function GET(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });

  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });

  const url = new URL(req.url);
  const qPhone = normalizePhone(url.searchParams.get("phone"));
  const qEmail = String(url.searchParams.get("email") || "").trim().toLowerCase();

  if (!qPhone && !qEmail) {
    return NextResponse.json({ ok: false, error: "Missing phone or email" }, { status: 400 });
  }

  const ownerId = guard.user.id;

  const { data: ownerAgents, error: agentsErr } = await supabase
    .from("ai_agents")
    .select("id")
    .eq("created_by", ownerId)
    .limit(500);
  if (agentsErr) return NextResponse.json({ ok: false, error: agentsErr.message }, { status: 400 });
  const agentIds = Array.isArray(ownerAgents) ? ownerAgents.map((a: any) => String(a.id)).filter(Boolean) : [];

  const draftRowsLimit = qPhone ? 500 : 120;
  let draftsQuery = supabase
    .from("agent_quote_drafts")
    .select("id,agent_id,customer_name,customer_email,customer_phone,company_name,product_name,total_cop,trm_rate,status,payload,created_at,updated_at")
    .eq("created_by", ownerId)
    .order("created_at", { ascending: false })
    .limit(draftRowsLimit);

  if (!qPhone && qEmail) {
    draftsQuery = draftsQuery.eq("customer_email", qEmail);
  }

  const { data: rawDrafts, error: draftsErr } = await draftsQuery;
  if (draftsErr) return NextResponse.json({ ok: false, error: draftsErr.message }, { status: 400 });
  const drafts = (Array.isArray(rawDrafts) ? rawDrafts : []).filter((d: any) => {
    const email = String(d?.customer_email || "").trim().toLowerCase();
    const phone = normalizePhone(d?.customer_phone);
    if (qPhone && qEmail) return tail10(phone) === tail10(qPhone) || email === qEmail;
    if (qPhone) return tail10(phone) === tail10(qPhone);
    if (qEmail) return email === qEmail;
    return true;
  });

  let convRows: any[] = [];
  if (agentIds.length && qPhone) {
    const { data: convData, error: convErr } = await supabase
      .from("agent_conversations")
      .select("id,agent_id,contact_phone,contact_name,channel,status,message_count,transcript,created_at")
      .in("agent_id", agentIds)
      .order("created_at", { ascending: false })
      .limit(1200);
    if (convErr) return NextResponse.json({ ok: false, error: convErr.message }, { status: 400 });
    const rows = Array.isArray(convData) ? convData : [];
    const exact = normalizePhone(qPhone);
    const t10 = tail10(qPhone);
    convRows = rows.filter((c: any) => {
      const cp = normalizePhone(c?.contact_phone);
      if (!cp) return false;
      if (cp === exact) return true;
      return tail10(cp) === t10;
    });
  }

  const timeline: Array<{ at: string; kind: string; text: string }> = [];

  for (const d of Array.isArray(drafts) ? drafts : []) {
    timeline.push({
      at: String((d as any).created_at || ""),
      kind: "quote",
      text: `Cotización ${String((d as any).product_name || "producto")}: COP ${Number((d as any).total_cop || 0).toLocaleString("es-CO")} (${resolveDraftStage(d as any)})`,
    });
  }

  for (const c of convRows) {
    const transcript = Array.isArray(c?.transcript) ? c.transcript : [];
    const lastMsgs = transcript.slice(-20);
    for (const m of lastMsgs) {
      timeline.push({
        at: String(m?.timestamp || c?.created_at || ""),
        kind: String(m?.role || "message"),
        text: String(m?.content || "").slice(0, 280),
      });
    }
  }

  timeline.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  let contactRow: any = null;
  try {
    contactRow = await resolveOrCreateContact(supabase, ownerId, { phone: qPhone, email: qEmail });
  } catch (e: any) {
    if (!isMissingTableError(e, "agent_crm_contacts")) {
      throw e;
    }
    contactRow = null;
  }

  const { data: notes } = contactRow?.id
    ? await supabase
        .from("agent_crm_notes")
        .select("id,note,created_at")
        .eq("created_by", ownerId)
        .eq("contact_id", contactRow.id)
        .order("created_at", { ascending: false })
      .limit(200)
    : ({ data: [] } as any);

  return NextResponse.json({
    ok: true,
    data: {
      contact: contactRow,
      drafts: Array.isArray(drafts) ? drafts : [],
      conversations: convRows,
      timeline: timeline.slice(0, 120),
      notes: Array.isArray(notes) ? notes : [],
    },
  });
}

export async function PATCH(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });

  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const ownerId = guard.user.id;

  const phone = normalizePhone(body?.phone);
  const email = String(body?.email || "").trim().toLowerCase();
  const name = String(body?.name || "").trim();
  const company = String(body?.company || "").trim();
  const nextStatusRaw = body?.status !== undefined ? String(body.status || "").toLowerCase() : undefined;
  const nextStatus = nextStatusRaw !== undefined ? normalizeCrmStage(nextStatusRaw) : undefined;

  if (!phone && !email) {
    return NextResponse.json({ ok: false, error: "Missing phone or email" }, { status: 400 });
  }
  if (nextStatusRaw !== undefined && !ALLOWED_STATUS.has(nextStatusRaw)) {
    return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });
  }

  try {
    const contact = await resolveOrCreateContact(supabase, ownerId, { phone, email, name, company });
    const patch: any = {};
    if (name) patch.name = name;
    if (email) patch.email = email;
    if (phone) patch.phone = tail10(phone);
    if (company) patch.company = company;
    if (body?.assigned_agent_id !== undefined) patch.assigned_agent_id = body.assigned_agent_id || null;
    if (nextStatus !== undefined) patch.status = nextStatus;
    if (body?.next_action !== undefined) patch.next_action = String(body.next_action || "").trim() || null;
    if (body?.next_action_at !== undefined) patch.next_action_at = body.next_action_at ? String(body.next_action_at) : null;

    let updateResult = await supabase
      .from("agent_crm_contacts")
      .update(patch)
      .eq("id", contact.id)
      .eq("created_by", ownerId)
      .select("id,contact_key,name,email,phone,company,assigned_agent_id,status,next_action,next_action_at,updated_at")
      .single();

    if (updateResult.error && isCrmContactStatusConstraintError(updateResult.error) && patch.status) {
      const legacyPatch = { ...patch, status: mapToLegacyContactStatus(String(patch.status || "analysis")) };
      updateResult = await supabase
        .from("agent_crm_contacts")
        .update(legacyPatch)
        .eq("id", contact.id)
        .eq("created_by", ownerId)
        .select("id,contact_key,name,email,phone,company,assigned_agent_id,status,next_action,next_action_at,updated_at")
        .single();
    }

    const data = updateResult.data;
    const error = updateResult.error;
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

    if (nextStatus !== undefined) {
      const phoneKey = tail10(phone || contact?.phone);
      const emailKey = String(email || contact?.email || "").trim().toLowerCase();
      if (phoneKey || emailKey) {
        let draftsStatusQuery = supabase
          .from("agent_quote_drafts")
          .update({ status: nextStatus, updated_at: new Date().toISOString() })
          .eq("created_by", ownerId);

        if (phoneKey && emailKey) {
          draftsStatusQuery = draftsStatusQuery.or(`customer_phone.like.%${phoneKey},customer_email.eq.${emailKey}`);
        } else if (phoneKey) {
          draftsStatusQuery = draftsStatusQuery.like("customer_phone", `%${phoneKey}`);
        } else {
          draftsStatusQuery = draftsStatusQuery.eq("customer_email", emailKey);
        }

        const { error: draftsStatusErr } = await draftsStatusQuery;
        if (draftsStatusErr) {
          if (isQuoteDraftStatusConstraintError(draftsStatusErr)) {
            const legacyStatus = mapToLegacyQuoteDraftStatus(nextStatus);
            let legacyQuery = supabase
              .from("agent_quote_drafts")
              .update({ status: legacyStatus, updated_at: new Date().toISOString() })
              .eq("created_by", ownerId);

            if (phoneKey && emailKey) {
              legacyQuery = legacyQuery.or(`customer_phone.like.%${phoneKey},customer_email.eq.${emailKey}`);
            } else if (phoneKey) {
              legacyQuery = legacyQuery.like("customer_phone", `%${phoneKey}`);
            } else {
              legacyQuery = legacyQuery.eq("customer_email", emailKey);
            }

            const { error: legacyErr } = await legacyQuery;
            if (legacyErr) {
              return NextResponse.json({ ok: false, error: legacyErr.message }, { status: 400 });
            }
          } else {
            return NextResponse.json({ ok: false, error: draftsStatusErr.message }, { status: 400 });
          }
        }
      }
    }

    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    if (isMissingTableError(e, "agent_crm_contacts")) {
      return NextResponse.json({ ok: false, code: "missing_table", error: "Falta migración CRM contacts (agent_crm_contacts)" }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: e?.message || "No se pudo actualizar contacto" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });

  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const ownerId = guard.user.id;
  const note = String(body?.note || "").trim();
  if (!note) return NextResponse.json({ ok: false, error: "Missing note" }, { status: 400 });

  const phone = normalizePhone(body?.phone);
  const email = String(body?.email || "").trim().toLowerCase();
  if (!phone && !email) {
    return NextResponse.json({ ok: false, error: "Missing phone or email" }, { status: 400 });
  }

  try {
    const contact = await resolveOrCreateContact(supabase, ownerId, {
      phone,
      email,
      name: String(body?.name || "").trim(),
      company: String(body?.company || "").trim(),
    });

    const { data, error } = await supabase
      .from("agent_crm_notes")
      .insert({
        tenant_id: null,
        created_by: ownerId,
        contact_id: contact.id,
        note,
      })
      .select("id,note,created_at")
      .single();

    if (error) {
      if (isMissingTableError(error, "agent_crm_notes")) {
        return NextResponse.json({ ok: false, code: "missing_table", error: "Falta migración CRM notes (agent_crm_notes)" }, { status: 400 });
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    if (isMissingTableError(e, "agent_crm_contacts")) {
      return NextResponse.json({ ok: false, code: "missing_table", error: "Falta migración CRM contacts (agent_crm_contacts)" }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: e?.message || "No se pudo guardar bitacora" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });

  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const ownerId = guard.user.id;
  const phone = normalizePhone(body?.phone);
  const email = String(body?.email || "").trim().toLowerCase();
  const explicitKey = String(body?.contact_key || "").trim();
  const key = explicitKey || contactKeyOf(phone, email);

  if (!key) return NextResponse.json({ ok: false, error: "Missing phone or email" }, { status: 400 });

  try {
    let query = supabase
      .from("agent_crm_contacts")
      .select("id")
      .eq("created_by", ownerId)
      .eq("contact_key", key)
      .limit(200);

    if (phone) {
      const p10 = tail10(phone);
      query = supabase
        .from("agent_crm_contacts")
        .select("id")
        .eq("created_by", ownerId)
        .or(`contact_key.eq.${key},phone.like.%${p10}`)
        .limit(200);
    }

    const { data: rows, error: readErr } = await query;
    if (readErr) return NextResponse.json({ ok: false, error: readErr.message }, { status: 400 });
    const ids = (Array.isArray(rows) ? rows : []).map((r: any) => String(r?.id || "")).filter(Boolean);

    const p10 = phone ? tail10(phone) : "";
    const emailKey = email || "";

    // Remove related quotes so the contact does not reappear in CRM overview.
    if (p10 || emailKey) {
      let draftsDel = supabase
        .from("agent_quote_drafts")
        .delete()
        .eq("created_by", ownerId);
      if (p10 && emailKey) {
        draftsDel = draftsDel.or(`customer_phone.like.%${p10},customer_email.eq.${emailKey}`);
      } else if (p10) {
        draftsDel = draftsDel.like("customer_phone", `%${p10}`);
      } else {
        draftsDel = draftsDel.eq("customer_email", emailKey);
      }
      const { error: draftsDelErr } = await draftsDel;
      if (draftsDelErr) return NextResponse.json({ ok: false, error: draftsDelErr.message }, { status: 400 });
    }

    // Remove related conversations (mainly phone-based) for owner agents.
    if (p10) {
      const { data: ownerAgents, error: ownerAgentsErr } = await supabase
        .from("ai_agents")
        .select("id")
        .eq("created_by", ownerId)
        .limit(500);
      if (ownerAgentsErr) return NextResponse.json({ ok: false, error: ownerAgentsErr.message }, { status: 400 });
      const agentIds = Array.isArray(ownerAgents) ? ownerAgents.map((a: any) => String(a.id)).filter(Boolean) : [];
      if (agentIds.length) {
        const { error: convDelErr } = await supabase
          .from("agent_conversations")
          .delete()
          .in("agent_id", agentIds)
          .like("contact_phone", `%${p10}`);
        if (convDelErr) return NextResponse.json({ ok: false, error: convDelErr.message }, { status: 400 });
      }
    }

    if (!ids.length) return NextResponse.json({ ok: true, deleted: 0 });

    await supabase
      .from("agent_crm_notes")
      .delete()
      .eq("created_by", ownerId)
      .in("contact_id", ids);

    const { error: delErr } = await supabase
      .from("agent_crm_contacts")
      .delete()
      .eq("created_by", ownerId)
      .in("id", ids);
    if (delErr) return NextResponse.json({ ok: false, error: delErr.message }, { status: 400 });

    return NextResponse.json({ ok: true, deleted: ids.length });
  } catch (e: any) {
    if (isMissingTableError(e, "agent_crm_contacts")) {
      return NextResponse.json({ ok: false, code: "missing_table", error: "Falta migración CRM contacts (agent_crm_contacts)" }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: e?.message || "No se pudo eliminar contacto" }, { status: 500 });
  }
}
