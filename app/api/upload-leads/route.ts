import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // 1. Recibimos el archivo desde el Frontend
    const formData = await req.formData();
    
    // ⚠️ IMPORTANTE: Pon aquí la URL REAL de tu Webhook de n8n (La de Producción)
    const N8N_URL = "https://suncapital.app.n8n.cloud/webhook/carga-excel"; 

    // 2. Se lo enviamos a n8n desde el servidor (Backend a Backend)
    const response = await fetch(N8N_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Error n8n: ${response.statusText}`);
    }

    const data = await response.json().catch(() => ({ success: true }));
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Error en el proxy:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}