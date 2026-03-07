import { NextResponse } from "next/server";
import OpenAI from "openai";
import { jsPDF } from "jspdf";
import { getServiceSupabase } from "@/app/api/_utils/supabase";
import { checkEntitlementAccess, consumeEntitlementCredits, logUsageEvent } from "@/app/api/_utils/entitlement";
import { evolutionService } from "../../../../../../lib/services/evolution.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  } = params;

  const { data: existing } = await supabase
    .from("agent_conversations")
    .select("id,transcript,message_count,metadata")
    .eq("agent_id", agentId)
    .eq("channel", "whatsapp")
    .eq("contact_phone", from)
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
        transcript: mergedTranscript,
        message_count: currentCount + 2,
        status: "completed",
        ended_at: nowIso,
        metadata: {
          ...currentMeta,
          owner_id: ownerId,
          last_inbound_message_id: messageId || currentMeta?.last_inbound_message_id || null,
        },
      })
      .eq("id", existing.id);
    return;
  }

  await supabase.from("agent_conversations").insert({
    agent_id: agentId,
    tenant_id: tenantId || null,
    contact_name: pushName || from,
    contact_phone: from,
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
    },
    started_at: nowIso,
    ended_at: nowIso,
  });
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

function extractQuantity(text: string): number {
  const t = String(text || "");
  const m1 = t.match(/(?:cantidad|qty|x)\s*[:=]?\s*(\d{1,5})/i);
  if (m1?.[1]) return Math.max(1, Math.min(100000, Number(m1[1])));
  const m2 = t.match(/\b(\d{1,5})\s*(?:unidad|unidades|equipos?)\b/i);
  if (m2?.[1]) return Math.max(1, Math.min(100000, Number(m2[1])));
  return 1;
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

function isQuoteRecallIntent(text: string): boolean {
  const t = normalizeText(text);
  return (
    /recuerd|ultima cotizacion|cotizacion que me enviaste|cotizacion anterior|mi cotizacion|mi ultima cotizacion/.test(t) &&
    /(cotiz|pdf|enviaste|anterior|ultima|recordar|recuerd)/.test(t)
  );
}

function isPriceIntent(text: string): boolean {
  const t = normalizeText(text);
  return /(precio|precios|cuanto vale|cuanto cuest|valor|valen|cuestan)/.test(t);
}

function isMultiProductQuoteIntent(text: string): boolean {
  const t = normalizeText(text);
  return /(los\s*3|los\s*tres|todos\s+los\s+productos|todos\s+los\s+que\s+tienen\s+precio|de\s+los\s+3)/.test(t);
}

function shouldResendPdf(text: string): boolean {
  const t = normalizeText(text);
  return /(reenviar|reenvia|reenvie|volver a enviar|mandame otra vez|otra vez el pdf|reenvio)/.test(t);
}

function isInventoryInfoIntent(text: string): boolean {
  const t = normalizeText(text);
  return (
    /(cuantos|cuantas|numero de|cantidad de).*(productos|equipos|referencias|items)/.test(t) ||
    /(catalogo|inventario).*(productos|equipos|referencias)/.test(t) ||
    /(que|cuales).*(productos|equipos).*(tienen|manejan|venden|ofrecen)/.test(t) ||
    /(productos|equipos).*(tienen|manejan|venden|ofrecen)/.test(t)
  );
}

function isRecommendationIntent(text: string): boolean {
  const t = normalizeText(text);
  return /(recomiend|modelo ideal|que modelo|cual modelo|me sirve|para mi caso|que balanza|sugerencia)/.test(t);
}

function isTechnicalSheetIntent(text: string): boolean {
  const t = normalizeText(text);
  return /(ficha|ficha tecnica|fichas tecnicas|datasheet|especificaciones|specs|hoja tecnica|brochure|catalogo tecnico)/.test(t);
}

function isProductImageIntent(text: string): boolean {
  const t = normalizeText(text);
  return /(imagen|imagenes|foto|fotos|fotografia|ver producto)/.test(t);
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
  const chunks = cleaned
    .split(/[.;]\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, maxLines);
  if (!chunks.length) return "";
  return chunks.map((c) => `- ${c}`).join("\n");
}

async function fetchRemoteFileAsBase64(url: string): Promise<{ base64: string; mimetype: string; fileName: string } | null> {
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
  return hasEmail && hasPhone && hasNameLike;
}

function isGreetingIntent(text: string): boolean {
  const t = normalizeText(text).replace(/[^a-z0-9\s]/g, " ").trim();
  if (!t) return false;
  const hasGreeting = /^(hola|buenas|buenos dias|buen dia|buenas tardes|buenas noches|hey|hi)\b/.test(t);
  const hasBusinessIntent = /(cotiz|producto|pdf|trm|historial|recomiend|precio|catalogo)/.test(t);
  return hasGreeting && !hasBusinessIntent && t.length <= 40;
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
  fixed = fixed.replace(/se\s+pondra\s+en\s+contacto\s+contigo\s+para\s+generar\s+una\s+cotizacion\s+formal\.?/gi, "Si quieres, te genero la cotización aquí mismo por WhatsApp.");
  return fixed;
}

function phoneTail10(raw: string): string {
  const n = normalizePhone(raw || "");
  return n.length > 10 ? n.slice(-10) : n;
}

function pickBestCatalogProduct(text: string, rows: any[]): any | null {
  const inbound = normalizeText(text);
  const terms = Array.from(
    new Set(
      inbound
        .split(/[^a-z0-9]+/i)
        .map((x) => x.trim())
        .filter((x) => x.length >= 4)
        .filter((x) => !["quiero", "cotizar", "cotizacion", "marca", "cliente", "cantidad", "trm", "hoy", "enviame", "whatsapp", "pdf", "producto"].includes(x))
    )
  );

  let best: { row: any; score: number } | null = null;
  for (const row of rows || []) {
    const hay = normalizeText(`${row?.name || ""} ${row?.brand || ""} ${row?.category || ""}`);
    let score = 0;
    if (inbound.includes(normalizeText(String(row?.name || "")))) score += 8;
    for (const term of terms) {
      if (hay.includes(term)) score += 2;
    }
    if (!best || score > best.score) best = { row, score };
  }

  if (!best || best.score < 4) return null;
  return best.row;
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
    const { data: existingConv } = await supabase
      .from("agent_conversations")
      .select("transcript")
      .eq("agent_id", agent.id)
      .eq("channel", "whatsapp")
      .eq("contact_phone", inbound.from)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

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
    let handledByRecommendation = false;
    let handledByTechSheet = false;
    let handledByRecall = false;
    let handledByQuoteIntake = false;
    const technicalDocs: Array<{ kind: "document" | "image"; base64: string; fileName: string; mimetype: string; caption?: string }> = [];
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
      return Number(tenantCount || 0);
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
      const ownerList = Array.isArray(ownerRows) ? ownerRows : [];
      if (ownerList.length || !tenantId) return ownerList;

      let tenantQuery = supabase
        .from("agent_product_catalog")
        .select(selectCols)
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(limitRows);
      if (pricedOnly) tenantQuery = tenantQuery.gt("base_price_usd", 0);
      const { data: tenantRows } = await tenantQuery;
      return Array.isArray(tenantRows) ? tenantRows : [];
    };

    if (isGreetingIntent(inbound.text)) {
      reply = "Hola, soy Ava, tu asistente virtual de Avanza Group";
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

        reply = `Hoy tengo ${Number(totalActive || 0)} productos activos en catalogo. De esos, ${Number(totalPriced || 0)} tienen precio base cargado para cotizacion automatica con PDF. ${examples.length ? `Ejemplos: ${examples.join(", ")}.` : ""}`.trim();
        handledByInventory = true;
        billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
      } catch (invErr: any) {
        console.warn("[evolution-webhook] inventory_info_failed", invErr?.message || invErr);
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

    if (!handledByGreeting && !handledByInventory && !handledByHistory && isPriceIntent(inbound.text)) {
      try {
        const pricedProducts = await fetchCatalogRows("id,name,base_price_usd", 20, true);

        const list = Array.isArray(pricedProducts) ? pricedProducts : [];
        const matched = pickBestCatalogProduct(inbound.text, list as any);

        if (matched?.name) {
          reply = `El producto ${String(matched.name)} tiene precio base USD ${formatMoney(Number(matched.base_price_usd || 0))}. Si quieres, te genero la cotizacion con TRM de hoy y PDF.`;
        } else if (list.length) {
          const sample = list.slice(0, 8).map((p: any) => `${String(p.name)} (USD ${formatMoney(Number(p.base_price_usd || 0))})`);
          reply = `Estos son los productos con precio cargado actualmente: ${sample.join("; ")}. Elige uno y te genero cotizacion con TRM y PDF.`;
        } else {
          reply = "Ahora mismo no tengo productos con precio cargado para cotizar. Si quieres, te confirmo el catalogo disponible primero.";
        }

        handledByPricing = true;
        billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
      } catch (priceErr: any) {
        console.warn("[evolution-webhook] pricing_lookup_failed", priceErr?.message || priceErr);
      }
    }

    if (!handledByGreeting && !handledByInventory && !handledByHistory && !handledByPricing && isRecommendationIntent(inbound.text)) {
      try {
        const products = await fetchCatalogRows("id,name,brand,category", 80, false);

        const list = Array.isArray(products) ? products : [];
        const matched = pickBestCatalogProduct(inbound.text, list);
        const suggestions = [
          matched,
          ...list.filter((p: any) => !matched || String(p.id) !== String(matched.id)),
        ]
          .filter(Boolean)
          .slice(0, 3)
          .map((p: any) => String(p?.name || "").trim())
          .filter(Boolean);

        if (suggestions.length) {
          reply = `Con base en tu caso, te puedo recomendar opciones de nuestro catalogo actual: ${suggestions.join("; ")}. Si eliges una, te preparo cotizacion con TRM de hoy y PDF.`;
        } else {
          reply = "Ahora mismo no encuentro productos activos en el catalogo para recomendar. Si quieres, actualizo catalogo y te cotizo enseguida.";
        }

        handledByRecommendation = true;
        billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
      } catch (recErr: any) {
        console.warn("[evolution-webhook] recommendation_failed", recErr?.message || recErr);
      }
    }

    if (!handledByGreeting && !handledByInventory && !handledByHistory && !handledByPricing && !handledByRecommendation && (isTechnicalSheetIntent(inbound.text) || isProductImageIntent(inbound.text))) {
      try {
        const products = await fetchCatalogRows("id,name,product_url,image_url,datasheet_url,specs_text,source_payload", 120, false);

        const list = Array.isArray(products) ? products : [];
        const matched = pickBestCatalogProduct(inbound.text, list as any);

        if (!matched?.name) {
          const sample = list.slice(0, 8).map((p: any) => String(p?.name || "").trim()).filter(Boolean);
          if (sample.length) {
            const top = sample.slice(0, 5);
            const more = Math.max(0, sample.length - top.length);
            reply = [
              "Claro. Para enviarte la ficha técnica o imagen necesito el producto exacto.",
              "",
              "Opciones disponibles:",
              ...top.map((s) => `- ${s}`),
              ...(more > 0 ? [`- y ${more} más`] : []),
              "",
              "Escríbeme solo el nombre exacto del producto.",
            ].join("\n");
          } else {
            reply = "Ahora mismo no encuentro productos activos en catálogo para enviarte ficha técnica.";
          }
        } else {
          const wantsSheet = isTechnicalSheetIntent(inbound.text);
          const wantsImage = isProductImageIntent(inbound.text);
          const payload = matched?.source_payload && typeof matched.source_payload === "object" ? matched.source_payload : {};
          const payloadPdfLinks = Array.isArray((payload as any)?.pdf_links) ? (payload as any).pdf_links : [];

          if (wantsSheet) {
            const productUrlAsPdf = /\.pdf(\?|$)/i.test(String((matched as any)?.product_url || "")) ? String((matched as any)?.product_url || "") : "";
            const datasheetUrl = String((matched as any)?.datasheet_url || payloadPdfLinks[0] || productUrlAsPdf || "").trim();
            if (datasheetUrl) {
              const remote = await fetchRemoteFileAsBase64(datasheetUrl);
              if (remote) {
                technicalDocs.push({
                  kind: "document",
                  base64: remote.base64,
                  mimetype: remote.mimetype || "application/pdf",
                  fileName: safeFileName(remote.fileName, `ficha-${String((matched as any)?.name || "producto")}`, "pdf"),
                  caption: `Ficha técnica - ${String((matched as any)?.name || "producto")}`,
                });
              }
            }
          }

          if (wantsImage) {
            const imageUrl = String((matched as any)?.image_url || "").trim();
            if (imageUrl) {
              const remote = await fetchRemoteFileAsBase64(imageUrl);
              if (remote) {
                technicalDocs.push({
                  kind: "image",
                  base64: remote.base64,
                  mimetype: remote.mimetype || "image/jpeg",
                  fileName: safeFileName(remote.fileName, `imagen-${String((matched as any)?.name || "producto")}`, "jpg"),
                  caption: `Imagen - ${String((matched as any)?.name || "producto")}`,
                });
              }
            }
          }

          const specs = String((matched as any)?.specs_text || "").replace(/\s+/g, " ").trim();
          const briefSpecs = specs ? toReadableBulletList(specs.slice(0, 700), 4) : "";
          const productUrl = String((matched as any)?.product_url || "").trim();

          if (technicalDocs.length) {
            reply = [
              `Perfecto. Ya te envío por este WhatsApp la información técnica de ${String((matched as any)?.name || "ese producto")}.`,
              ...(briefSpecs ? ["", "Resumen técnico:", briefSpecs] : []),
            ].join("\n");
          } else if (briefSpecs) {
            reply = [
              `Te comparto la ficha técnica de ${String((matched as any)?.name || "ese producto")}:`,
              "",
              briefSpecs,
              ...(productUrl ? ["", `Más detalle: ${productUrl}`] : []),
            ].join("\n");
          } else {
            reply = `No tengo el archivo de ficha técnica listo para ${String((matched as any)?.name || "ese producto")} en este momento, pero sí su enlace: ${productUrl || "no disponible"}. Si quieres, te ayudo a cotizarlo de una vez.`;
          }
        }

        handledByTechSheet = true;
        billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
      } catch (techErr: any) {
        console.warn("[evolution-webhook] tech_sheet_failed", techErr?.message || techErr);
      }
    }

    if (!handledByGreeting && !handledByInventory && !handledByHistory && !handledByPricing && !handledByRecommendation && !handledByTechSheet && isQuoteRecallIntent(inbound.text)) {
      try {
        const { data: recentDrafts } = await supabase
          .from("agent_quote_drafts")
          .select("id,product_name,base_price_usd,trm_rate,total_cop,status,payload,customer_phone,customer_name,customer_email,company_name,notes,created_at")
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
          const qty = Math.max(1, Number((lastDraft as any)?.payload?.quantity || 1));
          reply = `Si, claro. Tu ultima cotizacion fue del producto ${String(lastDraft.product_name || "")}, cantidad ${qty}, total COP ${formatMoney(Number(lastDraft.total_cop || 0))} con TRM ${formatMoney(Number(lastDraft.trm_rate || 0))}.`;

          if (shouldResendPdf(inbound.text)) {
            const pdfBase64 = buildQuotePdf({
              draftId: String(lastDraft.id),
              companyName: String((lastDraft as any).company_name || "Avanza Balanzas"),
              customerName: String((lastDraft as any).customer_name || inbound.pushName || ""),
              customerEmail: String((lastDraft as any).customer_email || ""),
              customerPhone: String((lastDraft as any).customer_phone || inbound.from),
              productName: String((lastDraft as any).product_name || ""),
              quantity: qty,
              basePriceUsd: Number((lastDraft as any).base_price_usd || 0),
              trmRate: Number((lastDraft as any).trm_rate || 0),
              totalCop: Number((lastDraft as any).total_cop || 0),
              notes: String((lastDraft as any).notes || ""),
            });
            resendPdf = {
              draftId: String(lastDraft.id),
              fileName: `cotizacion-${String(lastDraft.id).slice(0, 8)}.pdf`,
              pdfBase64,
            };
            reply += " Te reenvio el PDF ahora mismo por este chat.";
          } else {
            reply += " Si quieres, escribe 'reenviar PDF' y te lo mando de nuevo ahora.";
          }
        } else {
          reply = "Por ahora no encuentro una cotizacion previa asociada a este numero. Si quieres, te genero una nueva de inmediato.";
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
    const resumeQuoteFromContext =
      isContactInfoBundle(inbound.text) &&
      shouldAutoQuote(`${recentUserContext}\n${inbound.text}`);

    if (!handledByGreeting && !handledByInventory && !handledByHistory && !handledByPricing && !handledByRecommendation && !handledByTechSheet && !handledByRecall && (shouldAutoQuote(inbound.text) || resumeQuoteFromContext)) {
      try {
        const products = await fetchCatalogRows("id,name,brand,category,base_price_usd,price_currency", 80, true);

        const quoteSourceText = resumeQuoteFromContext ? `${recentUserContext}\n${inbound.text}` : inbound.text;
        const matchedProduct = pickBestCatalogProduct(quoteSourceText, products || []);
        const pricedProducts = Array.isArray(products) ? products : [];
        const wantsMulti = isMultiProductQuoteIntent(quoteSourceText);
        const selectedProducts = wantsMulti
          ? pricedProducts.slice(0, 3)
          : matchedProduct
            ? [matchedProduct]
            : [];

        if (selectedProducts.length) {
          const transcript = Array.isArray(existingConv?.transcript) ? existingConv.transcript : [];
          const latestUserLines = transcript
            .filter((m: any) => m?.role === "user" && m?.content)
            .slice(-8)
            .map((m: any) => String(m.content || ""));
          const combinedUserContext = `${latestUserLines.join("\n")}\n${inbound.text}`;

          const defaultQuantity = extractQuantity(quoteSourceText);
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

          const customerEmail = extractEmail(combinedUserContext);
          const customerName = extractCustomerName(combinedUserContext, inbound.pushName || "");
          const customerPhone = extractCustomerPhone(combinedUserContext, inbound.from);

          const missingFields: string[] = [];
          if (!isPresent(customerName)) missingFields.push("nombre completo");
          if (!isPresent(customerEmail)) missingFields.push("correo");
          if (!isPresent(customerPhone)) missingFields.push("telefono");

          if (missingFields.length) {
            reply = `Para enviarte la cotizacion en PDF sin campos vacios, me faltan estos datos: ${missingFields.join(", ")}. Enviamelos en un solo mensaje (ejemplo: Nombre: ..., Correo: ..., Telefono: ...).`;
            handledByQuoteIntake = true;
            billedTokens = Math.max(1, Math.min(500, estimateTokens(reply)));
          }

          if (!missingFields.length && !handledByQuoteIntake) {
            const trm = await getOrFetchTrm(supabase, ownerId, (agent as any)?.tenant_id || null);
            const trmRate = Number(trm?.rate || 0);

            if (trmRate > 0) {
              for (const selected of selectedProducts) {
                const quantity =
                  Number(perProductQty[String((selected as any).id)]) ||
                  (uniformHint ? defaultQuantity : 0) ||
                  defaultQuantity ||
                  1;
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
                reply = `Listo. Ya genere tu cotizacion para ${String((selectedProducts[0] as any)?.name || "el producto")} (cantidad ${q1}) con la TRM de hoy. Te envio el PDF en este chat ahora mismo.`;
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

    if (!autoQuoteDocs.length && !handledByGreeting && !handledByRecall && !handledByTechSheet && !handledByInventory && !handledByHistory && !handledByPricing && !handledByRecommendation && !handledByQuoteIntake) {
      const catalogRows = await fetchCatalogRows("name,brand,category", 80, false);

      const catalogNames = Array.isArray(catalogRows)
        ? catalogRows
            .map((r: any) => `${String(r?.name || "").trim()}${r?.brand ? ` (marca ${String(r.brand).trim()})` : ""}`.trim())
            .filter(Boolean)
        : [];

      const systemPrompt = [
        `Eres ${String(cfg?.identity_name || agent.name || "asistente")}.`,
        String(cfg?.purpose || agent.description || "Asistente virtual"),
        String(cfg?.company_desc || ""),
        String(cfg?.system_prompt || cfg?.important_instructions || ""),
        "Responde en espanol claro y profesional, con mensajes cortos de WhatsApp.",
        "Regla estricta de canal: toda entrega de informacion, fichas tecnicas, imagenes y cotizaciones debe ser por este mismo WhatsApp; no ofrecer envio por correo salvo que el cliente lo pida explicitamente.",
        "Regla estricta: solo puedes mencionar, recomendar o cotizar productos presentes en el catalogo cargado abajo. Si el usuario pide algo fuera de catalogo, dilo explicitamente y pide elegir un producto existente.",
        "Nunca afirmes vender carros/vehiculos; solo equipos de pesaje/laboratorio del catalogo.",
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
        max_tokens: 280,
        messages: allMessages as any,
      });

      reply = String(completion.choices?.[0]?.message?.content || "").trim() || "No tengo una respuesta en este momento.";

      const lcReply = normalizeText(reply);
      if (
        lcReply.includes("no puedo enviar archivos") ||
        lcReply.includes("no puedo enviar cotizaciones completas por este medio") ||
        lcReply.includes("solo puedo enviarla a tu correo")
      ) {
        reply = "Si puedo enviarte la cotizacion por este WhatsApp en PDF. Si me confirmas producto(s), cantidad y datos de contacto, la genero y te la envio por aqui.";
      }

      usageTotal = Math.max(0, Number(completion.usage?.total_tokens || 0));
      usageCompletion = Math.max(0, Number(completion.usage?.completion_tokens || 0));
      billedTokens = Math.max(1, Math.min(500, usageCompletion || estimateTokens(reply)));
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
        } else {
          await evolutionService.sendDocument(outboundInstance, sentTo, {
            base64: resendPdf!.pdfBase64,
            fileName: resendPdf!.fileName,
            caption: `Cotizacion preliminar ${resendPdf!.fileName}`,
            mimetype: "application/pdf",
          });
        }
      } catch (pdfErr: any) {
        console.warn("[evolution-webhook] auto_quote_pdf_send_failed", pdfErr?.message || pdfErr);
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
          } else {
            await evolutionService.sendDocument(outboundInstance, sentTo, {
              base64: doc.base64,
              fileName: doc.fileName,
              caption: doc.caption || "Información técnica",
              mimetype: doc.mimetype || "application/pdf",
            });
          }
        }
      } catch (techDocErr: any) {
        console.warn("[evolution-webhook] technical_doc_send_failed", techDocErr?.message || techDocErr);
      }
    }

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
      await persistConversationTurn(supabase as any, {
        agentId: String(agent.id),
        ownerId,
        tenantId: (agent as any)?.tenant_id || null,
        from: inbound.from,
        pushName: inbound.pushName,
        inboundText: inbound.text,
        outboundText: reply,
        messageId: inbound.messageId,
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

    return NextResponse.json({ ok: true, sent: true });
  } catch (e: any) {
    console.error("[evolution-webhook] error", e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message || "Error en webhook Evolution" }, { status: 500 });
  }
}
