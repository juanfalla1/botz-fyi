"use client";

import React, { useState, useRef } from "react";
import { authedFetch } from "@/app/start/agents/authedFetchAgents";

interface FileUploadProps {
  onFilesAdded: (files: { name: string; content: string; type: string }[]) => void;
  existingFiles: { name?: string; content?: string; type?: string }[];
  onFileRemoved: (index: number) => void;
}

const C = {
  border: "rgba(255,255,255,0.08)",
  blue: "#0096ff",
  lime: "#a3e635",
  white: "#ffffff",
  muted: "#9ca3af",
  dim: "#6b7280",
  card: "#22262d",
  dark: "#111318",
};

export default function FileUploadPanel({
  onFilesAdded,
  existingFiles,
  onFileRemoved,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [uploadMsg, setUploadMsg] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const missingIndexedContent = existingFiles.filter((f) => !String(f?.content || "").trim()).length;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    setIsDragging(false);
    processFiles(Array.from(e.dataTransfer.files));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isProcessing) return;
    processFiles(Array.from(e.target.files || []));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const processFiles = async (files: File[]) => {
    if (!files.length) return;
    setIsProcessing(true);
    setProgressText("Cargando fuente...");
    setUploadMsg("");

    const accepted: File[] = [];
    let rejected = 0;
    const failDetails: string[] = [];

    files.forEach((file) => {
      // Validar tamaño (máx 15MB)
      if (file.size > 15 * 1024 * 1024) {
        rejected++;
        failDetails.push(`${file.name}: supera 15MB`);
        return;
      }

      accepted.push(file);
    });

    if (accepted.length === 0) {
      setUploadMsg("No se pudo adjuntar: usa PDF, TXT, DOCX o MD (max 15MB por archivo).");
      setIsProcessing(false);
      setProgressText("");
      return;
    }

    const readTextFile = (file: File) =>
      new Promise<{ name: string; content: string; type: string }>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = String(event.target?.result || "");
          resolve({ name: file.name, content, type: file.type || "text/plain" });
        };
        reader.onerror = () => resolve({ name: file.name, content: "", type: file.type || "text/plain" });
        reader.readAsText(file);
      });

    const finalFiles: { name: string; content: string; type: string }[] = [];
    let failedParse = 0;
    for (let idx = 0; idx < accepted.length; idx++) {
      const file = accepted[idx];
      setProgressText(`Cargando fuente ${idx + 1}/${accepted.length}: ${file.name}`);
      const isText = /^text\//.test(file.type) || /\.(txt|md)$/i.test(file.name);
      if (isText) {
        const parsed = await readTextFile(file);
        if (parsed.content) finalFiles.push(parsed);
        else failedParse++;
        continue;
      }

      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await authedFetch("/api/agents/files/parse", {
          method: "POST",
          body: fd,
        });
        const json = await res.json();
        if (!res.ok || !json?.ok || !json?.data?.content) {
          failedParse++;
          const why = String(json?.error || `HTTP ${res.status}`);
          failDetails.push(`${file.name}: ${why}`);
          continue;
        }
        finalFiles.push({
          name: String(json.data.name || file.name),
          content: String(json.data.content || ""),
          type: String(json.data.type || file.type || "application/octet-stream"),
        });
      } catch {
        failedParse++;
        failDetails.push(`${file.name}: error de red o autenticacion`);
      }
    }

    if (finalFiles.length > 0) {
      onFilesAdded(finalFiles);
    }

    const rejectedTotal = rejected + failedParse;
    if (rejectedTotal > 0) {
      const short = failDetails.slice(0, 2).join(" | ");
      setUploadMsg(`Se adjuntaron ${finalFiles.length} archivo(s). ${rejectedTotal} no pudieron procesarse.${short ? ` Detalle: ${short}` : ""}`);
    } else {
      setUploadMsg(`Se adjuntaron ${finalFiles.length} archivo(s).`);
    }

    setIsProcessing(false);
    setProgressText("");
  };

  return (
    <div>
      <div style={{ fontWeight: 900, fontSize: 16, marginTop: 6, marginBottom: 8 }}>
        Importar Documentos
      </div>
      <div style={{ color: C.muted, fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
        Sube archivos de documentacion (PDF, TXT, DOCX o MD) para que tu agente pueda
        consultarlos. Nota: el formato .doc no es compatible.
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.txt,.docx,.md"
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (!isProcessing) fileInputRef.current?.click();
        }}
        style={{
          marginBottom: 16,
          border: `2px dashed ${isDragging ? C.blue : C.border}`,
          borderRadius: 14,
          padding: 28,
          color: C.muted,
          textAlign: "center",
          cursor: isProcessing ? "wait" : "pointer",
          opacity: isProcessing ? 0.75 : 1,
          pointerEvents: isProcessing ? "none" : "auto",
          backgroundColor: isDragging ? "rgba(0,150,255,0.05)" : "transparent",
          transition: "all 0.2s",
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
        <div style={{ fontWeight: 700, color: C.white, marginBottom: 4 }}>
          Arrastra archivos aquí o haz clic
        </div>
        <div style={{ fontSize: 13, color: C.dim }}>
          Soportados: PDF, TXT, DOCX, MD (max 15MB cada uno)
        </div>
      </div>

      {isProcessing && (
        <div style={{ marginBottom: 12, padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.blue}`, background: "rgba(0,150,255,0.12)", color: C.white, fontSize: 12 }}>
          {progressText || "Cargando fuente..."}
        </div>
      )}

      {uploadMsg && (
        <div style={{ marginBottom: 12, padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: "rgba(0,150,255,0.08)", color: C.muted, fontSize: 12 }}>
          {uploadMsg}
        </div>
      )}

      {existingFiles.length > 0 && (
        <div>
          {missingIndexedContent > 0 && (
            <div style={{ marginBottom: 10, padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: "rgba(245,158,11,0.12)", color: "#fbbf24", fontSize: 12 }}>
              {missingIndexedContent} archivo(s) no tienen contenido indexado. Vuelve a subirlos para que el agente pueda usarlos.
            </div>
          )}
          <div
            style={{
              fontWeight: 800,
              fontSize: 14,
              marginBottom: 10,
              color: C.white,
            }}
          >
            Archivos cargados ({existingFiles.length}):
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {existingFiles.map((file, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 10,
                  borderRadius: 8,
                  backgroundColor: C.card,
                  border: `1px solid ${C.border}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 16 }}>📄</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{String(file?.name || `archivo_${idx + 1}`)}</div>
                    <div style={{ fontSize: 11, color: C.dim }}>
                      {String(file?.content || "").trim()
                        ? `${Math.max(1, Math.round(String(file.content).length / 1024))} KB`
                        : "Sin contenido indexado"}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onFileRemoved(idx)}
                  style={{
                    background: "none",
                    border: "none",
                    color: C.dim,
                    cursor: "pointer",
                    fontSize: 18,
                    padding: 4,
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
