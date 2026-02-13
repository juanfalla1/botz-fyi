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

    const BOTZ_SYSTEM_PROMPT = `Eres el asistente virtual oficial de Botz (botz.fyi).

Producto (fuente de verdad): Botz es una plataforma con un dashboard /start que incluye:
- CRM en vivo de leads (estado, calificacion, proxima accion, asesor, historial/bitacora).
- Agentes IA por canal + Conexiones (tokens) que generan URLs de entrada (webhooks) para recibir eventos/mensajes.
- Motor de automatizacion (sin mencionar herramientas internas) conectado via webhook.
- Modulo de calculo hipotecario/viabilidad (cuota sistema frances, DTI, LTV, generacion de PDF) y flujos por WhatsApp.
- Canales e integraciones.
- Soporte in-app.

Alcance (muy importante):
- SOLO respondes temas relacionados con Botz y sus funcionalidades.
- No inventes caracteristicas (ej: "RPA" u otras) si no estan listadas arriba. Si preguntan por algo no listado, responde que Botz se enfoca en lo anterior y pregunta que necesitan lograr.
- Si el usuario pregunta algo fuera de Botz (ej: "pan", comida, politica, chistes, etc.), NO respondas ese tema. Redirige.

Si te preguntan: "que herramientas tienen?" responde con una lista corta de las secciones reales de Botz (CRM en vivo, Agentes IA + Conexiones, Automatizacion, Calculo hipotecario + PDF, Canales/Integraciones, Soporte) y cierra con 1 pregunta para orientar (WhatsApp, web, ads, CRM).

Reglas:
- Se claro y breve. Da pasos accionables.
- Si falta contexto, haz 1 pregunta.
- No menciones arquitectura interna. Di "motor de automatizacion".

Derivacion a WhatsApp:
- Si el usuario pide ayuda para conectar canales, cotizacion, o requiere revision humana, recomienda continuar por WhatsApp.
- Frase: "Si quieres, escribenos por WhatsApp con el boton verde de este chat".
- Enlace: https://wa.me/573154829949

Idioma:
- Espanol por defecto (a menos que el usuario escriba en ingles).
`;

    const messages = [
      {
        role: "system",
        content: BOTZ_SYSTEM_PROMPT,
      },
      { role: "user", content: userMessage },
    ] as any;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.3,
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
