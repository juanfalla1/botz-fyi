"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

type CoachResponse = {
  spanishMeaning: string;
  suggestedAnswer: string;
  shortAnswer: string;
};

export default function InterviewCoach() {
  const [profile, setProfile] = useState("");
  const [question, setQuestion] = useState("");
  const [transcript, setTranscript] = useState("");
  const [attachedFileName, setAttachedFileName] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [cvStatusMessage, setCvStatusMessage] = useState("");
  const [result, setResult] = useState<CoachResponse | null>(null);
  const [error, setError] = useState("");
  const [lastDetectedQuestion, setLastDetectedQuestion] = useState("");
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isRecordingFallback, setIsRecordingFallback] = useState(false);
  const [isTranscribingAudio, setIsTranscribingAudio] = useState(false);
  const [micSupported, setMicSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalTranscriptRef = useRef("");
  const silenceTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isGeneratingRef = useRef(false);

  const speechRecognitionConstructor = useMemo(() => {
    if (typeof window === "undefined") return null;
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }, []);

  useEffect(() => {
    setMicSupported(Boolean(speechRecognitionConstructor));
  }, [speechRecognitionConstructor]);

  useEffect(() => {
    isGeneratingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      if (silenceTimerRef.current) {
        window.clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      mediaRecorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    };
  }, []);

  async function startMicrophone() {
    setError("");

    if (!speechRecognitionConstructor) {
      setMicSupported(false);
      await startFallbackRecording();
      return;
    }

    const recognition = new speechRecognitionConstructor();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => {
      finalTranscriptRef.current = "";
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let interimText = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += `${chunk} `;
        } else {
          interimText += `${chunk} `;
        }
      }

      const normalized = normalizeTranscript(`${finalTranscriptRef.current}${interimText}`.trim());
      setTranscript(normalized);

      if (silenceTimerRef.current) {
        window.clearTimeout(silenceTimerRef.current);
      }

      silenceTimerRef.current = window.setTimeout(() => {
        const detected = extractBestQuestion(normalized);
        setQuestion(detected);
        if (autoGenerate && detected && !isGeneratingRef.current) {
          void generateAnswerForQuestion(detected);
        }
      }, 1500);
    };

    recognition.onerror = async () => {
      setIsListening(false);
      await startFallbackRecording();
    };

    recognition.onend = () => {
      setIsListening(false);
      if (silenceTimerRef.current) {
        window.clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      const finalDetected = extractBestQuestion(normalizeTranscript(finalTranscriptRef.current));
      if (finalDetected) {
        setQuestion(finalDetected);
        if (autoGenerate && !isGeneratingRef.current) {
          void generateAnswerForQuestion(finalDetected);
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function stopMicrophone() {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      if (silenceTimerRef.current) {
        window.clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      return;
    }

    stopFallbackRecording();
  }

  async function startFallbackRecording() {
    if (typeof window === "undefined" || !window.MediaRecorder || !navigator.mediaDevices?.getUserMedia) {
      setError("Microphone transcription is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        setIsRecordingFallback(false);
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        void transcribeRecordedAudio();
      };

      recorder.start();
      setIsRecordingFallback(true);
    } catch {
      setError("Could not access microphone. Check browser permissions.");
    }
  }

  function stopFallbackRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }

  async function transcribeRecordedAudio() {
    if (!audioChunksRef.current.length) return;
    setIsTranscribingAudio(true);

    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const formData = new FormData();
      formData.set("mode", "transcribe");
      formData.set("audioFile", audioBlob, "question.webm");

      const res = await fetch("/api/interview-coach", {
        method: "POST",
        body: formData,
      });

      const data = (await res.json()) as { transcript?: string; error?: string };

      if (!res.ok) {
        throw new Error(data.error || "Could not transcribe audio");
      }

      const transcriptText = String(data.transcript || "").trim();
      if (transcriptText) {
        setTranscript(transcriptText);
        setQuestion(transcriptText);
      }
    } catch (err) {
      console.error(err);
      setError("Could not transcribe microphone audio. Please try again.");
    } finally {
      setIsTranscribingAudio(false);
      audioChunksRef.current = [];
    }
  }

  function useTranscriptAsQuestion() {
    if (!transcript.trim()) return;
    setQuestion(transcript.trim());
  }

  function clearQuestion() {
    setQuestion("");
    setLastDetectedQuestion("");
  }

  function clearTranscript() {
    setTranscript("");
  }

  async function copyShortAnswer() {
    if (!result?.shortAnswer?.trim()) return;
    try {
      await navigator.clipboard.writeText(result.shortAnswer);
    } catch {
      setError("Could not copy short answer to clipboard.");
    }
  }

  function handleAttachCvClick() {
    fileInputRef.current?.click();
  }

  function handleRemoveCv() {
    setAttachedFile(null);
    setAttachedFileName("");
    setCvStatusMessage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleCvFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setAttachedFileName(file.name);
    setAttachedFile(file);
    setCvStatusMessage("");

    const isTextLike =
      file.type.startsWith("text/") ||
      file.name.endsWith(".txt") ||
      file.name.endsWith(".md") ||
      file.name.endsWith(".json") ||
      file.name.endsWith(".csv");

    if (!isTextLike) {
      setCvStatusMessage("CV file attached. It will be parsed when you click Generate answer.");
      return;
    }

    try {
      const content = await file.text();
      setProfile(content);
      setCvStatusMessage("CV text loaded successfully from file.");
    } catch {
      setError("Could not read the attached CV file.");
      setCvStatusMessage("");
    }
  }

  async function handleGenerate() {
    setError("");

    if (!question.trim()) return;

    await generateAnswerForQuestion(question);
  }

  async function generateAnswerForQuestion(rawQuestion: string) {
    const detectedQuestion = extractBestQuestion(rawQuestion);
    if (!detectedQuestion) return;

    setLastDetectedQuestion(detectedQuestion);

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/interview-coach", {
        method: "POST",
        body: buildRequestBody({ question: detectedQuestion, profile, attachedFile }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error generating answer");
      }

      setResult(data);
    } catch (error) {
      console.error(error);
      setError(error instanceof Error ? error.message : "Error generating answer");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", padding: "40px", background: "#071827", color: "white" }}>
      <h1 style={{ fontSize: "36px", fontWeight: 700 }}>
        Botz Interview Coach
      </h1>

      <p style={{ marginTop: "12px", maxWidth: "700px", color: "#cbd5e1" }}>
        Paste or write the interview question. Botz will help you understand it and prepare a short answer in English.
      </p>

      <section style={{ marginTop: "32px", maxWidth: "800px" }}>
        <label style={{ display: "block", marginBottom: "10px", fontWeight: 600 }}>
          CV or professional profile
        </label>

        <textarea
          value={profile}
          onChange={(e) => setProfile(e.target.value)}
          placeholder="Paste your CV or professional profile here"
          rows={6}
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: "12px",
            border: "1px solid #1fb4d8",
            background: "#0f2538",
            color: "white",
            fontSize: "16px",
            marginBottom: "20px",
          }}
        />

        <div style={{ marginTop: "-8px", marginBottom: "20px", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleCvFileChange}
            style={{ display: "none" }}
            accept=".txt,.md,.json,.csv,.pdf,.docx,text/plain,text/markdown,application/json,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          />
          <button
            onClick={handleAttachCvClick}
            type="button"
            style={{
              padding: "10px 14px",
              borderRadius: "10px",
              border: "1px solid #10b2cb",
              background: "#0f2538",
              color: "white",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Attach CV file
          </button>
          {attachedFile && (
            <button
              onClick={handleRemoveCv}
              type="button"
              style={{
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1px solid #1fb4d8",
                background: "#071827",
                color: "white",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Remove CV file
            </button>
          )}
          {attachedFileName && <span style={{ color: "#cbd5e1" }}>{attachedFileName}</span>}
        </div>

        {cvStatusMessage && (
          <p style={{ marginTop: "-10px", marginBottom: "14px", color: "#10b2cb", fontWeight: 600 }}>
            {cvStatusMessage}
          </p>
        )}

        <label style={{ display: "block", marginBottom: "10px", fontWeight: 600 }}>
          Interview question
        </label>

        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Example: Tell me about your experience managing projects."
          rows={5}
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: "12px",
            border: "1px solid #1fb4d8",
            background: "#0f2538",
            color: "white",
            fontSize: "16px",
          }}
        />

        <div style={{ marginTop: "12px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={startMicrophone}
            disabled={isListening || isRecordingFallback || isTranscribingAudio}
            style={{
              padding: "10px 14px",
              borderRadius: "10px",
              border: "1px solid #10b2cb",
              background: isListening || isRecordingFallback ? "#0f2538" : "#10b2cb",
              color: "white",
              fontWeight: 700,
              cursor: isListening || isRecordingFallback || isTranscribingAudio ? "not-allowed" : "pointer",
            }}
          >
            Start microphone
          </button>

          <button
            onClick={stopMicrophone}
            disabled={!isListening && !isRecordingFallback}
            style={{
              padding: "10px 14px",
              borderRadius: "10px",
              border: "1px solid #10b2cb",
              background: "#0f2538",
              color: "white",
              fontWeight: 700,
              cursor: !isListening && !isRecordingFallback ? "not-allowed" : "pointer",
            }}
          >
            Stop microphone
          </button>

          <button
            onClick={useTranscriptAsQuestion}
            disabled={!transcript.trim()}
            style={{
              padding: "10px 14px",
              borderRadius: "10px",
              border: "1px solid #10b2cb",
              background: "#0f2538",
              color: "white",
              fontWeight: 700,
              cursor: !transcript.trim() ? "not-allowed" : "pointer",
            }}
          >
            Use transcript as question
          </button>

          <button
            onClick={clearTranscript}
            disabled={!transcript.trim()}
            style={{
              padding: "10px 14px",
              borderRadius: "10px",
              border: "1px solid #10b2cb",
              background: "#0f2538",
              color: "white",
              fontWeight: 700,
              cursor: !transcript.trim() ? "not-allowed" : "pointer",
            }}
          >
            Clear transcript
          </button>

          <button
            onClick={() => setAutoGenerate((value) => !value)}
            type="button"
            style={{
              padding: "10px 14px",
              borderRadius: "10px",
              border: "1px solid #10b2cb",
              background: autoGenerate ? "#10b2cb" : "#0f2538",
              color: "white",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {autoGenerate ? "Auto-answer: ON" : "Auto-answer: OFF"}
          </button>

          <button
            onClick={clearQuestion}
            disabled={!question.trim()}
            style={{
              padding: "10px 14px",
              borderRadius: "10px",
              border: "1px solid #10b2cb",
              background: "#0f2538",
              color: "white",
              fontWeight: 700,
              cursor: !question.trim() ? "not-allowed" : "pointer",
            }}
          >
            Clear question
          </button>
        </div>

        {!micSupported && (
          <p style={{ marginTop: "10px", color: "#1fb4d8" }}>
            Microphone transcription is not supported in this browser.
          </p>
        )}

        {isListening && (
          <p style={{ marginTop: "10px", color: "#10b2cb", fontWeight: 600 }}>
            Listening...
          </p>
        )}

        {isRecordingFallback && (
          <p style={{ marginTop: "10px", color: "#10b2cb", fontWeight: 600 }}>
            Listening... (audio recording mode)
          </p>
        )}

        {isTranscribingAudio && (
          <p style={{ marginTop: "10px", color: "#10b2cb", fontWeight: 600 }}>
            Generating transcript...
          </p>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading}
          style={{
            marginTop: "16px",
            padding: "12px 20px",
            borderRadius: "10px",
            border: "none",
            background: loading ? "#64748b" : "#10b2cb",
            color: "white",
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Generating..." : "Generate answer"}
        </button>

        {error && (
          <p style={{ marginTop: "12px", color: "#1fb4d8", fontWeight: 600 }}>
            {error}
          </p>
        )}

        {lastDetectedQuestion && lastDetectedQuestion !== question.trim() && (
          <p style={{ marginTop: "10px", color: "#cbd5e1" }}>
            Using detected question: {lastDetectedQuestion}
          </p>
        )}
      </section>

      <section style={{ marginTop: "32px", display: "grid", gap: "16px", maxWidth: "900px" }}>
        <div style={{ padding: "20px", borderRadius: "14px", background: "#0f2538" }}>
          <h2>Spanish meaning</h2>
          <p style={{ color: "#cbd5e1" }}>
            {result?.spanishMeaning || "Aquí aparecerá la traducción en español."}
          </p>
        </div>

        <div style={{ padding: "20px", borderRadius: "14px", background: "#0f2538" }}>
          <h2>Suggested answer</h2>
          <p style={{ color: "#cbd5e1" }}>
            {result?.suggestedAnswer || "Aquí aparecerá la respuesta sugerida en inglés."}
          </p>
        </div>

        <div style={{ padding: "20px", borderRadius: "14px", background: "#0f2538" }}>
          <h2>Short answer to say</h2>
          <p style={{ color: "#cbd5e1" }}>
            {result?.shortAnswer || "Aquí aparecerá una respuesta corta para decir rápido."}
          </p>
          <button
            onClick={copyShortAnswer}
            disabled={!result?.shortAnswer}
            style={{
              marginTop: "12px",
              padding: "10px 14px",
              borderRadius: "10px",
              border: "none",
              background: "#10b2cb",
              color: "white",
              fontWeight: 700,
              cursor: !result?.shortAnswer ? "not-allowed" : "pointer",
            }}
          >
            Copy short answer
          </button>
        </div>
      </section>
    </main>
  );
}

function buildRequestBody({
  question,
  profile,
  attachedFile,
}: {
  question: string;
  profile: string;
  attachedFile: File | null;
}): FormData | string {
  if (!attachedFile) {
    return JSON.stringify({ question, profile });
  }

  const formData = new FormData();
  formData.set("question", question);
  formData.set("profile", profile);
  formData.set("cvFile", attachedFile);
  return formData;
}

type SpeechRecognitionAlternativeLike = {
  transcript: string;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternativeLike;
};

type SpeechRecognitionResultListLike = {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructorLike = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructorLike;
    webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
  }
}

function normalizeTranscript(text: string): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return "";

  const cleaned: string[] = [];
  for (const word of words) {
    const previous = cleaned[cleaned.length - 1];
    if (previous && previous.toLowerCase() === word.toLowerCase()) {
      continue;
    }

    cleaned.push(word);
  }

  const compact = cleaned.join(" ").trim();
  return removeRepeatedPhrases(compact);
}

function removeRepeatedPhrases(input: string): string {
  const words = input.split(/\s+/).filter(Boolean);
  if (words.length < 6) return input;

  const maxWindow = Math.min(6, Math.floor(words.length / 2));
  const result: string[] = [];
  let i = 0;

  while (i < words.length) {
    let skipped = false;

    for (let size = maxWindow; size >= 2; size -= 1) {
      if (i + size * 2 > words.length) continue;

      const a = words.slice(i, i + size).join(" ").toLowerCase();
      const b = words.slice(i + size, i + size * 2).join(" ").toLowerCase();
      if (a === b) {
        result.push(...words.slice(i, i + size));
        i += size * 2;
        skipped = true;
        break;
      }
    }

    if (!skipped) {
      result.push(words[i]);
      i += 1;
    }
  }

  return result.join(" ").trim();
}

function extractBestQuestion(raw: string): string {
  const text = normalizeTranscript(raw).replace(/\s+/g, " ").trim();
  if (!text) return "";

  const questionChunks = text
    .split("?")
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  if (questionChunks.length > 0) {
    return `${questionChunks[questionChunks.length - 1]}?`;
  }

  const sentenceChunks = text
    .split(/[.!\n]/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  if (sentenceChunks.length > 0) {
    return sentenceChunks[sentenceChunks.length - 1];
  }

  return text;
}
