import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userMessage: string = body.message;

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `Eres un asistente virtual de la empresa Botz. Tu misión es mantener conversaciones naturales y útiles con los visitantes del sitio web.

Reglas clave:
- Mantén la continuidad de la conversación: no saludes en cada respuesta, solo en la primera.
- Responde de manera clara, breve y enfocada en la pregunta del usuario, sin repetir siempre lo mismo.
- Puedes dar ejemplos concretos (ej. marketing, soporte al cliente, logística, ventas, RRHH), pero adapta según lo que pregunte el usuario.
- No menciones las tecnologías internas que usa Botz, solo habla de beneficios para el usuario.
- Cierra de manera natural recordando que en Botz ayudamos a automatizar procesos en distintas áreas, y que pueden solicitar una demo o escribirnos por WhatsApp para ver cómo aplicarlo a su empresa.
- Sé cercano y profesional, con un tono humano. Puedes usar emojis de manera moderada para dar calidez.
.

👉 Regla de oro: Responde en máximo 6–7 líneas, con tono humano, claro y profesional. Usa emojis de manera natural para hacerlo más cercano.`
      },
      {
        role: "user",
        content: userMessage,
      },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
    });

    const aiResponse = completion.choices[0].message?.content;
    return NextResponse.json({ response: aiResponse });
  } catch (error) {
    console.error("❌ Error al procesar mensaje:", error);
    return NextResponse.json(
      { response: "Lo siento, hubo un problema procesando tu mensaje." },
      { status: 500 }
    );
  }
}


