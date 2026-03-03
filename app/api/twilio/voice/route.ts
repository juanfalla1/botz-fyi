import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/app/api/_utils/supabase";

export const runtime = "nodejs";

function twiml(xmlBody: string) {
  return new NextResponse(xmlBody, {
    status: 200,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function normalizePhone(raw: string) {
  return String(raw || "").replace(/\D/g, "");
}

function escapeXml(text: string) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function defaultGreeting() {
  return "Hola. Tu llamada ya esta conectada correctamente.";
}

async function resolveGreetingByDialedNumber(toNumber: string): Promise<{ greeting: string; voice: string; language: string }> {
  const supabase = getServiceSupabase();
  if (!supabase || !toNumber) {
    return { greeting: defaultGreeting(), voice: "alice", language: "es-ES" };
  }

  const { data: numbers } = await supabase
    .from("agent_phone_numbers")
    .select("id,assigned_agent_id,phone_number_e164")
    .eq("provider", "twilio")
    .limit(500);

  const matchedNumber = (numbers || []).find((n: any) => normalizePhone(String(n?.phone_number_e164 || "")) === toNumber);

  let channel: any = null;
  if (matchedNumber?.id) {
    const { data: channelRows } = await supabase
      .from("agent_channel_connections")
      .select("id,assigned_agent_id,config,status")
      .eq("channel_type", "voice")
      .eq("provider", "twilio")
      .eq("phone_number_id", String(matchedNumber.id))
      .order("updated_at", { ascending: false })
      .limit(1);
    channel = (channelRows || [])[0] || null;
  }

  const assignedAgentId = String(channel?.assigned_agent_id || matchedNumber?.assigned_agent_id || "").trim();
  let agent: any = null;
  if (assignedAgentId) {
    const { data: row } = await supabase
      .from("ai_agents")
      .select("id,name,configuration,voice_settings,status")
      .eq("id", assignedAgentId)
      .maybeSingle();
    agent = row || null;
  }

  const cfg = (agent?.configuration && typeof agent.configuration === "object") ? agent.configuration : {};
  const channelCfg = (channel?.config && typeof channel.config === "object") ? channel.config : {};
  const identity = String(cfg?.identity_name || agent?.name || "asistente virtual").trim();
  const company = String(cfg?.company_name || cfg?.company || "").trim();
  const greeting = String(
    channelCfg?.voice_greeting ||
    cfg?.voice_greeting ||
    cfg?.call_greeting ||
    cfg?.greeting ||
    (company ? `Hola, te habla ${identity} de ${company}. Tu llamada ya esta conectada.` : `Hola, te habla ${identity}. Tu llamada ya esta conectada.`)
  ).trim();

  const language = String(channelCfg?.twilio_language || cfg?.language || "es-ES").trim() || "es-ES";
  const voice = String(channelCfg?.twilio_voice || "alice").trim() || "alice";

  return {
    greeting: greeting || defaultGreeting(),
    voice,
    language,
  };
}

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const to = normalizePhone(String(form?.get("To") || ""));
  const { greeting, voice, language } = await resolveGreetingByDialedNumber(to);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="${escapeXml(language)}" voice="${escapeXml(voice)}">${escapeXml(greeting)}</Say>
</Response>`;
  return twiml(xml);
}

// (Opcional) Twilio a veces prueba con GET
export async function GET() {
  const { greeting, voice, language } = await resolveGreetingByDialedNumber("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="${escapeXml(language)}" voice="${escapeXml(voice)}">${escapeXml(greeting)}</Say>
</Response>`;
  return twiml(xml);
}
