"use client";

import React from "react";
import { 
  FaWhatsapp, FaFacebook, FaInstagram, FaGoogle, 
  FaTiktok, FaTelegram, FaShopify, FaSlack 
} from "react-icons/fa6";
import { Bot, Zap, ArrowRight, CheckCircle2 } from "lucide-react";

interface ChannelsViewProps {
  channels?: any[]; // Recibimos la lista de canales
}

export default function ChannelsView({ channels }: ChannelsViewProps) {
  // Lista por defecto si no vienen props
  const activeChannels = channels || [
    { id: "whatsapp", name: "WhatsApp", icon: <FaWhatsapp />, color: "#25D366", connected: true },
    { id: "instagram", name: "Instagram", icon: <FaInstagram />, color: "#E4405F", connected: true },
    { id: "facebook", name: "Facebook", icon: <FaFacebook />, color: "#1877F2", connected: true },
    { id: "google", name: "Google Ads", icon: <FaGoogle />, color: "#4285F4", connected: true },
  ];

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: "30px",
      animation: "fadeIn 0.5s ease"
    }}>
      {/* CABECERA */}
      <div style={{ 
        background: "rgba(10, 15, 30, 0.6)", 
        borderRadius: "20px", 
        padding: "24px", 
        border: "1px solid rgba(255,255,255,0.1)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div>
          <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
            <Zap color="#fbbf24" /> Ecosistema Digital
          </h2>
          <p style={{ color: "#8b949e" }}>Todas tus fuentes de leads conectadas a la Inteligencia Artificial.</p>
        </div>
        <div style={{ background: "rgba(34, 197, 94, 0.1)", color: "#22c55e", padding: "8px 16px", borderRadius: "20px", fontSize: "14px", fontWeight: "bold", border: "1px solid rgba(34, 197, 94, 0.2)" }}>
          Sistema Operativo
        </div>
      </div>

      {/* DIAGRAMA DE FLUJO */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "1fr 100px 1fr", 
        alignItems: "center", 
        gap: "20px",
        background: "rgba(255,255,255,0.02)",
        borderRadius: "24px",
        padding: "40px",
        position: "relative",
        overflow: "hidden"
      }}>
        
        {/* COLUMNA IZQUIERDA: CANALES */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <h3 style={{ color: "#8b949e", fontSize: "14px", marginBottom: "10px", textAlign: "right" }}>FUENTES DE TRÁFICO</h3>
          {activeChannels.map((ch) => (
            <div key={ch.id} style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "rgba(255,255,255,0.05)",
              padding: "16px",
              borderRadius: "16px",
              border: `1px solid ${ch.connected ? ch.color + '40' : 'rgba(255,255,255,0.05)'}`,
              position: "relative"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ color: ch.color, fontSize: "24px" }}>{ch.icon}</div>
                <span style={{ fontWeight: "bold" }}>{ch.name}</span>
              </div>
              {ch.connected && <CheckCircle2 size={18} color={ch.color} />}
              
              {/* Línea conectora simulada */}
              {ch.connected && (
                <div style={{
                  position: "absolute",
                  right: "-40px",
                  top: "50%",
                  width: "40px",
                  height: "2px",
                  background: `linear-gradient(90deg, ${ch.color}, transparent)`,
                  zIndex: 0
                }} />
              )}
            </div>
          ))}
        </div>

        {/* COLUMNA CENTRAL: FLECHAS ANIMADAS */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", opacity: 0.5 }}>
          <ArrowRight size={24} color="#fff" />
          <ArrowRight size={24} color="#fff" />
          <ArrowRight size={24} color="#fff" />
        </div>

        {/* COLUMNA DERECHA: EL CEREBRO (BOT) */}
        <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "center" }}>
          <h3 style={{ color: "#8b949e", fontSize: "14px", marginBottom: "20px" }}>PROCESAMIENTO IA</h3>
          <div style={{
            background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
            borderRadius: "24px",
            padding: "40px 20px",
            textAlign: "center",
            boxShadow: "0 20px 50px rgba(124, 58, 237, 0.3)",
            border: "1px solid rgba(255,255,255,0.2)",
            position: "relative"
          }}>
            <div style={{ 
              background: "#fff", 
              color: "#4f46e5", 
              width: "60px", 
              height: "60px", 
              borderRadius: "50%", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: "0 0 20px rgba(255,255,255,0.5)"
            }}>
              <Bot size={32} />
            </div>
            <h3 style={{ fontSize: "20px", fontWeight: "bold", color: "#fff" }}>Botz Core</h3>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.8)", marginTop: "8px" }}>
              Centralizando conversaciones,<br/>calificando leads y calculando hipotecas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}