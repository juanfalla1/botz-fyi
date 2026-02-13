"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "./supabaseClient";
import { User, ChevronDown, Check, Loader2, X, UserPlus } from "lucide-react";

type AppLanguage = "es" | "en";

const ASSIGN_TEXT: Record<AppLanguage, { assign: string; loading: string; unassigned: string }> = {
  es: { assign: "Asignar", loading: "Cargando...", unassigned: "Sin asignar" },
  en: { assign: "Assign", loading: "Loading...", unassigned: "Unassigned" },
};

function useUiLanguage(): AppLanguage {
  const [language, setLanguage] = useState<AppLanguage>("es");

  useEffect(() => {
    const saved = localStorage.getItem("botz-language");
    if (saved === "es" || saved === "en") setLanguage(saved);

    const onLangChange = (event: Event) => {
      const next = (event as CustomEvent<AppLanguage>).detail;
      if (next === "es" || next === "en") setLanguage(next);
    };

    window.addEventListener("botz-language-change", onLangChange);
    return () => window.removeEventListener("botz-language-change", onLangChange);
  }, []);

  return language;
}

interface Asesor {
  id: string;
  nombre: string;
  email: string;
  telefono?: string;
}

interface AsignarAsesorProps {
  leadId: string;
  currentAsesorId?: string | null;
  currentAsesorNombre?: string | null;
  onAssigned?: (asesorId: string, asesorNombre: string) => void;
  variant?: "button" | "dropdown" | "inline";
  size?: "sm" | "md";
}

export default function AsignarAsesor({
  leadId,
  currentAsesorId,
  currentAsesorNombre,
  onAssigned,
  variant = "dropdown",
  size = "md",
}: AsignarAsesorProps) {
  const language = useUiLanguage();
  const t = ASSIGN_TEXT[language];
  const [asesores, setAsesores] = useState<Asesor[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAsesores, setLoadingAsesores] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAsesor, setSelectedAsesor] = useState<Asesor | null>(null);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [menuPos, setMenuPos] = useState<{ left: number; top: number; width: number; maxHeight: number } | null>(null);

  const canPortal = typeof document !== "undefined";

  // Cargar lista de asesores
  useEffect(() => {
    const fetchAsesores = async () => {
      try {
        setLoadingAsesores(true);

        const { data, error } = await supabase
          .from("team_members")
          .select("id, nombre, email, telefono")
          .eq("activo", true)
          .order("nombre");

        // ✅ AJUSTE: mostrar el error REAL (message/code/details/hint) sin que aparezca como {}
        if (error) {
          console.log("ASESORES_SUPABASE_ERROR:", {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          });
          throw error; // (misma lógica: sigue cayendo al catch)
        }

        setAsesores(data || []);

        // Si hay un asesor actual, marcarlo como seleccionado
        if (currentAsesorId && data) {
          const current = data.find((a) => a.id === currentAsesorId);
          if (current) setSelectedAsesor(current);
        }
      } catch (err: any) {
        // ✅ AJUSTE: usar console.log + props para que Next no lo muestre como {}
        console.log("ASESORES_CATCH_ERR:", err);
        console.log("ASESORES_CATCH_PROPS:", {
          message: err?.message,
          code: err?.code,
          details: err?.details,
          hint: err?.hint,
          status: err?.status,
        });

        // fallback por si viene como objeto raro
        try {
          console.log("ASESORES_CATCH_JSON:", JSON.stringify(err));
        } catch (_) {}
      } finally {
        setLoadingAsesores(false);
      }
    };

    fetchAsesores();
  }, [currentAsesorId]);

  // Asignar asesor al lead
  const handleAssign = async (asesor: Asesor) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from("leads")
        .update({
          asesor_id: asesor.id,
          asesor_nombre: asesor.nombre,
          updated_at: new Date().toISOString(),
        })
        .eq("id", leadId);

      if (error) throw error;

      setSelectedAsesor(asesor);
      setIsOpen(false);
      onAssigned?.(asesor.id, asesor.nombre);
    } catch (err) {
      console.error("Error assigning asesor:", err);
    } finally {
      setLoading(false);
    }
  };

  // Quitar asignación
  const handleUnassign = async () => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from("leads")
        .update({
          asesor_id: null,
          asesor_nombre: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", leadId);

      if (error) throw error;

      setSelectedAsesor(null);
      setIsOpen(false);
      onAssigned?.("", "");
    } catch (err) {
      console.error("Error unassigning asesor:", err);
    } finally {
      setLoading(false);
    }
  };

  const displayName = selectedAsesor?.nombre || currentAsesorNombre || t.unassigned;
  const isAssigned = selectedAsesor || currentAsesorId;

  const computeMenuPos = () => {
    const el = triggerRef.current;
    if (!el || typeof window === "undefined") return;

    const rect = el.getBoundingClientRect();
    const padding = 12;
    const width = Math.max(220, Math.round(rect.width));

    let left = rect.left;
    if (left + width > window.innerWidth - padding) left = Math.max(padding, window.innerWidth - padding - width);

    // Always open DOWN (as before). If there isn't space, we keep it down and
    // reduce the internal scroll height.
    const top = rect.bottom + 6;
    const availableBelow = Math.max(160, window.innerHeight - padding - top);
    const maxHeight = Math.min(320, availableBelow);

    setMenuPos({ left, top, width, maxHeight });
  };

  useEffect(() => {
    if (!isOpen) {
      setMenuPos(null);
      return;
    }

    // Position after render.
    const raf = window.requestAnimationFrame(() => computeMenuPos());

    let ticking = false;
    const schedule = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        ticking = false;
        computeMenuPos();
      });
    };
    const onResize = () => schedule();
    const onScroll = () => schedule();

    window.addEventListener("resize", onResize);
    // Reposition on scroll so it stays attached.
    window.addEventListener("scroll", onScroll, true);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const sizeStyles = {
    sm: { padding: "6px 10px", fontSize: "11px", iconSize: 12 },
    md: { padding: "10px 14px", fontSize: "13px", iconSize: 16 },
  };

  const s = sizeStyles[size];

  // Variante: Solo botón de asignar
  if (variant === "button") {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: s.padding,
          background: isAssigned ? "rgba(34, 197, 94, 0.15)" : "rgba(59, 130, 246, 0.15)",
          border: `1px solid ${
            isAssigned ? "rgba(34, 197, 94, 0.3)" : "rgba(59, 130, 246, 0.3)"
          }`,
          borderRadius: "8px",
          color: isAssigned ? "#22c55e" : "#3b82f6",
          fontSize: s.fontSize,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        <UserPlus size={s.iconSize} />
        {isAssigned ? displayName : t.assign}
      </button>
    );
  }

  // Variante: Inline (texto con click)
  if (variant === "inline") {
    return (
      <span
        onClick={() => setIsOpen(true)}
        style={{
          color: isAssigned ? "#a1a1aa" : "#3b82f6",
          fontSize: s.fontSize,
          cursor: "pointer",
          textDecoration: isAssigned ? "none" : "underline",
        }}
      >
        {displayName}
      </span>
    );
  }

  // Variante: Dropdown (default)
  return (
    <div style={{ position: "relative" }}>
      {/* Trigger */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        disabled={loadingAsesores}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          width: "100%",
          padding: s.padding,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "10px",
          color: isAssigned ? "#e4e4e7" : "#71717a",
          fontSize: s.fontSize,
          cursor: "pointer",
          transition: "all 0.2s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <User size={s.iconSize} color={isAssigned ? "#22c55e" : "#52525b"} />
          <span>{loadingAsesores ? t.loading : displayName}</span>
        </div>
        <ChevronDown
          size={s.iconSize}
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0)",
            transition: "transform 0.2s",
          }}
        />
      </button>

      {/* Dropdown */}
      {isOpen && canPortal && menuPos &&
        createPortal(
          <>
            {/* Overlay para cerrar */}
            <div
              onClick={() => setIsOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 10000,
              }}
            />

            {/* Menu */}
            <div
              style={{
                position: "fixed",
                left: menuPos.left,
                top: menuPos.top,
                width: menuPos.width,
                background: "#1f1f23",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "12px",
                boxShadow: "0 10px 40px rgba(0,0,0,0.6)",
                zIndex: 10001,
                overflow: "hidden",
                animation: "dropIn 0.2s ease",
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: "12px 14px",
                  borderBottom: "1px solid rgba(255,255,255,0.1)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    color: "#71717a",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Asignar a
                </span>
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#52525b",
                    cursor: "pointer",
                    padding: "2px",
                  }}
                >
                  <X size={14} />
                </button>
              </div>

              {/* Lista de asesores */}
              <div style={{ maxHeight: Math.max(200, (menuPos.maxHeight || 260) - 92), overflowY: "auto" }}>
                {asesores.length === 0 ? (
                  <div
                    style={{
                      padding: "20px",
                      textAlign: "center",
                      color: "#52525b",
                      fontSize: "13px",
                    }}
                  >
                    No hay asesores registrados
                  </div>
                ) : (
                  asesores.map((asesor) => (
                    <button
                      key={asesor.id}
                      onClick={() => handleAssign(asesor)}
                      disabled={loading}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                        padding: "12px 14px",
                        background:
                          selectedAsesor?.id === asesor.id
                            ? "rgba(34, 197, 94, 0.1)"
                            : "transparent",
                        border: "none",
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        color: "#e4e4e7",
                        fontSize: "13px",
                        cursor: loading ? "not-allowed" : "pointer",
                        textAlign: "left",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        if (selectedAsesor?.id !== asesor.id) {
                          e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedAsesor?.id !== asesor.id) {
                          e.currentTarget.style.background = "transparent";
                        }
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 500 }}>{asesor.nombre}</div>
                        <div style={{ fontSize: "11px", color: "#52525b" }}>{asesor.email}</div>
                      </div>
                      {selectedAsesor?.id === asesor.id && <Check size={16} color="#22c55e" />}
                    </button>
                  ))
                )}
              </div>

            {/* Opción de quitar asignación */}
            {isAssigned && (
              <button
                onClick={handleUnassign}
                disabled={loading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  width: "100%",
                  padding: "12px",
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "none",
                  borderTop: "1px solid rgba(255,255,255,0.1)",
                  color: "#f87171",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? <Loader2 className="animate-spin" size={14} /> : <X size={14} />}
                Quitar asignación
              </button>
            )}
            </div>
          </>,
          document.body
        )}

      <style>{`
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
