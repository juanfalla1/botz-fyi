import { NextResponse } from "next/server";

export const runtime = "nodejs";

function twiml(xmlBody: string) {
  return new NextResponse(xmlBody, {
    status: 200,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(req: Request) {
  // MVP: solo habla y cuelga (para verificar que Twilio llega a tu app)
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="es-ES" voice="alice">Hola, soy Botz. Tu llamada ya está conectada correctamente.</Say>
</Response>`;
  return twiml(xml);
}

// (Opcional) Twilio a veces prueba con GET
export async function GET() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="es-ES" voice="alice">Botz está activo.</Say>
</Response>`;
  return twiml(xml);
}
