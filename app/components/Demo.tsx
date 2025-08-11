"use client";

import React, { useState } from "react";

const Demo = () => {
  const [formData, setFormData] = useState({
    nombre: "",
    correo: "",
    empresa: "",
    mensaje: "",
  });

  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setEnviado(false);

    try {
      const response = await fetch("/api/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setEnviado(true);
        setFormData({ nombre: "", correo: "", empresa: "", mensaje: "" });
      } else {
        throw new Error("Error en el servidor");
      }
    } catch (err) {
      console.error("Error al enviar:", err);
      setError("Hubo un problema al enviar tu mensaje. Intenta nuevamente.");
    }
  };

  return (
    <section
      id="demo"
      className="flex flex-col items-center justify-center px-4 py-16 text-white bg-[#0a1427]"
    >
      <h2 className="text-3xl md:text-4xl font-bold text-center text-[#00b4d8] mb-4">
        Demo en Vivo de Automatización con IA
      </h2>
      <p className="text-center text-lg max-w-2xl mb-8">
        Simula una solicitud real y observa cómo nuestro sistema inteligente procesa y responde automáticamente usando flujos en tiempo real.
      </p>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-3xl bg-[#040917] p-8 rounded-lg shadow-md border border-[#00b4d8]"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <input
            type="text"
            name="nombre"
            placeholder="Tu nombre"
            value={formData.nombre}
            onChange={handleChange}
            className="p-3 rounded bg-[#0a1427] border border-[#00b4d8] text-white w-full"
            required
          />
          <input
            type="email"
            name="correo"
            placeholder="Tu correo electrónico"
            value={formData.correo}
            onChange={handleChange}
            className="p-3 rounded bg-[#0a1427] border border-[#00b4d8] text-white w-full"
            required
          />
          <input
            type="text"
            name="empresa"
            placeholder="Empresa (opcional)"
            value={formData.empresa}
            onChange={handleChange}
            className="p-3 rounded bg-[#0a1427] border border-[#00b4d8] text-white w-full"
          />
        </div>

        <textarea
          name="mensaje"
          placeholder="¿Qué desafío deseas automatizar?"
          rows={4}
          value={formData.mensaje}
          onChange={handleChange}
          className="w-full p-3 rounded bg-[#0a1427] border border-[#00b4d8] text-white mb-4"
          required
        ></textarea>

        <button
          type="submit"
          className="w-full bg-[#00b4d8] text-[#0a1427] font-bold py-3 rounded-full hover:shadow-xl transition"
        >
          Procesar Solicitud 🚀
        </button>

        {enviado && <p className="text-green-400 mt-4">¡Mensaje enviado con éxito!</p>}
        {error && <p className="text-red-400 mt-4">{error}</p>}
      </form>
    </section>
  );
};

export default Demo;


