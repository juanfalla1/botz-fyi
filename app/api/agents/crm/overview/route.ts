import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/api/_utils/auth";
import { getServiceSupabase } from "@/app/api/_utils/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Draft = {
  id: string;
  agent_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  company_name: string | null;
  product_name: string | null;
  total_cop: number | null;
  status: "draft" | "sent" | "won" | "lost";
  created_at: string;
  updated_at: string;
};

function normalizePhone(raw: string | null | undefined) {
  return String(raw || "").replace(/\D/g, "");
}

function normalizeText(raw: string | null | undefined) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
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

function contactKeyOf(phoneRaw: string | null | undefined, emailRaw: string | null | undefined) {
  const phone = phoneTail10(phoneRaw);
  const email = String(emailRaw || "").trim().toLowerCase();
  return phone || email;
}

function normalizeContactKey(raw: string | null | undefined) {
  const key = String(raw || "").trim();
  if (!key) return "";
  const digits = key.replace(/\D/g, "");
  if (digits && digits.length >= 7 && digits.length === key.length) return phoneTail10(digits);
  return key.toLowerCase();
}

function classifyIntent(rawText: string | null | undefined) {
  const t = normalizeText(rawText);
  if (!t) return "Sin clasificar";
  if (/(comprar|pedido|orden|pagar|cierre|cerrar|entrega|factura)/.test(t)) return "Listo para cierre";
  if (/(cotiz|cotizacion|pdf|presupuesto|precio|trm|reenviar)/.test(t)) return "Solicita cotizacion/PDF";
  if (/(ficha|datasheet|especificaciones|imagen|foto|brochure)/.test(t)) return "Solicita ficha/imagen";
  if (/(catalogo|productos|info|informacion|modelo|referencia)/.test(t)) return "Explorando opciones";
  return "Sin clasificar";
}

function isQuoteRequestMessage(rawText: string | null | undefined) {
  const t = normalizeText(rawText);
  return /(cotiz|cotizacion|presupuesto|precio|trm|pdf|propuesta|valor final|cuanto queda)/.test(t);
}

function isTechSheetRequestMessage(rawText: string | null | undefined) {
  const t = normalizeText(rawText);
  return /(ficha|ficha tecnica|datasheet|especificaciones|brochure|imagen|foto|catalogo tecnico)/.test(t);
}

function scoreLeadTemperature(args: { status: string; quotesCount: number; intent: string }) {
  const status = String(args.status || "").toLowerCase();
  const intent = normalizeText(args.intent);
  const quotes = Number(args.quotesCount || 0);
  if (status === "won") return "closed_won";
  if (status === "lost") return "closed_lost";
  if (/(listo para cierre|solicita cotizacion\/pdf)/.test(intent) || status === "sent" || quotes >= 2) return "hot";
  if (/(solicita ficha\/imagen|explorando opciones)/.test(intent) || quotes >= 1) return "warm";
  return "cold";
}

function suggestNextAction(statusRaw: string) {
  const s = String(statusRaw || "draft").toLowerCase();
  if (s === "sent") return "Seguimiento de cotizacion enviada";
  if (s === "won") return "Coordinar pago y entrega";
  if (s === "lost") return "Reactivar contacto en 30 dias";
  return "Calificar lead y validar necesidad";
}

function suggestNextActionAt(statusRaw: string, baseAtRaw: string) {
  const s = String(statusRaw || "draft").toLowerCase();
  const base = new Date(baseAtRaw || new Date().toISOString());
  const ts = Number.isFinite(base.getTime()) ? base.getTime() : Date.now();
  let plusMs = 4 * 60 * 60 * 1000;
  if (s === "sent") plusMs = 24 * 60 * 60 * 1000;
  if (s === "won") plusMs = 48 * 60 * 60 * 1000;
  if (s === "lost") plusMs = 30 * 24 * 60 * 60 * 1000;
  return new Date(ts + plusMs).toISOString();
}

export async function GET(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });

  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });

  const ownerId = guard.user.id;

  const { data: ownerAgents, error: agentsErr } = await supabase
    .from("ai_agents")
    .select("id,name")
    .eq("created_by", ownerId)
    .limit(500);

  if (agentsErr) return NextResponse.json({ ok: false, error: agentsErr.message }, { status: 400 });
  const agentIds = Array.isArray(ownerAgents) ? ownerAgents.map((a: any) => String(a.id)).filter(Boolean) : [];
  const agentNameMap = new Map<string, string>(
    (Array.isArray(ownerAgents) ? ownerAgents : []).map((a: any) => [String(a.id), String(a.name || "").trim()])
  );

  const { data: settings, error: settingsErr } = await supabase
    .from("agent_crm_settings")
    .select("id,enabled,stage_labels,contact_fields")
    .eq("created_by", ownerId)
    .maybeSingle();

  if (settingsErr && !(String(settingsErr.message || "").includes("does not exist"))) {
    return NextResponse.json({ ok: false, error: settingsErr.message }, { status: 400 });
  }

  const crmEnabled = settingsErr && String(settingsErr.message || "").includes("does not exist")
    ? false
    : Boolean(settings?.enabled);
  if (!crmEnabled) {
    return NextResponse.json({
      ok: true,
      data: {
        enabled: false,
        summary: {
          contacts: 0,
          opportunities: 0,
          quotes_sent: 0,
          quotes_requested: 0,
          won: 0,
          lost: 0,
          contacts_with_quote_requests: 0,
          contacts_with_tech_sheet_requests: 0,
          total_quotes_requested_cop: 0,
          total_pipeline_cop: 0,
        },
        pipeline: { draft: [], sent: [], won: [], lost: [] },
        contacts: [],
        drafts: [],
      },
    });
  }

  const [{ data: drafts, error: draftsErr }, { data: conversations, error: convErr }, { data: crmContacts, error: crmContactsErr }] = await Promise.all([
    supabase
      .from("agent_quote_drafts")
      .select("id,agent_id,customer_name,customer_email,customer_phone,company_name,product_name,total_cop,status,created_at,updated_at")
      .eq("created_by", ownerId)
      .order("created_at", { ascending: false })
      .limit(800),
    agentIds.length
      ? supabase
          .from("agent_conversations")
          .select("id,agent_id,contact_phone,contact_name,created_at,channel,transcript")
          .in("agent_id", agentIds)
          .order("created_at", { ascending: false })
          .limit(800)
      : Promise.resolve({ data: [], error: null } as any),
    supabase
      .from("agent_crm_contacts")
      .select("id,contact_key,name,email,phone,company,assigned_agent_id,status,next_action,next_action_at,updated_at")
      .eq("created_by", ownerId)
      .order("updated_at", { ascending: false })
      .limit(1200),
  ]);

  if (draftsErr) return NextResponse.json({ ok: false, error: draftsErr.message }, { status: 400 });
  if (convErr) return NextResponse.json({ ok: false, error: convErr.message }, { status: 400 });
  if (crmContactsErr && !isMissingTableError(crmContactsErr, "agent_crm_contacts")) {
    return NextResponse.json({ ok: false, error: crmContactsErr.message }, { status: 400 });
  }

  const safeDrafts: Draft[] = Array.isArray(drafts) ? (drafts as Draft[]) : [];
  const convRows = Array.isArray(conversations) ? conversations : [];

  const byStatus = {
    draft: 0,
    sent: 0,
    won: 0,
    lost: 0,
  };
  const byAgentMap = new Map<string, { agent_id: string; agent_name: string; total: number; sent: number; won: number; lost: number; pipeline_cop: number }>();

  const pipeline = {
    draft: [] as Draft[],
    sent: [] as Draft[],
    won: [] as Draft[],
    lost: [] as Draft[],
  };

  for (const d of safeDrafts) {
    const st = String(d.status || "draft") as keyof typeof byStatus;
    if (st in byStatus) {
      byStatus[st] += 1;
      pipeline[st].push(d);
    }

    const aid = String((d as any).agent_id || "");
    if (aid) {
      const prev = byAgentMap.get(aid) || {
        agent_id: aid,
        agent_name: agentNameMap.get(aid) || aid,
        total: 0,
        sent: 0,
        won: 0,
        lost: 0,
        pipeline_cop: 0,
      };
      prev.total += 1;
      if (st === "sent") prev.sent += 1;
      if (st === "won") prev.won += 1;
      if (st === "lost") prev.lost += 1;
      if (st !== "lost") prev.pipeline_cop += Number(d.total_cop || 0);
      byAgentMap.set(aid, prev);
    }
  }

  const contactsMap = new Map<string, any>();
  const latestConvByPhone = new Map<string, { channel: string; at: string; contact_name: string; last_intent: string }>();
  const intentMetricsByPhone = new Map<string, { quote_requests_count: number; tech_sheet_requests_count: number; last_quote_request_at: string | null; last_tech_sheet_request_at: string | null }>();

  for (const c of convRows as any[]) {
    const phone = phoneTail10(c?.contact_phone);
    if (!phone) continue;
    const prev = latestConvByPhone.get(phone);
    const at = String(c?.created_at || "");
    if (!prev || new Date(at).getTime() > new Date(prev.at).getTime()) {
      const transcript = Array.isArray(c?.transcript) ? c.transcript : [];
      const lastUser = [...transcript].reverse().find((m: any) => String(m?.role || "") === "user");
      const lastIntent = classifyIntent(String(lastUser?.content || ""));
      latestConvByPhone.set(phone, {
        channel: String(c?.channel || "").toLowerCase(),
        at,
        contact_name: String(c?.contact_name || "").trim(),
        last_intent: lastIntent,
      });
    }

    const transcript = Array.isArray(c?.transcript) ? c.transcript : [];
    const metric = intentMetricsByPhone.get(phone) || {
      quote_requests_count: 0,
      tech_sheet_requests_count: 0,
      last_quote_request_at: null,
      last_tech_sheet_request_at: null,
    };
    for (const m of transcript) {
      if (String(m?.role || "") !== "user") continue;
      const text = String(m?.content || "");
      const atMsg = String(m?.timestamp || c?.created_at || "");
      if (isQuoteRequestMessage(text)) {
        metric.quote_requests_count += 1;
        if (!metric.last_quote_request_at || new Date(atMsg).getTime() > new Date(metric.last_quote_request_at).getTime()) {
          metric.last_quote_request_at = atMsg;
        }
      }
      if (isTechSheetRequestMessage(text)) {
        metric.tech_sheet_requests_count += 1;
        if (!metric.last_tech_sheet_request_at || new Date(atMsg).getTime() > new Date(metric.last_tech_sheet_request_at).getTime()) {
          metric.last_tech_sheet_request_at = atMsg;
        }
      }
    }
    intentMetricsByPhone.set(phone, metric);
  }

  const channelSummaryMap = new Map<string, number>();
  for (const c of convRows as any[]) {
    const ch = String(c?.channel || "unknown").toLowerCase();
    channelSummaryMap.set(ch, Number(channelSummaryMap.get(ch) || 0) + 1);
  }

  for (const d of safeDrafts) {
    const phone = normalizePhone(d.customer_phone);
    const email = String(d.customer_email || "").trim().toLowerCase();
    const key = contactKeyOf(phone, email) || `draft:${d.id}`;

    const prev = contactsMap.get(key) || {
      key,
      name: d.customer_name || "",
      email,
      phone: phoneTail10(phone),
      company: d.company_name || "",
      quotes_count: 0,
      quote_requests_count: 0,
      tech_sheet_requests_count: 0,
      total_quoted_cop: 0,
      last_quote_value_cop: 0,
      last_quote_at: null,
      last_activity_at: d.updated_at || d.created_at,
      status: d.status,
      assigned_agent_id: d.agent_id || null,
      assigned_agent_name: d.agent_id ? (agentNameMap.get(String(d.agent_id)) || "") : "",
      last_channel: "",
      last_product: d.product_name || "",
      last_intent: "",
      lead_temperature: "cold",
      last_quote_sent_at: null,
      next_action: "",
      next_action_at: null,
      contact_id: null,
    };

    prev.name = prev.name || d.customer_name || "";
    prev.email = prev.email || email;
    prev.phone = prev.phone || phoneTail10(phone);
    prev.company = prev.company || d.company_name || "";
    prev.quotes_count += 1;
    prev.quote_requests_count += 1;
    prev.total_quoted_cop += Number(d.total_cop || 0);
    const draftAt = String(d.updated_at || d.created_at || "");
    if (!prev.last_quote_at || new Date(draftAt).getTime() >= new Date(String(prev.last_quote_at || "")).getTime()) {
      prev.last_quote_at = draftAt;
      prev.last_quote_value_cop = Number(d.total_cop || 0);
    }
    prev.last_product = prev.last_product || d.product_name || "";
    if (!prev.assigned_agent_id && d.agent_id) {
      prev.assigned_agent_id = d.agent_id;
      prev.assigned_agent_name = agentNameMap.get(String(d.agent_id)) || "";
    }
    if (new Date(d.updated_at || d.created_at).getTime() > new Date(prev.last_activity_at).getTime()) {
      prev.last_activity_at = d.updated_at || d.created_at;
      prev.status = d.status;
      prev.last_product = d.product_name || prev.last_product;
      if (d.agent_id) {
        prev.assigned_agent_id = d.agent_id;
        prev.assigned_agent_name = agentNameMap.get(String(d.agent_id)) || "";
      }
    }

    contactsMap.set(key, prev);
  }

  for (const c of convRows as any[]) {
    const phone = normalizePhone(c?.contact_phone);
    if (!phone) continue;
    const key = phoneTail10(phone);
    const prev = contactsMap.get(key) || {
      key,
      name: "",
      email: "",
      phone: phoneTail10(phone),
      company: "",
      quotes_count: 0,
      quote_requests_count: 0,
      tech_sheet_requests_count: 0,
      total_quoted_cop: 0,
      last_quote_value_cop: 0,
      last_quote_at: null,
      last_activity_at: c?.created_at,
      status: "draft",
      assigned_agent_id: null,
      assigned_agent_name: "",
      last_channel: String(c?.channel || "").toLowerCase(),
      last_product: "",
      last_intent: "",
      lead_temperature: "cold",
      last_quote_sent_at: null,
      next_action: "",
      next_action_at: null,
      contact_id: null,
    };
    if (new Date(c?.created_at).getTime() > new Date(prev.last_activity_at).getTime()) {
      prev.last_activity_at = c?.created_at;
      prev.last_channel = String(c?.channel || "").toLowerCase();
      prev.name = String(c?.contact_name || prev.name || "").trim();
    }
    contactsMap.set(key, prev);
  }

  for (const cc of Array.isArray(crmContacts) ? crmContacts : []) {
    const key = normalizeContactKey((cc as any)?.contact_key || contactKeyOf((cc as any)?.phone, (cc as any)?.email) || "");
    if (!key) continue;
    const prev = contactsMap.get(key) || {
      key,
      name: "",
      email: "",
      phone: "",
      company: "",
      quotes_count: 0,
      quote_requests_count: 0,
      tech_sheet_requests_count: 0,
      total_quoted_cop: 0,
      last_quote_value_cop: 0,
      last_quote_at: null,
      last_activity_at: (cc as any)?.updated_at || new Date().toISOString(),
      status: String((cc as any)?.status || "draft"),
      assigned_agent_id: (cc as any)?.assigned_agent_id || null,
      assigned_agent_name: (cc as any)?.assigned_agent_id ? (agentNameMap.get(String((cc as any)?.assigned_agent_id)) || "") : "",
      last_channel: "",
      last_product: "",
      last_intent: "",
      lead_temperature: "cold",
      last_quote_sent_at: null,
      next_action: String((cc as any)?.next_action || ""),
      next_action_at: (cc as any)?.next_action_at || null,
      contact_id: (cc as any)?.id || null,
    };

    prev.name = String((cc as any)?.name || prev.name || "");
    prev.email = String((cc as any)?.email || prev.email || "");
    prev.phone = phoneTail10((cc as any)?.phone || prev.phone || "");
    prev.company = String((cc as any)?.company || prev.company || "");
    prev.status = String((cc as any)?.status || prev.status || "draft");
    prev.assigned_agent_id = (cc as any)?.assigned_agent_id || prev.assigned_agent_id || null;
    prev.assigned_agent_name = prev.assigned_agent_id ? (agentNameMap.get(String(prev.assigned_agent_id)) || prev.assigned_agent_name || "") : "";
    prev.next_action = String((cc as any)?.next_action || prev.next_action || "");
    prev.next_action_at = (cc as any)?.next_action_at || prev.next_action_at || null;
    prev.contact_id = (cc as any)?.id || prev.contact_id || null;
    contactsMap.set(key, prev);
  }

  const latestSentByKey = new Map<string, string>();
  for (const d of safeDrafts) {
    const st = String(d.status || "").toLowerCase();
    if (!(st === "sent" || st === "won")) continue;
    const key = contactKeyOf(d.customer_phone, d.customer_email);
    if (!key) continue;
    const at = String(d.updated_at || d.created_at || "");
    const prevAt = latestSentByKey.get(key);
    if (!prevAt || new Date(at).getTime() > new Date(prevAt).getTime()) {
      latestSentByKey.set(key, at);
    }
  }

  for (const contact of contactsMap.values()) {
    const phone = phoneTail10(String(contact.phone || ""));
    if (!phone) continue;
    const latest = latestConvByPhone.get(phone);
    if (latest?.channel) {
      contact.last_channel = latest.channel;
    }
    if (latest?.contact_name && !String(contact.name || "").trim()) {
      contact.name = latest.contact_name;
    }
    if (latest?.last_intent) {
      contact.last_intent = latest.last_intent;
    }

    const metrics = intentMetricsByPhone.get(phone);
    if (metrics) {
      contact.quote_requests_count = Math.max(Number(contact.quote_requests_count || 0), Number(metrics.quote_requests_count || 0));
      contact.tech_sheet_requests_count = Number(metrics.tech_sheet_requests_count || 0);
    }

    const sentAt = latestSentByKey.get(String(contact.key || ""));
    if (sentAt) contact.last_quote_sent_at = sentAt;

    contact.lead_temperature = scoreLeadTemperature({
      status: String(contact.status || "draft"),
      quotesCount: Number(contact.quotes_count || 0),
      intent: String(contact.last_intent || ""),
    });
  }

  const contacts = Array.from(contactsMap.values())
    .map((c: any) => {
      const phone = phoneTail10(String(c.phone || ""));
      const hasName = Boolean(String(c.name || "").trim());
      const status = String(c.status || "draft");
      const nextAction = String(c.next_action || "").trim() || suggestNextAction(status);
      const nextActionAt = c.next_action_at || suggestNextActionAt(status, String(c.last_activity_at || ""));
      return {
        ...c,
        phone,
        status,
        name: hasName ? c.name : (phone ? `Contacto ${phone.slice(-4)}` : ""),
        next_action: nextAction,
        next_action_at: nextActionAt,
        last_intent: String(c.last_intent || "Sin clasificar"),
        lead_temperature: String(c.lead_temperature || "cold"),
        last_quote_sent_at: c.last_quote_sent_at || null,
        quote_requests_count: Number(c.quote_requests_count || c.quotes_count || 0),
        tech_sheet_requests_count: Number(c.tech_sheet_requests_count || 0),
        total_quoted_cop: Number(c.total_quoted_cop || 0),
        last_quote_value_cop: Number(c.last_quote_value_cop || 0),
        last_quote_at: c.last_quote_at || null,
      };
    })
    .filter((c: any) => {
      const hasIdentity = Boolean(String(c.name || "").trim() || String(c.email || "").trim() || String(c.company || "").trim());
      const hasCommercialData = Number(c.quotes_count || 0) > 0 || Boolean(String(c.next_action || "").trim()) || Boolean(c.assigned_agent_id);
      return hasIdentity || hasCommercialData;
    })
    .sort(
    (a, b) => new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime()
  );

  const summary = {
    contacts: contacts.length,
    opportunities: safeDrafts.length,
    quotes_sent: byStatus.sent,
    quotes_requested: safeDrafts.length,
    won: byStatus.won,
    lost: byStatus.lost,
    contacts_with_quote_requests: contacts.filter((c: any) => Number(c.quote_requests_count || 0) > 0).length,
    contacts_with_tech_sheet_requests: contacts.filter((c: any) => Number(c.tech_sheet_requests_count || 0) > 0).length,
    total_quotes_requested_cop: safeDrafts.reduce((acc, d) => acc + Number(d.total_cop || 0), 0),
    total_pipeline_cop: safeDrafts
      .filter((d) => d.status !== "lost")
      .reduce((acc, d) => acc + Number(d.total_cop || 0), 0),
  };

  const funnel = [
    { key: "draft", label: "Nuevo", value: byStatus.draft },
    { key: "sent", label: "Cotizacion enviada", value: byStatus.sent },
    { key: "won", label: "Ganado", value: byStatus.won },
    { key: "lost", label: "Perdido", value: byStatus.lost },
  ];

  return NextResponse.json({
    ok: true,
    data: {
      enabled: true,
      summary,
      pipeline,
      contacts,
      drafts: safeDrafts,
      agents: Array.from(agentNameMap.entries()).map(([id, name]) => ({ id, name })),
      channel_summary: Array.from(channelSummaryMap.entries()).map(([channel, count]) => ({ channel, count })),
      by_agent: Array.from(byAgentMap.values()).sort((a, b) => b.pipeline_cop - a.pipeline_cop),
      funnel,
    },
  });
}
