"use client";

import React, { useState, useEffect } from "react";
import { authedFetch } from "../authedFetchAgents";

interface Conversation {
  id: string;
  contact_name?: string;
  contact_email?: string;
  channel: string;
  status: "active" | "completed" | "failed";
  message_count: number;
  duration_seconds?: number;
  started_at: string;
  transcript?: string;
}

interface HistoryPanelProps {
  agentId: string;
  onEdit?: (conversation: Conversation) => void;
  onDelete?: (conversationId: string) => void;
  onOpenSettings?: () => void;
  onOpenContext?: () => void;
  onOpenBrain?: () => void;
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
};

export default function HistoryPanel({ 
  agentId, 
  onEdit, 
  onDelete,
  onOpenSettings,
  onOpenContext,
  onOpenBrain 
}: HistoryPanelProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (agentId) {
      fetchConversations();
    }
  }, [agentId]);

  const fetchConversations = async () => {
    setLoading(true);
    setError(null);
    try {
      // Intentar obtener de la API
      try {
        const response = await authedFetch(`/api/agents/conversations/${agentId}`);
        if (response.ok) {
          const raw = await response.text();
          let json: any = {};
          try {
            json = raw ? JSON.parse(raw) : {};
          } catch {
            throw new Error("Respuesta invalida del servidor (no JSON)");
          }
          const apiConversations = json.data || [];
          
          // Filtrar por búsqueda
          const filtered = apiConversations.filter(
            (c: Conversation) =>
              c.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
              c.contact_email?.toLowerCase().includes(search.toLowerCase())
          );
          
          setConversations(filtered);
          setLoading(false);
          return;
        }
      } catch (apiErr) {
        console.log("API no disponible, usando datos de ejemplo");
      }

      // Fallback: Usar conversaciones de ejemplo
      const mockConversations: Conversation[] = [
        {
          id: "conv-1",
          contact_name: "Juan Carlos",
          contact_email: "juan@example.com",
          channel: "web",
          status: "completed",
          message_count: 5,
          duration_seconds: 180,
          started_at: new Date(Date.now() - 3600000).toISOString(),
          transcript: "Usuario: Hola\nAgent: Hola, ¿cómo puedo ayudarte?\nUsuario: Información sobre precios\nAgent: Tenemos 3 planes...",
        },
        {
          id: "conv-2",
          contact_name: "María García",
          contact_email: "maria@example.com",
          channel: "whatsapp",
          status: "completed",
          message_count: 8,
          duration_seconds: 240,
          started_at: new Date(Date.now() - 7200000).toISOString(),
          transcript: "Usuario: Buenos días\nAgent: Buenos días, ¿en qué puedo ayudarte?",
        },
        {
          id: "conv-3",
          contact_name: "Carlos López",
          contact_email: "carlos@example.com",
          channel: "voice",
          status: "completed",
          message_count: 3,
          duration_seconds: 120,
          started_at: new Date(Date.now() - 10800000).toISOString(),
          transcript: "Llamada de prueba",
        },
      ];

      // Filtrar por búsqueda
      const filtered = mockConversations.filter(
        (c) =>
          c.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
          c.contact_email?.toLowerCase().includes(search.toLowerCase())
      );

      setConversations(filtered);
      setLoading(false);
    } catch (err: any) {
      setError(err?.message || "Error cargando historial");
      setLoading(false);
    }
  };

  const handleDelete = async (conversationId: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta conversación?")) {
      try {
        const response = await authedFetch(`/api/agents/conversations/${agentId}/${conversationId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const raw = await response.text();
          let json: any = {};
          try {
            json = raw ? JSON.parse(raw) : {};
          } catch {
            throw new Error("El servidor devolvio HTML en lugar de JSON");
          }
          throw new Error(json?.error || "Error eliminando conversación");
        }

        setConversations(conversations.filter((c) => c.id !== conversationId));
        if (onDelete) onDelete(conversationId);
      } catch (err: any) {
        setError(err?.message || "Error eliminando conversación");
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "web":
        return "💬";
      case "whatsapp":
        return "📱";
      case "voice":
        return "☎️";
      default:
        return "💬";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return { bg: "rgba(34,197,94,0.15)", fg: "#22c55e", label: "Completada" };
      case "active":
        return { bg: "rgba(59,130,246,0.15)", fg: "#3b82f6", label: "Activa" };
      case "failed":
        return { bg: "rgba(239,68,68,0.15)", fg: "#ef4444", label: "Fallida" };
      default:
        return { bg: "rgba(107,114,128,0.15)", fg: C.dim, label: status };
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: C.muted }}>
        Cargando historial...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 20 }}>
      {/* Search Bar */}
      <div style={{ position: "relative" }}>
        <span
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            color: C.dim,
            pointerEvents: "none",
          }}
        >
          🔍
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            // Re-fetch with filter
            fetchConversations();
          }}
          placeholder="Buscar por nombre o email..."
          style={{
            width: "100%",
            paddingLeft: 36,
            paddingRight: 14,
            paddingTop: 9,
            paddingBottom: 9,
            backgroundColor: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            color: C.white,
            fontSize: 14,
            outline: "none",
          }}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div
          style={{
            padding: "12px 16px",
            backgroundColor: "rgba(239,68,68,0.15)",
            color: "#f87171",
            fontSize: 13,
            borderRadius: 8,
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Conversations List */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {conversations.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: C.muted }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: C.white, marginBottom: 8 }}>
              Sin conversaciones aún
            </div>
            <div style={{ fontSize: 13 }}>
              {search ? "No hay conversaciones que coincidan con tu búsqueda" : "Las conversaciones aparecerán aquí"}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {conversations.map((conv) => {
              const isExpanded = expandedId === conv.id;
              const statusBadge = getStatusBadge(conv.status);

              return (
                <div
                  key={conv.id}
                  style={{
                    backgroundColor: isExpanded ? C.hover : C.card,
                    border: `1px solid ${C.border}`,
                    borderRadius: 12,
                    overflow: "hidden",
                    transition: "all 0.2s",
                  }}
                >
                  {/* Header */}
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : conv.id)}
                    style={{
                      padding: "16px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      userSelect: "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 8,
                          backgroundColor: `${C.blue}22`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 22,
                          flexShrink: 0,
                        }}
                      >
                        {getChannelIcon(conv.channel)}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: C.white, fontSize: 14, marginBottom: 4 }}>
                          {conv.contact_name || "Usuario sin nombre"}
                        </div>
                        <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>
                          {conv.contact_email || "Sin email"}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: C.dim,
                            display: "flex",
                            gap: 12,
                          }}
                        >
                          <span>📅 {formatDate(conv.started_at)}</span>
                          <span>💬 {conv.message_count} mensajes</span>
                          <span>⏱️ {formatDuration(conv.duration_seconds)}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        style={{
                          padding: "4px 12px",
                          borderRadius: 999,
                          backgroundColor: statusBadge.bg,
                          color: statusBadge.fg,
                          fontSize: 12,
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {statusBadge.label}
                      </div>

                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          backgroundColor: C.border,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: C.muted,
                          fontSize: 14,
                          transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                          transition: "transform 0.2s",
                        }}
                      >
                        ▼
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <>
                      <div
                        style={{
                          borderTop: `1px solid ${C.border}`,
                          padding: "16px",
                          backgroundColor: C.dark,
                        }}
                      >
                        <div style={{ marginBottom: 12 }}>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 800,
                              color: C.muted,
                              marginBottom: 8,
                              textTransform: "uppercase",
                              letterSpacing: 0.5,
                            }}
                          >
                            Transcripción
                          </div>
                          <div
                            style={{
                              backgroundColor: C.card,
                              padding: 12,
                              borderRadius: 8,
                              fontSize: 13,
                              color: C.white,
                              lineHeight: 1.6,
                              fontFamily: "monospace",
                              maxHeight: 200,
                              overflow: "auto",
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                            }}
                          >
                            {conv.transcript || "Sin transcripción disponible"}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div
                        style={{
                          borderTop: `1px solid ${C.border}`,
                          padding: "12px 16px",
                          display: "flex",
                          gap: 10,
                          backgroundColor: C.dark,
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          onClick={() => onOpenContext?.()}
                          title="Editar contexto del agente"
                          style={{
                            flex: "1 1 auto",
                            minWidth: 120,
                            padding: "10px 12px",
                            borderRadius: 8,
                            border: `1px solid ${C.blue}`,
                            backgroundColor: "transparent",
                            color: C.blue,
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: "pointer",
                            transition: "all 0.2s",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          onMouseEnter={(e) => {
                            (e.target as HTMLElement).style.backgroundColor = `${C.blue}22`;
                          }}
                          onMouseLeave={(e) => {
                            (e.target as HTMLElement).style.backgroundColor = "transparent";
                          }}
                        >
                          📝 Contexto
                        </button>

                        <button
                          onClick={() => onOpenSettings?.()}
                          title="Editar configuración del agente"
                          style={{
                            flex: "1 1 auto",
                            minWidth: 120,
                            padding: "10px 12px",
                            borderRadius: 8,
                            border: `1px solid ${C.lime}`,
                            backgroundColor: "transparent",
                            color: C.lime,
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: "pointer",
                            transition: "all 0.2s",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          onMouseEnter={(e) => {
                            (e.target as HTMLElement).style.backgroundColor = `${C.lime}22`;
                          }}
                          onMouseLeave={(e) => {
                            (e.target as HTMLElement).style.backgroundColor = "transparent";
                          }}
                        >
                          ⚙️ Configuración
                        </button>

                        <button
                          onClick={() => onOpenBrain?.()}
                          title="Editar cerebro (brain) del agente"
                          style={{
                            flex: "1 1 auto",
                            minWidth: 120,
                            padding: "10px 12px",
                            borderRadius: 8,
                            border: `1px solid #8b5cf6`,
                            backgroundColor: "transparent",
                            color: "#a78bfa",
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: "pointer",
                            transition: "all 0.2s",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          onMouseEnter={(e) => {
                            (e.target as HTMLElement).style.backgroundColor = "rgba(139,92,246,0.15)";
                          }}
                          onMouseLeave={(e) => {
                            (e.target as HTMLElement).style.backgroundColor = "transparent";
                          }}
                        >
                          🧠 Cerebro
                        </button>

                        <button
                          onClick={() => handleDelete(conv.id)}
                          title="Eliminar esta conversación"
                          style={{
                            flex: "1 1 auto",
                            minWidth: 120,
                            padding: "10px 12px",
                            borderRadius: 8,
                            border: `1px solid ${C.red}`,
                            backgroundColor: "transparent",
                            color: C.red,
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: "pointer",
                            transition: "all 0.2s",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          onMouseEnter={(e) => {
                            (e.target as HTMLElement).style.backgroundColor = "rgba(239,68,68,0.15)";
                          }}
                          onMouseLeave={(e) => {
                            (e.target as HTMLElement).style.backgroundColor = "transparent";
                          }}
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination Info */}
      {conversations.length > 0 && (
        <div
          style={{
            fontSize: 12,
            color: C.muted,
            textAlign: "center",
            paddingTop: 12,
            borderTop: `1px solid ${C.border}`,
          }}
        >
          Mostrando {conversations.length} conversación{conversations.length !== 1 ? "es" : ""}
        </div>
      )}
    </div>
  );
}
