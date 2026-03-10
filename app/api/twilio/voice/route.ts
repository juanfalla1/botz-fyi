import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/app/api/_utils/supabase";
import OpenAI from "openai";

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

function shouldHangup(text: string) {
  const v = String(text || "").toLowerCase();
  return v.includes("adios") || v.includes("chao") || v.includes("gracias") || v.includes("hasta luego");
}

async function generateAiVoiceReply(args: { userText: string; identity: string; company: string }) {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) return "En este momento no tengo IA habilitada. Puedes dejar tus datos y te contactamos en breve.";

  try {
    const openai = new OpenAI({ apiKey });
    const identity = args.identity || "asistente virtual";
    const company = args.company || "la empresa";
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.5,
      max_tokens: 120,
      messages: [
        {
          role: "system",
          content:
            `Eres ${identity}, asistente telefonico de ${company}. Responde en espanol neutro, en 1-2 frases maximo, tono claro y profesional. Si piden agendar o cotizar, pide solo el dato minimo siguiente. No uses markdown ni listas.`,
        },
        { role: "user", content: args.userText },
      ],
    });
    const text = String(completion.choices?.[0]?.message?.content || "").trim();
    return text || "Perfecto, te ayudo con eso. Puedes contarme un poco mas para continuar.";
  } catch {
    return "Perfecto, te escucho. Cuentame que necesitas y te ayudo ahora mismo.";
  }
}

async function resolveGreetingByDialedNumber(toNumber: string): Promise<{ greeting: string; voice: string; language: string; identity: string; company: string }> {
  const supabase = getServiceSupabase();
  if (!supabase || !toNumber) {
    return { greeting: defaultGreeting(), voice: "Polly.Lupe", language: "es-MX", identity: "asistente virtual", company: "Botz" };
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

  const language = String(channelCfg?.twilio_language || cfg?.language || "es-MX").trim() || "es-MX";
  const voice = String(channelCfg?.twilio_voice || "Polly.Lupe").trim() || "Polly.Lupe";

  return {
    greeting: greeting || defaultGreeting(),
    voice,
    language,
    identity,
    company: company || "Botz",
  };
}

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const to = normalizePhone(String(form?.get("To") || ""));
  const speechResult = String(form?.get("SpeechResult") || "").trim();
  const { greeting, voice, language, identity, company } = await resolveGreetingByDialedNumber(to);

  if (speechResult) {
    if (shouldHangup(speechResult)) {
      const byeXml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="${escapeXml(language)}" voice="${escapeXml(voice)}">Gracias por tu tiempo. Te contactaremos pronto. Hasta luego.</Say>
  <Hangup/>
</Response>`;
      return twiml(byeXml);
    }

    const aiReply = await generateAiVoiceReply({ userText: speechResult, identity, company });
    const xmlTurn = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="${escapeXml(language)}" voice="${escapeXml(voice)}">${escapeXml(aiReply)}</Say>
  <Gather input="speech" speechTimeout="auto" action="/api/twilio/voice" method="POST" language="${escapeXml(language)}" speechModel="phone_call" timeout="5">
    <Say language="${escapeXml(language)}" voice="${escapeXml(voice)}">Te escucho.</Say>
  </Gather>
  <Say language="${escapeXml(language)}" voice="${escapeXml(voice)}">No logre escucharte. Hasta pronto.</Say>
  <Hangup/>
</Response>`;
    return twiml(xmlTurn);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="${escapeXml(language)}" voice="${escapeXml(voice)}">${escapeXml(greeting)}</Say>
  <Gather input="speech" speechTimeout="auto" action="/api/twilio/voice" method="POST" language="${escapeXml(language)}" speechModel="phone_call" timeout="5">
    <Say language="${escapeXml(language)}" voice="${escapeXml(voice)}">Puedes contarme que necesitas y te ayudo ahora mismo.</Say>
  </Gather>
  <Say language="${escapeXml(language)}" voice="${escapeXml(voice)}">No logre escucharte. Si deseas, intenta nuevamente en unos segundos.</Say>
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
