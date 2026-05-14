export type InboundMessage = {
  instance: string;
  from: string;
  text: string;
  messageId: string;
};

function normalizePhone(raw: string): string {
  const base = String(raw || "").split(":")[0].split("@")[0];
  return base.replace(/\D/g, "");
}

function pickText(msg: any): string {
  if (!msg) return "";
  if (typeof msg === "string") return msg.trim();
  return String(
    msg?.conversation ||
      msg?.extendedTextMessage?.text ||
      msg?.imageMessage?.caption ||
      msg?.videoMessage?.caption ||
      msg?.buttonsResponseMessage?.selectedDisplayText ||
      msg?.listResponseMessage?.title ||
      ""
  ).trim();
}

export function parseInbound(payload: any): InboundMessage | null {
  const event = String(payload?.event || payload?.type || "").toLowerCase();
  if (!event.includes("message")) return null;

  const data = payload?.data || {};
  const key = data?.key || payload?.key || {};
  const fromMe = Boolean(key?.fromMe || data?.fromMe);
  if (fromMe) return null;

  const fromRaw = String(
    key?.remoteJid ||
      data?.remoteJid ||
      data?.from ||
      payload?.sender ||
      ""
  );
  const from = normalizePhone(fromRaw);
  const text = pickText(data?.message || payload?.message || data);
  if (!from || !text) return null;

  return {
    instance: String(payload?.instance || payload?.instanceName || data?.instance || "").trim(),
    from,
    text,
    messageId: String(key?.id || data?.id || "").trim(),
  };
}
