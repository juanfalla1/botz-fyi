import { NextResponse } from "next/server";
import { getAnonSupabaseWithToken, getServiceSupabase } from "@/app/api/_utils/supabase";
import { getRequestUser } from "@/app/api/_utils/auth";
import { SYSTEM_TENANT_ID } from "@/app/api/_utils/system";
import { AGENTS_PRODUCT_KEY, logUsageEvent } from "@/app/api/_utils/entitlement";
import OpenAI from "openai";

const TEMPLATES: Record<string, { system_prompt: string; voice: "marin" | "cedar" | "coral" }> = {
  lia: {
    system_prompt: "Eres Lia, calificadora de leads entrantes de Botz. Tu objetivo es convertir una consulta en lead calificado para ventas. Debes identificar necesidad, urgencia, tipo de empresa/rol y mejor siguiente paso (demo, llamada o seguimiento). Habla como humana, cordial y concreta. Responde breve (1-2 oraciones), haz una pregunta clave por turno y orienta siempre a captacion/comercial.",
    voice: "marin",
  },
  alex: {
    system_prompt: "Eres Bruno, asesor comercial outbound de Botz. Tu objetivo es detectar encaje y mover al prospecto al siguiente paso comercial. Habla directo, humano y respetuoso; valida interes, pain principal y propone agenda/diagnostico. Responde breve (1-2 oraciones), con foco en cierre de siguiente accion.",
    voice: "cedar",
  },
  julia: {
    system_prompt: "Eres Sofia, recepcionista virtual de Botz. Tu objetivo es recibir, entender motivo de contacto y enrutar con claridad al area correcta (ventas, soporte, facturacion u otra). Habla con educacion y tono humano. Responde breve (1-2 oraciones), confirma la necesidad y da siguiente paso claro.",
    voice: "coral",
  },
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function nowIso() {
  return new Date().toISOString();
}

export async function POST(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });
  }

  const anonSupa = getAnonSupabaseWithToken(guard.token);
  const serviceSupa = getServiceSupabase();
  if (!anonSupa || !serviceSupa) {
    return NextResponse.json({ ok: false, error: "Missing SUPABASE env" }, { status: 500 });
  }

  try {
    // 1. Gate: Check entitlement (trial + credits)
    const { data: ent, error: entErr } = await serviceSupa
      .from("agent_entitlements")
      .select("*")
      .eq("user_id", guard.user.id)
      .eq("product_key", AGENTS_PRODUCT_KEY)
      .maybeSingle();

    if (entErr) {
      return NextResponse.json({ ok: false, error: entErr.message }, { status: 400 });
    }

    let entitlement = ent;
    if (!entitlement) {
      const payload = {
        user_id: guard.user.id,
        product_key: AGENTS_PRODUCT_KEY,
        plan_key: "pro",
        status: "trial",
        credits_limit: 2000,
        credits_used: 0,
        trial_start: nowIso(),
        trial_end: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      };
      const { data: inserted, error: insErr } = await serviceSupa
        .from("agent_entitlements")
        .insert(payload)
        .select("*")
        .single();
      if (insErr) {
        return NextResponse.json({ ok: false, error: insErr.message }, { status: 400 });
      }
      entitlement = inserted;
    }

    const status = String(entitlement.status || "trial");
    if (status === "blocked") {
      return NextResponse.json({ ok: false, code: "blocked", error: "Cuenta bloqueada" }, { status: 403 });
    }

    const trialEnd = entitlement.trial_end ? new Date(entitlement.trial_end) : null;
    if (status === "trial" && trialEnd && Date.now() > trialEnd.getTime()) {
      return NextResponse.json({ ok: false, code: "trial_expired", error: "Trial terminado" }, { status: 403 });
    }

    // 2. Parse request
    const formData = await req.formData();
    const templateId = String(formData.get("template_id") || "");
    const messagesJson = String(formData.get("messages") || "[]");
    const audioFile = formData.get("audio") as File | null;
    const fastMode = String(formData.get("fast_mode") || "0") === "1";
    const interrupted = String(formData.get("interrupted") || "0") === "1";

    if (!templateId || !TEMPLATES[templateId]) {
      return NextResponse.json({ ok: false, error: "Invalid template_id" }, { status: 400 });
    }

    const template = TEMPLATES[templateId];
    let messages: any[] = [];
    try {
      messages = JSON.parse(messagesJson);
      if (!Array.isArray(messages)) messages = [];
    } catch {
      messages = [];
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    let userText = "";

    // 3. STT (if audio provided)
    let sttTokens = 0;
    if (audioFile) {
      const buffer = Buffer.from(await audioFile.arrayBuffer());
      const transcription = await openai.audio.transcriptions.create({
        file: await new File([buffer], audioFile.name, { type: "audio/webm" }) as any,
        model: "gpt-4o-mini-transcribe",
        language: "es",
        prompt: "Transcribe solamente la voz del usuario que responde al agente. Ignora musica, subtitulos, locuciones de video y ruido de fondo.",
        temperature: 0,
      } as any);
      userText = transcription.text || "";
      sttTokens = estimateTokens(userText);
    } else {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.content) {
        userText = lastMsg.content;
      }
    }

    if (!userText) {
      return NextResponse.json({ ok: false, error: "No user text provided" }, { status: 400 });
    }

    // 4. LLM
    const llmMessages = [
      {
        role: "system",
        content: `${template.system_prompt} ${interrupted ? "El usuario te interrumpio. Responde con educacion, reconoce brevemente la interrupcion (ej. 'Claro, te escucho') y continua sin friccion." : ""}`.trim(),
      },
      ...messages.filter((m: any) => m.role && m.content),
      { role: "user", content: userText },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: llmMessages as any,
      temperature: fastMode ? 0.15 : 0.7,
      max_tokens: interrupted ? 55 : fastMode ? 90 : 260,
    });

    const assistantText = completion.choices[0]?.message?.content || "";
    const llmTokens = completion.usage?.total_tokens || estimateTokens(assistantText);

    // 5. TTS
    const ttsTokens = fastMode ? 0 : estimateTokens(assistantText);
    let audioBase64 = "";
    if (!fastMode) {
      const speech = await openai.audio.speech.create({
        model: "gpt-4o-mini-tts",
        voice: template.voice,
        input: assistantText,
        instructions: "Voz humana, calida y muy clara. Espanol natural con pronunciacion precisa.",
      });
      const audioBuffer = Buffer.from(await speech.arrayBuffer());
      audioBase64 = audioBuffer.toString("base64");
    }

    // 6. Calculate credits
    const creditDelta = llmTokens + sttTokens + ttsTokens;
    const prevUsed = Number(entitlement.credits_used || 0) || 0;
    const entLimit = Number(entitlement.credits_limit || 0) || 0;

    if (entLimit > 0 && prevUsed + creditDelta > entLimit) {
      return NextResponse.json({ ok: false, code: "credits_exhausted", error: "Creditos agotados" }, { status: 402 });
    }

    // 7. Update entitlement (service role)
    const { error: updateErr } = await serviceSupa
      .from("agent_entitlements")
      .update({ credits_used: prevUsed + creditDelta })
      .eq("user_id", guard.user.id)
      .eq("product_key", AGENTS_PRODUCT_KEY);

    if (updateErr) {
      console.warn("Could not update entitlement:", updateErr.message);
    }

    await logUsageEvent(serviceSupa as any, guard.user.id, creditDelta, {
      endpoint: "/start/agents/preview",
      action: "template_preview_call",
      metadata: { template_id: templateId, llm_tokens: llmTokens, stt_tokens: sttTokens, tts_tokens: ttsTokens },
    });

    const updatedEnt = { ...entitlement, credits_used: prevUsed + creditDelta };

    return NextResponse.json({
      ok: true,
      user_text: userText,
      assistant_text: assistantText,
      assistant_audio_base64: audioBase64,
      mime: audioBase64 ? "audio/mpeg" : null,
      tokens_llm: llmTokens,
      tokens_stt_est: sttTokens,
      tokens_tts_est: ttsTokens,
      credit_delta: creditDelta,
      credits_used: prevUsed + creditDelta,
      credits_limit: entLimit,
      trial_end: updatedEnt.trial_end,
    });
  } catch (e: any) {
    console.error("Preview error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
