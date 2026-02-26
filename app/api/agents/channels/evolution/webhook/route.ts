import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getServiceSupabase } from "@/app/api/_utils/supabase";
import { checkEntitlementAccess, consumeEntitlementCredits, logUsageEvent } from "@/app/api/_utils/entitlement";
import { evolutionService } from "../../../../../../lib/services/evolution.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function estimateTokens(text: string) {
  return Math.max(1, Math.ceil(String(text || "").length / 4));
}

function normalizePhone(raw: string) {
  const digits = String(raw || "").replace(/\D/g, "");
  return digits;
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

function extractInbound(payload: any): { instance: string; from: string; text: string } | null {
  const event = String(payload?.event || payload?.type || payload?.eventName || "").toLowerCase();
  const hasUpsertEvent = /messages?[._-]?upsert/.test(event);

  const instance = String(payload?.instance || payload?.instanceName || payload?.data?.instance || "").trim();

  if (
    !hasUpsertEvent &&
    !payload?.message &&
    !payload?.messages &&
    !payload?.data?.message &&
    !payload?.data?.messages
  ) {
    return null;
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
    const fromMe = boolish(key?.fromMe ?? item?.fromMe ?? item?.data?.key?.fromMe);
    if (fromMe) continue;

    const remoteJid = String(
      key?.remoteJid ||
        key?.participant ||
        item?.remoteJid ||
        item?.from ||
        item?.sender ||
        item?.participant ||
        item?.jid ||
        item?.data?.key?.remoteJid ||
        item?.data?.key?.participant ||
        item?.data?.from ||
        item?.data?.sender ||
        item?.data?.jid ||
        item?.message?.key?.remoteJid ||
        item?.message?.key?.participant ||
        payload?.data?.key?.remoteJid ||
        payload?.data?.key?.participant ||
        payload?.from ||
        payload?.sender ||
        payload?.jid ||
        ""
    ).trim();
    if (!remoteJid) continue;
    if (remoteJid.includes("status@broadcast") || remoteJid.endsWith("@g.us")) continue;

    const from = normalizePhone(String(remoteJid).split("@")[0] || "");
    const typeHint = String(item?.messageType || item?.data?.messageType || "").trim();
    const text = String(
      extractTextFromMessage(item?.message || item?.data?.message || item?.data || {}, typeHint) ||
      item?.text ||
      item?.body ||
      item?.content ||
      item?.data?.text ||
      item?.data?.body ||
      item?.data?.content ||
      payload?.text ||
      payload?.body ||
      ""
    ).trim();
    if (!from || !text) continue;

    return { instance, from, text };
  }

  return null;
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

export async function POST(req: Request) {
  try {
    const payload = await req.json().catch(() => ({}));
    const inbound = extractInbound(payload);
    if (!inbound) {
      const topKeys = Object.keys(payload || {}).slice(0, 12);
      const dataKeys = payload?.data && typeof payload.data === "object" ? Object.keys(payload.data).slice(0, 12) : [];
      console.warn("[evolution-webhook] ignored: no inbound payload match", {
        event: payload?.event || payload?.type || payload?.eventName || null,
        topKeys,
        dataKeys,
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

    let channel = (channels || []).find((row: any) => String(row?.config?.evolution_instance_name || "") === inbound.instance);
    if (!channel && (channels || []).length === 1) {
      channel = (channels || [])[0];
    }
    if (!channel) {
      console.warn("[evolution-webhook] ignored: channel_not_found", { instance: inbound.instance });
      return NextResponse.json({ ok: true, ignored: true, reason: "channel_not_found" });
    }
    if (!channel.assigned_agent_id) {
      console.warn("[evolution-webhook] ignored: agent_not_assigned", { channelId: (channel as any)?.id });
      return NextResponse.json({ ok: true, ignored: true, reason: "agent_not_assigned" });
    }

    const { data: agent, error: agentErr } = await supabase
      .from("ai_agents")
      .select("id,name,status,description,created_by,configuration")
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

    const systemPrompt = [
      `Eres ${String(cfg?.identity_name || agent.name || "asistente")}.`,
      String(cfg?.purpose || agent.description || "Asistente virtual"),
      String(cfg?.company_desc || ""),
      String(cfg?.system_prompt || cfg?.important_instructions || ""),
      "Responde en espanol claro y profesional, con mensajes cortos de WhatsApp.",
      "Si no tienes la informacion, dilo sin inventar.",
      docs,
    ]
      .filter(Boolean)
      .join("\n\n");

    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 280,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: inbound.text },
      ] as any,
    });

    const reply = String(completion.choices?.[0]?.message?.content || "").trim() || "No tengo una respuesta en este momento.";
    const tokens = Math.max(1, Number(completion.usage?.total_tokens || 0) || estimateTokens(inbound.text + reply));

    const burn = await consumeEntitlementCredits(supabase as any, ownerId, tokens);
    if (!burn.ok) return NextResponse.json({ ok: true, ignored: true, reason: burn.code || "credits_blocked" });

    const outboundInstance = String((channel as any)?.config?.evolution_instance_name || inbound.instance || "");
    if (!outboundInstance) {
      return NextResponse.json({ ok: true, ignored: true, reason: "instance_missing" });
    }

    await evolutionService.sendMessage(outboundInstance, inbound.from, reply);
    console.info("[evolution-webhook] reply sent", { channelId: (channel as any)?.id, agentId: agent.id });

    await logUsageEvent(supabase as any, ownerId, tokens, {
      endpoint: "/api/agents/channels/evolution/webhook",
      action: "whatsapp_evolution_turn",
      metadata: {
        agent_id: agent.id,
        llm_tokens: tokens,
        channel: "whatsapp_evolution",
      },
    });

    return NextResponse.json({ ok: true, sent: true });
  } catch (e: any) {
    console.error("[evolution-webhook] error", e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message || "Error en webhook Evolution" }, { status: 500 });
  }
}
