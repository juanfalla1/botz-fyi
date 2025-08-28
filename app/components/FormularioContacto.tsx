"use client";

import React, { useState } from "react";

const FormularioContacto = () => {
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    mensaje: ""
  });

  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        setEnviado(true);
        setFormData({ nombre: "", email: "", mensaje: "" });
        setError("");
      } else {
        setError(data.error || "Hubo un error al enviar tu mensaje. Intenta de nuevo.");
      }
    } catch (err) {
      console.error("Error al enviar el correo:", err);
      setError("Error de conexión con el servidor. Intenta más tarde.");
    }
  };

  return (
    <section id="contacto" className="py-16 px-6 bg-[#0a0f1c] text-white">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-cyan-400 mb-6">Contáctanos</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="nombre"
            placeholder="Tu nombre"
            value={formData.nombre}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 rounded bg-[#1f2937] border border-cyan-500 focus:outline-none"
          />
          <input
            type="email"
            name="email"
            placeholder="Tu correo"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 rounded bg-[#1f2937] border border-cyan-500 focus:outline-none"
          />
          <textarea
            name="mensaje"
            placeholder="Tu mensaje"
            rows={5}
            value={formData.mensaje}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 rounded bg-[#1f2937] border border-cyan-500 focus:outline-none"
          />
          <button
            type="submit"
            className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2 rounded font-bold w-full"
          >
            Enviar mensaje
          </button>
        </form>

        {enviado && <p className="text-green-400 mt-4">¡Mensaje enviado con éxito!</p>}
        {error && <p className="text-red-400 mt-4">{error}</p>}
      </div>
    </section>
  );
};

export default FormularioContacto;

