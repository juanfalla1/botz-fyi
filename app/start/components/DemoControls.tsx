import React from "react";
import { Play, Pause } from "lucide-react";

interface DemoControlsProps {
  activeStep: number;
  isPlaying: boolean;
  showExplanation: boolean;
  onTogglePlay: () => void;
  onToggleExplanation: () => void;
}

export function DemoControls({
  activeStep,
  isPlaying,
  showExplanation,
  onTogglePlay,
  onToggleExplanation
}: DemoControlsProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "20px"
      }}
    >
      <h3
        style={{
          margin: 0,
          fontSize: "20px",
          fontWeight: "bold",
          display: "flex",
          alignItems: "center",
          gap: "10px"
        }}
      >
        <Play size={20} /> Operación en Vivo del Proceso
      </h3>

      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div
          style={{
            background: "rgba(255,255,255,0.05)",
            padding: "6px 12px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "bold",
            color: activeStep >= 13 ? "#34d399" : "#fbbf24"
          }}
        >
          {activeStep >= 13 ? "✅ COMPLETADO" : `PASO ${activeStep + 1} DE 13`}
        </div>

        <button
          onClick={onTogglePlay}
          style={{
            background: isPlaying ? "#ef4444" : "#10b981",
            border: "none",
            color: "#fff",
            padding: "8px 16px",
            borderRadius: "10px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "13px",
            fontWeight: "bold"
          }}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          {isPlaying ? "Pausar" : "Ejecución automática"}
        </button>

        <button
          onClick={onToggleExplanation}
          style={{
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "#fff",
            padding: "8px 16px",
            borderRadius: "10px",
            cursor: "pointer",
            fontSize: "13px"
          }}
        >
          {showExplanation ? "Ocultar Ayuda" : "Mostrar Ayuda"}
        </button>
      </div>
    </div>
  );
}

interface ExplanationBannerProps {
  show: boolean;
}

export function ExplanationBanner({ show }: ExplanationBannerProps) {
  if (!show) return null;

  return (
    <div
      style={{
        background: "rgba(102, 126, 234, 0.1)",
        border: "1px solid rgba(102, 126, 234, 0.3)",
        padding: "20px",
        borderRadius: "16px",
        marginBottom: "20px",
        fontSize: "14px",
        lineHeight: 1.6
      }}
    >
      <strong>🚀 Cómo funciona este proceso (Automatización en vivo):</strong>

      <p style={{ margin: "10px 0 0 0" }}>
        Este flujo se ejecuta en tiempo real: al completar el formulario y avanzar,
        tu aplicación envía los datos al motor de automatización y recibes el estado del proceso,
        el siguiente paso y las métricas.
      </p>

      <p style={{ margin: "10px 0 0 0", color: "#c084fc", fontWeight: "bold" }}>
        🔑 Instrucción: Completa el formulario y luego haz click en "CONTINUAR" para avanzar.
        Cada paso debe venir confirmado por el motor.
      </p>
    </div>
  );
}
