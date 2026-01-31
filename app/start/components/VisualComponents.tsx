import React from "react";

interface VisualNodeProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  color: string;
  current: boolean;
  small?: boolean;
}

interface VisualConnectorProps {
  active: boolean;
}

export function VisualNode({ icon, label, active, color, current, small = false }: VisualNodeProps) {
  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center", 
      gap: "12px", 
      zIndex: 2,
      animation: current ? "bounce 2s infinite" : "none",
      width: small ? "100px" : "150px"
    }}>
      <div
        style={{
          width: small ? "60px" : "100px",
          height: small ? "60px" : "100px",
          borderRadius: "50%",
          background: active ? `${color}15` : "#161b22",
          border: `3px solid ${active ? color : "#30363d"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: active ? color : "#484f58",
          transition: "all 0.6s ease",
          boxShadow: active ? `0 0 40px ${color}33` : "none",
          position: "relative",
          animation: current ? "flowPulse 2s infinite" : "none"
        }}
      >
        {icon}
        {current && (
          <div style={{
            position: "absolute",
            top: "-8px",
            right: "-8px",
            width: "24px",
            height: "24px",
            background: color,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "pulse 1.5s infinite",
            boxShadow: `0 0 20px ${color}`
          }}>
            <div style={{
              width: "10px",
              height: "10px",
              background: "white",
              borderRadius: "50%"
            }} />
          </div>
        )}
      </div>
      <div style={{ textAlign: "center" }}>
        <span
          style={{
            fontSize: small ? "10px" : "14px",
            fontWeight: "bold",
            color: active ? "#fff" : "#484f58",
            textTransform: "uppercase",
            display: "block",
            letterSpacing: "0.5px"
          }}
        >
          {label}
        </span>
        {current && (
          <span style={{
            fontSize: "11px",
            color: color,
            marginTop: "6px",
            display: "block",
            fontWeight: "bold",
            letterSpacing: "1px"
          }}>
            • PASO ACTUAL •
          </span>
        )}
      </div>
    </div>
  );
}

export function VisualConnector({ active }: VisualConnectorProps) {
  return (
    <div
      style={{
        width: "4px",
        height: "50px",
        background: active ? "linear-gradient(to bottom, #22d3ee, #c084fc)" : "#30363d",
        margin: "15px 0",
        transition: "all 0.8s ease",
        borderRadius: "2px",
        boxShadow: active ? "0 0 20px rgba(34, 211, 238, 0.3)" : "none"
      }}
    />
  );
}