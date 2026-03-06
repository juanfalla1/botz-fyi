import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/api/_utils/auth";
import { getServiceSupabase } from "@/app/api/_utils/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizePhone(raw: string | null | undefined) {
  return String(raw || "").replace(/\D/g, "");
}

function contactKeyOf(phoneRaw: string | null | undefined, emailRaw: string | null | undefined) {
  const phone = normalizePhone(phoneRaw);
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

async function resolveOrCreateContact(supabase: any, ownerId: string, args: { phone?: string; email?: string; name?: string; company?: string }) {
  const phone = normalizePhone(args.phone);
  const email = String(args.email || "").trim().toLowerCase();
  const contactKey = contactKeyOf(phone, email);
  if (!contactKey) throw new Error("Missing contact key");

  const { data: existing } = await supabase
    .from("agent_crm_contacts")
    .select("id,contact_key,name,email,phone,company,assigned_agent_id,status,next_action,next_action_at,updated_at")
    .eq("created_by", ownerId)
    .eq("contact_key", contactKey)
    .maybeSingle();

  if (existing) return existing;

  const payload = {
    tenant_id: null,
    created_by: ownerId,
    contact_key: contactKey,
    name: args.name || null,
    email: email || null,
    phone: phone || null,
    company: args.company || null,
    status: "draft",
  };

  const { data: inserted, error } = await supabase
    .from("agent_crm_contacts")
    .insert(payload)
    .select("id,contact_key,name,email,phone,company,assigned_agent_id,status,next_action,next_action_at,updated_at")
    .single();
  if (error) throw new Error(error.message);
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

  let draftsQuery = supabase
    .from("agent_quote_drafts")
    .select("id,agent_id,customer_name,customer_email,customer_phone,company_name,product_name,total_cop,trm_rate,status,payload,created_at,updated_at")
    .eq("created_by", ownerId)
    .order("created_at", { ascending: false })
    .limit(80);

  if (qPhone && qEmail) {
    draftsQuery = draftsQuery.or(`customer_phone.eq.${qPhone},customer_email.eq.${qEmail}`);
  } else if (qPhone) {
    draftsQuery = draftsQuery.eq("customer_phone", qPhone);
  } else {
    draftsQuery = draftsQuery.eq("customer_email", qEmail);
  }

  const { data: drafts, error: draftsErr } = await draftsQuery;
  if (draftsErr) return NextResponse.json({ ok: false, error: draftsErr.message }, { status: 400 });

  let convRows: any[] = [];
  if (agentIds.length && qPhone) {
    const { data: convData, error: convErr } = await supabase
      .from("agent_conversations")
      .select("id,agent_id,contact_phone,contact_name,channel,status,message_count,transcript,created_at")
      .in("agent_id", agentIds)
      .eq("contact_phone", qPhone)
      .order("created_at", { ascending: false })
      .limit(50);
    if (convErr) return NextResponse.json({ ok: false, error: convErr.message }, { status: 400 });
    convRows = Array.isArray(convData) ? convData : [];
  }

  const timeline: Array<{ at: string; kind: string; text: string }> = [];

  for (const d of Array.isArray(drafts) ? drafts : []) {
    timeline.push({
      at: String((d as any).created_at || ""),
      kind: "quote",
      text: `Cotización ${String((d as any).product_name || "producto")}: COP ${Number((d as any).total_cop || 0).toLocaleString("es-CO")} (${String((d as any).status || "draft")})`,
    });
  }

  for (const c of convRows) {
    const transcript = Array.isArray(c?.transcript) ? c.transcript : [];
    const lastMsgs = transcript.slice(-4);
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

  if (!phone && !email) {
    return NextResponse.json({ ok: false, error: "Missing phone or email" }, { status: 400 });
  }

  try {
    const contact = await resolveOrCreateContact(supabase, ownerId, { phone, email, name, company });
    const patch: any = {};
    if (name) patch.name = name;
    if (email) patch.email = email;
    if (phone) patch.phone = phone;
    if (company) patch.company = company;
    if (body?.assigned_agent_id !== undefined) patch.assigned_agent_id = body.assigned_agent_id || null;
    if (body?.status !== undefined) patch.status = String(body.status || "draft");
    if (body?.next_action !== undefined) patch.next_action = String(body.next_action || "").trim() || null;
    if (body?.next_action_at !== undefined) patch.next_action_at = body.next_action_at ? String(body.next_action_at) : null;

    const { data, error } = await supabase
      .from("agent_crm_contacts")
      .update(patch)
      .eq("id", contact.id)
      .eq("created_by", ownerId)
      .select("id,contact_key,name,email,phone,company,assigned_agent_id,status,next_action,next_action_at,updated_at")
      .single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
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
