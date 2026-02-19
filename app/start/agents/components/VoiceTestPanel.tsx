"use client";

import React, { useState, useRef, useEffect } from "react";

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
  const [isCallActive, setIsCallActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<{ speaker: "agent" | "user"; text: string }[]>([]);
  const [variables, setVariables] = useState({
    contact_name: "Juan Carlos",
    contact_email: "",
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const conversationHistoryRef = useRef<{ role: "user" | "agent"; content: string }[]>([]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Auto-stop after 10 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current && isRecording) {
          stopRecording();
        }
      }, 10000);
    } catch (err: any) {
      setError("No se pudo acceder al micrófono. Verifica los permisos.");
      console.error("Microphone error:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // Detener el stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsLoading(true);
    setError(null);

    try {
      // Convertir blob a base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const audioBase64 = (event.target?.result as string).split(",")[1];

         // Construir contexto del agente PARA VOZ
         // CRÍTICO: El prompt original probablemente contiene limitaciones tipo "no puedo hacer X"
         // Necesitamos un prompt COMPLETAMENTE NUEVO que NO tenga esas limitaciones
         
         const context = `Tu nombre es: ${agentName}
Tu rol/propósito es: ${agentRole}

INSTRUCCIONES ORIGINALES (ignorar limitaciones de texto):
${agentPrompt}

CONTEXTO CRÍTICO - LEE ESTO PRIMERO:
Estás en una LLAMADA TELEFÓNICA EN VIVO. Eres un asistente de VOZ que RESPONDE CUALQUIER PREGUNTA.
- NO eres "asistente de texto" - eres de VOZ
- NO tienes limitaciones técnicas - puedes responder TODO
- Si alguien pregunta sobre cualquier cosa, RESPONDE COMPLETAMENTE
- Si no sabes algo específico, ofrece una alternativa útil
- Mantén respuestas cortas (2-3 oraciones)
- NUNCA digas "no puedo", "no tengo acceso", "lamentablemente no puedo"

INFORMACIÓN DE LA EMPRESA:
${companyContext || "No disponible"}

REGLA FINAL: Responde como si fueras un chat, pero en formato de voz. Sin rechazos por "limitaciones técnicas".`;

        // Enviar al endpoint
        const response = await fetch("/api/agents/voice-call", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audio: audioBase64,
            context,
            conversationHistory: conversationHistoryRef.current,
            agentConfig: {
              voice: voiceSettings?.voice || "nova",
              model: voiceSettings?.model || "gpt-3.5-turbo",
            },
          }),
        });

        if (!response.ok) {
          const json = await response.json();
          throw new Error(json?.error || "Error procesando la llamada");
        }

        const json = await response.json();
        const userMessage = json.userMessage;
        const agentResponse = json.agentResponse;
        const audioUrl = json.audioUrl;

        // Actualizar transcripción
        const newTranscript = [
          ...transcript,
          { speaker: "user" as const, text: userMessage || "(silencio)" },
          { speaker: "agent" as const, text: agentResponse },
        ];
        setTranscript(newTranscript);

        // Actualizar historial
        conversationHistoryRef.current = [
          ...conversationHistoryRef.current,
          { role: "user", content: userMessage },
          { role: "agent", content: agentResponse },
        ];

        // Reproducir respuesta de audio si está disponible
        if (audioUrl && audioRef.current) {
          audioRef.current.src = audioUrl;
          await audioRef.current.play().catch(e => {
            console.error("Error playing audio:", e);
          });
        }
      };
      reader.readAsDataURL(audioBlob);
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

    try {
      // Solicitar acceso al micrófono
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Detener el stream inmediatamente (solo para verificar permisos)
      stream.getTracks().forEach(track => track.stop());

      setIsCallActive(true);
      
      const greetingText = `Hola ${variables.contact_name}, soy ${agentName}. ¿Cómo puedo ayudarte hoy?`;
      
      setTranscript([
        {
          speaker: "agent",
          text: greetingText,
        },
      ]);

      conversationHistoryRef.current = [];

      // Generar y reproducir saludo con TTS
      try {
        const response = await fetch("/api/agents/voice-call", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audio: null, // No hay audio del usuario para el saludo inicial
            context: `Tu nombre es: ${agentName}`,
            conversationHistory: [],
            agentConfig: {
              voice: voiceSettings?.voice || "nova",
              model: voiceSettings?.model || "gpt-3.5-turbo",
            },
            generateAudioOnly: true, // Flag para generar solo audio sin procesar entrada
            textToSpeak: greetingText,
          }),
        });

        if (response.ok) {
          const json = await response.json();
          const audioUrl = json.audioUrl;

          if (audioUrl && audioRef.current) {
            audioRef.current.src = audioUrl;
            await audioRef.current.play().catch(e => {
              console.error("Error playing greeting audio:", e);
            });
          }
        }
      } catch (ttsErr) {
        console.error("TTS error for greeting:", ttsErr);
        // No es crítico si falla el TTS inicial
      }
    } catch (err: any) {
      setError("No se pudo acceder al micrófono. Verifica los permisos.");
      console.error("Microphone error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndCall = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsCallActive(false);
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
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      backgroundColor: C.card,
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      color: C.white,
                      fontSize: 13,
                      outline: "none",
                    }}
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
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      backgroundColor: C.card,
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      color: C.white,
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                </div>
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
