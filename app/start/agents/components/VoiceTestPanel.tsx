"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { authedFetch } from "@/app/start/agents/authedFetchAgents";

interface VoiceTestPanelProps {
  agentName: string;
  agentRole: string;
  agentPrompt: string;
  companyContext: string;
  companyName?: string;
  agentLanguage?: string;
  compact?: boolean;
  onSessionSaved?: (session: {
    id: string;
    startedAt: string;
    endedAt: string;
    durationSec: number;
    contactName: string;
    success: boolean;
    transcript: { speaker: "agent" | "user"; text: string }[];
  }) => void;
  voiceSettings?: {
    llmModel?: string;
    voice?: string;
    provider?: string;
    profileId?: string;
    ttsModel?: string;
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

const OPENAI_VOICE_PRESETS = [
  { id: "marin", label: "Marin (Natural ES)", accents: ["es", "es-CO", "es-MX", "es-AR", "es-US"] },
  { id: "coral", label: "Coral (Warm)", accents: ["es", "es-CO", "es-MX"] },
  { id: "sage", label: "Sage (Clear)", accents: ["es", "es-ES", "en"] },
  { id: "alloy", label: "Alloy (Neutral)", accents: ["es", "en", "es-ES", "es-US"] },
  { id: "nova", label: "Nova (Expressive)", accents: ["es", "es-AR", "es-MX", "en"] },
] as const;

const ELEVEN_VOICE_PRESETS = [
  { id: "angie_col", label: "Angie Colombia", accents: ["es", "es-CO"] },
  { id: "lupe_mx", label: "Lupe Mexico", accents: ["es", "es-MX", "es-US"] },
  { id: "ana_corp", label: "Ana Corporativa", accents: ["es", "es-CO", "es-ES"] },
  { id: "camila_warm", label: "Camila Warm", accents: ["es", "es-MX", "es-AR"] },
  { id: "gabriela", label: "Gabriela", accents: ["es", "es-AR", "es-US"] },
] as const;

export default function VoiceTestPanel({
  agentName,
  agentRole,
  agentPrompt,
  companyContext,
  companyName,
  agentLanguage,
  compact = false,
  onSessionSaved,
  voiceSettings,
}: VoiceTestPanelProps) {
  const isEnglish = String(agentLanguage || "es-ES").toLowerCase().startsWith("en");
  const tr = (es: string, en: string) => (isEnglish ? en : es);
  const langPrefix = isEnglish ? "en" : "es";
  const GPT_MODELS = ["gpt-4o-mini", "gpt-4.1-mini", "gpt-4o", "gpt-4.1", "gemini-2.0-flash", "gemini-2.5-flash"] as const;
  const [isCallActive, setIsCallActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [handsFreeMode, setHandsFreeMode] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accentFilter, setAccentFilter] = useState<string>(isEnglish ? "en" : "all");
  const [speechRate, setSpeechRate] = useState<number>(1.05);
  const [speechPitch, setSpeechPitch] = useState<number>(0.98);
  const [availableVoices, setAvailableVoices] = useState<{ name: string; lang: string; voiceURI: string }[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState<string>("");
  const providerKey = String(voiceSettings?.provider || "openai").toLowerCase();
  const [selectedCloudVoice, setSelectedCloudVoice] = useState<string>(
    String(voiceSettings?.voice || (providerKey === "elevenlabs" ? ELEVEN_VOICE_PRESETS[0].id : OPENAI_VOICE_PRESETS[0].id))
  );
  const [selectedModel, setSelectedModel] = useState<string>(
    voiceSettings?.llmModel && GPT_MODELS.includes(voiceSettings.llmModel as any)
      ? String(voiceSettings.llmModel)
      : "gpt-4o-mini"
  );
  const [transcript, setTranscript] = useState<{ speaker: "agent" | "user"; text: string }[]>([]);
  const [variables, setVariables] = useState({
    contact_name: "Juan Carlos",
    contact_email: "",
  });

  const VAD_RMS_THRESHOLD = 0.014;
  const VAD_SILENCE_MS_TO_STOP = 520;
  const VAD_MIN_SPEECH_MS = 220;
  const VAD_MIN_RECORDING_MS_BEFORE_STOP = 650;
  const MAX_RECORDING_MS = 9000;

  const MICROPHONE_CONSTRAINTS: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1,
    sampleRate: 16000,
  };

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
  const spokenAtRef = useRef<number>(0);
  const recordingStartedAtRef = useRef<number>(0);
  const preferredVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const sessionVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const liveRateRef = useRef<number>(1.05);
  const livePitchRef = useRef<number>(0.98);
  const callSessionRef = useRef(0);
  const silentTurnsRef = useRef(0);
  const isCallActiveRef = useRef(false);
  const isRecordingRef = useRef(false);
  const isLoadingRef = useRef(false);
  const isAgentSpeakingRef = useRef(false);
  const callStartedAtRef = useRef<number>(0);

  const firstName = (full: string) => {
    const clean = String(full || "").trim();
    if (!clean) return "";
    return clean.split(/\s+/)[0] || "";
  };

  const brandName = String(companyName || "").trim() || "tu empresa";
  const safeAgentName = String(agentName || "Asistente").trim() || "Asistente";
  const agentNameLc = safeAgentName.toLowerCase();
  const brandNameLc = brandName.toLowerCase();
  const agentAlreadyMentionsBrand = agentNameLc.includes(brandNameLc) || brandNameLc.includes(agentNameLc);
  const agentSameAsBrand = agentNameLc === brandNameLc;

  const agentWithBrand = agentAlreadyMentionsBrand ? safeAgentName : `${safeAgentName} de ${brandName}`;
  const speakerIntro = agentSameAsBrand ? `nuestro asistente de ${brandName}` : agentWithBrand;
  const speakerShort = agentSameAsBrand ? `nuestro asistente` : safeAgentName;

  const dedupePrompt = (raw: string) => {
    const text = String(raw || "").trim();
    if (!text) return "";
    const half = Math.floor(text.length / 2);
    const first = text.slice(0, half).trim();
    const second = text.slice(half).trim();
    if (first && second && first === second) return first;
    const marker = "OBJETIVO:";
    const firstMarker = text.indexOf(marker);
    if (firstMarker >= 0) {
      const nextMarker = text.indexOf(marker, firstMarker + marker.length);
      if (nextMarker > firstMarker) {
        const prefix = text.slice(0, firstMarker).trim();
        const firstBlock = text.slice(firstMarker, nextMarker).trim();
        const secondBlock = text.slice(nextMarker).trim();
        if (firstBlock === secondBlock) return `${prefix}\n\n${firstBlock}`.trim();
      }
    }
    return text;
  };

  const buildScenarioGreeting = () => {
    const name = firstName(variables.contact_name) || "";
    const roleText = String(agentRole || "").toLowerCase();
    const promptText = String(agentPrompt || "").toLowerCase();
    const bag = `${roleText} ${promptText}`;

    const withName = (txt: string) => (name ? txt.replaceAll("{{name}}", name) : txt.replaceAll("{{name}}", ""));

    if (!isEnglish && /pesaje|balanza|metrolog|calibra|explorer|adventurer|pioneer|valor|ranger/.test(bag)) {
      return withName(`Hola {{name}}, bienvenido a ${brandName}. Te habla ${speakerShort}. Para recomendarte el equipo ideal, ¿qué capacidad máxima necesitas pesar?`);
    }

    if (isEnglish && /collection|overdue|payment/.test(bag)) {
      return withName(`Hi {{name}}, this is ${brandName} following up on an outstanding payment. Can we quickly review your payment status?`);
    }
    if (isEnglish && /reminder|follow-up/.test(bag)) {
      return withName(`Hi {{name}}, this is ${brandName} with a quick reminder. Can we confirm your commitment now?`);
    }
    if (isEnglish && /meeting|schedule|appointment/.test(bag)) {
      return withName(`Hi {{name}}, this is ${brandName} calling to confirm your meeting details. Do you have one minute?`);
    }
    if (isEnglish && /lead|prospect|qualification/.test(bag)) {
      return withName(`Hi {{name}}, this is ${brandName}. I want to understand your current process and see where we can help. Is now a good time?`);
    }
    if (isEnglish && /support|customer service/.test(bag)) {
      return withName(`Hi {{name}}, this is ${brandName} support. Please tell me how I can help you today.`);
    }
    if (isEnglish && /receptionist/.test(bag)) {
      return withName(`Hi {{name}}, welcome to ${brandName}. I can route your request to the right team. What is the reason for your call?`);
    }

    if (!isEnglish && /cobranza|pago pendiente|cartera|mora/.test(bag)) {
      return withName(`Hola {{name}}, te llamo de ${brandName} por una gestión de pago pendiente. ¿Podemos validar el estado de tu pago?`);
    }
    if (!isEnglish && /recordatorio|enviar recordatorios|reunión programada/.test(bag)) {
      return withName(`Hola {{name}}, te llamo de ${brandName} para recordarte tu compromiso programado. ¿Te viene bien confirmarlo ahora?`);
    }
    if (!isEnglish && /confirmación de reuniones|confirmar reunión|programar reuniones/.test(bag)) {
      return withName(`Hola {{name}}, te llamo de ${brandName} para confirmar los detalles de tu reunión. ¿Tienes un minuto?`);
    }
    if (!isEnglish && /calificación de leads|lead|llamadas en frio|prospección/.test(bag)) {
      return withName(`Hola {{name}}, te habla ${agentWithBrand}. Quiero entender tu proceso actual para ver si te podemos ayudar a optimizarlo. ¿Te parece bien?`);
    }
    if (!isEnglish && /soporte|atención al cliente|servicio al cliente/.test(bag)) {
      return withName(`Hola {{name}}, te habla ${agentWithBrand} del equipo de soporte. Cuéntame por favor en qué te puedo ayudar hoy.`);
    }
    if (!isEnglish && /recepcionista/.test(bag)) {
      return withName(`Hola {{name}}, bienvenido a ${brandName}. Estoy para ayudarte a dirigir tu solicitud al área correcta. ¿Cuál es el motivo de tu llamada?`);
    }

    return withName(
      isEnglish
        ? "Hi {{name}}, I am " + agentName + ". How can I help you today?"
        : "Hola {{name}}, soy " + agentName + ". ¿Cómo puedo ayudarte hoy?"
    );
  };

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

  const modelVoiceOptions = useMemo(() => {
    const source = providerKey === "elevenlabs" ? ELEVEN_VOICE_PRESETS : OPENAI_VOICE_PRESETS;
    const normalizedAccent = String(accentFilter || "all").toLowerCase();
    if (normalizedAccent === "all") return source;
    const filtered = source.filter((v) => v.accents.some((a) => normalizedAccent.startsWith(a.toLowerCase()) || a.toLowerCase().startsWith(normalizedAccent)));
    return filtered.length ? filtered : source;
  }, [providerKey, accentFilter]);

  const loadVoices = () => {
    try {
      const voices = window.speechSynthesis.getVoices();
      const mapped = voices.map((v) => ({ name: v.name, lang: v.lang, voiceURI: v.voiceURI }));
      mapped.sort((a, b) => {
        const aPreferred = a.lang.toLowerCase().startsWith(langPrefix) ? 0 : 1;
        const bPreferred = b.lang.toLowerCase().startsWith(langPrefix) ? 0 : 1;
        if (aPreferred !== bPreferred) return aPreferred - bPreferred;
        return `${a.lang}-${a.name}`.localeCompare(`${b.lang}-${b.name}`);
      });
      setAvailableVoices(mapped);
      setSelectedVoiceUri((prev) => {
        if (prev && mapped.some((m) => m.voiceURI === prev)) return prev;
        const preferred = mapped.find((m) => m.lang.toLowerCase().startsWith(langPrefix));
        return preferred?.voiceURI || mapped[0]?.voiceURI || "";
      });
    } catch {
      // noop
    }
  };

  const getPreferredVoice = () => {
    const manual = resolveVoiceByUri(selectedVoiceUri);
    if (manual) return manual;
    if (preferredVoiceRef.current) return preferredVoiceRef.current;
    const synth = window.speechSynthesis;
    const voices = synth.getVoices();
    if (!voices.length) return null;

    const preferredVoices = voices.filter((v) => String(v.lang || "").toLowerCase().startsWith(langPrefix) && matchesAccent(v.lang, accentFilter));
    const pool = preferredVoices.length ? preferredVoices : voices;

    const preferredPatterns = [
      /microsoft.+online.+natural/i,
      /google.+natural/i,
      /microsoft.+(elena|dalia|helena|laura|sabina)/i,
      /google.+español|google.+english/i,
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
      utter.lang = isEnglish ? "en-US" : "es-ES";
      utter.rate = liveRateRef.current;
      utter.pitch = livePitchRef.current;
      utter.volume = 1;
      const fixedVoice = sessionVoiceRef.current || resolveVoiceByUri(selectedVoiceUri) || getPreferredVoice();
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
        if (handsFreeMode && isCallActiveRef.current && !isRecordingRef.current && !isLoadingRef.current) {
          window.setTimeout(() => {
            if (activeSession !== callSessionRef.current) return;
            void startRecording();
          }, 60);
        }
      };
      audio.onerror = () => {
        if (activeSession !== callSessionRef.current) return;
        setIsAgentSpeaking(false);
        window.clearTimeout(revealTimer);
        appendAgent();
        if (handsFreeMode && isCallActiveRef.current && !isRecordingRef.current && !isLoadingRef.current) {
          window.setTimeout(() => {
            if (activeSession !== callSessionRef.current) return;
            void startRecording();
          }, 80);
        }
      };
      audio.src = audioUrl;
      await audio.play().catch(() => {
        if (activeSession !== callSessionRef.current) return;
        window.clearTimeout(revealTimer);
        appendAgent();
        setIsAgentSpeaking(false);
        if (handsFreeMode && isCallActiveRef.current && !isRecordingRef.current && !isLoadingRef.current) {
          window.setTimeout(() => {
            if (activeSession !== callSessionRef.current) return;
            void startRecording();
          }, 70);
        }
      });
      return;
    }

    appendAgent();
    if (activeSession !== callSessionRef.current) return;
    setIsAgentSpeaking(false);
    if (handsFreeMode && isCallActiveRef.current && !isRecordingRef.current && !isLoadingRef.current) {
      window.setTimeout(() => {
        if (activeSession !== callSessionRef.current) return;
        void startRecording();
      }, 70);
    }
  };

  useEffect(() => {
    try {
      const synth = window.speechSynthesis;
      const preload = () => {
        preferredVoiceRef.current = null;
        loadVoices();
        void getPreferredVoice();
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
    isCallActiveRef.current = isCallActive;
  }, [isCallActive]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    isAgentSpeakingRef.current = isAgentSpeaking;
  }, [isAgentSpeaking]);

  useEffect(() => {
    livePitchRef.current = speechPitch;
  }, [speechPitch]);

  useEffect(() => {
    const incoming = String(voiceSettings?.llmModel || "");
    if (incoming && GPT_MODELS.includes(incoming as any)) {
      setSelectedModel(incoming);
    }
  }, [voiceSettings?.llmModel]);

  useEffect(() => {
    const incoming = String(voiceSettings?.voice || "").trim();
    if (incoming) {
      setSelectedCloudVoice(incoming);
      return;
    }
    setSelectedCloudVoice(providerKey === "elevenlabs" ? ELEVEN_VOICE_PRESETS[0].id : OPENAI_VOICE_PRESETS[0].id);
  }, [voiceSettings?.voice, providerKey]);

  useEffect(() => {
    if (!modelVoiceOptions.length) return;
    if (modelVoiceOptions.some((v) => v.id === selectedCloudVoice)) return;
    setSelectedCloudVoice(modelVoiceOptions[0].id);
  }, [modelVoiceOptions, selectedCloudVoice]);

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
    spokenAtRef.current = 0;
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
    if (!isCallActiveRef.current || isRecordingRef.current || isLoadingRef.current || isAgentSpeakingRef.current) return;
    try {
      setError(null);
      const stream = streamRef.current || await navigator.mediaDevices.getUserMedia({ audio: MICROPHONE_CONSTRAINTS });
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
      recordingStartedAtRef.current = Date.now();

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
            const isSpeech = rms > VAD_RMS_THRESHOLD;

            if (isSpeech) {
              hasSpokenRef.current = true;
              if (!spokenAtRef.current) spokenAtRef.current = Date.now();
              if (silenceStopTimerRef.current) {
                window.clearTimeout(silenceStopTimerRef.current);
                silenceStopTimerRef.current = null;
              }
            } else if (hasSpokenRef.current && !silenceStopTimerRef.current) {
              silenceStopTimerRef.current = window.setTimeout(() => {
                silenceStopTimerRef.current = null;
                const now = Date.now();
                const speechEnough = now - (spokenAtRef.current || now) >= VAD_MIN_SPEECH_MS;
                const recordingEnough = now - (recordingStartedAtRef.current || now) >= VAD_MIN_RECORDING_MS_BEFORE_STOP;
                if (speechEnough && recordingEnough) {
                  stopRecording();
                }
              }, VAD_SILENCE_MS_TO_STOP);
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
      }, MAX_RECORDING_MS);
    } catch (err: any) {
      setError(tr("No se pudo acceder al micrófono. Verifica los permisos.", "Could not access microphone. Check permissions."));
      console.error("Microphone error:", err);
    }
  };

  const stopRecording = () => {
    clearRecordingWatchers();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob, sessionId: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const audioBase64 = await blobToBase64(audioBlob);

      const promptCompact = dedupePrompt(agentPrompt).slice(0, 1200);
      const companyCompact = String(companyContext || "No disponible").slice(0, 900);
      const context = isEnglish
        ? `Your name is: ${agentName}
Company name: ${brandName}
Your role/purpose is: ${agentRole}

ORIGINAL INSTRUCTIONS:
${promptCompact}

PRIORITY RULE:
- If role/purpose conflicts with original instructions, original instructions always win.

CRITICAL CONTEXT:
You are in a LIVE PHONE CALL as a VOICE assistant.
- Keep answers concise (1-2 sentences, max 35 words)
- If you do not know a specific detail, offer a useful alternative
- Do not reject requests due to technical limitations

COMPANY INFORMATION:
${companyCompact}

FINAL RULE: Answer as a voice agent, clear and helpful.`
        : `Tu nombre es: ${agentName}
Nombre de la empresa: ${brandName}
Tu rol/proposito es: ${agentRole}

INSTRUCCIONES ORIGINALES:
${promptCompact}

REGLA DE PRIORIDAD:
- Si el rol/proposito corto contradice las instrucciones originales, SIEMPRE mandan las instrucciones originales.

CONTEXTO CRITICO:
Estas en una LLAMADA TELEFONICA EN VIVO como asistente de VOZ.
- Manten respuestas cortas (1-2 oraciones, maximo 35 palabras)
- Si no sabes algo especifico, ofrece una alternativa util
- No rechaces por limitaciones tecnicas

INFORMACION DE LA EMPRESA:
${companyCompact}

REGLA FINAL: Responde como agente de voz, claro y util.`;

      const response = await authedFetch("/api/agents/voice-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audio: audioBase64,
          context,
          fast_mode: true,
          conversationHistory: conversationHistoryRef.current.slice(-6),
          agentConfig: {
            voice: selectedCloudVoice || voiceSettings?.voice || "marin",
            voice_provider: voiceSettings?.provider || "openai",
            voice_profile_id: voiceSettings?.profileId || "",
            tts_model: voiceSettings?.ttsModel || "",
            model: selectedModel,
            language: agentLanguage || (isEnglish ? "en-US" : "es-ES"),
            tts_locale: accentFilter,
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

      const silenceDetected = !userMessage.trim();
      if (silenceDetected) {
        silentTurnsRef.current += 1;
      } else {
        silentTurnsRef.current = 0;
      }

      setTranscript((prev) => [
        ...prev,
        { speaker: "user" as const, text: userMessage || "(silencio)" },
      ]);

      if (silenceDetected) {
        const nudge = silentTurnsRef.current >= 4
          ? (isEnglish
              ? "I cannot hear you clearly. If you want, we can end for now and continue when you are ready."
              : "No te escucho con claridad. Si quieres, finalizamos por ahora y retomamos cuando estes listo.")
          : (isEnglish ? "I could not hear you well. Are you still there?" : "No te escuche bien. Sigues ahi?");
        await pushAgentLineSynced(nudge, null, sessionId);
        if (silentTurnsRef.current >= 4) {
          window.setTimeout(() => {
            if (sessionId !== callSessionRef.current) return;
            handleEndCall();
          }, 900);
        }
        return;
      }

      conversationHistoryRef.current = [
        ...conversationHistoryRef.current,
        { role: "user", content: userMessage },
        { role: "agent", content: agentResponse },
      ];

      await pushAgentLineSynced(agentResponse, json?.audioUrl || null, sessionId);
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
      const picked = resolveVoiceByUri(selectedVoiceUri) || firstVoiceForAccent(accentFilter) || getPreferredVoice();
      sessionVoiceRef.current = picked;
      // Solicitar acceso al micrófono
      const stream = await navigator.mediaDevices.getUserMedia({ audio: MICROPHONE_CONSTRAINTS });
      streamRef.current = stream;

      setIsCallActive(true);
      callStartedAtRef.current = Date.now();
      silentTurnsRef.current = 0;
      
      const greetingText = buildScenarioGreeting();
      
      setTranscript([]);

      conversationHistoryRef.current = [];
      let greetingAudioUrl: string | null = null;
      try {
        const greetingRes = await authedFetch("/api/agents/voice-call", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            generateAudioOnly: true,
            textToSpeak: greetingText,
            agentConfig: {
              voice: selectedCloudVoice || voiceSettings?.voice || "marin",
              voice_provider: voiceSettings?.provider || "openai",
              voice_profile_id: voiceSettings?.profileId || "",
              tts_model: voiceSettings?.ttsModel || "",
              language: agentLanguage || (isEnglish ? "en-US" : "es-ES"),
              tts_locale: accentFilter,
            },
          }),
        });
        const greetingJson = await greetingRes.json().catch(() => ({}));
        if (greetingRes.ok && greetingJson?.ok && greetingJson?.audioUrl) {
          greetingAudioUrl = String(greetingJson.audioUrl);
        }
      } catch {
        // fallback local speech
      }
      await pushAgentLineSynced(greetingText, greetingAudioUrl, sessionId);
    } catch (err: any) {
      setError(tr("No se pudo acceder al micrófono. Verifica los permisos.", "Could not access microphone. Check permissions."));
      console.error("Microphone error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndCall = () => {
    const endedAt = Date.now();
    const startedAt = callStartedAtRef.current || endedAt;
    const durationSec = Math.max(0, Math.floor((endedAt - startedAt) / 1000));
    const finalTranscript = [...transcript];
    if (finalTranscript.length || durationSec > 0) {
      try {
        onSessionSaved?.({
          id: `web_${startedAt}_${Math.random().toString(16).slice(2, 8)}`,
          startedAt: new Date(startedAt).toISOString(),
          endedAt: new Date(endedAt).toISOString(),
          durationSec,
          contactName: String(variables.contact_name || "N/A"),
          success: finalTranscript.some((t) => t.speaker === "user" && t.text && t.text !== "(silencio)"),
          transcript: finalTranscript,
        });
      } catch {
        // noop
      }
    }

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
    silentTurnsRef.current = 0;
    callStartedAtRef.current = 0;
    sessionVoiceRef.current = null;
    setTranscript([]);
    conversationHistoryRef.current = [];
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: compact ? 12 : 20, height: compact ? "auto" : "100%" }}>
      {/* Top Panel - Instructions (Horizontal) */}
      {!compact && (
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
            {`Nombre: ${agentName} | Rol: ${agentRole || "Asistente"} | Empresa: ${brandName}`}
            {agentPrompt && `\n\nInstrucciones: ${agentPrompt}`}
          </div>
        </div>
      )}

      {/* Call Interface Panel */}
      <div
        style={{
          backgroundColor: C.dark,
          borderRadius: 14,
          border: `1px solid ${C.border}`,
          padding: compact ? 14 : 20,
          display: "flex",
          flexDirection: "column",
          flex: compact ? undefined : 1,
          overflow: compact ? "auto" : "visible",
        }}
      >
        <div style={{ fontWeight: 900, fontSize: compact ? 28 : 16, marginBottom: 16, color: C.white }}>
          {isCallActive ? tr("Transcripción de la llamada", "Call transcript") : tr("Haz una llamada de prueba", "Make a test call")}
        </div>

        {!isCallActive ? (
          <>
            {/* Variables */}
            <div style={{ marginBottom: 20 }}>
              {!compact && <div style={{ marginBottom: 12 }}>
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
              </div>}

              <div style={{ fontSize: 13, fontWeight: 800, color: C.muted, marginBottom: 10 }}>
                {tr("VARIABLES DE ENTRADA:", "INPUT VARIABLES:")}
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
                    {tr("acento", "accent")}
                  </label>
                  <select
                    value={accentFilter}
                    onChange={(e) => {
                      preferredVoiceRef.current = null;
                      setAccentFilter(e.target.value);
                    }}
                    style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}
                  >
                    <option value="all">{tr("Todos", "All")}</option>
                    <option value="es">{tr("Español (todos)", "Spanish (all)")}</option>
                    <option value="es-ES">{tr("España", "Spain")}</option>
                    <option value="es-MX">{tr("México", "Mexico")}</option>
                    <option value="es-AR">{tr("Argentina", "Argentina")}</option>
                    <option value="es-CO">{tr("Colombia", "Colombia")}</option>
                    <option value="es-US">{tr("Español USA", "US Spanish")}</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 4 }}>
                    {tr("velocidad", "speed")}
                  </label>
                  <select
                    value={String(speechRate)}
                    onChange={(e) => setSpeechRate(Number(e.target.value || "0.9"))}
                    style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}
                  >
                    <option value="0.78">{tr("Muy lenta", "Very slow")}</option>
                    <option value="0.92">{tr("Lenta", "Slow")}</option>
                    <option value="1.05">{tr("Natural", "Natural")}</option>
                    <option value="1.22">{tr("Rápida", "Fast")}</option>
                    <option value="1.35">{tr("Muy rápida", "Very fast")}</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 4 }}>
                  {tr("voz del modelo", "model voice")}
                </label>
                <select
                  value={selectedCloudVoice}
                  onChange={(e) => {
                    setSelectedCloudVoice(e.target.value);
                  }}
                  style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}
                >
                  {modelVoiceOptions.map((v) => (
                    <option key={v.id} value={v.id}>{v.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginTop: 8, color: C.dim, fontSize: 11 }}>
                {tr("La voz del modelo se genera en servidor y es consistente para todos los usuarios.", "Model voice is server-generated and consistent for all users.")}
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
                width: "100%",
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
              {isLoading ? tr("Conectando...", "Connecting...") : tr("📞 Iniciar llamada web", "📞 Start web call")}
            </button>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ color: C.muted, fontSize: 12 }}>
                {handsFreeMode
                  ? tr("Manos libres activo: escucha y responde sin presionar botones.", "Hands-free enabled: listen and respond without pressing buttons.")
                  : tr("Modo manual: usa Hablar para cada turno.", "Manual mode: use Talk for each turn.")}
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, color: C.white, fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={handsFreeMode}
                  onChange={(e) => setHandsFreeMode(e.target.checked)}
                />
                {tr("Manos libres", "Hands-free")}
              </label>
            </div>

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
                  <div>{tr("Esperando...", "Waiting...")}</div>
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
                      {item.speaker === "agent" ? agentName : tr("Tú", "You")}
                    </div>
                    <div style={{ color: C.white, fontSize: 13, lineHeight: 1.5 }}>
                      {item.text}
                    </div>
                  </div>
                ))
              )}

              {isLoading && (
                <div style={{ textAlign: "center", color: C.muted }}>
                  <div style={{ fontSize: 11 }}>{tr("Procesando...", "Processing...")}</div>
                </div>
              )}
              {isAgentSpeaking && (
                <div style={{ textAlign: "center", color: "#93c5fd" }}>
                  <div style={{ fontSize: 11 }}>{tr("Hablando...", "Speaking...")}</div>
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
