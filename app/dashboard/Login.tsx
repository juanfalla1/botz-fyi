"use client";
import React, { useState } from "react";
import { supabase } from "./supabaseClient";
import { motion } from "framer-motion";

export default function Login() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [name, setName] = useState("");

  return (
    <div className="relative min-h-screen w-full">
      {/* 🔹 Botón Home MEJORADO */}
     

      {/* 🔹 Login / Signup Card */}
      <motion.div
        className="flex flex-col items-center justify-center min-h-screen w-full"
        style={{
          backgroundImage: "url('/bg-leads.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "fixed",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        {/* Overlay con gradiente para mejorar el contraste */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-blue-900/20 to-pink-900/30"></div>
        
        <motion.div
          initial={{ x: 200, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 60, damping: 15 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          className="relative w-[320px] p-8 rounded-2xl shadow-[0_0_30px_rgba(16,178,203,0.5)] bg-[#0d2236]/70 backdrop-blur-xl border border-[#10b2cb]/40 hover:shadow-[0_0_40px_rgba(16,178,203,0.8)] transition-transform duration-300 mr-10 z-10"
        >
          <div className="relative z-10 text-white">
            <h2 className="text-2xl font-bold mb-6 text-right">
              {mode === "login" ? "Bienvenido de nuevo 👋" : "Crea tu cuenta 🚀"}
            </h2>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (mode === "login") {
                  const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password: pwd,
                  });
                  if (error) alert("Error al iniciar sesión: " + error.message);
                  else location.reload();
                } else {
                  const { error } = await supabase.auth.signUp({
                    email,
                    password: pwd,
                    options: { data: { full_name: name } },
                  });
                  if (error) alert("Error al registrarse: " + error.message);
                  else {
                    alert("Cuenta creada, revisa tu correo para confirmar ✅");
                    setMode("login");
                  }
                }
              }}
              className="flex flex-col gap-4"
            >
              {mode === "signup" && (
                <input
                  type="text"
                  placeholder="Nombre completo"
                  className="p-3 rounded-lg text-black focus:ring-2 focus:ring-[#10b2cb]"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              )}
              <input
                type="email"
                placeholder="Correo"
                className="p-3 rounded-lg text-black focus:ring-2 focus:ring-[#10b2cb]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Contraseña"
                className="p-3 rounded-lg text-black focus:ring-2 focus:ring-[#10b2cb]"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                required
              />
              <motion.button
                type="submit"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-[#10b2cb] to-[#2c6bed] py-3 rounded-lg font-semibold hover:opacity-90 transition"
              >
                {mode === "login" ? "Entrar" : "Registrarse"}
              </motion.button>
            </form>

            <p className="mt-6 text-right text-sm text-gray-300">
              {mode === "login" ? (
                <>
                  ¿No tienes cuenta?{" "}
                  <button
                    className="underline text-[#10b2cb]"
                    onClick={() => setMode("signup")}
                  >
                    Regístrate aquí
                  </button>
                </>
              ) : (
                <>
                  ¿Ya tienes cuenta?{" "}
                  <button
                    className="underline text-[#10b2cb]"
                    onClick={() => setMode("login")}
                  >
                    Inicia sesión
                  </button>
                </>
              )}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}