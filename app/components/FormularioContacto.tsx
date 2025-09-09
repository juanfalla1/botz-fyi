"use client";

import React, { useState } from "react";
import { supabase } from "../supabaseClient"; // 👈 agregado

const FormularioContacto = () => {
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    empresa: "",
    telefono: "",
    interes: "Demo Tracker",
    mensaje: "",
  });

  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // ✅ Generar un lead_id único para cada envío
      const leadId = `demo-${Date.now()}`;

      // ✅ Obtener user_id de Supabase
      const { data: { user } } = await supabase.auth.getUser();

      const payload = {
        ...formData,
        lead_id: leadId,
        origen: "web", // 🔑 para identificar origen
        user_id: user?.id || null, // 🔑 asociar lead al usuario
      };

      const res = await fetch(
        "https://n8nio-n8n-latest.onrender.com/webhook/demo-opened",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      let data;
      const contentType = res.headers.get("content-type");

      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        data = { message: await res.text() }; // Captura HTML o texto plano
      }

      if (res.ok) {
        setEnviado(true);
        setFormData({
          nombre: "",
          email: "",
          empresa: "",
          telefono: "",
          interes: "Demo Tracker",
          mensaje: "",
        });
        setError("");
        console.log("✅ Respuesta de n8n:", data);
      } else {
        setError(
          data?.error || "Hubo un error al enviar tu mensaje. Intenta de nuevo."
        );
        console.error("❌ Error de n8n:", data);
      }
    } catch (err) {
      console.error("⚠️ Error al enviar datos a n8n:", err);
      setError("Error de conexión con el servidor. Intenta más tarde.");
    }
  };

  return (
    <section id="contacto" className="py-16 px-6 bg-[#0a0f1c] text-white">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-cyan-400 mb-6">
          Contáctanos
        </h2>
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
          <input
            type="text"
            name="empresa"
            placeholder="Tu empresa"
            value={formData.empresa}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded bg-[#1f2937] border border-cyan-500 focus:outline-none"
          />
          <input
            type="tel"
            name="telefono"
            placeholder="Tu teléfono"
            value={formData.telefono}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded bg-[#1f2937] border border-cyan-500 focus:outline-none"
          />
          <select
            name="interes"
            value={formData.interes}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded bg-[#1f2937] border border-cyan-500 focus:outline-none"
          >
            <option value="Demo Tracker">Demo Tracker</option>
            <option value="Automatización">Automatización</option>
            <option value="Integraciones">Integraciones</option>
            <option value="Personalizado">Solución personalizada</option>
          </select>
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

        {enviado && (
          <p className="text-green-400 mt-4">
            ✅ ¡Mensaje enviado con éxito a Botz!
          </p>
        )}
        {error && <p className="text-red-400 mt-4">❌ {error}</p>}
      </div>
    </section>
  );
};

export default FormularioContacto;
