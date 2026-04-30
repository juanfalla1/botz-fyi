export const WEBHOOK_V2_RUNTIME = "nodejs" as const;
export const WEBHOOK_V2_DYNAMIC = "force-dynamic" as const;

export const ENABLE_STRICT_WHATSAPP_MODE =
  String(process.env.WHATSAPP_STRICT_MODE || "true").toLowerCase() !== "false";

export const MAX_WHATSAPP_DOC_BYTES = Number(process.env.WHATSAPP_DOC_MAX_BYTES || 8 * 1024 * 1024);
