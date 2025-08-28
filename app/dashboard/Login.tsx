"use client";
import React, { useState } from "react";
import { supabase } from "../../supabaseClient";
import { motion } from "framer-motion";

export default function Login() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [name, setName] = useState("");

  return (
    <div className="relative min-h-screen w-full">
      {/* 🔹 Botón Home MEJORADO */}
      <motion.div 
        className="absolute top-6 right-8 z-50"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <motion.button
          onClick={() => (window.location.href = "/")}
          whileHover={{ scale: 1.1, rotate: 2 }}
          whileTap={{ scale: 0.95 }}
          className="relative flex items-center gap-3 
             bg-gradient-to-r from-sky-400 via-cyan-500 to-indigo-500
             hover:from-sky-500 hover:via-cyan-600 hover:to-indigo-600
             text-white px-6 py-3 text-lg font-bold rounded-full
             shadow-lg hover:shadow-sky-400/40 transition-all duration-300 hover:scale-110"
        >
          {/* Efecto de brillo de fondo */}
          <div className="absolute inset-0 bg-gradient-to-r from-sky-300/40 via-cyan-400/40 to-blue-400/40 rounded-3xl blur-xl opacity-70 animate-pulse"></div>
          
          {/* Contenido del botón */}
          <div className="relative z-10 flex items-center gap-4">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 drop-shadow-lg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M3 9.75L12 4l9 5.75M4.5 10.5v9.75h15V10.5M9 21V12h6v9"
                />
              </svg>
            </div>
            <span className="text-2xl font-black tracking-wider drop-shadow-lg">
              HOME
            </span>
          </div>
          
          {/* Partículas decorativas */}
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full animate-bounce"></div>
          <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-cyan-400 rounded-full animate-pulse delay-500"></div>
          <div className="absolute top-1/2 -left-3 w-2 h-2 bg-green-400 rounded-full animate-ping delay-1000"></div>
        </motion.button>
      </motion.div>

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