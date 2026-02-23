import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/api/_utils/auth";
import { getAnonSupabaseWithToken } from "@/app/api/_utils/supabase";
import { checkEntitlementAccess, consumeEntitlementCredits, logUsageEvent } from "@/app/api/_utils/entitlement";

export async function POST(req: Request) {
  try {
    const guard = await getRequestUser(req);
    if (!guard.ok) {
      return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });
    }

    const supabase = getAnonSupabaseWithToken(guard.token);
    if (!supabase) {
      return NextResponse.json({ ok: false, error: "Missing SUPABASE env (URL or ANON)" }, { status: 500 });
    }

    const access = await checkEntitlementAccess(supabase as any, guard.user.id);
    if (!access.ok) {
      return NextResponse.json({ ok: false, code: access.code, error: access.error }, { status: access.statusCode });
    }

    const { audio, context, conversationHistory, agentConfig, generateAudioOnly, textToSpeak, fast_mode } = await req.json();
    const fastMode = Boolean(fast_mode);

    // Caso especial: solo generar audio para un texto específico (ej: saludo inicial)
    if (generateAudioOnly && textToSpeak) {
      try {
        const audioUrl = await textToSpeech(textToSpeak, agentConfig?.voice || "marin");
        const burn = await consumeEntitlementCredits(supabase as any, guard.user.id, 1);
        if (!burn.ok) {
          return NextResponse.json({ ok: false, code: burn.code, error: burn.error }, { status: burn.statusCode });
        }
        await logUsageEvent(supabase as any, guard.user.id, 1, {
          endpoint: "/api/agents/voice-call",
          action: "voice_tts_greeting",
        });
        return NextResponse.json({ ok: true, audioUrl });
      } catch (err) {
        console.error("TTS error:", err);
        return NextResponse.json({ ok: true, audioUrl: null });
      }
    }

    if (!audio) {
      return NextResponse.json({ ok: false, error: "Missing audio data" }, { status: 400 });
    }

    // 1. Convertir audio a texto (STT)
    let userMessage = "";
    try {
      userMessage = await speechToText(audio);
    } catch (e) {
      console.error("STT error:", e);
      return NextResponse.json({ 
        ok: false, 
        error: "No se pudo procesar el audio" 
      }, { status: 500 });
    }

    if (!userMessage.trim()) {
      return NextResponse.json({ 
        ok: true, 
        userMessage: "", 
        agentResponse: "No escuché nada. Intenta de nuevo.",
        audioUrl: null 
      });
    }

    // 2. Procesar mensaje con LLM
    const agentResponse = await generateResponse(
      userMessage,
      context,
      conversationHistory,
      agentConfig,
      { fastMode }
    );

    // 3. Convertir respuesta a audio (TTS)
    let audioUrl = null;
    if (!fastMode) {
      try {
        audioUrl = await textToSpeech(agentResponse, agentConfig?.voice || "marin");
      } catch (e) {
        console.error("TTS error:", e);
        // TTS error no es crítico, retornamos la respuesta texto
      }
    }

    const creditsDelta = fastMode ? 2 : 3;
    const burn = await consumeEntitlementCredits(supabase as any, guard.user.id, creditsDelta);
    if (!burn.ok) {
      return NextResponse.json({ ok: false, code: burn.code, error: burn.error }, { status: burn.statusCode });
    }
    await logUsageEvent(supabase as any, guard.user.id, creditsDelta, {
      endpoint: "/api/agents/voice-call",
      action: "voice_turn",
      metadata: { has_audio_response: Boolean(audioUrl), fast_mode: fastMode },
    });

    return NextResponse.json({ 
      ok: true, 
      userMessage,
      agentResponse,
      audioUrl: audioUrl || null
    });
  } catch (e: any) {
    console.error("Voice call error:", e);
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || "Unknown error" 
    }, { status: 500 });
  }
}

// Speech-to-Text usando OpenAI Whisper
async function speechToText(audioBase64: string): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiKey) {
    // Fallback: simular STT
    return "Mensaje de prueba";
  }

   try {
     // Convertir base64 a buffer de forma segura
     const buffer = Buffer.from(audioBase64, "base64");
     const audioBlob = new Blob([buffer], { type: "audio/webm" });

    const callTranscription = async (model: string) => {
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.webm");
      formData.append("model", model);
      formData.append("language", "es");
      formData.append("temperature", "0");
      formData.append("prompt", "Transcribe solo la voz del cliente. Ignora musica, subtitulos y ruido.");

      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiKey}`,
        },
        body: formData as any,
      });
      if (!response.ok) throw new Error(`${model} transcription error`);
      return response.json();
    };

    let data: any;
    try {
      data = await callTranscription("gpt-4o-mini-transcribe");
    } catch {
      data = await callTranscription("whisper-1");
    }

     let text = data.text || "";
     // Fix encoding issues - normalize the string
     if (text) {
       // Try multiple encoding fixes
       try {
         text = Buffer.from(text, 'utf8').toString('utf8');
       } catch (e) {
         console.warn("[VOICE] Encoding issue, attempting recovery");
       }
     }
     console.log("[VOICE] STT text after encoding fix:", text);
     return text;
  } catch (e) {
    console.error("Whisper error:", e);
    throw e;
  }
}

// Text-to-Speech usando OpenAI TTS
async function textToSpeech(text: string, voice: string = "marin"): Promise<string | null> {
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!openaiKey) {
    return null;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        input: text.substring(0, 4096), // OpenAI TTS limit
        voice: voice || "marin",
        instructions: "Voz humana, clara y cercana. Pronunciacion nitida en espanol latino neutro, ritmo natural.",
        response_format: "mp3",
      }),
    });

    if (!response.ok) {
      throw new Error("TTS API error");
    }

    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString("base64");
    return `data:audio/mp3;base64,${audioBase64}`;
  } catch (e) {
    console.error("TTS error:", e);
    throw e;
  }
}

// Generar respuesta con LLM
async function generateResponse(
  userMessage: string,
  context: string,
  conversationHistory: any[] = [],
  agentConfig: any = {},
  opts: { fastMode?: boolean } = {}
): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!openaiKey) {
    // Fallback: respuesta mock
    console.warn("[VOICE] No OPENAI_API_KEY found, using mock response");
    return generateMockResponse(userMessage);
  }

  console.log("[VOICE] Context length:", context?.length || 0);
  console.log("[VOICE] User message:", userMessage);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: String(agentConfig?.model || "gpt-4o-mini"),
        messages: [
          { role: "system", content: context + "\n\n[CRITICAL OVERRIDE] Responde la pregunta del usuario completamente. NO rechaces ayudar. NO digas 'no puedo'. Si no sabes algo, ofrece una alternativa." },
          ...conversationHistory.map((msg: any) => ({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.content,
          })),
          { role: "user", content: userMessage },
        ],
        temperature: opts.fastMode ? 0.35 : 0.7,
        max_tokens: opts.fastMode ? 90 : 180,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("[VOICE] LLM API error:", errorData);
      throw new Error("LLM API error");
    }

    const data = await response.json();
    const agentResponse = data.choices?.[0]?.message?.content || "No pude procesar tu solicitud.";
    console.log("[VOICE] Agent response:", agentResponse.substring(0, 100));
    return agentResponse;
  } catch (e) {
    console.error("[VOICE] LLM error:", e);
    return generateMockResponse(userMessage);
  }
}

// Generar respuestas mock
function generateMockResponse(message: string): string {
  if (message.toLowerCase().includes("hola")) {
    return "Hola, gracias por llamar. ¿En qué puedo ayudarte?";
  }
  if (message.toLowerCase().includes("precio")) {
    return "El precio depende del plan que necesites. ¿Cuál es tu presupuesto?";
  }
  if (message.toLowerCase().includes("gracias")) {
    return "De nada, estoy aquí para ayudarte.";
  }
  return `Entendí tu pregunta sobre ${message.substring(0, 20)}. Cuéntame más.`;
}
