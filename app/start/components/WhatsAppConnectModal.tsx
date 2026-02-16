"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";

interface WhatsAppConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId?: string | null;
  onConnected: () => void;
}

export const WhatsAppConnectModal: React.FC<WhatsAppConnectModalProps> = ({
  isOpen,
  onClose,
  tenantId,
  onConnected,
}) => {
  const [connectionData, setConnectionData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ tenant resuelto desde DB si no viene por props
  const [resolvedTenantId, setResolvedTenantId] = useState<string | null>(null);

  // ✅ para poder limpiar intervalos/timeouts al cerrar
  const pollingRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  
  // ✅ Prevenir llamadas duplicadas a initConnection
  const isConnectingRef = useRef(false);

  // ✅ Normaliza tenantId: si viene "tenant_<uuid>" → lo deja en "<uuid>"
  const normalizeTenantId = (tid: any) => {
    const s = String(tid || "").trim();
    if (!s) return "";
    return s.startsWith("tenant_") ? s.replace(/^tenant_/, "") : s;
  };

  // ✅ Usa tenantId prop si viene, si no usa el resuelto
  const getTenantId = () => {
    const tid = normalizeTenantId(tenantId || resolvedTenantId);
    return tid || "";
  };

  // ✅ Resuelve tenant_id desde subscriptions O team_members por user_id
  const resolveTenantId = async (): Promise<string> => {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) return "";

    // Primero buscar en subscriptions (dueños/admin)
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("tenant_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (sub?.tenant_id) {
      return normalizeTenantId(sub.tenant_id) || "";
    }

    // Si no está en subscriptions, buscar en team_members (asesores)
    const { data: teamMember } = await supabase
      .from("team_members")
      .select("tenant_id")
      .eq("auth_user_id", userId)
      .eq("activo", true)
      .limit(1)
      .maybeSingle();

    return normalizeTenantId(teamMember?.tenant_id) || "";
  };

  useEffect(() => {
    if (isOpen) {
      (async () => {
        setError(null);

        // ✅ Si no viene tenantId por prop, lo buscamos en subscriptions o team_members
        let tid = normalizeTenantId(tenantId);
        if (!tid) {
          tid = await resolveTenantId();
          if (tid) setResolvedTenantId(tid);
        } else {
          // si viene por props, lo guardamos también
          setResolvedTenantId(tid);
        }

        if (!tid) {
          setError("tenantId is required");
          return;
        }

        // Solo iniciar conexión automáticamente si NO hay datos previos
        // Esto evita conflictos cuando el usuario hace clic en "Reintentar"
        if (!connectionData && !isConnectingRef.current) {
          initConnection(tid);
        }
      })();
    } else {
      stopPolling();
      setConnectionData(null);
      setError(null);
      setLoading(false);
      setResolvedTenantId(null);
    }

    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tenantId]);

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // ✅ Convierte lo que venga en connectionData.qr_code a un src válido
  const getQrSrc = (qr: any): string | null => {
    if (!qr) return null;

    if (typeof qr === "object") {
      const candidate =
        qr.base64 || qr.qr || qr.qr_code || qr.qrcode || qr.qrCode || null;
      if (!candidate) return null;
      qr = candidate;
    }

    if (typeof qr !== "string") return null;

    const s = qr.trim();
    if (!s) return null;

    if (s.startsWith("data:image/")) return s;
    if (s.startsWith("http://") || s.startsWith("https://")) return s;

    const looksBase64 = /^[A-Za-z0-9+/=\s]+$/.test(s) && s.length > 50;
    if (looksBase64) return `data:image/png;base64,${s}`;

    return null;
  };

  // ✅ Detecta conectado aunque el backend devuelva {connected:true} o {status:"connected"}
  const isStatusConnected = (status: any): boolean => {
    if (!status) return false;
    if (status.connected === true) return true;

    const s1 = String(status.status || "").toLowerCase().trim();
    const s2 = String(status.state || "").toLowerCase().trim();
    const s3 = String(status.connection || "").toLowerCase().trim();

    return s1 === "connected" || s2 === "connected" || s3 === "connected";
  };

  // ✅ FINALIZA conexión: cierra + refresca UI
  const finishConnected = () => {
    stopPolling();
    try {
      onConnected?.();
    } catch {}
    onClose?.();

    // ✅ IMPORTANTÍSIMO: fuerza refresh para que la UI vuelva a leer BD y cambie el badge
    setTimeout(() => {
      if (typeof window !== "undefined") window.location.reload();
    }, 250);
  };

  // ✅ Ahora recibe tid opcional (si no, usa getTenantId())
  const initConnection = async (tidFromCall?: string) => {
    // Prevenir llamadas duplicadas
    if (isConnectingRef.current) {
      console.log("[WhatsApp] Conexión ya en progreso, ignorando llamada duplicada");
      return;
    }
    
    isConnectingRef.current = true;
    stopPolling();
    setLoading(true);
    setError(null);

    try {
      if (!supabase) {
        throw new Error("Supabase env missing (NEXT_PUBLIC_SUPABASE_URL/ANON_KEY)");
      }

      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token || null;
      if (!accessToken) throw new Error("Sesion expirada");

      // Asegurar que tenemos el tenant del prop o del estado resuelto
      let tid = normalizeTenantId(tidFromCall);
      if (!tid) {
        // Si no viene por parámetro, usar el que ya resolvimos en useEffect
        tid = normalizeTenantId(resolvedTenantId || tenantId);
      }
      
      if (!tid) {
        // Último intento: resolver ahora
        tid = await resolveTenantId();
        if (tid) setResolvedTenantId(tid);
      }
      
      if (!tid) throw new Error("tenantId is required - No se pudo obtener el ID del tenant");

      console.log("Conectando WhatsApp para tenant:", tid);

      const response = await fetch("/api/whatsapp/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ tenantId: tid, tenant_id: tid }),
      });

      const data = await response.json().catch(() => null);
      
      console.log("WhatsApp connect response:", data);
      console.log("QR Code presente:", !!data?.qr_code);

      if (!response.ok) {
        console.error("Error response:", response.status, data);
        throw new Error(data?.error || `Error ${response.status} al iniciar conexión`);
      }

      setConnectionData(data);

      if (data?.connection_type === "already_connected") {
        finishConnected();
        return;
      }

      if (data.connection_type === "qr") {
        startPolling(tid);
      } else if (data.connection_type === "oauth") {
        window.location.href = data.auth_url;
      }
    } catch (err: any) {
      console.error("[WhatsApp] Error en initConnection:", err);
      setError(err.message || "Error al iniciar conexión");
    } finally {
      isConnectingRef.current = false;
      setLoading(false);
    }
  };

  const startPolling = (tidFromCall?: string) => {
    const tid = normalizeTenantId(tidFromCall || getTenantId());
    if (!tid) {
      setError("tenantId is required");
      return;
    }

    stopPolling();

    const safeTenantId = encodeURIComponent(tid);

    pollingRef.current = window.setInterval(async () => {
      try {
        // ✅ Tu proyecto ya tiene /api/whatsapp/status/[tenantId]
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token || null;
        if (!accessToken) return;

        let response = await fetch(`/api/whatsapp/status/${safeTenantId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        let status: any = await response.json().catch(() => ({}));

        if (response.status === 404) {
          response = await fetch(
            `/api/whatsapp/status?tenantId=${safeTenantId}&tenant_id=${safeTenantId}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          status = await response.json().catch(() => ({}));
        }

        if (isStatusConnected(status)) {
          finishConnected();
          return;
        }

        if (!response.ok) {
          console.warn("WhatsApp status not ok:", response.status, status);
          return;
        }
      } catch (err) {
        console.error("Error verificando estado:", err);
      }
    }, 3000);

    timeoutRef.current = window.setTimeout(() => stopPolling(), 300000);
  };

  if (!isOpen) return null;

  const qrSrc = getQrSrc(connectionData?.qr_code);

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <button style={styles.closeButton} onClick={onClose}>
          ✕
        </button>

        {loading && (
          <div style={styles.center}>
            <div style={styles.spinner} />
            <p>Preparando conexión...</p>
          </div>
        )}

        {error && (
          <div style={styles.center}>
            <p style={styles.error}>❌ Error: {error}</p>
            <button style={styles.retryButton} onClick={() => initConnection()}>
              Reintentar
            </button>
          </div>
        )}

        {connectionData?.connection_type === "already_connected" &&
          !loading &&
          !error && (
            <div style={styles.center}>
              <h3 style={styles.title}>✅ WhatsApp ya está conectado</h3>
              <p style={styles.subtitle}>
                Instancia: <strong>{connectionData.instance_id}</strong>
              </p>
              <button style={styles.retryButton} onClick={finishConnected}>
                Continuar
              </button>
            </div>
          )}

        {connectionData?.connection_type === "qr" && !loading && !error && (
          <div style={styles.qrContainer}>
            <h3 style={styles.title}>Conecta tu WhatsApp</h3>
            <p style={styles.subtitle}>Escanea este código QR</p>
            
            {/* DEBUG: Mostrar datos crudos */}
            <div style={{fontSize: '10px', color: '#666', marginBottom: '10px', wordBreak: 'break-all'}}>
              DEBUG: qr_code type: {typeof connectionData?.qr_code} | 
              has qr: {connectionData?.qr_code ? 'YES' : 'NO'} |
              qrSrc: {qrSrc ? 'VALID' : 'NULL'}
            </div>

            <div style={styles.qrBox}>
              {qrSrc ? (
                <img src={qrSrc} alt="QR Code" style={styles.qrImage} />
              ) : (
                <div style={styles.qrLoading}>
                  Generando QR...<br/>
                  <small>Si persiste, haz clic en Reintentar</small>
                </div>
              )}
            </div>
            
            {!qrSrc && (
              <button 
                style={{...styles.retryButton, marginTop: '10px'}} 
                onClick={() => initConnection()}
              >
                Reintentar conexión
              </button>
            )}

            <div style={styles.instructions}>
              <h4>Pasos:</h4>
              <ol>
                <li>Abre WhatsApp en tu celular</li>
                <li>
                  Ve a <strong>Configuración → Dispositivos vinculados</strong>
                </li>
                <li>
                  Toca <strong>"Vincular un dispositivo"</strong>
                </li>
                <li>Escanea este código</li>
              </ol>
            </div>

            <div style={styles.waiting}>
              <div style={styles.pulse} />
              <p>Esperando escaneo...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Estilos inline
const styles: any = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  modal: {
    background: "white",
    borderRadius: "12px",
    padding: "32px",
    maxWidth: "500px",
    width: "90%",
    position: "relative",
    maxHeight: "90vh",
    overflowY: "auto",
  },
  closeButton: {
    position: "absolute",
    top: "16px",
    right: "16px",
    background: "none",
    border: "none",
    fontSize: "24px",
    cursor: "pointer",
    color: "#999",
  },
  center: {
    textAlign: "center",
    padding: "40px 20px",
  },
  spinner: {
    border: "3px solid #f3f3f3",
    borderTop: "3px solid #25D366",
    borderRadius: "50%",
    width: "40px",
    height: "40px",
    animation: "spin 1s linear infinite",
    margin: "0 auto 16px",
  },
  error: {
    color: "#e74c3c",
    marginBottom: "16px",
  },
  retryButton: {
    background: "#25D366",
    color: "white",
    border: "none",
    padding: "12px 24px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
  },
  qrContainer: {
    textAlign: "center",
  },
  title: {
    marginBottom: "8px",
    color: "#333",
  },
  subtitle: {
    color: "#666",
    marginBottom: "24px",
  },
  qrBox: {
    margin: "24px 0",
    padding: "20px",
    background: "#f5f5f5",
    borderRadius: "8px",
    display: "inline-block",
  },
  qrImage: {
    width: "250px",
    height: "250px",
  },
  qrLoading: {
    width: "250px",
    height: "250px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#999",
  },
  instructions: {
    textAlign: "left",
    background: "#f8f9fa",
    padding: "16px",
    borderRadius: "8px",
    marginTop: "24px",
  },
  waiting: {
    marginTop: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    color: "#666",
  },
  pulse: {
    width: "12px",
    height: "12px",
    background: "#25D366",
    borderRadius: "50%",
    animation: "pulse 1.5s ease-in-out infinite",
  },
};
