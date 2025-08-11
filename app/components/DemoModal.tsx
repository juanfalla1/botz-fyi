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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ nombre, empresa, telefono, interes });

    // Aquí podrías agregar la integración con tu backend o n8n
    alert("Solicitud enviada con éxito");
    onClose(); // Cierra el modal
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
            placeholder="¿Qué te interesó de la demo?"
            value={interes}
            onChange={(e) => setInteres(e.target.value)}
            rows={4}
          />
          <button type="submit">Enviar solicitud</button>
        </form>
      </div>
    </div>
  );
};

export default DemoModal;

