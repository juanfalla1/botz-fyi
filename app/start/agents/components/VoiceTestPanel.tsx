"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { authedFetch } from "@/app/start/agents/authedFetchAgents";

interface VoiceTestPanelProps {
  agentName: string;
  agentRole: string;
  agentPrompt: string;
  companyContext: string;
  voiceSettings?: {
    model?: string;
    voice?: string;
  };
}

const C = {
  bg: "#1a1d26",
  dark: "#111318",
  card: "#22262d",
  hover: "#2a2e36",
  border: "rgba(255,255,255,0.08)",
  blue: "#0096ff",
  lime: "#a3e635",
  white: "#ffffff",
  muted: "#9ca3af",
  dim: "#6b7280",
  red: "#ef4444",
  purple: "#8b5cf6",
};

export default function VoiceTestPanel({
  agentName,
  agentRole,
  agentPrompt,
  companyContext,
  voiceSettings,
}: VoiceTestPanelProps) {
  const GPT_MODELS = ["gpt-4o-mini", "gpt-4.1-mini", "gpt-4o", "gpt-4.1"] as const;
  const [isCallActive, setIsCallActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accentFilter, setAccentFilter] = useState<string>("all");
  const [speechRate, setSpeechRate] = useState<number>(1.05);
  const [speechPitch, setSpeechPitch] = useState<number>(0.98);
  const [availableVoices, setAvailableVoices] = useState<{ name: string; lang: string; voiceURI: string }[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>(
    voiceSettings?.model && GPT_MODELS.includes(voiceSettings.model as any)
      ? String(voiceSettings.model)
      : "gpt-4o-mini"
  );
  const [transcript, setTranscript] = useState<{ speaker: "agent" | "user"; text: string }[]>([]);
  const [variables, setVariables] = useState({
    contact_name: "Juan Carlos",
    contact_email: "",
  });

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: 44,
    padding: "10px 12px",
    boxSizing: "border-box",
    backgroundColor: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    color: C.white,
    fontSize: 13,
    outline: "none",
    WebkitTextFillColor: C.white,
    WebkitBoxShadow: `0 0 0 1000px ${C.card} inset`,
  };

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const conversationHistoryRef = useRef<{ role: "user" | "agent"; content: string }[]>([]);
  const silenceStopTimerRef = useRef<number | null>(null);
  const recordingMaxTimerRef = useRef<number | null>(null);
  const vadAnimationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const hasSpokenRef = useRef(false);
  const preferredVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const sessionVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const liveRateRef = useRef<number>(1.05);
  const livePitchRef = useRef<number>(0.98);
  const callSessionRef = useRef(0);

  const matchesAccent = (lang: string, filter: string) => {
    if (filter === "all") return true;
    return String(lang || "").toLowerCase().startsWith(filter.toLowerCase());
  };

  const resolveVoiceByUri = (uri?: string) => {
    if (!uri) return null;
    const voices = window.speechSynthesis.getVoices();
    return voices.find((v) => v.voiceURI === uri) || voices.find((v) => v.name === uri) || null;
  };

  const firstVoiceForAccent = (filter: string) => {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    const filtered = voices.filter((v) => matchesAccent(v.lang, filter));
    const pool = filtered.length ? filtered : voices;
    const preferred = pool.find((v) => /natural|neural|online/i.test(v.name)) || pool[0];
    return preferred || null;
  };

  const visibleVoices = useMemo(() => {
    const filtered = availableVoices.filter((v) => matchesAccent(v.lang, accentFilter));
    return filtered.length ? filtered : availableVoices;
  }, [availableVoices, accentFilter]);

  const loadVoices = () => {
    try {
      const voices = window.speechSynthesis.getVoices();
      const mapped = voices.map((v) => ({ name: v.name, lang: v.lang, voiceURI: v.voiceURI }));
      mapped.sort((a, b) => {
        const aEs = a.lang.toLowerCase().startsWith("es") ? 0 : 1;
        const bEs = b.lang.toLowerCase().startsWith("es") ? 0 : 1;
        if (aEs !== bEs) return aEs - bEs;
        return `${a.lang}-${a.name}`.localeCompare(`${b.lang}-${b.name}`);
      });
      setAvailableVoices(mapped);
      setSelectedVoiceUri((prev) => {
        if (prev && mapped.some((m) => m.voiceURI === prev)) return prev;
        const es = mapped.find((m) => m.lang.toLowerCase().startsWith("es"));
        return es?.voiceURI || mapped[0]?.voiceURI || "";
      });
    } catch {
      // noop
    }
  };

  const getPreferredSpanishVoice = () => {
    const manual = resolveVoiceByUri(selectedVoiceUri);
    if (manual) return manual;
    if (preferredVoiceRef.current) return preferredVoiceRef.current;
    const synth = window.speechSynthesis;
    const voices = synth.getVoices();
    if (!voices.length) return null;

    const esVoices = voices.filter((v) => String(v.lang || "").toLowerCase().startsWith("es") && matchesAccent(v.lang, accentFilter));
    const pool = esVoices.length ? esVoices : voices;

    const preferredPatterns = [
      /microsoft.+online.+natural/i,
      /google.+natural/i,
      /microsoft.+(elena|dalia|helena|laura|sabina)/i,
      /google.+español/i,
      /(paulina|sofia|lucia|monica|maria|isabella)/i,
      /neural/i,
    ];

    for (const pattern of preferredPatterns) {
      const match = pool.find((v) => pattern.test(v.name));
      if (match) {
        preferredVoiceRef.current = match;
        return match;
      }
    }

    preferredVoiceRef.current = pool[0] || null;
    return preferredVoiceRef.current;
  };

  const speakFallback = (text: string, onStart?: () => void, onEnd?: () => void) => {
    try {
      const synth = window.speechSynthesis;
      synth.cancel();
      const utter = new SpeechSynthesisUtterance(String(text || ""));
      utter.lang = "es-ES";
      utter.rate = liveRateRef.current;
      utter.pitch = livePitchRef.current;
      utter.volume = 1;
      const fixedVoice = sessionVoiceRef.current || resolveVoiceByUri(selectedVoiceUri) || getPreferredSpanishVoice();
      if (fixedVoice) {
        utter.voice = fixedVoice;
        utter.lang = fixedVoice.lang || utter.lang;
      }
      utter.onstart = () => onStart?.();
      utter.onend = () => onEnd?.();
      utter.onerror = () => onEnd?.();
      synth.speak(utter);
    } catch {
      // noop
      onEnd?.();
    }
  };

  const stopAllPlayback = () => {
    try { window.speechSynthesis.cancel(); } catch {}
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current.onplay = null;
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
      }
    } catch {}
    setIsAgentSpeaking(false);
  };

  const pushAgentLineSynced = async (agentText: string, audioUrl?: string | null, sessionId?: number) => {
    const activeSession = sessionId ?? callSessionRef.current;
    if (activeSession !== callSessionRef.current) return;
    let appended = false;
    const appendAgent = () => {
      if (activeSession !== callSessionRef.current) return;
      if (appended) return;
      appended = true;
      setTranscript((prev) => [
        ...prev,
        { speaker: "agent" as const, text: agentText || "No pude responder." },
      ]);
    };

    if (audioUrl && audioRef.current) {
      const audio = audioRef.current;
      if (activeSession !== callSessionRef.current) return;
      setIsAgentSpeaking(true);
      const revealTimer = window.setTimeout(appendAgent, 120);
      audio.onplay = () => {
        if (activeSession !== callSessionRef.current) return;
        window.clearTimeout(revealTimer);
        appendAgent();
      };
      audio.onended = () => {
        if (activeSession !== callSessionRef.current) return;
        setIsAgentSpeaking(false);
      };
      audio.onerror = () => {
        if (activeSession !== callSessionRef.current) return;
        setIsAgentSpeaking(false);
        window.clearTimeout(revealTimer);
        appendAgent();
      };
      audio.src = audioUrl;
      await audio.play().catch(() => {
        if (activeSession !== callSessionRef.current) return;
        window.clearTimeout(revealTimer);
        appendAgent();
        setIsAgentSpeaking(true);
        speakFallback(agentText, undefined, () => setIsAgentSpeaking(false));
      });
      return;
    }

    appendAgent();
    if (activeSession !== callSessionRef.current) return;
    setIsAgentSpeaking(true);
    speakFallback(agentText, undefined, () => setIsAgentSpeaking(false));
  };

  useEffect(() => {
    try {
      const synth = window.speechSynthesis;
      const preload = () => {
        preferredVoiceRef.current = null;
        loadVoices();
        void getPreferredSpanishVoice();
      };
      preload();
      synth.onvoiceschanged = preload;
      return () => {
        if (synth.onvoiceschanged === preload) synth.onvoiceschanged = null;
      };
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    liveRateRef.current = speechRate;
  }, [speechRate]);

  useEffect(() => {
    livePitchRef.current = speechPitch;
  }, [speechPitch]);

  useEffect(() => {
    try {
      if (isCallActive) return;
      const accentVoice = firstVoiceForAccent(accentFilter);
      if (accentVoice) {
        setSelectedVoiceUri(accentVoice.voiceURI || accentVoice.name);
      }
      preferredVoiceRef.current = null;
    } catch {
      // noop
    }
  }, [accentFilter, isCallActive]);

  const blobToBase64 = async (blob: Blob): Promise<string> => {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const clearRecordingWatchers = () => {
    if (silenceStopTimerRef.current) {
      window.clearTimeout(silenceStopTimerRef.current);
      silenceStopTimerRef.current = null;
    }
    if (recordingMaxTimerRef.current) {
      window.clearTimeout(recordingMaxTimerRef.current);
      recordingMaxTimerRef.current = null;
    }
    if (vadAnimationRef.current) {
      window.cancelAnimationFrame(vadAnimationRef.current);
      vadAnimationRef.current = null;
    }
    hasSpokenRef.current = false;
    try {
      audioContextRef.current?.close();
    } catch {
      // noop
    }
    audioContextRef.current = null;
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  useEffect(() => {
    return () => {
      clearRecordingWatchers();
      try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
      stopAllPlayback();
    };
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      clearRecordingWatchers();

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      const activeSession = callSessionRef.current;
      mediaRecorder.onstop = async () => {
        clearRecordingWatchers();
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await processAudio(audioBlob, activeSession);
      };

      mediaRecorder.start();
      setIsRecording(true);

      // VAD simple: auto-stop al detectar silencio después de que el usuario hable
      try {
        const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AC) {
          const ctx: AudioContext = new AC();
          audioContextRef.current = ctx;
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 2048;
          source.connect(analyser);
          const data = new Uint8Array(analyser.fftSize);

          const tick = () => {
            if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") return;
            analyser.getByteTimeDomainData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i += 1) {
              const v = (data[i] - 128) / 128;
              sum += v * v;
            }
            const rms = Math.sqrt(sum / data.length);
            const isSpeech = rms > 0.02;

            if (isSpeech) {
              hasSpokenRef.current = true;
              if (silenceStopTimerRef.current) {
                window.clearTimeout(silenceStopTimerRef.current);
                silenceStopTimerRef.current = null;
              }
            } else if (hasSpokenRef.current && !silenceStopTimerRef.current) {
              silenceStopTimerRef.current = window.setTimeout(() => {
                silenceStopTimerRef.current = null;
                stopRecording();
              }, 850);
            }

            vadAnimationRef.current = window.requestAnimationFrame(tick);
          };
          vadAnimationRef.current = window.requestAnimationFrame(tick);
        }
      } catch {
        // ignore y seguimos con timer de seguridad
      }

      // Límite duro de grabación
      recordingMaxTimerRef.current = window.setTimeout(() => {
        stopRecording();
      }, 5200);
    } catch (err: any) {
      setError("No se pudo acceder al micrófono. Verifica los permisos.");
      console.error("Microphone error:", err);
    }
  };

  const stopRecording = () => {
    clearRecordingWatchers();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // Detener el stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  const processAudio = async (audioBlob: Blob, sessionId: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const audioBase64 = await blobToBase64(audioBlob);

      const promptCompact = String(agentPrompt || "").slice(0, 800);
      const companyCompact = String(companyContext || "No disponible").slice(0, 700);
      const context = `Tu nombre es: ${agentName}
Tu rol/propósito es: ${agentRole}

INSTRUCCIONES ORIGINALES (ignorar limitaciones de texto):
${promptCompact}

CONTEXTO CRÍTICO - LEE ESTO PRIMERO:
Estás en una LLAMADA TELEFÓNICA EN VIVO. Eres un asistente de VOZ que RESPONDE CUALQUIER PREGUNTA.
- NO eres "asistente de texto" - eres de VOZ
- NO tienes limitaciones técnicas - puedes responder TODO
- Si alguien pregunta sobre cualquier cosa, RESPONDE COMPLETAMENTE
- Si no sabes algo específico, ofrece una alternativa útil
- Mantén respuestas cortas (2-3 oraciones)
 - Mantén respuestas muy cortas (1-2 oraciones, máximo 35 palabras)
- NUNCA digas "no puedo", "no tengo acceso", "lamentablemente no puedo"

INFORMACIÓN DE LA EMPRESA:
${companyCompact}

REGLA FINAL: Responde como si fueras un chat, pero en formato de voz. Sin rechazos por "limitaciones técnicas".`;

      const response = await authedFetch("/api/agents/voice-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audio: audioBase64,
          context,
          fast_mode: true,
          conversationHistory: conversationHistoryRef.current.slice(-6),
          agentConfig: {
            voice: voiceSettings?.voice || "marin",
            model: selectedModel,
          },
        }),
      });

      const json = await response.json();
      if (sessionId !== callSessionRef.current) return;
      if (!response.ok || !json?.ok) {
        throw new Error(json?.error || "Error procesando la llamada");
      }

      const userMessage = String(json.userMessage || "");
      const agentResponse = String(json.agentResponse || "");

      setTranscript((prev) => [
        ...prev,
        { speaker: "user" as const, text: userMessage || "(silencio)" },
      ]);

      conversationHistoryRef.current = [
        ...conversationHistoryRef.current,
        { role: "user", content: userMessage },
        { role: "agent", content: agentResponse },
      ];

      await pushAgentLineSynced(agentResponse, null, sessionId);
    } catch (err: any) {
      setError(err?.message || "Error procesando la llamada");
      console.error("Audio processing error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartCall = async () => {
    setIsLoading(true);
    setError(null);
    callSessionRef.current += 1;
    const sessionId = callSessionRef.current;
    stopAllPlayback();

    try {
      const picked = resolveVoiceByUri(selectedVoiceUri) || firstVoiceForAccent(accentFilter) || getPreferredSpanishVoice();
      sessionVoiceRef.current = picked;
      // Solicitar acceso al micrófono
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Detener el stream inmediatamente (solo para verificar permisos)
      stream.getTracks().forEach(track => track.stop());

      setIsCallActive(true);
      
      const greetingText = `Hola ${variables.contact_name}, soy ${agentName}. ¿Cómo puedo ayudarte hoy?`;
      
      setTranscript([]);

      conversationHistoryRef.current = [];
      await pushAgentLineSynced(greetingText, null, sessionId);
    } catch (err: any) {
      setError("No se pudo acceder al micrófono. Verifica los permisos.");
      console.error("Microphone error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndCall = () => {
    callSessionRef.current += 1;
    clearRecordingWatchers();
    stopAllPlayback();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
    setIsLoading(false);
    setIsCallActive(false);
    sessionVoiceRef.current = null;
    setTranscript([]);
    conversationHistoryRef.current = [];
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, height: "100%" }}>
      {/* Top Panel - Instructions (Horizontal) */}
      <div
        style={{
          backgroundColor: C.dark,
          borderRadius: 14,
          border: `1px solid ${C.border}`,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          maxHeight: 140,
          overflow: "hidden",
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 8, color: C.white }}>
          📋 Instrucciones del Agente
        </div>
        <div
          style={{
            flex: 1,
            overflow: "auto",
            fontSize: 12,
            lineHeight: 1.5,
            color: C.muted,
            fontFamily: "monospace",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {`Nombre: ${agentName} | Rol: ${agentRole || "Asistente"} | Empresa: ${companyContext?.substring(0, 50) || "Botz"}`}
          {agentPrompt && `\n\nInstrucciones: ${agentPrompt}`}
        </div>
      </div>

      {/* Call Interface Panel */}
      <div
        style={{
          backgroundColor: C.dark,
          borderRadius: 14,
          border: `1px solid ${C.border}`,
          padding: 20,
          display: "flex",
          flexDirection: "column",
          flex: 1,
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 16, color: C.white }}>
          {isCallActive ? "Transcripción de la llamada" : "Haz una llamada de prueba"}
        </div>

        {!isCallActive ? (
          <>
            {/* Variables */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 4 }}>
                  gpt_model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}
                >
                  {GPT_MODELS.map((m) => (
                    <option key={m} value={m}>
                      {m.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ fontSize: 13, fontWeight: 800, color: C.muted, marginBottom: 10 }}>
                VARIABLES DE ENTRADA:
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 4 }}>
                    contact_name
                  </label>
                  <input
                    type="text"
                    value={variables.contact_name}
                    onChange={(e) => setVariables({ ...variables, contact_name: e.target.value })}
                    style={inputStyle}
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 4 }}>
                    contact_email
                  </label>
                  <input
                    type="email"
                    value={variables.contact_email}
                    onChange={(e) => setVariables({ ...variables, contact_email: e.target.value })}
                    style={inputStyle}
                    autoComplete="off"
                  />
                </div>
              </div>

              <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 4 }}>
                    acento
                  </label>
                  <select
                    value={accentFilter}
                    onChange={(e) => {
                      preferredVoiceRef.current = null;
                      setAccentFilter(e.target.value);
                    }}
                    style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}
                  >
                    <option value="all">Todos</option>
                    <option value="es">Español (todos)</option>
                    <option value="es-ES">España</option>
                    <option value="es-MX">México</option>
                    <option value="es-AR">Argentina</option>
                    <option value="es-CO">Colombia</option>
                    <option value="es-US">Español USA</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 4 }}>
                    velocidad
                  </label>
                  <select
                    value={String(speechRate)}
                    onChange={(e) => setSpeechRate(Number(e.target.value || "0.9"))}
                    style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}
                  >
                    <option value="0.78">Muy lenta</option>
                    <option value="0.92">Lenta</option>
                    <option value="1.05">Natural</option>
                    <option value="1.22">Rápida</option>
                    <option value="1.35">Muy rápida</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 4 }}>
                  voz
                </label>
                <select
                  value={selectedVoiceUri}
                  onChange={(e) => {
                    preferredVoiceRef.current = null;
                    setSelectedVoiceUri(e.target.value);
                  }}
                  style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}
                >
                  {visibleVoices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>{`${v.name} (${v.lang})`}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginTop: 8, color: C.dim, fontSize: 11 }}>
                El acento elige voz automática por país; también puedes fijar voz exacta manualmente.
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div
                style={{
                  padding: "10px 12px",
                  backgroundColor: "rgba(239,68,68,0.15)",
                  color: "#f87171",
                  fontSize: 12,
                  borderRadius: 8,
                  marginBottom: 16,
                }}
              >
                ⚠️ {error}
              </div>
            )}

            {/* Start Call Button */}
            <button
              onClick={handleStartCall}
              disabled={isLoading}
              style={{
                padding: "14px 20px",
                borderRadius: 12,
                border: "none",
                backgroundColor: isLoading ? C.dim : C.lime,
                color: "#111",
                fontWeight: 900,
                fontSize: 15,
                cursor: isLoading ? "not-allowed" : "pointer",
                transition: "all 0.2s",
              }}
            >
              {isLoading ? "Conectando..." : "📞 Iniciar llamada web"}
            </button>
          </>
        ) : (
          <>
            {/* Transcript */}
            <div
              ref={scrollRef}
              style={{
                flex: 1,
                overflow: "auto",
                marginBottom: 16,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                paddingRight: 8,
              }}
            >
              {transcript.length === 0 ? (
                <div style={{ textAlign: "center", color: C.muted, paddingTop: 40 }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>📞</div>
                  <div>Esperando...</div>
                </div>
              ) : (
                transcript.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: item.speaker === "agent" ? "rgba(139,92,246,0.2)" : C.blue,
                      padding: "12px 16px",
                      borderRadius: 10,
                      borderBottomRightRadius: item.speaker === "user" ? 4 : 10,
                      borderBottomLeftRadius: item.speaker === "agent" ? 4 : 10,
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 600, color: item.speaker === "agent" ? C.purple : "rgba(255,255,255,0.8)", marginBottom: 4 }}>
                      {item.speaker === "agent" ? agentName : "Tú"}
                    </div>
                    <div style={{ color: C.white, fontSize: 13, lineHeight: 1.5 }}>
                      {item.text}
                    </div>
                  </div>
                ))
              )}

              {isLoading && (
                <div style={{ textAlign: "center", color: C.muted }}>
                  <div style={{ fontSize: 11 }}>Procesando...</div>
                </div>
              )}
              {isAgentSpeaking && (
                <div style={{ textAlign: "center", color: "#93c5fd" }}>
                  <div style={{ fontSize: 11 }}>Hablando...</div>
                </div>
              )}
            </div>

            {/* Recording Indicator & Controls */}
            <div style={{ marginBottom: 16 }}>
              {isRecording && (
                <div style={{ textAlign: "center", marginBottom: 10 }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: "#ef4444",
                      animation: "pulse 1s infinite",
                      marginRight: 8,
                    }}
                  />
                  <span style={{ color: C.red, fontSize: 12, fontWeight: 600 }}>
                    Grabando...
                  </span>
                </div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    disabled={isLoading}
                    style={{
                      flex: 1,
                      padding: "12px 16px",
                      borderRadius: 10,
                      border: "none",
                      backgroundColor: isLoading ? C.dim : C.lime,
                      color: "#111",
                      fontWeight: 900,
                      fontSize: 13,
                      cursor: isLoading ? "not-allowed" : "pointer",
                    }}
                  >
                    🎤 Hablar
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    style={{
                      flex: 1,
                      padding: "12px 16px",
                      borderRadius: 10,
                      border: "none",
                      backgroundColor: C.red,
                      color: "#fff",
                      fontWeight: 900,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    ⏹️ Detener
                  </button>
                )}

                <button
                  onClick={handleEndCall}
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    borderRadius: 10,
                    border: `1px solid ${C.border}`,
                    backgroundColor: "transparent",
                    color: C.muted,
                    fontWeight: 900,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Finalizar llamada
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div
                style={{
                  padding: "10px 12px",
                  backgroundColor: "rgba(239,68,68,0.15)",
                  color: "#f87171",
                  fontSize: 12,
                  borderRadius: 8,
                }}
              >
                ⚠️ {error}
              </div>
            )}
          </>
        )}

        {/* Audio element for playback */}
        <audio
          ref={audioRef}
          style={{ display: "none" }}
          controls
        />
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}
