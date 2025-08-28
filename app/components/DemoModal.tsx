"use client";
import React, { useState } from "react";
import "../styles/DemoModal.css";

interface DemoModalProps {
  onClose: () => void;
}

const DemoModal: React.FC<DemoModalProps> = ({ onClose }) => {
  const [nombre, setNombre] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [telefono, setTelefono] = useState("");
  const [interes, setInteres] = useState("");
  const [status, setStatus] = useState<"idle" | "enviando" | "ok" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("enviando");

    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, empresa, telefono, interes }),
      });

      const data = await res.json();
      if (data.success) {
        setStatus("ok");
        setNombre("");
        setEmpresa("");
        setTelefono("");
        setInteres("");
        onClose(); // opcional: cerrar modal al enviar
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
        <h2>Solicita tu demo personalizada</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Tu nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Empresa"
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
            required
          />
          <input
            type="tel"
            placeholder="Teléfono de contacto"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            required
          />
          <textarea
            placeholder="Tu Mensaje"
            value={interes}
            onChange={(e) => setInteres(e.target.value)}
            rows={4}
          />
          <button type="submit">
            {status === "enviando" ? "Enviando..." : "Enviar solicitud"}
          </button>
        </form>

        {status === "ok" && <p className="text-green-500">✅ ¡Solicitud enviada con éxito!</p>}
        {status === "error" && <p className="text-red-500">❌ Error al enviar. Intenta de nuevo.</p>}
      </div>
    </div>
  );
};

export default DemoModal;
