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
  const base = String(raw || "").split(":")[0].split("@")[0];
  const digits = base.replace(/\D/g, "");
  return digits;
}

function pickBestPhone(candidates: any[]): string {
  const raws = candidates.map((v) => String(v || "").trim()).filter(Boolean);
  if (!raws.length) return "";

  const jidPreferred = raws.find((v) => /@s\.whatsapp\.net$/i.test(v) || /@c\.us$/i.test(v));
  if (jidPreferred) return normalizePhone(jidPreferred);

  const parsed = raws.map((v) => normalizePhone(v)).filter(Boolean);
  const medium = parsed.find((n) => n.length >= 10 && n.length <= 13);
  if (medium) return medium;

  const long = parsed.find((n) => n.length >= 14 && n.length <= 15);
  return long || parsed[0] || "";
}

function preferredInboundPhone(payload: any, item: any): string {
  const key = item?.key || {};

  const firstChoice = pickBestPhone([
    item?.sender,
    payload?.sender,
    item?.from,
    payload?.from,
    item?.jid,
    payload?.jid,
  ]);
  if (firstChoice) return firstChoice;

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
  alternates?: string[];
  text: string;
  pushName?: string;
  messageId?: string;
  source?: string;
};

function inboundPhoneCandidates(payload: any, item: any): string[] {
  const key = item?.key || {};

  const candidates = [
    item?.sender,
    payload?.sender,
    item?.from,
    payload?.from,
    item?.jid,
    payload?.jid,
    key?.remoteJid,
    item?.data?.key?.remoteJid,
    payload?.data?.key?.remoteJid,
    key?.participant,
    item?.data?.key?.participant,
    payload?.data?.key?.participant,
  ]
    .map((v) => normalizePhone(String(v || "")))
    .filter((n) => n.length >= 10 && n.length <= 13);

  return Array.from(new Set(candidates));
}

function extractInbound(payload: any): InboundEvent | null {
  const event = String(payload?.event || payload?.type || payload?.eventName || "").toLowerCase();
  const hasUpsertEvent = /messages?[._-]?upsert/.test(event);

  const instance = String(
    payload?.instance || payload?.instanceName || payload?.data?.instance || payload?.data?.instanceId || ""
  ).trim();

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
    const source = String(item?.source || item?.data?.source || payload?.data?.source || payload?.source || "").toLowerCase();
    if (source === "api" || source === "outbound" || source === "server") continue;

    const fromMe = boolish(key?.fromMe ?? item?.fromMe ?? item?.data?.key?.fromMe);
    if (fromMe) continue;

    const orderedCandidates = inboundPhoneCandidates(payload, item);
    const preferred = String(preferredInboundPhone(payload, item)).trim();
    const remoteJid = preferred && preferred.length >= 10 && preferred.length <= 13
      ? preferred
      : (orderedCandidates[0] || "");
    if (!remoteJid) continue;

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

    const pushName = String(item?.pushName || item?.data?.pushName || payload?.data?.pushName || "").trim();
    const messageId = String(key?.id || item?.id || item?.data?.key?.id || "").trim();

    return {
      instance,
      from,
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

export async function POST(req: Request) {
  try {
    console.log("[evolution-webhook] --- WEBHOOK ENTRY ---", { time: new Date().toISOString() });

    const payload = await req.json().catch(() => ({}));
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

    let channel = (channels || []).find((row: any) => String(row?.config?.evolution_instance_name || "") === inbound.instance);
    if (!channel && (channels || []).length === 1) {
      channel = (channels || [])[0];
    }
    if (!channel) {
      console.warn("[evolution-webhook] ignored: channel_not_found", { instance: inbound.instance });
      return NextResponse.json({ ok: true, ignored: true, reason: "channel_not_found" });
    }

    const selfPhone = normalizePhone(
      String(
        channel?.config?.phone ||
        channel?.config?.number ||
        channel?.config?.owner ||
        channel?.config?.wid ||
        channel?.config?.me ||
        ""
      )
    );

    console.log("[evolution-webhook] channel debug", {
      instance: inbound.instance,
      selfPhone,
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
    const usageTotal = Math.max(0, Number(completion.usage?.total_tokens || 0));
    const usageCompletion = Math.max(0, Number(completion.usage?.completion_tokens || 0));
    // Para WhatsApp cobramos solo salida del modelo y con tope por turno,
    // evitando bloquear una respuesta por prompts/documentos largos de entrada.
    const billedTokens = Math.max(
      1,
      Math.min(500, usageCompletion || estimateTokens(reply))
    );

    const burn = await consumeEntitlementCredits(supabase as any, ownerId, billedTokens);
    if (!burn.ok) {
      console.warn("[evolution-webhook] ignored: credits_blocked", {
        code: burn.code,
        ownerId,
        billedTokens,
        usageTotal,
        usageCompletion,
      });
      return NextResponse.json({ ok: true, ignored: true, reason: burn.code || "credits_blocked" });
    }

    const outboundInstance = String((channel as any)?.config?.evolution_instance_name || inbound.instance || "");
    if (!outboundInstance) {
      console.warn("[evolution-webhook] ignored: instance_missing", { inboundInstance: inbound.instance || null });
      return NextResponse.json({ ok: true, ignored: true, reason: "instance_missing" });
    }

    const toCandidates = [inbound.from, ...(inbound.alternates || [])]
      .map((n) => normalizePhone(String(n || "")))
      .filter((n, i, arr) => n && arr.indexOf(n) === i)
      .filter((n) => n !== selfPhone);

    console.log("[evolution-webhook] routing debug", {
      inboundFrom: inbound.from,
      alternates: inbound.alternates || [],
      selfPhone,
      toCandidates,
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
      console.warn("[evolution-webhook] ignored: invalid_destination", { to: inbound.from, alternates: inbound.alternates || [] });
      return NextResponse.json({ ok: true, ignored: true, reason: "invalid_destination" });
    }
    console.info("[evolution-webhook] reply sent", { channelId: (channel as any)?.id, agentId: agent.id, to: sentTo });

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
      action: "whatsapp_evolution_turn",
      metadata: {
        agent_id: agent.id,
        llm_tokens_total: usageTotal,
        llm_tokens_completion: usageCompletion,
        llm_tokens_billed: billedTokens,
        channel: "whatsapp_evolution",
      },
    });

    return NextResponse.json({ ok: true, sent: true });
  } catch (e: any) {
    console.error("[evolution-webhook] error", e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message || "Error en webhook Evolution" }, { status: 500 });
  }
}
