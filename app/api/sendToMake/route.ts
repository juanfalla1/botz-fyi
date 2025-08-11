// app/api/sendToMake/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const res = await fetch("https://hook.us1.make.com/6ctavbf2f7grj9cm4q49z7qg98j9qkh7", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const result = await res.text(); // Make no siempre devuelve JSON
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("Error al enviar al webhook de Make:", error);
    return NextResponse.json({ ok: false, error: "Error al enviar a Make" }, { status: 500 });
  }
}
