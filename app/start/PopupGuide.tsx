import React from "react";
import { Info, ChevronRight } from "lucide-react";
import { Popup } from "./types";

interface PopupGuideProps {
  popup: Popup;
  onRemove: (id: string) => void;
  inline?: boolean;
}

export function PopupGuide({ popup, onRemove, inline = false }: PopupGuideProps) {
  const baseStyle: React.CSSProperties = inline
    ? {
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white",
        padding: "20px",
        borderRadius: "16px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        maxWidth: "100%",
        animation: "fadeIn 0.5s ease-out",
        border: "1px solid rgba(255,255,255,0.2)",
        marginTop: "20px",
        marginBottom: "20px"
      }
    : {
        position: "absolute" as const,
        top: popup.position.top,
        left: popup.position.left,
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white",
        padding: "20px",
        borderRadius: "16px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        maxWidth: "320px",
        zIndex: 1000,
        animation: "fadeIn 0.5s ease-out",
        border: "1px solid rgba(255,255,255,0.2)"
      };

  return (
    <div style={baseStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
        <Info size={20} />
        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "bold" }}>{popup.title}</h3>
      </div>
      <p style={{ margin: "0 0 15px 0", fontSize: "14px", lineHeight: 1.5, whiteSpace: "pre-line" }}>
        {popup.message}
      </p>
      {popup.action && (
        <button
          onClick={() => {
            popup.action?.();
            onRemove(popup.id);
          }}
          style={{
            background: "white",
            color: "#667eea",
            border: "none",
            padding: "10px 16px",
            borderRadius: "10px",
            fontWeight: "bold",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "13px",
            width: "100%",
            justifyContent: "center"
          }}
        >
          {popup.buttonText || "Continuar"} <ChevronRight size={16} />
        </button>
      )}
      {!inline && popup.showArrow && (
        <div
          style={{
            position: "absolute",
            width: "20px",
            height: "20px",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            transform: "rotate(45deg)",
            ...(popup.arrowPosition === "top" && { bottom: "-10px", left: "50%", marginLeft: "-10px" }),
            ...(popup.arrowPosition === "bottom" && { top: "-10px", left: "50%", marginLeft: "-10px" }),
            ...(popup.arrowPosition === "left" && { right: "-10px", top: "50%", marginTop: "-10px" }),
            ...(popup.arrowPosition === "right" && { left: "-10px", top: "50%", marginTop: "-10px" })
          }}
        />
      )}
    </div>
  );
}

interface PopupContainerProps {
  popups: Popup[];
  onRemove: (id: string) => void;
  filterStep?: number;
  inline?: boolean;
}

export function PopupContainer({ popups, onRemove, filterStep, inline = false }: PopupContainerProps) {
  const filteredPopups = filterStep !== undefined
    ? popups.filter(p => p.step === filterStep)
    : popups;

  if (filteredPopups.length === 0) return null;

  return (
    <>
      {filteredPopups.map((popup) => (
        <PopupGuide
          key={popup.id}
          popup={popup}
          onRemove={onRemove}
          inline={inline}
        />
      ))}
    </>
  );
}