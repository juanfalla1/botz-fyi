"use client";

import React from "react";
import { 
  FaSlack, FaGoogle, FaHubspot, FaTrello, 
  FaMicrosoft, FaSpotify, FaDropbox, FaAws,
  FaFilter 
} from "react-icons/fa6";
import { SiZoom, SiNotion, SiZapier, SiAsana, SiGmail } from "react-icons/si";
import useBotzLanguage from "../hooks/useBotzLanguage";

const LOGOS = [
  { name: "Google", icon: <FaGoogle size={30} />, color: "#4285F4" },
  { name: "Slack", icon: <FaSlack size={30} />, color: "#E01E5A" },
  { name: "Zoom", icon: <SiZoom size={30} />, color: "#2D8CFF" },
  { name: "HubSpot", icon: <FaHubspot size={30} />, color: "#FF7A59" },
  { name: "Gmail", icon: <SiGmail size={30} />, color: "#EA4335" },
  { name: "Notion", icon: <SiNotion size={30} />, color: "#fff" },
  { name: "Zapier", icon: <SiZapier size={30} />, color: "#FF4F00" },
  { name: "Microsoft", icon: <FaMicrosoft size={30} />, color: "#00A4EF" },
  { name: "Trello", icon: <FaTrello size={30} />, color: "#0079BF" },
  { name: "Asana", icon: <SiAsana size={30} />, color: "#F06A6A" },
  { name: "Pipedrive", icon: <FaFilter size={30} />, color: "#fff" }, 
];

export default function IntegrationsSection() {
  const language = useBotzLanguage();
  const copy = {
    es: {
      titleStart: "Conecta Botz con ",
      titleAccent: "tu ecosistema",
      subtitle: "Sincronización nativa con tus herramientas favoritas.",
    },
    en: {
      titleStart: "Connect Botz to ",
      titleAccent: "your ecosystem",
      subtitle: "Native sync with your favorite tools.",
    },
  } as const;
  const t = copy[language];

  return (
    <div style={{ padding: "40px 0", background: "transparent", overflow: "hidden", position: "relative" }}>
      
      {/* Definimos la animación directamente en el componente */}
      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-container:hover .marquee-track {
          animation-play-state: paused; /* Se detiene si pasas el mouse */
        }
      `}</style>

      {/* Título */}
      <div style={{ textAlign: "center", marginBottom: "30px", padding: "0 20px" }}>
        <h3 style={{ fontSize: "20px", fontWeight: "bold", color: "#fff", marginBottom: "8px" }}>
          {t.titleStart}<span style={{ color: "#22d3ee" }}>{t.titleAccent}</span>
        </h3>
        <p style={{ color: "#94a3b8", fontSize: "13px" }}>
          {t.subtitle}
        </p>
      </div>

      {/* Contenedor del Carrusel */}
      <div className="marquee-container" style={{ width: "100%", overflow: "hidden", position: "relative" }}>
        
        {/* Pista que se mueve (El ancho debe ser suficiente para contener dos veces los logos) */}
        <div className="marquee-track" style={{ 
          display: "flex", 
          width: "max-content", // Se ajusta al contenido real
          animation: "scroll 40s linear infinite", // 40 segundos por vuelta (ajusta para velocidad)
        }}>
          
          {/* Renderizamos los logos 2 VECES para que el loop sea perfecto */}
          {[...LOGOS, ...LOGOS].map((logo, index) => (
            <div key={index} style={{ 
              width: "180px", // Espacio para cada logo
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              gap: "12px",
              opacity: 0.6,
              transition: "all 0.3s ease",
              cursor: "pointer",
              padding: "10px"
            }}
            onMouseEnter={(e) => {
               e.currentTarget.style.opacity = "1";
               e.currentTarget.style.transform = "scale(1.1)";
               e.currentTarget.style.filter = "drop-shadow(0 0 8px rgba(34, 211, 238, 0.3))";
            }}
            onMouseLeave={(e) => {
               e.currentTarget.style.opacity = "0.6";
               e.currentTarget.style.transform = "scale(1)";
               e.currentTarget.style.filter = "none";
            }}
            >
              <div style={{ color: logo.color }}>{logo.icon}</div>
              <span style={{ color: "#fff", fontWeight: "bold", fontSize: "15px" }}>{logo.name}</span>
            </div>
          ))}
        </div>

        {/* Degradados laterales para efecto de desvanecimiento (Fade) */}
        <div style={{ position: "absolute", top: 0, left: 0, width: "100px", height: "100%", background: "linear-gradient(to right, #02040a, transparent)", zIndex: 2, pointerEvents: "none" }}></div>
        <div style={{ position: "absolute", top: 0, right: 0, width: "100px", height: "100%", background: "linear-gradient(to left, #02040a, transparent)", zIndex: 2, pointerEvents: "none" }}></div>

      </div>
    </div>
  );
}
