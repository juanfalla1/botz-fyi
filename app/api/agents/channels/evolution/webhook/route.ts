import { NextResponse } from "next/server";
import OpenAI from "openai";
import { jsPDF } from "jspdf";
import { getServiceSupabase } from "@/app/api/_utils/supabase";
import { checkEntitlementAccess, consumeEntitlementCredits, logUsageEvent } from "@/app/api/_utils/entitlement";
import { evolutionService } from "../../../../../../lib/services/evolution.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATALOG_REFERENCE_URL = "https://balanzasybasculas.com.co/";
const CATALOG_REFERENCE_SHARE_URL = "https://share.google/cE6wPPEGCH3vytJMm";
const STRICT_WHATSAPP_MODE = String(process.env.WHATSAPP_STRICT_MODE || "true").toLowerCase() !== "false";
const MAX_WHATSAPP_DOC_BYTES = Number(process.env.WHATSAPP_DOC_MAX_BYTES || 8 * 1024 * 1024);
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
      .select("id,name")
      .eq("created_by", ownerId)
      .or(`phone.eq.${phone},phone.like.%${tail}`)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (readErr) return;

    if (existing?.id) {
      await supabase
        .from("agent_crm_contacts")
        .update({ name })
        .eq("id", String(existing.id))
        .eq("created_by", ownerId);
      return;
    }

    await supabase.from("agent_crm_contacts").insert({
      tenant_id: args.tenantId || null,
      created_by: ownerId,
      name,
      phone,
      status: "new",
      next_action: null,
      next_action_at: null,
      metadata: { source: "whatsapp_name_capture" },
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

function buildNumberedProductOptions(rows: any[], maxItems = 5): Array<{ code: string; rank: number; id: string; name: string; category: string; base_price_usd: number }> {
  const list = Array.isArray(rows) ? rows : [];
  const out: Array<{ code: string; rank: number; id: string; name: string; category: string; base_price_usd: number }> = [];
  const seen = new Set<string>();
  for (const row of list) {
    const name = String(row?.name || "").trim();
    if (!name) continue;
    const key = normalizeText(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const rank = out.length + 1;
    if (rank > Math.max(1, maxItems)) break;
    const code = String.fromCharCode(64 + rank);
    out.push({
      code,
      rank,
      id: String(row?.id || "").trim(),
      name,
      category: String(row?.category || "").trim(),
      base_price_usd: Number(row?.base_price_usd || 0),
    });
  }
  return out;
}

function resolvePendingProductOption(text: string, optionsRaw: any): { code: string; rank: number; id: string; name: string; category: string; base_price_usd: number } | null {
  const tRaw = String(text || "").trim();
  const t = normalizeText(tRaw);
  if (!t) return null;
  const options = (Array.isArray(optionsRaw) ? optionsRaw : [])
    .map((o: any) => ({
      code: String(o?.code || "").trim().toUpperCase(),
      rank: Number(o?.rank || 0),
      id: String(o?.id || "").trim(),
      name: String(o?.name || "").trim(),
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
  return /(los\s*3|los\s*tres|todos\s+los\s+productos|todos\s+los\s+que\s+tienen\s+precio|de\s+los\s+3)/.test(t);
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
    /(que|cuales).*(productos|equipos).*(tienen|manejan|venden|ofrecen)/.test(t) ||
    /(productos|equipos).*(tienen|manejan|venden|ofrecen)/.test(t)
  );
}

function isRecommendationIntent(text: string): boolean {
  const t = normalizeText(text);
  return /(recomiend|modelo ideal|que modelo|cual modelo|me sirve|para mi caso|que balanza|tipo de balanza|tipos de balanzas|clase de balanza|sugerencia|busco\s+(una\s+)?balanza|necesito\s+(una\s+)?balanza)/.test(t);
}

function isOutOfCatalogDomainQuery(text: string): boolean {
  const t = normalizeText(text || "");
  if (!t) return false;
  const outTerms = /(tornillo|tornillos|herramienta|herramientas|taladro|martillo|llave inglesa|destornillador|broca|ferreteria|ferreteria|tuerca|perno|clavo|soldadura|silicona|pintura)/.test(t);
  if (!outTerms) return false;
  const inDomain = /(balanza|balanzas|bascula|basculas|ohaus|analitica|analitica|precision|precision|trm|cotizacion|ficha tecnica|humedad|electroquimica|laboratorio|centrifuga|mezclador|agitador)/.test(t);
  return outTerms && !inDomain;
}

function detectCatalogCategoryIntent(text: string): string | null {
  const t = normalizeText(text || "");
  if (!t) return null;
  if (/(electroquim|ph|orp|conductividad|tds|salinidad|aquasearcher|electrodo|medidor)/.test(t)) {
    if (/(mesa|sobremesa)/.test(t)) return "electroquimica_medidores_mesa";
    if (/(portatil|portatiles)/.test(t)) return "electroquimica_medidores_portatiles";
    if (/(bolsillo)/.test(t)) return "electroquimica_medidores_bolsillo";
    if (/(electrodo)/.test(t)) return "electroquimica_electrodos";
    return "electroquimica";
  }
  if (/(analizador de humedad|humedad|mb120|mb90|mb27|mb23)/.test(t)) return "analizador_humedad";
  if (/(bascula|basculas|ranger|defender|valor|plataforma|control de peso|ckw|td52p)/.test(t)) return "basculas";
  if (/(impresora)/.test(t)) return "impresoras";
  if (/(centrifuga|agitador|mezclador|homogeneizador|planchas|laboratorio)/.test(t)) return "equipos_laboratorio";
  if (/(balanza|balanzas|explorer|adventurer|pioneer|pr\b|scout|analitica|semi analitica|precision)/.test(t)) return "balanzas";
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

function isGreetingIntent(text: string): boolean {
  const t = normalizeText(text).replace(/[^a-z0-9\s]/g, " ").trim();
  if (!t) return false;
  const hasGreeting = /^(hola|buenas|buenos dias|buen dia|buenas tardes|buenas noches|hey|hi)\b/.test(t);
  const hasBusinessIntent = /(cotiz|producto|pdf|trm|historial|recomiend|precio|catalogo)/.test(t);
  return hasGreeting && !hasBusinessIntent && t.length <= 40;
}

function isAffirmativeIntent(text: string): boolean {
  const t = normalizeText(text).replace(/[^a-z0-9\s]/g, " ").trim();
  return /^(si|sí|ok|vale|listo|dale|de una|perfecto|por favor|si por favor|hazlo|enviala|enviamela)\b/.test(t);
}

function isConversationCloseIntent(text: string): boolean {
  const t = normalizeCatalogQueryText(String(text || "")).replace(/[^a-z0-9\s]/g, " ").trim();
  if (!t) return false;
  return /\b(no|no gracias|gracias|eso es todo|nada mas|finaliza|finalizar|finalicemos|finalizamos|termina|terminar|cerrar|cerramos|listo gracias|ok gracias|perfecto gracias|hasta luego|adios|chao)\b/.test(t);
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
    let score = 0;
    if (rowName && inbound.includes(rowName)) score += 10;
    if (nameCompact && inboundCompact.includes(nameCompact)) score += 8;
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
  for (const row of rows || []) {
    const hay = normalizeCatalogQueryText(`${row?.name || ""} ${row?.brand || ""} ${row?.category || ""} ${catalogSubcategory(row)}`);
    if (tokens.every((t) => hay.includes(normalizeCatalogQueryText(t)))) return row;
  }
  return null;
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
    /(con\s+(calibracion|precision|resolucion|capacidad|bateria|usb|bluetooth|wifi|rs\s*232|ip\d{2}|pantalla|sensor|humedad|analitic|semi|micro))/.test(t) ||
    hasMeasurementSpec
  );
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

  const primary = specsText || summaryText || descriptionText;
  let lines = primary
    .split(/[.;]\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/^[-•\u2022]+\s*/, "").trim())
    .filter((s) => {
      const n = normalizeText(s);
      return Boolean(n) && n !== "especificaciones" && n !== "specifications" && n.length > 8;
    });

  lines = uniqueNormalizedStrings(lines, maxLines);
  if (!lines.length) {
    lines = extractSpecsFromJson(row?.specs_json, maxLines);
  }
  if (!lines.length) return "";
  return lines.slice(0, maxLines).map((l) => `- ${l}`).join("\n");
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
    .replace(/\baventura\b/g, "adventurer")
    .replace(/\badventure\b/g, "adventurer")
    .replace(/\bpioner\b/g, "pioneer")
    .replace(/\bsemi\s+seco\b/g, "semi micro");
}

function isContextResetIntent(text: string): boolean {
  const t = normalizeText(text || "");
  if (!t) return false;
  return /(reiniciar contexto|resetear contexto|reset context|limpiar contexto|borrar contexto|olvida contexto|olvida todo|empecemos de nuevo|empezar de nuevo)/.test(t);
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
  const c = normalizeText(String(category || ""));
  return c === "analizador_humedad";
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
  const wanted = normalizeText(String(categoryIntent || ""));
  if (!wanted) return true;
  const rowName = normalizeText(String(row?.name || ""));
  const rowSub = catalogSubcategory(row);

  if (wanted === "balanzas") {
    if (/(bascul|bscul|plataform|indicador)/.test(rowName)) return false;
    if (rowSub.startsWith("basculas") || rowSub.startsWith("plataformas") || rowSub.startsWith("indicadores")) return false;
  }

  if (wanted === "basculas") {
    if (/\b(balanz)\b/.test(rowName)) return false;
    if (rowSub.startsWith("balanzas")) return false;
  }

  return true;
}

function scopeCatalogRows(rows: any[], categoryIntent: string): any[] {
  const wanted = normalizeText(String(categoryIntent || ""));
  if (!wanted) return rows || [];
  return (rows || []).filter((row: any) => {
    if (!categoryMatchesIntent(row, wanted)) return false;
    return passesStrictCategoryGuard(row, wanted);
  });
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

function buildQuotePdf(args: {
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
  notes?: string;
}) {
  const doc = new jsPDF();
  const now = new Date();
  const quoteNumber = `Q-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;

  doc.setFillColor(10, 121, 167);
  doc.rect(0, 0, 210, 52, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text("Avanza", 14, 20);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("International group s.a.s", 70, 13);
  doc.text("EQUIPOS Y CONSUMIBLES PARA LABORATORIO", 14, 26);
  doc.setFontSize(10);
  doc.text("+57 300 8265047  |  +57 320 8336976", 14, 34);
  doc.text("Autopista Medellin K 2.5 entrada parcelas 900 m CIEM OIKOS OCCIDENTE", 14, 39);
  doc.text("Cra 81 # 32-332 Nueva Villa de Aburra - Local 332", 14, 44);
  doc.text("info@avanzagroup.com.co", 14, 49);

  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Cotizacion tecnica preliminar", 14, 64);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Numero: ${quoteNumber}`, 14, 71);
  doc.text(`Fecha: ${now.toLocaleString("es-CO")}`, 14, 76);

  let y = 86;
  const row = (k: string, v: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${k}:`, 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(v || "-", 56, y);
    y += 6;
  };

  row("Empresa", args.companyName || "Avanza Balanzas");
  row("Cliente", args.customerName || "-");
  row("Correo", args.customerEmail || "-");
  const phoneSafe = normalizePhone(args.customerPhone || "");
  row("Telefono", phoneSafe.length >= 10 && phoneSafe.length <= 12 ? phoneSafe : "-");
  row("Producto", args.productName || "-");
  row("Cantidad", String(args.quantity || 1));
  row("Precio base USD", args.basePriceUsd > 0 ? formatMoney(args.basePriceUsd) : "-");
  row("TRM", args.trmRate > 0 ? formatMoney(args.trmRate) : "-");
  row("Total COP", args.totalCop > 0 ? formatMoney(args.totalCop) : "-");

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.text("Notas:", 14, y);
  doc.setFont("helvetica", "normal");
  const notes = String(args.notes || "Cotizacion preliminar sujeta a validacion tecnica, inventario y condiciones comerciales vigentes.");
  const lines = doc.splitTextToSize(notes, 180);
  doc.text(lines, 14, y + 5);

  return Buffer.from(doc.output("arraybuffer")).toString("base64");
}

function buildBundleQuotePdf(args: {
  bundleId: string;
  companyName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: Array<{ productName: string; quantity: number; basePriceUsd: number; trmRate: number; totalCop: number }>;
}) {
  const doc = new jsPDF();
  const now = new Date();
  const quoteNumber = `QB-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;

  doc.setFillColor(10, 121, 167);
  doc.rect(0, 0, 210, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Avanza", 14, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Cotizacion consolidada", 14, 28);

  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Cotizacion tecnica consolidada", 14, 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Numero: ${quoteNumber}`, 14, 57);
  doc.text(`Fecha: ${now.toLocaleString("es-CO")}`, 14, 62);

  let y = 70;
  const row = (k: string, v: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${k}:`, 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(v || "-", 56, y);
    y += 6;
  };

  row("Empresa", args.companyName || "Avanza Balanzas");
  row("Cliente", args.customerName || "-");
  row("Correo", args.customerEmail || "-");
  const phoneSafe = normalizePhone(args.customerPhone || "");
  row("Telefono", phoneSafe.length >= 10 && phoneSafe.length <= 12 ? phoneSafe : "-");
  row("Bundle", args.bundleId);

  y += 3;
  doc.setFont("helvetica", "bold");
  doc.text("Items", 14, y);
  y += 6;

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("Producto", 14, y);
  doc.text("Cant.", 110, y, { align: "right" });
  doc.text("USD", 138, y, { align: "right" });
  doc.text("TRM", 166, y, { align: "right" });
  doc.text("Total COP", 198, y, { align: "right" });
  y += 5;
  doc.setFont("helvetica", "normal");

  let grandTotal = 0;
  for (const item of args.items || []) {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    grandTotal += Number(item.totalCop || 0);
    const pLines = doc.splitTextToSize(String(item.productName || "-"), 92);
    doc.text(pLines, 14, y);
    doc.text(String(item.quantity || 1), 110, y, { align: "right" });
    doc.text(formatMoney(Number(item.basePriceUsd || 0)), 138, y, { align: "right" });
    doc.text(formatMoney(Number(item.trmRate || 0)), 166, y, { align: "right" });
    doc.text(formatMoney(Number(item.totalCop || 0)), 198, y, { align: "right" });
    y += Math.max(6, pLines.length * 4 + 1);
  }

  y += 3;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Total consolidado COP: ${formatMoney(grandTotal)}`, 14, y);

  return Buffer.from(doc.output("arraybuffer")).toString("base64");
}

export async function POST(req: Request) {
  try {
    console.log("[evolution-webhook] --- WEBHOOK ENTRY ---", { time: new Date().toISOString() });

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
    if (
      prevTextNorm &&
      currTextNorm &&
      prevTextNorm === currTextNorm &&
      Number.isFinite(prevUserAtMs) &&
      Date.now() - prevUserAtMs < 45_000
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
      basePriceUsd: number;
      trmRate: number;
      totalCop: number;
    }> = [];
    let autoQuoteBundle: null | { fileName: string; pdfBase64: string; draftIds: string[] } = null;
    const tenantId = String((agent as any)?.tenant_id || "").trim();
    const catalogProvider = String((cfg as any)?.catalog_provider || "ohaus_colombia").trim().toLowerCase();

    const inboundName = sanitizeCustomerDisplayName(inbound.pushName || "");
    let knownCustomerName = sanitizeCustomerDisplayName(String(nextMemory.customer_name || ""))
      || sanitizeCustomerDisplayName(String((existingConv as any)?.contact_name || ""))
      || inboundName;

    if (!knownCustomerName) {
      try {
        const { data: crmContact } = await supabase
          .from("agent_crm_contacts")
          .select("name")
          .eq("created_by", ownerId)
          .or(inboundFilter.replace(/contact_phone/g, "phone"))
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        knownCustomerName = sanitizeCustomerDisplayName(String((crmContact as any)?.name || ""));
      } catch {
        // ignore missing table or transient query errors
      }
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
      } catch {
        // ignore
      }
    }

    if (knownCustomerName) nextMemory.customer_name = knownCustomerName;

    const awaitingAction = String(previousMemory?.awaiting_action || "");
    const originalInboundText = String(inbound.text || "").trim();
    if (awaitingAction === "conversation_followup" && isConversationCloseIntent(inbound.text)) {
      reply = "Perfecto, finalizamos este chat por ahora. Cuando quieras, me escribes y retomamos con gusto.";
      nextMemory.awaiting_action = "none";
      nextMemory.conversation_status = "closed";
      nextMemory.last_intent = "conversation_closed";
      handledByGreeting = true;
      billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
    }
    if (!handledByGreeting && awaitingAction === "conversation_followup" && !isConversationCloseIntent(inbound.text)) {
      const rememberedProduct = String(nextMemory.last_selected_product_name || previousMemory?.last_selected_product_name || nextMemory.last_product_name || previousMemory?.last_product_name || "").trim();
      if (rememberedProduct) {
        const t = normalizeText(originalInboundText);
        const asksQuoteNow = asksQuoteIntent(t) || isPriceIntent(t) || isQuoteProceedIntent(t) || /\b(cotiza|cotizacion|precio)\b/.test(t);
        const asksSheetNow = isTechnicalSheetIntent(t);
        const asksImageNow = isProductImageIntent(t);
        if (asksQuoteNow || (isAffirmativeIntent(t) && !asksSheetNow && !asksImageNow)) {
          inbound.text = `cotizar ${rememberedProduct} ${originalInboundText}`.trim();
          nextMemory.awaiting_action = "quote_product_selection";
        } else if (asksSheetNow && asksImageNow) {
          inbound.text = `ficha tecnica e imagen de ${rememberedProduct}`;
          nextMemory.awaiting_action = "none";
        } else if (asksSheetNow) {
          inbound.text = `ficha tecnica de ${rememberedProduct}`;
          nextMemory.awaiting_action = "none";
        } else if (asksImageNow) {
          inbound.text = `imagen de ${rememberedProduct}`;
          nextMemory.awaiting_action = "none";
        }
      }
    }
    if (!handledByGreeting && isConversationCloseIntent(inbound.text) && normalizeText(inbound.text).length <= 32) {
      reply = "Perfecto, finalizamos este chat por ahora. Cuando quieras, me escribes y retomamos con gusto.";
      nextMemory.awaiting_action = "none";
      nextMemory.conversation_status = "closed";
      nextMemory.last_intent = "conversation_closed";
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

    const pendingProductOptions = Array.isArray((previousMemory as any)?.pending_product_options)
      ? (previousMemory as any).pending_product_options
      : [];
    const selectedPendingOption = resolvePendingProductOption(originalInboundText, pendingProductOptions);
    if (selectedPendingOption) {
      nextMemory.last_product_name = String(selectedPendingOption.name || "");
      nextMemory.last_product_id = String(selectedPendingOption.id || "");
      nextMemory.last_product_category = String(selectedPendingOption.category || "");
      nextMemory.last_selected_product_name = String(selectedPendingOption.name || "");
      nextMemory.last_selected_product_id = String(selectedPendingOption.id || "");
      nextMemory.last_selection_at = new Date().toISOString();
      nextMemory.pending_product_selection_code = String(selectedPendingOption.code || "");
      if (!normalizeText(originalInboundText).includes(normalizeText(String(selectedPendingOption.name || "")))) {
        inbound.text = `${originalInboundText} ${String(selectedPendingOption.name || "")}`.trim();
      }
      if (isOptionOnlyReply(originalInboundText)) {
        reply = [
          `Perfecto, seleccionaste ${String(selectedPendingOption.code || "")} - ${String(selectedPendingOption.name || "")}.`,
          "Ahora dime qué deseas con ese modelo:",
          "1) Cotización con TRM y PDF",
          "2) Ficha técnica",
          "3) Imagen",
          "4) Ficha + imagen",
        ].join("\n");
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

    const selectionAtRaw = String(nextMemory.last_selection_at || previousMemory?.last_selection_at || "");
    const selectionAtMs = Date.parse(selectionAtRaw);
    const activeSelectionWindowMs = 30 * 60 * 1000;
    const hasActiveSelectedProduct =
      Boolean(String(nextMemory.last_selected_product_id || previousMemory?.last_selected_product_id || "").trim() || String(nextMemory.last_selected_product_name || previousMemory?.last_selected_product_name || "").trim()) &&
      Number.isFinite(selectionAtMs) &&
      (Date.now() - selectionAtMs) <= activeSelectionWindowMs;

    if (String(previousMemory?.awaiting_action || "") === "product_action" && hasActiveSelectedProduct) {
      const rememberedOptionProduct = String(nextMemory.last_selected_product_name || previousMemory?.last_selected_product_name || nextMemory.last_product_name || previousMemory?.last_product_name || "").trim();
      const optText = normalizeText(originalInboundText);
      if (rememberedOptionProduct) {
        const confirmsDefaultFromOption = isAffirmativeIntent(optText) || /^(ok|vale|listo|de una)$/i.test(String(originalInboundText || "").trim());
        const asksQuoteByOption = /^(1|a)\b/.test(optText) || /\b(cotiz|cotizacion|precio|la cotizacion)\b/.test(optText);
        const asksSheetByOption = /^(2|b)\b/.test(optText) || isTechnicalSheetIntent(optText);
        const asksImageByOption = /^(3|c)\b/.test(optText) || isProductImageIntent(optText);
        const asksBothByOption = /^(4|d)\b/.test(optText) || (isTechnicalSheetIntent(optText) && isProductImageIntent(optText));
        if (asksQuoteByOption || confirmsDefaultFromOption) {
          inbound.text = `cotizar ${rememberedOptionProduct} ${originalInboundText}`.trim();
          nextMemory.awaiting_action = "quote_product_selection";
        } else if (asksBothByOption) {
          inbound.text = `ficha tecnica e imagen de ${rememberedOptionProduct}`;
          nextMemory.awaiting_action = "none";
        } else if (asksSheetByOption) {
          inbound.text = `ficha tecnica de ${rememberedOptionProduct}`;
          nextMemory.awaiting_action = "none";
        } else if (asksImageByOption) {
          inbound.text = `imagen de ${rememberedOptionProduct}`;
          nextMemory.awaiting_action = "none";
        } else if (hasBareQuantity(optText) || /\b\d{1,5}\b/.test(optText)) {
          inbound.text = `cotizar ${rememberedOptionProduct} ${originalInboundText}`.trim();
          nextMemory.awaiting_action = "quote_product_selection";
        } else {
          reply = `¿Quieres ficha, imagen o cotización de ${rememberedOptionProduct}?`;
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
      reply = knownCustomerName
        ? `Hola ${knownCustomerName}, soy Ava, tu asistente virtual de Avanza Group. ¿Qué necesitas hoy?`
        : "Hola, soy Ava, tu asistente virtual de Avanza Group. ¿Con quién tengo el gusto?";
      if (!knownCustomerName) nextMemory.awaiting_action = "capture_name";
      handledByGreeting = true;
      billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
    }

    if (!handledByGreeting && isInventoryInfoIntent(inbound.text)) {
      try {
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
          "Si quieres, dime categoria y modelo exacto y te envio ficha/imagen por este chat.",
        ].join("\n");
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
      const categoryIntent = detectCatalogCategoryIntent(inbound.text)
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
                  "Si quieres, te envío ficha técnica o imagen del modelo que elijas por este WhatsApp.",
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
                "Dime un modelo exacto y te envío ficha técnica o imagen por este WhatsApp.",
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
                  "Si quieres una en específico, dime el modelo exacto y te envío ficha técnica o imagen por este WhatsApp.",
                ].join("\n");
              } else {
                reply = `Sí tengo ${countNum} referencia(s) en ${categoryLabel} en esta base de datos. Si quieres una en específico, dime el modelo exacto y te envío ficha o imagen por este WhatsApp.`;
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
            "Responde con letra o número (ej.: A o 1) y te genero cotización con TRM, o te envío ficha/imagen.",
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
        const suggestions = [
          matched,
          ...sourceList.filter((p: any) => !matched || String(p.id) !== String(matched.id)),
        ]
          .filter(Boolean)
          .slice(0, 3)
          .map((p: any) => String(p?.name || "").trim())
          .filter(Boolean);

        if (wantsFeatureAnswer) {
          const rankedByFeature = rankCatalogByFeature(sourceList as any[], featureTerms).slice(0, 5);
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
              "Responde con letra o número (ej.: A o 1) y te envío ficha, imagen o cotización.",
            ].join("\n");
          } else if (suggestions.length) {
            reply = `No encontré coincidencia exacta para esa característica (${featureTerms.join(", ")}). Te propongo alternativas cercanas: ${suggestions.join("; ")}.`;
          } else {
            reply = "No encontré coincidencias para esa característica en este momento. Si quieres, te filtro por capacidad, resolución o calibración interna.";
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
            "Responde con letra o número (ej.: A o 1) y te envío ficha, imagen o cotización.",
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
    const forceExitTechAwaiting = quoteIntentNow && !hasExplicitTechNow;
    const awaitingTechProductSelection = awaitingAction === "tech_product_selection" && !forceExitTechAwaiting;
    const awaitingTechAssetChoice = awaitingAction === "tech_asset_choice" && !forceExitTechAwaiting;
    if (forceExitTechAwaiting && String(nextMemory.awaiting_action || "").startsWith("tech_")) {
      nextMemory.awaiting_action = "none";
    }
    const rememberedTechProduct = String(previousMemory?.last_product_name || nextMemory?.last_product_name || "").trim();
    const techResendIntent = detectTechResendIntent(inbound.text);
    const techInboundText = techResendIntent && rememberedTechProduct
      ? `${techResendIntent === "image" ? "imagen" : techResendIntent === "sheet" ? "ficha tecnica" : "ficha tecnica e imagen"} de ${rememberedTechProduct}`
      : awaitingTechAssetChoice && isAffirmativeIntent(inbound.text) && rememberedTechProduct
        ? `ficha tecnica e imagen de ${rememberedTechProduct}`
        : inbound.text;

    if (!handledByGreeting && !handledByInventory && !handledByHistory && !handledByPricing && !handledByRecommendation && (isTechnicalSheetIntent(techInboundText) || isProductImageIntent(techInboundText) || Boolean(techResendIntent) || awaitingTechProductSelection || awaitingTechAssetChoice)) {
      try {
        if (techResendIntent && !rememberedTechProduct) {
          reply = "Para reenviar la ficha o imagen necesito el modelo exacto del producto. Escríbeme solo el nombre del modelo.";
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
        const rememberedRow = rememberedTechProduct
          ? findCatalogProductByName(list, rememberedTechProduct)
          : null;
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
              "Sí tengo información técnica resumida y/o imagen en:",
              ...names.map((n: string) => `- ${n}`),
              ...(rest > 0 ? [`- y ${rest} más`] : []),
              "",
              "Si me dices un producto, te envío lo disponible por este WhatsApp.",
            ].join("\n");
            nextMemory.awaiting_action = "tech_product_selection";
          } else {
            reply = "En este momento no tengo fichas técnicas cargadas en catálogo para enviar por WhatsApp. Si quieres, te comparto los productos activos y te indico cuáles ya tienen imagen.";
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
              "Claro. Para enviarte la ficha técnica o imagen necesito el producto exacto.",
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
          const wantsSheet = isTechnicalSheetIntent(techInboundText) || awaitingTechProductSelection || awaitingTechAssetChoice;
          const wantsImage = isProductImageIntent(techInboundText) || awaitingTechAssetChoice;
          const matchedCategory = normalizeText(String((matched as any)?.category || ""));
          const webTechOnly = prefersWebTechPageOnly(matchedCategory);
          const matchedProductUrl = String((matched as any)?.product_url || "").trim();
          const imageUrl = String((matched as any)?.image_url || "").trim();
          let attachedSheet = false;
          let attachedImage = false;

          if (wantsSheet) {
            const datasheetUrl = webTechOnly ? "" : pickBestProductPdfUrl(matched, techInboundText);
            if (datasheetUrl) technicalFallbackLinks.push(datasheetUrl);
            if (webTechOnly && matchedProductUrl) technicalFallbackLinks.push(matchedProductUrl);
            if (datasheetUrl) {
              const remote = await fetchRemoteFileAsBase64(datasheetUrl);
              if (remote) {
                if (Number(remote.byteSize || 0) <= MAX_WHATSAPP_DOC_BYTES) {
                  technicalDocs.push({
                    kind: "document",
                    base64: remote.base64,
                    mimetype: remote.mimetype || "application/pdf",
                    fileName: safeFileName(remote.fileName, `ficha-${String((matched as any)?.name || "producto")}`, "pdf"),
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
                        : (imageUrl
                            ? ["", "No encontré ficha PDF para este modelo en este intento; te envié la imagen del producto."]
                            : ["", "Te comparto la ficha técnica adjunta."]))
                )
              : [];
            reply = [
              `Perfecto. Ya te envío por este WhatsApp la información técnica de ${String((matched as any)?.name || "ese producto")}${attachedSheet ? " (ficha)" : ""}${attachedImage ? " e imagen" : ""}.`,
              ...summarySection,
              ...sheetLinkFallbackSection,
              ...webTechLinkSection,
            ].join("\n");
          } else if (briefSpecs) {
            reply = [
              `Te comparto la ficha técnica de ${String((matched as any)?.name || "ese producto")}:`,
              "",
              briefSpecs,
              ...webTechLinkSection,
              ...(pdfTooLargeForAttachment ? ["", `La ficha PDF es pesada para envío directo; aquí la puedes abrir: ${pdfLink}`] : []),
              ...(imageUrl ? ["", `Imagen del producto: ${imageUrl}`] : []),
              ...(detailUrl ? ["", `Más detalle: ${detailUrl}`] : []),
            ].join("\n");
          } else {
            reply = webTechOnly && wantsSheet && matchedProductUrl
              ? `Este modelo no tiene ficha PDF oficial. Puedes revisar su ficha web aquí: ${matchedProductUrl}.${imageUrl ? ` Imagen: ${imageUrl}.` : ""}`
              : pdfTooLargeForAttachment
                ? `La ficha PDF de ${String((matched as any)?.name || "ese producto")} es pesada para envío directo por WhatsApp. Puedes abrirla aquí: ${pdfLink}.${imageUrl ? ` Imagen: ${imageUrl}.` : ""}`
                : `Te comparto el enlace directo de la ficha técnica de ${String((matched as any)?.name || "ese producto")}.${detailUrl ? ` ${detailUrl}` : ""}${imageUrl ? ` Imagen: ${imageUrl}.` : ""} Si quieres, te genero la cotización de una vez.`;
          }
          if (reply && !/\bquieres\b.*\b(cotizacion|ficha|imagen|producto)\b/i.test(normalizeText(reply))) {
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
        const asksBasculas = /(bascula|basculas|plataforma|indicador)/.test(quoteText);
        const asksBalanzas = /(balanza|balanzas)/.test(quoteText);
        const targetCategoryForQuote = asksBasculas
          ? "basculas"
          : asksBalanzas
            ? "balanzas"
            : (rememberedCategory === "basculas" || rememberedCategory === "balanzas" ? rememberedCategory : "balanzas");
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
          : "Claro. Para cotizar de una, dime modelo exacto y cantidad (ejemplo: Explorer 220, 2 unidades).";
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
                  status: "draft",
                })
                .select("id")
                .single();

              if (newDraftErr || !newDraft?.id) {
                reply = "Ocurrió un error al actualizar la cotización por cantidad. Inténtalo de nuevo y te la envío por este WhatsApp.";
              } else {
                const draftId = String(newDraft.id);
                const pdfBase64 = buildQuotePdf({
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

    if (!handledByGreeting && awaitingAction !== "conversation_followup" && !handledByInventory && !handledByHistory && !handledByPricing && !handledByRecommendation && !handledByTechSheet && !handledByQuoteStarter && isAffirmativeIntent(inbound.text)) {
      const prevIntent = String(previousMemory?.last_intent || "");
      const lastProductName = String(previousMemory?.last_product_name || nextMemory?.last_product_name || "").trim();
      if ((/(tech_sheet_request|image_request)/.test(prevIntent) || awaitingAction === "tech_product_selection") && lastProductName) {
        reply = `Perfecto. Para ${lastProductName}, ¿prefieres que te envíe ficha técnica, imagen o ambas por este WhatsApp?`;
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
                    status: "draft",
                  })
                  .select("id")
                  .single();
                if (newDraft?.id) draftIdForSend = String(newDraft.id);
              }
            }

            const pdfBase64 = buildQuotePdf({
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
      Boolean(nextMemory.last_product_name || nextMemory.last_product_id || rememberedSelectedProductName || rememberedSelectedProductId);
    const resumeQuoteFromContext =
      isContactInfoBundle(inbound.text) &&
      shouldAutoQuote(`${recentUserContext}\n${inbound.text}`);

    if (!handledByGreeting && !handledByInventory && !handledByHistory && !handledByPricing && !handledByRecommendation && !handledByTechSheet && !handledByQuoteStarter && !handledByRecall && (shouldAutoQuote(inbound.text) || resumeQuoteFromContext || quoteProceedFromMemory || concreteQuoteIntent)) {
      try {
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
        const explicitModelProduct = findExactModelProduct(quoteSourceText, commercialProducts || []);
        const matchedProduct = explicitModelProduct || ((quoteProceedFromMemory && selectedProduct)
          ? selectedProduct
          : pickBestCatalogProduct(quoteSourceText, quoteMatchPool || []));
        const rememberedProduct = findCatalogProductByName(commercialProducts || [], String(nextMemory.last_product_name || ""));
        const wantsMulti = isMultiProductQuoteIntent(quoteSourceText);
        const selectedProducts = wantsMulti
          ? pricedProducts.slice(0, 3)
          : matchedProduct || rememberedProduct
            ? [matchedProduct || rememberedProduct]
            : [];

        if (selectedProducts.length) {
          const transcript = Array.isArray(existingConv?.transcript) ? existingConv.transcript : [];
          const latestUserLines = transcript
            .filter((m: any) => m?.role === "user" && m?.content)
            .slice(-8)
            .map((m: any) => String(m.content || ""));
          const combinedUserContext = `${latestUserLines.join("\n")}\n${inbound.text}`;

          const qtyFromInbound = extractQuoteRequestedQuantity(inbound.text);
          const qtyFromSource = extractQuoteRequestedQuantity(quoteSourceText);
          const defaultQuantity = Math.max(1, qtyFromInbound || qtyFromSource || 1);
          const perProductQty = extractPerProductQuantities(
            quoteSourceText,
            selectedProducts.map((p: any) => ({ id: String(p.id), name: String(p.name || "") }))
          );
          const uniformHint = hasUniformQuantityHint(quoteSourceText);

          if (wantsMulti && Object.keys(perProductQty).length < selectedProducts.length && !uniformHint) {
            const listNames = selectedProducts.map((p: any) => String(p?.name || "")).filter(Boolean);
            reply = `Para cotizar los 3 productos, confirmame la cantidad de cada uno. Ejemplo: ${listNames[0] || "Producto 1"}: 2; ${listNames[1] || "Producto 2"}: 1; ${listNames[2] || "Producto 3"}: 3. Si es la misma cantidad para todos, escribe: cantidad ${defaultQuantity || 1} para todos.`;
            handledByQuoteIntake = true;
            billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
          }

          const customerEmail = extractEmail(combinedUserContext) || String(nextMemory.customer_email || "");
          const customerName = extractCustomerName(combinedUserContext, inbound.pushName || "") || String(nextMemory.customer_name || "");
          const customerPhone = extractCustomerPhone(combinedUserContext, inbound.from) || String(nextMemory.customer_phone || "");

          const missingFields: string[] = [];
          if (!isPresent(customerName)) missingFields.push("nombre completo");
          if (!isPresent(customerPhone)) missingFields.push("telefono");

          if (missingFields.length) {
            reply = `Para enviarte la cotizacion en PDF sin campos vacios, me faltan estos datos: ${missingFields.join(", ")}. Enviamelos en un solo mensaje (ejemplo: Nombre: ..., Telefono: ...).`;
            handledByQuoteIntake = true;
            billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
          }

          if (!missingFields.length && !handledByQuoteIntake && selectedProducts.length === 1) {
            const selected = selectedProducts[0] as any;
            const requestedQty = Math.max(1, extractQuoteRequestedQuantity(inbound.text) || extractQuoteRequestedQuantity(quoteSourceText));
            const basePrice = Number(selected?.base_price_usd || 0);
            if (!(basePrice > 0)) {
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
                  const explicitQty = extractQuoteRequestedQuantity(inbound.text);
                  if (explicitQty > 1) quantity = explicitQty;
                }
                const basePriceUsd = Number((selected as any)?.base_price_usd || 0);
                if (!(basePriceUsd > 0)) continue;

                const totalCop = Number((basePriceUsd * trmRate * quantity).toFixed(2));
                const draftPayload = {
                  tenant_id: (agent as any)?.tenant_id || null,
                  created_by: ownerId,
                  agent_id: String(agent.id),
                  customer_name: customerName || null,
                  customer_email: customerEmail || null,
                  customer_phone: customerPhone || null,
                  company_name: String(cfg?.company_name || cfg?.company_desc || "Avanza Balanzas").slice(0, 120) || "Avanza Balanzas",
                  location: null,
                  product_catalog_id: (selected as any).id,
                  product_name: String((selected as any).name || ""),
                  base_price_usd: basePriceUsd,
                  trm_rate: trmRate,
                  total_cop: totalCop,
                  notes: "Cotizacion automatica por WhatsApp",
                  payload: {
                    quantity,
                    trm_date: trm.rate_date,
                    trm_source: trm.source,
                    price_currency: String((selected as any)?.price_currency || "USD"),
                    automation: "evolution_webhook",
                  },
                  status: "draft",
                };

                const { data: draft, error: draftError } = await supabase
                  .from("agent_quote_drafts")
                  .insert(draftPayload)
                  .select("id")
                  .single();

                if (!draftError && draft?.id) {
                  nextMemory.last_quote_draft_id = String(draft.id);
                  nextMemory.last_quote_product_name = String((selected as any).name || "");
                  nextMemory.awaiting_action = "none";
                  const pdfBase64 = buildQuotePdf({
                    draftId: String(draft.id),
                    companyName: String(draftPayload.company_name || "Avanza Balanzas"),
                    customerName: customerName || "",
                    customerEmail: customerEmail || "",
                    customerPhone: customerPhone || "",
                    productName: String((selected as any).name || ""),
                    quantity,
                    basePriceUsd,
                    trmRate,
                    totalCop,
                    notes: String(draftPayload.notes || ""),
                  });

                  autoQuoteDocs.push({
                    draftId: String(draft.id),
                    fileName: `cotizacion-${String(draft.id).slice(0, 8)}.pdf`,
                    pdfBase64,
                    quantity,
                    productName: String((selected as any).name || ""),
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
                const bundlePdfBase64 = buildBundleQuotePdf({
                  bundleId: `B-${new Date().toISOString().slice(0, 10)}-${String(autoQuoteDocs[0].draftId).slice(0, 6)}`,
                  companyName: String(cfg?.company_name || cfg?.company_desc || "Avanza Balanzas").slice(0, 120) || "Avanza Balanzas",
                  customerName: customerName || "",
                  customerEmail: customerEmail || "",
                  customerPhone: customerPhone || "",
                  items: autoQuoteDocs.map((d) => ({
                    productName: d.productName,
                    quantity: d.quantity,
                    basePriceUsd: d.basePriceUsd,
                    trmRate: d.trmRate,
                    totalCop: d.totalCop,
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
        console.warn("[evolution-webhook] auto_quote_failed", autoErr?.message || autoErr);
      }
    }

    if (!autoQuoteDocs.length && !handledByGreeting && !handledByRecall && !handledByTechSheet && !handledByInventory && !handledByHistory && !handledByPricing && !handledByRecommendation && !handledByQuoteStarter && !handledByQuoteIntake) {
      const selectedProductForGuide = String(nextMemory.last_selected_product_name || previousMemory?.last_selected_product_name || "").trim();
      const selectedAtMs = Date.parse(String(nextMemory.last_selection_at || previousMemory?.last_selection_at || ""));
      const selectedStillActive = Boolean(selectedProductForGuide) && Number.isFinite(selectedAtMs) && (Date.now() - selectedAtMs) <= 30 * 60 * 1000;
      if (selectedStillActive) {
        reply = `¿Quieres ficha, imagen o cotización de ${selectedProductForGuide}?`;
        nextMemory.awaiting_action = "product_action";
        billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
      } else {
      const catalogRows = await fetchCatalogRows("name,brand,category,source_payload,product_url", 120, false);
      const allCatalogRows = Array.isArray(catalogRows) ? catalogRows : [];
      const commercialRows = allCatalogRows.filter((r: any) => isCommercialCatalogRow(r));
      const rememberedCategoryIntent = String(previousMemory?.last_category_intent || "").trim();
      const deterministicOnly =
        STRICT_WHATSAPP_MODE ||
        isStrictCatalogIntent(inbound.text) ||
        (isCategoryFollowUpIntent(inbound.text) && Boolean(rememberedCategoryIntent)) ||
        isConsistencyChallengeIntent(inbound.text);

      if (deterministicOnly) {
        const requestedCategory = normalizeText(String(detectCatalogCategoryIntent(inbound.text) || rememberedCategoryIntent || ""));
        const categoryScopedCommercial = requestedCategory ? scopeCatalogRows(commercialRows as any, requestedCategory) : commercialRows;
        const categoryScopedAll = requestedCategory ? scopeCatalogRows(allCatalogRows as any, requestedCategory) : allCatalogRows;
        const baseSource = categoryScopedCommercial.length
          ? categoryScopedCommercial
          : (categoryScopedAll.length ? categoryScopedAll : commercialRows);
        const narrowed = filterCatalogByTerms(inbound.text, baseSource as any, requestedCategory);
        const sampleSource = narrowed.length ? narrowed : baseSource;
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

    const deliveredSalesAsset = Boolean(autoQuoteDocs.length || autoQuoteBundle || resendPdf || technicalDocs.length || handledByTechSheet || handledByQuoteIntake);
    if (!handledByGreeting && deliveredSalesAsset) {
      const replyNorm = normalizeText(String(reply || ""));
      if (!/quieres algo mas|prefieres revisar otro producto|finalizamos por ahora|ficha imagen o cotizacion/.test(replyNorm)) {
        reply = `${String(reply || "").trim()}\n\n¿Quieres algo más o finalizamos por ahora?`;
      }
      nextMemory.awaiting_action = "conversation_followup";
      nextMemory.conversation_status = "open";
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
          await evolutionService.sendDocument(outboundInstance, sentTo, {
            base64: autoQuoteBundle.pdfBase64,
            fileName: autoQuoteBundle.fileName,
            caption: `Cotizacion consolidada ${autoQuoteBundle.fileName}`,
            mimetype: "application/pdf",
          });

          for (const id of autoQuoteBundle.draftIds) {
            await supabase
              .from("agent_quote_drafts")
              .update({ status: "sent" })
              .eq("id", id)
              .eq("created_by", ownerId);
          }
          sentQuotePdf = true;
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
              .update({ status: "sent" })
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
            await evolutionService.sendDocument(outboundInstance, sentTo, {
              base64: doc.base64,
              fileName: doc.fileName,
              caption: doc.caption || "Información técnica",
              mimetype: doc.mimetype || "application/pdf",
            });
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
            `Intenté enviarte el archivo técnico, pero falló en este intento. Si escribes 'reenviar ficha' o 'reenviar imagen', lo reintento ahora mismo.${extra}`
          );
        } catch {}
      }
    }

    if (sentQuotePdf) nextMemory.last_quote_pdf_sent_at = new Date().toISOString();
    if (sentTechSheet) nextMemory.last_datasheet_sent_at = new Date().toISOString();
    if (sentImage) nextMemory.last_image_sent_at = new Date().toISOString();
    if (autoQuoteDocs.length || autoQuoteBundle || handledByTechSheet || handledByQuoteIntake) {
      nextMemory.pending_product_options = [];
      if (String(nextMemory.awaiting_action || "") === "product_option_selection") nextMemory.awaiting_action = "none";
    }

    if (autoQuoteDocs.length || autoQuoteBundle) nextMemory.last_intent = "quote_generated";
    else if (handledByRecall) nextMemory.last_intent = "quote_recall";
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
