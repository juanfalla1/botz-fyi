import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ✅ Cliente SOLO para Agents (sesión separada del hipotecario)
export const supabaseAgents = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: "sb-botz-agents-auth",
    // Mantener sesión de Agents al recargar para evitar expulsión del CRM.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
