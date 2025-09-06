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
  const [interes, setInteres] = useState("");
  const [status, setStatus] = useState<"idle" | "enviando" | "ok" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("enviando");

    try {
      const lead_id = uuidv4();

      // 🔗 Enviar directo a tu webhook de n8n
      const res = await fetch("https://n8nio-n8n-latest.onrender.com/webhook/demo-opened", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id, nombre, email, empresa, telefono, interes }),
      });

      if (res.ok) {
        setStatus("ok");
        setNombre("");
        setEmail("");
        setEmpresa("");
        setTelefono("");
        setInteres("");
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
            <h2>Solicita tu demo personalizada</h2>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Tu nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                pattern="^[A-Za-zÁÉÍÓÚÑáéíóúñ ]+$"
                title="El nombre solo puede contener letras y espacios"
              />
              <input
                type="email"
                placeholder="Tu correo"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                title="Por favor, introduce un correo válido"
              />
              <input
                type="text"
                placeholder="Empresa"
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                required
                minLength={2}
                title="La empresa debe tener al menos 2 caracteres"
              />
              <input
                type="tel"
                placeholder="Teléfono de contacto"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                required
                pattern="^[0-9]{7,15}$"
                title="El teléfono debe tener entre 7 y 15 dígitos numéricos"
              />
              <textarea
                placeholder="¿Qué te interesa ver en la demo?"
                value={interes}
                onChange={(e) => setInteres(e.target.value)}
                rows={4}
                required
                minLength={5}
                title="Por favor, escribe al menos 5 caracteres"
              />
              <button type="submit">
                {status === "enviando" ? "Enviando..." : "Enviar solicitud"}
              </button>
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
              ✅ ¡Solicitud enviada con éxito!
            </h2>
            <p className="text-white">
              📧 Revisa tu correo, te enviamos el link para acceder a tu demo.
            </p>
            <button
              onClick={onClose}
              className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 mt-4 rounded font-bold"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DemoModal;
