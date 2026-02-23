import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/api/_utils/auth";
import { getAnonSupabaseWithToken } from "@/app/api/_utils/supabase";
import { checkEntitlementAccess, consumeEntitlementCredits, logUsageEvent } from "@/app/api/_utils/entitlement";
import { getClientIp, rateLimit } from "@/app/api/_utils/rateLimit";
import { logReq, makeReqContext } from "@/app/api/_utils/observability";

function normalizeBrainFiles(raw: any): { name: string; content: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((f) => ({
      name: String(f?.name || "Documento").trim() || "Documento",
      content: String(f?.content || "").trim(),
    }))
    .filter((f) => f.content.length > 0);
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
    .sort((a, b) => b.score - a.score);

  const selected = ranked.filter((f) => f.score > 0).slice(0, 3);
  const fallback = selected.length ? selected : ranked.slice(0, 2);

  const blocks = fallback.map((f) => {
    const lc = f.content.toLowerCase();
    const firstHit = terms.map((t) => lc.indexOf(t)).find((i) => i >= 0) ?? -1;
    const start = firstHit >= 0 ? Math.max(0, firstHit - 900) : 0;
    const end = Math.min(f.content.length, start + 2200);
    const excerpt = f.content.slice(start, end).trim();
    return `\n--- ${f.name} ---\n${excerpt}`;
  });

  return `\n\nDocumentos indexados (extractos relevantes):\n${blocks.join("\n")}`;
}

export async function POST(req: Request) {
  const ctx = makeReqContext(req, "/api/agents/chat-test");
  try {
    const ip = getClientIp(req);
    const rlIp = await rateLimit({ key: `agents-chat:ip:${ip}`, limit: 180, windowMs: 60 * 1000 });
    if (!rlIp.ok) {
      logReq(ctx, "warn", "rate_limited_ip");
      return NextResponse.json({ ok: false, error: "Too many requests", code: "RATE_LIMITED" }, { status: 429 });
    }

    const guard = await getRequestUser(req);
    if (!guard.ok) {
      return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });
    }

    const supabase = getAnonSupabaseWithToken(guard.token);
    if (!supabase) {
      return NextResponse.json({ ok: false, error: "Missing SUPABASE env (URL or ANON)" }, { status: 500 });
    }

    const access = await checkEntitlementAccess(supabase as any, guard.user.id);
    if (!access.ok) {
      return NextResponse.json({ ok: false, code: access.code, error: access.error }, { status: access.statusCode });
    }

    const rlUser = await rateLimit({ key: `agents-chat:user:${guard.user.id}`, limit: 120, windowMs: 60 * 1000 });
    if (!rlUser.ok) {
      logReq(ctx, "warn", "rate_limited_user", { user_id: guard.user.id });
      return NextResponse.json({ ok: false, error: "Too many requests", code: "RATE_LIMITED" }, { status: 429 });
    }

    const { message, context, conversationHistory, brainFiles } = await req.json();

    if (!message || !context) {
      return NextResponse.json({ ok: false, error: "Missing message or context" }, { status: 400 });
    }

    const indexedFiles = normalizeBrainFiles(brainFiles);

    // Construir el prompt del sistema
    const systemPrompt = `${context}

Tu tarea es responder como el agente descrito arriba. Sé conciso, útil y profesional.
Responde en el mismo idioma del usuario.
Si hay documentos indexados, usalos como fuente principal para responder con precision.
Si la informacion no aparece en los documentos ni en el contexto, dilo claramente sin inventar.`;

    const documentContext = buildDocumentContext(message, indexedFiles);

    // Construir el mensaje a enviar a la IA
    const fullPrompt = systemPrompt + documentContext;

    const generated = await generateResponse(message, fullPrompt, conversationHistory);
    const response = generated.text;
    const creditDelta = Math.max(1, Number(generated.tokens || 0));

    const burn = await consumeEntitlementCredits(supabase as any, guard.user.id, creditDelta);
    if (!burn.ok) {
      return NextResponse.json({ ok: false, code: burn.code, error: burn.error }, { status: burn.statusCode });
    }
    await logUsageEvent(supabase as any, guard.user.id, creditDelta, {
      endpoint: "/api/agents/chat-test",
      action: "chat_turn",
      metadata: {
        message_length: String(message || "").length,
        llm_tokens: creditDelta,
        used_openai: generated.usedOpenAI,
      },
    });

    logReq(ctx, "info", "ok", { user_id: guard.user.id, credits: creditDelta, used_openai: generated.usedOpenAI });
    return NextResponse.json({ ok: true, response });
  } catch (e: any) {
    logReq(ctx, "error", "exception", { error: e?.message || "Unknown error" });
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}

// Función para generar respuestas (puede ser mejorada con LLM real)
async function generateResponse(
  message: string,
  systemPrompt: string,
  conversationHistory: any[] = []
) {
  // Intentar usar OpenAI si está disponible
  const openaiKey = process.env.OPENAI_API_KEY;

  if (openaiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
           model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            ...conversationHistory.map((msg: any) => ({
              role: msg.role === "user" ? "user" : "assistant",
              content: msg.content,
            })),
            { role: "user", content: message },
          ],
          temperature: 0.2,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error("OpenAI API error");
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || "No pude procesar tu solicitud.";
      const tokens = Number(data?.usage?.total_tokens || 0);
      return { text, tokens, usedOpenAI: true };
    } catch (e) {
      console.error("OpenAI error, falling back to mock response:", e);
    }
  }

  const text = generateMockResponse(message, systemPrompt);
  const tokens = Math.ceil((String(message || "").length + String(text || "").length) / 4);
  return { text, tokens, usedOpenAI: false };
}

// Generar respuestas mock cuando no hay IA disponible
function generateMockResponse(message: string, systemPrompt: string): string {
  // Extraer el nombre del agente del prompt
  const nameMatch = systemPrompt.match(/Tu nombre es:\s*(.+?)(\n|$)/);
  const agentName = nameMatch ? nameMatch[1].trim() : "Agente";

  // Respuestas base según el tipo de pregunta
  if (message.toLowerCase().includes("hola") || message.toLowerCase().includes("buenos")) {
    return `¡Hola! Soy ${agentName}. ¿En qué puedo ayudarte hoy?`;
  }

  if (message.toLowerCase().includes("precio") || message.toLowerCase().includes("costo")) {
    return "Para información sobre precios, te recomendaría contactar directamente. ¿Hay algo específico que necesites saber?";
  }

  if (message.toLowerCase().includes("horario") || message.toLowerCase().includes("disponibilidad")) {
    return "Estoy disponible las 24/7 para ayudarte. ¿Qué necesitas?";
  }

  if (message.toLowerCase().includes("gracias")) {
    return "¡De nada! Estoy aquí para ayudarte en lo que necesites.";
  }

  // Respuesta genérica basada en la pregunta
  return `Entiendo tu pregunta sobre "${message.substring(0, 30)}...". Déjame ayudarte con eso. ¿Podrías darme más detalles?`;
}
