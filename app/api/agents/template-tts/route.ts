import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getAnonSupabaseWithToken } from "@/app/api/_utils/supabase";
import { getRequestUser } from "@/app/api/_utils/auth";
import { checkEntitlementAccess, consumeEntitlementCredits, logUsageEvent } from "@/app/api/_utils/entitlement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TEMPLATE_VOICE: Record<string, "nova" | "onyx" | "shimmer"> = {
  lia: "nova",
  alex: "onyx",
  julia: "shimmer",
};

function estimateTokens(text: string) {
  return Math.max(1, Math.ceil(String(text || "").length / 4));
}

export async function POST(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });
  }

  const supabase = getAnonSupabaseWithToken(guard.token);
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Missing SUPABASE env" }, { status: 500 });
  }

  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "Missing OPENAI_API_KEY" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const templateId = String(body?.templateId || "").trim().toLowerCase();
    const text = String(body?.text || "").trim();
    if (!text) {
      return NextResponse.json({ ok: false, error: "Missing text" }, { status: 400 });
    }

    const access = await checkEntitlementAccess(supabase as any, guard.user.id);
    if (!access.ok) {
      return NextResponse.json({ ok: false, code: access.code, error: access.error }, { status: access.statusCode });
    }

    const voice = TEMPLATE_VOICE[templateId] || "nova";
    const openai = new OpenAI({ apiKey });
    const speech = await openai.audio.speech.create({
      model: "tts-1-hd",
      voice,
      input: text,
    });

    const audioBuffer = Buffer.from(await speech.arrayBuffer());
    const credits = estimateTokens(text);
    await consumeEntitlementCredits(supabase as any, guard.user.id, credits);
    await logUsageEvent(supabase as any, guard.user.id, credits, {
      endpoint: "/api/agents/template-tts",
      action: "template_voice_preview",
      metadata: { template_id: templateId, voice, chars: text.length },
    });

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "content-type": "audio/mpeg",
        "cache-control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error generando voz" }, { status: 500 });
  }
}
