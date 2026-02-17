"use client";

import React, { useState, useEffect, useRef } from "react";
import { Loader2, AlertCircle, CheckCircle, Mail, ArrowRight } from "lucide-react";

interface OTPVerificationModalProps {
  isOpen: boolean;
  email: string;
  onVerified: (sessionId: string) => void;
  onCancel: () => void;
  onResendOTP: () => Promise<void>;
}

export default function OTPVerificationModal({
  isOpen,
  email,
  onVerified,
  onCancel,
  onResendOTP,
}: OTPVerificationModalProps) {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutos en segundos
  const [isVerified, setIsVerified] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ✅ Timer para mostrar tiempo restante
  useEffect(() => {
    if (!isOpen || isVerified || !timeRemaining) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setError("El código OTP ha expirado. Solicita uno nuevo.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, isVerified, timeRemaining]);

  // ✅ Focus en input cuando abre el modal
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // ✅ Formatear tiempo restante (MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // ✅ Manejar cambios en input (solo números, máximo 6)
  const handleOTPChange = (value: string) => {
    const numericOnly = value.replace(/\D/g, "").slice(0, 6);
    setOtp(numericOnly);
    setError(""); // Limpiar error al escribir
  };

  // ✅ Verificar OTP
  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setError("El código debe tener 6 dígitos");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Error al verificar código");
        setAttemptsRemaining(data.attemptsRemaining ?? attemptsRemaining);

        // Si está bloqueado, mostrar opción de resolicitar
        if (data.blocked) {
          setOtp("");
        }
        return;
      }

      // ✅ Verificación exitosa
      setIsVerified(true);
      setTimeout(() => {
        onVerified(data.otpSessionId);
      }, 1000);
    } catch (err) {
      setError("Error de conexión. Intenta de nuevo.");
      console.error("Error verifying OTP:", err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Resolicitar OTP
  const handleResendOTP = async () => {
    try {
      setLoading(true);
      setError("");
      setOtp("");
      setAttemptsRemaining(3);
      setTimeRemaining(300);
      await onResendOTP();
    } catch (err) {
      setError("Error al resolicitar código. Intenta de nuevo.");
      console.error("Error resending OTP:", err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Manejar Enter para verificar
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && otp.length === 6 && !loading) {
      handleVerifyOTP();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(10px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(145deg, #1e293b 0%, #0f172a 100%)",
          borderRadius: "24px",
          border: "1px solid rgba(255,255,255,0.1)",
          width: "min(450px, 95vw)",
          boxShadow: "0 25px 80px rgba(0,0,0,0.6)",
          animation: "scaleIn 0.3s ease",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "30px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            background:
              "linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
            <div
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Mail size={24} color="#fff" />
            </div>
            <div>
              <span
                style={{
                  background: "rgba(34, 211, 238, 0.2)",
                  color: "#22d3ee",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontSize: "11px",
                  fontWeight: "bold",
                }}
              >
                VERIFICACIÓN 2FA
              </span>
            </div>
          </div>

          <h2
            style={{
              margin: "0",
              fontSize: "24px",
              fontWeight: "bold",
              color: "#fff",
            }}
          >
            Verifica tu identidad
          </h2>
          <p style={{ margin: "8px 0 0", color: "#94a3b8", fontSize: "14px" }}>
            Ingresa el código de 6 dígitos enviado a{" "}
            <strong style={{ color: "#22d3ee" }}>{email}</strong>
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: "30px" }}>
          {/* Timer */}
          {!isVerified && timeRemaining > 0 && (
            <div
              style={{
                background: "rgba(34, 211, 238, 0.1)",
                border: "1px solid rgba(34, 211, 238, 0.2)",
                borderRadius: "12px",
                padding: "12px",
                marginBottom: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "14px",
                color: "#22d3ee",
              }}
            >
              <span>⏱️ Tiempo restante</span>
              <span style={{ fontWeight: "bold", fontSize: "16px" }}>
                {formatTime(timeRemaining)}
              </span>
            </div>
          )}

          {/* OTP Input */}
          {!isVerified ? (
            <>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  color: "#94a3b8",
                  marginBottom: "8px",
                  fontWeight: "500",
                }}
              >
                Código OTP
              </label>

              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                placeholder="000000"
                value={otp}
                onChange={(e) => handleOTPChange(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading || !timeRemaining}
                maxLength={6}
                style={{
                  width: "100%",
                  padding: "16px",
                  fontSize: "32px",
                  fontWeight: "bold",
                  letterSpacing: "12px",
                  textAlign: "center",
                  borderRadius: "12px",
                  border: error
                    ? "2px solid #ef4444"
                    : "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(15,23,42,0.6)",
                  color: "#fff",
                  marginBottom: "16px",
                  opacity: loading || !timeRemaining ? 0.5 : 1,
                }}
              />

              {/* Intentos restantes */}
              <div style={{ marginBottom: "16px", fontSize: "12px" }}>
                <span style={{ color: "#94a3b8" }}>
                  Intentos restantes: <strong style={{ color: attemptsRemaining <= 1 ? "#ef4444" : "#22d3ee" }}>{attemptsRemaining}</strong>
                </span>
              </div>

              {/* Error message */}
              {error && (
                <div
                  style={{
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    borderRadius: "12px",
                    padding: "12px",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    color: "#fca5a5",
                    fontSize: "13px",
                  }}
                >
                  <AlertCircle size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
                  <span>{error}</span>
                </div>
              )}

              {/* Buttons */}
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  onClick={onCancel}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: "14px",
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.05)",
                    color: "#94a3b8",
                    fontWeight: "bold",
                    fontSize: "14px",
                    cursor: loading ? "wait" : "pointer",
                    opacity: loading ? 0.5 : 1,
                  }}
                >
                  Cancelar
                </button>

                <button
                  onClick={handleVerifyOTP}
                  disabled={loading || otp.length !== 6 || !timeRemaining}
                  style={{
                    flex: 1,
                    padding: "14px",
                    borderRadius: "12px",
                    border: "none",
                    background: otp.length === 6
                      ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                      : "rgba(102, 126, 234, 0.3)",
                    color: "#fff",
                    fontWeight: "bold",
                    fontSize: "14px",
                    cursor: otp.length === 6 && !loading && timeRemaining ? "pointer" : "not-allowed",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    opacity: otp.length === 6 ? 1 : 0.6,
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                      Verificando...
                    </>
                  ) : (
                    <>
                      Verificar
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>

              {/* Resend option */}
              {attemptsRemaining > 0 && timeRemaining === 0 && (
                <div style={{ marginTop: "16px", textAlign: "center" }}>
                  <button
                    onClick={handleResendOTP}
                    disabled={loading}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#22d3ee",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: "bold",
                      textDecoration: "underline",
                    }}
                  >
                    Solicitar un nuevo código
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Verificación exitosa */
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px",
                }}
              >
                <CheckCircle size={64} color="#10b981" />
              </div>
              <h3
                style={{
                  margin: "0 0 8px 0",
                  fontSize: "20px",
                  fontWeight: "bold",
                  color: "#10b981",
                }}
              >
                ¡Verificado!
              </h3>
              <p style={{ margin: "0", color: "#94a3b8", fontSize: "14px" }}>
                Tu identidad ha sido confirmada. Redirigiendo...
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
