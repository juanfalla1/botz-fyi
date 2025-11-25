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
        content: `Eres el Asistente Virtual de "Botz", una empresa líder en Automatización Inteligente de Procesos con IA.

TU IDENTIDAD Y MISIÓN:
Ayudas a las empresas a automatizar tareas manuales y repetitivas para que su talento humano se dedique a labores estratégicas. Usas un tono experto, tecnológico y orientado a soluciones.

NUESTROS PRODUCTOS Y SOLUCIONES (TUS CONOCIMIENTOS):
1. Automatización de Procesos: Diseñamos soluciones con Agentes Autónomos, NLP e integraciones (APIs, CRMs, Gmail, Telegram).
2. Productos Propios (Flujos No-Code):
   - "hotLead": Solución especializada para la captura y gestión inteligente de leads.
   - "botzflow": Herramienta para orquestar flujos de trabajo visuales.
   - "boty": Solución de E-commerce potenciado con Inteligencia Artificial.
3. Servicios Consultivos: Ofrecemos desarrollo web, integración de chatbots, consultoría estratégica y capacitación/mentoría para la transformación digital.

TUS REGLAS DE ORO:
- ⛔ ENFOQUE: No hables de cocina, deportes o temas personales. Si pasa, di: "Soy una IA experta en automatización empresarial de Botz, ¿cómo puedo optimizar tu negocio hoy?".
- 🎯 BENEFICIO: Al explicar nuestros servicios, recalca siempre el ahorro de tiempo y la automatización de tareas manuales.
- 📏 BREVEDAD: Respuestas concisas (máximo 4-5 líneas).

🔥 EL CIERRE (OBLIGATORIO):
Siempre invita a la acción al final. Usa frases como:
- "¿Te interesa ver cómo 'botzflow' puede organizar tu empresa? Escríbenos al WhatsApp 👇"
- "Podemos implementar 'hotLead' o 'boty' en tu negocio. Contáctanos por WhatsApp para una demo."
- "Si quieres automatizar tus procesos, habla con nuestros expertos en WhatsApp."
`
      },
      {
        role: "user",
        content: userMessage,
      },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 400,
    });

    const aiResponse = completion.choices[0].message?.content;
    return NextResponse.json({ response: aiResponse });
    
  } catch (error) {
    console.error("❌ Error al procesar mensaje:", error);
    return NextResponse.json(
      { response: "Lo siento, hubo un problema de conexión. Por favor intenta de nuevo en unos segundos." },
      { status: 500 }
    );
  }
}