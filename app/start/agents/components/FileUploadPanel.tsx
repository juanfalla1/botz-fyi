"use client";

import React, { useState, useRef } from "react";

interface FileUploadProps {
  onFilesAdded: (files: { name: string; content: string; type: string }[]) => void;
  existingFiles: { name: string; content: string; type: string }[];
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(Array.from(e.dataTransfer.files));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(Array.from(e.target.files || []));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const processFiles = (files: File[]) => {
    const newFiles: { name: string; content: string; type: string }[] = [];
    let processed = 0;

    files.forEach((file) => {
      // Validar tipo de archivo
      const validTypes = [
        "application/pdf",
        "text/plain",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
      ];

      if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|txt|docx?|md)$/i)) {
        console.warn(`Tipo de archivo no soportado: ${file.name}`);
        return;
      }

      // Validar tamaño (máx 5MB)
      if (file.size > 5 * 1024 * 1024) {
        console.warn(`Archivo demasiado grande: ${file.name}`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        newFiles.push({
          name: file.name,
          content: content,
          type: file.type || "text/plain",
        });

        processed++;
        if (processed === files.length && newFiles.length > 0) {
          onFilesAdded(newFiles);
        }
      };

      reader.onerror = () => {
        console.error(`Error al leer: ${file.name}`);
        processed++;
        if (processed === files.length && newFiles.length > 0) {
          onFilesAdded(newFiles);
        }
      };

      reader.readAsText(file);
    });
  };

  return (
    <div>
      <div style={{ fontWeight: 900, fontSize: 16, marginTop: 6, marginBottom: 8 }}>
        Importar Documentos
      </div>
      <div style={{ color: C.muted, fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
        Sube archivos de documentación (PDF, TXT, DOCX) para que tu agente pueda
        consultarlos.
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.txt,.docx,.doc,.md"
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          marginBottom: 16,
          border: `2px dashed ${isDragging ? C.blue : C.border}`,
          borderRadius: 14,
          padding: 28,
          color: C.muted,
          textAlign: "center",
          cursor: "pointer",
          backgroundColor: isDragging ? "rgba(0,150,255,0.05)" : "transparent",
          transition: "all 0.2s",
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
        <div style={{ fontWeight: 700, color: C.white, marginBottom: 4 }}>
          Arrastra archivos aquí o haz clic
        </div>
        <div style={{ fontSize: 13, color: C.dim }}>
          Soportados: PDF, TXT, DOCX, MD (máx 5MB cada uno)
        </div>
      </div>

      {existingFiles.length > 0 && (
        <div>
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
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{file.name}</div>
                    <div style={{ fontSize: 11, color: C.dim }}>
                      {Math.round(file.content.length / 1024)} KB
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
