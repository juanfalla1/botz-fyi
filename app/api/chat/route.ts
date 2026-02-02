import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { response: "Falta OPENAI_API_KEY en el servidor (Vercel)." },
        { status: 500 }
      );
    }

    // ✅ Import dinámico para que NO explote en build
    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({ apiKey });

    const body = await req.json();
    const userMessage: string = String(body?.message || "");

    const messages = [
      {
        role: "system",
        content: `Eres el Asistente Virtual de "Botz", una empresa líder en Automatización Inteligente de Procesos con IA.`,
      },
      { role: "user", content: userMessage },
    ] as any;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 400,
    });

    const aiResponse = completion.choices?.[0]?.message?.content ?? "";
    return NextResponse.json({ response: aiResponse });
  } catch (error: any) {
    console.error("❌ Error al procesar mensaje:", error);
    return NextResponse.json(
      { response: "Lo siento, hubo un problema. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
