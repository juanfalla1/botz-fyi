"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "../dashboard/supabaseClient";

export default function SetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Estado para controlar la hidratación (evita el error de mismatch HTML)
  const [mounted, setMounted] = useState(false);
  
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 1. Manejo de Hidratación y Sesión
  useEffect(() => {
    setMounted(true);
    
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        console.log("Usuario autenticado mediante enlace de correo.");
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Evita renderizar en el servidor para prevenir errores de hidratación
  if (!mounted) {
    return <div className="min-h-screen bg-[#07121f]" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);

    // Actualizamos la contraseña en Supabase
    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      setError("Error o enlace expirado: " + error.message);
      return;
    }

    // --- REDIRECCIÓN INTELIGENTE ---
    // Detectamos si el navegador está en localhost o en el dominio real
    const isLocal = window.location.hostname === "localhost";
    
    // Definimos la base de la URL según el entorno
    const baseUrl = isLocal 
      ? "http://localhost:3000" 
      : "https://www.botz.fyi";
    
    // Redirigimos a la página de la demo (/start)
    // Usamos location.href para asegurar que la sesión se refresque correctamente
    window.location.href = `${baseUrl}/start`;
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#07121f] p-4">
      {/* TARJETA PRINCIPAL */}
      <div 
        style={{ maxWidth: '400px', width: '100%' }}
        className="bg-[#0d2236] border border-[#10b2cb]/30 rounded-[2.5rem] shadow-[0_0_50px_rgba(16,178,203,0.15)] p-10 relative overflow-hidden group transition-all duration-500 hover:shadow-[0_0_60px_rgba(16,178,203,0.25)]"
      >
        
        {/* Efecto de resplandor interno */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#10b2cb]/5 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

        <div className="relative z-10 text-center mb-10">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Crear contraseña
          </h1>
          <p className="text-[#10b2cb] text-[10px] font-black uppercase tracking-[0.3em] mt-2 opacity-70">
            SEGURIDAD BOTZ AI
          </p>
        </div>

        <form onSubmit={handleSubmit} className="relative z-10 flex flex-col gap-6 w-full">
          <div className="flex flex-col gap-4">
            {/* NUEVA CONTRASEÑA */}
            <div className="w-full relative">
              <input
                type="password"
                placeholder="Nueva contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-6 py-4 rounded-2xl bg-[#071b2e] border border-white/10 text-white placeholder-gray-500 outline-none transition-all duration-300
                           focus:border-[#10b2cb] focus:bg-[#0a1a2a]
                           focus:shadow-[0_0_25px_rgba(16,178,203,0.4)] focus:scale-[1.02]"
                required
              />
            </div>

            {/* CONFIRMAR CONTRASEÑA */}
            <div className="w-full relative">
              <input
                type="password"
                placeholder="Confirmar contraseña"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-6 py-4 rounded-2xl bg-[#071b2e] border border-white/10 text-white placeholder-gray-500 outline-none transition-all duration-300
                           focus:border-[#10b2cb] focus:bg-[#0a1a2a]
                           focus:shadow-[0_0_25px_rgba(16,178,203,0.4)] focus:scale-[1.02]"
                required
              />
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-xs text-center font-bold bg-red-400/10 py-2 rounded-xl border border-red-400/20">
              {error}
            </p>
          )}

          {/* BOTÓN DE ACCIÓN */}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full py-4 bg-gradient-to-r from-[#10b2cb] to-[#2c6bed] text-white font-black text-xs rounded-2xl 
                       shadow-[0_10px_20px_rgba(16,178,203,0.2)] hover:shadow-[0_10px_30px_rgba(16,178,203,0.4)] 
                       hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 disabled:opacity-50 tracking-widest"
          >
            {loading ? "CONFIGURANDO..." : "ESTABLECER CONTRASEÑA"}
          </button>
        </form>

        {/* DETALLE ESTÉTICO INFERIOR */}
        <div className="mt-8 flex justify-center gap-1.5 opacity-20">
          <div className="h-1 w-8 bg-[#10b2cb] rounded-full"></div>
          <div className="h-1 w-1.5 bg-[#10b2cb] rounded-full"></div>
        </div>
      </div>
    </div>
  );
}