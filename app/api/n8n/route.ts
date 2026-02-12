import { NextResponse } from "next/server";

// Webhook del motor de automatización (interno)
const AUTOMATION_WEBHOOK_URL =
  process.env.AUTOMATION_WEBHOOK_URL ||
  "https://n8nio-n8n-latest.onrender.com/webhook/botz-wh-001";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("📤 Enviando al motor de automatización:", body);

    const response = await fetch(AUTOMATION_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    // 1. Obtenemos la respuesta como TEXTO primero para no romper el servidor
    const textData = await response.text();
    console.log("📥 Respuesta cruda del motor:", textData);

    if (!response.ok) {
      throw new Error(`Error motor (${response.status}): ${textData}`);
    }

    // 2. Intentamos convertir a JSON de forma segura
    try {
      const jsonData = JSON.parse(textData);
      return NextResponse.json(jsonData);
    } catch (e) {
      // Si n8n devolvió texto plano (ej: "Workflow executed"), lo envolvemos en JSON
      console.warn("⚠️ El motor no devolvió JSON, usando fallback de texto.");
      return NextResponse.json({ 
        mensaje_bot: textData,
        calculo: null 
      });
    }

  } catch (error: any) {
    console.error("❌ Error CRÍTICO en route.ts:", error);
    return NextResponse.json(
      { error: "Error interno del servidor", details: error.message }, 
      { status: 500 }
    );
  }
}
