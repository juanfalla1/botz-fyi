import React from "react";

export const glassStyle: React.CSSProperties = {
  background: "rgba(10, 15, 30, 0.8)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "20px",
  padding: "24px",
  backdropFilter: "blur(12px)",
  boxShadow: "0 20px 40px rgba(0,0,0,0.4)"
};

export const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px",
  borderRadius: "12px",
  border: "1px solid #30363d",
  backgroundColor: "#0d1117",
  color: "#fff",
  outline: "none",
  boxSizing: "border-box",
  fontSize: "14px",
  transition: "all 0.3s ease"
};

export const btnStyle: React.CSSProperties = {
  backgroundColor: "#238636",
  color: "#fff",
  border: "none",
  padding: "16px 24px",
  borderRadius: "12px",
  fontWeight: "bold",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "12px",
  fontSize: "14px",
  transition: "all 0.3s ease"
};

export const mailItemStyle: React.CSSProperties = {
  borderRadius: "12px",
  padding: "16px",
  background: "rgba(0,0,0,0.3)",
  border: "1px solid rgba(255,255,255,0.06)",
  transition: "all 0.3s ease"
};

export const agendaItemStyle: React.CSSProperties = {
  borderRadius: "12px",
  padding: "16px",
  background: "rgba(0,0,0,0.3)",
  border: "1px solid rgba(255,255,255,0.06)",
  transition: "all 0.3s ease"
};

export const unreadBadgeStyle: React.CSSProperties = {
  marginLeft: "6px",
  fontSize: "10px",
  fontWeight: 900,
  color: "#02040a",
  background: "#34d399",
  borderRadius: "999px",
  padding: "3px 10px",
  boxShadow: "0 8px 20px rgba(52,211,153,0.25)",
  animation: "pulse 2s infinite"
};

export const globalStyles = `
  @keyframes fadeIn { 
    from { opacity: 0; transform: translateY(10px) scale(0.98); } 
    to { opacity: 1; transform: translateY(0) scale(1); } 
  }
  
  @keyframes flowPulse { 
    0% { box-shadow: 0 0 0 0 rgba(192, 132, 252, 0.35); }
    70% { box-shadow: 0 0 0 18px rgba(192, 132, 252, 0); }
    100% { box-shadow: 0 0 0 0 rgba(192, 132, 252, 0); }
  }
  
  @keyframes pulse {
    0% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.05); }
    100% { opacity: 1; transform: scale(1); }
  }
  
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }
  
  * {
    scroll-behavior: smooth;
  }
  
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  ::-webkit-scrollbar-track {
    background: rgba(255,255,255,0.05);
    border-radius: 4px;
  }
  
  ::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.1);
    border-radius: 4px;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: rgba(255,255,255,0.2);
  }
`;