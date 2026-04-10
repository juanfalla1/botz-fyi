import { NextResponse } from "next/server";
import OpenAI from "openai";
import { jsPDF } from "jspdf";
import fs from "node:fs";
import path from "node:path";
import { getServiceSupabase } from "@/app/api/_utils/supabase";
import { checkEntitlementAccess, consumeEntitlementCredits, logUsageEvent } from "@/app/api/_utils/entitlement";
import { evolutionService } from "../../../../../../lib/services/evolution.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATALOG_REFERENCE_URL = "https://balanzasybasculas.com.co/";
const CATALOG_REFERENCE_SHARE_URL = "https://share.google/cE6wPPEGCH3vytJMm";
const DATASHEET_REPOSITORY_URL = String(
  process.env.OHAUS_DATASHEET_DRIVE_URL ||
  "https://drive.google.com/drive/folders/15Ym8V02ds5iN24qoF855RULtQYcXmopc?usp=sharing"
).trim();
const LOCAL_DATASHEET_DIR = String(
  process.env.OHAUS_LOCAL_DATASHEET_DIR ||
  path.join(process.cwd(), "app", "api", "agents", "channels", "evolution", "webhook", "Ohaus", "Cotizaciones")
).trim();
const QUOTE_LOCAL_IMAGE_DIR = String(
  process.env.WHATSAPP_QUOTE_LOCAL_IMAGE_DIR ||
  path.join(process.cwd(), "app", "api", "agents", "channels", "evolution", "webhook-v2", "assets")
).trim();
const LEGACY_ENABLE_RUNTIME_PDF_PARSE_FOR_QUOTE = process.env.WHATSAPP_QUOTE_PARSE_PDF_RUNTIME;
const ENABLE_RUNTIME_PDF_IMAGE_PARSE_FOR_QUOTE = String(
  process.env.WHATSAPP_QUOTE_PARSE_PDF_IMAGE_RUNTIME ?? LEGACY_ENABLE_RUNTIME_PDF_PARSE_FOR_QUOTE ?? "false"
).toLowerCase() === "true";
const ENABLE_RUNTIME_PDF_TEXT_PARSE_FOR_QUOTE = String(
  process.env.WHATSAPP_QUOTE_PARSE_PDF_TEXT_RUNTIME ?? "false"
).toLowerCase() === "true";
const ENABLE_QUOTE_PRODUCT_IMAGE = String(process.env.WHATSAPP_QUOTE_EMBED_PRODUCT_IMAGE || "true").toLowerCase() === "true";
const STRICT_WHATSAPP_MODE = String(process.env.WHATSAPP_STRICT_MODE || "true").toLowerCase() !== "false";
const MAX_WHATSAPP_DOC_BYTES = Number(process.env.WHATSAPP_DOC_MAX_BYTES || 8 * 1024 * 1024);
const QUOTE_FLOW_VERSION = "quote-flow-2026-03-26-stability-hotfix-03";
const ALLOWED_BRAND_KEYS = ["ohaus"];
const ALLOWED_NAME_KEYS = ["explorer", "adventurer", "pioneer", "ranger", "defender", "valor", "scout", "mb120", "mb90", "mb27", "mb23", "aquasearcher", "frontier"];
const ALLOWED_CATEGORY_KEYS = ["balanzas", "basculas", "analizador_humedad", "electroquimica", "equipos_laboratorio", "documentos"];
const OFFICIAL_CATALOG_CATEGORIES = [
  "Balanzas (Explorer, Adventurer, Pioneer, PR, Scout)",
  "Basculas (Ranger, Defender, Valor)",
  "Equipos de laboratorio (centrifugas, agitadores, mezcladores, planchas)",
  "Analizadores de humedad (MB120, MB90, MB27, MB23)",
  "Electroquimica (medidores y electrodos)",
  "Impresoras, pesas patron y accesorios",
];

async function upsertBotEvent(_payload: any): Promise<void> {
  return;
}

function isAllowedCatalogRow(row: any) {
  const brand = normalizeText(String(row?.brand || ""));
  const name = normalizeText(String(row?.name || ""));
  const category = normalizeText(String(row?.category || ""));
  if (!name) return false;
  if (ALLOWED_BRAND_KEYS.some((k) => brand.includes(k))) return true;
  if (ALLOWED_CATEGORY_KEYS.some((k) => category === k || category.startsWith(`${k}_`))) return true;
  return ALLOWED_NAME_KEYS.some((k) => name.includes(k));
}

function catalogSubcategory(row: any): string {
  const payload = row?.source_payload && typeof row.source_payload === "object" ? row.source_payload : {};
  return normalizeText(String((payload as any)?.subcategory || ""));
}

function isDocumentCatalogRow(row: any): boolean {
  const category = normalizeText(String(row?.category || ""));
  const subcategory = catalogSubcategory(row);
  const name = normalizeText(String(row?.name || ""));
  const productUrl = normalizeText(String(row?.product_url || ""));
  if (category === "documentos") return true;
  if (subcategory.startsWith("documentos")) return true;
  if (name.includes("datasheet") || name.includes("data sheet") || name.includes("ficha")) return true;
  if (productUrl.includes(".pdf")) return true;
  return false;
}

function isCommercialCatalogRow(row: any): boolean {
  return isAllowedCatalogRow(row) && !isDocumentCatalogRow(row);
}

function estimateTokens(text: string) {
  return Math.max(1, Math.ceil(String(text || "").length / 4));
}

function normalizePhone(raw: string) {
  const base = String(raw || "").split(":")[0].split("@")[0];
  const digits = base.replace(/\D/g, "");
  
  if (raw.includes("@lid") && digits) {
    return digits;
  }
  
  return digits;
}

function normalizeRealCustomerPhone(raw: string): string {
  const n = normalizePhone(raw || "");
  if (!n) return "";
  if (n.length === 10) return n;
  if (n.length === 12 && n.startsWith("57")) return n;
  if (n.length === 11 && n.startsWith("1")) return n;
  return "";
}

async function mirrorAdvisorMeetingToAvanza(args: {
  ownerId: string;
  tenantId?: string | null;
  externalRef: string;
  phone: string;
  customerName: string;
  advisor?: string;
  meetingAt: string;
  meetingLabel?: string;
  source: string;
}) {
  const meetingAt = String(args.meetingAt || "").trim();
  if (!meetingAt) return;
  const phone = normalizePhone(args.phone || "");
  if (!phone) return;

  await upsertBotEvent({
    ownerId: String(args.ownerId || ""),
    tenantId: String(args.tenantId || ""),
    externalKey: `evo:${args.externalRef}:${phone}:${meetingAt}`,
    channel: "whatsapp",
    phone,
    customerName: String(args.customerName || ""),
    advisor: String(args.advisor || "Asesor comercial"),
    meetingAt,
    meetingLabel: String(args.meetingLabel || "Cita con asesor"),
    status: "programada",
    source: String(args.source || "evolution_webhook"),
    notes: "Agendada desde bot por flujo de cita con asesor.",
  });
}

function isLidCandidate(raw: string): boolean {
  const value = String(raw || "").toLowerCase();
  return value.includes("@lid") || value.endsWith(":lid");
}

function pickBestPhone(candidates: any[]): string {
  const raws = candidates.map((v) => String(v || "").trim()).filter(Boolean);
  if (!raws.length) return "";

  const jidPreferred = raws.find((v) => /@s\.whatsapp\.net$/i.test(v) || /@c\.us$/i.test(v));
  if (jidPreferred) return normalizePhone(jidPreferred);

  const parsedEntries = raws
    .map((v) => ({ raw: v, phone: normalizePhone(v), isLid: isLidCandidate(v) }))
    .filter((v) => Boolean(v.phone));

  const nonLid = parsedEntries.filter((v) => !v.isLid).map((v) => v.phone);
  const lid = parsedEntries.filter((v) => v.isLid).map((v) => v.phone);
  const parsed = [...nonLid, ...lid];

  const medium = parsed.find((n) => n.length >= 10 && n.length <= 15);
  if (medium) return medium;

  const long = parsed.find((n) => n.length >= 16);
  return long || parsed[0] || "";
}

function preferredInboundPhone(payload: any, item: any): string {
  const key = item?.key || {};

  // Priorizar SIEMPRE remoteJid/participant (numero real del cliente en inbound).
  const rawPrimary = [
    key?.remoteJid,
    item?.data?.key?.remoteJid,
    payload?.data?.key?.remoteJid,
    key?.participant,
    item?.data?.key?.participant,
    payload?.data?.key?.participant,
  ];

  const primary = pickBestPhone(rawPrimary);
  if (primary) return primary;

  // Fallback solo si no hubo remoteJid/participant.
  const firstChoice = pickBestPhone([
    item?.from,
    payload?.from,
    item?.jid,
    payload?.jid,
  ]);
  if (firstChoice) return firstChoice;

  return "";
}

function boolish(value: any): boolean {
  if (value === true || value === 1) return true;
  const v = String(value ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function findTextCandidate(node: any, depth = 0): string {
  if (depth > 3 || node == null) return "";
  if (typeof node === "string") return node.trim();
  if (typeof node !== "object") return "";

  const directKeys = ["conversation", "text", "body", "content", "caption", "title", "selectedDisplayText"];
  for (const k of directKeys) {
    const v = (node as any)?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }

  for (const v of Object.values(node)) {
    const found = findTextCandidate(v, depth + 1);
    if (found) return found;
  }
  return "";
}

function unwrapMessage(raw: any): any {
  if (!raw || typeof raw !== "object") return raw;

  let msg = raw;
  for (let i = 0; i < 4; i++) {
    if (msg?.ephemeralMessage?.message) {
      msg = msg.ephemeralMessage.message;
      continue;
    }
    if (msg?.viewOnceMessage?.message) {
      msg = msg.viewOnceMessage.message;
      continue;
    }
    if (msg?.viewOnceMessageV2?.message) {
      msg = msg.viewOnceMessageV2.message;
      continue;
    }
    if (msg?.viewOnceMessageV2Extension?.message) {
      msg = msg.viewOnceMessageV2Extension.message;
      continue;
    }
    break;
  }

  return msg;
}

function extractTextFromMessage(msg: any, messageType?: string): string {
  if (typeof msg === "string") return msg.trim();
  const m = unwrapMessage(msg);
  const typeKey = String(messageType || "").trim();

  const byType = typeKey && m && typeof m === "object" ? m?.[typeKey] : null;

  return String(
    m?.conversation ||
      m?.text ||
      m?.body ||
      m?.content ||
      m?.caption ||
      m?.extendedTextMessage?.text ||
      m?.imageMessage?.caption ||
      m?.videoMessage?.caption ||
      m?.documentMessage?.caption ||
      m?.buttonsResponseMessage?.selectedDisplayText ||
      m?.listResponseMessage?.title ||
      byType?.text ||
      byType?.caption ||
      byType?.selectedDisplayText ||
      byType?.title ||
      findTextCandidate(m) ||
      ""
  ).trim();
}

type InboundEvent = {
  instance: string;
  from: string;
  fromIsLid?: boolean;
  jidCandidates?: string[];
  alternates?: string[];
  text: string;
  pushName?: string;
  messageId?: string;
  source?: string;
};

type ClassifiedIntent = {
  intent:
    | "greeting"
    | "guided_need_discovery"
    | "consultar_categoria"
    | "consultar_producto"
    | "solicitar_ficha"
    | "solicitar_cotizacion"
    | "consultar_trm"
    | "consultar_historial"
    | "despedida"
    | "aclaracion";
  category: string | null;
  product: string | null;
  request_datasheet: boolean;
  request_quote: boolean;
  request_trm: boolean;
  needs_clarification: boolean;
};

function inboundJidCandidates(payload: any, item: any): string[] {
  const key = item?.key || {};
  const values = [
    key?.remoteJid,
    item?.data?.key?.remoteJid,
    payload?.data?.key?.remoteJid,
    key?.participant,
    item?.data?.key?.participant,
    payload?.data?.key?.participant,
    item?.jid,
    payload?.jid,
    payload?.remoteJid,
  ]
    .map((v) => String(v || "").trim())
    .filter((v) => v.includes("@"));

  return Array.from(new Set(values));
}

function inboundPhoneCandidates(payload: any, item: any): string[] {
  const key = item?.key || {};

  const ranked = [
    key?.remoteJid,
    item?.data?.key?.remoteJid,
    payload?.data?.key?.remoteJid,
    key?.participant,
    item?.data?.key?.participant,
    payload?.data?.key?.participant,
    item?.from,
    payload?.from,
    item?.jid,
    payload?.jid,
  ]
    .map((v) => {
      const raw = String(v || "");
      return { phone: normalizePhone(raw), isLid: isLidCandidate(raw) };
    })
    .filter((v) => v.phone.length >= 10 && v.phone.length <= 15)
    .sort((a, b) => Number(a.isLid) - Number(b.isLid))
    .map((v) => v.phone);

  return Array.from(new Set(ranked));
}

function extractInbound(payload: any): InboundEvent | null {
  const event = String(payload?.event || payload?.type || payload?.eventName || "").toLowerCase();
  const hasUpsertEvent = /messages?[._-]?upsert/.test(event);
  const hasUpdateEvent = /messages?[._-]?update/.test(event);

  const instance = String(
    payload?.instance || payload?.instanceName || payload?.data?.instance || payload?.data?.instanceId || ""
  ).trim();

  if (
    !hasUpsertEvent &&
    !hasUpdateEvent &&
    !payload?.message &&
    !payload?.messages &&
    !payload?.data?.message &&
    !payload?.data?.messages
  ) {
    return null;
  }

  // Para messages.update, verificar que sea un mensaje real (no solo ACK de entrega)
  if (hasUpdateEvent && !payload?.data?.message && !payload?.data?.messages && !payload?.message) {
    const fromMe = payload?.data?.fromMe ?? payload?.fromMe;
    console.log("[evolution-webhook] messages.update check", { 
      fromMe, 
      hasMessage: !!payload?.data?.message,
      hasMessages: !!payload?.data?.messages,
      dataKeys: payload?.data ? Object.keys(payload.data) : []
    });
    if (fromMe === true || fromMe === "true") {
      console.log("[evolution-webhook] ignoring delivery ACK");
      return null;
    }
    
    // Para messages.update con fromMe: false, verificar si hay datos de mensaje
    const updateData = payload?.data || {};
    const hasMessageData = updateData?.message || updateData?.messages || updateData?.text || updateData?.body;
    if (!hasMessageData) {
      console.log("[evolution-webhook] ignoring messages.update without message content");
      return null;
    }
  }

  const rawData = payload?.data || payload?.payload || payload;
  const candidates = Array.isArray(rawData)
    ? rawData
    : Array.isArray(rawData?.messages)
      ? rawData.messages
      : Array.isArray(rawData?.data)
        ? rawData.data
      : rawData
        ? [rawData]
        : [];

  for (const item of candidates) {
    const key = item?.key || {};
    const source = String(item?.source || item?.data?.source || payload?.data?.source || payload?.source || "").toLowerCase();
    if (source === "api" || source === "outbound" || source === "server") continue;

    const fromMe = boolish(key?.fromMe ?? item?.fromMe ?? item?.data?.key?.fromMe ?? payload?.data?.fromMe ?? payload?.fromMe);
    if (fromMe) continue;

    const orderedCandidates = inboundPhoneCandidates(payload, item);
    const jidCandidates = inboundJidCandidates(payload, item);
    const preferred = String(preferredInboundPhone(payload, item)).trim();
    const rawPrimaryRemote = [
      key?.remoteJid,
      item?.data?.key?.remoteJid,
      payload?.data?.key?.remoteJid,
      key?.participant,
      item?.data?.key?.participant,
      payload?.data?.key?.participant,
    ]
      .map((v) => String(v || "").trim())
      .find(Boolean) || "";
    const preferredIsLid = isLidCandidate(rawPrimaryRemote);
    const remoteJid = preferred && preferred.length >= 10 && preferred.length <= 15
      ? preferred
      : (orderedCandidates[0] || "");
    if (!remoteJid) continue;

    const from = normalizePhone(String(remoteJid).split("@")[0] || "");
    
    // Para messages.update, el mensaje puede estar en payload.data.message
    const messageData = item?.message || item?.data?.message || item?.data || payload?.data?.message || payload?.message || {};
    const typeHint = String(item?.messageType || item?.data?.messageType || messageData?.messageType || "").trim();
    const text = String(
      extractTextFromMessage(messageData, typeHint) ||
      item?.text ||
      item?.body ||
      item?.content ||
      item?.data?.text ||
      item?.data?.body ||
      item?.data?.content ||
      payload?.data?.text ||
      payload?.data?.body ||
      payload?.text ||
      payload?.body ||
      ""
    ).trim();
    if (!from || !text) continue;

    const pushName = String(item?.pushName || item?.data?.pushName || payload?.data?.pushName || "").trim();
    const messageId = String(key?.id || item?.id || item?.data?.key?.id || payload?.data?.messageId || "").trim();

    return {
      instance,
      from,
      fromIsLid: preferredIsLid && from === normalizePhone(rawPrimaryRemote),
      jidCandidates,
      alternates: orderedCandidates.filter((p) => p !== from),
      text,
      pushName: pushName || undefined,
      messageId: messageId || undefined,
      source: source || undefined,
    };
  }

  return null;
}

async function persistConversationTurn(
  supabase: any,
  params: {
    agentId: string;
    ownerId: string;
    tenantId?: string | null;
    from: string;
    pushName?: string;
    inboundText: string;
    outboundText: string;
    messageId?: string;
    memory?: Record<string, any>;
    contactName?: string;
  }
) {
  const nowIso = new Date().toISOString();
  const {
    agentId,
    ownerId,
    tenantId = null,
    from,
    pushName,
    inboundText,
    outboundText,
    messageId,
    memory,
    contactName,
  } = params;

  const fromNorm = normalizePhone(from || "");
  const fromTail = phoneTail10(from || "");
  const contactFilter = fromTail
    ? `contact_phone.eq.${fromNorm},contact_phone.like.%${fromTail}`
    : `contact_phone.eq.${fromNorm}`;

  const { data: existing } = await supabase
    .from("agent_conversations")
    .select("id,transcript,message_count,metadata")
    .eq("agent_id", agentId)
    .eq("channel", "whatsapp")
    .or(contactFilter)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextItems = [
    { role: "user", content: inboundText, timestamp: nowIso },
    { role: "assistant", content: outboundText, timestamp: nowIso },
  ];

  if (existing?.id) {
    const currentTranscript = Array.isArray(existing.transcript) ? existing.transcript : [];
    const currentMeta = existing.metadata && typeof existing.metadata === "object" ? existing.metadata : {};

    if (messageId && String(currentMeta?.last_inbound_message_id || "") === messageId) {
      return;
    }

    const mergedTranscript = [...currentTranscript, ...nextItems].slice(-80);
    const currentCount = Number(existing.message_count || 0) || 0;
    await supabase
      .from("agent_conversations")
      .update({
        ...(contactName ? { contact_name: contactName } : {}),
        transcript: mergedTranscript,
        message_count: currentCount + 2,
        status: "completed",
        ended_at: nowIso,
        metadata: {
          ...currentMeta,
          owner_id: ownerId,
          last_inbound_message_id: messageId || currentMeta?.last_inbound_message_id || null,
          whatsapp_memory: {
            ...(currentMeta?.whatsapp_memory && typeof currentMeta.whatsapp_memory === "object" ? currentMeta.whatsapp_memory : {}),
            ...(memory && typeof memory === "object" ? memory : {}),
            updated_at: nowIso,
          },
        },
      })
      .eq("id", existing.id);
    return;
  }

  await supabase.from("agent_conversations").insert({
    agent_id: agentId,
    tenant_id: tenantId || null,
    contact_name: contactName || pushName || from,
    contact_phone: fromNorm || from,
    channel: "whatsapp",
    status: "completed",
    message_count: 2,
    duration_seconds: 0,
    credits_used: 0,
    transcript: nextItems,
    metadata: {
      owner_id: ownerId,
      source: "evolution_webhook",
      last_inbound_message_id: messageId || null,
      whatsapp_memory: {
        ...(memory && typeof memory === "object" ? memory : {}),
        updated_at: nowIso,
      },
    },
    started_at: nowIso,
    ended_at: nowIso,
  });
}

async function reserveIncomingMessage(
  supabase: any,
  args: {
    provider: string;
    providerMessageId: string;
    instance?: string;
    fromPhone?: string;
    payload?: any;
  }
): Promise<{ ok: boolean; duplicate: boolean }> {
  const providerMessageId = String(args.providerMessageId || "").trim();
  if (!providerMessageId) return { ok: true, duplicate: false };

  const { error } = await supabase.from("incoming_messages").insert({
    provider: String(args.provider || "evolution").trim() || "evolution",
    provider_message_id: providerMessageId,
    instance_name: String(args.instance || "").trim() || null,
    from_phone: String(args.fromPhone || "").trim() || null,
    payload: args.payload && typeof args.payload === "object" ? args.payload : null,
    status: "received",
  });

  if (!error) return { ok: true, duplicate: false };

  const code = String((error as any)?.code || "").trim();
  const msg = String((error as any)?.message || "").toLowerCase();
  if (code === "23505" || msg.includes("duplicate key") || msg.includes("unique constraint")) {
    return { ok: true, duplicate: true };
  }

  if (msg.includes("relation") && msg.includes("incoming_messages")) {
    return { ok: true, duplicate: false };
  }

  console.warn("[evolution-webhook] reserve incoming failed", error?.message || error);
  return { ok: false, duplicate: false };
}

function summarizeInboundAttempt(payload: any) {
  const d = payload?.data || {};
  const key = d?.key || {};
  const message = d?.message || payload?.message || {};
  const remoteJid = String(key?.remoteJid || key?.participant || d?.from || payload?.sender || "");
  const fromMe = boolish(key?.fromMe);
  const messageType = String(d?.messageType || payload?.messageType || "");
  const text = extractTextFromMessage(message, messageType) || findTextCandidate(message);
  const messageKeys = message && typeof message === "object" ? Object.keys(message).slice(0, 8) : [];

  return {
    fromMe,
    remoteJid,
    messageType,
    hasText: Boolean(String(text || "").trim()),
    messageKeys,
    source: String(d?.source || payload?.source || ""),
  };
}

function buildDocumentContext(message: string, files: { name: string; content: string }[]) {
  if (!files.length) return "";
  const terms = Array.from(
    new Set(
      String(message || "")
        .toLowerCase()
        .split(/[^a-z0-9áéíóúñü]+/i)
        .map((t) => t.trim())
        .filter((t) => t.length >= 4)
    )
  ).slice(0, 8);

  const ranked = files
    .map((f) => {
      const lc = f.content.toLowerCase();
      const score = terms.reduce((acc, t) => (lc.includes(t) ? acc + 1 : acc), 0);
      return { ...f, score };
    })
    .sort((a, b) => b.score - a.score);

  const selected = ranked.filter((f) => f.score > 0).slice(0, 3);
  const fallback = selected.length ? selected : ranked.slice(0, 2);

  const blocks = fallback.map((f) => {
    const lc = f.content.toLowerCase();
    const firstHit = terms.map((t) => lc.indexOf(t)).find((i) => i >= 0) ?? -1;
    const start = firstHit >= 0 ? Math.max(0, firstHit - 700) : 0;
    const end = Math.min(f.content.length, start + 1800);
    const excerpt = f.content.slice(start, end).trim();
    return `\n--- ${f.name} ---\n${excerpt}`;
  });

  return `\n\nDocumentos indexados (extractos):\n${blocks.join("\n")}`;
}

function normalizeText(v: string) {
  return String(v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isQuoteDraftStatusConstraintError(err: any): boolean {
  const msg = String(err?.message || "").toLowerCase();
  return msg.includes("agent_quote_drafts_status_check") || (msg.includes("check constraint") && msg.includes("agent_quote_drafts"));
}

function appendQuoteClosurePrompt(text: string): string {
  const base = String(text || "").trim();
  const prompt = [
    "Envio de cotización y ficha técnica",
    "De acuerdo con la información suministrada, te compartimos la cotización junto con la ficha técnica del equipo para tu revisión.",
    "",
    "¿Deseas saber algo más o recibir asesoría adicional? Con gusto te apoyamos 😊",
    "",
    "Recuerda que estás cotizando con Avanza International Group, distribuidores de la marca OHAUS, líder en el mercado, lo que te garantiza un equipo con la más alta tecnología, precisión y respaldo.",
    "",
    "Si tu equipo es para entrega en Bogotá o Medellín, te obsequiamos la entrega, instalación y capacitación. Para otras ciudades, el envío debe ser asumido por el cliente, pero te acompañamos con instalación y capacitación virtual.",
  ].join("\n");
  if (!base) return prompt;
  const t = normalizeText(base);
  if (/(envio de cotizacion y ficha tecnica|deseas saber algo mas|marca ohaus|instalacion y capacitacion virtual)/.test(t)) return base;
  return `${base}\n\n${prompt}`;
}

function appendAdvisorAppointmentPrompt(text: string): string {
  const base = String(text || "").trim();
  if (!base) return "Si prefieres, también puedo agendar una cita con un asesor humano para cerrar la compra. Escribe: cita.";
  const t = normalizeText(base);
  if (/(agendar una cita|asesor humano|cerrar la compra|escribe:\s*cita)/.test(t)) return base;
  return `${base}\nSi prefieres, también puedo agendar una cita con un asesor humano para cerrar la compra. Escribe: cita.`;
}

function buildGuidedRecoveryMessage(args: {
  awaiting: string;
  rememberedProduct?: string;
  hasPendingFamilies?: boolean;
  hasPendingModels?: boolean;
  inboundText?: string;
}): string {
  const awaiting = String(args.awaiting || "").trim();
  const rememberedProduct = String(args.rememberedProduct || "").trim();
  const hasPendingFamilies = Boolean(args.hasPendingFamilies);
  const hasPendingModels = Boolean(args.hasPendingModels);
  const inboundText = normalizeText(String(args.inboundText || ""));

  if (awaiting === "strict_choose_family" || hasPendingFamilies) {
    return [
      "No te preocupes si hubo un error de escritura, te guío de una.",
      "Responde con la letra/número de la familia (A/1), o dime qué vas a pesar y su funcionalidad (ej.: laboratorio, control de calidad, producción) y te sugiero la mejor opción.",
    ].join("\n");
  }

  if (awaiting === "strict_choose_model" || hasPendingModels) {
    return [
      "No pasa nada si hubo un typo.",
      "Responde con la letra/número del modelo (A/1), o escribe el modelo aproximado. También puedes escribir capacidad x resolución (ej.: 4000 g x 0.01 g).",
    ].join("\n");
  }

  if (rememberedProduct) {
    if (/(opciones?|alternativas?|categoria|categorias|familia|familias|balanza|balanzas|bascula|basculas|laboratorio|joyeria|joyería|industrial)/.test(inboundText)) {
      return [
        "Perfecto, mantengo el contexto y abrimos opciones según tu necesidad.",
        "Dime uso + capacidad + resolución (ej.: laboratorio, 1000 g, 0.1 g), o escribe solo la categoría y te muestro opciones activas.",
      ].join("\n");
    }
    if (/(sirve|aplica|funciona|precision|precisi[oó]n|resolucion|resoluci[oó]n|capacidad|pesar|menos de|mayor|menor)/.test(inboundText)) {
      return [
        `Claro. Tomo ${rememberedProduct} como referencia.`,
        "Para responder bien según catálogo, dime capacidad y resolución objetivo (ej.: 200 g x 0.001 g), o escribe: mayor resolución / más económica.",
      ].join("\n");
    }
    return [
      `Te ayudo de una con ${rememberedProduct}.`,
      "Puedes responder:",
      "1) Cotización",
      "2) Ficha técnica",
      "3) Otra pregunta técnica",
      "4) Cerrar conversación",
    ].join("\n");
  }

  return [
    "No te entendí del todo, pero te ayudo de una.",
    "Puedes escribir: modelo exacto (ej.: AX12001/E), categoría (balanzas o analizador humedad), o qué vas a pesar y su funcionalidad para orientarte mejor.",
    "También puedes ver el catálogo aquí: https://balanzasybasculas.com.co/",
    "Si quieres, te dejo más referencias aquí: https://share.google/cE6wPPEGCH3vytJMm",
  ].join("\n");
}

function deriveStrictAwaitingAction(previousMemory: any, strictPrevAwaiting: string): string {
  const fromMemory = String(strictPrevAwaiting || "").trim();
  const lastValid = String(previousMemory?.last_valid_state || "").trim();
  const hasPendingModels = Array.isArray(previousMemory?.pending_product_options) && previousMemory.pending_product_options.length > 0;
  const hasPendingFamilies = Array.isArray(previousMemory?.pending_family_options) && previousMemory.pending_family_options.length > 0;
  if (fromMemory) return fromMemory;
  if (hasPendingModels) return "strict_choose_model";
  if (hasPendingFamilies) return "strict_choose_family";
  return lastValid;
}

function logStrictTransition(meta: { before: string; after: string; text: string; intent: string }) {
  try {
    console.log("[strict-state] transition", {
      before: String(meta.before || "none"),
      after: String(meta.after || "none"),
      intent: String(meta.intent || "unknown"),
      text: String(meta.text || "").slice(0, 120),
      at: new Date().toISOString(),
    });
  } catch {}
}

async function buildStrictConversationalReply(args: {
  apiKey?: string;
  inboundText: string;
  awaiting?: string;
  selectedProduct?: string;
  categoryHint?: string;
  pendingOptions?: Array<{ code?: string; name?: string }>;
}): Promise<string> {
  const apiKey = String(args.apiKey || "").trim();
  const inboundText = String(args.inboundText || "").trim();
  if (!apiKey || !inboundText) return "";

  const textNorm = normalizeText(inboundText);
  const outOfCatalog =
    isOutOfCatalogDomainQuery(inboundText) ||
    /\b(carro|carros|vehiculo|vehiculos|moto|motos|leche|comida|alimento|alimentos)\b/.test(textNorm);
  const pending = Array.isArray(args.pendingOptions) ? args.pendingOptions : [];
  const optionsHint = pending.length
    ? pending
        .slice(0, 4)
        .map((o) => `${String(o?.code || "").trim()}) ${String(o?.name || "").trim()}`)
        .filter((x) => /\w/.test(x))
        .join(" | ")
    : "";

  const systemPrompt = [
    "Eres Ava, asesora comercial por WhatsApp.",
    "Responde SIEMPRE en español, tono natural y útil, en 2-4 líneas.",
    "No inventes productos, precios ni disponibilidad fuera de catálogo activo.",
    outOfCatalog
      ? "Si el cliente pide algo fuera del catálogo, dilo directo en una línea y redirige a balanzas/analizador de humedad."
      : "Si hay contexto técnico/comercial, aprovéchalo y guía al siguiente paso sin forzar menú.",
    args.selectedProduct ? `Producto de referencia actual: ${String(args.selectedProduct || "")}.` : "",
    args.categoryHint ? `Categoría activa: ${String(args.categoryHint || "").replace(/_/g, " ")}.` : "",
    optionsHint ? `Opciones activas: ${optionsHint}.` : "",
    "Si existe lista de opciones activa, sugiere que también puede elegir con letra/número o escribir 'más', pero sin bloquear la conversación.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 140,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: inboundText },
      ] as any,
    });
    return String(completion.choices?.[0]?.message?.content || "").trim();
  } catch {
    return "";
  }
}

function isAdvisorAppointmentIntent(text: string): boolean {
  const t = normalizeText(text || "");
  return /(\bcita\b|\basesor\b|asesor humano|asesor comercial|agendar|agenda|llamada con asesor|quiero hablar con asesor|mariana|transferir\s+asesor|pasame\s+con\s+asesor)/.test(t);
}

function buildAdvisorMiniAgendaPrompt(): string {
  return [
    "Perfecto. Agendemos una llamada con asesor humano.",
    `Si prefieres atención inmediata, puedes escribirle a Mariana aquí: ${MARIANA_ESCALATION_LINK}`,
    "",
    "Elige horario:",
    "1) Hoy (en las próximas horas)",
    "2) Mañana 9:00 am",
    "3) Esta semana (próximo disponible)",
    "",
    "Responde 1, 2 o 3.",
  ].join("\n");
}

function parseAdvisorMiniAgendaChoice(text: string): { iso: string; label: string } | null {
  const t = normalizeText(text || "");
  const now = new Date();
  const mk = (d: Date, label: string) => ({ iso: d.toISOString(), label });

  if (/\b1\b|hoy|ahora|mas tarde/.test(t)) {
    const d = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    return mk(d, "Hoy (próximas horas)");
  }
  if (/\b2\b|manana|mañana/.test(t)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return mk(d, "Mañana 9:00 am");
  }
  if (/\b3\b|esta semana|proximo disponible|próximo disponible/.test(t)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 2);
    d.setHours(10, 0, 0, 0);
    return mk(d, "Esta semana (próximo disponible)");
  }
  return null;
}

function extractEmail(text: string): string {
  const m = String(text || "").match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  return m ? String(m[0] || "").toLowerCase() : "";
}

function extractCustomerName(text: string, fallback: string): string {
  const m = String(text || "").match(/nombre(?:\s+completo)?\s*:\s*([^\n,.]+)/i);
  if (m?.[1]) return String(m[1]).trim();
  const fb = String(fallback || "").trim();
  if (!fb) return "";
  if (["hola", "cliente", "usuario", "user"].includes(fb.toLowerCase())) return "";
  return fb;
}

function extractCustomerPhone(text: string, fallbackInbound: string): string {
  const raw = String(text || "");
  const labeled = raw.match(/(?:telefono|tel|celular|movil|whatsapp)\s*[:=]?\s*([+\d\s().-]{8,25})/i);
  const fromLabel = normalizePhone(String(labeled?.[1] || ""));
  if (fromLabel.length >= 10 && fromLabel.length <= 12) return fromLabel;

  const any = raw.match(/\+?\d[\d\s().-]{8,20}\d/g);
  if (any?.length) {
    for (const candidate of any) {
      const n = normalizePhone(candidate);
      if (n.length >= 10 && n.length <= 12) return n;
    }
  }

  const inbound = normalizePhone(fallbackInbound || "");
  if (inbound.length >= 10 && inbound.length <= 12) return inbound;
  return "";
}

function extractLabeledValue(text: string, labels: string[]): string {
  const raw = String(text || "");
  for (const label of labels) {
    const rxStrict = new RegExp(`(?:${label})\\s*[:=]\\s*([^\\n,;]{2,120})`, "i");
    const mStrict = raw.match(rxStrict);
    if (mStrict?.[1]) return String(mStrict[1]).trim();
    const rxLoose = new RegExp(`(?:${label})\\s+([^\\n,;]{2,120})`, "i");
    const mLoose = raw.match(rxLoose);
    if (mLoose?.[1]) return String(mLoose[1]).trim();
  }
  return "";
}

function normalizeCityLabel(raw: string): string {
  const t = normalizeText(String(raw || ""));
  if (!t) return "";
  if (/(bogota|bogota dc|bogota d c)/.test(t)) return "bogota";
  if (/(medellin|antioquia|envigado|itagui|sabaneta|bello)/.test(t)) return "antioquia";
  return t;
}

function isPresent(v: string): boolean {
  return Boolean(String(v || "").trim());
}

function sanitizeCustomerDisplayName(raw: string): string {
  const v = String(raw || "").trim().replace(/\s+/g, " ");
  if (!v) return "";
  const lc = v.toLowerCase();
  if (["hola", "cliente", "usuario", "user", "amigo", "amiga"].includes(lc)) return "";
  if (/^\+?\d+$/.test(v)) return "";
  if (v.length < 2) return "";
  return v;
}

function looksLikeCustomerNameAnswer(text: string): string {
  const src = String(text || "").trim();
  if (!src) return "";
  const cleaned = src
    .replace(/^soy\s+/i, "")
    .replace(/^mi\s+nombre\s+es\s+/i, "")
    .replace(/^nombre\s*[:\-]\s*/i, "")
    .replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "";
  if (cleaned.length < 3 || cleaned.length > 60) return "";
  const words = cleaned.split(" ").filter(Boolean);
  if (words.length > 5) return "";
  const bad = ["hola", "si", "ok", "dale", "cotizar", "producto", "ficha", "imagen", "pdf"];
  if (words.some((w) => bad.includes(w.toLowerCase()))) return "";
  return sanitizeCustomerDisplayName(cleaned);
}

async function persistKnownNameInCrm(
  supabase: any,
  args: { ownerId: string; tenantId?: string | null; phone: string; name: string }
) {
  const ownerId = String(args.ownerId || "").trim();
  const phone = normalizePhone(args.phone || "");
  const tail = phoneTail10(phone);
  const name = sanitizeCustomerDisplayName(args.name || "");
  if (!ownerId || !tail || !name) return;

  try {
    const { data: existing, error: readErr } = await supabase
      .from("agent_crm_contacts")
      .select("id,name,metadata")
      .eq("created_by", ownerId)
      .or(`phone.eq.${phone},phone.like.%${tail}`)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (readErr) return;

    if (existing?.id) {
      const mergedMeta = {
        ...(existing?.metadata && typeof existing.metadata === "object" ? existing.metadata : {}),
        whatsapp_transport_id: phone,
      };
      await supabase
        .from("agent_crm_contacts")
        .update({ name, metadata: mergedMeta })
        .eq("id", String(existing.id))
        .eq("created_by", ownerId);
      return;
    }

    await supabase.from("agent_crm_contacts").insert({
      tenant_id: args.tenantId || null,
      created_by: ownerId,
      name,
      phone,
      status: "analysis",
      next_action: null,
      next_action_at: null,
      metadata: { source: "whatsapp_name_capture", whatsapp_transport_id: phone },
    });
  } catch {
    // best effort
  }
}

function isoAfterHours(hours: number): string {
  return new Date(Date.now() + Math.max(1, hours) * 60 * 60 * 1000).toISOString();
}

async function upsertCrmLifecycleState(
  supabase: any,
  args: {
    ownerId: string;
    tenantId?: string | null;
    phone: string;
    realPhone?: string;
    name?: string;
    status?: string;
    nextAction?: string;
    nextActionAt?: string;
    metadata?: Record<string, any>;
  }
) {
  const ownerId = String(args.ownerId || "").trim();
  const phone = normalizePhone(args.phone || "");
  const realPhone = normalizeRealCustomerPhone(String(args.realPhone || ""));
  const tail = phoneTail10(phone);
  if (!ownerId || !tail) return;

  try {
    const { data: existing } = await supabase
      .from("agent_crm_contacts")
      .select("id,status,next_action,next_action_at,metadata")
      .eq("created_by", ownerId)
      .or(`phone.eq.${phone},phone.like.%${tail}`)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextStatus = String(args.status || existing?.status || "analysis").trim() || "analysis";
    const nextAction = args.nextAction === undefined
      ? (existing?.next_action ?? null)
      : (String(args.nextAction || "").trim() || null);
    const nextActionAt = args.nextActionAt === undefined
      ? (existing?.next_action_at ?? null)
      : (String(args.nextActionAt || "").trim() || null);
    const mergedMetadata = {
      ...(existing?.metadata && typeof existing.metadata === "object" ? existing.metadata : {}),
      ...(args.metadata && typeof args.metadata === "object" ? args.metadata : {}),
      whatsapp_transport_id: phone,
      whatsapp_real_phone: realPhone || String((existing?.metadata as any)?.whatsapp_real_phone || ""),
      whatsapp_lifecycle_at: new Date().toISOString(),
    };

    if (existing?.id) {
      const updatePayload: Record<string, any> = {
        status: nextStatus,
        next_action: nextAction,
        next_action_at: nextActionAt,
        metadata: mergedMetadata,
      };
      const safeName = sanitizeCustomerDisplayName(String(args.name || ""));
      if (safeName) updatePayload.name = safeName;
      await supabase
        .from("agent_crm_contacts")
        .update(updatePayload)
        .eq("id", String(existing.id))
        .eq("created_by", ownerId);
      return;
    }

    await supabase.from("agent_crm_contacts").insert({
      tenant_id: args.tenantId || null,
      created_by: ownerId,
      name: sanitizeCustomerDisplayName(String(args.name || "")) || null,
      phone,
      status: nextStatus,
      next_action: nextAction,
      next_action_at: nextActionAt,
      metadata: mergedMetadata,
    });
  } catch {
    // best effort
  }
}

function extractQuantity(text: string): number {
  const t = String(text || "");
  const m1 = [...t.matchAll(/(?:\bcantidad\b|\bqty\b|\bx\b)\s*[:=]?\s*(\d{1,5})/gi)];
  if (m1.length) {
    const n = Number(m1[m1.length - 1]?.[1] || 1);
    return Math.max(1, Math.min(100000, n));
  }
  const m2 = [...t.matchAll(/\b(\d{1,5})\s*(?:unidad|unidades|equipos?|balanza|balanzas|bascula|basculas|pieza|piezas)\b/gi)];
  if (m2.length) {
    const n = Number(m2[m2.length - 1]?.[1] || 1);
    return Math.max(1, Math.min(100000, n));
  }
  return 1;
}

function extractQuoteRequestedQuantity(text: string): number {
  const t = normalizeText(String(text || ""));
  if (!t) return 1;
  const hasTechnicalSpecPattern = Boolean(parseTechnicalSpecQuery(String(text || ""))) ||
    /\b\d+(?:[\.,]\d+)?\s*(?:mg|g|kg)\s*(?:x|×|\*|por)\s*\d+(?:[\.,]\d+)?\s*(?:mg|g|kg)\b/i.test(String(text || ""));
  if (hasTechnicalSpecPattern) {
    const hasExplicitUnitQty = /\b(?:cantidad|qty)\s*[:=]?\s*\d{1,5}\b/.test(t) ||
      /\b\d{1,4}\s*(?:unidad|unidades|equipo|equipos|balanza|balanzas|bascula|basculas|pieza|piezas)\b/.test(t);
    if (!hasExplicitUnitQty) return 1;
  }
  const m1 = t.match(/\b(?:de|por|para)\s*(\d{1,4})\s*(?:unidad|unidades|equipo|equipos|balanza|balanzas|bascula|basculas|pieza|piezas)?\b/);
  if (m1?.[1]) {
    const n = Number(m1[1]);
    if (Number.isFinite(n) && n > 0) return Math.max(1, Math.min(100000, n));
  }
  const m2 = t.match(/\b(\d{1,4})\s*(?:unidad|unidades|equipo|equipos|balanza|balanzas|bascula|basculas|pieza|piezas)\b/);
  if (m2?.[1]) {
    const n = Number(m2[1]);
    if (Number.isFinite(n) && n > 0) return Math.max(1, Math.min(100000, n));
  }
  const m3 = t.match(/\bcotiz(?:acion|ar)?\s*(?:de|por)?\s*(\d{1,4})\b/);
  if (m3?.[1]) {
    const n = Number(m3[1]);
    if (Number.isFinite(n) && n > 0) return Math.max(1, Math.min(100000, n));
  }
  return extractQuantity(text);
}

function catalogReferenceCode(row: any): string {
  const source = row?.source_payload && typeof row.source_payload === "object" ? row.source_payload : {};
  const fromSource = String(source?.product_code || source?.sap || source?.numero_modelo || "").trim();
  if (fromSource) return fromSource;
  const fromName = String(row?.name || "").trim().match(/\b([A-Z]{1,4}\d+[A-Z0-9\/-]*)\b/);
  if (fromName?.[1]) return fromName[1];
  return "";
}

function prettifyCatalogLabel(raw: string): string {
  const txt = String(raw || "").replace(/\s+/g, " ").trim();
  if (!txt) return "";
  const alpha = (txt.match(/[a-zA-Z]/g) || []).length;
  const upper = (txt.match(/[A-Z]/g) || []).length;
  const mostlyUpper = alpha > 8 && (upper / Math.max(1, alpha)) >= 0.72;
  if (!mostlyUpper) return txt;
  const lower = txt.toLowerCase();
  const titled = lower.replace(/\b([a-záéíóúñ][a-záéíóúñ0-9\/-]*)\b/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
  return titled
    .replace(/\bDe\b/g, "de")
    .replace(/\bY\b/g, "y")
    .replace(/\bCon\b/g, "con")
    .replace(/\bPara\b/g, "para");
}

function optionDisplayName(row: any): string {
  const base = humanCatalogName(String(row?.name || "").trim()) || String(row?.name || "").trim();
  const clean = prettifyCatalogLabel(base).replace(/\s*\+\s*/g, " + ").trim();
  const code = catalogReferenceCode(row);
  const out = code && !normalizeText(clean).includes(normalizeText(code))
    ? `${code} - ${clean}`
    : clean;
  return out.length > 88 ? `${out.slice(0, 85)}...` : out;
}

function buildNumberedProductOptions(rows: any[], maxItems = 5): Array<{ code: string; rank: number; id: string; name: string; raw_name: string; category: string; base_price_usd: number }> {
  const list = Array.isArray(rows) ? rows : [];
  const out: Array<{ code: string; rank: number; id: string; name: string; raw_name: string; category: string; base_price_usd: number }> = [];
  const seen = new Set<string>();
  for (const row of list) {
    const baseName = optionDisplayName(row);
    const spec = extractRowTechnicalSpec(row);
    const specParts: string[] = [];
    if (spec.capacityG > 0) specParts.push(`Cap: ${formatSpecNumber(spec.capacityG)} g`);
    if (spec.readabilityG > 0) specParts.push(`Res: ${formatSpecNumber(spec.readabilityG)} g`);
    const delivery = deliveryLabelForRow(row);
    if (delivery) specParts.push(`Entrega: ${delivery}`);
    const suffix = specParts.length ? ` | ${specParts.join(" | ")}` : "";
    const name = `${baseName}${suffix}`.slice(0, 140);
    if (!name) continue;
    const key = String(row?.id || "").trim() || normalizeText(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const rank = out.length + 1;
    if (rank > Math.max(1, maxItems)) break;
    const code = String(rank);
    out.push({
      code,
      rank,
      id: String(row?.id || "").trim(),
      name,
      raw_name: String(row?.name || "").trim() || name,
      category: String(row?.category || "").trim(),
      base_price_usd: Number(row?.base_price_usd || 0),
    });
  }
  return out;
}

function resolvePendingProductOption(text: string, optionsRaw: any): { code: string; rank: number; id: string; name: string; raw_name: string; category: string; base_price_usd: number } | null {
  const tRaw = String(text || "").trim();
  const t = normalizeText(tRaw);
  if (!t) return null;
  const options = (Array.isArray(optionsRaw) ? optionsRaw : [])
    .map((o: any) => ({
      code: String(o?.code || "").trim().toUpperCase(),
      rank: Number(o?.rank || 0),
      id: String(o?.id || "").trim(),
      name: String(o?.name || "").trim(),
      raw_name: String(o?.raw_name || o?.name || "").trim(),
      category: String(o?.category || "").trim(),
      base_price_usd: Number(o?.base_price_usd || 0),
    }))
    .filter((o: any) => o.name);
  if (!options.length) return null;

  const firstToken = String(tRaw).trim().split(/\s+/)[0] || "";
  const firstTokenClean = firstToken.replace(/[^a-z0-9]/gi, "").toUpperCase();
  const codeMatch = t.match(/(?:^|\b)(?:opcion|codigo|código|letra)\s*([a-z])\b/i) || t.match(/^\s*([a-z])\s*$/i);
  const numMatch = t.match(/(?:^|\b)(?:opcion|numero|número|#)\s*([1-9])\b/i) || t.match(/^\s*([1-9])(?:\s|$)/i);
  const code = String(codeMatch?.[1] || "").toUpperCase();
  const rank = Number(numMatch?.[1] || 0);
  if (!code && !rank && /^[A-Z]$/.test(firstTokenClean)) {
    const byLeadingCode = options.find((o: any) => o.code === firstTokenClean);
    if (byLeadingCode) return byLeadingCode;
  }
  if (!code && !rank && /^[1-9]$/.test(firstTokenClean)) {
    const byLeadingRank = options.find((o: any) => o.rank === Number(firstTokenClean));
    if (byLeadingRank) return byLeadingRank;
  }
  if (code) {
    const byCode = options.find((o: any) => o.code === code);
    if (byCode) return byCode;
  }
  if (rank > 0) {
    const byRank = options.find((o: any) => o.rank === rank);
    if (byRank) return byRank;
  }

  for (const option of options) {
    const nameNorm = normalizeText(option.name);
    if (nameNorm && t.includes(nameNorm)) return option;
    const modelTokens = extractModelLikeTokens(option.name);
    if (modelTokens.some((tk) => t.includes(normalizeText(tk)))) return option;
    const terms = extractCatalogTerms(option.name).filter((term) => term.length >= 5).slice(0, 6);
    const hits = terms.reduce((acc, term) => (t.includes(term) ? acc + 1 : acc), 0);
    if (hits >= Math.min(2, Math.max(1, terms.length))) return option;
  }

  return null;
}

function resolvePendingProductOptionStrict(text: string, optionsRaw: any): { code: string; rank: number; id: string; name: string; raw_name: string; category: string; base_price_usd: number } | null {
  const tRaw = String(text || "").trim();
  if (!tRaw) return null;
  const options = (Array.isArray(optionsRaw) ? optionsRaw : [])
    .map((o: any) => ({
      code: String(o?.code || "").trim().toUpperCase(),
      rank: Number(o?.rank || 0),
      id: String(o?.id || "").trim(),
      name: String(o?.name || "").trim(),
      raw_name: String(o?.raw_name || o?.name || "").trim(),
      category: String(o?.category || "").trim(),
      base_price_usd: Number(o?.base_price_usd || 0),
    }))
    .filter((o: any) => o.name);
  if (!options.length) return null;

  const codeMatch =
    tRaw.match(/^\s*([a-z])\s*$/i) ||
    tRaw.match(/^\s*(?:opcion|opción|letra|codigo|código)\s*[:\-]?\s*([a-z])\s*$/i);
  const numMatch =
    tRaw.match(/^\s*([1-9]\d?)\s*$/i) ||
    tRaw.match(/^\s*(?:opcion|opción|numero|número|#)\s*[:\-]?\s*([1-9]\d?)\s*$/i);
  const code = String(codeMatch?.[1] || "").toUpperCase();
  const rank = Number(numMatch?.[1] || 0);

  if (code) {
    const byCode = options.find((o: any) => o.code === code);
    if (byCode) return byCode;
  }
  if (rank > 0) {
    const byRank = options.find((o: any) => o.rank === rank);
    if (byRank) return byRank;
  }
  return null;
}

function familyLabelFromRow(row: any): string {
  const source = row?.source_payload && typeof row.source_payload === "object" ? row.source_payload : {};
  const family = String(source?.family || source?.familia || "").trim();
  const categoryNorm = normalizeText(String(row?.category || ""));
  const subNorm = normalizeText(String(source?.subcategory || "").trim());
  if (family) {
    if (
      (categoryNorm === "basculas" || subNorm.startsWith("basculas") || subNorm.startsWith("plataformas") || subNorm.startsWith("indicadores")) &&
      /balanzas?/.test(normalizeText(family))
    ) {
      return "Bascula industriales";
    }
    return family;
  }
  const sub = subNorm;
  if (sub) {
    const mapped: Record<string, string> = {
      balanzas_semimicro: "Balanza Semi - Micro",
      balanzas_analiticas: "Balanza Analitica",
      balanzas_semianaliticas: "Balanza Semi - Analitica",
      balanzas_precision: "Balanza Precisión",
      balanzas_conteo: "Balanzas Contadoras",
      balanzas_mesa: "Balanzas industriales",
      basculas_mesa: "Bascula industriales",
      basculas_piso: "Bascula industriales",
      basculas_lavables: "Bascula industriales",
      plataformas: "Bascula industriales",
      plataformas_lavables: "Bascula industriales",
      indicadores: "Bascula industriales",
      indicadores_lavables: "Bascula industriales",
      analizador_humedad: "Analizador de humedad",
    };
    if (mapped[sub]) return mapped[sub];
  }
  // Do not infer family from technical specs here.
  // Family menus must reflect DB taxonomy (family/subcategory) only.
  return "";
}

function buildNumberedFamilyOptions(rows: any[], maxItems = 8): Array<{ code: string; rank: number; key: string; label: string; count: number }> {
  const map = new Map<string, { key: string; label: string; count: number }>();
  const rowList = Array.isArray(rows) ? rows : [];
  const balanzasOnly = rowList.length > 0 && rowList.every((row: any) => {
    const c = normalizeText(String(row?.category || ""));
    return c === "balanzas" || c.startsWith("balanzas_");
  });
  const canonicalBalanzasFamilyLabel = (label: string): string => {
    const t = normalizeText(label);
    if (!t) return "";
    if (t.includes("portatil")) return "Balanzas industriales";
    if (t.includes("semimicro") || t.includes("semi micro")) return "Balanza Semi - Micro";
    if (t.includes("semi") && t.includes("analit")) return "Balanza Semi - Analitica";
    if (t.includes("analit")) return "Balanza Analitica";
    if (t.includes("precis")) return "Balanza Precisión";
    if (t.includes("contadora") || t.includes("conteo")) return "Balanzas Contadoras";
    if (t.includes("industrial") || t.includes("mesa")) return "Balanzas industriales";
    return label;
  };
  for (const row of Array.isArray(rows) ? rows : []) {
    const rawLabel = familyLabelFromRow(row);
    const label = balanzasOnly ? canonicalBalanzasFamilyLabel(rawLabel) : rawLabel;
    const key = normalizeText(label);
    if (!key) continue;
    if (["balanzas", "basculas", "general"].includes(key)) continue;
    const prev = map.get(key) || { key, label, count: 0 };
    prev.count += 1;
    if (!prev.label || prev.label.length > label.length) prev.label = label;
    map.set(key, prev);
  }
  const preferredBalanzasOrder = [
    "balanza semi - micro",
    "balanza analitica",
    "balanza semi - analitica",
    "balanza precision",
    "balanzas industriales",
    "balanzas contadoras",
  ].map((x) => normalizeText(x));
  const orderIndex = (label: string) => {
    const idx = preferredBalanzasOrder.indexOf(normalizeText(label));
    return idx >= 0 ? idx : 999;
  };

  return Array.from(map.values())
    .sort((a, b) => {
      if (balanzasOnly) {
        const ai = orderIndex(a.label);
        const bi = orderIndex(b.label);
        if (ai !== bi) return ai - bi;
      }
      return b.count - a.count || a.label.localeCompare(b.label);
    })
    .slice(0, maxItems)
    .map((x, i) => ({ code: String.fromCharCode(65 + i), rank: i + 1, key: x.key, label: x.label, count: x.count }));
}

function resolvePendingFamilyOption(text: string, optionsRaw: any): { code: string; rank: number; key: string; label: string; count: number } | null {
  const options = (Array.isArray(optionsRaw) ? optionsRaw : [])
    .map((o: any) => ({
      code: String(o?.code || "").toUpperCase(),
      rank: Number(o?.rank || 0),
      key: String(o?.key || "").trim(),
      label: String(o?.label || "").trim(),
      count: Number(o?.count || 0),
    }))
    .filter((o: any) => o.code && o.rank > 0 && o.key);
  if (!options.length) return null;
  const t = normalizeText(String(text || "").trim());
  if (!t) return null;
  const byDirect = options.find((o: any) => t === normalizeText(o.code) || t === String(o.rank));
  if (byDirect) return byDirect;
  const byMention = options.find((o: any) => normalizeText(o.label).includes(t) || t.includes(normalizeText(o.label)));
  if (byMention) return byMention;

  const tTerms = t
    .split(/[^a-z0-9]+/i)
    .map((x) => x.trim())
    .filter((x) => x.length >= 4)
    .filter((x) => !["dije", "dijiste", "quiero", "busco", "tengo", "tienes", "familia", "elige", "opcion"].includes(x));
  if (!tTerms.length) return null;

  let best: any = null;
  for (const o of options) {
    const labelTerms = normalizeText(String(o.label || ""))
      .split(/[^a-z0-9]+/i)
      .map((x) => x.trim())
      .filter((x) => x.length >= 4);
    const hits = tTerms.filter((tt) => labelTerms.some((lt) => lt.includes(tt) || tt.includes(lt))).length;
    if (!best || hits > best.hits) best = { o, hits };
  }
  return best && best.hits > 0 ? best.o : null;
}

function inferFamilyFromUseCase(
  text: string,
  optionsRaw: any,
): { code: string; rank: number; key: string; label: string; count: number } | null {
  const options = (Array.isArray(optionsRaw) ? optionsRaw : [])
    .map((o: any) => ({
      code: String(o?.code || "").toUpperCase(),
      rank: Number(o?.rank || 0),
      key: String(o?.key || "").trim(),
      label: String(o?.label || "").trim(),
      count: Number(o?.count || 0),
    }))
    .filter((o: any) => o.code && o.rank > 0 && o.key);
  if (!options.length) return null;
  const t = normalizeText(String(text || ""));
  if (!t) return null;

  const wantsJewelryPrecision = /(oro|joyeria|joyeria|ley\s+de\s+oro|quilat|kilat|gramera|anillo|arete|cadena|gramos|gramo|mg|miligram)/.test(t);
  const wantsIndustrial = /(maquina|maquinas|bodega|industrial|plataforma|carga pesada)/.test(t);
  const wantsLab = /(laboratorio|farmacia|control de calidad|formulacion|formulación|microbiologia|analis|investigacion)/.test(t);

  const rankByHints = (o: any) => {
    const l = normalizeText(String(o?.label || ""));
    let score = 0;
    if (wantsJewelryPrecision) {
      if (/joyeria|jewelry/.test(l)) score += 8;
      if (/analitica|semi\s*analitica|semi\s*micro/.test(l)) score += 6;
      if (/precision/.test(l)) score += 4;
    }
    if (wantsIndustrial) {
      if (/industrial|plataforma|basculas/.test(l)) score += 8;
    }
    if (wantsLab) {
      if (/analitica|semi\s*analitica|precision|laboratorio/.test(l)) score += 8;
      if (/micro|semi\s*micro/.test(l)) score += 4;
    }
    return score;
  };

  const best = options
    .map((o: any) => ({ o, score: rankByHints(o) }))
    .sort((a: any, b: any) => b.score - a.score || a.o.rank - b.o.rank)[0];

  return best && best.score > 0 ? best.o : null;
}

function isOptionOnlyReply(text: string): boolean {
  const t = normalizeText(text || "");
  if (!t) return false;
  return /^(opcion\s*)?([a-z]|[1-9])$/.test(t) || /^(quiero|elijo|escojo)\s+(opcion\s*)?([a-z]|[1-9])$/.test(t);
}

function extractPerProductQuantities(text: string, products: Array<{ id: string; name: string }>): Record<string, number> {
  const result: Record<string, number> = {};
  const chunks = String(text || "")
    .split(/\n|;|\|/)
    .map((x) => x.trim())
    .filter(Boolean);

  for (const p of products || []) {
    const pName = normalizeText(String(p?.name || ""));
    const terms = pName
      .split(/[^a-z0-9]+/i)
      .map((x) => x.trim())
      .filter((x) => x.length >= 5)
      .slice(0, 6);

    for (const chunk of chunks) {
      const c = normalizeText(chunk);
      const hits = terms.reduce((acc, t) => (c.includes(t) ? acc + 1 : acc), 0);
      if (hits >= 2 || (pName && c.includes(pName))) {
        const qty = extractQuantity(chunk);
        if (qty > 0) {
          result[String(p.id)] = qty;
          break;
        }
      }
    }
  }

  return result;
}

function hasUniformQuantityHint(text: string): boolean {
  const t = normalizeText(text);
  return /(para todos|cada uno|cada producto|los 3|los tres)/.test(t) && /\d/.test(t);
}

function shouldAutoQuote(text: string): boolean {
  const t = normalizeText(text);
  const asksQuote = /(cotiz|cotizacion|cotizar|presupuesto|precio)/.test(t);
  const asksDelivery = /(pdf|archivo|adjunt|enviame|enviame|enviame|whatsapp|trm)/.test(t);
  const asksMulti = isMultiProductQuoteIntent(t);
  return asksQuote && (asksDelivery || asksMulti);
}

function asksQuoteIntent(text: string): boolean {
  const t = normalizeText(text || "");
  if (!t) return false;
  return /(cotiz|cotizacion|cotizar|presupuesto)/.test(t);
}

type AlternativeFollowupIntent =
  | "alternative_lower_price"
  | "alternative_same_need"
  | "alternative_other_brand"
  | "alternative_higher_capacity"
  | "alternative_lower_capacity"
  | "requote_same_model";

function detectAlternativeFollowupIntent(text: string): AlternativeFollowupIntent | null {
  const t = normalizeText(String(text || ""));
  if (!t) return null;
  if (/(otra\s+marca|otras\s+marcas|marca\s+diferente|de\s+otra\s+marca)/.test(t)) return "alternative_other_brand";
  if (/(muy\s+costos|mas\s+barat|más\s+barat|mas\s+econom|más\s+econom|economic)/.test(t)) return "alternative_lower_price";
  if (/(mayor\s+capacidad|mas\s+capacidad|más\s+capacidad)/.test(t)) return "alternative_higher_capacity";
  if (/(menor\s+capacidad|menos\s+capacidad)/.test(t)) return "alternative_lower_capacity";
  if (/(mayor\s+resolucion|mejor\s+resolucion|mas\s+resolucion|más\s+resolucion|mas\s+precision|más\s+precision|mejor\s+precision|menor\s+resolucion|menos\s+precision|menor\s+precision)/.test(t)) return "alternative_same_need";
  if (/(alternativ|otra\s+opcion|otro\s+modelo|similar|parecid|equivalent)/.test(t)) return "alternative_same_need";
  if (/(mismo\s+modelo|misma\s+referencia|esta\s+misma|este\s+mismo|la\s+misma\s+cotizacion|misma\s+cotizacion)/.test(t)) return "requote_same_model";
  if (/(otra\s+cotiz|otra\s+cotizacion|nueva\s+cotizacion|re\s*cotiz)/.test(t)) return null;
  return null;
}

function isQuoteStarterIntent(text: string): boolean {
  const t = normalizeText(text);
  const asksQuote = asksQuoteIntent(t);
  const hasConcreteRef = hasConcreteProductHint(t) || /\b\d{2,}\b/.test(t) || /(explorer|adventurer|pioneer|scout|defender|valor|fron|modelo|referencia)/.test(t);
  return asksQuote && !hasConcreteRef;
}

function hasReferencePronoun(text: string): boolean {
  const t = normalizeText(text || "");
  if (!t) return false;
  return /\b(de\s+esta|de\s+este|de\s+esa|de\s+ese|esta|este|esa|ese)\b/.test(t);
}

function isConcreteQuoteIntent(text: string, rememberedProductName?: string): boolean {
  const t = normalizeText(text || "");
  if (!asksQuoteIntent(t)) return false;
  if (hasConcreteProductHint(t)) return true;
  const hasRememberedProduct = Boolean(normalizeText(String(rememberedProductName || "")));
  if (!hasRememberedProduct) return false;
  if (hasReferencePronoun(t)) return true;
  return /\b(la|esta|esa)\s+cotizacion\b|^cotizacion\b|^la\s+cotizacion\b/.test(t);
}

function hasBareQuantity(text: string): boolean {
  const t = normalizeText(text || "");
  return /\b\d{1,5}\b/.test(t) && /(unidad|unidades|equipo|equipos|balanza|balanzas|bascula|basculas|pieza|piezas|qty|cantidad|x\s*\d)/.test(t);
}

function isTechnicalSpecQuery(text: string): boolean {
  return Boolean(parseTechnicalSpecQuery(text));
}

function toGrams(valueRaw: string, unitRaw: string): number {
  const n = Number(String(valueRaw || "").replace(/,/g, "."));
  if (!Number.isFinite(n) || n <= 0) return 0;
  const u = normalizeText(String(unitRaw || "g"));
  if (u === "mg") return n / 1000;
  if (u === "kg") return n * 1000;
  if (u === "gr" || u === "gramo" || u === "gramos") return n;
  return n;
}

function parseTechnicalSpecQuery(text: string): { capacityG: number; readabilityG: number } | null {
  const t = normalizeText(String(text || ""))
    .replace(/(\d)\s*[\.,]\s*(\d)/g, "$1.$2")
    .replace(/[×✕✖*]/g, "x")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return null;

  const primary = t.match(/(?:^|\s)(\d+(?:[\.,]\d+)?)\s*(mg|g|kg|gr|gramo|gramos)?\s*(?:x|por)\s*(\d+(?:[\.,]\d+)?)\s*(mg|g|kg|gr|gramo|gramos)?\b/i);
  const byKeywords = t.match(/(?:capacidad|cap|max)\D{0,20}(\d+(?:[\.,]\d+)?)\s*(mg|g|kg|gr|gramo|gramos)?\b.{0,80}(?:resolucion|resolucion\s+minima|precision|lectura\s+minima|readability)\D{0,20}(\d+(?:[\.,]\d+)?)\s*(mg|g|kg|gr|gramo|gramos)?\b/i);
  const m = primary || byKeywords;
  if (!m) return null;

  const capacityG = toGrams(m[1], m[2] || "g");
  const readabilityG = toGrams(m[3], m[4] || "g");
  if (!(capacityG > 0) || !(readabilityG > 0)) return null;
  return { capacityG, readabilityG };
}

function parseLooseTechnicalHint(text: string): { capacityG?: number; readabilityG?: number } | null {
  const t = normalizeText(String(text || ""))
    .replace(/(\d)\s*[\.,]\s*(\d)/g, "$1.$2")
    .replace(/[×✕✖*]/g, "x")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return null;

  const strictPair = parseTechnicalSpecQuery(t);
  if (strictPair) return strictPair;

  const explicitReadToken =
    t.match(/(?:^|\s)(0(?:[\.,]\d+))\s*(mg|g|kg|gr|gramo|gramos)\b/i) ||
    t.match(/(?:^|\s)([\.,]\d+)\s*(mg|g|kg|gr|gramo|gramos)\b/i);
  if (explicitReadToken) {
    const raw = String(explicitReadToken[1] || "").replace(/^\./, "0.").replace(/^,/, "0.");
    const unit = String(explicitReadToken[2] || "g");
    const read = toGrams(raw, unit);
    if (read > 0 && read < 1) return { readabilityG: read };
  }

  const sigMap: Record<string, number> = {
    "1": 1,
    "2": 2,
    "3": 3,
    "4": 4,
    "un": 1,
    "una": 1,
    "uno": 1,
    "dos": 2,
    "tres": 3,
    "cuatro": 4,
  };
  const sig = t.match(/\b(1|2|3|4|un|una|uno|dos|tres|cuatro)\s*(cifra|cifras|decimal|decimales)\s*(significativa|significativas)?\b/i);
  if (sig) {
    const n = Number(sigMap[String(sig[1] || "").toLowerCase()] || 0);
    if (n >= 1 && n <= 4) {
      return { readabilityG: Number(Math.pow(10, -n).toFixed(8)) };
    }
  }

  const valuesForward = Array.from(t.matchAll(/(\d+(?:[\.,]\d+)?)\s*(mg|g|kg|gr|gramo|gramos)\b/gi))
    .map((m: any) => toGrams(String(m?.[1] || ""), String(m?.[2] || "g")))
    .filter((n: number) => Number.isFinite(n) && n > 0);
  const valuesReverse = Array.from(t.matchAll(/\b(mg|g|kg|gr|gramo|gramos)\s*[,:\- ]+\s*(\d+(?:[\.,]\d+)?)/gi))
    .map((m: any) => toGrams(String(m?.[2] || ""), String(m?.[1] || "g")))
    .filter((n: number) => Number.isFinite(n) && n > 0);
  const values = [...valuesForward, ...valuesReverse];
  if (!values.length) return null;

  const hasReadabilityKeyword = /(resolucion|precision|lectura\s*minima|division|divisiones|readability)/.test(t);
  const hasCapacityKeyword = /(capacidad|max|hasta|rango|alcance|de\s*\d+(?:[\.,]\d+)?\s*(mg|g|kg|gr|gramo|gramos))/.test(t);

  if (values.length >= 2) {
    const sorted = [...values].sort((a, b) => a - b);
    const maybeRead = sorted[0];
    const maybeCap = sorted[sorted.length - 1];
    if (maybeCap >= 1 && maybeRead > 0 && (maybeCap / maybeRead) >= 10) {
      return { capacityG: maybeCap, readabilityG: maybeRead };
    }
  }

  const only = values[0];
  if (hasReadabilityKeyword) return { readabilityG: only };
  if (hasCapacityKeyword && only >= 1) return { capacityG: only };
  if (only < 1) return { readabilityG: only };
  return { capacityG: only };
}

function parseCapacityRangeHint(text: string): { minG: number; maxG: number } | null {
  const t = normalizeText(String(text || ""))
    .replace(/(\d)\s*[\.,]\s*(\d)/g, "$1.$2")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return null;

  const pairPatterns = [
    /(?:entre|rango|de)\s*(\d+(?:[\.,]\d+)?)\s*(mg|g|kg|gr|gramo|gramos)?\s*(?:a|y|-|hasta)\s*(\d+(?:[\.,]\d+)?)\s*(mg|g|kg|gr|gramo|gramos)?\b/i,
    /desde\s*(\d+(?:[\.,]\d+)?)\s*(mg|g|kg|gr|gramo|gramos)?\s*hasta\s*(\d+(?:[\.,]\d+)?)\s*(mg|g|kg|gr|gramo|gramos)?\b/i,
  ];
  for (const rx of pairPatterns) {
    const m = t.match(rx);
    if (!m) continue;
    const a = toGrams(m[1], m[2] || "g");
    const b = toGrams(m[3], m[4] || m[2] || "g");
    if (!(a > 0) || !(b > 0)) continue;
    const minG = Math.min(a, b);
    const maxG = Math.max(a, b);
    if (maxG > 0) return { minG, maxG };
  }

  let minG = 0;
  let maxG = 0;
  const minOnly = t.match(/(?:capacidad\s*)?(?:minima|minimo|desde|mayor\s+que|mas\s+de)\s*(\d+(?:[\.,]\d+)?)\s*(mg|g|kg|gr|gramo|gramos)\b/i);
  const maxOnly = t.match(/(?:capacidad\s*)?(?:maxima|maximo|hasta|menor\s+que|no\s+mas\s+de)\s*(\d+(?:[\.,]\d+)?)\s*(mg|g|kg|gr|gramo|gramos)\b/i);
  if (minOnly) minG = toGrams(minOnly[1], minOnly[2] || "g");
  if (maxOnly) maxG = toGrams(maxOnly[1], maxOnly[2] || "g");
  if (minG > 0 && maxG > 0) {
    const minV = Math.min(minG, maxG);
    const maxV = Math.max(minG, maxG);
    return { minG: minV, maxG: maxV };
  }
  if (minG > 0) return { minG, maxG: Number.POSITIVE_INFINITY };
  if (maxG > 0) return { minG: 0, maxG };
  return null;
}

function filterRowsByCapacityRange(rows: any[], range: { minG: number; maxG: number } | null): any[] {
  if (!range || !Array.isArray(rows) || !rows.length) return Array.isArray(rows) ? rows : [];
  const minG = Math.max(0, Number(range.minG || 0));
  const maxG = Number(range.maxG || 0);
  return rows.filter((row: any) => {
    const cap = Number(extractRowTechnicalSpec(row)?.capacityG || 0);
    if (!(cap > 0)) return false;
    if (minG > 0 && cap < minG) return false;
    if (Number.isFinite(maxG) && maxG > 0 && cap > maxG) return false;
    return true;
  });
}

function mergeLooseSpecWithMemory(
  prev: { capacityG?: number; readabilityG?: number },
  hint: { capacityG?: number; readabilityG?: number } | null
): { capacityG: number; readabilityG: number } {
  const prevCap = Number(prev?.capacityG || 0);
  const prevRead = Number(prev?.readabilityG || 0);
  let cap = Number(hint?.capacityG || 0);
  let read = Number(hint?.readabilityG || 0);

  if (prevCap > 0 && !(prevRead > 0) && cap > 0 && cap <= 1 && !(read > 0)) {
    read = cap;
    cap = 0;
  }
  if (prevRead > 0 && !(prevCap > 0) && read > 0 && !(cap > 0) && read >= 1) {
    cap = read;
    read = 0;
  }

  return {
    capacityG: cap > 0 ? cap : prevCap,
    readabilityG: read > 0 ? read : prevRead,
  };
}

function formatSpecNumber(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n >= 1) return String(Number(n.toFixed(3))).replace(/\.0+$/, "");
  if (n >= 0.01) return String(Number(n.toFixed(4))).replace(/\.0+$/, "");
  return String(Number(n.toFixed(6))).replace(/\.0+$/, "");
}

function inferFamilyFromReadability(readabilityG: number): { family: string; capacityHint: string } {
  const r = Number(readabilityG || 0);
  if (!(r > 0)) return { family: "balanzas", capacityHint: "200 g, 620 g o 3200 g" };
  if (r <= 0.0001) return { family: "Balanza Analítica", capacityHint: "120 g, 220 g o 320 g" };
  if (r <= 0.001) return { family: "Balanza Semi - Micro", capacityHint: "120 g, 220 g o 520 g" };
  if (r <= 0.01) return { family: "Balanza Precisión", capacityHint: "620 g, 1600 g, 3200 g o 6200 g" };
  if (r <= 0.1) return { family: "Balanzas Contadoras", capacityHint: "3 kg, 6 kg o 15 kg" };
  return { family: "Balanzas industriales", capacityHint: "15 kg, 30 kg o 60 kg" };
}

function extractRowTechnicalSpec(row: any): { capacityG: number; readabilityG: number } {
  const specsText = String(row?.specs_text || "");
  const specsJsonText = row?.specs_json ? JSON.stringify(row.specs_json) : "";
  const payload = row?.source_payload && typeof row.source_payload === "object" ? row.source_payload : {};
  const payloadSpecText = [
    (payload as any)?.capacity,
    (payload as any)?.capacidad,
    (payload as any)?.capacity_g,
    (payload as any)?.capacidad_g,
    (payload as any)?.max,
    (payload as any)?.max_g,
    (payload as any)?.resolution,
    (payload as any)?.resolucion,
    (payload as any)?.resolution_g,
    (payload as any)?.resolucion_g,
    (payload as any)?.readability,
    (payload as any)?.readability_g,
    (payload as any)?.precision,
    (payload as any)?.precision_g,
    (payload as any)?.family,
    (payload as any)?.quote_model,
  ]
    .map((v) => String(v ?? "").trim())
    .filter(Boolean)
    .join(" ");
  const hay = normalizeCatalogQueryText(`${specsText} ${specsJsonText} ${payloadSpecText}`);
  const cap =
    hay.match(/(?:capacidad|max(?:ima)?|maximum|max\.|weighing\s*capacity|peso\s*max(?:imo)?)[^0-9]{0,24}(\d+(?:[\.,]\d+)?)\s*(mg|g|kg)/) ||
    hay.match(/(\d+(?:[\.,]\d+)?)\s*(mg|g|kg)\s*(?:x|por|\*)\s*\d+(?:[\.,]\d+)?\s*(mg|g|kg)/);
  const read =
    hay.match(/(?:resolucion|lectura\s*minima|readability|division|d=|incremento)[^0-9]{0,24}(\d+(?:[\.,]\d+)?)\s*(mg|g|kg)/) ||
    hay.match(/\d+(?:[\.,]\d+)?\s*(mg|g|kg)\s*(?:x|por|\*)\s*(\d+(?:[\.,]\d+)?)\s*(mg|g|kg)/);

  if (cap && read) {
    const capVal = cap[1] ? toGrams(cap[1], cap[2] || "g") : toGrams(cap[1], cap[2] || "g");
    const readVal = read[2] && read[3] ? toGrams(read[2], read[3]) : toGrams(read[1], read[2] || "g");
    if (capVal > 0 && readVal > 0) return { capacityG: capVal, readabilityG: readVal };
  }

  const unitPairs = Array.from(hay.matchAll(/(\d+(?:[\.,]\d+)?)\s*(mg|g|kg)/g))
    .map((m: any) => toGrams(String(m?.[1] || ""), String(m?.[2] || "g")))
    .filter((n: number) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
  const fallbackRead = unitPairs.length ? unitPairs[0] : 0;
  const fallbackCap = unitPairs.length ? unitPairs[unitPairs.length - 1] : 0;

  return {
    capacityG: cap ? toGrams(cap[1], cap[2] || "g") : fallbackCap,
    readabilityG: read
      ? (read[2] && read[3] ? toGrams(read[2], read[3]) : toGrams(read[1], read[2] || "g"))
      : (fallbackRead > 0 && fallbackCap / Math.max(fallbackRead, 0.000000001) >= 10 ? fallbackRead : 0),
  };
}

function rankCatalogByTechnicalSpec(rows: any[], spec: { capacityG: number; readabilityG: number }): Array<{ row: any; capacityDeltaPct: number; readabilityRatio: number; score: number }> {
  const targetCap = Math.max(0.000001, Number(spec?.capacityG || 0));
  const targetRead = Math.max(0.000000001, Number(spec?.readabilityG || 0));
  if (!(targetCap > 0) || !(targetRead > 0)) return [];
  return (rows || [])
    .map((row: any) => {
      const rs = extractRowTechnicalSpec(row);
      if (!(rs.capacityG > 0) || !(rs.readabilityG > 0)) return null;
      const capacityDeltaPct = Math.abs(rs.capacityG - targetCap) / targetCap * 100;
      const readabilityRatio = rs.readabilityG / targetRead;
      const readPenalty = readabilityRatio <= 1 ? readabilityRatio * 0.2 : readabilityRatio;
      const score = capacityDeltaPct + readPenalty * 100;
      return { row, capacityDeltaPct, readabilityRatio, score };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.score - b.score) as any;
}

function rankCatalogByCapacityOnly(rows: any[], capacityG: number): Array<{ row: any; capacityDeltaPct: number; score: number }> {
  const targetCap = Math.max(0.000001, Number(capacityG || 0));
  if (!(targetCap > 0)) return [];
  return (rows || [])
    .map((row: any) => {
      const rs = extractRowTechnicalSpec(row);
      if (!(rs.capacityG > 0)) return null;
      const capacityDeltaPct = Math.abs(rs.capacityG - targetCap) / targetCap * 100;
      const score = capacityDeltaPct + (rs.readabilityG > 0 ? 0 : 15);
      return { row, capacityDeltaPct, score };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.score - b.score) as any;
}

function rankCatalogByReadabilityOnly(rows: any[], readabilityG: number): Array<{ row: any; readabilityRatio: number; score: number }> {
  const targetRead = Math.max(0.000000001, Number(readabilityG || 0));
  if (!(targetRead > 0)) return [];
  return (rows || [])
    .map((row: any) => {
      const rs = extractRowTechnicalSpec(row);
      if (!(rs.readabilityG > 0)) return null;
      const readabilityRatio = rs.readabilityG / targetRead;
      const logDelta = Math.abs(Math.log10(Math.max(readabilityRatio, 0.000000001)));
      const worsePenalty = readabilityRatio > 1 ? readabilityRatio * 2 : 0;
      const score = logDelta * 100 + worsePenalty;
      return { row, readabilityRatio, score };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.score - b.score) as any;
}

function prioritizeTechnicalRows(rows: any[], spec: { capacityG: number; readabilityG: number }): { orderedRows: any[]; exactCount: number } {
  const ranked = rankCatalogByTechnicalSpec(rows, spec);
  if (!ranked.length) return { orderedRows: [], exactCount: 0 };

  const reasonable = ranked.filter((x: any) => {
    const capOk = x.capacityDeltaPct <= 280;
    const readOk = x.readabilityRatio >= 0.5 && x.readabilityRatio <= 2.5;
    return capOk && readOk;
  });
  const pool = reasonable.length ? reasonable : ranked;

  const exact = pool.filter((x: any) => x.capacityDeltaPct <= 8 && x.readabilityRatio >= 0.8 && x.readabilityRatio <= 1.25);
  const near = pool.filter((x: any) => !(x.capacityDeltaPct <= 8 && x.readabilityRatio >= 0.8 && x.readabilityRatio <= 1.25));
  const out: any[] = [];
  const seen = new Set<string>();

  for (const x of [...exact, ...near]) {
    const id = String(x?.row?.id || "").trim() || normalizeText(String(x?.row?.name || ""));
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(x.row);
  }
  return { orderedRows: out, exactCount: exact.length };
}

function filterReasonableTechnicalRows(rows: any[], spec: { capacityG: number; readabilityG: number }): any[] {
  const targetCap = Number(spec.capacityG || 0);
  const targetRead = Number(spec.readabilityG || 0);
  if (!(targetCap > 0) || !(targetRead > 0)) return Array.isArray(rows) ? rows : [];
  const strictRead = targetRead <= 0.1;
  const maxCapDeltaPct = strictRead ? 80 : 180;
  const maxReadRatio = strictRead ? 3 : 8;
  return (Array.isArray(rows) ? rows : []).filter((row: any) => {
    const rs = extractRowTechnicalSpec(row);
    const cap = Number(rs.capacityG || 0);
    const read = Number(rs.readabilityG || 0);
    if (!(cap > 0) || !(read > 0)) return false;
    const capDeltaPct = (Math.abs(cap - targetCap) / Math.max(1, targetCap)) * 100;
    const readRatio = Math.max(read, targetRead) / Math.max(1e-9, Math.min(read, targetRead));
    return capDeltaPct <= maxCapDeltaPct && readRatio <= maxReadRatio;
  });
}

function filterNearbyTechnicalRows(rows: any[], spec: { capacityG: number; readabilityG: number }): any[] {
  const targetCap = Number(spec.capacityG || 0);
  const targetRead = Number(spec.readabilityG || 0);
  if (!(targetCap > 0) || !(targetRead > 0)) return Array.isArray(rows) ? rows : [];
  const maxCapDeltaPct = 1200;
  const maxReadRatio = 25;
  return (Array.isArray(rows) ? rows : []).filter((row: any) => {
    const rs = extractRowTechnicalSpec(row);
    const cap = Number(rs.capacityG || 0);
    const read = Number(rs.readabilityG || 0);
    if (!(cap > 0) || !(read > 0)) return false;
    const capDeltaPct = (Math.abs(cap - targetCap) / Math.max(1, targetCap)) * 100;
    const readRatio = Math.max(read, targetRead) / Math.max(1e-9, Math.min(read, targetRead));
    return capDeltaPct <= maxCapDeltaPct && readRatio <= maxReadRatio;
  });
}

function applyApplicationProfile(rows: any[], args: { application?: string; targetCapacityG?: number; targetReadabilityG?: number }): any[] {
  const list = Array.isArray(rows) ? rows : [];
  const app = normalizeText(String(args.application || ""));
  const targetCap = Number(args.targetCapacityG || 0);
  const targetRead = Number(args.targetReadabilityG || 0);
  if (!app && !(targetCap > 0) && !(targetRead > 0)) return list;

  const out = list.filter((row: any) => {
    const spec = extractRowTechnicalSpec(row);
    const cap = Number(spec.capacityG || 0);
    const read = Number(spec.readabilityG || 0);
    const txt = normalizeText(`${String(row?.name || "")} ${String(row?.category || "")} ${familyLabelFromRow(row)}`);
    if (!(cap > 0) || !(read > 0)) return false;
    if (targetCap > 0) {
      const minCap = targetCap * 0.2;
      const maxCap = targetCap * 5;
      if (cap < minCap || cap > maxCap) return false;
    }
    if (targetRead > 0 && read > targetRead * 2) return false;

    if (app === "joyeria_oro") {
      if (read > 0.01) return false;
      if (cap > 6000) return false;
      if (/(industrial|plataforma|ranger|defender|valor|rc31|r71|ckw|td52p)/.test(txt)) return false;
    }
    if (app === "laboratorio") {
      if (read > 0.1) return false;
      if (/(industrial|plataforma|ranger|defender|valor|rc31|r71|ckw|td52p)/.test(txt)) return false;
    }
    return true;
  });

  return out.length ? out : list;
}

function isQuoteProceedIntent(text: string): boolean {
  const t = normalizeText(text);
  return /(damela|dámela|enviamela|enviamela|hazla|generala|genérala|cotizala|cotízala|adelante|si por favor|si, por favor|dale|de una)/.test(t);
}

function isQuantityUpdateIntent(text: string): boolean {
  const t = normalizeText(text);
  return /(\d{1,5})\s*(unidad|unidades|equipos?)/.test(t) && /(te pedi|te pedí|corrige|actualiza|ajusta|son|quiero|necesito)/.test(t);
}

function isQuoteRecallIntent(text: string): boolean {
  const t = normalizeText(text);
  return (
    /recuerd|ultima cotizacion|cotizacion que me enviaste|cotizacion anterior|mi cotizacion|mi ultima cotizacion|donde esta la cotizacion|donde va la cotizacion|estado de la cotizacion|aun no me envias|aun no envias|no me has enviado|sigue pendiente la cotizacion/.test(t) &&
    /(cotiz|pdf|enviaste|anterior|ultima|recordar|recuerd)/.test(t)
  );
}

function isPriceIntent(text: string): boolean {
  const t = normalizeText(text);
  return /(precio|precios|con precio|tienen precio|productos con precio|cuanto vale|cuanto cuest|valor|valen|cuestan)/.test(t);
}

function isMultiProductQuoteIntent(text: string): boolean {
  const t = normalizeText(text);
  return /(los\s*3|los\s*tres|todos\s+los\s+productos|todos\s+los\s+que\s+tienen\s+precio|de\s+los\s+3|dos\s+mas|tres\s+mas|agrega|agregar|incluye|incluir|suma|sumar|adiciona|adicionar|misma\s+cotizacion|misma\s+cotización)/.test(t);
}

function isSameQuoteContinuationIntent(text: string): boolean {
  const t = normalizeText(text);
  return /(misma\s+cotizacion|misma\s+cotización|en\s+la\s+misma\s+cotizacion|en\s+la\s+misma\s+cotización|agrega|agregar|incluye|incluir|suma|sumar|adiciona|adicionar|dos\s+mas|tres\s+mas)/.test(t);
}

function isFlowChangeWithoutModelDetailsIntent(text: string): boolean {
  const t = normalizeText(text || "");
  if (!t) return false;
  const hasModelTokens = extractModelLikeTokens(text).length >= 1;
  const hasQtyHint = /(\d{1,4})\s*(x|por|unidad|unidades)/.test(t);
  if (hasModelTokens || hasQtyHint) return false;
  return /(mas\s+de\s+un\s+modelo|m[aá]s\s+de\s+un\s+modelo|varios\s+modelos|multiples\s+modelos|m[uú]ltiples\s+modelos|otro\s+modelo|otra\s+referencia|otra\s+opcion|otro\s+equipo|cambiar\s+modelo|cambiar\s+referencia|quiero\s+otro|quiero\s+otras|agregar\s+otro|agregar\s+mas|incluir\s+otro|incluir\s+mas)/.test(t);
}

function shouldResendPdf(text: string): boolean {
  const t = normalizeText(text);
  return /(reenviar|reenvia|reenvie|volver a enviar|mandame otra vez|otra vez el pdf|reenvio|enviala por aqui|mandala por aqui|dame por aqui|pasala por aqui|donde esta la cotizacion|donde va la cotizacion|estado de la cotizacion|no la veo|no llego el pdf|no me llego el pdf|aun no llega el pdf)/.test(t);
}

function isInventoryInfoIntent(text: string): boolean {
  const t = normalizeText(text);
  if (isPriceIntent(t)) return false;
  return (
    /(cuantos|cuantas|numero de|cantidad de).*(productos|equipos|referencias|items)/.test(t) ||
    /(catalogo|inventario).*(productos|equipos|referencias)/.test(t) ||
    /(que|cuales).*(productos|prodcutos|equipos).*(tienen|manejan|venden|ofrecen)/.test(t) ||
    /(productos|prodcutos|producto|prodcuto|equipos|equipo).*(tienen|tiene|manejan|maneja|venden|vende|ofrecen|ofrece)/.test(t) ||
    /(que mas producto|que mas productos|que otros productos|que otras referencias|que mas tienes|que otro tienes)/.test(t) ||
    /(tiene|tienen|tinen|hay).*(balanza|balanzas|blanza|blanzas|bascula|basculas|bscula|bsculas)/.test(t)
  );
}

function isRecommendationIntent(text: string): boolean {
  const t = normalizeText(text);
  return /(recomiend|que me puedes recomendar|que me recomiendas|modelo ideal|que modelo|cual modelo|no se que modelo|no se cual|me sirve|para mi caso|que balanza|tipo de balanza|tipos de balanzas|clase de balanza|sugerencia|busco\s+(una\s+)?balanza|necesito\s+(una\s+)?balanza|gramera|ley\s+de\s+oro|quilat|kilat|joyeria|control\s+de\s+calidad|laboratorio)/.test(t);
}

function isUseCaseApplicabilityIntent(text: string): boolean {
  const t = normalizeText(text || "");
  if (!t) return false;
  return (
    /(sirve\s+para|me\s+sirve\s+para|funciona\s+para|aplica\s+para|se\s+puede\s+usar\s+para|puede\s+pesar|pesa\s+\w+|pesar\s+\w+)/.test(t) ||
    (/(tornillo|tornillos|tuerca|tuercas|perno|pernos|maquina|maquinas|equipo|equipos|pieza|piezas|muestra|muestras)/.test(t) && /(producto|modelo|balanza|bascula|este|esta)/.test(t))
  );
}

function isUseCaseFamilyHint(text: string): boolean {
  const t = normalizeText(text || "");
  if (!t) return false;
  return /(joyeria|joyería|oro|ley\s+de\s+oro|quilat|kilat|gramera|laboratorio|farmacia|industrial|produccion|producción|bodega|maquina|máquina|control\s+de\s+calidad|formulacion|formulación)/.test(t);
}

function isCatalogBreadthQuestion(text: string): boolean {
  const t = normalizeCatalogQueryText(String(text || ""));
  if (!t) return false;
  return (
    /(que\s+mas|que\s+otros?|otras\s+referencias|mas\s+referencias|catalogo\s+completo)/.test(t) ||
    /(?:producto|productos|prodcutos|productod|referencia|referencias).*(tien|manej|ofrec|hay)/.test(t)
  );
}

function isGlobalCatalogAsk(text: string): boolean {
  const t = normalizeCatalogQueryText(String(text || ""));
  if (!t) return false;
  return (
    /(dame|muestrame|mu[eé]strame|quiero|ver).*(todo\s+el\s+catalogo|catalogo\s+completo|dame\s+el\s+catalogo|catalogo)/.test(t) ||
    /(dame|muestrame|mu[eé]strame|quiero|ver).*(todos\s+los\s+productos|todos\s+los\s+prodcutos|todas\s+las\s+referencias|todos\s+los\s+equipos)/.test(t) ||
    /^catalogo$/.test(t)
  );
}

function isOutOfCatalogDomainQuery(text: string): boolean {
  const t = normalizeText(text || "");
  if (!t) return false;
  const outTerms = /(tornillo|tornillos|herramienta|herramientas|taladro|martillo|llave inglesa|destornillador|broca|ferreteria|ferreteria|tuerca|perno|clavo|soldadura|silicona|pintura|tenedor|tenedores|cuchillo|cuchillos|cuchara|cucharas|plato|platos|vaso|vasos|carro|carros|vehiculo|vehiculos)/.test(t);
  if (!outTerms) return false;
  const inDomain = /(balanza|balanzas|bascula|basculas|ohaus|analitica|precision|trm|cotizacion|ficha tecnica|humedad|electroquimica|laboratorio|centrifuga|mezclador|agitador|modelo|producto|referencia|sirve para|me sirve|puede pesar|pesar)/.test(t);
  return outTerms && !inDomain;
}

function isUnsupportedSpecificAnalyzerRequest(text: string): boolean {
  const t = normalizeText(text || "");
  if (!t) return false;
  const asksMoistureAnalyzer = /(anali[sz]ador(?:es)?|humedad)/.test(t);
  if (!asksMoistureAnalyzer) return false;
  return /(fibra\s+de\s+carbono|fibra\s+de\s+carbon|carbon\s+fiber|carbono\s+composito|compuesto\s+de\s+carbono)/.test(t);
}

function hasCarbonAnalyzerMatch(rows: any[]): boolean {
  const list = Array.isArray(rows) ? rows : [];
  return list.some((row: any) => {
    const source = row?.source_payload && typeof row.source_payload === "object" ? row.source_payload : {};
    const hay = normalizeText([
      String(row?.name || ""),
      String(row?.summary || ""),
      String(row?.description || ""),
      String(row?.specs_text || ""),
      JSON.stringify(source || {}),
    ].join(" "));
    return /(fibra\s+de\s+carbono|fibra\s+de\s+carbon|carbon\s+fiber|carbono\s+composito|compuesto\s+de\s+carbono)/.test(hay);
  });
}

function listActiveCatalogCategories(rows: any[]): string {
  const list = Array.isArray(rows) ? rows : [];
  const counts = new Map<string, number>();
  for (const row of list) {
    const cat = normalizeText(String(row?.category || ""));
    if (!cat) continue;
    counts.set(cat, (counts.get(cat) || 0) + 1);
  }
  const labels: Array<{ key: string; label: string; count: number }> = [
    { key: "balanzas", label: "balanzas", count: counts.get("balanzas") || 0 },
    { key: "basculas", label: "basculas", count: counts.get("basculas") || 0 },
    { key: "analizador_humedad", label: "analizador de humedad", count: counts.get("analizador_humedad") || 0 },
    { key: "electroquimica", label: "electroquimica", count: counts.get("electroquimica") || 0 },
    { key: "equipos_laboratorio", label: "equipos de laboratorio", count: counts.get("equipos_laboratorio") || 0 },
  ].filter((x) => x.count > 0);
  if (!labels.length) return "catalogo activo limitado";
  return labels.map((x) => `${x.label} (${x.count})`).join(", ");
}

type GuidedBalanzaProfile =
  | "balanza_oro_001"
  | "balanza_precision_001"
  | "balanza_laboratorio_0001"
  | "balanza_semimicro_00001"
  | "balanza_industrial_portatil_conteo";

type GuidedModelSpec = { model: string; capacity: string; resolution: string; delivery: string };

const MARIANA_ESCALATION_LINK = "https://wa.me/573183731171";

const GUIDED_BALANZA_CATALOG: Record<GuidedBalanzaProfile, Array<{ tier: string; models: GuidedModelSpec[] }>> = {
  balanza_oro_001: [
    { tier: "Línea esencial: soluciones confiables para empresas en crecimiento", models: [
      { model: "PX3202/E", capacity: "3200 g", resolution: "0,01 g", delivery: "stock" },
      { model: "PX1602/E", capacity: "1600 g", resolution: "0,01 g", delivery: "importación a cuatro semanas" },
      { model: "PX4202/E", capacity: "4200 g", resolution: "0,01 g", delivery: "importación a cuatro semanas" },
      { model: "PX6202/E", capacity: "6200 g", resolution: "0,01 g", delivery: "importación a cuatro semanas" },
    ] },
    { tier: "Línea intermedia: mayor desempeño y funciones para empresas en expansión", models: [
      { model: "AX2202/E", capacity: "2200 g", resolution: "0,01 g", delivery: "importación a cuatro semanas" },
      { model: "AX6202/E", capacity: "6200 g", resolution: "0,01 g", delivery: "importación a cuatro semanas" },
    ] },
    { tier: "Línea avanzada: mayor rendimiento para empresas con alta demanda", models: [
      { model: "EXR2202", capacity: "2200 g", resolution: "0,01 g", delivery: "importación a cuatro semanas" },
      { model: "EXR4202", capacity: "4200 g", resolution: "0,01 g", delivery: "importación a cuatro semanas" },
      { model: "EXR6202", capacity: "6200 g", resolution: "0,01 g", delivery: "importación a cuatro semanas" },
      { model: "EXR12202", capacity: "12200 g", resolution: "0,01 g", delivery: "importación a cuatro semanas" },
    ] },
    { tier: "Línea premium: soluciones de alto nivel para empresas de gran escala", models: [
      { model: "EXP2202", capacity: "2200 g", resolution: "0,01 g", delivery: "importación a cuatro semanas" },
      { model: "EXP4202", capacity: "4200 g", resolution: "0,01 g", delivery: "importación a cuatro semanas" },
      { model: "EXP6202", capacity: "6200 g", resolution: "0,01 g", delivery: "importación a cuatro semanas" },
      { model: "EXP12202", capacity: "12200 g", resolution: "0,01 g", delivery: "importación a cuatro semanas" },
    ] },
  ],
  balanza_precision_001: [
    { tier: "Línea esencial: soluciones confiables para empresas en crecimiento", models: [
      { model: "PX323/E", capacity: "320 g", resolution: "0,001 g", delivery: "stock" },
      { model: "PX623/E", capacity: "620 g", resolution: "0,001 g", delivery: "stock" },
    ] },
    { tier: "Línea intermedia: mayor desempeño y funciones para empresas en expansión", models: [
      { model: "AX223/E", capacity: "220 g", resolution: "0,001 g", delivery: "importación a cuatro semanas" },
      { model: "AX423/E", capacity: "420 g", resolution: "0,001 g", delivery: "importación a cuatro semanas" },
      { model: "AX623/E", capacity: "620 g", resolution: "0,001 g", delivery: "importación a cuatro semanas" },
    ] },
    { tier: "Línea avanzada: mayor rendimiento para empresas con alta demanda", models: [
      { model: "EXP223/AD", capacity: "220 g", resolution: "0,001 g", delivery: "importación a cuatro semanas" },
      { model: "EXP423/AD", capacity: "420 g", resolution: "0,001 g", delivery: "importación a cuatro semanas" },
      { model: "EXP623/AD", capacity: "620 g", resolution: "0,001 g", delivery: "importación a cuatro semanas" },
    ] },
    { tier: "Línea premium: soluciones de alto nivel para empresas de gran escala", models: [
      { model: "EXP1203/AD", capacity: "1200 g", resolution: "0,001 g", delivery: "importación a cuatro semanas" },
    ] },
  ],
  balanza_laboratorio_0001: [
    { tier: "Línea esencial: soluciones confiables para empresas en crecimiento", models: [
      { model: "PX224/E", capacity: "220 g", resolution: "0,001 g", delivery: "stock" },
    ] },
    { tier: "Línea intermedia: mayor desempeño y funciones para empresas en expansión", models: [
      { model: "AX224/E", capacity: "220 g", resolution: "0,0001 g", delivery: "stock" },
    ] },
    { tier: "Línea avanzada: mayor rendimiento para empresas con alta demanda", models: [
      { model: "EXP224/AD", capacity: "220 g", resolution: "0,0001 g", delivery: "importación a cuatro semanas" },
      { model: "EXP324/AD", capacity: "320 g", resolution: "0,0001 g", delivery: "importación a cuatro semanas" },
    ] },
  ],
  balanza_semimicro_00001: [
    { tier: "Línea esencial: soluciones confiables para empresas en crecimiento", models: [
      { model: "PX85", capacity: "82 g", resolution: "0,00001 g", delivery: "importación a cuatro semanas" },
      { model: "PX225D", capacity: "220 g", resolution: "0,00001 g", delivery: "importación a cuatro semanas" },
    ] },
    { tier: "Línea intermedia: mayor desempeño y funciones para empresas en expansión", models: [
      { model: "AX85", capacity: "82 g", resolution: "0,00001 g", delivery: "importación a cuatro semanas" },
      { model: "AX125D", capacity: "82 g / 120 g", resolution: "0,00001 g", delivery: "importación a cuatro semanas" },
      { model: "AX225D", capacity: "220 g", resolution: "0,00001 g", delivery: "importación a cuatro semanas" },
    ] },
    { tier: "Línea avanzada: mayor rendimiento para empresas con alta demanda", models: [
      { model: "EXR125D", capacity: "82 g / 120 g", resolution: "0,00001 g", delivery: "importación a cuatro semanas" },
      { model: "EXR225D", capacity: "120 g / 220 g", resolution: "0,00001 g", delivery: "importación a cuatro semanas" },
    ] },
    { tier: "Línea premium: soluciones de alto nivel para empresas de gran escala", models: [
      { model: "EXP125D/AD", capacity: "82 g / 120 g", resolution: "0,00001 g", delivery: "importación a cuatro semanas" },
      { model: "EXP225D/AD", capacity: "220 g", resolution: "0,00001 g", delivery: "importación a cuatro semanas" },
    ] },
  ],
  balanza_industrial_portatil_conteo: [
    { tier: "Línea básica (uso industrial estándar)", models: [
      { model: "R31P3", capacity: "3000 g", resolution: "0,1 g", delivery: "stock" },
      { model: "R31P6", capacity: "6000 g", resolution: "0,2 g", delivery: "stock" },
      { model: "R31P15", capacity: "15000 g", resolution: "0,5 g", delivery: "stock" },
      { model: "R31P30", capacity: "30000 g", resolution: "1 g", delivery: "stock" },
    ] },
    { tier: "Línea básica (uso industrial estándar con conteo especial)", models: [
      { model: "RC31P3", capacity: "3000 g", resolution: "0,1 g", delivery: "stock" },
      { model: "RC31P6", capacity: "6000 g", resolution: "0,2 g", delivery: "stock" },
      { model: "RC31P15", capacity: "15000 g", resolution: "0,5 g", delivery: "stock" },
      { model: "RC31P30", capacity: "30000 g", resolution: "1 g", delivery: "stock" },
    ] },
    { tier: "Línea media (mayor precisión)", models: [
      { model: "R71MD3", capacity: "3000 g", resolution: "0,05 g", delivery: "importación a cuatro semanas" },
      { model: "R71MD6", capacity: "6000 g", resolution: "0,1 g", delivery: "importación a cuatro semanas" },
      { model: "R71MD35", capacity: "35000 g", resolution: "0,5 g", delivery: "importación a cuatro semanas" },
      { model: "R71MD60", capacity: "60000 g", resolution: "1 g", delivery: "importación a cuatro semanas" },
    ] },
    { tier: "Línea alta (alta precisión industrial)", models: [
      { model: "R71MHD3", capacity: "3000 g", resolution: "0,01 g", delivery: "stock" },
      { model: "R71MHD6", capacity: "6000 g", resolution: "0,02 g", delivery: "importación a cuatro semanas" },
      { model: "R71MHD35", capacity: "35000 g", resolution: "0,1 g", delivery: "stock" },
    ] },
  ],
};

function buildCommercialWelcomeMessage(): string {
  return [
    "¡Hola! Bienvenido a Avanza International Group. Representantes de la marca OHAUS en Colombia, con 120 años de trayectoria mundial en equipos de pesaje y laboratorio. Contamos con 25 años brindando respaldo y soporte especializado.",
    "",
    "¿Ya nos conoces? 👇",
    "1) Soy cliente nuevo",
    "2) Ya soy cliente de Avanza",
  ].join("\n");
}

function extractCompanyNit(text: string): string {
  const raw = String(text || "");
  const labeled = raw.match(/\bnit\s*[:=]?\s*([0-9.\-]{5,20})/i)?.[1] || "";
  const fallback = (!labeled ? raw.match(/\b([0-9]{7,14}(?:-[0-9])?)\b/)?.[1] : "") || "";
  return String(labeled || fallback).replace(/[^0-9.-]/g, "").trim();
}

function normalizeNitParts(rawNit: string): { base: string; dv: string } {
  const cleaned = String(rawNit || "").replace(/\s+/g, "").replace(/\./g, "");
  if (!cleaned) return { base: "", dv: "" };
  if (cleaned.includes("-")) {
    const [base, dv] = cleaned.split("-");
    return {
      base: String(base || "").replace(/\D/g, ""),
      dv: String(dv || "").replace(/\D/g, "").slice(0, 1),
    };
  }
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length < 8) return { base: "", dv: "" };
  return { base: digits.slice(0, -1), dv: digits.slice(-1) };
}

function isValidColombianNit(rawNit: string): boolean {
  const digitsOnly = String(rawNit || "").replace(/\D/g, "");
  if (/^\d{8,12}$/.test(digitsOnly)) return true;
  const { base, dv } = normalizeNitParts(rawNit);
  if (!base || !dv) return false;
  if (!/^\d{6,12}$/.test(base) || !/^\d$/.test(dv)) return false;
  const weights = [71, 67, 59, 53, 47, 43, 41, 37, 29, 23, 19, 17, 13, 7, 3];
  const digits = base.split("").map((d) => Number(d));
  if (digits.length > weights.length) return false;
  const offset = weights.length - digits.length;
  let sum = 0;
  for (let i = 0; i < digits.length; i += 1) sum += digits[i] * weights[offset + i];
  const remainder = sum % 11;
  const expected = remainder > 1 ? 11 - remainder : remainder;
  return expected === Number(dv);
}

function isLikelyRutValue(rawRut: string): boolean {
  const cleaned = String(rawRut || "").replace(/\s+/g, "").replace(/\./g, "");
  if (!cleaned) return false;
  const digits = cleaned.replace(/\D/g, "");
  return digits.length >= 7;
}

function detectPersonaNatural(text: string): boolean {
  const t = normalizeText(String(text || ""));
  return /persona\s+natural|soy\s+natural|no\s+tengo\s+empresa|sin\s+empresa/.test(t);
}

function extractRut(text: string): string {
  const raw = String(text || "");
  const labeled = raw.match(/\brut\s*[:=]?\s*([a-z0-9.\-]{5,24})/i)?.[1] || "";
  return String(labeled || "").trim();
}

function extractCommercialCompanyName(text: string): string {
  const raw = String(text || "");
  const labeled =
    raw.match(/\b(?:empresa|compania|compañia|razon\s+social)\s*[:=]?\s*([^\n,;]{3,120})/i)?.[1] ||
    "";
  const cleaned = String(labeled || "").trim();
  if (!cleaned) return "";
  if (/^(persona\s+natural|natural)$/i.test(cleaned)) return "";
  return cleaned;
}

function updateCommercialValidation(memory: any, text: string, fallbackName: string) {
  const inferredName = sanitizeCustomerDisplayName(extractCustomerName(text, fallbackName || ""));
  const nit = extractCompanyNit(text);
  const rut = extractRut(text);
  const company = extractCommercialCompanyName(text);
  const saysPersonaNatural = detectPersonaNatural(text);

  if (inferredName && !String(memory?.customer_name || "").trim()) memory.customer_name = inferredName;
  if (inferredName) memory.commercial_customer_name = inferredName;
  if (company) memory.commercial_company_name = company;
  if (nit) memory.commercial_company_nit = nit;
  if (rut) memory.commercial_rut = rut;
  if (saysPersonaNatural) memory.is_persona_natural = true;

  memory.has_customer_name = Boolean(String(memory?.commercial_customer_name || memory?.customer_name || "").trim());
  memory.has_company_name = Boolean(String(memory?.commercial_company_name || "").trim());
  memory.has_company_nit = isValidColombianNit(String(memory?.commercial_company_nit || ""));
  memory.has_rut = isLikelyRutValue(String(memory?.commercial_rut || ""));
  memory.has_valid_nit = memory.has_company_nit;
  memory.has_valid_rut = memory.has_rut;
  memory.is_persona_natural = Boolean(memory?.is_persona_natural);
  memory.commercial_validation_complete = memory.is_persona_natural
    ? Boolean(memory.has_customer_name && memory.has_rut)
    : Boolean(memory.has_customer_name && memory.has_company_name && memory.has_company_nit);
}

function buildCommercialEscalationMessage(): string {
  return [
    "⚠️ Si no contamos con esta información, no podremos continuar con el proceso.",
    "Para continuar con este proceso te pondremos en contacto con nuestra asesora Mariana.",
    "Mariana: +57 318 3731171",
    `https://wa.me/573183731171`,
  ].join("\n");
}

function looksLikeCommercialDataInput(text: string): boolean {
  const t = normalizeText(String(text || ""));
  if (!t) return false;
  return /(\bnit\b|\brut\b|\bnombre\b|\bempresa\b|\brazon\s+social\b|persona\s+natural)/.test(t);
}

function buildCommercialValidationOkMessage(): string {
  return [
    "Perfecto, datos registrados correctamente.",
    "¿En qué equipo estás interesado?",
    "1) Balanza",
    "2) Báscula",
    "3) Pesas patrón",
    "4) Analizadores de humedad",
    "5) Agitadores orbitales",
    "6) Planchas de calentamiento y agitación",
    "7) Centrífugas",
    "8) Electroquímica (pHmetro, conductivímetro, multiparámetro y electrodos)",
    "9) Otros",
  ].join("\n");
}

function buildNewCustomerDataPrompt(): string {
  return [
    "Para generar tu cotización es necesario registrar tus datos en nuestra plataforma.",
    "Compárteme en un solo mensaje:",
    "- Departamento/ciudad",
    "- Empresa",
    "- NIT (sin puntos, comas ni guiones)",
    "- Nombre de Contacto",
    "- Correo",
    "- Celular",
    "",
    "⚠️ Si no contamos con esta información, no podremos continuar con el proceso.",
  ].join("\n");
}

function buildExistingClientLookupPrompt(): string {
  return [
    "Perfecto. Para validar que ya eres cliente de Avanza, compárteme uno de estos datos:",
    "- NIT de la empresa",
    "- Celular registrado",
    "",
    "Puedes enviarlo en un solo mensaje (ej: NIT 900505419 o celular 3131657711).",
  ].join("\n");
}

function buildExistingClientMatchConfirmationPrompt(args: {
  company: string;
  nit: string;
  contact: string;
  email: string;
  phone: string;
}): string {
  const company = String(args.company || "").trim() || "Empresa no registrada";
  const nit = String(args.nit || "").trim() || "NIT no registrado";
  const contact = String(args.contact || "").trim() || "Contacto no registrado";
  const email = String(args.email || "").trim() || "Correo no registrado";
  const phone = String(args.phone || "").trim() || "Celular no registrado";
  return [
    "Perfecto, encontré estos datos en nuestra base:",
    `- Empresa: ${company}`,
    `- NIT: ${nit}`,
    `- Contacto: ${contact}`,
    `- Correo: ${email}`,
    `- Celular: ${phone}`,
    "",
    "¿Eres la misma persona de contacto?",
    "1) Sí, continuar",
    "2) No, soy otra persona/área",
  ].join("\n");
}

function detectExistingClientConfirmationChoice(text: string): "same" | "different" | "" {
  const t = normalizeText(String(text || "")).replace(/[^a-z0-9\s]/g, " ").trim();
  if (!t) return "";
  if (/^(1|si|sí|soy yo|misma persona|correcto|confirmo|continuar)$/.test(t) || /(misma\s+persona|soy\s+yo|si\s+continuar)/.test(t)) return "same";
  if (/^(2|no|otra persona|otro contacto|otra area|otra área|cambio de personal)$/.test(t) || /(otra\s+persona|otro\s+contacto|otra\s+area|otra\s+área|cambio\s+de\s+personal)/.test(t)) return "different";
  return "";
}

function parseExistingContactUpdateData(text: string, fallbackInboundPhone: string): {
  name: string;
  email: string;
  phone: string;
  area: string;
} {
  const raw = String(text || "");
  const name = sanitizeCustomerDisplayName(
    extractSimpleLabeledValue(raw, ["nombre", "contacto", "encargado", "responsable"]) ||
    extractCustomerName(raw, "")
  );
  const email = String(extractEmail(raw) || "").trim().toLowerCase();
  const phone = normalizePhone(String(extractCustomerPhone(raw, fallbackInboundPhone || "") || "").trim());
  const area = String(extractSimpleLabeledValue(raw, ["area", "área", "cargo", "departamento"]) || "").trim();
  return { name, email, phone, area };
}

function buildEquipmentMenuPrompt(): string {
  return [
    "¿En qué equipo estás interesado?",
    "1) Balanza",
    "2) Báscula",
    "3) Pesas patrón",
    "4) Analizadores de humedad",
    "5) Agitadores orbitales",
    "6) Planchas de calentamiento y agitación",
    "7) Centrífugas",
    "8) Electroquímica (pHmetro, conductivímetro, multiparámetro y electrodos)",
    "9) Otros",
  ].join("\n");
}

function buildBalanzaQualificationPrompt(): string {
  return "¿Qué capacidad y resolución requiere la balanza y qué tipo de muestras va a pesar?";
}

function buildCapacityResolutionExplanation(): string {
  return [
    "Capacidad:",
    "Es el peso máximo que una balanza puede medir.",
    "👉 Ejemplo: si la capacidad es de 5 kg, no puedes pesar más de eso.",
    "",
    "Resolución:",
    "Es la cantidad de dígitos que ves después del punto (.) en el peso, y define qué tan preciso es el resultado.",
    "👉 Ejemplo:",
    "1 decimal → 0.1 g = 100 mg",
    "2 decimales → 0.01 g = 10 mg",
    "3 decimales → 0.001 g = 1 mg",
    "",
    "En pocas palabras:",
    "Capacidad = cuánto peso aguanta",
    "Resolución = cuántos decimales muestra (qué tan exacto mide) 👍",
  ].join("\n");
}

function isCapacityResolutionHelpIntent(text: string): boolean {
  const t = normalizeText(String(text || ""));
  return /(no\s+se|no\s+entiendo|que\s+es\s+la\s+capacidad|que\s+es\s+la\s+resolucion|no\s+entiendo\s+capacidad|explicame\s+capacidad|explicame\s+resolucion)/.test(t);
}

function detectClientRecognitionChoice(text: string): "new" | "existing" | "" {
  const t = normalizeText(String(text || "")).replace(/[^a-z0-9\s]/g, " ").trim();
  if (/^1$/.test(t) || /cliente\s+nuevo|soy\s+nuevo/.test(t)) return "new";
  if (/^2$/.test(t) || /ya\s+soy\s+cliente|ya\s+los\s+conozco|cliente\s+de\s+avanza/.test(t)) return "existing";
  return "";
}

function extractSimpleLabeledValue(text: string, keys: string[]): string {
  const source = String(text || "");
  for (const k of keys) {
    const m = source.match(new RegExp(`\\b${k}\\b\\s*[:=]?\\s*([^\\n,;]+)`, "i"));
    if (m?.[1]) return String(m[1]).trim();
  }
  return "";
}

function extractLooseNewCustomerFields(text: string): { city: string; company: string; nit: string; contact: string } {
  const raw = String(text || "");
  const lines = raw
    .split(/\n|;|,/) 
    .map((l) => String(l || "").trim())
    .filter(Boolean);
  let looseNit = "";
  for (const line of lines) {
    const candidate = String(line || "").replace(/\D/g, "");
    if (/^\d{8,12}$/.test(candidate)) {
      looseNit = candidate;
      break;
    }
  }
  const filtered = lines.filter((line) => {
    const l = normalizeText(line);
    if (looseNit && String(line).replace(/\D/g, "") === looseNit) return false;
    if (/@/.test(line)) return false;
    if (/^\+?\d[\d\s()-]{8,}$/.test(line)) return false;
    if (/\bnit\b|\bcorreo\b|\bemail\b|\bcel\b|\bcelular\b|\btelefono\b/.test(l)) return false;
    return true;
  });
  return {
    city: String(filtered[0] || "").trim(),
    company: String(filtered[1] || "").trim(),
    contact: String(filtered[2] || "").trim(),
    nit: looseNit,
  };
}

function updateNewCustomerRegistration(memory: any, text: string, fallbackName: string) {
  const current = memory?.new_customer_data && typeof memory.new_customer_data === "object" ? memory.new_customer_data : {};
  const loose = extractLooseNewCustomerFields(text);
  const city = normalizeCityLabel(extractSimpleLabeledValue(text, ["departamento", "ciudad"]) || loose.city || current.city || "");
  const company = extractSimpleLabeledValue(text, ["empresa", "razon social", "compania", "compañia"]) || loose.company || current.company || "";
  const nit = String(extractSimpleLabeledValue(text, ["nit"]) || loose.nit || current.nit || "").replace(/\D/g, "").trim();
  const contact = sanitizeCustomerDisplayName(extractSimpleLabeledValue(text, ["nombre de contacto", "contacto", "nombre"]) || loose.contact || current.contact || extractCustomerName(text, fallbackName || ""));
  const email = String(extractEmail(text) || current.email || "").trim().toLowerCase();
  const phone = normalizePhone(String(extractCustomerPhone(text, "") || current.phone || "").trim());

  memory.new_customer_data = { city, company, nit, contact, email, phone };
  memory.commercial_customer_name = contact || memory.commercial_customer_name || "";
  memory.commercial_company_name = company || memory.commercial_company_name || "";
  memory.commercial_company_nit = nit || memory.commercial_company_nit || "";
  memory.customer_name = contact || memory.customer_name || "";
}

function getMissingNewCustomerFields(memory: any): string[] {
  const d = memory?.new_customer_data && typeof memory.new_customer_data === "object" ? memory.new_customer_data : {};
  const missing: string[] = [];
  if (!String(d.city || "").trim()) missing.push("Departamento/ciudad");
  if (!String(d.company || "").trim()) missing.push("Empresa");
  if (!/^\d{8,12}$/.test(String(d.nit || "").replace(/\D/g, ""))) missing.push("NIT (sin puntos, comas ni guiones)");
  if (!String(d.contact || "").trim()) missing.push("Nombre de Contacto");
  if (!String(d.email || "").trim()) missing.push("Correo");
  if (!/^\d{10,15}$/.test(String(d.phone || "").replace(/\D/g, ""))) missing.push("Celular");
  return missing;
}

function buildMissingNewCustomerDataMessage(missing: string[]): string {
  return [
    "⚠️ Si no contamos con esta información, no podremos continuar con el proceso.",
    `Por favor completa: ${missing.join(", ")}.`,
  ].join("\n");
}

function shouldEscalateToAdvisorByCommercialRule(memory: any, text: string): boolean {
  const t = normalizeText(String(text || ""));
  if (Boolean(memory?.is_persona_natural)) return true;
  if (/solo\s+precio|solamente\s+precio|dame\s+precio\s+solamente/.test(t)) return true;
  if (/no\s+quiero\s+dar\s+datos|no\s+dare\s+datos|sin\s+datos/.test(t)) return true;
  return false;
}

function detectEquipmentChoice(text: string): string {
  const t = normalizeText(String(text || "")).replace(/[^a-z0-9\s]/g, " ").trim();
  if (/^1$/.test(t) || /balanza/.test(t)) return "balanza";
  if (/^2$/.test(t) || /bascula|báscula/.test(t)) return "bascula";
  if (/^3$/.test(t) || /pesas?\s+patron/.test(t)) return "pesas_patron";
  if (/^4$/.test(t) || /analizador/.test(t)) return "analizador_humedad";
  if (/^5$/.test(t) || /agitador/.test(t)) return "agitador_orbital";
  if (/^6$/.test(t) || /planchas?/.test(t)) return "plancha_agitacion";
  if (/^7$/.test(t) || /centrifug/.test(t)) return "centrifuga";
  if (/^8$/.test(t) || /electroquim|phmetro|conductivimetro|multiparametro|electrodos/.test(t)) return "electroquimica";
  if (/^9$/.test(t) || /otros?/.test(t)) return "otros";
  return "";
}

function isExplicitFamilyMenuAsk(text: string): boolean {
  const t = normalizeText(String(text || "")).replace(/[^a-z0-9\s]/g, " ").trim();
  if (!t) return false;
  if (/^(balanza|balanzas|bascula|basculas|opciones|alternativas|familias|categorias|categorias\s+activas)$/.test(t)) return true;
  return /(que\s+opciones\s+tienes|que\s+familias\s+tienes|que\s+categorias\s+tienes|muestrame\s+familias|muestrame\s+categorias|dame\s+el\s+menu)/.test(t);
}

function normalizeDeliveryLabel(raw: string): string {
  const t = normalizeText(String(raw || ""));
  if (!t) return "";
  if (/(stock|inmediat|disponible\s+ya|entrega\s+inmediata)/.test(t)) return "stock";
  if (/(4\s*seman|cuatro\s*seman|importaci)/.test(t)) return "importación a cuatro semanas";
  return String(raw || "").trim();
}

function deliveryLabelForRow(row: any): string {
  const source = row?.source_payload && typeof row.source_payload === "object" ? row.source_payload : {};
  const fromRow = [row?.delivery, row?.delivery_time, row?.lead_time, row?.availability, row?.disponibilidad]
    .map((v) => String(v || "").trim())
    .find(Boolean) || "";
  const fromSource = [source?.delivery, source?.delivery_time, source?.lead_time, source?.availability, source?.disponibilidad, source?.entrega]
    .map((v: any) => String(v || "").trim())
    .find(Boolean) || "";
  const direct = normalizeDeliveryLabel(fromRow || fromSource);
  if (direct) return direct;
  const modelNorm = normalizeText(catalogReferenceCode(row) || String(row?.name || ""));
  const guided = Object.values(GUIDED_BALANZA_CATALOG)
    .flatMap((g) => g)
    .flatMap((g) => g.models)
    .find((m) => modelNorm.includes(normalizeText(m.model)));
  return guided?.delivery || "";
}

function detectGuidedBalanzaProfile(text: string): GuidedBalanzaProfile | null {
  const t = normalizeText(String(text || ""));
  const hasGrameraWord = /\bgramera\b/.test(t);
  const hasOro = /(oro|joyeria|joyería|minero|calidad\s+del\s+oro|dos\s+cifras|densidad\s+para\s+oro)/.test(t);
  const hasThree = /(tres\s+cifras|0\s*[,.]\s*001|1\s*mg|cabina|cosmetic|menos\s+de\s+200|menos\s+de\s+300)/.test(t);
  const hasFour = /(cuatro\s+cifras|0\s*[,.]\s*0001|0\s*[,.]\s*1\s*mg|laboratorio|laboratorio\s+de\s+alimentos)/.test(t);
  const hasFive = /(cinco\s+cifras|0\s*[,.]\s*00001|0\s*[,.]\s*01\s*mg|semi\s*micro|semimicro|usp|microgram|migrogram)/.test(t);
  const hasIndustrial = /(portatil|portátil|recargable|plato\s+grande|cuenta\s+piezas|tres\s+pantallas|tornillos|30\s*kg|15\s*kg|gramo\s+por\s+gramo)/.test(t);
  const hasGrameraOnly = hasGrameraWord && !hasOro && !hasThree && !hasFour && !hasFive && !hasIndustrial;

  if (hasGrameraOnly) return null;
  if (hasFive) return "balanza_semimicro_00001";
  if (hasFour) return "balanza_laboratorio_0001";
  if (hasIndustrial) return "balanza_industrial_portatil_conteo";
  if (hasOro) return "balanza_oro_001";
  if (hasThree || hasGrameraWord) return "balanza_precision_001";
  return null;
}

function buildGuidedBalanzaReply(profile: GuidedBalanzaProfile): string {
  const groups = GUIDED_BALANZA_CATALOG[profile] || [];
  const intro = profile === "balanza_industrial_portatil_conteo"
    ? "Sí, contamos con básculas industriales portátiles para conteo que se ajustan a tu necesidad."
    : "Sí, contamos con balanzas de precisión que se ajustan a tu necesidad.";
  const estimated = profile === "balanza_industrial_portatil_conteo"
    ? "💰 Valores estimados: desde $3.500.000 (según gama y funcionalidad). Deseas continuar con la cotización"
    : "💰 Valores estimados: desde $4.000.000 (según gama y funcionalidad). Deseas continuar con la cotización";
  let modelIndex = 1;
  return [
    intro,
    estimated,
    ...groups.flatMap((group) => [
      "",
      group.tier,
      ...group.models.map((m) => `${modelIndex++}) ${m.model} – ${m.capacity} x ${m.resolution} (${m.delivery})`),
    ]),
    "",
    "Responde con número que se encuentra al principio del modelo (ej.: 1).",
    "Si deseas cotizar varias unidades, puedes escribir: “cotizar 2” o “cotizar 3” (máximo 3 equipos por solicitud).",
    "Si tienes dudas, escribe “asesor” para recibir acompañamiento especializado.",
  ].join("\n");
}

function pickYoutubeVideoForModel(modelName: string): string {
  const n = normalizeText(String(modelName || "")).replace(/[^a-z0-9]/g, "");
  if (!n) return "";

  if (/^(px3202e|px1602e|px4202e|px6202e|px323e|px623e|px224e)$/.test(n)) return "https://www.youtube.com/watch?v=7ZsVR_jgeLE";
  if (/^(ax2202e|ax6202e|ax223e|ax423e|ax623e|ax224e)$/.test(n)) return "https://www.youtube.com/watch?v=70aadRdYOAI";
  if (/^(exr2202|exr4202|exr6202|exr12202|exp2202|exp4202|exp6202|exp12202|exp223ad|exp423ad|exp623ad|exp1203ad|exp224ad|exp324ad)$/.test(n)) return "https://www.youtube.com/watch?v=g6vM5wGsOi4";

  if (/^(px85|px225d)$/.test(n)) return "https://www.youtube.com/watch?v=ntnDSczGmD4";
  if (/^(ax85|ax125d|ax225d|exr125d|exr225d|exp125dad|exp225dad)$/.test(n)) return "https://www.youtube.com/watch?v=uZJxn0o4PDk";

  if (/^r31p/.test(n)) return "https://www.youtube.com/watch?v=poLl3iDjTaE";
  if (/^rc31p/.test(n)) return "https://www.youtube.com/watch?v=Af2j9V6QR9w";
  if (/^r71(md|mhd)/.test(n)) return "https://www.youtube.com/watch?v=r2YqUbDcCcE";

  return "";
}

function buildGuidedPendingOptions(rows: any[], profile: GuidedBalanzaProfile): any[] {
  const rowList = Array.isArray(rows) ? rows : [];
  const orderedModels = (GUIDED_BALANZA_CATALOG[profile] || []).flatMap((g) => g.models);
  const options = orderedModels.map((m, i) => {
    const modelNorm = normalizeText(m.model);
    const hit = rowList.find((r: any) => {
      const n = normalizeText(String(r?.name || ""));
      return n === modelNorm || n.includes(modelNorm);
    });
    return {
      code: String(i + 1),
      rank: i + 1,
      id: String(hit?.id || ""),
      name: `${m.model} | Cap: ${m.capacity} | Res: ${m.resolution} | Entrega: ${m.delivery}`,
      raw_name: String(hit?.name || m.model),
      category: String(hit?.category || "balanzas"),
      base_price_usd: Number(hit?.base_price_usd || 0),
    };
  });
  return options;
}

type ConversationIntent =
  | "guided_need_discovery"
  | "menu_selection"
  | "technical_spec_input"
  | "use_explanation_question"
  | "compatibility_question"
  | "application_update"
  | "alternative_request"
  | "pricing_request"
  | "quote_confirmation"
  | "billing_data_input"
  | "category_switch"
  | "fallback_unclear";

type ConversationSlots = {
  product_type: string;
  target_capacity_g: number;
  target_readability_g: number;
  target_application: string;
  target_industry: string;
  current_model: string;
  current_stage: string;
  active_menu_type: string;
  active_menu_options: Record<string, string>;
  active_menu_context: Record<string, string>;
  last_recommended_models: string[];
};

function detectTargetApplication(text: string): string {
  const t = normalizeText(text || "");
  if (/(oro|joyeria|joyería|quilat|kilat)/.test(t)) return "joyeria_oro";
  if (/(laboratorio|lab\b|analitica|analítica|farmacia)/.test(t)) return "laboratorio";
  if (/(alimento|alimentos|comida|restaurante|cocina|leche)/.test(t)) return "alimentos";
  if (/(industrial|produccion|producción|bodega|planta)/.test(t)) return "industrial";
  return "";
}

function maxReadabilityForApplication(app: string): number {
  const a = normalizeText(String(app || ""));
  if (a === "joyeria_oro") return 0.01;
  if (a === "laboratorio") return 0.1;
  if (a === "alimentos") return 1;
  return 1;
}

function getApplicationRecommendedOptions(args: {
  rows: any[];
  application: string;
  capTargetG: number;
  targetReadabilityG?: number;
  strictPrecision?: boolean;
  excludeId?: string;
}): any[] {
  const rows = Array.isArray(args.rows) ? args.rows : [];
  const app = String(args.application || "").trim();
  const appMaxRead = maxReadabilityForApplication(app);
  const targetRead = Number(args.targetReadabilityG || 0);
  const strictPrecision = Boolean(args.strictPrecision);
  const maxRead = targetRead > 0 && strictPrecision ? Math.min(appMaxRead, targetRead) : appMaxRead;
  const capTarget = Number(args.capTargetG || 0);
  const excludeId = String(args.excludeId || "").trim();
  const isJewelry = normalizeText(app) === "joyeria_oro";
  const minCap = capTarget > 0 ? (isJewelry ? capTarget * 0.5 : capTarget * 0.25) : 0;
  const maxCap = capTarget > 0 ? (isJewelry ? capTarget * 2.5 : capTarget * 4.0) : Number.POSITIVE_INFINITY;
  const filtered = rows
    .filter((r: any) => {
      const id = String(r?.id || "").trim();
      if (excludeId && id && id === excludeId) return false;
      const rs = extractRowTechnicalSpec(r);
      const cap = Number(rs?.capacityG || 0);
      const read = Number(rs?.readabilityG || 0);
      const appText = normalizeText([String(r?.name || ""), String(r?.category || ""), familyLabelFromRow(r)].join(" "));
      if (!(read > 0) || !(cap > 0)) return false;
      if (read > maxRead) return false;
      if (targetRead > 0 && strictPrecision && read > targetRead) return false;
      if (capTarget > 0 && (cap < minCap || cap > maxCap)) return false;
      if (isJewelry && cap > 6000) return false;
      if (normalizeText(app) === "laboratorio" && /(industrial|plataforma|ranger|defender|valor|rc31|r71|ckw|td52p)/.test(appText)) return false;
      if (isJewelry && /(industrial|plataforma|ranger|defender|valor|rc31|r71|ckw|td52p)/.test(appText)) return false;
      return true;
    })
    .sort((a: any, b: any) => {
      const ar = Number(extractRowTechnicalSpec(a)?.readabilityG || 999);
      const br = Number(extractRowTechnicalSpec(b)?.readabilityG || 999);
      const ac = Number(extractRowTechnicalSpec(a)?.capacityG || 0);
      const bc = Number(extractRowTechnicalSpec(b)?.capacityG || 0);
      const ad = capTarget > 0 ? Math.abs(ac - capTarget) : 0;
      const bd = capTarget > 0 ? Math.abs(bc - capTarget) : 0;
      return ad - bd || ar - br;
    });
  return buildNumberedProductOptions(filtered.slice(0, 8) as any[], 8);
}

function buildActiveMenuState(args: {
  awaiting: string;
  pendingOptions: any[];
  selectedModel: string;
}): { type: string; options: Record<string, string>; context: Record<string, string> } {
  const awaiting = String(args.awaiting || "");
  if (awaiting === "strict_choose_action") {
    return {
      type: "model_action_menu",
      options: { "1": "quote", "2": "datasheet" },
      context: args.selectedModel ? { model: args.selectedModel } : {},
    };
  }
  if (awaiting === "strict_choose_model" && Array.isArray(args.pendingOptions) && args.pendingOptions.length > 0) {
    const options: Record<string, string> = {};
    for (const o of args.pendingOptions.slice(0, 40)) {
      const key = String(o?.code || "").trim();
      const val = String(o?.name || o?.raw_name || "").trim();
      if (key && val) options[key] = val;
    }
    return {
      type: "model_selection_menu",
      options,
      context: {},
    };
  }
  return { type: "", options: {}, context: {} };
}

function isMenuSelectionInput(text: string): boolean {
  const t = normalizeText(String(text || "")).trim();
  return /^([a-z]|\d{1,2})$/.test(t);
}

function isGuidedNeedDiscoveryText(text: string): boolean {
  const t = normalizeText(String(text || ""));
  if (!t) return false;
  const asksNeed = /\b(quiero|necesito|busco|requiero|recomiend|orienta)\b/.test(t) || /para\s+pesar/.test(t);
  const inDomain = /(balanza|balanzas|bascula|basculas|humedad|analizador|alimentos|laboratorio|oro|joyeria|joyeria|repuesto|repuestos|cajas|papa|papas|tornillo|tornillos)/.test(t);
  return asksNeed && inDomain;
}

function classifyMessageIntent(args: {
  text: string;
  awaiting: string;
  rememberedCategory: string;
  activeMenuType: string;
}): ConversationIntent {
  const text = String(args.text || "");
  const t = normalizeText(text);
  const technical = parseLooseTechnicalHint(text);
  const hasTechnical = Number((technical as any)?.capacityG || 0) > 0 || Number((technical as any)?.readabilityG || 0) > 0 || Boolean(parseTechnicalSpecQuery(text));
  const categoryIntent = detectCatalogCategoryIntent(text);
  const guidedNeed = isGuidedNeedDiscoveryText(text);
  const compatibilityQ = /(sirve|sirven|me sirve|funciona|funcionan|aplica|aplican|para\s+oro|para\s+joyeria|para\s+joyería|para\s+laboratorio|para\s+alimentos|si\s+o\s+no)/.test(t) && /\?/.test(text);
  const useExplanationQ = /(para\s+que\s+sirven?|que\s+uso\s+tienen|para\s+que\s+se\s+usan)/.test(t) && /(balanza|balanzas|bascula|basculas)/.test(t);
  const appUpdate = /(para\s+oro|para\s+joyeria|para\s+joyería|para\s+laboratorio|para\s+alimentos|es\s+para\s+|de\s+laboratorio|de\s+joyeria|de\s+joyería|cuales?\s+de\s+laboratorio|cu[aá]les?\s+de\s+laboratorio|laboratorio\s+tienes|de\s+oro)/.test(t);
  const alternativeReq = /(otra\s+opcion|otra\s+opción|otro\s+modelo|mas\s+econom|más\s+econ|mas\s+resol|más\s+resol|mas\s+capacidad|más\s+capacidad|alternativ|mas\s+opcion|más\s+opción|mas\s+opciones|más\s+opciones)/.test(t);

  if (args.activeMenuType && isMenuSelectionInput(text)) return "menu_selection";
  if (guidedNeed) return "guided_need_discovery";
  if (useExplanationQ) return "use_explanation_question";
  if (compatibilityQ) return "compatibility_question";
  if (hasTechnical) return "technical_spec_input";
  if (alternativeReq) return "alternative_request";
  if (asksQuoteIntent(text) || isPriceIntent(text)) return "pricing_request";
  if (/^(si|sí|dale|ok|de\s+una|cotizar|cotizacion|cotización|1)$/.test(t)) return "quote_confirmation";
  if (looksLikeBillingData(text)) return "billing_data_input";
  if (categoryIntent && normalizeText(String(categoryIntent || "")) !== normalizeText(String(args.rememberedCategory || ""))) return "category_switch";
  if (appUpdate) return "application_update";
  return "fallback_unclear";
}

function updateConversationSlots(args: {
  previousMemory: Record<string, any>;
  text: string;
  awaiting: string;
  pendingOptions: any[];
  selectedModel: string;
}): { slots: ConversationSlots; patch: Record<string, any> } {
  const prev = args.previousMemory || {};
  const parsed = parseLooseTechnicalHint(args.text);
  const merged = mergeLooseSpecWithMemory(
    {
      capacityG: Number(prev.strict_filter_capacity_g || prev.strict_partial_capacity_g || prev.target_capacity_g || 0),
      readabilityG: Number(prev.strict_filter_readability_g || prev.strict_partial_readability_g || prev.target_readability_g || 0),
    },
    parsed
  );
  const application = detectTargetApplication(args.text) || String(prev.target_application || "");
  const industry = application === "joyeria_oro" ? "joyeria" : application;
  const activeMenu = buildActiveMenuState({ awaiting: args.awaiting, pendingOptions: args.pendingOptions, selectedModel: args.selectedModel });
  const lastRecommended = (Array.isArray(args.pendingOptions) ? args.pendingOptions : [])
    .map((o: any) => String(o?.name || o?.raw_name || "").trim())
    .filter(Boolean)
    .slice(0, 20);

  const slots: ConversationSlots = {
    product_type: String(prev.product_type || prev.last_category_intent || "balanza").trim(),
    target_capacity_g: Number(merged.capacityG || 0),
    target_readability_g: Number(merged.readabilityG || 0),
    target_application: application,
    target_industry: String(industry || prev.target_industry || "").trim(),
    current_model: String(args.selectedModel || prev.current_model || prev.last_selected_product_name || "").trim(),
    current_stage: String(args.awaiting || prev.current_stage || "").trim(),
    active_menu_type: activeMenu.type,
    active_menu_options: activeMenu.options,
    active_menu_context: activeMenu.context,
    last_recommended_models: lastRecommended.length ? lastRecommended : (Array.isArray(prev.last_recommended_models) ? prev.last_recommended_models : []),
  };

  const patch: Record<string, any> = {
    product_type: slots.product_type,
    target_capacity_g: slots.target_capacity_g > 0 ? slots.target_capacity_g : (Number(prev.target_capacity_g || 0) || ""),
    target_readability_g: slots.target_readability_g > 0 ? slots.target_readability_g : (Number(prev.target_readability_g || 0) || ""),
    target_application: slots.target_application || prev.target_application || "",
    target_industry: slots.target_industry || prev.target_industry || "",
    current_model: slots.current_model || "",
    current_stage: slots.current_stage || "",
    active_menu_type: slots.active_menu_type || "",
    active_menu_options: slots.active_menu_options,
    active_menu_context: slots.active_menu_context,
    last_recommended_models: slots.last_recommended_models,
  };

  return { slots, patch };
}

function buildCompatibilityAnswer(args: {
  text: string;
  slots: ConversationSlots;
  pendingOptions: any[];
}): string {
  const app = detectTargetApplication(args.text) || args.slots.target_application || "uso indicado";
  const options = Array.isArray(args.pendingOptions) ? args.pendingOptions : [];
  const readable = options.map((o: any) => {
    const name = String(o?.name || o?.raw_name || "");
    const m = name.match(/res\s*:?\s*(\d+(?:[\.,]\d+)?)\s*(mg|g|kg)/i);
    const value = m ? Number(String(m[1] || "").replace(",", ".")) : 0;
    const unit = String(m?.[2] || "g").toLowerCase();
    const g = unit === "kg" ? value * 1000 : unit === "mg" ? value / 1000 : value;
    return { option: o, readabilityG: g > 0 ? g : 999 };
  });
  const suitable = readable.filter((x) => {
    if (app === "joyeria_oro") return x.readabilityG <= 0.01;
    if (app === "laboratorio") return x.readabilityG <= 0.1;
    if (app === "alimentos") return x.readabilityG <= 1;
    return x.readabilityG <= 0.1;
  });

  if (!options.length) {
    return "Sí, depende del modelo y de la precisión que necesites para ese uso. Si me confirmas capacidad y resolución objetivo, te digo exactamente cuál te sirve.";
  }

  if (suitable.length) {
    return [
      `Sí, para ${app.replace(/_/g, " ")} sí hay opciones que pueden servir en el listado actual.`,
      `Las más adecuadas por precisión son: ${suitable.slice(0, 3).map((x) => String(x.option?.code || "")).filter(Boolean).join(", ") || "las de mayor precisión"}.`,
      "Si quieres, te indico la mejor y luego seguimos con ficha técnica o cotización.",
    ].join("\n");
  }

  return [
    `No del todo: para ${app.replace(/_/g, " ")} las opciones actuales no son las ideales por precisión.`,
    "Te puedo proponer alternativas más finas sin perder tu contexto técnico.",
    "Si quieres, te muestro 3 recomendadas ahora.",
  ].join("\n");
}

function detectCatalogCategoryIntent(text: string): string | null {
  const t = normalizeText(text || "");
  if (!t) return null;
  const asksLabEquipment = /(plancha|planchas|calentamiento|agitacion|agitación|agitador|mezclador|homogeneizador|centrifuga)/.test(t);
  const negatesBasculas = /\bno\s+quiero\s+(una\s+)?bascula|\bno\s+quiero\s+(una\s+)?bscula|\bno\s+basculas?\b|\bno\s+bsculas?\b/.test(t);
  if (/(electroquim|ph|orp|conductividad|tds|salinidad|aquasearcher|electrodo|medidor)/.test(t)) {
    if (/(mesa|sobremesa)/.test(t)) return "electroquimica_medidores_mesa";
    if (/(portatil|portatiles)/.test(t)) return "electroquimica_medidores_portatiles";
    if (/(bolsillo)/.test(t)) return "electroquimica_medidores_bolsillo";
    if (/(electrodo)/.test(t)) return "electroquimica_electrodos";
    return "electroquimica";
  }
  if (/(anali[sz]ador(?:es)?(?:\s+de)?\s+humedad|anali[sz]ador(?:es)?|humedad|mb120|mb90|mb27|mb23)/.test(t)) return "analizador_humedad";
  if (asksLabEquipment) return "equipos_laboratorio";
  if (/(balanza|balanzas|analitica|semi analitica|semi-micro|precision|resolucion|lectura minima)/.test(t) && /(precision|resolucion|lectura minima)/.test(t)) {
    return "balanzas_precision";
  }
  if (/(bascula|basculas|bscula|bsculas|ranger|defender|valor|control de peso|ckw|td52p|plataforma\s+de\s+pesaje|plataforma\s+de\s+peso)/.test(t) && !negatesBasculas) return "basculas";
  if (/(impresora)/.test(t)) return "impresoras";
  if (/(balanza|balanzas|blanza|blanzas|explorer|adventurer|pioneer|pr\b|scout|analitica|semi analitica|precision)/.test(t)) return "balanzas";
  if (/(documento|brochure|manual|guia|catalogo pdf)/.test(t)) return "documentos";
  return null;
}

function isTechnicalSheetIntent(text: string): boolean {
  const t = normalizeText(text);
  return /(ficha|ficha tecnica|fichas tecnicas|datasheet|especificaciones|specs|hoja tecnica|brochure|catalogo tecnico)/.test(t);
}

function isTechSheetCatalogListIntent(text: string): boolean {
  const t = normalizeText(text);
  return (
    /(de que productos|que productos|cuales productos|cuales referencias|que referencias).*(ficha|ficha tecnica|datasheet|especificaciones)/.test(t) ||
    /(productos|referencias|modelos).*(con|que tengan).*(ficha|ficha tecnica|datasheet)/.test(t) ||
    /(listado|lista|catalogo).*(ficha|ficha tecnica|datasheet)/.test(t)
  );
}

function isProductImageIntent(text: string): boolean {
  const t = normalizeText(text);
  return /(imagen|imagenes|foto|fotos|fotografia|ver producto|no veo imagen|no cargo imagen|reenvia imagen|reenvia imagen)/.test(t);
}

function safeFileName(input: string, fallbackBase: string, fallbackExt: string): string {
  const raw = String(input || "").trim();
  const clean = raw
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 80)
    .replace(/^-+|-+$/g, "");
  const base = clean || fallbackBase;
  return /\.[a-z0-9]{2,8}$/i.test(base) ? base : `${base}.${fallbackExt}`;
}

type LocalPdfIndexEntry = { filePath: string; fileName: string; normalized: string };
let localPdfIndexCache: { dir: string; at: number; files: LocalPdfIndexEntry[] } | null = null;

function listLocalPdfFiles(dir: string): LocalPdfIndexEntry[] {
  const root = String(dir || "").trim();
  if (!root || !fs.existsSync(root)) return [];
  const out: LocalPdfIndexEntry[] = [];
  const stack = [root];
  while (stack.length) {
    const cur = String(stack.pop() || "");
    if (!cur) continue;
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const abs = path.join(cur, e.name);
      if (e.isDirectory()) {
        stack.push(abs);
        continue;
      }
      if (!e.isFile() || !/\.pdf$/i.test(e.name)) continue;
      out.push({ filePath: abs, fileName: e.name, normalized: normalizeCatalogQueryText(e.name) });
    }
  }
  return out;
}

function getLocalPdfIndex(): LocalPdfIndexEntry[] {
  const ttlMs = 5 * 60 * 1000;
  const now = Date.now();
  if (localPdfIndexCache && localPdfIndexCache.dir === LOCAL_DATASHEET_DIR && (now - localPdfIndexCache.at) < ttlMs) {
    return localPdfIndexCache.files;
  }
  const files = listLocalPdfFiles(LOCAL_DATASHEET_DIR);
  localPdfIndexCache = { dir: LOCAL_DATASHEET_DIR, at: now, files };
  return files;
}

function pickBestLocalPdfPath(row: any, queryText: string): string {
  const files = getLocalPdfIndex();
  if (!files.length) return "";
  const modelNorm = normalizeCatalogQueryText(String(row?.name || queryText || ""));

  const pickByKeywordPriority = (keywords: string[]): string => {
    const wanted = (keywords || []).map((k) => normalizeCatalogQueryText(String(k || ""))).filter(Boolean);
    if (!wanted.length) return "";
    let best: { filePath: string; score: number; byteSize: number } | null = null;
    for (const f of files) {
      const hay = normalizeCatalogQueryText(f.normalized || f.fileName || "");
      let score = 0;
      for (const kw of wanted) {
        if (hay.includes(kw)) score += 3;
      }
      let byteSize = Number.MAX_SAFE_INTEGER;
      try {
        byteSize = Number(fs.statSync(f.filePath).size || 0);
      } catch {
        byteSize = Number.MAX_SAFE_INTEGER;
      }
      if (byteSize > 5 * 1024 * 1024) score -= 4;
      if (byteSize > 8 * 1024 * 1024) score -= 12;
      if (/datasheet|data sheet|ficha/.test(hay)) score += 2;
      if (/manual|brochure|catalogo|catalog/.test(hay)) score -= 2;
      if (!best || score > best.score || (score === best.score && byteSize < best.byteSize)) {
        best = { filePath: f.filePath, score, byteSize };
      }
    }
    return best && best.score >= 3 ? best.filePath : "";
  };

  const canonical = (v: string) => normalizeCatalogQueryText(String(v || "")).replace(/[^a-z0-9]/g, "");
  const strictModelTokens = uniqueNormalizedStrings([
    ...extractModelLikeTokens(String(row?.name || "")),
    ...extractModelLikeTokens(String(queryText || "")),
    String(row?.name || ""),
  ])
    .map((t) => canonical(t))
    .filter((t) => t.length >= 5);
  if (strictModelTokens.length) {
    let strictBest: { filePath: string; score: number } | null = null;
    for (const f of files) {
      const hay = normalizeCatalogQueryText(f.normalized || f.fileName || "");
      const hayCanon = canonical(hay);
      let score = 0;
      for (const token of strictModelTokens) {
        if (hayCanon.includes(token)) score += 20;
      }
      if (/ficha|datasheet|data sheet/.test(hay)) score += 3;
      if (score > 0 && (!strictBest || score > strictBest.score)) strictBest = { filePath: f.filePath, score };
    }
    if (strictBest) return strictBest.filePath;
  }

  const directByModelFamily = (() => {
    if (/\b(ax|ad)\d{2,6}/.test(modelNorm) || /adventurer/.test(modelNorm)) {
      return pickByKeywordPriority(["adventurer", "ax", "data sheet"]);
    }
    if (/\b(exr|exp|ex)\d{2,6}/.test(modelNorm) || /explorer|semi/.test(modelNorm)) {
      return pickByKeywordPriority(["explorer", "semi", "data sheet"]);
    }
    if (/\b(px|pr)\d{2,6}/.test(modelNorm) || /pioneer/.test(modelNorm)) {
      return pickByKeywordPriority(["pioneer", "px", "pr", "datasheet"]);
    }
    if (/\bmb\d{2,5}\b/.test(modelNorm) || /analizador_humedad|humedad/.test(modelNorm)) {
      return pickByKeywordPriority([modelNorm, "mb", "datasheet"]);
    }
    if (/\b(r31|r71|rc31)\w*/.test(modelNorm) || /ranger/.test(modelNorm)) {
      return pickByKeywordPriority(["ranger", "data", "sheet"]);
    }
    if (/\b(sjx|spx|stx)\w*/.test(modelNorm) || /scout/.test(modelNorm)) {
      return pickByKeywordPriority(["scout", "datasheet"]);
    }
    return "";
  })();
  if (directByModelFamily) return directByModelFamily;

  const source = row?.source_payload && typeof row.source_payload === "object" ? row.source_payload : {};
  const familyHints = uniqueNormalizedStrings([
    String(source?.family || ""),
    String(source?.instrument || ""),
    String(row?.category || ""),
    /\bexp\d|explorer|exr\d|ex\d/.test(normalizeCatalogQueryText(String(row?.name || ""))) ? "explorer" : "",
    /\bpr\d|px\d|pioneer/.test(normalizeCatalogQueryText(String(row?.name || ""))) ? "pioneer" : "",
    /\bad\d|ax\d|adventurer/.test(normalizeCatalogQueryText(String(row?.name || ""))) ? "adventurer" : "",
    /\bmb\d|humedad/.test(normalizeCatalogQueryText(String(row?.name || ""))) ? "mb" : "",
    /\bdefender|ranger|valor\b/.test(normalizeCatalogQueryText(String(row?.name || ""))) ? "basculas" : "",
  ].filter(Boolean));
  const codeTokens = [
    String(source?.product_code || "").trim(),
    String(source?.sap || "").trim(),
    String(source?.numero_modelo || "").trim(),
  ].filter(Boolean);
  const modelTokens = uniqueNormalizedStrings([
    ...extractModelLikeTokens(String(row?.name || "")),
    ...extractModelLikeTokens(String(queryText || "")),
    ...codeTokens.map((x) => normalizeCatalogQueryText(x)),
  ]).filter((x) => x.length >= 3);
  const textTerms = uniqueNormalizedStrings([
    ...extractCatalogTerms(`${String(row?.name || "")} ${String(queryText || "")}`).slice(0, 12),
    ...familyHints,
  ]).slice(0, 16);

  let best: { filePath: string; score: number; modelHits: number; termHits: number } | null = null;
  for (const f of files) {
    const hay = f.normalized;
    let score = 0;
    let modelHits = 0;
    let termHits = 0;
    for (const token of modelTokens) {
      if (hay.includes(normalizeCatalogQueryText(token))) {
        score += 12;
        modelHits += 1;
      }
    }
    for (const term of textTerms) {
      if (hay.includes(normalizeCatalogQueryText(term))) {
        score += 2;
        termHits += 1;
      }
    }
    if (/datasheet|data sheet|ficha/.test(hay)) score += 2;
    if (/manual|brochure|catalogo|catalog/.test(hay)) score -= 2;
    if (!best || score > best.score) best = { filePath: f.filePath, score, modelHits, termHits };
  }

  if (!best) return "";
  const hasStrongFamilyHint = familyHints.some((h) => /explorer|pioneer|adventurer|mb|basculas|electroquimica/.test(normalizeCatalogQueryText(h)));
  const familyFallback = (() => {
    if (/\bmb\d{2,5}\b/.test(modelNorm) || /analizador_humedad|humedad/.test(modelNorm)) return pickByKeywordPriority([modelNorm, "mb120", "mb92", "mb62", "datasheet"]);
    if (/\b(ax|ad)\d{2,6}/.test(modelNorm) || /adventurer/.test(modelNorm)) return pickByKeywordPriority(["adventurer", "ax", "datasheet"]);
    if (/\b(px|pr)\d{2,6}/.test(modelNorm) || /pioneer/.test(modelNorm)) return pickByKeywordPriority(["pioneer", "px", "pr", "datasheet"]);
    if (/\b(exr|exp|ex)\d{2,6}/.test(modelNorm) || /explorer|semi/.test(modelNorm)) return pickByKeywordPriority(["explorer", "semi micro", "datasheet"]);
    if (/\b(r31|r71|rc31)\w*/.test(modelNorm) || /ranger/.test(modelNorm)) return pickByKeywordPriority(["ranger", "ranger 3000", "ranger 4000", "ranger 7000", "datasheet"]);
    if (/\b(sjx|spx|stx)\w*/.test(modelNorm) || /scout/.test(modelNorm)) return pickByKeywordPriority(["scout", "datasheet"]);
    return "";
  })();
  if (modelTokens.length && best.modelHits === 0) {
    if (hasStrongFamilyHint && best.termHits >= 1 && best.score >= 4) return best.filePath;
    if (!(best.termHits >= 2 && best.score >= 8)) return familyFallback;
  }
  return best.filePath || familyFallback;
}

function fetchLocalFileAsBase64(filePath: string): { base64: string; mimetype: string; fileName: string; byteSize: number } | null {
  const abs = String(filePath || "").trim();
  if (!abs || !fs.existsSync(abs)) return null;
  try {
    const buff = fs.readFileSync(abs);
    const byteSize = Number(buff.byteLength || 0);
    if (!byteSize) return null;
    return {
      base64: buff.toString("base64"),
      mimetype: "application/pdf",
      fileName: safeFileName(path.basename(abs), "ficha-tecnica", "pdf"),
      byteSize,
    };
  } catch {
    return null;
  }
}

function toReadableBulletList(raw: string, maxLines = 4): string {
  const cleaned = String(raw || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  let chunks = cleaned
    .split(/[.;]\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (chunks.length <= 1) {
    chunks = cleaned
      .split(/,\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  chunks = chunks
    .filter((s, i, arr) => arr.findIndex((x) => normalizeText(x) === normalizeText(s)) === i)
    .slice(0, maxLines);
  if (!chunks.length) return "";
  return chunks.map((c) => `- ${c}`).join("\n");
}

async function fetchRemoteFileAsBase64(url: string): Promise<{ base64: string; mimetype: string; fileName: string; byteSize: number } | null> {
  const target = String(url || "").trim();
  if (!/^https?:\/\//i.test(target)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(target, {
      method: "GET",
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "BotzWhatsApp/1.0" },
    });
    if (!res.ok) return null;

    const arr = await res.arrayBuffer();
    const base64 = Buffer.from(arr).toString("base64");
    if (!base64) return null;
    const byteSize = Number(arr.byteLength || 0);

    const contentType = String(res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    const mimetype = contentType || "application/octet-stream";

    let pathname = "archivo";
    try {
      pathname = decodeURIComponent(new URL(target).pathname.split("/").pop() || "archivo");
    } catch {
      pathname = "archivo";
    }

    const ext = mimetype === "application/pdf"
      ? "pdf"
      : mimetype.includes("png")
        ? "png"
        : mimetype.includes("jpeg") || mimetype.includes("jpg")
          ? "jpg"
          : mimetype.includes("webp")
            ? "webp"
            : "bin";

    return {
      base64,
      mimetype,
      fileName: safeFileName(pathname, "archivo", ext),
      byteSize,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function isHistoryIntent(text: string): boolean {
  const t = normalizeText(text);
  return /(mi historial|que tengo en mi historial|historial|mis cotizaciones|cotizaciones anteriores|compras anteriores|mi ultima cotizacion)/.test(t);
}

function isContactInfoBundle(text: string): boolean {
  const t = String(text || "");
  const hasEmail = Boolean(extractEmail(t));
  const hasPhone = Boolean(extractCustomerPhone(t, ""));
  const hasNameLike = /(^|\n|\r)(nombre|name)\s*[:=]|^[A-Za-zÁÉÍÓÚÑáéíóúñ]{3,}(\s+[A-Za-zÁÉÍÓÚÑáéíóúñ]{2,})?/m.test(t);
  return (hasPhone && hasNameLike) || (hasEmail && hasNameLike);
}

function isContinueQuoteWithoutPersonalDataIntent(text: string): boolean {
  return false;
}

function looksLikeBillingData(text: string): boolean {
  const raw = String(text || "").trim();
  if (!raw) return false;
  if (isContactInfoBundle(raw)) return true;
  const hasEmail = Boolean(extractEmail(raw));
  const hasPhone = Boolean(extractCustomerPhone(raw, ""));
  const hasNit = /\bnit\s*[:=]?\s*[0-9\.\-]{5,20}\b/i.test(raw);
  const hasLabeledFields = /\b(ciudad|empresa|razon\s+social|contacto|correo|email|celular|telefono)\s*[:=]/i.test(raw);
  const hasCityLike = /^[a-zA-Záéíóúüñ\s]{3,40}$/.test(raw) && !/@/.test(raw) && !/^\+?\d[\d\s\-]{6,}$/.test(raw);
  const hasNameLike = /^[a-zA-Záéíóúüñ\s]{6,60}$/.test(raw) && !/\b(cotiz|modelo|ficha|precio|marca|opcion|opciones|asesor)\b/i.test(raw);
  return hasNit || hasLabeledFields || hasEmail || hasPhone || hasCityLike || hasNameLike;
}

function getReusableBillingData(memory: any): {
  city: string;
  company: string;
  nit: string;
  contact: string;
  email: string;
  phone: string;
  complete: boolean;
} {
  const q = memory?.quote_data && typeof memory.quote_data === "object" ? memory.quote_data : {};
  const city = normalizeCityLabel(String(q?.city || memory?.crm_billing_city || "").trim());
  const company = String(q?.company || memory?.crm_company || memory?.commercial_company_name || "").trim();
  const nit = String(q?.nit || memory?.crm_nit || memory?.commercial_company_nit || "").replace(/[^0-9.-]/g, "").trim();
  const contact = String(q?.contact || memory?.crm_contact_name || memory?.commercial_customer_name || memory?.customer_name || "").trim();
  const email = String(q?.email || memory?.crm_contact_email || memory?.customer_email || "").trim().toLowerCase();
  const phone = normalizePhone(String(q?.phone || memory?.crm_contact_phone || memory?.customer_phone || "").trim());
  const complete = Boolean(city && company && nit && contact && email && phone);
  return { city, company, nit, contact, email, phone, complete };
}

function billingDataAsSingleMessage(data: { city: string; company: string; nit: string; contact: string; email: string; phone: string }): string {
  return [
    `ciudad: ${data.city}`,
    `empresa: ${data.company}`,
    `nit: ${data.nit}`,
    `contacto: ${data.contact}`,
    `correo: ${data.email}`,
    `celular: ${data.phone}`,
  ].join(", ");
}

function buildQuoteDataIntakePrompt(prefix: string, memory: any): string {
  const reusable = getReusableBillingData(memory);
  const missing: string[] = [];
  if (!reusable.city) missing.push("ciudad");
  if (!reusable.company) missing.push("empresa");
  if (!reusable.nit) missing.push("NIT");
  if (!reusable.contact) missing.push("contacto");
  if (!reusable.email) missing.push("correo");
  if (!reusable.phone) missing.push("celular");
  if (!missing.length) {
    return `${prefix} Ya tengo tus datos de facturación. Si deseas continuar con los mismos datos, responde: mismos datos.`;
  }
  return `${prefix} Ya tengo parte de tus datos. Para continuar, envíame en un solo mensaje: ${missing.join(", ")}. Si deseas usar los mismos datos anteriores, responde: mismos datos.`;
}

type AnotherQuoteChoice = "same_model" | "other_model" | "cheaper" | "advisor";

function isAnotherQuoteAmbiguousIntent(text: string): boolean {
  const t = normalizeText(String(text || "")).replace(/[^a-z0-9\s]/g, " ").trim();
  if (!t) return false;
  if (/^(otra|otro)$/.test(t)) return true;
  return /(otra\s+cotiz|otra\s+cotizacion|nueva\s+cotizacion|nueva\s+cotiz)/.test(t);
}

function parseAnotherQuoteChoice(text: string): AnotherQuoteChoice | null {
  const t = normalizeText(String(text || "")).replace(/[^a-z0-9\s]/g, " ").trim();
  if (!t) return null;
  if (/^(1|del\s+mismo\s+modelo|mismo\s+modelo|misma\s+referencia|la\s+misma)$/.test(t)) return "same_model";
  if (/^(2|de\s+otro\s+modelo|otro\s+modelo|otro\s+equipo)$/.test(t)) return "other_model";
  if (/^(3|mas\s+economic|mas\s+barat|muy\s+costos|mas\s+economicas?)$/.test(t)) return "cheaper";
  if (/^(4|hablar\s+con\s+asesor|asesor|cita)$/.test(t)) return "advisor";
  return null;
}

function buildAnotherQuotePrompt(): string {
  return [
    "Claro. ¿Qué tipo de cotización quieres?",
    "1) Del mismo modelo",
    "2) De otro modelo",
    "3) Ver opciones más económicas",
    "4) Hablar con asesor",
  ].join("\n");
}

function isGreetingIntent(text: string): boolean {
  const t = normalizeText(text).replace(/[^a-z0-9\s]/g, " ").trim();
  if (!t) return false;
  const hasGreeting = /^(hola|buenas|buenos dias|buen dia|buenas tardes|buenas noches|hey|hi)\b/.test(t);
  const hasBusinessIntent = /(cotiz|producto|pdf|trm|historial|recomiend|precio|catalogo)/.test(t);
  return hasGreeting && !hasBusinessIntent && t.length <= 40;
}

function shouldUseFullGreeting(memory: any): boolean {
  const lastIntent = normalizeText(String(memory?.last_intent || ""));
  const lastUserAt = Date.parse(String(memory?.last_user_at || ""));
  if (lastIntent !== "greeting") return true;
  if (!Number.isFinite(lastUserAt)) return true;
  const elapsed = Date.now() - lastUserAt;
  return elapsed > 12 * 60 * 60 * 1000;
}

function buildGreetingReply(knownCustomerName: string, memory: any): string {
  const hasName = Boolean(String(knownCustomerName || "").trim());
  const hasHistory = Boolean(
    String(memory?.last_user_at || "").trim() ||
    String(memory?.last_intent || "").trim() ||
    String(memory?.customer_name || "").trim() ||
    String(memory?.last_quote_draft_id || "").trim()
  );
  const hasQuoteContext =
    Boolean(String(memory?.last_quote_draft_id || "").trim() || String(memory?.last_quote_pdf_sent_at || "").trim()) ||
    /(quote_generated|quote_recall|price_request)/.test(String(memory?.last_intent || ""));

  if (!hasHistory) {
    return hasName
      ? `Hola, ${knownCustomerName} 👋\nGracias por ser parte de la comunidad OHAUS 🤗, que está revolucionando la calidad de los productos para su empresa.\n¿Qué producto necesitas hoy?`
      : "Hola 👋\nGracias por ser parte de la comunidad OHAUS 🤗, que está revolucionando la calidad de los productos para su empresa.\n¿Qué producto necesitas hoy?";
  }

  if (hasQuoteContext) {
    return hasName
      ? `Hola de nuevo, ${knownCustomerName} 👋 ¿Continuamos con tu cotización o te cotizo otro modelo?`
      : "Hola de nuevo 👋 ¿Continuamos con tu cotización o te cotizo otro modelo?";
  }

  if (shouldUseFullGreeting(memory)) {
    return hasName
      ? `Hola, ${knownCustomerName} 👋 Qué bueno tenerte de nuevo. Dime el modelo exacto y te envío ficha o cotización.`
      : "Hola 👋 Qué bueno tenerte de nuevo. Dime el modelo exacto y te envío ficha o cotización.";
  }

  return hasName
    ? `Hola de nuevo, ${knownCustomerName} 👋 Dime modelo exacto y te envío ficha o cotización.`
    : "Hola de nuevo 👋 Dime modelo exacto y te envío ficha o cotización.";
}

function isAffirmativeIntent(text: string): boolean {
  const t = normalizeText(text).replace(/[^a-z0-9\s]/g, " ").trim();
  return /^(si|sí|ok|vale|listo|dale|de una|perfecto|por favor|si por favor|hazlo|enviala|enviamela)\b/.test(t);
}

function isConversationCloseIntent(text: string): boolean {
  const t = normalizeCatalogQueryText(String(text || "")).replace(/[^a-z0-9\s]/g, " ").trim();
  if (!t) return false;
  return /\b(no gracias|gracias|eso es todo|nada mas|finaliza|finalizar|finalicemos|finalizamos|termina|terminar|cerrar|cerramos|listo gracias|ok gracias|perfecto gracias|hasta luego|adios|chao)\b/.test(t);
}

function isCorrectionIntent(text: string): boolean {
  const t = normalizeText(String(text || "")).replace(/[^a-z0-9\s]/g, " ").trim();
  if (!t) return false;
  return /(no entend|entendiste mal|esta mal|esta incorrect|no era eso|no me sirve|no coincide|equivoc|mal seleccionado|corrige)/.test(t);
}

function normalizeNumber(value: any): number {
  const n = Number(String(value ?? "").replace(/,/g, ".").trim());
  return Number.isFinite(n) ? n : 0;
}

function getRowCapacityG(row: any): number {
  const s = extractRowTechnicalSpec(row);
  return normalizeNumber(s?.capacityG || row?.capacity_g || row?.capacity || row?.capacidad_g || row?.capacidad || row?.max_g || row?.max);
}

function getRowReadabilityG(row: any): number {
  const s = extractRowTechnicalSpec(row);
  return normalizeNumber(s?.readabilityG || row?.readability_g || row?.readability || row?.resolution_g || row?.resolution || row?.resolucion_g || row?.resolucion || row?.precision_g || row?.precision);
}

function isExactTechnicalMatch(row: any, requirement: { capacityG: number; readabilityG: number }): boolean {
  const cap = getRowCapacityG(row);
  const read = getRowReadabilityG(row);
  return cap > 0 && read > 0 && cap === Number(requirement.capacityG || 0) && read === Number(requirement.readabilityG || 0);
}

function getExactTechnicalMatches(rows: any[], requirement: { capacityG: number; readabilityG: number }): any[] {
  return (Array.isArray(rows) ? rows : []).filter((row) => isExactTechnicalMatch(row, requirement));
}

function hasActiveTechnicalRequirement(memory: any): boolean {
  const cap = Number(memory?.strict_filter_capacity_g || 0);
  const read = Number(memory?.strict_filter_readability_g || 0);
  return cap > 0 && read > 0;
}

function resetStrictRecommendationState(memory: any) {
  memory.pending_product_options = [];
  memory.pending_family_options = [];
  memory.awaiting_action = "none";
  memory.strict_family_label = "";
  memory.strict_model_offset = 0;
}

function isAmbiguousTechnicalMessage(text: string): boolean {
  const t = normalizeText(text || "");
  if (!t) return false;
  if (parseTechnicalSpecQuery(t)) return false;
  return /\brango\s*\d+\b/.test(t) || /^\d{2,5}$/.test(t.trim()) || /\bla de\s+\d+\b/.test(t) || /\bla normal\b/.test(t) || /\bla industrial\b/.test(t) || /\bla de laboratorio\b/.test(t);
}

function buildAmbiguityQuestion(text: string): string {
  const t = normalizeText(text || "");
  if (/rango\s*\d+/.test(t)) return "Para no equivocarme: cuando dices ese rango, ¿te refieres a capacidad, presupuesto o referencia específica?";
  if (/^\d{2,5}$/.test(t.trim())) return "Para no equivocarme, ese número corresponde a capacidad, modelo o presupuesto?";
  return "Para no equivocarme, ¿puedes confirmarme exactamente capacidad y resolución, por ejemplo 200 g x 0.001 g?";
}

function withAvaSignature(text: string): string {
  const body = String(text || "").trim();
  if (!body) return "Soy Ava de Avanza Balanzas. ¿En qué puedo ayudarte hoy?";
  const normalized = normalizeText(body);
  if (normalized.includes("soy ava") || normalized.startsWith("ava:") || normalized.startsWith("hola soy ava")) return body;
  return `Ava: ${body}`;
}

function enforceWhatsAppDelivery(text: string, inboundText: string): string {
  const body = String(text || "");
  const intent = normalizeText(inboundText || "");
  const isSalesOrInfoFlow = /(cotiz|cotizacion|pdf|trm|precio|presupuesto|ficha|fichas|modelo|modelos|informacion|informacion tecnica|imagen|imagenes)/.test(intent);
  if (!isSalesOrInfoFlow) return body;
  const customerAskedEmail = /(correo|email|e-mail)/.test(intent);
  if (customerAskedEmail) return body;

  let fixed = body;
  fixed = fixed.replace(/correo\s+electr[oó]nico/gi, "WhatsApp");
  fixed = fixed.replace(/por\s+correo/gi, "por este WhatsApp");
  fixed = fixed.replace(/via\s+correo/gi, "por este WhatsApp");
  fixed = fixed.replace(/v[íi]a\s+correo/gi, "por este WhatsApp");
  fixed = fixed.replace(/te\s+la\s+enviare\s+a\s+tu\s+correo\s+en\s+breve\.?/gi, "Te la enviaré por este WhatsApp en breve.");
  fixed = fixed.replace(/te\s+la\s+enviare\s+a\s+tu\s+correo\s+electronico\.?/gi, "Te la enviaré por este WhatsApp.");
  fixed = fixed.replace(/te\s+la\s+enviare\s+a\s+tu\s+correo\.?/gi, "Te la enviaré por este WhatsApp.");
  fixed = fixed.replace(/enviarla\s+a\s+tu\s+correo\s+electronico/gi, "enviarla por este WhatsApp");
  fixed = fixed.replace(/enviarla\s+a\s+tu\s+correo/gi, "enviarla por este WhatsApp");
  fixed = fixed.replace(/enviartela\s+a\s+tu\s+correo\s+electronico/gi, "enviártela por este WhatsApp");
  fixed = fixed.replace(/enviartela\s+a\s+tu\s+correo/gi, "enviártela por este WhatsApp");
  fixed = fixed.replace(/la\s+cotizacion\s+formal\s+sera\s+generada\s+por\s+un\s+comercial[^.]*\.?/gi, "Te genero y envío la cotización por este WhatsApp.");
  fixed = fixed.replace(/no\s+puedo\s+enviar\s+la\s+cotizacion\s+formal\s+directamente\s+por\s+aqu[ií]\.?/gi, "Sí puedo enviarte la cotización por este WhatsApp.");
  fixed = fixed.replace(/estoy\s+en\s+modo\s+demo[^.]*\.?/gi, "Puedo enviarte archivos reales por este WhatsApp.");
  fixed = fixed.replace(/no\s+puedo\s+enviar\s+el\s+pdf\s+real[^.]*\.?/gi, "Sí puedo enviarte el PDF real por este WhatsApp.");
  fixed = fixed.replace(/se\s+pondra\s+en\s+contacto\s+contigo\s+para\s+generar\s+una\s+cotizacion\s+formal\.?/gi, "Si quieres, te genero la cotización aquí mismo por WhatsApp.");
  return fixed;
}

function phoneTail10(raw: string): string {
  const n = normalizePhone(raw || "");
  return n.length > 10 ? n.slice(-10) : n;
}

function pickBestCatalogProduct(text: string, rows: any[]): any | null {
  const inbound = normalizeCatalogQueryText(text);
  const modelTokens = extractModelLikeTokens(inbound);
  const terms = Array.from(
    new Set(
      inbound
        .split(/[^a-z0-9]+/i)
        .map((x) => x.trim())
        .filter((x) => x.length >= 2)
        .filter((x) => !["quiero", "cotizar", "cotizacion", "marca", "cliente", "cantidad", "trm", "hoy", "enviame", "whatsapp", "pdf", "producto"].includes(x))
    )
  );

  let best: { row: any; score: number } | null = null;
  for (const row of rows || []) {
    const rowName = normalizeText(String(row?.name || ""));
    const hay = normalizeText(`${row?.name || ""} ${row?.brand || ""} ${row?.category || ""}`);
    const inboundCompact = inbound.replace(/\s+/g, "");
    const nameCompact = rowName.replace(/\s+/g, "");
    const inboundAlphaNum = inbound.replace(/[^a-z0-9]+/g, "");
    const nameAlphaNum = rowName.replace(/[^a-z0-9]+/g, "");
    let score = 0;
    if (rowName && inbound.includes(rowName)) score += 10;
    if (nameCompact && inboundCompact.includes(nameCompact)) score += 8;
    if (nameAlphaNum && inboundAlphaNum.includes(nameAlphaNum)) score += 14;
    for (const token of modelTokens) {
      if (hay.includes(token)) score += 10;
    }
    for (const term of terms) {
      if (hay.includes(term)) score += /^\d+$/.test(term) ? 3 : 2;
    }
    if (!best || score > best.score) best = { row, score };
  }

  if (!best || best.score < 4) return null;
  return best.row;
}

function findExactModelProduct(text: string, rows: any[]): any | null {
  const inbound = normalizeCatalogQueryText(text || "");
  const tokens = extractModelLikeTokens(inbound);
  if (!tokens.length) return null;
  const inboundCompact = inbound.replace(/[^a-z0-9]+/g, "");

  let best: { row: any; score: number } | null = null;
  for (const row of rows || []) {
    const rowName = normalizeCatalogQueryText(String(row?.name || ""));
    const hay = normalizeCatalogQueryText(`${row?.name || ""} ${row?.brand || ""} ${row?.category || ""} ${catalogSubcategory(row)}`);
    const rowCompact = rowName.replace(/[^a-z0-9]+/g, "");
    let score = 0;

    if (rowCompact && inboundCompact.includes(rowCompact)) score += 18;
    if (rowName && inbound.includes(rowName)) score += 12;

    const rowModelTokens = extractModelLikeTokens(rowName);
    for (const t of tokens) {
      const nt = normalizeCatalogQueryText(t);
      if (hay.includes(nt)) {
        score += 10;
        continue;
      }
      const tt = splitModelToken(nt);
      for (const rtRaw of rowModelTokens) {
        const rt = splitModelToken(rtRaw);
        if (!tt.letters || !rt.letters) continue;
        if (tt.letters === rt.letters && tt.digits && rt.digits && rt.digits.includes(tt.digits)) {
          score += 8;
          break;
        }
      }
    }

    if (!best || score > best.score) best = { row, score };
  }
  if (!best || best.score < 8) return null;
  return best.row;
}

function findExplicitModelProducts(text: string, rows: any[]): any[] {
  const inbound = normalizeCatalogQueryText(String(text || ""));
  const modelTokens = extractModelLikeTokens(inbound);
  if (!modelTokens.length) return [];
  const found: any[] = [];
  const seenIds = new Set<string>();
  for (const token of modelTokens) {
    const nt = normalizeCatalogQueryText(String(token || "")).replace(/[^a-z0-9]+/g, "");
    const strict = (rows || []).filter((row: any) => {
      const base = `${String(row?.name || "")} ${String(row?.slug || "")}`;
      const rowTokens = extractModelLikeTokens(base);
      if (!rowTokens.length) return false;
      return rowTokens.some((rtRaw) => {
        const rt = normalizeCatalogQueryText(String(rtRaw || "")).replace(/[^a-z0-9]+/g, "");
        if (!rt || !nt) return false;
        if (rt === nt) return true;
        const a = splitModelToken(rt);
        const b = splitModelToken(nt);
        return Boolean(a.letters && b.letters && a.letters === b.letters && a.digits && b.digits && (a.digits === b.digits || a.digits.startsWith(b.digits)));
      });
    });

    const candidate =
      (strict.length === 1 ? strict[0] : null) ||
      findExactModelProduct(token, strict.length ? strict : (rows || [])) ||
      pickBestCatalogProduct(token, strict.length ? strict : (rows || []));
    const id = String(candidate?.id || "").trim();
    if (!candidate || !id || seenIds.has(id)) continue;
    seenIds.add(id);
    found.push(candidate);
  }
  return found;
}

function extractCatalogTerms(text: string): string[] {
  const stop = new Set([
    "hola", "quiero", "necesito", "enviame", "envia", "ficha", "tecnica", "fichatecnica", "imagen", "imagenes", "foto", "fotos",
    "de", "del", "la", "el", "los", "las", "por", "para", "con", "y", "o", "que", "cual", "cuales", "modelo", "producto",
    "whatsapp", "favor", "porfavor", "si", "no", "una", "un", "esa", "ese", "me", "ya", "tienes", "tiene", "balanza", "balanzas",
    "bascula", "basculas", "ohaus", "especificaciones", "especificacion", "specs", "puedes", "puede", "enviar", "mandar", "mandame", "podrias", "podria",
  ]);
  return Array.from(
    new Set(
      normalizeCatalogQueryText(text || "")
        .split(/[^a-z0-9]+/i)
        .map((x) => x.trim())
        .filter((x) => x.length >= 3)
        .filter((x) => !stop.has(x))
    )
  );
}

function isFeatureQuestionIntent(text: string): boolean {
  const t = normalizeCatalogQueryText(text || "");
  if (!t) return false;
  const hasMeasurementSpec = /\b\d+(?:[\.,]\d+)?\s*(?:mg|g|kg)\b/.test(t);
  return (
    /(que tenga|que tengan|tiene|tienen|incluye|incluyan|debe tener|caracteristic|especificacion|especificaciones)/.test(t) ||
    /(con\s+(calibracion|precision|resolucion|capacidad|bateria|usb|bluetooth|wifi|rs\s*232|ip\d{2}|pantalla|sensor|humedad|analitic|semi|micro|calibracion\s+externa|calibracion\s+interna))/.test(t) ||
    hasMeasurementSpec
  );
}

function detectCalibrationPreference(text: string): "external" | "internal" | null {
  const t = normalizeText(text || "");
  if (!t) return null;
  if (/(calibracion\s+externa|externa\s+calibracion|pesa\s+patron|masa\s+patron|external\s+calibration)/.test(t)) return "external";
  if (/(calibracion\s+interna|interna\s+calibracion|autocal|ajuste\s+interno|internal\s+calibration)/.test(t)) return "internal";
  return null;
}

function rowMatchesCalibrationPreference(row: any, preference: "external" | "internal" | null): boolean {
  if (!preference) return true;
  const hay = catalogFeatureSearchBlob(row);
  if (preference === "external") {
    return /(calibr\w*\s*(extern|manual)|external\s+calibration|pesa\s+patron|masa\s+patron)/.test(hay);
  }
  return /(calibr\w*\s*(intern|auto|ajuste\s+interno)|internal\s+calibration|autocal)/.test(hay);
}

function extractFeatureTerms(text: string): string[] {
  const blacklist = new Set([
    "balanza", "balanzas", "bascula", "basculas", "equipo", "equipos", "producto", "productos", "categoria",
    "cotizar", "cotizacion", "presupuesto", "precio", "trm", "whatsapp", "catalogo", "referencia", "referencias",
    "modelo", "modelos", "tiene", "tienen", "tenga", "tengan", "incluye", "incluyan", "caracteristica", "caracteristicas",
    "especificacion", "especificaciones", "debe", "tener", "con", "busco", "necesito", "quiero", "ohaus",
  ]);
  const aliasMap: Record<string, string> = {
    tipo: "",
    tipos: "",
    clase: "",
    clases: "",
    balanza: "balanzas",
    balanzas: "balanzas",
    bascula: "basculas",
    basculas: "basculas",
    joyeria: "joyeria",
    joyería: "joyeria",
    precision: "precision",
    precisión: "precision",
    analitica: "analitica",
    analítica: "analitica",
    semi: "semi",
    humedad: "humedad",
    plataforma: "plataforma",
  };
  const measurementTerms = Array.from(
    new Set(
      (String(text || "").toLowerCase().match(/\b\d+(?:[\.,]\d+)?\s*(?:g|kg|mg)\b/g) || [])
        .map((x) => x.replace(/\s+/g, "").replace(/,/g, "."))
    )
  );
  const normalized = extractCatalogTerms(text)
    .map((term) => {
      const key = normalizeText(term);
      if (!(key in aliasMap)) return key;
      return String(aliasMap[key] || "").trim();
    })
    .filter((term) => term && !blacklist.has(term));
  return uniqueNormalizedStrings([...normalized, ...measurementTerms], 10);
}

function catalogFeatureSearchBlob(row: any): string {
  const payload = row?.source_payload && typeof row.source_payload === "object" ? row.source_payload : {};
  const specsJson = row?.specs_json;
  const specsJsonText = typeof specsJson === "string"
    ? specsJson
    : (specsJson ? JSON.stringify(specsJson) : "");
  return normalizeCatalogQueryText(
    [
      String(row?.name || ""),
      String(row?.brand || ""),
      String(row?.category || ""),
      String(catalogSubcategory(row) || ""),
      String(row?.summary || ""),
      String(row?.description || ""),
      String(row?.specs_text || ""),
      specsJsonText,
      JSON.stringify(payload || {}),
    ].join(" ")
  );
}

function rankCatalogByFeature(rows: any[], featureTerms: string[]): Array<{ row: any; matches: number; score: number }> {
  if (!Array.isArray(rows) || !rows.length || !featureTerms.length) return [];
  const measurementTerms = featureTerms.filter((t) => /\d/.test(t) && /(mg|g|kg)$/.test(t));
  const ranked = (rows || []).map((row: any) => {
    const hay = catalogFeatureSearchBlob(row);
    const hayCompact = hay.replace(/\s+/g, "");
    let matches = 0;
    let score = 0;
    let measurementMatches = 0;
    for (const term of featureTerms) {
      if (!term) continue;
      const found = hay.includes(term) || hayCompact.includes(term.replace(/\s+/g, ""));
      if (found) {
        matches += 1;
        score += /\d/.test(term) ? 3 : term.length >= 6 ? 2 : 1;
        if (measurementTerms.includes(term)) measurementMatches += 1;
      }
    }
    if (matches === featureTerms.length) score += 2;
    if (measurementTerms.length && measurementMatches === measurementTerms.length) score += 4;
    return { row, matches, score, measurementMatches };
  });
  return ranked
    .filter((x: any) => {
      if (measurementTerms.length > 0) return x.measurementMatches === measurementTerms.length;
      return x.matches >= Math.min(featureTerms.length, featureTerms.length <= 2 ? 1 : 2);
    })
    .sort((a, b) => b.score - a.score);
}

function isBalanceTypeQuestion(text: string): boolean {
  const t = normalizeCatalogQueryText(text || "");
  if (!t) return false;
  return /(que tipo de balanza|que tipos de balanza|tipos de balanzas|tipo de balanzas|clases de balanza|clase de balanza)/.test(t);
}

function uniqueNormalizedStrings(values: string[], max = 0): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values || []) {
    const value = String(raw || "").trim();
    if (!value) continue;
    const key = normalizeText(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (max > 0 && out.length >= max) break;
  }
  return out;
}

function humanCatalogName(raw: string): string {
  const base = String(raw || "").replace(/\s+/g, " ").trim();
  if (!base) return "";
  const cleaned = base
    .replace(/^(data\s*sheet|datasheet|ficha\s*tecnica|ficha\s*t[eé]cnica)\s*/i, "")
    .replace(/\b(data\s*sheet|datasheet|ficha\s*tecnica|ficha\s*t[eé]cnica)\b/gi, "")
    .replace(/\b(us|es)\s*\d{6,}\b[ a-z0-9-]*$/i, "")
    .replace(/\b(\d{7,})\b\s*[a-z]?$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return cleaned || base;
}

function extractSpecsFromJson(specsJson: any, maxLines = 4): string[] {
  const tables = Array.isArray(specsJson?.tables) ? specsJson.tables : [];
  const out: string[] = [];
  for (const t of tables) {
    const headers = Array.isArray(t?.headers) ? t.headers.map((h: any) => String(h || "").trim()) : [];
    const rows = Array.isArray(t?.rows) ? t.rows : [];
    for (const row of rows) {
      if (!Array.isArray(row)) continue;
      for (let i = 0; i < row.length; i++) {
        const value = String(row[i] || "").replace(/\s+/g, " ").trim();
        if (!value) continue;
        const header = String(headers[i] || "").replace(/\s+/g, " ").trim();
        const line = header && !/^col_\d+$/i.test(header)
          ? `${header}: ${value}`
          : value;
        const normalized = normalizeText(line);
        if (!normalized || normalized === "especificaciones" || normalized === "specifications") continue;
        out.push(line);
        if (out.length >= maxLines) return uniqueNormalizedStrings(out, maxLines);
      }
    }
  }
  return uniqueNormalizedStrings(out, maxLines);
}

function buildTechnicalSummary(row: any, maxLines = 4): string {
  const specsText = String(row?.specs_text || "").replace(/\s+/g, " ").trim();
  const summaryText = String(row?.summary || "").replace(/\s+/g, " ").trim();
  const descriptionText = String(row?.description || "").replace(/\s+/g, " ").trim();

  const primary = [specsText, summaryText, descriptionText].filter(Boolean).join("; ");
  let lines = primary
    .split(/[.;]\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/^[-•\u2022]+\s*/, "").trim())
    .filter((s) => {
      const n = normalizeText(s);
      return Boolean(n) && n !== "especificaciones" && n !== "specifications" && n.length > 8;
    });

  lines = uniqueNormalizedStrings(lines, Math.max(maxLines, 60));
  if (!lines.length) {
    lines = extractSpecsFromJson(row?.specs_json, Math.max(maxLines, 60));
  }
  if (!lines.length) return "";
  return lines.slice(0, maxLines).map((l) => `- ${l}`).join("\n");
}

function buildQuoteItemDescription(row: any, fallbackName: string): string {
  const source = row?.source_payload && typeof row.source_payload === "object" ? row.source_payload : {};
  const specs = row?.specs_json && typeof row.specs_json === "object" ? row.specs_json : {};
  const brand = String(row?.brand || "OHAUS").trim() || "OHAUS";
  const family = String((source as any)?.family || (specs as any)?.familia || "").trim();
  const templateDescription = String((source as any)?.descripcion_comercial_larga || (source as any)?.quote_description || row?.description || "").trim();
  if (templateDescription) {
    const normalizedLines = uniqueNormalizedStrings(
      templateDescription
        .split(/\r?\n+|;\s*/)
        .map((l) => String(l || "").trim())
        .filter(Boolean),
      56
    );
    if (normalizedLines.length >= 3) return normalizedLines.join("\n");
  }
  const sap = String((source as any)?.sap || (source as any)?.product_code || (source as any)?.codigo || "").trim();
  const capacity = String((source as any)?.capacity || (specs as any)?.capacidad || "").trim();
  const resolution = String((source as any)?.resolution || (specs as any)?.resolucion || "").trim();

  const lines: string[] = [];
  lines.push(family ? `${family} marca ${brand}` : `Producto marca ${brand}`);
  if (sap) lines.push(`SAP: ${sap}`);
  if (capacity) lines.push(`Capacidad maxima: ${capacity}`);
  if (resolution) lines.push(`Lectura minima: ${resolution}`);

  const summary = buildTechnicalSummary(row, 48)
    .split("\n")
    .map((l) => String(l || "").replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);

  for (const s of summary) {
    const normalized = normalizeText(s);
    if (!normalized) continue;
    if (lines.some((x) => normalizeText(x) === normalized)) continue;
    lines.push(s);
    if (lines.length >= 56) break;
  }

  if (!lines.length) lines.push(`Producto: ${String(fallbackName || row?.name || "-")}`);
  return lines.join("\n");
}

type StaticQuoteProfile = { description: string; imageFile: string };

function resolveStaticQuoteProfile(row: any, fallbackName: string): StaticQuoteProfile | null {
  const model = normalizeText(String(row?.name || fallbackName || ""));
  if (!model) return null;

  if (/^px\d+/.test(model)) {
    return {
      imageFile: "px.png",
      description: [
        "Balanza semi micro marca Ohaus",
        "SAP: 30475733",
        "Capacidad maxima: 82 g",
        "Lectura minima: 0,01 mg",
        "Tamano del plato: 80 mm",
        "Calibracion interna AutoCal: Automatica",
        "Proteccion contra corrientes de aire: Incluido",
        "Comunicacion: USB; RS232",
        "Pantalla: LCD de 2 lineas con luz de fondo",
        "Linealidad: 0,0001 g",
        "Material del plato: Acero inoxidable",
        "Alimentacion: Adaptador de CA (incluido)",
        "Repetibilidad, tipica: 0,02 mg",
        "Tiempo de estabilizacion: 10 s",
        "Rango de tara: Capacidad total por sustraccion",
        "Unidades de medida: Tael de Singapur; Onza Troy; Pennyweight; Grano; Kilogramo; Tical; Personalizado; Miligramo; Momme; Newton; Tael de Taiwan; Gramo; Tael de Hong Kong; Libra; Tola; Mesghal; Quilates; Onza",
      ].join("\n"),
    };
  }

  if (/^ax\d+/.test(model) || /^ad\d+/.test(model)) {
    return {
      imageFile: "ax.png",
      description: [
        "Balanza Semi micro marca Ohaus",
        "SAP: 30852314",
        "Capacidad maxima: 82 g",
        "Lectura minima: 0,00001 g",
        "Tamano del plato: 80 mm",
        "Calibracion interna AutoCal: Automatica",
        "Proteccion contra corrientes de aire: Incluido",
        "Autorizada para comercio: No aplica",
        "Modelo de pantalla auxiliar: Disponible como accesorio",
        "Dimensiones: 354 mm x 340 mm x 230 mm (LxAxA)",
        "Puerta automatica: No aplica",
        "Entorno de trabajo: 10 C - 30 C, 80 % HR, sin condensacion",
        "Peso neto: 5,1 kg",
        "Funda de proteccion: Incluido",
        "Comunicacion: USB; RS232",
        "Host USB: Incluido",
        "Alimentacion: Adaptador de CA (incluido)",
        "Unidades de medida: Tael de Singapur; Onza Troy; Pennyweight; Grano; Tical; Personalizado; Miligramo; Momme; Newton; Baht; Tael de Taiwan; Gramo; Tael de Hong Kong; Libra; Tola; Mesghal; Quilates; Onza",
        "Pantalla: Pantalla tactil a color WQVGA de 4.3\"",
        "Material del plato: Acero inoxidable",
        "Ionizador incorporado: No",
        "Tiempo de estabilizacion: 8 s",
        "Repetibilidad, tipica: 0,00002 g",
        "Peso minimo (USP, 0.1%, tipico): 20 mg",
        "Linealidad: 0,1 mg",
      ].join("\n"),
    };
  }

  if (/^(exr|exp|ex)\d+/.test(model)) {
    return {
      imageFile: "exr.png",
      description: [
        "Balanza Semi - Micro marca Ohaus",
        "Capacidad maxima: 82 g/120 g",
        "Lectura minima: 0,00001 g",
        "Pantalla: tactil a color",
        "Comunicacion: USB; RS232",
        "Calibracion interna: Automatica",
        "Gestion de usuarios con perfiles y registro de eventos",
        "Aplicaciones: pesaje, conteo, chequeo, formulacion y densidad",
        "Rango de temperatura de funcionamiento: 10 C a 30 C",
        "Humedad relativa de trabajo: 15 % a 80 % sin condensacion",
        "Tiempo de estabilizacion: hasta 2 s segun modelo",
        "Plato de pesaje en acero inoxidable",
      ].join("\n"),
    };
  }

  if (/^mb\d+/.test(model)) {
    return {
      imageFile: "mb.png",
      description: [
        "Analizador de humedad Ohaus",
        "Pantalla tactil a color",
        "Halogeno de alto rendimiento",
        "Programas de secado rapidos y estables",
        "Interfaz USB y RS232",
      ].join("\n"),
    };
  }

  if (/^(r31|r71|rc31)/.test(model)) {
    return {
      imageFile: "ranger.png",
      description: [
        "Balanza industrial Ranger marca Ohaus",
        "Operacion para ambientes industriales",
        "Pantalla robusta y rapida",
        "Construccion durable para uso continuo",
      ].join("\n"),
    };
  }

  if (/^(sjx|spx|stx|px\d+)/.test(model)) {
    return {
      imageFile: "px.png",
      description: [
        "Balanza de precision marca OHAUS",
        "Operacion estable para laboratorio y control de calidad",
        "Pantalla de alta visibilidad y respuesta rapida",
        "Construccion robusta para uso diario",
      ].join("\n"),
    };
  }

  return null;
}

function localImageFileToDataUrl(fileName: string): string {
  const safe = String(fileName || "").trim();
  if (!safe) return "";
  const p = path.join(QUOTE_LOCAL_IMAGE_DIR, safe);
  if (!fs.existsSync(p)) return "";
  const ext = String(path.extname(p || "")).toLowerCase();
  const mime = ext === ".png" ? "image/png" : (ext === ".jpg" || ext === ".jpeg") ? "image/jpeg" : ext === ".webp" ? "image/webp" : "";
  if (!mime) return "";
  try {
    const base64 = fs.readFileSync(p).toString("base64");
    return base64 ? `data:${mime};base64,${base64}` : "";
  } catch {
    return "";
  }
}

function resolveModelSpecificLocalImageDataUrl(row: any): string {
  const source = row?.source_payload && typeof row.source_payload === "object" ? row.source_payload : {};
  const canonical = (v: string) => normalizeCatalogQueryText(String(v || "")).replace(/[^a-z0-9]/g, "");
  const modelHints = uniqueNormalizedStrings([
    String(row?.name || ""),
    String((source as any)?.quote_model || ""),
    String((source as any)?.numero_modelo || ""),
    ...extractModelLikeTokens(String(row?.name || "")),
  ])
    .map((x) => canonical(x))
    .filter((x) => x.length >= 5);
  if (!modelHints.length) return "";

  const exts = [".png", ".jpg", ".jpeg", ".webp"];
  for (const key of modelHints) {
    for (const ext of exts) {
      const local = localImageFileToDataUrl(`${key}${ext}`);
      if (local) return local;
    }
  }
  return "";
}

let pdfParseModuleCache: any = null;
const localQuotePdfTextCache = new Map<string, { at: number; lines: string[] }>();
const localQuotePdfImageCache = new Map<string, { at: number; dataUrl: string; mtimeMs: number; byteSize: number }>();

async function getPdfParseModule(): Promise<any> {
  if (pdfParseModuleCache) return pdfParseModuleCache;
  const mod: any = await import("pdf-parse");
  pdfParseModuleCache = mod || {};
  return pdfParseModuleCache;
}

function cleanPdfSpecLines(raw: string): string[] {
  return String(raw || "")
    .split(/\r?\n+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((l) => l.length >= 4)
    .filter((l) => !/^pag\s*\d+/i.test(l))
    .filter((l) => !/^fecha de /i.test(l))
    .filter((l) => !/^item\s+producto/i.test(l))
    .filter((l) => !/^contacto comercial$/i.test(l))
    .filter((l) => !/^subtotal|^descuento|^iva|^valor total/i.test(l))
    .filter((l) => !/^avanza internacional/i.test(l))
    .filter((l) => normalizeText(l).length >= 4);
}

async function extractPdfTechnicalLines(row: any): Promise<string[]> {
  if (!ENABLE_RUNTIME_PDF_TEXT_PARSE_FOR_QUOTE) return [];
  const localPath = pickBestLocalPdfPath(row, String(row?.name || ""));
  if (!localPath || !fs.existsSync(localPath)) return [];
  const cache = localQuotePdfTextCache.get(localPath);
  if (cache && (Date.now() - cache.at) < 6 * 60 * 60 * 1000) return cache.lines;
  try {
    const pdfMod = await getPdfParseModule();
    const PDFParse = (pdfMod as any)?.PDFParse || (pdfMod as any)?.default?.PDFParse;
    if (!PDFParse) return [];
    const buff = fs.readFileSync(localPath);
    const parser: any = new PDFParse({ data: buff });
    const parsed: any = await parser.getText();
    await parser.destroy?.();
    const lines = uniqueNormalizedStrings(cleanPdfSpecLines(String(parsed?.text || "")), 120);
    console.log("[evolution-webhook] quote_pdf_text_lines", { model: String(row?.name || ""), count: lines.length, localPath });
    localQuotePdfTextCache.set(localPath, { at: Date.now(), lines });
    return lines;
  } catch (err: any) {
    console.warn("[evolution-webhook] quote_pdf_text_parse_failed", { model: String(row?.name || ""), localPath, error: err?.message || String(err || "") });
    return [];
  }
}

async function buildQuoteItemDescriptionAsync(row: any, fallbackName: string): Promise<string> {
  const staticProfile = resolveStaticQuoteProfile(row, fallbackName);

  const base = buildQuoteItemDescription(row, fallbackName)
    .split("\n")
    .map((l) => String(l || "").trim())
    .filter(Boolean);
  const pdfLines = await extractPdfTechnicalLines(row);
  const merged: string[] = [];
  for (const line of [...base, ...pdfLines]) {
    const n = normalizeText(line);
    if (!n) continue;
    if (merged.some((x) => normalizeText(x) === n)) continue;
    merged.push(line);
    if (merged.length >= 34) break;
  }

  if (merged.length >= 8) return merged.join("\n");

  if (staticProfile?.description) {
    const enriched = [...merged];
    const staticLines = String(staticProfile.description || "")
      .split(/\r?\n/)
      .map((l) => String(l || "").trim())
      .filter(Boolean)
      .filter((l) => {
        const n = normalizeText(l);
        return !/(^sap:|capacidad maxima|lectura minima)/.test(n);
      });
    for (const line of staticLines) {
      const n = normalizeText(line);
      if (!n) continue;
      if (enriched.some((x) => normalizeText(x) === n)) continue;
      enriched.push(line);
      if (enriched.length >= 26) break;
    }
    if (enriched.length > merged.length && enriched.length >= 8) {
      console.log("[evolution-webhook] quote_description_static_enriched", { model: String(row?.name || fallbackName || "") });
      return enriched.join("\n");
    }
    console.log("[evolution-webhook] quote_description_static_fallback", { model: String(row?.name || fallbackName || "") });
    return staticProfile.description;
  }

  if (merged.length) return merged.join("\n");

  return buildQuoteItemDescription(row, fallbackName);
}

function detectTechResendIntent(text: string): "sheet" | "image" | "both" | null {
  const t = normalizeText(text || "");
  if (!t) return null;
  const asksResend = /(reenviar|reenvia|reenvie|reenvio|volver a enviar|otra vez|de nuevo|manda de nuevo)/.test(t);
  const asksSheet = /(ficha|datasheet|hoja tecnica|documento tecnico|especificaciones)/.test(t);
  const asksImage = /(imagen|foto)/.test(t);
  if (!asksResend) return null;
  if (asksSheet && asksImage) return "both";
  if (asksImage) return "image";
  return "sheet";
}

function normalizeCatalogQueryText(text: string): string {
  return normalizeText(text || "")
    .replace(/\b([a-z]{1,4})\s*['’`´]\s*(\d{2,6})\b/g, "$11$2")
    .replace(/\b([a-z]{1,4})\s+(\d{2,6})\b/g, "$1$2")
    .replace(/\baventura\b/g, "adventurer")
    .replace(/\badventure\b/g, "adventurer")
    .replace(/\bpioner\b/g, "pioneer")
    .replace(/\bsemi\s+seco\b/g, "semi micro");
}

function isContextResetIntent(text: string): boolean {
  const t = normalizeText(text || "");
  if (!t) return false;
  return /(reinicia(?:r)?\s+contexto|reset(?:ear)?\s+contexto|reset\s+context|limpiar\s+contexto|borrar\s+contexto|olvida\s+contexto|olvida\s+todo|empecemos\s+de\s+nuevo|empezar\s+de\s+nuevo)/.test(t);
}

function hasConcreteProductHint(text: string): boolean {
  const t = normalizeCatalogQueryText(text || "");
  if (!t) return false;

  if (extractModelLikeTokens(t).length > 0) return true;

  if (/\b(sjx|spx|stx|px\d{2,6}[a-z]?|ax\d{2,6}[a-z]?|mb\d{2,6}|st\d{2,6}|pr\d{2,6})\b/.test(t)) {
    return true;
  }

  const hasFamily = /\b(scout|pioneer|adventurer|explorer|defender|ranger|valor|frontier|starter)\b/.test(t);
  if (!hasFamily) return false;

  const generic = new Set(["balanza", "balanzas", "bascula", "basculas", "electroquimica", "analizador", "humedad", "equipo", "equipos", "laboratorio"]);
  const terms = extractCatalogTerms(t).filter((x) => !generic.has(x));
  return terms.length >= 2;
}

function prefersWebTechPageOnly(category: string): boolean {
  void category;
  return false;
}

function extractModelLikeTokens(text: string): string[] {
  return Array.from(
    new Set(
      normalizeCatalogQueryText(text || "")
        .split(/[^a-z0-9]+/i)
        .map((x) => x.trim())
        .filter((x) => x.length >= 3)
        .filter((x) => /\d/.test(x))
    )
  );
}

function splitModelToken(token: string): { letters: string; digits: string } {
  const t = normalizeCatalogQueryText(String(token || "")).replace(/[^a-z0-9]/g, "");
  const letters = (t.match(/^[a-z]+/) || [""])[0];
  const digits = (t.match(/\d+/g) || []).join("");
  return { letters, digits };
}

function isLikelyModelCodeToken(token: string): boolean {
  const t = normalizeCatalogQueryText(String(token || "")).replace(/[^a-z0-9]/g, "");
  if (!t || t.length < 4) return false;
  if (/^(\d+)(g|kg|mg)$/.test(t)) return false;
  const letters = (t.match(/[a-z]/g) || []).length;
  const digits = (t.match(/\d/g) || []).length;
  return letters >= 2 && digits >= 2;
}

function categoryMatchesIntent(row: any, categoryIntent: string): boolean {
  const wanted = normalizeText(String(categoryIntent || ""));
  if (!wanted) return true;
  const rowCategory = normalizeText(String(row?.category || ""));
  const rowSubcategory = catalogSubcategory(row);
  return (
    rowCategory === wanted ||
    rowCategory.startsWith(`${wanted}_`) ||
    rowSubcategory === wanted ||
    rowSubcategory.startsWith(`${wanted}_`)
  );
}

function passesStrictCategoryGuard(row: any, categoryIntent: string): boolean {
  return true;
}

function scopeCatalogRows(rows: any[], categoryIntent: string): any[] {
  const wanted = normalizeText(String(categoryIntent || ""));
  if (!wanted) return rows || [];
  if (wanted === "balanzas_precision") {
    const precisionRows = (rows || []).filter((row: any) => {
      const rowCat = normalizeText(String(row?.category || ""));
      if (!(rowCat === "balanzas" || rowCat.startsWith("balanzas_"))) return false;
      const sub = catalogSubcategory(row);
      const fam = normalizeText(familyLabelFromRow(row));
      const name = normalizeText(String(row?.name || ""));
      if (/(basculas|ranger|defender|valor|industrial|plataforma)/.test(`${sub} ${fam} ${name}`)) return false;
      const read = Number(getRowReadabilityG(row) || 0);
      if (read > 0 && read <= 0.01) return true;
      return /(precision|analitica|semi micro|semimicro|semi analitica|explorer|adventurer|pioneer|scout|exr|exp|ax|px)/.test(`${sub} ${fam} ${name}`);
    });
    return precisionRows;
  }
  const strict = (rows || []).filter((row: any) => {
    if (!categoryMatchesIntent(row, wanted)) return false;
    return passesStrictCategoryGuard(row, wanted);
  });
  if (wanted !== "basculas" || strict.length >= 3) return strict;

  const relaxed = (rows || []).filter((row: any) => {
    const rowCat = normalizeText(String(row?.category || ""));
    const rowSub = catalogSubcategory(row);
    const payload = row?.source_payload && typeof row.source_payload === "object" ? row.source_payload : {};
    const rowFamily = normalizeText(String((payload as any)?.family || ""));
    const rowName = normalizeText(String(row?.name || ""));
    if (rowCat === "basculas" || rowCat.startsWith("basculas_") || rowSub.startsWith("basculas") || rowSub.startsWith("plataformas") || rowSub.startsWith("indicadores")) {
      return true;
    }
    if (/(plataforma|indicador|bascula|basculas|control de peso)/.test(rowName)) {
      return true;
    }
    if (/(bascula|basculas|plataforma|indicador)/.test(rowFamily)) {
      return true;
    }
    return false;
  });

  const out: any[] = [];
  const seen = new Set<string>();
  for (const row of [...strict, ...relaxed]) {
    const key = String(row?.id || "").trim() || normalizeText(String(row?.name || ""));
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function isCatalogMatchConsistent(text: string, row: any, forcedCategory?: string): boolean {
  if (!row) return false;
  const requestedCategory = normalizeText(String(forcedCategory || detectCatalogCategoryIntent(text) || ""));
  if (requestedCategory && !categoryMatchesIntent(row, requestedCategory)) {
    return false;
  }

  const terms = extractCatalogTerms(text);
  if (!terms.length) return true;
  const hay = normalizeText(`${row?.name || ""} ${row?.brand || ""} ${row?.category || ""} ${catalogSubcategory(row)}`);

  const modelTokens = extractModelLikeTokens(text);
  if (modelTokens.length && modelTokens.some((t) => !hay.includes(t))) return false;

  const matchedTerms = terms.filter((t) => hay.includes(t));
  const minMatches = terms.length <= 2 ? terms.length : Math.min(3, terms.length);
  return matchedTerms.length >= minMatches;
}

function filterCatalogByTerms(text: string, rows: any[], forcedCategory?: string): any[] {
  const requestedCategory = normalizeText(String(forcedCategory || detectCatalogCategoryIntent(text) || ""));
  const terms = extractCatalogTerms(text);
  const modelTokens = extractModelLikeTokens(text);
  return (rows || []).filter((row: any) => {
    if (requestedCategory && !categoryMatchesIntent(row, requestedCategory)) return false;
    if (!terms.length) return true;
    const hay = normalizeText(`${row?.name || ""} ${row?.brand || ""} ${row?.category || ""} ${catalogSubcategory(row)}`);
    if (modelTokens.length && modelTokens.some((t) => !hay.includes(t))) return false;
    const matchedTerms = terms.filter((t) => hay.includes(t));
    const minMatches = terms.length <= 2 ? terms.length : Math.min(3, terms.length);
    return matchedTerms.length >= minMatches;
  });
}

function pickBestProductPdfUrl(row: any, queryText: string): string {
  const payload = row?.source_payload && typeof row.source_payload === "object" ? row.source_payload : {};
  const payloadPdfLinks = Array.isArray((payload as any)?.pdf_links) ? (payload as any).pdf_links : [];
  const productUrlAsPdf = /\.pdf(\?|$)/i.test(String(row?.product_url || "")) ? String(row?.product_url || "") : "";

  const candidates = uniqueNormalizedStrings(
    [String(row?.datasheet_url || "").trim(), ...payloadPdfLinks.map((u: any) => String(u || "").trim()), productUrlAsPdf]
      .filter(Boolean)
  ).filter((u) => /^https?:\/\//i.test(u) && /\.pdf(\?|$)/i.test(u));

  if (!candidates.length) return "";

  const baseText = `${String(row?.name || "")} ${String(row?.slug || "")} ${String(queryText || "")}`;
  const modelTokens = extractModelLikeTokens(baseText);
  const terms = extractCatalogTerms(baseText);
  const slugCompact = normalizeCatalogQueryText(String(row?.slug || "")).replace(/[^a-z0-9]+/g, "");

  let best: { url: string; score: number; modelHits: number } | null = null;
  for (const url of candidates) {
    const hay = normalizeCatalogQueryText(url);
    const hayCompact = hay.replace(/[^a-z0-9]+/g, "");
    let score = 0;
    let modelHits = 0;

    for (const token of modelTokens) {
      if (hay.includes(token)) {
        modelHits += 1;
        score += 10;
      }
    }

    for (const term of terms) {
      if (hay.includes(term)) score += 2;
    }

    if (slugCompact && hayCompact.includes(slugCompact)) score += 5;
    if (/datasheet|ficha/i.test(hay)) score += 2;
    if (/brochure|catalog|catalogo|guia|manual|folleto|conceptos|fundamentos|comparativa/i.test(hay)) score -= 4;

    if (!best || score > best.score) {
      best = { url, score, modelHits };
    }
  }

  if (!best) return "";
  if (modelTokens.length && best.modelHits === 0) return "";
  return best.url;
}

function pickCatalogByVariantText(
  text: string,
  catalogRows: any[],
  variantRows: any[],
  forcedCategory?: string
): any | null {
  const requestedCategory = normalizeText(String(forcedCategory || detectCatalogCategoryIntent(text) || ""));
  const scopedCatalog = requestedCategory ? scopeCatalogRows(catalogRows || [], requestedCategory) : (catalogRows || []);
  const sourceCatalog = scopedCatalog.length ? scopedCatalog : (catalogRows || []);
  if (!sourceCatalog.length || !Array.isArray(variantRows) || !variantRows.length) return null;

  const byCatalogId = new Map<string, any>();
  for (const row of sourceCatalog) {
    const id = String(row?.id || "").trim();
    if (id) byCatalogId.set(id, row);
  }
  if (!byCatalogId.size) return null;

  const terms = extractCatalogTerms(text);
  const modelTokens = extractModelLikeTokens(text);
  const compactInbound = normalizeCatalogQueryText(text).replace(/[^a-z0-9]+/g, "");

  let best: { row: any; score: number } | null = null;
  for (const variant of variantRows) {
    const catalogId = String((variant as any)?.catalog_id || "").trim();
    const row = byCatalogId.get(catalogId);
    if (!row) continue;

    const attrs = (variant as any)?.attributes && typeof (variant as any).attributes === "object"
      ? Object.values((variant as any).attributes as Record<string, any>).map((v) => String(v || "")).join(" ")
      : String((variant as any)?.attributes || "");

    const blob = `${(variant as any)?.sku || ""} ${(variant as any)?.variant_name || ""} ${(variant as any)?.range_text || ""} ${attrs} ${row?.name || ""}`;
    const hay = normalizeCatalogQueryText(blob);
    const hayCompact = hay.replace(/[^a-z0-9]+/g, "");

    let score = 0;

    if (modelTokens.length) {
      const modelMatches = modelTokens.filter((t) => hay.includes(t));
      if (!modelMatches.length) continue;
      score += modelMatches.length * 10;
      if (modelMatches.some((t) => hayCompact.includes(t))) score += 4;
    }

    if (compactInbound && hayCompact && compactInbound.includes(hayCompact)) score += 6;
    if (compactInbound && hayCompact && hayCompact.includes(compactInbound)) score += 6;

    for (const term of terms) {
      if (hay.includes(term)) score += 3;
    }

    if (!modelTokens.length && terms.length && score < Math.min(6, terms.length * 3)) {
      continue;
    }

    if (!best || score > best.score) best = { row, score };
  }

  return best?.row || null;
}

function isProductLookupIntent(text: string): boolean {
  const t = normalizeText(text || "");
  if (!t) return false;
  return /(tienen|tienes|tiene|manejan|venden|disponible|disponibilidad|hay|referencia|modelo|explorer|adventurer|balanza|analizador|centrifuga)/.test(t);
}

function isStrictCatalogIntent(text: string): boolean {
  const t = normalizeText(text || "");
  if (!t) return false;
  return (
    isProductLookupIntent(t) ||
    isPriceIntent(t) ||
    isRecommendationIntent(t) ||
    isTechnicalSheetIntent(t) ||
    isProductImageIntent(t) ||
    Boolean(detectCatalogCategoryIntent(t))
  );
}

function isCategoryFollowUpIntent(text: string): boolean {
  const t = normalizeText(text || "");
  if (!t) return false;
  return /^(cuales|cu[aá]les|que tienen|que mas tienen|de cual|de cuales|muestrame|muestrame mas|dame una|damela|dámela|quiero esa|quiero ese|esa|ese)\b/.test(t);
}

function isConsistencyChallengeIntent(text: string): boolean {
  const t = normalizeText(text || "");
  if (!t) return false;
  return /(arriba me dij|me dijiste|te contradices|contradic|eso no coincide|no coincide|pero dijiste)/.test(t);
}

function classifyIntent(text: string, memory?: Record<string, any>): ClassifiedIntent {
  const t = normalizeText(text || "");
  const category = detectCatalogCategoryIntent(t) || String(memory?.last_category_intent || "").trim() || null;
  const requestDatasheet = isTechnicalSheetIntent(t) || isProductImageIntent(t);
  const requestQuote = shouldAutoQuote(t) || isQuoteStarterIntent(t) || isQuoteProceedIntent(t);
  const requestTrm = /(trm|tasa representativa|dolar hoy|usd cop|tasa de cambio)/.test(t);

  let intent: ClassifiedIntent["intent"] = "aclaracion";
  if (isGreetingIntent(t)) intent = "greeting";
  else if (isHistoryIntent(t) || isQuoteRecallIntent(t)) intent = "consultar_historial";
  else if (requestQuote) intent = "solicitar_cotizacion";
  else if (requestDatasheet) intent = "solicitar_ficha";
  else if (requestTrm) intent = "consultar_trm";
  else if (isGuidedNeedDiscoveryText(t)) intent = "guided_need_discovery";
  else if (category) intent = "consultar_categoria";
  else if (isProductLookupIntent(t) || isPriceIntent(t) || isRecommendationIntent(t)) intent = "consultar_producto";
  else if (/(gracias|ok gracias|listo gracias|chao|adios|hasta luego)/.test(t)) intent = "despedida";

  return {
    intent,
    category,
    product: null,
    request_datasheet: requestDatasheet,
    request_quote: requestQuote,
    request_trm: requestTrm,
    needs_clarification: intent === "aclaracion",
  };
}

function findCatalogProductByName(rows: any[], rememberedName: string): any | null {
  const target = normalizeText(rememberedName || "");
  if (!target) return null;
  const exact = (rows || []).find((r: any) => normalizeText(String(r?.name || "")) === target);
  if (exact) return exact;
  const partial = (rows || []).find((r: any) => target.includes(normalizeText(String(r?.name || ""))) || normalizeText(String(r?.name || "")).includes(target));
  return partial || null;
}

function parseRate(v: any) {
  const raw = String(v ?? "").trim().replace(/[^0-9,.-]/g, "");
  if (!raw) return null;

  const hasDot = raw.includes(".");
  const hasComma = raw.includes(",");

  let normalized = raw;
  if (hasDot && hasComma) {
    const lastDot = raw.lastIndexOf(".");
    const lastComma = raw.lastIndexOf(",");
    if (lastComma > lastDot) {
      normalized = raw.replace(/\./g, "").replace(/,/g, ".");
    } else {
      normalized = raw.replace(/,/g, "");
    }
  } else if (hasComma) {
    normalized = raw.replace(/,/g, ".");
  }

  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function isLikelyTrm(rate: number) {
  return Number.isFinite(rate) && rate >= 1000 && rate <= 10000;
}

function todayKey() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

async function fetchTrmFromSocrata() {
  const url = "https://www.datos.gov.co/resource/32sa-8pi3.json?$limit=1&$order=vigenciadesde%20desc";
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Socrata TRM failed (${res.status})`);
  const rows = await res.json();
  const first = Array.isArray(rows) ? rows[0] : null;
  const rate = parseRate(first?.valor);
  if (!rate || !isLikelyTrm(rate)) throw new Error("Invalid TRM payload");
  return { rate, source: "datos.gov.co", source_url: url };
}

async function fetchTrmFallback() {
  const url = "https://open.er-api.com/v6/latest/USD";
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Fallback FX failed (${res.status})`);
  const json = await res.json();
  const rate = Number(json?.rates?.COP || 0);
  if (!isLikelyTrm(rate)) throw new Error("Invalid fallback FX payload");
  return { rate, source: "open.er-api.com", source_url: url };
}

async function getOrFetchTrm(supabase: any, ownerId: string, tenantId: string | null) {
  const day = todayKey();
  const { data: cached } = await supabase
    .from("agent_fx_rates")
    .select("id,rate,rate_date,source")
    .eq("tenant_id", tenantId)
    .eq("created_by", ownerId)
    .eq("from_currency", "USD")
    .eq("to_currency", "COP")
    .eq("rate_date", day)
    .maybeSingle();

  if (cached?.rate && isLikelyTrm(Number(cached.rate))) return cached;

  let fetched: { rate: number; source: string; source_url: string };
  try {
    fetched = await fetchTrmFromSocrata();
  } catch {
    fetched = await fetchTrmFallback();
  }

  const payload = {
    tenant_id: tenantId,
    created_by: ownerId,
    rate_date: day,
    from_currency: "USD",
    to_currency: "COP",
    rate: fetched.rate,
    source: fetched.source,
    source_url: fetched.source_url,
  };

  const { data, error } = await supabase
    .from("agent_fx_rates")
    .upsert(payload, { onConflict: "tenant_id,rate_date,from_currency,to_currency" })
    .select("id,rate,rate_date,source")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(Number(n || 0));
}

function rowCatalogCopPrice(row: any): number {
  const source = row?.source_payload && typeof row.source_payload === "object" ? row.source_payload : {};
  const prices = source?.prices_cop && typeof source.prices_cop === "object" ? source.prices_cop : {};
  const parse = (v: any) => {
    const n = Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  return parse((prices as any)?.bogota) || parse((prices as any)?.antioquia) || parse((prices as any)?.distribuidor) || 0;
}

function buildPriceRangeLine(rows: any[]): string {
  const values = (Array.isArray(rows) ? rows : [])
    .map((r) => rowCatalogCopPrice(r))
    .filter((v) => Number.isFinite(v) && v > 0)
    .sort((a, b) => a - b);
  if (!values.length) return "";
  return `Según base de datos, nuestras balanzas van desde COP $ ${formatMoney(values[0])}.`;
}

function quoteCodeFromDraftId(draftId: string) {
  const raw = String(draftId || "");
  let h = 0;
  for (let i = 0; i < raw.length; i += 1) h = (h * 31 + raw.charCodeAt(i)) | 0;
  const n = Math.abs(h % 100000);
  return `CO${String(n).padStart(5, "0")}`;
}

function asDateYmd(input: Date | string) {
  const d = input instanceof Date ? input : new Date(input);
  const ts = Number.isFinite(d.getTime()) ? d.getTime() : Date.now();
  return new Date(ts).toISOString().slice(0, 10);
}

const QUOTE_BANNER_IMAGE_URL = String(process.env.WHATSAPP_QUOTE_BANNER_IMAGE_URL || "").trim();
const LOCAL_QUOTE_BANNER_PATH = String(
  process.env.WHATSAPP_QUOTE_BANNER_LOCAL_PATH ||
  path.join(process.cwd(), "app", "api", "agents", "channels", "evolution", "webhook-v2", "banner_cotizacion_avanza_ohaus.png")
).trim();
const QUOTE_PERKS_IMAGE_URL = String(process.env.WHATSAPP_QUOTE_PERKS_IMAGE_URL || "").trim();
const LOCAL_QUOTE_PERKS_PATH = String(
  process.env.WHATSAPP_QUOTE_PERKS_LOCAL_PATH ||
  path.join(process.cwd(), "app", "api", "agents", "channels", "evolution", "webhook-v2", "ee3062f7-f286-4d62-b63b-29c796a8799f.png")
).trim();
let quoteBannerImageCache: { at: number; dataUrl: string } | null = null;
let quotePerksImageCache: { at: number; dataUrl: string } | null = null;

function imageDataUrlFromRemote(remote: { base64: string; mimetype: string } | null): string {
  if (!remote) return "";
  const mime = String(remote.mimetype || "").toLowerCase();
  if (!/^image\//.test(mime)) return "";
  const b64 = String(remote.base64 || "").trim();
  if (!b64) return "";
  return `data:${mime};base64,${b64}`;
}

async function resolveQuoteBannerImageDataUrl(): Promise<string> {
  const now = Date.now();
  if (quoteBannerImageCache && (now - quoteBannerImageCache.at) < 30 * 60 * 1000) {
    return quoteBannerImageCache.dataUrl;
  }
  let dataUrl = "";

  const localPath = String(LOCAL_QUOTE_BANNER_PATH || "").trim();
  if (localPath && fs.existsSync(localPath)) {
    try {
      const ext = String(path.extname(localPath || "")).toLowerCase();
      const mime = ext === ".png"
        ? "image/png"
        : (ext === ".jpg" || ext === ".jpeg")
          ? "image/jpeg"
          : ext === ".webp"
            ? "image/webp"
            : "";
      if (mime) {
        const base64 = fs.readFileSync(localPath).toString("base64");
        if (base64) dataUrl = `data:${mime};base64,${base64}`;
      }
    } catch {
      dataUrl = "";
    }
  }

  if (!dataUrl && QUOTE_BANNER_IMAGE_URL) {
    const remote = await fetchRemoteFileAsBase64(QUOTE_BANNER_IMAGE_URL);
    dataUrl = imageDataUrlFromRemote(remote);
  }

  quoteBannerImageCache = { at: now, dataUrl };
  return dataUrl;
}

async function resolveQuotePerksImageDataUrl(): Promise<string> {
  const now = Date.now();
  if (quotePerksImageCache && (now - quotePerksImageCache.at) < 30 * 60 * 1000) {
    return quotePerksImageCache.dataUrl;
  }
  let dataUrl = "";

  const localPath = String(LOCAL_QUOTE_PERKS_PATH || "").trim();
  if (localPath && fs.existsSync(localPath)) {
    try {
      const ext = String(path.extname(localPath || "")).toLowerCase();
      const mime = ext === ".png"
        ? "image/png"
        : (ext === ".jpg" || ext === ".jpeg")
          ? "image/jpeg"
          : ext === ".webp"
            ? "image/webp"
            : "";
      if (mime) {
        const base64 = fs.readFileSync(localPath).toString("base64");
        if (base64) dataUrl = `data:${mime};base64,${base64}`;
      }
    } catch {
      dataUrl = "";
    }
  }

  if (!dataUrl && QUOTE_PERKS_IMAGE_URL) {
    const remote = await fetchRemoteFileAsBase64(QUOTE_PERKS_IMAGE_URL);
    dataUrl = imageDataUrlFromRemote(remote);
  }

  quotePerksImageCache = { at: now, dataUrl };
  return dataUrl;
}

async function resolveProductImageDataUrl(row: any): Promise<string> {
  const localModelSpecific = resolveModelSpecificLocalImageDataUrl(row);
  if (localModelSpecific) return localModelSpecific;

  const source = row?.source_payload && typeof row.source_payload === "object" ? row.source_payload : {};
  const candidates = uniqueNormalizedStrings([
    String(row?.image_url || "").trim(),
    String((source as any)?.image_url || "").trim(),
    String((source as any)?.image || "").trim(),
  ]).filter((u) => /^https?:\/\//i.test(u));
  for (const u of candidates) {
    const remote = await fetchRemoteFileAsBase64(u);
    const dataUrl = imageDataUrlFromRemote(remote);
    if (dataUrl) return dataUrl;
  }

  // Intentionally avoid extracting image from local quote PDFs here.
  // Those PDFs can contain a generic hero image and make multi-product
  // quotations look like every row has the same product photo.

  const staticProfile = resolveStaticQuoteProfile(row, String(row?.name || ""));
  if (staticProfile?.imageFile) {
    const local = localImageFileToDataUrl(staticProfile.imageFile);
    if (local) {
      console.log("[evolution-webhook] quote_image_static_ok", { model: String(row?.name || ""), imageFile: staticProfile.imageFile });
      return local;
    }
  }

  return "";
}

type QuotePdfLineItem = {
  productName: string;
  quantity: number;
  basePriceUsd: number;
  trmRate: number;
  totalCop: number;
  description?: string;
  warranty?: string;
  imageDataUrl?: string;
};

function quoteIvaRate(): number {
  const raw = Number(process.env.WHATSAPP_QUOTE_IVA_RATE || 0.19);
  if (!Number.isFinite(raw) || raw < 0 || raw > 1) return 0.19;
  return raw;
}

async function buildStandardQuotePdf(args: {
  quoteNumber: string;
  issueDate: string;
  validUntil: string;
  companyName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  city?: string;
  nit?: string;
  items: QuotePdfLineItem[];
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const blue = [9, 137, 189] as const;
  const dark = [20, 20, 20] as const;
  const phoneSafe = normalizePhone(args.customerPhone || "");
  const ivaRate = quoteIvaRate();
  const col = [10, 20, 50, 127, 145, 157, 178, 200];
  const footerPageTop = 284;
  const singleItemMode = Array.isArray(args.items) && args.items.length === 1;

  const bannerDataUrl = await resolveQuoteBannerImageDataUrl();
  const hasBanner = Boolean(String(bannerDataUrl || "").trim());
  const perksDataUrl = await resolveQuotePerksImageDataUrl();
  const hasPerksStrip = Boolean(String(perksDataUrl || "").trim());

  const drawHeader = (compact = false) => {
    doc.setFillColor(245, 248, 251);
    doc.rect(0, 0, 210, 297, "F");
    const boxHeight = compact ? 20 : (hasBanner ? 62 : 28);
    const titleBarY = compact ? 20 : (hasBanner ? 66 : 28);
    doc.setFillColor(255, 255, 255);
    doc.rect(8, 8, 194, boxHeight, "F");
    doc.setDrawColor(210, 220, 228);
    doc.rect(8, 8, 194, boxHeight, "S");

    if (hasBanner && !compact) {
      try {
        doc.addImage(bannerDataUrl, "PNG", 8.5, 8.5, 193, 55);
      } catch {
        // ignore banner rendering failure
      }
    }

    doc.setFillColor(blue[0], blue[1], blue[2]);
    doc.rect(8, titleBarY, 194, 8, "F");

    doc.setFont("helvetica", "bold");
    doc.setTextColor(237, 106, 47);
    doc.setFontSize(compact ? 22 : 28);
    if (!hasBanner || compact) doc.text("Avanza", 12, compact ? 19 : 20);
    doc.setTextColor(220, 23, 55);
    doc.setFontSize(compact ? 16 : 20);
    if (!hasBanner || compact) doc.text("OHAUS", compact ? 50 : 60, compact ? 19 : 20);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text("AVANZA INTERNACIONAL GROUP S.A.S. - Cotizacion Comercial", 12, titleBarY + 5.2);
    doc.setTextColor(dark[0], dark[1], dark[2]);
  };

  drawHeader(false);

  const infoTitleY = hasBanner ? 82 : 44;
  const infoTopY = hasBanner ? 85 : 47;
  const tableHeaderY = hasBanner ? 117 : 79;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Información general", 12, infoTitleY);
  doc.setDrawColor(35, 35, 35);
  doc.setLineWidth(0.25);
  doc.rect(10, infoTopY, 190, 28, "S");
  doc.line(105, infoTopY, 105, infoTopY + 28);
  for (let r = 1; r <= 4; r += 1) {
    const yLine = infoTopY + (28 / 5) * r;
    doc.line(10, yLine, 200, yLine);
  }

  const leftRows: Array<[string, string]> = [
    ["Cliente", args.companyName || args.customerName || "-"],
    ["Contacto", args.customerName || "-"],
    ["Direccion", String(args.city || "Bogota D.C")],
    ["Número de Cotización", args.quoteNumber],
    ["Forma de Pago", "Contado"],
  ];
  const rightRows: Array<[string, string]> = [
    ["NIT", String(args.nit || "-")],
    ["Celular", phoneSafe.length >= 10 && phoneSafe.length <= 15 ? phoneSafe : "-"],
    ["Correo", args.customerEmail || "-"],
    ["Fecha de Validez", args.validUntil],
    ["Fecha de Entrega", "45 días hábiles"],
  ];

  let yRow = infoTopY + 5;
  for (let i = 0; i < leftRows.length; i += 1) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.3);
    const leftLabel = `${leftRows[i][0]}:`;
    doc.text(leftLabel, 12, yRow);
    doc.setFont("helvetica", "normal");
    doc.text(String(leftRows[i][1] || "-").slice(0, 32), 12 + doc.getTextWidth(leftLabel) + 3, yRow);
    doc.setFont("helvetica", "bold");
    const rightLabel = `${rightRows[i][0]}:`;
    doc.text(rightLabel, 108, yRow);
    doc.setFont("helvetica", "normal");
    doc.text(String(rightRows[i][1] || "-").slice(0, 30), 108 + doc.getTextWidth(rightLabel) + 3, yRow);
    yRow += 5;
  }

  const drawTableHeader = (yTop: number) => {
    doc.setFillColor(blue[0], blue[1], blue[2]);
    doc.rect(10, yTop, 190, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8.2);
    doc.text("Item", 12, yTop + 5.2);
    doc.text("Producto", 24, yTop + 5.2);
    doc.text("Descripcion", 52, yTop + 5.2);
    doc.text("Garantia", 129.5, yTop + 5.2);
    doc.text("Cant.", 155, yTop + 5.2, { align: "right" });
    doc.text("Valor unit.", 176.5, yTop + 5.2, { align: "right" });
    doc.text("Valor total", 196.8, yTop + 5.2, { align: "right" });
    doc.setTextColor(dark[0], dark[1], dark[2]);
  };

  const truncateLines = (lines: string[], maxLines: number): string[] => {
    if (lines.length <= maxLines) return lines;
    const next = lines.slice(0, maxLines);
    next[maxLines - 1] = `${String(next[maxLines - 1] || "").trimEnd()}...`;
    return next;
  };

  let currentTableHeaderY = tableHeaderY;
  let tableHeaderDrawn = false;
  let y = currentTableHeaderY + 11;
  let index = 1;
  let subtotal = 0;
  const lineHeight = singleItemMode ? 2.9 : 3.5;
  const rowPadding = singleItemMode ? 2.4 : 3;
  for (const item of args.items || []) {
    const qty = Math.max(1, Number(item.quantity || 1));
    const lineTotal = Number(item.totalCop || 0) > 0
      ? Number(item.totalCop || 0)
      : Number(item.basePriceUsd || 0) * Number(item.trmRate || 0) * qty;
    subtotal += lineTotal;

    const fullDesc = String(item.description || "").replace(/\s+/g, " ").trim();
    const baseDesc = fullDesc || `Producto: ${String(item.productName || "-")}`;

    const productLines = truncateLines(
      doc.splitTextToSize(String(item.productName || "-").slice(0, 40), 28),
      2,
    );
    const hasImage = ENABLE_QUOTE_PRODUCT_IMAGE && Boolean(String(item.imageDataUrl || "").trim());
    const descTextWidth = 74;
    const descLinesRaw = doc.splitTextToSize(baseDesc, descTextWidth);
    const descLinesAll = singleItemMode ? truncateLines(descLinesRaw, 14) : descLinesRaw;
    let descCursor = 0;
    let isFirstSegment = true;
    while (isFirstSegment || descCursor < descLinesAll.length) {
      const descRemaining = descLinesAll.slice(descCursor);
      const minDescLines = descRemaining.length > 0 ? 1 : (isFirstSegment ? 1 : 0);
      const maxDescLines = Math.max(minDescLines, descRemaining.length || (isFirstSegment ? 1 : 0));
      const rowHeightFor = (descCount: number) => {
        const lineCount = Math.max(
          isFirstSegment ? productLines.length : 1,
          Math.max(descCount, 1),
          1,
        );
        return Math.max(isFirstSegment && hasImage ? (singleItemMode ? 32 : 40) : 12, lineCount * lineHeight + rowPadding);
      };
      const minRowH = rowHeightFor(minDescLines);

      if (!tableHeaderDrawn) {
        if (y + minRowH > 235) {
          if (doc.getNumberOfPages() === 1) {
            // Repaint first page with compact header to avoid an empty first sheet.
            drawHeader(true);
            currentTableHeaderY = 33;
            y = 42;
          } else {
            doc.addPage();
            drawHeader(true);
            currentTableHeaderY = 33;
            y = 42;
          }
        }
        drawTableHeader(currentTableHeaderY);
        tableHeaderDrawn = true;
      }

      if (y + minRowH > 235) {
        doc.addPage();
        drawHeader(true);
        currentTableHeaderY = 33;
        drawTableHeader(currentTableHeaderY);
        y = 42;
      }

      let descCount = maxDescLines;
      while (descCount > minDescLines && y + rowHeightFor(descCount) > 235) {
        descCount -= 1;
      }
      const rowH = rowHeightFor(descCount);
      const descChunk = descRemaining.length > 0
        ? descRemaining.slice(0, descCount)
        : (isFirstSegment ? [baseDesc] : []);

      doc.setDrawColor(35, 35, 35);
      doc.setLineWidth(0.25);
      doc.rect(10, y - 4, 190, rowH, "S");
      for (let i = 1; i < col.length - 1; i += 1) {
        doc.line(col[i], y - 4, col[i], y - 4 + rowH);
      }

      const bodyY = y + 1.8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.2);
      if (isFirstSegment) {
        doc.text(String(index), 12, bodyY);
        doc.setFont("helvetica", "bold");
        doc.text(productLines, 22, bodyY);
        doc.setFont("helvetica", "normal");
      } else {
        doc.setFont("helvetica", "italic");
        doc.text("cont.", 22, bodyY);
        doc.setFont("helvetica", "normal");
      }

      if (isFirstSegment && hasImage) {
        try {
          const imgX = 22;
          const imgY = bodyY + 2;
          const boxW = 24;
          const boxH = Math.min(30, Math.max(22, rowH - 16));
          const dataUrl = String(item.imageDataUrl || "");
          const fmt = /^data:image\/png/i.test(dataUrl)
            ? "PNG"
            : /^data:image\/webp/i.test(dataUrl)
              ? "WEBP"
              : "JPEG";
          let drawW = boxW;
          let drawH = boxH;
          try {
            const props: any = (doc as any).getImageProperties?.(dataUrl);
            const pW = Number(props?.width || 0);
            const pH = Number(props?.height || 0);
            if (pW > 0 && pH > 0) {
              const scale = Math.min(boxW / pW, boxH / pH);
              drawW = Math.max(8, pW * scale);
              drawH = Math.max(8, pH * scale);
            }
          } catch {
            // keep box dimensions if image metadata is unavailable
          }
          const drawX = imgX + (boxW - drawW) / 2;
          const drawY = imgY + (boxH - drawH) / 2;
          doc.addImage(dataUrl, fmt as any, drawX, drawY, drawW, drawH);
        } catch {
          // ignore image rendering failure
        }
      }

      if (descChunk.length > 0) {
        doc.setFontSize(singleItemMode ? 6.6 : 8.2);
        doc.text(descChunk, 52, bodyY);
        doc.setFontSize(8.2);
      }
      if (isFirstSegment) {
        const warrantyLines = doc.splitTextToSize(String(item.warranty || "1 AÑO POR DEFECTO DE FÁBRICA"), 15.5);
        doc.text(warrantyLines, 130.2, bodyY);
        doc.text(String(qty), 155, bodyY, { align: "right" });
        doc.setFontSize(7.8);
        doc.text(`$ ${formatMoney(lineTotal / qty)}`, 176.5, bodyY, { align: "right" });
        doc.text(`$ ${formatMoney(lineTotal)}`, 196.8, bodyY, { align: "right" });
        doc.setFontSize(8.2);
      }

      y += rowH + 0.9;
      descCursor += descChunk.length;
      isFirstSegment = false;
      if (descLinesAll.length === 0) break;
    }

    index += 1;
  }

  if (index === 1) {
    if (!tableHeaderDrawn) {
      drawTableHeader(tableHeaderY);
      y = tableHeaderY + 11;
      tableHeaderDrawn = true;
    }
    doc.setDrawColor(180, 196, 210);
    doc.rect(10, y - 4, 190, 18, "S");
    for (let i = 1; i < col.length - 1; i += 1) {
      doc.line(col[i], y - 4, col[i], y + 14);
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.2);
    doc.text("1", 12, y + 1.8);
    doc.text("-", 22, y + 1.8);
    doc.text("Producto sin detalle en esta cotización", 52, y + 1.8);
    doc.text("-", 128.8, y + 1.8);
    doc.text("1", 155, y + 1.8, { align: "right" });
    doc.text(`$ ${formatMoney(0)}`, 176.5, y + 1.8, { align: "right" });
    doc.text(`$ ${formatMoney(0)}`, 196.8, y + 1.8, { align: "right" });
    y += 20;
  }

  const iva = subtotal * ivaRate;
  const total = subtotal + iva;

  if (y > 240) {
    doc.addPage();
    drawHeader(true);
    y = 40;
  }

  const totalsLabelX = 128;
  const totalsLabelW = 42;
  const totalsValueX = totalsLabelX + totalsLabelW;
  const totalsValueW = 30;
  const totalsValueRight = totalsValueX + totalsValueW - 1;

  doc.setFillColor(blue[0], blue[1], blue[2]);
  doc.rect(totalsLabelX, y, totalsLabelW, 24, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Subtotal:", totalsLabelX + 2, y + 6);
  doc.text("Descuento:", totalsLabelX + 2, y + 12.2);
  doc.text(`IVA (${Math.round(ivaRate * 100)}%):`, totalsLabelX + 2, y + 18.4);
  doc.text("Valor total:", totalsLabelX + 2, y + 22.8);

  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.setDrawColor(35, 35, 35);
  doc.setLineWidth(0.25);
  doc.rect(totalsValueX, y, totalsValueW, 24, "S");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.4);
  doc.text(`$ ${formatMoney(subtotal)}`, totalsValueRight, y + 6, { align: "right" });
  doc.text(`$ ${formatMoney(0)}`, totalsValueRight, y + 12.2, { align: "right" });
  doc.text(`$ ${formatMoney(iva)}`, totalsValueRight, y + 18.4, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.text(`$ ${formatMoney(total)}`, totalsValueRight, y + 22.8, { align: "right" });

  let yFooter = y + (singleItemMode ? 4 : 8);

  const legal = [
    "Observaciones generales de la cotización",
    "- Todos los distribuidores asumen el valor del flete. En el caso de clientes, el flete sera asumido unicamente si el envio es fuera de Bogota.",
    "- No realizamos devoluciones de dinero, excepto cuando se confirme un error de asesoramiento por parte de nuestro equipo.",
    "No dude en contactarnos para cualquier duda o solicitud adicional. Gracias por confiar en nosotros.",
    `${String(args.city || "Bogota D.C")}, ${args.issueDate}`,
  ].join("\n");
  let legalLines = doc.splitTextToSize(legal, 188);
  const companyFooter = [
    "AVANZA INTERNACIONAL GROUP S.A.S",
    "Autopista Medellin k 2.5 entrada parcelas 900 metros - Ciem oikos occidente bodega 7a.",
    "NIT 900505419",
    "CELULAR 321 2165 771",
    "www.balanzasybasculas.com.co - www.avanzagroup.com.co",
  ].join("\n");
  const companyFooterLines = doc.splitTextToSize(companyFooter, 188);
  let legalHeight = Math.max(10, legalLines.length * 3.3);
  const companyHeight = Math.max(10, companyFooterLines.length * 3.2);
  let closingEstimate = 63 + legalHeight + companyHeight;
  if (singleItemMode && yFooter + closingEstimate > 272) {
    const fixedBlocks = 18 + 16 + 10 + 12 + companyHeight + 14;
    const legalBudget = Math.max(2, Math.floor((272 - yFooter - fixedBlocks) / 3.3));
    if (legalBudget < legalLines.length) {
      legalLines = legalLines.slice(0, legalBudget);
      if (legalLines.length) {
        legalLines[legalLines.length - 1] = `${String(legalLines[legalLines.length - 1] || "").trimEnd()}...`;
      }
    }
    legalHeight = Math.max(10, legalLines.length * 3.3);
    closingEstimate = 63 + legalHeight + companyHeight;
  }
  if (!singleItemMode && yFooter + closingEstimate > 272) {
    doc.addPage();
    drawHeader(true);
    yFooter = 40;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Contacto Comercial", 10, yFooter);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Mariana Rodriguez", 10, yFooter + 6);
  doc.text("CEL 3183731171", 10, yFooter + 11);
  doc.text("cotizaciones@avanzagroup.com.co", 10, yFooter + 16);

  doc.setFontSize(8.2);
  doc.text(legalLines, 10, yFooter + 24);

  doc.setDrawColor(35, 35, 35);
  doc.setLineWidth(0.25);
  const leftFooterTop = yFooter + 4;
  const leftFooterBottom = yFooter + 24 + legalHeight + 1;
  doc.rect(10, leftFooterTop, 117, leftFooterBottom - leftFooterTop, "S");
  doc.line(10, yFooter + 22, 127, yFooter + 22);

  const legalBottomY = yFooter + 24 + legalHeight;
  const footerBlockTop = legalBottomY + 12;
  doc.setFontSize(7.2);
  doc.text(companyFooterLines, 10, footerBlockTop);

  const nowStamp = new Date();
  const createdAt = `${asDateYmd(nowStamp)}`;
  const modifiedAt = `${asDateYmd(nowStamp)} ${String(nowStamp.toTimeString() || "").slice(0, 8)}`;
  const footerMetaTop = footerBlockTop + companyHeight + 6;
  doc.setFontSize(7.8);
  doc.text(`Fecha de creación ${createdAt}`, 10, footerMetaTop);
  doc.text(`Fecha de modificación ${modifiedAt}`, 10, footerMetaTop + 5);

  const logosY = companyBlockTop + 13;
  const drawBadge = (x: number, color: [number, number, number], labelTop: string, labelBottom: string, symbol: string) => {
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(0.8);
    doc.circle(x, logosY, 5.5, "S");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(color[0], color[1], color[2]);
    doc.setFontSize(8.2);
    doc.text(symbol, x, logosY + 1.2, { align: "center" });
    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.1);
    doc.text(labelTop, x, logosY + 9.5, { align: "center" });
    doc.text(labelBottom, x, logosY + 13.2, { align: "center" });
  };
  drawBadge(150, [52, 168, 83], "Garantía por", "desperfectos", "OK");
  drawBadge(167, [30, 136, 229], "Envío a sus", "instalaciones", "TR");
  drawBadge(184, [245, 124, 0], "Asistencia", "Técnica 24/7", "AT");

  const drawSocial = (x: number, label: string, rgb: [number, number, number]) => {
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    doc.circle(x, logosY + 18.8, 4.6, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.1);
    doc.text(label, x, logosY + 20.1, { align: "center" });
    doc.setTextColor(dark[0], dark[1], dark[2]);
  };
  drawSocial(168, "f", [24, 119, 242]);
  drawSocial(176.5, "ig", [214, 41, 118]);
  drawSocial(185, "in", [10, 102, 194]);

  const companyBlockTop = legalBottomY + 3;
  const companyBlockBottom = footerMetaTop + 8;
  doc.setDrawColor(35, 35, 35);
  doc.setLineWidth(0.25);
  doc.rect(10, companyBlockTop, 190, companyBlockBottom - companyBlockTop, "S");

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p += 1) {
    doc.setPage(p);
    doc.setFontSize(8.2);
    doc.setFont("helvetica", "bold");
    doc.text(`Pág ${p} de ${totalPages}`, 10, footerPageTop);
  }

  return Buffer.from(doc.output("arraybuffer")).toString("base64");
}

async function buildQuotePdf(args: {
  draftId: string;
  companyName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  productName: string;
  quantity: number;
  basePriceUsd: number;
  trmRate: number;
  totalCop: number;
  city?: string;
  nit?: string;
  itemDescription?: string;
  imageDataUrl?: string;
  notes?: string;
}) {
  const now = new Date();
  const quoteNumber = quoteCodeFromDraftId(args.draftId);
  const issueDate = asDateYmd(now);
  const validUntil = asDateYmd(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000));
  const quantity = Math.max(1, Number(args.quantity || 1));
  const totalCop = Number(args.totalCop || 0) > 0
    ? Number(args.totalCop || 0)
    : Number(args.basePriceUsd || 0) * Number(args.trmRate || 0) * quantity;

  return await buildStandardQuotePdf({
    quoteNumber,
    issueDate,
    validUntil,
    companyName: args.companyName,
    customerName: args.customerName,
    customerEmail: args.customerEmail,
    customerPhone: args.customerPhone,
    city: String(args.city || "").trim() || "Bogota D.C",
    nit: String(args.nit || "").trim() || "-",
    items: [
      {
        productName: args.productName,
        quantity,
        basePriceUsd: Number(args.basePriceUsd || 0),
        trmRate: Number(args.trmRate || 0),
        totalCop,
        description: String(args.itemDescription || "").trim() || `Producto: ${String(args.productName || "-")}`,
        imageDataUrl: String(args.imageDataUrl || "").trim(),
      },
    ],
  });
}

async function buildSimpleQuotePdf(args: {
  draftId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  companyName: string;
  productName: string;
  quantity: number;
  trmRate: number;
  totalCop: number;
  city: string;
  nit: string;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const today = asDateYmd(new Date());
  let y = 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Avanza Internacional Group S.A.S.", 12, y);
  y += 8;
  doc.setFontSize(12);
  doc.text("Cotizacion Comercial", 12, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const rows: string[] = [
    `Numero: ${quoteCodeFromDraftId(args.draftId)}`,
    `Fecha: ${today}`,
    `Cliente: ${String(args.companyName || args.customerName || "-")}`,
    `Contacto: ${String(args.customerName || "-")}`,
    `NIT: ${String(args.nit || "-")}`,
    `Ciudad: ${String(args.city || "Bogota")}`,
    `Correo: ${String(args.customerEmail || "-")}`,
    `Celular: ${String(args.customerPhone || "-")}`,
    "",
    `Producto: ${String(args.productName || "-")}`,
    `Cantidad: ${Math.max(1, Number(args.quantity || 1))}`,
    `TRM: ${formatMoney(Number(args.trmRate || 0))}`,
    `Total COP: ${formatMoney(Number(args.totalCop || 0))}`,
  ];
  for (const line of rows) {
    doc.text(line, 12, y);
    y += 5.5;
  }
  const dataUri = doc.output("datauristring");
  return String(dataUri || "").split(",")[1] || "";
}

async function buildBundleQuotePdf(args: {
  bundleId: string;
  companyName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: Array<{ productName: string; quantity: number; basePriceUsd: number; trmRate: number; totalCop: number }>;
}) {
  const now = new Date();
  const quoteNumber = `CO-B-${String(args.bundleId || "").replace(/[^a-z0-9]/gi, "").slice(-8).toUpperCase()}`;
  const issueDate = asDateYmd(now);
  const validUntil = asDateYmd(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000));

  return await buildStandardQuotePdf({
    quoteNumber,
    issueDate,
    validUntil,
    companyName: args.companyName,
    customerName: args.customerName,
    customerEmail: args.customerEmail,
    customerPhone: args.customerPhone,
    items: (args.items || []).map((item: any) => {
      const qty = Math.max(1, Number(item.quantity || 1));
      const totalCop = Number(item.totalCop || 0) > 0
        ? Number(item.totalCop || 0)
        : Number(item.basePriceUsd || 0) * Number(item.trmRate || 0) * qty;
      return {
        productName: String(item.productName || "-"),
        quantity: qty,
        basePriceUsd: Number(item.basePriceUsd || 0),
        trmRate: Number(item.trmRate || 0),
        totalCop,
        description: String(item.description || "").trim() || `Producto: ${String(item.productName || "-")}`,
        imageDataUrl: String(item.imageDataUrl || "").trim(),
      };
    }),
  });
}

export async function POST(req: Request) {
  try {
    console.log("[evolution-webhook] --- WEBHOOK ENTRY ---", { time: new Date().toISOString(), version: QUOTE_FLOW_VERSION });

    const payload = await req.json().catch(() => ({}));
    const payloadFromMe = boolish(
      payload?.data?.key?.fromMe ?? payload?.key?.fromMe ?? payload?.data?.fromMe ?? payload?.fromMe
    );
    if (payloadFromMe) {
      console.log("[evolution-webhook] ignored: fromMe payload");
      return NextResponse.json({ ok: true, ignored: true, reason: "from_me" });
    }

    const inbound = extractInbound(payload);
    if (!inbound) {
      const topKeys = Object.keys(payload || {}).slice(0, 12);
      const dataKeys = payload?.data && typeof payload.data === "object" ? Object.keys(payload.data).slice(0, 12) : [];
      const summary = summarizeInboundAttempt(payload);
      console.warn("[evolution-webhook] ignored: no inbound payload match", {
        event: payload?.event || payload?.type || payload?.eventName || null,
        topKeys,
        dataKeys,
        summary,
      });
      return NextResponse.json({ ok: true, ignored: true });
    }
    const inboundTextAtEntry = String(inbound.text || "").trim();

    const supabase = getServiceSupabase();
    if (!supabase) return NextResponse.json({ ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });

    const { data: channels, error: chErr } = await supabase
      .from("agent_channel_connections")
      .select("id,assigned_agent_id,created_by,status,config")
      .eq("provider", "evolution")
      .eq("channel_type", "whatsapp");
    if (chErr) return NextResponse.json({ ok: false, error: chErr.message }, { status: 500 });

    const byInstance = (channels || []).filter(
      (row: any) => String(row?.config?.evolution_instance_name || "") === inbound.instance
    );

    let channel =
      byInstance.find((row: any) => String(row?.status || "").toLowerCase() === "connected") ||
      byInstance[0] ||
      null;

    if (!channel) {
      const connectedAny = (channels || []).filter(
        (row: any) => String(row?.status || "").toLowerCase() === "connected"
      );
      if (connectedAny.length === 1) {
        channel = connectedAny[0];
      } else if ((channels || []).length === 1) {
        channel = (channels || [])[0];
      }
    }
    if (!channel) {
      console.warn("[evolution-webhook] ignored: channel_not_found", { instance: inbound.instance });
      return NextResponse.json({ ok: true, ignored: true, reason: "channel_not_found" });
    }

    // Extraer el numero del agente SOLO desde configuracion del canal.
    // No usar payload.sender porque suele ser el numero del cliente y bloquea el enrutamiento.
    const configuredSelfPhoneRaw = String(
      channel?.config?.phone ||
      channel?.config?.number ||
      channel?.config?.owner ||
      channel?.config?.wid ||
      channel?.config?.me ||
      ""
    );
    let agentPhone = normalizePhone(configuredSelfPhoneRaw);

    console.log("[evolution-webhook] channel debug", {
      instance: inbound.instance,
      selfPhone: agentPhone,
      configKeys: channel?.config ? Object.keys(channel.config) : [],
    });

    if (!channel.assigned_agent_id) {
      console.warn("[evolution-webhook] ignored: agent_not_assigned", { channelId: (channel as any)?.id });
      return NextResponse.json({ ok: true, ignored: true, reason: "agent_not_assigned" });
    }

    const { data: agent, error: agentErr } = await supabase
      .from("ai_agents")
      .select("id,name,status,description,created_by,tenant_id,configuration")
      .eq("id", String(channel.assigned_agent_id))
      .maybeSingle();
    if (agentErr) return NextResponse.json({ ok: false, error: agentErr.message }, { status: 500 });
    if (!agent || String(agent.status) !== "active") {
      console.warn("[evolution-webhook] ignored: agent_inactive", { agentId: String(channel.assigned_agent_id) });
      return NextResponse.json({ ok: true, ignored: true, reason: "agent_inactive" });
    }

    const ownerId = String((agent as any).created_by || "").trim();
    if (!ownerId) return NextResponse.json({ ok: false, error: "Agente sin propietario" }, { status: 400 });

    const incomingDedupKey = String(inbound.messageId || `${inbound.instance || "default"}:${inbound.from}:${normalizeText(inbound.text)}`).trim();
    const dedup = await reserveIncomingMessage(supabase as any, {
      provider: "evolution",
      providerMessageId: incomingDedupKey,
      instance: inbound.instance,
      fromPhone: inbound.from,
      payload: {
        message_id: inbound.messageId || null,
        text: String(inbound.text || "").slice(0, 1000),
      },
    });
    if (dedup.duplicate) {
      console.log("[evolution-webhook] ignored: duplicate_provider_message", { key: incomingDedupKey });
      return NextResponse.json({ ok: true, ignored: true, reason: "duplicate_provider_message" });
    }

    const access = await checkEntitlementAccess(supabase as any, ownerId);
    if (!access.ok) {
      console.warn("[evolution-webhook] ignored: entitlement_blocked", { code: access.code });
      return NextResponse.json({ ok: true, ignored: true, reason: access.code || "entitlement_blocked" });
    }

    const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
    if (!apiKey) {
      console.error("[evolution-webhook] missing OPENAI_API_KEY");
      return NextResponse.json({ ok: false, error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const cfg = (agent.configuration || {}) as any;
    const rawFiles = Array.isArray(cfg?.brain?.files) ? cfg.brain.files : [];
    const files = rawFiles
      .map((f: any) => ({ name: String(f?.name || "Documento").trim() || "Documento", content: String(f?.content || "").trim() }))
      .filter((f: any) => f.content);
    const docs = buildDocumentContext(inbound.text, files);

    // Obtener historial de conversación
    const inboundPhoneNorm = normalizePhone(inbound.from || "");
    const inboundPhoneTail = phoneTail10(inbound.from || "");
    const inboundFilter = inboundPhoneTail
      ? `contact_phone.eq.${inboundPhoneNorm},contact_phone.like.%${inboundPhoneTail}`
      : `contact_phone.eq.${inboundPhoneNorm}`;

    const { data: existingConv } = await supabase
      .from("agent_conversations")
      .select("transcript,metadata,contact_name")
      .eq("agent_id", agent.id)
      .eq("channel", "whatsapp")
      .or(inboundFilter)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const existingMeta = existingConv?.metadata && typeof existingConv.metadata === "object" ? existingConv.metadata : {};
    const lastInboundMessageId = String((existingMeta as any)?.last_inbound_message_id || "").trim();
    if (inbound.messageId && lastInboundMessageId && inbound.messageId === lastInboundMessageId) {
      console.log("[evolution-webhook] ignored: duplicate_message_id", {
        messageId: inbound.messageId,
        from: inbound.from,
        agentId: agent.id,
      });
      return NextResponse.json({ ok: true, ignored: true, reason: "duplicate_message_id" });
    }
    const previousMemory = existingMeta?.whatsapp_memory && typeof existingMeta.whatsapp_memory === "object"
      ? existingMeta.whatsapp_memory
      : {};
    const prevTextNorm = normalizeText(String((previousMemory as any)?.last_user_text || ""));
    const currTextNorm = normalizeText(String(inbound.text || ""));
    const prevUserAtMs = Date.parse(String((previousMemory as any)?.last_user_at || ""));
    const awaitingForDedup = String((previousMemory as any)?.awaiting_action || "");
    const isStrictSelectionStep = /^(strict_choose_family|strict_choose_model|strict_choose_action|strict_quote_data|strict_need_spec|strict_need_industry)$/i.test(awaitingForDedup);
    const isShortOptionReply = isOptionOnlyReply(currTextNorm);
    if (
      prevTextNorm &&
      currTextNorm &&
      prevTextNorm === currTextNorm &&
      Number.isFinite(prevUserAtMs) &&
      Date.now() - prevUserAtMs < 45_000 &&
      !isStrictSelectionStep &&
      !isShortOptionReply
    ) {
      console.log("[evolution-webhook] ignored: duplicate_recent_text", {
        from: inbound.from,
        text: currTextNorm.slice(0, 80),
      });
      return NextResponse.json({ ok: true, ignored: true, reason: "duplicate_recent_text" });
    }
    const nextMemory: Record<string, any> = {
      ...previousMemory,
      last_user_text: inbound.text,
      last_user_at: new Date().toISOString(),
    };
    if (String(previousMemory?.conversation_status || "") === "closed") {
      nextMemory.awaiting_action = "none";
      nextMemory.pending_product_options = [];
      nextMemory.last_selected_product_id = "";
      nextMemory.last_selected_product_name = "";
      nextMemory.last_selection_at = "";
      nextMemory.conversation_status = "open";
    } else if (!nextMemory.conversation_status) {
      nextMemory.conversation_status = "open";
    }
    const classifiedIntent = classifyIntent(inbound.text, previousMemory);

    const historyMessages: { role: "user" | "assistant"; content: string }[] = [];
    if (existingConv?.transcript && Array.isArray(existingConv.transcript)) {
      for (const msg of existingConv.transcript.slice(-10)) {
        if (msg?.role === "user" && msg?.content) {
          historyMessages.push({ role: "user", content: msg.content });
        } else if (msg?.role === "assistant" && msg?.content) {
          historyMessages.push({ role: "assistant", content: msg.content });
        }
      }
    }

    let reply = "";
    let usageTotal = 0;
    let usageCompletion = 0;
    let billedTokens = 0;
    let handledByGreeting = false;
    let handledByInventory = false;
    let handledByHistory = false;
    let handledByPricing = false;
    let handledByProductLookup = false;
    let handledByRecommendation = false;
    let handledByTechSheet = false;
    let handledByQuoteStarter = false;
    let handledByRecall = false;
    let handledByQuoteIntake = false;
    let sentQuotePdf = false;
    let sentTechSheet = false;
    let sentImage = false;
    const technicalDocs: Array<{ kind: "document" | "image"; base64: string; fileName: string; mimetype: string; caption?: string }> = [];
    const technicalFallbackLinks: string[] = [];
    const transcriptForContext = Array.isArray(existingConv?.transcript) ? existingConv.transcript : [];
    const recentUserContextForCatalog = transcriptForContext
      .filter((m: any) => m?.role === "user" && m?.content)
      .slice(-20)
      .map((m: any) => String(m.content || ""))
      .join("\n");

    const inferredName = extractCustomerName(`${recentUserContextForCatalog}\n${inbound.text}`, inbound.pushName || "");
    const inferredPhone = extractCustomerPhone(`${recentUserContextForCatalog}\n${inbound.text}`, inbound.from);
    const inferredEmail = extractEmail(`${recentUserContextForCatalog}\n${inbound.text}`);
    if (isPresent(inferredName)) nextMemory.customer_name = inferredName;
    if (isPresent(inferredPhone)) nextMemory.customer_phone = inferredPhone;
    if (isPresent(inferredEmail)) nextMemory.customer_email = inferredEmail;
    let resendPdf: null | {
      draftId: string;
      fileName: string;
      pdfBase64: string;
    } = null;
    const autoQuoteDocs: Array<{
      draftId: string;
      fileName: string;
      pdfBase64: string;
      quantity: number;
      productName: string;
      itemDescription: string;
      imageDataUrl: string;
      basePriceUsd: number;
      trmRate: number;
      totalCop: number;
    }> = [];
    let autoQuoteBundle: null | { fileName: string; pdfBase64: string; draftIds: string[] } = null;
    const tenantId = String((agent as any)?.tenant_id || "").trim();
    const catalogProvider = String((cfg as any)?.catalog_provider || "ohaus_colombia").trim().toLowerCase();

    const inboundName = sanitizeCustomerDisplayName(inbound.pushName || "");
    let recognizedReturningCustomer = false;
    let crmContactProfile: any = null;
    let knownCustomerName = sanitizeCustomerDisplayName(String(nextMemory.customer_name || ""))
      || sanitizeCustomerDisplayName(String((existingConv as any)?.contact_name || ""))
      || inboundName;

    if (!knownCustomerName) {
      try {
        const { data: crmContact } = await supabase
          .from("agent_crm_contacts")
          .select("id,name,email,phone,company,status,quote_requests_count,metadata")
          .eq("created_by", ownerId)
          .or(inboundFilter.replace(/contact_phone/g, "phone"))
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        crmContactProfile = crmContact as any;
        knownCustomerName = sanitizeCustomerDisplayName(String((crmContact as any)?.name || ""));
        const crmStatus = normalizeText(String((crmContact as any)?.status || ""));
        const crmQuotes = Number((crmContact as any)?.quote_requests_count || 0);
        recognizedReturningCustomer =
          recognizedReturningCustomer ||
          crmQuotes > 0 ||
          /^(purchase_order|invoicing|won|quote|sent)$/.test(crmStatus);
      } catch {
        // ignore missing table or transient query errors
      }
    }

    if (crmContactProfile && typeof crmContactProfile === "object") {
      const crmMeta = crmContactProfile?.metadata && typeof crmContactProfile.metadata === "object" ? crmContactProfile.metadata : {};
      const crmNit = String(crmMeta?.nit || "").trim();
      const crmCity = normalizeCityLabel(String(crmMeta?.billing_city || "").trim());
      const crmTier = normalizeText(String(crmMeta?.price_tier || "").trim());
      const crmType = normalizeText(String(crmMeta?.customer_type || "").trim());
      nextMemory.crm_contact_found = true;
      nextMemory.crm_contact_id = String((crmContactProfile as any)?.id || "").trim();
      nextMemory.crm_contact_name = String((crmContactProfile as any)?.name || "").trim();
      nextMemory.crm_contact_email = String((crmContactProfile as any)?.email || "").trim();
      nextMemory.crm_contact_phone = String((crmContactProfile as any)?.phone || "").trim();
      nextMemory.crm_company = String((crmContactProfile as any)?.company || "").trim();
      nextMemory.crm_nit = crmNit;
      nextMemory.crm_billing_city = crmCity;
      nextMemory.crm_price_tier = crmTier;
      nextMemory.crm_customer_type = crmType;
    } else {
      nextMemory.crm_contact_found = Boolean(previousMemory?.crm_contact_found);
    }

    if (!knownCustomerName) {
      try {
        const { data: nameDrafts } = await supabase
          .from("agent_quote_drafts")
          .select("customer_name,customer_phone")
          .eq("created_by", ownerId)
          .eq("agent_id", String(agent.id))
          .order("created_at", { ascending: false })
          .limit(30);
        const list = Array.isArray(nameDrafts) ? nameDrafts : [];
        const mine = list.find((d: any) => {
          const p = normalizePhone(String(d?.customer_phone || ""));
          return p === inboundPhoneNorm || phoneTail10(p) === inboundPhoneTail;
        });
        knownCustomerName = sanitizeCustomerDisplayName(String((mine as any)?.customer_name || ""));
        if (mine) recognizedReturningCustomer = true;
      } catch {
        // ignore
      }
    }

    if (!recognizedReturningCustomer) {
      try {
        const { data: recentDrafts } = await supabase
          .from("agent_quote_drafts")
          .select("customer_phone")
          .eq("created_by", ownerId)
          .eq("agent_id", String(agent.id))
          .order("created_at", { ascending: false })
          .limit(60);
        const drafts = Array.isArray(recentDrafts) ? recentDrafts : [];
        recognizedReturningCustomer = drafts.some((d: any) => {
          const p = normalizePhone(String(d?.customer_phone || ""));
          return p === inboundPhoneNorm || phoneTail10(p) === inboundPhoneTail;
        });
      } catch {
        // ignore
      }
    }

    if (knownCustomerName) nextMemory.customer_name = knownCustomerName;
    nextMemory.recognized_returning_customer = recognizedReturningCustomer;

    // Strict deterministic mode: single flow, no ambiguous branches.
    const STRICT_REBUILD_MODE = String(
      process.env.WHATSAPP_USE_V2 ||
      process.env.WHATSAPP_STRICT_REBUILD ||
      "true"
    ).toLowerCase() !== "false";
    if (STRICT_REBUILD_MODE) {
      const outboundInstance = String((channel as any)?.config?.evolution_instance_name || inbound.instance || "");
      if (!outboundInstance) return NextResponse.json({ ok: true, ignored: true, reason: "instance_missing" });

      const strictMemory: Record<string, any> = {
        ...nextMemory,
        last_user_text: inbound.text,
        last_user_at: new Date().toISOString(),
      };
      const text = String(inbound.text || "").trim();
      updateCommercialValidation(strictMemory, text, inbound.pushName || "");
      const strictPrevAwaiting = String(previousMemory?.awaiting_action || "");
      const preParsedSpec = parseTechnicalSpecQuery(text);
      console.log("[strict-inbound]", {
        version: QUOTE_FLOW_VERSION,
        text,
        awaiting: strictPrevAwaiting,
        hasSpec: Boolean(preParsedSpec),
        spec: preParsedSpec,
      });

      const sendStrictQuickText = async (replyText: string): Promise<boolean> => {
        const msg = withAvaSignature(enforceWhatsAppDelivery(replyText, text));
        const quickTo = [inbound.from, ...(inbound.alternates || [])]
          .map((n) => normalizePhone(String(n || "")))
          .filter((n, i, arr) => n && arr.indexOf(n) === i)
          .filter((n) => n.length >= 10 && n.length <= 15);
        for (const to of quickTo) {
          try {
            await evolutionService.sendMessage(outboundInstance, to, msg);
            return true;
          } catch {
            continue;
          }
        }
        const quickJids = (inbound.jidCandidates || [])
          .map((v) => String(v || "").trim())
          .filter((v, i, arr) => v && arr.indexOf(v) === i)
          .filter((v) => /@(lid|s\.whatsapp\.net|c\.us)$/i.test(v));
        for (const jid of quickJids) {
          try {
            await evolutionService.sendMessageToJid(outboundInstance, jid, msg);
            return true;
          } catch {
            continue;
          }
        }
        return false;
      };

      const finalizeStrictTurn = async (replyText: string, memory: Record<string, any>, extra: Record<string, any> = {}) => {
        const awaitingNow = String(memory?.awaiting_action || "").trim();
        const safeReply = String(replyText || "").trim() || (
          awaitingNow === "strict_choose_action"
            ? "Responde 1 para cotización o 2 para ficha técnica."
            : awaitingNow === "strict_quote_data"
              ? "Para continuar con la cotización, envíame ciudad, empresa, NIT, contacto, correo y celular en un solo mensaje."
              : "¿En qué puedo ayudarte con tu cotización?"
        );
        if (!String(replyText || "").trim()) {
          console.warn("[evolution-webhook] empty_strict_reply_fallback", { awaiting: awaitingNow, inboundText: text });
        }
        const sentOk = await sendStrictQuickText(safeReply);
        if (!sentOk) return NextResponse.json({ ok: true, ignored: true, reason: "invalid_destination" });
        try {
          await persistConversationTurn(supabase as any, {
            agentId: String(agent.id),
            ownerId,
            tenantId: (agent as any)?.tenant_id || null,
            from: inbound.from,
            pushName: inbound.pushName,
            contactName: knownCustomerName || inbound.pushName || inbound.from,
            inboundText: inbound.text,
            outboundText: safeReply,
            messageId: inbound.messageId,
            memory,
          });
        } catch {}
        await supabase
          .from("incoming_messages")
          .update({ status: "processed", processed_at: new Date().toISOString() })
          .eq("provider", "evolution")
          .eq("provider_message_id", incomingDedupKey);
        return NextResponse.json({ ok: true, sent: true, strict: true, ...extra });
      };

      if (isContextResetIntent(text)) {
        const keepCustomerName = String(strictMemory.customer_name || previousMemory?.customer_name || "").trim();
        const keepCustomerPhone = String(strictMemory.customer_phone || previousMemory?.customer_phone || "").trim();
        const keepCustomerEmail = String(strictMemory.customer_email || previousMemory?.customer_email || "").trim();
        Object.keys(strictMemory).forEach((k) => delete strictMemory[k]);
        if (keepCustomerName) strictMemory.customer_name = keepCustomerName;
        if (keepCustomerPhone) strictMemory.customer_phone = keepCustomerPhone;
        if (keepCustomerEmail) strictMemory.customer_email = keepCustomerEmail;
        strictMemory.awaiting_action = "none";
        strictMemory.last_intent = "reset_context";
        strictMemory.last_user_text = text;
        strictMemory.last_user_at = new Date().toISOString();

        const strictReply = "Listo, reinicié el contexto de esta conversación. Ahora dime capacidad y resolución (ej.: 220 g x 0.00001 g) o el modelo exacto.";
        const sentOk = await sendStrictQuickText(strictReply);
        if (!sentOk) return NextResponse.json({ ok: true, ignored: true, reason: "invalid_destination" });
        try {
          await persistConversationTurn(supabase as any, {
            agentId: String(agent.id),
            ownerId,
            tenantId: (agent as any)?.tenant_id || null,
            from: inbound.from,
            pushName: inbound.pushName,
            contactName: knownCustomerName || inbound.pushName || inbound.from,
            inboundText: inbound.text,
            outboundText: strictReply,
            messageId: inbound.messageId,
            memory: strictMemory,
          });
        } catch {}
        await supabase
          .from("incoming_messages")
          .update({ status: "processed", processed_at: new Date().toISOString() })
          .eq("provider", "evolution")
          .eq("provider_message_id", incomingDedupKey);
        return NextResponse.json({ ok: true, sent: true, strict: true, reset: true });
      }

      if (strictPrevAwaiting === "advisor_meeting_slot") {
        if (isAdvisorAppointmentIntent(text)) {
          const strictReply = buildAdvisorMiniAgendaPrompt();
          strictMemory.awaiting_action = "advisor_meeting_slot";
          const sentOk = await sendStrictQuickText(strictReply);
          if (!sentOk) return NextResponse.json({ ok: true, ignored: true, reason: "invalid_destination" });
          try {
            await persistConversationTurn(supabase as any, {
              agentId: String(agent.id),
              ownerId,
              tenantId: (agent as any)?.tenant_id || null,
              from: inbound.from,
              pushName: inbound.pushName,
              contactName: knownCustomerName || inbound.pushName || inbound.from,
              inboundText: inbound.text,
              outboundText: strictReply,
              messageId: inbound.messageId,
              memory: strictMemory,
            });
          } catch {}
          await supabase
            .from("incoming_messages")
            .update({ status: "processed", processed_at: new Date().toISOString() })
            .eq("provider", "evolution")
            .eq("provider_message_id", incomingDedupKey);
          return NextResponse.json({ ok: true, sent: true, strict: true, advisor: true });
        }

        const slot = parseAdvisorMiniAgendaChoice(text);
        const strictReply = !slot
          ? [
              "Para agendar con asesor, responde 1, 2 o 3 según el horario.",
              "1) Hoy (en las próximas horas)",
              "2) Mañana 9:00 am",
              "3) Esta semana (próximo disponible)",
            ].join("\n")
          : appendQuoteClosurePrompt(`Perfecto. Agendé la gestión con asesor para ${slot.label}. Te contactaremos en ese horario por WhatsApp o llamada.`);
        if (!slot) {
          strictMemory.awaiting_action = "advisor_meeting_slot";
        } else {
          strictMemory.awaiting_action = "conversation_followup";
          strictMemory.conversation_status = "open";
          strictMemory.advisor_meeting_at = slot.iso;
          strictMemory.advisor_meeting_label = slot.label;
          console.log("[evolution-webhook] advisor_meeting_slot_saved", { at: slot.iso, label: slot.label });
        }

        const sentOk = await sendStrictQuickText(strictReply);
        if (!sentOk) return NextResponse.json({ ok: true, ignored: true, reason: "invalid_destination" });

        try {
          const strictMeetingAt = String(strictMemory.advisor_meeting_at || "").trim();
          await upsertCrmLifecycleState(supabase as any, {
            ownerId,
            tenantId: (agent as any)?.tenant_id || null,
            phone: inbound.from,
            realPhone: String(strictMemory.customer_phone || previousMemory?.customer_phone || ""),
            name: knownCustomerName || inbound.pushName || "",
            status: "quote",
            nextAction: strictMeetingAt ? "Llamar cliente (cita WhatsApp)" : "Seguimiento cotizacion",
            nextActionAt: strictMeetingAt || isoAfterHours(24),
            metadata: {
              source: "evolution_strict_webhook",
              advisor_meeting_at: strictMeetingAt,
              advisor_meeting_label: String(strictMemory.advisor_meeting_label || ""),
            },
          });
          if (strictMeetingAt) {
            await mirrorAdvisorMeetingToAvanza({
              ownerId,
              tenantId: (agent as any)?.tenant_id || null,
              externalRef: String(inbound.messageId || incomingDedupKey || "slot"),
              phone: inbound.from,
              customerName: knownCustomerName || inbound.pushName || inbound.from,
              advisor: "Asesor comercial",
              meetingAt: strictMeetingAt,
              meetingLabel: String(strictMemory.advisor_meeting_label || ""),
              source: "evolution_strict_webhook",
            });
          }
          await persistConversationTurn(supabase as any, {
            agentId: String(agent.id),
            ownerId,
            tenantId: (agent as any)?.tenant_id || null,
            from: inbound.from,
            pushName: inbound.pushName,
            contactName: knownCustomerName || inbound.pushName || inbound.from,
            inboundText: inbound.text,
            outboundText: strictReply,
            messageId: inbound.messageId,
            memory: strictMemory,
          });
        } catch {}

        await supabase
          .from("incoming_messages")
          .update({ status: "processed", processed_at: new Date().toISOString() })
          .eq("provider", "evolution")
          .eq("provider_message_id", incomingDedupKey);

        return NextResponse.json({ ok: true, sent: true, strict: true, advisor: true });
      }

      if (isAdvisorAppointmentIntent(text)) {
        const strictReply = buildAdvisorMiniAgendaPrompt();
        strictMemory.awaiting_action = "advisor_meeting_slot";
        strictMemory.conversation_status = "open";
        console.log("[evolution-webhook] advisor_meeting_prompt", { text });

        const sentOk = await sendStrictQuickText(strictReply);
        if (!sentOk) return NextResponse.json({ ok: true, ignored: true, reason: "invalid_destination" });

        try {
          await persistConversationTurn(supabase as any, {
            agentId: String(agent.id),
            ownerId,
            tenantId: (agent as any)?.tenant_id || null,
            from: inbound.from,
            pushName: inbound.pushName,
            contactName: knownCustomerName || inbound.pushName || inbound.from,
            inboundText: inbound.text,
            outboundText: strictReply,
            messageId: inbound.messageId,
            memory: strictMemory,
          });
        } catch {}

        await supabase
          .from("incoming_messages")
          .update({ status: "processed", processed_at: new Date().toISOString() })
          .eq("provider", "evolution")
          .eq("provider_message_id", incomingDedupKey);

        return NextResponse.json({ ok: true, sent: true, strict: true, advisor: true });
      }

      const strictCloseIntentEarly = isConversationCloseIntent(text) && normalizeText(text).length <= 48;
      if (strictCloseIntentEarly) {
        const hadQuoteContext =
          Boolean(previousMemory?.last_quote_draft_id || previousMemory?.last_quote_pdf_sent_at) ||
          /(quote_generated|quote_recall|price_request)/.test(String(previousMemory?.last_intent || ""));
        const strictReply = hadQuoteContext
          ? "Perfecto, cerramos por ahora. Gracias por tu tiempo. Te estaremos enviando un recordatorio breve para saber como te parecio la cotizacion."
          : "Perfecto, cerramos por ahora. Gracias por tu tiempo. Si despues quieres retomar, te ayudo por este mismo WhatsApp.";
        strictMemory.awaiting_action = "none";
        strictMemory.conversation_status = "closed";
        strictMemory.last_intent = "conversation_closed";
        if (hadQuoteContext) strictMemory.quote_feedback_due_at = isoAfterHours(24);

        const sentOk = await sendStrictQuickText(strictReply);
        if (!sentOk) return NextResponse.json({ ok: true, ignored: true, reason: "invalid_destination" });
        try {
          await persistConversationTurn(supabase as any, {
            agentId: String(agent.id),
            ownerId,
            tenantId: (agent as any)?.tenant_id || null,
            from: inbound.from,
            pushName: inbound.pushName,
            contactName: knownCustomerName || inbound.pushName || inbound.from,
            inboundText: inbound.text,
            outboundText: strictReply,
            messageId: inbound.messageId,
            memory: strictMemory,
          });
        } catch {}
        await supabase
          .from("incoming_messages")
          .update({ status: "processed", processed_at: new Date().toISOString() })
          .eq("provider", "evolution")
          .eq("provider_message_id", incomingDedupKey);
        return NextResponse.json({ ok: true, sent: true, strict: true });
      }

      const textNorm = normalizeCatalogQueryText(text);
      const awaiting = deriveStrictAwaitingAction(previousMemory, strictPrevAwaiting);
      const wantsSheet = isTechnicalSheetIntent(text);
      const wantsQuote = asksQuoteIntent(text) || isPriceIntent(text);
      const isConversationFollowupAmbiguousQuote = awaiting === "conversation_followup" && isAnotherQuoteAmbiguousIntent(text);
      const isGreeting = isGreetingIntent(text);
      const explicitModel = hasConcreteProductHint(text) && !isOptionOnlyReply(text);
      const categoryIntent = detectCatalogCategoryIntent(text);
      const technicalSpecIntent =
        isTechnicalSpecQuery(text) ||
        /\b\d+(?:[\.,]\d+)?\s*(?:mg|g|kg)?\b\s*(?:x|×|✕|✖|\*|por)\s*\d+(?:[\.,]\d+)?\s*(?:mg|g|kg)?\b/i.test(String(text || ""));

      const { data: ownerRowsRaw } = await supabase
        .from("agent_product_catalog")
        .select("id,name,category,brand,base_price_usd,price_currency,source_payload,product_url,image_url,datasheet_url,specs_text,summary,description,specs_json,is_active")
        .eq("created_by", ownerId)
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(360);
      const ownerRows = (Array.isArray(ownerRowsRaw) ? ownerRowsRaw : []).filter((r: any) => isCommercialCatalogRow(r));

      const rememberedCategory = String(previousMemory?.last_category_intent || strictMemory.last_category_intent || "").trim();
      const baseScoped = rememberedCategory ? scopeCatalogRows(ownerRows as any, rememberedCategory) : ownerRows;
      const prevSpecQuery = String(previousMemory?.strict_spec_query || "").trim();
      let strictReply = "";
      const strictDocs: Array<{ base64: string; fileName: string; mimetype: string; caption?: string }> = [];
      let strictBypassAutoQuote = false;
      const selectedModelForSlots = String(
        previousMemory?.last_selected_product_name ||
        previousMemory?.last_product_name ||
        ""
      ).trim();
      const pendingForSlots = Array.isArray(previousMemory?.pending_product_options) ? previousMemory.pending_product_options : [];
      const slotPack = updateConversationSlots({
        previousMemory,
        text,
        awaiting,
        pendingOptions: pendingForSlots,
        selectedModel: selectedModelForSlots,
      });
      Object.assign(strictMemory, slotPack.patch);
      const pipelineIntent = classifyMessageIntent({
        text,
        awaiting,
        rememberedCategory,
        activeMenuType: slotPack.slots.active_menu_type,
      });

      const guidedProfileGlobal = detectGuidedBalanzaProfile(text);
      if (
        !String(strictReply || "").trim() &&
        guidedProfileGlobal &&
        Boolean(strictMemory.commercial_validation_complete) &&
        /^(balanza|)$/i.test(String(strictMemory.commercial_equipment_choice || "")) &&
        !/^(strict_quote_data|advisor_meeting_slot|commercial_client_recognition|commercial_new_customer_data|commercial_choose_equipment|commercial_existing_lookup|commercial_existing_confirm|commercial_existing_contact_update)$/i.test(awaiting)
      ) {
        const guidedOptions = buildGuidedPendingOptions(ownerRows as any[], guidedProfileGlobal);
        strictMemory.pending_product_options = guidedOptions;
        strictMemory.pending_family_options = [];
        strictMemory.awaiting_action = guidedOptions.length ? "strict_choose_model" : "strict_need_spec";
        strictMemory.last_category_intent = "balanzas";
        strictMemory.guided_balanza_profile = guidedProfileGlobal;
        strictMemory.strict_family_label = "balanzas";
        strictMemory.strict_model_offset = 0;
        strictReply = buildGuidedBalanzaReply(guidedProfileGlobal);
      }

      const pipelineGate = async (): Promise<Response | null> => {
        if (isUnsupportedSpecificAnalyzerRequest(text)) {
          const humidityRows = scopeCatalogRows(ownerRows as any[], "analizador_humedad");
          if (hasCarbonAnalyzerMatch(humidityRows as any[])) {
            const exactOptions = buildNumberedProductOptions(humidityRows as any[], 8);
            strictMemory.pending_product_options = exactOptions.slice(0, 8);
            strictMemory.pending_family_options = [];
            strictMemory.awaiting_action = exactOptions.length ? "strict_choose_model" : "strict_need_spec";
            strictMemory.last_category_intent = "analizador_humedad";
            const reply = exactOptions.length
              ? [
                  "Sí, en base de datos tengo opción para analizador de humedad orientado a fibra de carbono.",
                  ...exactOptions.slice(0, 3).map((o) => `${o.code}) ${o.name}`),
                  "",
                  "Elige con letra o número (A/1).",
                ].join("\n")
              : "Sí, manejo analizador de humedad para esa aplicación, pero no veo opciones activas para listar en este momento.";
            return finalizeStrictTurn(reply, strictMemory, { pipeline: true, intent: "guided_need_discovery" });
          }
          const options = buildNumberedProductOptions(humidityRows as any[], 8);
          strictMemory.pending_product_options = options.slice(0, 8);
          strictMemory.pending_family_options = [];
          strictMemory.awaiting_action = options.length ? "strict_choose_model" : "strict_need_spec";
          strictMemory.last_category_intent = "analizador_humedad";
          const reply = options.length
            ? [
                "En base de datos no tengo un analizador de humedad específico para fibra de carbono.",
                "Sí manejo analizadores de humedad OHAUS de uso general. Estas son opciones disponibles:",
                ...options.slice(0, 3).map((o) => `${o.code}) ${o.name}`),
                "",
                "Elige con letra o número (A/1), o dime tu muestra y rango de peso para recomendarte mejor.",
              ].join("\n")
            : "En base de datos no tengo un analizador de humedad específico para fibra de carbono. Si quieres, te recomiendo alternativas generales del catálogo OHAUS.";
          return finalizeStrictTurn(reply, strictMemory, { pipeline: true, intent: "out_of_catalog" });
        }

        if (isOutOfCatalogDomainQuery(text)) {
          const available = listActiveCatalogCategories(ownerRows as any[]);
          const reply = [
            "En base de datos no tengo ese tipo de producto en catalogo activo.",
            `Actualmente si manejo: ${available}.`,
            "Si quieres, te recomiendo opciones segun capacidad, precision y aplicacion.",
          ].join("\n");
          return finalizeStrictTurn(reply, strictMemory, { pipeline: true, intent: "out_of_catalog" });
        }

        if (pipelineIntent === "guided_need_discovery") {
          const guidedProfile = detectGuidedBalanzaProfile(text);
          if (guidedProfile) {
            const options = buildGuidedPendingOptions(ownerRows as any[], guidedProfile);
            strictMemory.pending_product_options = options;
            strictMemory.pending_family_options = [];
            strictMemory.awaiting_action = options.length ? "strict_choose_model" : "strict_need_spec";
            strictMemory.last_category_intent = "balanzas";
            strictMemory.guided_balanza_profile = guidedProfile;
            strictMemory.commercial_welcome_sent = true;
            const reply = buildGuidedBalanzaReply(guidedProfile);
            return finalizeStrictTurn(reply, strictMemory, { pipeline: true, intent: "guided_need_discovery", guided_profile: guidedProfile });
          }
          const featureTerms = extractFeatureTerms(text);
          const featureRanked = featureTerms.length
            ? rankCatalogByFeature(ownerRows as any[], featureTerms).slice(0, 8)
            : [];
          if (featureRanked.length) {
            const featureRows = featureRanked.map((x: any) => x.row).filter(Boolean);
            const options = buildNumberedProductOptions(featureRows as any[], 8);
            strictMemory.pending_product_options = options;
            strictMemory.pending_family_options = [];
            strictMemory.awaiting_action = options.length ? "strict_choose_model" : "strict_need_spec";
            strictMemory.strict_use_case = String(text || "").trim();
            const reply = [
              `Sí, encontré ${featureRanked.length} referencia(s) que coinciden con esa descripción (${featureTerms.join(", ")}).`,
              ...options.slice(0, 4).map((o) => `${o.code}) ${o.name}`),
              "",
              "Elige con letra o número (A/1) y te envío detalle técnico o cotización.",
            ].join("\n");
            return finalizeStrictTurn(reply, strictMemory, { pipeline: true, intent: "guided_need_discovery" });
          }
          const app = detectTargetApplication(text) || "";
          const categoryIntentNow = detectCatalogCategoryIntent(text) || "";
          const strictReadabilityHint = Number(slotPack?.slots?.target_readability_g || 0);
          const hasStrongNeedSignal = Boolean(app || categoryIntentNow || strictReadabilityHint > 0 || featureTerms.length > 0);
          if (!hasStrongNeedSignal) {
            strictMemory.awaiting_action = "strict_need_spec";
            const reply = [
              "No entiendo tu pregunta. Por favor repite tu solicitud con un formato válido de Avanza.",
              "Puedes escribir: modelo exacto (ej.: PX3202/E), categoría (balanzas, básculas o analizador de humedad), o capacidad y resolución (ej.: 2200 g x 0.01 g).",
            ].join("\n");
            return finalizeStrictTurn(reply, strictMemory, { pipeline: true, intent: "guided_need_discovery_invalid" });
          }
          const productKind = /(bascula|basculas)/.test(textNorm) ? "báscula" : "balanza";
          const guidance = /(tornillo|tornillos|tuerca|tuercas|perno|pernos|repuesto|repuestos)/.test(textNorm)
            ? "Claro, para ese uso sí tenemos opciones. ¿La necesitas para conteo de piezas o para peso total, y qué rango de peso manejas?"
            : /(papa|papas|alimento|alimentos)/.test(textNorm)
              ? "Claro, para ese uso sí tenemos opciones. ¿Qué capacidad aproximada necesitas y si buscas uso general o más precisión?"
              : /(laboratorio)/.test(textNorm)
                ? "Perfecto, para laboratorio sí tenemos opciones. Para orientarte bien, dime peso aproximado y precisión objetivo."
                : /(oro|joyeria|joyería)/.test(textNorm)
                  ? "Claro, para oro/joyería sí hay opciones. Para recomendarte bien, dime rango de peso y precisión que necesitas."
                  : `Sí, para esa necesidad tenemos opciones de ${productKind}. Para orientarte bien, dime qué vas a pesar, rango de peso aproximado y nivel de precisión que necesitas.`;
          const appOptions = getApplicationRecommendedOptions({
            rows: ownerRows as any[],
            application: app,
            capTargetG: Number(slotPack.slots.target_capacity_g || 0),
            targetReadabilityG: Number(slotPack.slots.target_readability_g || 0),
            strictPrecision: /(alta\s+precision|m[aá]xima\s+precision|menos\s+de)/.test(textNorm),
          });
          const top = appOptions.slice(0, 3);
          strictMemory.pending_product_options = appOptions.slice(0, 8);
          strictMemory.pending_family_options = [];
          strictMemory.awaiting_action = appOptions.length ? "strict_choose_model" : "strict_need_spec";
          strictMemory.strict_use_case = String(text || "").trim();
          const reply = [
            guidance,
            ...(top.length ? ["", "Opciones sugeridas para empezar:", ...top.map((o) => `${o.code}) ${o.name}`), "", "Si quieres, elige A/1 y te envío ficha o cotización."] : []),
          ].join("\n");
          return finalizeStrictTurn(reply, strictMemory, { pipeline: true, intent: pipelineIntent });
        }

        if (pipelineIntent === "use_explanation_question") {
          strictMemory.awaiting_action = "strict_need_spec";
          const reply = [
            "Buena pregunta: las balanzas/básculas se usan para pesar con precisión en procesos como laboratorio, joyería, alimentos e industria.",
            "Para recomendarte bien según catálogo activo, dime: 1) uso/aplicación, 2) capacidad aproximada, 3) resolución objetivo.",
            "Ejemplo: laboratorio, 1000 g, 0.1 g.",
          ].join("\n");
          return finalizeStrictTurn(reply, strictMemory, { pipeline: true, intent: pipelineIntent });
        }

        const selectedId = String(previousMemory?.last_selected_product_id || previousMemory?.last_product_id || "").trim();
        const selectedName = String(previousMemory?.last_selected_product_name || previousMemory?.last_product_name || "").trim();
        const selected = selectedId
          ? (ownerRows as any[]).find((r: any) => String(r?.id || "").trim() === selectedId)
          : (selectedName ? findCatalogProductByName(ownerRows as any[], selectedName) : null);
        const categoryScoped = rememberedCategory ? scopeCatalogRows(ownerRows as any, rememberedCategory) : ownerRows;

        if (pipelineIntent === "compatibility_question" || pipelineIntent === "application_update") {
          const asksUseExplanationNow = /(para\s+que\s+sirven?|que\s+uso\s+tienen|para\s+que\s+se\s+usan)/.test(textNorm) && /(balanza|balanzas|bascula|basculas)/.test(textNorm);
          if (asksUseExplanationNow) {
            strictMemory.awaiting_action = "strict_need_spec";
            const reply = [
              "Las balanzas/básculas se usan para pesar con precisión en laboratorio, joyería, alimentos e industria.",
              "Para recomendarte una opción exacta de catálogo, dime uso, capacidad y resolución objetivo.",
              "Ejemplo: laboratorio, 1000 g, 0.1 g.",
            ].join("\n");
            return finalizeStrictTurn(reply, strictMemory, { pipeline: true, intent: "use_explanation_question" });
          }
          const app = detectTargetApplication(text) || String(slotPack.slots.target_application || "");
          const asksLabCatalog = /(cuales?|cu[aá]les?|que|qué).*(de\s+laboratorio|laboratorio).*(tienes|hay|manejas|ofreces)/.test(textNorm) || /tienes.*laboratorio/.test(textNorm);
          const explicitLabEquipmentAsk = /(plancha|planchas|calentamiento|agitacion|agitación|agitador|mezclador|homogeneizador|centrifuga)/.test(textNorm);
          const labRows = app === "laboratorio" ? scopeCatalogRows(ownerRows as any, "equipos_laboratorio") : [];
          const hasActiveLabEquipment = Array.isArray(labRows) && labRows.length > 0;
          const targetRead = Number(slotPack.slots.target_readability_g || previousMemory?.strict_filter_readability_g || 0);
          const strictPrecisionAsk = /(menos\s+de|maxima\s+precision|maxima\s+precisi[oó]n|alta\s+precision|m[aá]xima\s+precision)/.test(textNorm);
          const capTarget = Number(slotPack.slots.target_capacity_g || previousMemory?.strict_filter_capacity_g || 0);
          const options = getApplicationRecommendedOptions({
            rows: categoryScoped as any[],
            application: app,
            capTargetG: capTarget,
            targetReadabilityG: targetRead,
            strictPrecision: strictPrecisionAsk,
            excludeId: String(selected?.id || ""),
          });
          strictMemory.target_application = app;
          strictMemory.target_industry = app === "joyeria_oro" ? "joyeria" : app;
          if (app === "laboratorio" && !hasActiveLabEquipment && (asksLabCatalog || explicitLabEquipmentAsk)) {
            if (options.length) {
              strictMemory.pending_product_options = options;
              strictMemory.pending_family_options = [];
              strictMemory.awaiting_action = "strict_choose_model";
              strictMemory.strict_model_offset = 0;
              const reply = [
                "En base de datos no tengo equipos de laboratorio activos (ej. planchas/agitadores) en este momento.",
                "Sí tengo estas balanzas recomendadas para uso de laboratorio:",
                ...options.slice(0, 3).map((o) => `${o.code}) ${o.name}`),
                "",
                "Elige una con letra/número (A/1), o escribe 'más'.",
              ].join("\n");
              return finalizeStrictTurn(reply, strictMemory, { pipeline: true, intent: pipelineIntent });
            }
            strictMemory.awaiting_action = "strict_need_spec";
            return finalizeStrictTurn("En base de datos no tengo equipos de laboratorio activos en este momento. Si quieres, te recomiendo balanzas para uso de laboratorio según capacidad y precisión.", strictMemory, { pipeline: true, intent: pipelineIntent });
          }
          if (options.length) {
            strictMemory.pending_product_options = options;
            strictMemory.pending_family_options = [];
            strictMemory.awaiting_action = "strict_choose_model";
            strictMemory.strict_model_offset = 0;
            const selectedRead = Number(extractRowTechnicalSpec(selected)?.readabilityG || 0);
            const maxRead = maxReadabilityForApplication(app);
            const selectedCompatible = selectedRead > 0 && selectedRead <= maxRead;
            const intro = pipelineIntent === "application_update"
              ? `Perfecto. Para ${app.replace(/_/g, " ")}, estas son opciones activas de catálogo:`
              : (selected
                ? (selectedCompatible
                    ? `Sí, ${String((selected as any)?.name || selectedName)} puede servir para ${app.replace(/_/g, " ")}.`
                    : `No del todo: ${String((selected as any)?.name || selectedName)} no es la mejor para ${app.replace(/_/g, " ")}; estas alternativas sí son más adecuadas.`)
                : `Sí, para ${app.replace(/_/g, " ")} estas opciones sí son adecuadas.`);
            const reply = [
              intro,
              "Te comparto 3 recomendaciones de catálogo para seguir:",
              ...options.slice(0, 3).map((o) => `${o.code}) ${o.name}`),
              "",
              "Elige una con letra/número (A/1), o escribe 'más'.",
            ].join("\n");
            return finalizeStrictTurn(reply, strictMemory, { pipeline: true, intent: pipelineIntent });
          }
          const fallback = buildCompatibilityAnswer({ text, slots: slotPack.slots, pendingOptions: pendingForSlots });
          strictMemory.awaiting_action = "compatibility_followup";
          strictMemory.compatibility_application = app;
          const reply = [
            String(fallback || "").trim(),
            "",
            "Para continuar, responde:",
            "1) Ver 3 opciones recomendadas",
            "2) Ajustar capacidad/resolución",
          ].join("\n");
          return finalizeStrictTurn(reply, strictMemory, { pipeline: true, intent: pipelineIntent });
        }

        if (pipelineIntent === "technical_spec_input") {
          const appProfile = String(strictMemory.target_application || previousMemory?.target_application || "").trim();
          const merged = mergeLooseSpecWithMemory(
            {
              capacityG: Number(previousMemory?.strict_filter_capacity_g || previousMemory?.target_capacity_g || 0),
              readabilityG: Number(previousMemory?.strict_filter_readability_g || previousMemory?.target_readability_g || 0),
            },
            parseLooseTechnicalHint(text)
          );
          const cap = Number(merged.capacityG || 0);
          const read = Number(merged.readabilityG || 0);
          strictMemory.strict_partial_capacity_g = cap > 0 ? cap : "";
          strictMemory.strict_partial_readability_g = read > 0 ? read : "";

          if (cap > 0 && read > 0) {
            strictMemory.strict_spec_query = `${formatSpecNumber(cap)} g x ${formatSpecNumber(read)} g`;
            strictMemory.strict_filter_capacity_g = cap;
            strictMemory.strict_filter_readability_g = read;
            const exactRows = getExactTechnicalMatches(baseScoped as any[], { capacityG: cap, readabilityG: read });
            const prioritized = prioritizeTechnicalRows(baseScoped as any[], { capacityG: cap, readabilityG: read });
            const sourceRowsRaw = exactRows.length ? exactRows : prioritized.orderedRows;
            const sourceRows = applyApplicationProfile(sourceRowsRaw as any[], {
              application: appProfile,
              targetCapacityG: cap,
              targetReadabilityG: read,
            });
            const options = buildNumberedProductOptions((sourceRows || []).slice(0, 8) as any[], 8);
            if (options.length) {
              strictMemory.pending_product_options = options;
              strictMemory.pending_family_options = [];
              strictMemory.awaiting_action = "strict_choose_model";
              strictMemory.strict_model_offset = 0;
              const reply = [
                exactRows.length ? `Sí, tengo coincidencias exactas para ${strictMemory.strict_spec_query}.` : `Para ${strictMemory.strict_spec_query} no veo exacta, pero sí cercanas de BD:`,
                ...options.slice(0, 3).map((o) => `${o.code}) ${o.name}`),
                "",
                "Elige con letra/número (A/1), o escribe 'más'.",
              ].join("\n");
              return finalizeStrictTurn(reply, strictMemory, { pipeline: true, intent: pipelineIntent });
            }
            strictMemory.awaiting_action = "strict_need_spec";
            return finalizeStrictTurn(`Para ${strictMemory.strict_spec_query} no tengo opciones activas en BD. Si quieres, ajustamos capacidad/resolución.`, strictMemory, { pipeline: true, intent: pipelineIntent });
          }

          if (cap > 0 && !(read > 0)) {
            const currentCategory = normalizeText(String(rememberedCategory || previousMemory?.last_category_intent || detectCatalogCategoryIntent(text) || ""));
            const scopedForFast = currentCategory ? scopeCatalogRows(ownerRows as any[], currentCategory) : ownerRows;
            const rankedCapGeneric = rankCatalogByCapacityOnly(scopedForFast as any[], cap);
            const capRowsGeneric = rankedCapGeneric.length ? rankedCapGeneric.map((x: any) => x.row) : scopedForFast;
            const capOptionsGeneric = buildNumberedProductOptions((capRowsGeneric || []).slice(0, 8) as any[], 8);
            if (capOptionsGeneric.length) {
              const first = capOptionsGeneric[0];
              const alternatives = capOptionsGeneric.slice(1, 4);
              const appHint = /(industrial|repuesto|repuestos|cajas|bodega|planta)/.test(textNorm) ? "industrial" : "general";
              strictMemory.strict_partial_capacity_g = cap;
              strictMemory.strict_filter_capacity_g = cap;
              strictMemory.pending_product_options = capOptionsGeneric;
              strictMemory.pending_family_options = [];
              strictMemory.awaiting_action = "strict_choose_model";
              strictMemory.strict_model_offset = 0;
              const reply = [
                `Perfecto. Para ~${formatSpecNumber(cap)} g, te recomiendo empezar con ${String(first?.name || "esta opción")} (${appHint}).`,
                "También te dejo alternativas cercanas por capacidad:",
                ...alternatives.map((o) => `${o.code}) ${o.name}`),
                "",
                "Si quieres mayor precisión, te filtro por resolución objetivo (ej.: 1 g, 0.1 g, 0.01 g).",
              ].join("\n");
              return finalizeStrictTurn(reply, strictMemory, { pipeline: true, intent: pipelineIntent });
            }
            if (currentCategory === "basculas" && Array.isArray(scopedForFast) && scopedForFast.length > 0 && scopedForFast.length <= 4) {
              const rankedCap = rankCatalogByCapacityOnly(scopedForFast as any[], cap);
              const rankedRows = rankedCap.length ? rankedCap.map((x: any) => x.row) : scopedForFast;
              const options = buildNumberedProductOptions((rankedRows || []).slice(0, 8) as any[], 8);
              if (options.length) {
                strictMemory.strict_partial_capacity_g = cap;
                strictMemory.strict_filter_capacity_g = cap;
                strictMemory.pending_product_options = options;
                strictMemory.pending_family_options = [];
                strictMemory.awaiting_action = "strict_choose_model";
                strictMemory.strict_model_offset = 0;
                const total = options.length;
                const reply = [
                  `Perfecto. Para básculas activas, en este momento manejo ${total} modelo(s).`,
                  ...options.map((o) => `${o.code}) ${o.name}`),
                  "",
                  "Elige una con letra/número (A/1) y te envío ficha o cotización.",
                ].join("\n");
                return finalizeStrictTurn(reply, strictMemory, { pipeline: true, intent: pipelineIntent });
              }
            }
            strictMemory.awaiting_action = "strict_need_spec";
            return finalizeStrictTurn(`Perfecto, ya tengo la capacidad (${formatSpecNumber(cap)} g). Ahora dime la resolución objetivo (ej.: 0.1 g, 0.01 g, 0.001 g).`, strictMemory, { pipeline: true, intent: pipelineIntent });
          }
          if (read > 0 && !(cap > 0)) {
            strictMemory.awaiting_action = "strict_need_spec";
            return finalizeStrictTurn(`Perfecto, ya tengo la precisión (${formatSpecNumber(read)} g). Ahora dime la capacidad aproximada (ej.: 200 g, 1000 g, 2 kg).`, strictMemory, { pipeline: true, intent: pipelineIntent });
          }
        }

        if (pipelineIntent === "alternative_request") {
          const asksMoreOnly = /\b(mas|más|siguientes|mas\s+opciones|más\s+opciones|otras\s+opciones)\b/.test(textNorm);
          const pendingNow = Array.isArray(previousMemory?.pending_product_options) ? previousMemory.pending_product_options : [];
          if (asksMoreOnly && awaiting === "strict_choose_model" && pendingNow.length > 0) {
            // Mantiene el flujo original de paginación del menú de modelos.
            return null;
          }
          const appProfile = String(strictMemory.target_application || previousMemory?.target_application || "").trim();
          const cap = Number(previousMemory?.strict_filter_capacity_g || slotPack.slots.target_capacity_g || 0);
          const read = Number(previousMemory?.strict_filter_readability_g || slotPack.slots.target_readability_g || 0);
          if (cap > 0 && read > 0) {
            const prioritized = prioritizeTechnicalRows(baseScoped as any[], { capacityG: cap, readabilityG: read });
            const nearRows = filterNearbyTechnicalRows((prioritized.orderedRows || baseScoped) as any[], { capacityG: cap, readabilityG: read });
            const profiledRows = applyApplicationProfile((nearRows || []) as any[], {
              application: appProfile,
              targetCapacityG: cap,
              targetReadabilityG: read,
            });
            const options = buildNumberedProductOptions((profiledRows || []).slice(0, 8) as any[], 8);
            if (options.length) {
              strictMemory.pending_product_options = options;
              strictMemory.pending_family_options = [];
              strictMemory.awaiting_action = "strict_choose_model";
              strictMemory.strict_model_offset = 0;
              const reply = [
                `Claro, aquí tienes alternativas cercanas a ${formatSpecNumber(cap)} g x ${formatSpecNumber(read)} g:`,
                ...options.slice(0, 3).map((o) => `${o.code}) ${o.name}`),
                "",
                "Elige con letra/número (A/1), o escribe 'más'.",
              ].join("\n");
              return finalizeStrictTurn(reply, strictMemory, { pipeline: true, intent: pipelineIntent });
            }
          }
          strictMemory.awaiting_action = "strict_need_spec";
          return finalizeStrictTurn("Para darte alternativas coherentes de BD, confirma capacidad y resolución objetivo (ej.: 200 g x 0.001 g).", strictMemory, { pipeline: true, intent: pipelineIntent });
        }

        if (pipelineIntent === "menu_selection") {
          const menuType = String(slotPack.slots.active_menu_type || "");
          if (menuType === "model_action_menu") {
            if (/^\s*1\s*$/.test(textNorm)) {
              strictMemory.awaiting_action = "strict_quote_data";
              strictMemory.quote_quantity = Math.max(1, Number(previousMemory?.quote_quantity || 1));
              const quoteMemoryMerged = {
                ...(previousMemory && typeof previousMemory === "object" ? previousMemory : {}),
                ...(strictMemory && typeof strictMemory === "object" ? strictMemory : {}),
                quote_data: {
                  ...((previousMemory?.quote_data && typeof previousMemory.quote_data === "object") ? previousMemory.quote_data : {}),
                  ...((strictMemory?.quote_data && typeof strictMemory.quote_data === "object") ? strictMemory.quote_data : {}),
                },
              };
              const reusableNow = getReusableBillingData(quoteMemoryMerged);
              if (reusableNow.complete) {
                strictMemory.quote_data = {
                  city: reusableNow.city,
                  company: reusableNow.company,
                  nit: reusableNow.nit,
                  contact: reusableNow.contact,
                  email: reusableNow.email,
                  phone: reusableNow.phone,
                };
                strictMemory.strict_autorun_quote_with_reuse = true;
                return null;
              }
              const quotePrompt = buildQuoteDataIntakePrompt("Perfecto. Para cotizar:", quoteMemoryMerged);
              return finalizeStrictTurn(quotePrompt, strictMemory, { pipeline: true, intent: pipelineIntent });
            }
            if (/^\s*2\s*$/.test(textNorm)) {
              strictMemory.awaiting_action = "strict_choose_action";
              strictMemory.last_intent = "datasheet_request";
              // Deja que el flujo legacy maneje PDF de ficha (remoto/local) antes del resumen.
              return null;
            }
            return finalizeStrictTurn("Responde 1 para cotización o 2 para ficha técnica.", strictMemory, { pipeline: true, intent: pipelineIntent });
          }

          if (menuType === "model_selection_menu") {
            const selectedOption = resolvePendingProductOptionStrict(text, pendingForSlots);
            if (selectedOption) {
              strictMemory.last_selected_product_id = String(selectedOption.id || "");
              strictMemory.last_selected_product_name = String(selectedOption.raw_name || selectedOption.name || "");
              strictMemory.last_product_id = String(selectedOption.id || "");
              strictMemory.last_product_name = String(selectedOption.raw_name || selectedOption.name || "");
              strictMemory.awaiting_action = "strict_choose_action";
              strictMemory.pending_product_options = [];
              const modelName = String(selectedOption.raw_name || selectedOption.name || "modelo");
              const reply = [
                `Perfecto, tomé ${modelName}.`,
                "¿Qué deseas ahora?",
                "1) Cotización",
                "2) Ficha técnica",
              ].join("\n");
              return finalizeStrictTurn(reply, strictMemory, { pipeline: true, intent: pipelineIntent });
            }
            return finalizeStrictTurn("Elige una opción válida del menú con letra/número (A/1), o escribe 'más'.", strictMemory, { pipeline: true, intent: pipelineIntent });
          }
        }

        return null;
      };

      const recognitionChoice = detectClientRecognitionChoice(text);
      const currentClientType = String(strictMemory.commercial_client_type || previousMemory?.commercial_client_type || "").trim();
      const clientType = currentClientType || recognitionChoice;
      if (clientType) strictMemory.commercial_client_type = clientType;

      if (recognitionChoice === "new") {
        strictMemory.commercial_client_type = "new";
        strictMemory.commercial_validation_complete = false;
        strictMemory.new_customer_data = {};
        strictMemory.commercial_existing_match = {};
      }

      if (recognitionChoice === "existing") {
        strictMemory.commercial_client_type = "existing";
        strictMemory.commercial_validation_complete = false;
        strictMemory.commercial_existing_match = {};
      }

      if (!String(strictReply || "").trim() && !clientType && !/^(strict_quote_data|advisor_meeting_slot)$/i.test(awaiting)) {
        strictMemory.awaiting_action = "commercial_client_recognition";
        strictReply = buildCommercialWelcomeMessage();
        return finalizeStrictTurn(strictReply, strictMemory, { strict_gate: "commercial_recognition_required" });
      }

      const shouldHandleNewCommercialStep =
        clientType === "new" &&
        (!Boolean(strictMemory.commercial_validation_complete) || /^(commercial_client_recognition|commercial_new_customer_data|commercial_choose_equipment|none)$/i.test(awaiting));
      if (!String(strictReply || "").trim() && shouldHandleNewCommercialStep && !/^(strict_quote_data|advisor_meeting_slot)$/i.test(awaiting)) {
        strictMemory.commercial_client_type = "new";
        strictMemory.awaiting_action = "commercial_new_customer_data";
        if (shouldEscalateToAdvisorByCommercialRule(strictMemory, text)) {
          strictReply = buildCommercialEscalationMessage();
          strictMemory.awaiting_action = "conversation_followup";
          return finalizeStrictTurn(strictReply, strictMemory, { strict_gate: "commercial_escalation_new_customer" });
        }
        updateNewCustomerRegistration(strictMemory, text, inbound.pushName || "");
        if (Boolean(strictMemory.is_persona_natural)) {
          strictReply = buildCommercialEscalationMessage();
          strictMemory.awaiting_action = "conversation_followup";
          return finalizeStrictTurn(strictReply, strictMemory, { strict_gate: "persona_natural_escalation" });
        }
        const missing = getMissingNewCustomerFields(strictMemory);
        if (missing.length) {
          strictReply = awaiting === "commercial_client_recognition"
            ? buildNewCustomerDataPrompt()
            : buildMissingNewCustomerDataMessage(missing);
          return finalizeStrictTurn(strictReply, strictMemory, { strict_gate: "new_customer_data_required" });
        }
        strictMemory.commercial_validation_complete = true;
        const chosenEquipment = detectEquipmentChoice(text);
        if (chosenEquipment && awaiting === "commercial_choose_equipment") {
          strictMemory.commercial_equipment_choice = chosenEquipment;
          if (chosenEquipment === "balanza") {
            const guidedProfile = detectGuidedBalanzaProfile(text);
            if (guidedProfile) {
              const guidedOptions = buildGuidedPendingOptions(ownerRows as any[], guidedProfile);
              strictMemory.pending_product_options = guidedOptions;
              strictMemory.pending_family_options = [];
              strictMemory.awaiting_action = guidedOptions.length ? "strict_choose_model" : "strict_need_spec";
              strictMemory.last_category_intent = "balanzas";
              strictMemory.guided_balanza_profile = guidedProfile;
              strictMemory.strict_family_label = "balanzas";
              strictMemory.strict_model_offset = 0;
              strictReply = buildGuidedBalanzaReply(guidedProfile);
              return finalizeStrictTurn(strictReply, strictMemory, { strict_gate: "balanza_guided_new_customer" });
            }
            strictMemory.awaiting_action = "strict_need_spec";
            strictReply = buildBalanzaQualificationPrompt();
            return finalizeStrictTurn(strictReply, strictMemory, { strict_gate: "balanza_qualification_new_customer" });
          }
          if (chosenEquipment === "bascula") {
            strictMemory.last_category_intent = "basculas";
            strictMemory.awaiting_action = "strict_need_spec";
            strictReply = "Perfecto. Para báscula, dime capacidad y resolución objetivo para recomendarte la mejor opción.";
            return finalizeStrictTurn(strictReply, strictMemory, { strict_gate: "bascula_qualification_new_customer" });
          }
          if (chosenEquipment === "analizador_humedad") {
            strictMemory.last_category_intent = "analizador_humedad";
            strictMemory.awaiting_action = "strict_need_spec";
            strictReply = "Perfecto. Para analizador de humedad, dime tipo de muestra, capacidad aproximada y precisión objetivo.";
            return finalizeStrictTurn(strictReply, strictMemory, { strict_gate: "humidity_qualification_new_customer" });
          }
          strictMemory.awaiting_action = "conversation_followup";
          strictReply = [
            "En base de datos no tengo ese tipo de producto en catálogo activo para cotización automática.",
            buildCommercialEscalationMessage(),
          ].join("\n\n");
          return finalizeStrictTurn(strictReply, strictMemory, { strict_gate: "other_equipment_escalation_new_customer" });
        }
        strictMemory.awaiting_action = "commercial_choose_equipment";
        strictReply = buildCommercialValidationOkMessage();
        return finalizeStrictTurn(strictReply, strictMemory, { strict_gate: "new_customer_data_completed" });
      }

      const shouldHandleExistingCommercialStep =
        clientType === "existing" &&
        /^(commercial_client_recognition|commercial_existing_lookup|commercial_existing_confirm|commercial_existing_contact_update|commercial_choose_equipment|none)$/i.test(awaiting);
      if (!String(strictReply || "").trim() && shouldHandleExistingCommercialStep && !/^(strict_quote_data|advisor_meeting_slot)$/i.test(awaiting)) {
        strictMemory.commercial_client_type = "existing";
        const currentAwaiting = String(awaiting || "").trim();

        if (/^(commercial_client_recognition|none)$/i.test(currentAwaiting)) {
          strictMemory.awaiting_action = "commercial_existing_lookup";
          strictReply = buildExistingClientLookupPrompt();
          return finalizeStrictTurn(strictReply, strictMemory, { strict_gate: "existing_customer_lookup_required" });
        }

        if (currentAwaiting === "commercial_existing_lookup") {
          const lookupNit = String(extractCompanyNit(text) || "").replace(/\D/g, "").trim();
          const lookupPhone = normalizePhone(String(extractCustomerPhone(text, inbound.from) || "").trim());
          const lookupPhoneTail = phoneTail10(lookupPhone);
          if (!lookupNit && !lookupPhoneTail) {
            strictMemory.awaiting_action = "commercial_existing_lookup";
            strictReply = "Para validar en base de datos necesito NIT o celular registrado. Ejemplo: NIT 900505419 o celular 3131657711.";
            return finalizeStrictTurn(strictReply, strictMemory, { strict_gate: "existing_customer_lookup_missing_key" });
          }

          let matchedContact: any = null;
          let lookupCandidatesCount = 0;
          try {
            if (lookupNit) {
              const { data: byNitKey } = await supabase
                .from("agent_crm_contacts")
                .select("id,name,email,phone,company,contact_key,metadata,updated_at")
                .eq("created_by", ownerId)
                .eq("contact_key", `nit:${lookupNit}`)
                .order("updated_at", { ascending: false })
                .limit(1);
              if (Array.isArray(byNitKey) && byNitKey[0]) matchedContact = byNitKey[0];
            }

            if (!matchedContact && lookupPhoneTail) {
              const { data: byPhoneKey } = await supabase
                .from("agent_crm_contacts")
                .select("id,name,email,phone,company,contact_key,metadata,updated_at")
                .eq("created_by", ownerId)
                .or(`contact_key.eq.cel:${lookupPhone},contact_key.eq.cel:${lookupPhoneTail},phone.eq.${lookupPhone},phone.like.%${lookupPhoneTail}`)
                .order("updated_at", { ascending: false })
                .limit(5);
              if (Array.isArray(byPhoneKey) && byPhoneKey[0]) matchedContact = byPhoneKey[0];
            }

            if (matchedContact) {
              // exact key/phone match resolved
            } else {
              const { data: crmCandidates } = await supabase
                .from("agent_crm_contacts")
                .select("id,name,email,phone,company,contact_key,metadata,updated_at")
                .eq("created_by", ownerId)
                .order("updated_at", { ascending: false })
                .limit(2000);
              const candidates = Array.isArray(crmCandidates) ? crmCandidates : [];
              lookupCandidatesCount = candidates.length;
            matchedContact = candidates.find((c: any) => {
              const cPhone = normalizePhone(String(c?.phone || ""));
              const cTail = phoneTail10(cPhone);
              const cNit = String((c?.metadata && typeof c.metadata === "object" ? c.metadata.nit : "") || "").replace(/\D/g, "").trim();
              const cContactKey = String(c?.contact_key || "").trim().toLowerCase();
              const cContactKeyDigits = cContactKey.replace(/\D/g, "").trim();
              const cContactKeyTail = phoneTail10(cContactKeyDigits);
              const phoneMatch = Boolean(lookupPhoneTail) && Boolean(cTail) && cTail === lookupPhoneTail;
              const nitMatch = Boolean(lookupNit) && Boolean(cNit) && cNit === lookupNit;
              const nitByContactKey = Boolean(lookupNit) && cContactKey.startsWith("nit:") && cContactKeyDigits === lookupNit;
              const phoneByContactKey = Boolean(lookupPhoneTail) && cContactKey.startsWith("cel:") && Boolean(cContactKeyTail) && cContactKeyTail === lookupPhoneTail;
              return phoneMatch || nitMatch || nitByContactKey || phoneByContactKey;
            }) || null;
            }
          } catch {}

          console.log("[existing-customer-lookup]", {
            ownerId,
            lookupNit,
            lookupPhoneTail,
            matched: Boolean(matchedContact),
            fallbackCandidates: lookupCandidatesCount,
          });

          if (!matchedContact) {
            strictMemory.commercial_client_type = "new";
            strictMemory.awaiting_action = "commercial_new_customer_data";
            strictReply = [
              "No encontré ese NIT/celular en nuestra base de clientes.",
              "Para continuar te registro como contacto nuevo.",
              "",
              buildNewCustomerDataPrompt(),
            ].join("\n");
            return finalizeStrictTurn(strictReply, strictMemory, { strict_gate: "existing_customer_not_found_switch_new" });
          }

          const matchedMeta = matchedContact?.metadata && typeof matchedContact.metadata === "object"
            ? matchedContact.metadata
            : {};
          const matchedNit = String(matchedMeta?.nit || "").replace(/\D/g, "").trim();
          const matchedCity = normalizeCityLabel(String(matchedMeta?.billing_city || "").trim());
          const matchedName = sanitizeCustomerDisplayName(String(matchedContact?.name || ""));
          const matchedEmail = String(matchedContact?.email || "").trim().toLowerCase();
          const matchedPhone = normalizePhone(String(matchedContact?.phone || ""));
          const matchedCompany = String(matchedContact?.company || "").trim();

          strictMemory.crm_contact_found = true;
          strictMemory.crm_contact_id = String(matchedContact?.id || "").trim();
          strictMemory.crm_contact_name = matchedName;
          strictMemory.crm_contact_email = matchedEmail;
          strictMemory.crm_contact_phone = matchedPhone;
          strictMemory.crm_company = matchedCompany;
          strictMemory.crm_nit = matchedNit;
          strictMemory.crm_billing_city = matchedCity;
          strictMemory.quote_data = {
            city: matchedCity || String(strictMemory?.quote_data?.city || "") || "Bogota",
            company: matchedCompany || String(strictMemory?.quote_data?.company || ""),
            nit: matchedNit || String(strictMemory?.quote_data?.nit || ""),
            contact: matchedName || String(strictMemory?.quote_data?.contact || ""),
            email: matchedEmail || String(strictMemory?.quote_data?.email || ""),
            phone: matchedPhone || normalizePhone(String(strictMemory?.customer_phone || inbound.from || "")),
          };

          strictMemory.commercial_existing_match = {
            id: String(matchedContact?.id || "").trim(),
            company: matchedCompany,
            nit: matchedNit,
            contact: matchedName,
            email: matchedEmail,
            phone: matchedPhone,
            city: matchedCity,
          };

          strictMemory.awaiting_action = "commercial_existing_confirm";
          strictReply = buildExistingClientMatchConfirmationPrompt({
            company: matchedCompany,
            nit: matchedNit,
            contact: matchedName,
            email: matchedEmail,
            phone: matchedPhone,
          });
          return finalizeStrictTurn(strictReply, strictMemory, { strict_gate: "existing_customer_confirm_identity" });
        }

        if (currentAwaiting === "commercial_existing_confirm") {
          const confirmChoice = detectExistingClientConfirmationChoice(text);
          const matched = strictMemory?.commercial_existing_match && typeof strictMemory.commercial_existing_match === "object"
            ? strictMemory.commercial_existing_match
            : {};
          if (!confirmChoice) {
            strictMemory.awaiting_action = "commercial_existing_confirm";
            strictReply = "Confírmame por favor: 1) Sí, soy la misma persona 2) No, soy otra persona/área.";
            return finalizeStrictTurn(strictReply, strictMemory, { strict_gate: "existing_customer_confirm_required" });
          }

          if (confirmChoice === "different") {
            strictMemory.awaiting_action = "commercial_existing_contact_update";
            strictReply = [
              "Perfecto, actualicemos el contacto para esa empresa.",
              "Compárteme en un solo mensaje:",
              "- Nombre de contacto",
              "- Correo",
              "- Celular",
              "- Área/Cargo (opcional)",
            ].join("\n");
            return finalizeStrictTurn(strictReply, strictMemory, { strict_gate: "existing_customer_contact_update_required" });
          }

          strictMemory.commercial_validation_complete = true;
          recognizedReturningCustomer = true;
          strictMemory.customer_name = String(matched?.contact || strictMemory.crm_contact_name || strictMemory.customer_name || "").trim();
          strictMemory.awaiting_action = "commercial_choose_equipment";
          strictReply = buildEquipmentMenuPrompt();
          return finalizeStrictTurn(strictReply, strictMemory, { strict_gate: "existing_customer_confirmed" });
        }

        if (currentAwaiting === "commercial_existing_contact_update") {
          const matched = strictMemory?.commercial_existing_match && typeof strictMemory.commercial_existing_match === "object"
            ? strictMemory.commercial_existing_match
            : {};
          const updated = parseExistingContactUpdateData(text, inbound.from);
          if (!updated.name || (!updated.email && !updated.phone)) {
            strictMemory.awaiting_action = "commercial_existing_contact_update";
            strictReply = "Para actualizar el contacto necesito al menos: nombre y (correo o celular).";
            return finalizeStrictTurn(strictReply, strictMemory, { strict_gate: "existing_customer_contact_update_missing_fields" });
          }

          let insertedContactId = "";
          try {
            const metadata = {
              nit: String(matched?.nit || strictMemory.crm_nit || "").trim(),
              billing_city: String(matched?.city || strictMemory.crm_billing_city || "").trim(),
              customer_type: "existing",
              source: "whatsapp_existing_customer_contact_update",
              parent_contact_id: String(matched?.id || strictMemory.crm_contact_id || "").trim(),
              area: String(updated.area || "").trim(),
              whatsapp_transport_id: normalizePhone(inbound.from || ""),
              whatsapp_lifecycle_at: new Date().toISOString(),
            };
            const { data: inserted } = await supabase
              .from("agent_crm_contacts")
              .insert({
                tenant_id: (agent as any)?.tenant_id || null,
                created_by: ownerId,
                name: updated.name,
                email: updated.email || null,
                phone: updated.phone || null,
                company: String(matched?.company || strictMemory.crm_company || "").trim() || null,
                status: "analysis",
                metadata,
              })
              .select("id")
              .single();
            insertedContactId = String((inserted as any)?.id || "").trim();
          } catch {}

          strictMemory.crm_contact_found = true;
          strictMemory.crm_contact_id = insertedContactId || String(strictMemory.crm_contact_id || "").trim();
          strictMemory.crm_contact_name = updated.name;
          strictMemory.crm_contact_email = updated.email || String(strictMemory.crm_contact_email || "").trim();
          strictMemory.crm_contact_phone = updated.phone || String(strictMemory.crm_contact_phone || "").trim();
          strictMemory.customer_name = updated.name;
          strictMemory.commercial_customer_name = updated.name;
          strictMemory.commercial_validation_complete = true;
          recognizedReturningCustomer = true;

          strictMemory.awaiting_action = "commercial_choose_equipment";
          strictReply = [
            "Perfecto, ya actualicé el contacto y quedó registrado en CRM/base BOT.",
            buildEquipmentMenuPrompt(),
          ].join("\n\n");
          return finalizeStrictTurn(strictReply, strictMemory, { strict_gate: "existing_customer_contact_updated" });
        }

        strictMemory.commercial_validation_complete = true;
        const chosenEquipment = detectEquipmentChoice(text);
        if (!chosenEquipment || /^(commercial_client_recognition|commercial_existing_lookup|commercial_existing_confirm|commercial_existing_contact_update)$/i.test(currentAwaiting)) {
          strictMemory.awaiting_action = "commercial_choose_equipment";
          strictReply = buildEquipmentMenuPrompt();
          return finalizeStrictTurn(strictReply, strictMemory, { strict_gate: "equipment_selection_required" });
        }
        strictMemory.commercial_equipment_choice = chosenEquipment;
        if (chosenEquipment === "balanza") {
          const guidedProfile = detectGuidedBalanzaProfile(text);
          if (guidedProfile) {
            const guidedOptions = buildGuidedPendingOptions(ownerRows as any[], guidedProfile);
            strictMemory.pending_product_options = guidedOptions;
            strictMemory.pending_family_options = [];
            strictMemory.awaiting_action = guidedOptions.length ? "strict_choose_model" : "strict_need_spec";
            strictMemory.last_category_intent = "balanzas";
            strictMemory.guided_balanza_profile = guidedProfile;
            strictMemory.strict_family_label = "balanzas";
            strictMemory.strict_model_offset = 0;
            strictReply = buildGuidedBalanzaReply(guidedProfile);
            return finalizeStrictTurn(strictReply, strictMemory, { strict_gate: "balanza_guided_existing_customer" });
          }
          strictMemory.awaiting_action = "strict_need_spec";
          strictReply = buildBalanzaQualificationPrompt();
          return finalizeStrictTurn(strictReply, strictMemory, { strict_gate: "balanza_qualification" });
        }
        if (chosenEquipment === "bascula") {
          strictMemory.last_category_intent = "basculas";
          strictMemory.awaiting_action = "strict_need_spec";
          strictReply = "Perfecto. Para báscula, dime capacidad y resolución objetivo para recomendarte la mejor opción.";
          return finalizeStrictTurn(strictReply, strictMemory, { strict_gate: "bascula_qualification" });
        }
        if (chosenEquipment === "analizador_humedad") {
          strictMemory.last_category_intent = "analizador_humedad";
          strictMemory.awaiting_action = "strict_need_spec";
          strictReply = "Perfecto. Para analizador de humedad, dime tipo de muestra, capacidad aproximada y precisión objetivo.";
          return finalizeStrictTurn(strictReply, strictMemory, { strict_gate: "humidity_qualification" });
        }
        strictMemory.awaiting_action = "conversation_followup";
        strictReply = [
          "En base de datos no tengo ese tipo de producto en catálogo activo para cotización automática.",
          buildCommercialEscalationMessage(),
        ].join("\n\n");
        return finalizeStrictTurn(strictReply, strictMemory, { strict_gate: "other_equipment_escalation" });
      }

      if (!String(strictReply || "").trim() && isCapacityResolutionHelpIntent(text) && awaiting === "strict_need_spec") {
        strictMemory.awaiting_action = "strict_need_spec";
        strictReply = buildCapacityResolutionExplanation();
        return finalizeStrictTurn(strictReply, strictMemory, { strict_gate: "capacity_resolution_help" });
      }

      const pipelineResponse = await pipelineGate();
      if (pipelineResponse) return pipelineResponse;

      if (!String(strictReply || "").trim()) {
        const bundleCountMatch = textNorm.match(/\bcotiz(?:ar|a|acion|ación)?\s*(\d{1,2}|dos|tres|cuatro|cinco|seis|siete|ocho)\b/i);
        const numberWordMap: Record<string, number> = { dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8 };
        const bundleCountRaw = String(bundleCountMatch?.[1] || "").trim().toLowerCase();
        const requestedBundleCount = Number(bundleCountRaw ? (Number(bundleCountRaw) || numberWordMap[bundleCountRaw] || 0) : 0);
        const pendingForBundle =
          (Array.isArray(previousMemory?.quote_bundle_options_current) ? previousMemory.quote_bundle_options_current : [])
            .concat(Array.isArray(previousMemory?.quote_bundle_options) ? previousMemory.quote_bundle_options : [])
            .concat(Array.isArray(previousMemory?.pending_product_options) ? previousMemory.pending_product_options : [])
            .concat(Array.isArray(previousMemory?.last_recommended_options) ? previousMemory.last_recommended_options : [])
            .filter((o: any, idx: number, arr: any[]) => {
              const key = String(o?.id || o?.product_id || o?.raw_name || o?.name || "").trim();
              if (!key) return false;
              return arr.findIndex((x: any) => String(x?.id || x?.product_id || x?.raw_name || x?.name || "").trim() === key) === idx;
            });
        if (requestedBundleCount >= 2 && pendingForBundle.length >= 2 && asksQuoteIntent(text)) {
          const chosen = pendingForBundle.slice(0, Math.min(requestedBundleCount, pendingForBundle.length));
          const modelNames = chosen.map((o: any) => String(o?.raw_name || o?.name || "").trim()).filter(Boolean);
          if (modelNames.length >= 2) {
            strictBypassAutoQuote = true;
            inbound.text = `cotizar ${modelNames.join(" ; ")} cantidad 1 para todos`;
            strictMemory.pending_product_options = chosen;
            strictMemory.quote_bundle_options_current = chosen;
            strictMemory.quote_bundle_options = chosen;
            strictMemory.last_recommended_options = chosen;
            strictMemory.last_intent = "quote_bundle_request";
            strictMemory.bundle_quote_mode = true;
            strictMemory.bundle_quote_count = chosen.length;
            strictMemory.awaiting_action = "none";
            strictReply = `Perfecto. Voy a generar una cotización consolidada para esas ${chosen.length} opciones y te la envío en PDF por este WhatsApp.`;
          }
        }
      }

      const strictCloseIntent = isConversationCloseIntent(text) && normalizeText(text).length <= 48;
      if (strictCloseIntent) {
        const hadQuoteContext =
          Boolean(previousMemory?.last_quote_draft_id || previousMemory?.last_quote_pdf_sent_at) ||
          /(quote_generated|quote_recall|price_request)/.test(String(previousMemory?.last_intent || ""));
        strictReply = hadQuoteContext
          ? "Perfecto, cerramos por ahora. Gracias por tu tiempo. Te estaremos enviando un recordatorio breve para saber como te parecio la cotizacion."
          : "Perfecto, cerramos por ahora. Gracias por tu tiempo. Si despues quieres retomar, te ayudo por este mismo WhatsApp.";
        strictMemory.awaiting_action = "none";
        strictMemory.conversation_status = "closed";
        strictMemory.last_intent = "conversation_closed";
        if (hadQuoteContext) strictMemory.quote_feedback_due_at = isoAfterHours(24);
      }

      const strictAwaiting = String(previousMemory?.awaiting_action || "");
      if (!String(strictReply || "").trim() && strictAwaiting === "compatibility_followup") {
        const app = String(previousMemory?.target_application || previousMemory?.compatibility_application || "").trim();
        const capTarget = Number(previousMemory?.target_capacity_g || previousMemory?.strict_filter_capacity_g || 0);
        const rememberedCategoryCompat = String(previousMemory?.last_category_intent || rememberedCategory || "").trim();
        const scoped = rememberedCategoryCompat ? scopeCatalogRows(ownerRows as any, rememberedCategoryCompat) : ownerRows;
        const askOptions = isAffirmativeIntent(text) || /^\s*1\s*$/.test(textNorm) || /\b(opciones|recomendadas|muestrame|mu[eé]strame|dame)\b/.test(textNorm);
        const askAdjust = /^\s*2\s*$/.test(textNorm) || /\b(ajust|capacidad|resolucion|resolución|precision|precisión)\b/.test(textNorm);

        if (askOptions) {
          const options = getApplicationRecommendedOptions({
            rows: scoped as any[],
            application: app,
            capTargetG: capTarget,
            excludeId: String(previousMemory?.last_selected_product_id || previousMemory?.last_product_id || ""),
          });
          if (options.length) {
            strictMemory.pending_product_options = options;
            strictMemory.pending_family_options = [];
            strictMemory.awaiting_action = "strict_choose_model";
            strictMemory.strict_model_offset = 0;
            strictReply = [
              `Perfecto. Estas son 3 opciones recomendadas para ${String(app || "tu uso").replace(/_/g, " ")}:`,
              ...options.slice(0, 3).map((o) => `${o.code}) ${o.name}`),
              "",
              "Elige con letra/número (A/1), o escribe 'más'.",
            ].join("\n");
          } else {
            const fallbackRows = buildNumberedProductOptions(scoped as any[], 8);
            if (fallbackRows.length) {
              strictMemory.pending_product_options = fallbackRows;
              strictMemory.pending_family_options = [];
              strictMemory.awaiting_action = "strict_choose_model";
              strictMemory.strict_model_offset = 0;
              strictReply = [
                "No veo 3 opciones exactas con ese uso, pero sí estas alternativas cercanas de catálogo:",
                ...fallbackRows.slice(0, 4).map((o) => `${o.code}) ${o.name}`),
                "",
                "Elige con letra/número (A/1), o escribe 'más'.",
              ].join("\n");
            } else {
              strictMemory.awaiting_action = "strict_need_spec";
              strictReply = "En este momento no veo 3 opciones adecuadas para ese uso con la info actual. Ajustemos capacidad y resolución para proponerte alternativas reales.";
            }
          }
        } else if (askAdjust) {
          strictMemory.awaiting_action = "strict_need_spec";
          strictReply = "Perfecto. Ajustemos el requerimiento: dime capacidad y resolución objetivo (ej.: 220 g x 0.001 g).";
        } else {
          strictMemory.awaiting_action = "compatibility_followup";
          strictReply = [
            "Para seguir sin perder el contexto, responde:",
            "1) Ver 3 opciones recomendadas",
            "2) Ajustar capacidad/resolución",
          ].join("\n");
        }
      }
      if (!String(strictReply || "").trim() && isAdvisorAppointmentIntent(text)) {
        strictReply = buildAdvisorMiniAgendaPrompt();
        strictMemory.awaiting_action = "advisor_meeting_slot";
        strictMemory.conversation_status = "open";
      } else if (!String(strictReply || "").trim() && strictAwaiting === "advisor_meeting_slot") {
        const slot = parseAdvisorMiniAgendaChoice(text);
        if (!slot) {
          strictReply = "Para agendar con asesor, responde 1, 2 o 3 según el horario.";
          strictMemory.awaiting_action = "advisor_meeting_slot";
        } else {
          strictReply = `Perfecto. Agendé la gestión con asesor para ${slot.label}. Te contactaremos en ese horario por WhatsApp o llamada.`;
          strictMemory.awaiting_action = "conversation_followup";
          strictMemory.advisor_meeting_at = slot.iso;
          strictMemory.advisor_meeting_label = slot.label;
          strictReply = appendQuoteClosurePrompt(strictReply);
        }
      }

      if (!String(strictReply || "").trim() && awaiting === "followup_quote_disambiguation") {
        const choice = parseAnotherQuoteChoice(text);
        const rememberedId = String(previousMemory?.last_selected_product_id || previousMemory?.last_product_id || "").trim();
        const rememberedName = String(previousMemory?.last_selected_product_name || previousMemory?.last_product_name || "").trim();
        const selectedFromMemory = rememberedId
          ? (ownerRows.find((r: any) => String(r?.id || "").trim() === rememberedId) || null)
          : (rememberedName ? (findCatalogProductByName(ownerRows as any[], rememberedName) || null) : null);

        if (!choice) {
          strictReply = buildAnotherQuotePrompt();
          strictMemory.awaiting_action = "followup_quote_disambiguation";
          strictMemory.last_intent = "followup_quote_disambiguation";
        } else if (choice === "advisor") {
          strictReply = buildAdvisorMiniAgendaPrompt();
          strictMemory.awaiting_action = "advisor_meeting_slot";
        } else if (choice === "same_model") {
          if (!selectedFromMemory) {
            strictReply = "Perfecto. Indícame el modelo exacto que quieres recotizar y te ayudo enseguida.";
            strictMemory.awaiting_action = "strict_need_spec";
          } else {
            const selectedName = String((selectedFromMemory as any)?.name || rememberedName || "producto");
            const qtyRequested = Math.max(1, extractQuoteRequestedQuantity(text) || Number(previousMemory?.quote_quantity || 1) || 1);
            strictMemory.last_selected_product_id = String((selectedFromMemory as any)?.id || "").trim();
            strictMemory.last_selected_product_name = selectedName;
            strictMemory.quote_quantity = qtyRequested;
            strictMemory.awaiting_action = "strict_quote_data";
            strictReply = buildQuoteDataIntakePrompt(
              `Perfecto. Preparo una nueva cotización para ${selectedName} (${qtyRequested} unidad(es)).`,
              strictMemory
            );
          }
        } else {
          const selectedId = String((selectedFromMemory as any)?.id || "").trim();
          const selectedNorm = normalizeText(String((selectedFromMemory as any)?.name || rememberedName || ""));
          const selectedPrice = Number((selectedFromMemory as any)?.base_price_usd || 0);
          const familyLabel = String(previousMemory?.strict_family_label || familyLabelFromRow(selectedFromMemory) || "").trim();
          const categoryScoped = rememberedCategory ? scopeCatalogRows(ownerRows as any, rememberedCategory) : ownerRows;
          const familyScoped = familyLabel
            ? categoryScoped.filter((r: any) => normalizeText(familyLabelFromRow(r)) === normalizeText(familyLabel))
            : categoryScoped;
          const basePoolRaw = (familyScoped.length >= 3 ? familyScoped : categoryScoped) as any[];
          const basePool = basePoolRaw.filter((r: any) => {
            const rid = String(r?.id || "").trim();
            const rname = normalizeText(String(r?.name || ""));
            if (selectedId && rid && selectedId === rid) return false;
            if (!selectedId && selectedNorm && rname && selectedNorm === rname) return false;
            return true;
          });

          const byPriceAsc = (rows: any[]) => [...rows]
            .filter((r: any) => Number(r?.base_price_usd || 0) > 0)
            .sort((a: any, b: any) => Number(a?.base_price_usd || 0) - Number(b?.base_price_usd || 0));

          let intro = "Perfecto. Aquí tienes alternativas de otro modelo:";
          let rankedRows = [...basePool];
          if (choice === "cheaper") {
            const priced = byPriceAsc(basePool);
            const cheaper = selectedPrice > 0 ? priced.filter((r: any) => Number(r?.base_price_usd || 0) < selectedPrice) : [];
            rankedRows = cheaper.length ? cheaper : priced;
            intro = cheaper.length
              ? "Perfecto. Sí, tengo opciones más económicas en base de datos:"
              : "No encontré opciones más económicas con precio activo frente al modelo actual; te comparto las de menor precio disponibles:";
          }

          const options = buildNumberedProductOptions(rankedRows as any[], 5);
          if (options.length) {
            strictMemory.pending_product_options = options;
            strictMemory.last_recommended_options = options;
            strictMemory.awaiting_action = "strict_choose_model";
            strictMemory.strict_model_offset = 0;
            strictMemory.strict_family_label = familyLabel;
            strictReply = [
              intro,
              ...options.map((o) => `${o.code}) ${o.name}`),
              "",
              "Elige con letra o número (A/1), o escribe 'más'.",
            ].join("\n");
          } else {
            strictReply = "No encontré alternativas con precio activo para ese criterio en este momento. Si quieres, te muestro opciones por capacidad/resolución.";
            strictMemory.awaiting_action = "strict_need_spec";
          }
        }
      }

      if (!String(strictReply || "").trim() && isConversationFollowupAmbiguousQuote) {
        strictReply = buildAnotherQuotePrompt();
        strictMemory.awaiting_action = "followup_quote_disambiguation";
        strictMemory.last_intent = "followup_quote_disambiguation";
      }

      if (!String(strictReply || "").trim() && isAmbiguousTechnicalMessage(text) && !wantsQuote && !wantsSheet) {
        strictMemory.awaiting_action = "strict_need_spec";
        strictReply = buildAmbiguityQuestion(text);
      }

      const shouldShortcutTechnicalSpec =
        !String(strictReply || "").trim() &&
        preParsedSpec &&
        /^(strict_need_spec|strict_choose_model|strict_choose_family)$/i.test(String(awaiting || ""));
      if (shouldShortcutTechnicalSpec) {
        const cap = Number((preParsedSpec as any)?.capacityG || 0);
        const read = Number((preParsedSpec as any)?.readabilityG || 0);
        if (cap > 0 && read > 0) {
          strictMemory.strict_spec_query = `${formatSpecNumber(cap)} g x ${formatSpecNumber(read)} g`;
          strictMemory.strict_filter_capacity_g = cap;
          strictMemory.strict_filter_readability_g = read;
          const exactRows = getExactTechnicalMatches(ownerRows as any[], { capacityG: cap, readabilityG: read });
          const prioritized = prioritizeTechnicalRows(ownerRows as any[], { capacityG: cap, readabilityG: read });
          const sourceRows = exactRows.length ? exactRows : (prioritized.orderedRows.length ? prioritized.orderedRows : ownerRows);
          const options = buildNumberedProductOptions(sourceRows as any[], 8);
          if (options.length) {
            strictMemory.pending_product_options = options;
            strictMemory.pending_family_options = [];
            strictMemory.awaiting_action = "strict_choose_model";
            strictMemory.strict_model_offset = 0;
            strictReply = [
              exactRows.length
                ? `Sí, para ${strictMemory.strict_spec_query} tengo coincidencias exactas.`
                : `Para ${strictMemory.strict_spec_query} no veo coincidencia exacta, pero sí opciones cercanas:`,
              ...options.slice(0, 3).map((o) => `${o.code}) ${o.name}`),
              "",
              "Responde con letra o número (A/1), o escribe 'más'.",
            ].join("\n");
          } else {
            strictMemory.awaiting_action = "strict_need_spec";
            strictReply = "No encontré coincidencias para esa capacidad/resolución en el catálogo activo. Si quieres, te muestro alternativas cercanas.";
          }
        }
      }

      if (!String(strictReply || "").trim() && isCorrectionIntent(text) && awaiting !== "strict_choose_action") {
        resetStrictRecommendationState(strictMemory);
        const cap = Number(previousMemory?.strict_filter_capacity_g || 0);
        const read = Number(previousMemory?.strict_filter_readability_g || 0);
        if (cap > 0 && read > 0) {
          strictMemory.strict_filter_capacity_g = cap;
          strictMemory.strict_filter_readability_g = read;
          strictMemory.strict_spec_query = `${formatSpecNumber(cap)} g x ${formatSpecNumber(read)} g`;
          const exactRows = getExactTechnicalMatches(ownerRows as any[], { capacityG: cap, readabilityG: read });
          const options = buildNumberedProductOptions((exactRows.length ? exactRows : ownerRows) as any[], 8);
          strictMemory.pending_product_options = options;
          strictMemory.awaiting_action = "strict_choose_model";
          strictReply = exactRows.length
            ? [
                `Entendí mal, corrijo. Buscas ${strictMemory.strict_spec_query}.`,
                "Te muestro solo coincidencias exactas:",
                ...options.slice(0, 3).map((o) => `${o.code}) ${o.name}`),
                "",
                "Responde con letra o número (A/1).",
              ].join("\n")
            : `Entendí mal, corrijo. No tengo coincidencia exacta para ${strictMemory.strict_spec_query}. Si quieres, te muestro opciones cercanas.`;
        } else {
          strictMemory.awaiting_action = "strict_need_spec";
          strictReply = "Entendí mal, corrijo. Envíame capacidad y resolución exacta en formato 200 g x 0.001 g y te muestro solo opciones correctas.";
        }
      }

      const askMoreOptionsNow =
        !wantsQuote &&
        !wantsSheet &&
        /\b(mas|más|opciones|alternativas|otros|otras|rango|que\s+tienes|tienes\s+mas|tienes\s+m[aá]s|retomar|reanudar|continuar)\b/.test(textNorm);
      if (!String(strictReply || "").trim() && awaiting === "strict_choose_action" && askMoreOptionsNow) {
        const familyLabel = String(previousMemory?.strict_family_label || "").trim();
        const categoryScoped = rememberedCategory ? scopeCatalogRows(ownerRows as any, rememberedCategory) : ownerRows;
        const familyRows = familyLabel
          ? categoryScoped.filter((r: any) => normalizeText(familyLabelFromRow(r)) === normalizeText(familyLabel))
          : categoryScoped;
        const sourceRows = (familyRows.length ? familyRows : categoryScoped) as any[];
        const allOptions = buildNumberedProductOptions(sourceRows, 60);
        const options = allOptions.slice(0, 8);
        strictMemory.pending_product_options = options;
        strictMemory.awaiting_action = "strict_choose_model";
        strictMemory.strict_model_offset = 0;
        strictMemory.strict_family_label = familyLabel;
        strictReply = options.length
          ? [
              "Claro, te muestro más opciones disponibles:",
              ...options.map((o) => `${o.code}) ${o.name}`),
              "",
              (allOptions.length > options.length)
                ? "Escribe 'más' para ver siguientes, o elige con letra/número (A/1)."
                : "Elige con letra/número (A/1), o dime otra capacidad para filtrar.",
            ].join("\n")
          : "No tengo más opciones en este grupo en este momento. Si quieres, dime otra capacidad/resolución y te filtro de nuevo.";
      }

      let selectedProduct: any = null;
      const modelTokenHint = extractModelLikeTokens(text);
      const looksLikeModelCode = modelTokenHint.some((tk) => isLikelyModelCodeToken(tk));
      if (!String(strictReply || "").trim() && explicitModel && looksLikeModelCode && !technicalSpecIntent) {
        selectedProduct = findExactModelProduct(text, ownerRows as any[]) || pickBestCatalogProduct(text, ownerRows as any[]);
      }

      const directTechnicalSpec = preParsedSpec;
      if (!String(strictReply || "").trim() && directTechnicalSpec) {
        strictMemory.strict_spec_query = text;
        strictMemory.strict_filter_capacity_g = Number(directTechnicalSpec.capacityG || 0);
        strictMemory.strict_filter_readability_g = Number(directTechnicalSpec.readabilityG || 0);
        selectedProduct = null;
        const exactRows = getExactTechnicalMatches(ownerRows as any[], {
          capacityG: directTechnicalSpec.capacityG,
          readabilityG: directTechnicalSpec.readabilityG,
        });
        const prioritized = prioritizeTechnicalRows(ownerRows as any[], {
          capacityG: directTechnicalSpec.capacityG,
          readabilityG: directTechnicalSpec.readabilityG,
        });
        const sourceRows = exactRows.length ? exactRows : (prioritized.orderedRows.length ? prioritized.orderedRows : ownerRows);
        const options = buildNumberedProductOptions(sourceRows as any[], 8);
        if (options.length) {
          strictMemory.pending_product_options = options;
          strictMemory.pending_family_options = [];
          strictMemory.awaiting_action = "strict_choose_model";
          strictMemory.strict_model_offset = 0;
          const top = options.slice(0, 3);
          const exactLabel = exactRows.length > 0
            ? `Sí, para ${text.trim()} encontré ${exactRows.length} referencia(s) que coinciden exactamente con esa especificación.`
            : `Sí, para ${text.trim()} no veo coincidencia exacta, pero sí alternativas muy cercanas en catálogo.`;
          strictReply = [
            exactLabel,
            "Te comparto la coincidencia solicitada y alternativas cercanas:",
            ...top.map((o, idx) => `${o.code}) ${o.name}${idx === 0 ? " (recomendada para iniciar)" : ""}`),
            "",
            "Si quieres ver más referencias, escribe 'más'. También puedes responder con letra o número (A/1) y te envío ficha o cotización.",
          ].join("\n");
        } else {
          strictMemory.awaiting_action = "strict_need_spec";
          strictReply = "No encontré una coincidencia exacta para esa capacidad/resolución. ¿Quieres que busquemos con una resolución cercana?";
        }
      }

      if (!String(strictReply || "").trim() && technicalSpecIntent && !directTechnicalSpec) {
        const loose = parseLooseTechnicalHint(text);
        const cap = Number(loose?.capacityG || 0);
        const read = Number(loose?.readabilityG || 0);
        if (cap > 0 && read > 0) {
          strictMemory.strict_spec_query = `${formatSpecNumber(cap)} g x ${formatSpecNumber(read)} g`;
          strictMemory.strict_filter_capacity_g = cap;
          strictMemory.strict_filter_readability_g = read;
          selectedProduct = null;
          const exactRows = getExactTechnicalMatches(ownerRows as any[], { capacityG: cap, readabilityG: read });
          const prioritized = prioritizeTechnicalRows(ownerRows as any[], { capacityG: cap, readabilityG: read });
          const sourceRows = exactRows.length ? exactRows : (prioritized.orderedRows.length ? prioritized.orderedRows : ownerRows);
          const options = buildNumberedProductOptions(sourceRows as any[], 8);
          strictMemory.pending_product_options = options;
          strictMemory.pending_family_options = [];
          strictMemory.awaiting_action = "strict_choose_model";
          strictMemory.strict_model_offset = 0;
          strictReply = options.length
            ? [
                exactRows.length
                  ? `Sí, tengo coincidencias exactas para ${strictMemory.strict_spec_query}.`
                  : `No encontré coincidencia exacta para ${strictMemory.strict_spec_query}, pero sí opciones cercanas:`,
                ...options.slice(0, 3).map((o) => `${o.code}) ${o.name}`),
                "",
                "Responde con letra o número (A/1), o escribe 'más'.",
              ].join("\n")
            : "No encontré productos compatibles con ese criterio técnico en este momento.";
        } else {
          strictMemory.awaiting_action = "strict_need_spec";
          strictReply = "Entendido. Para no equivocarme, confirma capacidad y resolución en formato 200 g x 0.001 g.";
        }
      }

      const askMoreFromAction =
        awaiting === "strict_choose_action" &&
        !wantsQuote &&
        !wantsSheet &&
        (/\b(mas|más|opciones|alternativas|otros|otras|rango|que\s+tienes|de\s+\d+)/.test(textNorm) || technicalSpecIntent);
      if (!String(strictReply || "").trim() && askMoreFromAction) {
        const familyLabel = String(previousMemory?.strict_family_label || "").trim();
        const categoryScoped = rememberedCategory ? scopeCatalogRows(ownerRows as any, rememberedCategory) : ownerRows;
        const familyRows = familyLabel
          ? categoryScoped.filter((r: any) => normalizeText(familyLabelFromRow(r)) === normalizeText(familyLabel))
          : categoryScoped;
        let sourceRows: any[] = (familyRows.length >= 3 ? familyRows : categoryScoped) as any[];
        const specHint = parseLooseTechnicalHint(text);
        if (specHint?.capacityG && specHint?.readabilityG) {
          const prioritized = prioritizeTechnicalRows(categoryScoped as any[], {
            capacityG: Number(specHint.capacityG),
            readabilityG: Number(specHint.readabilityG),
          });
          if (prioritized.orderedRows.length) sourceRows = prioritized.orderedRows;
        }
        const allOptions = buildNumberedProductOptions(sourceRows as any[], 60);
        const options = allOptions.slice(0, 8);
        strictMemory.pending_product_options = options;
        strictMemory.awaiting_action = "strict_choose_model";
        strictMemory.strict_model_offset = 0;
        strictMemory.strict_family_label = familyLabel;
        if (!options.length) {
          strictReply = "No tengo más modelos en ese grupo con ese criterio. Si quieres, dime capacidad y resolución (ej.: 4200 g x 0.01 g) y te busco la mejor alternativa.";
        } else {
          strictReply = [
            "Claro, te muestro más opciones.",
            ...options.map((o) => `${o.code}) ${o.name}`),
            "",
            (allOptions.length > options.length)
              ? "Escribe 'más' para ver siguientes, o elige con letra/número (A/1)."
              : "Elige con letra/número (A/1), o dime otra capacidad para filtrar.",
          ].join("\n");
        }
      }

      if (!selectedProduct && awaiting === "strict_choose_action") {
        const rememberedId = String(previousMemory?.last_selected_product_id || previousMemory?.last_product_id || "").trim();
        const rememberedName = String(previousMemory?.last_selected_product_name || previousMemory?.last_product_name || "").trim();
        if (rememberedId) {
          selectedProduct = ownerRows.find((r: any) => String(r?.id || "").trim() === rememberedId) || null;
        }
        if (!selectedProduct && rememberedName) {
          selectedProduct = findCatalogProductByName(ownerRows as any[], rememberedName) || null;
        }
      }

      if (!selectedProduct && awaiting === "conversation_followup" && (/^1\b/.test(textNorm) || /^2\b/.test(textNorm))) {
        const rememberedId = String(previousMemory?.last_selected_product_id || previousMemory?.last_product_id || "").trim();
        const rememberedName = String(previousMemory?.last_selected_product_name || previousMemory?.last_product_name || "").trim();
        if (rememberedId) {
          selectedProduct = ownerRows.find((r: any) => String(r?.id || "").trim() === rememberedId) || null;
        }
        if (!selectedProduct && rememberedName) {
          selectedProduct = findCatalogProductByName(ownerRows as any[], rememberedName) || null;
        }
      }

      if (!selectedProduct && awaiting === "strict_choose_model") {
        const pending = Array.isArray(previousMemory?.pending_product_options) ? previousMemory.pending_product_options : [];
        const selected = resolvePendingProductOptionStrict(text, pending);
        if (selected?.id) {
          selectedProduct = ownerRows.find((r: any) => String(r?.id || "") === String(selected.id || "")) || null;
        }
      }

      if (!selectedProduct && !isConversationFollowupAmbiguousQuote && (wantsSheet || wantsQuote || /\b(ficha|cotizacion|cotización|precio)\b/.test(textNorm))) {
        const rememberedId = String(previousMemory?.last_selected_product_id || previousMemory?.last_product_id || strictMemory.last_selected_product_id || strictMemory.last_product_id || "").trim();
        const rememberedName = String(previousMemory?.last_selected_product_name || previousMemory?.last_product_name || strictMemory.last_selected_product_name || strictMemory.last_product_name || "").trim();
        if (rememberedId) {
          selectedProduct = ownerRows.find((r: any) => String(r?.id || "").trim() === rememberedId) || null;
        }
        if (!selectedProduct && rememberedName) {
          selectedProduct = findCatalogProductByName(ownerRows as any[], rememberedName) || null;
        }
      }

      const selfHints = [
        agentPhone,
        normalizePhone(String(payload?.destination || "")),
        normalizePhone(String(payload?.data?.destination || "")),
        normalizePhone(String(payload?.sender || "")),
        normalizePhone(String(payload?.data?.sender || "")),
      ]
        .filter((n) => n.length >= 10 && n.length <= 15)
        .filter((n, i, arr) => arr.indexOf(n) === i);
      const selfSet = new Set(selfHints);

      const toCandidates = [inbound.from, ...(inbound.alternates || [])]
        .map((n) => normalizePhone(String(n || "")))
        .filter((n, i, arr) => n && arr.indexOf(n) === i)
        .filter((n) => !(Boolean(inbound.fromIsLid) && n === inbound.from))
        .filter((n) => !selfSet.has(n))
        .filter((n) => n.length >= 10 && n.length <= 15);

      const jidCandidates = (inbound.jidCandidates || [])
        .map((v) => String(v || "").trim())
        .filter((v, i, arr) => v && arr.indexOf(v) === i)
        .filter((v) => /@(lid|s\.whatsapp\.net|c\.us)$/i.test(v))
        .filter((v) => !selfSet.has(normalizePhone(v)));

      void evolutionService.sendTypingPresenceBatch(outboundInstance, [
        ...toCandidates,
        ...jidCandidates,
        String(inbound.from || ""),
      ]);

      const sendTextAndDocs = async (replyText: string, docs: Array<{ base64: string; fileName: string; mimetype: string; caption?: string }>) => {
        let sentTo = "";
        for (const to of toCandidates) {
          try {
            await evolutionService.sendMessage(outboundInstance, to, withAvaSignature(enforceWhatsAppDelivery(replyText, text)));
            sentTo = to;
            break;
          } catch {
            continue;
          }
        }
        if (!sentTo) {
          for (const jid of jidCandidates) {
            try {
              await evolutionService.sendMessageToJid(outboundInstance, jid, withAvaSignature(enforceWhatsAppDelivery(replyText, text)));
              sentTo = jid;
              break;
            } catch {
              continue;
            }
          }
        }
        if (!sentTo) return false;
        const docDestinations = [
          sentTo,
          ...toCandidates,
          ...jidCandidates,
        ]
          .map((v) => String(v || "").trim())
          .filter((v, i, arr) => v && arr.indexOf(v) === i);
        for (const d of docs) {
          const docFile = String(d.fileName || "").toLowerCase();
          const docCaption = String(d.caption || "").toLowerCase();
          const isQuoteDoc = /cotiz|quote/.test(docFile) || /cotiz|quote/.test(docCaption);
          let deliveredDoc = false;
          for (const dst of docDestinations) {
            try {
              await evolutionService.sendDocument(outboundInstance, dst, {
                base64: d.base64,
                fileName: safeFileName(d.fileName, isQuoteDoc ? "cotizacion" : "ficha-tecnica", "pdf"),
                caption: d.caption || (isQuoteDoc ? "Cotización" : "Ficha técnica"),
                mimetype: d.mimetype || "application/pdf",
              });
              deliveredDoc = true;
              break;
            } catch {
              continue;
            }
          }
          if (!deliveredDoc) {
            await evolutionService.sendMessage(
              outboundInstance,
              sentTo,
              isQuoteDoc
                ? "Intenté enviarte la cotización PDF, pero falló en este intento. Si escribes 'reenviar cotizacion', la reintento ahora mismo."
                : "Intenté enviarte la ficha técnica, pero falló en este intento. Escribe 'reenviar ficha' y lo reintento ahora mismo."
            );
            break;
          }
        }
        return true;
      };

      const mutedUntilIso = String(previousMemory?.offtopic_muted_until || "").trim();
      const mutedUntilMs = Date.parse(mutedUntilIso);
      if (Number.isFinite(mutedUntilMs) && mutedUntilMs > Date.now()) {
        strictMemory.offtopic_muted_until = mutedUntilIso;
        strictMemory.offtopic_count = Math.max(3, Number(previousMemory?.offtopic_count || 3));
        try {
          const strictClosed = String(strictMemory.conversation_status || "") === "closed";
          const strictQuoteContext =
            Boolean(strictMemory.last_quote_draft_id || previousMemory?.last_quote_draft_id || previousMemory?.last_quote_pdf_sent_at) ||
            /(quote_generated|quote_recall|price_request)/.test(String(strictMemory.last_intent || previousMemory?.last_intent || ""));
          const strictNextAction = strictClosed
            ? (strictQuoteContext ? "Recordatorio feedback cotizacion" : "Seguimiento WhatsApp")
            : (strictQuoteContext ? "Seguimiento cotizacion" : "");
          const strictNextActionAt = strictClosed
            ? (strictQuoteContext ? isoAfterHours(24) : isoAfterHours(48))
            : (strictQuoteContext ? isoAfterHours(24) : "");
          const strictMeetingAt = String(strictMemory.advisor_meeting_at || "").trim();
          await upsertCrmLifecycleState(supabase as any, {
            ownerId,
            tenantId: (agent as any)?.tenant_id || null,
            phone: inbound.from,
            realPhone: String(strictMemory.customer_phone || previousMemory?.customer_phone || ""),
            name: knownCustomerName || inbound.pushName || "",
            status: strictQuoteContext ? "quote" : undefined,
            nextAction: strictMeetingAt ? "Llamar cliente (cita WhatsApp)" : (strictNextAction || undefined),
            nextActionAt: strictMeetingAt || strictNextActionAt || undefined,
            metadata: {
              source: "evolution_strict_webhook",
              conversation_status: String(strictMemory.conversation_status || "open"),
              last_intent: String(strictMemory.last_intent || ""),
              quote_feedback_due_at: String(strictMemory.quote_feedback_due_at || ""),
              advisor_meeting_at: strictMeetingAt,
              advisor_meeting_label: String(strictMemory.advisor_meeting_label || ""),
            },
          });
          if (strictMeetingAt) {
            await mirrorAdvisorMeetingToAvanza({
              ownerId,
              tenantId: (agent as any)?.tenant_id || null,
              externalRef: String(inbound.messageId || incomingDedupKey || "muted"),
              phone: inbound.from,
              customerName: knownCustomerName || inbound.pushName || inbound.from,
              advisor: "Asesor comercial",
              meetingAt: strictMeetingAt,
              meetingLabel: String(strictMemory.advisor_meeting_label || ""),
              source: "evolution_strict_webhook",
            });
          }

          await persistConversationTurn(supabase as any, {
            agentId: String(agent.id),
            ownerId,
            tenantId: (agent as any)?.tenant_id || null,
            from: inbound.from,
            pushName: inbound.pushName,
            contactName: knownCustomerName || inbound.pushName || inbound.from,
            inboundText: inbound.text,
            outboundText: "",
            messageId: inbound.messageId,
            memory: strictMemory,
          });
        } catch {}
        await supabase
          .from("incoming_messages")
          .update({ status: "processed", processed_at: new Date().toISOString() })
          .eq("provider", "evolution")
          .eq("provider_message_id", incomingDedupKey);
        return NextResponse.json({ ok: true, ignored: true, reason: "muted_offtopic" });
      }

      // Hard guardrail: never answer outside OHAUS scope.
      const outOfScope = /\b(autos?|carros?|vehiculos?|motos?|bicicletas?|inmueble|casa|apartamento|hipoteca|pan|leche|carne|fruta|verdura|comida|almuerzo|cena|desayuno|restaurante|pizza|hamburguesa|helado)\b/.test(textNorm);
      const offTopicCandidate =
        outOfScope &&
        !awaiting &&
        !explicitModel &&
        !categoryIntent &&
        !technicalSpecIntent &&
        !wantsQuote &&
        !wantsSheet &&
        !isGreeting &&
        !isOptionOnlyReply(text);
      if (offTopicCandidate) {
        const count = Math.min(10, Number(previousMemory?.offtopic_count || 0) + 1);
        strictMemory.offtopic_count = count;
        strictMemory.awaiting_action = "none";
        if (count >= 3) {
          const mutedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
          strictMemory.offtopic_muted_until = mutedUntil;
          strictReply = "Este canal es solo para cotizar balanzas y analizadores de humedad OHAUS. Pauso este chat 15 minutos por mensajes fuera de catálogo.";
        } else if (count === 2) {
          strictReply = "Solo manejo catálogo OHAUS de balanzas y analizadores de humedad. Responde 1) Balanzas 2) Humedad o escribe modelo (PX85, AX85, MB120).";
        } else {
          strictReply = "No manejo ese tipo de producto. Solo te ayudo con balanzas y analizadores de humedad OHAUS. Responde 1) Balanzas 2) Humedad.";
        }
      } else {
        strictMemory.offtopic_count = 0;
        strictMemory.offtopic_muted_until = "";
      }

      if (!String(strictReply || "").trim() && isGreeting && !explicitModel && !categoryIntent && !wantsQuote && !wantsSheet) {
        strictMemory.awaiting_action = "none";
        strictMemory.pending_product_options = [];
        strictMemory.pending_family_options = [];
        strictMemory.strict_model_offset = 0;
        strictMemory.strict_family_label = "";
        strictReply = buildCommercialWelcomeMessage();
        strictMemory.commercial_welcome_sent = true;
      } else if (!String(strictReply || "").trim() && awaiting === "strict_need_spec") {
        const parsed = parseLooseTechnicalHint(text);
        const capacityRange = parseCapacityRangeHint(text);
        const asksCategoryMenuNow = isExplicitFamilyMenuAsk(text);
        const merged = mergeLooseSpecWithMemory(
          {
            capacityG: Number(previousMemory?.strict_partial_capacity_g || previousMemory?.strict_filter_capacity_g || 0),
            readabilityG: Number(previousMemory?.strict_partial_readability_g || previousMemory?.strict_filter_readability_g || 0),
          },
          parsed
        );
        const cap = Number(merged.capacityG || 0);
        const read = Number(merged.readabilityG || 0);
        strictMemory.strict_partial_capacity_g = cap > 0 ? cap : "";
        strictMemory.strict_partial_readability_g = read > 0 ? read : "";

        const guidedProfileInNeedStep = detectGuidedBalanzaProfile(text);
        if (guidedProfileInNeedStep) {
          const options = buildGuidedPendingOptions(ownerRows as any[], guidedProfileInNeedStep);
          strictMemory.pending_product_options = options;
          strictMemory.pending_family_options = [];
          strictMemory.awaiting_action = options.length ? "strict_choose_model" : "strict_need_spec";
          strictMemory.last_category_intent = "balanzas";
          strictMemory.guided_balanza_profile = guidedProfileInNeedStep;
          strictReply = buildGuidedBalanzaReply(guidedProfileInNeedStep);
        }

        if (!String(strictReply || "").trim() && !(cap > 0) && !(read > 0)) {
          const asksPrecisionOptionsNow =
            /(balanzas?\s+de\s+precisi[oó]n|balanzas?\s+precision|de\s+precisi[oó]n|balanzas?\s+de\s+alta\s+precisi[oó]n)/.test(textNorm) ||
            (/precisi[oó]n/.test(textNorm) && /(opciones?|alternativas?|muestrame|mu[eé]strame|dame|quiero|tienes?)/.test(textNorm));
          if (asksPrecisionOptionsNow) {
            const precisionRows = scopeCatalogRows(ownerRows as any[], "balanzas_precision");
            const options = buildNumberedProductOptions(precisionRows as any[], 8);
            if (options.length) {
              strictMemory.pending_product_options = options;
              strictMemory.pending_family_options = [];
              strictMemory.awaiting_action = "strict_choose_model";
              strictMemory.strict_model_offset = 0;
              strictMemory.last_category_intent = "balanzas_precision";
              strictReply = [
                `Claro. Tengo ${precisionRows.length} balanza(s) de precisión activas en base de datos.`,
                ...options.slice(0, 4).map((o) => `${o.code}) ${o.name}`),
                "",
                "Elige con letra o número (A/1), o escribe 'más'.",
              ].join("\n");
            }
          }

          if (!String(strictReply || "").trim()) {
          if (asksCategoryMenuNow) {
            const requestedCategoryForMenu = detectCatalogCategoryIntent(text);
            const rowsForMenu = requestedCategoryForMenu
              ? scopeCatalogRows(ownerRows as any, requestedCategoryForMenu)
              : (ownerRows as any[]);
            const families = buildNumberedFamilyOptions(rowsForMenu as any[], 8);
            strictMemory.pending_family_options = families;
            strictMemory.pending_product_options = [];
            strictMemory.awaiting_action = "strict_choose_family";
            strictMemory.strict_family_label = "";
            if (requestedCategoryForMenu) strictMemory.last_category_intent = requestedCategoryForMenu;
            strictReply = families.length
              ? [
                  "Claro. Estas son las familias/categorías activas que sí tengo en catálogo:",
                  ...families.map((f) => `${f.code}) ${f.label} (${f.count})`),
                  "",
                  "Elige una con letra o número (A/1) y te muestro opciones compatibles.",
                ].join("\n")
              : "En este momento no tengo familias activas para mostrar en el catálogo.";
          }
          }
          if (!String(strictReply || "").trim()) {
          const asksAlternativesNow = /\b(alternativas?|opciones?)\b/.test(textNorm) || /(dame|muestrame|mu[eé]strame|quiero)\s+.*(alternativas?|opciones?)/.test(textNorm);
          const rememberedCap = Number(previousMemory?.strict_filter_capacity_g || previousMemory?.strict_partial_capacity_g || 0);
          const rememberedRead = Number(previousMemory?.strict_filter_readability_g || previousMemory?.strict_partial_readability_g || 0);
          if (asksAlternativesNow && rememberedCap > 0 && rememberedRead > 0) {
            const prioritized = prioritizeTechnicalRows(baseScoped as any[], {
              capacityG: rememberedCap,
              readabilityG: rememberedRead,
            });
            const compatibleRows = filterReasonableTechnicalRows((prioritized.orderedRows.length ? prioritized.orderedRows : baseScoped as any[]) as any[], {
              capacityG: rememberedCap,
              readabilityG: rememberedRead,
            });
            const options = buildNumberedProductOptions((compatibleRows || []) as any[], 8);
            if (options.length) {
              strictMemory.pending_product_options = options;
              strictMemory.pending_family_options = [];
              strictMemory.awaiting_action = "strict_choose_model";
              strictMemory.strict_model_offset = 0;
              strictMemory.strict_filter_capacity_g = rememberedCap;
              strictMemory.strict_filter_readability_g = rememberedRead;
              strictReply = [
                `Perfecto. Para ${formatSpecNumber(rememberedCap)} g x ${formatSpecNumber(rememberedRead)} g, estas son alternativas reales del catálogo:`,
                ...options.slice(0, 3).map((o) => `${o.code}) ${o.name}`),
                "",
                "Elige con letra o número (A/1), o escribe 'más'.",
              ].join("\n");
            } else {
              const nearbyRows = filterNearbyTechnicalRows((prioritized.orderedRows.length ? prioritized.orderedRows : baseScoped as any[]) as any[], {
                capacityG: rememberedCap,
                readabilityG: rememberedRead,
              });
              const nearbyOptions = buildNumberedProductOptions((nearbyRows || []).slice(0, 8) as any[], 8);
              if (nearbyOptions.length) {
                strictMemory.pending_product_options = nearbyOptions;
                strictMemory.pending_family_options = [];
                strictMemory.awaiting_action = "strict_choose_model";
                strictMemory.strict_model_offset = 0;
                strictMemory.strict_filter_capacity_g = rememberedCap;
                strictMemory.strict_filter_readability_g = rememberedRead;
                strictReply = [
                  `Para ${formatSpecNumber(rememberedCap)} g x ${formatSpecNumber(rememberedRead)} g no tengo coincidencia realmente compatible.`,
                  "Te comparto las más cercanas disponibles para que compares:",
                  ...nearbyOptions.slice(0, 3).map((o) => `${o.code}) ${o.name}`),
                  "",
                  "Elige una opción (A/1), o ajustamos capacidad/resolución.",
                ].join("\n");
              } else {
                strictMemory.pending_product_options = [];
                strictMemory.awaiting_action = "strict_need_spec";
                strictMemory.strict_filter_capacity_g = rememberedCap;
                strictMemory.strict_filter_readability_g = rememberedRead;
                strictReply = `Para ${formatSpecNumber(rememberedCap)} g x ${formatSpecNumber(rememberedRead)} g no tengo alternativas realmente compatibles en el catálogo activo. Si quieres, ajustamos capacidad/resolución o te propongo otra categoría.`;
              }
            }
          }
          }
          if (!String(strictReply || "").trim()) {
          if (capacityRange) {
            const rangedRows = filterRowsByCapacityRange(baseScoped as any[], capacityRange);
            const options = buildNumberedProductOptions(rangedRows.slice(0, 8) as any[], 8);
            if (options.length) {
              strictMemory.pending_product_options = options;
              strictMemory.pending_family_options = [];
              strictMemory.awaiting_action = "strict_choose_model";
              strictMemory.strict_model_offset = 0;
              strictReply = [
                `Perfecto, te entendí un rango de capacidad (${formatSpecNumber(capacityRange.minG)} g a ${Number.isFinite(capacityRange.maxG) ? `${formatSpecNumber(capacityRange.maxG)} g` : "en adelante"}).`,
                ...options.slice(0, 4).map((o) => `${o.code}) ${o.name}`),
                "",
                "Responde con letra o número (A/1), o envíame también la resolución objetivo para afinar más.",
              ].join("\n");
            } else {
              strictReply = "No encontré referencias activas para ese rango de capacidad en el catálogo actual. Si quieres, te muestro alternativas cercanas.";
              strictMemory.awaiting_action = "strict_need_spec";
            }
          } else {
            strictReply = buildBalanzaQualificationPrompt();
            strictMemory.awaiting_action = "strict_need_spec";
          }
          }
        } else if (read > 0 && !(cap > 0)) {
          strictReply = [
            `Perfecto, ya tengo la precisión (${formatSpecNumber(read)} g).`,
            "Para recomendarte bien, ¿qué capacidad aproximada necesitas?",
            "Opciones rápidas: 500 g, 2 kg, 4.2 kg.",
          ].join("\n");
          strictMemory.awaiting_action = "strict_need_spec";
        } else if (cap > 0 && !(read > 0)) {
          const currentCategory = normalizeText(String(rememberedCategory || previousMemory?.last_category_intent || detectCatalogCategoryIntent(text) || ""));
          const scopedForFast = currentCategory ? scopeCatalogRows(ownerRows as any[], currentCategory) : ownerRows;
          if (currentCategory === "basculas" && Array.isArray(scopedForFast) && scopedForFast.length > 0 && scopedForFast.length <= 4) {
            const rankedCap = rankCatalogByCapacityOnly(scopedForFast as any[], cap);
            const rankedRows = rankedCap.length ? rankedCap.map((x: any) => x.row) : scopedForFast;
            const options = buildNumberedProductOptions((rankedRows || []).slice(0, 8) as any[], 8);
            strictMemory.pending_product_options = options;
            strictMemory.pending_family_options = [];
            strictMemory.awaiting_action = "strict_choose_model";
            strictMemory.strict_model_offset = 0;
            strictMemory.strict_partial_capacity_g = cap;
            strictMemory.strict_filter_capacity_g = cap;
            strictReply = [
              `Perfecto. Para básculas activas, en este momento manejo ${options.length} modelo(s).`,
              ...options.map((o) => `${o.code}) ${o.name}`),
              "",
              "Elige una con letra/número (A/1) y te envío ficha o cotización.",
            ].join("\n");
          } else {
            strictReply = [
              `Perfecto, ya tengo la capacidad (${formatSpecNumber(cap)} g).`,
              "Ahora dime la resolución/precisión objetivo.",
              "Opciones comunes: 1 g, 0.1 g, 0.01 g, 0.001 g.",
            ].join("\n");
            strictMemory.awaiting_action = "strict_need_spec";
          }
        } else {
          if (!(cap > 0) || !(read > 0)) {
            strictMemory.awaiting_action = "strict_need_spec";
            strictReply = [
              "No entiendo tu solicitud técnica todavía.",
              "Por favor repite con formato válido: capacidad x resolución (ej.: 3000 g x 0.01 g) o modelo exacto.",
            ].join("\n");
          }
          if (!String(strictReply || "").trim()) {
          strictMemory.strict_spec_query = `${formatSpecNumber(cap)} g x ${formatSpecNumber(read)} g`;
          strictMemory.strict_filter_capacity_g = Number(cap || 0);
          strictMemory.strict_filter_readability_g = Number(read || 0);
          strictMemory.strict_partial_capacity_g = "";
          strictMemory.strict_partial_readability_g = "";
          const exactRows = getExactTechnicalMatches(baseScoped as any[], { capacityG: cap, readabilityG: read });
          if (exactRows.length) {
            const options = buildNumberedProductOptions(exactRows.slice(0, 8) as any[], 8);
            strictMemory.pending_product_options = options;
            strictMemory.pending_family_options = [];
            strictMemory.awaiting_action = "strict_choose_model";
            strictMemory.strict_model_offset = 0;
            strictReply = [
              `Sí, tengo coincidencias exactas para ${strictMemory.strict_spec_query}.`,
              ...options.slice(0, 3).map((o) => `${o.code}) ${o.name}`),
              "",
              "Responde con letra o número y te envío ficha técnica o cotización.",
            ].join("\n");
          } else {
            const prioritized = prioritizeTechnicalRows(baseScoped as any[], { capacityG: cap, readabilityG: read });
            const compatibleRows = filterReasonableTechnicalRows((prioritized.orderedRows || []) as any[], { capacityG: cap, readabilityG: read });
            const options = buildNumberedProductOptions((compatibleRows || []).slice(0, 8) as any[], 8);
            strictMemory.pending_product_options = options;
            strictMemory.pending_family_options = [];
            strictMemory.awaiting_action = "strict_choose_model";
            strictMemory.strict_model_offset = 0;
            if (!options.length) {
              strictMemory.pending_product_options = [];
              strictMemory.awaiting_action = "strict_need_spec";
              strictReply = `Para ${strictMemory.strict_spec_query} no tengo opciones realmente compatibles en el catálogo activo. Si quieres, ajustamos capacidad/resolución o te propongo otra categoría.`;
            } else {
              strictReply = [
                `No encontré coincidencia exacta para ${strictMemory.strict_spec_query}.`,
                "Sí tengo estas opciones cercanas:",
                ...options.slice(0, 3).map((o) => `${o.code}) ${o.name}`),
                "",
                "Si quieres, elige una opción o te ayudo a ajustar la especificación.",
              ].join("\n");
            }
          }
          }
        }
      } else if (!String(strictReply || "").trim() && awaiting === "strict_need_industry") {
        const industry = String(text || "").trim();
        if (industry.length < 3 || /^(si|ok|listo|dale|de una)$/i.test(industry)) {
          strictReply = "Para recomendarte el mejor modelo, dime el uso o industria (ej.: laboratorio alimentos, control de calidad, bodega).";
          strictMemory.awaiting_action = "strict_need_industry";
        } else {
          strictMemory.strict_industry = industry;
          const specParsed = parseTechnicalSpecQuery(prevSpecQuery || String(strictMemory.strict_spec_query || ""));
          const ranked = specParsed
            ? rankCatalogByTechnicalSpec(baseScoped as any[], { capacityG: specParsed.capacityG, readabilityG: specParsed.readabilityG })
            : [];
          const recommendedRows = (ranked.length ? ranked.map((r: any) => r.row) : baseScoped).slice(0, 8);
          const options = buildNumberedProductOptions(recommendedRows as any[], 8);
          strictMemory.pending_product_options = options;
          strictMemory.pending_family_options = [];
          strictMemory.awaiting_action = "strict_choose_model";
          strictMemory.strict_model_offset = 0;
          strictReply = [
            `Perfecto. Con ese uso te recomiendo estas opciones${strictMemory.strict_spec_query ? ` para ${String(strictMemory.strict_spec_query)}` : ""}:`,
            ...options.map((o) => `${o.code}) ${o.name}`),
            "",
            "Responde con letra o número (ej.: A o 1).",
          ].join("\n");
        }
      } else if (!String(strictReply || "").trim() && selectedProduct) {
        const selectedName = String(selectedProduct?.name || "").trim();
        const hasSheetCandidate = Boolean(pickBestProductPdfUrl(selectedProduct, text) || pickBestLocalPdfPath(selectedProduct, text));
        const lastRecommendedOptions = (Array.isArray(previousMemory?.pending_product_options) ? previousMemory.pending_product_options : [])
          .slice(0, 8)
          .map((o: any) => ({
            code: String(o?.code || "").trim(),
            rank: Number(o?.rank || 0),
            id: String(o?.id || "").trim(),
            name: String(o?.name || "").trim(),
            raw_name: String(o?.raw_name || o?.name || "").trim(),
            category: String(o?.category || "").trim(),
          }))
          .filter((o: any) => o.name);
        if (lastRecommendedOptions.length) strictMemory.last_recommended_options = lastRecommendedOptions;
        strictMemory.last_product_name = selectedName;
        strictMemory.last_product_id = String(selectedProduct?.id || "").trim();
        strictMemory.last_selected_product_name = selectedName;
        strictMemory.last_selected_product_id = String(selectedProduct?.id || "").trim();
        strictMemory.last_selection_at = new Date().toISOString();
        strictMemory.awaiting_action = "strict_choose_action";
        strictMemory.pending_family_options = [];
        strictMemory.pending_product_options = [];

        if (awaiting === "strict_choose_action" && /^\s*1\b/.test(textNorm)) {
          const qtyRequested = Math.max(1, extractQuoteRequestedQuantity(text) || Number(previousMemory?.quote_quantity || 1) || 1);
          strictMemory.quote_quantity = qtyRequested;
          strictMemory.awaiting_action = "strict_quote_data";
          const quoteMemoryMerged = {
            ...(previousMemory && typeof previousMemory === "object" ? previousMemory : {}),
            ...(strictMemory && typeof strictMemory === "object" ? strictMemory : {}),
            quote_data: {
              ...((previousMemory?.quote_data && typeof previousMemory.quote_data === "object") ? previousMemory.quote_data : {}),
              ...((strictMemory?.quote_data && typeof strictMemory.quote_data === "object") ? strictMemory.quote_data : {}),
            },
          };
          const reusableNow = getReusableBillingData(quoteMemoryMerged);
          strictMemory.quote_data = {
            city: reusableNow.city || String(previousMemory?.crm_billing_city || strictMemory.crm_billing_city || "") || "",
            company: reusableNow.company || String(previousMemory?.crm_company || strictMemory.crm_company || "") || String(previousMemory?.commercial_company_name || strictMemory.commercial_company_name || ""),
            nit: reusableNow.nit || String(previousMemory?.crm_nit || strictMemory.crm_nit || "") || String(previousMemory?.commercial_company_nit || strictMemory.commercial_company_nit || ""),
            contact: reusableNow.contact || String(previousMemory?.crm_contact_name || strictMemory.crm_contact_name || "") || String(previousMemory?.commercial_customer_name || strictMemory.commercial_customer_name || "") || String(previousMemory?.customer_name || strictMemory.customer_name || ""),
            email: reusableNow.email || String(previousMemory?.crm_contact_email || strictMemory.crm_contact_email || "") || String(previousMemory?.customer_email || strictMemory.customer_email || ""),
            phone: reusableNow.phone || String(previousMemory?.crm_contact_phone || strictMemory.crm_contact_phone || "") || normalizePhone(String(previousMemory?.customer_phone || strictMemory.customer_phone || inbound.from || "")),
          };
          strictMemory.strict_autorun_quote_with_reuse = true;
        }

        const rawAnotherQuoteChoice = awaiting === "strict_choose_action" ? parseAnotherQuoteChoice(text) : null;
        let followupIntent = awaiting === "strict_choose_action" ? detectAlternativeFollowupIntent(text) : null;
        const asksAnotherQuote = awaiting === "strict_choose_action" && isAnotherQuoteAmbiguousIntent(text);
        const anotherQuoteContext = asksAnotherQuote || /\b(otra\s+cotiz|nueva\s+cotiz|recotiz|re\s*cotiz|otra\s+propuesta)\b/.test(textNorm);
        const anotherQuoteChoice = anotherQuoteContext ? rawAnotherQuoteChoice : null;
        const technicalHintInAction = awaiting === "strict_choose_action" ? parseLooseTechnicalHint(text) : null;
        const technicalCapInAction = Number((technicalHintInAction as any)?.capacityG || 0);
        const technicalReadInAction = Number((technicalHintInAction as any)?.readabilityG || 0);
        const categoryIntentInAction = awaiting === "strict_choose_action" ? detectCatalogCategoryIntent(text) : null;
        const appHintInAction = awaiting === "strict_choose_action" ? detectTargetApplication(text) : "";
        const asksApplicationRecommendationsNow = awaiting === "strict_choose_action" && /^(si|sí|si\s+por\s+favor|sí\s+por\s+favor|por\s+favor|dale|ok|de\s+una)$/.test(textNorm);
        const currentCategoryInAction = normalizeText(String(rememberedCategory || previousMemory?.last_category_intent || ""));
        const isCategorySwitchInAction = Boolean(
          categoryIntentInAction && normalizeText(String(categoryIntentInAction || "")) !== currentCategoryInAction
        );

        if (!String(strictReply || "").trim() && awaiting === "strict_choose_action" && (appHintInAction || (asksApplicationRecommendationsNow && String(previousMemory?.target_application || "").trim())) && !wantsQuote && !wantsSheet && !(technicalCapInAction > 0 || technicalReadInAction > 0)) {
          const effectiveApp = appHintInAction || String(previousMemory?.target_application || "").trim();
          strictMemory.target_application = effectiveApp;
          strictMemory.target_industry = effectiveApp === "joyeria_oro" ? "joyeria" : effectiveApp;
          const selectedSpec = extractRowTechnicalSpec(selectedProduct);
          const selectedRead = Number(selectedSpec?.readabilityG || 0);
          const maxRead = maxReadabilityForApplication(effectiveApp);
          const selectedIsCompatible = selectedRead > 0 && selectedRead <= maxRead;

          if (selectedIsCompatible) {
            strictReply = [
              `Sí, ${selectedName} puede servir para ${effectiveApp.replace(/_/g, " ")} por precisión (${formatSpecNumber(selectedRead)} g).`,
              "Si quieres, seguimos con 1) cotización o 2) ficha técnica.",
            ].join("\n");
          } else {
            const categoryScoped = rememberedCategory ? scopeCatalogRows(ownerRows as any, rememberedCategory) : ownerRows;
            const capTarget = Number(previousMemory?.strict_filter_capacity_g || selectedSpec?.capacityG || 0);
            const rowsByRead = categoryScoped
              .filter((r: any) => {
                const rs = extractRowTechnicalSpec(r);
                const rr = Number(rs?.readabilityG || 0);
                return rr > 0 && rr <= maxRead;
              })
              .sort((a: any, b: any) => {
                const ar = Number(extractRowTechnicalSpec(a)?.readabilityG || 999);
                const br = Number(extractRowTechnicalSpec(b)?.readabilityG || 999);
                const ac = Number(extractRowTechnicalSpec(a)?.capacityG || 0);
                const bc = Number(extractRowTechnicalSpec(b)?.capacityG || 0);
                const ad = capTarget > 0 ? Math.abs(ac - capTarget) : 0;
                const bd = capTarget > 0 ? Math.abs(bc - capTarget) : 0;
                return ad - bd || ar - br;
              });
            const options = buildNumberedProductOptions(rowsByRead.slice(0, 8) as any[], 8);
            if (options.length) {
              strictMemory.pending_product_options = options;
              strictMemory.pending_family_options = [];
              strictMemory.awaiting_action = "strict_choose_model";
              strictMemory.strict_model_offset = 0;
              strictReply = [
                `No del todo: ${selectedName} no es ideal para ${effectiveApp.replace(/_/g, " ")} por su precisión (${formatSpecNumber(selectedRead || 0)} g).`,
                "Estas opciones sí son más adecuadas para ese uso:",
                ...options.slice(0, 3).map((o) => `${o.code}) ${o.name}`),
                "",
                "Elige una con letra/número (A/1), o escribe 'más'.",
              ].join("\n");
            } else {
              strictReply = `No del todo: ${selectedName} no es ideal para ${effectiveApp.replace(/_/g, " ")} y no veo opciones activas con esa precisión en este grupo. Si quieres, ajustamos capacidad/resolución.`;
            }
          }
        }

        if (awaiting === "strict_choose_action" && !followupIntent && !wantsQuote && !wantsSheet) {
          if (/(no\s+me\s+sirve|no\s+quiero\s+este|otra\s+opcion|otra\s+opción|que\s+otra|qué\s+otra|recomiendame\s+otra|recomiéndame\s+otra|me\s+ofreces\s+otra|me\s+puedes\s+ofrecer\s+otra)/.test(textNorm)) {
            followupIntent = "alternative_same_need";
          }
        }
        if (awaiting === "strict_choose_action" && !followupIntent && !wantsSheet) {
          if (/\b(menor\s+precio|m[aá]s\s+barat|mas\s+barat|econ[oó]mic|economica|economicas)\b/.test(textNorm)) {
            followupIntent = "alternative_lower_price";
          }
        }

        if (awaiting === "strict_choose_action" && (technicalCapInAction > 0 || technicalReadInAction > 0) && !wantsQuote && !wantsSheet) {
          const mergedTechnical = mergeLooseSpecWithMemory(
            {
              capacityG: Number(previousMemory?.strict_filter_capacity_g || previousMemory?.strict_partial_capacity_g || 0),
              readabilityG: Number(previousMemory?.strict_filter_readability_g || previousMemory?.strict_partial_readability_g || 0),
            },
            technicalHintInAction
          );
          const mergedCap = Number(mergedTechnical.capacityG || 0);
          const mergedRead = Number(mergedTechnical.readabilityG || 0);
          strictMemory.strict_partial_capacity_g = mergedCap > 0 ? mergedCap : "";
          strictMemory.strict_partial_readability_g = mergedRead > 0 ? mergedRead : "";
          if (mergedCap > 0 && !(mergedRead > 0)) {
            strictMemory.awaiting_action = "strict_need_spec";
            strictReply = [
              `Perfecto, ya tengo la capacidad (${formatSpecNumber(mergedCap)} g).`,
              "Ahora dime la resolución/precisión objetivo.",
              "Opciones comunes: 1 g, 0.1 g, 0.01 g, 0.001 g.",
            ].join("\n");
          } else if (mergedRead > 0 && !(mergedCap > 0)) {
            strictMemory.awaiting_action = "strict_need_spec";
            strictReply = [
              `Perfecto, ya tengo la precisión (${formatSpecNumber(mergedRead)} g).`,
              "Para recomendarte bien, ¿qué capacidad aproximada necesitas?",
              "Opciones rápidas: 500 g, 2 kg, 4.2 kg.",
            ].join("\n");
          } else if (mergedCap > 0 && mergedRead > 0) {
            strictMemory.strict_spec_query = `${formatSpecNumber(mergedCap)} g x ${formatSpecNumber(mergedRead)} g`;
            strictMemory.strict_filter_capacity_g = mergedCap;
            strictMemory.strict_filter_readability_g = mergedRead;
            strictMemory.strict_partial_capacity_g = "";
            strictMemory.strict_partial_readability_g = "";
            const exactRows = getExactTechnicalMatches(baseScoped as any[], { capacityG: mergedCap, readabilityG: mergedRead });
            const prioritized = prioritizeTechnicalRows(baseScoped as any[], { capacityG: mergedCap, readabilityG: mergedRead });
            const options = buildNumberedProductOptions((exactRows.length ? exactRows : (prioritized.orderedRows || [])).slice(0, 8) as any[], 8);
            strictMemory.pending_product_options = options;
            strictMemory.pending_family_options = [];
            strictMemory.awaiting_action = "strict_choose_model";
            strictMemory.strict_model_offset = 0;
            strictReply = [
              exactRows.length
                ? `Sí, tengo coincidencias exactas para ${strictMemory.strict_spec_query}.`
                : `No encontré coincidencia exacta para ${strictMemory.strict_spec_query}.`,
              exactRows.length ? "Te comparto las opciones exactas:" : "Sí tengo estas opciones cercanas:",
              ...options.slice(0, 3).map((o) => `${o.code}) ${o.name}`),
              "",
              "Elige con letra o número (A/1), o escribe 'más'.",
            ].join("\n");
          }
        } else if (awaiting === "strict_choose_action" && isCategorySwitchInAction) {
          const scoped = scopeCatalogRows(ownerRows as any, String(categoryIntentInAction || ""));
          const families = buildNumberedFamilyOptions(scoped as any[], 8);
          strictMemory.last_category_intent = String(categoryIntentInAction || "");
          strictMemory.pending_product_options = [];
          strictMemory.pending_family_options = families;
          strictMemory.awaiting_action = "strict_choose_family";
          strictReply = families.length
            ? [
              `Perfecto, cambiamos la búsqueda a ${String(categoryIntentInAction || "catálogo").replace(/_/g, " ")}.`,
              "Elige familia:",
              ...families.map((o) => `${o.code}) ${o.label} (${o.count})`),
              "",
              "Responde con letra o número (A/1).",
            ].join("\n")
            : `Entiendo el cambio. En base de datos no tengo referencias activas para ${String(categoryIntentInAction || "esa categoría").replace(/_/g, " ")} en este momento.`;
        } else if (awaiting === "strict_choose_action" && asksAnotherQuote && !anotherQuoteChoice && !followupIntent && !wantsSheet) {
          strictReply = buildAnotherQuotePrompt();
        } else if (awaiting === "strict_choose_action" && anotherQuoteChoice === "advisor") {
          strictReply = buildAdvisorMiniAgendaPrompt();
          strictMemory.awaiting_action = "advisor_meeting_slot";
        } else if (awaiting === "strict_choose_action" && anotherQuoteChoice === "same_model") {
          const qtyRequested = Math.max(1, extractQuoteRequestedQuantity(text) || Number(previousMemory?.quote_quantity || 1) || 1);
          strictMemory.quote_quantity = qtyRequested;
          strictMemory.awaiting_action = "strict_quote_data";
          strictReply = buildQuoteDataIntakePrompt(
            `Perfecto. Preparo una nueva cotización para ${selectedName} (${qtyRequested} unidad(es)).`,
            strictMemory
          );
        } else if (awaiting === "strict_choose_action" && anotherQuoteChoice === "other_model") {
          followupIntent = "alternative_same_need";
        } else if (awaiting === "strict_choose_action" && anotherQuoteChoice === "cheaper") {
          followupIntent = "alternative_lower_price";
        }

        if (!String(strictReply || "").trim() && awaiting === "strict_choose_action" && followupIntent && !wantsSheet) {
          if (followupIntent === "requote_same_model") {
            const qtyRequested = Math.max(1, extractQuoteRequestedQuantity(text) || Number(previousMemory?.quote_quantity || 1) || 1);
            strictMemory.quote_quantity = qtyRequested;
            strictMemory.awaiting_action = "strict_quote_data";
            strictReply = buildQuoteDataIntakePrompt(
              `Perfecto. Preparo una nueva cotización para ${selectedName} (${qtyRequested} unidad(es)).`,
              strictMemory
            );
          } else {
            const selectedId = String(selectedProduct?.id || "").trim();
            const selectedNorm = normalizeText(selectedName);
            const selectedSpec = extractRowTechnicalSpec(selectedProduct);
            const selectedBrand = normalizeText(String(selectedProduct?.brand || ""));
            const familyLabel = String(previousMemory?.strict_family_label || familyLabelFromRow(selectedProduct) || "").trim();
            const categoryScoped = rememberedCategory ? scopeCatalogRows(ownerRows as any, rememberedCategory) : ownerRows;
            const familyScoped = familyLabel
              ? categoryScoped.filter((r: any) => normalizeText(familyLabelFromRow(r)) === normalizeText(familyLabel))
              : categoryScoped;
            const basePoolRaw = (familyScoped.length >= 3 ? familyScoped : categoryScoped) as any[];
            const basePool = basePoolRaw.filter((r: any) => {
              const rid = String(r?.id || "").trim();
              const rname = normalizeText(String(r?.name || ""));
              if (selectedId && rid && selectedId === rid) return false;
              if (!selectedId && selectedNorm && rname && selectedNorm === rname) return false;
              return true;
            });

            const byPriceAsc = (rows: any[]) => {
              return [...rows].sort((a: any, b: any) => {
                const aPrice = Number(a?.base_price_usd || 0);
                const bPrice = Number(b?.base_price_usd || 0);
                if (!(aPrice > 0) && !(bPrice > 0)) return 0;
                if (!(aPrice > 0)) return 1;
                if (!(bPrice > 0)) return -1;
                return aPrice - bPrice;
              });
            };

            let rankedRows = [...basePool];
            let intro = "Claro, aquí tienes alternativas para el mismo uso:";
            const textFollow = normalizeText(String(text || ""));
            const wantsBetterResolution = /(mayor\s+resolucion|mejor\s+resolucion|mas\s+resolucion|más\s+resolucion|mas\s+precision|más\s+precision|mejor\s+precision)/.test(textFollow);
            const wantsLowerResolution = /(menor\s+resolucion|menos\s+precision|menor\s+precision)/.test(textFollow);

            if (followupIntent === "alternative_same_need" && (wantsBetterResolution || wantsLowerResolution)) {
              const readTarget = Number(selectedSpec?.readabilityG || 0);
              if (readTarget > 0) {
                const readRows = basePool
                  .map((r: any) => ({ row: r, read: Number(extractRowTechnicalSpec(r)?.readabilityG || 0) }))
                  .filter((x: any) => x.read > 0)
                  .filter((x: any) => wantsBetterResolution ? x.read < readTarget : x.read > readTarget)
                  .sort((a: any, b: any) => Math.abs(a.read - readTarget) - Math.abs(b.read - readTarget));
                rankedRows = readRows.map((x: any) => x.row);
              }
              intro = wantsBetterResolution
                ? "Perfecto, aquí tienes opciones con mejor resolución (más precisión):"
                : "Perfecto, aquí tienes opciones con menor resolución:";
            } else if (followupIntent === "alternative_lower_price") {
              intro = "Perfecto, aquí tienes opciones más económicas:";
              const selectedPrice = Number(selectedProduct?.base_price_usd || 0);
              const priced = byPriceAsc(basePool).filter((r: any) => Number(r?.base_price_usd || 0) > 0);
              const cheaper = selectedPrice > 0 ? priced.filter((r: any) => Number(r?.base_price_usd || 0) < selectedPrice) : [];
              rankedRows = cheaper.length ? cheaper : priced;
            } else if (followupIntent === "alternative_higher_capacity" || followupIntent === "alternative_lower_capacity") {
              const capTarget = Number(selectedSpec?.capacityG || 0);
              intro = followupIntent === "alternative_higher_capacity"
                ? "Perfecto, aquí tienes opciones de mayor capacidad:"
                : "Perfecto, aquí tienes opciones de menor capacidad:";
              if (capTarget > 0) {
                const capRows = basePool
                  .map((r: any) => ({ row: r, cap: Number(extractRowTechnicalSpec(r)?.capacityG || 0) }))
                  .filter((x: any) => x.cap > 0)
                  .filter((x: any) => followupIntent === "alternative_higher_capacity" ? x.cap > capTarget : x.cap < capTarget)
                  .sort((a: any, b: any) => Math.abs(a.cap - capTarget) - Math.abs(b.cap - capTarget));
                rankedRows = capRows.map((x: any) => x.row);
              }
            } else if (followupIntent === "alternative_other_brand") {
              const otherBrands = basePool.filter((r: any) => {
                const brand = normalizeText(String(r?.brand || ""));
                return brand && selectedBrand && brand !== selectedBrand;
              });
              if (otherBrands.length) {
                rankedRows = otherBrands;
                intro = "Perfecto, aquí tienes alternativas de otra marca:";
              } else {
                intro = "En este canal solo cotizo catálogo OHAUS. Igual te comparto alternativas similares dentro de OHAUS:";
                if (selectedSpec.capacityG > 0 && selectedSpec.readabilityG > 0) {
                  rankedRows = prioritizeTechnicalRows(basePool, {
                    capacityG: selectedSpec.capacityG,
                    readabilityG: selectedSpec.readabilityG,
                  }).orderedRows;
                }
              }
            } else if (selectedSpec.capacityG > 0 && selectedSpec.readabilityG > 0) {
              rankedRows = prioritizeTechnicalRows(basePool, {
                capacityG: selectedSpec.capacityG,
                readabilityG: selectedSpec.readabilityG,
              }).orderedRows;
            }

            const mergedRows: any[] = [];
            const seen = new Set<string>();
            for (const row of [...rankedRows, ...basePool]) {
              const key = String(row?.id || "").trim() || normalizeText(String(row?.name || ""));
              if (!key || seen.has(key)) continue;
              seen.add(key);
              mergedRows.push(row);
              if (mergedRows.length >= 5) break;
            }

            const options = buildNumberedProductOptions(mergedRows as any[], 5);
            if (options.length) {
              strictMemory.pending_product_options = options;
              strictMemory.last_recommended_options = options;
              strictMemory.awaiting_action = "strict_choose_model";
              strictMemory.strict_model_offset = 0;
              strictMemory.strict_family_label = familyLabel;
              strictReply = [
                intro,
                ...options.map((o) => `${o.code}) ${o.name}`),
                "",
                "Elige con letra o número (A/1), o escribe 'más'.",
              ].join("\n");
            } else {
              strictReply = "No encontré alternativas con precio activo en este momento para ese criterio. Si quieres, te muestro el listado completo del grupo.";
            }
          }
        }

        if (!String(strictReply || "").trim() && isUseCaseApplicabilityIntent(text) && !wantsQuote && !wantsSheet) {
          const technicalSummary = buildTechnicalSummary(selectedProduct, 6);
          strictReply = technicalSummary
            ? [
              `Con base en el catálogo/ficha de ${selectedName}, esto es lo que sí tengo confirmado:`,
              technicalSummary,
              "",
              "Para confirmarte si te sirve para ese uso exacto, dime el peso aproximado (mínimo y máximo) y te valido el modelo sin inventar.",
              hasSheetCandidate ? "¿Quieres que te envíe la ficha técnica ahora por este WhatsApp?" : "¿Quieres que te comparta la ficha técnica/disponibilidad por este WhatsApp?",
            ].join("\n")
            : [
              `Puedo ayudarte con ${selectedName}, pero para no inventar necesito validar el uso con el peso aproximado (mínimo y máximo).`,
              hasSheetCandidate ? "¿Quieres que te envíe la ficha técnica ahora por este WhatsApp?" : "¿Quieres que te comparta la información técnica disponible por este WhatsApp?",
            ].join("\n");
        } else if (!String(strictReply || "").trim() && (wantsQuote || /^1\b/.test(textNorm))) {
          const bundleQuoteAskFromAction = asksQuoteIntent(text) && /\b(las|los|todas|todos|opciones|referencias|3|tres)\b/.test(textNorm);
          const effectiveRecommendedPool =
            (Array.isArray(strictMemory?.last_recommended_options) && strictMemory.last_recommended_options.length)
              ? strictMemory.last_recommended_options
              : (lastRecommendedOptions.length
                ? lastRecommendedOptions
                : (Array.isArray(previousMemory?.last_recommended_options) ? previousMemory.last_recommended_options : []));
          const bundlePool = effectiveRecommendedPool
            .filter((o: any) => String(o?.raw_name || o?.name || "").trim())
            .slice(0, 8);
          if (bundleQuoteAskFromAction && bundlePool.length >= 2) {
            const countMatch = textNorm.match(/\b(\d{1,2}|dos|tres|cuatro|cinco)\b/);
            const nWord = String(countMatch?.[1] || "").trim();
            const nMap: Record<string, number> = { dos: 2, tres: 3, cuatro: 4, cinco: 5 };
            const requested = /\b(todas|todos)\b/.test(textNorm)
              ? bundlePool.length
              : Math.max(2, Number(nWord ? (Number(nWord) || nMap[nWord] || 3) : 3));
            const chosen = bundlePool.slice(0, Math.max(2, Math.min(requested, bundlePool.length)));
            const names = chosen.map((o: any) => String(o?.raw_name || o?.name || "").trim()).filter(Boolean);
            if (names.length >= 2) {
              strictBypassAutoQuote = true;
              inbound.text = `cotizar ${names.join(" ; ")}`;
              strictMemory.awaiting_action = "none";
              strictMemory.pending_product_options = chosen;
              strictMemory.quote_bundle_options_current = chosen;
              strictMemory.last_intent = "quote_bundle_request";
              strictMemory.bundle_quote_mode = true;
              strictMemory.bundle_quote_count = names.length;
              strictReply = `Perfecto. Voy a generar una cotización consolidada para esas ${names.length} opciones y te la envío en PDF por este WhatsApp.`;
            }
          }

          if (!strictBypassAutoQuote) {
          const lockedCap = Number(previousMemory?.strict_filter_capacity_g || 0);
          const lockedRead = Number(previousMemory?.strict_filter_readability_g || 0);
          const recommendedPool = effectiveRecommendedPool;
          const selectedFromSuggestedList = recommendedPool.some((o: any) => {
            const oid = String(o?.id || "").trim();
            const oraw = normalizeText(String(o?.raw_name || o?.name || ""));
            return (
              (oid && oid === String(selectedProduct?.id || "").trim()) ||
              (oraw && oraw === normalizeText(selectedName))
            );
          });
          if (lockedCap > 0 && lockedRead > 0 && !selectedFromSuggestedList) {
            const rs = extractRowTechnicalSpec(selectedProduct);
            const capDeltaPct = rs.capacityG > 0 ? (Math.abs(rs.capacityG - lockedCap) / lockedCap) * 100 : 999;
            const readRatio = rs.readabilityG > 0 ? (rs.readabilityG / lockedRead) : 999;
            const compatible = capDeltaPct <= 12 && readRatio >= 0.8 && readRatio <= 1.35;
            if (!compatible) {
              strictReply = `Antes de cotizar, confirmo que ${selectedName} no coincide con tu filtro activo (${formatSpecNumber(lockedCap)} g x ${formatSpecNumber(lockedRead)} g). Elige una opción del listado filtrado (A/1) o escribe 'más'.`;
              strictMemory.awaiting_action = "strict_choose_model";
              strictBypassAutoQuote = false;
            }
          }

          if (!String(strictReply || "").trim()) {
          const continuationIntentStrict = isSameQuoteContinuationIntent(text) && extractModelLikeTokens(text).length >= 1;
          if (continuationIntentStrict) {
            console.log("[evolution-webhook] strict_quote_continuation_bypass", {
              selectedName,
              tokens: extractModelLikeTokens(text),
              text,
            });
            strictBypassAutoQuote = true;
            inbound.text = `cotizar ${selectedName} ${text}`.trim();
            nextMemory.awaiting_action = "quote_product_selection";
            nextMemory.last_product_name = selectedName;
            nextMemory.last_product_id = String(selectedProduct?.id || "").trim();
            nextMemory.last_selected_product_name = selectedName;
            nextMemory.last_selected_product_id = String(selectedProduct?.id || "").trim();
            nextMemory.last_selection_at = new Date().toISOString();
            strictMemory.awaiting_action = "none";
          } else {
            const asksFlowChangeNoDetails = isFlowChangeWithoutModelDetailsIntent(text);
            if (asksFlowChangeNoDetails) {
              strictMemory.awaiting_action = "strict_choose_action";
              strictReply = "Perfecto. Para evitar ambigüedad, indícame primero qué familia o referencias quieres cotizar y la cantidad por cada una (ej: PX85 x1, PX223 x2).";
            } else {
              const qtyRequested = Math.max(1, extractQuoteRequestedQuantity(text) || Number(previousMemory?.quote_quantity || 1) || 1);
              strictMemory.quote_quantity = qtyRequested;
              strictMemory.awaiting_action = "strict_quote_data";
              const quoteMemoryMerged = {
                ...(previousMemory && typeof previousMemory === "object" ? previousMemory : {}),
                ...(strictMemory && typeof strictMemory === "object" ? strictMemory : {}),
                quote_data: {
                  ...((previousMemory?.quote_data && typeof previousMemory.quote_data === "object") ? previousMemory.quote_data : {}),
                  ...((strictMemory?.quote_data && typeof strictMemory.quote_data === "object") ? strictMemory.quote_data : {}),
                },
              };
              const reusableNow = getReusableBillingData(quoteMemoryMerged);
              strictMemory.quote_data = {
                city: reusableNow.city || String(previousMemory?.crm_billing_city || strictMemory.crm_billing_city || "") || "",
                company: reusableNow.company || String(previousMemory?.crm_company || strictMemory.crm_company || "") || String(previousMemory?.commercial_company_name || strictMemory.commercial_company_name || ""),
                nit: reusableNow.nit || String(previousMemory?.crm_nit || strictMemory.crm_nit || "") || String(previousMemory?.commercial_company_nit || strictMemory.commercial_company_nit || ""),
                contact: reusableNow.contact || String(previousMemory?.crm_contact_name || strictMemory.crm_contact_name || "") || String(previousMemory?.commercial_customer_name || strictMemory.commercial_customer_name || "") || String(previousMemory?.customer_name || strictMemory.customer_name || ""),
                email: reusableNow.email || String(previousMemory?.crm_contact_email || strictMemory.crm_contact_email || "") || String(previousMemory?.customer_email || strictMemory.customer_email || ""),
                phone: reusableNow.phone || String(previousMemory?.crm_contact_phone || strictMemory.crm_contact_phone || "") || normalizePhone(String(previousMemory?.customer_phone || strictMemory.customer_phone || inbound.from || "")),
              };
              strictMemory.strict_autorun_quote_with_reuse = true;
            }
          }
          }
          }
        } else if (!String(strictReply || "").trim() && (wantsSheet || /^2\b/.test(textNorm))) {
          const datasheetUrl = pickBestProductPdfUrl(selectedProduct, text) || "";
          const localPdfPath = pickBestLocalPdfPath(selectedProduct, text);
          let attached = false;
          if (datasheetUrl) {
            const remote = await fetchRemoteFileAsBase64(datasheetUrl);
            const remoteLooksPdf = Boolean(remote) && (/application\/pdf/i.test(String(remote?.mimetype || "")) || /\.pdf(\?|$)/i.test(datasheetUrl));
            if (remote && remoteLooksPdf && Number(remote.byteSize || 0) <= MAX_WHATSAPP_DOC_BYTES) {
              strictDocs.push({
                base64: remote.base64,
                fileName: safeFileName(remote.fileName, `ficha-${selectedName}`, "pdf"),
                mimetype: "application/pdf",
                caption: `Ficha técnica - ${selectedName}`,
              });
              attached = true;
            }
          }
          if (!attached && localPdfPath) {
            const local = fetchLocalFileAsBase64(localPdfPath);
            if (local && Number(local.byteSize || 0) <= MAX_WHATSAPP_DOC_BYTES) {
              strictDocs.push({
                base64: local.base64,
                fileName: safeFileName(local.fileName, `ficha-${selectedName}`, "pdf"),
                mimetype: "application/pdf",
                caption: `Ficha técnica - ${selectedName}`,
              });
              attached = true;
            }
          }
          if (attached) {
            strictReply = `Perfecto. Te envío por este WhatsApp la ficha técnica en PDF de ${selectedName}.`;
          } else {
            const technicalSummary = buildTechnicalSummary(selectedProduct, 6);
            strictReply = technicalSummary
              ? [
                `No tengo un PDF válido para ${selectedName} en este momento, pero sí te comparto las especificaciones disponibles en catálogo:`,
                technicalSummary,
                "",
                "Si quieres, te genero la cotización ahora.",
              ].join("\n")
              : `No tengo un PDF válido para ${selectedName} en este momento y tampoco tengo especificaciones completas cargadas para este modelo. Si quieres, te genero la cotización ahora.`;
          }
        } else if (!String(strictReply || "").trim()) {
          if (awaiting === "strict_choose_action" && !wantsQuote && !wantsSheet && !/^\s*[12]\b/.test(textNorm)) {
            const softReply = await buildStrictConversationalReply({
              apiKey,
              inboundText: text,
              awaiting,
              selectedProduct: selectedName,
              categoryHint: rememberedCategory,
              pendingOptions: Array.isArray(previousMemory?.last_recommended_options) ? previousMemory.last_recommended_options : [],
            });
            strictReply = String(softReply || "").trim() || [
              `Entiendo. Si ${selectedName} no te sirve, te puedo proponer alternativas reales del catálogo por:`,
              "- mayor/menor capacidad",
              "- mayor/menor resolución",
              "- más económicas",
              "También puedes escribir 1 para cotizar o 2 para ficha técnica.",
            ].join("\n");
          } else {
          strictReply = hasSheetCandidate
            ? [
              `Perfecto, encontré el modelo ${selectedName}.`,
              "Ahora dime qué deseas con ese modelo:",
              "1) Cotización con TRM y PDF",
              "2) Ficha técnica",
            ].join("\n")
            : [
              `Perfecto, encontré el modelo ${selectedName}.`,
              "Ahora dime qué deseas con ese modelo:",
              "1) Cotización con TRM y PDF",
              "",
              "Nota: este modelo no tiene ficha técnica PDF cargada en este momento.",
            ].join("\n");
          }
        }
      }
      if (
        !String(strictReply || "").trim() &&
        (awaiting === "strict_quote_data" || Boolean(strictMemory?.strict_autorun_quote_with_reuse))
      ) {
        try {
        const quoteTurnText = Boolean(strictMemory?.strict_autorun_quote_with_reuse) ? "mismos datos" : text;
        strictMemory.strict_autorun_quote_with_reuse = false;
        const asksCheapestInQuoteData = /\b(economic|economica|economicas|economico|economicos|mas\s+barat|m[aá]s\s+barat|menor\s+precio|precio\s+bajo)\b/.test(normalizeText(quoteTurnText));
        if (asksCheapestInQuoteData) {
          const scopedForPrice = rememberedCategory
            ? scopeCatalogRows(ownerRows as any[], rememberedCategory)
            : (ownerRows as any[]);
          const pricedRows = (scopedForPrice as any[])
            .filter((r: any) => Number(r?.base_price_usd || 0) > 0)
            .sort((a: any, b: any) => Number(a?.base_price_usd || 0) - Number(b?.base_price_usd || 0));
          const options = buildNumberedProductOptions(pricedRows as any[], 8);
          if (options.length) {
            strictMemory.pending_product_options = options;
            strictMemory.pending_family_options = [];
            strictMemory.awaiting_action = "strict_choose_model";
            strictMemory.strict_model_offset = 0;
            strictMemory.quote_data = {};
            const topRow = pricedRows[0];
            const topFamily = String(familyLabelFromRow(topRow) || "N/A").trim();
            strictReply = [
              `Perfecto. Según base de datos, la familia más económica aquí es: ${topFamily}.`,
              "Estas son 4 opciones de menor precio:",
              ...options.slice(0, 4).map((o) => {
                const p = Number(o.base_price_usd || 0);
                return `${o.code}) ${o.name}${p > 0 ? ` (USD ${formatMoney(p)})` : ""}`;
              }),
              "",
              "Responde con letra o número (A/1).",
            ].join("\n");
          }
        }
        if (!String(strictReply || "").trim()) {
        const followupIntentInQuoteData = detectAlternativeFollowupIntent(quoteTurnText);
        const asksAnotherQuoteInQuoteData = isAnotherQuoteAmbiguousIntent(quoteTurnText);
        const normalizedQuoteData = normalizeText(String(quoteTurnText || "")).replace(/[^a-z0-9\s]/g, " ").trim();
        const isAdvanceInQuoteData = normalizedQuoteData === "avanza";
        const wantsReuseBillingInQuoteData =
          /\bmismos?\s+datos\b/.test(normalizedQuoteData) ||
          /\busar\s+los?\s+mismos?\s+datos\b/.test(normalizedQuoteData) ||
          /\bmisma\s+informacion\b/.test(normalizedQuoteData);
        const reusableBillingInQuoteData = getReusableBillingData({
          ...(previousMemory && typeof previousMemory === "object" ? previousMemory : {}),
          ...(strictMemory && typeof strictMemory === "object" ? strictMemory : {}),
          quote_data: {
            ...((previousMemory?.quote_data && typeof previousMemory.quote_data === "object") ? previousMemory.quote_data : {}),
            ...((strictMemory?.quote_data && typeof strictMemory.quote_data === "object") ? strictMemory.quote_data : {}),
          },
        });
        const quoteDataInputText = wantsReuseBillingInQuoteData && reusableBillingInQuoteData.complete
          ? billingDataAsSingleMessage(reusableBillingInQuoteData)
          : quoteTurnText;
        const hasBillingDataInQuoteData = looksLikeBillingData(quoteDataInputText);
        const isCommercialAlternativeInQuoteData =
          asksAnotherQuoteInQuoteData ||
          (followupIntentInQuoteData && followupIntentInQuoteData !== "requote_same_model");
        const crmKnownForQuoteDataGate = Boolean(previousMemory?.crm_contact_found || strictMemory.crm_contact_found);

        if (!crmKnownForQuoteDataGate && isCommercialAlternativeInQuoteData) {
          strictMemory.awaiting_action = "strict_quote_data";
          strictReply = "Para cliente nuevo primero debo registrar datos obligatorios de facturación: ciudad, empresa, NIT, contacto, correo y celular. Luego continúo con la cotización.";
        } else if (isCommercialAlternativeInQuoteData) {
          strictMemory.awaiting_action = "conversation_followup";
          strictMemory.last_intent = String(followupIntentInQuoteData || "alternative_same_need");
          strictReply = asksAnotherQuoteInQuoteData
            ? buildAnotherQuotePrompt()
            : "Entendido. Para alternativas, dime si prefieres: otro modelo, más económico, mayor capacidad, menor capacidad u otra marca.";
        } else if (wantsReuseBillingInQuoteData && !reusableBillingInQuoteData.complete) {
          const missingReusable: string[] = [];
          if (!reusableBillingInQuoteData.city) missingReusable.push("ciudad");
          if (!reusableBillingInQuoteData.company) missingReusable.push("empresa");
          if (!reusableBillingInQuoteData.nit) missingReusable.push("NIT");
          if (!reusableBillingInQuoteData.contact) missingReusable.push("contacto");
          if (!reusableBillingInQuoteData.email) missingReusable.push("correo");
          if (!reusableBillingInQuoteData.phone) missingReusable.push("celular");
          strictMemory.awaiting_action = "strict_quote_data";
          strictReply = missingReusable.length
            ? `Puedo reutilizar los datos anteriores, pero me falta: ${missingReusable.join(", ")}. Envíamelo en un solo mensaje para continuar.`
            : "No encontré datos previos completos para reutilizar. Envíame ciudad, empresa, NIT, contacto, correo y celular en un solo mensaje.";
        } else if (!isAdvanceInQuoteData && !hasBillingDataInQuoteData) {
          strictMemory.awaiting_action = "strict_quote_data";
          strictReply = "Para continuar esta cotización, envíame los datos de facturación en un solo mensaje (ciudad, empresa, NIT, contacto, correo, celular).";
        }
        if (!String(strictReply || "").trim()) {
        const bundleOptions = Array.isArray(previousMemory?.quote_bundle_options)
          ? previousMemory.quote_bundle_options
          : (Array.isArray(previousMemory?.pending_product_options)
              ? previousMemory.pending_product_options
              : (Array.isArray(previousMemory?.last_recommended_options) ? previousMemory.last_recommended_options : []));
        if (bundleOptions.length >= 2 && isContinueQuoteWithoutPersonalDataIntent(text)) {
          const modelNames = bundleOptions
            .map((o: any) => String(o?.raw_name || o?.name || "").trim())
            .filter(Boolean);
          if (modelNames.length >= 2) {
            strictBypassAutoQuote = true;
            inbound.text = `cotizar ${modelNames.join(" ; ")} cantidad 1 para todos`;
            strictMemory.awaiting_action = "none";
            strictMemory.pending_product_options = bundleOptions;
            strictMemory.last_recommended_options = bundleOptions;
            strictMemory.last_intent = "quote_bundle_request";
            strictMemory.bundle_quote_mode = true;
            strictMemory.bundle_quote_count = modelNames.length;
            strictMemory.quote_data = {};
          }
        } else if (isContinueQuoteWithoutPersonalDataIntent(text)) {
          strictReply = "Perfecto. Para avanzar sin datos, primero confirma el lote a cotizar (ej.: cotizar 8 o cotizar A,B,C).";
          strictMemory.awaiting_action = "strict_choose_model";
        }
        if (strictBypassAutoQuote) {
          // bypass strict single-product quote_data parsing and continue with auto quote intake
        } else {
        const pickBounded = (label: string) => {
          const rx = new RegExp(`${label}\\s*[:=]?\\s*([^\\n,;]+?)(?=\\s+(ciudad|empresa|company|nit|contacto|correo|email|celular|telefono)\\b|$)`, "i");
          const m = String(quoteDataInputText || "").match(rx);
          return m?.[1] ? String(m[1]).trim() : "";
        };

        const looseLines = String(quoteDataInputText || "")
          .split(/\n|;|,/)
          .map((x) => String(x || "").trim())
          .filter(Boolean);
        const firstEmailLine = looseLines.find((ln) => /@/.test(ln)) || "";
        const firstPhoneLine = looseLines.find((ln) => /\b(?:\+?57\s*)?3\d{9}\b/.test(ln.replace(/\s+/g, ""))) || "";
        const firstNitLine = looseLines.find((ln) => /^\d{6,14}$/.test(ln.replace(/\D/g, ""))) || "";
        const firstCityLine = looseLines.find((ln) => /^[a-zA-Záéíóúüñ\s]{3,40}$/.test(ln) && !/@/.test(ln) && !/persona\s+natural|sas|s\.a\.s|ltda|nit/i.test(ln)) || "";
        const firstCompanyLine = looseLines.find((ln) => /persona\s+natural|sas|s\.a\.s|ltda|empresa|razon\s+social/i.test(ln)) || "";
        const firstContactLine = looseLines.find((ln) => /^[a-zA-Záéíóúüñ\s]{6,60}$/.test(ln) && ln !== firstCityLine && ln !== firstCompanyLine && !/@/.test(ln)) || "";

        const cityNow = normalizeCityLabel(pickBounded("ciudad|city") || extractLabeledValue(quoteDataInputText, ["ciudad", "city"]) || firstCityLine);
        const companyNow = pickBounded("empresa|company|razon social") || extractLabeledValue(quoteDataInputText, ["empresa", "company", "razon social"]) || firstCompanyLine;
        const nitNow = (String(quoteDataInputText || "").match(/\bnit\s*[:=]?\s*([0-9\.\-]{5,20})/i)?.[1] || extractLabeledValue(quoteDataInputText, ["nit"]).replace(/[^0-9.\-]/g, "") || firstNitLine.replace(/[^0-9.\-]/g, "")).trim();
        const contactNow = pickBounded("contacto") || extractLabeledValue(quoteDataInputText, ["contacto"]) || firstContactLine || extractCustomerName(quoteDataInputText, inbound.pushName || "");
        const emailNow = extractEmail(quoteDataInputText) || String(firstEmailLine || "").trim();
        const phoneNow = extractCustomerPhone(quoteDataInputText, inbound.from) || String(firstPhoneLine || "").replace(/\D/g, "");

        const prevQuoteData = previousMemory?.quote_data && typeof previousMemory.quote_data === "object" ? previousMemory.quote_data : {};
        let crmContactFoundForQuote = Boolean(previousMemory?.crm_contact_found || strictMemory.crm_contact_found);
        let crmNameForQuote = String(previousMemory?.crm_contact_name || strictMemory.crm_contact_name || "").trim();
        let crmEmailForQuote = String(previousMemory?.crm_contact_email || strictMemory.crm_contact_email || "").trim();
        let crmPhoneForQuote = String(previousMemory?.crm_contact_phone || strictMemory.crm_contact_phone || "").trim();
        let crmCompanyForQuote = String(previousMemory?.crm_company || strictMemory.crm_company || "").trim();
        let crmNitForQuote = String(previousMemory?.crm_nit || strictMemory.crm_nit || "").trim();
        let crmCityForQuote = normalizeCityLabel(String(previousMemory?.crm_billing_city || strictMemory.crm_billing_city || "").trim());
        let crmTierForQuote = normalizeText(String(previousMemory?.crm_price_tier || strictMemory.crm_price_tier || "").trim());
        let crmTypeForQuote = normalizeText(String(previousMemory?.crm_customer_type || strictMemory.crm_customer_type || "").trim());

        if (!crmContactFoundForQuote) {
          try {
            const candidatePhone = normalizePhone(phoneNow || inbound.from || "");
            const candidatePhoneTail = phoneTail10(candidatePhone);
            const candidateNit = String(nitNow || "").replace(/[^0-9\-]/g, "").trim();
            const candidateEmail = String(emailNow || "").trim().toLowerCase();
            const keyVariants = [
              candidatePhone ? `cel:${candidatePhone}` : "",
              candidatePhoneTail ? `cel:${candidatePhoneTail}` : "",
              candidateNit ? `nit:${candidateNit}` : "",
              candidateEmail ? `email:${candidateEmail}` : "",
            ].filter(Boolean);
            if (keyVariants.length || candidatePhone) {
              const orParts = [
                ...keyVariants.map((k) => `contact_key.eq.${k}`),
                candidatePhone ? `phone.eq.${candidatePhone}` : "",
                candidatePhoneTail ? `phone.like.%${candidatePhoneTail}` : "",
              ].filter(Boolean);
              const { data: crmMatches } = await supabase
                .from("agent_crm_contacts")
                .select("id,name,email,phone,company,metadata")
                .eq("created_by", ownerId)
                .or(orParts.join(","))
                .order("updated_at", { ascending: false })
                .limit(5);
              const crmMatch = Array.isArray(crmMatches)
                ? (crmMatches.find((m: any) => {
                    const p = normalizePhone(String(m?.phone || ""));
                    const tail = phoneTail10(p);
                    const ck = String(m?.contact_key || "").trim().toLowerCase();
                    if (candidateNit && ck === `nit:${candidateNit}`) return true;
                    if (candidateEmail && ck === `email:${candidateEmail}`) return true;
                    if (candidatePhone && (p === candidatePhone || ck === `cel:${candidatePhone}`)) return true;
                    if (candidatePhoneTail && (tail === candidatePhoneTail || ck === `cel:${candidatePhoneTail}`)) return true;
                    return false;
                  }) || crmMatches[0])
                : null;
              if (crmMatch && typeof crmMatch === "object") {
                const m = (crmMatch as any)?.metadata && typeof (crmMatch as any).metadata === "object" ? (crmMatch as any).metadata : {};
                crmContactFoundForQuote = true;
                crmNameForQuote = String((crmMatch as any)?.name || "").trim();
                crmEmailForQuote = String((crmMatch as any)?.email || "").trim();
                crmPhoneForQuote = String((crmMatch as any)?.phone || "").trim();
                crmCompanyForQuote = String((crmMatch as any)?.company || "").trim();
                crmNitForQuote = String(m?.nit || "").trim();
                crmCityForQuote = normalizeCityLabel(String(m?.billing_city || "").trim());
                crmTierForQuote = normalizeText(String(m?.price_tier || "").trim());
                crmTypeForQuote = normalizeText(String(m?.customer_type || "").trim());
                strictMemory.crm_contact_found = true;
                strictMemory.crm_contact_id = String((crmMatch as any)?.id || "").trim();
                strictMemory.crm_contact_name = crmNameForQuote;
                strictMemory.crm_contact_email = crmEmailForQuote;
                strictMemory.crm_contact_phone = crmPhoneForQuote;
                strictMemory.crm_company = crmCompanyForQuote;
                strictMemory.crm_nit = crmNitForQuote;
                strictMemory.crm_billing_city = crmCityForQuote;
                strictMemory.crm_price_tier = crmTierForQuote;
                strictMemory.crm_customer_type = crmTypeForQuote;
              }
            }
          } catch {}
        }

        const quoteData = wantsReuseBillingInQuoteData && reusableBillingInQuoteData.complete
          ? {
              city: reusableBillingInQuoteData.city,
              company: reusableBillingInQuoteData.company,
              nit: reusableBillingInQuoteData.nit,
              contact: reusableBillingInQuoteData.contact,
              email: reusableBillingInQuoteData.email,
              phone: reusableBillingInQuoteData.phone,
            }
          : {
              city: cityNow || String(prevQuoteData.city || "") || crmCityForQuote,
              company: companyNow || String(prevQuoteData.company || "") || crmCompanyForQuote || String(previousMemory?.commercial_company_name || strictMemory.commercial_company_name || ""),
              nit: nitNow || String(prevQuoteData.nit || "") || crmNitForQuote || String(previousMemory?.commercial_company_nit || strictMemory.commercial_company_nit || ""),
              contact: contactNow || String(prevQuoteData.contact || "") || crmNameForQuote || String(previousMemory?.commercial_customer_name || strictMemory.commercial_customer_name || "") || String(previousMemory?.customer_name || strictMemory.customer_name || ""),
              email: emailNow || String(prevQuoteData.email || "") || crmEmailForQuote || String(previousMemory?.customer_email || strictMemory.customer_email || ""),
              phone: phoneNow || String(prevQuoteData.phone || "") || crmPhoneForQuote || normalizePhone(String(previousMemory?.customer_phone || strictMemory.customer_phone || inbound.from || "")),
            };
        strictMemory.quote_data = quoteData;

        const customerCity = String(quoteData.city || "").trim() || (Boolean(crmContactFoundForQuote) ? "Bogota" : "");
        const customerCompany = String(quoteData.company || "").trim();
        const customerNit = String(quoteData.nit || "").trim();
        const customerContact = String(quoteData.contact || "").trim();
        const customerEmail = String(quoteData.email || "").trim();
        const customerPhone = String(quoteData.phone || "").trim();
        const companyNorm = normalizeText(customerCompany);
        const applicantNorm = normalizeText(String(quoteDataInputText || ""));
        const isNaturalPerson =
          !customerCompany ||
          /persona\s+natural/.test(companyNorm) ||
          /persona\s+natural/.test(applicantNorm);
        const hasAnyQuoteData = Boolean(customerCity || customerCompany || customerNit || customerContact || customerEmail || customerPhone);
        const hasContactCore = customerContact.length >= 3;
        const hasCityCore = customerCity.length >= 3;
        const hasIdentityCore = customerNit.length >= 5;
        const hasReachability = customerEmail.includes("@") || customerPhone.replace(/\D/g, "").length >= 7;
        const hasBusinessCore = customerCompany.length >= 3;
        const isDistributorCustomer = crmTierForQuote === "distribuidor" || crmTypeForQuote === "distributor";
        const isExistingCustomer = !isDistributorCustomer && crmContactFoundForQuote && Boolean(recognizedReturningCustomer);
        const customerSegment = isDistributorCustomer ? "distributor" : (isExistingCustomer ? "existing" : "new");
        strictMemory.customer_segment = customerSegment;
        const hasBusinessOrReachability = isNaturalPerson
          ? (hasIdentityCore && hasReachability)
          : (hasBusinessCore && hasIdentityCore && hasReachability);
        const hasBusinessOrReachabilityForKnownExisting =
          customerSegment === "existing" && crmContactFoundForQuote
            ? (hasBusinessCore && hasReachability)
            : hasBusinessOrReachability;
        const missingAttemptsPrev = Number(previousMemory?.strict_quote_data_missing_attempts || strictMemory.strict_quote_data_missing_attempts || 0);

        if (!crmContactFoundForQuote && isAdvanceInQuoteData) {
          const missingAttempts = missingAttemptsPrev + 1;
          strictMemory.strict_quote_data_missing_attempts = missingAttempts;
          strictMemory.awaiting_action = "strict_quote_data";
          if (missingAttempts >= 3) {
            strictMemory.awaiting_action = "none";
            strictMemory.conversation_status = "closed";
            strictMemory.last_intent = "quote_rejected_missing_data";
            strictReply = "No puedo generar cotización sin datos obligatorios. Cierro esta solicitud por seguridad. Si deseas retomarla, escribe: cotización y comparte ciudad, empresa, NIT, contacto, correo y celular.";
          } else {
            strictReply = "Para cliente nuevo sí necesito datos de facturación antes de cotizar: ciudad, empresa, NIT, contacto, correo y celular.";
          }
        } else if (!isAdvanceInQuoteData && hasAnyQuoteData && !(hasContactCore && hasCityCore && hasBusinessOrReachabilityForKnownExisting)) {
          const missingAttempts = missingAttemptsPrev + 1;
          strictMemory.strict_quote_data_missing_attempts = missingAttempts;
          const missing: string[] = [];
          if (!hasContactCore) missing.push("contacto");
          if (!hasCityCore) missing.push("ciudad");
          if (isNaturalPerson) {
            if (!hasIdentityCore) missing.push("cédula o NIT");
            if (!hasReachability) missing.push("correo o celular");
          } else {
            if (!hasBusinessCore) missing.push("empresa");
            if (!hasIdentityCore) missing.push("NIT");
            if (!hasReachability) missing.push("correo o celular");
          }
          if (!crmContactFoundForQuote && missingAttempts >= 3) {
            strictMemory.awaiting_action = "none";
            strictMemory.conversation_status = "closed";
            strictMemory.last_intent = "quote_rejected_missing_data";
            strictReply = "No puedo generar cotización sin datos obligatorios. Cierro esta solicitud por seguridad. Si deseas retomarla, escribe: cotización y comparte ciudad, empresa, NIT, contacto, correo y celular.";
          } else {
            strictMemory.awaiting_action = "strict_quote_data";
            strictReply = `Perfecto, ya registré parte de tus datos. Para continuar me falta: ${missing.join(", ")}. Puedes enviarlo en un solo mensaje o escribir exactamente: avanza.`;
          }
        }
        if (!String(strictReply || "").trim()) {
        strictMemory.strict_quote_data_missing_attempts = 0;
        {
          const selectedId = String(previousMemory?.last_selected_product_id || previousMemory?.last_product_id || strictMemory.last_selected_product_id || strictMemory.last_product_id || "").trim();
          const selectedName = String(previousMemory?.last_selected_product_name || previousMemory?.last_product_name || strictMemory.last_selected_product_name || strictMemory.last_product_name || "").trim();
          const selected = selectedId
            ? (ownerRows.find((r: any) => String(r?.id || "").trim() === selectedId) || null)
            : (selectedName ? (findCatalogProductByName(ownerRows as any[], selectedName) || null) : null);

          const qty = Math.max(1, Number(previousMemory?.quote_quantity || strictMemory.quote_quantity || 1));
          const trm = await getOrFetchTrm(supabase, ownerId, (agent as any)?.tenant_id || null);
          const trmRate = Number(trm?.rate || 0);

          if (!selected || !(trmRate > 0)) {
            strictMemory.awaiting_action = "none";
            strictMemory.quote_data = {};
            strictReply = "Recibí tus datos. No pude cerrar la cotización automática en este intento, pero ya quedó registrado y te la envío enseguida por este mismo WhatsApp.";
          } else {
            const effectiveCity = normalizeCityLabel(customerCity || "Bogota");
            const effectiveCompany = customerCompany || "Persona natural";
            const effectiveNit = customerNit || "N/A";
            const effectiveContact = customerContact || (knownCustomerName || inbound.pushName || "Cliente");
            const cityKey = normalizeCityLabel(effectiveCity);
            const cityPrices = (selected as any)?.source_payload?.prices_cop || {};
            const cityCop = Number(cityPrices?.[cityKey] || 0);
            const bogotaCop = Number(cityPrices?.bogota || 0);
            const distributorCop = Number(cityPrices?.distribuidor || 0);
            const useDistributorPrice = crmTierForQuote === "distribuidor" || crmTypeForQuote === "distributor";
            const existingCop = Number(cityPrices?.cliente_antiguo || cityPrices?.cliente_recurrente || cityPrices?.recurrente || cityPrices?.existing || 0);
            const newCop = Number(cityPrices?.cliente_nuevo || cityPrices?.new || 0);
            const useExistingPrice = customerSegment === "existing" && existingCop > 0;
            const useNewPrice = customerSegment === "new" && newCop > 0;
            const unitPriceCop = useDistributorPrice && distributorCop > 0
              ? distributorCop
              : useExistingPrice
                ? existingCop
                : useNewPrice
                  ? newCop
                  : (cityCop > 0 ? cityCop : bogotaCop);
            const baseUsdRaw = Number((selected as any)?.base_price_usd || 0);
            const basePriceUsd = baseUsdRaw > 0
              ? baseUsdRaw
              : (unitPriceCop > 0 ? Number((unitPriceCop / trmRate).toFixed(6)) : 0);
            const totalCop = unitPriceCop > 0
              ? Number((unitPriceCop * qty).toFixed(2))
              : Number((basePriceUsd * trmRate * qty).toFixed(2));

            const draftPayload = {
              tenant_id: (agent as any)?.tenant_id || null,
              created_by: ownerId,
              agent_id: String(agent.id),
              customer_name: effectiveContact || null,
              customer_email: customerEmail || null,
              customer_phone: customerPhone || null,
              company_name: effectiveCompany || null,
              location: effectiveCity || null,
              product_catalog_id: (selected as any)?.id || null,
              product_name: String((selected as any)?.name || ""),
              base_price_usd: basePriceUsd,
              trm_rate: trmRate,
              total_cop: totalCop,
              notes: "Cotizacion automatica WhatsApp (flujo estricto)",
              payload: {
                quantity: qty,
                trm_date: trm?.rate_date || null,
                trm_source: trm?.source || null,
                customer_city: effectiveCity || null,
                customer_nit: effectiveNit || null,
                customer_company: effectiveCompany || null,
                customer_contact: effectiveContact || null,
                unit_price_cop: unitPriceCop > 0 ? unitPriceCop : null,
              },
              status: "analysis",
            };

            let { data: insertedDraft, error: draftErr } = await supabase
              .from("agent_quote_drafts")
              .insert(draftPayload)
              .select("id")
              .single();

            if (draftErr && isQuoteDraftStatusConstraintError(draftErr)) {
              const legacyPayload = {
                ...draftPayload,
                status: "draft",
                payload: {
                  ...(draftPayload.payload || {}),
                  crm_stage: "analysis",
                  crm_stage_updated_at: new Date().toISOString(),
                },
              } as any;
              const retry = await supabase
                .from("agent_quote_drafts")
                .insert(legacyPayload)
                .select("id")
                .single();
              insertedDraft = retry.data as any;
              draftErr = retry.error as any;
            }

            if (draftErr) {
              strictReply = "Recibí tus datos, pero falló la generación automática de cotización en este intento. Escríbeme 'reenviar cotización' y la intento de nuevo por este WhatsApp.";
            } else {
              try {
                const productImageDataUrl = await resolveProductImageDataUrl(selected);
                const quoteDescription = await buildQuoteItemDescriptionAsync(selected, String((selected as any)?.name || ""));
                const pdfBase64 = await buildQuotePdf({
                  draftId: String((insertedDraft as any)?.id || ""),
                  customerName: effectiveContact,
                  customerEmail,
                  customerPhone,
                  companyName: effectiveCompany,
                  productName: String((selected as any)?.name || ""),
                  quantity: qty,
                  basePriceUsd,
                  trmRate,
                  totalCop,
                  city: effectiveCity,
                  nit: effectiveNit,
                  itemDescription: quoteDescription,
                  imageDataUrl: productImageDataUrl,
                  notes: `Ciudad: ${effectiveCity} | NIT: ${effectiveNit}`,
                });
                strictDocs.push({
                  base64: pdfBase64,
                  fileName: safeFileName(`cotizacion-${String((selected as any)?.name || "producto")}-${Date.now()}.pdf`, "cotizacion", "pdf"),
                  mimetype: "application/pdf",
                  caption: `Cotización - ${String((selected as any)?.name || "producto")}`,
                });
                const selectedNameForQuote = String((selected as any)?.name || "producto");
                const datasheetUrlForQuote = pickBestProductPdfUrl(selected, `ficha tecnica ${selectedNameForQuote}`) || "";
                const localPdfPathForQuote = pickBestLocalPdfPath(selected, `ficha tecnica ${selectedNameForQuote}`);
                let attachedSheetWithQuote = false;
                if (datasheetUrlForQuote) {
                  const remote = await fetchRemoteFileAsBase64(datasheetUrlForQuote);
                  const remoteLooksPdf = Boolean(remote) && (/application\/pdf/i.test(String(remote?.mimetype || "")) || /\.pdf(\?|$)/i.test(datasheetUrlForQuote));
                  if (remote && remoteLooksPdf && Number(remote.byteSize || 0) <= MAX_WHATSAPP_DOC_BYTES) {
                    strictDocs.push({
                      base64: remote.base64,
                      fileName: safeFileName(remote.fileName, `ficha-${selectedNameForQuote}`, "pdf"),
                      mimetype: "application/pdf",
                      caption: `Ficha técnica - ${selectedNameForQuote}`,
                    });
                    attachedSheetWithQuote = true;
                  }
                }
                if (!attachedSheetWithQuote && localPdfPathForQuote) {
                  const local = fetchLocalFileAsBase64(localPdfPathForQuote);
                  if (local && Number(local.byteSize || 0) <= MAX_WHATSAPP_DOC_BYTES) {
                    strictDocs.push({
                      base64: local.base64,
                      fileName: safeFileName(local.fileName, `ficha-${selectedNameForQuote}`, "pdf"),
                      mimetype: "application/pdf",
                      caption: `Ficha técnica - ${selectedNameForQuote}`,
                    });
                    attachedSheetWithQuote = true;
                  }
                }
                strictReply = attachedSheetWithQuote
                  ? `Listo. Ya generé la cotización de ${selectedNameForQuote} (${qty} unidad(es)) y te envío en este WhatsApp el PDF junto con la ficha técnica.`
                  : `Listo. Ya generé la cotización de ${selectedNameForQuote} (${qty} unidad(es)) y te la envío en PDF por este WhatsApp.`;
                const youtubeLink = pickYoutubeVideoForModel(selectedNameForQuote);
                if (youtubeLink) {
                  strictReply += `\n\nVideo del equipo:\n${youtubeLink}`;
                }
              } catch (quoteDocErr: any) {
                console.error("[evolution-webhook] strict_quote_pdf_error", {
                  message: quoteDocErr?.message || quoteDocErr,
                  stack: quoteDocErr?.stack || "",
                  selected: String((selected as any)?.name || ""),
                });
                const selectedNameForQuote = String((selected as any)?.name || "producto");
                let fallbackPdfAttached = false;
                try {
                  const fallbackPdfBase64 = await buildSimpleQuotePdf({
                    draftId: String((insertedDraft as any)?.id || ""),
                    customerName: effectiveContact,
                    customerEmail,
                    customerPhone,
                    companyName: effectiveCompany,
                    productName: selectedNameForQuote,
                    quantity: qty,
                    trmRate,
                    totalCop,
                    city: effectiveCity,
                    nit: effectiveNit,
                  });
                  if (fallbackPdfBase64) {
                    strictDocs.push({
                      base64: fallbackPdfBase64,
                      fileName: safeFileName(`cotizacion-${selectedNameForQuote}-${Date.now()}.pdf`, "cotizacion", "pdf"),
                      mimetype: "application/pdf",
                      caption: `Cotización - ${selectedNameForQuote}`,
                    });
                    fallbackPdfAttached = true;
                  }
                } catch (fallbackErr: any) {
                  console.error("[evolution-webhook] strict_quote_pdf_fallback_error", {
                    message: fallbackErr?.message || fallbackErr,
                    stack: fallbackErr?.stack || "",
                    selected: selectedNameForQuote,
                  });
                }

                if (fallbackPdfAttached) {
                  const datasheetUrlForQuote = pickBestProductPdfUrl(selected, `ficha tecnica ${selectedNameForQuote}`) || "";
                  const localPdfPathForQuote = pickBestLocalPdfPath(selected, `ficha tecnica ${selectedNameForQuote}`);
                  let attachedSheetWithQuote = false;
                  if (datasheetUrlForQuote) {
                    const remote = await fetchRemoteFileAsBase64(datasheetUrlForQuote);
                    const remoteLooksPdf = Boolean(remote) && (/application\/pdf/i.test(String(remote?.mimetype || "")) || /\.pdf(\?|$)/i.test(datasheetUrlForQuote));
                    if (remote && remoteLooksPdf && Number(remote.byteSize || 0) <= MAX_WHATSAPP_DOC_BYTES) {
                      strictDocs.push({
                        base64: remote.base64,
                        fileName: safeFileName(remote.fileName, `ficha-${selectedNameForQuote}`, "pdf"),
                        mimetype: "application/pdf",
                        caption: `Ficha técnica - ${selectedNameForQuote}`,
                      });
                      attachedSheetWithQuote = true;
                    }
                  }
                  if (!attachedSheetWithQuote && localPdfPathForQuote) {
                    const local = fetchLocalFileAsBase64(localPdfPathForQuote);
                    if (local && Number(local.byteSize || 0) <= MAX_WHATSAPP_DOC_BYTES) {
                      strictDocs.push({
                        base64: local.base64,
                        fileName: safeFileName(local.fileName, `ficha-${selectedNameForQuote}`, "pdf"),
                        mimetype: "application/pdf",
                        caption: `Ficha técnica - ${selectedNameForQuote}`,
                      });
                      attachedSheetWithQuote = true;
                    }
                  }
                  strictReply = attachedSheetWithQuote
                    ? `Listo. Ya generé la cotización de ${selectedNameForQuote} (${qty} unidad(es)) y te envío en este WhatsApp el PDF junto con la ficha técnica.`
                    : `Listo. Ya generé la cotización de ${selectedNameForQuote} (${qty} unidad(es)) y te la envío en PDF por este WhatsApp.`;
                  const youtubeLink = pickYoutubeVideoForModel(selectedNameForQuote);
                  if (youtubeLink) strictReply += `\n\nVideo del equipo:\n${youtubeLink}`;
                } else {
                  strictReply = "Recibí tus datos, pero falló la generación automática de cotización en este intento. Escríbeme 'reenviar cotización' y la intento de nuevo por este WhatsApp.";
                }
              }
            }
            strictMemory.awaiting_action = "conversation_followup";
            strictMemory.quote_data = {};
            strictMemory.quote_quantity = 1;
            strictMemory.last_intent = "quote_generated";
            strictMemory.conversation_status = "open";
            strictMemory.quote_feedback_due_at = isoAfterHours(24);
            }
          }
        }
        }
        }
        }
        } catch (quoteFlowErr: any) {
          console.error("[evolution-webhook] strict_quote_data_error", {
            message: quoteFlowErr?.message || quoteFlowErr,
            stack: quoteFlowErr?.stack || "",
            text,
          });
          strictMemory.awaiting_action = "strict_quote_data";
          strictReply = "Tuve un error procesando esta solicitud. Para continuar, envíame en un solo mensaje: ciudad, empresa, NIT, contacto, correo y celular.";
        }
      } else if (!String(strictReply || "").trim() && awaiting === "strict_catalog_scope_disambiguation") {
        const t = normalizeText(text);
        const chooseGlobal = /^\s*(1|a)\s*$/.test(t) || /catalogo\s+completo|todas\s+las\s+categorias|todos\s+los\s+productos/.test(t);
        const chooseCurrent = /^\s*(2|b)\s*$/.test(t) || /solo\s+esta|solo\s+categoria|solo\s+familia|de\s+balanzas|de\s+basculas/.test(t);
        if (chooseGlobal) {
          const families = buildNumberedFamilyOptions(ownerRows as any[], 10);
          const total = families.reduce((acc: number, f: any) => acc + Number(f?.count || 0), 0);
          strictMemory.last_category_intent = "";
          strictMemory.strict_family_label = "";
          strictMemory.pending_product_options = [];
          strictMemory.pending_family_options = families;
          strictMemory.strict_model_offset = 0;
          strictMemory.awaiting_action = "strict_choose_family";
          strictReply = families.length
            ? [
                `Perfecto. Te muestro el catálogo completo (${total} referencias activas).`,
                "Elige una familia:",
                ...families.map((f: any) => `${f.code}) ${f.label} (${f.count})`),
                "",
                "Responde con letra o número (A/1).",
              ].join("\n")
            : "Ahora mismo no tengo familias activas para mostrarte en catálogo.";
        } else if (chooseCurrent) {
          const pending = Array.isArray(previousMemory?.pending_product_options) ? previousMemory.pending_product_options : [];
          const familyLabel = String(previousMemory?.strict_family_label || "").trim();
          strictMemory.awaiting_action = pending.length ? "strict_choose_model" : "strict_choose_family";
          strictMemory.pending_product_options = pending;
          strictMemory.pending_family_options = Array.isArray(previousMemory?.pending_family_options) ? previousMemory.pending_family_options : [];
          strictReply = pending.length
            ? [
                `Perfecto, seguimos solo en ${familyLabel || "esta categoría"}.`,
                ...pending.map((o: any) => `${o.code}) ${o.name}`),
                "",
                "Elige con letra o número (A/1), o escribe 'más'.",
              ].join("\n")
            : `Perfecto, seguimos solo en ${familyLabel || "esta categoría"}. Elige una familia con letra o número.`;
        } else {
          strictMemory.awaiting_action = "strict_catalog_scope_disambiguation";
          strictReply = "Para evitar ambigüedad, responde: 1) Catálogo completo 2) Solo esta categoría.";
        }
      } else if (!String(strictReply || "").trim() && awaiting === "strict_choose_model") {
        const familyLabel = String(previousMemory?.strict_family_label || "").trim();
        const pendingStrictOptions = Array.isArray(previousMemory?.pending_product_options) ? previousMemory.pending_product_options : [];
        const strictSelection = resolvePendingProductOptionStrict(text, pendingStrictOptions);
        const strictCommand = String(text || "").trim();
        const askMore = /^(mas|más)$/i.test(strictCommand);
        const askBack = /^volver$/i.test(strictCommand);
        const askCancel = /^cancelar$/i.test(strictCommand);
        const rememberedGuidedProfile = String(previousMemory?.guided_balanza_profile || strictMemory.guided_balanza_profile || "").trim() as GuidedBalanzaProfile | "";
        const guidedProfileInModelStep = (detectGuidedBalanzaProfile(text) || rememberedGuidedProfile || "") as GuidedBalanzaProfile | "";
        const categoryScoped = rememberedCategory ? scopeCatalogRows(ownerRows as any, rememberedCategory) : ownerRows;
        const asksMoreOptionsDirect = /\b(tienes?\s+mas\s+opciones?|hay\s+mas\s+opciones?|mas\s+opciones?)\b/.test(textNorm);
        const asksHotplate = /\b(plancha|calentamiento|agitaci[oó]n|agitacion)\b/.test(textNorm);
        const freeCatalogAskInModelStep =
          asksMoreOptionsDirect ||
          isGlobalCatalogAsk(text) ||
          isInventoryInfoIntent(text) ||
          isCatalogBreadthQuestion(text) ||
          /(que\s+mas|que\s+otros?|que\s+tienes|que\s+manejas|que\s+ofrec|catalogo|otro\s+tipo|otra\s+categoria|otra\s+categoría|opciones)/.test(normalizeText(text));
        const requestedCategoryIntentInModelStep = detectCatalogCategoryIntent(text);
        const currentCategoryIntentInModelStep = normalizeText(String(previousMemory?.last_category_intent || rememberedCategory || ""));
        const isCategorySwitchInModelStep = Boolean(
          requestedCategoryIntentInModelStep &&
          normalizeText(String(requestedCategoryIntentInModelStep || "")) !== currentCategoryIntentInModelStep
        );
        const technicalBypassInSelection = Boolean(
          parseTechnicalSpecQuery(text) ||
          parseCapacityRangeHint(text) ||
          parseLooseTechnicalHint(text) ||
          isUseCaseApplicabilityIntent(text) ||
          isUseCaseFamilyHint(text) ||
          isRecommendationIntent(text)
        );
        const asksGlobalCatalogInModelStep =
          isGlobalCatalogAsk(text) ||
          /\b(dame|muestrame|mu[eé]strame|quiero|ver)\b.*\b(todo|todos|todas)\b.*\b(prod|producto|productos|prodcutos|catalogo)\b/.test(textNorm);
        const hasScopedContextInModelStep = Boolean(currentCategoryIntentInModelStep || familyLabel || pendingStrictOptions.length);
        if (!String(strictReply || "").trim() && !strictSelection && !askMore && !askBack && !askCancel && guidedProfileInModelStep) {
          const optionsFromGuided = buildGuidedPendingOptions(ownerRows as any[], guidedProfileInModelStep as GuidedBalanzaProfile);
          strictMemory.guided_balanza_profile = guidedProfileInModelStep;
          strictMemory.last_category_intent = "balanzas";
          strictMemory.awaiting_action = optionsFromGuided.length ? "strict_choose_model" : "strict_need_spec";
          strictMemory.pending_product_options = optionsFromGuided;
          strictMemory.pending_family_options = [];
          strictMemory.strict_family_label = "balanzas";
          strictMemory.strict_model_offset = 0;
          strictReply = buildGuidedBalanzaReply(guidedProfileInModelStep as GuidedBalanzaProfile);
        }
        if (!String(strictReply || "").trim() && asksGlobalCatalogInModelStep && hasScopedContextInModelStep) {
          strictMemory.awaiting_action = "strict_catalog_scope_disambiguation";
          strictReply = [
            "Perfecto. Para no mezclar, ¿te refieres a:",
            "1) Catálogo completo (todas las categorías)",
            `2) Solo ${familyLabel || String(currentCategoryIntentInModelStep || "esta categoría").replace(/_/g, " ")}`,
          ].join("\n");
        }
        const inventoryOverrideInSelection =
          (!asksGlobalCatalogInModelStep && isGlobalCatalogAsk(text)) ||
          isInventoryInfoIntent(text) ||
          isCatalogBreadthQuestion(text);
        if (inventoryOverrideInSelection) {
          strictMemory.awaiting_action = "none";
          strictMemory.pending_product_options = [];
          strictMemory.pending_family_options = [];
          strictMemory.strict_model_offset = 0;
          strictMemory.strict_family_label = "";
          if (isGlobalCatalogAsk(text)) strictMemory.last_category_intent = "";
        }
        const familySwitchMentionInModelStep = (() => {
          const families = buildNumberedFamilyOptions(categoryScoped as any[], 12);
          if (!families.length) return null;
          const chosen = resolvePendingFamilyOption(text, families);
          if (!chosen) return null;
          const currentKey = normalizeText(String(familyLabel || ""));
          if (currentKey && normalizeText(String(chosen.key || "")) === currentKey) return null;
          return { families, chosen };
        })();
        if (!String(strictReply || "").trim() && familySwitchMentionInModelStep) {
          const chosen = familySwitchMentionInModelStep.chosen;
          const familyRowsSwitch = (categoryScoped as any[]).filter(
            (r: any) => normalizeText(familyLabelFromRow(r)) === normalizeText(String(chosen.key || ""))
          );
          const optionsSwitch = buildNumberedProductOptions(familyRowsSwitch as any[], 8);
          strictMemory.pending_family_options = familySwitchMentionInModelStep.families;
          strictMemory.strict_family_label = String(chosen.label || "");
          strictMemory.strict_model_offset = 0;
          strictMemory.awaiting_action = "strict_choose_model";
          strictMemory.pending_product_options = optionsSwitch;
          strictReply = optionsSwitch.length
            ? [
                `Perfecto, cambio la búsqueda a ${String(chosen.label || "esa familia")}.`,
                ...optionsSwitch.slice(0, 8).map((o) => {
                  const row = familyRowsSwitch.find((r: any) => String(r?.id || "") === String(o.id || ""));
                  const cap = Number(getRowCapacityG(row) || 0);
                  const read = Number(getRowReadabilityG(row) || 0);
                  return `${o.code}) ${o.name} | Cap: ${formatSpecNumber(cap)} g | Res: ${formatSpecNumber(read)} g`;
                }),
                "",
                "Responde con letra o número (A/1), o escribe 'más' para ver siguientes.",
              ].join("\n")
            : `Perfecto, cambio la búsqueda a ${String(chosen.label || "esa familia")}, pero ahora no veo modelos activos en esa familia.`;
        }
        if (pendingStrictOptions.length > 0 && !strictSelection && !askMore && !askBack && !askCancel && !technicalBypassInSelection && !inventoryOverrideInSelection && !isCategorySwitchInModelStep && !freeCatalogAskInModelStep && !asksHotplate) {
          const softReply = await buildStrictConversationalReply({
            apiKey,
            inboundText: text,
            awaiting,
            selectedProduct: String(previousMemory?.last_selected_product_name || previousMemory?.last_product_name || ""),
            categoryHint: rememberedCategory,
            pendingOptions: pendingStrictOptions,
          });
          strictMemory.awaiting_action = "strict_choose_model";
          strictMemory.pending_product_options = pendingStrictOptions;
          strictMemory.strict_model_offset = Math.max(0, Number(previousMemory?.strict_model_offset || 0));
          strictReply = String(softReply || "").trim() || "Por favor elige una opción válida del listado actual. Responde solo con la letra o número disponible (por ejemplo: A, B, 1 o 2), o escribe \"más\" para ver más opciones.";
        }
        if (!String(strictReply || "").trim() && isCategorySwitchInModelStep) {
          const scoped = scopeCatalogRows(ownerRows as any, String(requestedCategoryIntentInModelStep || ""));
          const families = buildNumberedFamilyOptions(scoped as any[], 8);
          strictMemory.last_category_intent = String(requestedCategoryIntentInModelStep || "");
          strictMemory.pending_product_options = [];
          strictMemory.pending_family_options = families;
          strictMemory.strict_filter_capacity_g = "";
          strictMemory.strict_filter_readability_g = "";
          strictMemory.strict_partial_capacity_g = "";
          strictMemory.strict_partial_readability_g = "";
          if (!families.length) {
            strictMemory.awaiting_action = "none";
            strictReply = `Entiendo el cambio. Ahora mismo no tengo referencias activas para ${String(requestedCategoryIntentInModelStep || "esa categoría").replace(/_/g, " ")}. Si quieres, te ayudo con balanzas y básculas disponibles.`;
          } else {
            strictMemory.awaiting_action = "strict_choose_family";
            strictReply = [
              `Perfecto, cambio la búsqueda a ${String(requestedCategoryIntentInModelStep || "catalogo").replace(/_/g, " ")}.`,
              "Primero elige familia:",
              ...families.map((o) => `${o.code}) ${o.label} (${o.count})`),
              "",
              "Si quieres, también dime qué vas a pesar y su funcionalidad para identificar cuál se adecúa a tu empresa.",
              "Responde con letra o número (A/1).",
            ].join("\n");
          }
        }
        if (!String(strictReply || "").trim() && asksHotplate && !isCategorySwitchInModelStep) {
          const labRows = scopeCatalogRows(ownerRows as any, "equipos_laboratorio");
          if (!labRows.length) {
            strictReply = "En base de datos no tengo planchas de calentamiento/agitación activas en este momento. Solo puedo ofrecer referencias activas del catálogo cargado (balanzas y analizador de humedad).";
            strictMemory.awaiting_action = "strict_choose_family";
          }
        }
        if (!String(strictReply || "").trim() && freeCatalogAskInModelStep && !isCategorySwitchInModelStep) {
          const asksAllProductsGlobal = isGlobalCatalogAsk(text);
          if (asksAllProductsGlobal) {
            const globalFamilies = buildNumberedFamilyOptions(ownerRows as any[], 10);
            const globalTotal = globalFamilies.reduce((acc: number, o: any) => acc + Number(o?.count || 0), 0);
            strictMemory.last_category_intent = "";
            strictMemory.strict_family_label = "";
            strictMemory.pending_product_options = [];
            strictMemory.pending_family_options = globalFamilies;
            strictMemory.awaiting_action = "strict_choose_family";
            strictReply = globalFamilies.length
              ? [
                `Perfecto. En total tengo ${globalTotal} referencias activas en base de datos.`,
                "Elige una familia para mostrarte opciones:",
                ...globalFamilies.map((o) => `${o.code}) ${o.label} (${o.count})`),
                "",
                "Si quieres, también dime qué vas a pesar y su funcionalidad para identificar cuál se adecúa a tu empresa.",
                "Responde con letra o número (A/1).",
              ].join("\n")
              : "Ahora mismo no veo familias activas en catálogo para mostrarte.";
          }
        }
        if (!String(strictReply || "").trim() && freeCatalogAskInModelStep && !isCategorySwitchInModelStep) {
          const asksMoreCapacityInModelStep = /(mas\s+capacidad|m[aá]s\s+capacidad|mayor\s+capacidad|de\s+mas\s+capacidad|de\s+m[aá]s\s+capacidad|mas\s+peso|m[aá]s\s+peso)/.test(textNorm);
          if (!categoryScoped.length) {
            strictMemory.awaiting_action = "strict_need_spec";
            strictReply = "En base de datos no tengo más referencias activas en este grupo por ahora. Si quieres, dime capacidad y resolución y te busco alternativas exactas.";
          } else if (asksMoreCapacityInModelStep) {
            const byCapacity = [...categoryScoped]
              .filter((r: any) => Number(getRowCapacityG(r) || 0) > 0)
              .sort((a: any, b: any) => Number(getRowCapacityG(b) || 0) - Number(getRowCapacityG(a) || 0));
            const options = buildNumberedProductOptions((byCapacity.length ? byCapacity : categoryScoped) as any[], 8);
            strictMemory.awaiting_action = "strict_choose_model";
            strictMemory.pending_product_options = options;
            strictMemory.pending_family_options = [];
            strictMemory.strict_model_offset = 0;
            strictReply = options.length
              ? [
                  "Sí, claro. Te comparto opciones de mayor capacidad que tengo activas en base de datos:",
                  ...options.slice(0, 6).map((o) => `${o.code}) ${o.name}`),
                  "",
                  "Si quieres, después de elegir una te ayudo a validar la resolución ideal para tu uso.",
                  "Puedes responder con letra o número (A/1).",
                ].join("\n")
              : "Ahora mismo no veo opciones de mayor capacidad activas en esta categoría. Si quieres, te propongo alternativas por disponibilidad.";
          } else {
            const options = buildNumberedProductOptions(categoryScoped as any[], 60);
            const page = options.slice(0, 8);
            strictMemory.awaiting_action = "strict_choose_model";
            strictMemory.pending_family_options = [];
            strictMemory.pending_product_options = page;
            strictMemory.strict_model_offset = 0;
            strictReply = [
              `Claro. En base de datos tengo ${categoryScoped.length} referencia(s) activas para esta categoría.`,
              "Te guío con opciones directas para no frenarte:",
              ...page.slice(0, 6).map((o) => `${o.code}) ${o.name}`),
              "",
              "Si prefieres, también te puedo filtrar por mayor capacidad o mejor precisión.",
              "Responde con letra o número (A/1).",
            ].join("\n");
          }
        }
        const askCount = /\b(cuantas|cuantos|total|tienen\s+\d+|\d+)\b/.test(textNorm) && !asksQuoteIntent(text);
        const familyRows = familyLabel
          ? categoryScoped.filter((r: any) => normalizeText(familyLabelFromRow(r)) === normalizeText(familyLabel))
          : categoryScoped;

        const asksPrecisionInventory =
          /(balanzas?\s+de\s+precision|balanzas?\s+de\s+precisi[oó]n|tienes?\s+de\s+precision|tienen\s+de\s+precision|hay\s+de\s+precision|manejan\s+de\s+precision)/.test(textNorm) &&
          !parseLooseTechnicalHint(text) &&
          !parseTechnicalSpecQuery(text);
        if (!String(strictReply || "").trim() && asksPrecisionInventory) {
          const precisionRows = scopeCatalogRows(ownerRows as any[], "balanzas_precision");
          const options = buildNumberedProductOptions(precisionRows as any[], 8);
          if (options.length) {
            strictMemory.pending_product_options = options;
            strictMemory.pending_family_options = [];
            strictMemory.awaiting_action = "strict_choose_model";
            strictMemory.strict_model_offset = 0;
            strictMemory.last_category_intent = "balanzas_precision";
            strictReply = [
              `Sí. En base de datos tengo ${precisionRows.length} balanza(s) de precisión activas.`,
              "Estas son 4 opciones recomendadas para iniciar:",
              ...options.slice(0, 4).map((o) => {
                const row = (precisionRows as any[]).find((r: any) => String(r?.id || "") === String(o.id || ""));
                const cap = Number(getRowCapacityG(row) || 0);
                const read = Number(getRowReadabilityG(row) || 0);
                return `${o.code}) ${o.name} | Cap: ${formatSpecNumber(cap)} g | Res: ${formatSpecNumber(read)} g`;
              }),
              "",
              "Elige con letra o número (A/1), o dime la resolución exacta (ej.: 0.01 g).",
            ].join("\n");
          } else {
            strictReply = "Ahora mismo no tengo balanzas de precisión activas en base de datos. Si quieres, reviso alternativas cercanas por resolución.";
          }
        }

        const bundleQuoteAsk =
          asksQuoteIntent(text) &&
          (
            /\b(las|los|todas|todos|opciones|referencias)\b/.test(textNorm) ||
            /\bcotiz(?:ar|a|acion|ación)?\s*(\d{1,2}|dos|tres|cuatro|cinco|seis|siete|ocho)\b/.test(textNorm)
          );
        if (!String(strictReply || "").trim() && bundleQuoteAsk) {
          const pendingOptions =
            (Array.isArray(previousMemory?.quote_bundle_options) ? previousMemory.quote_bundle_options : [])
              .concat(Array.isArray(previousMemory?.pending_product_options) ? previousMemory.pending_product_options : [])
              .concat(Array.isArray(previousMemory?.last_recommended_options) ? previousMemory.last_recommended_options : [])
              .filter((o: any, idx: number, arr: any[]) => {
                const key = String(o?.raw_name || o?.name || "").trim();
                if (!key) return false;
                return arr.findIndex((x: any) => String(x?.raw_name || x?.name || "").trim() === key) === idx;
              });
          const numberWordMap: Record<string, number> = { dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8 };
          const numMatch =
            textNorm.match(/\b(?:las|los)\s*(\d{1,2}|dos|tres|cuatro|cinco|seis|siete|ocho)\b/) ||
            textNorm.match(/\bcotiz(?:ar|a|acion|ación)?\s*(\d{1,2}|dos|tres|cuatro|cinco|seis|siete|ocho)\b/);
          const rawNum = String(numMatch?.[1] || "").trim();
          const selectedCount = /\b(todas|todos)\b/.test(textNorm)
            ? pendingOptions.length
            : Math.max(2, Number(rawNum ? (Number(rawNum) || numberWordMap[rawNum] || 3) : 3));
          const chosen = pendingOptions.slice(0, Math.max(1, Math.min(selectedCount, pendingOptions.length || selectedCount)));
          if (chosen.length >= 2) {
            const modelNames = chosen.map((o: any) => String(o?.raw_name || o?.name || "").trim()).filter(Boolean);
            strictBypassAutoQuote = true;
            inbound.text = `cotizar ${modelNames.join(" ; ")} cantidad 1 para todos`;
            strictMemory.pending_product_options = chosen;
            strictMemory.last_recommended_options = chosen;
            strictMemory.quote_bundle_options_current = chosen;
            strictMemory.quote_bundle_options = chosen;
            strictMemory.quote_quantity = 1;
            strictMemory.awaiting_action = "none";
            strictMemory.last_intent = "quote_bundle_request";
            strictMemory.bundle_quote_mode = true;
            strictMemory.bundle_quote_count = chosen.length;
            strictMemory.last_selected_product_name = "";
            strictMemory.last_selected_product_id = "";
            strictMemory.last_selection_at = "";
          }
        }
        const looseSpecHint = preParsedSpec
          ? {
              capacityG: Number((preParsedSpec as any)?.capacityG || 0),
              readabilityG: Number((preParsedSpec as any)?.readabilityG || 0),
            }
          : parseLooseTechnicalHint(text);
        const rangeHint = parseCapacityRangeHint(text);

        if (looseSpecHint && (looseSpecHint.capacityG || looseSpecHint.readabilityG)) {
          const rememberedCap = Number(
            previousMemory?.strict_partial_capacity_g ||
            previousMemory?.strict_filter_capacity_g ||
            strictMemory?.strict_filter_capacity_g ||
            0
          );
          const rememberedRead = Number(
            previousMemory?.strict_partial_readability_g ||
            previousMemory?.strict_filter_readability_g ||
            strictMemory?.strict_filter_readability_g ||
            0
          );
          const merged = mergeLooseSpecWithMemory(
            {
              capacityG: rememberedCap,
              readabilityG: rememberedRead,
            },
            looseSpecHint
          );
          const effectiveCap = Number(merged.capacityG || 0);
          const effectiveRead = Number(merged.readabilityG || 0);
          strictMemory.strict_partial_capacity_g = effectiveCap > 0 ? effectiveCap : "";
          strictMemory.strict_partial_readability_g = effectiveRead > 0 ? effectiveRead : "";

          if (effectiveRead > 0 && !(effectiveCap > 0)) {
            const tNormNeed = normalizeText(String(text || ""));
            const hasReadabilityConstraint = /(menos\s+de|menor\s+que|hasta|maximo|maximo\s+de|no\s+mas\s+de|no\s+m[aá]s\s+de)/.test(tNormNeed);
            const asksRecommendationNow = /(cual|cu[aá]l|recomiend|seria\s+buena|ser[ií]a\s+buena|me\s+sirve)/.test(tNormNeed);
            const asksDirectOptions = /(necesito|quiero|busco|tienen|tienes|opciones|cuales|cu[aá]les|muestrame|mu[eé]strame)/.test(tNormNeed);
            const shouldGuideCapacityFirst = effectiveRead <= 0.0001 && !hasReadabilityConstraint;
            if (!shouldGuideCapacityFirst && (hasReadabilityConstraint || asksRecommendationNow || asksDirectOptions)) {
              const isPointZeroOne = Math.abs(effectiveRead - 0.01) <= 0.000001;
              const byFamily = (familyRows as any[]).filter((r: any) => {
                const rs = extractRowTechnicalSpec(r);
                const rr = Number(rs.readabilityG || 0);
                if (!(rr > 0)) return false;
                if (isPointZeroOne) return Math.abs(rr - 0.01) <= 0.000001;
                return rr <= effectiveRead;
              });
              const byCategory = (categoryScoped as any[]).filter((r: any) => {
                const rs = extractRowTechnicalSpec(r);
                const rr = Number(rs.readabilityG || 0);
                if (!(rr > 0)) return false;
                if (isPointZeroOne) return Math.abs(rr - 0.01) <= 0.000001;
                return rr <= effectiveRead;
              });
              const pool = byFamily.length ? byFamily : byCategory;
              const rankedRead = rankCatalogByReadabilityOnly(pool as any[], effectiveRead);
              const rankedRows = rankedRead.length ? rankedRead.map((x: any) => x.row) : pool;
              const options = buildNumberedProductOptions((rankedRows || []).slice(0, 8) as any[], 8);
              if (options.length) {
                strictMemory.pending_product_options = options;
                strictMemory.pending_family_options = [];
                strictMemory.awaiting_action = "strict_choose_model";
                strictMemory.strict_model_offset = 0;
                strictMemory.strict_filter_readability_g = effectiveRead;
                strictReply = [
                  isPointZeroOne
                    ? "Perfecto. Para 0.01 g (balanzas de precisión), estas son 4 opciones disponibles en base de datos:"
                    : `Perfecto. Para precisión menor o igual a ${formatSpecNumber(effectiveRead)} g, estas son 4 opciones disponibles:`,
                  ...options.slice(0, 4).map((o) => {
                    const row = (rankedRows || []).find((r: any) => String(r?.id || "") === String(o.id || ""));
                    const cap = Number(getRowCapacityG(row) || 0);
                    return `${o.code}) ${o.name} | Cap: ${formatSpecNumber(cap)} g`;
                  }),
                  "",
                  "Elige con letra o número (A/1). Si quieres, luego afinamos por capacidad.",
                ].join("\n");
              } else {
                strictReply = `Entiendo. Para precisión <= ${formatSpecNumber(effectiveRead)} g no veo opciones activas en esta categoría. Si quieres, te propongo alternativas cercanas.`;
              }
            } else {
              const inferred = inferFamilyFromReadability(effectiveRead);
              strictReply = [
                `Perfecto. ${formatSpecNumber(effectiveRead)} g normalmente corresponde a ${inferred.family}.`,
                `¿Qué capacidad necesitas para afinarte la recomendación?`,
                `Opciones rápidas: ${inferred.capacityHint}.`,
              ].join("\n");
            }
          } else if (effectiveCap > 0 && !(effectiveRead > 0)) {
            strictReply = [
              `Perfecto, ya tengo la capacidad (${formatSpecNumber(effectiveCap)} g).`,
              "Ahora dime la resolución/precisión objetivo.",
              "Opciones comunes: 1 g, 0.1 g, 0.01 g, 0.001 g.",
            ].join("\n");
          } else {
            let prioritized = prioritizeTechnicalRows(familyRows as any[], {
              capacityG: effectiveCap,
              readabilityG: effectiveRead,
            });
            let switchedFromFamily = false;
            if (prioritized.exactCount === 0) {
              const categoryWide = prioritizeTechnicalRows(categoryScoped as any[], {
                capacityG: effectiveCap,
                readabilityG: effectiveRead,
              });
              if (categoryWide.exactCount > 0) {
                prioritized = categoryWide;
                switchedFromFamily = true;
              }
            }
            const filteredOptions = buildNumberedProductOptions((prioritized.orderedRows.length ? prioritized.orderedRows : familyRows) as any[], 60);
            const filteredPage = filteredOptions.slice(0, 8);
            strictMemory.strict_filter_capacity_g = Number(effectiveCap || 0);
            strictMemory.strict_filter_readability_g = Number(effectiveRead || 0);
            strictMemory.pending_product_options = filteredPage;
            strictMemory.strict_model_offset = 0;
            strictMemory.strict_family_label = familyLabel || String(previousMemory?.strict_family_label || "");
            strictMemory.strict_partial_capacity_g = "";
            strictMemory.strict_partial_readability_g = "";

            if (!filteredPage.length) {
              strictReply = "Gracias por el dato. En el catálogo actual no veo una coincidencia clara con esa característica en esta familia. Si quieres, te ayudo a buscarla por capacidad y resolución exacta (ej.: 4200 g x 0.01 g) para recomendarte la opción más segura.";
            } else {
              const criterionLabel = `${formatSpecNumber(effectiveCap)} g x ${formatSpecNumber(effectiveRead)} g`;
              const bestRow = (prioritized.orderedRows.length ? prioritized.orderedRows[0] : null) as any;
              const bestSpec = bestRow ? extractRowTechnicalSpec(bestRow) : { capacityG: 0, readabilityG: 0 };
              const bestCap = Number(bestSpec?.capacityG || 0);
              const bestRead = Number(bestSpec?.readabilityG || 0);
              const capDeltaPct = bestCap > 0 ? (Math.abs(bestCap - effectiveCap) / Math.max(1, effectiveCap)) * 100 : 9999;
              const readRatio = (bestRead > 0 && effectiveRead > 0) ? (Math.max(bestRead, effectiveRead) / Math.max(1e-9, Math.min(bestRead, effectiveRead))) : 9999;
              const tooFar = prioritized.exactCount === 0 && (capDeltaPct > 500 || readRatio > 20);
              if (tooFar) {
                const familyAlternatives = buildNumberedFamilyOptions(categoryScoped as any[], 8)
                  .filter((f) => normalizeText(String(f.label || "")) !== normalizeText(String(familyLabel || "")));
                strictMemory.pending_product_options = [];
                strictMemory.pending_family_options = familyAlternatives;
                strictMemory.awaiting_action = familyAlternatives.length ? "strict_choose_family" : "strict_need_spec";
                strictReply = familyAlternatives.length
                  ? [
                      `Para ${criterionLabel} no tengo opciones realmente compatibles en ${familyLabel || "esta familia"}.`,
                      "Sí puedo proponerte alternativas en otras familias:",
                      ...familyAlternatives.map((f) => `${f.code}) ${f.label} (${f.count})`),
                      "",
                      "Elige una con letra o número (A/1), o ajustamos capacidad/resolución.",
                    ].join("\n")
                  : `Para ${criterionLabel} no tengo opciones realmente compatibles en el catálogo activo de ${familyLabel || "esta familia"}. Si quieres, ajustamos capacidad/resolución.`;
              } else {
              const top = filteredPage.slice(0, 3);
              const exactIntro = prioritized.exactCount > 0
                ? `¡Excelente! Para ${criterionLabel} sí tenemos coincidencia en catálogo${switchedFromFamily ? " (en otra familia más adecuada)" : (familyLabel ? ` de ${familyLabel}` : "")}.`
                : `Para ${criterionLabel}, en ${familyLabel || "esta familia"} no veo coincidencia exacta, pero sí alternativas cercanas.`;
              strictReply = [
                exactIntro,
                `Para ${criterionLabel}, te sugiero empezar con estas 3 opciones:`,
                ...top.map((o, idx) => `${o.code}) ${o.name}${idx === 0 ? " (recomendada para iniciar)" : ""}`),
                "",
                (filteredOptions.length > filteredPage.length)
                  ? "Si quieres, escribe 'más' y te muestro otras alternativas. También puedes elegir A/1 para continuar."
                  : "Si quieres, te explico cuál conviene más según tu uso (laboratorio, joyería o industrial). También puedes elegir A/1.",
              ].join("\n");
              }
            }
          }
        }

        if (!String(strictReply || "").trim() && rangeHint) {
          const rangedOptionsAll = buildNumberedProductOptions(filterRowsByCapacityRange(familyRows as any[], rangeHint), 60);
          const rangedPage = rangedOptionsAll.slice(0, 8);
          if (rangedPage.length) {
            strictMemory.pending_product_options = rangedPage;
            strictMemory.strict_model_offset = 0;
            strictMemory.strict_family_label = familyLabel || String(previousMemory?.strict_family_label || "");
            strictReply = [
              `Perfecto. Te filtro por capacidad entre ${formatSpecNumber(rangeHint.minG)} g y ${Number.isFinite(rangeHint.maxG) ? `${formatSpecNumber(rangeHint.maxG)} g` : "más"}.`,
              ...rangedPage.slice(0, 4).map((o) => `${o.code}) ${o.name}`),
              "",
              (rangedOptionsAll.length > rangedPage.length)
                ? "Responde con letra o número (A/1), o escribe 'más' para ver siguientes."
                : "Responde con letra o número (A/1), o dime la resolución objetivo para afinar más.",
            ].join("\n");
          } else {
            strictReply = "No encontré modelos activos para ese rango de capacidad en esta familia. Si quieres, te muestro alternativas de otra familia.";
          }
        }

        const asksCheapest = /\b(economic|economica|economicas|economico|economicos|mas\s+barat|m[aá]s\s+barat|menor\s+precio|precio\s+bajo)\b/.test(normalizeText(text));
        if (!String(strictReply || "").trim() && asksCheapest) {
          const priced = (familyRows as any[])
            .filter((r: any) => Number(r?.base_price_usd || 0) > 0)
            .sort((a: any, b: any) => Number(a?.base_price_usd || 0) - Number(b?.base_price_usd || 0));
          const pricedSource = priced.length ? priced : (categoryScoped as any[])
            .filter((r: any) => Number(r?.base_price_usd || 0) > 0)
            .sort((a: any, b: any) => Number(a?.base_price_usd || 0) - Number(b?.base_price_usd || 0));
          const options = buildNumberedProductOptions(pricedSource as any[], 8);
          if (options.length) {
            strictMemory.pending_product_options = options;
            strictMemory.strict_model_offset = 0;
            strictMemory.strict_family_label = familyLabel || String(previousMemory?.strict_family_label || "");
            const topRow = pricedSource[0];
            const topFamily = normalizeText(familyLabelFromRow(topRow)) || normalizeText(String(topRow?.source_payload?.family || ""));
            const familyLabelHuman = topFamily ? String(familyLabelFromRow(topRow) || topFamily) : "N/A";
            strictReply = [
              `Perfecto. Según base de datos, la familia más económica aquí es: ${familyLabelHuman}.`,
              "Estas son 4 opciones más económicas:",
              ...options.slice(0, 4).map((o) => {
                const p = Number(o.base_price_usd || 0);
                return `${o.code}) ${o.name}${p > 0 ? ` (USD ${formatMoney(p)})` : ""}`;
              }),
              "",
              "Elige con letra o número (A/1), o escribe 'más'.",
            ].join("\n");
          }
        }

        const recommendationAsk = isRecommendationIntent(text) || /\b(no\s+se|no\s+sé)\b.*\b(modelo|cual|cu[aá]l|ofrecer|ofrecerme|elegir)\b/.test(normalizeText(text));
        if (!String(strictReply || "").trim() && recommendationAsk) {
          const allOptions = buildNumberedProductOptions(familyRows as any[], 60);
          const recommended = allOptions.slice(0, 3);
          const page = allOptions.slice(0, 8);
          strictMemory.pending_product_options = page;
          strictMemory.strict_model_offset = 0;
          strictMemory.strict_family_label = familyLabel || String(previousMemory?.strict_family_label || "");

          if (!recommended.length) {
            strictReply = "Claro, te ayudo a elegir. En este grupo no veo modelos disponibles ahora. Si quieres, te recomiendo otra familia según tu uso (laboratorio, joyería o industrial).";
          } else {
            const lines = recommended.map((o, idx) => {
              const pos = idx + 1;
              const hint = pos === 1
                ? "opción equilibrada para iniciar"
                : (pos === 2 ? "alternativa para comparar costo/beneficio" : "alternativa para mayor capacidad/robustez");
              return `${o.code}) ${o.name} - ${hint}`;
            });
            const rememberedUseCase = String(previousMemory?.strict_use_case || strictMemory?.strict_use_case || "").trim();
            const hasUseCaseContext = /(para\s+pesar|tornillo|tornillos|tuerca|tuercas|perno|pernos|muestra|muestras|laboratorio|joyeria|joyería|industrial)/.test(normalizeText(`${rememberedUseCase} ${text}`));
            strictReply = [
              "¡Claro! Te recomiendo estas opciones para empezar, sin complicarte:",
              ...lines,
              "",
              hasUseCaseContext
                ? "Con ese uso, para afinarte una recomendación final dime el rango de peso por unidad o capacidad aproximada."
                : "Si me dices el uso (ej.: laboratorio, joyería o industrial), te digo cuál elegir primero.",
              "También puedes responder con letra o número (A/1) y te envío ficha o cotización.",
            ].join("\n");
          }
        }

        const correctionAsk = isCorrectionIntent(text);
        if (!String(strictReply || "").trim() && correctionAsk) {
          const rememberedCap = Number(previousMemory?.strict_filter_capacity_g || previousMemory?.strict_partial_capacity_g || 0);
          const rememberedRead = Number(previousMemory?.strict_filter_readability_g || previousMemory?.strict_partial_readability_g || 0);
          if (rememberedCap > 0 && rememberedRead > 0) {
            const prioritized = prioritizeTechnicalRows(categoryScoped as any[], {
              capacityG: rememberedCap,
              readabilityG: rememberedRead,
            });
            const options = buildNumberedProductOptions((prioritized.orderedRows.length ? prioritized.orderedRows : familyRows) as any[], 60);
            const top = options.slice(0, 3);
            strictMemory.pending_product_options = options.slice(0, 8);
            strictMemory.awaiting_action = "strict_choose_model";
            strictMemory.strict_model_offset = 0;
            strictMemory.strict_filter_capacity_g = rememberedCap;
            strictMemory.strict_filter_readability_g = rememberedRead;
            strictReply = top.length
              ? [
                  `Gracias por corregirme. Reenfoqué la búsqueda a ${formatSpecNumber(rememberedCap)} g x ${formatSpecNumber(rememberedRead)} g y estas son las opciones más compatibles:`,
                  ...top.map((o) => `${o.code}) ${o.name}`),
                  "",
                  "Si quieres más, escribe 'más'. También puedes elegir A/1 para continuar.",
                ].join("\n")
              : "Gracias por corregirme. No veo coincidencias con ese criterio en el catálogo activo. Si quieres, te muestro alternativas por capacidad cercana.";
          }
        }

        const asksGlobalCatalogInModelStepTail = isGlobalCatalogAsk(text);
        const asksInventoryInModelStep = isInventoryInfoIntent(text) || isCatalogBreadthQuestion(text);
        if (!String(strictReply || "").trim() && (asksGlobalCatalogInModelStepTail || asksInventoryInModelStep)) {
          const families = buildNumberedFamilyOptions(ownerRows as any[], 10);
          const total = families.reduce((acc: number, f: any) => acc + Number(f?.count || 0), 0);
          strictMemory.last_category_intent = asksGlobalCatalogInModelStepTail ? "" : String(previousMemory?.last_category_intent || "");
          strictMemory.strict_family_label = "";
          strictMemory.pending_product_options = [];
          strictMemory.pending_family_options = families;
          strictMemory.strict_model_offset = 0;
          strictMemory.awaiting_action = "strict_choose_family";
          strictReply = families.length
            ? [
                `Perfecto. En total tengo ${total} referencias activas en base de datos.`,
                "Elige una familia para mostrarte modelos:",
                ...families.map((f: any) => `${f.code}) ${f.label} (${f.count})`),
                "",
                "Si quieres, también dime qué vas a pesar y su funcionalidad para identificar cuál se adecúa a tu empresa.",
                "Responde con letra o número (A/1).",
              ].join("\n")
            : "Ahora mismo no tengo familias activas para mostrarte en catálogo.";
        }

        if (!String(strictReply || "").trim()) {
        const allOptions = buildNumberedProductOptions(familyRows as any[], 60);
        const total = allOptions.length;
        const prevOffset = Math.max(0, Number(previousMemory?.strict_model_offset || 0));
        const nextOffset = askMore ? Math.min(prevOffset + 8, Math.max(0, total - 1)) : prevOffset;
        const page = allOptions.slice(nextOffset, nextOffset + 8);
        strictMemory.pending_product_options = page;
        strictMemory.strict_model_offset = nextOffset;
        strictMemory.strict_family_label = familyLabel || String(previousMemory?.strict_family_label || "");

        if (!page.length) {
          strictReply = "No tengo más modelos en ese grupo. Si quieres, te muestro otra familia.";
        } else if (askMore || askCount) {
          strictReply = [
            familyLabel
              ? `Sí, en ${familyLabel} tengo ${total} referencia(s).`
              : `Sí, tengo ${total} referencia(s) en este grupo.`,
            ...page.map((o) => `${o.code}) ${o.name}`),
            "",
            (nextOffset + 8 < total)
              ? "Escribe 'más' para ver siguientes, o elige con letra/número (A/1)."
              : "Elige con letra/número (A/1), o pide otra familia.",
          ].join("\n");
        } else {
          strictReply = [
            "Elige un modelo del listado con letra o número (A/1), o escribe 'más' para ver siguientes.",
            ...page.map((o) => `${o.code}) ${o.name}`),
          ].join("\n");
        }
        }
      } else if (!String(strictReply || "").trim() && awaiting === "strict_choose_family") {
        const pendingFamilies = Array.isArray(previousMemory?.pending_family_options) ? previousMemory.pending_family_options : [];
        const asksCategoryMenuInFamilyStep = isExplicitFamilyMenuAsk(text);
        const asksCheapestInFamilyStep = /\b(economic|economica|economicas|economico|economicos|mas\s+barat|m[aá]s\s+barat|menor\s+precio|precio\s+bajo)\b/.test(textNorm);
        const featureTermsInFamilyStep = extractFeatureTerms(text);
        const categoryIntentInFamilyStep = detectCatalogCategoryIntent(text);
        const currentCategoryInFamilyStep = normalizeText(String(previousMemory?.last_category_intent || rememberedCategory || ""));
        const isCategorySwitchInFamilyStep = Boolean(
          categoryIntentInFamilyStep && normalizeText(String(categoryIntentInFamilyStep || "")) !== currentCategoryInFamilyStep
        );
        if (!pendingFamilies.length) {
          strictMemory.awaiting_action = "none";
          strictReply = "En este momento no tengo familias disponibles en esa categoría. Si quieres, dime el modelo exacto (ej.: MB120) y te ayudo.";
        }

        if (!String(strictReply || "").trim() && asksCategoryMenuInFamilyStep) {
          const families = pendingFamilies.length ? pendingFamilies : buildNumberedFamilyOptions(ownerRows as any[], 8);
          strictMemory.pending_family_options = families;
          strictMemory.pending_product_options = [];
          strictMemory.awaiting_action = "strict_choose_family";
          strictReply = families.length
            ? [
                "Claro. Estas son las familias/categorías activas:",
                ...families.map((f: any) => `${f.code}) ${f.label} (${f.count})`),
                "",
                "Elige una con letra o número (A/1).",
              ].join("\n")
            : "En este momento no tengo familias activas para mostrar en catálogo.";
        }

        if (!String(strictReply || "").trim() && asksCheapestInFamilyStep) {
          const scopedForPrice = currentCategoryInFamilyStep
            ? scopeCatalogRows(ownerRows as any[], currentCategoryInFamilyStep)
            : (ownerRows as any[]);
          const pricedRows = (scopedForPrice as any[])
            .filter((r: any) => Number(r?.base_price_usd || 0) > 0)
            .sort((a: any, b: any) => Number(a?.base_price_usd || 0) - Number(b?.base_price_usd || 0));
          const options = buildNumberedProductOptions(pricedRows as any[], 8);
          if (options.length) {
            strictMemory.pending_product_options = options;
            strictMemory.pending_family_options = [];
            strictMemory.awaiting_action = "strict_choose_model";
            strictMemory.strict_model_offset = 0;
            const topRow = pricedRows[0];
            const topFamily = String(familyLabelFromRow(topRow) || "N/A").trim();
            strictReply = [
              `Perfecto. Según base de datos, la familia más económica aquí es: ${topFamily}.`,
              "Estas son 4 opciones de menor precio:",
              ...options.slice(0, 4).map((o) => {
                const p = Number(o.base_price_usd || 0);
                return `${o.code}) ${o.name}${p > 0 ? ` (USD ${formatMoney(p)})` : ""}`;
              }),
              "",
              "Responde con letra o número (A/1).",
            ].join("\n");
          } else {
            strictReply = "Ahora mismo no veo productos con precio cargado para calcular las opciones más económicas.";
          }
        }

        if (!String(strictReply || "").trim() && featureTermsInFamilyStep.length > 0 && !isOptionOnlyReply(text)) {
          const scopedForFeature = currentCategoryInFamilyStep
            ? scopeCatalogRows(ownerRows as any[], currentCategoryInFamilyStep)
            : (ownerRows as any[]);
          const rankedByFeature = rankCatalogByFeature(scopedForFeature as any[], featureTermsInFamilyStep).slice(0, 8);
          if (rankedByFeature.length) {
            const featureRows = rankedByFeature.map((x: any) => x.row).filter(Boolean);
            const options = buildNumberedProductOptions(featureRows as any[], 8);
            strictMemory.pending_product_options = options;
            strictMemory.pending_family_options = [];
            strictMemory.awaiting_action = "strict_choose_model";
            strictMemory.strict_model_offset = 0;
            strictReply = [
              `Sí, encontré ${rankedByFeature.length} referencia(s) que coinciden con esa descripción (${featureTermsInFamilyStep.join(", ")}).`,
              ...options.slice(0, 4).map((o) => `${o.code}) ${o.name}`),
              "",
              "Elige con letra o número (A/1) y te envío la información técnica.",
            ].join("\n");
          } else {
            const fallback = buildNumberedProductOptions(scopedForFeature as any[], 8);
            strictMemory.pending_product_options = fallback;
            strictMemory.pending_family_options = [];
            strictMemory.awaiting_action = fallback.length ? "strict_choose_model" : "strict_need_spec";
            strictMemory.strict_model_offset = 0;
            strictReply = fallback.length
              ? [
                  `No encontré coincidencia exacta para (${featureTermsInFamilyStep.join(", ")}) en esta categoría.`,
                  "Estas son las opciones activas más cercanas:",
                  ...fallback.slice(0, 4).map((o) => `${o.code}) ${o.name}`),
                  "",
                  "Elige con letra o número (A/1), o dime otra característica exacta.",
                ].join("\n")
              : "No encontré coincidencias por esa descripción y no veo opciones activas en esta categoría en este momento.";
          }
        }

        if (!String(strictReply || "").trim() && isCategorySwitchInFamilyStep) {
          const scoped = scopeCatalogRows(ownerRows as any, String(categoryIntentInFamilyStep || ""));
          const families = buildNumberedFamilyOptions(scoped as any[], 8);
          strictMemory.last_category_intent = String(categoryIntentInFamilyStep || "");
          strictMemory.pending_product_options = [];
          strictMemory.pending_family_options = families;
          strictMemory.awaiting_action = "strict_choose_family";
          strictReply = families.length
            ? [
              `Perfecto, cambio la búsqueda a ${String(categoryIntentInFamilyStep || "catálogo").replace(/_/g, " ")}.`,
              "Elige familia:",
              ...families.map((o) => `${o.code}) ${o.label} (${o.count})`),
              "",
              "Responde con letra o número (A/1).",
            ].join("\n")
            : `En base de datos no tengo referencias activas para ${String(categoryIntentInFamilyStep || "esa categoría").replace(/_/g, " ")} en este momento.`;
        }

        if (!String(strictReply || "").trim() && preParsedSpec) {
          const cap = Number((preParsedSpec as any)?.capacityG || 0);
          const read = Number((preParsedSpec as any)?.readabilityG || 0);
          if (cap > 0 && read > 0) {
            strictMemory.strict_spec_query = `${formatSpecNumber(cap)} g x ${formatSpecNumber(read)} g`;
            strictMemory.strict_filter_capacity_g = cap;
            strictMemory.strict_filter_readability_g = read;
            const exactRows = getExactTechnicalMatches(ownerRows as any[], { capacityG: cap, readabilityG: read });
            const prioritized = prioritizeTechnicalRows(ownerRows as any[], { capacityG: cap, readabilityG: read });
            const sourceRows = exactRows.length ? exactRows : (prioritized.orderedRows.length ? prioritized.orderedRows : ownerRows);
            const allOptions = buildNumberedProductOptions(sourceRows as any[], 60);
            const options = allOptions.slice(0, 8);
            if (options.length) {
              strictMemory.pending_product_options = options;
              strictMemory.pending_family_options = [];
              strictMemory.awaiting_action = "strict_choose_model";
              strictMemory.strict_model_offset = 0;
              strictMemory.strict_family_label = "";
              strictReply = [
                exactRows.length
                  ? `Sí, para ${strictMemory.strict_spec_query} tengo coincidencias exactas.`
                  : `Para ${strictMemory.strict_spec_query} no veo coincidencia exacta, pero sí opciones cercanas:`,
                ...options.slice(0, 3).map((o) => `${o.code}) ${o.name}`),
                "",
                (allOptions.length > options.length)
                  ? "Responde con letra o número (A/1), o escribe 'más' para ver siguientes."
                  : "Responde con letra o número (A/1).",
              ].join("\n");
            } else {
              strictMemory.awaiting_action = "strict_need_spec";
              strictReply = "No encontré coincidencias para esa capacidad/resolución en el catálogo activo. Si quieres, te muestro alternativas cercanas.";
            }
          }
        }

        const looseSpecHintInFamilyStep = parseLooseTechnicalHint(text);
        if (!String(strictReply || "").trim() && looseSpecHintInFamilyStep && (looseSpecHintInFamilyStep.capacityG || looseSpecHintInFamilyStep.readabilityG)) {
          const merged = mergeLooseSpecWithMemory(
            {
              capacityG: Number(previousMemory?.strict_partial_capacity_g || 0),
              readabilityG: Number(previousMemory?.strict_partial_readability_g || 0),
            },
            looseSpecHintInFamilyStep
          );
          const effectiveCap = Number(merged.capacityG || 0);
          const effectiveRead = Number(merged.readabilityG || 0);
          strictMemory.strict_partial_capacity_g = effectiveCap > 0 ? effectiveCap : "";
          strictMemory.strict_partial_readability_g = effectiveRead > 0 ? effectiveRead : "";

          if (effectiveRead > 0 && !(effectiveCap > 0)) {
            strictReply = [
              `Perfecto, ya tengo la precisión (${formatSpecNumber(effectiveRead)} g).`,
              "Para recomendarte mejor, dime la capacidad aproximada.",
              "Opciones rápidas: 500 g, 2 kg, 4.2 kg.",
            ].join("\n");
          } else if (effectiveCap > 0 && !(effectiveRead > 0)) {
            strictReply = [
              `Perfecto, ya tengo la capacidad (${formatSpecNumber(effectiveCap)} g).`,
              "Ahora dime la resolución/precisión objetivo.",
              "Opciones comunes: 1 g, 0.1 g, 0.01 g, 0.001 g.",
            ].join("\n");
          } else {
            const prioritized = prioritizeTechnicalRows(baseScoped as any[], {
              capacityG: effectiveCap,
              readabilityG: effectiveRead,
            });

            const sourceRows = prioritized.orderedRows.length ? prioritized.orderedRows : (baseScoped as any[]);
            const allOptions = buildNumberedProductOptions(sourceRows, 60);
            const options = allOptions.slice(0, 8);
            strictMemory.strict_filter_capacity_g = Number(effectiveCap || 0);
            strictMemory.strict_filter_readability_g = Number(effectiveRead || 0);
            strictMemory.pending_product_options = options;
            strictMemory.pending_family_options = [];
            strictMemory.awaiting_action = "strict_choose_model";
            strictMemory.strict_model_offset = 0;
            strictMemory.strict_family_label = "";
            strictMemory.strict_partial_capacity_g = "";
            strictMemory.strict_partial_readability_g = "";

            if (!options.length) {
              strictReply = "Gracias por el dato. No encontré coincidencias claras con esa característica en el catálogo activo. Si quieres, envíame capacidad y resolución exacta (ej.: 4200 g x 0.01 g) y lo ajusto mejor.";
            } else {
              const criterionLabel = `${formatSpecNumber(effectiveCap)} g x ${formatSpecNumber(effectiveRead)} g`;
              const top = options.slice(0, 3);
              const exactIntro = prioritized.exactCount > 0
                ? `¡Excelente! Con base en ${criterionLabel}, sí tenemos coincidencia en el catálogo.`
                : `Con base en ${criterionLabel}, no veo coincidencia exacta en este grupo, pero sí opciones cercanas.`;
              strictReply = [
                exactIntro,
                "Para facilitarte la elección, te recomiendo estas 3 primero:",
                ...top.map((o, idx) => `${o.code}) ${o.name}${idx === 0 ? " (recomendada para iniciar)" : ""}`),
                "",
                (allOptions.length > options.length)
                  ? "Si quieres más alternativas, escribe 'más'. También puedes elegir A/1 para continuar."
                  : "También puedo recomendarte la mejor según tu uso. Si prefieres, elige A/1 para continuar.",
              ].join("\n");
            }
          }
        }

        const selectedFamily =
          resolvePendingFamilyOption(text, pendingFamilies) ||
          ((isRecommendationIntent(text) || isUseCaseApplicabilityIntent(text) || isUseCaseFamilyHint(text))
            ? inferFamilyFromUseCase(text, pendingFamilies)
            : null);
        const followupIntentInFamilyStep = detectAlternativeFollowupIntent(text);
        const conversationalReformulationInFamilyStep = Boolean(
          /(no\s+me\s+sirve|otra\s+opcion|otra\s+opción|me\s+puedes\s+ofrecer|que\s+me\s+recomiendas|qué\s+me\s+recomiendas)/.test(textNorm) ||
          followupIntentInFamilyStep
        );
        let handledTechnicalGuidedInFamilyStep = false;
        if (!String(strictReply || "").trim() && !selectedFamily && conversationalReformulationInFamilyStep) {
          const quick = buildNumberedProductOptions(baseScoped as any[], 60).slice(0, 3);
          if (quick.length) {
            strictMemory.pending_product_options = quick;
            strictMemory.pending_family_options = [];
            strictMemory.awaiting_action = "strict_choose_model";
            strictMemory.strict_model_offset = 0;
            strictMemory.strict_family_label = String(familyLabelFromRow((baseScoped as any[])[0] || "") || "");
            strictReply = [
              "Claro. Para no perder el hilo, te propongo estas opciones reales del catálogo y luego afinamos según capacidad/resolución:",
              ...quick.map((o) => `${o.code}) ${o.name}`),
              "",
              "Si prefieres, dime capacidad y resolución objetivo (ej.: 200 g x 0.001 g).",
            ].join("\n");
          }
        }
        if (!String(strictReply || "").trim() && !selectedFamily) {
          const looseHintWithoutFamily = parseLooseTechnicalHint(text);
          const hintedCap = Number(looseHintWithoutFamily?.capacityG || 0);
          const hintedRead = Number(looseHintWithoutFamily?.readabilityG || 0);
          if (hintedCap > 0 || hintedRead > 0) {
            handledTechnicalGuidedInFamilyStep = true;
            let recommendedRows = baseScoped as any[];
            if (hintedCap > 0 && hintedRead > 0) {
              const prioritized = prioritizeTechnicalRows(baseScoped as any[], { capacityG: hintedCap, readabilityG: hintedRead });
              if (prioritized.orderedRows.length) recommendedRows = prioritized.orderedRows as any[];
            } else if (hintedCap > 0) {
              const rankedCap = rankCatalogByCapacityOnly(baseScoped as any[], hintedCap);
              if (rankedCap.length) recommendedRows = rankedCap.map((x: any) => x.row);
            } else if (hintedRead > 0) {
              const rankedRead = rankCatalogByReadabilityOnly(baseScoped as any[], hintedRead);
              if (rankedRead.length) recommendedRows = rankedRead.map((x: any) => x.row);
            }

            const sourceRows = (Array.isArray(recommendedRows) && recommendedRows.length)
              ? recommendedRows
              : (ownerRows as any[]);
            const allOptions = buildNumberedProductOptions(sourceRows as any[], 60);
            const options = allOptions.slice(0, 8);
            if (options.length) {
              strictMemory.pending_product_options = options;
              strictMemory.pending_family_options = [];
              strictMemory.awaiting_action = "strict_choose_model";
              strictMemory.strict_family_label = "";
              strictMemory.strict_model_offset = 0;
              if (hintedCap > 0) strictMemory.strict_filter_capacity_g = hintedCap;
              if (hintedRead > 0) strictMemory.strict_filter_readability_g = hintedRead;
              const criterionLabel = (hintedCap > 0 && hintedRead > 0)
                ? `${formatSpecNumber(hintedCap)} g x ${formatSpecNumber(hintedRead)} g`
                : (hintedCap > 0 ? `${formatSpecNumber(hintedCap)} g` : `${formatSpecNumber(hintedRead)} g`);
              strictReply = [
                `Perfecto. Para ${criterionLabel}, te muestro opciones cercanas en catálogo:`,
                ...options.map((o) => `${o.code}) ${o.name}`),
                "",
                (allOptions.length > options.length)
                  ? "Responde con letra o número (A/1), o escribe 'más' para ver siguientes."
                  : "Responde con letra o número (A/1).",
              ].join("\n");
            } else {
              strictReply = "Entendí tu necesidad técnica, pero no encontré coincidencias activas en este momento. Si quieres, escribe 'volver' para elegir familia o ajusta capacidad/resolución.";
            }
          }
        }
        if (!String(strictReply || "").trim() && !selectedFamily && !handledTechnicalGuidedInFamilyStep) {
          const familyHints = pendingFamilies
            .slice(0, 6)
            .map((f: any) => ({ code: String(f?.code || ""), name: String(f?.label || "") }))
            .filter((f: any) => f.code && f.name);
          const softReply = await buildStrictConversationalReply({
            apiKey,
            inboundText: text,
            awaiting,
            selectedProduct: String(previousMemory?.last_selected_product_name || previousMemory?.last_product_name || ""),
            categoryHint: rememberedCategory,
            pendingOptions: familyHints,
          });
          strictReply = String(softReply || "").trim() || buildGuidedRecoveryMessage({
            awaiting,
            rememberedProduct: String(previousMemory?.last_selected_product_name || previousMemory?.last_product_name || ""),
            hasPendingFamilies: pendingFamilies.length > 0,
            inboundText: text,
          });
        } else if (!String(strictReply || "").trim() && selectedFamily) {
          const selectedFamilyResolved = selectedFamily as { key?: string; label?: string };
          const familyRows = baseScoped.filter((r: any) => normalizeText(familyLabelFromRow(r)) === normalizeText(String(selectedFamilyResolved.key || "")));
          const hinted = parseLooseTechnicalHint(text);
          const rangeHint = parseCapacityRangeHint(text);
          const hintedCap = Number(hinted?.capacityG || 0);
          const hintedRead = Number(hinted?.readabilityG || 0);
          const familyMaxCap = familyRows.reduce((mx: number, r: any) => Math.max(mx, Number(getRowCapacityG(r) || 0)), 0);
          const capacityOutOfFamilyRange = hintedCap > 0 && familyMaxCap > 0 && familyMaxCap < (hintedCap * 0.7);
          const baseRowsForRanking = capacityOutOfFamilyRange ? (baseScoped as any[]) : (familyRows as any[]);
          let recommendedRows = baseRowsForRanking as any[];
          if (hintedCap > 0 && hintedRead > 0) {
            const prioritized = prioritizeTechnicalRows(baseRowsForRanking as any[], { capacityG: hintedCap, readabilityG: hintedRead });
            if (prioritized.orderedRows.length) recommendedRows = prioritized.orderedRows as any[];
          } else if (hintedCap > 0) {
            const rankedCap = rankCatalogByCapacityOnly(baseRowsForRanking as any[], hintedCap);
            if (rankedCap.length) recommendedRows = rankedCap.map((x: any) => x.row);
          } else if (hintedRead > 0) {
            const rankedRead = rankCatalogByReadabilityOnly(baseRowsForRanking as any[], hintedRead);
            if (rankedRead.length) recommendedRows = rankedRead.map((x: any) => x.row);
          }
          if (rangeHint) {
            const ranged = filterRowsByCapacityRange(recommendedRows as any[], rangeHint);
            if (ranged.length) recommendedRows = ranged;
          }
          const appProfile = String(strictMemory.target_application || previousMemory?.target_application || "").trim();
          const profiledRows = applyApplicationProfile(recommendedRows as any[], {
            application: appProfile,
            targetCapacityG: hintedCap || Number(previousMemory?.strict_filter_capacity_g || 0),
            targetReadabilityG: hintedRead || Number(previousMemory?.strict_filter_readability_g || 0),
          });
          const allOptions = buildNumberedProductOptions(profiledRows as any[], 60);
          const options = allOptions.slice(0, 8);
          strictMemory.pending_product_options = options;
          strictMemory.pending_family_options = [];
          strictMemory.awaiting_action = "strict_choose_model";
          strictMemory.strict_family_label = capacityOutOfFamilyRange ? "" : String(selectedFamilyResolved.label || "");
          strictMemory.strict_model_offset = 0;
          if (hintedCap > 0) strictMemory.strict_filter_capacity_g = hintedCap;
          if (hintedRead > 0) strictMemory.strict_filter_readability_g = hintedRead;
          const needsReadabilityForQuote = hintedCap > 0 && !(hintedRead > 0);
          const recommendationIntro = (isRecommendationIntent(text) || isUseCaseApplicabilityIntent(text))
              ? (capacityOutOfFamilyRange
                ? `Para ese uso y capacidad (${formatSpecNumber(hintedCap)} g), te muestro ${options.length} opción(es)${allOptions.length > options.length ? ` de ${allOptions.length}` : ""} más cercanas en catálogo:`
                : `Para ese uso te recomiendo empezar con ${String(selectedFamilyResolved.label || "esa familia")}. Modelos sugeridos (${options.length} mostrados${allOptions.length > options.length ? ` de ${allOptions.length}` : ""}):`)
            : `Perfecto. Modelos de ${String(selectedFamilyResolved.label || "familia")} (${allOptions.length}):`;
          strictReply = [
            recommendationIntro,
            ...options.map((o) => `${o.code}) ${o.name}`),
            "",
            ...(options.length >= 3
              ? [
                  (options.length >= 4)
                    ? `Si quieres cotizar varias de una vez, escribe: cotizar 3 o cotizar ${options.length}.`
                    : "Si quieres cotizar varias de una vez, escribe: cotizar 3.",
                  "",
                ]
              : []),
            ...(needsReadabilityForQuote
              ? ["Si quieres cotización exacta, compárteme también la resolución (ej.: 4000 g x 0.01 g).", ""]
              : []),
            (allOptions.length > options.length)
              ? "Responde con letra o número (ej.: A o 1), o escribe 'más' para ver siguientes."
              : "Responde con letra o número (ej.: A o 1).",
          ].join("\n");
        }
      } else if (!String(strictReply || "").trim() && wantsQuote && !selectedProduct && !explicitModel) {
        strictMemory.awaiting_action = "strict_need_spec";
        strictMemory.pending_product_options = [];
        strictMemory.pending_family_options = [];
        strictReply = "Claro. Para cotizarte bien, dime capacidad y resolución (ej.: 2 kg x 0.01 g).";
      } else if (!String(strictReply || "").trim() && !selectedProduct && technicalSpecIntent) {
        const parsed = parseTechnicalSpecQuery(text);
        if (!parsed) {
          strictMemory.awaiting_action = "strict_need_spec";
          strictReply = "Te entendí como consulta técnica. Para responder exacto, envíame capacidad y resolución en formato 220 g x 0.0001 g.";
        } else {
          strictMemory.strict_spec_query = text;
          const ranked = rankCatalogByTechnicalSpec(ownerRows as any[], {
            capacityG: parsed.capacityG,
            readabilityG: parsed.readabilityG,
          });
          const rankedRowsRaw = ranked.length ? ranked.map((r: any) => r.row) : ownerRows;
          const appProfile = String(strictMemory.target_application || previousMemory?.target_application || "").trim();
          const rankedRows = applyApplicationProfile(rankedRowsRaw as any[], {
            application: appProfile,
            targetCapacityG: Number(parsed.capacityG || 0),
            targetReadabilityG: Number(parsed.readabilityG || 0),
          });
          const options = buildNumberedProductOptions(rankedRows as any[], 8);
          if (options.length) {
            strictMemory.pending_product_options = options;
            strictMemory.pending_family_options = [];
            strictMemory.awaiting_action = "strict_choose_model";
            strictMemory.strict_model_offset = 0;
            strictReply = [
              `Sí, tengo opciones para ${text.trim()}.`,
              ...options.slice(0, 6).map((o) => `${o.code}) ${o.name}`),
              "",
              "Responde con letra o número (A/1) y te envío ficha técnica o cotización.",
            ].join("\n");
          } else {
            strictMemory.awaiting_action = "strict_need_spec";
            strictReply = "No encontré coincidencia exacta para esa capacidad/resolución. ¿Quieres que busquemos una resolución cercana?";
          }
        }
      } else if (!String(strictReply || "").trim() && (categoryIntent || isInventoryInfoIntent(text))) {
        const scoped = categoryIntent ? scopeCatalogRows(ownerRows as any, categoryIntent) : ownerRows;
        const familyOptions = buildNumberedFamilyOptions(scoped as any[], 8);
        strictMemory.pending_family_options = familyOptions;
        strictMemory.pending_product_options = [];
        strictMemory.last_category_intent = String(categoryIntent || "");
        const useCaseDrivenRequest = isRecommendationIntent(text) || isUseCaseApplicabilityIntent(text) || /joyeria|joyería|oro/.test(normalizeText(text));
        if (!familyOptions.length) {
          strictMemory.awaiting_action = "none";
          strictReply = `Ahora mismo no tengo referencias activas para ${String((categoryIntent || "esa categoría").replace(/_/g, " "))}. Si quieres, dime el modelo exacto y te confirmo ficha o cotización.`;
        } else if (useCaseDrivenRequest) {
          const inferred = inferFamilyFromUseCase(text, familyOptions);
          if (inferred) {
            const familyRows = scoped.filter((r: any) => normalizeText(familyLabelFromRow(r)) === normalizeText(String((inferred as any)?.key || "")));
            const hinted = parseLooseTechnicalHint(text);
            const rangeHint = parseCapacityRangeHint(text);
            const hintedCap = Number(hinted?.capacityG || 0);
            const hintedRead = Number(hinted?.readabilityG || 0);
            const familyMaxCap = familyRows.reduce((mx: number, r: any) => Math.max(mx, Number(getRowCapacityG(r) || 0)), 0);
            const capacityOutOfFamilyRange = hintedCap > 0 && familyMaxCap > 0 && familyMaxCap < (hintedCap * 0.7);
            const baseRowsForRanking = capacityOutOfFamilyRange ? (scoped as any[]) : (familyRows as any[]);
            let recommendedRows = baseRowsForRanking as any[];
            if (hintedCap > 0 && hintedRead > 0) {
              const prioritized = prioritizeTechnicalRows(baseRowsForRanking as any[], { capacityG: hintedCap, readabilityG: hintedRead });
              if (prioritized.orderedRows.length) recommendedRows = prioritized.orderedRows as any[];
            } else if (hintedCap > 0) {
              const rankedCap = rankCatalogByCapacityOnly(baseRowsForRanking as any[], hintedCap);
              if (rankedCap.length) recommendedRows = rankedCap.map((x: any) => x.row);
            } else if (hintedRead > 0) {
              const rankedRead = rankCatalogByReadabilityOnly(baseRowsForRanking as any[], hintedRead);
              if (rankedRead.length) recommendedRows = rankedRead.map((x: any) => x.row);
            }
            if (rangeHint) {
              const ranged = filterRowsByCapacityRange(recommendedRows as any[], rangeHint);
              if (ranged.length) recommendedRows = ranged;
            }
            const appProfile = String(strictMemory.target_application || previousMemory?.target_application || detectTargetApplication(text) || "").trim();
            const profiledRows = applyApplicationProfile(recommendedRows as any[], {
              application: appProfile,
              targetCapacityG: hintedCap || Number(previousMemory?.strict_filter_capacity_g || 0),
              targetReadabilityG: hintedRead || Number(previousMemory?.strict_filter_readability_g || 0),
            });
            const allOptions = buildNumberedProductOptions(profiledRows as any[], 60);
            const options = allOptions.slice(0, 8);
            strictMemory.pending_product_options = options;
            strictMemory.pending_family_options = [];
            strictMemory.awaiting_action = "strict_choose_model";
            strictMemory.strict_family_label = capacityOutOfFamilyRange ? "" : String((inferred as any)?.label || "");
            strictMemory.strict_model_offset = 0;
            if (hintedCap > 0) strictMemory.strict_filter_capacity_g = hintedCap;
            if (hintedRead > 0) strictMemory.strict_filter_readability_g = hintedRead;
            strictReply = [
              `Para ese uso te recomiendo empezar con ${String((inferred as any)?.label || "esa familia")}. Modelos sugeridos (${options.length} mostrados${allOptions.length > options.length ? ` de ${allOptions.length}` : ""}):`,
              ...options.map((o) => `${o.code}) ${o.name}`),
              "",
              ...(options.length >= 3
                ? [
                    (options.length >= 4)
                      ? `Si quieres cotizar varias de una vez, escribe: cotizar 3 o cotizar ${options.length}.`
                      : "Si quieres cotizar varias de una vez, escribe: cotizar 3.",
                    "",
                  ]
                : []),
              (allOptions.length > options.length)
                ? "Responde con letra o número (ej.: A o 1), o escribe 'más' para ver siguientes."
                : "Responde con letra o número (ej.: A o 1).",
            ].join("\n");
          } else {
            if (isGuidedNeedDiscoveryText(text)) {
              const options = buildNumberedProductOptions(scoped as any[], 8).slice(0, 4);
              strictMemory.pending_product_options = options;
              strictMemory.pending_family_options = [];
              strictMemory.awaiting_action = options.length ? "strict_choose_model" : "strict_need_spec";
              strictReply = [
                "Sí, para esa necesidad sí tenemos opciones y te guío para recomendarte bien.",
                "Para afinar, dime qué peso aproximado manejas y si buscas alta precisión o uso general.",
                ...(options.length ? ["", "Opciones para empezar:", ...options.map((o) => `${o.code}) ${o.name}`), "", "Si quieres, elige A/1 y te envío ficha o cotización."] : []),
              ].join("\n");
            } else {
              strictMemory.awaiting_action = "strict_choose_family";
              const familyScopedTotal = familyOptions.reduce((acc: number, o: any) => acc + Number(o?.count || 0), 0);
              const priceRangeLine = normalizeText(String(categoryIntent || "")) === "balanzas" ? buildPriceRangeLine(scoped as any[]) : "";
              strictReply = [
                `Sí, tenemos ${familyScopedTotal || scoped.length} referencias en la categoría ${String((categoryIntent || "catalogo").replace(/_/g, " "))}.`,
                "Primero elige la familia:",
                ...familyOptions.map((o) => `${o.code}) ${o.label} (${o.count})`),
                "",
                ...(priceRangeLine ? [priceRangeLine] : []),
                "Si quieres, también dime qué vas a pesar y su funcionalidad para identificar cuál se adecúa a tu empresa.",
                "Responde con letra o número (ej.: A o 1).",
              ].join("\n");
            }
          }
        } else {
          if (isGuidedNeedDiscoveryText(text)) {
            const options = buildNumberedProductOptions(scoped as any[], 8).slice(0, 4);
            strictMemory.pending_product_options = options;
            strictMemory.pending_family_options = [];
            strictMemory.awaiting_action = options.length ? "strict_choose_model" : "strict_need_spec";
            strictReply = [
              "Sí, para esa necesidad sí tenemos opciones y te guío para recomendarte bien.",
              "Para afinar, dime qué peso aproximado manejas y si buscas alta precisión o uso general.",
              ...(options.length ? ["", "Opciones para empezar:", ...options.map((o) => `${o.code}) ${o.name}`), "", "Si quieres, elige A/1 y te envío ficha o cotización."] : []),
            ].join("\n");
          } else {
            strictMemory.awaiting_action = "strict_choose_family";
            const familyScopedTotal = familyOptions.reduce((acc: number, o: any) => acc + Number(o?.count || 0), 0);
            const priceRangeLine = normalizeText(String(categoryIntent || "")) === "balanzas" ? buildPriceRangeLine(scoped as any[]) : "";
            strictReply = [
              `Sí, tenemos ${familyScopedTotal || scoped.length} referencias en la categoría ${String((categoryIntent || "catalogo").replace(/_/g, " "))}.`,
              "Primero elige la familia:",
              ...familyOptions.map((o) => `${o.code}) ${o.label} (${o.count})`),
              "",
              ...(priceRangeLine ? [priceRangeLine] : []),
              "Si quieres, también dime qué vas a pesar y su funcionalidad para identificar cuál se adecúa a tu empresa.",
              "Responde con letra o número (ej.: A o 1).",
            ].join("\n");
          }
        }
      } else if (!String(strictReply || "").trim() && isTechnicalSpecQuery(text) && !selectedProduct) {
        const parsed = parseTechnicalSpecQuery(text);
        const ranked = parsed
          ? rankCatalogByTechnicalSpec(ownerRows as any[], { capacityG: parsed.capacityG, readabilityG: parsed.readabilityG })
          : [];
        const rankedRows = ranked.length ? ranked.map((r: any) => r.row) : ownerRows;
        const options = buildNumberedProductOptions(rankedRows as any[], 8);
        if (options.length) {
          strictMemory.pending_product_options = options;
          strictMemory.pending_family_options = [];
          strictMemory.awaiting_action = "strict_choose_model";
          strictMemory.strict_model_offset = 0;
          strictReply = [
            `Sí, tengo opciones para ${text.trim()}.`,
            ...options.slice(0, 6).map((o) => `${o.code}) ${o.name}`),
            "",
            "Responde con letra o número (A/1) y te envío ficha técnica o cotización.",
          ].join("\n");
        } else {
          strictMemory.awaiting_action = "strict_need_spec";
          strictReply = "No encontré coincidencia exacta para esa capacidad/resolución. ¿Quieres que busquemos una resolución cercana?";
        }
      } else if (!String(strictReply || "").trim() && preParsedSpec) {
        const cap = Number((preParsedSpec as any)?.capacityG || 0);
        const read = Number((preParsedSpec as any)?.readabilityG || 0);
        if (cap > 0 && read > 0) {
          strictMemory.strict_spec_query = `${formatSpecNumber(cap)} g x ${formatSpecNumber(read)} g`;
          strictMemory.strict_filter_capacity_g = cap;
          strictMemory.strict_filter_readability_g = read;
          const exactRows = getExactTechnicalMatches(ownerRows as any[], { capacityG: cap, readabilityG: read });
          const prioritized = prioritizeTechnicalRows(ownerRows as any[], { capacityG: cap, readabilityG: read });
          const sourceRows = exactRows.length ? exactRows : (prioritized.orderedRows.length ? prioritized.orderedRows : ownerRows);
          const options = buildNumberedProductOptions(sourceRows as any[], 8);
          if (options.length) {
            strictMemory.pending_product_options = options;
            strictMemory.pending_family_options = [];
            strictMemory.awaiting_action = "strict_choose_model";
            strictMemory.strict_model_offset = 0;
            strictReply = [
              exactRows.length
                ? `Sí, para ${strictMemory.strict_spec_query} tengo coincidencias exactas.`
                : `Para ${strictMemory.strict_spec_query} no veo coincidencia exacta, pero sí opciones cercanas:`,
              ...options.slice(0, 3).map((o) => `${o.code}) ${o.name}`),
              "",
              "Responde con letra o número (A/1), o escribe 'más'.",
            ].join("\n");
          } else {
            strictMemory.awaiting_action = "strict_need_spec";
            strictReply = "No encontré una coincidencia clara para esa capacidad/resolución. Si quieres, te ayudo a ajustar el criterio.";
          }
        }
      } else if (!String(strictReply || "").trim()) {
        const asksOptionsNow = /\b(dame|muestrame|mu[eé]strame|quiero|opciones?|alternativas?)\b/.test(textNorm);
        const appNow = detectTargetApplication(text);
        if (asksOptionsNow && appNow) {
          const capTarget = Number(previousMemory?.strict_filter_capacity_g || previousMemory?.target_capacity_g || 0);
          const readTarget = Number(previousMemory?.strict_filter_readability_g || previousMemory?.target_readability_g || 0);
          const categoryScoped = rememberedCategory ? scopeCatalogRows(ownerRows as any, rememberedCategory) : ownerRows;
          const options = getApplicationRecommendedOptions({
            rows: categoryScoped as any[],
            application: appNow,
            capTargetG: capTarget,
            targetReadabilityG: readTarget,
            strictPrecision: /(menos\s+de|maxima\s+precision|maxima\s+precisi[oó]n|alta\s+precision)/.test(textNorm),
            excludeId: String(previousMemory?.last_selected_product_id || previousMemory?.last_product_id || ""),
          });
          if (options.length) {
            strictMemory.target_application = appNow;
            strictMemory.target_industry = appNow === "joyeria_oro" ? "joyeria" : appNow;
            strictMemory.pending_product_options = options;
            strictMemory.pending_family_options = [];
            strictMemory.awaiting_action = "strict_choose_model";
            strictMemory.strict_model_offset = 0;
            strictReply = [
              `Perfecto. Para ${appNow.replace(/_/g, " ")}, estas son opciones activas:`,
              ...options.slice(0, 3).map((o) => `${o.code}) ${o.name}`),
              "",
              "Elige una con letra/número (A/1), o escribe 'más'.",
            ].join("\n");
          }
        }
        if (!String(strictReply || "").trim()) {
        strictReply = buildGuidedRecoveryMessage({
          awaiting,
          rememberedProduct: String(previousMemory?.last_selected_product_name || previousMemory?.last_product_name || ""),
          hasPendingFamilies: Array.isArray(previousMemory?.pending_family_options) && previousMemory.pending_family_options.length > 0,
          hasPendingModels: Array.isArray(previousMemory?.pending_product_options) && previousMemory.pending_product_options.length > 0,
          inboundText: text,
        });
        }
      }

      const strictAssetDelivered = strictDocs.length > 0;
      const strictQuoteDelivered = strictDocs.some((d) => /cotiz/i.test(`${String(d.caption || "")} ${String(d.fileName || "")}`));
      if (
        preParsedSpec &&
        /(no te entendi del todo|no pasa nada si hubo un typo|no te preocupes si hubo un error de escritura)/i.test(normalizeText(String(strictReply || "")))
      ) {
        const cap = Number((preParsedSpec as any)?.capacityG || 0);
        const read = Number((preParsedSpec as any)?.readabilityG || 0);
        if (cap > 0 && read > 0) {
          strictMemory.strict_spec_query = `${formatSpecNumber(cap)} g x ${formatSpecNumber(read)} g`;
          strictMemory.strict_filter_capacity_g = cap;
          strictMemory.strict_filter_readability_g = read;
          const exactRows = getExactTechnicalMatches(ownerRows as any[], { capacityG: cap, readabilityG: read });
          const prioritized = prioritizeTechnicalRows(ownerRows as any[], { capacityG: cap, readabilityG: read });
          const sourceRows = exactRows.length ? exactRows : (prioritized.orderedRows.length ? prioritized.orderedRows : ownerRows);
          const options = buildNumberedProductOptions(sourceRows as any[], 8);
          if (options.length) {
            strictMemory.pending_product_options = options;
            strictMemory.pending_family_options = [];
            strictMemory.awaiting_action = "strict_choose_model";
            strictMemory.strict_model_offset = 0;
            strictReply = [
              exactRows.length
                ? `Sí, para ${strictMemory.strict_spec_query} tengo coincidencias exactas.`
                : `Para ${strictMemory.strict_spec_query} no veo coincidencia exacta, pero sí opciones cercanas:`,
              ...options.slice(0, 3).map((o) => `${o.code}) ${o.name}`),
              "",
              "Responde con letra o número (A/1), o escribe 'más'.",
            ].join("\n");
          } else {
            strictMemory.awaiting_action = "strict_need_spec";
            strictReply = "No encontré coincidencias para esa capacidad/resolución en el catálogo activo. Si quieres, te muestro alternativas cercanas.";
          }
        }
      }
      if (!String(strictReply || "").trim() && strictAssetDelivered) {
        strictReply = strictQuoteDelivered
          ? "Listo. Te envié la cotización por este WhatsApp."
          : "Listo. Te envié la ficha técnica por este WhatsApp.";
      }
      if (strictAssetDelivered && String(strictReply || "").trim()) {
        strictReply = appendAdvisorAppointmentPrompt(strictReply);
        strictReply = appendQuoteClosurePrompt(strictReply);
        strictMemory.awaiting_action = "conversation_followup";
        strictMemory.conversation_status = "open";
        strictMemory.last_intent = strictQuoteDelivered ? "quote_generated" : "tech_sheet_request";
        if (strictQuoteDelivered) strictMemory.quote_feedback_due_at = isoAfterHours(24);
      }

      strictMemory.last_valid_state = String(strictMemory.awaiting_action || awaiting || "none");
      logStrictTransition({
        before: awaiting,
        after: String(strictMemory.awaiting_action || "none"),
        text,
        intent: String(strictMemory.last_intent || previousMemory?.last_intent || "strict_router"),
      });

      if (!String(strictReply || "").trim()) {
        const awaitingNow = String(strictMemory.awaiting_action || awaiting || "").trim();
        strictReply = awaitingNow === "strict_choose_action"
          ? "Responde 1 para cotización o 2 para ficha técnica."
          : awaitingNow === "strict_quote_data"
            ? "Para continuar con la cotización, envíame ciudad, empresa, NIT, contacto, correo y celular en un solo mensaje."
            : "¿En qué puedo ayudarte con tu cotización?";
        console.warn("[evolution-webhook] strict_reply_empty_before_send", { awaiting: awaitingNow, text });
      }

      if (!strictBypassAutoQuote) {
        const sentOk = await sendTextAndDocs(strictReply, strictDocs);
        if (!sentOk) return NextResponse.json({ ok: true, ignored: true, reason: "invalid_destination" });

        try {
          const strictClosed = String(strictMemory.conversation_status || "") === "closed";
          const strictQuoteContext =
            Boolean(strictMemory.last_quote_draft_id || previousMemory?.last_quote_draft_id || previousMemory?.last_quote_pdf_sent_at) ||
            /(quote_generated|quote_recall|price_request)/.test(String(strictMemory.last_intent || previousMemory?.last_intent || ""));
          const strictNextAction = strictClosed
            ? (strictQuoteContext ? "Recordatorio feedback cotizacion" : "Seguimiento WhatsApp")
            : (strictQuoteContext ? "Seguimiento cotizacion" : "");
          const strictNextActionAt = strictClosed
            ? (strictQuoteContext ? isoAfterHours(24) : isoAfterHours(48))
            : (strictQuoteContext ? isoAfterHours(24) : "");
          const strictMeetingAt = String(strictMemory.advisor_meeting_at || "").trim();
          await upsertCrmLifecycleState(supabase as any, {
            ownerId,
            tenantId: (agent as any)?.tenant_id || null,
            phone: inbound.from,
            realPhone: String(strictMemory.customer_phone || previousMemory?.customer_phone || ""),
            name: knownCustomerName || inbound.pushName || "",
            status: strictQuoteContext ? "quote" : undefined,
            nextAction: strictMeetingAt ? "Llamar cliente (cita WhatsApp)" : (strictNextAction || undefined),
            nextActionAt: strictMeetingAt || strictNextActionAt || undefined,
            metadata: {
              source: "evolution_strict_webhook",
              conversation_status: String(strictMemory.conversation_status || "open"),
              last_intent: String(strictMemory.last_intent || ""),
              quote_feedback_due_at: String(strictMemory.quote_feedback_due_at || ""),
              advisor_meeting_at: strictMeetingAt,
              advisor_meeting_label: String(strictMemory.advisor_meeting_label || ""),
            },
          });
          if (strictMeetingAt) {
            await mirrorAdvisorMeetingToAvanza({
              ownerId,
              tenantId: (agent as any)?.tenant_id || null,
              externalRef: String(inbound.messageId || incomingDedupKey || "reply"),
              phone: inbound.from,
              customerName: knownCustomerName || inbound.pushName || inbound.from,
              advisor: "Asesor comercial",
              meetingAt: strictMeetingAt,
              meetingLabel: String(strictMemory.advisor_meeting_label || ""),
              source: "evolution_strict_webhook",
            });
          }

          await persistConversationTurn(supabase as any, {
            agentId: String(agent.id),
            ownerId,
            tenantId: (agent as any)?.tenant_id || null,
            from: inbound.from,
            pushName: inbound.pushName,
            contactName: knownCustomerName || inbound.pushName || inbound.from,
            inboundText: inbound.text,
            outboundText: strictReply,
            messageId: inbound.messageId,
            memory: strictMemory,
          });
        } catch {}

        await supabase
          .from("incoming_messages")
          .update({ status: "processed", processed_at: new Date().toISOString() })
          .eq("provider", "evolution")
          .eq("provider_message_id", incomingDedupKey);

        return NextResponse.json({ ok: true, sent: true, strict: true });
      }

      // If strict flow rewrote inbound/intents for auto-quote, propagate updated strict memory
      // so downstream router does not read stale previousMemory state.
      Object.assign(nextMemory, strictMemory);
    }

    let awaitingAction = String(nextMemory?.awaiting_action || previousMemory?.awaiting_action || "");
    const originalInboundText = String(inboundTextAtEntry || inbound.text || "").trim();
    const lastUserAtMs = Date.parse(String(previousMemory?.last_user_at || ""));
    const staleStrictState = Number.isFinite(lastUserAtMs)
      && (Date.now() - lastUserAtMs) > 25 * 60 * 1000
      && /^(strict_choose_family|strict_choose_model|strict_quote_data)$/i.test(String(awaitingAction || ""));
    if (staleStrictState && !isOptionOnlyReply(originalInboundText) && !isGlobalCatalogAsk(originalInboundText)) {
      nextMemory.awaiting_action = "none";
      nextMemory.pending_product_options = [];
      nextMemory.pending_family_options = [];
      nextMemory.strict_model_offset = 0;
      nextMemory.strict_family_label = "";
      awaitingAction = "none";
    }
    if (isGlobalCatalogAsk(originalInboundText)) {
      nextMemory.awaiting_action = "none";
      nextMemory.last_category_intent = "";
      nextMemory.strict_family_label = "";
      nextMemory.pending_product_options = [];
      nextMemory.pending_family_options = [];
      inbound.text = "catalogo completo";
      awaitingAction = "none";
    }
    const explicitModelGlobal = hasConcreteProductHint(originalInboundText) && !isOptionOnlyReply(originalInboundText);
    if (explicitModelGlobal) {
      nextMemory.awaiting_action = "none";
      nextMemory.pending_product_options = [];
      nextMemory.pending_family_options = [];
      nextMemory.last_category_intent = "";

      try {
        const { data: ownerDirectRows } = await supabase
          .from("agent_product_catalog")
          .select("id,name,category,brand,base_price_usd,price_currency,source_payload,product_url,is_active")
          .eq("created_by", ownerId)
          .eq("is_active", true)
          .order("updated_at", { ascending: false })
          .limit(320);
        const directCommercialRows = (Array.isArray(ownerDirectRows) ? ownerDirectRows : []).filter((r: any) => isCommercialCatalogRow(r));
        const directModel = findExactModelProduct(originalInboundText, directCommercialRows as any[]) || pickBestCatalogProduct(originalInboundText, directCommercialRows as any[]);
        if (directModel?.id) {
          const directName = String((directModel as any)?.name || "").trim();
          nextMemory.last_product_name = directName;
          nextMemory.last_product_id = String((directModel as any)?.id || "").trim();
          nextMemory.last_product_category = String((directModel as any)?.category || "").trim();
          nextMemory.last_selected_product_name = directName;
          nextMemory.last_selected_product_id = String((directModel as any)?.id || "").trim();
          nextMemory.last_selection_at = new Date().toISOString();

          if (isTechnicalSheetIntent(originalInboundText)) {
            inbound.text = `ficha tecnica de ${directName}`;
          } else if (asksQuoteIntent(originalInboundText) || isPriceIntent(originalInboundText)) {
            inbound.text = `cotizar ${directName} ${originalInboundText}`.trim();
            nextMemory.awaiting_action = "quote_product_selection";
          } else {
            reply = [
              `Perfecto, encontré el modelo ${directName}.`,
              "Ahora dime qué deseas con ese modelo:",
              "1) Cotización con TRM y PDF",
              "2) Ficha técnica",
            ].join("\n");
            nextMemory.awaiting_action = "product_action";
            handledByRecommendation = true;
            handledByProductLookup = true;
            billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
          }
        }
      } catch {
        // ignore strict model bootstrap errors and continue with regular flow
      }
    }
    const inboundCategoryIntent = normalizeText(String(detectCatalogCategoryIntent(originalInboundText) || ""));
    const inboundInventoryIntent = Boolean(
      isGlobalCatalogAsk(originalInboundText) ||
      isInventoryInfoIntent(originalInboundText) ||
      isCatalogBreadthQuestion(originalInboundText) ||
      isBalanceTypeQuestion(originalInboundText)
    );
    if (isGlobalCatalogAsk(originalInboundText)) {
      nextMemory.last_category_intent = "";
      nextMemory.strict_family_label = "";
      nextMemory.pending_family_options = [];
      nextMemory.pending_product_options = [];
    }
    const inboundCategoryOrInventoryIntent = Boolean(inboundCategoryIntent) || inboundInventoryIntent;
    const inboundTechnicalSpec = isTechnicalSpecQuery(originalInboundText);
    const interruptsRefineFlow = Boolean(
      inboundCategoryOrInventoryIntent ||
      asksQuoteIntent(originalInboundText) ||
      isPriceIntent(originalInboundText) ||
      isTechnicalSheetIntent(originalInboundText) ||
      isProductImageIntent(originalInboundText) ||
      isGreetingIntent(originalInboundText)
    );
    if (inboundTechnicalSpec) {
      nextMemory.awaiting_action = "none";
      nextMemory.pending_product_options = [];
    }
    if ((awaitingAction === "technical_refine_prompt" || awaitingAction === "technical_refine_choice") && interruptsRefineFlow) {
      nextMemory.awaiting_action = "none";
    }

    if (!handledByGreeting && awaitingAction === "technical_refine_prompt") {
      const tRefine = normalizeText(originalInboundText);
      const directRefineChoice = /^(1|2|3|4|a|b|c|d)\b/.test(tRefine) || /mayor capacidad|menor capacidad|mejor resolucion|resolucion mas flexible|mas flexible/.test(tRefine);
      if (directRefineChoice) {
        nextMemory.awaiting_action = "technical_refine_choice";
      }
      if (isAffirmativeIntent(tRefine) || directRefineChoice) {
        const lastSpec = String(previousMemory?.last_technical_spec_query || nextMemory?.last_technical_spec_query || "").trim();
        if (!directRefineChoice) {
          reply = lastSpec
            ? `Perfecto. Para afinar, partiendo de "${lastSpec}", dime cuál variable ajustamos: 1) mayor capacidad, 2) menor capacidad, 3) mejor resolución, 4) resolución más flexible.`
            : "Perfecto. Para afinar, dime capacidad y resolución objetivo (ej.: 220g x 0.001g o 320g x 0.0001g).";
          nextMemory.awaiting_action = "technical_refine_choice";
          handledByRecommendation = true;
          billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        }
      } else if (!isConversationCloseIntent(originalInboundText)) {
        reply = "Para continuar, responde 'sí' y te doy opciones de ajuste, o escribe una nueva referencia (ej.: 320g x 0.0001).";
        nextMemory.awaiting_action = "technical_refine_prompt";
        handledByRecommendation = true;
        billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
      }
    }

    if (!handledByGreeting && String(previousMemory?.awaiting_action || "") === "technical_refine_choice") {
      const tChoice = normalizeText(originalInboundText);
      const lastSpec = String(previousMemory?.last_technical_spec_query || nextMemory?.last_technical_spec_query || "").trim();
      const parsed = parseTechnicalSpecQuery(lastSpec);
      const pickHighCap = /^(1|a)\b/.test(tChoice) || /mayor capacidad|mas capacidad/.test(tChoice);
      const pickLowCap = /^(2|b)\b/.test(tChoice) || /menor capacidad/.test(tChoice);
      const pickBetterRead = /^(3|c)\b/.test(tChoice) || /mejor resolucion/.test(tChoice);
      const pickFlexibleRead = /^(4|d)\b/.test(tChoice) || /resolucion mas flexible|mas flexible/.test(tChoice);

      if (parsed && (pickHighCap || pickLowCap || pickBetterRead || pickFlexibleRead)) {
        let nextCap = parsed.capacityG;
        let nextRead = parsed.readabilityG;
        if (pickHighCap) nextCap = parsed.capacityG * 1.5;
        if (pickLowCap) nextCap = parsed.capacityG * 0.7;
        if (pickBetterRead) nextRead = parsed.readabilityG / 10;
        if (pickFlexibleRead) nextRead = parsed.readabilityG * 10;
        const capText = formatSpecNumber(nextCap);
        const readText = formatSpecNumber(nextRead);
        inbound.text = `Necesitamos ${capText}g x ${readText}`;
        nextMemory.awaiting_action = "none";
      } else if (!isTechnicalSpecQuery(originalInboundText)) {
        reply = "Para afinar la búsqueda, responde 1, 2, 3 o 4 (o escribe capacidad y resolución, ej.: 320g x 0.0001).";
        nextMemory.awaiting_action = "technical_refine_choice";
        handledByRecommendation = true;
        billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
      }
    }
    const selectedNameStrict = String(
      nextMemory.last_selected_product_name ||
      previousMemory?.last_selected_product_name ||
      nextMemory.last_product_name ||
      previousMemory?.last_product_name ||
      ""
    ).trim();
    const selectedIdStrict = String(nextMemory.last_selected_product_id || previousMemory?.last_selected_product_id || "").trim();
    const selectedAtStrictMs = Date.parse(String(nextMemory.last_selection_at || previousMemory?.last_selection_at || ""));
    const selectedStrictActive =
      Boolean(selectedNameStrict || selectedIdStrict) &&
      Number.isFinite(selectedAtStrictMs) &&
      (Date.now() - selectedAtStrictMs) <= 30 * 60 * 1000;

    if (!handledByGreeting && selectedStrictActive && !inboundTechnicalSpec && !isConversationCloseIntent(originalInboundText)) {
      const tStrict = normalizeText(originalInboundText);
      const looksLikeTechnicalNumericSpec = /\b\d+(?:[\.,]\d+)?\s*(?:mg|g|kg)?\b\s*[x×]\s*\d+(?:[\.,]\d+)?\s*(?:mg|g|kg)?\b/.test(normalizeCatalogQueryText(originalInboundText));
      const looksLikeCategoryOrInventoryByTypos = /(balanza|balanzas|blanza|blanzas|bascula|basculas|bscula|bsculas|catalogo|inventario|referencias|que\s+tienen|tienen\s+bal)/.test(tStrict);
      const asksCatalogListStrict =
        isCatalogBreadthQuestion(originalInboundText) ||
        isInventoryInfoIntent(originalInboundText) ||
        isBalanceTypeQuestion(originalInboundText) ||
        looksLikeTechnicalNumericSpec ||
        looksLikeCategoryOrInventoryByTypos ||
        /(catalogo|que tipos|que tipo|que manejan|que tienen)/.test(tStrict);
      const explicitOtherModel = hasConcreteProductHint(originalInboundText) && !normalizeText(selectedNameStrict || "").includes(normalizeText(extractModelLikeTokens(originalInboundText).join(" ")));

      if (!asksCatalogListStrict && !explicitOtherModel) {
        const quoteByQtyOnly = hasBareQuantity(tStrict) && /^(quote_|product_action|quote_product_selection)$/.test(String(awaitingAction || ""));
        const wantsQuoteStrict = asksQuoteIntent(tStrict) || isPriceIntent(tStrict) || isQuoteProceedIntent(tStrict) || quoteByQtyOnly;
        const wantsSheetStrict = isTechnicalSheetIntent(tStrict);
        const wantsImageStrict = isProductImageIntent(tStrict);

        if (wantsQuoteStrict) {
          inbound.text = `cotizar ${selectedNameStrict} ${originalInboundText}`.trim();
          nextMemory.awaiting_action = "quote_product_selection";
        } else if (wantsSheetStrict && wantsImageStrict) {
          inbound.text = `ficha tecnica e imagen de ${selectedNameStrict}`;
          nextMemory.awaiting_action = "none";
        } else if (wantsSheetStrict) {
          inbound.text = `ficha tecnica de ${selectedNameStrict}`;
          nextMemory.awaiting_action = "none";
        } else if (wantsImageStrict) {
          inbound.text = `imagen de ${selectedNameStrict}`;
          nextMemory.awaiting_action = "none";
        } else if ((awaitingAction === "product_action" || awaitingAction === "conversation_followup") && isAffirmativeIntent(tStrict)) {
          reply = `Perfecto. Para ${selectedNameStrict}, responde 1 para cotización o 2 para ficha técnica.`;
          nextMemory.awaiting_action = "product_action";
          handledByQuoteStarter = true;
          billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        }
      }
    }
    if (awaitingAction === "conversation_followup" && isConversationCloseIntent(inbound.text)) {
      const hadQuoteContext =
        Boolean(previousMemory?.last_quote_draft_id || previousMemory?.last_quote_pdf_sent_at) ||
        /(quote_generated|quote_recall|price_request)/.test(String(previousMemory?.last_intent || ""));
      reply = hadQuoteContext
        ? "Perfecto, cerramos por ahora. Gracias por tu tiempo. Te estaremos enviando un recordatorio breve para saber como te parecio la cotizacion."
        : "Perfecto, cerramos por ahora. Gracias por tu tiempo. Si despues quieres retomar, te ayudo por este mismo WhatsApp.";
      nextMemory.awaiting_action = "none";
      nextMemory.conversation_status = "closed";
      nextMemory.last_intent = "conversation_closed";
      if (hadQuoteContext) nextMemory.quote_feedback_due_at = isoAfterHours(24);
      handledByGreeting = true;
      billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
    }
    if (!handledByGreeting && awaitingAction === "conversation_followup" && isAdvisorAppointmentIntent(inbound.text)) {
      reply = buildAdvisorMiniAgendaPrompt();
      nextMemory.awaiting_action = "advisor_meeting_slot";
      nextMemory.conversation_status = "open";
      handledByGreeting = true;
      billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
    }
    if (!handledByGreeting && awaitingAction === "advisor_meeting_slot") {
      const slot = parseAdvisorMiniAgendaChoice(inbound.text);
      if (!slot) {
        reply = "Para agendar con asesor, responde 1, 2 o 3 según el horario.";
        nextMemory.awaiting_action = "advisor_meeting_slot";
      } else {
        reply = `Perfecto. Agendé la gestión con asesor para ${slot.label}. Te contactaremos en ese horario por WhatsApp o llamada.`;
        nextMemory.awaiting_action = "conversation_followup";
        nextMemory.advisor_meeting_at = slot.iso;
        nextMemory.advisor_meeting_label = slot.label;
        reply = appendQuoteClosurePrompt(reply);
      }
      handledByGreeting = true;
      billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
    }
    if (!handledByGreeting && awaitingAction === "followup_quote_disambiguation") {
      const choice = parseAnotherQuoteChoice(originalInboundText);
      const rememberedProduct = String(nextMemory.last_selected_product_name || previousMemory?.last_selected_product_name || nextMemory.last_product_name || previousMemory?.last_product_name || "").trim();
      if (!choice) {
        reply = buildAnotherQuotePrompt();
        nextMemory.awaiting_action = "followup_quote_disambiguation";
        nextMemory.last_intent = "followup_quote_disambiguation";
      } else if (choice === "advisor") {
        reply = buildAdvisorMiniAgendaPrompt();
        nextMemory.awaiting_action = "advisor_meeting_slot";
      } else if (choice === "same_model" && rememberedProduct) {
        inbound.text = `cotizar ${rememberedProduct}`.trim();
        nextMemory.awaiting_action = "quote_product_selection";
      } else if (choice === "same_model") {
        reply = "Perfecto. Dime el modelo exacto que quieres recotizar y te ayudo enseguida.";
        nextMemory.awaiting_action = "strict_need_spec";
      } else if (choice === "other_model") {
        reply = "Perfecto. Para cotizar otro modelo, dime capacidad y resolución objetivo (ej.: 200 g x 0.001 g).";
        nextMemory.awaiting_action = "strict_need_spec";
      } else {
        reply = "Perfecto. Para opciones más económicas, dime capacidad/resolución objetivo o el uso y te propongo alternativas.";
        nextMemory.awaiting_action = "strict_need_spec";
      }
      handledByGreeting = true;
      billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
    }
    if (!handledByGreeting && awaitingAction === "conversation_followup" && !isConversationCloseIntent(inbound.text)) {
      if (isAnotherQuoteAmbiguousIntent(originalInboundText)) {
        reply = buildAnotherQuotePrompt();
        nextMemory.awaiting_action = "followup_quote_disambiguation";
        nextMemory.last_intent = "followup_quote_disambiguation";
        handledByGreeting = true;
        billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
      }
      const rememberedProduct = String(nextMemory.last_selected_product_name || previousMemory?.last_selected_product_name || nextMemory.last_product_name || previousMemory?.last_product_name || "").trim();
      if (!handledByGreeting && rememberedProduct) {
        const t = normalizeText(originalInboundText);
        const anotherQuoteChoiceConversation = parseAnotherQuoteChoice(originalInboundText);
        if (anotherQuoteChoiceConversation === "advisor") {
          reply = buildAdvisorMiniAgendaPrompt();
          nextMemory.awaiting_action = "advisor_meeting_slot";
          handledByGreeting = true;
          billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        } else if (anotherQuoteChoiceConversation === "other_model") {
          reply = "Perfecto. Para otra cotización de otro modelo, dime capacidad y resolución objetivo (ej.: 200 g x 0.001 g) y te muestro opciones.";
          nextMemory.awaiting_action = "strict_need_spec";
          handledByGreeting = true;
          billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        } else if (anotherQuoteChoiceConversation === "cheaper") {
          reply = "Perfecto. Te ayudo con opciones más económicas. Dime capacidad/resolución objetivo o el uso y te propongo alternativas.";
          nextMemory.awaiting_action = "strict_need_spec";
          handledByGreeting = true;
          billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        }
        const asksQuoteNow =
          anotherQuoteChoiceConversation === "same_model" ||
          asksQuoteIntent(t) || isPriceIntent(t) || isQuoteProceedIntent(t) || /\b(cotiza|cotizacion|precio)\b/.test(t);
        const asksSheetNow = isTechnicalSheetIntent(t);
        const asksImageNow = isProductImageIntent(t);
        if (!handledByGreeting && asksQuoteNow) {
          inbound.text = `cotizar ${rememberedProduct} ${originalInboundText}`.trim();
          nextMemory.awaiting_action = "quote_product_selection";
        } else if (!handledByGreeting && asksSheetNow && asksImageNow) {
          inbound.text = `ficha tecnica e imagen de ${rememberedProduct}`;
          nextMemory.awaiting_action = "none";
        } else if (!handledByGreeting && asksSheetNow) {
          inbound.text = `ficha tecnica de ${rememberedProduct}`;
          nextMemory.awaiting_action = "none";
        } else if (!handledByGreeting && asksImageNow) {
          inbound.text = `imagen de ${rememberedProduct}`;
          nextMemory.awaiting_action = "none";
        }
      }

      if (!String(reply || "").trim()) {
        reply = appendQuoteClosurePrompt("Con gusto.");
        handledByGreeting = true;
        billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
      }
    }
    if (!handledByGreeting && isConversationCloseIntent(inbound.text) && normalizeText(inbound.text).length <= 32) {
      const hadQuoteContext =
        Boolean(previousMemory?.last_quote_draft_id || previousMemory?.last_quote_pdf_sent_at) ||
        /(quote_generated|quote_recall|price_request)/.test(String(previousMemory?.last_intent || ""));
      reply = hadQuoteContext
        ? "Perfecto, cerramos por ahora. Gracias por tu tiempo. Te estaremos enviando un recordatorio breve para saber como te parecio la cotizacion."
        : "Perfecto, cerramos por ahora. Gracias por tu tiempo. Si despues quieres retomar, te ayudo por este mismo WhatsApp.";
      nextMemory.awaiting_action = "none";
      nextMemory.conversation_status = "closed";
      nextMemory.last_intent = "conversation_closed";
      if (hadQuoteContext) nextMemory.quote_feedback_due_at = isoAfterHours(24);
      handledByGreeting = true;
      billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
    }
    if (!knownCustomerName && awaitingAction === "capture_name") {
      const nameFromReply = looksLikeCustomerNameAnswer(inbound.text);
      if (nameFromReply) {
        knownCustomerName = nameFromReply;
        nextMemory.customer_name = nameFromReply;
        nextMemory.awaiting_action = "none";
      }
    }

    if (awaitingAction === "quote_contact_bundle" && (isContactInfoBundle(inbound.text) || isContinueQuoteWithoutPersonalDataIntent(inbound.text))) {
      const rememberedForQuote = String(
        nextMemory.last_selected_product_name ||
        previousMemory?.last_selected_product_name ||
        nextMemory.last_product_name ||
        previousMemory?.last_product_name ||
        ""
      ).trim();
      if (rememberedForQuote) {
        inbound.text = `cotizar ${rememberedForQuote} ${originalInboundText}`.trim();
      }
      nextMemory.awaiting_action = "quote_product_selection";
    }

    const quoteBundleOptionsRaw = Array.isArray((previousMemory as any)?.quote_bundle_options)
      ? (previousMemory as any).quote_bundle_options
      : [];
    const pendingProductOptionsRaw = Array.isArray((previousMemory as any)?.pending_product_options)
      ? (previousMemory as any).pending_product_options
      : [];
    const recommendedOptionsRaw = Array.isArray((previousMemory as any)?.last_recommended_options)
      ? (previousMemory as any).last_recommended_options
      : [];
    const pendingProductOptions =
      quoteBundleOptionsRaw.length
        ? quoteBundleOptionsRaw
        : (pendingProductOptionsRaw.length ? pendingProductOptionsRaw : recommendedOptionsRaw);
    const pendingFamilyOptions = Array.isArray((previousMemory as any)?.pending_family_options)
      ? (previousMemory as any).pending_family_options
      : [];
    const selectedPendingFamily = String(previousMemory?.awaiting_action || "") === "family_option_selection"
      ? resolvePendingFamilyOption(originalInboundText, pendingFamilyOptions)
      : null;

    let bundleOverrideApplied = false;
    let ignoredAwaitingActionForBundle = "";
    {
      const inboundTextNorm = normalizeText(originalInboundText);
      const inboundBundleByCount = /\bcotiz(?:ar|a|acion|ación)?\s*(\d{1,2}|dos|tres|cuatro|cinco|seis|siete|ocho)\b/.test(inboundTextNorm);
      const inboundBundleAll = asksQuoteIntent(inboundTextNorm) && /\b(todas|todos|todas\s+las|todos\s+los)\b/.test(inboundTextNorm);
      const inboundIntent = String(nextMemory.last_intent || previousMemory?.last_intent || "");
      const continueWithoutData = isContinueQuoteWithoutPersonalDataIntent(originalInboundText);
      const shouldBundleOverride =
        inboundIntent === "quote_bundle_request" ||
        inboundBundleByCount ||
        inboundBundleAll ||
        (continueWithoutData && String(awaitingAction || "") === "strict_quote_data");

      if (shouldBundleOverride) {
        const bundlePool =
          (Array.isArray(previousMemory?.quote_bundle_options) ? previousMemory.quote_bundle_options : [])
            .concat(Array.isArray(previousMemory?.pending_product_options) ? previousMemory.pending_product_options : [])
            .concat(Array.isArray(previousMemory?.last_recommended_options) ? previousMemory.last_recommended_options : []);
        const dedup = new Map<string, any>();
        for (const o of bundlePool) {
          const key = String(o?.raw_name || o?.name || "").trim();
          if (key && !dedup.has(key)) dedup.set(key, o);
        }
        const options = Array.from(dedup.values());
        if (options.length >= 2) {
          const numMap: Record<string, number> = { dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8 };
          const m = inboundTextNorm.match(/\bcotiz(?:ar|a|acion|ación)?\s*(\d{1,2}|dos|tres|cuatro|cinco|seis|siete|ocho)\b/);
          const raw = String(m?.[1] || "").trim();
          const requested = inboundBundleAll
            ? options.length
            : Math.max(2, Number(raw ? (Number(raw) || numMap[raw] || options.length) : options.length));
          const chosen = options.slice(0, Math.max(2, Math.min(requested, options.length)));
          const names = chosen.map((o: any) => String(o?.raw_name || o?.name || "").trim()).filter(Boolean);
          if (names.length >= 2) {
            ignoredAwaitingActionForBundle = String(awaitingAction || "");
            inbound.text = `cotizar ${names.join(" ; ")} cantidad 1 para todos`;
            nextMemory.awaiting_action = "quote_bundle_request";
            nextMemory.last_intent = "quote_bundle_request";
            nextMemory.pending_product_options = chosen;
            nextMemory.quote_bundle_options = chosen;
            nextMemory.last_recommended_options = chosen;
            nextMemory.bundle_quote_mode = true;
            nextMemory.bundle_quote_count = names.length;
            nextMemory.last_selected_product_name = "";
            nextMemory.last_selected_product_id = "";
            nextMemory.last_selection_at = "";
            delete (nextMemory as any).tech_product_selection;
            delete (nextMemory as any).pending_technical_selection;
            delete (nextMemory as any).technical_guidance_mode;
            awaitingAction = String(nextMemory.awaiting_action || "");
            bundleOverrideApplied = true;
          }
        }
      }
    }

    if (!handledByGreeting && pendingProductOptions.length >= 2) {
      const bulkText = normalizeText(originalInboundText);
      const continueBundleWithoutData =
        isContinueQuoteWithoutPersonalDataIntent(originalInboundText) &&
        String(previousMemory?.last_intent || nextMemory.last_intent || "") === "quote_bundle_request";
      const asksBulkByCount = /\bcotiz(?:ar|a|acion|ación)?\s*(\d{1,2}|dos|tres|cuatro|cinco|seis|siete|ocho)\b/.test(bulkText);
      const asksBulkAll = asksQuoteIntent(bulkText) && /\b(todas|todos|todas\s+las|todos\s+los)\b/.test(bulkText);
      if (continueBundleWithoutData || asksBulkByCount || asksBulkAll) {
        const numberWordMap: Record<string, number> = { dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8 };
        const m = bulkText.match(/\bcotiz(?:ar|a|acion|ación)?\s*(\d{1,2}|dos|tres|cuatro|cinco|seis|siete|ocho)\b/);
        const raw = String(m?.[1] || "").trim();
        const requested = continueBundleWithoutData
          ? pendingProductOptions.length
          : asksBulkAll
          ? pendingProductOptions.length
          : Math.max(2, Number(raw ? (Number(raw) || numberWordMap[raw] || 3) : 3));
        const chosen = pendingProductOptions.slice(0, Math.max(2, Math.min(requested, pendingProductOptions.length)));
        const modelNames = chosen.map((o: any) => String(o?.raw_name || o?.name || "").trim()).filter(Boolean);
        if (modelNames.length >= 2) {
          inbound.text = continueBundleWithoutData
            ? `cotizar ${modelNames.join(" ; ")} cantidad 1 para todos`
            : `cotizar ${modelNames.join(" ; ")}`;
          nextMemory.awaiting_action = "none";
          nextMemory.pending_product_options = chosen;
          nextMemory.last_intent = "quote_bundle_request";
          nextMemory.bundle_quote_mode = true;
          nextMemory.bundle_quote_count = chosen.length;
          nextMemory.last_selected_product_name = "";
          nextMemory.last_selected_product_id = "";
          nextMemory.last_selection_at = "";
        }
      }
    }

    if (!handledByGreeting && selectedPendingFamily) {
      const rememberedCategory = String(previousMemory?.last_category_intent || nextMemory?.last_category_intent || "").trim();
      const { data: ownerFamilyRows } = await supabase
        .from("agent_product_catalog")
        .select("id,name,category,brand,base_price_usd,source_payload,product_url,is_active")
        .eq("created_by", ownerId)
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(320);
      const familyRowsCommercial = (Array.isArray(ownerFamilyRows) ? ownerFamilyRows : []).filter((r: any) => isCommercialCatalogRow(r));
      const categoryScoped = rememberedCategory ? scopeCatalogRows(familyRowsCommercial as any, rememberedCategory) : familyRowsCommercial;
      const familyScoped = categoryScoped.filter((r: any) => normalizeText(familyLabelFromRow(r)) === normalizeText(String(selectedPendingFamily.key || "")));
      const options = buildNumberedProductOptions(familyScoped as any[], 10);
      const shown = options.slice(0, 8);
      if (options.length) {
        reply = [
          `Perfecto, para la familia ${String(selectedPendingFamily.label || "")} tengo ${options.length} referencia(s).`,
          ...shown.map((o) => `${o.code}) ${o.name}`),
          ...(options.length > shown.length ? ["- y mas referencias disponibles"] : []),
          "",
          "Responde con letra o numero (ej.: A o 1).",
        ].join("\n");
        nextMemory.pending_product_options = options;
        nextMemory.pending_family_options = [];
        nextMemory.last_family_intent = String(selectedPendingFamily.key || "");
        nextMemory.awaiting_action = "product_option_selection";
      } else {
        reply = `No encuentro referencias activas en la familia ${String(selectedPendingFamily.label || "")} dentro de esta base.`;
        nextMemory.pending_family_options = [];
        nextMemory.awaiting_action = "none";
      }
      handledByInventory = true;
      handledByRecommendation = true;
      billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
    }
    const menuActionChoiceOnly = /^(1|2|3|4|a|b|c|d)\b/.test(normalizeText(originalInboundText));
    const canResolvePendingOption =
      String(previousMemory?.awaiting_action || "") !== "product_action" ||
      !menuActionChoiceOnly;
    const selectedPendingOption = canResolvePendingOption
      ? resolvePendingProductOption(originalInboundText, pendingProductOptions)
      : null;
    if (selectedPendingOption) {
      const selectedCanonicalName = String((selectedPendingOption as any)?.raw_name || selectedPendingOption.name || "").trim();
      nextMemory.last_product_name = selectedCanonicalName;
      nextMemory.last_product_id = String(selectedPendingOption.id || "");
      nextMemory.last_product_category = String(selectedPendingOption.category || "");
      nextMemory.last_selected_product_name = selectedCanonicalName;
      nextMemory.last_selected_product_id = String(selectedPendingOption.id || "");
      nextMemory.last_selection_at = new Date().toISOString();
      nextMemory.pending_product_selection_code = String(selectedPendingOption.code || "");
      if (!normalizeText(originalInboundText).includes(normalizeText(selectedCanonicalName))) {
        inbound.text = `${originalInboundText} ${selectedCanonicalName}`.trim();
      }
      if (isOptionOnlyReply(originalInboundText)) {
        reply = [
          `Perfecto, seleccionaste ${String(selectedPendingOption.code || "")} - ${String(selectedPendingOption.name || "")}.`,
          "Ahora dime qué deseas con ese modelo:",
          "1) Cotización con TRM y PDF",
          "2) Ficha técnica",
        ].join("\n");
        nextMemory.awaiting_action = "product_action";
        nextMemory.pending_product_options = [];
        handledByQuoteStarter = true;
        handledByProductLookup = true;
        handledByPricing = true;
        handledByRecommendation = true;
        handledByInventory = true;
        handledByTechSheet = true;
        billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
      }
    }

    if (!handledByGreeting && String(previousMemory?.awaiting_action || "") === "product_option_selection" && !selectedPendingOption) {
      const optionInterruptIntent = Boolean(
        isConversationCloseIntent(originalInboundText) ||
        inboundTechnicalSpec ||
        inboundCategoryOrInventoryIntent ||
        asksQuoteIntent(originalInboundText) ||
        isPriceIntent(originalInboundText) ||
        isTechnicalSheetIntent(originalInboundText) ||
        isProductImageIntent(originalInboundText) ||
        isContextResetIntent(originalInboundText)
      );
      if (!optionInterruptIntent) {
        const listed = pendingProductOptions
          .slice(0, 6)
          .map((o: any) => `${String(o?.code || "").toUpperCase()}) ${String(o?.name || "").trim()}`)
          .filter(Boolean);
        reply = listed.length
          ? [
              "Para continuar, elige una opcion del listado.",
              ...listed,
              "",
              "Responde con letra o numero (ej.: A o 1).",
            ].join("\n")
          : "Para continuar, responde con la opcion (ej.: A o 1) del modelo que deseas.";
        handledByRecommendation = true;
        billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
      }
    }

    if (!handledByGreeting && String(previousMemory?.awaiting_action || "") === "family_option_selection" && !selectedPendingFamily) {
      const looksLikeDirectModel = hasConcreteProductHint(originalInboundText);
      if (looksLikeDirectModel) {
        const rememberedCategory = String(previousMemory?.last_category_intent || nextMemory?.last_category_intent || "").trim();
        const { data: ownerRows } = await supabase
          .from("agent_product_catalog")
          .select("id,name,category,brand,base_price_usd,source_payload,product_url,is_active")
          .eq("created_by", ownerId)
          .eq("is_active", true)
          .order("updated_at", { ascending: false })
          .limit(320);
        const commercial = (Array.isArray(ownerRows) ? ownerRows : []).filter((r: any) => isCommercialCatalogRow(r));
        const scoped = rememberedCategory ? scopeCatalogRows(commercial as any, rememberedCategory) : commercial;
        const direct = pickBestCatalogProduct(originalInboundText, scoped as any[]) || pickBestCatalogProduct(originalInboundText, commercial as any[]);
        if (direct?.id) {
          const directName = String((direct as any)?.name || "").trim();
          nextMemory.last_product_name = directName;
          nextMemory.last_product_id = String((direct as any)?.id || "").trim();
          nextMemory.last_product_category = String((direct as any)?.category || "").trim();
          nextMemory.last_selected_product_name = directName;
          nextMemory.last_selected_product_id = String((direct as any)?.id || "").trim();
          nextMemory.last_selection_at = new Date().toISOString();
          nextMemory.pending_family_options = [];
          nextMemory.pending_product_options = [];
          nextMemory.awaiting_action = "product_action";
          reply = [
            `Perfecto, encontré el modelo ${directName}.`,
            "Ahora dime qué deseas con ese modelo:",
            "1) Cotización con TRM y PDF",
            "2) Ficha técnica",
          ].join("\n");
          handledByRecommendation = true;
          handledByProductLookup = true;
          billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        }
      }
      if (!String(reply || "").trim()) {
        const listed = pendingFamilyOptions
          .slice(0, 8)
          .map((o: any) => `${String(o?.code || "").toUpperCase()}) ${String(o?.label || "").trim()} (${Number(o?.count || 0)})`)
          .filter(Boolean);
        reply = listed.length
          ? [
              "Para continuar, elige una familia del listado.",
              ...listed,
              "",
              "Responde con letra o numero (ej.: A o 1).",
            ].join("\n")
          : "Para continuar, responde con una opcion de familia (ej.: A o 1).";
        handledByRecommendation = true;
        billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
      }
    }

    const selectionAtRaw = String(nextMemory.last_selection_at || previousMemory?.last_selection_at || "");
    const selectionAtMs = Date.parse(selectionAtRaw);
    const activeSelectionWindowMs = 30 * 60 * 1000;
    const hasActiveSelectedProduct =
      Boolean(String(nextMemory.last_selected_product_id || previousMemory?.last_selected_product_id || "").trim() || String(nextMemory.last_selected_product_name || previousMemory?.last_selected_product_name || "").trim()) &&
      Number.isFinite(selectionAtMs) &&
      (Date.now() - selectionAtMs) <= activeSelectionWindowMs;

    const bundlePoolForContinue =
      (Array.isArray(previousMemory?.quote_bundle_options) ? previousMemory.quote_bundle_options : [])
        .concat(Array.isArray(previousMemory?.pending_product_options) ? previousMemory.pending_product_options : [])
        .concat(Array.isArray(previousMemory?.last_recommended_options) ? previousMemory.last_recommended_options : []);
    const bundleContinueDedup = new Map<string, any>();
    for (const o of bundlePoolForContinue) {
      const key = String(o?.raw_name || o?.name || "").trim();
      if (key && !bundleContinueDedup.has(key)) bundleContinueDedup.set(key, o);
    }
    const bundleContinueOptions = Array.from(bundleContinueDedup.values());
    const continueWithoutDataGlobal = isContinueQuoteWithoutPersonalDataIntent(originalInboundText) && bundleContinueOptions.length >= 2;
    if (continueWithoutDataGlobal) {
      const names = bundleContinueOptions.slice(0, 8).map((o: any) => String(o?.raw_name || o?.name || "").trim()).filter(Boolean);
      if (names.length >= 2) {
        inbound.text = `cotizar ${names.join(" ; ")} cantidad 1 para todos`;
        nextMemory.awaiting_action = "none";
        nextMemory.pending_product_options = bundleContinueOptions.slice(0, 8);
        nextMemory.quote_bundle_options = bundleContinueOptions.slice(0, 8);
        nextMemory.last_recommended_options = bundleContinueOptions.slice(0, 8);
        nextMemory.last_intent = "quote_bundle_request";
        nextMemory.bundle_quote_mode = true;
        nextMemory.bundle_quote_count = names.length;
        nextMemory.last_selected_product_name = "";
        nextMemory.last_selected_product_id = "";
        nextMemory.last_selection_at = "";
      }
    }

    if (String(previousMemory?.awaiting_action || "") === "product_action" && hasActiveSelectedProduct && !continueWithoutDataGlobal) {
      const rememberedOptionProduct = String(nextMemory.last_selected_product_name || previousMemory?.last_selected_product_name || nextMemory.last_product_name || previousMemory?.last_product_name || "").trim();
      const optText = normalizeText(originalInboundText);
      if (rememberedOptionProduct) {
        if (inboundTechnicalSpec || inboundCategoryOrInventoryIntent) {
          nextMemory.awaiting_action = "none";
          nextMemory.pending_product_options = [];
        } else {
        const continueWithoutDataOnBundle =
          String(previousMemory?.last_intent || nextMemory.last_intent || "") === "quote_bundle_request" &&
          isContinueQuoteWithoutPersonalDataIntent(originalInboundText);
        if (continueWithoutDataOnBundle) {
          const bundlePool =
            (Array.isArray(previousMemory?.quote_bundle_options) ? previousMemory.quote_bundle_options : [])
              .concat(Array.isArray(previousMemory?.pending_product_options) ? previousMemory.pending_product_options : [])
              .concat(Array.isArray(previousMemory?.last_recommended_options) ? previousMemory.last_recommended_options : []);
          const dedup = new Map<string, any>();
          for (const o of bundlePool) {
            const key = String(o?.raw_name || o?.name || "").trim();
            if (key && !dedup.has(key)) dedup.set(key, o);
          }
          const chosen = Array.from(dedup.values()).slice(0, 8);
          const modelNames = chosen.map((o: any) => String(o?.raw_name || o?.name || "").trim()).filter(Boolean);
          if (modelNames.length >= 2) {
            inbound.text = `cotizar ${modelNames.join(" ; ")} cantidad 1 para todos`;
            nextMemory.awaiting_action = "none";
            nextMemory.pending_product_options = chosen;
            nextMemory.quote_bundle_options = chosen;
            nextMemory.last_recommended_options = chosen;
            nextMemory.last_intent = "quote_bundle_request";
            nextMemory.bundle_quote_mode = true;
            nextMemory.bundle_quote_count = modelNames.length;
            nextMemory.last_selected_product_name = "";
            nextMemory.last_selected_product_id = "";
            nextMemory.last_selection_at = "";
          }
        } else {
        const numberWordMapBulk: Record<string, number> = { dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8 };
        const bulkCountMatch = optText.match(/\bcotiz(?:ar|a|acion|ación)?\s*(\d{1,2}|dos|tres|cuatro|cinco|seis|siete|ocho)\b/);
        const rawBulkCount = String(bulkCountMatch?.[1] || "").trim();
        const parsedBulkCount = Number(rawBulkCount ? (Number(rawBulkCount) || numberWordMapBulk[rawBulkCount] || 0) : 0);
        const asksBulkQuoteByCount = parsedBulkCount >= 2;
        if (asksBulkQuoteByCount) {
          let bulkPool = Array.isArray(pendingProductOptions) ? pendingProductOptions : [];
          if (bulkPool.length < 2) {
            const { data: ownerRowsRaw } = await supabase
              .from("agent_product_catalog")
              .select("id,name,category,brand,base_price_usd,source_payload,is_active")
              .eq("created_by", ownerId)
              .eq("is_active", true)
              .order("updated_at", { ascending: false })
              .limit(240);
            const ownerRows = (Array.isArray(ownerRowsRaw) ? ownerRowsRaw : []).filter((r: any) => isCommercialCatalogRow(r));
            const rememberedCategory = String(previousMemory?.last_category_intent || "").trim();
            const scoped = rememberedCategory ? scopeCatalogRows(ownerRows as any[], rememberedCategory) : ownerRows;
            const familyLabel = String(previousMemory?.strict_family_label || "").trim();
            const familyScoped = familyLabel
              ? scoped.filter((r: any) => normalizeText(familyLabelFromRow(r)) === normalizeText(familyLabel))
              : scoped;
            const rememberedCap = Number(previousMemory?.strict_filter_capacity_g || 0);
            const rememberedRead = Number(previousMemory?.strict_filter_readability_g || 0);
            let rankedRows = familyScoped as any[];
            if (rememberedCap > 0 && rememberedRead > 0) {
              const prioritized = prioritizeTechnicalRows(familyScoped as any[], { capacityG: rememberedCap, readabilityG: rememberedRead });
              if (prioritized.orderedRows.length) rankedRows = prioritized.orderedRows as any[];
            } else if (rememberedCap > 0) {
              const rankedCap = rankCatalogByCapacityOnly(familyScoped as any[], rememberedCap);
              if (rankedCap.length) rankedRows = rankedCap.map((x: any) => x.row);
            }
            bulkPool = buildNumberedProductOptions(rankedRows as any[], 60);
          }
          const chosen = bulkPool.slice(0, Math.max(2, Math.min(parsedBulkCount, bulkPool.length)));
          const modelNames = chosen.map((o: any) => String(o?.raw_name || o?.name || "").trim()).filter(Boolean);
          if (modelNames.length >= 2) {
            inbound.text = `cotizar ${modelNames.join(" ; ")}`;
            nextMemory.awaiting_action = "none";
            nextMemory.pending_product_options = chosen;
            nextMemory.last_intent = "quote_bundle_request";
            nextMemory.bundle_quote_mode = true;
            nextMemory.bundle_quote_count = modelNames.length;
            nextMemory.last_selected_product_name = "";
            nextMemory.last_selected_product_id = "";
            nextMemory.last_selection_at = "";
          }
        } else {
        const confirmsDefaultFromOption = isAffirmativeIntent(optText) || /^(ok|vale|listo|de una)$/i.test(String(originalInboundText || "").trim());
        const asksQuoteByOption = /^(1|a)\b/.test(optText) || /\b(cotiz|cotizacion|precio|la cotizacion)\b/.test(optText);
        const asksSheetByOption = /^(2|b)\b/.test(optText) || isTechnicalSheetIntent(optText);
        const asksImageByOption = /^(3|c|4|d)\b/.test(optText) || isProductImageIntent(optText) || (isTechnicalSheetIntent(optText) && isProductImageIntent(optText));
        if (asksQuoteByOption || confirmsDefaultFromOption) {
          inbound.text = `cotizar ${rememberedOptionProduct} ${originalInboundText}`.trim();
          nextMemory.awaiting_action = "quote_product_selection";
        } else if (asksSheetByOption) {
          inbound.text = `ficha tecnica de ${rememberedOptionProduct}`;
          nextMemory.awaiting_action = "none";
        } else if (asksImageByOption) {
          inbound.text = `ficha tecnica de ${rememberedOptionProduct}`;
          nextMemory.awaiting_action = "none";
        } else if (hasBareQuantity(optText) || /\b\d{1,5}\b/.test(optText)) {
          inbound.text = `cotizar ${rememberedOptionProduct} ${originalInboundText}`.trim();
          nextMemory.awaiting_action = "quote_product_selection";
        } else if (isCatalogBreadthQuestion(originalInboundText) || isInventoryInfoIntent(originalInboundText)) {
          nextMemory.awaiting_action = "none";
          nextMemory.pending_product_options = [];
        } else {
          reply = `¿Quieres ficha técnica o cotización de ${rememberedOptionProduct}?`;
          nextMemory.awaiting_action = "product_action";
          handledByQuoteStarter = true;
          handledByProductLookup = true;
          handledByPricing = true;
          handledByRecommendation = true;
          handledByInventory = true;
          handledByTechSheet = true;
          billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        }
        }
        }
        }
      }
    }

    const countCatalogRows = async (pricedOnly = false): Promise<number> => {
      let ownerQuery = supabase
        .from("agent_product_catalog")
        .select("id", { count: "exact", head: true })
        .eq("created_by", ownerId)
        .eq("is_active", true);
      if (pricedOnly) ownerQuery = ownerQuery.gt("base_price_usd", 0);
      const { count: ownerCount } = await ownerQuery;
      if (Number(ownerCount || 0) > 0 || !tenantId) return Number(ownerCount || 0);

      let tenantQuery = supabase
        .from("agent_product_catalog")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("is_active", true);
      if (pricedOnly) tenantQuery = tenantQuery.gt("base_price_usd", 0);
      const { count: tenantCount } = await tenantQuery;
      if (Number(tenantCount || 0) > 0) return Number(tenantCount || 0);

      let providerQuery = supabase
        .from("agent_product_catalog")
        .select("id", { count: "exact", head: true })
        .eq("provider", catalogProvider)
        .eq("is_active", true);
      if (pricedOnly) providerQuery = providerQuery.gt("base_price_usd", 0);
      const { count: providerCount } = await providerQuery;
      return Math.max(Number(ownerCount || 0), Number(tenantCount || 0), Number(providerCount || 0));
    };

    const fetchCatalogRows = async (selectCols: string, limitRows: number, pricedOnly = false) => {
      let ownerQuery = supabase
        .from("agent_product_catalog")
        .select(selectCols)
        .eq("created_by", ownerId)
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(limitRows);
      if (pricedOnly) ownerQuery = ownerQuery.gt("base_price_usd", 0);
      const { data: ownerRows } = await ownerQuery;

      let tenantRows: any[] = [];
      if (tenantId) {
        let tenantQuery = supabase
          .from("agent_product_catalog")
          .select(selectCols)
          .eq("tenant_id", tenantId)
          .eq("is_active", true)
          .order("updated_at", { ascending: false })
          .limit(limitRows);
        if (pricedOnly) tenantQuery = tenantQuery.gt("base_price_usd", 0);
        const { data } = await tenantQuery;
        tenantRows = Array.isArray(data) ? data : [];
      }

      let providerQuery = supabase
        .from("agent_product_catalog")
        .select(selectCols)
        .eq("provider", catalogProvider)
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(limitRows);
      if (pricedOnly) providerQuery = providerQuery.gt("base_price_usd", 0);
      const { data: providerRows } = await providerQuery;

      const mergedRaw = [
        ...(Array.isArray(ownerRows) ? ownerRows : []),
        ...tenantRows,
        ...(Array.isArray(providerRows) ? providerRows : []),
      ];

      const merged: any[] = [];
      const seen = new Set<string>();
      for (const row of mergedRaw) {
        const key = String((row as any)?.id || (row as any)?.product_url || `${(row as any)?.name || ""}::${(row as any)?.category || ""}`)
          .trim()
          .toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        merged.push(row);
        if (merged.length >= limitRows) break;
      }

      return merged.filter((r: any) => isAllowedCatalogRow(r));
    };

    const fetchVariantRowsByCatalog = async (catalogRows: any[]) => {
      const ids = Array.from(
        new Set((catalogRows || []).map((r: any) => String(r?.id || "").trim()).filter(Boolean))
      );
      if (!ids.length) return [] as any[];

      const out: any[] = [];
      const chunkSize = 150;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const { data } = await supabase
          .from("agent_product_variants")
          .select("catalog_id,sku,variant_name,range_text,attributes")
          .in("catalog_id", chunk);
        if (Array.isArray(data)) out.push(...data);
      }
      return out;
    };

    const findCatalogByVariant = async (queryText: string, catalogRows: any[], forcedCategory?: string) => {
      const variantRows = await fetchVariantRowsByCatalog(catalogRows);
      return pickCatalogByVariantText(queryText, catalogRows, variantRows, forcedCategory);
    };

    if (isContextResetIntent(inbound.text)) {
      const keepCustomerName = String(nextMemory.customer_name || "").trim();
      const keepCustomerPhone = String(nextMemory.customer_phone || "").trim();
      const keepCustomerEmail = String(nextMemory.customer_email || "").trim();

      Object.keys(nextMemory).forEach((k) => delete nextMemory[k]);
      if (keepCustomerName) nextMemory.customer_name = keepCustomerName;
      if (keepCustomerPhone) nextMemory.customer_phone = keepCustomerPhone;
      if (keepCustomerEmail) nextMemory.customer_email = keepCustomerEmail;
      nextMemory.awaiting_action = "none";
      nextMemory.last_user_text = inbound.text;
      nextMemory.last_user_at = new Date().toISOString();
      nextMemory.last_intent = "reset_context";

      reply = "Listo, reinicié el contexto de esta conversación. Ahora dime el modelo exacto y te respondo solo con datos confirmados de la base de datos.";
      handledByGreeting = true;
      billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
    }

    if (!handledByGreeting && isGreetingIntent(inbound.text)) {
      nextMemory.awaiting_action = "none";
      nextMemory.pending_product_options = [];
      nextMemory.pending_family_options = [];
      nextMemory.strict_model_offset = 0;
      nextMemory.strict_family_label = "";
      reply = buildGreetingReply(knownCustomerName, nextMemory);
      if (!knownCustomerName) nextMemory.awaiting_action = "capture_name";
      handledByGreeting = true;
      billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
    }

    if (!handledByGreeting) {
      const entryNeedText = normalizeText(String(originalInboundText || ""));
      const isEntryNeedGuidance = /(quiero|necesito|busco|requiero).*(balanza|balanzas|bascula|basculas|humedad)|para\s+pesar/.test(entryNeedText);
      if (isEntryNeedGuidance) {
        const forcedCategory = detectCatalogCategoryIntent(originalInboundText) || (/humedad|analizador\s+de\s+humedad/.test(entryNeedText) ? "humedad" : "balanzas");
        const rawRows = await fetchCatalogRows("id,name,category,brand,base_price_usd,source_payload,product_url", 220, false);
        const commercialRows = (Array.isArray(rawRows) ? rawRows : []).filter((r: any) => isCommercialCatalogRow(r));
        const scoped = scopeCatalogRows(commercialRows as any, forcedCategory);
        const familyOptions = buildNumberedFamilyOptions(scoped as any[], 8);
        const inferred = inferFamilyFromUseCase(originalInboundText, familyOptions);
        const inferredKey = String((inferred as any)?.key || "").trim();
        const familyRows = inferredKey
          ? scoped.filter((r: any) => normalizeText(familyLabelFromRow(r)) === normalizeText(inferredKey))
          : [];
        const options = buildNumberedProductOptions((familyRows.length ? familyRows : scoped) as any[], 8).slice(0, 5);
        reply = [
          inferred
            ? `Entiendo tu necesidad. Para ese uso te recomiendo iniciar con ${String((inferred as any)?.label || "esa familia")}.`
            : "Entiendo tu necesidad y te guío con opciones recomendadas según uso.",
          "Para afinar sin inventar, dime peso mínimo y máximo de la pieza (y peso por unidad si lo tienes).",
          ...(options.length ? ["", "Modelos sugeridos para empezar:", ...options.map((o) => `${o.code}) ${o.name}`)] : []),
          "",
          options.length
            ? "Elige con letra/número (A/1) y te envío ficha o cotización."
            : "Si quieres, te muestro familias disponibles para orientarte mejor.",
        ].join("\n");
        nextMemory.pending_product_options = options;
        nextMemory.pending_family_options = options.length ? [] : familyOptions;
        nextMemory.awaiting_action = options.length ? "product_option_selection" : "family_option_selection";
        nextMemory.last_category_intent = String(forcedCategory || "");
        nextMemory.strict_use_case = String(originalInboundText || "").trim();
        handledByInventory = true;
        billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
      }
    }

    if (!handledByGreeting && !handledByInventory && (inboundInventoryIntent || Boolean(inboundCategoryIntent))) {
      try {
        if (inboundCategoryIntent) {
          const categoryRowsRaw = await fetchCatalogRows("id,name,category,brand,base_price_usd,source_payload,product_url", 220, false);
          const categoryRowsCommercial = (Array.isArray(categoryRowsRaw) ? categoryRowsRaw : []).filter((r: any) => isCommercialCatalogRow(r));
          const scoped = scopeCatalogRows(categoryRowsCommercial as any, inboundCategoryIntent);
          const familyOptions = buildNumberedFamilyOptions(scoped as any[], 8);
          const categoryLabel = inboundCategoryIntent.replace(/_/g, " ");
          const needText = normalizeText(`${String(originalInboundText || "")} ${String(inbound.text || "")}`);
          const rawNeedText = String(inbound.text || originalInboundText || "");
          const isGuidedCategory = /balanza|balanzas|bascula|basculas|humedad|analizador de humedad/.test(categoryLabel);
          const hasModelHintNow = hasConcreteProductHint(originalInboundText) || extractModelLikeTokens(originalInboundText).length > 0;
          const asksNeedGuidanceDirect = /(quiero|necesito|busco|requiero|me\s+sirve|cual\s+me\s+sirve|cu[aá]l\s+me\s+sirve|recomiend|orienta).*(balanza|balanzas|bascula|basculas|humedad|analizador\s+de\s+humedad)|para\s+pesar|para\s+usar|para\s+medir/.test(needText);
          const asksNeedGuidanceRaw = /\b(quiero|necesito|busco|requiero|recomiend|orienta)\b/i.test(rawNeedText) || /para\s+pesar/i.test(rawNeedText);
          const useCaseDrivenIntent =
            isRecommendationIntent(originalInboundText) ||
            isUseCaseApplicabilityIntent(originalInboundText) ||
            isUseCaseFamilyHint(originalInboundText) ||
            /(quiero|necesito|busco).*(balanza|balanzas|bascula|basculas|humedad)|para\s+pesar|peso\s+aproximado|tornillo|tornillos|tuerca|tuercas|perno|pernos|pieza|piezas|muestra|muestras/.test(needText);
          const shouldForceNeedGuidance = isGuidedCategory && !hasModelHintNow && (asksNeedGuidanceDirect || asksNeedGuidanceRaw || useCaseDrivenIntent);
          if (shouldForceNeedGuidance && familyOptions.length) {
            const inferred = inferFamilyFromUseCase(originalInboundText, familyOptions);
            const inferredKey = String((inferred as any)?.key || "").trim();
            const familyRows = inferredKey
              ? scoped.filter((r: any) => normalizeText(familyLabelFromRow(r)) === normalizeText(inferredKey))
              : [];
            const options = buildNumberedProductOptions((familyRows.length ? familyRows : scoped) as any[], 8).slice(0, 5);
            reply = [
              inferred
                ? `Entiendo tu necesidad. Para ese uso te recomiendo iniciar con ${String((inferred as any)?.label || "esa familia")}.`
                : "Entiendo tu necesidad. Te oriento con opciones recomendadas según uso.",
              "Para afinar sin inventar, dime peso mínimo y máximo de la pieza (y peso por unidad si lo tienes).",
              ...(options.length ? ["", "Modelos sugeridos para empezar:", ...options.map((o) => `${o.code}) ${o.name}`)] : []),
              "",
              options.length
                ? "Elige con letra/número (A/1) y te envío ficha o cotización."
                : "Si prefieres, elige una familia y te doy modelos exactos.",
            ].join("\n");
            nextMemory.pending_product_options = options;
            nextMemory.pending_family_options = options.length ? [] : familyOptions;
            nextMemory.awaiting_action = options.length ? "product_option_selection" : "family_option_selection";
            nextMemory.last_category_intent = inboundCategoryIntent;
            nextMemory.strict_use_case = String(originalInboundText || "").trim();
            handledByInventory = true;
            billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
          } else if (familyOptions.length > 1) {
            const entryNeed = normalizeText(String(originalInboundText || ""));
            const forceNeed = /(quiero|necesito|busco|requiero).*(balanza|balanzas|bascula|basculas|humedad)|para\s+pesar/.test(entryNeed);
            if (forceNeed) {
              const inferred = inferFamilyFromUseCase(originalInboundText, familyOptions);
              const inferredKey = String((inferred as any)?.key || "").trim();
              const familyRows = inferredKey
                ? scoped.filter((r: any) => normalizeText(familyLabelFromRow(r)) === normalizeText(inferredKey))
                : [];
              const options = buildNumberedProductOptions((familyRows.length ? familyRows : scoped) as any[], 8).slice(0, 5);
              reply = [
                inferred
                  ? `Entiendo tu necesidad. Para ese uso te recomiendo iniciar con ${String((inferred as any)?.label || "esa familia")}.`
                  : "Entiendo tu necesidad y te guío con opciones recomendadas según uso.",
                "Para afinar sin inventar, dime peso mínimo y máximo de la pieza (y peso por unidad si lo tienes).",
                ...(options.length ? ["", "Modelos sugeridos para empezar:", ...options.map((o) => `${o.code}) ${o.name}`)] : []),
                "",
                options.length
                  ? "Elige con letra/número (A/1) y te envío ficha o cotización."
                  : "Si prefieres, te muestro familias disponibles para orientarte mejor.",
              ].join("\n");
              nextMemory.pending_product_options = options;
              nextMemory.pending_family_options = options.length ? [] : familyOptions;
              nextMemory.awaiting_action = options.length ? "product_option_selection" : "family_option_selection";
              nextMemory.last_category_intent = inboundCategoryIntent;
              nextMemory.strict_use_case = String(originalInboundText || "").trim();
            } else {
              const familyScopedTotal = familyOptions.reduce((acc: number, o: any) => acc + Number(o?.count || 0), 0);
              const priceRangeLine = normalizeText(String(inboundCategoryIntent || "")) === "balanzas" ? buildPriceRangeLine(scoped as any[]) : "";
              reply = [
                `Si, tenemos ${familyScopedTotal || scoped.length} referencias en la categoria ${categoryLabel}.`,
                "Primero elige la familia:",
                ...familyOptions.map((o) => `${o.code}) ${o.label} (${o.count})`),
                "",
                ...(priceRangeLine ? [priceRangeLine] : []),
                "Si quieres, también dime qué vas a pesar y su funcionalidad para identificar cuál se adecúa a tu empresa.",
                "Responde con letra o numero (ej.: A o 1).",
              ].join("\n");
              nextMemory.pending_family_options = familyOptions;
              nextMemory.pending_product_options = [];
              nextMemory.awaiting_action = "family_option_selection";
              nextMemory.last_category_intent = inboundCategoryIntent;
            }
          } else {
            const options = buildNumberedProductOptions(scoped, 10);
            const shown = options.slice(0, 8);
            if (options.length) {
              reply = [
                `Si, tenemos ${options.length} referencias en la categoria ${categoryLabel}.`,
                ...shown.map((o) => `${o.code}) ${o.name}`),
                ...(options.length > shown.length ? ["- y mas referencias disponibles"] : []),
                "",
                "Responde con letra o numero (ej.: A o 1) y te envio ficha tecnica o cotizacion.",
              ].join("\n");
              nextMemory.pending_product_options = options;
              nextMemory.pending_family_options = [];
              nextMemory.awaiting_action = "product_option_selection";
              nextMemory.last_category_intent = inboundCategoryIntent;
            } else {
              reply = `No encuentro referencias activas en la categoria ${categoryLabel} dentro de esta base. Si quieres, te muestro otra categoria disponible.`;
              nextMemory.last_category_intent = inboundCategoryIntent;
            }
          }
        } else {
          const totalActive = await countCatalogRows(false);
          const totalPriced = await countCatalogRows(true);
          const sample = await fetchCatalogRows("name", 5, false);

          const examples = Array.isArray(sample)
            ? sample.map((x: any) => String(x?.name || "").trim()).filter(Boolean)
            : [];
          const top = examples.slice(0, 3);
          reply = [
            `Te comparto el catalogo oficial actualizado de OHAUS Colombia: ${CATALOG_REFERENCE_URL}`,
            "",
            "Categorias principales:",
            ...OFFICIAL_CATALOG_CATEGORIES.map((c) => `- ${c}`),
            "",
            `Catalogo interno para envio rapido por WhatsApp: ${Number(totalActive || 0)} productos activos, ${Number(totalPriced || 0)} con precio base para cotizacion automatica.`,
            ...(top.length ? ["", "Ejemplos disponibles en esta instancia:", ...top.map((x) => `- ${x}`)] : []),
            "",
            "Si quieres, dime categoria y modelo exacto y te envio ficha tecnica o cotizacion por este chat.",
          ].join("\n");
        }
        handledByInventory = true;
        billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
      } catch (invErr: any) {
        console.warn("[evolution-webhook] inventory_info_failed", invErr?.message || invErr);
      }
    }

    if (
      !handledByGreeting &&
      !handledByInventory &&
      !isTechnicalSheetIntent(inbound.text) &&
      !isProductImageIntent(inbound.text) &&
      !shouldAutoQuote(inbound.text) &&
      !isPriceIntent(inbound.text)
    ) {
      const rememberedCategoryIntent = String(previousMemory?.last_category_intent || "").trim();
      const categoryIntent = isGlobalCatalogAsk(inbound.text)
        ? ""
        : detectCatalogCategoryIntent(inbound.text)
        || (isCategoryFollowUpIntent(inbound.text) ? rememberedCategoryIntent : "");
      const featureTerms = extractFeatureTerms(inbound.text);
      const wantsFeatureAnswer = isFeatureQuestionIntent(inbound.text) && featureTerms.length > 0;
      const asksBalanceTypes = isBalanceTypeQuestion(inbound.text);
      if (categoryIntent) {
        const looksLikeConcreteModel = hasConcreteProductHint(inbound.text);
        const shouldSkipCategorySummary =
          looksLikeConcreteModel ||
          asksQuoteIntent(inbound.text) ||
          shouldAutoQuote(inbound.text) ||
          isQuoteProceedIntent(inbound.text) ||
          hasBareQuantity(inbound.text);
        if (shouldSkipCategorySummary) {
          // Do not hijack technical selection with category summary.
        } else {
        try {
          const categoryRows = await fetchCatalogRows("id,name,brand,category,summary,description,specs_text,specs_json,source_payload,product_url", 160, false);
          const allRows = Array.isArray(categoryRows) ? categoryRows : [];
          const filteredRows = categoryIntent === "documentos"
            ? allRows.filter((r: any) => isDocumentCatalogRow(r))
            : allRows.filter((r: any) => isCommercialCatalogRow(r));

          const sameCategory = filteredRows.filter((r: any) => normalizeText(String(r?.category || "")) === normalizeText(categoryIntent));
          const groupedSubcategories = filteredRows.filter((r: any) => catalogSubcategory(r).startsWith(`${normalizeText(categoryIntent)}_`));
          let pool = sameCategory.length ? sameCategory : groupedSubcategories;
          pool = pool.filter((r: any) => passesStrictCategoryGuard(r, categoryIntent));

          if (!pool.length) {
            let providerCategoryQuery = supabase
              .from("agent_product_catalog")
              .select("name,category,source_payload,product_url")
              .eq("provider", catalogProvider)
              .eq("is_active", true)
              .order("updated_at", { ascending: false })
              .limit(200);
            const { data: providerCategoryRows } = await providerCategoryQuery;
            const providerRowsAny: any[] = Array.isArray(providerCategoryRows) ? (providerCategoryRows as any[]) : [];
            const providerFiltered = categoryIntent === "documentos"
              ? providerRowsAny.filter((r: any) => isDocumentCatalogRow(r))
              : providerRowsAny.filter((r: any) => isCommercialCatalogRow(r));
            const providerSameCategory = providerFiltered.filter((r: any) => normalizeText(String(r?.category || "")) === normalizeText(categoryIntent));
            const providerGroupedSubcategories = providerFiltered.filter((r: any) => catalogSubcategory(r).startsWith(`${normalizeText(categoryIntent)}_`));
            pool = providerSameCategory.length ? providerSameCategory : providerGroupedSubcategories;
            pool = pool.filter((r: any) => passesStrictCategoryGuard(r, categoryIntent));
          }

          if (pool.length) {
            const uniqueNames = uniqueNormalizedStrings(
              pool.map((r: any) => humanCatalogName(String(r?.name || "").trim())).filter(Boolean)
            );
            const names = uniqueNames.slice(0, 10);
            const extra = Math.max(0, uniqueNames.length - names.length);
            const categoryLabel = categoryIntent.replace(/_/g, " ");
            nextMemory.last_category_intent = categoryIntent;
            if (asksBalanceTypes && categoryIntent === "balanzas") {
              const subMap = new Map<string, number>();
              for (const r of pool as any[]) {
                const sub = String(catalogSubcategory(r) || "").trim();
                if (!sub) continue;
                subMap.set(sub, Number(subMap.get(sub) || 0) + 1);
              }
              const preferredOrder = [
                "balanzas_analiticas",
                "balanzas_semianaliticas",
                "balanzas_precision",
                "balanzas_joyeria",
                "balanzas_portatiles",
              ];
              const available = preferredOrder
                .map((k) => ({ key: k, count: Number(subMap.get(k) || 0) }))
                .filter((x) => x.count > 0);
              if (available.length) {
                const labels: Record<string, string> = {
                  balanzas_analiticas: "Analíticas",
                  balanzas_semianaliticas: "Semianalíticas",
                  balanzas_precision: "Precisión",
                  balanzas_joyeria: "Joyería",
                  balanzas_portatiles: "Portátiles",
                };
                const lines = available.map((x) => `- ${labels[x.key] || x.key.replace(/^balanzas_/, "").replace(/_/g, " ")} (${x.count})`);
                reply = [
                  `Sí. En balanzas manejo ${available.length} tipo(s) en catálogo:`,
                  ...lines,
                  "",
                  "Si quieres, te filtro por uno y te doy modelos exactos para ficha o cotización.",
                ].join("\n");
              }
            } else if (wantsFeatureAnswer) {
              const rankedByFeature = rankCatalogByFeature(pool as any[], featureTerms).slice(0, 5);
              if (rankedByFeature.length) {
                const top = rankedByFeature.slice(0, 3);
                const topNames = top.map((x) => humanCatalogName(String(x?.row?.name || "").trim())).filter(Boolean);
                const more = Math.max(0, rankedByFeature.length - topNames.length);
                const first = top[0]?.row;
                if (first?.name) {
                  nextMemory.last_product_name = String(first.name || "");
                  nextMemory.last_product_id = String((first as any)?.id || "");
                  nextMemory.last_product_category = String((first as any)?.category || "");
                  nextMemory.last_selected_product_name = String(first.name || "");
                  nextMemory.last_selected_product_id = String((first as any)?.id || "");
                  nextMemory.last_selection_at = new Date().toISOString();
                }
                reply = [
                  `Sí, en ${categoryLabel} tengo ${rankedByFeature.length} referencia(s) que coinciden con esa característica (${featureTerms.join(", ")}). Te muestro ${topNames.length}:`,
                  ...topNames.map((n) => `- ${n}`),
                  ...(more > 0 ? [`- y ${more} más`] : []),
                  "",
                  "Si quieres, te envío ficha técnica o cotización del modelo que elijas por este WhatsApp.",
                ].join("\n");
              } else {
                const crossCategoryMatches = rankCatalogByFeature(filteredRows as any[], featureTerms)
                  .filter((x) => normalizeText(String(x?.row?.category || "")) !== normalizeText(categoryIntent))
                  .slice(0, 4);
                if (crossCategoryMatches.length) {
                  const crossTop = crossCategoryMatches.slice(0, 3);
                  const crossNames = crossTop.map((x) => humanCatalogName(String(x?.row?.name || "").trim())).filter(Boolean);
                  const crossCats = uniqueNormalizedStrings(
                    crossTop.map((x) => String(x?.row?.category || "").trim().replace(/_/g, " ")).filter(Boolean),
                    2
                  );
                  const crossLabel = crossCats.length ? crossCats.join(" / ") : "otra categoría";
                  reply = [
                    `En ${categoryLabel} no encontré coincidencia exacta para (${featureTerms.join(", ")}).`,
                    `Pero sí tengo opciones en ${crossLabel}:`,
                    ...crossNames.map((n) => `- ${n}`),
                    "",
                    "Si quieres, te envío ficha técnica o cotización del modelo que elijas.",
                  ].join("\n");
                } else {
                  reply = [
                    `En ${categoryLabel} no encontré una coincidencia exacta para esa característica (${featureTerms.join(", ")}) en este momento.`,
                    "Opciones cercanas disponibles:",
                    ...names.slice(0, 3).map((n) => `- ${n}`),
                    ...(extra > 0 ? [`- y ${extra} más`] : []),
                    "",
                    "Si me dices la característica exacta (por ejemplo: capacidad, resolución o calibración), te filtro mejor.",
                  ].join("\n");
                }
              }
            } else {
              reply = [
                `Perfecto. En ${categoryLabel} tengo ${pool.length} referencia(s) en catálogo.`,
                ...names.map((n) => `- ${n}`),
                ...(extra > 0 ? [`- y ${extra} más`] : []),
                "",
                `Si quieres ver todo el catálogo oficial: ${CATALOG_REFERENCE_URL}`,
                "Dime un modelo exacto y te envío ficha técnica o cotización por este WhatsApp.",
              ].join("\n");
            }
          } else {
            const { count: providerCategoryCount } = await supabase
              .from("agent_product_catalog")
              .select("id", { count: "exact", head: true })
              .eq("provider", catalogProvider)
              .eq("is_active", true)
              .eq("category", normalizeText(categoryIntent));

            const { data: providerCategoryRowsRaw } = await supabase
              .from("agent_product_catalog")
              .select("name")
              .eq("provider", catalogProvider)
              .eq("is_active", true)
              .eq("category", normalizeText(categoryIntent))
              .order("updated_at", { ascending: false })
              .limit(40);

            const categoryLabel = categoryIntent.replace(/_/g, " ");
            const countNum = Number(providerCategoryCount || 0);
            if (countNum > 0) {
              nextMemory.last_category_intent = categoryIntent;
              const backupNames = uniqueNormalizedStrings(
                (Array.isArray(providerCategoryRowsRaw) ? providerCategoryRowsRaw : [])
                  .map((r: any) => humanCatalogName(String(r?.name || "").trim()))
                  .filter(Boolean),
                8
              );
              if (backupNames.length) {
                const top = backupNames.slice(0, 6);
                const more = Math.max(0, countNum - top.length);
                reply = [
                  `Perfecto. En ${categoryLabel} tengo ${countNum} referencia(s) en catálogo.`,
                  ...top.map((n) => `- ${n}`),
                  ...(more > 0 ? [`- y ${more} más`] : []),
                  "",
                  `Si quieres ver todo el catálogo oficial: ${CATALOG_REFERENCE_URL}`,
                  "Si quieres una en específico, dime el modelo exacto y te envío ficha técnica o cotización por este WhatsApp.",
                ].join("\n");
              } else {
                reply = `Sí tengo ${countNum} referencia(s) en ${categoryLabel} en esta base de datos. Si quieres una en específico, dime el modelo exacto y te envío ficha técnica o cotización por este WhatsApp.`;
              }
            } else {
              reply = `En este momento no tengo referencias cargadas en esa categoría dentro de esta instancia. Puedes ver el catálogo oficial aquí: ${CATALOG_REFERENCE_URL}`;
            }
          }

          handledByInventory = true;
          billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        } catch (catErr: any) {
          console.warn("[evolution-webhook] category_inventory_failed", catErr?.message || catErr);
        }
        }
      }
    }

    if (!handledByGreeting && !handledByInventory && isHistoryIntent(inbound.text)) {
      try {
        const inboundPhone = normalizePhone(inbound.from || "");
        const inboundTail = phoneTail10(inbound.from || "");

        const { data: drafts } = await supabase
          .from("agent_quote_drafts")
          .select("id,product_name,total_cop,trm_rate,status,payload,customer_phone,created_at")
          .eq("created_by", ownerId)
          .eq("agent_id", String(agent.id))
          .order("created_at", { ascending: false })
          .limit(30);

        const list = Array.isArray(drafts) ? drafts : [];
        const mine = list.filter((d: any) => {
          const p = normalizePhone(String(d?.customer_phone || ""));
          return p === inboundPhone || phoneTail10(p) === inboundTail;
        });

        if (mine.length) {
          const last = mine[0] as any;
          const qty = Math.max(1, Number(last?.payload?.quantity || 1));
          reply = `Si, ya tengo tu historial. Veo ${mine.length} cotizacion(es) asociadas a este numero. La ultima fue de ${String(last?.product_name || "producto")}, cantidad ${qty}, total COP ${formatMoney(Number(last?.total_cop || 0))}, estado ${String(last?.status || "draft")}. Si quieres, te la reenvio en PDF escribiendo: reenviar PDF.`;
        } else {
          reply = "Por ahora no encuentro cotizaciones previas asociadas a este numero. Si quieres, te genero una nueva en este momento.";
        }

        handledByHistory = true;
        billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
      } catch (histErr: any) {
        console.warn("[evolution-webhook] history_lookup_failed", histErr?.message || histErr);
      }
    }

    if (!handledByGreeting && !handledByInventory && isProductLookupIntent(inbound.text)) {
      try {
        if (isTechnicalSheetIntent(inbound.text) || isProductImageIntent(inbound.text) || Boolean(detectTechResendIntent(inbound.text))) {
          // Technical requests are handled by dedicated tech-sheet flow.
        } else {
        const catalog = await fetchCatalogRows("id,name,brand,category,base_price_usd,source_payload,product_url", 160, false);
        const commercialCatalog = (Array.isArray(catalog) ? catalog : []).filter((r: any) => isCommercialCatalogRow(r));
        const scopedCategory = normalizeText(String(detectCatalogCategoryIntent(inbound.text) || previousMemory?.last_category_intent || ""));
        const scopedCatalog = scopedCategory ? scopeCatalogRows(commercialCatalog as any, scopedCategory) : commercialCatalog;
        const hasConcreteHint = hasConcreteProductHint(inbound.text);
        let matched = pickBestCatalogProduct(inbound.text, scopedCatalog as any);
        if (!matched?.name && hasConcreteHint) {
          matched = await findCatalogByVariant(inbound.text, (scopedCatalog.length ? scopedCatalog : commercialCatalog) as any[], scopedCategory);
        }
        if (matched?.name && !isCatalogMatchConsistent(inbound.text, matched, scopedCategory)) matched = null;
        if (matched?.name) {
          nextMemory.last_product_name = String(matched.name || "");
          nextMemory.last_product_id = String((matched as any)?.id || "");
          nextMemory.last_product_category = String((matched as any)?.category || "");
          nextMemory.last_selected_product_name = String(matched.name || "");
          nextMemory.last_selected_product_id = String((matched as any)?.id || "");
          nextMemory.last_selection_at = new Date().toISOString();
          const hasPrice = Number((matched as any)?.base_price_usd || 0) > 0;
          reply = hasPrice
            ? `Sí, sí tenemos ${String(matched.name)}. Si quieres, te envío de una la cotización con TRM de hoy por este WhatsApp.`
            : `Sí, sí tenemos ${String(matched.name)}. Si quieres, te comparto ficha técnica y opciones disponibles por este WhatsApp.`;
          handledByProductLookup = true;
          billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        } else if (hasConcreteHint) {
          const candidates = uniqueNormalizedStrings(
            (scopedCatalog.length ? scopedCatalog : commercialCatalog)
              .map((r: any) => humanCatalogName(String(r?.name || "").trim()))
              .filter(Boolean),
            3
          );
          reply = candidates.length
            ? `No encontré una coincidencia exacta para ese modelo en esta base. Prueba con uno de estos nombres exactos: ${candidates.join(" / ")}.`
            : "No encontré una coincidencia exacta para ese modelo en esta base. Escríbeme el nombre exacto del producto para validarlo.";
          handledByProductLookup = true;
          billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        }
        }
      } catch (lookupErr: any) {
        console.warn("[evolution-webhook] product_lookup_failed", lookupErr?.message || lookupErr);
      }
    }

    if (!handledByGreeting && !handledByInventory && !handledByProductLookup && !handledByHistory && isPriceIntent(inbound.text)) {
      try {
        if (isTechnicalSheetIntent(inbound.text) || isProductImageIntent(inbound.text) || Boolean(detectTechResendIntent(inbound.text))) {
          // Technical requests are handled by dedicated tech-sheet flow.
        } else {
        const pricedProducts = await fetchCatalogRows("id,name,base_price_usd,category,source_payload,product_url", 40, true);

        const list = (Array.isArray(pricedProducts) ? pricedProducts : []).filter((r: any) => isCommercialCatalogRow(r));
        const scopedCategory = normalizeText(String(detectCatalogCategoryIntent(inbound.text) || previousMemory?.last_category_intent || ""));
        const scopedList = scopedCategory ? scopeCatalogRows(list as any, scopedCategory) : list;
        const hasConcreteHint = hasConcreteProductHint(inbound.text);
        let matched = pickBestCatalogProduct(inbound.text, scopedList as any);
        const rememberedProductNameForPrice = String(previousMemory?.last_product_name || nextMemory?.last_product_name || "").trim();
        const rememberedPriced = rememberedProductNameForPrice
          ? findCatalogProductByName((scopedList.length ? scopedList : list) as any[], rememberedProductNameForPrice)
          : null;
        if (!matched?.name && hasConcreteHint) {
          matched = await findCatalogByVariant(inbound.text, (scopedList.length ? scopedList : list) as any[], scopedCategory);
        }
        if (!matched?.name && !hasConcreteHint && rememberedPriced?.name) {
          matched = rememberedPriced;
        }
        if (matched?.name && !isCatalogMatchConsistent(inbound.text, matched, scopedCategory)) matched = null;

        if (matched?.name) {
          nextMemory.last_product_name = String(matched.name || "");
          nextMemory.last_product_id = String((matched as any)?.id || "");
          nextMemory.last_product_category = String((matched as any)?.category || "");
          nextMemory.last_selected_product_name = String(matched.name || "");
          nextMemory.last_selected_product_id = String((matched as any)?.id || "");
          nextMemory.last_selection_at = new Date().toISOString();
          nextMemory.pending_product_options = [];
          reply = `El producto ${String(matched.name)} tiene precio base USD ${formatMoney(Number(matched.base_price_usd || 0))}. Si quieres, te genero la cotizacion con TRM de hoy y PDF.`;
        } else if (list.length) {
          const options = buildNumberedProductOptions(list, 5);
          const sample = options
            .map((p: any) => `${p.code}) ${String(p.name)} (USD ${formatMoney(Number(p.base_price_usd || 0))})`);
          nextMemory.pending_product_options = options;
          nextMemory.awaiting_action = "product_option_selection";
          reply = [
            "Tengo precios base cargados en todo el catálogo.",
            "Aquí van 5 opciones rápidas:",
            ...sample,
            "",
            "Responde con letra o número (ej.: A o 1) y te genero cotización con TRM, o te envío ficha técnica.",
          ].join("\n");
        } else {
          reply = "Ahora mismo no tengo productos con precio cargado para cotizar. Si quieres, te confirmo el catalogo disponible primero.";
        }

        handledByPricing = true;
        billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        }
      } catch (priceErr: any) {
        console.warn("[evolution-webhook] pricing_lookup_failed", priceErr?.message || priceErr);
      }
    }

    if (!handledByGreeting && !handledByInventory && !handledByHistory && !handledByPricing && !handledByProductLookup && isOutOfCatalogDomainQuery(inbound.text)) {
      reply = "Ahora mismo solo manejo productos OHAUS de pesaje y laboratorio del catálogo (balanzas, básculas, electroquímica, analizador de humedad y equipos de laboratorio). Si quieres, te recomiendo un modelo OHAUS según tu aplicación.";
      handledByRecommendation = true;
      billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
    }

    if (!handledByGreeting && !handledByInventory && !handledByHistory && !handledByPricing && isRecommendationIntent(inbound.text)) {
      try {
        if (isTechnicalSheetIntent(inbound.text) || isProductImageIntent(inbound.text) || Boolean(detectTechResendIntent(inbound.text))) {
          // Technical requests are handled by dedicated tech-sheet flow.
        } else {
        const products = await fetchCatalogRows("id,name,brand,category,summary,description,specs_text,specs_json,source_payload,product_url", 120, false);

        const list = (Array.isArray(products) ? products : []).filter((r: any) => isCommercialCatalogRow(r));
        const scopedCategory = normalizeText(String(detectCatalogCategoryIntent(inbound.text) || previousMemory?.last_category_intent || ""));
        const scopedList = scopedCategory ? scopeCatalogRows(list as any, scopedCategory) : list;
        const featureTerms = extractFeatureTerms(inbound.text);
        const wantsFeatureAnswer = isFeatureQuestionIntent(inbound.text) && featureTerms.length > 0;
        let matched = pickBestCatalogProduct(inbound.text, scopedList);
        if (matched?.name && !isCatalogMatchConsistent(inbound.text, matched, scopedCategory)) matched = null;
        const sourceList = scopedList.length ? scopedList : list;
        const calibrationPref = detectCalibrationPreference(inbound.text);
        const sourceListByCalibration = calibrationPref
          ? sourceList.filter((row: any) => rowMatchesCalibrationPreference(row, calibrationPref))
          : sourceList;
        const suggestions = [
          matched,
          ...sourceListByCalibration.filter((p: any) => !matched || String(p.id) !== String(matched.id)),
        ]
          .filter(Boolean)
          .slice(0, 3)
          .map((p: any) => String(p?.name || "").trim())
          .filter(Boolean);

        if (wantsFeatureAnswer) {
          const rankedByFeature = rankCatalogByFeature(sourceListByCalibration as any[], featureTerms).slice(0, 5);
          if (rankedByFeature.length) {
            const top = rankedByFeature.slice(0, 3);
            const options = buildNumberedProductOptions(top.map((x) => x.row), 3);
            const first = top[0]?.row;
            if (first?.name) {
              nextMemory.last_product_name = String(first.name || "");
              nextMemory.last_product_id = String((first as any)?.id || "");
              nextMemory.last_product_category = String((first as any)?.category || "");
              nextMemory.last_selected_product_name = String(first.name || "");
              nextMemory.last_selected_product_id = String((first as any)?.id || "");
              nextMemory.last_selection_at = new Date().toISOString();
            }
            nextMemory.pending_product_options = options;
            nextMemory.awaiting_action = "product_option_selection";
            reply = [
              `Sí, tengo opciones que cumplen esa característica (${featureTerms.join(", ")}):`,
              ...options.map((o) => `${o.code}) ${o.name}`),
              "",
              "Responde con letra o número (ej.: A o 1) y te envío ficha técnica o cotización.",
            ].join("\n");
          } else if (suggestions.length) {
            reply = `No encontré coincidencia exacta para esa característica (${featureTerms.join(", ")}). Te propongo alternativas cercanas: ${suggestions.join("; ")}.`;
          } else {
            reply = "No encontré coincidencias para esa característica en este momento. Si quieres, te filtro por capacidad, resolución o calibración externa/interna.";
          }
        } else if (suggestions.length) {
          if (matched?.name) {
            nextMemory.last_product_name = String(matched.name || "");
            nextMemory.last_product_id = String((matched as any)?.id || "");
            nextMemory.last_product_category = String((matched as any)?.category || "");
            nextMemory.last_selected_product_name = String(matched.name || "");
            nextMemory.last_selected_product_id = String((matched as any)?.id || "");
            nextMemory.last_selection_at = new Date().toISOString();
            nextMemory.pending_product_options = [];
          }
          const optionSource = [matched, ...sourceList].filter(Boolean).slice(0, 4);
          const options = buildNumberedProductOptions(optionSource as any[], 4);
          nextMemory.pending_product_options = options;
          nextMemory.awaiting_action = "product_option_selection";
          reply = [
            "Con base en tu caso, estas son opciones del catálogo:",
            ...options.map((o) => `${o.code}) ${o.name}`),
            "",
            "Responde con letra o número (ej.: A o 1) y te envío ficha técnica o cotización.",
          ].join("\n");
        } else {
          reply = "Ahora mismo no encuentro productos activos en el catalogo para recomendar. Si quieres, actualizo catalogo y te cotizo enseguida.";
        }

        handledByRecommendation = true;
        billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        }
      } catch (recErr: any) {
        console.warn("[evolution-webhook] recommendation_failed", recErr?.message || recErr);
      }
    }

    const quoteIntentNow = asksQuoteIntent(inbound.text) || isQuoteStarterIntent(inbound.text) || isQuoteProceedIntent(inbound.text) || isPriceIntent(inbound.text);
    const hasExplicitTechNow = isTechnicalSheetIntent(inbound.text) || isProductImageIntent(inbound.text) || Boolean(detectTechResendIntent(inbound.text));
    const forceExitTechAwaiting = (quoteIntentNow && !hasExplicitTechNow) || inboundTechnicalSpec;
    const awaitingTechProductSelection = awaitingAction === "tech_product_selection" && !forceExitTechAwaiting;
    const awaitingTechAssetChoice = awaitingAction === "tech_asset_choice" && !forceExitTechAwaiting;
    if (forceExitTechAwaiting && String(nextMemory.awaiting_action || "").startsWith("tech_")) {
      nextMemory.awaiting_action = "none";
    }
    const rememberedTechProduct = String(previousMemory?.last_product_name || nextMemory?.last_product_name || "").trim();
    const techResendIntent = detectTechResendIntent(inbound.text);
    const techInboundText = techResendIntent && rememberedTechProduct
      ? `ficha tecnica de ${rememberedTechProduct}`
      : awaitingTechAssetChoice && isAffirmativeIntent(inbound.text) && rememberedTechProduct
        ? `ficha tecnica de ${rememberedTechProduct}`
        : inbound.text;

    if (!handledByGreeting && !handledByInventory && !handledByHistory && !handledByPricing && !handledByRecommendation && (isTechnicalSheetIntent(techInboundText) || isProductImageIntent(techInboundText) || Boolean(techResendIntent) || awaitingTechProductSelection || awaitingTechAssetChoice)) {
      try {
        if (techResendIntent && !rememberedTechProduct) {
          reply = "Para reenviar la ficha técnica necesito el modelo exacto del producto. Escríbeme solo el nombre del modelo.";
          nextMemory.awaiting_action = "tech_product_selection";
          handledByTechSheet = true;
          billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        } else {
        const products = await fetchCatalogRows("id,name,category,product_url,image_url,datasheet_url,summary,description,specs_text,specs_json,source_payload", 180, false);

        const rawList = Array.isArray(products) ? products : [];
        const merged = [...rawList.filter((p: any) => isCommercialCatalogRow(p)), ...rawList.filter((p: any) => isDocumentCatalogRow(p))];
        const seen = new Set<string>();
        const list = merged.filter((p: any) => {
          const key = String(p?.id || `${String(p?.name || "").trim()}::${String(p?.product_url || "").trim()}`);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        const modelTokensForTech = extractModelLikeTokens(techInboundText);
        const explicitTermsForTech = extractCatalogTerms(techInboundText);
        const hasExplicitProductHintForTech = modelTokensForTech.length > 0 || explicitTermsForTech.length >= 2;
        const detectedTechCategory = normalizeText(String(detectCatalogCategoryIntent(techInboundText) || ""));
        const rememberedTechCategory = normalizeText(String(previousMemory?.last_product_category || previousMemory?.last_category_intent || ""));
        const preferredTechCategory = detectedTechCategory || (hasExplicitProductHintForTech ? "" : rememberedTechCategory);
        const scopedList = preferredTechCategory ? scopeCatalogRows(list as any, preferredTechCategory) : list;
        const listForTech = scopedList.length ? scopedList : list;
        const rememberedTechProductId = String(previousMemory?.last_product_id || nextMemory?.last_product_id || previousMemory?.last_selected_product_id || nextMemory?.last_selected_product_id || "").trim();
        const rememberedById = rememberedTechProductId
          ? (list.find((x: any) => String(x?.id || "").trim() === rememberedTechProductId) || null)
          : null;
        const rememberedRow = rememberedById || (rememberedTechProduct
          ? findCatalogProductByName(list, rememberedTechProduct)
          : null);
        const askList = isTechSheetCatalogListIntent(inbound.text);

        if (askList) {
          const withSheet = listForTech.filter((p: any) => {
            const payload = p?.source_payload && typeof p.source_payload === "object" ? p.source_payload : {};
            const pdfLinks = Array.isArray((payload as any)?.pdf_links) ? (payload as any).pdf_links : [];
            const productUrlAsPdf = /\.pdf(\?|$)/i.test(String(p?.product_url || ""));
            return Boolean(String(p?.datasheet_url || "").trim()) || pdfLinks.length > 0 || productUrlAsPdf;
          });

          const withImageOrSpecs = listForTech.filter((p: any) => {
            const specs = String(p?.specs_text || "").trim();
            const image = String(p?.image_url || "").trim();
            return Boolean(specs) || Boolean(image);
          });

          if (withSheet.length) {
            const names = uniqueNormalizedStrings(
              withSheet.map((p: any) => humanCatalogName(String(p?.name || "").trim())).filter(Boolean),
              12
            );
            const rest = Math.max(0, withSheet.length - names.length);
            reply = [
              `Claro. En este momento tengo ${withSheet.length} producto(s) con ficha técnica (PDF) disponible:`,
              "",
              ...names.map((n: string) => `- ${n}`),
              ...(rest > 0 ? [`- y ${rest} más`] : []),
              "",
              "Dime cuál te interesa y te envío la ficha técnica por este WhatsApp.",
            ].join("\n");
            nextMemory.awaiting_action = "tech_product_selection";
          } else if (withImageOrSpecs.length) {
            const names = uniqueNormalizedStrings(
              withImageOrSpecs.map((p: any) => humanCatalogName(String(p?.name || "").trim())).filter(Boolean),
              10
            );
            const rest = Math.max(0, withImageOrSpecs.length - names.length);
            reply = [
              "No tengo fichas técnicas PDF cargadas ahora mismo.",
              "Sí tengo información técnica resumida en:",
              ...names.map((n: string) => `- ${n}`),
              ...(rest > 0 ? [`- y ${rest} más`] : []),
              "",
              "Si me dices un producto, te envío lo disponible por este WhatsApp.",
            ].join("\n");
            nextMemory.awaiting_action = "tech_product_selection";
          } else {
            reply = "En este momento no tengo fichas técnicas cargadas en catálogo para enviar por WhatsApp. Si quieres, te comparto los productos activos.";
            nextMemory.awaiting_action = "none";
          }

          handledByTechSheet = true;
          billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        } else {
        if (techResendIntent && rememberedTechProduct && !rememberedRow?.name) {
          reply = `No pude recuperar el archivo técnico de ${rememberedTechProduct} en este momento. Escríbeme nuevamente el modelo exacto para reenviarlo.`;
          nextMemory.awaiting_action = "tech_product_selection";
          handledByTechSheet = true;
          billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        } else {
        const modelTokens = modelTokensForTech;
        const explicitTerms = explicitTermsForTech;
        const hasExplicitProductHint = hasExplicitProductHintForTech;

        let matched: any = null;
        if (!hasExplicitProductHint && rememberedRow?.name) {
          matched = rememberedRow;
        } else {
          const techSourceText = String(techInboundText || "").trim();
          let candidatePool: any[] = scopedList as any[];
          if (hasExplicitProductHint) {
            const scopedNarrowed = filterCatalogByTerms(techInboundText, scopedList as any, preferredTechCategory);
            if (!scopedNarrowed.length) {
              const allNarrowed = filterCatalogByTerms(techInboundText, list as any);
              if (allNarrowed.length) candidatePool = list as any[];
            }
          }
          matched = pickBestCatalogProduct(techSourceText, candidatePool as any);
          if (!matched?.name && rememberedRow?.name && !hasExplicitProductHint) matched = rememberedRow;
        }

        if (!matched?.name && hasExplicitProductHint) {
          matched = await findCatalogByVariant(techInboundText, (scopedList.length ? scopedList : list) as any[], preferredTechCategory);
        }

        if (matched?.name && !isCatalogMatchConsistent(techInboundText, matched, preferredTechCategory)) {
          matched = null;
        }

        if (!matched?.name) {
          const narrowed = filterCatalogByTerms(techInboundText, scopedList as any, preferredTechCategory);
          const sourceOptions = narrowed.length ? narrowed : (scopedList.length ? scopedList : list);
          const options = buildNumberedProductOptions(sourceOptions as any[], 6);
          if (options.length) {
            const top = options.slice(0, 4);
            const more = Math.max(0, options.length - top.length);
            reply = [
              "Claro. Para enviarte la ficha técnica necesito el producto exacto.",
              "",
              "Opciones disponibles:",
              ...top.map((o) => `${o.code}) ${o.name}`),
              ...(more > 0 ? [`- y ${more} más`] : []),
              "",
              "Responde con letra o número (ej.: A o 1).",
            ].join("\n");
            nextMemory.awaiting_action = "product_option_selection";
            nextMemory.pending_product_options = options;
          } else {
            reply = `Ahora mismo no encuentro productos activos en catálogo para enviarte ficha técnica. Catálogo oficial: ${CATALOG_REFERENCE_URL}`;
            nextMemory.awaiting_action = "none";
          }
          handledByTechSheet = true;
          billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        } else {
          nextMemory.last_product_name = String((matched as any)?.name || "");
          nextMemory.last_product_id = String((matched as any)?.id || "");
          nextMemory.last_product_category = String((matched as any)?.category || "");
          nextMemory.last_selected_product_name = String((matched as any)?.name || "");
          nextMemory.last_selected_product_id = String((matched as any)?.id || "");
          nextMemory.last_selection_at = new Date().toISOString();
          const wantsSheet = isTechnicalSheetIntent(techInboundText) || isProductImageIntent(techInboundText) || awaitingTechProductSelection || awaitingTechAssetChoice;
          const wantsImage = false;
          const matchedCategory = normalizeText(String((matched as any)?.category || ""));
          const webTechOnly = prefersWebTechPageOnly(matchedCategory);
          const matchedProductUrl = String((matched as any)?.product_url || "").trim();
          const imageUrl = String((matched as any)?.image_url || "").trim();
          let attachedSheet = false;
          let attachedImage = false;

          if (wantsSheet) {
            const datasheetUrl = webTechOnly ? "" : pickBestProductPdfUrl(matched, techInboundText);
            const localPdfPath = webTechOnly ? "" : pickBestLocalPdfPath(matched, techInboundText);
            if (datasheetUrl) technicalFallbackLinks.push(datasheetUrl);
            if (webTechOnly && matchedProductUrl) technicalFallbackLinks.push(matchedProductUrl);
            if (datasheetUrl) {
              const remote = await fetchRemoteFileAsBase64(datasheetUrl);
              if (remote) {
                const remoteLooksPdf =
                  /application\/pdf/i.test(String(remote.mimetype || "")) ||
                  /\.pdf$/i.test(String(remote.fileName || "")) ||
                  /\.pdf(\?|$)/i.test(String(datasheetUrl || ""));
                if (remoteLooksPdf && Number(remote.byteSize || 0) <= MAX_WHATSAPP_DOC_BYTES) {
                  technicalDocs.push({
                    kind: "document",
                    base64: remote.base64,
                    mimetype: "application/pdf",
                    fileName: safeFileName(remote.fileName, `ficha-${String((matched as any)?.name || "producto")}`, "pdf"),
                    caption: `Ficha técnica - ${String((matched as any)?.name || "producto")}`,
                  });
                  attachedSheet = true;
                }
              }
            }
            if (!attachedSheet && localPdfPath) {
              const local = fetchLocalFileAsBase64(localPdfPath);
              if (local) {
                if (Number(local.byteSize || 0) <= MAX_WHATSAPP_DOC_BYTES) {
                  technicalDocs.push({
                    kind: "document",
                    base64: local.base64,
                    mimetype: local.mimetype || "application/pdf",
                    fileName: safeFileName(local.fileName, `ficha-${String((matched as any)?.name || "producto")}`, "pdf"),
                    caption: `Ficha técnica - ${String((matched as any)?.name || "producto")}`,
                  });
                  attachedSheet = true;
                }
              }
            }
          }

          if (wantsImage || wantsSheet) {
            if (imageUrl) {
              technicalFallbackLinks.push(imageUrl);
              const remote = await fetchRemoteFileAsBase64(imageUrl);
              if (remote) {
                if (Number(remote.byteSize || 0) <= MAX_WHATSAPP_DOC_BYTES) {
                  technicalDocs.push({
                    kind: "image",
                    base64: remote.base64,
                    mimetype: remote.mimetype || "image/jpeg",
                    fileName: safeFileName(remote.fileName, `imagen-${String((matched as any)?.name || "producto")}`, "jpg"),
                    caption: `Imagen - ${String((matched as any)?.name || "producto")}`,
                  });
                  attachedImage = true;
                }
              }
            }
          }

          const briefSpecs = buildTechnicalSummary(matched, 4);
          const includeSummary = wantsSheet && !wantsImage;
          const productUrl = String((matched as any)?.product_url || "").trim();
          const pdfLink = technicalFallbackLinks.find((u) => /\.pdf(\?|$)/i.test(String(u || ""))) || "";
          const pdfTooLargeForAttachment = wantsSheet && !attachedSheet && Boolean(pdfLink);
          const urlKey = (u: string) => String(u || "").trim().replace(/\/+$/, "").toLowerCase();
          const detailUrl = !webTechOnly && productUrl && (!pdfLink || urlKey(productUrl) !== urlKey(pdfLink)) ? productUrl : "";
          const primarySheetLink = webTechOnly
            ? String(matchedProductUrl || "").trim()
            : String(pdfLink || detailUrl || "").trim();
          const repositoryLinkFallbackSection = wantsSheet && !attachedSheet && !primarySheetLink && DATASHEET_REPOSITORY_URL
            ? ["", `Repositorio de fichas tecnicas: ${DATASHEET_REPOSITORY_URL}`]
            : [];
          const webTechLinkSection = webTechOnly && wantsSheet && matchedProductUrl
            ? ["", `FICHA WEB: ${matchedProductUrl}`]
            : [];
          const hasSamePrimaryWebLink = webTechOnly && matchedProductUrl && primarySheetLink && urlKey(primarySheetLink) === urlKey(matchedProductUrl);
          const summaryAlreadyContainsSheetLink = includeSummary && !briefSpecs && !webTechOnly && Boolean(primarySheetLink);
          const sheetLinkFallbackSection = wantsSheet && !attachedSheet && !webTechOnly && primarySheetLink && !summaryAlreadyContainsSheetLink
            ? [
                "",
                `Te envío el enlace directo de la ficha técnica: ${primarySheetLink}`,
                ...(pdfLink && !attachedSheet
                  ? [pdfTooLargeForAttachment
                      ? "Si prefieres, te intento reenviar el PDF cuando el archivo permita envio por WhatsApp."
                      : "Si prefieres, escribe 'reenviar ficha' y te intento enviar el PDF por este WhatsApp."]
                  : []),
              ]
            : [];

          if (technicalDocs.length) {
            const summarySection = includeSummary
              ? (
                  briefSpecs
                    ? ["", "Resumen técnico:", briefSpecs]
                    : (primarySheetLink
                        ? (hasSamePrimaryWebLink ? [] : ["", "Te comparto el enlace directo de la ficha técnica:", primarySheetLink])
                        : ["", "Te comparto la ficha técnica adjunta."])
                )
              : [];
            reply = [
              attachedSheet
                ? `Perfecto. Te envío por este WhatsApp la ficha técnica en PDF de ${String((matched as any)?.name || "ese producto")}.`
                : `Perfecto. Te comparto la información técnica de ${String((matched as any)?.name || "ese producto")}.`,
              ...summarySection,
              ...sheetLinkFallbackSection,
              ...repositoryLinkFallbackSection,
              ...webTechLinkSection,
            ].join("\n");
          } else if (briefSpecs) {
            reply = [
              `Te comparto la ficha técnica de ${String((matched as any)?.name || "ese producto")}:`,
              "",
              briefSpecs,
              ...webTechLinkSection,
              ...repositoryLinkFallbackSection,
              ...(pdfTooLargeForAttachment ? ["", `La ficha PDF es pesada para envío directo; aquí la puedes abrir: ${pdfLink}`] : []),
              ...(detailUrl ? ["", `Más detalle: ${detailUrl}`] : []),
            ].join("\n");
          } else {
            reply = webTechOnly && wantsSheet && matchedProductUrl
              ? `Este modelo no tiene ficha PDF oficial. Puedes revisar su ficha web aquí: ${matchedProductUrl}.`
              : pdfTooLargeForAttachment
                ? `La ficha PDF de ${String((matched as any)?.name || "ese producto")} es pesada para envío directo por WhatsApp. Puedes abrirla aquí: ${pdfLink}.`
                : `Te comparto el enlace directo de la ficha técnica de ${String((matched as any)?.name || "ese producto")}.${detailUrl ? ` ${detailUrl}` : ""}${!detailUrl && DATASHEET_REPOSITORY_URL ? ` Repositorio de fichas: ${DATASHEET_REPOSITORY_URL}.` : ""} Si quieres, te genero la cotización de una vez.`;
          }
          if (reply && !/\bquieres\b.*\b(cotizacion|ficha|producto)\b/i.test(normalizeText(reply))) {
            reply = `${reply}\n\n¿Quieres cotización de este modelo o prefieres revisar otro producto?`;
          }
          nextMemory.awaiting_action = "none";
          handledByTechSheet = true;
          billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        }
        }
        }
        }
      } catch (techErr: any) {
        console.warn("[evolution-webhook] tech_sheet_failed", techErr?.message || techErr);
        reply = "Tuve un problema al preparar la ficha técnica en este intento. Escríbeme nuevamente el modelo exacto y te la envío por este WhatsApp.";
        nextMemory.awaiting_action = "tech_product_selection";
        handledByTechSheet = true;
        billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
      }
    }

    const rememberedQuoteProductName = String(nextMemory.last_product_name || previousMemory?.last_product_name || "").trim();
    const concreteQuoteIntent = isConcreteQuoteIntent(inbound.text, rememberedQuoteProductName);

    if (!handledByGreeting && !handledByInventory && !handledByHistory && !handledByPricing && !handledByRecommendation && !handledByTechSheet && !concreteQuoteIntent && isQuoteStarterIntent(inbound.text)) {
      try {
        const allCatalog = await fetchCatalogRows("id,name,category,source_payload,base_price_usd", 260, false);
        const priced = await fetchCatalogRows("id,name,category,source_payload,base_price_usd", 160, true);
        const allRows = (Array.isArray(allCatalog) ? allCatalog : []).filter((r: any) => isCommercialCatalogRow(r));
        const pricedRows = (Array.isArray(priced) ? priced : []).filter((r: any) => isCommercialCatalogRow(r));
        const options = buildNumberedProductOptions(pricedRows, 4);
        const quoteText = normalizeText(inbound.text || "");
        const rememberedCategory = normalizeText(String(previousMemory?.last_category_intent || nextMemory?.last_product_category || ""));
        const detectedCategory = normalizeText(String(detectCatalogCategoryIntent(inbound.text) || ""));
        const asksBasculas = /(bascula|basculas|plataforma|indicador)/.test(quoteText);
        const asksBalanzas = /(balanza|balanzas)/.test(quoteText);
        const targetCategoryForQuote = ["balanzas", "basculas", "electroquimica", "equipos_laboratorio", "analizador_humedad"].includes(detectedCategory)
          ? detectedCategory
          : asksBasculas
          ? "basculas"
          : asksBalanzas
            ? "balanzas"
            : (["balanzas", "basculas", "electroquimica", "equipos_laboratorio", "analizador_humedad"].includes(rememberedCategory) ? rememberedCategory : "balanzas");
        const isGenericBalanceQuote = /(balanza|balanzas|bascula|basculas)/.test(quoteText) && !hasConcreteProductHint(inbound.text);
        const categoryRows = scopeCatalogRows(allRows as any[], targetCategoryForQuote);
        const pricedCategoryRows = scopeCatalogRows(pricedRows as any[], targetCategoryForQuote);
        const subCount = new Map<string, number>();
        for (const row of categoryRows) {
          const rawSub = normalizeText(String(catalogSubcategory(row) || ""));
          const key = rawSub || normalizeText(String((row as any)?.category || ""));
          if (!key) continue;
          subCount.set(key, Number(subCount.get(key) || 0) + 1);
        }
        const typeOrder = targetCategoryForQuote === "basculas"
          ? [
              "basculas_mesa",
              "basculas_piso",
              "basculas_lavables",
              "plataformas",
              "plataformas_lavables",
              "indicadores",
              "indicadores_lavables",
              "basculas",
            ]
          : [
              "balanzas_semimicro",
              "balanzas_analiticas",
              "balanzas_semianaliticas",
              "balanzas_precision",
              "balanzas_mesa",
              "balanzas_portatiles",
              "balanzas_joyeria",
              "balanzas_alimentos",
              "balanzas_conteo",
              "balanzas",
            ];
        const typeLabel: Record<string, string> = {
          balanzas_semimicro: "Semi-Micro",
          balanzas_analiticas: "Analíticas",
          balanzas_semianaliticas: "Semianalíticas",
          balanzas_precision: "Precisión",
          balanzas_mesa: "De Mesa",
          balanzas_joyeria: "Joyería",
          balanzas_portatiles: "Portátiles",
          balanzas_alimentos: "De Alimentos",
          balanzas_conteo: "De Conteo",
          basculas_mesa: "Básculas de Mesa",
          basculas_piso: "Básculas de Piso",
          basculas_lavables: "Básculas Lavables",
          plataformas: "Plataformas",
          plataformas_lavables: "Plataformas Lavables",
          indicadores: "Indicadores",
          indicadores_lavables: "Indicadores Lavables",
          basculas: "Básculas",
          balanzas: "Balanzas",
        };
        const types = typeOrder
          .map((k) => ({ key: k, count: Number(subCount.get(k) || 0) }))
          .filter((x) => x.count > 0)
          .slice(0, 10);

        let quoteOptions = options;
        let categoryRestrictedWithoutMatches = false;
        if (!isGenericBalanceQuote && targetCategoryForQuote) {
          const sourceForCategory = pricedCategoryRows.length ? pricedCategoryRows : categoryRows;
          if (sourceForCategory.length) {
            quoteOptions = buildNumberedProductOptions(sourceForCategory as any[], 4);
          } else {
            quoteOptions = [];
            categoryRestrictedWithoutMatches = true;
          }
        }
        if (isGenericBalanceQuote && categoryRows.length) {
          const buckets = new Map<string, any[]>();
          const sourceForQuoteOptions = pricedCategoryRows.length ? pricedCategoryRows : categoryRows;
          for (const row of sourceForQuoteOptions) {
            const rawSub = normalizeText(String(catalogSubcategory(row) || ""));
            const categoryKey = normalizeText(String((row as any)?.category || ""));
            const key = rawSub || categoryKey || "otros";
            if (!buckets.has(key)) buckets.set(key, []);
            buckets.get(key)!.push(row);
          }

          const diversifiedTypeOrder = [
            "balanzas_analiticas",
            "balanzas_semianaliticas",
            "balanzas_precision",
            "balanzas_portatiles",
            "basculas",
            "balanzas_joyeria",
            "balanzas",
            "otros",
          ];

          const pickedRows: any[] = [];
          const pickedKeys = new Set<string>();
          const queues = diversifiedTypeOrder
            .map((k) => ({ key: k, rows: [...(buckets.get(k) || [])] }))
            .filter((q) => q.rows.length > 0);

          let guard = 0;
          while (pickedRows.length < 4 && guard < 50) {
            guard += 1;
            let added = false;
            for (const q of queues) {
              if (!q.rows.length) continue;
              const candidate = q.rows.shift();
              const cKey = normalizeText(String((candidate as any)?.name || ""));
              if (!candidate || !cKey || pickedKeys.has(cKey)) continue;
              pickedRows.push(candidate);
              pickedKeys.add(cKey);
              added = true;
              if (pickedRows.length >= 4) break;
            }
            if (!added) break;
          }

          if (pickedRows.length) {
            quoteOptions = buildNumberedProductOptions(pickedRows, 4);
          }
        }

        reply = quoteOptions.length
          ? (isGenericBalanceQuote
              ? [
                  `Claro. Para cotizar una ${targetCategoryForQuote === "basculas" ? "báscula" : "balanza"}, primero elige tipo o modelo:`,
                  `Tengo ${categoryRows.length} referencia(s) de ${targetCategoryForQuote === "basculas" ? "básculas" : "balanzas"} en catálogo (${pricedCategoryRows.length} con precio para cotización inmediata).`,
                  ...(types.length
                    ? [
                        "Tipos disponibles:",
                        ...types.map((t) => `- ${typeLabel[t.key] || t.key.replace(/_/g, " ")} (${t.count})`),
                        "",
                  ]
                    : []),
                  "Opciones rápidas de modelo:",
                  ...quoteOptions.map((o) => `${o.code}) ${o.name}`),
                  "",
                  `Catálogo oficial: ${CATALOG_REFERENCE_URL}`,
                  "",
                  `Responde con un tipo (ej: ${targetCategoryForQuote === "basculas" ? "plataformas" : "precisión"}) o con letra/número (ej: A o 1).`,
                ].join("\n")
              : [
                  "Claro. Para cotizar de una, elige primero un modelo:",
                  ...quoteOptions.map((o) => `${o.code}) ${o.name}`),
                  "",
                  "Responde con letra o número (ej.: A o 1). Luego te pido cantidad.",
                ].join("\n"))
          : (categoryRestrictedWithoutMatches
              ? `Ahora mismo no tengo referencias activas para cotizar en la categoría ${targetCategoryForQuote.replace(/_/g, " ")}. Si quieres, te muestro opciones disponibles en balanzas o básculas.`
              : "Claro. Para cotizar de una, dime modelo exacto y cantidad (ejemplo: Explorer 220, 2 unidades).");
        nextMemory.awaiting_action = quoteOptions.length ? "product_option_selection" : "quote_product_selection";
        nextMemory.pending_product_options = quoteOptions;
        nextMemory.last_category_intent = targetCategoryForQuote;

        handledByQuoteStarter = true;
        billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
      } catch (starterErr: any) {
        console.warn("[evolution-webhook] quote_starter_failed", starterErr?.message || starterErr);
      }
    }

    if (!handledByGreeting && !handledByInventory && !handledByHistory && !handledByPricing && !handledByRecommendation && !handledByTechSheet && !handledByQuoteStarter && isQuantityUpdateIntent(inbound.text)) {
      try {
        const requestedQty = extractQuantity(inbound.text);
        const memoryDraftId = String(previousMemory?.last_quote_draft_id || "").trim();

        let baseDraft: any = null;
        if (memoryDraftId) {
          const { data } = await supabase
            .from("agent_quote_drafts")
            .select("id,tenant_id,product_catalog_id,product_name,base_price_usd,trm_rate,total_cop,status,payload,customer_phone,customer_name,customer_email,company_name,notes,created_at")
            .eq("id", memoryDraftId)
            .eq("created_by", ownerId)
            .eq("agent_id", String(agent.id))
            .maybeSingle();
          baseDraft = data || null;
        }

        if (!baseDraft) {
          const { data: recentDrafts } = await supabase
            .from("agent_quote_drafts")
            .select("id,tenant_id,product_catalog_id,product_name,base_price_usd,trm_rate,total_cop,status,payload,customer_phone,customer_name,customer_email,company_name,notes,created_at")
            .eq("created_by", ownerId)
            .eq("agent_id", String(agent.id))
            .order("created_at", { ascending: false })
            .limit(30);

          const inboundPhone = normalizePhone(inbound.from || "");
          const inboundTail = phoneTail10(inbound.from || "");
          const draftList = Array.isArray(recentDrafts) ? recentDrafts : [];
          baseDraft =
            draftList.find((d: any) => normalizePhone(String(d?.customer_phone || "")) === inboundPhone) ||
            draftList.find((d: any) => phoneTail10(String(d?.customer_phone || "")) === inboundTail) ||
            null;
        }

        if (!baseDraft?.id) {
          reply = "No encuentro una cotización previa para ajustar cantidad en este momento. Si me dices producto y cantidad, la genero de inmediato por este WhatsApp.";
          handledByRecall = true;
          billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        } else {
          const basePriceUsd = Number((baseDraft as any)?.base_price_usd || 0);
          if (!(requestedQty > 0) || !(basePriceUsd > 0)) {
            reply = "Entendido. Confírmame la cantidad exacta para recalcular y enviarte el PDF actualizado.";
            handledByRecall = true;
            billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
          } else {
            const trm = await getOrFetchTrm(supabase, ownerId, (agent as any)?.tenant_id || null);
            const trmRate = Number(trm?.rate || 0);
            if (!(trmRate > 0)) {
              reply = "No pude consultar la TRM de hoy para actualizar la cotización. Intenta de nuevo en 1 minuto y te la envío por este WhatsApp.";
              handledByRecall = true;
              billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
            } else {
              const totalCop = Number((basePriceUsd * trmRate * requestedQty).toFixed(2));
              const payload = {
                ...((baseDraft as any)?.payload || {}),
                quantity: requestedQty,
                trm_date: trm?.rate_date || null,
                trm_source: trm?.source || null,
                automation: "evolution_webhook_qty_adjust",
              };

              const { data: newDraft, error: newDraftErr } = await supabase
                .from("agent_quote_drafts")
                .insert({
                  tenant_id: (baseDraft as any)?.tenant_id || (agent as any)?.tenant_id || null,
                  created_by: ownerId,
                  agent_id: String(agent.id),
                  customer_name: String((baseDraft as any)?.customer_name || nextMemory.customer_name || inbound.pushName || "") || null,
                  customer_email: String((baseDraft as any)?.customer_email || nextMemory.customer_email || "") || null,
                  customer_phone: String((baseDraft as any)?.customer_phone || nextMemory.customer_phone || inbound.from || "") || null,
                  company_name: String((baseDraft as any)?.company_name || cfg?.company_name || "Avanza Balanzas") || "Avanza Balanzas",
                  location: null,
                  product_catalog_id: (baseDraft as any)?.product_catalog_id || null,
                  product_name: String((baseDraft as any)?.product_name || ""),
                  base_price_usd: basePriceUsd,
                  trm_rate: trmRate,
                  total_cop: totalCop,
                  notes: "Cotizacion ajustada por cantidad solicitada por cliente",
                  payload,
                  status: "analysis",
                })
                .select("id")
                .single();

              if (newDraftErr || !newDraft?.id) {
                reply = "Ocurrió un error al actualizar la cotización por cantidad. Inténtalo de nuevo y te la envío por este WhatsApp.";
              } else {
                const draftId = String(newDraft.id);
                const pdfBase64 = await buildQuotePdf({
                  draftId,
                  companyName: String((baseDraft as any)?.company_name || "Avanza Balanzas"),
                  customerName: String((baseDraft as any)?.customer_name || nextMemory.customer_name || inbound.pushName || ""),
                  customerEmail: String((baseDraft as any)?.customer_email || nextMemory.customer_email || ""),
                  customerPhone: String((baseDraft as any)?.customer_phone || nextMemory.customer_phone || inbound.from),
                  productName: String((baseDraft as any)?.product_name || ""),
                  quantity: requestedQty,
                  basePriceUsd,
                  trmRate,
                  totalCop,
                  notes: "Cotización ajustada por cantidad",
                });

                resendPdf = {
                  draftId,
                  fileName: `cotizacion-${draftId.slice(0, 8)}.pdf`,
                  pdfBase64,
                };
                nextMemory.last_quote_draft_id = draftId;
                nextMemory.last_quote_product_name = String((baseDraft as any)?.product_name || "");
                reply = `Perfecto. Ya actualicé la cotización a ${requestedQty} unidades con TRM de hoy y te envío el PDF ahora mismo por este chat.`;
              }

              handledByRecall = true;
              billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
            }
          }
        }
      } catch (qtyErr: any) {
        console.warn("[evolution-webhook] quantity_adjust_failed", qtyErr?.message || qtyErr);
      }
    }

    if (!handledByGreeting && awaitingAction === "tech_asset_choice" && !handledByInventory && !handledByHistory && !handledByPricing && !handledByRecommendation && !handledByTechSheet && !handledByQuoteStarter && isAffirmativeIntent(inbound.text)) {
      const prevIntent = String(previousMemory?.last_intent || "");
      const lastProductName = String(previousMemory?.last_product_name || nextMemory?.last_product_name || "").trim();
      if ((/(tech_sheet_request|image_request)/.test(prevIntent)) && lastProductName) {
        reply = `Perfecto. Para ${lastProductName}, responde 1 para cotización o 2 para ficha técnica.`;
        nextMemory.awaiting_action = "tech_asset_choice";
        handledByTechSheet = true;
        billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
      }
    }

    const previousIntent = String(previousMemory?.last_intent || "");
    const recallByConfirmation =
      Boolean(previousMemory?.last_quote_draft_id) &&
      isAffirmativeIntent(inbound.text) &&
      /(quote_recall|quote_generated|price_request)/.test(previousIntent) &&
      awaitingAction === "quote_resend_confirmation";
    if (!handledByGreeting && !handledByInventory && !handledByHistory && !handledByPricing && !handledByRecommendation && !handledByTechSheet && (isQuoteRecallIntent(inbound.text) || recallByConfirmation)) {
      try {
        const { data: recentDrafts } = await supabase
          .from("agent_quote_drafts")
          .select("id,tenant_id,product_catalog_id,product_name,base_price_usd,trm_rate,total_cop,status,payload,customer_phone,customer_name,customer_email,company_name,notes,created_at")
          .eq("created_by", ownerId)
          .eq("agent_id", String(agent.id))
          .order("created_at", { ascending: false })
          .limit(30);

        const inboundPhone = normalizePhone(inbound.from || "");
        const inboundTail = phoneTail10(inbound.from || "");
        const draftList = Array.isArray(recentDrafts) ? recentDrafts : [];

        const lastDraft =
          draftList.find((d: any) => normalizePhone(String(d?.customer_phone || "")) === inboundPhone) ||
          draftList.find((d: any) => phoneTail10(String(d?.customer_phone || "")) === inboundTail) ||
          null;

        if (lastDraft?.id) {
          nextMemory.last_quote_draft_id = String(lastDraft.id);
          nextMemory.last_quote_product_name = String(lastDraft.product_name || "");
          const qty = Math.max(1, Number((lastDraft as any)?.payload?.quantity || 1));
          const requestedQty = extractQuantity(inbound.text);
          const hasQtyUpdate = isQuantityUpdateIntent(inbound.text) && requestedQty > 0 && requestedQty !== qty;
          reply = `Si, claro. Tu ultima cotizacion fue del producto ${String(lastDraft.product_name || "")}, cantidad ${qty}, total COP ${formatMoney(Number(lastDraft.total_cop || 0))} con TRM ${formatMoney(Number(lastDraft.trm_rate || 0))}.`;

          const wantsResend = shouldResendPdf(inbound.text) || recallByConfirmation || hasQtyUpdate;
          if (wantsResend) {
            let draftIdForSend = String(lastDraft.id);
            let qtyForSend = qty;
            let trmForSend = Number((lastDraft as any).trm_rate || 0);
            let totalForSend = Number((lastDraft as any).total_cop || 0);
            const basePriceUsd = Number((lastDraft as any).base_price_usd || 0);
            if (hasQtyUpdate && basePriceUsd > 0) {
              qtyForSend = requestedQty;
              const trm = await getOrFetchTrm(supabase, ownerId, (agent as any)?.tenant_id || null);
              trmForSend = Number(trm?.rate || trmForSend || 0);
              if (trmForSend > 0) {
                totalForSend = Number((basePriceUsd * trmForSend * qtyForSend).toFixed(2));
                const payload = {
                  ...(lastDraft as any)?.payload,
                  quantity: qtyForSend,
                  trm_date: trm?.rate_date || (lastDraft as any)?.payload?.trm_date || null,
                  trm_source: trm?.source || (lastDraft as any)?.payload?.trm_source || null,
                  automation: "evolution_webhook_requote",
                };
                const { data: newDraft } = await supabase
                  .from("agent_quote_drafts")
                  .insert({
                    tenant_id: (lastDraft as any)?.tenant_id || (agent as any)?.tenant_id || null,
                    created_by: ownerId,
                    agent_id: String(agent.id),
                    customer_name: String((lastDraft as any).customer_name || nextMemory.customer_name || inbound.pushName || "") || null,
                    customer_email: String((lastDraft as any).customer_email || nextMemory.customer_email || "") || null,
                    customer_phone: String((lastDraft as any).customer_phone || nextMemory.customer_phone || inbound.from) || null,
                    company_name: String((lastDraft as any).company_name || cfg?.company_name || "Avanza Balanzas") || "Avanza Balanzas",
                    location: null,
                    product_catalog_id: (lastDraft as any)?.product_catalog_id || null,
                    product_name: String((lastDraft as any).product_name || ""),
                    base_price_usd: basePriceUsd,
                    trm_rate: trmForSend,
                    total_cop: totalForSend,
                    notes: "Ajuste de cantidad por solicitud del cliente",
                    payload,
                    status: "analysis",
                  })
                  .select("id")
                  .single();
                if (newDraft?.id) draftIdForSend = String(newDraft.id);
              }
            }

            const pdfBase64 = await buildQuotePdf({
              draftId: draftIdForSend,
              companyName: String((lastDraft as any).company_name || "Avanza Balanzas"),
              customerName: String((lastDraft as any).customer_name || nextMemory.customer_name || inbound.pushName || ""),
              customerEmail: String((lastDraft as any).customer_email || nextMemory.customer_email || ""),
              customerPhone: String((lastDraft as any).customer_phone || nextMemory.customer_phone || inbound.from),
              productName: String((lastDraft as any).product_name || ""),
              quantity: qtyForSend,
              basePriceUsd,
              trmRate: trmForSend,
              totalCop: totalForSend,
              notes: hasQtyUpdate ? "Cotizacion ajustada por cantidad" : String((lastDraft as any).notes || ""),
            });
            resendPdf = {
              draftId: draftIdForSend,
              fileName: `cotizacion-${String(draftIdForSend).slice(0, 8)}.pdf`,
              pdfBase64,
            };
            if (hasQtyUpdate) {
              nextMemory.last_quote_draft_id = draftIdForSend;
              reply = `Perfecto. Ya ajusté la cotización a ${qtyForSend} unidades y te reenvío el PDF ahora mismo por este chat.`;
            } else {
              reply += " Te reenvio el PDF ahora mismo por este chat.";
            }
            nextMemory.awaiting_action = "none";
          } else {
            reply += " Si quieres, escribe 'reenviar PDF' y te lo mando de nuevo ahora.";
            nextMemory.awaiting_action = "quote_resend_confirmation";
          }
        } else {
          reply = "Por ahora no encuentro una cotizacion previa asociada a este numero. Si quieres, te genero una nueva de inmediato.";
          nextMemory.awaiting_action = "none";
        }
        handledByRecall = true;
        billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
      } catch (recallErr: any) {
        console.warn("[evolution-webhook] recall_quote_failed", recallErr?.message || recallErr);
      }
    }

    const recentUserContext = historyMessages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .slice(-6)
      .join("\n");
    const inboundIsTechnicalSpec = isTechnicalSpecQuery(inbound.text) || inboundTechnicalSpec;
    const previousIntentForQuoteFlow = String(previousMemory?.last_intent || "");
    const asksQuoteWithNumber = asksQuoteIntent(inbound.text) && /\b\d{1,5}\b/.test(normalizeText(inbound.text || ""));
    const quoteContextActive =
      /^(quote_|product_action)/.test(String(awaitingAction || "")) ||
      /(quote_recall|quote_generated|price_request|quote_starter)/.test(previousIntentForQuoteFlow);
    const rememberedSelectedProductName = String(nextMemory.last_selected_product_name || previousMemory?.last_selected_product_name || "").trim();
    const rememberedSelectedProductId = String(nextMemory.last_selected_product_id || previousMemory?.last_selected_product_id || "").trim();
    const quoteProceedFromMemory =
      (isQuoteProceedIntent(inbound.text) ||
        isQuantityUpdateIntent(inbound.text) ||
        (hasBareQuantity(inbound.text) && quoteContextActive) ||
        asksQuoteWithNumber ||
        (isAffirmativeIntent(inbound.text) && /(price_request|quote_starter|recommendation_request)/.test(previousIntentForQuoteFlow))) &&
      !inboundIsTechnicalSpec &&
      Boolean(nextMemory.last_product_name || nextMemory.last_product_id || rememberedSelectedProductName || rememberedSelectedProductId);
    const resumeQuoteFromContext =
      isContactInfoBundle(inbound.text) &&
      shouldAutoQuote(`${recentUserContext}\n${inbound.text}`);
    const forceBundleQuoteIntake =
      bundleOverrideApplied ||
      String(nextMemory.last_intent || previousMemory?.last_intent || "") === "quote_bundle_request" ||
      (
        String(nextMemory.awaiting_action || previousMemory?.awaiting_action || "") === "strict_quote_data" &&
        isContinueQuoteWithoutPersonalDataIntent(originalInboundText)
      );

    if (
      forceBundleQuoteIntake ||
      (
        !handledByGreeting && !handledByInventory && !handledByHistory && !handledByPricing && !handledByRecommendation && !handledByTechSheet && !handledByQuoteStarter && !handledByRecall &&
        (shouldAutoQuote(inbound.text) || resumeQuoteFromContext || quoteProceedFromMemory || concreteQuoteIntent)
      )
    ) {
      try {
        if (forceBundleQuoteIntake) {
          console.log("[quote-bundle] start", { inbound: String(originalInboundText || ""), intent: String(nextMemory.last_intent || "") });
        }
        const products = await fetchCatalogRows("id,name,brand,category,base_price_usd,price_currency,source_payload,product_url", 120, false);

        const quoteSourceText = resumeQuoteFromContext
          ? `${recentUserContext}\n${inbound.text}`
          : quoteProceedFromMemory
            ? `${String(nextMemory.last_product_name || "")}\n${inbound.text}`
            : inbound.text;
        const commercialProducts = (Array.isArray(products) ? products : []).filter((r: any) => isCommercialCatalogRow(r));
        const pricedProducts = commercialProducts.filter((r: any) => Number(r?.base_price_usd || 0) > 0);
        const quoteMatchPool = quoteProceedFromMemory ? commercialProducts : (pricedProducts.length ? pricedProducts : commercialProducts);
        const selectedById = String(nextMemory.last_selected_product_id || previousMemory?.last_selected_product_id || "").trim();
        const selectedByName = String(nextMemory.last_selected_product_name || previousMemory?.last_selected_product_name || "").trim();
        const selectedProduct = selectedById
          ? (commercialProducts.find((p: any) => String(p?.id || "").trim() === selectedById) || null)
          : (selectedByName ? findCatalogProductByName(commercialProducts || [], selectedByName) : null);
        const continuationIntent = isSameQuoteContinuationIntent(quoteSourceText);
        const explicitModelTokens = extractModelLikeTokens(quoteSourceText);
        const explicitModelProducts = findExplicitModelProducts(quoteSourceText, commercialProducts || []);
        const explicitModelProduct = findExactModelProduct(quoteSourceText, commercialProducts || []);
        const matchedProduct = explicitModelProduct || ((quoteProceedFromMemory && selectedProduct)
          ? selectedProduct
          : pickBestCatalogProduct(quoteSourceText, quoteMatchPool || []));
        const rememberedProduct = findCatalogProductByName(commercialProducts || [], String(nextMemory.last_product_name || ""));
        const wantsMulti = forceBundleQuoteIntake || isMultiProductQuoteIntent(quoteSourceText);
        const requestedBundleModels = String(quoteSourceText || "")
          .replace(/^\s*cotiz(?:ar|a|acion|ación)?\s*/i, "")
          .split(/[;,\n|]+/)
          .map((seg) => String(seg || "").trim())
          .map((seg) => String(seg.match(/[A-Z0-9][A-Z0-9\/-]{2,}/i)?.[0] || "").trim())
          .filter((tok) => /\d/.test(tok))
          .filter((tok, idx, arr) => {
            const key = normalizeCatalogQueryText(tok).replace(/[^a-z0-9]/g, "");
            return key && arr.findIndex((x) => normalizeCatalogQueryText(x).replace(/[^a-z0-9]/g, "") === key) === idx;
          });
        const requestedBundleModelKeys = new Set(
          requestedBundleModels.map((tok) => normalizeCatalogQueryText(tok).replace(/[^a-z0-9]/g, "")).filter(Boolean)
        );
        const bundleOptionsCurrent =
          (Array.isArray(nextMemory?.quote_bundle_options_current) ? nextMemory.quote_bundle_options_current : [])
            .concat(Array.isArray(previousMemory?.quote_bundle_options_current) ? previousMemory.quote_bundle_options_current : [])
            .filter((o: any, idx: number, arr: any[]) => {
              const key = String(o?.id || o?.product_id || o?.raw_name || o?.name || "").trim();
              if (!key) return false;
              return arr.findIndex((x: any) => String(x?.id || x?.product_id || x?.raw_name || x?.name || "").trim() === key) === idx;
            });
        const pendingBundleOptions =
          bundleOptionsCurrent
            .concat(Array.isArray(nextMemory?.quote_bundle_options) ? nextMemory.quote_bundle_options : [])
            .concat(Array.isArray(nextMemory?.pending_product_options) ? nextMemory.pending_product_options : [])
            .concat(Array.isArray(nextMemory?.last_recommended_options) ? nextMemory.last_recommended_options : [])
            .concat(Array.isArray(previousMemory?.quote_bundle_options) ? previousMemory.quote_bundle_options : [])
            .concat(Array.isArray(previousMemory?.pending_product_options) ? previousMemory.pending_product_options : [])
            .concat(Array.isArray(previousMemory?.last_recommended_options) ? previousMemory.last_recommended_options : [])
            .filter((o: any, idx: number, arr: any[]) => {
              const key = String(o?.id || o?.product_id || o?.raw_name || o?.name || "").trim();
              if (!key) return false;
              return arr.findIndex((x: any) => String(x?.id || x?.product_id || x?.raw_name || x?.name || "").trim() === key) === idx;
            });
        const resolvePendingOptionToProduct = (opt: any): any => {
          const byId = String(opt?.id || opt?.product_id || "").trim();
          if (byId) {
            const idHit = (commercialProducts || []).find((p: any) => String(p?.id || "").trim() === byId);
            if (idHit) return idHit;
          }
          const label = String(opt?.raw_name || opt?.name || "").trim();
          if (!label) return null;
          const direct = findCatalogProductByName(commercialProducts || [], label);
          if (direct) return direct;
          const modelCandidate = String(label.match(/[A-Z0-9][A-Z0-9\/-]{2,}/i)?.[0] || "").trim();
          if (modelCandidate) {
            const byExact = findExactModelProduct(modelCandidate, commercialProducts || []);
            if (byExact) return byExact;
            const byBest = pickBestCatalogProduct(modelCandidate, commercialProducts || []);
            if (byBest) return byBest;
          }
          return null;
        };
        const selectedProductsFromPending = forceBundleQuoteIntake
          ? (
              (requestedBundleModelKeys.size > 0)
                ? (bundleOptionsCurrent.length ? bundleOptionsCurrent : pendingBundleOptions)
                    .filter((o: any) => {
                      const raw = String(o?.raw_name || o?.name || "").trim();
                      const modelToken = String(raw.match(/[A-Z0-9][A-Z0-9\/-]{2,}/i)?.[0] || raw).trim();
                      const key = normalizeCatalogQueryText(modelToken).replace(/[^a-z0-9]/g, "");
                      return key && requestedBundleModelKeys.has(key);
                    })
                    .map((o: any) => resolvePendingOptionToProduct(o))
                    .filter(Boolean)
                : ((extractModelLikeTokens(quoteSourceText).length >= 2)
                    ? []
                    : (bundleOptionsCurrent.length
                        ? bundleOptionsCurrent
                        : pendingBundleOptions
                      ).map((o: any) => resolvePendingOptionToProduct(o)).filter(Boolean))
            )
          : [];
        const rememberedQuoteProductName = String(
          nextMemory.last_quote_product_name ||
          previousMemory?.last_quote_product_name ||
          nextMemory.last_selected_product_name ||
          previousMemory?.last_selected_product_name ||
          ""
        ).trim();
        const rememberedQuoteProduct = rememberedQuoteProductName
          ? findCatalogProductByName(commercialProducts || [], rememberedQuoteProductName)
          : null;
        let selectedProducts = selectedProductsFromPending.length
          ? selectedProductsFromPending
          : explicitModelProducts.length
          ? (
              continuationIntent && rememberedQuoteProduct
                ? [rememberedQuoteProduct, ...explicitModelProducts].filter((row: any, idx: number, arr: any[]) => {
                    const id = String(row?.id || "").trim();
                    if (!id) return false;
                    return arr.findIndex((x: any) => String(x?.id || "").trim() === id) === idx;
                  })
                : explicitModelProducts
            )
          : matchedProduct || rememberedProduct
            ? [matchedProduct || rememberedProduct]
            : [];

        if (forceBundleQuoteIntake && !selectedProducts.length && pendingBundleOptions.length >= 2) {
          const pendingNames = pendingBundleOptions
            .map((o: any) => String(o?.raw_name || o?.name || "").trim())
            .filter(Boolean);
          if (pendingNames.length >= 2) {
            const rebuilt = findExplicitModelProducts(`cotizar ${pendingNames.join(" ; ")}`, commercialProducts || []);
            if (rebuilt.length) selectedProducts = rebuilt;
          }
        }
        if (forceBundleQuoteIntake) {
          const forcedBundleCount = Number(nextMemory?.bundle_quote_count || previousMemory?.bundle_quote_count || 0);
          if (forcedBundleCount >= 2 && Array.isArray(selectedProducts) && selectedProducts.length > forcedBundleCount) {
            selectedProducts = selectedProducts.slice(0, forcedBundleCount);
          }
          console.log("[quote-bundle] requested vs selected", {
            requested_models: requestedBundleModels,
            selected_models: (selectedProducts || []).map((p: any) => String(p?.name || "")).filter(Boolean),
            selected_count: Array.isArray(selectedProducts) ? selectedProducts.length : 0,
          });
          console.log("[quote-bundle] selected options", {
            pending_options: pendingBundleOptions.length,
            selected_products: selectedProducts.length,
            sample_pending: pendingBundleOptions.slice(0, 3).map((o: any) => String(o?.raw_name || o?.name || "")).filter(Boolean),
            sample_selected: selectedProducts.slice(0, 3).map((p: any) => String(p?.name || "")).filter(Boolean),
          });
        }

        if (!handledByQuoteIntake && continuationIntent && explicitModelTokens.length >= 2 && explicitModelProducts.length < explicitModelTokens.length) {
          const foundNames = explicitModelProducts.map((p: any) => String(p?.name || "").trim()).filter(Boolean);
          reply = foundNames.length
            ? `Entendí que quieres agregar más productos a la misma cotización, pero solo identifiqué: ${foundNames.join(", ")}. Reenvíame los modelos exactos separados por coma (ej: RC31P3, RC31P30).`
            : "Entendí que quieres agregar más productos a la misma cotización, pero no pude identificar esos modelos. Reenvíamelos exactos separados por coma (ej: RC31P3, RC31P30).";
          handledByQuoteIntake = true;
          billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        }

        if (selectedProducts.length) {
          if (forceBundleQuoteIntake) console.log("[quote-bundle] build quote start", { selected: selectedProducts.length });
          const bundleDiscarded: Array<{ product: string; reason: string }> = [];
          let bundleValidCount = 0;
          const transcript = Array.isArray(existingConv?.transcript) ? existingConv.transcript : [];
          const latestUserLines = transcript
            .filter((m: any) => m?.role === "user" && m?.content)
            .slice(-8)
            .map((m: any) => String(m.content || ""));
          const combinedUserContext = `${latestUserLines.join("\n")}\n${inbound.text}`;

          const qtyFromOriginalInbound = extractQuoteRequestedQuantity(originalInboundText);
          const qtyFromInbound = extractQuoteRequestedQuantity(inbound.text);
          const qtyFromSource = extractQuoteRequestedQuantity(quoteSourceText);
          const defaultQuantity = Math.max(1, qtyFromOriginalInbound || qtyFromInbound || qtyFromSource || 1);
          const perProductQty = extractPerProductQuantities(
            quoteSourceText,
            selectedProducts.map((p: any) => ({ id: String(p.id), name: String(p.name || "") }))
          );
          const uniformHint = hasUniformQuantityHint(quoteSourceText);

          let previousDraftForCustomer: any = null;
          const shouldRecoverCustomerFromDraft =
            continuationIntent || explicitModelProducts.length > 0 || wantsMulti || quoteProceedFromMemory;
          if (shouldRecoverCustomerFromDraft) {
            const { data: recentDrafts } = await supabase
              .from("agent_quote_drafts")
              .select("id,customer_phone,customer_name,customer_email,company_name,location,payload,created_at")
              .eq("created_by", ownerId)
              .eq("agent_id", String(agent.id))
              .order("created_at", { ascending: false })
              .limit(40);
            const inboundPhone = normalizePhone(inbound.from || "");
            const inboundTail = phoneTail10(inbound.from || "");
            const draftList = Array.isArray(recentDrafts) ? recentDrafts : [];
            previousDraftForCustomer =
              draftList.find((d: any) => normalizePhone(String(d?.customer_phone || "")) === inboundPhone) ||
              draftList.find((d: any) => phoneTail10(String(d?.customer_phone || "")) === inboundTail) ||
              null;
          }
          const previousDraftPayload =
            previousDraftForCustomer?.payload && typeof previousDraftForCustomer.payload === "object"
              ? previousDraftForCustomer.payload
              : {};

          if (wantsMulti && Object.keys(perProductQty).length < selectedProducts.length && !uniformHint) {
            const listNames = selectedProducts.map((p: any) => String(p?.name || "")).filter(Boolean);
            reply = `Para cotizar los ${selectedProducts.length} productos, confirmame la cantidad de cada uno. Ejemplo: ${listNames[0] || "Producto 1"}: 2; ${listNames[1] || "Producto 2"}: 1; ${listNames[2] || "Producto 3"}: 3. Si es la misma cantidad para todos, escribe: cantidad ${defaultQuantity || 1} para todos.`;
            handledByQuoteIntake = true;
            billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
          }

          const customerEmail =
            extractEmail(combinedUserContext) ||
            String(nextMemory.customer_email || "") ||
            String(previousDraftForCustomer?.customer_email || "");
          const customerName =
            extractCustomerName(combinedUserContext, inbound.pushName || "") ||
            String(nextMemory.customer_name || "") ||
            String(previousDraftForCustomer?.customer_name || "");
          const inboundPhoneFallback = normalizePhone(String(inbound.from || ""));
          const customerPhone =
            extractCustomerPhone(combinedUserContext, inbound.from) ||
            String(nextMemory.customer_phone || "") ||
            String(previousDraftForCustomer?.customer_phone || "") ||
            inboundPhoneFallback;
          const customerCityRaw =
            extractLabeledValue(combinedUserContext, ["ciudad", "city"]) ||
            String(previousDraftForCustomer?.location || (previousDraftPayload as any)?.customer_city || "");
          const customerCity = normalizeCityLabel(customerCityRaw);
          const customerCompany =
            extractLabeledValue(combinedUserContext, ["empresa", "company", "razon social"]) ||
            String((previousDraftPayload as any)?.customer_company || previousDraftForCustomer?.company_name || "");
          const customerNit =
            extractLabeledValue(combinedUserContext, ["nit"]) ||
            String((previousDraftPayload as any)?.customer_nit || "");
          const customerContact =
            extractLabeledValue(combinedUserContext, ["contacto"]) ||
            String((previousDraftPayload as any)?.customer_contact || previousDraftForCustomer?.customer_name || "");

          const canReusePriorQuoteIdentity =
            continuationIntent &&
            explicitModelProducts.length > 0 &&
            Boolean(previousDraftForCustomer?.id);

          const effectiveCustomerCity = normalizeCityLabel(
            String(customerCity || previousDraftForCustomer?.location || (previousDraftPayload as any)?.customer_city || "Bogota")
          );
          const effectiveCustomerCompany = String(
            customerCompany ||
            (previousDraftPayload as any)?.customer_company ||
            previousDraftForCustomer?.company_name ||
            cfg?.company_name ||
            "Cliente WhatsApp"
          ).trim();
          const effectiveCustomerNit = String(
            customerNit ||
            (previousDraftPayload as any)?.customer_nit ||
            "N/A"
          ).trim();
          const effectiveCustomerContact = String(
            customerContact || customerName || (previousDraftPayload as any)?.customer_contact || previousDraftForCustomer?.customer_name || "Contacto"
          ).trim();
          const effectiveCustomerEmail = String(customerEmail || previousDraftForCustomer?.customer_email || "").trim();
          const effectiveCustomerPhone = String(customerPhone || previousDraftForCustomer?.customer_phone || inboundPhoneFallback).trim();

          const missingFields: string[] = [];
          if (!isPresent(effectiveCustomerCity)) missingFields.push("ciudad");
          if (!isPresent(effectiveCustomerCompany)) missingFields.push("empresa");
          if (!isPresent(effectiveCustomerNit)) missingFields.push("NIT");
          if (!isPresent(effectiveCustomerContact)) missingFields.push("contacto");
          if (!isPresent(effectiveCustomerEmail)) missingFields.push("correo");
          if (!isPresent(effectiveCustomerPhone)) missingFields.push("celular");

          if (canReusePriorQuoteIdentity) {
            missingFields.length = 0;
          }

          nextMemory.customer_name = effectiveCustomerContact || nextMemory.customer_name;
          nextMemory.customer_phone = effectiveCustomerPhone || nextMemory.customer_phone;
          nextMemory.customer_email = effectiveCustomerEmail || nextMemory.customer_email;

          const requireQuoteContactBundle = String(process.env.WHATSAPP_REQUIRE_QUOTE_CONTACT_BUNDLE || "false").toLowerCase() === "true";
          if (!handledByQuoteIntake && missingFields.length && requireQuoteContactBundle) {
            reply = `Para formalizar la cotizacion me faltan: ${missingFields.join(", ")}. Enviamelos en un solo mensaje (ejemplo: Ciudad: Bogota, Empresa: ..., NIT: ..., Contacto: ..., Correo: ..., Celular: ...).`;
            nextMemory.awaiting_action = "quote_contact_bundle";
            handledByQuoteIntake = true;
            billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
          } else if (missingFields.length) {
            missingFields.length = 0;
          }

          if (!missingFields.length && !handledByQuoteIntake && selectedProducts.length === 1) {
            const selected = selectedProducts[0] as any;
            const requestedQty = Math.max(1,
              extractQuoteRequestedQuantity(originalInboundText) ||
              extractQuoteRequestedQuantity(inbound.text) ||
              extractQuoteRequestedQuantity(quoteSourceText)
            );
            const cityPrices = (selected as any)?.source_payload?.prices_cop || {};
            const cityPriceCop = Number(cityPrices?.[effectiveCustomerCity] || 0);
            const basePrice = Number(selected?.base_price_usd || 0);
            if (!(basePrice > 0) && !(cityPriceCop > 0)) {
              reply = `Confirmo ${requestedQty} unidades de ${String(selected?.name || "ese producto")}. Este modelo no tiene precio base USD cargado todavía, por eso no puedo generar el PDF de cotización en este momento. Si me compartes precio base o autorizas cargarlo, te la genero de inmediato.`;
              handledByQuoteIntake = true;
              billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
            }
          }

          if (!missingFields.length && !handledByQuoteIntake) {
            const trm = await getOrFetchTrm(supabase, ownerId, (agent as any)?.tenant_id || null);
            const trmRate = Number(trm?.rate || 0);

            if (trmRate > 0) {
              for (const selected of selectedProducts) {
                nextMemory.last_product_name = String((selected as any)?.name || nextMemory.last_product_name || "");
                nextMemory.last_product_id = String((selected as any)?.id || nextMemory.last_product_id || "");
                nextMemory.last_selected_product_name = String((selected as any)?.name || nextMemory.last_selected_product_name || "");
                nextMemory.last_selected_product_id = String((selected as any)?.id || nextMemory.last_selected_product_id || "");
                nextMemory.last_selection_at = new Date().toISOString();
                let quantity =
                  Number(perProductQty[String((selected as any).id)]) ||
                  (uniformHint ? defaultQuantity : 0) ||
                  defaultQuantity ||
                  1;
                if (selectedProducts.length === 1) {
                  const explicitQty = Math.max(
                    extractQuoteRequestedQuantity(originalInboundText),
                    extractQuoteRequestedQuantity(inbound.text)
                  );
                  if (explicitQty > 1) quantity = explicitQty;
                }
                const cityPrices = (selected as any)?.source_payload?.prices_cop || {};
                const cityPriceCop = Number(cityPrices?.[effectiveCustomerCity] || 0);
                const bogotaPriceCop = Number(cityPrices?.bogota || 0);
                const selectedUnitCop = cityPriceCop > 0 ? cityPriceCop : bogotaPriceCop;
                const basePriceUsdRaw = Number((selected as any)?.base_price_usd || 0);
                const basePriceUsd = basePriceUsdRaw > 0
                  ? basePriceUsdRaw
                  : (selectedUnitCop > 0 && trmRate > 0 ? Number((selectedUnitCop / trmRate).toFixed(6)) : 0);
                if (!(basePriceUsd > 0) && !(selectedUnitCop > 0)) {
                  if (forceBundleQuoteIntake) {
                    bundleDiscarded.push({ product: String((selected as any)?.name || ""), reason: "missing_price_usd_and_city_price" });
                  }
                  continue;
                }
                if (forceBundleQuoteIntake) bundleValidCount += 1;

                const totalCop = selectedUnitCop > 0
                  ? Number((selectedUnitCop * quantity).toFixed(2))
                  : Number((basePriceUsd * trmRate * quantity).toFixed(2));
                const draftPayload = {
                  tenant_id: (agent as any)?.tenant_id || null,
                  created_by: ownerId,
                  agent_id: String(agent.id),
                  customer_name: effectiveCustomerContact || null,
                  customer_email: effectiveCustomerEmail || null,
                  customer_phone: effectiveCustomerPhone || null,
                  company_name: String(effectiveCustomerCompany || cfg?.company_name || cfg?.company_desc || "Avanza Balanzas").slice(0, 120) || "Avanza Balanzas",
                  location: effectiveCustomerCity || null,
                  product_catalog_id: (selected as any).id,
                  product_name: String((selected as any).name || ""),
                  base_price_usd: basePriceUsd,
                  trm_rate: trmRate,
                  total_cop: totalCop,
                  notes: selectedUnitCop > 0
                    ? `Cotizacion automatica por WhatsApp - precio ciudad ${effectiveCustomerCity}`
                    : "Cotizacion automatica por WhatsApp",
                  payload: {
                    quantity,
                    trm_date: trm.rate_date,
                    trm_source: trm.source,
                    price_currency: String((selected as any)?.price_currency || "USD"),
                    customer_city: effectiveCustomerCity || null,
                    customer_nit: effectiveCustomerNit || null,
                    customer_company: effectiveCustomerCompany || null,
                    customer_contact: effectiveCustomerContact || null,
                    unit_price_cop: selectedUnitCop > 0 ? selectedUnitCop : null,
                    automation: "evolution_webhook",
                  },
                  status: "analysis",
                };

                let { data: draft, error: draftError } = await supabase
                  .from("agent_quote_drafts")
                  .insert(draftPayload)
                  .select("id")
                  .single();

                if (draftError && isQuoteDraftStatusConstraintError(draftError)) {
                  const legacyPayload = {
                    ...draftPayload,
                    status: "draft",
                    payload: {
                      ...(draftPayload.payload || {}),
                      crm_stage: "analysis",
                      crm_stage_updated_at: new Date().toISOString(),
                    },
                  } as any;
                  const retry = await supabase
                    .from("agent_quote_drafts")
                    .insert(legacyPayload)
                    .select("id")
                    .single();
                  draft = retry.data as any;
                  draftError = retry.error as any;
                }

                if (draftError && forceBundleQuoteIntake) {
                  bundleDiscarded.push({ product: String((selected as any)?.name || ""), reason: `draft_insert_failed:${String(draftError?.message || "unknown")}` });
                }

                if (!draftError && draft?.id) {
                  nextMemory.last_quote_draft_id = String(draft.id);
                  nextMemory.last_quote_product_name = String((selected as any).name || "");
                  nextMemory.awaiting_action = "none";
                  const productImageDataUrl = await resolveProductImageDataUrl(selected);
                  const quoteDescription = await buildQuoteItemDescriptionAsync(selected, String((selected as any).name || ""));
                  const pdfBase64 = await buildQuotePdf({
                    draftId: String(draft.id),
                    companyName: String(draftPayload.company_name || "Avanza Balanzas"),
                    customerName: effectiveCustomerContact || "",
                    customerEmail: effectiveCustomerEmail || "",
                    customerPhone: effectiveCustomerPhone || "",
                    productName: String((selected as any).name || ""),
                    quantity,
                    basePriceUsd,
                    trmRate,
                    totalCop,
                    city: effectiveCustomerCity,
                    nit: effectiveCustomerNit,
                    itemDescription: quoteDescription,
                    imageDataUrl: productImageDataUrl,
                    notes: String(draftPayload.notes || ""),
                  });

                  autoQuoteDocs.push({
                    draftId: String(draft.id),
                    fileName: `cotizacion-${String(draft.id).slice(0, 8)}.pdf`,
                    pdfBase64,
                    quantity,
                    productName: String((selected as any).name || ""),
                    itemDescription: quoteDescription,
                    imageDataUrl: productImageDataUrl,
                    basePriceUsd,
                    trmRate,
                    totalCop,
                  });
                }
              }

              if (autoQuoteDocs.length === 1) {
                const q1 = autoQuoteDocs[0]?.quantity || 1;
                reply = `Confirmo ${q1} unidades de ${String((selectedProducts[0] as any)?.name || "el producto")}. Ya generé tu cotización con la TRM de hoy y te envío el PDF por este chat ahora mismo.`;
              } else if (autoQuoteDocs.length > 1) {
                const bundlePdfBase64 = await buildBundleQuotePdf({
                  bundleId: `B-${new Date().toISOString().slice(0, 10)}-${String(autoQuoteDocs[0].draftId).slice(0, 6)}`,
                  companyName: String(cfg?.company_name || cfg?.company_desc || "Avanza Balanzas").slice(0, 120) || "Avanza Balanzas",
                  customerName: effectiveCustomerContact || "",
                  customerEmail: effectiveCustomerEmail || "",
                  customerPhone: effectiveCustomerPhone || "",
                  items: autoQuoteDocs.map((d) => ({
                    productName: d.productName,
                    quantity: d.quantity,
                    basePriceUsd: d.basePriceUsd,
                    trmRate: d.trmRate,
                    totalCop: d.totalCop,
                    description: d.itemDescription,
                    imageDataUrl: d.imageDataUrl,
                  })),
                });
                autoQuoteBundle = {
                  fileName: `cotizacion-consolidada-${String(autoQuoteDocs[0].draftId).slice(0, 8)}.pdf`,
                  pdfBase64: bundlePdfBase64,
                  draftIds: autoQuoteDocs.map((d) => d.draftId),
                };

                const byQty = autoQuoteDocs.every((d) => d.quantity === autoQuoteDocs[0].quantity);
                reply = byQty
                  ? `Listo. Ya genere la cotizacion consolidada de ${autoQuoteDocs.length} productos (cantidad ${autoQuoteDocs[0].quantity} cada una) con la TRM de hoy. Te envio un solo PDF por este chat ahora mismo.`
                  : `Listo. Ya genere la cotizacion consolidada de ${autoQuoteDocs.length} productos con las cantidades que me indicaste y la TRM de hoy. Te envio un solo PDF por este chat ahora mismo.`;
              }
              if (forceBundleQuoteIntake) {
                console.log("[quote-bundle] build quote done", {
                  received_products: selectedProducts.length,
                  valid_products: bundleValidCount,
                  discarded_products: bundleDiscarded.length,
                  discarded_reasons: bundleDiscarded,
                  docs: autoQuoteDocs.length,
                  bundle: Boolean(autoQuoteBundle),
                });
              }
              if (forceBundleQuoteIntake && selectedProducts.length >= 2 && autoQuoteDocs.length === 0 && !autoQuoteBundle && !String(reply || "").trim()) {
                const hasDraftInsertFailure = bundleDiscarded.some((d) => String(d?.reason || "").startsWith("draft_insert_failed:"));
                reply = hasDraftInsertFailure
                  ? "No pude generar la cotización múltiple por un error interno al guardar la cotización. Intenta nuevamente en unos segundos."
                  : "No pude generar la cotización múltiple con esas referencias porque faltan datos de catálogo/precio para una o más referencias.";
                handledByQuoteIntake = true;
                billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
              }
              if (reply) billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
            } else {
              reply = "No pude consultar la TRM de hoy en este momento. Intenta de nuevo en 1 minuto y te genero el PDF por este WhatsApp.";
              handledByQuoteIntake = true;
              billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
            }
          }
        } else if (resumeQuoteFromContext || shouldAutoQuote(inbound.text)) {
          const pricedNames = pricedProducts.slice(0, 8).map((p: any) => String(p?.name || "").trim()).filter(Boolean);
          reply = pricedNames.length
            ? `Para generar la cotizacion, elige un producto exacto de este listado: ${pricedNames.join("; ")}.`
            : "No encontre productos con precio cargado para cotizar en este momento.";
          handledByQuoteIntake = true;
          billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        }
      } catch (autoErr: any) {
        if (forceBundleQuoteIntake) console.warn("[quote-bundle] error", autoErr?.message || autoErr);
        console.warn("[evolution-webhook] auto_quote_failed", autoErr?.message || autoErr);
      }
    }

    if (bundleOverrideApplied && !handledByQuoteIntake && !autoQuoteDocs.length && !String(reply || "").trim()) {
      reply = "Perfecto. Estoy procesando la cotización múltiple con las referencias seleccionadas. Te la envío enseguida por este WhatsApp.";
      nextMemory.awaiting_action = "quote_bundle_request";
      nextMemory.last_intent = "quote_bundle_request";
      handledByQuoteIntake = true;
      billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
    }

    if (!autoQuoteDocs.length && !handledByGreeting && !handledByRecall && !handledByTechSheet && !handledByInventory && !handledByHistory && !handledByPricing && !handledByRecommendation && !handledByQuoteStarter && !handledByQuoteIntake) {
      const selectedProductForGuide = String(nextMemory.last_selected_product_name || previousMemory?.last_selected_product_name || "").trim();
      const selectedAtMs = Date.parse(String(nextMemory.last_selection_at || previousMemory?.last_selection_at || ""));
      const selectedStillActive = Boolean(selectedProductForGuide) && Number.isFinite(selectedAtMs) && (Date.now() - selectedAtMs) <= 30 * 60 * 1000;
      const inboundBulkQuoteCommand = /\bcotiz(?:ar|a|acion|ación)?\s*(\d{1,2}|dos|tres|cuatro|cinco|seis|siete|ocho)\b/.test(normalizeText(originalInboundText));
      const skipSingleProductFallback =
        String(nextMemory.last_intent || previousMemory?.last_intent || "") === "quote_bundle_request" ||
        isContinueQuoteWithoutPersonalDataIntent(originalInboundText);
      if (selectedStillActive && !inboundTechnicalSpec && !inboundBulkQuoteCommand && !skipSingleProductFallback) {
          reply = `¿Quieres ficha técnica o cotización de ${selectedProductForGuide}?`;
          nextMemory.awaiting_action = "product_action";
        billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
      } else {
      const catalogRows = await fetchCatalogRows("name,brand,category,source_payload,product_url", 120, false);
      const allCatalogRows = Array.isArray(catalogRows) ? catalogRows : [];
      const commercialRows = allCatalogRows.filter((r: any) => isCommercialCatalogRow(r));
      const rememberedCategoryIntent = String(previousMemory?.last_category_intent || "").trim();
      const deterministicOnly =
        STRICT_WHATSAPP_MODE ||
        isTechnicalSpecQuery(inbound.text) ||
        isFeatureQuestionIntent(inbound.text) ||
        isStrictCatalogIntent(inbound.text) ||
        (isCategoryFollowUpIntent(inbound.text) && Boolean(rememberedCategoryIntent)) ||
        isConsistencyChallengeIntent(inbound.text);

      if (deterministicOnly) {
        const technicalSpecQuery = parseTechnicalSpecQuery(inbound.text);
        const requestedCategory = normalizeText(String(technicalSpecQuery ? "balanzas" : (detectCatalogCategoryIntent(inbound.text) || rememberedCategoryIntent || "")));
        const categoryScopedCommercial = requestedCategory ? scopeCatalogRows(commercialRows as any, requestedCategory) : commercialRows;
        const categoryScopedAll = requestedCategory ? scopeCatalogRows(allCatalogRows as any, requestedCategory) : allCatalogRows;
        const baseSource = categoryScopedCommercial.length
          ? categoryScopedCommercial
          : (categoryScopedAll.length ? categoryScopedAll : commercialRows);
        const featureTerms = extractFeatureTerms(inbound.text);
        const asksNumericSpec = /\b\d+(?:[\.,]\d+)?\s*(?:mg|g|kg)?\b\s*[x×]\s*\d+(?:[\.,]\d+)?/.test(normalizeCatalogQueryText(inbound.text || ""));
        const asksFeatureLike = isFeatureQuestionIntent(inbound.text) || asksNumericSpec;
        if (technicalSpecQuery) nextMemory.last_technical_spec_query = originalInboundText;

        if (asksFeatureLike && baseSource.length) {
          const numericRanked = technicalSpecQuery
            ? rankCatalogByTechnicalSpec(baseSource as any[], technicalSpecQuery)
            : [];
          const ranked = numericRanked.length
            ? numericRanked.slice(0, 8)
            : rankCatalogByFeature(baseSource as any[], featureTerms.length ? featureTerms : extractCatalogTerms(inbound.text)).slice(0, 6);
          if (ranked.length) {
            const strictNumeric = technicalSpecQuery
              ? (ranked as any[]).filter((x: any) => x.capacityDeltaPct <= 40 && x.readabilityRatio <= 1)
              : [];
            const calibrationPref = detectCalibrationPreference(inbound.text);
            const sourceRowsUnfiltered = technicalSpecQuery
              ? strictNumeric.map((x: any) => x.row)
              : (ranked as any[]).map((x: any) => x.row);
            const sourceRows = calibrationPref
              ? sourceRowsUnfiltered.filter((row: any) => rowMatchesCalibrationPreference(row, calibrationPref))
              : sourceRowsUnfiltered;
            const options = buildNumberedProductOptions(sourceRows, technicalSpecQuery ? 10 : 4);
            if (options.length) {
              const shown = technicalSpecQuery ? options.slice(0, 10) : options;
              const more = Math.max(0, options.length - shown.length);
              reply = [
                technicalSpecQuery
                  ? "Con base en esa referencia técnica, estas son opciones relacionadas del catálogo:"
                  : "Con base en esa referencia técnica, estas son opciones relacionadas del catálogo:",
                ...shown.map((o) => `${o.code}) ${o.name}`),
                ...(more > 0 ? [`- y ${more} más`] : []),
                "",
                "Responde con letra o número (ej.: A o 1) y te envío ficha técnica o cotización.",
              ].join("\n");
              nextMemory.pending_product_options = options;
              nextMemory.awaiting_action = "product_option_selection";
              if (requestedCategory) nextMemory.last_category_intent = requestedCategory;
              billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
            } else if (technicalSpecQuery) {
              const closestOptions = buildNumberedProductOptions((ranked as any[]).map((x: any) => x.row), 6);
              if (closestOptions.length) {
                reply = [
                  "No encontré una coincidencia exacta con esa combinación, pero estas son las referencias más cercanas del catálogo:",
                  ...closestOptions.map((o) => `${o.code}) ${o.name}`),
                  "",
                  "Responde con letra o número (ej.: A o 1) y te envío ficha técnica o cotización.",
                ].join("\n");
                nextMemory.pending_product_options = closestOptions;
                nextMemory.awaiting_action = "product_option_selection";
                if (requestedCategory) nextMemory.last_category_intent = requestedCategory;
                billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
              }
            }
          } else if (technicalSpecQuery) {
            const allByCapacity = rankCatalogByTechnicalSpec(baseSource as any[], {
              capacityG: technicalSpecQuery.capacityG,
              readabilityG: Math.max(technicalSpecQuery.readabilityG, 0.000000001),
            })
              .filter((x: any) => x.readabilityRatio <= 1)
              .slice(0, 10);
            const fallbackOptions = buildNumberedProductOptions(allByCapacity.map((x: any) => x.row), 10);
            if (fallbackOptions.length) {
              reply = [
                "No encontré coincidencia exacta para esa referencia. Estas son las más cercanas disponibles:",
                ...fallbackOptions.slice(0, 10).map((o) => `${o.code}) ${o.name}`),
                "",
                "Responde con letra o número (ej.: A o 1) y te envío ficha técnica o cotización.",
              ].join("\n");
              nextMemory.pending_product_options = fallbackOptions;
              nextMemory.awaiting_action = "product_option_selection";
              if (requestedCategory) nextMemory.last_category_intent = requestedCategory;
              billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
            } else {
              const capacityOnlyRanked = rankCatalogByTechnicalSpec(baseSource as any[], {
                capacityG: technicalSpecQuery.capacityG,
                readabilityG: Math.max(technicalSpecQuery.readabilityG, 0.000000001),
              })
                .filter((x: any) => x.capacityDeltaPct <= 60)
                .slice(0, 10);
              const capacityOnlyOptions = buildNumberedProductOptions(capacityOnlyRanked.map((x: any) => x.row), 10);
              if (capacityOnlyOptions.length) {
                reply = [
                  "No tengo una referencia que cumpla esa resolución exacta en el catálogo actual.",
                  "Te comparto opciones cercanas por capacidad:",
                  ...capacityOnlyOptions.slice(0, 10).map((o) => `${o.code}) ${o.name}`),
                  "",
                  "Responde con letra o número (ej.: A o 1) y te envío ficha técnica o cotización.",
                ].join("\n");
                nextMemory.pending_product_options = capacityOnlyOptions;
                nextMemory.awaiting_action = "product_option_selection";
              } else {
                const requiresFineReadability = Number(technicalSpecQuery?.readabilityG || 0) > 0 && Number(technicalSpecQuery?.readabilityG || 0) <= 0.001;
                const nearbyGeneralSource = (baseSource as any[])
                  .map((r: any) => {
                    const hay = normalizeText(`${String(r?.name || "")} ${String(r?.specs_text || "")}`);
                    const score = (
                      (/analitic|semi micro|semi-micro|explorer|adventurer|pioneer|precision|exr|exp/.test(hay) ? 4 : 0) +
                      (/lectura minima|resolucion/.test(hay) ? 2 : 0) +
                      (/scout|compass|joyeria|portatil/.test(hay) ? -3 : 0)
                    );
                    return { row: r, hay, score };
                  })
                  .filter((x: any) => {
                    if (!requiresFineReadability) return /analitic|precision|explorer|adventurer|pioneer|scout/.test(x.hay);
                    return /analitic|semi micro|semi-micro|explorer|adventurer|pioneer|precision|exr|exp/.test(x.hay) && !/scout|compass|joyeria|portatil/.test(x.hay);
                  })
                  .sort((a: any, b: any) => b.score - a.score)
                  .map((x: any) => x.row)
                  .slice(0, 8);
                const nearbyGeneral = buildNumberedProductOptions(nearbyGeneralSource, 6);
                if (nearbyGeneral.length) {
                  reply = [
                    "No encontré coincidencia exacta para esa capacidad/resolución. Te comparto opciones analíticas o de precisión disponibles:",
                    ...nearbyGeneral.map((o) => `${o.code}) ${o.name}`),
                    "",
                    "Responde con letra o número (ej.: A o 1) y te envío ficha técnica o cotización.",
                  ].join("\n");
                  nextMemory.pending_product_options = nearbyGeneral;
                  nextMemory.awaiting_action = "product_option_selection";
                } else {
                  reply = "No encontré referencias cercanas para esa capacidad/resolución en el catálogo actual. Si quieres, te ayudo a filtrar por otra capacidad o resolución.";
                  nextMemory.awaiting_action = "technical_refine_prompt";
                }
              }
              if (requestedCategory) nextMemory.last_category_intent = requestedCategory;
              billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
            }
          }
        }

        if (!String(reply || "").trim() && !bundleOverrideApplied) {
        const continueWithoutDataInBundle =
          isContinueQuoteWithoutPersonalDataIntent(originalInboundText) &&
          (
            String(nextMemory.last_intent || previousMemory?.last_intent || "") === "quote_bundle_request" ||
            String(nextMemory.awaiting_action || previousMemory?.awaiting_action || "") === "strict_quote_data"
          );
        if (continueWithoutDataInBundle) {
          reply = "Perfecto. Para avanzar sin datos, confirma los modelos a cotizar en una sola línea (ej.: cotizar A,B,C,D,E,F,G,H o cotizar 8 cantidad 1 para todos).";
          nextMemory.awaiting_action = "strict_choose_model";
          billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        }
        if (!String(reply || "").trim()) {
        const narrowed = filterCatalogByTerms(inbound.text, baseSource as any, requestedCategory);
        const sampleSource = narrowed.length ? narrowed : baseSource;
        const directModelMatch = hasConcreteProductHint(inbound.text)
          ? pickBestCatalogProduct(inbound.text, sampleSource as any)
          : null;
        if (directModelMatch?.id) {
          const directName = String((directModelMatch as any)?.name || "").trim();
          nextMemory.last_product_name = directName;
          nextMemory.last_product_id = String((directModelMatch as any)?.id || "").trim();
          nextMemory.last_product_category = String((directModelMatch as any)?.category || "").trim();
          nextMemory.last_selected_product_name = directName;
          nextMemory.last_selected_product_id = String((directModelMatch as any)?.id || "").trim();
          nextMemory.last_selection_at = new Date().toISOString();
          nextMemory.awaiting_action = "product_action";
          nextMemory.pending_product_options = [];
          reply = [
            `Perfecto, encontré el modelo ${directName}.`,
            "Ahora dime qué deseas con ese modelo:",
            "1) Cotización con TRM y PDF",
            "2) Ficha técnica",
          ].join("\n");
          billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        }
        if (!String(reply || "").trim()) {
        const sample = uniqueNormalizedStrings(
          sampleSource.map((r: any) => humanCatalogName(String(r?.name || "").trim())).filter(Boolean),
          2
        )
          .map((n) => (n.length > 56 ? `${n.slice(0, 53)}...` : n))
          ;
        const categoryHint = requestedCategory ? ` Categoría: ${requestedCategory.replace(/_/g, " ")}.` : "";
        reply = sample.length
          ? `Para evitar errores, solo respondo con datos confirmados del catálogo.${categoryHint} Escríbeme el modelo exacto (ej.: ${sample.join(" / ")}).`
          : `Para evitar errores, solo respondo con datos confirmados del catálogo.${categoryHint} No encontré coincidencia exacta. Escríbeme el modelo completo.`;
        if (requestedCategory) nextMemory.last_category_intent = requestedCategory;
        nextMemory.awaiting_action = "tech_product_selection";
        billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        }
        }
        }
        if (!String(reply || "").trim() && bundleOverrideApplied) {
          reply = "Perfecto. Estoy procesando la cotización múltiple con las referencias seleccionadas. Te la envío enseguida por este WhatsApp.";
          nextMemory.awaiting_action = "quote_bundle_request";
          nextMemory.last_intent = "quote_bundle_request";
          handledByQuoteIntake = true;
          billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
        }
      } else {

      const catalogNames = Array.isArray(commercialRows)
        ? commercialRows
            .map((r: any) => `${String(r?.name || "").trim()}${r?.brand ? ` (marca ${String(r.brand).trim()})` : ""}`.trim())
            .filter(Boolean)
        : [];

      const systemPrompt = [
        `Eres ${String(cfg?.identity_name || agent.name || "asistente")}.`,
        String(cfg?.purpose || agent.description || "Asistente virtual"),
        String(cfg?.company_desc || ""),
        String(cfg?.system_prompt || cfg?.important_instructions || ""),
        "Responde en espanol claro y profesional, con mensajes cortos de WhatsApp.",
        "Regla de brevedad estricta: 2-4 lineas, maximo 1 pregunta por mensaje, sin formularios largos ni listas extensas salvo que el cliente pida un listado.",
        "Regla estricta de canal: toda entrega de informacion, fichas tecnicas, imagenes y cotizaciones debe ser por este mismo WhatsApp; no ofrecer envio por correo salvo que el cliente lo pida explicitamente.",
        "Regla estricta: solo puedes mencionar, recomendar o cotizar productos presentes en el catalogo cargado abajo. Si el usuario pide algo fuera de catalogo, dilo explicitamente y pide elegir un producto existente.",
        "Nunca afirmes vender carros/vehiculos; solo equipos de pesaje/laboratorio del catalogo.",
        `Catalogo oficial web de referencia: ${CATALOG_REFERENCE_URL} (acceso alterno: ${CATALOG_REFERENCE_SHARE_URL}).`,
        "Si el cliente pide catalogo completo, comparte el enlace del catalogo oficial web antes de listar opciones.",
        "No mencionar ni recomendar marcas fuera de OHAUS dentro de esta instancia.",
        catalogNames.length ? `Catalogo activo (nombres exactos): ${catalogNames.join(" | ")}` : "Catalogo activo: no disponible.",
        "Si no tienes la informacion, dilo sin inventar.",
        docs,
      ]
        .filter(Boolean)
        .join("\n\n");

      const openai = new OpenAI({ apiKey });

      const allMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
        { role: "system", content: systemPrompt },
        ...historyMessages,
        { role: "user", content: inbound.text },
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.2,
        max_tokens: 160,
        messages: allMessages as any,
      });

      reply = String(completion.choices?.[0]?.message?.content || "").trim() || "No tengo una respuesta en este momento.";

      const lcReply = normalizeText(reply);
      if (
        lcReply.includes("no puedo enviar archivos") ||
        lcReply.includes("no puedo enviar cotizaciones completas por este medio") ||
        lcReply.includes("solo puedo enviarla a tu correo") ||
        lcReply.includes("no puedo enviar la cotizacion formal directamente por aqui") ||
        lcReply.includes("modo demo") ||
        lcReply.includes("no puedo enviar el pdf real")
      ) {
        reply = "Si puedo enviarte la cotizacion por este WhatsApp en PDF. Si me confirmas producto(s), cantidad y datos de contacto, la genero y te la envio por aqui.";
      }

      usageTotal = Math.max(0, Number(completion.usage?.total_tokens || 0));
      usageCompletion = Math.max(0, Number(completion.usage?.completion_tokens || 0));
      billedTokens = Math.max(1, Math.min(500, usageCompletion || estimateTokens(reply)));
      }
      }
    }

    if (
      !knownCustomerName &&
      !handledByGreeting &&
      String(reply || "").trim() &&
      !/con quien tengo el gusto/i.test(normalizeText(reply)) &&
      (handledByQuoteIntake || handledByTechSheet || handledByPricing || handledByProductLookup)
    ) {
      reply = `${String(reply || "").trim()}\n\nSi quieres, compárteme tu nombre para dejarlo guardado.`;
      nextMemory.awaiting_action = "capture_name";
    }

    let resolvedRoute =
      autoQuoteDocs.length || autoQuoteBundle || resendPdf
        ? "quote_delivery"
        : technicalDocs.length || sentTechSheet || sentImage
          ? "technical_delivery"
          : handledByRecall
            ? "quote_recall"
            : handledByQuoteIntake
              ? "quote_intake"
              : handledByQuoteStarter
                ? "quote_starter"
                : handledByInventory
                  ? "inventory_category"
                  : handledByTechSheet
                    ? "technical_lookup"
                    : handledByPricing
                      ? "pricing_lookup"
                      : handledByProductLookup
                        ? "product_lookup"
                        : handledByRecommendation
                          ? "recommendation"
                          : handledByHistory
                            ? "history"
                            : handledByGreeting
                              ? (isConversationCloseIntent(originalInboundText) ? "conversation_close" : "greeting")
                              : "fallback";
    let effectiveAwaitingAction = String(nextMemory.awaiting_action || "");
    if (bundleOverrideApplied) {
      effectiveAwaitingAction = "quote_bundle_request";
      resolvedRoute = "quote_bundle";
      nextMemory.awaiting_action = "quote_bundle_request";
      nextMemory.last_intent = "quote_bundle_request";
    }
    nextMemory.last_route = resolvedRoute;
    nextMemory.last_route_at = new Date().toISOString();
    if (bundleOverrideApplied) {
      console.log("[evolution-webhook] post_bundle_override_route", {
        effectiveAwaitingAction,
        resolvedRoute,
      });
    }
    console.log("[evolution-webhook] route_decision", {
      route: resolvedRoute,
      awaitingAction: effectiveAwaitingAction,
      bundle_override_applied: bundleOverrideApplied,
      ignoredAwaitingAction: ignoredAwaitingActionForBundle,
      inboundCategoryIntent: inboundCategoryIntent || null,
      inboundInventoryIntent,
      inboundTechnicalSpec,
    });

    const deliveredSalesAsset = Boolean(autoQuoteDocs.length || autoQuoteBundle || resendPdf || technicalDocs.length || sentQuotePdf || sentTechSheet || sentImage);
    if (!handledByGreeting && deliveredSalesAsset) {
      nextMemory.conversation_status = "open";
    }

    if (!String(reply || "").trim()) {
      const pendingFamiliesNow = Array.isArray(nextMemory?.pending_family_options) && nextMemory.pending_family_options.length > 0;
      const pendingModelsNow = Array.isArray(nextMemory?.pending_product_options) && nextMemory.pending_product_options.length > 0;
      reply = buildGuidedRecoveryMessage({
        awaiting: String(nextMemory.awaiting_action || previousMemory?.awaiting_action || ""),
        rememberedProduct: String(nextMemory.last_selected_product_name || previousMemory?.last_selected_product_name || ""),
        hasPendingFamilies: pendingFamiliesNow || (Array.isArray(previousMemory?.pending_family_options) && previousMemory.pending_family_options.length > 0),
        hasPendingModels: pendingModelsNow || (Array.isArray(previousMemory?.pending_product_options) && previousMemory.pending_product_options.length > 0),
        inboundText: inbound.text,
      });
      billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
    }

    const quoteDeliveryPlanned = Boolean(autoQuoteDocs.length || autoQuoteBundle || resendPdf);
    const techDeliveryPlanned = Boolean(technicalDocs.length);
    if (quoteDeliveryPlanned && String(reply || "").trim()) {
      reply = appendAdvisorAppointmentPrompt(reply);
      reply = appendQuoteClosurePrompt(reply);
      nextMemory.awaiting_action = "conversation_followup";
      if (String(nextMemory.conversation_status || "") !== "closed") nextMemory.conversation_status = "open";
      nextMemory.quote_feedback_due_at = isoAfterHours(24);
    } else if (techDeliveryPlanned && String(reply || "").trim()) {
      reply = appendQuoteClosurePrompt(reply);
      nextMemory.awaiting_action = "conversation_followup";
      if (String(nextMemory.conversation_status || "") !== "closed") nextMemory.conversation_status = "open";
    }

    reply = enforceWhatsAppDelivery(reply, inbound.text);
    reply = withAvaSignature(reply);

    const outboundInstance = String((channel as any)?.config?.evolution_instance_name || inbound.instance || "");
    console.log("[evolution-webhook] outbound instance debug", {
      configInstance: (channel as any)?.config?.evolution_instance_name,
      inboundInstance: inbound.instance,
      outboundInstance,
    });
    if (!outboundInstance) {
      console.warn("[evolution-webhook] ignored: instance_missing", { inboundInstance: inbound.instance || null });
      return NextResponse.json({ ok: true, ignored: true, reason: "instance_missing" });
    }

    // Fallback: si no hay numero propio en config, intentar leerlo desde metadata de la instancia Evolution.
    if (!agentPhone) {
      try {
        const instances = await evolutionService.fetchInstances();
        const meta = (instances || []).find(
          (i: any) => String(i?.name || "").toLowerCase() === outboundInstance.toLowerCase()
        );
        const metaPhoneRaw = String(
          meta?.owner || meta?.number || meta?.wid || meta?.me || meta?.phone || ""
        );
        const metaPhone = normalizePhone(metaPhoneRaw);
        if (metaPhone.length >= 10 && metaPhone.length <= 15) agentPhone = metaPhone;
      } catch {
        // ignore metadata lookup errors
      }
    }

    // Guardrail anti-loop: si inbound coincide con numero propio, ignorar.
    if (agentPhone && inbound.from === agentPhone) {
      console.warn("[evolution-webhook] ignored: self_inbound", {
        inboundFrom: inbound.from,
        selfPhone: agentPhone,
        instance: outboundInstance,
      });
      return NextResponse.json({ ok: true, ignored: true, reason: "self_inbound" });
    }

    const selfHints = [
      agentPhone,
      normalizePhone(String(payload?.destination || "")),
      normalizePhone(String(payload?.data?.destination || "")),
      normalizePhone(String(payload?.sender || "")),
      normalizePhone(String(payload?.data?.sender || "")),
    ]
      .filter((n) => n.length >= 10 && n.length <= 15)
      .filter((n, i, arr) => arr.indexOf(n) === i);

    const selfPhone = selfHints[0] || "";
    const selfSet = new Set(selfHints);

    const toCandidates = [inbound.from, ...(inbound.alternates || [])]
      .map((n) => normalizePhone(String(n || "")))
      .filter((n, i, arr) => n && arr.indexOf(n) === i)
      .filter((n) => !(Boolean(inbound.fromIsLid) && n === inbound.from))
      .filter((n) => !selfSet.has(n))
      .filter((n) => n.length >= 10 && n.length <= 15)
      .sort((a, b) => {
        const aLikelyReal = a.length <= 13 ? 0 : 1;
        const bLikelyReal = b.length <= 13 ? 0 : 1;
        if (aLikelyReal !== bLikelyReal) return aLikelyReal - bLikelyReal;
        return a.length - b.length;
      });

    const jidCandidates = (inbound.jidCandidates || [])
      .map((v) => String(v || "").trim())
      .filter((v, i, arr) => v && arr.indexOf(v) === i)
      .filter((v) => /@(lid|s\.whatsapp\.net|c\.us)$/i.test(v))
      .filter((v) => !selfSet.has(normalizePhone(v)));

    console.log("[evolution-webhook] routing debug", {
      inboundFrom: inbound.from,
      alternates: inbound.alternates || [],
      inboundFromIsLid: Boolean(inbound.fromIsLid),
      selfPhone,
      selfHints,
      toCandidates,
      jidCandidates,
      payloadEvent: payload?.event || payload?.type || payload?.eventName || null,
    });

    let sentTo = "";
    for (const to of toCandidates) {
      console.info("[evolution-webhook] sending reply", {
        outboundInstance,
        to,
        messageChars: reply.length,
        agentId: agent.id,
      });
      try {
        await evolutionService.sendMessage(outboundInstance, to, reply);
        sentTo = to;
        break;
      } catch (err: any) {
        const msg = String(err?.message || "");
        if (msg.includes('"exists":false') || msg.includes("Bad Request")) {
          console.warn("[evolution-webhook] send candidate rejected", { to, reason: "exists_false" });
          continue;
        }
        throw err;
      }
    }

    if (!sentTo) {
      for (const jid of jidCandidates) {
        console.info("[evolution-webhook] sending reply via jid", {
          outboundInstance,
          jid,
          messageChars: reply.length,
          agentId: agent.id,
        });
        try {
          await evolutionService.sendMessageToJid(outboundInstance, jid, reply);
          sentTo = jid;
          break;
        } catch (err: any) {
          const msg = String(err?.message || "");
          if (msg.includes('"exists":false') || msg.includes("Bad Request")) {
            console.warn("[evolution-webhook] send jid candidate rejected", { jid, reason: "exists_false" });
            continue;
          }
          throw err;
        }
      }
    }

    if (!sentTo) {
      console.warn("[evolution-webhook] ignored: invalid_destination", {
        to: inbound.from,
        fromIsLid: Boolean(inbound.fromIsLid),
        alternates: inbound.alternates || [],
        jidCandidates,
      });
      return NextResponse.json({ ok: true, ignored: true, reason: "invalid_destination" });
    }
    console.info("[evolution-webhook] reply sent", { channelId: (channel as any)?.id, agentId: agent.id, to: sentTo });

    if (autoQuoteDocs.length || resendPdf || autoQuoteBundle) {
      try {
        if (autoQuoteBundle) {
          console.log("[quote-bundle] send final start", { drafts: autoQuoteBundle.draftIds?.length || 0, fileName: autoQuoteBundle.fileName });
        }
        if (autoQuoteBundle) {
          await evolutionService.sendDocument(outboundInstance, sentTo, {
            base64: autoQuoteBundle.pdfBase64,
            fileName: autoQuoteBundle.fileName,
            caption: `Cotizacion consolidada ${autoQuoteBundle.fileName}`,
            mimetype: "application/pdf",
          });

          for (const id of autoQuoteBundle.draftIds) {
            await supabase
              .from("agent_quote_drafts")
              .update({ status: "quote" })
              .eq("id", id)
              .eq("created_by", ownerId);
          }
          sentQuotePdf = true;
          console.log("[quote-bundle] send final done", { mode: "bundle", to: sentTo });
        } else if (autoQuoteDocs.length) {
          for (const doc of autoQuoteDocs) {
            await evolutionService.sendDocument(outboundInstance, sentTo, {
              base64: doc.pdfBase64,
              fileName: doc.fileName,
              caption: `Cotizacion preliminar ${doc.fileName}`,
              mimetype: "application/pdf",
            });

            await supabase
              .from("agent_quote_drafts")
              .update({ status: "quote" })
              .eq("id", doc.draftId)
              .eq("created_by", ownerId);
          }
          sentQuotePdf = true;
        } else {
          await evolutionService.sendDocument(outboundInstance, sentTo, {
            base64: resendPdf!.pdfBase64,
            fileName: resendPdf!.fileName,
            caption: `Cotizacion preliminar ${resendPdf!.fileName}`,
            mimetype: "application/pdf",
          });
          sentQuotePdf = true;
        }
      } catch (pdfErr: any) {
        console.warn("[evolution-webhook] auto_quote_pdf_send_failed", pdfErr?.message || pdfErr);
        try {
          await evolutionService.sendMessage(
            outboundInstance,
            sentTo,
            "Tu cotización ya quedó generada, pero falló el envío del PDF en este intento. Si escribes 'reenviar PDF' te lo intento nuevamente ahora mismo."
          );
        } catch {}
      }
    }

    if (technicalDocs.length) {
      try {
        for (const doc of technicalDocs) {
          if (doc.kind === "image") {
            await evolutionService.sendImage(outboundInstance, sentTo, {
              base64: doc.base64,
              fileName: doc.fileName,
              caption: doc.caption || "Imagen del producto",
              mimetype: doc.mimetype || "image/jpeg",
            });
            sentImage = true;
          } else {
            const primaryName = safeFileName(String(doc.fileName || "ficha-tecnica.pdf"), "ficha-tecnica", "pdf");
            const retryName = safeFileName(`ficha-${Date.now()}.pdf`, "ficha-tecnica", "pdf");
            try {
              await evolutionService.sendDocument(outboundInstance, sentTo, {
                base64: doc.base64,
                fileName: primaryName,
                caption: doc.caption || "Ficha técnica",
                mimetype: doc.mimetype || "application/pdf",
              });
            } catch {
              await evolutionService.sendDocument(outboundInstance, sentTo, {
                base64: doc.base64,
                fileName: retryName,
                caption: "Ficha técnica",
                mimetype: doc.mimetype || "application/pdf",
              });
            }
            sentTechSheet = true;
          }
        }
      } catch (techDocErr: any) {
        console.warn("[evolution-webhook] technical_doc_send_failed", techDocErr?.message || techDocErr);
        try {
          const links = uniqueNormalizedStrings(technicalFallbackLinks, 2);
          const extra = links.length
            ? ` Puedes abrirlo desde aquí mientras tanto: ${links.join(" | ")}`
            : "";
          await evolutionService.sendMessage(
            outboundInstance,
            sentTo,
            `Intenté enviarte la ficha técnica, pero falló en este intento. Si escribes 'reenviar ficha', lo reintento ahora mismo.${extra}`
          );
        } catch {}
      }
    }

    if (sentQuotePdf) nextMemory.last_quote_pdf_sent_at = new Date().toISOString();
    if (sentTechSheet) nextMemory.last_datasheet_sent_at = new Date().toISOString();
    if (sentImage) nextMemory.last_image_sent_at = new Date().toISOString();
    const deliveredAssetNow = Boolean(sentQuotePdf || sentTechSheet || sentImage || autoQuoteDocs.length || autoQuoteBundle);
    if (deliveredAssetNow) {
      nextMemory.pending_product_options = [];
      if (String(nextMemory.awaiting_action || "") === "product_option_selection") nextMemory.awaiting_action = "none";
    }

    if (autoQuoteDocs.length || autoQuoteBundle) {
      nextMemory.last_intent = "quote_generated";
      if (String(nextMemory.conversation_status || "") !== "closed") {
        nextMemory.awaiting_action = "conversation_followup";
        nextMemory.quote_feedback_due_at = isoAfterHours(24);
      }
    }
    else if (handledByRecall) nextMemory.last_intent = "quote_recall";
    else if (String(nextMemory.awaiting_action || "") === "followup_quote_disambiguation") nextMemory.last_intent = "followup_quote_disambiguation";
    else if (handledByTechSheet && isProductImageIntent(inbound.text)) nextMemory.last_intent = "image_request";
    else if (handledByTechSheet) nextMemory.last_intent = "tech_sheet_request";
    else if (handledByPricing) nextMemory.last_intent = "price_request";
    else if (handledByRecommendation) nextMemory.last_intent = "recommendation_request";
    else if (handledByHistory) nextMemory.last_intent = "history_request";
    else if (handledByGreeting) nextMemory.last_intent = "greeting";
    else nextMemory.last_intent = classifiedIntent.intent;

    nextMemory.intent_snapshot = {
      intent: classifiedIntent.intent,
      category: classifiedIntent.category,
      product: classifiedIntent.product,
      request_datasheet: classifiedIntent.request_datasheet,
      request_quote: classifiedIntent.request_quote,
      request_trm: classifiedIntent.request_trm,
      needs_clarification: classifiedIntent.needs_clarification,
      at: new Date().toISOString(),
    };

    const burn = await consumeEntitlementCredits(supabase as any, ownerId, billedTokens);
    if (!burn.ok) {
      console.warn("[evolution-webhook] credits consume skipped_after_send", {
        code: burn.code,
        ownerId,
        billedTokens,
        usageTotal,
        usageCompletion,
      });
    }

    try {
      if (knownCustomerName) {
        await persistKnownNameInCrm(supabase as any, {
          ownerId,
          tenantId: (agent as any)?.tenant_id || null,
          phone: inbound.from,
          name: knownCustomerName,
        });
      }

      const finalClosed = String(nextMemory.conversation_status || "") === "closed";
      const finalQuoteContext =
        Boolean(nextMemory.last_quote_draft_id || nextMemory.last_quote_pdf_sent_at || previousMemory?.last_quote_draft_id || previousMemory?.last_quote_pdf_sent_at) ||
        /(quote_generated|quote_recall|price_request)/.test(String(nextMemory.last_intent || previousMemory?.last_intent || ""));
      const finalNextAction = finalClosed
        ? (finalQuoteContext ? "Recordatorio feedback cotizacion" : "Seguimiento WhatsApp")
        : (finalQuoteContext ? "Seguimiento cotizacion" : "");
      const finalNextActionAt = finalClosed
        ? (finalQuoteContext ? isoAfterHours(24) : isoAfterHours(48))
        : (finalQuoteContext ? isoAfterHours(24) : "");
      const finalMeetingAt = String(nextMemory.advisor_meeting_at || previousMemory?.advisor_meeting_at || "").trim();
      await upsertCrmLifecycleState(supabase as any, {
        ownerId,
        tenantId: (agent as any)?.tenant_id || null,
        phone: inbound.from,
        realPhone: String(nextMemory.customer_phone || previousMemory?.customer_phone || ""),
        name: knownCustomerName || inbound.pushName || "",
        status: finalQuoteContext ? "quote" : undefined,
        nextAction: finalMeetingAt ? "Llamar cliente (cita WhatsApp)" : (finalNextAction || undefined),
        nextActionAt: finalMeetingAt || finalNextActionAt || undefined,
        metadata: {
          source: "evolution_webhook",
          conversation_status: String(nextMemory.conversation_status || "open"),
          last_intent: String(nextMemory.last_intent || ""),
          quote_feedback_due_at: String(nextMemory.quote_feedback_due_at || ""),
          advisor_meeting_at: finalMeetingAt,
          advisor_meeting_label: String(nextMemory.advisor_meeting_label || previousMemory?.advisor_meeting_label || ""),
        },
      });
      if (finalMeetingAt) {
        await mirrorAdvisorMeetingToAvanza({
          ownerId,
          tenantId: (agent as any)?.tenant_id || null,
          externalRef: String(inbound.messageId || incomingDedupKey || "final"),
          phone: inbound.from,
          customerName: knownCustomerName || inbound.pushName || inbound.from,
          advisor: "Asesor comercial",
          meetingAt: finalMeetingAt,
          meetingLabel: String(nextMemory.advisor_meeting_label || previousMemory?.advisor_meeting_label || ""),
          source: "evolution_webhook",
        });
      }

      await persistConversationTurn(supabase as any, {
        agentId: String(agent.id),
        ownerId,
        tenantId: (agent as any)?.tenant_id || null,
        from: inbound.from,
        pushName: inbound.pushName,
        contactName: knownCustomerName || inbound.pushName || inbound.from,
        inboundText: inbound.text,
        outboundText: reply,
        messageId: inbound.messageId,
        memory: nextMemory,
      });
    } catch (saveErr: any) {
      console.warn("[evolution-webhook] conversation save failed", saveErr?.message || saveErr);
    }

    await logUsageEvent(supabase as any, ownerId, billedTokens, {
      endpoint: "/api/agents/channels/evolution/webhook",
      action: autoQuoteDocs.length ? "whatsapp_evolution_quote_auto" : "whatsapp_evolution_turn",
      metadata: {
        agent_id: agent.id,
        llm_tokens_total: usageTotal,
        llm_tokens_completion: usageCompletion,
        llm_tokens_billed: billedTokens,
        channel: "whatsapp_evolution",
        quote_auto: Boolean(autoQuoteDocs.length),
        quote_auto_docs: autoQuoteDocs.length,
      },
    });

    try {
      await supabase.from("message_audit_log").insert({
        provider: "evolution",
        agent_id: String(agent.id),
        owner_id: ownerId,
        tenant_id: (agent as any)?.tenant_id || null,
        phone: inbound.from,
        message_id: incomingDedupKey,
        intent: String(classifiedIntent.intent || ""),
        category: classifiedIntent.category,
        product: classifiedIntent.product,
        action: String(nextMemory.last_intent || classifiedIntent.intent || ""),
        request_payload: {
          text: inbound.text,
          classified_intent: classifiedIntent,
        },
        response_payload: {
          reply,
          sent_quote_pdf: sentQuotePdf,
          sent_tech_sheet: sentTechSheet,
          sent_image: sentImage,
        },
      });
    } catch (auditErr: any) {
      console.warn("[evolution-webhook] audit_log_failed", auditErr?.message || auditErr);
    }

    await supabase
      .from("incoming_messages")
      .update({ status: "processed", processed_at: new Date().toISOString() })
      .eq("provider", "evolution")
      .eq("provider_message_id", incomingDedupKey);

    return NextResponse.json({ ok: true, sent: true });
  } catch (e: any) {
    console.error("[evolution-webhook] error", e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message || "Error en webhook Evolution" }, { status: 500 });
  }
}
