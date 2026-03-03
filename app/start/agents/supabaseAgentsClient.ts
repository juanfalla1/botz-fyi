import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ✅ Cliente SOLO para Agents (sesión separada del hipotecario)
export const supabaseAgents = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: "sb-botz-agents-auth",
    // Seguridad Agents: no persistir sesión al salir/recargar.
    // Obliga re-login y evita que quede abierta en equipos compartidos.
    persistSession: false,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
