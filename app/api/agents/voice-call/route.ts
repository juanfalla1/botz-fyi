import { NextResponse } from "next/server";
import { getRequestUser } from "@/app/api/_utils/auth";
import { getAnonSupabaseWithToken } from "@/app/api/_utils/supabase";
import { checkEntitlementAccess, consumeEntitlementCredits, logUsageEvent } from "@/app/api/_utils/entitlement";
import { getClientIp, rateLimit } from "@/app/api/_utils/rateLimit";
import { logReq, makeReqContext } from "@/app/api/_utils/observability";

export async function POST(req: Request) {
  const ctx = makeReqContext(req, "/api/agents/voice-call");
  try {
    const ip = getClientIp(req);
    const rlIp = await rateLimit({ key: `agents-voice:ip:${ip}`, limit: 90, windowMs: 60 * 1000 });
    if (!rlIp.ok) {
      logReq(ctx, "warn", "rate_limited_ip");
      return NextResponse.json({ ok: false, error: "Too many requests", code: "RATE_LIMITED" }, { status: 429 });
    }

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

    const rlUser = await rateLimit({ key: `agents-voice:user:${guard.user.id}`, limit: 60, windowMs: 60 * 1000 });
    if (!rlUser.ok) {
      logReq(ctx, "warn", "rate_limited_user", { user_id: guard.user.id });
      return NextResponse.json({ ok: false, error: "Too many requests", code: "RATE_LIMITED" }, { status: 429 });
    }

    const { audio, context, conversationHistory, agentConfig, generateAudioOnly, textToSpeak, fast_mode } = await req.json();
    const agentLang = String(agentConfig?.language || "es-ES");
    const baseLang: "es" | "en" = agentLang.toLowerCase().startsWith("en") ? "en" : "es";
    const fastMode = Boolean(fast_mode);

    // Caso especial: solo generar audio para un texto específico (ej: saludo inicial)
    if (generateAudioOnly && textToSpeak) {
      try {
        const audioUrl = await textToSpeech(textToSpeak, {
          voice: agentConfig?.voice || "marin",
          provider: agentConfig?.voice_provider || "openai",
          profileId: agentConfig?.voice_profile_id || "",
          ttsModel: agentConfig?.tts_model || "",
          language: baseLang,
        });
        const burn = await consumeEntitlementCredits(supabase as any, guard.user.id, 1);
        if (!burn.ok) {
          return NextResponse.json({ ok: false, code: burn.code, error: burn.error }, { status: burn.statusCode });
        }
        await logUsageEvent(supabase as any, guard.user.id, 1, {
          endpoint: "/api/agents/voice-call",
          action: "voice_tts_greeting",
        });
        logReq(ctx, "info", "ok_greeting", { user_id: guard.user.id });
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
      userMessage = await speechToText(audio, baseLang);
    } catch (e) {
      console.error("STT error:", e);
        return NextResponse.json({ 
          ok: false, 
          error: baseLang === "en" ? "Could not process audio" : "No se pudo procesar el audio" 
        }, { status: 500 });
    }

    if (!userMessage.trim()) {
      return NextResponse.json({ 
        ok: true, 
        userMessage: "", 
        agentResponse: baseLang === "en" ? "I could not hear anything. Please try again." : "No escuche nada. Intenta de nuevo.",
        audioUrl: null 
      });
    }

    // 2. Procesar mensaje con LLM
    const rawAgentResponse = await generateResponse(
      userMessage,
      context,
      conversationHistory,
      agentConfig,
      { fastMode, language: baseLang }
    );
    const agentResponse = sanitizeVoiceText(rawAgentResponse);

    // 3. Convertir respuesta a audio (TTS)
    let audioUrl = null;
    try {
      audioUrl = await textToSpeech(agentResponse, {
        voice: agentConfig?.voice || "marin",
        provider: agentConfig?.voice_provider || "openai",
        profileId: agentConfig?.voice_profile_id || "",
        ttsModel: agentConfig?.tts_model || "",
        language: baseLang,
      });
    } catch (e) {
      console.error("TTS error:", e);
      // TTS error no es crítico, retornamos la respuesta texto
    }

    const creditsDelta = audioUrl ? 3 : (fastMode ? 2 : 3);
    const burn = await consumeEntitlementCredits(supabase as any, guard.user.id, creditsDelta);
    if (!burn.ok) {
      return NextResponse.json({ ok: false, code: burn.code, error: burn.error }, { status: burn.statusCode });
    }
    await logUsageEvent(supabase as any, guard.user.id, creditsDelta, {
      endpoint: "/api/agents/voice-call",
      action: "voice_turn",
      metadata: { has_audio_response: Boolean(audioUrl), fast_mode: fastMode },
    });

    logReq(ctx, "info", "ok", { user_id: guard.user.id, fast_mode: fastMode, credits: creditsDelta });

    return NextResponse.json({ 
      ok: true, 
      userMessage,
      agentResponse,
      audioUrl: audioUrl || null
    });
  } catch (e: any) {
    logReq(ctx, "error", "exception", { error: e?.message || "Unknown error" });
    return NextResponse.json({ 
      ok: false, 
      error: e?.message || "Unknown error" 
    }, { status: 500 });
  }
}

// Speech-to-Text usando OpenAI Whisper
async function speechToText(audioBase64: string, baseLang: "es" | "en" = "es"): Promise<string> {
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
      formData.append("language", baseLang);
      formData.append("temperature", "0");
      formData.append(
        "prompt",
        baseLang === "en"
          ? "Transcribe only the customer's voice. Ignore music, subtitles and background noise."
          : "Transcribe solo la voz del cliente. Ignora musica, subtitulos y ruido."
      );

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

const OPENAI_VOICES = new Set([
  "alloy",
  "ash",
  "ballad",
  "cedar",
  "coral",
  "echo",
  "fable",
  "marin",
  "nova",
  "onyx",
  "sage",
  "shimmer",
  "verse",
]);

const ELEVEN_MODEL_MAP: Record<string, string> = {
  "elevenlabs turbo v2": "eleven_turbo_v2",
  "elevenlabs turbo v2.5": "eleven_turbo_v2_5",
  "elevenlabs multilingual v2": "eleven_multilingual_v2",
  "elevenlabs flash v2.5": "eleven_flash_v2_5",
};

const ELEVEN_PROFILE_TO_VOICE_ID: Record<string, string> = {
  angie_col: "EXAVITQu4vr4xnSDxMaL",
  lupe_mx: "ThT5KcBeYPX3keUQqHPh",
  adam_cartesia: "ErXwobaYiN019PkySvjV",
  adam_romantic: "TxGEqnHWrfWFTfGW9XjX",
  adrian_us: "VR6AewLTigWG4xSOukaG",
  agustin_relaxed: "CYw3kZ02Hs0563khs1Fj",
  alejandro_conv: "IKne3meq5aSn9XLyUdCD",
  amy_uk: "XB0fDUnXU5powFXDhCwa",
  ana_corp: "Xb7hH8MSUJpSbSDYk0k2",
  andrea_peru: "onwK4e9ZLuTAKqWW03F9",
  anthony_el: "bIHbv24MWmeRgasZH58o",
  brooke: "cgSgspJ2msm6clMCkdW9",
  camila_warm: "SAz9YHcvj6GT2YYXdXww",
  carla_vsl: "jBpfuIE2acCO8z3wKNLl",
  gabriela: "nPczCjzI2devNBz1zQrb",
};

type TtsOptions = {
  voice?: string;
  provider?: string;
  profileId?: string;
  ttsModel?: string;
  language?: "es" | "en";
};

// Text-to-Speech con fallback provider -> OpenAI
async function textToSpeech(text: string, opts: TtsOptions = {}): Promise<string | null> {
  const openaiKey = process.env.OPENAI_API_KEY;
  const elevenKey = process.env.ELEVENLABS_API_KEY;
  const provider = String(opts.provider || "openai").toLowerCase();
  const voice = String(opts.voice || "marin");
  const profileId = String(opts.profileId || "");
  const ttsModelRaw = String(opts.ttsModel || "").toLowerCase();
  const baseLang: "es" | "en" = opts.language === "en" ? "en" : "es";

  if (provider === "elevenlabs" && elevenKey) {
    try {
      const elevenVoiceId = ELEVEN_PROFILE_TO_VOICE_ID[profileId] || process.env.ELEVENLABS_DEFAULT_VOICE_ID || "EXAVITQu4vr4xnSDxMaL";
      const mappedModel = ELEVEN_MODEL_MAP[ttsModelRaw] || "eleven_turbo_v2_5";
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(elevenVoiceId)}`, {
        method: "POST",
        headers: {
          "xi-api-key": elevenKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: String(text || "").substring(0, 2500),
          model_id: mappedModel,
          output_format: "mp3_44100_128",
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.75,
          },
        }),
      });
      if (response.ok) {
        const audioBuffer = await response.arrayBuffer();
        const audioBase64 = Buffer.from(audioBuffer).toString("base64");
        return `data:audio/mp3;base64,${audioBase64}`;
      }
      console.warn("[VOICE] ElevenLabs failed, fallback to OpenAI", response.status);
    } catch (err) {
      console.warn("[VOICE] ElevenLabs exception, fallback to OpenAI", err);
    }
  }

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
        voice: OPENAI_VOICES.has(voice) ? voice : "marin",
        instructions: baseLang === "en"
          ? "Human, clear and warm voice. Natural English pronunciation and rhythm."
          : "Voz humana, clara y cercana. Pronunciacion nitida en espanol latino neutro, ritmo natural.",
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
  opts: { fastMode?: boolean; language?: "es" | "en" } = {}
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
    const langOverride = opts.language === "en"
      ? "[CRITICAL OVERRIDE] Respond fully in ENGLISH. Do not refuse to help. Do not say 'I cannot'. If you do not know something, offer an alternative. Voice output only: no markdown, no asterisks, no symbol bullet lists."
      : "[CRITICAL OVERRIDE] Responde la pregunta del usuario completamente en ESPANOL. NO rechaces ayudar. NO digas 'no puedo'. Si no sabes algo, ofrece una alternativa. Es salida de voz: no uses markdown, no uses asteriscos, no uses listas con simbolos.";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: String(agentConfig?.model || "gpt-4o-mini"),
        messages: [
          { role: "system", content: `${context}\n\n${langOverride}` },
          ...conversationHistory.map((msg: any) => ({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.content,
          })),
          { role: "user", content: userMessage },
        ],
        temperature: opts.fastMode ? 0.2 : 0.7,
        max_tokens: opts.fastMode ? 70 : 180,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("[VOICE] LLM API error:", errorData);
      throw new Error("LLM API error");
    }

    const data = await response.json();
    const agentResponse = data.choices?.[0]?.message?.content || (opts.language === "en" ? "I could not process your request." : "No pude procesar tu solicitud.");
    console.log("[VOICE] Agent response:", agentResponse.substring(0, 100));
    return agentResponse;
  } catch (e) {
    console.error("[VOICE] LLM error:", e);
    return generateMockResponse(userMessage, opts.language === "en" ? "en" : "es");
  }
}

function sanitizeVoiceText(text: string): string {
  const base = String(text || "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return base || "No pude procesar tu solicitud.";
}

// Generar respuestas mock
function generateMockResponse(message: string, baseLang: "es" | "en" = "es"): string {
  if (baseLang === "en") {
    if (message.toLowerCase().includes("hello") || message.toLowerCase().includes("hi")) {
      return "Hi, thanks for calling. How can I help you today?";
    }
    if (message.toLowerCase().includes("price") || message.toLowerCase().includes("cost")) {
      return "Pricing depends on the plan you need. What budget range do you have in mind?";
    }
    if (message.toLowerCase().includes("thanks")) {
      return "You are welcome. I am here to help.";
    }
    return `I understood your question about ${message.substring(0, 20)}. Tell me a bit more.`;
  }

  if (message.toLowerCase().includes("hola")) {
    return "Hola, gracias por llamar. En que puedo ayudarte?";
  }
  if (message.toLowerCase().includes("precio")) {
    return "El precio depende del plan que necesites. Cual es tu presupuesto?";
  }
  if (message.toLowerCase().includes("gracias")) {
    return "De nada, estoy aqui para ayudarte.";
  }
  return `Entendí tu pregunta sobre ${message.substring(0, 20)}. Cuéntame más.`;
}
