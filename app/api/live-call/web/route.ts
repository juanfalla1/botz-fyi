import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isBotzTopic(message: string) {
  const v = String(message || "").toLowerCase();
  const patterns = [
    /\bhola\b|\bbuenas\b|\bcomo estas\b|\bque tal\b/,
    /\bbotz\b/,
    /\bagente(s)?\b/,
    /\bia\b|\binteligencia artificial\b|\bai\b/,
    /\bautomatiza(cion|ciones|r)?\b|\bflujo(s)?\b|\bproceso(s)?\b/,
    /\bcrm\b|\blead(s)?\b|\bventas\b|\bcotiza(r|cion)?\b/,
    /\bwhatsapp\b|\bllamada(s)?\b|\bvoz\b|\bsoporte\b/,
    /\bprecio(s)?\b|\bplan(es)?\b|\bdemo\b|\bintegraci(o|ó)n\b/,
  ];
  return patterns.some((p) => p.test(v));
}

function cleanVoiceReply(text: string) {
  return String(text || "")
    .replace(/[`*_#>-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const message = String(body?.message || "").trim();
    const lang = String(body?.lang || "es").toLowerCase() === "en" ? "en" : "es";
    const callerName = String(body?.name || "").trim();

    if (!message) {
      return NextResponse.json({ ok: false, error: "Mensaje vacio." }, { status: 400 });
    }

    const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
    if (!apiKey) {
      const fallback = lang === "en"
        ? "I am ready to help. Tell me what you need and I will guide you."
        : "Estoy listo para ayudarte. Dime que necesitas y te guio paso a paso.";
      return NextResponse.json({ ok: true, reply: fallback, mode: "fallback_no_key" });
    }

    const topicOk = isBotzTopic(message);
    if (!topicOk) {
      const redirect = lang === "en"
        ? "I can help with Botz topics: AI agents, automations, CRM, WhatsApp, voice calls, integrations, pricing, and demos. Tell me what you need first."
        : "Puedo ayudarte con temas de Botz: agentes IA, automatizaciones, CRM, WhatsApp, llamadas de voz, integraciones, precios y demos. Dime primero que necesitas.";
      return NextResponse.json({ ok: true, reply: redirect, mode: "topic_guard" });
    }

    const openai = new OpenAI({ apiKey });
    const system = lang === "en"
      ? `You are a live voice assistant for Botz. Speak naturally like a real person, warm and professional, with concise phrasing. You ONLY talk about Botz topics: AI agents, automations, CRM, WhatsApp, voice calls, integrations, pricing, demos and onboarding. If user asks unrelated things, politely redirect to Botz. Keep each answer to max 2 short sentences and ask only one follow-up question. Caller name: ${callerName || "unknown"}.`
      : `Eres un asistente de voz en vivo de Botz. Habla natural, cercano y profesional, como una persona real. SOLO hablas de Botz: agentes IA, automatizaciones, CRM, WhatsApp, llamadas de voz, integraciones, precios, demos y onboarding. Si preguntan algo fuera de tema, redirige con amabilidad a Botz. Cada respuesta debe tener maximo 2 frases cortas y una sola pregunta de seguimiento. Nombre del cliente: ${callerName || "desconocido"}.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 90,
      messages: [
        { role: "system", content: system },
        { role: "user", content: message },
      ],
    });

    const rawReply = String(completion.choices?.[0]?.message?.content || "").trim();
    const reply = cleanVoiceReply(rawReply) || (lang === "en"
      ? "Understood. Tell me one more detail so I can help you better."
      : "Entendido. Dame un dato mas para ayudarte mejor.");

    return NextResponse.json({ ok: true, reply, mode: "openai" });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || "Error interno") }, { status: 500 });
  }
}
