"use client";

import { AlertCircle, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function DemoAccessExpiredPage() {
  return (
    <div style={{
      background: "linear-gradient(135deg, #0c1929 0%, #0f2444 50%, #001a33 100%)",
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px"
    }}>
      <div style={{
        maxWidth: "500px",
        width: "100%",
        background: "rgba(0, 150, 255, 0.05)",
        border: "1px solid rgba(239, 68, 68, 0.3)",
        borderRadius: "12px",
        padding: "40px",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
        textAlign: "center"
      }}>
        {/* Header with icon */}
        <div style={{ marginBottom: "32px" }}>
          <div style={{
            background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
            width: "64px",
            height: "64px",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px"
          }}>
            <Clock style={{ width: "32px", height: "32px", color: "white" }} />
          </div>

          <h1 style={{
            fontSize: "28px",
            fontWeight: "bold",
            color: "white",
            margin: "0 0 8px 0"
          }}>
            Período de Prueba Expirado
          </h1>
          <p style={{ color: "#fca5a5", margin: "0" }}>
            Tu acceso de demostración ha llegado a su fin
          </p>
        </div>

        {/* Alert box */}
        <div style={{
          marginBottom: "32px",
          padding: "20px",
          borderRadius: "8px",
          background: "rgba(239, 68, 68, 0.1)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          display: "flex",
          alignItems: "flex-start",
          gap: "12px"
        }}>
          <AlertCircle style={{
            width: "20px",
            height: "20px",
            color: "#ef4444",
            flexShrink: 0,
            marginTop: "2px"
          }} />
          <div style={{ textAlign: "left" }}>
            <p style={{
              color: "#fca5a5",
              margin: "0 0 8px 0",
              fontWeight: "600"
            }}>
              Tu período de 2 días de acceso de demostración ha terminado.
            </p>
            <p style={{
              color: "#fca5a5",
              margin: 0,
              fontSize: "14px",
              opacity: 0.8
            }}>
              Para continuar usando Botz Platform, por favor contacta al equipo de ventas para obtener una suscripción completa.
            </p>
          </div>
        </div>

        {/* Info section */}
        <div style={{
          marginBottom: "32px",
          padding: "20px",
          borderRadius: "8px",
          background: "rgba(0, 150, 255, 0.08)",
          border: "1px solid rgba(0, 150, 255, 0.2)"
        }}>
          <h3 style={{
            color: "#7dd3fc",
            margin: "0 0 12px 0",
            fontWeight: "600",
            fontSize: "14px"
          }}>
            ¿Qué pasó?
          </h3>
          <ul style={{
            color: "#b0d4ff",
            margin: 0,
            paddingLeft: "20px",
            fontSize: "14px",
            lineHeight: "1.6"
          }}>
            <li>Tu acceso de demostración era válido por 2 días</li>
            <li>Este período ha expirado y tu cuenta ha sido desactivada</li>
            <li>No puedes acceder a Botz Platform en este momento</li>
          </ul>
        </div>

        {/* CTA section */}
        <div style={{
          marginBottom: "24px",
          padding: "20px",
          borderRadius: "8px",
          background: "rgba(34, 197, 94, 0.1)",
          border: "1px solid rgba(34, 197, 94, 0.2)"
        }}>
          <p style={{
            color: "#86efac",
            margin: "0 0 12px 0",
            fontWeight: "600",
            fontSize: "14px"
          }}>
            ¿Te gustó Botz Platform?
          </p>
          <p style={{
            color: "#86efac",
            margin: 0,
            fontSize: "13px"
          }}>
            Contacta con nuestro equipo para discutir un plan de suscripción que se ajuste a tus necesidades.
          </p>
        </div>

        {/* Actions */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px"
        }}>
          <a
            href="mailto:sales@botz.fyi?subject=Interés%20en%20Plan%20de%20Suscripción"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "12px",
              background: "linear-gradient(135deg, #0096ff 0%, #0077cc 100%)",
              border: "none",
              color: "white",
              borderRadius: "8px",
              fontWeight: "600",
              cursor: "pointer",
              fontSize: "16px",
              textDecoration: "none",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
            onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
          >
            Contactar Ventas
            <ArrowRight style={{ width: "16px", height: "16px" }} />
          </a>

          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "12px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#7dd3fc",
              borderRadius: "8px",
              fontWeight: "600",
              cursor: "pointer",
              fontSize: "16px",
              textDecoration: "none",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
            onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
          >
            Volver al Inicio
          </Link>
        </div>

        {/* Support info */}
        <div style={{
          marginTop: "32px",
          paddingTop: "24px",
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          textAlign: "center"
        }}>
          <p style={{
            color: "#7dd3fc",
            margin: "0 0 4px 0",
            fontSize: "12px"
          }}>
            ¿Preguntas?
          </p>
          <a
            href="mailto:support@botz.fyi"
            style={{
              color: "#0096ff",
              textDecoration: "none",
              fontSize: "12px",
              transition: "color 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = "#0077cc"}
            onMouseLeave={(e) => e.currentTarget.style.color = "#0096ff"}
          >
            support@botz.fyi
          </a>
        </div>
      </div>
    </div>
  );
}
