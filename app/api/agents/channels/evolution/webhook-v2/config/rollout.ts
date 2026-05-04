export type WebhookEngineMode = "legacy" | "engine" | "auto";

export const WEBHOOK_V2_FORCE_ENGINE: WebhookEngineMode = (() => {
  const raw = String(process.env.WEBHOOK_V2_FORCE_ENGINE || "auto").trim().toLowerCase();
  if (raw === "legacy" || raw === "engine" || raw === "auto") return raw;
  return "auto";
})();

export const WEBHOOK_V2_ENGINE_ENABLED =
  String(process.env.WEBHOOK_V2_ENGINE_ENABLED || "false").trim().toLowerCase() === "true";

export const WEBHOOK_V2_CANARY_PERCENT = (() => {
  const raw = Number(process.env.WEBHOOK_V2_CANARY_PERCENT || 0);
  if (!Number.isFinite(raw)) return 0;
  return Math.max(0, Math.min(100, Math.floor(raw)));
})();
