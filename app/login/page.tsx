"use client";
import React, { useState } from "react";
import { supabase } from "../supabaseClient"; // Ajusta la ruta si es necesario
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation"; // 👈 Importamos useSearchParams

export default function Login() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [name, setName] = useState("");

  const router = useRouter();
  const searchParams = useSearchParams(); 
  const planSelected = searchParams.get("plan"); // 👈 1. Capturamos el plan de la URL

  // Función para redirigir inteligentemente
  const handleRedirect = () => {
    if (planSelected) {
      // 🟢 Si eligió plan, lo mandamos a PAGAR primero
      router.push(`/payment?plan=${encodeURIComponent(planSelected)}`);
    } else {
      // ⚪ Si entró directo, lo mandamos al Dashboard (CRM)
      router.push("/dashboard");
    }
  };

  return (
    <div className="relative min-h-screen w-full">
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
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-blue-900/20 to-pink-900/30"></div>

        <motion.div
          initial={{ x: 200, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 60, damping: 15 }}
          className="relative w-[340px] p-8 rounded-2xl shadow-[0_0_30px_rgba(16,178,203,0.5)] bg-[#0d2236]/80 backdrop-blur-xl border border-[#10b2cb]/40 z-10"
        >
          <div className="relative z-10 text-white">
            <h2 className="text-2xl font-bold mb-2 text-right">
              {mode === "login" ? "Bienvenido" : "Crear Cuenta"}
            </h2>
            
            {/* 👇 2. Aviso visual si hay un plan seleccionado */}
            {planSelected && (
              <div className="mb-6 text-right">
                <span className="bg-[#10b2cb] text-black text-xs font-bold px-2 py-1 rounded">
                  Plan: {planSelected}
                </span>
                <p className="text-xs text-gray-300 mt-1">Regístrate para continuar al pago.</p>
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();

                if (mode === "login") {
                  // --- LÓGICA DE LOGIN ---
                  const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password: pwd,
                  });

                  if (error) {
                    alert("Error: " + error.message);
                    return;
                  }
                  
                  // ✅ Login exitoso -> Redirigir
                  handleRedirect();

                } else {
                  // --- LÓGICA DE REGISTRO ---
                  const { error } = await supabase.auth.signUp({
                    email,
                    password: pwd,
                    options: {
                      data: { 
                        full_name: name,
                        plan_intento: planSelected // Guardamos qué plan quería
                      },
                    },
                  });

                  if (error) {
                    alert("Error: " + error.message);
                  } else {
                    // En Supabase, a veces el registro auto-loguea si no hay confirmación de email obligatoria
                    // Si tu proyecto requiere confirmar email, muestra alerta. Si no, redirige.
                    alert("Cuenta creada correctamente. Iniciando sesión...");
                    
                    // Intentamos loguear automáticamente o redirigir
                    const { data } = await supabase.auth.signInWithPassword({ email, password: pwd });
                    if (data.session) {
                        handleRedirect();
                    } else {
                        setMode("login");
                    }
                  }
                }
              }}
              className="flex flex-col gap-4 mt-4"
            >
              {mode === "signup" && (
                <input
                  type="text"
                  placeholder="Nombre completo"
                  className="p-3 rounded-lg text-black focus:ring-2 focus:ring-[#10b2cb] outline-none"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              )}

              <input
                type="email"
                placeholder="Correo"
                className="p-3 rounded-lg text-black focus:ring-2 focus:ring-[#10b2cb] outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <input
                type="password"
                placeholder="Contraseña"
                className="p-3 rounded-lg text-black focus:ring-2 focus:ring-[#10b2cb] outline-none"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                required
              />

              <motion.button
                type="submit"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-[#10b2cb] to-[#2c6bed] py-3 rounded-lg font-bold hover:opacity-90 transition mt-2"
              >
                {mode === "login" ? "Entrar" : "Registrarse y Pagar"}
              </motion.button>
            </form>

            <p className="mt-6 text-right text-sm text-gray-300">
              {mode === "login" ? (
                <>
                  ¿Nuevo aquí?{" "}
                  <button
                    className="underline text-[#10b2cb]"
                    onClick={() => setMode("signup")}
                  >
                    Crea una cuenta
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