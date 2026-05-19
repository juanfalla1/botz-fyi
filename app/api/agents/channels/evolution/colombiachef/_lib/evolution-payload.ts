export type InboundMessage = {
  instance: string;
  from: string;
  rawFrom: string;
  remoteJid: string;
  participant: string;
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
    msg?.buttonsResponseMessage?.selectedButtonId ||
      msg?.buttonsResponseMessage?.selectedDisplayText ||
      msg?.listResponseMessage?.singleSelectReply?.selectedRowId ||
      msg?.listResponseMessage?.singleSelectReply?.title ||
      msg?.listResponseMessage?.title ||
      msg?.templateButtonReplyMessage?.selectedId ||
      msg?.templateButtonReplyMessage?.selectedDisplayText ||
      msg?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson ||
      msg?.conversation ||
      msg?.extendedTextMessage?.text ||
      msg?.imageMessage?.caption ||
      msg?.videoMessage?.caption ||
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

  const remoteJid = String(key?.remoteJid || data?.remoteJid || "").trim();
  const participant = String(key?.participant || data?.participant || "").trim();

  const fromRaw = String(
    key?.remoteJid ||
      data?.remoteJid ||
      key?.participant ||
      data?.participant ||
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
    rawFrom: fromRaw,
    remoteJid,
    participant,
    text,
    messageId: String(key?.id || data?.id || "").trim(),
  };
}
