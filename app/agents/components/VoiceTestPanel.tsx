"use client";

import React, { useState, useRef, useEffect } from "react";
import { authedFetch, AuthRequiredError } from "@/app/start/_utils/authedFetch";

const C = {
  bg: "#1a1d26",
  dark: "#111318",
  card: "#22262d",
  border: "rgba(255,255,255,0.08)",
  lime: "#a3e635",
  white: "#ffffff",
  muted: "#9ca3af",
  dim: "#6b7280",
  red: "#ef4444",
};

interface VoiceTestPanelProps {
  templateId: "lia" | "alex" | "julia";
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function VoiceTestPanel({ templateId }: VoiceTestPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startRecording = async () => {
    try {
      setError(null);
      setAudioUrl(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Prefer audio/mp4 (Safari); fallback to audio/webm (Chrome)
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setRecording(true);
    } catch (e: any) {
      setError(`Error al acceder al micrófono: ${e.message}`);
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current) return;
    
    setRecording(false);
    mediaRecorderRef.current.stop();

    // Wait a bit for onstop to fire
    setTimeout(async () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      await sendAudio(blob);
    }, 100);
  };

  const sendAudio = async (audioBlob: Blob) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("template_id", templateId);
      formData.append("audio", audioBlob, "audio.webm");
      formData.append("messages", JSON.stringify(messages));

      const res = await authedFetch("/api/agents/preview", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        if (json?.code === "trial_expired") {
          setError("Trial terminado. Necesitas cambiar de plan.");
        } else if (json?.code === "credits_exhausted") {
          setError("Créditos agotados. Necesitas cambiar de plan.");
        } else {
          setError(json?.error || "Error al procesar audio");
        }
        return;
      }

      // Add messages to chat
      const newMessages: Message[] = [
        ...messages,
        { role: "user", content: json.user_text },
        { role: "assistant", content: json.assistant_text },
      ];
      setMessages(newMessages);

      // Play audio
      if (json.assistant_audio_base64) {
        const audioData = Uint8Array.from(atob(json.assistant_audio_base64), (c) => c.charCodeAt(0));
        const audioBlob = new Blob([audioData], { type: "audio/mpeg" });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // Try to autoplay
        const audio = new Audio(url);
        audio.play().catch(() => {
          // Autoplay blocked; user will click "Reproducir"
        });
      }
    } catch (e: any) {
      if (e instanceof AuthRequiredError) {
        setError("Sesión expirada. Por favor inicia sesión de nuevo.");
      } else {
        setError(e?.message || "Error desconocido");
      }
    } finally {
      setLoading(false);
    }
  };

  const playAudio = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%" }}>
      {/* Chat */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          backgroundColor: C.dark,
          borderRadius: 12,
          border: `1px solid ${C.border}`,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {messages.length === 0 && !error && (
          <div style={{ textAlign: "center", color: C.muted, marginTop: "auto", marginBottom: "auto" }}>
            <div style={{ fontSize: 14 }}>Haz clic en el botón de micrófono y habla.</div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              gap: 8,
            }}
          >
            <div
              style={{
                maxWidth: "80%",
                backgroundColor: msg.role === "user" ? C.lime : "rgba(255,255,255,0.08)",
                color: msg.role === "user" ? "#111" : C.white,
                padding: "10px 12px",
                borderRadius: 10,
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {error && (
          <div style={{ backgroundColor: `${C.red}22`, color: C.red, padding: 10, borderRadius: 8, fontSize: 12 }}>
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button
          onClick={recording ? stopRecording : startRecording}
          disabled={loading}
          style={{
            flex: 1,
            padding: "12px 16px",
            borderRadius: 10,
            border: "none",
            backgroundColor: recording ? C.red : C.lime,
            color: recording ? C.white : "#111",
            fontWeight: 900,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.75 : 1,
            fontSize: 14,
          }}
        >
          {loading ? "Procesando..." : recording ? "⏹ Detener" : "🎤 Grabar"}
        </button>

        {audioUrl && (
          <button
            onClick={playAudio}
            style={{
              flex: 1,
              padding: "12px 16px",
              borderRadius: 10,
              border: `1px solid ${C.lime}`,
              backgroundColor: "transparent",
              color: C.lime,
              fontWeight: 900,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            🔊 Reproducir
          </button>
        )}
      </div>
    </div>
  );
}
