import { handleWebhookTurn } from "../core";
import { runWebhookV2Pipeline } from "./pipeline";
import {
  WEBHOOK_V2_CANARY_PERCENT,
  WEBHOOK_V2_ENGINE_ENABLED,
  WEBHOOK_V2_FORCE_ENGINE,
} from "../config/rollout";

function normalizeText(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function simpleHashPercent(value: string): number {
  const src = String(value || "").trim();
  if (!src) return 0;
  let hash = 0;
  for (let i = 0; i < src.length; i += 1) {
    hash = (hash * 31 + src.charCodeAt(i)) >>> 0;
  }
  return hash % 100;
}

async function extractRolloutKey(req: Request): Promise<string> {
  const fromHeader = String(req.headers.get("x-botz-rollout-key") || "").trim();
  if (fromHeader) return fromHeader;
  try {
    const clone = req.clone();
    const body = await clone.json().catch(() => null);
    const inbound = body && typeof body === "object" ? body : {};
    const candidates = [
      (inbound as any)?.from,
      (inbound as any)?.phone,
      (inbound as any)?.remoteJid,
      (inbound as any)?.data?.key?.remoteJid,
    ];
    const key = candidates.map((v) => String(v || "").trim()).find(Boolean) || "";
    return key;
  } catch {
    return "";
  }
}

async function pickEngine(req: Request): Promise<"legacy" | "engine"> {
  if (WEBHOOK_V2_FORCE_ENGINE === "legacy") return "legacy";
  if (WEBHOOK_V2_FORCE_ENGINE === "engine") return "engine";
  if (!WEBHOOK_V2_ENGINE_ENABLED) return "legacy";
  if (WEBHOOK_V2_CANARY_PERCENT >= 100) return "engine";
  if (WEBHOOK_V2_CANARY_PERCENT <= 0) return "legacy";

  const key = await extractRolloutKey(req);
  const normalized = normalizeText(key);
  const bucket = simpleHashPercent(normalized || "default");
  return bucket < WEBHOOK_V2_CANARY_PERCENT ? "engine" : "legacy";
}

export async function handleConversationEngineTurn(req: Request) {
  const engine = await pickEngine(req);
  if (engine === "legacy") return handleWebhookTurn(req);
  return runWebhookV2Pipeline(req);
}

export const POST = handleConversationEngineTurn;
