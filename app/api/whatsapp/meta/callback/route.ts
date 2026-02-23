import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "crypto";
import OpenAI from "openai";
import { revealConfig } from "@/app/api/_utils/secret-config";
import { checkEntitlementAccess, consumeEntitlementCredits, logUsageEvent } from "@/app/api/_utils/entitlement";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const META_APP_SECRET = process.env.META_APP_SECRET;

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

function estimateTokens(text: string) {
  return Math.max(1, Math.ceil(String(text || "").length / 4));
}

function normalizeBrainFiles(raw: any): { name: string; content: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((f) => ({ name: String(f?.name || "Documento").trim() || "Documento", content: String(f?.content || "").trim() }))
    .filter((f) => f.content.length > 0)
    .slice(0, 8);
}

function buildDocumentContext(message: string, files: { name: string; content: string }[]) {
  if (!files.length) return "";
  const terms = Array.from(new Set(
    String(message || "")
      .toLowerCase()
      .split(/[^a-z0-9áéíóúñü]+/i)
      .map((t) => t.trim())
      .filter((t) => t.length >= 4)
  )).slice(0, 8);

  const ranked = files
    .map((f) => {
      const lc = f.content.toLowerCase();
      const score = terms.reduce((acc, t) => (lc.includes(t) ? acc + 1 : acc), 0);
      return { ...f, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  return ranked
    .map((f) => {
      const snippet = f.content.slice(0, 1800);
      return `\n--- ${f.name} ---\n${snippet}`;
    })
    .join("\n");
}

async function sendMetaTextMessage(token: string, phoneId: string, to: string, text: string) {
  const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(phoneId)}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(String(j?.error?.message || "Meta send failed"));
  }
}

async function resolveMetaChannelByPhoneId(phoneId: string) {
  const { data } = await supabaseAdmin
    .from("agent_channel_connections")
    .select("id,created_by,assigned_agent_id,channel_type,provider,status,config")
    .eq("provider", "meta")
    .eq("channel_type", "whatsapp")
    .eq("status", "connected");

  const rows = Array.isArray(data) ? data : [];
  for (const row of rows as any[]) {
    const cfg = revealConfig(row?.config || {});
    if (String(cfg?.phone_number_id || "") === String(phoneId)) {
      return { row, cfg };
    }
  }
  return null;
}

async function markMetaWebhookSeen(channelId: string) {
  const { data } = await supabaseAdmin
    .from("agent_channel_connections")
    .select("config")
    .eq("id", channelId)
    .maybeSingle();

  const currentCfg = data?.config && typeof data.config === "object" ? data.config : {};
  const nextCfg = {
    ...currentCfg,
    __meta_last_inbound_at: new Date().toISOString(),
    __meta_webhook_verified: true,
  };

  await supabaseAdmin
    .from("agent_channel_connections")
    .update({ config: nextCfg, status: "connected", updated_at: new Date().toISOString() })
    .eq("id", channelId);
}

async function generateAgentAnswer(agent: any, userText: string) {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const cfg = (agent?.configuration || {}) as any;
  const docs = buildDocumentContext(userText, normalizeBrainFiles(cfg?.brain?.files));
  const prompt = [
    `Eres ${String(cfg?.identity_name || agent?.name || "asistente")}.`,
    String(cfg?.purpose || agent?.description || "Asistente virtual"),
    String(cfg?.company_desc || ""),
    String(cfg?.system_prompt || cfg?.important_instructions || ""),
    "Responde por WhatsApp en espanol, breve, clara y profesional.",
    "Si no tienes certeza, dilo sin inventar.",
    docs ? `Documentos:\n${docs}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    max_tokens: 260,
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: userText },
    ] as any,
  });

  const answer = String(completion.choices?.[0]?.message?.content || "").trim() || "Gracias por escribirnos. Te respondo en breve.";
  const tokens = Number(completion.usage?.total_tokens || 0) || estimateTokens(userText + answer);
  return { answer, tokens };
}

/**
 * Verifies X-Hub-Signature-256 header from Meta webhooks
 * Returns true if signature is valid, false otherwise
 */
function verifyMetaSignature(payload: string, signatureHeader: string | null): boolean {
  if (!META_APP_SECRET) {
    console.error("META_APP_SECRET not configured");
    return false;
  }

  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false;
  }

  const receivedSignature = signatureHeader.slice(7); // Remove "sha256=" prefix
  
  const hmac = createHmac("sha256", META_APP_SECRET);
  hmac.update(payload);
  const expectedSignature = hmac.digest("hex");

  try {
    // Timing-safe comparison to prevent timing attacks
    const receivedBuf = Buffer.from(receivedSignature, "hex");
    const expectedBuf = Buffer.from(expectedSignature, "hex");
    
    if (receivedBuf.length !== expectedBuf.length) {
      return false;
    }
    
    return timingSafeEqual(receivedBuf, expectedBuf);
  } catch {
    return false;
  }
}

// ✅ 1) Meta Webhook Verification (GET)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode !== "subscribe" || !token || !challenge) {
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }

  // Legacy table
  const { data } = await supabaseAdmin
    .from("whatsapp_connections")
    .select("tenant_id")
    .eq("provider", "meta")
    .eq("meta_verify_token", token)
    .limit(1)
    .maybeSingle();

  if (data?.tenant_id) {
    return new NextResponse(challenge, { status: 200 });
  }

  // New channel table
  const { data: channelRows } = await supabaseAdmin
    .from("agent_channel_connections")
    .select("id,config")
    .eq("provider", "meta")
    .eq("channel_type", "whatsapp");

  const rows = Array.isArray(channelRows) ? channelRows : [];
  const match = rows.find((r: any) => {
    const cfg = revealConfig(r?.config || {});
    return String(cfg?.verify_token || "") === token;
  });

  if (!match) {
    return NextResponse.json({ error: "Invalid verify token" }, { status: 403 });
  }

  try {
    const currentCfg = (match as any)?.config && typeof (match as any).config === "object" ? (match as any).config : {};
    const nextCfg = {
      ...currentCfg,
      __meta_webhook_verified_at: new Date().toISOString(),
      __meta_webhook_verified: true,
    };
    await supabaseAdmin
      .from("agent_channel_connections")
      .update({ config: nextCfg, status: "connected", updated_at: new Date().toISOString() })
      .eq("id", (match as any).id);
  } catch (e) {
    console.warn("meta webhook verification marker failed", e);
  }

  return new NextResponse(challenge, { status: 200 });
}

// ✅ 2) Eventos entrantes (POST)
export async function POST(req: NextRequest) {
  try {
    // Read raw body for signature verification
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");

    // Verify signature to ensure request is from Meta
    if (!verifyMetaSignature(rawBody, signature)) {
      console.warn("Invalid X-Hub-Signature-256 - possible spoofed request");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Parse JSON only after signature verification
    const body = JSON.parse(rawBody);

    // phone_number_id para mapear el canal
    const phoneId =
      body?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id || null;

    if (!phoneId) return NextResponse.json({ ok: true });

    const incoming = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    const from = String(incoming?.from || "").trim();
    const userText = String(incoming?.text?.body || "").trim();
    if (!from || !userText) return NextResponse.json({ ok: true });

    const channel = await resolveMetaChannelByPhoneId(String(phoneId));
    if (!channel?.row) {
      return NextResponse.json({ ok: true, warning: "channel_not_found" });
    }

    await markMetaWebhookSeen(String((channel.row as any).id));

    const ownerId = String((channel.row as any).created_by || "").trim();
    const agentId = String((channel.row as any).assigned_agent_id || "").trim();
    if (!ownerId || !agentId) {
      return NextResponse.json({ ok: true, warning: "channel_without_agent" });
    }

    const token = String((channel.cfg as any)?.permanent_token || (channel.cfg as any)?.access_token || "").trim();
    if (!token) {
      return NextResponse.json({ ok: true, warning: "missing_meta_token" });
    }

    const access = await checkEntitlementAccess(supabaseAdmin as any, ownerId);
    if (!access.ok) {
      await sendMetaTextMessage(token, String(phoneId), from, "Tu agente no tiene creditos disponibles en este momento. Intenta mas tarde.");
      return NextResponse.json({ ok: true, warning: "credits_blocked" });
    }

    const { data: agent } = await supabaseAdmin
      .from("ai_agents")
      .select("id,name,description,configuration")
      .eq("id", agentId)
      .eq("created_by", ownerId)
      .maybeSingle();

    if (!agent) {
      return NextResponse.json({ ok: true, warning: "assigned_agent_not_found" });
    }

    const { answer, tokens } = await generateAgentAnswer(agent, userText);
    await sendMetaTextMessage(token, String(phoneId), from, answer);

    const burn = await consumeEntitlementCredits(supabaseAdmin as any, ownerId, tokens);
    if (!burn.ok) {
      // No interrumpimos webhook; solo dejamos trazabilidad.
      console.warn("credits consume failed", burn);
    }

    await logUsageEvent(supabaseAdmin as any, ownerId, Math.max(1, tokens), {
      endpoint: "/api/whatsapp/meta/callback",
      action: "whatsapp_inbound_reply",
      metadata: { channel_id: (channel.row as any).id, agent_id: agentId, from },
    });

    return NextResponse.json({ ok: true, channel_id: (channel.row as any).id, agent_id: agentId });
  } catch (error) {
    console.error("Error processing Meta webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
