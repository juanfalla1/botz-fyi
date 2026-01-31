"use client";
import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import "../styles/DemoModal.css";

interface DemoModalProps {
  onClose: () => void;
}

const DemoModal: React.FC<DemoModalProps> = ({ onClose }) => {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [telefono, setTelefono] = useState("");

  const [status, setStatus] = useState<"idle" | "enviando" | "ok" | "error">("idle");

  // tenant_id (lead_id)
  const [tenantId, setTenantId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("enviando");

    try {
      const lead_id = uuidv4();

      const res = await fetch(
        "https://n8nio-n8n-latest.onrender.com/webhook/demo-opened",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenant_id: lead_id, 
            nombre,
            email,
            empresa,
            telefono,
            source: "trial_7_days",
          }),
        }
      );

      if (res.ok) {
        setTenantId(lead_id);
        setStatus("ok");

        setNombre("");
        setEmail("");
        setEmpresa("");
        setTelefono("");
      } else {
        setStatus("error");
      }
    } catch (err) {
      console.error("Error al enviar:", err);
      setStatus("error");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="close-button" onClick={onClose}>
          &times;
        </button>

        {status !== "ok" ? (
          <>
            <h2>Activa tu Demo</h2>

            <form onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Tu nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                pattern="^[A-Za-zÁÉÍÓÚÑáéíóúñ ]+$"
              />

              <input
                type="email"
                placeholder="Tu correo"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <input
                type="text"
                placeholder="Empresa"
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                required
                minLength={2}
              />

              <input
                type="tel"
                placeholder="WhatsApp del negocio"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                required
                pattern="^[0-9]{7,15}$"
              />

              <button type="submit">
                {status === "enviando" ? "Activando..." : "Activar mi Agente IA"}
              </button>

              <p className="text-sm text-gray-400 mt-2 text-center">
                 ✔ Sin tarjeta · ✔ Activación inmediata
              </p>
            </form>

            {status === "error" && (
              <p className="text-red-500 mt-4">
                ❌ Error al enviar. Intenta de nuevo.
              </p>
            )}
          </>
        ) : (
          <div className="text-center p-4">
            <h2 className="text-green-400 mb-4">
              ✅ ¡Tu solicitud fue recibida!
            </h2>

            <p className="text-white">
              📩 Te enviamos un correo para que crees tu contraseña y accedas a tu
              <b> Demo de Botz</b>.
              <br /><br />
              👉 Revisa tu bandeja de entrada (y spam).
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DemoModal;
