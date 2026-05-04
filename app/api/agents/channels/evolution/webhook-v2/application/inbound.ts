function normalizePhone(raw: string) {
  const base = String(raw || "").split(":")[0].split("@")[0];
  const digits = base.replace(/\D/g, "");
  if (raw.includes("@lid") && digits) return digits;
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

  const firstChoice = pickBestPhone([item?.from, payload?.from, item?.jid, payload?.jid]);
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
  for (let i = 0; i < 4; i += 1) {
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

export type InboundEvent = {
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

function inboundBusinessPhoneCandidates(inbound: InboundEvent): string[] {
  const values = [
    inbound.from,
    ...(Array.isArray(inbound.alternates) ? inbound.alternates : []),
    ...(Array.isArray(inbound.jidCandidates) ? inbound.jidCandidates : []),
  ];
  const parsed = values
    .map((v) => normalizePhone(String(v || "")))
    .filter((v) => v.length >= 10 && v.length <= 15);
  return Array.from(new Set(parsed));
}

export function resolveInboundCustomerPhone(inbound: InboundEvent): string {
  const candidates = inboundBusinessPhoneCandidates(inbound);
  const standard = candidates.find((v) => v.length >= 10 && v.length <= 12);
  return standard || candidates[0] || normalizePhone(inbound.from || "");
}

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

export function extractInbound(payload: any): InboundEvent | null {
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

  if (hasUpdateEvent && !payload?.data?.message && !payload?.data?.messages && !payload?.message) {
    const fromMe = payload?.data?.fromMe ?? payload?.fromMe;
    console.log("[evolution-webhook] messages.update check", {
      fromMe,
      hasMessage: !!payload?.data?.message,
      hasMessages: !!payload?.data?.messages,
      dataKeys: payload?.data ? Object.keys(payload.data) : [],
    });
    if (fromMe === true || fromMe === "true") {
      console.log("[evolution-webhook] ignoring delivery ACK");
      return null;
    }

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
    const remoteJid = preferred && preferred.length >= 10 && preferred.length <= 15 ? preferred : (orderedCandidates[0] || "");
    if (!remoteJid) continue;

    const from = normalizePhone(String(remoteJid).split("@")[0] || "");
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

export function summarizeInboundAttempt(payload: any) {
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
