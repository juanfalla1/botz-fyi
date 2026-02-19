import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message, context, conversationHistory, brainFiles } = await req.json();

    if (!message || !context) {
      return NextResponse.json({ ok: false, error: "Missing message or context" }, { status: 400 });
    }

    // Construir el prompt del sistema
    const systemPrompt = `${context}

Tu tarea es responder como el agente descrito arriba. Sé conciso, útil y profesional.
Responde en el mismo idioma del usuario.`;

    // Construir el contexto de documentos si existen
    let documentContext = "";
    if (brainFiles && brainFiles.length > 0) {
      documentContext = "\n\nDocumentos disponibles:\n";
      brainFiles.forEach((file: any) => {
        documentContext += `\n--- ${file.name} ---\n${file.content}\n`;
      });
    }

    // Construir el mensaje a enviar a la IA
    const fullPrompt = systemPrompt + documentContext;

    // Para testing, usamos un LLM local o OpenAI si está disponible
    // Por ahora retornamos una respuesta inteligente generada localmente
    const response = await generateResponse(message, fullPrompt, conversationHistory);

    return NextResponse.json({ ok: true, response });
  } catch (e: any) {
    console.error("Chat test error:", e);
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
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: systemPrompt },
            ...conversationHistory.map((msg: any) => ({
              role: msg.role === "user" ? "user" : "assistant",
              content: msg.content,
            })),
            { role: "user", content: message },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error("OpenAI API error");
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || "No pude procesar tu solicitud.";
    } catch (e) {
      console.error("OpenAI error, falling back to mock response:", e);
    }
  }

  // Fallback: generar respuesta mock inteligente
  return generateMockResponse(message, systemPrompt);
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
