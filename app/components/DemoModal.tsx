"use client";
import React, { useState } from "react";
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
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, email, empresa, telefono, interes }),
      });

      const data = await res.json();
      if (data.success) {
        setStatus("ok");
        setNombre("");
        setEmail("");
        setEmpresa("");
        setTelefono("");
        setInteres("");
        // 👇 Ya no cierro el modal aquí para que vea el mensaje
        // onClose();
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
              />
              <input
                type="tel"
                placeholder="Teléfono de contacto"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                required
              />
              <textarea
                placeholder="¿Qué te interesa ver en la demo?"
                value={interes}
                onChange={(e) => setInteres(e.target.value)}
                rows={4}
                required
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
          // ✅ Mensaje de confirmación
          <div className="text-center p-4">
            <h2 className="text-green-400 mb-4">✅ ¡Solicitud enviada con éxito!</h2>
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

