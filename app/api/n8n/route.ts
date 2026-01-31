import { NextResponse } from "next/server";

// ⚠️ VERIFICA: ¿Es esta la URL correcta de tu Webhook ACTIVO en n8n?
// Si tu flujo usa "botz-wh-001", cámbialo aquí.
const N8N_URL = "https://n8nio-n8n-latest.onrender.com/webhook/botz-wh-001"; 

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("📤 Enviando a n8n:", body);

    const response = await fetch(N8N_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    // 1. Obtenemos la respuesta como TEXTO primero para no romper el servidor
    const textData = await response.text();
    console.log("📥 Respuesta cruda de n8n:", textData);

    if (!response.ok) {
      throw new Error(`Error n8n (${response.status}): ${textData}`);
    }

    // 2. Intentamos convertir a JSON de forma segura
    try {
      const jsonData = JSON.parse(textData);
      return NextResponse.json(jsonData);
    } catch (e) {
      // Si n8n devolvió texto plano (ej: "Workflow executed"), lo envolvemos en JSON
      console.warn("⚠️ n8n no devolvió JSON, se usará fallback de texto.");
      return NextResponse.json({ 
        mensaje_bot: textData, // Usamos el texto como respuesta del bot
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