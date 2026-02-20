import { createClient } from "@supabase/supabase-js";

// Mantengo tu lógica de env + fallback
const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const envKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabaseUrl = envUrl || "https://placeholder.supabase.co";
const supabaseKey = envKey || "placeholder-key";

// ✅ Cliente GLOBAL (Hipotecario) con sesión separada
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storageKey: "sb-botz-hipoteca-auth",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});