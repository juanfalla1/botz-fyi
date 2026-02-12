import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUTOMATION_WEBHOOK_URL =
  process.env.AUTOMATION_WEBHOOK_URL ||
  // Backward-compatible default
  "https://n8nio-n8n-latest.onrender.com/webhook/botz-wh-001";

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token") || undefined;

    const body = await req.json().catch(() => ({}));
    const payload = token ? { ...body, token } : body;

    const response = await fetch(AUTOMATION_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const textData = await response.text();
    if (!response.ok) {
      throw new Error(`Automation engine error (${response.status}): ${textData}`);
    }

    try {
      return NextResponse.json(JSON.parse(textData));
    } catch {
      return NextResponse.json({ message: textData });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error interno del servidor", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
