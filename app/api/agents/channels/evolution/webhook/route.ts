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

function extractTextFromMessage(msg: any): string {
  return String(
    msg?.conversation ||
      msg?.extendedTextMessage?.text ||
      msg?.imageMessage?.caption ||
      msg?.videoMessage?.caption ||
      msg?.documentMessage?.caption ||
      msg?.buttonsResponseMessage?.selectedDisplayText ||
      msg?.listResponseMessage?.title ||
      ""
  ).trim();
}

function extractInbound(payload: any): { instance: string; from: string; text: string } | null {
  const event = String(payload?.event || "").toLowerCase();
  if (!event.includes("messages.upsert") && !event.includes("message.upsert")) return null;

  const instance = String(payload?.instance || payload?.instanceName || payload?.data?.instance || "").trim();
  if (!instance) return null;

  const rawData = payload?.data;
  const candidates = Array.isArray(rawData)
    ? rawData
    : Array.isArray(rawData?.messages)
      ? rawData.messages
      : rawData
        ? [rawData]
        : [];

  for (const item of candidates) {
    const key = item?.key || {};
    const fromMe = Boolean(key?.fromMe || item?.fromMe);
    if (fromMe) continue;

    const remoteJid = String(key?.remoteJid || item?.remoteJid || "").trim();
    if (!remoteJid || remoteJid.includes("status@broadcast") || remoteJid.endsWith("@g.us")) continue;

    const from = normalizePhone(remoteJid.split("@")[0] || "");
    const text = extractTextFromMessage(item?.message || item?.data?.message || {});
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
    if (!inbound) return NextResponse.json({ ok: true, ignored: true });

    const supabase = getServiceSupabase();
    if (!supabase) return NextResponse.json({ ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });

    const { data: channels, error: chErr } = await supabase
      .from("agent_channel_connections")
      .select("id,assigned_agent_id,created_by,status,config")
      .eq("provider", "evolution")
      .eq("channel_type", "whatsapp");
    if (chErr) return NextResponse.json({ ok: false, error: chErr.message }, { status: 500 });

    const channel = (channels || []).find((row: any) => String(row?.config?.evolution_instance_name || "") === inbound.instance);
    if (!channel) return NextResponse.json({ ok: true, ignored: true, reason: "channel_not_found" });
    if (!channel.assigned_agent_id) return NextResponse.json({ ok: true, ignored: true, reason: "agent_not_assigned" });

    const { data: agent, error: agentErr } = await supabase
      .from("ai_agents")
      .select("id,name,status,description,created_by,configuration")
      .eq("id", String(channel.assigned_agent_id))
      .maybeSingle();
    if (agentErr) return NextResponse.json({ ok: false, error: agentErr.message }, { status: 500 });
    if (!agent || String(agent.status) !== "active") return NextResponse.json({ ok: true, ignored: true, reason: "agent_inactive" });

    const ownerId = String((agent as any).created_by || "").trim();
    if (!ownerId) return NextResponse.json({ ok: false, error: "Agente sin propietario" }, { status: 400 });

    const access = await checkEntitlementAccess(supabase as any, ownerId);
    if (!access.ok) return NextResponse.json({ ok: true, ignored: true, reason: access.code || "entitlement_blocked" });

    const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
    if (!apiKey) return NextResponse.json({ ok: false, error: "Missing OPENAI_API_KEY" }, { status: 500 });

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

    await evolutionService.sendMessage(inbound.instance, inbound.from, reply);

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
    return NextResponse.json({ ok: false, error: e?.message || "Error en webhook Evolution" }, { status: 500 });
  }
}
